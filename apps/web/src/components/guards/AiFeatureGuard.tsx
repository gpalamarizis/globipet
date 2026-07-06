import { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Lock, Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
import LoadingScreen from '@/components/ui/LoadingScreen'

/**
 * Detects which AI feature is being accessed based on the current pathname.
 * Maps to the corresponding `includes_*` boolean on the user's plan.
 */
function featureFromPath(pathname: string): keyof AiFeatureFlags | null {
  if (pathname.startsWith('/ai-health'))      return 'includes_ai_health'
  if (pathname.startsWith('/ai-emotion'))     return 'includes_emotion_ai'
  if (pathname.startsWith('/ai-stool-urine')) return 'includes_ai_health' // stool/urine belongs to AI health
  if (pathname.startsWith('/wellness'))       return 'includes_wellness_tracker'
  return null
}

interface AiFeatureFlags {
  includes_ai_health: boolean
  includes_emotion_ai: boolean
  includes_wellness_tracker: boolean
  includes_telehealth: boolean
}

interface AiStatus {
  ai_subscription_status: 'none' | 'trial' | 'active' | 'expired'
  ai_trial_started_at: string | null
  ai_subscription_plan_id: string | null
  trial_days_left: number | null
  plan: (AiFeatureFlags & { id: string; name: string; name_el: string | null }) | null
}

interface Props {
  children: ReactNode
}

export default function AiFeatureGuard({ children }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery<AiStatus>({
    queryKey: ['ai-subscription-status'],
    queryFn: () => api.get('/ai-subscriptions/my-status').then(r => r.data?.data),
    staleTime: 60_000, // avoid hammering the backend
  })

  if (isLoading) return <LoadingScreen />
  if (!data) return <Navigate to="/trial" replace />

  // Not started → send to trial landing
  if (data.ai_subscription_status === 'none') {
    return <Navigate to="/trial" replace />
  }

  // Expired trial → show blocking modal, offer upgrade
  if (data.ai_subscription_status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="max-w-md w-full card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Lock size={28} className="text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {t('aiGuard.expiredTitle')}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {t('aiGuard.expiredDesc')}
          </p>
          <div className="flex flex-col gap-2">
            <button onClick={() => navigate('/pricing')} className="btn-primary w-full flex items-center justify-center gap-2">
              <Sparkles size={16} /> {t('aiGuard.seePlans')}
            </button>
            <button onClick={() => navigate('/')} className="btn-secondary w-full">
              {t('aiGuard.backHome')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Trial or active → check if the specific feature is included in the user's plan.
  // Note: during trial, the assigned plan gates access. If for some reason the user
  // is in trial but has no plan attached (legacy data), we allow access to be safe.
  const feature = featureFromPath(window.location.pathname)
  if (data.plan && feature) {
    const enabled = data.plan[feature]
    if (!enabled) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
          <div className="max-w-md w-full card p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Sparkles size={28} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {t('aiGuard.notInPlanTitle')}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {t('aiGuard.notInPlanDesc', { plan: data.plan.name_el || data.plan.name })}
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={() => navigate('/pricing')} className="btn-primary w-full flex items-center justify-center gap-2">
                <Sparkles size={16} /> {t('aiGuard.upgradePlan')}
              </button>
              <button onClick={() => navigate('/')} className="btn-secondary w-full">
                {t('aiGuard.backHome')}
              </button>
            </div>
          </div>
        </div>
      )
    }
  }

  return <>{children}</>
}
