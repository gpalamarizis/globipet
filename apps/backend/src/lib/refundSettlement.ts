import type { Prisma } from '@prisma/client'
import { revokeForRefundTx } from './loyalty.js'

/**
 * Τελική εγγραφή μιας επιστροφής που ΕΓΙΝΕ (ή κρίθηκε ότι έγινε) σε
 * παραγγελία / κράτηση / συνεδρία τηλεϊατρικής — ΕΝΑ σημείο για όλες τις ροές:
 *   · POST /admin/refund (routes/admin.ts)
 *   · «Σήμανση ως λυμένο» επιστροφής admin (routes/admin-refunds.ts)
 *   · εργασία κολλημένων επιστροφών admin (lib/cancellation.ts)
 *   · εξωτερική επιστροφή από τον πίνακα της Viva (lib/externalRefund.ts)
 *
 * Πριν, μόνο το /admin/refund και η εξωτερική επιστροφή μείωναν αμοιβή
 * παρόχου/προμήθεια· η «Σήμανση ως λυμένο» και η εργασία των κολλημένων
 * έγραφαν μόνο payment_status (ο πάροχος έμενε να εισπράξει ολόκληρη την
 * αμοιβή μιας επιστραμμένης πληρωμής) και δεν ακύρωναν τίποτα.
 *
 * ΤΙ ΚΑΝΕΙ — μέσα στη συναλλαγή βάσης του καλούντος (`tx`):
 *   1. Μετάβαση payment_status `fromStatus` → `toStatus` ΥΠΟ ΣΥΝΘΗΚΗ (ίδια
 *      κατάσταση, ίδια πληρωμή — updateMany). Αν δεν περάσει (count ≠ 1):
 *      τίποτα άλλο, `applied: false`.
 *   2. Στην ΙΔΙΑ εγγραφή: αμοιβή παρόχου και προμήθεια × keep, όπου
 *      keep = (ό,τι έμενε πληρωμένο − ποσό επιστροφής) / ό,τι έμενε πληρωμένο
 *      (πλήρης επιστροφή → 0).
 *   3. ΠΛΗΡΗΣ επιστροφή ακυρώνει ό,τι δεν έχει ολοκληρωθεί, υπό συνθήκη
 *      (ίδια κατάσταση ζωής — μια ταυτόχρονη «Ολοκληρώθηκε» δεν
 *      αντικαθίσταται): παραγγελία pending/confirmed/processing → cancelled·
 *      κράτηση/συνεδρία όχι completed/no_show/cancelled → cancelled.
 *   4. Παραγγελία, ΠΛΗΡΗΣ επιστροφή, που ακυρώθηκε ΑΠΟ ΑΥΤΗ τη μετάβαση
 *      (βήμα 3): επαναφορά του αποθέματος που δεσμεύτηκε για ΑΥΤΗ την πληρωμή
 *      (καταγραφή order_stock_reserved του orders.ts claimOrderPayment).
 *      Ήδη ακυρωμένη (από άλλη ροή, που χειρίστηκε ή όχι το απόθεμα) ή
 *      απεσταλμένη / παραδομένη: καμία επαναφορά — αλλιώς διπλή επαναφορά.
 *
 * ΜΙΑ ΦΟΡΑ: όλα εξαρτώνται από τη μετάβαση του βήματος 1, που περνά μόνο μία
 * φορά (μετά η εγγραφή δεν είναι πια σε `fromStatus`). Καμία κίνηση χρημάτων.
 */
export type SettleResource = 'order' | 'booking' | 'telehealth'

/** Ίδιο με routes/orders.ts ORDER_STOCK_RESERVED_ACTION (χωρίς κυκλική εισαγωγή). */
const ORDER_STOCK_RESERVED = 'order_stock_reserved'
/** Πλήρης επιστροφή ακυρώνει μόνο ό,τι δεν έχει ολοκληρωθεί. */
export const ORDER_CANCELLABLE = ['pending', 'confirmed', 'processing']
export const SESSION_FINAL = ['completed', 'no_show', 'cancelled']

const round2 = (n: number) => Math.round(n * 100) / 100

export interface RefundSettlement {
  type: SettleResource
  id: string
  /** payment_ref της εγγραφής (η πληρωμή που επιστράφηκε) — μέρος της συνθήκης. */
  paymentRef: string
  /** payment_status που πρέπει να έχει τώρα η εγγραφή (refunding, paid, partially_refunded). */
  fromStatus: string
  toStatus: 'refunded' | 'partially_refunded'
  /** Ό,τι έμενε πληρωμένο ΠΡΙΝ από αυτή την επιστροφή. */
  remainingBefore: number
  /** Το ποσό αυτής της επιστροφής. */
  amount: number
}

export interface SettleResult {
  applied: boolean
  cancelled: boolean
  stockRestored: boolean
  /** Κατάσταση ζωής (status) πριν τη μετάβαση. */
  previousLifeStatus: string | null
  keep: number
}

/** Ποσοστό της αμοιβής/προμήθειας που μένει μετά την επιστροφή (0…1). */
export function refundKeepRatio(remainingBefore: number, amount: number, full: boolean): number {
  if (full) return 0
  if (!(remainingBefore > 0.005) || !Number.isFinite(amount)) return 0
  return Math.min(1, Math.max(0, (remainingBefore - Math.max(0, amount)) / remainingBefore))
}

const MODEL: Record<SettleResource, 'order' | 'booking' | 'telehealthConsultation'> = {
  order: 'order', booking: 'booking', telehealth: 'telehealthConsultation',
}

export async function settleRefundTx(tx: Prisma.TransactionClient, s: RefundSettlement): Promise<SettleResult> {
  const model = (tx as any)[MODEL[s.type]]
  const none: SettleResult = { applied: false, cancelled: false, stockRestored: false, previousLifeStatus: null, keep: 1 }
  const rec = await model.findUnique({
    where: { id: s.id },
    select: { status: true, payment_status: true, payment_ref: true, provider_payout_amount: true, platform_fee_amount: true },
  })
  if (!rec || rec.payment_status !== s.fromStatus || rec.payment_ref !== s.paymentRef) return none

  const full = s.toStatus === 'refunded'
  const keep = refundKeepRatio(s.remainingBefore, s.amount, full)
  const data: any = { payment_status: s.toStatus }
  if (rec.provider_payout_amount != null) data.provider_payout_amount = round2(Number(rec.provider_payout_amount) * keep)
  if (rec.platform_fee_amount != null) data.platform_fee_amount = round2(Number(rec.platform_fee_amount) * keep)
  const moved = await model.updateMany({
    where: { id: s.id, payment_status: s.fromStatus, payment_ref: s.paymentRef },
    data,
  })
  if (moved.count !== 1) return none

  let cancelled = false
  if (full) {
    const cancellable = s.type === 'order' ? ORDER_CANCELLABLE.includes(rec.status) : !SESSION_FINAL.includes(rec.status)
    if (cancellable) {
      const c = await model.updateMany({
        where: { id: s.id, status: rec.status, payment_ref: s.paymentRef },
        data: { status: 'cancelled' },
      })
      cancelled = c.count === 1
    }
  }

  let stockRestored = false
  if (full && s.type === 'order' && cancelled === true) {
    const reservedRow = await tx.auditLog.findFirst({
      where: {
        action: ORDER_STOCK_RESERVED, resource: 'order', resource_id: s.id,
        metadata: { path: ['transaction_id'], equals: s.paymentRef },
      },
      select: { metadata: true },
    })
    const items = ((reservedRow?.metadata ?? {}) as any).items ?? {}
    for (const [pid, q] of Object.entries(items)) {
      const qty = Math.floor(Number(q))
      if (!pid || !Number.isFinite(qty) || qty <= 0) continue
      await tx.product.updateMany({ where: { id: pid }, data: { stock: { increment: qty } } })
      stockRestored = true
    }
  }
  // Πόντοι επιβράβευσης αυτής της πληρωμής, αναλογικά (πλήρης → όλοι): στην ΙΔΙΑ
  // συναλλαγή, μία φορά (εξαρτάται από τη μετάβαση του βήματος 1)· σε SAVEPOINT,
  // ώστε σφάλμα εκεί να μην ακυρώνει την επιστροφή (lib/loyalty revokeForRefundTx).
  await revokeForRefundTx(tx, {
    source: s.type, ref: `${s.id}:${s.paymentRef}`, amount: s.amount, full,
    refundRef: `settle:${s.type}:${s.id}:${s.paymentRef}:${s.fromStatus}>${s.toStatus}:${round2(s.remainingBefore)}:${round2(s.amount)}`,
  })
  return { applied: true, cancelled, stockRestored, previousLifeStatus: rec.status, keep }
}
