import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Award, ShoppingBag, Calendar, Video, Ticket, Brain, RotateCcw, Info } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

/**
 * Πρόγραμμα επιβράβευσης — «Πώς λειτουργεί» (Ε17). Ίδιο περιεχόμενο με την
 * οθόνη mobile/app/loyalty.tsx. Οι κανόνες έρχονται από τον server
 * (GET /loyalty → config, ή GET /loyalty/config χωρίς σύνδεση), ώστε μια
 * αλλαγή του διαχειριστή να φαίνεται αμέσως και στις δύο εφαρμογές.
 */
type Tier = 'bronze' | 'silver' | 'gold' | 'platinum'
const TIERS: Tier[] = ['bronze', 'silver', 'gold', 'platinum']

interface LoyaltyConfig {
  points_per_euro: number
  thresholds: Record<Tier, number>
  ai_discount_percent: Record<Tier, number>
}

/** Χρώματα επιπέδων — ίδια παλέτα με την οθόνη του κινητού. */
const TIER_STYLE: Record<Tier, { badge: string; ring: string }> = {
  bronze:   { badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', ring: 'ring-orange-400' },
  silver:   { badge: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200',            ring: 'ring-gray-400' },
  gold:     { badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',  ring: 'ring-yellow-400' },
  platinum: { badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',  ring: 'ring-indigo-400' },
}

const EARN_SOURCES = [
  { key: 'orders',        icon: ShoppingBag },
  { key: 'bookings',      icon: Calendar },
  { key: 'telehealth',    icon: Video },
  { key: 'events',        icon: Ticket },
  { key: 'subscriptions', icon: Brain },
] as const

export default function LoyaltyPage() {
  const { t, i18n } = useTranslation()
  const { isAuthenticated } = useAuthStore()

  const { data: mine, isLoading: loadingMine } = useQuery({
    queryKey: ['my-loyalty'],
    queryFn: () => api.get('/loyalty').then(r => r.data?.data),
    enabled: isAuthenticated,
  })
  const { data: publicConfig, isLoading: loadingConfig } = useQuery<LoyaltyConfig>({
    queryKey: ['loyalty-config'],
    queryFn: () => api.get('/loyalty/config').then(r => r.data?.data),
    enabled: !isAuthenticated,
  })

  const config: LoyaltyConfig | undefined = mine?.config ?? publicConfig
  if ((isAuthenticated && loadingMine) || (!isAuthenticated && loadingConfig)) {
    return <div className="page-container py-8 flex justify-center"><LoadingSpinner /></div>
  }
  if (!config) {
    return <div className="page-container py-8 text-center text-gray-500">{t('common.error')}</div>
  }

  const num = (n: number) => Number(n || 0).toLocaleString(i18n.language)
  const tierName = (k: Tier) => t(`loyalty.${k}`)
  const tier: Tier = TIERS.includes(mine?.tier) ? mine.tier : 'bronze'
  const lifetime: number = mine?.lifetime_points ?? mine?.total_points ?? 0
  const nextTier: Tier | null = mine?.next_tier ?? null
  const curThreshold: number = config.thresholds[tier] ?? 0
  const nextThreshold: number | null = nextTier ? config.thresholds[nextTier] : null
  const progress = nextThreshold
    ? Math.max(0, Math.min(100, ((lifetime - curThreshold) / (nextThreshold - curThreshold)) * 100))
    : 100

  return (
    <div className="page-container py-8 pb-24 lg:pb-8 max-w-4xl mx-auto">
      {/* Επικεφαλίδα */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
          <Award size={20} className="text-orange-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('loyaltyPage.title')}</h1>
          <p className="text-sm text-gray-500">{t('loyaltyPage.subtitle')}</p>
        </div>
      </div>

      {/* Η κατάστασή μου */}
      {isAuthenticated && mine ? (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{t('loyaltyPage.yourTier')}</span>
              <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', TIER_STYLE[tier].badge)}>{tierName(tier)}</span>
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {t('loyaltyPage.pointsValue', { points: num(lifetime) })}
            </span>
          </div>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-full h-3 mb-2">
            <div className="bg-orange-500 h-3 rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between gap-3 text-xs text-gray-500">
            <span>{tierName(tier)}</span>
            <span className="text-right">
              {nextTier
                ? t('loyaltyPage.toNext', { points: num(mine?.points_to_next ?? Math.max(0, (nextThreshold ?? 0) - lifetime)), tier: tierName(nextTier) })
                : t('loyaltyPage.maxTier')}
            </span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-4">
            {(config.ai_discount_percent[tier] ?? 0) > 0
              ? t('loyaltyPage.yourDiscount', { percent: config.ai_discount_percent[tier] })
              : t('loyaltyPage.noDiscountYet')}
          </p>
        </div>
      ) : (
        <div className="card p-5 mb-6 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-gray-700 dark:text-gray-300">{t('loyaltyPage.loginPrompt')}</p>
          <Link to="/login?redirect=/loyalty" className="btn-primary px-4 py-2 text-sm">{t('loyaltyPage.login')}</Link>
        </div>
      )}

      {/* Πώς κερδίζω πόντους */}
      <div className="card p-5 mb-6">
        <h2 className="font-bold text-gray-900 dark:text-white mb-1">{t('loyaltyPage.earnTitle')}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('loyaltyPage.earnRate', { points: num(config.points_per_euro) })}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {EARN_SOURCES.map(s => (
            <div key={s.key} className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 px-3 py-2.5">
              <s.icon size={16} className="text-brand-900 dark:text-brand-400 shrink-0" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{t(`loyaltyPage.source_${s.key}`)}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-4 flex items-start gap-2">
          <RotateCcw size={14} className="shrink-0 mt-0.5" />
          <span>{t('loyaltyPage.refundNote')}</span>
        </p>
      </div>

      {/* Επίπεδα και οφέλη */}
      <h2 className="font-bold text-gray-900 dark:text-white mb-3">{t('loyaltyPage.tiersTitle')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {TIERS.map(k => {
          const pct = config.ai_discount_percent[k] ?? 0
          const current = isAuthenticated && !!mine && k === tier
          return (
            <div key={k} className={cn('card p-4 flex flex-col gap-2', current && `ring-2 ${TIER_STYLE[k].ring}`)}>
              <div className="flex items-center justify-between gap-2">
                <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', TIER_STYLE[k].badge)}>{tierName(k)}</span>
                {current && <span className="text-xs font-semibold text-gray-500">{t('loyaltyPage.current')}</span>}
              </div>
              <p className="text-xs text-gray-500">
                {config.thresholds[k] > 0 ? t('loyaltyPage.fromPoints', { points: num(config.thresholds[k]) }) : t('loyaltyPage.startTier')}
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {pct > 0 ? t('loyaltyPage.aiDiscount', { percent: pct }) : t('loyaltyPage.noDiscount')}
              </p>
            </div>
          )
        })}
      </div>

      <div className="card p-4 flex items-start gap-3 bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20">
        <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          {t('loyaltyPage.discountNote')}{' '}
          <Link to="/pricing" className="underline font-medium">{t('loyaltyPage.seePlans')}</Link>
        </p>
      </div>
    </div>
  )
}
