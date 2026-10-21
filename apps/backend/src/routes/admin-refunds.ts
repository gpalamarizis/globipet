import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { audit } from '../lib/audit.js'
import { getVivaTransaction, refundVivaTransaction, isRefundOutcomeUnknown } from '../lib/viva.js'
import { withRefundLock } from '../lib/refundLock.js'
import { bookingCancelLockKey, telehealthCancelLockKey, REFUND_IN_PROGRESS_MESSAGE, notifyCancelRefundCompleted } from '../lib/cancellation.js'
import {
  eventRefundLockKey, alreadyRefunded, refundReason, legacyCancelledAt,
  EVENT_REFUND_CLAIM_ACTION, EVENT_CANCELLED_REASON, notifyRegistrationRefunded,
} from './events.js'
import { EXTERNAL_REFUND_ACTION } from '../lib/externalRefund.js'

/**
 * Αποτυχημένες / κολλημένες επιστροφές χρημάτων — χειρισμός από τον admin.
 *
 *   GET  /api/admin/refunds/pending[?check=1]  ενοποιημένη λίστα (με ?check=1 και η κατάσταση στη Viva)
 *   POST /api/admin/refunds/retry               { kind: 'event_registration', id, amount }
 *   POST /api/admin/refunds/resolve             { kind, id, note, refund_amount? }
 *
 * ΠΗΓΕΣ ΤΗΣ ΛΙΣΤΑΣ
 *   · EventRegistration `refund_failed`, και `refunding` χωρίς κίνηση ≥ 15'.
 *   · Booking `payment_status: 'refunding'` με updated_at ≥ 15' (ό,τι η εργασία
 *     του lib/cron.ts δεν μπόρεσε να ολοκληρώσει — booking_refund_unresolved).
 *   · TelehealthConsultation `payment_status: 'refunding'`.
 *   · Audit outcome 'failure' επιστροφών (τελευταίες 180 ημέρες) χωρίς
 *     μεταγενέστερη επιτυχία για την ίδια συναλλαγή ή σήμανση «λύθηκε».
 *   · Εξωτερικές επιστροφές (από τον πίνακα της Viva, webhook 1797 —
 *     lib/externalRefund): kind 'external_refund', μία γραμμή ανά επιστροφή,
 *     «Σήμανση ως λυμένο» όπως οι καταγραφές αποτυχίας.
 *
 * ΔΙΠΛΗ ΕΠΙΣΤΡΟΦΗ — πώς αποτρέπεται στο «Ξαναδοκίμασε»
 *   1. Ατομική διεκδίκηση `refund_failed → refunding` (updateMany υπό συνθήκη,
 *      ίδια συναλλαγή): δύο κλικ / δύο admins → ένας περνά, ο άλλος 409.
 *   2. withRefundLock με το ΙΔΙΟ κλειδί (eventRefundLockKey) που παίρνουν η
 *      αυτο-ακύρωση, οι αυτόματες επιστροφές και η εργασία των κολλημένων.
 *   3. Μέσα στο κλείδωμα: audit «ήδη επιστράφηκε» (alreadyRefunded) και
 *      κατάσταση στη Viva (statusId 'R' = ήδη επιστραμμένη) ΠΡΙΝ την κλήση.
 *   4. Καταγραφή επιτυχίας ΑΜΕΣΩΣ μετά την επιστροφή, μέσα στο κλείδωμα, με
 *      την ίδια action που ελέγχει το alreadyRefunded.
 *
 * Η «Σήμανση ως λυμένο» δεν καλεί ποτέ τη Viva· γράφει καταγραφή επιτυχίας
 * (manual: true) ώστε καμία μεταγενέστερη ροή να μην ξαναεπιστρέψει τη συναλλαγή.
 */

const STUCK_MS = 15 * 60_000
const AUDIT_WINDOW_MS = 180 * 24 * 3_600_000
const RESOLVED_MARKER_ACTION = 'refund_failure_resolved'

// ─── Επιστροφή από τον admin (POST /admin/refund, routes/admin.ts) ─────────
//
// Διεκδίκηση paid → refunding + ADMIN_REFUND_CLAIM_ACTION, υπό withRefundLock
// με το ΙΔΙΟ κλειδί που χρησιμοποιούν οι άλλες ροές επιστροφής του πόρου.
// Σε ΑΓΝΩΣΤΗ έκβαση η εγγραφή μένει refunding και εμφανίζεται εδώ· η
// «Σήμανση ως λυμένο» (μετά από έλεγχο στη Viva) τη γράφει επιστραμμένη ή,
// με ποσό 0, ξανά πληρωμένη — χωρίς ποτέ κλήση στη Viva.
export const ADMIN_REFUND_CLAIM_ACTION = 'admin_refund_claim'
export type AdminRefundResource = 'order' | 'booking' | 'telehealth'

/** Κλειδί withRefundLock: ίδιο με τις άλλες ροές επιστροφής του ίδιου πόρου. */
export function adminRefundLockKey(type: AdminRefundResource, id: string, txn: string): string {
  if (type === 'booking') return bookingCancelLockKey(id, txn)
  if (type === 'telehealth') return telehealthCancelLockKey(id, txn)
  // Ίδια μορφή με lib/extraPaymentRefund (`${resource}|${id}|${txn}`).
  return `order|${id}|${txn}`
}

/**
 * Επιτυχής επιστροφή αυτής της συναλλαγής ήδη στο audit (admin ή ακύρωση)·
 * επιστρέφει τα metadata (με `amount`) ή null.
 */
export async function adminRefundDone(type: AdminRefundResource, id: string, txn: string): Promise<any | null> {
  const row = await prisma.auditLog.findFirst({
    where: {
      resource: type, resource_id: id, outcome: 'success',
      action: { in: ['refund', `${type}_cancel_refund`] },
      metadata: { path: ['transaction_id'], equals: txn },
    },
    orderBy: { created_at: 'desc' },
    select: { action: true, metadata: true },
  })
  if (!row) return null
  const m = (row.metadata ?? {}) as any
  if (row.action === 'refund') return m
  // Επιστροφή ακύρωσης: ποσό από τους όρους που καταγράφηκαν.
  const amount = Number(m.refund)
  return { ...m, amount: Number.isFinite(amount) ? amount : undefined, full: Number(m.refund) >= Number(m.total) - 0.005 }
}

/** Ενέργειες που αλλάζουν την κατάσταση επιστροφής ενός πόρου (για την «προέλευση» του refunding). */
const REFUND_STATE_ACTIONS = [
  ADMIN_REFUND_CLAIM_ACTION, 'refund', RESOLVED_MARKER_ACTION,
  'booking_cancel_refund', 'booking_cancel',
  'telehealth_refund_claim', 'telehealth_cancel_refund', 'telehealth_cancel',
]

/** Οι σχετικές καταγραφές κατάστασης επιστροφής μιας συναλλαγής, νεότερη πρώτη. */
async function refundStateRows(type: AdminRefundResource, id: string, txn: string) {
  const rows = await prisma.auditLog.findMany({
    where: {
      resource: type, resource_id: id, action: { in: REFUND_STATE_ACTIONS },
      metadata: { path: ['transaction_id'], equals: txn },
    },
    orderBy: { created_at: 'desc' },
    take: 10,
    select: { action: true, outcome: true, metadata: true },
  })
  // Η σήμανση διεκδίκησης τηλεϊατρικής που γράφει η ίδια ροή του admin δεν μετρά.
  return rows.filter(r => !(r.action === 'telehealth_refund_claim' && (r.metadata as any)?.admin_refund === true))
}

/**
 * Το `refunding` προέρχεται από επιστροφή του admin (και όχι από ακύρωση);
 * Ναι αν η τελευταία σχετική καταγραφή της συναλλαγής είναι η διεκδίκηση
 * του admin, αποτυχία του με άγνωστη έκβαση ή επιτυχής επιστροφή του
 * (`refund` — η διεργασία έπεσε πριν γραφτεί η τελική κατάσταση).
 * Επιστρέφει τη διεκδίκηση/καταγραφή (new_status ή full, amount) ή null.
 */
async function adminRefundOrigin(type: AdminRefundResource, id: string, txn: string): Promise<any | null> {
  const last = (await refundStateRows(type, id, txn))[0]
  if (!last) return null
  const m = (last.metadata ?? {}) as any
  if (last.action === ADMIN_REFUND_CLAIM_ACTION) return m
  if (last.action === 'refund' && last.outcome === 'failure' && m.unknown_outcome === true) return m
  if (last.action === 'refund' && last.outcome === 'success') return m
  return null
}

/**
 * Ποσό που ζητήθηκε στην ακύρωση (κράτηση/τηλεϊατρική) που έμεινε
 * `refunding`: `refund` της τελευταίας διεκδίκησης/αποτυχίας της συναλλαγής
 * (telehealth_refund_claim, booking_cancel_refund, telehealth_cancel_refund,
 * telehealth_cancel αποτυχία) ή `amount` του admin_refund_claim. Αν η
 * τελευταία σχετική καταγραφή δεν είναι τέτοια (π.χ. η διεργασία έπεσε πριν
 * γραφτεί οτιδήποτε) → null.
 */
async function cancelRequestedAmount(type: 'booking' | 'telehealth', id: string, txn: string): Promise<number | null> {
  const last = (await refundStateRows(type, id, txn))[0]
  if (!last) return null
  const m = (last.metadata ?? {}) as any
  const isRequest = ['telehealth_refund_claim', 'booking_cancel_refund', 'telehealth_cancel_refund'].includes(last.action)
    || (last.action === 'telehealth_cancel' && last.outcome === 'failure')
  const v = isRequest ? m.refund : last.action === ADMIN_REFUND_CLAIM_ACTION ? m.amount : undefined
  return v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null
}

const ADMIN_REFUND_MODELS: Record<AdminRefundResource, any> = {
  order: prisma.order, booking: prisma.booking, telehealth: prisma.telehealthConsultation,
}
const paidOf = (type: AdminRefundResource, rec: any) =>
  Number(type === 'order' ? rec.total_amount : type === 'booking' ? rec.total_price : rec.price) || 0

/**
 * «Σήμανση ως λυμένο» μιας επιστροφής admin που έμεινε `refunding`. Χωρίς
 * κλήση στη Viva. refund_amount: κενό → ό,τι ζητήθηκε τότε · 0 → η επιστροφή
 * ΔΕΝ έγινε (πίσω σε paid) · αλλιώς το ποσό που επιστράφηκε.
 */
async function resolveAdminRefund(
  req: any, type: AdminRefundResource, rec: any, origin: any, refundAmountRaw: any, note: string, by: string,
): Promise<{ ok: true; status: string } | { ok: false; code: number; message: string }> {
  const txn = String(rec.payment_ref ?? '')
  const paid = paidOf(type, rec)
  let amount: number
  if (refundAmountRaw !== undefined && refundAmountRaw !== null && refundAmountRaw !== '') {
    amount = Number(refundAmountRaw)
    if (!Number.isFinite(amount) || amount < 0) return { ok: false, code: 400, message: 'Μη έγκυρο ποσό επιστροφής' }
    if (amount > paid + 0.005) return { ok: false, code: 400, message: `Το ποσό υπερβαίνει το πληρωμένο (${paid.toFixed(2)} €)` }
  } else {
    amount = requestedOf(origin) ?? paid
  }
  amount = round2(amount)
  const target = amount <= 0 ? 'paid' : amount >= paid - 0.005 ? 'refunded' : 'partially_refunded'

  const work = async (): Promise<boolean> => {
    const r = await ADMIN_REFUND_MODELS[type].updateMany({
      where: { id: rec.id, payment_status: 'refunding', payment_ref: rec.payment_ref },
      data: { payment_status: target },
    })
    if (r.count === 0) return false
    if (target !== 'paid') {
      // Καταγραφή ΕΠΙΤΥΧΙΑΣ: καμία μεταγενέστερη επιστροφή του admin δεν
      // ξαναεπιστρέφει αυτή τη συναλλαγή (adminRefundDone).
      await audit(req, {
        action: 'refund', resource: type, resource_id: rec.id,
        metadata: {
          amount, full: target === 'refunded', transaction_id: txn, viva_refund_transaction: null,
          manual: true, note, admin: by,
        },
      })
    }
    await audit(req, {
      action: RESOLVED_MARKER_ACTION, resource: type, resource_id: rec.id,
      metadata: { group: groupKey('refund', type, rec.id, txn), failed_action: 'refund', transaction_id: txn, note, by, result: target, amount },
    })
    return true
  }
  try {
    const lock = await withRefundLock(adminRefundLockKey(type, rec.id, txn), work)
    if (!lock.locked) return { ok: false, code: 409, message: 'Η ακύρωση είναι ήδη σε εξέλιξη' }
    if (!lock.value) return { ok: false, code: 409, message: 'Η κράτηση άλλαξε στο μεταξύ — ανανέωσε τη σελίδα και δοκίμασε ξανά.' }
  } catch (err: any) {
    console.error('[admin-refunds] admin refund resolve error', rec.id, err?.message)
    return { ok: false, code: 503, message: 'Προσωρινό σφάλμα — δοκίμασε ξανά σε λίγο' }
  }
  return { ok: true, status: target }
}

/** Καταγραφές αποτυχίας επιστροφής που εμφανίζονται στη λίστα. */
const FAILURE_ACTIONS = [
  'event_registration_auto_refund', 'event_registration_refund',
  'booking_duplicate_refund', 'order_duplicate_refund', 'telehealth_duplicate_refund',
  'booking_cancel_refund', 'refund', 'subscription_paid_while_paused',
]
/**
 * Σημάδια «κολλημένης» κατάστασης: η εγγραφή/κράτηση/συνεδρία εμφανίζεται ήδη
 * από την κατάστασή της (refund_failed / refunding), όχι ξανά από το audit.
 */
const STATE_FLAG_ACTIONS = [
  'event_registration_refunding_resolved', 'booking_refund_unresolved', 'telehealth_refund_unresolved',
]

/** Ποιες επιτυχίες «κλείνουν» μια αποτυχία αυτής της action. */
function successActionsFor(action: string): string[] {
  if (action.startsWith('event_registration_')) {
    return ['event_registration_auto_refund', 'event_registration_refund', 'event_registration_refunding_resolved']
  }
  if (action === 'booking_cancel_refund') return ['booking_cancel_refund', 'booking_cancel']
  if (action === 'telehealth_cancel_refund') return ['telehealth_cancel_refund', 'telehealth_cancel']
  return [action]
}

const round2 = (n: number) => Math.round(n * 100) / 100
/** Ομάδα αποτυχιών: ίδια action + αντικείμενο + συναλλαγή. */
const groupKey = (action: string, resource: string, resourceId: string | null, txn: string | null) =>
  `${action}|${resource}|${resourceId ?? ''}|${txn ?? ''}`
const txnOf = (m: any): string | null => {
  const v = m?.transaction_id
  return v === undefined || v === null || v === '' ? null : String(v)
}
/** Συναλλαγή της ομάδας: η εξωτερική επιστροφή ομαδοποιείται ανά συναλλαγή επιστροφής (πολλές μερικές της ίδιας πληρωμής = πολλές γραμμές). */
const groupTxnOf = (action: string, m: any): string | null => {
  const txn = txnOf(m)
  return action === EXTERNAL_REFUND_ACTION && m?.refund_tx ? `${txn ?? ''}>${String(m.refund_tx)}` : txn
}

type Kind = 'event_registration' | 'booking' | 'telehealth' | 'order' | 'audit' | 'external_refund'

type PendingItem = {
  kind: Kind
  id: string
  resource: string
  resource_id: string
  status: string | null
  email: string | null
  amount: number | null
  transaction_id: string | null
  date: string
  reason: string | null
  last_error: string | null
  action: string | null
  attempts: number
  title: string | null
  can_retry: boolean
  viva_status?: string | null
  /** Το ποσό που ζητήθηκε: από τον admin (reason 'admin_refund') ή στην ακύρωση (booking_cancel / telehealth_cancel). */
  requested_amount?: number | null
  /** Εξωτερική επιστροφή: η συναλλαγή της επιστροφής στη Viva (transaction_id = η αρχική πληρωμή). */
  refund_transaction_id?: string | null
}

const requestedOf = (origin: any): number | null =>
  origin?.amount != null && Number.isFinite(Number(origin.amount)) ? Number(origin.amount) : null

/** Λόγος επιστροφής εγγραφής: από το audit· αλλιώς από την κατάσταση της εκδήλωσης. */
async function eventOrigin(reg: { id: string; status: string; event_id: string; viva_transaction_id: string | null }): Promise<'full' | 'cancelled' | 'event_cancelled'> {
  const r = await refundReason(reg)
  if (r) return r
  const ev = await prisma.event.findUnique({ where: { id: reg.event_id }, select: { cancelled_at: true } })
  const cancelled = !!ev?.cancelled_at || !!(await legacyCancelledAt(reg.event_id))
  return cancelled ? 'event_cancelled' : 'full'
}

/**
 * Action/reason της καταγραφής ώστε το refundReason (κατάσταση που βλέπει ο
 * χρήστης) να μείνει ίδιο: η αυτο-ακύρωση γράφεται ως event_registration_refund,
 * οι άλλες ως event_registration_auto_refund με τον ίδιο λόγο.
 */
function auditShapeFor(origin: 'full' | 'cancelled' | 'event_cancelled') {
  if (origin === 'cancelled') return { action: 'event_registration_refund', reason: 'user_cancelled' }
  return {
    action: 'event_registration_auto_refund',
    reason: origin === 'event_cancelled' ? EVENT_CANCELLED_REASON : 'event became full',
  }
}

/** Η τελευταία κίνηση (audit) ενός αντικειμένου — για το «κολλημένο». */
async function lastActivity(resources: string[], id: string): Promise<Date | null> {
  const row = await prisma.auditLog.findFirst({
    where: { resource: { in: resources }, resource_id: id },
    orderBy: { created_at: 'desc' },
    select: { created_at: true },
  })
  return row?.created_at ?? null
}

async function eventRegStuck(reg: { id: string; created_at: Date }): Promise<boolean> {
  const last = await lastActivity(['event_registration'], reg.id)
  const since = Math.max(reg.created_at.getTime(), last?.getTime() ?? 0)
  return Date.now() - since >= STUCK_MS
}

async function telehealthStuck(c: { id: string; created_at: Date }): Promise<boolean> {
  const last = await lastActivity(['telehealth', 'telehealth_consultation'], c.id)
  const since = Math.max(c.created_at.getTime(), last?.getTime() ?? 0)
  return Date.now() - since >= STUCK_MS
}

const cleanNote = (v: any): string | null => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s.length >= 3 ? s.slice(0, 500) : null
}

const adminRefundsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', async (req, reply) => {
    try {
      await (app as any).authenticate(req, reply)
      if ((req.user as any)?.role !== 'admin') {
        return reply.code(403).send({ message: 'Απαγορευμένη πρόσβαση' })
      }
    } catch {
      return reply.code(401).send({ message: 'Μη εξουσιοδοτημένος' })
    }
  })

  // ─── Λίστα ────────────────────────────────────────────────────────────
  app.get('/pending', async (req: any) => {
    const items: PendingItem[] = []

    // 1. Εγγραφές εκδηλώσεων
    const regs = await prisma.eventRegistration.findMany({
      where: { status: { in: ['refund_failed', 'refunding'] } },
      include: { event: { select: { title: true } } },
      orderBy: { created_at: 'desc' },
      take: 500,
    })
    for (const reg of regs) {
      if (reg.status === 'refunding' && !(await eventRegStuck(reg))) continue
      const txn = reg.viva_transaction_id
      const lastFail = await prisma.auditLog.findFirst({
        where: {
          resource: 'event_registration', resource_id: reg.id, outcome: 'failure',
          ...(txn ? { metadata: { path: ['transaction_id'], equals: txn } } : {}),
        },
        orderBy: { created_at: 'desc' },
        select: { created_at: true, error_message: true, action: true },
      })
      items.push({
        kind: 'event_registration', id: reg.id, resource: 'event_registration', resource_id: reg.id,
        status: reg.status, email: reg.user_email, amount: reg.amount_paid ?? null,
        transaction_id: txn, date: (lastFail?.created_at ?? reg.created_at).toISOString(),
        reason: await eventOrigin(reg), last_error: lastFail?.error_message ?? null,
        action: lastFail?.action ?? null, attempts: 0, title: reg.event?.title ?? null,
        can_retry: reg.status === 'refund_failed' && !!txn && (reg.amount_paid ?? 0) > 0,
      })
    }

    // 2. Κρατήσεις κολλημένες σε refunding
    const bookings = await prisma.booking.findMany({
      where: { payment_status: 'refunding', updated_at: { lt: new Date(Date.now() - STUCK_MS) } },
      orderBy: { updated_at: 'desc' },
      take: 500,
    })
    for (const b of bookings) {
      const origin = b.payment_ref ? await adminRefundOrigin('booking', b.id, b.payment_ref) : null
      const requested = origin ? requestedOf(origin)
        : b.payment_ref ? await cancelRequestedAmount('booking', b.id, b.payment_ref) : null
      const flag = await prisma.auditLog.findFirst({
        where: { resource: 'booking', resource_id: b.id, outcome: 'failure' },
        orderBy: { created_at: 'desc' },
        select: { created_at: true, error_message: true, action: true },
      })
      items.push({
        kind: 'booking', id: b.id, resource: 'booking', resource_id: b.id,
        status: b.payment_status, email: b.customer_email, amount: b.total_price,
        transaction_id: b.payment_ref, date: b.updated_at.toISOString(),
        reason: origin ? 'admin_refund' : 'booking_cancel',
        last_error: flag?.error_message ?? null,
        action: flag?.action ?? null, attempts: 0, title: b.provider_name,
        can_retry: false,
        requested_amount: requested,
      })
    }

    // 3. Τηλεϊατρική κολλημένη σε refunding (ίδιο κριτήριο με τη «Σήμανση ως λυμένο»)
    const consults = await prisma.telehealthConsultation.findMany({
      where: { payment_status: 'refunding' },
      orderBy: { created_at: 'desc' },
      take: 500,
    })
    for (const c of consults) {
      if (!(await telehealthStuck(c))) continue
      const origin = c.payment_ref ? await adminRefundOrigin('telehealth', c.id, c.payment_ref) : null
      const requested = origin ? requestedOf(origin)
        : c.payment_ref ? await cancelRequestedAmount('telehealth', c.id, c.payment_ref) : null
      const flag = await prisma.auditLog.findFirst({
        where: { resource: { in: ['telehealth', 'telehealth_consultation'] }, resource_id: c.id, outcome: 'failure' },
        orderBy: { created_at: 'desc' },
        select: { created_at: true, error_message: true, action: true },
      })
      items.push({
        kind: 'telehealth', id: c.id, resource: 'telehealth', resource_id: c.id,
        status: c.payment_status, email: c.client_email, amount: c.price,
        transaction_id: c.payment_ref, date: (flag?.created_at ?? c.created_at).toISOString(),
        reason: origin ? 'admin_refund' : 'telehealth_cancel',
        last_error: flag?.error_message ?? null,
        action: flag?.action ?? null, attempts: 0, title: c.provider_name,
        can_retry: false,
        requested_amount: requested,
      })
    }

    // 3β. Παραγγελίες σε refunding (μόνο από επιστροφή του admin) ≥ 15'
    const orders = await prisma.order.findMany({
      where: { payment_status: 'refunding', updated_at: { lt: new Date(Date.now() - STUCK_MS) } },
      orderBy: { updated_at: 'desc' },
      take: 500,
    })
    for (const o of orders) {
      const origin = o.payment_ref ? await adminRefundOrigin('order', o.id, o.payment_ref) : null
      const flag = await prisma.auditLog.findFirst({
        where: { resource: 'order', resource_id: o.id, outcome: 'failure' },
        orderBy: { created_at: 'desc' },
        select: { created_at: true, error_message: true, action: true },
      })
      items.push({
        kind: 'order', id: o.id, resource: 'order', resource_id: o.id,
        status: o.status, email: o.user_email, amount: o.total_amount,
        transaction_id: o.payment_ref, date: o.updated_at.toISOString(),
        reason: 'admin_refund', last_error: flag?.error_message ?? null,
        action: flag?.action ?? null, attempts: 0, title: null,
        can_retry: false, requested_amount: requestedOf(origin),
      })
    }

    // 4. Αποτυχίες στο audit χωρίς μεταγενέστερη επιτυχία
    const since = new Date(Date.now() - AUDIT_WINDOW_MS)
    const failures = await prisma.auditLog.findMany({
      where: {
        outcome: 'failure', created_at: { gte: since },
        action: { notIn: STATE_FLAG_ACTIONS },
        OR: [{ action: { in: FAILURE_ACTIONS } }, { action: { endsWith: '_refund' } }],
      },
      orderBy: { created_at: 'desc' },
      take: 1000,
    })
    if (failures.length > 0) {
      const ids = [...new Set(failures.map(f => String(f.resource_id ?? '')).filter(Boolean))]
      const successes = await prisma.auditLog.findMany({
        where: { outcome: 'success', resource_id: { in: ids }, created_at: { gte: since } },
        select: { action: true, resource: true, resource_id: true, metadata: true, created_at: true },
      })
      const statusKey = new Set(items.map(i => `${i.resource}|${i.resource_id}|${i.transaction_id ?? ''}`))
      // Ομαδοποίηση: ίδια action + αντικείμενο + συναλλαγή → μία γραμμή (η νεότερη).
      const groups = new Map<string, { latest: typeof failures[number]; count: number }>()
      for (const f of failures) {
        const txn = txnOf(f.metadata)
        const key = groupKey(f.action, f.resource, f.resource_id, groupTxnOf(f.action, f.metadata))
        // Σημάδι «λύθηκε» (για αυτή ή για νεότερη αποτυχία της ίδιας ομάδας) ή
        // μεταγενέστερη επιτυχία για την ίδια συναλλαγή.
        const resolved = successes.some(s =>
          s.resource === f.resource && s.resource_id === f.resource_id && s.created_at > f.created_at && (
            (s.action === RESOLVED_MARKER_ACTION && ((s.metadata as any)?.audit_id === f.id || (s.metadata as any)?.group === key)) ||
            (successActionsFor(f.action).includes(s.action) && (txn === null || txnOf(s.metadata) === txn))
          ))
        if (resolved) continue
        const resKey = f.resource === 'telehealth_consultation' ? 'telehealth' : f.resource
        // Η εξωτερική επιστροφή εμφανίζεται ΠΑΝΤΑ (και δίπλα σε κολλημένη
        // εγγραφή της ίδιας πληρωμής): ο admin πρέπει να τη δει πριν ξαναδοκιμάσει.
        if (f.action !== EXTERNAL_REFUND_ACTION && statusKey.has(`${resKey}|${f.resource_id}|${txn ?? ''}`)) continue
        const g = groups.get(key)
        if (g) g.count++
        else groups.set(key, { latest: f, count: 1 })
      }

      const byRes = (r: string) => [...groups.values()].filter(g => g.latest.resource === r).map(g => String(g.latest.resource_id))
      const [eRegs, bks, ords, ths] = await Promise.all([
        prisma.eventRegistration.findMany({ where: { id: { in: byRes('event_registration') } }, select: { id: true, user_email: true, amount_paid: true, viva_transaction_id: true } }),
        prisma.booking.findMany({ where: { id: { in: byRes('booking') } }, select: { id: true, customer_email: true, total_price: true, payment_ref: true } }),
        prisma.order.findMany({ where: { id: { in: byRes('order') } }, select: { id: true, user_email: true, total_amount: true, payment_ref: true } }),
        prisma.telehealthConsultation.findMany({ where: { id: { in: [...byRes('telehealth'), ...byRes('telehealth_consultation')] } }, select: { id: true, client_email: true, price: true, payment_ref: true } }),
      ])
      const look = new Map<string, { email: string; amount: number | null; txn: string | null }>()
      for (const r of eRegs) look.set(`event_registration|${r.id}`, { email: r.user_email, amount: r.amount_paid ?? null, txn: r.viva_transaction_id })
      for (const r of bks) look.set(`booking|${r.id}`, { email: r.customer_email, amount: r.total_price, txn: r.payment_ref })
      for (const r of ords) look.set(`order|${r.id}`, { email: r.user_email, amount: r.total_amount, txn: r.payment_ref })
      for (const r of ths) {
        look.set(`telehealth|${r.id}`, { email: r.client_email, amount: r.price, txn: r.payment_ref })
        look.set(`telehealth_consultation|${r.id}`, { email: r.client_email, amount: r.price, txn: r.payment_ref })
      }

      for (const { latest: f, count } of groups.values()) {
        const m = (f.metadata ?? {}) as any
        const rec = look.get(`${f.resource}|${f.resource_id}`)
        const txn = txnOf(m) ?? (f.action === 'refund' ? rec?.txn ?? null : null)
        // Το ποσό της εγγραφής ισχύει μόνο αν αφορά την ίδια συναλλαγή.
        const recAmount = rec && (txn === null || rec.txn === txn) ? rec.amount : null
        const amount = Number.isFinite(Number(m.amount)) && m.amount !== null && m.amount !== undefined
          ? Number(m.amount)
          : Number.isFinite(Number(m.amount_paid)) && m.amount_paid !== null && m.amount_paid !== undefined
            ? Number(m.amount_paid) : recAmount
        const external = f.action === EXTERNAL_REFUND_ACTION
        items.push({
          kind: external ? 'external_refund' : 'audit', id: f.id, resource: f.resource, resource_id: String(f.resource_id ?? ''),
          status: null, email: f.subject_email ?? rec?.email ?? null, amount,
          transaction_id: txn ?? (m.invoice_id ? String(m.invoice_id) : null),
          date: f.created_at.toISOString(), reason: m.reason ? String(m.reason) : null,
          last_error: f.error_message ?? (m.error ? String(m.error).slice(0, 500) : null),
          action: f.action, attempts: count, title: null,
          can_retry: false,
          ...(external ? { refund_transaction_id: m.refund_tx ? String(m.refund_tx) : null } : {}),
        })
      }
    }

    items.sort((a, b) => b.date.localeCompare(a.date))

    // Προαιρετικά: κατάσταση της συναλλαγής στη Viva (όχι για Stripe).
    if (String(req.query?.check ?? '') === '1') {
      const checkable = items.filter(i => i.transaction_id && i.action !== 'subscription_paid_while_paused').slice(0, 60)
      for (let i = 0; i < checkable.length; i += 5) {
        await Promise.all(checkable.slice(i, i + 5).map(async it => {
          try {
            const tx = await getVivaTransaction(String(it.transaction_id))
            it.viva_status = String(tx?.statusId ?? 'unknown')
            // Συναλλαγή χωρίς γνωστό ποσό (π.χ. δεύτερη πληρωμή): το ποσό της Viva.
            const vivaAmount = Number(tx?.amount ?? tx?.Amount)
            if (it.amount === null && Number.isFinite(vivaAmount) && vivaAmount > 0) it.amount = vivaAmount
          } catch {
            it.viva_status = 'error'
          }
        }))
      }
    }

    return { data: items, count: items.length }
  })

  // ─── Νέα απόπειρα επιστροφής (εγγραφή εκδήλωσης) ─────────────────────
  app.post('/retry', async (req: any, reply) => {
    const { kind, id, amount } = (req.body ?? {}) as any
    if (kind !== 'event_registration') {
      return reply.code(400).send({ message: 'Η νέα απόπειρα επιστροφής γίνεται μόνο για συμμετοχές σε εκδηλώσεις' })
    }
    if (!id || typeof id !== 'string') return reply.code(400).send({ message: 'Λείπει το αναγνωριστικό' })
    const by = String(req.user?.email ?? '')

    const reg = await prisma.eventRegistration.findUnique({ where: { id } })
    if (!reg) return reply.code(404).send({ message: 'Δεν βρέθηκε συμμετοχή' })
    if (reg.status !== 'refund_failed') {
      return reply.code(409).send({ message: 'Η επιστροφή δεν είναι σε κατάσταση αποτυχίας — ανανέωσε τη σελίδα' })
    }
    const txn = reg.viva_transaction_id
    const paid = Number(reg.amount_paid ?? 0)
    if (!txn || !(paid > 0)) {
      return reply.code(400).send({ message: 'Δεν υπάρχει αναφορά πληρωμής — η επιστροφή γίνεται χειροκίνητα από το Viva' })
    }
    // Επιβεβαίωση ποσού: ό,τι είδε ο admin στην οθόνη πρέπει να είναι το ποσό της βάσης.
    if (!Number.isFinite(Number(amount)) || Math.abs(Number(amount) - paid) > 0.005) {
      return reply.code(409).send({ message: 'Το ποσό δεν συμφωνεί με το πληρωμένο — ανανέωσε τη σελίδα' })
    }

    const origin = await eventOrigin(reg)
    const shape = auditShapeFor(origin)

    // Ατομική διεκδίκηση: μόνο ένα αίτημα περνά refund_failed → refunding.
    const claimed = await prisma.eventRegistration.updateMany({
      where: { id: reg.id, status: 'refund_failed', viva_transaction_id: txn },
      data: { status: 'refunding' },
    })
    if (claimed.count === 0) return reply.code(409).send({ message: 'Η ακύρωση είναι ήδη σε εξέλιξη' })

    const backToFailed = () => prisma.eventRegistration.updateMany({
      where: { id: reg.id, status: 'refunding', viva_transaction_id: txn },
      data: { status: 'refund_failed' },
    })

    type Out = 'refunded' | 'already' | 'failed' | 'unknown' | 'viva_refunded' | 'viva_error'
    let lock: { locked: true; value: { out: Out; error?: string } } | { locked: false }
    try {
      lock = await withRefundLock(eventRefundLockKey(reg.id, txn), async (): Promise<{ out: Out; error?: string }> => {
        if (await alreadyRefunded(reg.id, txn)) return { out: 'already' }
        // Επιστροφή που έγινε εκτός εφαρμογής (π.χ. από τον πίνακα της Viva)
        // δεν φαίνεται στο audit: η Viva το λέει (R) — καμία δεύτερη επιστροφή.
        try {
          const tx = await getVivaTransaction(txn)
          if (tx?.statusId === 'R') return { out: 'viva_refunded' }
        } catch (err: any) {
          return { out: 'viva_error', error: String(err?.message ?? err).slice(0, 500) }
        }
        try {
          const r = await refundVivaTransaction(txn, paid)
          await audit(req, {
            action: shape.action, resource: 'event_registration', resource_id: reg.id, subject_email: reg.user_email,
            metadata: { event_id: reg.event_id, amount: paid, transaction_id: txn, refund_tx: r.transactionId, reason: shape.reason, by, admin_retry: true },
          })
          return { out: 'refunded' }
        } catch (err: any) {
          const msg = String(err?.message ?? err).slice(0, 500)
          const unknown = isRefundOutcomeUnknown(err)
          await audit(req, {
            action: shape.action, resource: 'event_registration', resource_id: reg.id, subject_email: reg.user_email,
            outcome: 'failure', error_message: msg,
            metadata: {
              event_id: reg.event_id, amount: paid, transaction_id: txn, reason: shape.reason, by, admin_retry: true,
              ...(unknown ? { unknown_outcome: true } : {}),
            },
          })
          return { out: unknown ? 'unknown' : 'failed', error: msg }
        }
      })
    } catch (err: any) {
      // Η διεκδίκηση στη βάση δεν έγινε: καμία κλήση στη Viva.
      console.error('[admin-refunds] retry lock error', reg.id, err?.message)
      await backToFailed().catch(() => {})
      return reply.code(503).send({ message: 'Προσωρινό σφάλμα — δοκίμασε ξανά σε λίγο' })
    }

    if (!lock.locked) {
      await backToFailed()
      return reply.code(409).send({ message: 'Η ακύρωση είναι ήδη σε εξέλιξη' })
    }
    const { out, error } = lock.value
    if (out === 'refunded' || out === 'already') {
      // Η θέση ΔΕΝ μετριέται σε refund_failed (αφαιρέθηκε ήδη ή δεν μετρήθηκε
      // ποτέ — «γέμισε», ακύρωση εκδήλωσης, εργασία κολλημένων): όπως η
      // κανονική ροή (refundForCancelledEvent με seatCounted=false), καμία
      // αλλαγή στο registered_count.
      const fin = await prisma.eventRegistration.updateMany({
        where: { id: reg.id, status: 'refunding', viva_transaction_id: txn },
        data: { status: 'refunded' },
      })
      // Ο χρήστης μαθαίνει ότι τα χρήματα επιστράφηκαν (μία φορά: μόνο όποιος
      // έκανε την επιστροφή τώρα και πέρασε την εγγραφή σε refunded).
      if (out === 'refunded' && fin.count > 0) {
        await notifyRegistrationRefunded(reg.user_email, reg.event_id, paid)
      }
      return { success: true, status: 'refunded', already: out === 'already', amount: paid }
    }
    if (out === 'unknown') {
      // Άγνωστη έκβαση (timeout/δίκτυο/5xx): η επιστροφή ίσως έγινε. Μένει
      // `refunding` — η resolveStuckEventRefunds (audit → Viva 'R') την κλείνει
      // ή την επαναφέρει σε refund_failed. Καμία νέα απόπειρα στα τυφλά.
      return reply.code(502).send({ message: REFUND_IN_PROGRESS_MESSAGE, detail: error, in_progress: true })
    }
    await backToFailed()
    if (out === 'viva_refunded') {
      return reply.code(409).send({ message: 'Η συναλλαγή εμφανίζεται ήδη επιστραμμένη στη Viva — χρησιμοποίησε «Σήμανση ως λυμένο»' })
    }
    if (out === 'viva_error') {
      return reply.code(502).send({ message: 'Δεν ήταν δυνατός ο έλεγχος της συναλλαγής στη Viva — δεν έγινε επιστροφή', detail: error })
    }
    return reply.code(502).send({ message: 'Η επιστροφή απορρίφθηκε από το Viva', detail: error })
  })

  // ─── Σήμανση ως λυμένο (χωρίς κλήση στη Viva) ─────────────────────────
  app.post('/resolve', async (req: any, reply) => {
    const { kind, id, note: rawNote, refund_amount } = (req.body ?? {}) as any
    if (!['event_registration', 'booking', 'telehealth', 'order', 'audit', 'external_refund'].includes(kind)) {
      return reply.code(400).send({ message: 'Άγνωστος τύπος συναλλαγής' })
    }
    if (!id || typeof id !== 'string') return reply.code(400).send({ message: 'Λείπει το αναγνωριστικό' })
    const note = cleanNote(rawNote)
    if (!note) return reply.code(400).send({ message: 'Γράψε σημείωση για το πώς λύθηκε η επιστροφή' })
    const by = String(req.user?.email ?? '')

    if (kind === 'event_registration') {
      const reg = await prisma.eventRegistration.findUnique({ where: { id } })
      if (!reg) return reply.code(404).send({ message: 'Δεν βρέθηκε συμμετοχή' })
      if (!['refund_failed', 'refunding'].includes(reg.status)) {
        return reply.code(409).send({ message: 'Η επιστροφή δεν είναι σε κατάσταση αποτυχίας — ανανέωσε τη σελίδα' })
      }
      if (reg.status === 'refunding' && !(await eventRegStuck(reg))) {
        return reply.code(409).send({ message: 'Η ακύρωση είναι ήδη σε εξέλιξη' })
      }
      const txn = reg.viva_transaction_id
      const work = async (): Promise<'ok' | 'changed'> => {
        const fresh = await prisma.eventRegistration.findUnique({ where: { id } })
        if (!fresh || fresh.status !== reg.status || fresh.viva_transaction_id !== txn) return 'changed'
        const origin = await eventOrigin(fresh)
        const shape = auditShapeFor(origin)
        // Από `refunding`: η θέση αφαιρείται όπως στην εργασία των κολλημένων —
        // μόνο αν η εκδήλωση δεν ακυρώθηκε και υπάρχει σημάδι αυτο-ακύρωσης
        // (η θέση είχε μετρηθεί). Από `refund_failed` η θέση δεν μετριέται.
        let releaseSeat = false
        if (fresh.status === 'refunding' && txn) {
          const ev = await prisma.event.findUnique({ where: { id: fresh.event_id }, select: { cancelled_at: true } })
          const cancelled = !!ev?.cancelled_at || !!(await legacyCancelledAt(fresh.event_id))
          const claim = await prisma.auditLog.findFirst({
            where: {
              resource: 'event_registration', resource_id: fresh.id, action: EVENT_REFUND_CLAIM_ACTION,
              metadata: { path: ['transaction_id'], equals: txn },
            },
            select: { id: true },
          })
          releaseSeat = !cancelled && !!claim
        }
        const changed = await prisma.$transaction(async (tx) => {
          const r = await tx.eventRegistration.updateMany({
            where: { id: fresh.id, status: fresh.status, viva_transaction_id: txn },
            data: { status: 'refunded' },
          })
          if (r.count > 0 && releaseSeat) {
            await tx.event.update({
              where: { id: fresh.event_id },
              data: { registered_count: { decrement: 1 + (fresh.guests ?? 0) } },
            })
          }
          return r.count > 0
        })
        if (!changed) return 'changed'
        if (releaseSeat) {
          await prisma.event.updateMany({ where: { id: fresh.event_id, registered_count: { lt: 0 } }, data: { registered_count: 0 } })
        }
        // Καταγραφή ΕΠΙΤΥΧΙΑΣ με την action που ελέγχει το alreadyRefunded:
        // καμία μεταγενέστερη ροή δεν ξαναεπιστρέφει αυτή τη συναλλαγή.
        await audit(req, {
          action: shape.action, resource: 'event_registration', resource_id: fresh.id, subject_email: fresh.user_email,
          metadata: {
            event_id: fresh.event_id, amount: fresh.amount_paid, transaction_id: txn, refund_tx: null,
            reason: shape.reason, manual: true, by, note, previous_status: fresh.status, seat_released: releaseSeat,
          },
        })
        return 'ok'
      }
      let result: 'ok' | 'changed'
      try {
        if (txn) {
          const lock = await withRefundLock(eventRefundLockKey(reg.id, txn), work)
          if (!lock.locked) return reply.code(409).send({ message: 'Η ακύρωση είναι ήδη σε εξέλιξη' })
          result = lock.value
        } else {
          result = await work()
        }
      } catch (err: any) {
        console.error('[admin-refunds] resolve error', id, err?.message)
        return reply.code(503).send({ message: 'Προσωρινό σφάλμα — δοκίμασε ξανά σε λίγο' })
      }
      if (result === 'changed') return reply.code(409).send({ message: 'Η συμμετοχή άλλαξε στο μεταξύ — ανανέωσε τη σελίδα και δοκίμασε ξανά.' })
      return { success: true, status: 'refunded' }
    }

    if (kind === 'booking' || kind === 'telehealth') {
      const rec: any = kind === 'booking'
        ? await prisma.booking.findUnique({ where: { id } })
        : await prisma.telehealthConsultation.findUnique({ where: { id } })
      if (!rec) return reply.code(404).send({ message: 'Η συναλλαγή δεν βρέθηκε' })
      if (rec.payment_status !== 'refunding') {
        return reply.code(409).send({ message: 'Η επιστροφή δεν είναι σε κατάσταση αποτυχίας — ανανέωσε τη σελίδα' })
      }
      const stuck = kind === 'booking'
        ? Date.now() - rec.updated_at.getTime() >= STUCK_MS
        : await telehealthStuck(rec)
      if (!stuck) return reply.code(409).send({ message: 'Η ακύρωση είναι ήδη σε εξέλιξη' })

      // Επιστροφή του admin (όχι ακύρωση): μόνο η κατάσταση πληρωμής.
      const origin = rec.payment_ref ? await adminRefundOrigin(kind, rec.id, String(rec.payment_ref)) : null
      if (origin) {
        const r = await resolveAdminRefund(req, kind, rec, origin, refund_amount, note, by)
        if (!r.ok) return reply.code(r.code).send({ message: r.message })
        return { success: true, status: r.status }
      }

      const total = Number(kind === 'booking' ? rec.total_price : rec.price) || 0
      const txn = String(rec.payment_ref ?? '')
      // Χωρίς ποσό: ό,τι ζητήθηκε στην ακύρωση (audit) — όχι το σύνολο, που
      // σε αργή ακύρωση (50%) θα κατέγραφε επιστροφή που δεν έγινε.
      let refund = (txn ? await cancelRequestedAmount(kind, rec.id, txn) : null) ?? total
      if (refund_amount !== undefined && refund_amount !== null && refund_amount !== '') {
        refund = Number(refund_amount)
        if (!Number.isFinite(refund) || refund < 0) return reply.code(400).send({ message: 'Μη έγκυρο ποσό επιστροφής' })
        if (refund > total + 0.005) return reply.code(400).send({ message: `Το ποσό υπερβαίνει το πληρωμένο (${total.toFixed(2)} €)` })
      }
      refund = round2(Math.min(Math.max(0, refund), total))
      const fee = round2(Math.max(0, total - refund))
      const keep = total > 0 ? fee / total : 0
      const resource = kind === 'booking' ? 'booking' : 'telehealth'
      // Ποσό 0: η επιστροφή ΔΕΝ έγινε → η κράτηση/συνεδρία ξανά πληρωμένη,
      // με την κατάσταση που είχε (η διεκδίκηση της ακύρωσης αλλάζει μόνο το
      // payment_status, άρα το status είναι ακόμα αυτό πριν την ακύρωση).
      const restorePaid = refund <= 0
      const finalStatus = restorePaid ? 'paid' : refund >= total - 0.005 ? 'refunded' : 'partially_refunded'

      const work = async (): Promise<boolean> => {
        const where = { id: rec.id, payment_status: 'refunding', payment_ref: rec.payment_ref }
        if (restorePaid) {
          const r = kind === 'booking'
            ? await prisma.booking.updateMany({ where, data: { payment_status: 'paid' } })
            : await prisma.telehealthConsultation.updateMany({ where, data: { payment_status: 'paid' } })
          if (r.count === 0) return false
          // Σήμανση «λύθηκε» (και για την αποτυχία της ακύρωσης στο audit, που
          // αλλιώς θα ξαναεμφανιζόταν στη λίστα αφού η εγγραφή δεν είναι πια refunding).
          await audit(req, {
            action: RESOLVED_MARKER_ACTION, resource, resource_id: rec.id,
            subject_email: kind === 'booking' ? rec.customer_email : rec.client_email,
            metadata: {
              group: groupKey(`${resource}_cancel_refund`, resource, rec.id, txn || null),
              failed_action: `${resource}_cancel_refund`, transaction_id: txn || null,
              note, by, result: 'paid', amount: 0, status: rec.status,
            },
          })
          return true
        }
        const data: any = {
          status: 'cancelled',
          payment_status: finalStatus,
        }
        if (rec.provider_payout_amount != null) data.provider_payout_amount = round2(rec.provider_payout_amount * keep)
        if (rec.platform_fee_amount != null) data.platform_fee_amount = round2(rec.platform_fee_amount * keep)
        const r = kind === 'booking'
          ? await prisma.booking.updateMany({ where, data })
          : await prisma.telehealthConsultation.updateMany({ where, data })
        if (r.count === 0) return false
        await audit(req, {
          action: kind === 'booking' ? 'booking_cancel' : 'telehealth_cancel', resource, resource_id: rec.id,
          subject_email: kind === 'booking' ? rec.customer_email : rec.client_email,
          metadata: {
            by: 'admin', admin: by, refund, fee, total, transaction_id: txn || null, refund_tx: null,
            resolved_by: 'admin_manual', manual: true, note,
          },
        })
        return true
      }
      let ok: boolean
      try {
        if (txn) {
          // Κράτηση: ίδιο κλειδί με την cancelBooking και την εργασία των κολλημένων.
          const key = kind === 'booking' ? bookingCancelLockKey(rec.id, txn) : `telehealth_cancel|${rec.id}|${txn}`
          const lock = await withRefundLock(key, work)
          if (!lock.locked) return reply.code(409).send({ message: 'Η ακύρωση είναι ήδη σε εξέλιξη' })
          ok = lock.value
        } else {
          ok = await work()
        }
      } catch (err: any) {
        console.error('[admin-refunds] resolve error', id, err?.message)
        return reply.code(503).send({ message: 'Προσωρινό σφάλμα — δοκίμασε ξανά σε λίγο' })
      }
      if (!ok) return reply.code(409).send({ message: 'Η κράτηση άλλαξε στο μεταξύ — ανανέωσε τη σελίδα και δοκίμασε ξανά.' })
      // Ο πελάτης μαθαίνει ότι η επιστροφή ολοκληρώθηκε (μόνο όποιος άλλαξε την εγγραφή τώρα).
      if (!restorePaid) await notifyCancelRefundCompleted(kind, rec, refund)
      return { success: true, status: finalStatus }
    }

    if (kind === 'order') {
      const rec = await prisma.order.findUnique({ where: { id } })
      if (!rec) return reply.code(404).send({ message: 'Η συναλλαγή δεν βρέθηκε' })
      if (rec.payment_status !== 'refunding' || !rec.payment_ref) {
        return reply.code(409).send({ message: 'Η επιστροφή δεν είναι σε κατάσταση αποτυχίας — ανανέωσε τη σελίδα' })
      }
      if (Date.now() - rec.updated_at.getTime() < STUCK_MS) return reply.code(409).send({ message: 'Η επιστροφή είναι ήδη σε εξέλιξη' })
      const origin = await adminRefundOrigin('order', rec.id, rec.payment_ref)
      const r = await resolveAdminRefund(req, 'order', rec, origin, refund_amount, note, by)
      if (!r.ok) return reply.code(r.code).send({ message: r.message })
      return { success: true, status: r.status }
    }

    // kind === 'audit' / 'external_refund': σημάδι «λύθηκε» για μια καταγραφή
    // αποτυχίας (εξωτερική επιστροφή: καμία αλλαγή στην εγγραφή, καμία Viva).
    const f = await prisma.auditLog.findUnique({ where: { id } })
    if (!f || f.outcome !== 'failure') return reply.code(404).send({ message: 'Η συναλλαγή δεν βρέθηκε' })
    if ((kind === 'external_refund') !== (f.action === EXTERNAL_REFUND_ACTION)) return reply.code(400).send({ message: 'Άγνωστος τύπος συναλλαγής' })
    const isRefundFailure = FAILURE_ACTIONS.includes(f.action) || f.action.endsWith('_refund')
    if (!isRefundFailure) return reply.code(400).send({ message: 'Άγνωστος τύπος συναλλαγής' })
    const txn = txnOf(f.metadata)
    const group = groupKey(f.action, f.resource, f.resource_id, groupTxnOf(f.action, f.metadata))
    const existing = await prisma.auditLog.findFirst({
      where: {
        action: RESOLVED_MARKER_ACTION, resource: f.resource, resource_id: f.resource_id,
        created_at: { gt: f.created_at },
        OR: [
          { metadata: { path: ['audit_id'], equals: f.id } },
          { metadata: { path: ['group'], equals: group } },
        ],
      },
      select: { id: true },
    })
    if (existing) return reply.code(409).send({ message: 'Έχει ήδη σημειωθεί ως λυμένο' })
    // Αποτυχία επιστροφής admin με άγνωστη έκβαση: η εγγραφή μένει
    // `refunding` — η σήμανση την κλείνει (ό,τι ζητήθηκε τότε).
    if (f.action === 'refund' && txn && ['order', 'booking', 'telehealth'].includes(f.resource) && (f.metadata as any)?.unknown_outcome === true) {
      const type = f.resource as AdminRefundResource
      const rec: any = await ADMIN_REFUND_MODELS[type].findUnique({ where: { id: String(f.resource_id) } })
      if (rec && rec.payment_status === 'refunding' && rec.payment_ref === txn) {
        const origin = await adminRefundOrigin(type, rec.id, txn)
        if (origin) {
          const r = await resolveAdminRefund(req, type, rec, origin, refund_amount, note, by)
          if (!r.ok) return reply.code(r.code).send({ message: r.message })
          return { success: true, status: r.status }
        }
      }
    }
    await audit(req, {
      action: RESOLVED_MARKER_ACTION, resource: f.resource, resource_id: f.resource_id,
      subject_email: f.subject_email,
      metadata: { audit_id: f.id, group, failed_action: f.action, transaction_id: txn, note, by },
    })
    return { success: true }
  })
}

export default adminRefundsRoutes
