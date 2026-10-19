import prisma from './prisma.js'
import { refundVivaTransaction } from './viva.js'
import { audit } from './audit.js'

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
  const terms = cancellationTerms(b, by)
  if (!terms.allowed) {
    throw new CancelError(400, terms.reason === 'already_started'
      ? 'Η ώρα του ραντεβού έχει περάσει — η κράτηση δεν ακυρώνεται πλέον.'
      : 'Η κράτηση δεν μπορεί να ακυρωθεί σε αυτή την κατάσταση.')
  }

  let refundTx: string | null = null
  if (terms.refund > 0) {
    try {
      const r = await refundVivaTransaction(String(b.payment_ref), terms.refund)
      refundTx = r.transactionId
    } catch (err: any) {
      console.error('[viva] refund failed for booking', b.id, err?.message)
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
  const updated = await prisma.booking.update({ where: { id: b.id }, data })

  await audit(req, {
    action: 'booking_cancel', resource: 'booking', resource_id: b.id,
    metadata: { by, late: terms.late, refund: terms.refund, fee: terms.fee, refund_tx: refundTx },
  })
  return { booking: updated, terms, refund_tx: refundTx }
}
