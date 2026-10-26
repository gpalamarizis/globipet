import prisma from './prisma.js'
import { refundVivaTransaction, isRefundOutcomeUnknown, getVivaTransaction } from './viva.js'
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
 * ΑΓΝΩΣΤΗ ΕΚΒΑΣΗ (timeout / δίκτυο / Viva 5xx — η επιστροφή ΙΣΩΣ έγινε)
 *   Audit 'failure' με `unknown_outcome: true` («Αποτυχημένες επιστροφές»
 *   του διαχειριστή). Μια τέτοια καταγραφή για την ίδια συναλλαγή σημαίνει
 *   «ΜΗΝ ξαναεπιστρέψεις»: κάθε επόμενη κλήση (επανάληψη webhook, νέο
 *   /verify του πελάτη) παίρνει 'unknown' χωρίς κλήση στη Viva. Πριν
 *   καταγραφόταν ως απλή αποτυχία και το επόμενο /verify έκανε νέα πλήρη
 *   επιστροφή. Τη λύνει ο διαχειριστής (έλεγχος στη Viva, «Σήμανση ως λυμένο»).
 *
 * ΑΠΟΤΕΛΕΣΜΑ
 *   'refunded' — έγινε τώρα · 'already' — υπάρχει καταγραφή ΕΠΙΤΥΧΙΑΣ ·
 *   'busy' — η ίδια επιστροφή τρέχει αυτή τη στιγμή αλλού (κανένα συμπέρασμα:
 *   ο καλών δεν γράφει «επιστράφηκε») · 'unknown' — άγνωστη έκβαση (τώρα ή
 *   παλαιότερα) · 'failed' — οριστική άρνηση.
 *
 * ΣΦΑΛΜΑ ΒΑΣΗΣ
 *   Αν δεν πάρουμε το κλείδωμα (σύνδεση), πετιέται σφάλμα χωρίς κλήση στη
 *   Viva, ώστε το webhook να απαντήσει 503 και η Viva να ξαναστείλει.
 */
export type ExtraPaymentResource = 'order' | 'telehealth'
export type ExtraRefundResult = 'refunded' | 'already' | 'busy' | 'unknown' | 'failed'

const actionOf = (resource: ExtraPaymentResource) => `${resource}_duplicate_refund`

/**
 * Προηγούμενη απόπειρα για αυτή τη συναλλαγή: 'success' (επιστράφηκε),
 * 'unknown' (άγνωστη έκβαση — ίσως επιστράφηκε) ή null. Οριστική αποτυχία
 * δεν μετρά (καμία επιστροφή δεν έγινε — νέα απόπειρα επιτρέπεται).
 */
async function priorAttempt(resource: ExtraPaymentResource, id: string, transactionId: string): Promise<'success' | 'unknown' | null> {
  const rows = await prisma.auditLog.findMany({
    where: {
      resource, resource_id: id, action: actionOf(resource), outcome: { in: ['success', 'failure'] },
      metadata: { path: ['transaction_id'], equals: transactionId },
    },
    select: { outcome: true, metadata: true },
    take: 50,
  })
  if (rows.some(r => r.outcome === 'success')) return 'success'
  if (rows.some(r => r.outcome === 'failure' && (r.metadata as any)?.unknown_outcome === true)) return 'unknown'
  return null
}

/** Η Viva λέει ότι η συναλλαγή είναι (ολόκληρη) επιστραμμένη — statusId 'R'. Σφάλμα → false. */
async function vivaSaysRefunded(transactionId: string): Promise<boolean> {
  try {
    return String((await getVivaTransaction(transactionId))?.statusId ?? '') === 'R'
  } catch {
    return false
  }
}

/** Υπάρχει καταγραφή ΕΠΙΤΥΧΗΜΕΝΗΣ επιστροφής αυτής της συναλλαγής; */
export async function extraPaymentRefunded(resource: ExtraPaymentResource, id: string, transactionId: string): Promise<boolean> {
  return (await priorAttempt(resource, id, transactionId)) === 'success'
}

/** Πρώτο, φθηνό φίλτρο μέσα στη διεργασία· η πραγματική διεκδίκηση είναι το κλείδωμα. */
const refundsInFlight = new Set<string>()

export async function refundExtraVivaPayment(
  resource: ExtraPaymentResource, id: string, transactionId: string, why: string,
): Promise<ExtraRefundResult> {
  const key = `${resource}|${id}|${transactionId}`
  if (refundsInFlight.has(key)) return 'busy'
  refundsInFlight.add(key)
  try {
    const r = await withRefundLock(key, () => refundLocked(resource, id, transactionId, why))
    return r.locked ? r.value : 'busy'
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
    const prior = await priorAttempt(resource, id, transactionId)
    if (prior === 'success') return 'already'
    if (prior === 'unknown') {
      // Ποτέ ξανά στα τυφλά. Η Viva 'R' (ολόκληρη επιστραμμένη) επιβεβαιώνει
      // ότι η επιστροφή έγινε → καταγραφή επιτυχίας, 'already'.
      if (await vivaSaysRefunded(transactionId)) {
        await auditSystem({
          action: actionOf(resource), resource, resource_id: id,
          metadata: { transaction_id: transactionId, refund_tx: null, reason: why, source: 'viva_status_R' },
        })
        return 'already'
      }
      console.error(`[viva] ${resource} ${id}: earlier refund of ${transactionId} has unknown outcome — not refunded again (admin)`)
      return 'unknown'
    }
    const r = await refundVivaTransaction(transactionId)
    console.error(`[viva] ${resource} ${id}: transaction ${transactionId} refunded (${why})`)
    await auditSystem({
      action: actionOf(resource), resource, resource_id: id,
      metadata: { transaction_id: transactionId, refund_tx: r.transactionId, reason: why },
    })
    return 'refunded'
  } catch (err: any) {
    const unknown = isRefundOutcomeUnknown(err)
    console.error(`[viva] ${resource} ${id}: REFUND ${unknown ? 'OUTCOME UNKNOWN' : 'FAILED'} for ${transactionId} (${why}):`, err?.message)
    await auditSystem({
      action: actionOf(resource), resource, resource_id: id,
      outcome: 'failure', error_message: String(err?.message ?? err).slice(0, 500),
      metadata: { transaction_id: transactionId, reason: why, ...(unknown ? { unknown_outcome: true } : {}) },
    })
    return unknown ? 'unknown' : 'failed'
  }
}
