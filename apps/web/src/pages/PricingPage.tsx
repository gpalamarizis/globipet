import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Heart, Sparkles, Activity, Check, Zap, X } from 'lucide-react'
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
  price_monthly: number
  price_annual: number | null
  includes_ai_health: boolean
  includes_emotion_ai: boolean
  includes_wellness_tracker: boolean
  includes_telehealth: boolean
  features: string[]
  is_featured: boolean
}

const FEATURE_META = [
  { key: 'includes_ai_health',        icon: Heart,    tKey: 'pricing.features.aiHealth' },
  { key: 'includes_emotion_ai',       icon: Sparkles, tKey: 'pricing.features.emotion' },
  { key: 'includes_wellness_tracker', icon: Activity, tKey: 'pricing.features.wellness' },
] as const

export default function PricingPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const { isAuthenticated } = useAuthStore()
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null)

  // Handle checkout return from Stripe
  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout')
    if (checkoutStatus === 'success') {
      toast.success(t('pricing.checkoutSuccess'))
    } else if (checkoutStatus === 'cancelled') {
      toast.error(t('pricing.checkoutCancelled'))
    }
  }, [searchParams, t])

  const { data: plans = [], isLoading } = useQuery<AiPlan[]>({
    queryKey: ['ai-plans-public'],
    queryFn: () => api.get('/ai-subscriptions/plans').then(r => r.data?.data ?? []),
  })

  const startCheckout = useMutation({
    mutationFn: ({ plan_id, billing }: { plan_id: string; billing: 'monthly' | 'annual' }) =>
      api.post('/ai-subscriptions/create-checkout', { plan_id, billing }).then(r => r.data?.data),
    onSuccess: (data) => {
      if (data?.checkout_url) {
        window.location.href = data.checkout_url
      } else {
        toast.error(t('pricing.errorCheckout'))
        setCheckoutPlanId(null)
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || t('pricing.errorCheckout'))
      setCheckoutPlanId(null)
    },
  })

  const handleSelect = (planId: string) => {
    if (!isAuthenticated) {
      window.location.href = `/login?redirect=/pricing`
      return
    }
    setCheckoutPlanId(planId)
    startCheckout.mutate({ plan_id: planId, billing })
  }

  if (isLoading) return <LoadingScreen />

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-6 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-900 text-white text-xs font-bold px-4 py-1.5 rounded-full mb-4">
          <Zap size={14} /> {t('pricing.hero.badge')}
        </div>
        <h1 className="text-4xl lg:text-5xl font-display font-black text-gray-900 dark:text-white mb-4">
          {t('pricing.hero.title')}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
          {t('pricing.hero.subtitle')}
        </p>

        {/* Monthly / Annual toggle */}
        <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          <button onClick={() => setBilling('monthly')}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
              billing === 'monthly' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500')}>
            {t('pricing.monthly')}
          </button>
          <button onClick={() => setBilling('annual')}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all inline-flex items-center gap-1',
              billing === 'annual' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500')}>
            {t('pricing.annual')}
            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              −17%
            </span>
          </button>
        </div>
      </section>

      {/* Plans grid */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => {
            const featureCount = [plan.includes_ai_health, plan.includes_emotion_ai, plan.includes_wellness_tracker].filter(Boolean).length
            const isBundle = featureCount > 1
            const monthlyPrice = billing === 'annual' && plan.price_annual
              ? (plan.price_annual / 12).toFixed(2)
              : plan.price_monthly.toFixed(2)
            const billedAs = billing === 'annual' && plan.price_annual
              ? t('pricing.billedAnnually', { amount: plan.price_annual.toFixed(2) })
              : t('pricing.billedMonthly')
            const isCheckoutLoading = startCheckout.isPending && checkoutPlanId === plan.id

            return (
              <motion.div key={plan.id}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className={cn('card p-6 relative flex flex-col', plan.is_featured && 'ring-2 ring-brand-900 shadow-lg')}>
                {plan.is_featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-gray-900 text-[10px] font-bold uppercase px-3 py-1 rounded-full whitespace-nowrap">
                    ★ {t('pricing.recommended')}
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                    {isBundle ? `${t('pricing.bundle')} (${featureCount})` : t('pricing.individual')}
                  </p>
                  <h3 className="font-bold text-xl text-gray-900 dark:text-white mt-1">{plan.name_el || plan.name}</h3>
                </div>

                <div className="mb-4">
                  <p className="text-3xl font-black text-brand-900 dark:text-brand-400">
                    €{monthlyPrice}<span className="text-sm font-normal text-gray-500">/{t('pricing.month')}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{billedAs}</p>
                </div>

                <div className="space-y-2 mb-6 flex-1">
                  {FEATURE_META.map(f => {
                    const included = (plan as any)[f.key]
                    return (
                      <div key={f.key} className={cn('flex items-center gap-2 text-sm',
                        included ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600')}>
                        {included ? <Check size={14} className="text-green-500 shrink-0" /> : <X size={14} className="text-gray-300 shrink-0" />}
                        <span className={cn(!included && 'line-through')}>{t(f.tKey)}</span>
                      </div>
                    )
                  })}
                  {plan.features?.length > 0 && (
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1">
                      {plan.features.map((feat, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                          <Check size={12} className="text-green-500 shrink-0" /> {feat}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={() => handleSelect(plan.id)}
                  disabled={isCheckoutLoading}
                  className={cn('w-full btn-primary flex items-center justify-center gap-2',
                    !plan.is_featured && 'bg-gray-900 hover:bg-gray-800')}>
                  {isCheckoutLoading ? t('pricing.redirecting') : t('pricing.selectPlan')}
                </button>
              </motion.div>
            )
          })}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          {t('pricing.securedByStripe')} · <Link to="/trial" className="underline">{t('pricing.tryFreeFirst')}</Link>
        </p>
      </section>
    </div>
  )
}
