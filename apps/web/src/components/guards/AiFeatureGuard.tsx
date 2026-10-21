import { ReactNode } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Lock, Sparkles, AlertTriangle, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import LoadingScreen from '@/components/ui/LoadingScreen'

/**
 * Gate for AI features (Health Check, Emotion Detector, Wellness Tracker,
 * Stool/Urine analysis, etc).
 *
 * Access rules — evaluated in order:
 *   1. Admins pass through unconditionally. They need full access to test
 *      and support customers without being asked to buy their own product.
 *   2. Active AI subscription → allowed.
 *   3. Trial period still active → allowed.
 *   4. Status request failed (network, 5xx) → error card with a retry
 *      button. We do not know the user's plan, so offering to sell them
 *      one — possibly to someone who already pays — would be wrong.
 *   5. Otherwise → upgrade card, with a link to /pricing.
 *
 * Not logged in is handled one level up by <PrivateRoute>, so by the time
 * this component renders the user is always authenticated.
 */
export default function AiFeatureGuard({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'admin'

  // Admins bypass the subscription check entirely — no query, no waiting.
  // This also avoids a wasted request on every admin page load.
  const { data: status, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['ai-subscription-status'],
    queryFn: () => api.get('/ai-subscriptions/my-status').then(r => r.data?.data),
    enabled: !isAdmin,
    staleTime: 60_000,
  })

  if (isAdmin) return <>{children}</>
  if (isLoading) return <LoadingScreen />

  // Only when we have no answer at all: a failed background refetch keeps
  // the last known status, which is still the right thing to act on.
  if (isError && !status) {
    return (
      <div className="page-container py-16">
        <div className="max-w-lg mx-auto text-center bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={26} className="text-red-500"/>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {t('aiFeatureGuard.errorTitle')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {t('aiFeatureGuard.errorDesc')}
          </p>
          <button type="button" onClick={() => refetch()} disabled={isFetching}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-60">
            <RotateCcw size={16} className={isFetching ? 'animate-spin' : ''}/>
            {t('aiFeatureGuard.retry')}
          </button>
        </div>
      </div>
    )
  }

  const st = status?.ai_subscription_status
  const hasAccess = st === 'active' || st === 'trial'
  if (hasAccess) return <>{children}</>

  // No access — show an upgrade card rather than silently redirecting,
  // so the user understands what happened and where to go next.
  return (
    <div className="page-container py-16">
      <div className="max-w-lg mx-auto text-center bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mx-auto mb-4">
          <Lock size={26} className="text-brand-900 dark:text-yellow-400"/>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {st === 'payment_failed' ? t('aiGate.paymentFailedTitle')
            : st === 'cancelled' ? t('aiSub.cancelledTitle')
            : t('aiFeatureGuard.title')}
        </h2>
        {/* Δωρεάν δοκιμή μόνο από 'none' (server start-trial)· ληγμένη,
            ακυρωμένη ή με αποτυχημένη πληρωμή → επιλογή πλάνου (όπως AiGate κινητού). */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {st === 'expired' ? t('aiFeatureGuard.expired')
            : st === 'payment_failed' ? t('aiSub.paymentFailedHint')
            : st && st !== 'none' ? t('aiGate.cancelledText')
            : t('aiFeatureGuard.upgrade')}
        </p>
        <Link to="/pricing" className="btn-primary inline-flex items-center gap-2">
          <Sparkles size={16}/>
          {t('aiFeatureGuard.viewPlans')}
        </Link>
      </div>
    </div>
  )
}
