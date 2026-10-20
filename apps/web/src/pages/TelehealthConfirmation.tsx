import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { CheckCircle, XCircle, Loader2, Video, Calendar, Clock, Smartphone } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import JitsiCall from '@/components/features/telehealth/JitsiCall'
import { useTranslation } from 'react-i18next'

export default function TelehealthConfirmation() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [activeCall, setActiveCall] = useState(false)
  const { isAuthenticated } = useAuthStore()

  // Η Viva επιστρέφει ?t=<transactionId>&s=<orderCode>. Το `s` είναι ο κωδικός
  // παραγγελίας, ΟΧΙ συναλλαγή — δεν χρησιμοποιείται για επαλήθευση.
  const transactionId = searchParams.get('t') || searchParams.get('transactionId')

  const { data: consultation, refetch } = useQuery({
    queryKey: ['telehealth', id],
    queryFn: () => api.get(`/telehealth/${id}`).then(r => r.data?.data),
    enabled: !!id && isAuthenticated,
  })

  // Το verify απάντησε (οριστικά). Σε 503/δίκτυο (η Viva δεν απάντησε)
  // μένει false και ξαναδοκιμάζεται στο polling, όπως στο BookingConfirmation.
  const verified = useRef(false)
  const verifying = useRef(false)
  const verify = useMutation({
    mutationFn: () => {
      verifying.current = true
      return api.post(`/telehealth/${id}/viva/verify`, { transaction_id: transactionId })
    },
    onSuccess: () => { verified.current = true; refetch() },
    onError: (err: any) => {
      const st = err?.response?.status ?? err?.statusCode
      // 4xx = οριστική απάντηση· όχι νέα απόπειρα (το webhook επιβεβαιώνει ανεξάρτητα).
      if (st && st >= 400 && st < 500) verified.current = true
    },
    onSettled: () => { verifying.current = false },
  })

  useEffect(() => {
    if (id && isAuthenticated && consultation?.payment_status !== 'paid') {
      verify.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isAuthenticated])

  // Poll every 3s while still unpaid (covers webhook-confirmed-before-redirect cases)
  useEffect(() => {
    if (!isAuthenticated || consultation?.payment_status === 'paid') return
    const interval = setInterval(() => {
      if (!verified.current && transactionId) { if (!verifying.current) { verifying.current = true; verify.mutate() } }
      else refetch()
    }, 3000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, consultation?.payment_status, refetch, transactionId])

  const isPaid = consultation?.payment_status === 'paid'
  const isPending = !consultation || consultation.payment_status === 'unpaid'

  // Όποιος πλήρωσε από την εφαρμογή κινητού καταλήγει εδώ στον browser του
  // τηλεφώνου, συνήθως χωρίς σύνδεση στο web: σύνδεσμος πίσω στην εφαρμογή
  // (όπως στο EventConfirmation).
  const appLink = `globipet://telehealth-confirmation?id=${encodeURIComponent(String(id ?? ''))}`
    + (transactionId ? `&transactionId=${encodeURIComponent(transactionId)}` : '')

  if (!isAuthenticated) return (
    <div className="page-container py-16 max-w-md mx-auto text-center">
      <Smartphone size={56} className="mx-auto text-brand-900 dark:text-yellow-400 mb-4" />
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('pgEventConfirm.returnToAppTitle')}</h1>
      <p className="text-sm text-gray-500 mb-6">{t('pgTeleConfirm.returnToAppDesc')}</p>
      <a href={appLink} className="btn-primary w-full justify-center">{t('pgEventConfirm.openInApp')}</a>
      <Link to="/login" className="btn-secondary w-full justify-center mt-3">{t('auth.login')}</Link>
    </div>
  )

  if (activeCall && consultation?.meeting_url) {
    return <JitsiCall consultationId={consultation.id} vetName={consultation.provider_name} onEnd={() => setActiveCall(false)} />
  }

  // scheduled_date (YYYY-MM-DD) ως τοπική ημερομηνία στη γλώσσα του χρήστη — όχι new Date('YYYY-MM-DD') (UTC).
  const dateLabel = (() => {
    const [y, m, d] = String(consultation?.scheduled_date ?? '').split('-').map(Number)
    if (!y || !m || !d) return consultation?.scheduled_date ?? '—'
    return new Date(y, m - 1, d).toLocaleDateString(i18n.language, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
  })()

  return (
    <div className="page-container py-16 max-w-md mx-auto text-center">
      {isPaid ? (
        <>
          <CheckCircle size={56} className="mx-auto text-green-500 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('pgTeleConfirm.paidTitle')}</h1>
          <p className="text-sm text-gray-500 mb-6">{t('pgTeleConfirm.paidDesc', { name: consultation.provider_name })}</p>
          <div className="card p-4 mb-6 text-left space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Calendar size={14} className="text-gray-400" /> {dateLabel}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Clock size={14} className="text-gray-400" /> {consultation.scheduled_time}
            </div>
          </div>
          <button onClick={() => setActiveCall(true)} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            <Video size={16} /> {t('pgTeleConfirm.joinCall')}
          </button>
          <button onClick={() => navigate('/telehealth')} className="btn-secondary w-full mt-3">{t('pgTeleConfirm.back')}</button>
        </>
      ) : isPending ? (
        <>
          <Loader2 size={56} className="mx-auto text-blue-500 mb-4 animate-spin" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('pgTeleConfirm.verifying')}</h1>
          <p className="text-sm text-gray-500">{t('pgTeleConfirm.verifyingDesc')}</p>
        </>
      ) : (
        <>
          <XCircle size={56} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('pgTeleConfirm.failedTitle')}</h1>
          <p className="text-sm text-gray-500 mb-6">{t('pgTeleConfirm.failedDesc')}</p>
          <button onClick={() => navigate('/telehealth')} className="btn-primary w-full">{t('pgTeleConfirm.back')}</button>
        </>
      )}
    </div>
  )
}