import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Loader2, Smartphone, Clock } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useTranslation } from 'react-i18next'

/**
 * Επιστροφή από τη Viva μετά την πληρωμή εκδήλωσης.
 *
 * Η Viva φέρνει τον χρήστη στο /events/:id/confirmation με ?t=<transactionId>.
 * Η σελίδα ζητά επαλήθευση (ο server ξαναρωτά τη Viva — δεν εμπιστεύεται το
 * URL) και μετά παρακολουθεί την εγγραφή, γιατί το webhook μπορεί να
 * επιβεβαιώσει πρώτο ή αργότερα.
 *
 * Χωρίς PrivateRoute: όποιος πλήρωσε από την εφαρμογή κινητού καταλήγει εδώ
 * στον browser του τηλεφώνου, συνήθως χωρίς σύνδεση στο web. Αντί για
 * ανακατεύθυνση στη σύνδεση, του δίνουμε σύνδεσμο πίσω στην εφαρμογή.
 */
export default function EventConfirmation() {
  const { t } = useTranslation()
  const { id } = useParams()
  const [params] = useSearchParams()
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const verified = useRef(false)
  const [timedOut, setTimedOut] = useState(false)

  const transactionId = params.get('t') || params.get('transactionId')

  const { data: event } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then(r => r.data),
    enabled: !!id,
  })

  const { data: reg, refetch, isLoading } = useQuery({
    queryKey: ['event-registration', id],
    queryFn: () => api.get(`/events/${id}/registration`).then(r => r.data?.data),
    enabled: !!id && isAuthenticated,
  })

  const status: string | undefined = reg?.registration?.status
  const regId: string | undefined = reg?.registration?.id
  // 'full' | 'cancelled' | null — γιατί επιστράφηκαν τα χρήματα.
  const refundReason: string | null | undefined = reg?.refund_reason

  // Μία επαλήθευση με το transaction id της Viva.
  useEffect(() => {
    if (verified.current || !regId || !transactionId || status !== 'pending_payment') return
    verified.current = true
    api.post(`/events/registrations/${regId}/viva/verify`, { transaction_id: transactionId })
      .catch(() => { /* το webhook επιβεβαιώνει ανεξάρτητα· το polling θα το δει */ })
      .finally(() => {
        refetch()
        queryClient.invalidateQueries({ queryKey: ['event', id] })
      })
  }, [regId, transactionId, status, refetch, queryClient, id])

  // Polling όσο εκκρεμεί (πληρωμή ή αυτόματη επιστροφή). Χωρίς transaction
  // id (επιστροφή από αποτυχία ή ακύρωση στη Viva) περιμένουμε λίγο μόνο
  // για το webhook.
  useEffect(() => {
    if (!isAuthenticated || (status !== 'pending_payment' && status !== 'refunding')) return
    const limit = transactionId ? 90 : 12
    let elapsed = 0
    const interval = setInterval(() => {
      elapsed += 3
      if (elapsed > limit) { clearInterval(interval); setTimedOut(true); return }
      refetch()
    }, 3000)
    return () => clearInterval(interval)
  }, [isAuthenticated, status, transactionId, refetch])

  const appLink = `globipet://event-confirmation?id=${encodeURIComponent(String(id ?? ''))}`
    + (transactionId ? `&transactionId=${encodeURIComponent(transactionId)}` : '')

  if (!isAuthenticated) return (
    <div className="page-container py-16 max-w-md mx-auto text-center">
      <Smartphone size={56} className="mx-auto text-brand-900 dark:text-yellow-400 mb-4" />
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('pgEventConfirm.returnToAppTitle')}</h1>
      <p className="text-sm text-gray-500 mb-6">{t('pgEventConfirm.returnToAppDesc')}</p>
      <a href={appLink} className="btn-primary w-full justify-center">{t('pgEventConfirm.openInApp')}</a>
      <Link to="/login" className="btn-secondary w-full justify-center mt-3">{t('events.loginToJoin')}</Link>
    </div>
  )

  const confirmed = status === 'registered'
  const refunded = status === 'refunded'
  const refundFailed = status === 'refund_failed' || status === 'refunding'
  const waiting = isLoading || ((status === 'pending_payment' || status === 'refunding') && !timedOut)
  // Πέρασε ο χρόνος αναμονής με πληρωμή που ξεκίνησε (υπάρχει transaction
  // id): εκκρεμότητα, όχι αποτυχία — το webhook μπορεί να έρθει αργότερα.
  const stillPending = status === 'pending_payment' && timedOut && !!transactionId

  return (
    <div className="page-container py-16 max-w-md mx-auto text-center">
      {confirmed ? (
        <>
          <CheckCircle size={56} className="mx-auto text-green-500 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('pgEventConfirm.confirmedTitle')}</h1>
          {event?.title && (
            <p className="text-sm text-gray-500 mb-6">{t('pgEventConfirm.confirmedDesc', { title: event.title })}</p>
          )}
        </>
      ) : waiting ? (
        <>
          <Loader2 size={56} className="mx-auto text-blue-500 mb-4 animate-spin" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('pgTeleConfirm.verifying')}</h1>
          <p className="text-sm text-gray-500 mb-6">{t('pgTeleConfirm.verifyingDesc')}</p>
        </>
      ) : stillPending ? (
        <>
          <Clock size={56} className="mx-auto text-amber-500 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('pgEventConfirm.pendingTitle')}</h1>
          <p className="text-sm text-gray-500 mb-6">{t('pgEventConfirm.pendingDesc')}</p>
        </>
      ) : refundFailed || (refunded && refundReason === 'full') ? (
        <>
          <XCircle size={56} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('pgEventConfirm.fullTitle')}</h1>
          <p className="text-sm text-gray-500 mb-6">
            {refunded ? t('pgEventConfirm.fullRefundedDesc') : t('pgEventConfirm.fullRefundDelayedDesc')}
          </p>
        </>
      ) : refunded ? (
        <>
          <CheckCircle size={56} className="mx-auto text-gray-400 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('pgEventConfirm.refundedTitle')}</h1>
          <p className="text-sm text-gray-500 mb-6">{t('pgEventConfirm.refundedDesc')}</p>
        </>
      ) : (
        <>
          <XCircle size={56} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('pgTeleConfirm.failedTitle')}</h1>
          <p className="text-sm text-gray-500 mb-6">{t('pgTeleConfirm.failedDesc')}</p>
        </>
      )}
      {!waiting && (
        <Link to={`/events/${id}`} className="btn-primary w-full justify-center">{t('pgEventConfirm.backToEvent')}</Link>
      )}
    </div>
  )
}
