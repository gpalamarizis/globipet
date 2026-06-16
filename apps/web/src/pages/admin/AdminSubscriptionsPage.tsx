import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layers, Brain, Package, Shield, Settings2, Check, X } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

const TABS = [
  { id: 'overview',  label: 'Επισκόπηση', icon: Layers },
  { id: 'ai',         label: 'AI Υγεία',    icon: Brain },
  { id: 'food',       label: 'Τροφή',       icon: Package },
  { id: 'insurance',  label: 'Ασφάλιση',    icon: Shield },
]

const STATUS_LABELS: Record<string, string> = {
  none: 'Κανένα', trial: 'Trial', active: 'Ενεργό', expired: 'Έληξε',
  cancelled: 'Ακυρωμένο', payment_failed: 'Αποτυχία πληρωμής', paused: 'Σε παύση',
}

const STATUS_COLORS: Record<string, string> = {
  trial: 'bg-amber-50 text-amber-700', active: 'bg-green-50 text-green-700',
  expired: 'bg-gray-100 text-gray-600', cancelled: 'bg-gray-100 text-gray-600',
  payment_failed: 'bg-red-50 text-red-700', paused: 'bg-blue-50 text-blue-700',
}

export default function AdminSubscriptionsPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const queryClient = useQueryClient()
  const [discountInput, setDiscountInput] = useState<string>('')

  const { data: discountSetting } = useQuery({
    queryKey: ['food-subscription-discount'],
    queryFn: () => api.get('/settings/food-subscription-discount').then(r => r.data?.data),
  })

  const updateDiscount = useMutation({
    mutationFn: (discount_percent: number) => api.patch('/settings/admin/food-subscription-discount', { discount_percent }),
    onSuccess: () => {
      toast.success('Η έκπτωση ενημερώθηκε')
      queryClient.invalidateQueries({ queryKey: ['food-subscription-discount'] })
    },
    onError: () => toast.error('Σφάλμα ενημέρωσης'),
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

  const updateFoodStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/admin/subscriptions/food/${id}`, { status }),
    onSuccess: () => {
      toast.success('Ενημερώθηκε')
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions-food'] })
    },
  })

  const StatusBadge = ({ status }: { status: string }) => (
    <span className={cn('text-xs font-medium px-2 py-1 rounded-full', STATUS_COLORS[status] || 'bg-gray-100 text-gray-600')}>
      {STATUS_LABELS[status] || status}
    </span>
  )

  return (
    <div className="page-container py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
          <Layers size={20} className="text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Συνδρομές</h1>
          <p className="text-sm text-gray-500">Διαχείριση AI, τροφής και ασφαλιστικών συνδρομών</p>
        </div>
      </div>

      {/* Global discount setting */}
      <div className="card p-4 mb-6 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <Settings2 size={16} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Global έκπτωση 12μηνης συνδρομής τροφής: <strong>{discountSetting?.discount_percent ?? 0}%</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number" min={0} max={100} placeholder="π.χ. 15"
            value={discountInput}
            onChange={e => setDiscountInput(e.target.value)}
            className="input w-24 text-sm"
          />
          <button
            onClick={() => discountInput !== '' && updateDiscount.mutate(parseFloat(discountInput))}
            disabled={updateDiscount.isPending || discountInput === ''}
            className="btn-primary px-3 py-2 text-xs"
          >
            Ενημέρωση %
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn('flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg transition-all',
              activeTab === tab.id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500')}>
            <tab.icon size={14} />{tab.label}
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
                  <th className="p-3">Τύπος</th><th className="p-3">Χρήστης</th><th className="p-3">Πλάνο</th>
                  <th className="p-3">Κατάσταση</th><th className="p-3">Έναρξη</th>
                </tr>
              </thead>
              <tbody>
                {overview?.map((row: any, i: number) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="p-3 capitalize text-gray-500">{row.type}</td>
                    <td className="p-3">
                      <p className="font-medium text-gray-900 dark:text-white">{row.user_name}</p>
                      <p className="text-xs text-gray-500">{row.user_email}</p>
                    </td>
                    <td className="p-3">{row.plan_name}{row.price ? ` — €${row.price}/μήνα` : ''}</td>
                    <td className="p-3"><StatusBadge status={row.status} /></td>
                    <td className="p-3 text-gray-500">{row.started_at ? new Date(row.started_at).toLocaleDateString('el-GR') : '—'}</td>
                  </tr>
                ))}
                {overview?.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">Δεν υπάρχουν συνδρομές ακόμα</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* AI tab */}
      {activeTab === 'ai' && (
        loadingAi ? <div className="flex justify-center py-12"><LoadingSpinner /></div> : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-left text-xs text-gray-500">
                <tr><th className="p-3">Χρήστης</th><th className="p-3">Κατάσταση</th><th className="p-3">Trial από</th></tr>
              </thead>
              <tbody>
                {aiUsers?.map((u: any) => (
                  <tr key={u.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="p-3">
                      <p className="font-medium text-gray-900 dark:text-white">{u.full_name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </td>
                    <td className="p-3"><StatusBadge status={u.ai_subscription_status} /></td>
                    <td className="p-3 text-gray-500">{u.ai_trial_started_at ? new Date(u.ai_trial_started_at).toLocaleDateString('el-GR') : '—'}</td>
                  </tr>
                ))}
                {aiUsers?.length === 0 && (
                  <tr><td colSpan={3} className="p-8 text-center text-gray-500">Κανένας χρήστης δεν έχει ενεργοποιήσει AI trial/συνδρομή</td></tr>
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
                  <th className="p-3">Χρήστης</th><th className="p-3">Προϊόν</th><th className="p-3">Τιμή/μήνα</th>
                  <th className="p-3">Παραδόσεις</th><th className="p-3">Κατάσταση</th><th className="p-3">Ενέργειες</th>
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
                        <button onClick={() => updateFoodStatus.mutate({ id: s.id, status: 'paused' })}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title="Παύση">
                          <X size={14} className="text-gray-500" />
                        </button>
                      )}
                      {s.status === 'paused' && (
                        <button onClick={() => updateFoodStatus.mutate({ id: s.id, status: 'active' })}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title="Επανενεργοποίηση">
                          <Check size={14} className="text-green-600" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {foodSubs?.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">Δεν υπάρχουν συνδρομές τροφής ακόμα</td></tr>
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
                <tr><th className="p-3">Χρήστης</th><th className="p-3">Πλάνο</th><th className="p-3">Κατάσταση</th><th className="p-3">Από</th></tr>
              </thead>
              <tbody>
                {insuranceSubs?.map((s: any) => (
                  <tr key={s.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="p-3">
                      <p className="font-medium text-gray-900 dark:text-white">{s.user?.full_name}</p>
                      <p className="text-xs text-gray-500">{s.user?.email}</p>
                    </td>
                    <td className="p-3">{s.plan?.name_el || s.plan?.name} ({s.plan?.provider?.name})</td>
                    <td className="p-3"><StatusBadge status={s.status} /></td>
                    <td className="p-3 text-gray-500">{new Date(s.started_at).toLocaleDateString('el-GR')}</td>
                  </tr>
                ))}
                {insuranceSubs?.length === 0 && (
                  <tr><td colSpan={4} className="p-8 text-center text-gray-500">Δεν έχει καταχωρηθεί καμία ασφάλιση χρήστη ακόμα</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
