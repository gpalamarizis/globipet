import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Lock, Sparkles } from 'lucide-react'
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
 *   4. Otherwise → upgrade card, with a link to /pricing.
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
  const { data: status, isLoading } = useQuery({
    queryKey: ['ai-subscription-status'],
    queryFn: () => api.get('/ai-subscriptions/my-status').then(r => r.data?.data),
    enabled: !isAdmin,
    staleTime: 60_000,
  })

  if (isAdmin) return <>{children}</>
  if (isLoading) return <LoadingScreen />

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
          {t('aiFeatureGuard.title', 'Απαιτείται συνδρομή AI')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {st === 'expired'
            ? t('aiFeatureGuard.expired', 'Η δωρεάν σου δοκιμή έληξε. Επίλεξε πλάνο για να συνεχίσεις.')
            : t('aiFeatureGuard.upgrade', 'Αυτή η λειτουργία είναι διαθέσιμη με συνδρομή AI. Ξεκίνησε δωρεάν δοκιμή 30 ημερών.')}
        </p>
        <a href="/pricing" className="btn-primary inline-flex items-center gap-2">
          <Sparkles size={16}/>
          {t('aiFeatureGuard.viewPlans', 'Δες τα πλάνα')}
        </a>
      </div>
    </div>
  )
}
