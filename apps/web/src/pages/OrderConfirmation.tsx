// NOTE: This is an EXAMPLE success handler.
// If you already have an OrderConfirmation page, just add the Viva verification
// logic shown in the useEffect below to your existing page.

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, XCircle, Loader2, Package } from 'lucide-react'
import { api } from '@/lib/api'

export default function OrderConfirmation() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [verifying, setVerifying] = useState(false)

  // Viva returns these query params on redirect: ?t=transactionId&s=orderCode&eventId=...
  const transactionId = params.get('t')
  const vivaSuccess = params.get('s')  // orderCode present = came back from Viva

  const { data: order, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}`).then(r => r.data),
    enabled: !!id,
  })

  // Verify Viva payment when redirected back
  useEffect(() => {
    const verify = async () => {
      if (transactionId && id) {
        setVerifying(true)
        try {
          await api.post('/orders/viva/verify', {
            order_id: id,
            transaction_id: transactionId,
          })
          await refetch()
        } catch {
          // verification will also happen via webhook
        } finally {
          setVerifying(false)
        }
      }
    }
    verify()
  }, [transactionId, id])

  const isPaid = order?.payment_status === 'paid'

  return (
    <div className="page-container py-16 max-w-lg mx-auto text-center">
      {verifying ? (
        <>
          <Loader2 size={56} className="mx-auto text-brand-900 animate-spin mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Επιβεβαίωση πληρωμής...</h1>
          <p className="text-gray-500">Παρακαλώ περιμένετε</p>
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
          <p className="text-gray-500 mb-6">Η παραγγελία δημιουργήθηκε αλλά η πληρωμή δεν έχει επιβεβαιωθεί ακόμα.</p>
          <button onClick={() => navigate('/orders')} className="btn-secondary w-full">Οι παραγγελίες μου</button>
        </>
      )}
    </div>
  )
}
