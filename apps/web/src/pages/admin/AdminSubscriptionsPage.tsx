import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation, Trans } from 'react-i18next'
import { Layers, Brain, Package, Shield, Settings2, Check, X, Edit2 } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { localName } from '@/lib/localName'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

const TABS = [
  { id: 'overview',  icon: Layers },
  { id: 'ai',         icon: Brain },
  { id: 'food',       icon: Package },
  { id: 'insurance',  icon: Shield },
]

// Κωδικοί κατάστασης με ετικέτα (adminSubs.st_*)· άγνωστος κωδικός → ως έχει.
const STATUS_KEYS = ['none', 'trial', 'active', 'expired', 'cancelled', 'payment_failed', 'paused', 'completed']

const STATUS_COLORS: Record<string, string> = {
  trial: 'bg-amber-50 text-amber-700', active: 'bg-green-50 text-green-700',
  expired: 'bg-gray-100 text-gray-600', cancelled: 'bg-gray-100 text-gray-600',
  payment_failed: 'bg-red-50 text-red-700', paused: 'bg-blue-50 text-blue-700',
}

export default function AdminSubscriptionsPage() {
  const { t, i18n } = useTranslation()
  const [activeTab, setActiveTab] = useState('overview')
  const queryClient = useQueryClient()
  const [discountInput, setDiscountInput] = useState<string>('')
  const [editingAiUser, setEditingAiUser] = useState<any>(null)

  const { data: discountSetting } = useQuery({
    queryKey: ['food-subscription-discount'],
    queryFn: () => api.get('/settings/food-subscription-discount').then(r => r.data?.data),
  })

  const updateDiscount = useMutation({
    mutationFn: (discount_percent: number) => api.patch('/settings/admin/food-subscription-discount', { discount_percent }),
    onSuccess: () => {
      toast.success(t('adminSubs.discountUpdated'))
      queryClient.invalidateQueries({ queryKey: ['food-subscription-discount'] })
    },
    onError: () => toast.error(t('adminSubs.updateError')),
  })

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['admin-subscriptions-overview'],
    queryFn: () => api.get('/admin/subscriptions/overview').then(r => r.data?.data ?? []),
    enabled: activeTab === 'overview',
  })

  const { data: aiUsers, isLoading: loadingAi } = useQuery({
    queryKey: ['admin-subscriptions-ai'],
    queryFn: () => api.get('/admin/subscriptions/ai').then(r => r.data?.data ?? []),
    enabled: activeTab === 'ai',
  })

  const { data: foodSubs, isLoading: loadingFood } = useQuery({
    queryKey: ['admin-subscriptions-food'],
    queryFn: () => api.get('/admin/subscriptions/food').then(r => r.data?.data ?? []),
    enabled: activeTab === 'food',
  })

  const { data: insuranceSubs, isLoading: loadingInsurance } = useQuery({
    queryKey: ['admin-subscriptions-insurance'],
    queryFn: () => api.get('/admin/subscriptions/insurance').then(r => r.data?.data ?? []),
    enabled: activeTab === 'insurance',
  })

  // For the AI edit modal — fetch available plans
  const { data: aiPlans = [] } = useQuery({
    queryKey: ['admin-ai-plans-list'],
    queryFn: () => api.get('/admin/ai-plans').then(r => r.data?.data ?? []),
    enabled: !!editingAiUser,
  })

  const updateFoodStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/admin/subscriptions/food/${id}`, { status }),
    onSuccess: () => {
      toast.success(t('adminSubs.updated'))
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions-food'] })
    },
    // Η παύση/επανενεργοποίηση γίνεται πρώτα στο Stripe: σε αποτυχία (502) ή
    // αλλαγή στο μεταξύ (409) ο διακομιστής δεν αλλάζει τίποτα — το μήνυμά του.
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || t('common.error'))
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions-food'] })
    },
  })

  const updateAiUser = useMutation({
    mutationFn: ({ user_id, ai_subscription_status, ai_subscription_plan_id }: any) =>
      api.patch(`/admin/subscriptions/ai/${user_id}`, { ai_subscription_status, ai_subscription_plan_id }),
    onSuccess: () => {
      toast.success(t('adminSubs.updated'))
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions-ai'] })
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions-overview'] })
      setEditingAiUser(null)
    },
    onError: () => toast.error(t('adminSubs.updateError')),
  })

  // Όνομα πλάνου στη γλώσσα του admin από τα ωμά πεδία του /overview·
  // παλιός backend χωρίς αυτά → το έτοιμο plan_name.
  const overviewPlanName = (row: any): string => {
    if (row.type === 'food' && row.product_name != null) return t('adminSubs.foodPlan', { name: row.product_name })
    if ((row.type === 'ai' || row.type === 'insurance') && 'plan_name_el' in row) {
      const n = localName({ name: row.plan_name_en, name_el: row.plan_name_el }, i18n.language)
      if (n) return n
      if (row.type === 'ai') return t('adminSubs.tab_ai')
    }
    return row.plan_name
  }

  const StatusBadge = ({ status }: { status: string }) => (
    <span className={cn('text-xs font-medium px-2 py-1 rounded-full', STATUS_COLORS[status] || 'bg-gray-100 text-gray-600')}>
      {STATUS_KEYS.includes(status) ? t(`adminSubs.st_${status}`) : status}
    </span>
  )

  return (
    <div className="page-container py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
          <Layers size={20} className="text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('adminSubs.title')}</h1>
          <p className="text-sm text-gray-500">{t('adminSubs.subtitle')}</p>
        </div>
      </div>

      {/* Global discount setting */}
      <div className="card p-4 mb-6 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <Settings2 size={16} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            <Trans i18nKey="adminSubs.globalDiscount" values={{ percent: discountSetting?.discount_percent ?? 0 }} components={{ b: <strong /> }} />
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number" min={0} max={100} placeholder={t('adminSubs.discountPh')}
            value={discountInput}
            onChange={e => setDiscountInput(e.target.value)}
            className="input w-24 text-sm"
          />
          <button
            onClick={() => discountInput !== '' && updateDiscount.mutate(parseFloat(discountInput))}
            disabled={updateDiscount.isPending || discountInput === ''}
            className="btn-primary px-3 py-2 text-xs"
          >
            {t('adminSubs.updatePercent')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn('flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg transition-all',
              activeTab === tab.id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500')}>
            <tab.icon size={14} />{t(`adminSubs.tab_${tab.id}`)}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        loadingOverview ? <div className="flex justify-center py-12"><LoadingSpinner /></div> : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-left text-xs text-gray-500">
                <tr>
                  <th className="p-3">{t('adminSubs.type')}</th><th className="p-3">{t('adminSubs.user')}</th><th className="p-3">{t('adminSubs.plan')}</th>
                  <th className="p-3">{t('adminSubs.status')}</th><th className="p-3">{t('adminSubs.start')}</th>
                </tr>
              </thead>
              <tbody>
                {overview?.map((row: any, i: number) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="p-3 capitalize text-gray-500">{TABS.some(tb => tb.id === row.type) ? t(`adminSubs.tab_${row.type}`) : row.type}</td>
                    <td className="p-3">
                      <p className="font-medium text-gray-900 dark:text-white">{row.user_name}</p>
                      <p className="text-xs text-gray-500">{row.user_email}</p>
                    </td>
                    <td className="p-3">{overviewPlanName(row)}{row.price ? t('adminSubs.perMonthSuffix', { price: row.price }) : ''}</td>
                    <td className="p-3"><StatusBadge status={row.status} /></td>
                    <td className="p-3 text-gray-500">{row.started_at ? new Date(row.started_at).toLocaleDateString(i18n.language) : '—'}</td>
                  </tr>
                ))}
                {overview?.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">{t('adminSubs.noSubs')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* AI tab — enhanced with plan info + actions */}
      {activeTab === 'ai' && (
        loadingAi ? <div className="flex justify-center py-12"><LoadingSpinner /></div> : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-left text-xs text-gray-500">
                <tr>
                  <th className="p-3">{t('adminSubs.user')}</th>
                  <th className="p-3">{t('adminSubs.plan')}</th>
                  <th className="p-3">{t('adminSubs.status')}</th>
                  <th className="p-3">{t('adminSubs.trialFrom')}</th>
                  <th className="p-3">{t('adminSubs.trialDays')}</th>
                  <th className="p-3">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {aiUsers?.map((u: any) => (
                  <tr key={u.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="p-3">
                      <p className="font-medium text-gray-900 dark:text-white">{u.full_name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </td>
                    <td className="p-3">
                      {u.plan ? (
                        <div>
                          <p className="font-medium">{localName(u.plan, i18n.language)}</p>
                          <p className="text-xs text-gray-400">{t('adminSubs.perMonth', { price: u.plan.price_monthly })}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-3"><StatusBadge status={u.ai_subscription_status} /></td>
                    <td className="p-3 text-gray-500">{u.ai_trial_started_at ? new Date(u.ai_trial_started_at).toLocaleDateString(i18n.language) : '—'}</td>
                    <td className="p-3">
                      {u.trial_days_left !== null && u.ai_subscription_status === 'trial' ? (
                        <span className={cn('text-xs font-semibold',
                          u.trial_days_left > 7 ? 'text-green-600' :
                          u.trial_days_left > 0 ? 'text-amber-600' : 'text-red-600')}>
                          {t('adminSubs.daysLeft', { count: u.trial_days_left })}
                        </span>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="p-3">
                      <button onClick={() => setEditingAiUser(u)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title={t('common.edit')}>
                        <Edit2 size={13} className="text-gray-500" />
                      </button>
                    </td>
                  </tr>
                ))}
                {aiUsers?.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">{t('adminSubs.noAiUsers')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Food tab */}
      {activeTab === 'food' && (
        loadingFood ? <div className="flex justify-center py-12"><LoadingSpinner /></div> : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-left text-xs text-gray-500">
                <tr>
                  <th className="p-3">{t('adminSubs.user')}</th><th className="p-3">{t('adminSubs.product')}</th><th className="p-3">{t('adminSubs.pricePerMonth')}</th>
                  <th className="p-3">{t('adminSubs.deliveries')}</th><th className="p-3">{t('adminSubs.status')}</th><th className="p-3">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {foodSubs?.map((s: any) => (
                  <tr key={s.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="p-3">
                      <p className="font-medium text-gray-900 dark:text-white">{s.user?.full_name}</p>
                      <p className="text-xs text-gray-500">{s.user?.email}</p>
                    </td>
                    <td className="p-3">{s.product?.name}</td>
                    <td className="p-3">€{s.monthly_price}</td>
                    <td className="p-3">{s.deliveries_completed}/12</td>
                    <td className="p-3"><StatusBadge status={s.status} /></td>
                    <td className="p-3 flex gap-1.5">
                      {s.status === 'active' && (
                        <button onClick={() => updateFoodStatus.mutate({ id: s.id, status: 'paused' })} disabled={updateFoodStatus.isPending}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title={t('adminSubs.pause')}>
                          <X size={14} className="text-gray-500" />
                        </button>
                      )}
                      {s.status === 'paused' && (
                        <button onClick={() => updateFoodStatus.mutate({ id: s.id, status: 'active' })} disabled={updateFoodStatus.isPending}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title={t('adminSubs.reactivate')}>
                          <Check size={14} className="text-green-600" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {foodSubs?.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">{t('adminSubs.noFoodSubs')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Insurance tab */}
      {activeTab === 'insurance' && (
        loadingInsurance ? <div className="flex justify-center py-12"><LoadingSpinner /></div> : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-left text-xs text-gray-500">
                <tr><th className="p-3">{t('adminSubs.user')}</th><th className="p-3">{t('adminSubs.plan')}</th><th className="p-3">{t('adminSubs.status')}</th><th className="p-3">{t('adminSubs.from')}</th></tr>
              </thead>
              <tbody>
                {insuranceSubs?.map((s: any) => (
                  <tr key={s.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="p-3">
                      <p className="font-medium text-gray-900 dark:text-white">{s.user?.full_name}</p>
                      <p className="text-xs text-gray-500">{s.user?.email}</p>
                    </td>
                    <td className="p-3">{localName(s.plan, i18n.language)} ({s.plan?.provider?.name})</td>
                    <td className="p-3"><StatusBadge status={s.status} /></td>
                    <td className="p-3 text-gray-500">{new Date(s.started_at).toLocaleDateString(i18n.language)}</td>
                  </tr>
                ))}
                {insuranceSubs?.length === 0 && (
                  <tr><td colSpan={4} className="p-8 text-center text-gray-500">{t('adminSubs.noInsurance')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* AI User Edit Modal */}
      {editingAiUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setEditingAiUser(null)}>
          <div className="w-full max-w-md card p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('adminSubs.editAiTitle')}</h2>
              <button onClick={() => setEditingAiUser(null)} className="btn-ghost p-2"><X size={18} /></button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="font-medium text-sm text-gray-900 dark:text-white">{editingAiUser.full_name}</p>
              <p className="text-xs text-gray-500">{editingAiUser.email}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">{t('adminSubs.status')}</label>
                <select className="input text-sm" value={editingAiUser.ai_subscription_status}
                  onChange={e => setEditingAiUser({ ...editingAiUser, ai_subscription_status: e.target.value })}>
                  <option value="none">{t('adminSubs.st_none')}</option>
                  <option value="trial">{t('adminSubs.trial30')}</option>
                  <option value="active">{t('adminSubs.st_active')}</option>
                  <option value="expired">{t('adminSubs.st_expired')}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">{t('adminSubs.plan')}</label>
                <select className="input text-sm" value={editingAiUser.ai_subscription_plan_id || ''}
                  onChange={e => setEditingAiUser({ ...editingAiUser, ai_subscription_plan_id: e.target.value || null })}>
                  <option value="">{t('adminSubs.noPlan')}</option>
                  {aiPlans.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {t('adminSubs.planOption', { name: localName(p, i18n.language), price: p.price_monthly })}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditingAiUser(null)} className="btn-secondary flex-1">{t('common.cancel')}</button>
              <button onClick={() => updateAiUser.mutate({
                  user_id: editingAiUser.id,
                  ai_subscription_status: editingAiUser.ai_subscription_status,
                  ai_subscription_plan_id: editingAiUser.ai_subscription_plan_id,
                })}
                disabled={updateAiUser.isPending}
                className="btn-primary flex-1">
                {updateAiUser.isPending ? '...' : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
