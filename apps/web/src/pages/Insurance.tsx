import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Shield, Check, X, Phone, Globe, ChevronDown, ChevronUp, Star } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

const TIER_KEYS: Record<string, { labelKey: string; color: string; bg: string }> = {
  basic:         { labelKey: 'insurance.tiers.basic',         color: '#374151', bg: '#F3F4F6' },
  standard:      { labelKey: 'insurance.tiers.standard',      color: '#1E40AF', bg: '#DBEAFE' },
  premium:       { labelKey: 'insurance.tiers.premium',       color: '#6D28D9', bg: '#EDE9FE' },
  comprehensive: { labelKey: 'insurance.tiers.comprehensive', color: '#065F46', bg: '#D1FAE5' },
}

const PET_TYPE_KEYS: Record<string, { labelKey: string; emoji: string }> = {
  dog:    { labelKey: 'insurance.petTypes.dog',    emoji: '🐕' },
  cat:    { labelKey: 'insurance.petTypes.cat',    emoji: '🐈' },
  rabbit: { labelKey: 'insurance.petTypes.rabbit', emoji: '🐇' },
  bird:   { labelKey: 'insurance.petTypes.bird',   emoji: '🦜' },
}

const COVERAGE_CHIPS = [
  { key: 'covers_accidents',  labelKey: 'insurance.coverage.accidents' },
  { key: 'covers_illness',    labelKey: 'insurance.coverage.illness' },
  { key: 'covers_surgery',    labelKey: 'insurance.coverage.surgery' },
  { key: 'covers_dental',     labelKey: 'insurance.coverage.dental' },
  { key: 'covers_preventive', labelKey: 'insurance.coverage.preventive' },
  { key: 'covers_liability',  labelKey: 'insurance.coverage.liability' },
  { key: 'covers_death',      labelKey: 'insurance.coverage.death' },
]

export default function Insurance() {
  const { t } = useTranslation()
  const [petType, setPetType] = useState('')
  const [tier, setTier] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [coversSurgery, setCoversSurgery] = useState(false)
  const [coversDental, setCoversDental] = useState(false)
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null)

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['insurance-plans', petType, tier, maxPrice, coversSurgery, coversDental],
    queryFn: () => api.get('/insurance/plans', {
      params: {
        pet_type: petType || undefined,
        tier: tier || undefined,
        max_price: maxPrice || undefined,
        covers_surgery: coversSurgery || undefined,
        covers_dental: coversDental || undefined,
      }
    }).then(r => r.data?.data ?? []),
  })

  return (
    <div className="page-container py-8 pb-24 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
          <Shield size={28} className="text-brand-900"/> {t('insurance.title')}
        </h1>
        <p className="text-gray-500">{t('insurance.subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('insurance.filters.petType')}</label>
            <select className="input text-sm" value={petType} onChange={e => setPetType(e.target.value)}>
              <option value="">{t('insurance.filters.allPets')}</option>
              {Object.entries(PET_TYPE_KEYS).map(([k, v]) => (
                <option key={k} value={k}>{v.emoji} {t(v.labelKey)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('insurance.filters.tier')}</label>
            <select className="input text-sm" value={tier} onChange={e => setTier(e.target.value)}>
              <option value="">{t('insurance.filters.allTiers')}</option>
              {Object.entries(TIER_KEYS).map(([k, v]) => (
                <option key={k} value={k}>{t(v.labelKey)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('insurance.filters.maxPrice')}</label>
            <input className="input text-sm" type="number" placeholder={t('insurance.filters.maxPricePlaceholder')}
              value={maxPrice} onChange={e => setMaxPrice(e.target.value)}/>
          </div>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={coversSurgery} onChange={e => setCoversSurgery(e.target.checked)} className="rounded"/>
              {t('insurance.filters.coversSurgery')}
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={coversDental} onChange={e => setCoversDental(e.target.checked)} className="rounded"/>
              {t('insurance.filters.coversDental')}
            </label>
          </div>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-40 w-full rounded-2xl"/>)}</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-20">
          <Shield size={48} className="mx-auto text-gray-200 mb-4"/>
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('insurance.noPlans')}</p>
          <p className="text-gray-500 text-sm">{t('insurance.noPlansDesc')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{plans.length} {t('insurance.plansAvailable')}</p>
          {plans.map((plan: any) => {
            const tierInfo = TIER_KEYS[plan.tier] || TIER_KEYS.basic
            const isExpanded = expandedPlan === plan.id
            return (
              <div key={plan.id} className={cn('card overflow-hidden', plan.is_featured && 'ring-2 ring-brand-900')}>
                {plan.is_featured && (
                  <div className="bg-brand-900 text-white text-xs font-bold px-4 py-1 flex items-center gap-1">
                    <Star size={11} fill="white"/> {t('insurance.featured')}
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      {plan.provider?.logo_url ? (
                        <img src={plan.provider.logo_url} alt={plan.provider.name} className="h-12 w-auto object-contain"/>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
                          <Shield size={22} className="text-brand-900"/>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-500">{plan.provider?.name_el || plan.provider?.name}</p>
                        <h3 className="font-bold text-gray-900 dark:text-white">{plan.name_el || plan.name}</h3>
                        <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: tierInfo.bg, color: tierInfo.color }}>
                          {t(tierInfo.labelKey)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-black text-brand-900">€{plan.price_monthly}<span className="text-sm font-normal text-gray-500">/{t('insurance.perMonth')}</span></p>
                      {plan.price_annual && (
                        <p className="text-xs text-gray-500">€{plan.price_annual}/{t('insurance.perYear')}</p>
                      )}
                    </div>
                  </div>

                  {/* Coverage chips */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {COVERAGE_CHIPS.map(({ key, labelKey }) => (
                      <span key={key} className={cn(
                        'flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium',
                        plan[key] ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400 line-through'
                      )}>
                        {plan[key] ? <Check size={11}/> : <X size={11}/>} {t(labelKey)}
                      </span>
                    ))}
                  </div>

                  {/* Expand button */}
                  <button onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                    className="mt-4 flex items-center gap-1 text-sm text-brand-900 font-medium hover:underline">
                    {isExpanded ? <><ChevronUp size={16}/> {t('insurance.showLess')}</> : <><ChevronDown size={16}/> {t('insurance.showMore')}</>}
                  </button>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {plan.annual_limit && (
                        <div>
                          <p className="text-xs text-gray-500">{t('insurance.details.annualLimit')}</p>
                          <p className="font-semibold text-gray-900 dark:text-white">€{plan.annual_limit.toLocaleString()}</p>
                        </div>
                      )}
                      {plan.deductible && (
                        <div>
                          <p className="text-xs text-gray-500">{t('insurance.details.deductible')}</p>
                          <p className="font-semibold text-gray-900 dark:text-white">€{plan.deductible}</p>
                        </div>
                      )}
                      {plan.reimbursement_percent && (
                        <div>
                          <p className="text-xs text-gray-500">{t('insurance.details.reimbursement')}</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{plan.reimbursement_percent}%</p>
                        </div>
                      )}
                      {plan.waiting_period_days && (
                        <div>
                          <p className="text-xs text-gray-500">{t('insurance.details.waitingPeriod')}</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{plan.waiting_period_days} {t('insurance.details.days')}</p>
                        </div>
                      )}
                      {plan.max_age_years && (
                        <div>
                          <p className="text-xs text-gray-500">{t('insurance.details.maxAge')}</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{plan.max_age_years} {t('insurance.details.years')}</p>
                        </div>
                      )}
                      {plan.features?.length > 0 && (
                        <div className="col-span-full">
                          <p className="text-xs text-gray-500 mb-2">{t('insurance.details.extraBenefits')}</p>
                          <div className="flex flex-wrap gap-1">
                            {plan.features.map((f: string, i: number) => (
                              <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{f}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 mt-4">
                    {plan.provider?.website && (
                      <a href={plan.provider.website} target="_blank" rel="noopener noreferrer"
                        className="btn-primary flex-1 text-center text-sm flex items-center justify-center gap-2">
                        <Globe size={15}/> {t('insurance.applyCta')}
                      </a>
                    )}
                    {plan.provider?.phone && (
                      <a href={`tel:${plan.provider.phone}`}
                        className="btn-secondary flex items-center gap-2 text-sm px-4">
                        <Phone size={15}/> {plan.provider.phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
