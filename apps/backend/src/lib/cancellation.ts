import prisma from './prisma.js'
import { refundVivaTransaction, getVivaTransaction } from './viva.js'
import { audit, auditSystem } from './audit.js'
import { withRefundLock } from './refundLock.js'

/**
 * Πολιτική ακύρωσης κρατήσεων.
 *
 *   - Ο πελάτης ακυρώνει έως 24 ώρες πριν → πλήρης επιστροφή.
 *   - Ο πελάτης ακυρώνει μέσα στις 24 ώρες → επιστρέφεται το 50%.
 *   - Μετά την ώρα του ραντεβού ο πελάτης δεν ακυρώνει (έχει γίνει ή χάθηκε).
 *   - Ο πάροχος ή ο admin ακυρώνει → πάντα πλήρης επιστροφή στον πελάτη.
 *
 * Η επιστροφή γίνεται ΠΡΙΝ αλλάξει η κατάσταση: αν το Viva αρνηθεί, η
 * κράτηση μένει ως έχει και ο χρήστης βλέπει σφάλμα — ποτέ «ακυρώθηκε» χωρίς
 * τα χρήματα πίσω. Η συναλλαγή επιστροφής καταγράφεται στο audit log.
 *
 * Ίδιοι κανόνες για web και κινητό, γιατί ζουν μόνο εδώ.
 */
export const FREE_CANCEL_HOURS = 24
export const LATE_REFUND_RATIO = 0.5

const round2 = (n: number) => Math.round(n * 100) / 100

/** Πόσα λεπτά μπροστά από την UTC είναι η Αθήνα εκείνη τη στιγμή (θερινή/χειμερινή ώρα). */
function athensOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Athens', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(at)
  const g = (k: string) => Number(parts.find(p => p.type === k)?.value)
  const asUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'))
  return Math.round((asUtc - at.getTime()) / 60000)
}

/** Έναρξη ραντεβού: booking_date (YYYY-MM-DD) + booking_time (HH:MM), ώρα Ελλάδας. */
export function bookingStart(date: string | null | undefined, time: string | null | undefined): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(date ?? ''))
  if (!d) return null
  const tm = /^(\d{1,2}):(\d{2})/.exec(String(time ?? ''))
  const hh = tm ? Number(tm[1]) : 0
  const mm = tm ? Number(tm[2]) : 0
  const naive = Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), hh, mm)
  // Δύο περάσματα: η μετατόπιση της Αθήνας εξαρτάται από τη στιγμή.
  let off = athensOffsetMinutes(new Date(naive))
  off = athensOffsetMinutes(new Date(naive - off * 60000))
  return new Date(naive - off * 60000)
}

export type CancelBy = 'customer' | 'provider' | 'admin'

export function cancellationTerms(b: any, by: CancelBy, now = new Date()) {
  const total = Number(b.total_price) || 0
  const paid = b.payment_status === 'paid' && !!b.payment_ref
  const start = bookingStart(b.booking_date, b.booking_time)
  const hoursLeft = start ? (start.getTime() - now.getTime()) / 3_600_000 : null
  const freeUntil = start ? new Date(start.getTime() - FREE_CANCEL_HOURS * 3_600_000) : null

  if (!['pending', 'confirmed'].includes(b.status)) {
    return { allowed: false, reason: 'not_cancellable', paid, total, refund: 0, fee: 0, late: false, free_until: freeUntil, hours_left: hoursLeft }
  }
  if (by === 'customer' && hoursLeft !== null && hoursLeft <= 0) {
    return { allowed: false, reason: 'already_started', paid, total, refund: 0, fee: 0, late: true, free_until: freeUntil, hours_left: hoursLeft }
  }
  const late = by === 'customer' && hoursLeft !== null && hoursLeft < FREE_CANCEL_HOURS
  const refund = paid ? (late ? round2(total * LATE_REFUND_RATIO) : total) : 0
  return {
    allowed: true, reason: null, paid, total, refund,
    fee: paid ? round2(total - refund) : 0,
    late, free_until: freeUntil, hours_left: hoursLeft,
  }
}

export class CancelError extends Error {
  constructor(public code: number, message: string) { super(message) }
}

/** Εκτελεί την ακύρωση με την πολιτική. Πετά CancelError με κωδικό HTTP. */
export async function cancelBooking(req: any, bookingId: string, by: CancelBy) {
  const b = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!b) throw new CancelError(404, 'Η κράτηση δεν βρέθηκε')
  // Άλλο αίτημα έχει ήδη διεκδικήσει την επιστροφή (βλ. παρακάτω). Χωρίς
  // αυτόν τον έλεγχο η κράτηση θα έμοιαζε απλήρωτη και θα ακυρωνόταν χωρίς
  // επιστροφή.
  if (b.payment_status === 'refunding') {
    throw new CancelError(409, 'Η ακύρωση είναι ήδη σε εξέλιξη')
  }
  const terms = cancellationTerms(b, by)
  if (!terms.allowed) {
    throw new CancelError(400, terms.reason === 'already_started'
      ? 'Η ώρα του ραντεβού έχει περάσει — η κράτηση δεν ακυρώνεται πλέον.'
      : 'Η κράτηση δεν μπορεί να ακυρωθεί σε αυτή την κατάσταση.')
  }

  // Πληρωμένη: ατομική διεκδίκηση paid → refunding ΠΡΙΝ την επιστροφή, ώστε
  // διπλό κλικ / δύο συσκευές / πελάτης και πάροχος μαζί να μην κάνουν δύο
  // επιστροφές. Μόνο ένα αίτημα περνά· τα άλλα παίρνουν 409. Ίδιο μοτίβο με
  // την ακύρωση συμμετοχής σε εκδήλωση (registered → refunding).
  if (terms.paid) {
    const claimed = await prisma.booking.updateMany({
      where: { id: b.id, status: b.status, payment_status: 'paid', payment_ref: b.payment_ref },
      data: { payment_status: 'refunding' },
    })
    if (claimed.count === 0) {
      throw new CancelError(409, 'Η ακύρωση είναι ήδη σε εξέλιξη')
    }
  }

  let refundTx: string | null = null
  if (terms.refund > 0) {
    try {
      // Υπό διεκδίκηση στη βάση (lib/refundLock), με το ίδιο κλειδί που
      // χρησιμοποιεί η εργασία των κολλημένων επιστροφών· αμέσως μετά την
      // επιτυχία καταγράφεται (BOOKING_CANCEL_REFUND_ACTION) με τους όρους,
      // ώστε αν η διεργασία πέσει πριν σημειωθεί η ακύρωση, η εργασία του
      // lib/cron.ts να την ολοκληρώσει χωρίς νέα επιστροφή.
      const lock = await withRefundLock(bookingCancelLockKey(b.id, String(b.payment_ref)), async () => {
        const r = await refundVivaTransaction(String(b.payment_ref), terms.refund)
        await auditSystem({
          action: BOOKING_CANCEL_REFUND_ACTION, resource: 'booking', resource_id: b.id,
          subject_email: b.customer_email,
          metadata: {
            transaction_id: String(b.payment_ref), refund_tx: r.transactionId, by,
            late: terms.late, refund: terms.refund, fee: terms.fee, total: terms.total,
          },
        })
        return r.transactionId
      })
      if (!lock.locked) throw new Error('refund claim held elsewhere')
      refundTx = lock.value
    } catch (err: any) {
      console.error('[viva] refund failed for booking', b.id, err?.message)
      // Η επιστροφή απέτυχε: η κράτηση επανέρχεται πληρωμένη, όπως ήταν.
      await prisma.booking.updateMany({
        where: { id: b.id, payment_status: 'refunding' },
        data: { payment_status: 'paid' },
      }).catch((e: any) => console.error('[viva] could not restore booking', b.id, 'to paid:', e?.message))
      throw new CancelError(502, 'Η επιστροφή χρημάτων δεν ολοκληρώθηκε, οπότε η κράτηση δεν ακυρώθηκε. Δοκίμασε ξανά σε λίγο.')
    }
  }

  // Το κράτημα (50%) μοιράζεται αναλογικά όπως η αρχική πληρωμή.
  const keep = terms.total > 0 ? terms.fee / terms.total : 0
  const data: any = { status: 'cancelled' }
  if (terms.paid) {
    data.payment_status = terms.refund >= terms.total ? 'refunded' : 'partially_refunded'
    if (b.provider_payout_amount != null) data.provider_payout_amount = round2(b.provider_payout_amount * keep)
    if (b.platform_fee_amount != null) data.platform_fee_amount = round2(b.platform_fee_amount * keep)
  }
  // Απλήρωτη: ατομικά, μόνο αν δεν πληρώθηκε στο μεταξύ. Αλλιώς μια πληρωμή
  // που καταχωρήθηκε ανάμεσα στην ανάγνωση και την ακύρωση θα έμενε σε
  // ακυρωμένη κράτηση χωρίς επιστροφή.
  if (!terms.paid) {
    const r = await prisma.booking.updateMany({
      where: { id: b.id, payment_status: b.payment_status, status: b.status }, data,
    })
    if (r.count === 0) {
      throw new CancelError(409, 'Η κράτηση άλλαξε στο μεταξύ — ανανέωσε τη σελίδα και δοκίμασε ξανά.')
    }
  }
  const updated = terms.paid
    ? await prisma.booking.update({ where: { id: b.id }, data })
    : (await prisma.booking.findUnique({ where: { id: b.id } }))!

  await audit(req, {
    action: 'booking_cancel', resource: 'booking', resource_id: b.id,
    metadata: { by, late: terms.late, refund: terms.refund, fee: terms.fee, refund_tx: refundTx },
  })
  return { booking: updated, terms, refund_tx: refundTx }
}

// ─── Κολλημένες ακυρώσεις (`refunding`) ─────────────────────────────────
//
// Η ακύρωση πληρωμένης κράτησης περνά paid → refunding → (επιστροφή) →
// cancelled + refunded/partially_refunded. Αν η διεργασία πέσει στη μέση, η
// κράτηση μένει `refunding` για πάντα (καμία νέα ακύρωση: 409). Η εργασία
// του lib/cron.ts (κάθε 15') τις τακτοποιεί ΧΩΡΙΣ ποτέ νέα επιστροφή:
//   · Επιτυχής επιστροφή στο audit (BOOKING_CANCEL_REFUND_ACTION, ίδια
//     συναλλαγή) → ολοκληρώνεται η ακύρωση με τους όρους που καταγράφηκαν.
//   · Αλλιώς δεν κρίνεται με βεβαιότητα (και η Viva δεν λέει το ποσό μιας
//     επιστροφής που ίσως έγινε): η κράτηση ΜΕΝΕΙ `refunding` — δεν υπάρχει
//     κατάσταση «αποτυχημένη επιστροφή» για κρατήσεις — και γράφεται ΜΙΑ
//     καταγραφή για τον διαχειριστή (BOOKING_REFUND_UNRESOLVED_ACTION, με την
//     κατάσταση της συναλλαγής στη Viva).
// «Κολλημένη»: updated_at παλαιότερο από 15' (η διεκδίκηση το ανανεώνει) και
// κανένα κλείδωμα επιστροφής (withRefundLock) εκείνη τη στιγμή.

export const BOOKING_CANCEL_REFUND_ACTION = 'booking_cancel_refund'
const BOOKING_REFUND_UNRESOLVED_ACTION = 'booking_refund_unresolved'
const STUCK_BOOKING_REFUND_MS = 15 * 60_000

export const bookingCancelLockKey = (bookingId: string, transactionId: string) =>
  `booking_cancel|${bookingId}|${transactionId}`

export async function resolveStuckBookingRefunds(): Promise<{ completed: number; flagged: number }> {
  const out = { completed: 0, flagged: 0 }
  const stuck = await prisma.booking.findMany({
    where: { payment_status: 'refunding', updated_at: { lt: new Date(Date.now() - STUCK_BOOKING_REFUND_MS) } },
    orderBy: { updated_at: 'asc' },
    take: 1000,
  })
  // Οι ήδη σημειωμένες για τον admin μένουν refunding για πάντα και είναι
  // πάντα οι παλαιότερες — δεν μετράνε στο όριο, ώστε οι νέες να εξετάζονται.
  let examined = 0
  for (const s of stuck) {
    if (examined >= 100) break
    try {
      const txn = String(s.payment_ref ?? '')
      if (!txn) continue
      const flagged = await prisma.auditLog.findFirst({
        where: {
          resource: 'booking', resource_id: s.id, action: BOOKING_REFUND_UNRESOLVED_ACTION,
          metadata: { path: ['transaction_id'], equals: txn },
          created_at: { gte: s.updated_at },
        },
        select: { id: true },
      })
      if (flagged) continue
      examined++

      const lock = await withRefundLock(bookingCancelLockKey(s.id, txn), async () => {
        const b = await prisma.booking.findUnique({ where: { id: s.id } })
        if (!b || b.payment_status !== 'refunding' || b.payment_ref !== txn) return null
        if (Date.now() - b.updated_at.getTime() < STUCK_BOOKING_REFUND_MS) return null

        const done = await prisma.auditLog.findFirst({
          where: {
            resource: 'booking', resource_id: b.id, action: BOOKING_CANCEL_REFUND_ACTION, outcome: 'success',
            metadata: { path: ['transaction_id'], equals: txn },
          },
          orderBy: { created_at: 'desc' },
          select: { metadata: true },
        })
        if (done) {
          // Η επιστροφή έγινε: ολοκλήρωση της ακύρωσης ακριβώς όπως η cancelBooking.
          const m = (done.metadata ?? {}) as any
          const total = Number(m.total) || Number(b.total_price) || 0
          const refund = Number(m.refund) || 0
          const fee = Number(m.fee) || round2(total - refund)
          const keep = total > 0 ? fee / total : 0
          const data: any = {
            status: 'cancelled',
            payment_status: refund >= total ? 'refunded' : 'partially_refunded',
          }
          if (b.provider_payout_amount != null) data.provider_payout_amount = round2(b.provider_payout_amount * keep)
          if (b.platform_fee_amount != null) data.platform_fee_amount = round2(b.platform_fee_amount * keep)
          const r = await prisma.booking.updateMany({ where: { id: b.id, payment_status: 'refunding', payment_ref: txn }, data })
          if (r.count === 0) return null
          await auditSystem({
            action: 'booking_cancel', resource: 'booking', resource_id: b.id, subject_email: b.customer_email,
            metadata: { by: m.by ?? null, late: !!m.late, refund, fee, refund_tx: m.refund_tx ?? null, resolved_by: 'stuck_refund_job' },
          })
          return 'completed' as const
        }

        // Δεν κρίνεται με βεβαιότητα: καμία επιστροφή, καμία αλλαγή — μία
        // καταγραφή για τον διαχειριστή με ό,τι λέει η Viva.
        let viva = 'unknown'
        try {
          const tx = await getVivaTransaction(txn)
          viva = String(tx?.statusId ?? 'unknown')
        } catch (err: any) {
          viva = `error: ${String(err?.message ?? err).slice(0, 200)}`
        }
        await auditSystem({
          action: BOOKING_REFUND_UNRESOLVED_ACTION, resource: 'booking', resource_id: b.id, subject_email: b.customer_email,
          outcome: 'failure',
          error_message: 'Cancellation stuck in refunding; refund not confirmed — needs manual review (no new refund was made)',
          metadata: { transaction_id: txn, viva_status: viva, total: b.total_price },
        })
        return 'flagged' as const
      })
      if (lock.locked && lock.value === 'completed') out.completed++
      if (lock.locked && lock.value === 'flagged') out.flagged++
    } catch (err: any) {
      console.error(`[refunds] stuck booking ${s.id}:`, err?.message)
    }
  }
  return out
}
