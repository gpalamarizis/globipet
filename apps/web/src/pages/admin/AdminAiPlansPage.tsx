import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Brain, Plus, Edit2, Trash2, X, Check, Package, Users, Sparkles, Video, Activity, Heart } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface AiPlan {
  id: string
  name: string
  name_el: string | null
  description: string | null
  tier: string
  price_monthly: number
  price_annual: number | null
  currency: string
  includes_ai_health: boolean
  includes_emotion_ai: boolean
  includes_wellness_tracker: boolean
  includes_telehealth: boolean
  telehealth_sessions_per_month: number | null
  max_pets: number | null
  features: string[]
  is_active: boolean
  is_featured: boolean
  display_order: number
  active_subscribers?: number
}

const EMPTY_PLAN: Partial<AiPlan> = {
  name: '', name_el: '', description: '', tier: 'basic',
  price_monthly: 4.99, price_annual: null, currency: 'EUR',
  includes_ai_health: false, includes_emotion_ai: false,
  includes_wellness_tracker: false, includes_telehealth: false,
  telehealth_sessions_per_month: null, max_pets: null,
  features: [], is_active: true, is_featured: false, display_order: 0,
}

const FEATURE_META = [
  { key: 'includes_ai_health',        icon: Heart,    labelKey: 'adminAiPlans.features.aiHealth',   color: 'text-red-500' },
  { key: 'includes_emotion_ai',       icon: Sparkles, labelKey: 'adminAiPlans.features.emotion',    color: 'text-purple-500' },
  { key: 'includes_wellness_tracker', icon: Activity, labelKey: 'adminAiPlans.features.wellness',   color: 'text-green-500' },
  { key: 'includes_telehealth',       icon: Video,    labelKey: 'adminAiPlans.features.telehealth', color: 'text-blue-500' },
] as const

export default function AdminAiPlansPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [editingPlan, setEditingPlan] = useState<Partial<AiPlan> | null>(null)
  const [isNew, setIsNew] = useState(false)

  const { data: plans = [], isLoading } = useQuery<AiPlan[]>({
    queryKey: ['admin-ai-plans'],
    queryFn: () => api.get('/admin/ai-plans').then(r => r.data?.data ?? []),
  })

  const savePlan = useMutation({
    mutationFn: async (plan: Partial<AiPlan>) => {
      if (isNew || !plan.id) {
        return api.post('/admin/ai-plans', plan)
      }
      return api.patch(`/admin/ai-plans/${plan.id}`, plan)
    },
    onSuccess: () => {
      toast.success(t('adminAiPlans.saved'))
      queryClient.invalidateQueries({ queryKey: ['admin-ai-plans'] })
      setEditingPlan(null); setIsNew(false)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || t('adminAiPlans.errorSave')),
  })

  const deletePlan = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/ai-plans/${id}`),
    onSuccess: () => {
      toast.success(t('adminAiPlans.deleted'))
      queryClient.invalidateQueries({ queryKey: ['admin-ai-plans'] })
    },
    onError: () => toast.error(t('adminAiPlans.errorDelete')),
  })

  const countIncluded = (p: AiPlan) =>
    [p.includes_ai_health, p.includes_emotion_ai, p.includes_wellness_tracker, p.includes_telehealth]
      .filter(Boolean).length

  const openNew = () => {
    setEditingPlan({ ...EMPTY_PLAN })
    setIsNew(true)
  }
  const openEdit = (p: AiPlan) => {
    setEditingPlan({ ...p })
    setIsNew(false)
  }

  return (
    <div className="page-container py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
            <Brain size={20} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('adminAiPlans.title')}</h1>
            <p className="text-sm text-gray-500">{t('adminAiPlans.subtitle')}</p>
          </div>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> {t('adminAiPlans.newPlan')}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : plans.length === 0 ? (
        <div className="card p-12 text-center">
          <Brain size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">{t('adminAiPlans.noPlans')}</p>
          <button onClick={openNew} className="btn-primary text-sm">
            {t('adminAiPlans.createFirst')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => {
            const includedCount = countIncluded(plan)
            const isBundle = includedCount > 1
            return (
              <div key={plan.id} className={cn('card p-5 relative', !plan.is_active && 'opacity-60')}>
                {plan.is_featured && (
                  <div className="absolute -top-2 right-4 bg-yellow-400 text-gray-900 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                    ★ {t('adminAiPlans.featured')}
                  </div>
                )}

                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{plan.name_el || plan.name}</h3>
                    <span className="text-xs text-gray-400 uppercase tracking-wider">{plan.tier}</span>
                  </div>
                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full',
                    isBundle ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700')}>
                    {isBundle
                      ? `${t('adminAiPlans.bundle')} (${includedCount})`
                      : t('adminAiPlans.individual')}
                  </span>
                </div>

                {plan.description && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{plan.description}</p>
                )}

                {/* Feature chips */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {FEATURE_META.map(f => {
                    const included = (plan as any)[f.key]
                    if (!included) return null
                    return (
                      <span key={f.key} className="inline-flex items-center gap-1 text-[11px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        <f.icon size={10} /> {t(f.labelKey)}
                      </span>
                    )
                  })}
                </div>

                {/* Prices */}
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-lg font-black text-brand-900 dark:text-brand-400">€{plan.price_monthly}</span>
                  <span className="text-xs text-gray-500">/{t('adminAiPlans.month')}</span>
                  {plan.price_annual && (
                    <span className="text-[11px] text-gray-400">· €{plan.price_annual}/{t('adminAiPlans.year')}</span>
                  )}
                </div>

                {/* Meta row */}
                <div className="flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-3">
                  <span className="flex items-center gap-1">
                    <Users size={11} /> {plan.active_subscribers ?? 0} {t('adminAiPlans.subscribers')}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(plan)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title={t('adminAiPlans.edit')}>
                      <Edit2 size={13} className="text-gray-500" />
                    </button>
                    <button onClick={() => {
                        if (confirm(t('adminAiPlans.confirmDelete', { name: plan.name_el || plan.name }))) {
                          deletePlan.mutate(plan.id)
                        }
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" title={t('adminAiPlans.delete')}>
                      <Trash2 size={13} className="text-red-500" />
                    </button>
                  </div>
                </div>

                {!plan.is_active && (
                  <div className="absolute inset-0 bg-white/40 dark:bg-gray-900/40 backdrop-blur-[1px] rounded-2xl flex items-center justify-center pointer-events-none">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-sm">
                      {t('adminAiPlans.inactive')}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Edit / Create Modal */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => { setEditingPlan(null); setIsNew(false) }}>
          <div className="w-full max-w-2xl card p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {isNew ? t('adminAiPlans.newPlan') : t('adminAiPlans.editPlan')}
              </h2>
              <button onClick={() => { setEditingPlan(null); setIsNew(false) }} className="btn-ghost p-2">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">{t('adminAiPlans.form.nameEn')}</label>
                  <input className="input text-sm" value={editingPlan.name ?? ''}
                    onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    placeholder="e.g. AI Health" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">{t('adminAiPlans.form.nameEl')}</label>
                  <input className="input text-sm" value={editingPlan.name_el ?? ''}
                    onChange={e => setEditingPlan({ ...editingPlan, name_el: e.target.value })}
                    placeholder="π.χ. AI Υγεία" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">{t('adminAiPlans.form.description')}</label>
                <textarea className="input text-sm min-h-[60px]" value={editingPlan.description ?? ''}
                  onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">{t('adminAiPlans.form.tier')}</label>
                  <select className="input text-sm" value={editingPlan.tier ?? 'basic'}
                    onChange={e => setEditingPlan({ ...editingPlan, tier: e.target.value })}>
                    <option value="free">free</option>
                    <option value="basic">basic</option>
                    <option value="pro">pro</option>
                    <option value="premium">premium</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">{t('adminAiPlans.form.priceMonthly')}</label>
                  <input className="input text-sm" type="number" step="0.01" value={editingPlan.price_monthly ?? 0}
                    onChange={e => setEditingPlan({ ...editingPlan, price_monthly: parseFloat(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">{t('adminAiPlans.form.priceAnnual')}</label>
                  <input className="input text-sm" type="number" step="0.01" value={editingPlan.price_annual ?? ''}
                    onChange={e => setEditingPlan({ ...editingPlan, price_annual: e.target.value ? parseFloat(e.target.value) : null })} />
                </div>
              </div>

              {/* Feature checkboxes — το κρίσιμο κομμάτι για individual vs bundle */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">{t('adminAiPlans.form.includes')}</label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  {FEATURE_META.map(f => {
                    const included = (editingPlan as any)[f.key]
                    return (
                      <label key={f.key} className={cn('flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors',
                        included ? 'bg-green-50 dark:bg-green-900/20 border border-green-200' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700')}>
                        <input type="checkbox" checked={!!included}
                          onChange={e => setEditingPlan({ ...editingPlan, [f.key]: e.target.checked })}
                          className="rounded" />
                        <f.icon size={14} className={f.color} />
                        <span className="text-sm text-gray-900 dark:text-white">{t(f.labelKey)}</span>
                      </label>
                    )
                  })}
                </div>
                <p className="text-[11px] text-gray-400 mt-2">{t('adminAiPlans.form.includesHelp')}</p>
              </div>

              {editingPlan.includes_telehealth && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">{t('adminAiPlans.form.telehealthSessions')}</label>
                  <input className="input text-sm" type="number" value={editingPlan.telehealth_sessions_per_month ?? ''}
                    onChange={e => setEditingPlan({ ...editingPlan, telehealth_sessions_per_month: e.target.value ? parseInt(e.target.value) : null })} />
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!editingPlan.is_active}
                    onChange={e => setEditingPlan({ ...editingPlan, is_active: e.target.checked })} className="rounded" />
                  {t('adminAiPlans.form.active')}
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!editingPlan.is_featured}
                    onChange={e => setEditingPlan({ ...editingPlan, is_featured: e.target.checked })} className="rounded" />
                  {t('adminAiPlans.form.featured')}
                </label>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">{t('adminAiPlans.form.displayOrder')}</label>
                  <input className="input text-sm" type="number" value={editingPlan.display_order ?? 0}
                    onChange={e => setEditingPlan({ ...editingPlan, display_order: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setEditingPlan(null); setIsNew(false) }} className="btn-secondary flex-1">
                {t('adminAiPlans.cancel')}
              </button>
              <button onClick={() => savePlan.mutate(editingPlan)}
                disabled={savePlan.isPending || !editingPlan.name}
                className="btn-primary flex-1">
                {savePlan.isPending ? '...' : (isNew ? t('adminAiPlans.create') : t('adminAiPlans.save'))}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
