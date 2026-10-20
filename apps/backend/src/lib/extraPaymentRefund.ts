import prisma from './prisma.js'
import { refundVivaTransaction } from './viva.js'
import { auditSystem } from './audit.js'
import { withRefundLock } from './refundLock.js'

/**
 * Αυτόματη επιστροφή μιας ΕΠΙΠΛΕΟΝ πληρωμής Viva για παραγγελία καταστήματος
 * ή συνεδρία τηλεϊατρικής — ίδιο μοτίβο με τις κρατήσεις
 * (lib/bookingPayment.ts → refundExtraPayment).
 *
 * ΠΟΤΕ
 *   Η συναλλαγή έχει ήδη επαληθευτεί στη Viva από τον καλούντα (F,
 *   merchantTrns = id, ποσό), αλλά ΔΕΝ πληρώνει το αντικείμενο: αυτό είναι
 *   ήδη πληρωμένο με ΑΛΛΗ συναλλαγή (payment_ref), ή ακυρώθηκε/επιστράφηκε
 *   πριν φτάσει η πληρωμή. Χωρίς αυτό, η ατομική διεκδίκηση έβρισκε count 0
 *   και τα χρήματα της δεύτερης πληρωμής έμεναν στον λογαριασμό σιωπηλά.
 *
 * ΜΙΑ ΦΟΡΑ
 *   Audit ανά συναλλαγή (`<resource>_duplicate_refund`, metadata.transaction_id)
 *   και έλεγχος του audit υπό κλείδωμα βάσης (withRefundLock): επανάληψη του
 *   webhook, verify μαζί με webhook ή δεύτερο instance → 'already', καμία
 *   δεύτερη κλήση στη Viva. Αποτυχία της Viva → audit outcome 'failure' για
 *   τον διαχειριστή (επιστροφή με το χέρι).
 *
 * ΣΦΑΛΜΑ ΒΑΣΗΣ
 *   Αν δεν πάρουμε το κλείδωμα (σύνδεση), πετιέται σφάλμα χωρίς κλήση στη
 *   Viva, ώστε το webhook να απαντήσει 503 και η Viva να ξαναστείλει.
 */
export type ExtraPaymentResource = 'order' | 'telehealth'
export type ExtraRefundResult = 'refunded' | 'already' | 'failed'

const actionOf = (resource: ExtraPaymentResource) => `${resource}_duplicate_refund`

async function alreadyRefunded(resource: ExtraPaymentResource, id: string, transactionId: string): Promise<boolean> {
  const row = await prisma.auditLog.findFirst({
    where: {
      resource, resource_id: id, outcome: 'success', action: actionOf(resource),
      metadata: { path: ['transaction_id'], equals: transactionId },
    },
    select: { id: true },
  })
  return !!row
}

/** Πρώτο, φθηνό φίλτρο μέσα στη διεργασία· η πραγματική διεκδίκηση είναι το κλείδωμα. */
const refundsInFlight = new Set<string>()

export async function refundExtraVivaPayment(
  resource: ExtraPaymentResource, id: string, transactionId: string, why: string,
): Promise<ExtraRefundResult> {
  const key = `${resource}|${id}|${transactionId}`
  if (refundsInFlight.has(key)) return 'already'
  refundsInFlight.add(key)
  try {
    const r = await withRefundLock(key, () => refundLocked(resource, id, transactionId, why))
    return r.locked ? r.value : 'already'
  } catch (err: any) {
    console.error(`[viva] ${resource} ${id}: refund claim failed for ${transactionId} (${why}):`, err?.message)
    throw err
  } finally {
    refundsInFlight.delete(key)
  }
}

async function refundLocked(
  resource: ExtraPaymentResource, id: string, transactionId: string, why: string,
): Promise<ExtraRefundResult> {
  try {
    if (await alreadyRefunded(resource, id, transactionId)) return 'already'
    const r = await refundVivaTransaction(transactionId)
    console.error(`[viva] ${resource} ${id}: transaction ${transactionId} refunded (${why})`)
    await auditSystem({
      action: actionOf(resource), resource, resource_id: id,
      metadata: { transaction_id: transactionId, refund_tx: r.transactionId, reason: why },
    })
    return 'refunded'
  } catch (err: any) {
    console.error(`[viva] ${resource} ${id}: REFUND FAILED for ${transactionId} (${why}):`, err?.message)
    await auditSystem({
      action: actionOf(resource), resource, resource_id: id,
      outcome: 'failure', error_message: String(err?.message ?? err).slice(0, 500),
      metadata: { transaction_id: transactionId, reason: why },
    })
    return 'failed'
  }
}
