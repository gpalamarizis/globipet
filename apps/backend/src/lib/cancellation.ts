import prisma from './prisma.js'
import { refundVivaTransaction, getVivaTransaction, isRefundOutcomeUnknown } from './viva.js'
import { audit, auditSystem } from './audit.js'
import { withRefundLock } from './refundLock.js'
import { langOfUser, notifyTitle, notifyMsg } from './notifyText.js'
import { sendPushToUser } from './push.js'
import { broadcastToUser } from '../routes/notifications.js'

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
  // Μη αναγνώσιμη ημερομηνία/ώρα: πριν, το hoursLeft null άφηνε τον πελάτη
  // να ακυρώσει ΠΑΝΤΑ με πλήρη επιστροφή (ούτε «έχει περάσει» ούτε «αργά»).
  // Πληρωμένη → μόνο από πάροχο/διαχειριστή. Απλήρωτη: δεν κινούνται χρήματα.
  if (by === 'customer' && !start && b.payment_status === 'paid') {
    return { allowed: false, reason: 'unknown_start', paid, total, refund: 0, fee: 0, late: false, free_until: null, hours_left: null }
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

/**
 * Ο πελάτης μαθαίνει ότι η ακύρωση που είχε μείνει «σε εξέλιξη» (refunding)
 * ολοκληρώθηκε και πόσα επιστράφηκαν — όταν την κλείνει η εργασία των
 * κολλημένων ή ο διαχειριστής. Μοτίβο notifyRegistrationRefunded (events.ts).
 * Ποτέ δεν πετάει.
 */
export async function notifyCancelRefundCompleted(kind: 'booking' | 'telehealth', rec: any, amount: number) {
  const email: string = kind === 'booking' ? rec?.customer_email : rec?.client_email
  if (!email || !(amount > 0)) return
  try {
    const lang = await langOfUser(email)
    const message = kind === 'booking'
      ? notifyMsg.bookingRefundCompleted(lang, rec.provider_name ?? '', rec.booking_date ?? '', rec.booking_time ?? '', amount.toFixed(2))
      : notifyMsg.telehealthRefundCompleted(lang, rec.scheduled_date ?? '', rec.scheduled_time ?? '', amount.toFixed(2))
    const notification = await prisma.notification.create({
      data: {
        user_email: email,
        title: notifyTitle('cancel_refund_completed', lang),
        message,
        type: 'cancel_refund_completed',
        link: kind === 'booking' ? '/bookings' : '/telehealth',
      },
    })
    broadcastToUser(email, { type: 'notification', notification })
    void sendPushToUser(email, {
      title: notification.title, body: notification.message, url: notification.link ?? '/',
      data: { type: 'cancel_refund_completed' },
    })
  } catch (err: any) {
    console.error(`[refunds] cancel refund completed notification to ${email} failed:`, err?.message)
  }
}

/**
 * Επιτυχής επιστροφή του διαχειριστή (POST /admin/refund → audit 'refund')
 * αυτής της συναλλαγής. Αν η διεργασία έπεσε πριν γραφτεί η τελική
 * κατάσταση, η εγγραφή έμεινε `refunding`: η εργασία των κολλημένων την
 * ολοκληρώνει όπως το admin.ts (μόνο payment_status, με το ποσό/full που
 * καταγράφηκαν) — καμία νέα επιστροφή.
 */
async function adminRefundSuccess(resource: 'booking' | 'telehealth', id: string, txn: string) {
  const row = await prisma.auditLog.findFirst({
    where: {
      resource, resource_id: id, action: 'refund', outcome: 'success',
      metadata: { path: ['transaction_id'], equals: txn },
    },
    orderBy: { created_at: 'desc' },
    select: { metadata: true },
  })
  return row ? ((row.metadata ?? {}) as any) : null
}

/** Τελική κατάσταση πληρωμής επιστροφής admin — ίδια λογική με το admin.ts. */
function adminRefundFinalStatus(m: any, total: number): 'refunded' | 'partially_refunded' {
  if (typeof m?.full === 'boolean') return m.full ? 'refunded' : 'partially_refunded'
  if (m?.new_status === 'refunded' || m?.new_status === 'partially_refunded') return m.new_status
  const amount = Number(m?.amount)
  return !Number.isFinite(amount) || amount >= total - 0.005 ? 'refunded' : 'partially_refunded'
}

/**
 * Η Viva δεν απάντησε με βεβαιότητα (timeout, δίκτυο, 5xx): η επιστροφή ΙΣΩΣ
 * έγινε. Η εγγραφή ΜΕΝΕΙ `refunding` — η εργασία των κολλημένων (lib/cron.ts,
 * κάθε 15') την ολοκληρώνει από το audit ή τη σημειώνει για τον διαχειριστή
 * («Αποτυχημένες επιστροφές»). Ποτέ επαναφορά σε πληρωμένη (θα επέτρεπε
 * δεύτερη επιστροφή) και ποτέ νέα επιστροφή στα τυφλά.
 */
export const REFUND_IN_PROGRESS_MESSAGE = 'Η επιστροφή είναι σε εξέλιξη — θα ενημερωθείς'

/** Μετάθεση πληρωμένου ραντεβού: μηνύματα (μεταφράζονται στο lib/apiMessages). */
export const RESCHEDULE_TOO_LATE_MESSAGE = 'Η ημερομηνία και η ώρα αλλάζουν έως 24 ώρες πριν από το ραντεβού.'
export const RESCHEDULE_PAST_MESSAGE = 'Η νέα ημερομηνία και ώρα πρέπει να είναι στο μέλλον.'

/**
 * Μετάθεση (ημερομηνία/ώρα) πληρωμένου ραντεβού από τον πελάτη — κρατήσεις
 * και τηλεϊατρική. Πριν, ο πελάτης μετέφερε ελεύθερα ένα ραντεβού που ήταν
 * σε λίγες ώρες σε μακρινή ημερομηνία και το ακύρωνε με 100% επιστροφή,
 * παρακάμπτοντας την πολιτική FREE_CANCEL_HOURS.
 *   · refunding (ακύρωση σε εξέλιξη) → καμία αλλαγή, από κανέναν.
 *   · paid / partially_refunded, από τον πελάτη → μόνο αν η ΤΡΕΧΟΥΣΑ έναρξη
 *     απέχει > FREE_CANCEL_HOURS (ώρα Αθήνας, bookingStart) ΚΑΙ η νέα είναι
 *     στο μέλλον.
 * Επιστρέφει { code, message } αν η αλλαγή δεν επιτρέπεται, αλλιώς null.
 * Καλείται μόνο όταν η ημερομηνία ή η ώρα πράγματι αλλάζει.
 */
export function rescheduleBlock(
  paymentStatus: string, byCustomer: boolean,
  cur: { date: string | null | undefined; time: string | null | undefined },
  next: { date: string | null | undefined; time: string | null | undefined },
  now = new Date(),
): { code: number; message: string } | null {
  if (paymentStatus === 'refunding') return { code: 409, message: 'Η ακύρωση είναι ήδη σε εξέλιξη' }
  if (!byCustomer || !['paid', 'partially_refunded'].includes(paymentStatus)) return null
  const curStart = bookingStart(cur.date, cur.time)
  if (curStart && (curStart.getTime() - now.getTime()) / 3_600_000 <= FREE_CANCEL_HOURS) {
    return { code: 409, message: RESCHEDULE_TOO_LATE_MESSAGE }
  }
  const nextStart = bookingStart(next.date, next.time)
  if (!nextStart || nextStart.getTime() <= now.getTime()) return { code: 409, message: RESCHEDULE_PAST_MESSAGE }
  return null
}

/** Παλιά εφαρμογή (PATCH status cancelled) σε αργή ακύρωση με χρέωση. */
export const TELEHEALTH_LATE_CANCEL_USE_APP_MESSAGE = 'Η ακύρωση αυτής της συνεδρίας έχει χρέωση — χρησιμοποίησε την ενημερωμένη εφαρμογή ή επικοινώνησε με την υποστήριξη.'

/** Πληρωμένη συνεδρία που δεν ακυρώνεται από εδώ (μεταφράζεται στο lib/apiMessages). */
export const TELEHEALTH_CONTACT_SUPPORT_MESSAGE = 'Η συνεδρία έχει πληρωθεί· για ακύρωση επικοινώνησε με την υποστήριξη.'

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

  // Ούτε απλήρωτη ούτε πληρωμένη με αναφορά Viva (π.χ. μερική επιστροφή από
  // admin, ή «paid» χωρίς payment_ref): καμία ακύρωση χωρίς επιστροφή — στον
  // admin. Ίδιος κανόνας με την τηλεϊατρική.
  if (!terms.paid && !['unpaid', 'refunded'].includes(String(b.payment_status))) {
    throw new CancelError(409, 'Η κράτηση έχει πληρωθεί· για ακύρωση επικοινώνησε με την υποστήριξη.')
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
      if (isRefundOutcomeUnknown(err)) {
        // Άγνωστη έκβαση: μένει `refunding` (βλ. REFUND_IN_PROGRESS_MESSAGE).
        await audit(req, {
          action: BOOKING_CANCEL_REFUND_ACTION, resource: 'booking', resource_id: b.id,
          subject_email: b.customer_email,
          outcome: 'failure', status_code: 502, error_message: String(err?.message ?? err).slice(0, 500),
          metadata: {
            transaction_id: String(b.payment_ref), unknown_outcome: true, by,
            late: terms.late, refund: terms.refund, fee: terms.fee, total: terms.total,
          },
        })
        throw new CancelError(502, REFUND_IN_PROGRESS_MESSAGE)
      }
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
    metadata: {
      by, late: terms.late, refund: terms.refund, fee: terms.fee, refund_tx: refundTx,
      // Κλείνει τυχόν αποτυχία της ίδιας συναλλαγής στις «Αποτυχημένες επιστροφές».
      transaction_id: terms.paid ? String(b.payment_ref) : null,
    },
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

/**
 * Όροι της τελευταίας ακύρωσης με ΑΓΝΩΣΤΗ έκβαση (audit unknown_outcome) για
 * αυτή τη συναλλαγή, ΜΟΝΟ αν ήταν πλήρης επιστροφή. Τότε η κατάσταση 'R' της
 * συναλλαγής στη Viva (ολόκληρη επιστραμμένη) επιβεβαιώνει ότι η επιστροφή
 * έγινε. Σε μερική (50%) η Viva δεν λέει το ποσό → καμία αυτόματη απόφαση.
 */
async function unknownFullRefundTerms(resource: string, action: string, id: string, txn: string, total: number) {
  const row = await prisma.auditLog.findFirst({
    where: {
      resource, resource_id: id, action, outcome: 'failure',
      AND: [
        { metadata: { path: ['transaction_id'], equals: txn } },
        { metadata: { path: ['unknown_outcome'], equals: true } },
      ],
    },
    orderBy: { created_at: 'desc' },
    select: { metadata: true },
  })
  if (!row) return null
  const m = (row.metadata ?? {}) as any
  const refund = Number(m.refund) || 0
  if (!(total > 0) || refund < total - 0.005) return null
  return { by: m.by ?? null, refund: total, fee: 0, total }
}

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
            metadata: { by: m.by ?? null, late: !!m.late, refund, fee, refund_tx: m.refund_tx ?? null, transaction_id: txn, resolved_by: 'stuck_refund_job' },
          })
          await notifyCancelRefundCompleted('booking', b, refund)
          return 'completed' as const
        }

        // Επιστροφή του διαχειριστή που έγινε (audit 'refund') αλλά δεν
        // γράφτηκε η τελική κατάσταση: μόνο payment_status, όπως το admin.ts.
        const adm = await adminRefundSuccess('booking', b.id, txn)
        if (adm) {
          const status = adminRefundFinalStatus(adm, Number(b.total_price) || 0)
          const r = await prisma.booking.updateMany({
            where: { id: b.id, payment_status: 'refunding', payment_ref: txn }, data: { payment_status: status },
          })
          if (r.count === 0) return null
          await auditSystem({
            action: 'admin_refund_completed', resource: 'booking', resource_id: b.id, subject_email: b.customer_email,
            metadata: { transaction_id: txn, amount: adm.amount ?? null, new_status: status, resolved_by: 'stuck_refund_job' },
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
        // Άγνωστη έκβαση πλήρους επιστροφής + Viva 'R' → η επιστροφή έγινε:
        // ολοκλήρωση της ακύρωσης (καμία νέα επιστροφή).
        if (viva === 'R') {
          const total = Number(b.total_price) || 0
          const u = await unknownFullRefundTerms('booking', BOOKING_CANCEL_REFUND_ACTION, b.id, txn, total)
          if (u) {
            // Πλήρης επιστροφή: τίποτα δεν κρατιέται (όπως η cancelBooking με keep = 0).
            const data: any = { status: 'cancelled', payment_status: 'refunded' }
            if (b.provider_payout_amount != null) data.provider_payout_amount = 0
            if (b.platform_fee_amount != null) data.platform_fee_amount = 0
            const r = await prisma.booking.updateMany({
              where: { id: b.id, payment_status: 'refunding', payment_ref: txn }, data,
            })
            if (r.count === 0) return null
            await auditSystem({
              action: 'booking_cancel', resource: 'booking', resource_id: b.id, subject_email: b.customer_email,
              metadata: { by: u.by, late: false, refund: u.refund, fee: 0, refund_tx: null, transaction_id: txn, resolved_by: 'stuck_refund_job', source: 'viva_status_R' },
            })
            await notifyCancelRefundCompleted('booking', b, u.refund)
            return 'completed' as const
          }
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

// ─── Τηλεϊατρική ────────────────────────────────────────────────────────
//
// ΙΔΙΟΙ κανόνες με τις κρατήσεις (απόφαση ιδιοκτήτη): ο πελάτης έως
// FREE_CANCEL_HOURS πριν → 100%, αργότερα → LATE_REFUND_RATIO, μετά την
// έναρξη → όχι· πάροχος/admin → πάντα 100%. Οι όροι υπολογίζονται από την
// ίδια cancellationTerms, με τα πεδία της συνεδρίας στη θέση της κράτησης.
//
// Ροή πληρωμένης: ατομική διεκδίκηση paid → refunding (μόνο ένα αίτημα
// περνά) + audit TELEHEALTH_REFUND_CLAIM_ACTION (η συνεδρία δεν έχει
// updated_at: η ώρα της διεκδίκησης κρατιέται στο audit, για την εργασία
// των κολλημένων) → υπό withRefundLock: έλεγχος audit επιτυχίας → επιστροφή
// Viva → audit επιτυχίας → cancelled + refunded/partially_refunded, με
// αναλογική μείωση αμοιβής παρόχου/προμήθειας. Αποτυχία Viva → πίσω σε
// paid, 502, audit αποτυχίας.

export const TELEHEALTH_CANCEL_REFUND_ACTION = 'telehealth_cancel_refund'
export const TELEHEALTH_REFUND_CLAIM_ACTION = 'telehealth_refund_claim'
const TELEHEALTH_REFUND_UNRESOLVED_ACTION = 'telehealth_refund_unresolved'

export const telehealthCancelLockKey = (consultationId: string, transactionId: string) =>
  `telehealth_cancel|${consultationId}|${transactionId}`

/** Κατάσταση συνεδρίας → κατάσταση κράτησης για την cancellationTerms. */
const TELEHEALTH_STATUS_AS_BOOKING: Record<string, string> = {
  pending_payment: 'pending',
  scheduled: 'confirmed',
}

export function telehealthCancellationTerms(c: any, by: CancelBy, now = new Date()) {
  return cancellationTerms({
    total_price: c.price,
    payment_status: c.payment_status,
    payment_ref: c.payment_ref,
    booking_date: c.scheduled_date,
    booking_time: c.scheduled_time,
    status: TELEHEALTH_STATUS_AS_BOOKING[c.status] ?? c.status,
  }, by, now)
}

/** Η επιτυχής επιστροφή ακύρωσης αυτής της συναλλαγής, αν έχει γίνει. */
async function telehealthRefundDone(consultationId: string, txn: string) {
  return prisma.auditLog.findFirst({
    where: {
      resource: 'telehealth', resource_id: consultationId, action: TELEHEALTH_CANCEL_REFUND_ACTION, outcome: 'success',
      metadata: { path: ['transaction_id'], equals: txn },
    },
    orderBy: { created_at: 'desc' },
    select: { metadata: true },
  })
}

/** Τελικά πεδία ακύρωσης πληρωμένης συνεδρίας — ίδια αναλογία με τις κρατήσεις. */
function telehealthCancelledData(c: any, total: number, refund: number, fee: number) {
  const keep = total > 0 ? fee / total : 0
  const data: any = {
    status: 'cancelled',
    payment_status: refund >= total ? 'refunded' : 'partially_refunded',
  }
  if (c.provider_payout_amount != null) data.provider_payout_amount = round2(c.provider_payout_amount * keep)
  if (c.platform_fee_amount != null) data.platform_fee_amount = round2(c.platform_fee_amount * keep)
  return data
}

/** Ακύρωση συνεδρίας τηλεϊατρικής με την πολιτική. Πετά CancelError με κωδικό HTTP. */
export async function cancelTelehealth(req: any, consultationId: string, by: CancelBy) {
  const c = await prisma.telehealthConsultation.findUnique({ where: { id: consultationId } })
  if (!c) throw new CancelError(404, 'Δεν βρέθηκε')
  if (c.payment_status === 'refunding') {
    throw new CancelError(409, 'Η ακύρωση είναι ήδη σε εξέλιξη')
  }
  let terms = telehealthCancellationTerms(c, by)
  if (!terms.allowed) {
    throw new CancelError(400, terms.reason === 'already_started'
      ? 'Η ώρα της συνεδρίας έχει περάσει — η συνεδρία δεν ακυρώνεται πλέον.'
      : 'Η συνεδρία δεν μπορεί να ακυρωθεί σε αυτή την κατάσταση.')
  }
  const txn = String(c.payment_ref ?? '')
  // Χωρίς επιστροφή ακυρώνεται μόνο η απλήρωτη (ή η ήδη πλήρως επιστραμμένη
  // από τον διαχειριστή). Μερικώς επιστραμμένη ή «πληρωμένη» χωρίς αναφορά
  // πληρωμής: δεν ακυρώνεται χωρίς επιστροφή — μόνο από την υποστήριξη.
  if (!terms.paid && !['unpaid', 'refunded'].includes(c.payment_status)) {
    throw new CancelError(409, TELEHEALTH_CONTACT_SUPPORT_MESSAGE)
  }

  // Πληρωμένη: ατομική διεκδίκηση paid → refunding ΠΡΙΝ την επιστροφή
  // (διπλό κλικ, δύο συσκευές, πελάτης και πάροχος μαζί → μία επιστροφή).
  if (terms.paid) {
    const claimed = await prisma.telehealthConsultation.updateMany({
      where: { id: c.id, status: c.status, payment_status: 'paid', payment_ref: c.payment_ref },
      data: { payment_status: 'refunding' },
    })
    if (claimed.count === 0) {
      throw new CancelError(409, 'Η ακύρωση είναι ήδη σε εξέλιξη')
    }
    // Η ώρα της διεκδίκησης (χωρίς updated_at): η εργασία των κολλημένων
    // εξετάζει μόνο ό,τι διεκδικήθηκε πάνω από 15' πριν.
    await auditSystem({
      action: TELEHEALTH_REFUND_CLAIM_ACTION, resource: 'telehealth', resource_id: c.id,
      subject_email: c.client_email,
      metadata: { transaction_id: txn, by, late: terms.late, refund: terms.refund, fee: terms.fee, total: terms.total },
    })
  }

  let refundTx: string | null = null
  if (terms.refund > 0) {
    try {
      // Ίδιο κλειδί με την εργασία των κολλημένων. Μέσα στο κλείδωμα:
      // έλεγχος audit (ήδη επιστράφηκε → καμία νέα κλήση στη Viva, ισχύουν
      // οι όροι που καταγράφηκαν) → επιστροφή → audit αμέσως μετά.
      const lock = await withRefundLock(telehealthCancelLockKey(c.id, txn), async () => {
        const done = await telehealthRefundDone(c.id, txn)
        if (done) {
          const m = (done.metadata ?? {}) as any
          const total = Number(m.total) || terms.total
          const refund = Number(m.refund) || 0
          return {
            refund_tx: (m.refund_tx ?? null) as string | null,
            terms: { ...terms, total, refund, fee: Number(m.fee) || round2(total - refund), late: !!m.late },
          }
        }
        const r = await refundVivaTransaction(txn, terms.refund)
        await auditSystem({
          action: TELEHEALTH_CANCEL_REFUND_ACTION, resource: 'telehealth', resource_id: c.id,
          subject_email: c.client_email,
          metadata: {
            transaction_id: txn, refund_tx: r.transactionId, by,
            late: terms.late, refund: terms.refund, fee: terms.fee, total: terms.total,
          },
        })
        return { refund_tx: r.transactionId, terms }
      })
      if (!lock.locked) throw new Error('refund claim held elsewhere')
      refundTx = lock.value.refund_tx
      terms = lock.value.terms
    } catch (err: any) {
      console.error('[viva] refund failed for telehealth', c.id, err?.message)
      if (isRefundOutcomeUnknown(err)) {
        // Άγνωστη έκβαση: μένει `refunding` (βλ. REFUND_IN_PROGRESS_MESSAGE).
        await audit(req, {
          action: 'telehealth_cancel', resource: 'telehealth', resource_id: c.id, subject_email: c.client_email,
          outcome: 'failure', status_code: 502, error_message: String(err?.message ?? err).slice(0, 500),
          metadata: { by, late: terms.late, refund: terms.refund, fee: terms.fee, transaction_id: txn, unknown_outcome: true },
        })
        throw new CancelError(502, REFUND_IN_PROGRESS_MESSAGE)
      }
      // Η επιστροφή απέτυχε: η συνεδρία επανέρχεται πληρωμένη, όπως ήταν.
      await prisma.telehealthConsultation.updateMany({
        where: { id: c.id, payment_status: 'refunding', payment_ref: c.payment_ref },
        data: { payment_status: 'paid' },
      }).catch((e: any) => console.error('[viva] could not restore telehealth', c.id, 'to paid:', e?.message))
      await audit(req, {
        action: 'telehealth_cancel', resource: 'telehealth', resource_id: c.id, subject_email: c.client_email,
        outcome: 'failure', status_code: 502, error_message: String(err?.message ?? err).slice(0, 500),
        metadata: { by, late: terms.late, refund: terms.refund, fee: terms.fee, transaction_id: txn },
      })
      throw new CancelError(502, 'Η επιστροφή χρημάτων δεν ολοκληρώθηκε, οπότε η συνεδρία δεν ακυρώθηκε. Δοκίμασε ξανά σε λίγο.')
    }
  }

  if (terms.paid) {
    // Υπό συνθήκη: αν η εργασία των κολλημένων πρόλαβε να την ολοκληρώσει,
    // δεν ξαναγράφεται (ούτε ξαναμειώνεται η αμοιβή).
    await prisma.telehealthConsultation.updateMany({
      where: { id: c.id, payment_status: 'refunding', payment_ref: c.payment_ref },
      data: telehealthCancelledData(c, terms.total, terms.refund, terms.fee),
    })
  } else {
    // Απλήρωτη: ατομικά, μόνο αν δεν πληρώθηκε στο μεταξύ (αλλιώς η
    // πληρωμή που έφτασε θα έμενε σε ακυρωμένη συνεδρία). Πληρωμή που
    // φτάνει μετά βρίσκει την ακυρωμένη και επιστρέφεται (markTelehealthPaid).
    const r = await prisma.telehealthConsultation.updateMany({
      where: { id: c.id, payment_status: c.payment_status === 'refunded' ? 'refunded' : 'unpaid', status: c.status },
      data: { status: 'cancelled' },
    })
    if (r.count === 0) {
      throw new CancelError(409, 'Η συνεδρία άλλαξε στο μεταξύ — ανανέωσε τη σελίδα και δοκίμασε ξανά.')
    }
  }
  const updated = (await prisma.telehealthConsultation.findUnique({ where: { id: c.id } }))!

  await audit(req, {
    action: 'telehealth_cancel', resource: 'telehealth', resource_id: c.id, subject_email: c.client_email,
    metadata: {
      by, late: terms.late, refund: terms.refund, fee: terms.fee, refund_tx: refundTx,
      // Κλείνει τυχόν αποτυχία της ίδιας συναλλαγής στις «Αποτυχημένες επιστροφές».
      transaction_id: terms.paid ? txn : null,
    },
  })
  return { consultation: updated, terms, refund_tx: refundTx }
}

// Κολλημένες ακυρώσεις τηλεϊατρικής (`refunding`) — ίδια λογική με
// resolveStuckBookingRefunds, ΧΩΡΙΣ ποτέ νέα επιστροφή:
//   · Επιτυχής επιστροφή στο audit (ίδια συναλλαγή) → ολοκλήρωση της
//     ακύρωσης με τους όρους που καταγράφηκαν.
//   · Αλλιώς ΜΕΝΕΙ `refunding` και γράφεται ΜΙΑ καταγραφή για τον
//     διαχειριστή (TELEHEALTH_REFUND_UNRESOLVED_ACTION, με την κατάσταση
//     της συναλλαγής στη Viva).
// «Κολλημένη»: η τελευταία διεκδίκηση (audit TELEHEALTH_REFUND_CLAIM_ACTION)
// παλαιότερη από 15' — ή καμία καταγραφή διεκδίκησης (π.χ. απέτυχε η
// εγγραφή της) — και κανένα κλείδωμα επιστροφής εκείνη τη στιγμή.

async function lastTelehealthClaimAt(consultationId: string, txn: string): Promise<Date | null> {
  const row = await prisma.auditLog.findFirst({
    where: {
      resource: 'telehealth', resource_id: consultationId, action: TELEHEALTH_REFUND_CLAIM_ACTION,
      metadata: { path: ['transaction_id'], equals: txn },
    },
    orderBy: { created_at: 'desc' },
    select: { created_at: true },
  })
  return row?.created_at ?? null
}

export async function resolveStuckTelehealthRefunds(): Promise<{ completed: number; flagged: number }> {
  const out = { completed: 0, flagged: 0 }
  const stuck = await prisma.telehealthConsultation.findMany({
    where: { payment_status: 'refunding' },
    orderBy: { created_at: 'asc' },
    take: 1000,
  })
  // Οι ήδη σημειωμένες για τον admin μένουν refunding και δεν μετράνε στο
  // όριο, ώστε οι νέες να εξετάζονται.
  let examined = 0
  for (const s of stuck) {
    if (examined >= 100) break
    try {
      const txn = String(s.payment_ref ?? '')
      if (!txn) continue
      const claimedAt = await lastTelehealthClaimAt(s.id, txn)
      if (claimedAt && Date.now() - claimedAt.getTime() < STUCK_BOOKING_REFUND_MS) continue
      const flagged = await prisma.auditLog.findFirst({
        where: {
          resource: 'telehealth', resource_id: s.id, action: TELEHEALTH_REFUND_UNRESOLVED_ACTION,
          metadata: { path: ['transaction_id'], equals: txn },
          ...(claimedAt ? { created_at: { gte: claimedAt } } : {}),
        },
        select: { id: true },
      })
      if (flagged) continue
      examined++

      const lock = await withRefundLock(telehealthCancelLockKey(s.id, txn), async () => {
        const c = await prisma.telehealthConsultation.findUnique({ where: { id: s.id } })
        if (!c || c.payment_status !== 'refunding' || c.payment_ref !== txn) return null
        const at = await lastTelehealthClaimAt(c.id, txn)
        if (at && Date.now() - at.getTime() < STUCK_BOOKING_REFUND_MS) return null

        const done = await telehealthRefundDone(c.id, txn)
        if (done) {
          // Η επιστροφή έγινε: ολοκλήρωση ακριβώς όπως η cancelTelehealth.
          const m = (done.metadata ?? {}) as any
          const total = Number(m.total) || Number(c.price) || 0
          const refund = Number(m.refund) || 0
          const fee = Number(m.fee) || round2(total - refund)
          const r = await prisma.telehealthConsultation.updateMany({
            where: { id: c.id, payment_status: 'refunding', payment_ref: txn },
            data: telehealthCancelledData(c, total, refund, fee),
          })
          if (r.count === 0) return null
          await auditSystem({
            action: 'telehealth_cancel', resource: 'telehealth', resource_id: c.id, subject_email: c.client_email,
            metadata: { by: m.by ?? null, late: !!m.late, refund, fee, refund_tx: m.refund_tx ?? null, transaction_id: txn, resolved_by: 'stuck_refund_job' },
          })
          await notifyCancelRefundCompleted('telehealth', c, refund)
          return 'completed' as const
        }

        // Επιστροφή του διαχειριστή που έγινε αλλά δεν γράφτηκε η τελική
        // κατάσταση: μόνο payment_status, όπως το admin.ts.
        const adm = await adminRefundSuccess('telehealth', c.id, txn)
        if (adm) {
          const status = adminRefundFinalStatus(adm, Number(c.price) || 0)
          const r = await prisma.telehealthConsultation.updateMany({
            where: { id: c.id, payment_status: 'refunding', payment_ref: txn }, data: { payment_status: status },
          })
          if (r.count === 0) return null
          await auditSystem({
            action: 'admin_refund_completed', resource: 'telehealth', resource_id: c.id, subject_email: c.client_email,
            metadata: { transaction_id: txn, amount: adm.amount ?? null, new_status: status, resolved_by: 'stuck_refund_job' },
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
        // Άγνωστη έκβαση πλήρους επιστροφής + Viva 'R' → η επιστροφή έγινε.
        if (viva === 'R') {
          const total = Number(c.price) || 0
          const u = await unknownFullRefundTerms('telehealth', 'telehealth_cancel', c.id, txn, total)
          if (u) {
            const r = await prisma.telehealthConsultation.updateMany({
              where: { id: c.id, payment_status: 'refunding', payment_ref: txn },
              data: telehealthCancelledData(c, total, total, 0),
            })
            if (r.count === 0) return null
            await auditSystem({
              action: 'telehealth_cancel', resource: 'telehealth', resource_id: c.id, subject_email: c.client_email,
              metadata: { by: u.by, late: false, refund: total, fee: 0, refund_tx: null, transaction_id: txn, resolved_by: 'stuck_refund_job', source: 'viva_status_R' },
            })
            await notifyCancelRefundCompleted('telehealth', c, total)
            return 'completed' as const
          }
        }
        await auditSystem({
          action: TELEHEALTH_REFUND_UNRESOLVED_ACTION, resource: 'telehealth', resource_id: c.id, subject_email: c.client_email,
          outcome: 'failure',
          error_message: 'Telehealth cancellation stuck in refunding; refund not confirmed — needs manual review (no new refund was made)',
          metadata: { transaction_id: txn, viva_status: viva, total: c.price },
        })
        return 'flagged' as const
      })
      if (lock.locked && lock.value === 'completed') out.completed++
      if (lock.locked && lock.value === 'flagged') out.flagged++
    } catch (err: any) {
      console.error(`[refunds] stuck telehealth ${s.id}:`, err?.message)
    }
  }
  return out
}
