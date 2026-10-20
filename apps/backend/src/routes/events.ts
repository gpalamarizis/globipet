import type { FastifyPluginAsync } from 'fastify'
import { randomBytes } from 'node:crypto'
import prisma from '../lib/prisma.js'
import { getRequestLang, translateRecord, translateRecords } from '../lib/i18n.js'
import { createVivaPaymentOrder, getVivaTransaction, refundVivaTransaction, isVivaDefinitiveRejection } from '../lib/viva.js'
import { bookingStart } from '../lib/cancellation.js'
import { audit, auditSystem } from '../lib/audit.js'
import { serverError } from '../lib/errors.js'
import { langOfUser, notifyTitle, notifyMsg } from '../lib/notifyText.js'
import { sendPushToUser } from '../lib/push.js'
import { broadcastToUser } from './notifications.js'

/**
 * Εκδηλώσεις με τιμή — πληρωμή μέσω Viva.
 *
 * ΡΟΗ
 *   1. POST /:id/register → εγγραφή `pending_payment` με το ποσό της βάσης
 *      (τιμή × άτομα) + ΝΕΑ παραγγελία Viva με merchantTrns = `ev:<id>:<nonce>`
 *      (nonce τυχαίο σε κάθε δημιουργία). Ο κωδικός της παραγγελίας γράφεται
 *      στο viva_order_code — μόνο αυτή η παραγγελία μπορεί να δώσει θέση.
 *      Η θέση ΔΕΝ μετριέται ακόμη στο registered_count.
 *   2. Ο χρήστης πληρώνει στη Viva και επιστρέφει στο /events/:id/confirmation
 *      (ή στην οθόνη event-confirmation του κινητού).
 *   3. POST /registrations/:id/viva/verify (με το ?t= της Viva) ή το κοινό
 *      webhook του orders.ts → confirmEventRegistrationPayment:
 *      επαλήθευση στη Viva (F, merchantTrns `ev:<id>:`, orderCode === viva_order_code,
 *      ποσό) και μετά, σε ΜΙΑ συναλλαγή βάσης, `registered` + transaction +
 *      άτομα στο registered_count — μόνο αν χωράει. Αν γέμισε στο μεταξύ:
 *      `refunding` → αυτόματη πλήρης επιστροφή → `refunded` (ή `refund_failed`).
 *
 * ΑΚΥΡΩΣΗ
 *   Πληρωμένη: πλήρης επιστροφή έως EVENT_REFUND_HOURS πριν την έναρξη
 *   (date + time, ώρα Ελλάδας), μετά δεν ακυρώνεται. Εκκρεμής: απλή ακύρωση.
 *
 * ΕΠΙΣΤΡΟΦΕΣ
 *   Κάθε επιτυχημένη επιστροφή καταγράφεται στο audit log (resource
 *   event_registration, metadata.transaction_id). Πριν από κάθε επιστροφή
 *   ελέγχεται αυτή η καταγραφή, ώστε επαναλήψεις του webhook να μην
 *   ξαναεπιστρέφουν την ίδια συναλλαγή.
 */
export const EVENT_REFUND_HOURS = 48

const round2 = (n: number) => Math.round(n * 100) / 100

/** Έναρξη εκδήλωσης: date (YYYY-MM-DD) + time (HH:MM), ώρα Ελλάδας. */
function eventStart(e: { date: string; time: string | null }) {
  return bookingStart(e.date, e.time)
}

/** Μέχρι πότε επιστρέφονται τα χρήματα (null αν η ημερομηνία δεν διαβάζεται). */
function refundDeadline(e: { date: string; time: string | null }): Date | null {
  const start = eventStart(e)
  return start ? new Date(start.getTime() - EVENT_REFUND_HOURS * 3_600_000) : null
}

/** Σημερινή ημερομηνία (YYYY-MM-DD) στην Ελλάδα — όχι σε UTC. */
function athensToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

/**
 * Έχει ξεκινήσει (ή γίνει) η εκδήλωση; Έναρξη date + time ώρα Ελλάδας· αν η
 * ημερομηνία δεν διαβάζεται (παλιό ελεύθερο κείμενο), σύγκριση ημερομηνίας.
 */
function eventHasStarted(e: { date: string; end_date?: string | null; time: string | null }): boolean {
  const start = eventStart(e)
  if (start) return Date.now() >= start.getTime()
  return (e.end_date || e.date) < athensToday()
}

const isPaidRegistration = (r: any) =>
  r?.status === 'registered' && !!r.viva_transaction_id && (r.amount_paid ?? 0) > 0

/** merchantTrns μιας νέας πληρωμής εκδήλωσης (≤ 48 χαρακτήρες). */
const eventMerchantTrns = (registrationId: string) =>
  `ev:${registrationId}:${randomBytes(4).toString('hex')}`

/** `ev:<regId>:<nonce>` → regId, αλλιώς null. */
export function eventRegistrationIdFromTrns(merchantTrns: string): string | null {
  const m = /^ev:([^:]+):[^:]*$/.exec(String(merchantTrns ?? ''))
  return m ? m[1] : null
}

const REFUND_ACTIONS = ['event_registration_auto_refund', 'event_registration_refund']

/** Λόγος (metadata.reason) των επιστροφών λόγω ακύρωσης της εκδήλωσης. */
const EVENT_CANCELLED_REASON = 'event_cancelled'

/** Έχει ήδη επιστραφεί (με επιτυχία) αυτή η συναλλαγή για αυτή την εγγραφή; */
async function alreadyRefunded(registrationId: string, transactionId: string): Promise<boolean> {
  const row = await prisma.auditLog.findFirst({
    where: {
      resource: 'event_registration', resource_id: registrationId, outcome: 'success',
      action: { in: REFUND_ACTIONS },
      metadata: { path: ['transaction_id'], equals: transactionId },
    },
    select: { id: true },
  })
  return !!row
}

/**
 * Λόγος επιστροφής μιας εγγραφής, από το audit log:
 *   'full'      — η εκδήλωση γέμισε όσο πλήρωνε
 *   'cancelled' — ακύρωσε ο ίδιος
 *   'event_cancelled' — ακύρωσε ο διοργανωτής ολόκληρη την εκδήλωση
 *   null        — δεν προκύπτει
 */
async function refundReason(reg: { id: string; status: string; viva_transaction_id: string | null }): Promise<'full' | 'cancelled' | 'event_cancelled' | null> {
  if (reg.status === 'refund_failed') {
    // Αποτυχημένη επιστροφή: λόγος από την τελευταία απόπειρα (αλλιώς, όπως
    // πάντα, «γέμισε»).
    if (!reg.viva_transaction_id) return 'full'
    try {
      const row = await prisma.auditLog.findFirst({
        where: {
          resource: 'event_registration', resource_id: reg.id, action: 'event_registration_auto_refund',
          metadata: { path: ['transaction_id'], equals: reg.viva_transaction_id },
        },
        orderBy: { created_at: 'desc' },
        select: { metadata: true },
      })
      return (row?.metadata as any)?.reason === EVENT_CANCELLED_REASON ? 'event_cancelled' : 'full'
    } catch {
      return 'full'
    }
  }
  if (reg.status !== 'refunded' || !reg.viva_transaction_id) return null
  try {
    const row = await prisma.auditLog.findFirst({
      where: {
        resource: 'event_registration', resource_id: reg.id, outcome: 'success',
        action: { in: REFUND_ACTIONS },
        metadata: { path: ['transaction_id'], equals: reg.viva_transaction_id },
      },
      orderBy: { created_at: 'desc' },
      select: { action: true, metadata: true },
    })
    if (!row) return null
    if (row.action === 'event_registration_refund') return 'cancelled'
    const why = (row.metadata as any)?.reason
    if (why === EVENT_CANCELLED_REASON) return 'event_cancelled'
    return why === 'event became full' ? 'full' : null
  } catch {
    return null
  }
}

/** Επιστροφές σε εξέλιξη σε αυτή τη διεργασία (ίδια συναλλαγή δύο φορές ταυτόχρονα). */
const refundsInFlight = new Set<string>()

/**
 * Πλήρης επιστροφή μιας συναλλαγής που δεν αντιστοιχεί (πια) σε θέση.
 *
 *   'refunded' — έγινε τώρα
 *   'already'  — είχε ήδη γίνει (audit) ή γίνεται αυτή τη στιγμή· καμία κλήση
 *   'failed'   — η Viva αρνήθηκε ή ο έλεγχος δεν ολοκληρώθηκε· χρειάζεται χειρισμό
 */
async function refundOrphanPayment(
  registrationId: string, transactionId: string, why: string,
): Promise<'refunded' | 'already' | 'failed'> {
  const key = `${registrationId}|${transactionId}`
  if (refundsInFlight.has(key)) return 'already'
  refundsInFlight.add(key)
  try {
    if (await alreadyRefunded(registrationId, transactionId)) {
      console.error(`[viva] event registration ${registrationId}: transaction ${transactionId} already refunded — skipped (${why})`)
      return 'already'
    }
    const r = await refundVivaTransaction(transactionId)
    console.error(`[viva] event registration ${registrationId}: transaction ${transactionId} refunded (${why})`)
    await auditSystem({
      action: 'event_registration_auto_refund', resource: 'event_registration', resource_id: registrationId,
      metadata: { transaction_id: transactionId, refund_tx: r.transactionId, reason: why },
    })
    return 'refunded'
  } catch (err: any) {
    // Καταγράφεται κι η αποτυχία: πρέπει να βρεθεί και να γίνει με το χέρι.
    console.error(`[viva] event registration ${registrationId}: REFUND FAILED for ${transactionId} (${why}):`, err?.message)
    await auditSystem({
      action: 'event_registration_auto_refund', resource: 'event_registration', resource_id: registrationId,
      outcome: 'failure', error_message: String(err?.message ?? err).slice(0, 500),
      metadata: { transaction_id: transactionId, reason: why },
    })
    return 'failed'
  } finally {
    refundsInFlight.delete(key)
  }
}

/**
 * Επαληθεύει στη Viva ότι η συναλλαγή πληρώνει την ΤΡΕΧΟΥΣΑ παραγγελία
 * αυτής της εγγραφής. Επιστρέφει τον κωδικό παραγγελίας, ή null.
 *
 * Απαιτούνται: statusId F, merchantTrns `ev:<regId>:…` (ή, για πληρωμές που
 * ξεκίνησαν πριν την αλλαγή μορφής, ακριβώς `<regId>`), orderCode της
 * συναλλαγής === viva_order_code της εγγραφής, ποσό ≥ amount_paid.
 *
 * Μοναδική παρενέργεια: πληρωμή παλιάς παραγγελίας της ίδιας εγγραφής (δεν
 * αντιστοιχεί σε θέση) επιστρέφεται — μέσω refundOrphanPayment, άρα μία φορά.
 *
 * 'error': η επαλήθευση δεν ολοκληρώθηκε (Viva 5xx/429, timeout, δίκτυο,
 * βάση) — όχι «άκυρη»· το webhook απαντά μη-2xx και το verify 503, ώστε να
 * ξαναγίνει. Πριν επέστρεφε null και η πληρωμή έμενε χωρίς θέση.
 */
async function verifyEventPayment(registrationId: string, transactionId: string): Promise<{ orderCode: string } | null | 'error'> {
  const txn = String(transactionId)
  try {
    const reg = await prisma.eventRegistration.findUnique({ where: { id: registrationId } })
    if (!reg) return null

    const tx = await getVivaTransaction(txn)
    if (!tx || tx.statusId !== 'F') return null

    const trns = String(tx.merchantTrns ?? tx.MerchantTrns ?? '')
    if (!trns.startsWith(`ev:${registrationId}:`) && trns !== registrationId) {
      console.error(`[viva] transaction ${txn} belongs to ${trns}, not event registration ${registrationId}`)
      return null
    }

    const txOrder = String(tx.orderCode ?? tx.OrderCode ?? '')
    if (!txOrder) {
      // Χωρίς κωδικό παραγγελίας δεν ξέρουμε ποια παραγγελία πληρώθηκε:
      // καμία αλλαγή, καμία επιστροφή — το βλέπει άνθρωπος.
      console.error(`[viva] transaction ${txn} has no orderCode — event registration ${registrationId} not confirmed`)
      return null
    }

    // Η ήδη καταχωρημένη συναλλαγή (επανάληψη webhook/verify): ιδεμποτικό.
    if (reg.viva_transaction_id === txn) return { orderCode: txOrder }

    // Κάθε «Δήλωση»/«Συνέχεια πληρωμής» φτιάχνει νέα παραγγελία Viva. Μετρά
    // μόνο η τρέχουσα· πληρωμή παλιάς (ή εγγραφής που δεν περιμένει πια
    // πληρωμή, viva_order_code null) δεν αντιστοιχεί σε θέση και επιστρέφεται.
    if (!reg.viva_order_code || txOrder !== reg.viva_order_code) {
      console.error(`[viva] transaction ${txn} is for order ${txOrder}, registration ${registrationId} expects ${reg.viva_order_code}`)
      await refundOrphanPayment(registrationId, txn, 'payment of a superseded Viva order')
      return null
    }

    if (!(reg.amount_paid && reg.amount_paid > 0)) return null
    const paid = Number(tx.amount ?? tx.Amount ?? 0)
    if (Number.isFinite(paid) && paid + 0.01 < reg.amount_paid) {
      console.error(`[viva] transaction ${txn} paid ${paid}, event registration needs ${reg.amount_paid}`)
      return null
    }
    return { orderCode: txOrder }
  } catch (err: any) {
    if (isVivaDefinitiveRejection(err)) {
      console.error('[viva] event registration transaction rejected by Viva:', err?.message)
      return null
    }
    console.error('[viva] event registration verification error (will retry):', err?.message)
    return 'error'
  }
}

/** Μορφή του transaction id της Viva (UUID) — όπως στο verify των κρατήσεων. */
const VIVA_TXN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Συμβατότητα: «πληρώνει αυτή η συναλλαγή την εγγραφή;» */
export async function vivaPaidEventRegistration(registrationId: string, transactionId: string): Promise<boolean> {
  const r = await verifyEventPayment(registrationId, transactionId)
  return !!r && r !== 'error'
}

type MarkResult = 'registered' | 'refunded' | 'refund_failed' | 'ignored'

const stateOf = (status: string): MarkResult =>
  status === 'registered' ? 'registered'
    : status === 'refunded' ? 'refunded'
    : status === 'refund_failed' ? 'refund_failed'
    : 'ignored'

/**
 * Σημειώνει πληρωμένη μια εγγραφή που ΗΔΗ επαληθεύτηκε (verifyEventPayment)
 * για την παραγγελία `orderCode`. Ιδεμποτική: η Viva στέλνει το ίδιο webhook
 * πολλές φορές και η σελίδα επιβεβαίωσης καλεί κι αυτή.
 *
 * Η διεκδίκηση (pending_payment → registered) και η αύξηση του
 * registered_count γίνονται σε ΜΙΑ συναλλαγή βάσης· αν δεν χωράει, η εγγραφή
 * περνά στην ίδια συναλλαγή σε `refunding` και ακολουθεί η επιστροφή.
 *
 *   registered      → η θέση επιβεβαιώθηκε (ή ήταν ήδη)
 *   refunded        → γέμισε στο μεταξύ, τα χρήματα επιστράφηκαν
 *   refund_failed   → γέμισε, αλλά η Viva αρνήθηκε την επιστροφή (χρειάζεται χειρισμό)
 *   ignored         → η εγγραφή δεν περίμενε αυτή την πληρωμή· η συναλλαγή
 *                     επιστρέφεται αν δεν είναι η ήδη καταχωρημένη
 */
export async function markEventRegistrationPaid(
  registrationId: string,
  transactionId: string,
  orderCode: string,
): Promise<MarkResult> {
  const txn = String(transactionId)
  const reg = await prisma.eventRegistration.findUnique({ where: { id: registrationId } })
  if (!reg) {
    // Σβήστηκε μετά την επαλήθευση: τα χρήματα δεν αντιστοιχούν σε τίποτα.
    await refundOrphanPayment(registrationId, txn, 'registration no longer exists')
    return 'ignored'
  }

  if (reg.status !== 'pending_payment') {
    // Η ίδια συναλλαγή ξανά: τίποτα να γίνει.
    if (reg.viva_transaction_id === txn) return stateOf(reg.status)
    // Άλλη συναλλαγή για εγγραφή που δεν περιμένει πληρωμή: δεύτερη πληρωμή
    // ή πληρωμή μετά από ακύρωση. Δεν αντιστοιχεί σε θέση — επιστρέφεται.
    await refundOrphanPayment(reg.id, txn, `registration is ${reg.status}`)
    return reg.status === 'registered' ? 'registered' : 'ignored'
  }

  const partySize = 1 + (reg.guests ?? 0)
  const outcome = await prisma.$transaction(async (tx) => {
    // Διεκδίκηση: μόνο ένα από webhook/verify περνά, και μόνο για την
    // παραγγελία που επαληθεύτηκε (όχι αν στο μεταξύ ξεκίνησε νέα).
    const claimed = await tx.eventRegistration.updateMany({
      where: { id: reg.id, status: 'pending_payment', viva_order_code: orderCode },
      data: { status: 'registered', viva_transaction_id: txn },
    })
    if (claimed.count === 0) return 'lost' as const

    // Η θέση μετριέται ΤΩΡΑ, στην ίδια συναλλαγή — και μόνο αν χωράει.
    const event = await tx.event.findUnique({ where: { id: reg.event_id }, select: { capacity: true } })
    const counted = await tx.event.updateMany({
      where: event?.capacity
        ? { id: reg.event_id, registered_count: { lte: event.capacity - partySize } }
        : { id: reg.event_id },
      data: { registered_count: { increment: partySize } },
    })
    if (counted.count > 0) return 'registered' as const

    await tx.eventRegistration.update({ where: { id: reg.id }, data: { status: 'refunding' } })
    return 'full' as const
  })

  if (outcome === 'registered') return 'registered'

  if (outcome === 'lost') {
    const fresh = await prisma.eventRegistration.findUnique({ where: { id: reg.id } })
    if (fresh?.viva_transaction_id === txn) return stateOf(fresh.status)
    // Άλλαξε στο μεταξύ (ακύρωση, άλλη πληρωμή, νέα παραγγελία ή διαγραφή):
    // η συναλλαγή δεν αντιστοιχεί σε θέση.
    await refundOrphanPayment(reg.id, txn, `registration changed to ${fresh?.status ?? 'deleted'}`)
    return fresh?.status === 'registered' ? 'registered' : 'ignored'
  }

  // Γέμισε όσο ο χρήστης πλήρωνε: πλήρης επιστροφή.
  const res = await refundOrphanPayment(reg.id, txn, 'event became full')
  const final = res === 'failed' ? 'refund_failed' : 'refunded'
  await prisma.eventRegistration.updateMany({
    where: { id: reg.id, status: 'refunding', viva_transaction_id: txn },
    data: { status: final },
  })
  return final
}

/**
 * Επαλήθευση + καταχώριση (verify της σελίδας επιβεβαίωσης και webhook).
 * null = άκυρη/δεν αφορά εγγραφή· 'error' = η επαλήθευση δεν ολοκληρώθηκε.
 */
export async function confirmEventRegistrationPayment(registrationId: string, transactionId: string): Promise<MarkResult | null | 'error'> {
  const ok = await verifyEventPayment(registrationId, transactionId)
  if (ok === 'error') return 'error'
  if (!ok) return null
  return markEventRegistrationPaid(registrationId, String(transactionId), ok.orderCode)
}

/**
 * Κλάδος εκδηλώσεων του κοινού webhook (orders.ts), για merchantTrns
 * `ev:<regId>:<nonce>`. Αν η εγγραφή δεν υπάρχει πια (π.χ. σβήστηκε η
 * εκδήλωση), η πληρωμή επαληθεύεται στη Viva και επιστρέφεται αυτόματα.
 *
 * 'retry': η επαλήθευση στη Viva δεν ολοκληρώθηκε — το webhook απαντά μη-2xx
 * ώστε η Viva να το ξαναστείλει.
 */
export async function handleEventPaymentWebhook(merchantTrns: string, transactionId: string): Promise<'ok' | 'retry'> {
  const regId = eventRegistrationIdFromTrns(merchantTrns)
  const txn = String(transactionId)
  if (!regId) {
    console.error(`[viva] webhook merchantTrns ${merchantTrns} is not a valid event reference — ignored`)
    return 'ok'
  }
  const exists = await prisma.eventRegistration.findUnique({ where: { id: regId }, select: { id: true } })
  if (!exists) {
    try {
      const tx = await getVivaTransaction(txn)
      const trns = String(tx?.merchantTrns ?? tx?.MerchantTrns ?? '')
      if (tx?.statusId === 'F' && trns === merchantTrns) {
        await refundOrphanPayment(regId, txn, 'registration no longer exists')
      } else {
        console.error(`[viva] webhook for missing event registration ${regId} could not be verified — ignored`)
      }
    } catch (err: any) {
      console.error(`[viva] webhook for missing event registration ${regId}: verification error`, err?.message)
      if (!isVivaDefinitiveRejection(err)) return 'retry'
    }
    return 'ok'
  }
  const r = await confirmEventRegistrationPayment(regId, txn)
  if (r === 'error') return 'retry'
  if (!r) console.error(`[viva] webhook for event registration ${regId} could not be verified — ignored`)
  return 'ok'
}

/** Μορφή ημερομηνίας/ώρας και νόμισμα για εκδηλώσεις με τιμή. */
function paidEventProblem(e: { price?: any; date?: any; time?: any; currency?: any }): string | null {
  if (!(Number(e.price) > 0)) return null
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(e.date ?? ''))
  const validDate = !!d && (() => {
    const dt = new Date(Date.UTC(+d[1], +d[2] - 1, +d[3]))
    return dt.getUTCFullYear() === +d[1] && dt.getUTCMonth() === +d[2] - 1 && dt.getUTCDate() === +d[3]
  })()
  const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(e.time ?? ''))
  if (!validDate || !validTime) {
    return 'Για εκδήλωση με τιμή, η ημερομηνία πρέπει να έχει μορφή ΕΕΕΕ-ΜΜ-ΗΗ και η ώρα ΩΩ:ΛΛ'
  }
  if ((e.currency || 'EUR') !== 'EUR') return 'Οι πληρωμές εκδηλώσεων γίνονται μόνο σε ευρώ (EUR)'
  return null
}

/** Εγγραφές με χρήματα σε κίνηση: πληρωμένες, σε πληρωμή, σε επιστροφή. */
function moneyAtStakeWhere(eventId: string, includeRefundFailed: boolean) {
  return {
    event_id: eventId,
    OR: [
      { status: 'registered', viva_transaction_id: { not: null } },
      { status: { in: includeRefundFailed
        ? ['pending_payment', 'refunding', 'refund_failed']
        : ['pending_payment', 'refunding'] } },
    ],
  }
}

/** Καταστάσεις από τις οποίες μια γραμμή εγγραφής ξαναχρησιμοποιείται. */
const REUSABLE_STATUSES = ['pending_payment', 'cancelled', 'refunded']

class RegistrationConflict extends Error {
  constructor(public kind: 'already' | 'full') { super(kind) }
}

// ─── Ακύρωση εκδήλωσης από τον διοργανωτή ──────────────────────────────
//
// Η ακύρωση σημειώνεται στη στήλη events.cancelled_at (ατομικά, μόνο αν
// είναι null) ΠΡΙΝ ξεκινήσουν οι επιστροφές: από τη στιγμή αυτή δεν γίνονται
// νέες δηλώσεις ούτε αλλαγές. Η εκδήλωση ΔΕΝ διαγράφεται — η σελίδα της μένει
// με ένδειξη «Ακυρώθηκε». Το audit log (action event_cancel) μένει μόνο ως
// καταγραφή· η κατάσταση δεν εξαρτάται πια από αυτό (καθαρίζεται στις 180
// ημέρες, βλ. lib/cron.ts).
//
// Συμβατότητα: εκδηλώσεις που ακυρώθηκαν πριν υπάρξει η στήλη (μόνο audit)
// θεωρούνται κι αυτές ακυρωμένες· η επόμενη «Ολοκλήρωση επιστροφών» γράφει
// και τη στήλη.

const EVENT_CANCEL_ACTION = 'event_cancel'

/**
 * Έχει ξεκινήσει ακύρωση αυτής της εκδήλωσης από τον διοργανωτή;
 *
 * Σφάλμα βάσης → ΠΕΤΑΓΕΤΑΙ (fail-closed): πριν επέστρεφε false, οπότε μια
 * στιγμιαία αποτυχία άφηνε νέες δηλώσεις/πληρωμές σε ακυρωμένη εκδήλωση.
 * Όποιος καλεί αποφασίζει (π.χ. το register απαντά 503).
 */
async function isEventCancelled(eventId: string, known?: { cancelled_at: Date | null }): Promise<boolean> {
  return !!(await eventCancelledAt(eventId, known))
}

/**
 * Πότε σημειώθηκε η ακύρωση· null αν δεν ακυρώθηκε. Από τη στήλη
 * cancelled_at (με `known` χωρίς νέα ερώτηση)· αν είναι null, από το audit
 * (ακυρώσεις πριν τη στήλη). Πετά σε σφάλμα βάσης.
 */
async function eventCancelledAt(eventId: string, known?: { cancelled_at: Date | null }): Promise<Date | null> {
  const row = known ?? await prisma.event.findUnique({ where: { id: eventId }, select: { cancelled_at: true } })
  if (row?.cancelled_at) return row.cancelled_at
  return legacyCancelledAt(eventId)
}

/** Ακύρωση από την εποχή πριν τη στήλη: πρώτη καταγραφή event_cancel στο audit. */
async function legacyCancelledAt(eventId: string): Promise<Date | null> {
  const row = await prisma.auditLog.findFirst({
    where: { action: EVENT_CANCEL_ACTION, resource: 'event', resource_id: eventId, outcome: 'success' },
    orderBy: { created_at: 'asc' },
    select: { created_at: true },
  })
  return row?.created_at ?? null
}

/** Ποιες από αυτές τις εκδηλώσεις έχουν ακυρωθεί κατά το audit (μία ερώτηση). Πετά σε σφάλμα βάσης. */
async function cancelledEventIds(eventIds: string[]): Promise<Set<string>> {
  if (eventIds.length === 0) return new Set()
  const rows = await prisma.auditLog.findMany({
    where: { action: EVENT_CANCEL_ACTION, resource: 'event', resource_id: { in: eventIds }, outcome: 'success' },
    select: { resource_id: true },
  })
  return new Set(rows.map(r => String(r.resource_id)))
}

/**
 * Μια εγγραφή `refunding` θεωρείται «κολλημένη» (η διεργασία που την
 * διεκδίκησε έπεσε πριν τελειώσει) μετά από τόσο χρόνο.
 */
const STALE_REFUNDING_MS = 10 * 60_000

/** Ειδοποίηση (in-app + live + push) ενός συμμετέχοντα για την ακύρωση. */
async function notifyEventCancelled(
  email: string, event: { id: string; title: string },
  kind: 'refunded' | 'delayed' | 'plain', amount: number | null,
) {
  try {
    const nLang = await langOfUser(email)
    const notification = await prisma.notification.create({
      data: {
        user_email: email,
        title: notifyTitle('event_cancelled', nLang),
        message: notifyMsg.eventCancelled(nLang, event.title, kind, Number(amount ?? 0).toFixed(2)),
        type: 'event_cancelled',
        // Η εκδήλωση δεν διαγράφεται πια: ο σύνδεσμος ανοίγει πάντα τη
        // σελίδα της, με την ένδειξη «Ακυρώθηκε» και την κατάσταση της
        // επιστροφής (web /events/:id, κινητό app/events/[id]).
        link: `/events/${event.id}`,
      },
    })
    broadcastToUser(email, { type: 'notification', notification })
    void sendPushToUser(email, {
      title: notification.title, body: notification.message, url: notification.link ?? '/',
      data: { type: 'event_cancelled' },
    })
  } catch (err: any) {
    console.error(`[events] cancel notification to ${email} failed:`, err?.message)
  }
}

/**
 * Ειδοποίηση (in-app + live + push) ΠΡΟΣ ΤΟΝ ΔΙΟΡΓΑΝΩΤΗ όταν η ακύρωση
 * τελειώνει με εκκρεμείς επιστροφές (207). Η ακυρωμένη εκδήλωση δεν
 * εμφανίζεται στη δημόσια λίστα, οπότε ο σύνδεσμος /events/:id είναι ο
 * δρόμος πίσω στην «Ολοκλήρωση επιστροφών» (μαζί με το «Οι εκδηλώσεις μου»).
 * Μία αδιάβαστη τη φορά: κάθε νέα απόπειρα δεν προσθέτει νέα ειδοποίηση.
 */
async function notifyOrganizerCancelIncomplete(
  event: { id: string; title: string; organizer_email: string }, pending: number,
) {
  try {
    const email = event.organizer_email
    const link = `/events/${event.id}`
    const open = await prisma.notification.findFirst({
      where: { user_email: email, type: 'event_cancel_incomplete', link, is_read: false },
      select: { id: true },
    })
    if (open) return
    const nLang = await langOfUser(email)
    const notification = await prisma.notification.create({
      data: {
        user_email: email,
        title: notifyTitle('event_cancel_incomplete', nLang),
        message: notifyMsg.eventCancelIncomplete(nLang, event.title, pending),
        type: 'event_cancel_incomplete',
        link,
      },
    })
    broadcastToUser(email, { type: 'notification', notification })
    void sendPushToUser(email, {
      title: notification.title, body: notification.message, url: notification.link ?? '/',
      data: { type: 'event_cancel_incomplete' },
    })
  } catch (err: any) {
    console.error(`[events] organizer cancel notification for ${event.id} failed:`, err?.message)
  }
}

type CancelProblem = { registration_id: string; user_name: string; amount: number | null; status: string }

export type EventCancelReport = {
  /** Όλες οι συμμετοχές τακτοποιήθηκαν (καμία επιστροφή/πληρωμή σε εκκρεμότητα). */
  settled: boolean
  /**
   * Συμβατότητα με παλιούς πελάτες (ήδη εγκατεστημένη εφαρμογή κινητού), που
   * διαβάζουν το `deleted` ως «ολοκληρώθηκε». Ίσο με `settled` — η εκδήλωση
   * ΔΕΝ διαγράφεται πια.
   */
  deleted: boolean
  refunded: number
  refunded_amount: number
  cancelled: number
  failed: CancelProblem[]
  in_progress: CancelProblem[]
}

/**
 * Πλήρης επιστροφή μιας εγγραφής που η ακύρωση ΗΔΗ πέρασε σε `refunding`.
 * Ιδεμποτική μέσω refundOrphanPayment (audit ανά συναλλαγή).
 */
async function refundForCancelledEvent(
  reg: { id: string; event_id: string; guests: number | null; viva_transaction_id: string | null },
  seatCounted: boolean,
): Promise<boolean> {
  const txn = String(reg.viva_transaction_id)
  const res = await refundOrphanPayment(reg.id, txn, EVENT_CANCELLED_REASON)
  // 'already': είτε επιστράφηκε ήδη (audit) είτε τρέχει ταυτόχρονα — μόνο
  // το πρώτο μετρά ως επιτυχία.
  const ok = res === 'refunded' || (res === 'already' && await alreadyRefunded(reg.id, txn))
  // Η θέση αφαιρείται και στην αποτυχία: η εκδήλωση ακυρώνεται, και μια
  // `refund_failed` δεν μετριέται ποτέ στο registered_count (όπως στο «γέμισε»).
  await prisma.$transaction(async (tx) => {
    const r = await tx.eventRegistration.updateMany({
      where: { id: reg.id, status: 'refunding' }, data: { status: ok ? 'refunded' : 'refund_failed' },
    })
    if (r.count > 0 && seatCounted) {
      await tx.event.update({
        where: { id: reg.event_id },
        data: { registered_count: { decrement: 1 + (reg.guests ?? 0) } },
      })
    }
  })
  return ok
}

/**
 * Διαγράφει την εκδήλωση ΜΟΝΟ αν δεν μένουν χρήματα σε κίνηση, σε μία
 * συναλλαγή βάσης:
 *   1. Οι εκκρεμείς πληρωμές (εγκαταλειμμένα checkout) γίνονται `cancelled`
 *      — κλειδώνοντας τις γραμμές, ώστε ένα webhook που τις διεκδικεί
 *      ταυτόχρονα είτε προλαβαίνει (και φαίνεται στο βήμα 2) είτε χάνει.
 *   2. Αν υπάρχει πληρωμένη/σε επιστροφή/αποτυχημένη επιστροφή (ή, με
 *      `blockOnFree`, οποιαδήποτε ενεργή δωρεάν συμμετοχή), καμία διαγραφή.
 *   3. Αλλιώς διαγραφή (cascade στις εγγραφές).
 * Πληρωμή που φτάνει μετά: το webhook βρίσκει εγγραφή `cancelled` ή
 * ανύπαρκτη (merchantTrns `ev:<id>:…`) και την επιστρέφει αυτόματα.
 *
 * Αν κάτι μπλοκάρει, η συναλλαγή ΑΝΑΙΡΕΙΤΑΙ (throw → rollback): οι εκκρεμείς
 * πληρωμές μένουν `pending_payment`, ώστε όποιος πληρώνει εκείνη τη στιγμή να
 * μη χάσει τη θέση του για μια διαγραφή που τελικά δεν έγινε.
 */
class DeleteBlocked extends Error {
  constructor(public blocking: any[]) { super('delete blocked') }
}

async function deleteEventIfSettled(eventId: string, blockOnFree: boolean): Promise<{ deleted: boolean; blocking: any[] }> {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.eventRegistration.updateMany({
        where: { event_id: eventId, status: 'pending_payment' },
        data: { status: 'cancelled' },
      })
      const blocking = await tx.eventRegistration.findMany({
        where: {
          event_id: eventId,
          OR: [
            blockOnFree
              ? { status: 'registered' }
              : { status: 'registered', viva_transaction_id: { not: null } },
            { status: { in: ['pending_payment', 'refunding', 'refund_failed'] } },
          ],
        },
      })
      if (blocking.length > 0) throw new DeleteBlocked(blocking)
      // deleteMany: ταυτόχρονη ακύρωση/διαγραφή που πρόλαβε δεν δίνει P2025
      // (500)· η εκδήλωση δεν υπάρχει πια, άρα το αποτέλεσμα είναι το ίδιο.
      await tx.event.deleteMany({ where: { id: eventId } })
      return { deleted: true, blocking: [] as any[] }
    })
  } catch (err) {
    if (err instanceof DeleteBlocked) return { deleted: false, blocking: err.blocking }
    throw err
  }
}

/**
 * Ακύρωση όλων των συμμετοχών μιας εκδήλωσης (ΗΔΗ σημειωμένης ακυρωμένης).
 * Η εκδήλωση δεν διαγράφεται. Επαναλήψιμη: σε νέα κλήση ξαναδοκιμάζονται οι
 * αποτυχημένες επιστροφές· όσες έγιναν δεν ξαναγίνονται (audit ανά συναλλαγή).
 *
 *   registered + πληρωμή → refunding (ατομικά) → επιστροφή → refunded | refund_failed
 *   refund_failed        → refunding (ατομικά) → νέα απόπειρα επιστροφής
 *   registered δωρεάν    → cancelled
 *   pending_payment      → cancelled (αν πληρωθεί αργότερα: αυτόματη επιστροφή)
 *   refunding            → σε εξέλιξη από άλλο αίτημα· η ακύρωση δεν έχει τακτοποιηθεί ακόμη
 *                          (ήδη επιστραμμένη κατά το audit → refunded· κολλημένη
 *                          ≥ 10 λεπτά → νέα απόπειρα όπως η refund_failed)
 */
export async function cancelEventWithRefunds(eventId: string): Promise<EventCancelReport | null> {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, title: true, cancelled_at: true } })
  if (!event) return null

  const report: EventCancelReport = {
    settled: false, deleted: false, refunded: 0, refunded_amount: 0, cancelled: 0, failed: [], in_progress: [],
  }
  const problem = (r: any, status: string): CancelProblem =>
    ({ registration_id: r.id, user_name: r.user_name, amount: r.amount_paid ?? null, status })
  // Στιγμή σήμανσης της ακύρωσης — όριο για τις «κολλημένες» `refunding`.
  const cancelledAt = await eventCancelledAt(eventId, event)

  // Δύο περάσματα: το δεύτερο πιάνει όσες γραμμές άλλαξαν όσο έτρεχε το
  // πρώτο (π.χ. δήλωση που πρόλαβε λίγο πριν σημειωθεί η ακύρωση).
  for (let pass = 0; pass < 2; pass++) {
    report.failed = []
    report.in_progress = []
    const regs = await prisma.eventRegistration.findMany({ where: { event_id: eventId }, orderBy: { created_at: 'asc' } })

    for (const reg of regs) {
      if (reg.status === 'pending_payment') {
        const r = await prisma.eventRegistration.updateMany({
          where: { id: reg.id, status: 'pending_payment' }, data: { status: 'cancelled' },
        })
        if (r.count > 0) {
          report.cancelled++
          await notifyEventCancelled(reg.user_email, event, 'plain', null)
        }
        continue
      }

      if (reg.status === 'registered' && isPaidRegistration(reg)) {
        const claimed = await prisma.eventRegistration.updateMany({
          where: { id: reg.id, status: 'registered', viva_transaction_id: reg.viva_transaction_id },
          data: { status: 'refunding' },
        })
        if (claimed.count === 0) { report.in_progress.push(problem(reg, 'changed')); continue }
        if (await refundForCancelledEvent(reg, true)) {
          report.refunded++
          report.refunded_amount = round2(report.refunded_amount + (reg.amount_paid ?? 0))
          await notifyEventCancelled(reg.user_email, event, 'refunded', reg.amount_paid)
        } else {
          report.failed.push(problem(reg, 'refund_failed'))
          await notifyEventCancelled(reg.user_email, event, 'delayed', reg.amount_paid)
        }
        continue
      }

      if (reg.status === 'registered') {
        // Δωρεάν συμμετοχή: ακύρωση και αφαίρεση θέσης, ατομικά.
        const done = await prisma.$transaction(async (tx) => {
          const r = await tx.eventRegistration.updateMany({
            where: { id: reg.id, status: 'registered' }, data: { status: 'cancelled' },
          })
          if (r.count === 0) return false
          await tx.event.update({
            where: { id: eventId },
            data: { registered_count: { decrement: 1 + (reg.guests ?? 0) } },
          })
          return true
        })
        if (done) {
          report.cancelled++
          await notifyEventCancelled(reg.user_email, event, 'plain', null)
        } else {
          report.in_progress.push(problem(reg, 'changed'))
        }
        continue
      }

      if (reg.status === 'refunding') {
        // `refunding` = κάποιο αίτημα διεκδίκησε την επιστροφή. Αν η διεργασία
        // του έπεσε στη μέση, η γραμμή κολλάει εδώ και η ακύρωση δεν
        // τακτοποιείται ποτέ. Δεν υπάρχει updated_at στην εγγραφή, οπότε:
        //   1. Η επιστροφή έγινε ήδη (audit ανά συναλλαγή) → απλώς `refunded`.
        //      Ασφαλές πάντα: καμία κλήση στη Viva.
        //   2. Αλλιώς, νέα απόπειρα ΜΟΝΟ αν η γραμμή είναι `refunding` για
        //      τουλάχιστον 10 λεπτά. Κατώτερο όριο της στιγμής διεκδίκησης:
        //      το μεταγενέστερο από created_at και τη σήμανση ακύρωσης
        //      (cancelled_at)· μια διεκδίκηση πριν τη σήμανση είναι
        //      ακόμη παλαιότερη. Μια επιστροφή στη Viva κρατά δευτερόλεπτα.
        //   3. Διεκδίκηση ατομικά (refunding → refund_failed, ένα μόνο αίτημα
        //      περνά) και συνέχεια ως οφειλόμενη επιστροφή παρακάτω· η
        //      refundOrphanPayment ελέγχει ξανά το audit πριν καλέσει τη Viva.
        const txn = reg.viva_transaction_id
        if (!txn) { report.in_progress.push(problem(reg, 'refunding')); continue }
        if (await alreadyRefunded(reg.id, txn)) {
          const r = await prisma.eventRegistration.updateMany({
            where: { id: reg.id, status: 'refunding', viva_transaction_id: txn }, data: { status: 'refunded' },
          })
          if (r.count > 0 && await refundReason({ id: reg.id, status: 'refunded', viva_transaction_id: txn }) === 'event_cancelled') {
            await notifyEventCancelled(reg.user_email, event, 'refunded', reg.amount_paid)
          }
          continue
        }
        const claimedSince = Math.max(cancelledAt?.getTime() ?? Date.now(), reg.created_at.getTime())
        if (Date.now() - claimedSince < STALE_REFUNDING_MS) {
          report.in_progress.push(problem(reg, 'refunding'))
          continue
        }
        const stale = await prisma.eventRegistration.updateMany({
          where: { id: reg.id, status: 'refunding', viva_transaction_id: txn }, data: { status: 'refund_failed' },
        })
        if (stale.count === 0) { report.in_progress.push(problem(reg, 'changed')); continue }
        reg.status = 'refund_failed'
      }

      if (reg.status === 'refund_failed') {
        // Οφειλόμενη επιστροφή (από παλαιότερη ακύρωση ή «γέμισε»): νέα απόπειρα.
        if (!reg.viva_transaction_id) { report.failed.push(problem(reg, 'refund_failed')); continue }
        const claimed = await prisma.eventRegistration.updateMany({
          where: { id: reg.id, status: 'refund_failed' }, data: { status: 'refunding' },
        })
        if (claimed.count === 0) { report.in_progress.push(problem(reg, 'changed')); continue }
        // Η θέση δεν μετριέται σε refund_failed (ούτε στο «γέμισε» ούτε μετά
        // από αποτυχημένη απόπειρα ακύρωσης, που την αφαίρεσε ήδη).
        if (await refundForCancelledEvent(reg, false)) {
          report.refunded++
          report.refunded_amount = round2(report.refunded_amount + (reg.amount_paid ?? 0))
          await notifyEventCancelled(reg.user_email, event, 'refunded', reg.amount_paid)
        } else {
          report.failed.push(problem(reg, 'refund_failed'))
        }
        continue
      }

      // cancelled / refunded: τίποτα.
    }

    await prisma.event.updateMany({ where: { id: eventId, registered_count: { lt: 0 } }, data: { registered_count: 0 } })

    if (report.failed.length > 0 || report.in_progress.length > 0) return report

    // Τακτοποιήθηκαν όλα; (καμία ενεργή συμμετοχή, πληρωμή ή επιστροφή σε
    // εκκρεμότητα). Η εκδήλωση ΔΕΝ διαγράφεται — μένει ακυρωμένη.
    const blocking = await prisma.eventRegistration.findMany({
      where: { event_id: eventId, status: { in: ['registered', 'pending_payment', 'refunding', 'refund_failed'] } },
    })
    if (blocking.length === 0) { report.settled = true; report.deleted = true; return report }
    // Κάτι άλλαξε στο μεταξύ: ένα ακόμη πέρασμα· μετά αναφέρεται ως σε εξέλιξη.
    if (pass === 1) report.in_progress = blocking.map(r => problem(r, r.status))
  }
  return report
}

const eventsRoutes: FastifyPluginAsync = async (app) => {

  /**
   * Load an event and verify the caller may change it.
   *
   * PATCH and DELETE previously had no check whatsoever — any logged-in user
   * could rewrite or delete any event on the platform knowing only its id,
   * including its price, its date and who organises it.
   */
  async function assertCanModify(req: any, reply: any, id: string) {
    const event = await prisma.event.findUnique({ where: { id } })
    if (!event) {
      reply.code(404).send({ message: 'Η εκδήλωση δεν βρέθηκε' })
      return null
    }
    const user = req.user as any
    if (event.organizer_email !== user.email && user.role !== 'admin') {
      reply.code(403).send({ message: 'Η εκδήλωση δεν σου ανήκει' })
      return null
    }
    return event
  }

  /** Fields an organiser may set. is_featured is a platform decision. */
  function pickEventFields(body: any, isAdmin: boolean) {
    const data: any = {}
    const plain = ['title', 'description', 'event_type', 'date', 'end_date', 'time',
                   'location', 'city', 'country', 'image_url', 'organizer']
    for (const f of plain) if (body[f] !== undefined) data[f] = body[f]

    if (body.latitude !== undefined) {
      const v = parseFloat(body.latitude)
      data.latitude = Number.isFinite(v) && v >= -90 && v <= 90 ? v : null
    }
    if (body.longitude !== undefined) {
      const v = parseFloat(body.longitude)
      data.longitude = Number.isFinite(v) && v >= -180 && v <= 180 ? v : null
    }
    if (body.capacity !== undefined) {
      const v = parseInt(body.capacity)
      data.capacity = Number.isFinite(v) && v > 0 ? v : null
    }
    if (body.price !== undefined) {
      const v = parseFloat(body.price)
      data.price = Number.isFinite(v) && v >= 0 ? v : 0
    }
    if (body.currency !== undefined) data.currency = body.currency || 'EUR'
    if (body.pet_types !== undefined) data.pet_types = Array.isArray(body.pet_types) ? body.pet_types : []
    if (body.ticket_types !== undefined) data.ticket_types = Array.isArray(body.ticket_types) ? body.ticket_types : []
    if (body.is_international !== undefined) data.is_international = !!body.is_international

    // Featuring an event puts it on the front page — moderation, not self-service.
    if (body.is_featured !== undefined && isAdmin) data.is_featured = !!body.is_featured

    return data
  }

  app.get('/', async (req: any, reply) => {
    const lang = getRequestLang(req)
    const { q, city, country, event_type, upcoming, featured, mine, page = 1, limit = 20 } = req.query
    // Προσθετικό: ?mine=true → «Οι εκδηλώσεις μου» του διοργανωτή (μόνο
    // συνδεδεμένος), ΜΑΖΙ με τις ακυρωμένες — ώστε να ξαναβρίσκει μια
    // ακυρωμένη εκδήλωση με επιστροφές σε εκκρεμότητα.
    let mineEmail: string | null = null
    if (mine === 'true') {
      try {
        await req.jwtVerify()
        mineEmail = (req.user as any)?.email ?? null
      } catch { mineEmail = null }
      if (!mineEmail) return reply.code(401).send({ message: 'Μη εξουσιοδοτημένη πρόσβαση' })
    }
    const where: any = {}
    if (q) where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }]
    if (city) where.city = { contains: city, mode: 'insensitive' }
    if (country) where.country = country
    if (event_type) where.event_type = event_type
    if (featured === 'true') where.is_featured = true
    // Ακυρωμένες από τον διοργανωτή: εκτός δημόσιου καταλόγου (ανοίγουν με
    // τον σύνδεσμο, GET /:id, ή από το «Οι εκδηλώσεις μου», ?mine=true).
    if (mineEmail) where.organizer_email = mineEmail
    else where.cancelled_at = null
    if (upcoming === 'true') {
      const today = new Date().toISOString().split('T')[0]
      where.date = { gte: today }
    }
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100)
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take
    const [data, total] = await Promise.all([
      prisma.event.findMany({ where, skip, take, orderBy: { date: 'asc' } }),
      prisma.event.count({ where })
    ])
    const translated = await translateRecords('event', data, lang)
    // Προσθετικό πεδίο `cancelled`. Η λίστα φιλτράρει ήδη cancelled_at, άρα
    // εδώ μένουν μόνο ακυρώσεις πριν τη στήλη (μόνο στο audit): μία ερώτηση
    // στο audit για τα ids της σελίδας· σε σφάλμα το πεδίο λείπει (η δήλωση
    // κόβεται ούτως ή άλλως στο register).
    let legacy: Set<string> | null = null
    try { legacy = await cancelledEventIds(data.map(e => e.id)) } catch { legacy = null }
    let out = legacy
      ? translated.map((e: any) => ({ ...e, cancelled: e.cancelled_at != null || legacy!.has(e.id) }))
      : translated
    // «Οι εκδηλώσεις μου»: προσθετικό `refunds_pending` — πόσες επιστροφές
    // (αποτυχημένες ή σε εξέλιξη) περιμένουν «Ολοκλήρωση επιστροφών».
    if (mineEmail && data.length > 0) {
      try {
        const rows = await prisma.eventRegistration.groupBy({
          by: ['event_id'],
          where: { event_id: { in: data.map(e => e.id) }, status: { in: ['refund_failed', 'refunding'] } },
          _count: { _all: true },
        })
        const pending = new Map(rows.map(r => [r.event_id, r._count._all]))
        out = out.map((e: any) => ({ ...e, refunds_pending: pending.get(e.id) ?? 0 }))
      } catch { /* το πεδίο λείπει· η λίστα επιστρέφεται κανονικά */ }
    }
    return { data: out, total, page: Number(page), totalPages: Math.ceil(total / take) }
  })

  app.get('/:id', async (req: any) => {
    const lang = getRequestLang(req)
    const event = await prisma.event.findUniqueOrThrow({ where: { id: req.params.id } })
    const translated: any = await translateRecord('event', event, lang)
    // Προσθετικό: ορατό και σε μη συνδεδεμένους (το event_cancelled του
    // /:id/registration θέλει σύνδεση). Από τη στήλη cancelled_at· audit
    // μόνο για ακυρώσεις πριν τη στήλη. Σε σφάλμα βάσης: από τη στήλη.
    try {
      return { ...translated, cancelled: await isEventCancelled(event.id, event) }
    } catch {
      return { ...translated, cancelled: event.cancelled_at != null }
    }
  })

  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email, full_name, role } = req.user as any
    const body = (req.body ?? {}) as any

    if (!body.title || !body.date || !body.time || !body.location || !body.city) {
      return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })
    }

    const data = pickEventFields(body, role === 'admin')
    const problem = paidEventProblem(data)
    if (problem) return reply.code(400).send({ message: problem })
    return prisma.event.create({
      data: {
        ...data,
        // Ownership is taken from the session, never from the request.
        organizer_email: email,
        organizer: body.organizer || full_name || email.split('@')[0],
        description: data.description ?? '',
        country: data.country ?? 'GR',
        event_type: data.event_type ?? 'meetup',
      }
    })
  })

  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const event = await assertCanModify(req, reply, req.params.id)
    if (!event) return
    // Ακυρωμένη εκδήλωση: καμία αλλαγή (μένει ως είχε, με την ένδειξη).
    if (await isEventCancelled(event.id, event)) {
      return reply.code(409).send({ message: 'Η εκδήλωση ακυρώθηκε από τον διοργανωτή' })
    }
    const isAdmin = (req.user as any).role === 'admin'
    const data = pickEventFields(req.body ?? {}, isAdmin)
    if (Object.keys(data).length === 0) {
      return reply.code(400).send({ message: 'Καμία έγκυρη αλλαγή' })
    }
    // Όροι για τους οποίους έχουν ήδη πληρώσει: δεν αλλάζουν κάτω από αυτούς.
    const termsChanged = (['date', 'time', 'price', 'currency'] as const)
      .some(f => data[f] !== undefined && data[f] !== (event as any)[f])
    // Η μορφή ελέγχεται όταν αλλάζει κάποιος όρος, ώστε μια παλιά εκδήλωση
    // με ελεύθερο κείμενο να μπορεί ακόμη να διορθωθεί σε άλλα πεδία.
    if (termsChanged) {
      const problem = paidEventProblem({ ...event, ...data })
      if (problem) return reply.code(400).send({ message: problem })
    }
    if (!termsChanged) return prisma.event.update({ where: { id: event.id }, data })

    // Εκκρεμείς πληρωμές (εγκαταλειμμένα checkout) ΔΕΝ μπλοκάρουν: γίνονται
    // `cancelled` στην ίδια συναλλαγή, ώστε μια πληρωμή με τους παλιούς όρους
    // που φτάνει αργότερα να επιστραφεί αυτόματα (webhook → εγγραφή όχι
    // pending → refundOrphanPayment). Πληρωμένες/σε επιστροφή μπλοκάρουν.
    const updated = await prisma.$transaction(async (tx) => {
      await tx.eventRegistration.updateMany({
        where: { event_id: event.id, status: 'pending_payment' },
        data: { status: 'cancelled' },
      })
      if (await tx.eventRegistration.count({ where: moneyAtStakeWhere(event.id, false) }) > 0) {
        throw new RegistrationConflict('already')
      }
      return tx.event.update({ where: { id: event.id }, data })
    }).catch((err: any) => {
      if (err instanceof RegistrationConflict) return null
      throw err
    })
    if (!updated) {
      return reply.code(409).send({
        message: 'Υπάρχουν πληρωμένες συμμετοχές: η ημερομηνία, η ώρα, η τιμή και το νόμισμα δεν αλλάζουν πλέον. Επικοινώνησε με την υποστήριξη.',
      })
    }
    return updated
  })

  // ─── Registrations ─────────────────────────────────────────────────
  //
  // events.registered_count existed with no table behind it, so every event
  // reported zero attendees and there was no way to sign up at all.

  /** Am I registered, and how many places are left? */
  app.get('/:id/registration', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      select: { id: true, capacity: true, registered_count: true, price: true, date: true, time: true, cancelled_at: true },
    })
    if (!event) return reply.code(404).send({ message: 'Η εκδήλωση δεν βρέθηκε' })

    const mine = await prisma.eventRegistration.findUnique({
      where: { event_id_user_email: { event_id: event.id, user_email: email } },
    })
    const deadline = refundDeadline(event)
    const paid = isPaidRegistration(mine)
    return {
      data: {
        registered: mine?.status === 'registered',
        registration: mine ?? null,
        spots_left: event.capacity ? Math.max(0, event.capacity - event.registered_count) : null,
        // Κατάσταση πληρωμής (προσθετικά πεδία — οι παλιοί πελάτες τα αγνοούν).
        payment_required: event.price > 0,
        payment_status: mine?.status === 'pending_payment' ? 'pending'
          : paid ? 'paid'
          : mine?.status === 'refunded' ? 'refunded'
          : mine?.status === 'refund_failed' ? 'refund_failed'
          : mine?.status === 'refunding' ? 'refunding'
          : null,
        // Γιατί επιστράφηκαν τα χρήματα:
        // 'full' | 'cancelled' | 'event_cancelled' | null (άγνωστο).
        refund_reason: mine ? await refundReason(mine) : null,
        // Ο διοργανωτής ακύρωσε την εκδήλωση (μένει ορατή, με την ένδειξη).
        event_cancelled: await isEventCancelled(event.id, event),
        amount_paid: mine?.amount_paid ?? null,
        refund_hours: EVENT_REFUND_HOURS,
        refund_deadline: deadline ? deadline.toISOString() : null,
        // Αν ακυρώσει τώρα, παίρνει τα χρήματα πίσω;
        refundable: paid && !!deadline && Date.now() <= deadline.getTime(),
      },
    }
  })

  /** The organiser's attendee list. */
  app.get('/:id/registrations', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const user = req.user as any
    const event = await prisma.event.findUnique({ where: { id: req.params.id } })
    if (!event) return reply.code(404).send({ message: 'Η εκδήλωση δεν βρέθηκε' })
    if (event.organizer_email !== user.email && user.role !== 'admin') {
      return reply.code(403).send({ message: 'Δεν έχεις πρόσβαση στη λίστα συμμετεχόντων' })
    }
    const data = await prisma.eventRegistration.findMany({
      where: { event_id: event.id },
      orderBy: { created_at: 'asc' },
    })
    return { data }
  })

  app.post('/:id/register', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email, full_name } = req.user as any
    const { pet_id, pet_name, guests, notes } = (req.body ?? {}) as any

    const event = await prisma.event.findUnique({ where: { id: req.params.id } })
    if (!event) return reply.code(404).send({ message: 'Η εκδήλωση δεν βρέθηκε' })

    // A finished event cannot be joined.
    // «Σήμερα» στην Ελλάδα, όχι σε UTC.
    const today = athensToday()
    if ((event.end_date || event.date) < today) {
      return reply.code(400).send({ message: 'Η εκδήλωση έχει ολοκληρωθεί' })
    }
    // Fail-closed: αν δεν μπορούμε να ελέγξουμε την ακύρωση, καμία δήλωση/πληρωμή.
    let cancelledNow: boolean
    try {
      cancelledNow = await isEventCancelled(event.id, event)
    } catch (err: any) {
      console.error('[events] cancel check failed:', err?.message)
      return reply.code(503).send({ message: 'Η δήλωση δεν είναι δυνατή αυτή τη στιγμή. Δοκίμασε ξανά σε λίγο.' })
    }
    if (cancelledNow) {
      return reply.code(409).send({ message: 'Η εκδήλωση ακυρώθηκε από τον διοργανωτή' })
    }

    const existing = await prisma.eventRegistration.findUnique({
      where: { event_id_user_email: { event_id: event.id, user_email: email } },
    })
    if (existing?.status === 'registered') {
      return reply.code(409).send({ message: 'Έχεις ήδη δηλώσει συμμετοχή' })
    }
    // Οφειλόμενη ή εκκρεμής επιστροφή: η γραμμή κρατά τη συναλλαγή που
    // πρέπει να επιστραφεί — δεν ξαναχρησιμοποιείται.
    if (existing?.status === 'refund_failed' || existing?.status === 'refunding') {
      return reply.code(409).send({
        message: 'Εκκρεμεί επιστροφή χρημάτων για τη συμμετοχή σου — επικοινώνησε με την υποστήριξη πριν δηλώσεις ξανά.',
      })
    }
    // Μια εγγραφή `pending_payment` ΔΕΝ μπλοκάρει: ξαναπατώντας «Δήλωση» ο
    // χρήστης παίρνει νέα πληρωμή πάνω στην ίδια γραμμή.

    // Capacity counts the people already in, and this booking's own party.
    const partySize = 1 + Math.min(Math.max(parseInt(guests) || 0, 0), 10)
    if (event.capacity && event.registered_count + partySize > event.capacity) {
      return reply.code(409).send({ message: 'Δεν υπάρχουν αρκετές διαθέσιμες θέσεις' })
    }

    // A pet may be brought along, but only one the caller owns.
    if (pet_id) {
      const pet = await prisma.pet.findUnique({ where: { id: pet_id }, select: { owner_email: true, name: true } })
      if (!pet || pet.owner_email !== email) {
        return reply.code(403).send({ message: 'Το κατοικίδιο δεν σου ανήκει' })
      }
    }

    const data = {
      user_name: full_name || email.split('@')[0],
      pet_id: pet_id || null,
      pet_name: pet_name || null,
      guests: partySize - 1,
      notes: notes ? String(notes).slice(0, 500) : null,
      status: 'registered',
    }

    // ── Εκδήλωση με τιμή: πρώτα πληρωμή, μετά θέση ──────────────────────
    if (event.price > 0) {
      if ((event.currency || 'EUR') !== 'EUR') {
        return reply.code(400).send({ message: 'Οι πληρωμές εκδηλώσεων γίνονται μόνο σε ευρώ (EUR)' })
      }
      // Τιμή από τη βάση, ποτέ από τον πελάτη· ανά άτομο της παρέας.
      const amount = round2(event.price * partySize)
      const paymentFields = {
        ...data,
        status: 'pending_payment', amount_paid: amount,
        viva_order_code: null, viva_transaction_id: null,
      }
      // Ατομικά: η γραμμή ξαναχρησιμοποιείται μόνο αν δεν έγινε στο μεταξύ
      // `registered` (π.χ. webhook που μόλις επιβεβαίωσε) ή `refunding`.
      let pendingId: string
      try {
        if (existing) {
          const r = await prisma.eventRegistration.updateMany({
            where: { id: existing.id, status: { in: REUSABLE_STATUSES } },
            data: paymentFields,
          })
          if (r.count === 0) return reply.code(409).send({ message: 'Έχεις ήδη δηλώσει συμμετοχή' })
          pendingId = existing.id
        } else {
          const created = await prisma.eventRegistration.create({
            data: { event_id: event.id, user_email: email, ...paymentFields },
          })
          pendingId = created.id
        }
      } catch (err: any) {
        if (err?.code === 'P2002') return reply.code(409).send({ message: 'Έχεις ήδη δηλώσει συμμετοχή' })
        throw err
      }
      try {
        const frontendUrl = process.env.FRONTEND_URL || 'https://globipet.com'
        const { orderCode, checkoutUrl } = await createVivaPaymentOrder({
          amount,
          customerEmail: email,
          customerName: full_name,
          // merchantTrns: νέο σε κάθε δημιουργία, ώστε μια παλιά συναλλαγή να
          // μην μπορεί ποτέ να ταυτιστεί με νέα πληρωμή της ίδιας γραμμής.
          orderId: eventMerchantTrns(pendingId),
          description: `GlobiPet εκδήλωση: ${event.title}`.slice(0, 200),
          successUrl: `${frontendUrl}/events/${event.id}/confirmation`,
          failureUrl: `${frontendUrl}/events/${event.id}/confirmation`,
        })
        const registration = await prisma.eventRegistration.update({
          where: { id: pendingId },
          data: { viva_order_code: String(orderCode) },
        })
        return reply.code(201).send({ data: registration, checkoutUrl })
      } catch (err: any) {
        console.error('Event Viva checkout error:', err)
        return serverError(reply, err, 'event-checkout', 'Η πληρωμή δεν ξεκίνησε.')
      }
    }

    // ── Δωρεάν: γραμμή + θέση σε μία συναλλαγή, με ατομικό έλεγχο χωρητικότητας ──
    try {
      const registration = await prisma.$transaction(async (tx) => {
        if (existing) {
          // Προηγούμενη ακύρωση: η γραμμή ξαναχρησιμοποιείται. Γραμμή που
          // κάποτε πληρώθηκε (η εκδήλωση έγινε μετά δωρεάν): τα στοιχεία
          // πληρωμής σβήνουν, αλλιώς η ακύρωση θα επέστρεφε ξανά μια παλιά
          // συναλλαγή.
          const r = await tx.eventRegistration.updateMany({
            where: { id: existing.id, status: { in: REUSABLE_STATUSES } },
            data: { ...data, amount_paid: null, viva_order_code: null, viva_transaction_id: null },
          })
          if (r.count === 0) throw new RegistrationConflict('already')
        } else {
          await tx.eventRegistration.create({ data: { event_id: event.id, user_email: email, ...data } })
        }
        const counted = await tx.event.updateMany({
          where: event.capacity
            ? { id: event.id, registered_count: { lte: event.capacity - partySize } }
            : { id: event.id },
          data: { registered_count: { increment: partySize } },
        })
        if (counted.count === 0) throw new RegistrationConflict('full')
        return tx.eventRegistration.findUnique({
          where: { event_id_user_email: { event_id: event.id, user_email: email } },
        })
      })
      return reply.code(201).send({ data: registration })
    } catch (err: any) {
      if (err instanceof RegistrationConflict && err.kind === 'full') {
        return reply.code(409).send({ message: 'Δεν υπάρχουν αρκετές διαθέσιμες θέσεις' })
      }
      if (err instanceof RegistrationConflict || err?.code === 'P2002') {
        return reply.code(409).send({ message: 'Έχεις ήδη δηλώσει συμμετοχή' })
      }
      throw err
    }
  })

  /**
   * Επιβεβαίωση πληρωμής μετά την επιστροφή από τη Viva (σελίδα επιβεβαίωσης
   * web/κινητού). Το webhook του orders.ts κάνει το ίδιο ως εφεδρεία.
   */
  app.post('/registrations/:id/viva/verify', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const { id } = req.params
    const { transaction_id } = (req.body ?? {}) as any
    try {
      const reg = await prisma.eventRegistration.findUnique({ where: { id } })
      if (!reg || reg.user_email !== email) return reply.code(404).send({ message: 'Δεν βρέθηκε συμμετοχή' })

      // Το transaction id της Viva είναι UUID· οτιδήποτε άλλο δεν φτάνει στη Viva.
      if (transaction_id != null && transaction_id !== ''
        && (typeof transaction_id !== 'string' || !VIVA_TXN_RE.test(transaction_id))) {
        return reply.code(400).send({ message: 'Μη έγκυρο αναγνωριστικό συναλλαγής' })
      }

      if (reg.status === 'pending_payment' && transaction_id) {
        const r = await confirmEventRegistrationPayment(String(id), String(transaction_id))
        // Η Viva δεν απάντησε (5xx/δίκτυο): 503, ο πελάτης ξαναδοκιμάζει.
        if (r === 'error') {
          return reply.code(503).send({ message: 'Η επαλήθευση της πληρωμής δεν ολοκληρώθηκε. Δοκίμασε ξανά σε λίγο.', retry: true })
        }
      }
      const fresh = await prisma.eventRegistration.findUnique({ where: { id } })
      return { paid: fresh?.status === 'registered', status: fresh?.status ?? null, data: fresh }
    } catch (err: any) {
      console.error('Event verify error:', err)
      return serverError(reply, err, 'event-verify')
    }
  })

  app.delete('/:id/register', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const existing = await prisma.eventRegistration.findUnique({
      where: { event_id_user_email: { event_id: req.params.id, user_email: email } },
    })

    // Εκκρεμής πληρωμή: καμία θέση δεν έχει μετρηθεί, απλή ακύρωση. Η γραμμή
    // μένει (cancelled) ώστε μια καθυστερημένη πληρωμή από checkout που ήταν
    // ακόμη ανοιχτό να αναγνωριστεί και να επιστραφεί αυτόματα.
    // Ατομικά: αν το webhook την επιβεβαίωσε στο μεταξύ, δεν γίνεται cancelled.
    if (existing?.status === 'pending_payment') {
      const r = await prisma.eventRegistration.updateMany({
        where: { id: existing.id, status: 'pending_payment' },
        data: { status: 'cancelled' },
      })
      if (r.count === 0) {
        return reply.code(409).send({ message: 'Η συμμετοχή άλλαξε στο μεταξύ — ανανέωσε τη σελίδα και δοκίμασε ξανά.' })
      }
      return reply.code(204).send()
    }

    if (existing?.status === 'refunding') {
      return reply.code(409).send({ message: 'Η ακύρωση είναι ήδη σε εξέλιξη' })
    }
    if (!existing || existing.status !== 'registered') {
      return reply.code(404).send({ message: 'Δεν βρέθηκε συμμετοχή' })
    }

    // Πληρωμένη θέση: πλήρης επιστροφή έως 48 ώρες πριν, μετά καμία ακύρωση.
    if (isPaidRegistration(existing)) {
      const event = await prisma.event.findUnique({
        where: { id: req.params.id }, select: { date: true, time: true },
      })
      const deadline = event ? refundDeadline(event) : null
      if (!deadline || Date.now() > deadline.getTime()) {
        return reply.code(409).send({
          message: 'Η ακύρωση με επιστροφή χρημάτων γίνεται έως 48 ώρες πριν την έναρξη. Η θέση σου παραμένει.',
        })
      }

      const txn = String(existing.viva_transaction_id)
      // Διεκδίκηση: registered → refunding. Μόνο ένα αίτημα περνά (διπλό
      // κλικ, δύο συσκευές), άρα μία επιστροφή και μία αφαίρεση θέσης.
      const claimed = await prisma.eventRegistration.updateMany({
        where: { id: existing.id, status: 'registered', viva_transaction_id: txn },
        data: { status: 'refunding' },
      })
      if (claimed.count === 0) {
        return reply.code(409).send({ message: 'Η ακύρωση είναι ήδη σε εξέλιξη' })
      }

      // Η επιστροφή γίνεται ΠΡΙΝ μετρηθεί η ακύρωση: αν η Viva αρνηθεί, η
      // θέση επανέρχεται και ο χρήστης βλέπει σφάλμα — ποτέ «ακυρώθηκε» χωρίς χρήματα.
      let refundTx: string | null = null
      try {
        if (!(await alreadyRefunded(existing.id, txn))) {
          const r = await refundVivaTransaction(txn)
          refundTx = r.transactionId
          // Καταγραφή αμέσως μετά την επιτυχία: με αυτήν αναγνωρίζεται η
          // συναλλαγή ως ήδη επιστραμμένη σε επόμενες κλήσεις του webhook.
          await audit(req, {
            action: 'event_registration_refund', resource: 'event_registration', resource_id: existing.id,
            metadata: { event_id: req.params.id, amount: existing.amount_paid, transaction_id: txn, refund_tx: refundTx },
          })
        }
      } catch (err: any) {
        console.error('[viva] refund failed for event registration', existing.id, err?.message)
        await prisma.eventRegistration.updateMany({
          where: { id: existing.id, status: 'refunding' },
          data: { status: 'registered' },
        })
        return reply.code(502).send({
          message: 'Η επιστροφή χρημάτων δεν ολοκληρώθηκε, οπότε η συμμετοχή δεν ακυρώθηκε. Δοκίμασε ξανά σε λίγο.',
        })
      }

      const partySize = 1 + (existing.guests ?? 0)
      await prisma.$transaction([
        // Κρατιέται (refunded) για το ίχνος της πληρωμής· ξαναχρησιμοποιείται
        // αν ο χρήστης δηλώσει ξανά.
        prisma.eventRegistration.update({
          where: { id: existing.id },
          data: { status: 'refunded' },
        }),
        prisma.event.update({
          where: { id: req.params.id },
          data: { registered_count: { decrement: partySize } },
        }),
      ])
      await prisma.event.updateMany({
        where: { id: req.params.id, registered_count: { lt: 0 } },
        data: { registered_count: 0 },
      })
      return { data: { status: 'refunded', refund_amount: existing.amount_paid } }
    }

    const partySize = 1 + (existing.guests ?? 0)
    // Ατομικά: μόνο ένα αίτημα ακύρωσης αφαιρεί τη θέση.
    const cancelled = await prisma.$transaction(async (tx) => {
      // Kept, not deleted, so the organiser can see who dropped out.
      const r = await tx.eventRegistration.updateMany({
        where: { id: existing.id, status: 'registered' },
        data: { status: 'cancelled' },
      })
      if (r.count === 0) return false
      await tx.event.update({
        where: { id: req.params.id },
        data: { registered_count: { decrement: partySize } },
      })
      return true
    })
    if (!cancelled) {
      return reply.code(409).send({ message: 'Η συμμετοχή άλλαξε στο μεταξύ — ανανέωσε τη σελίδα και δοκίμασε ξανά.' })
    }
    await prisma.event.updateMany({
      where: { id: req.params.id, registered_count: { lt: 0 } },
      data: { registered_count: 0 },
    })
    return reply.code(204).send()
  })

  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const event = await assertCanModify(req, reply, req.params.id)
    if (!event) return
    // Ακυρωμένη εκδήλωση: δεν διαγράφεται — μένει (με «Ακυρώθηκε») ώστε οι
    // συμμετέχοντες να βλέπουν την κατάσταση της επιστροφής τους από τον
    // σύνδεσμο της ειδοποίησης, και να μη χαθεί το ίχνος των πληρωμών.
    if (await isEventCancelled(event.id, event)) {
      return reply.code(409).send({ message: 'Η εκδήλωση ακυρώθηκε από τον διοργανωτή' })
    }
    // Η διαγραφή σβήνει (cascade) και τις εγγραφές — μαζί και το ίχνος
    // πληρωμών που δεν έχουν επιστραφεί. Δεν γίνεται όσο υπάρχουν πληρωμένες
    // ή επιστροφές σε εκκρεμότητα· οι εκκρεμείς πληρωμές (εγκαταλειμμένα
    // checkout) δεν μπλοκάρουν — βλ. deleteEventIfSettled.
    const { deleted } = await deleteEventIfSettled(event.id, false)
    if (!deleted) {
      return reply.code(409).send({
        message: 'Υπάρχουν πληρωμένες συμμετοχές ή επιστροφές σε εξέλιξη — χρησιμοποίησε την «Ακύρωση εκδήλωσης» ώστε να επιστραφούν τα χρήματα. Η εκδήλωση δεν διαγράφηκε.',
      })
    }
    return { success: true }
  })

  /** Τι θα σημάνει η ακύρωση: πόσοι ειδοποιούνται, πόσοι παίρνουν πίσω χρήματα και πόσα. */
  app.get('/:id/cancel-preview', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const event = await assertCanModify(req, reply, req.params.id)
    if (!event) return
    const regs = await prisma.eventRegistration.findMany({
      where: { event_id: event.id, status: { in: ['registered', 'pending_payment', 'refund_failed', 'refunding'] } },
      select: { status: true, amount_paid: true, viva_transaction_id: true },
    })
    const refunds = regs.filter(r => isPaidRegistration(r)
      || ((r.status === 'refund_failed' || r.status === 'refunding') && !!r.viva_transaction_id && (r.amount_paid ?? 0) > 0))
    const alreadyCancelled = await isEventCancelled(event.id, event)
    return {
      data: {
        participants: regs.filter(r => r.status === 'registered').length,
        pending_payments: regs.filter(r => r.status === 'pending_payment').length,
        refunds: refunds.length,
        refund_total: round2(refunds.reduce((s, r) => s + (r.amount_paid ?? 0), 0)),
        currency: event.currency || 'EUR',
        already_cancelled: alreadyCancelled,
        // Προσθετικό: ακυρωμένη και όλα τακτοποιημένα (καμία ενεργή συμμετοχή,
        // πληρωμή ή επιστροφή σε εκκρεμότητα) — δεν μένει «Ολοκλήρωση επιστροφών».
        settled: alreadyCancelled && regs.length === 0,
        // Προσθετικό: μπορεί ο καλών να πατήσει «Ακύρωση» τώρα; (όχι αν η
        // εκδήλωση ξεκίνησε και δεν είναι admin — ίδιος κανόνας με το POST /:id/cancel)
        can_cancel: alreadyCancelled || !eventHasStarted(event) || (req.user as any).role === 'admin',
      },
    }
  })

  /**
   * Ακύρωση εκδήλωσης από τον διοργανωτή ή διαχειριστή: σήμανση cancelled_at,
   * πλήρης επιστροφή σε κάθε πληρωμένη συμμετοχή, ακύρωση των υπολοίπων και
   * ειδοποίηση σε όλους. Η εκδήλωση ΔΕΝ διαγράφεται (μένει με «Ακυρώθηκε»).
   *
   *   200 { data: report, settled: true, deleted: true }   — ολοκληρώθηκε
   *   207 { data: report, settled: false, deleted: false } — κάποιες επιστροφές απέτυχαν ή τρέχουν·
   *                                          η κλήση επαναλαμβάνεται («Ολοκλήρωση επιστροφών»)
   *   409                                  — η εκδήλωση ξεκίνησε ήδη και ο καλών δεν είναι admin
   * Το `deleted` μένει για τους παλιούς πελάτες ως «ολοκληρώθηκε» (= settled).
   */
  app.post('/:id/cancel', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const event = await assertCanModify(req, reply, req.params.id)
    if (!event) return

    let alreadyCancelled: boolean
    try {
      alreadyCancelled = await isEventCancelled(event.id)
    } catch (err: any) {
      return serverError(reply, err, 'event-cancel', 'Η ακύρωση δεν ξεκίνησε. Δοκίμασε ξανά σε λίγο.')
    }
    // Εκδήλωση που ξεκίνησε/έγινε ήδη: ο διοργανωτής δεν την ακυρώνει με
    // επιστροφές — μόνο ο διαχειριστής. Μια ακύρωση που είχε ξεκινήσει πριν
    // την έναρξη μπορεί πάντα να ολοκληρωθεί (οφειλόμενες επιστροφές).
    if (!alreadyCancelled && eventHasStarted(event) && (req.user as any).role !== 'admin') {
      return reply.code(409).send({
        message: 'Η εκδήλωση έχει ήδη ξεκινήσει ή πραγματοποιηθεί — η ακύρωση με επιστροφές γίνεται μόνο από την υποστήριξη.',
      })
    }

    // Σημείωση ακύρωσης ΠΡΩΤΑ (στήλη, ατομικά, μόνο αν είναι null): από εδώ
    // και πέρα καμία νέα δήλωση. Ακύρωση πριν τη στήλη (μόνο audit): η
    // στήλη παίρνει τη στιγμή εκείνης της σήμανσης.
    if (!event.cancelled_at) {
      let marked: number
      try {
        const legacyAt = alreadyCancelled ? await legacyCancelledAt(event.id) : null
        const r = await prisma.event.updateMany({
          where: { id: event.id, cancelled_at: null },
          data: { cancelled_at: legacyAt ?? new Date() },
        })
        marked = r.count
      } catch (err: any) {
        return serverError(reply, err, 'event-cancel', 'Η ακύρωση δεν ξεκίνησε. Δοκίμασε ξανά σε λίγο.')
      }
      // Καταγραφή μόνο για τη νέα σήμανση (όχι σε ταυτόχρονο αίτημα ή παλιά ακύρωση).
      if (marked > 0 && !alreadyCancelled) {
        await audit(req, {
          action: EVENT_CANCEL_ACTION, resource: 'event', resource_id: event.id,
          metadata: { title: event.title, date: event.date, price: event.price },
        })
      }
    }

    try {
      const report = await cancelEventWithRefunds(event.id)
      if (!report) return reply.code(404).send({ message: 'Η εκδήλωση δεν βρέθηκε' })
      await audit(req, {
        action: 'event_cancel_run', resource: 'event', resource_id: event.id,
        outcome: report.settled ? 'success' : 'failure',
        metadata: {
          settled: report.settled, refunded: report.refunded, refunded_amount: report.refunded_amount,
          cancelled: report.cancelled,
          failed: report.failed.map(f => f.registration_id),
          in_progress: report.in_progress.map(f => f.registration_id),
        },
      })
      if (report.settled) return { data: report, settled: true, deleted: true }
      await notifyOrganizerCancelIncomplete(event, report.failed.length + report.in_progress.length)
      return reply.code(207).send({
        data: report, settled: false, deleted: false,
        message: 'Η εκδήλωση ακυρώθηκε, αλλά κάποιες επιστροφές χρημάτων δεν ολοκληρώθηκαν. Δοκίμασε ξανά σε λίγο.',
      })
    } catch (err: any) {
      console.error('Event cancel error:', err)
      return serverError(reply, err, 'event-cancel', 'Η ακύρωση δεν ολοκληρώθηκε. Δοκίμασε ξανά.')
    }
  })
}
export default eventsRoutes
