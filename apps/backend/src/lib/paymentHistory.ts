import prisma from './prisma.js'

/**
 * Ε18 — Πληρωμές Viva του χρήστη (παραγγελίες, κρατήσεις, τηλεϊατρική,
 * εκδηλώσεις) για το ιστορικό πληρωμών και το αποδεικτικό πληρωμής
 * (routes/payments.ts). ΜΟΝΟ ανάγνωση — καμία αλλαγή, καμία κλήση στη Viva.
 *
 * ΠΟΙΕΣ ΕΓΓΡΑΦΕΣ (μόνο όσες πληρώθηκαν πραγματικά, ποσό > 0)
 *   Order / Booking / TelehealthConsultation: payment_status
 *     paid · refunding (επιστροφή σε εξέλιξη — τα χρήματα δεν έχουν γυρίσει:
 *     εμφανίζεται «paid») · partially_refunded · refunded.
 *     ΟΧΙ unpaid (απλήρωτη/εκκρεμής/αποτυχημένη πληρωμή).
 *   EventRegistration: viva_transaction_id ≠ null, amount_paid > 0 και status
 *     registered · refunding · refund_failed (πληρωμένη) · refunded.
 *     ΟΧΙ pending_payment / cancelled / δωρεάν.
 *
 * ΠΟΣΟ ΕΠΙΣΤΡΟΦΗΣ (refunded_amount)
 *   · paid (και refunding / refund_failed) → 0.
 *   · refunded → ολόκληρο το ποσό: η κατάσταση γράφεται μόνο όταν η
 *     επιστροφή καλύπτει όλο το πληρωμένο (lib/cancellation: refund ≥ total·
 *     routes/admin.ts: full· lib/externalRefund: σύνολο ≥ πληρωμένου). Οι
 *     εγγραφές εκδηλώσεων επιστρέφονται ΜΟΝΟ ολόκληρες (το amount_paid).
 *   · partially_refunded (μόνο παραγγελία/κράτηση/τηλεϊατρική) → από τα
 *     audit_logs της ΙΔΙΑΣ πληρωμής (metadata.transaction_id = payment_ref),
 *     με τον ίδιο κανόνα που μετρά τις προηγούμενες επιστροφές η
 *     lib/externalRefund.ts:
 *       - δικές μας επιστροφές (outcome success): 'refund' (admin.ts,
 *         admin-refunds.ts) → metadata.amount · '<x>_cancel_refund' →
 *         metadata.refund · 'booking_cancel' / 'telehealth_cancel' με
 *         refund > 0 → metadata.refund· ΜΙΑ τιμή ανά refund tx
 *         (refund_tx / viva_refund_transaction — η ακύρωση γράφει δύο
 *         καταγραφές για την ίδια επιστροφή)·
 *       - εξωτερικές επιστροφές από τον πίνακα της Viva: 'external_refund'
 *         με applied === true → metadata.amount (μία ανά refund_tx).
 *     Αμφίβολο → null (ΔΕΝ μαντεύουμε): δική μας επιστροφή χωρίς refund tx
 *     (χειροκίνητη «Σήμανση ως λυμένο») μαζί με άλλη δική μας επιστροφή, ή
 *     άθροισμα 0 / μεγαλύτερο του πληρωμένου.
 *   Οι επιστροφές ΔΙΠΛΩΝ πληρωμών ('<x>_duplicate_refund') αφορούν άλλη
 *   συναλλαγή (όχι το payment_ref) και δεν μετρούν.
 *
 * ΗΜΕΡΟΜΗΝΙΑ: created_at της εγγραφής (δεν υπάρχει στήλη «πληρώθηκε στις»· η
 * πληρωμή γίνεται αμέσως μετά τη δημιουργία, στο checkout).
 *
 * ΓΝΩΣΤΟΣ ΠΕΡΙΟΡΙΣΜΟΣ — επανεγγραφή σε εκδήλωση: το σχήμα έχει unique
 * (event_id, user_email) στο event_registrations, και το POST
 * /events/:id/register ΞΑΝΑΧΡΗΣΙΜΟΠΟΙΕΙ την ίδια γραμμή όταν είναι
 * pending_payment / cancelled / refunded (routes/events REUSABLE_STATUSES).
 * Αν ο χρήστης πλήρωσε, πήρε επιστροφή και ξαναγράφτηκε πληρώνοντας, η γραμμή
 * γράφεται από πάνω (status, amount_paid, viva_transaction_id): το ιστορικό
 * δείχνει ΜΟΝΟ την τελευταία πληρωμή — η προηγούμενη (επιστραμμένη) δεν
 * εμφανίζεται, και το αποδεικτικό αφορά την τελευταία. Το created_at ΔΕΝ
 * αλλάζει, οπότε η ημερομηνία είναι της πρώτης εγγραφής, όχι της νέας πληρωμής. Η
 * διόρθωση θέλει αλλαγή σχήματος (ξεχωριστή γραμμή ανά πληρωμή) — εκτός Ε18.
 */
export type VivaKind = 'order' | 'booking' | 'telehealth' | 'event'
export const VIVA_KINDS: readonly VivaKind[] = ['order', 'booking', 'telehealth', 'event']
export type PayStatus = 'paid' | 'refunded' | 'partially_refunded'

export interface VivaPayment {
  kind: VivaKind
  id: string
  /** Σύντομος κωδικός: 8 πρώτοι χαρακτήρες του id, κεφαλαία (όπως «Παραγγελία #…»). */
  ref: string
  description: string | null
  /** Δικαιούχος: πάροχος / διοργανωτής· null στις παραγγελίες (πολλοί πάροχοι ή η πλατφόρμα). */
  beneficiary: string | null
  amount: number
  status: PayStatus
  refunded_amount: number | null
  date: Date
  /** Αναφορά συναλλαγής Viva (payment_ref / viva_transaction_id). */
  transaction: string | null
}

const PAID_STATES = ['paid', 'refunding', 'partially_refunded', 'refunded']
const EVENT_PAID_STATES = ['registered', 'refunding', 'refund_failed', 'refunded']
const MAX_PER_KIND = 200

const round2 = (n: number) => Math.round(n * 100) / 100
const num = (v: any): number | null =>
  v === undefined || v === null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v)
const shortRef = (id: string) => String(id).slice(0, 8).toUpperCase()
const clip = (s: string, n = 200) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

function statusOf(paymentStatus: string): PayStatus {
  return paymentStatus === 'refunded' ? 'refunded'
    : paymentStatus === 'partially_refunded' ? 'partially_refunded'
    : 'paid'
}

/** Ονόματα προϊόντων της παραγγελίας (items[].name, ×ποσότητα όταν > 1). */
function orderDescription(items: unknown): string | null {
  if (!Array.isArray(items)) return null
  const parts: string[] = []
  for (const it of items as any[]) {
    const name = typeof it?.name === 'string' ? it.name.trim() : ''
    if (!name) continue
    const q = Math.floor(Number(it?.quantity))
    parts.push(Number.isFinite(q) && q > 1 ? `${name} ×${q}` : name)
  }
  return parts.length ? clip(parts.join(', ')) : null
}

const join = (...xs: (string | null | undefined)[]) => {
  const s = xs.map(x => (x ?? '').trim()).filter(Boolean).join(' · ')
  return s ? clip(s) : null
}

// ─── Ποσό μερικής επιστροφής από τα audit_logs ─────────────────────────────

type RefundType = 'order' | 'booking' | 'telehealth'
const AUDIT_RESOURCES: Record<RefundType, string[]> = {
  order: ['order'], booking: ['booking'], telehealth: ['telehealth', 'telehealth_consultation'],
}
const EXTERNAL_REFUND_ACTION = 'external_refund' // = lib/externalRefund EXTERNAL_REFUND_ACTION

const refundTxOf = (m: any): string | null => {
  const v = m?.refund_tx ?? m?.viva_refund_transaction
  return v === undefined || v === null || v === '' ? null : String(v)
}

/** Ίδιος κανόνας με lib/externalRefund isOurRefundRow. */
function isOurRefundRow(action: string, m: any): boolean {
  if (action === EXTERNAL_REFUND_ACTION || action === 'refund_failure_resolved') return false
  if (action === 'booking_cancel' || action === 'telehealth_cancel') return (num(m?.refund) ?? 0) > 0
  return action === 'refund' || action.endsWith('_refund')
}

/**
 * Συνολικό ποσό που επιστράφηκε για κάθε μερικώς επιστραμμένη εγγραφή, ή null
 * όταν δεν κρίνεται με βεβαιότητα. key = id εγγραφής.
 */
async function partialRefunds(
  type: RefundType, recs: { id: string; txn: string | null; paid: number }[],
): Promise<Map<string, number | null>> {
  const out = new Map<string, number | null>()
  const withTxn = recs.filter(r => r.txn)
  for (const r of recs) if (!r.txn) out.set(r.id, null)
  if (!withTxn.length) return out
  const rows = await prisma.auditLog.findMany({
    where: {
      resource: { in: AUDIT_RESOURCES[type] },
      resource_id: { in: withTxn.map(r => r.id) },
      outcome: 'success',
      OR: [
        { action: { in: ['refund', 'booking_cancel', 'telehealth_cancel', EXTERNAL_REFUND_ACTION] } },
        { action: { endsWith: '_refund' } },
      ],
    },
    select: { resource_id: true, action: true, metadata: true },
    take: 2000,
  })
  for (const r of withTxn) {
    const byTx = new Map<string, number>()
    const external = new Map<string, number>()
    const noTx: number[] = []
    for (const row of rows) {
      if (row.resource_id !== r.id) continue
      const m = (row.metadata ?? {}) as any
      if (String(m?.transaction_id ?? '') !== r.txn) continue
      if (row.action === EXTERNAL_REFUND_ACTION) {
        if (m.applied === true) external.set(refundTxOf(m) ?? `?${external.size}`, num(m.amount) ?? 0)
        continue
      }
      if (!isOurRefundRow(row.action, m)) continue
      const a = num(m.amount) ?? num(m.refund) ?? 0
      const rt = refundTxOf(m)
      if (rt) byTx.set(rt, Math.max(byTx.get(rt) ?? 0, a))
      else noTx.push(a)
    }
    if (noTx.length > 1 || (noTx.length === 1 && byTx.size > 0)) { out.set(r.id, null); continue }
    const total = round2([...byTx.values(), ...noTx, ...external.values()].reduce((s, v) => s + v, 0))
    out.set(r.id, total > 0 && total <= r.paid + 0.005 ? total : null)
  }
  return out
}

function refundedAmount(status: PayStatus, paid: number, partial: number | null | undefined): number | null {
  if (status === 'paid') return 0
  if (status === 'refunded') return paid
  return partial ?? null
}

// ─── Φόρτωση ───────────────────────────────────────────────────────────────

/**
 * Πληρωμές Viva του email. Με `only` → μόνο η συγκεκριμένη εγγραφή (για το
 * αποδεικτικό: ανήκει στο email ΚΑΙ είναι πληρωμένη, αλλιώς κενό).
 */
export async function vivaPaymentsOf(email: string, only?: { kind: VivaKind; id: string }): Promise<VivaPayment[]> {
  const want = (k: VivaKind) => !only || only.kind === k
  const idf = only ? { id: only.id } : {}
  const take = only ? 1 : MAX_PER_KIND

  const [orders, bookings, consults, regs] = await Promise.all([
    want('order') ? prisma.order.findMany({
      where: { ...idf, user_email: email, payment_status: { in: PAID_STATES }, total_amount: { gt: 0 } },
      select: { id: true, items: true, total_amount: true, payment_status: true, payment_ref: true, created_at: true },
      orderBy: { created_at: 'desc' }, take,
    }) : [],
    want('booking') ? prisma.booking.findMany({
      where: { ...idf, customer_email: email, payment_status: { in: PAID_STATES }, total_price: { gt: 0 } },
      select: {
        id: true, total_price: true, payment_status: true, payment_ref: true, created_at: true,
        provider_name: true, service: { select: { title: true } },
      },
      orderBy: { created_at: 'desc' }, take,
    }) : [],
    want('telehealth') ? prisma.telehealthConsultation.findMany({
      where: { ...idf, client_email: email, payment_status: { in: PAID_STATES }, price: { gt: 0 } },
      select: { id: true, price: true, payment_status: true, payment_ref: true, created_at: true, provider_name: true, service_id: true },
      orderBy: { created_at: 'desc' }, take,
    }) : [],
    want('event') ? prisma.eventRegistration.findMany({
      where: {
        ...idf, user_email: email, status: { in: EVENT_PAID_STATES },
        viva_transaction_id: { not: null }, amount_paid: { gt: 0 },
      },
      select: {
        id: true, amount_paid: true, status: true, viva_transaction_id: true, created_at: true,
        event: { select: { title: true, organizer: true } },
      },
      orderBy: { created_at: 'desc' }, take,
    }) : [],
  ])

  // Τίτλος υπηρεσίας τηλεϊατρικής (service_id χωρίς σχέση στο σχήμα).
  const svcIds = [...new Set(consults.map(c => c.service_id).filter((x): x is string => !!x))]
  const svcTitle = new Map<string, string | null>()
  if (svcIds.length) {
    const svcs = await prisma.service.findMany({ where: { id: { in: svcIds } }, select: { id: true, title: true } })
    for (const s of svcs) svcTitle.set(s.id, s.title)
  }

  const [pOrders, pBookings, pConsults] = await Promise.all([
    partialRefunds('order', orders.filter(o => o.payment_status === 'partially_refunded')
      .map(o => ({ id: o.id, txn: o.payment_ref, paid: Number(o.total_amount) }))),
    partialRefunds('booking', bookings.filter(b => b.payment_status === 'partially_refunded')
      .map(b => ({ id: b.id, txn: b.payment_ref, paid: Number(b.total_price) }))),
    partialRefunds('telehealth', consults.filter(c => c.payment_status === 'partially_refunded')
      .map(c => ({ id: c.id, txn: c.payment_ref, paid: Number(c.price) }))),
  ])

  const out: VivaPayment[] = []
  for (const o of orders) {
    const amount = round2(Number(o.total_amount))
    const status = statusOf(o.payment_status)
    out.push({
      kind: 'order', id: o.id, ref: shortRef(o.id), description: orderDescription(o.items), beneficiary: null,
      amount, status, refunded_amount: refundedAmount(status, amount, pOrders.get(o.id)),
      date: o.created_at, transaction: o.payment_ref ?? null,
    })
  }
  for (const b of bookings) {
    const amount = round2(Number(b.total_price))
    const status = statusOf(b.payment_status)
    out.push({
      kind: 'booking', id: b.id, ref: shortRef(b.id),
      description: join(b.service?.title, b.provider_name), beneficiary: b.provider_name || null,
      amount, status, refunded_amount: refundedAmount(status, amount, pBookings.get(b.id)),
      date: b.created_at, transaction: b.payment_ref ?? null,
    })
  }
  for (const c of consults) {
    const amount = round2(Number(c.price))
    const status = statusOf(c.payment_status)
    out.push({
      kind: 'telehealth', id: c.id, ref: shortRef(c.id),
      description: join(c.service_id ? svcTitle.get(c.service_id) : null, c.provider_name), beneficiary: c.provider_name || null,
      amount, status, refunded_amount: refundedAmount(status, amount, pConsults.get(c.id)),
      date: c.created_at, transaction: c.payment_ref ?? null,
    })
  }
  for (const r of regs) {
    const amount = round2(Number(r.amount_paid))
    const status: PayStatus = r.status === 'refunded' ? 'refunded' : 'paid'
    out.push({
      kind: 'event', id: r.id, ref: shortRef(r.id),
      description: r.event?.title ? clip(r.event.title) : null, beneficiary: r.event?.organizer || null,
      amount, status, refunded_amount: refundedAmount(status, amount, null),
      date: r.created_at, transaction: r.viva_transaction_id ?? null,
    })
  }
  return out
}
