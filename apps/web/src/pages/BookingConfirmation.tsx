import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Loader2, Smartphone, Clock, Calendar } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useTranslation } from 'react-i18next'
import { dateLocale } from '@/lib/dates'

/**
 * Επιστροφή από τη Viva μετά την πληρωμή κράτησης υπηρεσίας.
 *
 * Η Viva φέρνει τον χρήστη στο /bookings/:id/confirmation με ?t=<transactionId>
 * (successUrl/failureUrl του /bookings/viva/checkout). Πριν, το checkout δεν
 * έδινε δική του διεύθυνση και ο χρήστης κατέληγε στη σελίδα παραγγελιών.
 *
 * Ίδιο μοτίβο με το EventConfirmation: μία επαλήθευση με το transaction id
 * (ο server ξαναρωτά τη Viva), μετά παρακολούθηση της κράτησης — το webhook
 * μπορεί να επιβεβαιώσει πρώτο ή αργότερα. Χωρίς PrivateRoute: όποιος
 * πλήρωσε από το κινητό καταλήγει εδώ χωρίς σύνδεση στο web, και παίρνει
 * σύνδεσμο πίσω στην εφαρμογή.
 */
export default function BookingConfirmation() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const [params] = useSearchParams()
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  // Το verify απάντησε (οριστικά). Σε 503/δίκτυο (η Viva δεν απάντησε)
  // μένει false και ξαναδοκιμάζεται στο polling.
  const verified = useRef(false)
  const verifying = useRef(false)
  const [timedOut, setTimedOut] = useState(false)
  // Αποτέλεσμα του verify: 'refunded' / 'refund_failed' = επιπλέον πληρωμή.
  const [result, setResult] = useState<string | null>(null)

  const transactionId = params.get('t') || params.get('transactionId')

  const { data: booking, refetch, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => api.get(`/bookings/${id}`).then(r => r.data?.data),
    enabled: !!id && isAuthenticated,
  })

  const paymentStatus: string | undefined = booking?.payment_status
  const unpaid = paymentStatus === 'unpaid'
  const cancelled = booking?.status === 'cancelled'

  // Επαλήθευση με το transaction id της Viva — μία φορά όταν απαντήσει. Σε
  // 503 (η Viva δεν απάντησε) ή σφάλμα δικτύου ξαναδοκιμάζεται στο polling.
  const runVerify = useCallback(() => {
    if (verified.current || verifying.current || !transactionId) return
    verifying.current = true
    api.post(`/bookings/${id}/viva/verify`, { transaction_id: transactionId })
      .then(r => { verified.current = true; setResult(r.data?.result ?? null) })
      .catch((err: any) => {
        const st = err?.response?.status ?? err?.statusCode
        // 4xx = οριστική απάντηση· όχι νέα απόπειρα (το webhook επιβεβαιώνει ανεξάρτητα).
        if (st && st >= 400 && st < 500) verified.current = true
        // 400 = μη έγκυρο transaction id στο URL: όπως το 'invalid', αποτέλεσμα αμέσως αντί για αναμονή 90".
        if (st === 400) setResult('invalid')
      })
      .finally(() => { verifying.current = false; refetch() })
  }, [transactionId, id, refetch])

  useEffect(() => {
    if (verified.current || !booking || !transactionId) return
    if (booking.payment_ref === transactionId) { verified.current = true; return }
    runVerify()
  }, [booking, transactionId, runVerify])

  // Η Viva απάντησε ότι η συναλλαγή δεν πληρώνει την κράτηση: αμέσως
  // «Η πληρωμή δεν ολοκληρώθηκε», χωρίς αναμονή 90".
  const invalid = result === 'invalid' && unpaid && !cancelled

  // Polling όσο είναι απλήρωτη. Χωρίς transaction id (επιστροφή από αποτυχία
  // ή ακύρωση στη Viva) περιμένουμε λίγο μόνο για το webhook.
  useEffect(() => {
    if (!isAuthenticated || !unpaid || cancelled || invalid) return
    const limit = transactionId ? 90 : 12
    let elapsed = 0
    const interval = setInterval(() => {
      elapsed += 3
      if (elapsed > limit) { clearInterval(interval); setTimedOut(true); return }
      if (!verified.current && transactionId) runVerify()
      else refetch()
    }, 3000)
    return () => clearInterval(interval)
  }, [isAuthenticated, unpaid, cancelled, invalid, transactionId, refetch, runVerify])

  // Μόλις κριθεί, ανανεώνονται οι λίστες κρατήσεων.
  useEffect(() => {
    if (paymentStatus && paymentStatus !== 'unpaid') {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['my-next-booking'] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    }
  }, [paymentStatus, queryClient])

  const appLink = `globipet://booking-confirmation?id=${encodeURIComponent(String(id ?? ''))}`
    + (transactionId ? `&transactionId=${encodeURIComponent(transactionId)}` : '')

  if (!isAuthenticated) return (
    <div className="page-container py-16 max-w-md mx-auto text-center">
      <Smartphone size={56} className="mx-auto text-brand-900 dark:text-yellow-400 mb-4" />
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('pgEventConfirm.returnToAppTitle')}</h1>
      <p className="text-sm text-gray-500 mb-6">{t('pgBookingConfirm.returnToAppDesc')}</p>
      <a href={appLink} className="btn-primary w-full justify-center">{t('pgEventConfirm.openInApp')}</a>
      <Link to="/login" className="btn-secondary w-full justify-center mt-3">{t('auth.login')}</Link>
    </div>
  )

  const paid = paymentStatus === 'paid'
  // booking_date (YYYY-MM-DD) ως τοπική ημερομηνία — όχι new Date('YYYY-MM-DD') (UTC).
  const dateLabel = (() => {
    const [y, m, d] = String(booking?.booking_date ?? '').split('-').map(Number)
    if (!y || !m || !d) return booking?.booking_date ?? '—'
    return new Date(y, m - 1, d).toLocaleDateString(dateLocale(i18n.language), { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
  })()
  const waiting = isLoading || (!!booking && unpaid && !cancelled && !invalid && !timedOut)
  // Πέρασε ο χρόνος αναμονής με πληρωμή που ξεκίνησε: εκκρεμότητα, όχι αποτυχία.
  const stillPending = !!booking && unpaid && !cancelled && !invalid && timedOut && !!transactionId
  const extraRefunded = result === 'refunded'
  const extraRefundFailed = result === 'refund_failed'

  return (
    <div className="page-container py-16 max-w-md mx-auto text-center">
      {paid ? (
        <>
          <CheckCircle size={56} className="mx-auto text-green-500 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('pgBookingConfirm.paidTitle')}</h1>
          <p className="text-sm text-gray-500 mb-6">
            {t('pgBookingConfirm.paidDesc', { name: booking?.provider_name ?? '' })}
          </p>
          {(extraRefunded || extraRefundFailed) && (
            <p className="text-sm text-amber-600 mb-6">
              {extraRefunded ? t('pgBookingConfirm.duplicateRefunded') : t('pgBookingConfirm.duplicateRefundDelayed')}
            </p>
          )}
          <div className="card p-4 mb-6 text-left space-y-2">
            {booking?.service?.title && (
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{booking.service.title}</p>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Calendar size={14} className="text-gray-400" /> {dateLabel}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Clock size={14} className="text-gray-400" /> {booking?.booking_time}
            </div>
            <div className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
              <span>{t('cart.total')}</span>
              <span className="font-semibold">€{Number(booking?.total_price ?? 0).toFixed(2)}</span>
            </div>
          </div>
        </>
      ) : cancelled ? (
        <>
          <XCircle size={56} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('pgBookingConfirm.cancelledTitle')}</h1>
          <p className="text-sm text-gray-500 mb-6">{t('pgBookingConfirm.cancelledDesc')}</p>
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
          <p className="text-sm text-gray-500 mb-6">{t('pgBookingConfirm.pendingDesc')}</p>
        </>
      ) : (
        <>
          <XCircle size={56} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('pgTeleConfirm.failedTitle')}</h1>
          <p className="text-sm text-gray-500 mb-6">{t('pgBookingConfirm.failedDesc')}</p>
        </>
      )}
      {!waiting && (
        <Link to="/bookings" className="btn-primary w-full justify-center">
          {invalid ? t('pgBookingConfirm.retry') : t('pgBookingConfirm.backToBookings')}
        </Link>
      )}
    </div>
  )
}
