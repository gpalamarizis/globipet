import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Sparkles, Heart, Activity, Check, Clock, ArrowRight } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import LoadingScreen from '@/components/ui/LoadingScreen'

interface AiPlan {
  id: string
  name: string
  name_el: string | null
  description: string | null
  tier: string
  price_monthly: number
  price_annual: number | null
  includes_ai_health: boolean
  includes_emotion_ai: boolean
  includes_wellness_tracker: boolean
  includes_telehealth: boolean
  is_featured: boolean
}

interface AiStatus {
  ai_subscription_status: 'none' | 'trial' | 'active' | 'expired'
  trial_days_left: number | null
  plan: { id: string; name: string; name_el: string | null } | null
}

const FEATURE_META = [
  { key: 'includes_ai_health',        icon: Heart,     tKey: 'trial.features.aiHealth' },
  { key: 'includes_emotion_ai',       icon: Sparkles,  tKey: 'trial.features.emotion' },
  { key: 'includes_wellness_tracker', icon: Activity,  tKey: 'trial.features.wellness' },
] as const

export default function TrialPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)

  const { data: plans = [], isLoading: plansLoading } = useQuery<AiPlan[]>({
    queryKey: ['ai-plans-public'],
    queryFn: () => api.get('/ai-subscriptions/plans').then(r => r.data?.data ?? []),
  })

  const { data: status, isLoading: statusLoading } = useQuery<AiStatus>({
    queryKey: ['ai-subscription-status'],
    queryFn: () => api.get('/ai-subscriptions/my-status').then(r => r.data?.data),
    enabled: isAuthenticated,
  })

  const startTrial = useMutation({
    mutationFn: (planId: string) => api.post('/ai-subscriptions/start-trial', { plan_id: planId }),
    onSuccess: () => {
      toast.success(t('trial.started'))
      queryClient.invalidateQueries({ queryKey: ['ai-subscription-status'] })
      navigate('/')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || t('trial.errorStart')),
  })

  const handleStart = (planId: string) => {
    if (!isAuthenticated) {
      // Redirect to register, come back to /trial with autostart hint
      navigate(`/register?redirect=/trial&plan=${planId}`)
      return
    }
    setSelectedPlanId(planId)
    startTrial.mutate(planId)
  }

  if (plansLoading || (isAuthenticated && statusLoading)) return <LoadingScreen />

  // Special case: already in trial, active or expired — show banner instead of CTAs
  const alreadySubscribed = isAuthenticated && status && status.ai_subscription_status !== 'none'

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-8 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 bg-brand-900 text-white text-xs font-bold px-4 py-1.5 rounded-full mb-4">
            <Sparkles size={14} /> {t('trial.hero.badge')}
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-black text-gray-900 dark:text-white mb-4">
            {t('trial.hero.title')}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {t('trial.hero.subtitle')}
          </p>
        </motion.div>

        {/* Status banners */}
        {alreadySubscribed && status.ai_subscription_status === 'trial' && (
          <div className="mt-8 max-w-lg mx-auto bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-2xl p-5 flex items-center gap-4">
            <Clock size={28} className="text-amber-600 shrink-0" />
            <div className="text-left flex-1">
              <p className="font-bold text-gray-900 dark:text-white">{t('trial.status.trialActive')}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('trial.status.trialActiveDesc', { days: status.trial_days_left, plan: status.plan?.name_el || status.plan?.name || 'AI' })}
              </p>
            </div>
          </div>
        )}
        {alreadySubscribed && status.ai_subscription_status === 'active' && (
          <div className="mt-8 max-w-lg mx-auto bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-2xl p-5 flex items-center gap-4">
            <Check size={28} className="text-green-600 shrink-0" />
            <div className="text-left flex-1">
              <p className="font-bold text-gray-900 dark:text-white">{t('trial.status.activeSubscription')}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {status.plan?.name_el || status.plan?.name}
              </p>
            </div>
          </div>
        )}
        {alreadySubscribed && status.ai_subscription_status === 'expired' && (
          <div className="mt-8 max-w-lg mx-auto bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-2xl p-5">
            <p className="font-bold text-gray-900 dark:text-white mb-1">{t('trial.status.expiredTitle')}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('trial.status.expiredDesc')}</p>
            <Link to="/pricing" className="btn-primary inline-flex items-center gap-2 text-sm">
              {t('trial.status.seePricing')} <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </section>

      {/* Plans grid — hide if already subscribed/expired */}
      {!alreadySubscribed && (
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <h2 className="text-center text-lg font-bold text-gray-900 dark:text-white mb-2">
            {t('trial.plansTitle')}
          </h2>
          <p className="text-center text-sm text-gray-500 mb-8">{t('trial.plansSubtitle')}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map(plan => {
              const featureCount = [plan.includes_ai_health, plan.includes_emotion_ai, plan.includes_wellness_tracker].filter(Boolean).length
              const isBundle = featureCount > 1
              return (
                <motion.div key={plan.id}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  className={cn('card p-6 relative flex flex-col', plan.is_featured && 'ring-2 ring-brand-900 shadow-lg')}>
                  {plan.is_featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-gray-900 text-[10px] font-bold uppercase px-3 py-1 rounded-full whitespace-nowrap">
                      ★ {t('trial.recommended')}
                    </div>
                  )}
                  <div className="mb-4">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                      {isBundle ? `${t('trial.bundle')} (${featureCount})` : t('trial.individual')}
                    </p>
                    <h3 className="font-bold text-xl text-gray-900 dark:text-white mt-1">{plan.name_el || plan.name}</h3>
                    {plan.description && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-3">{plan.description}</p>
                    )}
                  </div>

                  <div className="mb-4">
                    <p className="text-3xl font-black text-brand-900 dark:text-brand-400">
                      €{plan.price_monthly}<span className="text-sm font-normal text-gray-500">/{t('trial.month')}</span>
                    </p>
                    {plan.price_annual && (
                      <p className="text-xs text-gray-400 mt-1">€{plan.price_annual}/{t('trial.year')}</p>
                    )}
                  </div>

                  <div className="space-y-2 mb-6 flex-1">
                    {FEATURE_META.map(f => {
                      const included = (plan as any)[f.key]
                      return (
                        <div key={f.key} className={cn('flex items-center gap-2 text-sm', included ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600')}>
                          {included ? <Check size={14} className="text-green-500 shrink-0" /> : <span className="w-3.5 h-3.5 shrink-0" />}
                          <span className={cn(!included && 'line-through')}>{t(f.tKey)}</span>
                        </div>
                      )
                    })}
                  </div>

                  <button onClick={() => handleStart(plan.id)}
                    disabled={startTrial.isPending && selectedPlanId === plan.id}
                    className={cn('w-full btn-primary flex items-center justify-center gap-2',
                      !plan.is_featured && 'bg-gray-900 hover:bg-gray-800')}>
                    {startTrial.isPending && selectedPlanId === plan.id
                      ? t('trial.starting')
                      : (<><Sparkles size={16} /> {t('trial.startFree')}</>)}
                  </button>
                </motion.div>
              )
            })}
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">
            {t('trial.noCardRequired')}
          </p>
        </section>
      )}
    </div>
  )
}
