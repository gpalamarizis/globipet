import prisma from './prisma.js'
import { getVivaTransaction, isVivaDefinitiveRejection, VivaHttpError } from './viva.js'
import { withRefundLock } from './refundLock.js'
import { bookingCancelLockKey, telehealthCancelLockKey } from './cancellation.js'
import { eventRefundLockKey } from '../routes/events.js'

/**
 * Viva webhook EventTypeId 1797 «Transaction Reversal Created».
 *
 * Τεκμηρίωση: https://developer.viva.com/webhooks-for-payments/transaction-reversal-created/
 *   EventData.TransactionId — η συναλλαγή της ΕΠΙΣΤΡΟΦΗΣ
 *   EventData.ParentId      — η αρχική πληρωμή (TransactionId της)
 *   EventData.Amount        — αρνητικό · OrderCode · StatusId
 *
 * ΓΙΑΤΙ
 *   Επιστροφή που γίνεται από τον πίνακα της Viva (εκτός εφαρμογής) δεν
 *   άφηνε κανένα ίχνος: η παραγγελία/κράτηση έμενε «πληρωμένη», ο πάροχος
 *   έβλεπε ολόκληρη την αμοιβή, και μια μεταγενέστερη επιστροφή από την
 *   εφαρμογή θα ζητούσε ξανά τα ίδια χρήματα.
 *
 * ΤΙ ΚΑΝΕΙ — ΠΟΤΕ ΚΑΜΙΑ ΚΙΝΗΣΗ ΧΡΗΜΑΤΩΝ
 *   1. Το webhook δεν είναι υπογεγραμμένο: η επιστροφή επαληθεύεται στη Viva
 *      (υπάρχει, F, ίδιος orderCode με την αρχική πληρωμή, και — αν η Viva
 *      δίνει parentId — ίδιο parent). Το ποσό είναι ΤΗΣ VIVA, όχι του payload.
 *   2. Ποια εγγραφή μας πληρώθηκε με το ParentId: Order/Booking/
 *      TelehealthConsultation `payment_ref`, EventRegistration `viva_transaction_id`.
 *      Καμία → 'ignored' (200 και log).
 *   3. Υπό το ΙΔΙΟ κλείδωμα (withRefundLock) που παίρνουν οι δικές μας ροές
 *      επιστροφής του πόρου — αυτές γράφουν την καταγραφή επιτυχίας (με το
 *      refund_tx) πριν λυθεί το κλείδωμα:
 *        · κλείδωμα πιασμένο ή εγγραφή σε `refunding` → 'retry' (503· η Viva
 *          ξαναστέλνει όταν η δική μας ροή θα έχει γράψει την καταγραφή της)
 *        · καταγραφή επιτυχίας με refund_tx / viva_refund_transaction = αυτή
 *          η επιστροφή → 'ours', καμία ενέργεια
 *        · ήδη καταγεγραμμένη (EXTERNAL_REFUND_ACTION, ίδιο refund_tx) → 'already'
 *        · αλλιώς ΕΞΩΤΕΡΙΚΗ: payment_status → refunded (σύνολο επιστροφών ≥
 *          πληρωμένου) ή partially_refunded, αναλογική μείωση αμοιβής παρόχου
 *          και προμήθειας (όπως το /admin/refund), ΧΩΡΙΣ ακύρωση. Μετάβαση και
 *          καταγραφή στην ΙΔΙΑ συναλλαγή βάσης (ιδεμποτικό στην επανάληψη).
 *          Η καταγραφή έχει outcome 'failure' ώστε να εμφανίζεται στις
 *          «Αποτυχημένες επιστροφές» ως «Εξωτερική επιστροφή — έλεγξε».
 *   «Αμφίβολη» περίπτωση (υπάρχει δική μας επιστροφή της ίδιας πληρωμής χωρίς
 *   γνωστό refund tx — π.χ. άγνωστη έκβαση που έκλεισε η εργασία των
 *   κολλημένων ή «Σήμανση ως λυμένο»), ποσό που η Viva δεν έδωσε, ή εγγραφή
 *   εκδήλωσης (δεν έχει payment_status/αμοιβές): ΜΟΝΟ καταγραφή για τον
 *   διαχειριστή, καμία αλλαγή στην εγγραφή — ώστε να μη μετρηθεί διπλά.
 */

export const EXTERNAL_REFUND_ACTION = 'external_refund'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const round2 = (n: number) => Math.round(n * 100) / 100

type ResType = 'order' | 'booking' | 'telehealth' | 'event_registration'
export type ReversalOutcome = 'external' | 'ours' | 'already' | 'ignored' | 'retry'

/** Ονόματα resource στο audit ανά τύπο (η τηλεϊατρική γράφεται και με τα δύο). */
const AUDIT_RESOURCES: Record<ResType, string[]> = {
  order: ['order'], booking: ['booking'], telehealth: ['telehealth', 'telehealth_consultation'],
  event_registration: ['event_registration'],
}

/** Κλειδί του κλειδώματος που παίρνουν οι δικές μας επιστροφές της ΙΔΙΑΣ πληρωμής. */
function lockKeyOf(type: ResType, id: string, txn: string): string {
  if (type === 'booking') return bookingCancelLockKey(id, txn)
  if (type === 'telehealth') return telehealthCancelLockKey(id, txn)
  if (type === 'event_registration') return eventRefundLockKey(id, txn)
  // Ίδιο με adminRefundLockKey('order') και lib/extraPaymentRefund.
  return `order|${id}|${txn}`
}

const refundTxOf = (m: any): string | null => {
  const v = m?.refund_tx ?? m?.viva_refund_transaction
  return v === undefined || v === null || v === '' ? null : String(v)
}
const num = (v: any): number | null =>
  v === undefined || v === null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v)

/** Καταγραφή επιτυχίας που σημαίνει «επιστράψαμε χρήματα αυτής της πληρωμής». */
function isOurRefundRow(action: string, m: any): boolean {
  if (action === EXTERNAL_REFUND_ACTION || action === 'refund_failure_resolved') return false
  if (action === 'booking_cancel' || action === 'telehealth_cancel') return (num(m?.refund) ?? 0) > 0
  return action === 'refund' || action.endsWith('_refund') || action === 'event_registration_refunding_resolved'
}

type Rec = {
  type: ResType; id: string; email: string | null; paid: number
  state: string                    // payment_status (εγγραφή εκδήλωσης: status)
  payout: number | null; fee: number | null
}

async function findByParent(parent: string): Promise<Rec | null> {
  const [o, b, c, r] = await Promise.all([
    prisma.order.findFirst({ where: { payment_ref: parent } }),
    prisma.booking.findFirst({ where: { payment_ref: parent } }),
    prisma.telehealthConsultation.findFirst({ where: { payment_ref: parent } }),
    prisma.eventRegistration.findFirst({ where: { viva_transaction_id: parent } }),
  ])
  if (o) return { type: 'order', id: o.id, email: o.user_email, paid: Number(o.total_amount) || 0, state: o.payment_status, payout: o.provider_payout_amount, fee: o.platform_fee_amount }
  if (b) return { type: 'booking', id: b.id, email: b.customer_email, paid: Number(b.total_price) || 0, state: b.payment_status, payout: b.provider_payout_amount, fee: b.platform_fee_amount }
  if (c) return { type: 'telehealth', id: c.id, email: c.client_email, paid: Number(c.price) || 0, state: c.payment_status, payout: c.provider_payout_amount, fee: c.platform_fee_amount }
  if (r) return { type: 'event_registration', id: r.id, email: r.user_email, paid: Number(r.amount_paid ?? 0) || 0, state: r.status, payout: null, fee: null }
  return null
}

/**
 * Viva 404 για τη συναλλαγή ΕΠΙΣΤΡΟΦΗΣ: αμέσως μετά τη δημιουργία της, η
 * επιστροφή μπορεί να μη φαίνεται ακόμη στο API συναλλαγών (καθυστέρηση
 * ευρετηρίου της Viva). Τότε 'retry' (503 — η Viva ξαναστέλνει) ΑΝΤΙ για
 * οριστική απόρριψη, αλλά ΜΟΝΟ όσο το webhook είναι πρόσφατο (< 1 ώρα), ώστε
 * ένα πλαστό/λάθος TransactionId να μην ξαναζητείται για πάντα. Ημερομηνία
 * webhook: το `Created` του σώματος (αν δόθηκε) αλλιώς το `EventData.InsDate`·
 * δεκτή μόνο με ρητή ζώνη ώρας (Z ή ±hh:mm) — χωρίς αυτήν ή χωρίς ημερομηνία
 * → οριστική απόρριψη ('ignored'), όπως πριν.
 */
const REVERSAL_404_RETRY_WINDOW_MS = 3600_000
const ISO_WITH_TZ_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/i
function isRecentWebhook(eventData: any, webhookCreated?: unknown): boolean {
  for (const v of [webhookCreated, eventData?.InsDate]) {
    if (typeof v !== 'string' || !ISO_WITH_TZ_RE.test(v.trim())) continue
    const t = new Date(v.trim()).getTime()
    if (!Number.isFinite(t)) continue
    const age = Date.now() - t
    // Λίγα λεπτά «στο μέλλον» = απόκλιση ρολογιών· πιο πολύ = ύποπτο.
    return age < REVERSAL_404_RETRY_WINDOW_MS && age > -5 * 60_000
  }
  return false
}

/** Η εγγραφή αλλάζει κατάσταση στο μεταξύ (η διεκδίκηση δεν πέρασε). */
class ChangedError extends Error {}

export async function handleVivaTransactionReversal(eventData: any, webhookCreated?: unknown): Promise<ReversalOutcome> {
  const refundTx = String(eventData?.TransactionId ?? '')
  const parent = String(eventData?.ParentId ?? '')
  if (!UUID_RE.test(refundTx) || !UUID_RE.test(parent)) {
    console.error('[viva] reversal webhook without valid TransactionId/ParentId — ignored')
    return 'ignored'
  }

  // Σφάλμα βάσης → πετιέται (το webhook απαντά 503).
  const found = await findByParent(parent)
  if (!found) {
    console.error(`[viva] reversal ${refundTx}: parent ${parent} is not one of our payments — ignored`)
    return 'ignored'
  }

  // ── Επαλήθευση στη Viva ──
  let amount: number | null = null
  let orderCode: string | null = null
  try {
    let tx: any
    try {
      tx = await getVivaTransaction(refundTx)
    } catch (err: any) {
      // Η επιστροφή δεν φαίνεται ΑΚΟΜΗ στη Viva → ξανά αργότερα (βλ. isRecentWebhook).
      if (err instanceof VivaHttpError && err.status === 404 && isRecentWebhook(eventData, webhookCreated)) {
        console.error(`[viva] reversal ${refundTx}: not found at Viva yet (recent webhook) — will retry`)
        return 'retry'
      }
      throw err
    }
    if (!tx || tx.statusId !== 'F') {
      console.error(`[viva] reversal ${refundTx}: status ${tx?.statusId ?? 'none'} at Viva — ignored`)
      return 'ignored'
    }
    const vivaParent = tx.parentId ?? tx.ParentId
    if (vivaParent !== undefined && vivaParent !== null && String(vivaParent) !== parent) {
      console.error(`[viva] reversal ${refundTx}: Viva parent ${vivaParent} ≠ ${parent} — ignored`)
      return 'ignored'
    }
    // Η επιστροφή μοιράζεται τον orderCode της αρχικής πληρωμής.
    const ptx = await getVivaTransaction(parent)
    orderCode = String(tx.orderCode ?? tx.OrderCode ?? '')
    const parentCode = String(ptx?.orderCode ?? ptx?.OrderCode ?? '')
    if (!orderCode || orderCode !== parentCode) {
      console.error(`[viva] reversal ${refundTx}: orderCode ${orderCode} does not match parent ${parent} (${parentCode}) — ignored`)
      return 'ignored'
    }
    const a = Math.abs(Number(tx.amount ?? tx.Amount))
    amount = Number.isFinite(a) && a > 0 ? round2(a) : null
  } catch (err: any) {
    if (isVivaDefinitiveRejection(err)) {
      console.error(`[viva] reversal ${refundTx}: rejected by Viva — ignored`, err?.message)
      return 'ignored'
    }
    console.error(`[viva] reversal ${refundTx}: verification error (will retry)`, err?.message)
    return 'retry'
  }

  const lock = await withRefundLock(lockKeyOf(found.type, found.id, parent), async (): Promise<ReversalOutcome> => {
    const rec = await findByParent(parent)
    if (!rec || rec.type !== found.type || rec.id !== found.id) return 'ignored'
    // Δική μας επιστροφή σε εξέλιξη (ή με άγνωστη έκβαση): η καταγραφή της δεν
    // έχει γραφτεί ακόμη — η Viva θα ξαναστείλει.
    if (rec.state === 'refunding') return 'retry'

    const already = await prisma.auditLog.findFirst({
      where: {
        action: EXTERNAL_REFUND_ACTION, resource: rec.type, resource_id: rec.id,
        metadata: { path: ['refund_tx'], equals: refundTx },
      },
      select: { id: true },
    })
    if (already) return 'already'

    const rows = await prisma.auditLog.findMany({
      where: {
        resource: { in: AUDIT_RESOURCES[rec.type] }, resource_id: rec.id,
        metadata: { path: ['transaction_id'], equals: parent },
      },
      select: { action: true, outcome: true, metadata: true },
      take: 500,
    })
    const ours = rows.some(r => r.outcome === 'success' && refundTxOf(r.metadata) === refundTx)
    if (ours) return 'ours'

    // Δικές μας επιστροφές της πληρωμής: ποσό ανά refund tx (η ακύρωση γράφει
    // δύο καταγραφές με το ίδιο refund_tx). Χωρίς refund tx → αμφίβολη.
    let ambiguous = false
    const byRefundTx = new Map<string, number>()
    let priorExternal = 0
    for (const r of rows) {
      const m = (r.metadata ?? {}) as any
      if (r.action === EXTERNAL_REFUND_ACTION) {
        if (m.applied === true) priorExternal += num(m.amount) ?? 0
        continue
      }
      if (r.outcome === 'failure' && m.unknown_outcome === true) { ambiguous = true; continue }
      if (r.outcome !== 'success' || !isOurRefundRow(r.action, m)) continue
      const rt = refundTxOf(m)
      if (!rt) { ambiguous = true; continue }
      const a = num(m.amount) ?? num(m.refund) ?? num(m.amount_paid) ?? 0
      byRefundTx.set(rt, Math.max(byRefundTx.get(rt) ?? 0, a))
    }
    const ourRefunded = [...byRefundTx.values()].reduce((s, v) => s + v, 0)
    const prev = round2(ourRefunded + priorExternal)

    const canApply = rec.type !== 'event_registration' && amount !== null && !ambiguous
      && ['paid', 'partially_refunded'].includes(rec.state) && rec.paid > 0
    const why = rec.type === 'event_registration' ? 'event_registration'
      : ambiguous ? 'ambiguous' : amount === null ? 'amount_unknown'
      : !['paid', 'partially_refunded'].includes(rec.state) ? `state_${rec.state}` : null

    const total = round2(prev + (amount ?? 0))
    const newStatus = canApply ? (total >= rec.paid - 0.005 ? 'refunded' : 'partially_refunded') : null
    const before = Math.max(0, rec.paid - prev)
    const after = Math.max(0, before - (amount ?? 0))
    const ratio = before > 0.005 ? Math.min(1, after / before) : 0

    const auditRow = (applied: boolean) => ({
      action: EXTERNAL_REFUND_ACTION, resource: rec.type, resource_id: rec.id,
      actor_id: null, actor_email: 'system@globipet', actor_role: 'system',
      subject_email: rec.email,
      // 'failure': εμφανίζεται στις «Αποτυχημένες επιστροφές» για έλεγχο.
      outcome: 'failure',
      error_message: applied
        ? 'Refund made outside the app (Viva panel) — payment status updated, booking/order NOT cancelled. Check.'
        : `Refund made outside the app (Viva panel) — not applied automatically (${why}). Check.`,
      metadata: {
        transaction_id: parent, refund_tx: refundTx, amount, paid: rec.paid,
        previously_refunded: prev, total_refunded: total, applied,
        previous_status: rec.state, new_status: newStatus, order_code: orderCode,
        reason: EXTERNAL_REFUND_ACTION, ...(why ? { not_applied: why } : {}),
      } as any,
    })

    if (!canApply) {
      await prisma.auditLog.create({ data: auditRow(false) })
      return 'external'
    }
    const data: any = { payment_status: newStatus }
    if (rec.payout != null) data.provider_payout_amount = round2(Number(rec.payout) * ratio)
    if (rec.fee != null) data.platform_fee_amount = round2(Number(rec.fee) * ratio)
    try {
      // Ατομικά: μετάβαση υπό συνθήκη (ίδια κατάσταση, ίδια πληρωμή) και
      // καταγραφή στην ίδια συναλλαγή — η επανάληψη βρίσκει 'already'.
      await prisma.$transaction(async (tx) => {
        const where = { id: rec.id, payment_status: rec.state, payment_ref: parent }
        const r = rec.type === 'order' ? await tx.order.updateMany({ where, data })
          : rec.type === 'booking' ? await tx.booking.updateMany({ where, data })
          : await tx.telehealthConsultation.updateMany({ where, data })
        if (r.count !== 1) throw new ChangedError()
        await tx.auditLog.create({ data: auditRow(true) })
      })
    } catch (err) {
      if (err instanceof ChangedError) return 'retry'
      throw err
    }
    return 'external'
  })
  if (!lock.locked) return 'retry'
  if (lock.value === 'external') console.error(`[viva] EXTERNAL refund ${refundTx} of ${found.type} ${found.id} (parent ${parent}) recorded — admin check needed`)
  return lock.value
}
