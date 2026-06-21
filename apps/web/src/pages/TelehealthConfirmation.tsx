import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { CheckCircle, XCircle, Loader2, Video, Calendar, Clock } from 'lucide-react'
import { api } from '@/lib/api'
import JitsiCall from '@/components/features/telehealth/JitsiCall'

export default function TelehealthConfirmation() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [activeCall, setActiveCall] = useState(false)

  const transactionId = searchParams.get('t') || searchParams.get('transactionId') || searchParams.get('s')

  const { data: consultation, refetch } = useQuery({
    queryKey: ['telehealth', id],
    queryFn: () => api.get(`/telehealth/${id}`).then(r => r.data?.data),
    enabled: !!id,
  })

  const verify = useMutation({
    mutationFn: () => api.post(`/telehealth/${id}/viva/verify`, { transaction_id: transactionId }),
    onSuccess: () => refetch(),
  })

  useEffect(() => {
    if (id && consultation?.payment_status !== 'paid') {
      verify.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Poll every 3s while still unpaid (covers webhook-confirmed-before-redirect cases)
  useEffect(() => {
    if (consultation?.payment_status === 'paid') return
    const interval = setInterval(() => refetch(), 3000)
    return () => clearInterval(interval)
  }, [consultation?.payment_status, refetch])

  const isPaid = consultation?.payment_status === 'paid'
  const isPending = !consultation || consultation.payment_status === 'unpaid'

  if (activeCall && consultation?.meeting_url) {
    return <JitsiCall roomName={consultation.meeting_url} vetName={consultation.provider_name} onEnd={() => setActiveCall(false)} />
  }

  return (
    <div className="page-container py-16 max-w-md mx-auto text-center">
      {isPaid ? (
        <>
          <CheckCircle size={56} className="mx-auto text-green-500 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Η πληρωμή επιβεβαιώθηκε!</h1>
          <p className="text-sm text-gray-500 mb-6">Η συνεδρία σου με {consultation.provider_name} είναι έτοιμη.</p>
          <div className="card p-4 mb-6 text-left space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Calendar size={14} className="text-gray-400" /> {consultation.scheduled_date}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Clock size={14} className="text-gray-400" /> {consultation.scheduled_time}
            </div>
          </div>
          <button onClick={() => setActiveCall(true)} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            <Video size={16} /> Είσοδος στην κλήση
          </button>
          <button onClick={() => navigate('/telehealth')} className="btn-secondary w-full mt-3">Πίσω στην Τηλεϊατρική</button>
        </>
      ) : isPending ? (
        <>
          <Loader2 size={56} className="mx-auto text-blue-500 mb-4 animate-spin" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Επιβεβαίωση πληρωμής...</h1>
          <p className="text-sm text-gray-500">Περιμένουμε επιβεβαίωση από τη Viva Wallet. Μην κλείσεις αυτή τη σελίδα.</p>
        </>
      ) : (
        <>
          <XCircle size={56} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Η πληρωμή δεν ολοκληρώθηκε</h1>
          <p className="text-sm text-gray-500 mb-6">Δοκίμασε ξανά ή επικοινώνησε μαζί μας αν χρεώθηκες.</p>
          <button onClick={() => navigate('/telehealth')} className="btn-primary w-full">Πίσω στην Τηλεϊατρική</button>
        </>
      )}
    </div>
  )
}