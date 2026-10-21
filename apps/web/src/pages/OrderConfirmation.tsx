import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, XCircle, Loader2, Package, Smartphone } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { useTranslation } from 'react-i18next'

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
function OrderConfirmationInner() {
  const { t } = useTranslation()
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
  // Αποτέλεσμα του verify (orders.ts): 'refunded' / 'refund_failed' = η
  // πληρωμή επιστράφηκε (ή η επιστροφή καθυστερεί) — όπως στο BookingConfirmation.
  const [result, setResult] = useState<string | null>(null)
  // 'out_of_stock': το απόθεμα εξαντλήθηκε τη στιγμή της πληρωμής (orders.ts).
  const [reason, setReason] = useState<string | null>(null)

  const { data: order, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}`).then(r => r.data),
    enabled: !!id,
  })

  const isPaid = order?.payment_status === 'paid'

  // Το verify απάντησε (οριστικά). Σε 503/δίκτυο (η Viva δεν απάντησε)
  // μένει false και ξαναδοκιμάζεται στο polling, όπως στο BookingConfirmation.
  const verified = useRef(false)
  const verifyInFlight = useRef(false)
  const runVerify = useCallback(async () => {
    if (verified.current || verifyInFlight.current || !transactionId || !id) return
    verifyInFlight.current = true
    try {
      const r = await api.post('/orders/viva/verify', { order_id: id, transaction_id: transactionId })
      verified.current = true
      setResult(r.data?.result ?? null)
      setReason(r.data?.reason ?? null)
    } catch (err: any) {
      const st = err?.response?.status ?? err?.statusCode
      // 4xx = οριστική απάντηση· όχι νέα απόπειρα (το webhook επιβεβαιώνει ανεξάρτητα).
      if (st && st >= 400 && st < 500) verified.current = true
    } finally {
      verifyInFlight.current = false
    }
  }, [transactionId, id])

  // Verify Viva payment when redirected back
  useEffect(() => {
    if (!cameFromViva || !id) return
    let cancelled = false
    const verify = async () => {
      try {
        await runVerify()
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
      if (!verified.current && transactionId) runVerify().finally(() => { refetch() })
      else refetch()
    }, 3000)
    return () => clearInterval(interval)
  }, [cameFromViva, isPaid, refetch, runVerify, transactionId])

  // Waiting covers both the explicit verify call and the window where the
  // webhook has not reported yet.
  const extraRefunded = result === 'refunded'
  const extraRefundFailed = result === 'refund_failed'
  const outOfStock = reason === 'out_of_stock' && (extraRefunded || extraRefundFailed)
  // Επιστροφή = οριστική απάντηση: η πληρωμή δεν θα καταχωρηθεί, δεν περιμένουμε.
  const waiting = verifying || (cameFromViva && !isPaid && !extraRefunded && !extraRefundFailed)

  // Αριθμός, σύνολο και κατάσταση — και στις δύο εκβάσεις, όπως στο κινητό
  // (πριν, σε εκκρεμή πληρωμή δεν φαινόταν ούτε το σύνολο ούτε η κατάσταση).
  const details = order && (
    <div className="card p-4 mb-6 text-left">
      <p className="text-sm text-gray-500">{t('orderConfirm.orderNumber')}</p>
      <p className="font-mono font-bold text-gray-900 dark:text-white">#{id?.slice(0, 8)}</p>
      <p className="text-sm text-gray-500 mt-2">{t('orderConfirm.total')}</p>
      <p className="font-bold text-gray-900 dark:text-white">€{Number(order.total_amount ?? 0).toFixed(2)}</p>
      <p className="text-sm text-gray-500 mt-2">{t('orderConfirm.status')}</p>
      <p className="font-medium text-gray-900 dark:text-white">{String(t(`orders.status.${order.status}`, order.status))}</p>
    </div>
  )
  const shopButton = (
    <button onClick={() => navigate('/marketplace')} className="btn-ghost w-full mt-2">{t('orderConfirm.continueShopping')}</button>
  )

  return (
    <div className="page-container py-16 max-w-lg mx-auto text-center">
      {waiting ? (
        <>
          <Loader2 size={56} className="mx-auto text-brand-900 animate-spin mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('pgOrderConfirm.verifying')}</h1>
          <p className="text-gray-500">{t('pgOrderConfirm.dontClose')}</p>
        </>
      ) : isPaid ? (
        <>
          <CheckCircle size={56} className="mx-auto text-green-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('pgOrderConfirm.paidTitle')}</h1>
          <p className="text-gray-500 mb-6">{t('pgOrderConfirm.paidDesc')}</p>
          {(extraRefunded || extraRefundFailed) && (
            <p className="text-sm text-amber-600 mb-6">
              {extraRefunded ? t('pgOrderConfirm.duplicateRefunded') : t('pgOrderConfirm.duplicateRefundDelayed')}
            </p>
          )}
          {details}
          <button onClick={() => navigate('/orders')} className="btn-primary w-full">
            <Package size={16} className="inline mr-2"/>{t('orderConfirm.myOrders')}
          </button>
          {shopButton}
        </>
      ) : (
        <>
          <XCircle size={56} className="mx-auto text-amber-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {extraRefunded || extraRefundFailed ? t('pgOrderConfirm.notChargedTitle') : t('pgOrderConfirm.pendingTitle')}
          </h1>
          <p className="text-gray-500 mb-6">
            {outOfStock ? (extraRefunded ? t('orderOos.refunded') : t('orderOos.refundDelayed'))
              : extraRefunded ? t('pgOrderConfirm.lateRefunded')
              : extraRefundFailed ? t('pgOrderConfirm.lateRefundDelayed')
              : t('pgOrderConfirm.pendingDesc', { id: id?.slice(0, 8) })}
          </p>
          {details}
          <button onClick={() => navigate('/orders')} className="btn-secondary w-full">{t('orderConfirm.myOrders')}</button>
          {shopButton}
        </>
      )}
    </div>
  )
}

/**
 * Χωρίς σύνδεση (π.χ. πλήρωσε από την εφαρμογή και η Viva άνοιξε τον browser):
 * σύνδεσμος πίσω στην εφαρμογή — ίδιο μοτίβο με κρατήσεις/εκδηλώσεις.
 */
export default function OrderConfirmation() {
  const { t } = useTranslation()
  const { id } = useParams()
  const [params] = useSearchParams()
  const { isAuthenticated } = useAuthStore()
  if (isAuthenticated) return <OrderConfirmationInner />
  const transactionId = params.get('t') || params.get('transactionId')
  const appLink = `globipet://order-confirmation?id=${encodeURIComponent(String(id ?? ''))}`
    + (transactionId ? `&transactionId=${encodeURIComponent(transactionId)}` : '')
  return (
    <div className="page-container py-16 max-w-md mx-auto text-center">
      <Smartphone size={56} className="mx-auto text-brand-900 dark:text-yellow-400 mb-4" />
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('pgEventConfirm.returnToAppTitle')}</h1>
      <p className="text-sm text-gray-500 mb-6">{t('pgOrderConfirm.returnToAppDesc')}</p>
      <a href={appLink} className="btn-primary w-full justify-center">{t('pgEventConfirm.openInApp')}</a>
      <Link to="/login" className="btn-secondary w-full justify-center mt-3">{t('auth.login')}</Link>
    </div>
  )
}
