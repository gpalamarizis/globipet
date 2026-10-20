import { useCallback, useEffect, useRef, useState } from 'react'
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
  // Το verify απάντησε. Σε 503/δίκτυο (η Viva δεν απάντησε) μένει false και
  // ξαναδοκιμάζεται στο polling.
  const verified = useRef(false)
  const verifying = useRef(false)
  const [timedOut, setTimedOut] = useState(false)

  const transactionId = params.get('t') || params.get('transactionId')

  const { data: event } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then(r => r.data),
    enabled: !!id,
  })

  const { data: reg, refetch, isLoading, error: regError } = useQuery({
    queryKey: ['event-registration', id],
    queryFn: () => api.get(`/events/${id}/registration`).then(r => r.data?.data),
    enabled: !!id && isAuthenticated,
    // 404 = η εκδήλωση δεν υπάρχει πια· οριστική απάντηση, χωρίς νέα απόπειρα.
    retry: (n, e: any) => (e?.response?.status ?? e?.statusCode) !== 404 && n < 1,
  })
  const gone = ((regError as any)?.response?.status ?? (regError as any)?.statusCode) === 404

  const status: string | undefined = reg?.registration?.status
  const regId: string | undefined = reg?.registration?.id
  // 'full' | 'cancelled' | 'event_cancelled' | null — γιατί επιστράφηκαν τα χρήματα.
  const refundReason: string | null | undefined = reg?.refund_reason

  // Επαλήθευση με το transaction id της Viva — μία φορά όταν απαντήσει.
  const runVerify = useCallback(() => {
    if (verified.current || verifying.current || !regId || !transactionId) return
    verifying.current = true
    api.post(`/events/registrations/${regId}/viva/verify`, { transaction_id: transactionId })
      .then(() => { verified.current = true })
      .catch((err: any) => {
        const st = err?.response?.status ?? err?.statusCode
        // 4xx = οριστική απάντηση· σε 503/δίκτυο νέα απόπειρα στο polling.
        if (st && st >= 400 && st < 500) verified.current = true
      })
      .finally(() => {
        verifying.current = false
        refetch()
        queryClient.invalidateQueries({ queryKey: ['event', id] })
      })
  }, [regId, transactionId, refetch, queryClient, id])

  useEffect(() => {
    if (verified.current || !regId || !transactionId || status !== 'pending_payment') return
    runVerify()
  }, [regId, transactionId, status, runVerify])

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
      if (!verified.current && transactionId && status === 'pending_payment') runVerify()
      else refetch()
    }, 3000)
    return () => clearInterval(interval)
  }, [isAuthenticated, status, transactionId, refetch, runVerify])

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
  // Πέρασε ο χρόνος αναμονής με πληρωμή που ξεκίνησε (υπάρχει transaction
  // id): εκκρεμότητα, όχι αποτυχία — το webhook μπορεί να έρθει αργότερα.
  const stillPending = status === 'pending_payment' && timedOut && !!transactionId
  // Ο διοργανωτής ακύρωσε την εκδήλωση (επιστροφή έγινε, τρέχει ή εκκρεμεί) —
  // ίδια λογική με την οθόνη event-confirmation του κινητού. Το
  // `event_cancelled`/`cancelled` (στήλη cancelled_at) καλύπτει και τις
  // καταστάσεις χωρίς refund_reason (`cancelled`, `refunding`, ή audit που
  // καθαρίστηκε στις 180 ημέρες).
  const refunding = status === 'refunding'
  const cancelledFlag = !!reg?.event_cancelled || event?.cancelled === true
  const eventCancelled = (refundReason === 'event_cancelled' && (refunded || status === 'refund_failed'))
    || (cancelledFlag && (status === 'cancelled' || refunding
      || ((refunded || status === 'refund_failed') && refundReason !== 'cancelled' && refundReason !== 'full')))
  // Αναμονή μόνο όταν η έκβαση είναι άγνωστη: εκκρεμής πληρωμή, ή `refunding`
  // χωρίς λόγο (ή «full») και χωρίς ακύρωση εκδήλωσης (αυτόματη επιστροφή, γέμισε).
  // Με γνωστό λόγο (ακύρωσες / ακύρωσε ο διοργανωτής) το κείμενο φαίνεται
  // αμέσως· το polling συνεχίζει μέχρι `refunded` / `refund_failed`.
  const waiting = isLoading || ((status === 'pending_payment' || (refunding && (!refundReason || refundReason === 'full') && !cancelledFlag)) && !timedOut)

  return (
    <div className="page-container py-16 max-w-md mx-auto text-center">
      {gone ? (
        <>
          <XCircle size={56} className="mx-auto text-gray-400 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('pgEventConfirm.goneTitle')}</h1>
          <p className="text-sm text-gray-500 mb-6">{t('pgEventConfirm.goneDesc')}</p>
        </>
      ) : confirmed ? (
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
      ) : eventCancelled ? (
        <>
          {refunded
            ? <CheckCircle size={56} className="mx-auto text-gray-400 mb-4" />
            : <XCircle size={56} className="mx-auto text-red-500 mb-4" />}
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {/* «…τα χρήματα επιστράφηκαν» μόνο αν ο λόγος ήταν η ακύρωση της εκδήλωσης. */}
            {refunded && refundReason === 'event_cancelled' ? t('events.cancelledByOrganizerRefunded') : t('events.cancelledByOrganizer')}
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            {refunded ? t('pgEventConfirm.refundedDesc')
              : refunding ? t('events.cancelledRefundInProgress')
              : status === 'cancelled' ? t('pgEventConfirm.eventCancelledDesc')
              : t('events.cancelledByOrganizerRefundDelayed')}
          </p>
        </>
      ) : refundFailed && refundReason === 'cancelled' ? (
        <>
          {/* Ο χρήστης ακύρωσε ο ίδιος — όχι «γέμισε». */}
          {refunding
            ? <Clock size={56} className="mx-auto text-amber-500 mb-4" />
            : <XCircle size={56} className="mx-auto text-red-500 mb-4" />}
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('events.cancelled')}</h1>
          <p className="text-sm text-gray-500 mb-6">
            {refunding ? t('events.cancelledRefundInProgress') : t('pgEventConfirm.cancelledRefundDelayedDesc')}
          </p>
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
          {/* Επιστροφή λόγω δικής σου ακύρωσης: «Η συμμετοχή ακυρώθηκε», όπως στο κινητό. */}
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{refundReason === 'cancelled' ? t('events.cancelled') : t('pgEventConfirm.refundedTitle')}</h1>
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
        gone
          ? <Link to="/events" className="btn-primary w-full justify-center">{t('nav.events')}</Link>
          : <Link to={`/events/${id}`} className="btn-primary w-full justify-center">{t('pgEventConfirm.backToEvent')}</Link>
      )}
    </div>
  )
}
