import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, XCircle, Loader2, Package } from 'lucide-react'
import { api } from '@/lib/api'

/**
 * Where the customer lands after paying.
 *
 * Viva redirects to /orders/:id/confirmation with ?t=<transactionId> and
 * ?s=<orderCode>. Two things were wrong here:
 *
 *   The page started with verifying=false and no order loaded, so `isPaid`
 *   was false on the first render and it showed a red cross with "payment
 *   pending" — to someone who had just been charged successfully.
 *
 *   And there was no polling. Viva's webhook sometimes confirms after the
 *   browser redirect; when the single verify call raced it, the page stayed
 *   on "pending" until the customer reloaded by hand.
 */
export default function OrderConfirmation() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const transactionId = params.get('t')
  // An orderCode in the URL means we arrived from the Viva checkout rather
  // than from the orders list.
  const cameFromViva = !!(transactionId || params.get('s'))

  // Start in the verifying state when we came back from a payment, so the
  // first thing the customer sees is a spinner rather than a failure.
  const [verifying, setVerifying] = useState(cameFromViva)

  const { data: order, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}`).then(r => r.data),
    enabled: !!id,
  })

  const isPaid = order?.payment_status === 'paid'

  // Verify Viva payment when redirected back
  useEffect(() => {
    if (!cameFromViva || !id) return
    let cancelled = false
    const verify = async () => {
      try {
        if (transactionId) {
          await api.post('/orders/viva/verify', { order_id: id, transaction_id: transactionId })
        }
        await refetch()
      } catch {
        // The webhook confirms independently; the poll below will catch it.
      } finally {
        if (!cancelled) setVerifying(false)
      }
    }
    verify()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId, id])

  // Poll while the payment is still unconfirmed, for the case where the
  // webhook lands after the redirect. Gives up after a minute so the page
  // does not sit there requesting forever.
  useEffect(() => {
    if (!cameFromViva || isPaid) return
    let elapsed = 0
    const interval = setInterval(() => {
      elapsed += 3
      if (elapsed > 60) { clearInterval(interval); return }
      refetch()
    }, 3000)
    return () => clearInterval(interval)
  }, [cameFromViva, isPaid, refetch])

  // Waiting covers both the explicit verify call and the window where the
  // webhook has not reported yet.
  const waiting = verifying || (cameFromViva && !isPaid)

  return (
    <div className="page-container py-16 max-w-lg mx-auto text-center">
      {waiting ? (
        <>
          <Loader2 size={56} className="mx-auto text-brand-900 animate-spin mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Επιβεβαίωση πληρωμής...</h1>
          <p className="text-gray-500">Μην κλείσεις αυτή τη σελίδα.</p>
        </>
      ) : isPaid ? (
        <>
          <CheckCircle size={56} className="mx-auto text-green-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Η πληρωμή ολοκληρώθηκε! 🎉</h1>
          <p className="text-gray-500 mb-6">Η παραγγελία σας επιβεβαιώθηκε και θα την επεξεργαστούμε σύντομα.</p>
          <div className="card p-4 mb-6 text-left">
            <p className="text-sm text-gray-500">Αριθμός παραγγελίας</p>
            <p className="font-mono font-bold text-gray-900 dark:text-white">#{id?.slice(0, 8)}</p>
            <p className="text-sm text-gray-500 mt-2">Σύνολο</p>
            <p className="font-bold text-gray-900 dark:text-white">€{order?.total_amount?.toFixed(2)}</p>
          </div>
          <button onClick={() => navigate('/orders')} className="btn-primary w-full">
            <Package size={16} className="inline mr-2"/>Οι παραγγελίες μου
          </button>
        </>
      ) : (
        <>
          <XCircle size={56} className="mx-auto text-amber-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Εκκρεμεί πληρωμή</h1>
          <p className="text-gray-500 mb-6">
            Η παραγγελία δημιουργήθηκε αλλά η πληρωμή δεν έχει επιβεβαιωθεί ακόμα.
            Αν χρεώθηκες, επικοινώνησε μαζί μας με τον αριθμό #{id?.slice(0, 8)}.
          </p>
          <button onClick={() => navigate('/orders')} className="btn-secondary w-full">Οι παραγγελίες μου</button>
        </>
      )}
    </div>
  )
}
