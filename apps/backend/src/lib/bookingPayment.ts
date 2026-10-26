import prisma from './prisma.js'
import {
  getVivaTransaction, refundVivaTransaction, isVivaDefinitiveRejection, isRefundOutcomeUnknown,
  isVivaNotFoundYet, vivaForeignTransaction,
} from './viva.js'
import { bookingStart } from './cancellation.js'
import { auditSystem } from './audit.js'
import { countRedemptions } from './campaignDiscount.js'
import { sendBookingConfirmedEmail, sendProviderNewBookingEmail } from './email.js'
import { langOfUser, notifyTitle, notifyMsg } from './notifyText.js'
import { sendPushToUser } from './push.js'
import { broadcastToUser } from '../routes/notifications.js'
import { withRefundLock } from './refundLock.js'
import { awardForRecord } from './loyalty.js'

/**
 * Πληρωμή κράτησης υπηρεσίας μέσω Viva — επιβεβαίωση και προστασία από
 * διπλή χρέωση. Κοινό για το webhook (orders.ts) και το verify της σελίδας
 * επιβεβαίωσης (bookings.ts).
 *
 * ΡΟΗ
 *   1. POST /bookings/viva/checkout → ΝΕΑ παραγγελία Viva κάθε φορά
 *      (merchantTrns = id κράτησης, ποσό = total_price της βάσης, δηλ. ΗΔΗ
 *      μετά την έκπτωση καμπάνιας). Το payment_ref κρατά τον τελευταίο
 *      orderCode όσο η κράτηση είναι απλήρωτη.
 *   2. Επιστροφή στο /bookings/:id/confirmation (web) ή στην οθόνη
 *      booking-confirmation (κινητό) → verify με το ?t= της Viva· το webhook
 *      κάνει το ίδιο ανεξάρτητα.
 *   3. confirmBookingPayment: επαλήθευση στη Viva (F, merchantTrns === id,
 *      ποσό ≥ total_price) και ατομική διεκδίκηση unpaid → paid.
 *
 * ΔΙΠΛΗ ΧΡΕΩΣΗ
 *   Ο χρήστης μπορεί να ανοίξει δύο σελίδες πληρωμής (διπλό κλικ, δύο
 *   συσκευές, «Πληρωμή» από τη λίστα ενώ η πρώτη Viva ήταν ακόμη ανοιχτή).
 *   Η ΠΡΩΤΗ επιτυχής συναλλαγή πληρώνει την κράτηση (payment_ref = αυτή).
 *   Κάθε ΑΛΛΗ επιτυχής συναλλαγή για την ίδια κράτηση — ή πληρωμή που
 *   φτάνει αφού η κράτηση ακυρώθηκε — επιστρέφεται αυτόματα ολόκληρη, μία
 *   φορά (audit ανά συναλλαγή), όπως στις εκδηλώσεις.
 */

/** Καταστάσεις στις οποίες η κράτηση περιμένει (και δέχεται) πληρωμή. */
export const PAYABLE_STATUSES = ['pending', 'confirmed']

/**
 * Απλήρωτη και πληρώσιμη: όχι ακυρωμένη/ολοκληρωμένη, όχι πληρωμένη ή
 * επιστραμμένη, με θετικό ποσό, και το ραντεβού δεν έχει περάσει (ώρα Ελλάδας).
 */
export function isBookingPayable(b: any, now = new Date()): boolean {
  if (!b || b.payment_status !== 'unpaid') return false
  if (!PAYABLE_STATUSES.includes(b.status)) return false
  if (!(Number(b.total_price) > 0)) return false
  const start = bookingStart(b.booking_date, b.booking_time)
  return !!start && start.getTime() > now.getTime()
}

const REFUND_ACTION = 'booking_duplicate_refund'

/**
 * Προηγούμενη απόπειρα επιστροφής αυτής της συναλλαγής: 'success', 'unknown'
 * (άγνωστη έκβαση — ίσως επιστράφηκε· ΚΑΜΙΑ νέα επιστροφή, τη λύνει ο
 * διαχειριστής) ή null. Πριν μετρούσε μόνο η επιτυχία, οπότε μετά από
 * timeout της Viva ένα νέο /verify του πελάτη έκανε δεύτερη πλήρη επιστροφή.
 */
async function priorRefund(bookingId: string, transactionId: string): Promise<'success' | 'unknown' | null> {
  const rows = await prisma.auditLog.findMany({
    where: {
      resource: 'booking', resource_id: bookingId, action: REFUND_ACTION, outcome: { in: ['success', 'failure'] },
      metadata: { path: ['transaction_id'], equals: transactionId },
    },
    select: { outcome: true, metadata: true },
    take: 50,
  })
  if (rows.some(r => r.outcome === 'success')) return 'success'
  if (rows.some(r => r.outcome === 'failure' && (r.metadata as any)?.unknown_outcome === true)) return 'unknown'
  return null
}

/**
 * Επιστροφές σε εξέλιξη σε αυτή τη διεργασία (ίδια συναλλαγή δύο φορές
 * ταυτόχρονα). Πρώτο, φθηνό φίλτρο· η πραγματική διεκδίκηση, που ισχύει και
 * ανάμεσα σε πολλά instances, είναι το κλείδωμα της βάσης (withRefundLock).
 */
const refundsInFlight = new Set<string>()

/** Πλήρης επιστροφή μιας συναλλαγής που δεν πληρώνει (πια) την κράτηση. */
async function refundExtraPayment(
  bookingId: string, transactionId: string, why: string,
): Promise<'refunded' | 'already' | 'unknown' | 'failed'> {
  const key = `${bookingId}|${transactionId}`
  if (refundsInFlight.has(key)) return 'already'
  refundsInFlight.add(key)
  try {
    // Διεκδίκηση στη βάση γύρω από έλεγχο audit → επιστροφή → audit: δεύτερο
    // instance με την ίδια συναλλαγή παίρνει 'already' και δεν καλεί τη Viva.
    const r = await withRefundLock(`booking|${key}`, () => refundExtraPaymentLocked(bookingId, transactionId, why))
    return r.locked ? r.value : 'already'
  } catch (err: any) {
    // Η διεκδίκηση στη βάση δεν έγινε (σφάλμα σύνδεσης): καμία κλήση στη Viva.
    // Πετιέται, ώστε το webhook να απαντήσει 503 και η Viva να ξαναστείλει.
    console.error(`[viva] booking ${bookingId}: refund claim failed for ${transactionId} (${why}):`, err?.message)
    throw err
  } finally {
    refundsInFlight.delete(key)
  }
}

async function refundExtraPaymentLocked(
  bookingId: string, transactionId: string, why: string,
): Promise<'refunded' | 'already' | 'unknown' | 'failed'> {
  try {
    const prior = await priorRefund(bookingId, transactionId)
    if (prior === 'success') return 'already'
    if (prior === 'unknown') {
      // Ποτέ ξανά στα τυφλά. Η Viva 'R' (ολόκληρη επιστραμμένη) επιβεβαιώνει
      // ότι η επιστροφή έγινε → καταγραφή επιτυχίας, 'already'.
      let viva: string | null = null
      try { viva = String((await getVivaTransaction(transactionId))?.statusId ?? '') } catch { viva = null }
      if (viva === 'R') {
        await auditSystem({
          action: REFUND_ACTION, resource: 'booking', resource_id: bookingId,
          metadata: { transaction_id: transactionId, refund_tx: null, reason: why, source: 'viva_status_R' },
        })
        return 'already'
      }
      console.error(`[viva] booking ${bookingId}: earlier refund of ${transactionId} has unknown outcome — not refunded again (admin)`)
      return 'unknown'
    }
    const r = await refundVivaTransaction(transactionId)
    console.error(`[viva] booking ${bookingId}: transaction ${transactionId} refunded (${why})`)
    await auditSystem({
      action: REFUND_ACTION, resource: 'booking', resource_id: bookingId,
      metadata: { transaction_id: transactionId, refund_tx: r.transactionId, reason: why },
    })
    return 'refunded'
  } catch (err: any) {
    // Καταγράφεται κι η αποτυχία: πρέπει να βρεθεί και να γίνει με το χέρι.
    // Άγνωστη έκβαση (timeout/δίκτυο/5xx): `unknown_outcome` — καμία νέα
    // επιστροφή αυτής της συναλλαγής μέχρι να τη λύσει ο διαχειριστής.
    const unknown = isRefundOutcomeUnknown(err)
    console.error(`[viva] booking ${bookingId}: REFUND ${unknown ? 'OUTCOME UNKNOWN' : 'FAILED'} for ${transactionId} (${why}):`, err?.message)
    await auditSystem({
      action: REFUND_ACTION, resource: 'booking', resource_id: bookingId,
      outcome: 'failure', error_message: String(err?.message ?? err).slice(0, 500),
      metadata: { transaction_id: transactionId, reason: why, ...(unknown ? { unknown_outcome: true } : {}) },
    })
    return unknown ? 'unknown' : 'failed'
  }
}

/**
 * Επαληθεύει στη Viva ότι η συναλλαγή είναι επιτυχής, αφορά ΑΥΤΗ την
 * κράτηση και καλύπτει το ποσό της. Το webhook είναι ένδειξη, όχι απόδειξη.
 *
 *   'ok'      — επαληθεύτηκε
 *   'invalid' — η Viva απάντησε: η συναλλαγή δεν πληρώνει αυτή την κράτηση
 *   'error'   — η επαλήθευση δεν ολοκληρώθηκε (Viva 5xx/429, timeout, δίκτυο,
 *               διαπιστευτήρια): άγνωστο ακόμη, πρέπει να ξαναγίνει. Πριν
 *               αντιμετωπιζόταν ως 'invalid' και το webhook απαντούσε 200,
 *               άρα η Viva δεν το ξανάστελνε και η πληρωμή χανόταν. Επίσης
 *               Viva 404 για ΠΡΟΣΦΑΤΟ webhook (`retryNotFound`, lib/viva
 *               isVivaNotFoundYet)· το verify του πελάτη δεν το δίνει.
 */
async function verifyBookingTransaction(booking: { id: string; total_price: number }, transactionId: string, retryNotFound = false): Promise<'ok' | 'invalid' | 'error'> {
  try {
    const tx = await getVivaTransaction(transactionId)
    if (!tx || tx.statusId !== 'F') return 'invalid'
    // Κοινός λογαριασμός Viva: άλλη πηγή ή νόμισμα (όταν η Viva δίνει το πεδίο).
    const foreign = vivaForeignTransaction(tx)
    if (foreign) {
      console.error(`[viva] transaction ${transactionId} is not ours (${foreign}) — booking ${booking.id} not confirmed`)
      return 'invalid'
    }
    const trns = String(tx.merchantTrns ?? tx.MerchantTrns ?? '')
    if (trns !== booking.id) {
      console.error(`[viva] transaction ${transactionId} belongs to ${trns}, not booking ${booking.id}`)
      return 'invalid'
    }
    // Μη αριθμητικό ποσό (NaN) = άκυρη, όχι «περνά» (πριν ο έλεγχος ήταν fail-open).
    const paid = Number(tx.amount ?? tx.Amount ?? 0)
    if (!Number.isFinite(paid) || paid + 0.01 < booking.total_price) {
      console.error(`[viva] transaction ${transactionId} paid ${paid}, booking needs ${booking.total_price}`)
      return 'invalid'
    }
    return 'ok'
  } catch (err: any) {
    if (isVivaNotFoundYet(err, retryNotFound)) {
      console.error(`[viva] booking transaction ${transactionId} not found at Viva yet (recent webhook) — will retry`)
      return 'error'
    }
    if (isVivaDefinitiveRejection(err)) {
      console.error('[viva] booking transaction rejected by Viva:', err?.message)
      return 'invalid'
    }
    console.error('[viva] booking verification error (will retry):', err?.message)
    return 'error'
  }
}

export type BookingPaymentResult =
  | 'paid'          // αυτή η συναλλαγή πλήρωσε την κράτηση, τώρα
  | 'already'       // η ίδια συναλλαγή είχε ήδη καταχωρηθεί (επανάληψη)
  | 'refunded'      // επιπλέον/καθυστερημένη πληρωμή — επιστράφηκε αυτόματα
  | 'refund_failed' // επιπλέον πληρωμή, αλλά η Viva αρνήθηκε την επιστροφή
  | 'not_found'     // δεν υπάρχει κράτηση με αυτό το id
  | 'invalid'       // η συναλλαγή δεν επαληθεύτηκε
  | 'error'         // η επαλήθευση δεν ολοκληρώθηκε (Viva/δίκτυο) — ξαναδοκιμάζεται

/**
 * Καταχωρεί την πληρωμή μιας κράτησης. Ιδεμποτική: η Viva στέλνει το ίδιο
 * webhook περισσότερες από μία φορές, και το verify μπορεί να τρέξει μαζί.
 */
export async function confirmBookingPayment(bookingId: string, transactionId: string, retryNotFound = false): Promise<BookingPaymentResult> {
  const txn = String(transactionId)
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!booking) return 'not_found'
  const verdict = await verifyBookingTransaction(booking, txn, retryNotFound)
  if (verdict !== 'ok') return verdict

  // Η ήδη καταχωρημένη συναλλαγή (επανάληψη webhook/verify).
  if (booking.payment_ref === txn) return 'already'

  // Ατομική διεκδίκηση: μόνο μία συναλλαγή περνά unpaid → paid.
  const claimed = await prisma.booking.updateMany({
    where: { id: bookingId, payment_status: 'unpaid', status: { in: PAYABLE_STATUSES } },
    data: { status: 'confirmed', payment_status: 'paid', payment_ref: txn },
  })
  if (claimed.count > 0) {
    await firePaidSideEffects(bookingId).catch((err) => console.error('booking paid side effects error:', err))
    await awardForRecord('booking', bookingId, txn) // πόντοι επιβράβευσης (lib/loyalty — ιδεμποτικό, δεν πετάει)
    return 'paid'
  }

  const fresh = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!fresh) return 'not_found'
  if (fresh.payment_ref === txn) return 'already'

  // Πληρωμένη χωρίς αναφορά συναλλαγής: δεν ξέρουμε ποια είναι η «πρώτη» —
  // καμία αυτόματη επιστροφή, το βλέπει άνθρωπος.
  if (fresh.payment_status === 'paid' && !fresh.payment_ref) {
    console.error(`[viva] booking ${bookingId} is paid without payment_ref; transaction ${txn} left for manual review`)
    return 'invalid'
  }

  // Δεύτερη πληρωμή της ίδιας κράτησης, ή πληρωμή αφού ακυρώθηκε/επιστράφηκε.
  const why = fresh.payment_status === 'paid'
    ? 'duplicate payment of an already paid booking'
    : `booking is ${fresh.status}/${fresh.payment_status}`
  const r = await refundExtraPayment(bookingId, txn, why)
  // Άγνωστη έκβαση: όχι «επιστράφηκε» — στον διαχειριστή (ίδια τιμή με την αποτυχία).
  return r === 'failed' || r === 'unknown' ? 'refund_failed' : 'refunded'
}

/**
 * Για το κοινό webhook:
 *   'handled'  — το id ανήκει σε κράτηση και η συναλλαγή επαληθεύτηκε (χειρίστηκε εδώ)
 *   'retry'    — κράτηση, αλλά η επαλήθευση στη Viva δεν ολοκληρώθηκε: το
 *                webhook απαντά μη-2xx ώστε η Viva να το ξαναστείλει
 *   'not_mine' — δεν είναι κράτηση (ή άκυρη συναλλαγή): επόμενος κλάδος
 */
export async function handleBookingPaymentWebhook(ref: string, transactionId: string, retryNotFound = false): Promise<'handled' | 'retry' | 'not_mine'> {
  const r = await confirmBookingPayment(ref, transactionId, retryNotFound)
  if (r === 'error') return 'retry'
  return r !== 'not_found' && r !== 'invalid' ? 'handled' : 'not_mine'
}

/** Τώρα που πληρώθηκε, και ΜΟΝΟ τώρα, ενημερώνονται οι δύο πλευρές. */
async function firePaidSideEffects(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!booking) return

  await countRedemptions([booking.campaign_id])

  const service = await prisma.service.findUnique({ where: { id: booking.service_id } })

  sendBookingConfirmedEmail(booking.customer_email, {
    customerName: booking.customer_name ?? booking.customer_email.split('@')[0],
    providerName: booking.provider_name ?? (service?.provider_name ?? ''),
    date: booking.booking_date,
    time: booking.booking_time,
    price: booking.total_price,
  }).catch(() => {})

  sendProviderNewBookingEmail(booking.provider_email, {
    providerName: booking.provider_name ?? booking.provider_email.split('@')[0],
    customerName: booking.customer_name ?? booking.customer_email.split('@')[0],
    date: booking.booking_date,
    time: booking.booking_time,
    payoutAmount: booking.provider_payout_amount ?? 0,
  }).catch(() => {})

  const nLang = await langOfUser(booking.provider_email)
  const notification = await prisma.notification.create({
    data: {
      user_email: booking.provider_email,
      title: notifyTitle('booking_paid', nLang),
      message: notifyMsg.bookingPaid(nLang, booking.customer_name ?? booking.customer_email, booking.total_price.toFixed(2), booking.booking_date, booking.booking_time),
      type: 'booking_paid',
      link: '/provider',
    },
  }).catch(() => null)

  if (notification) {
    broadcastToUser(booking.provider_email, { type: 'notification', notification })
    void sendPushToUser(booking.provider_email, {
      title: notification.title, body: notification.message, url: notification.link ?? '/',
    })
  }
}
