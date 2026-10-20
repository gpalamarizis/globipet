import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Percent, ShoppingBag, Wrench, Save, Info } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useTranslation, Trans } from 'react-i18next'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

const PRODUCT_CATEGORIES = [
  { key: 'food',        label: 'adminCommissions.cat_food',     emoji: '🦴' },
  { key: 'toys',        label: 'adminCommissions.cat_toys',  emoji: '🎾' },
  { key: 'accessories', label: 'adminCommissions.cat_accessories',   emoji: '🎀' },
]

const SERVICE_CATEGORIES = [
  { key: 'services_default', label: 'adminCommissions.cat_services_default', emoji: '✨' },
  { key: 'veterinary',  label: 'adminCommissions.cat_veterinary',  emoji: '🩺' },
  { key: 'grooming',    label: 'adminCommissions.cat_grooming',  emoji: '✂️' },
  { key: 'training',    label: 'adminCommissions.cat_training',  emoji: '🎓' },
  { key: 'hosting',     label: 'adminCommissions.cat_hosting',   emoji: '🏠' },
  { key: 'walking',     label: 'adminCommissions.cat_walking',      emoji: '🚶' },
  { key: 'pet_taxi',    label: 'adminCommissions.cat_pet_taxi',    emoji: '🚕' },
  { key: 'photography', label: 'adminCommissions.cat_photography', emoji: '📸' },
  { key: 'pharmacy',    label: 'adminCommissions.cat_pharmacy',   emoji: '💊' },
  { key: 'telehealth',  label: 'adminCommissions.cat_telehealth', emoji: '🩻' },
]

export default function AdminCommissionsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [previewAmount, setPreviewAmount] = useState('100')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const { data: rates, isLoading } = useQuery({
    queryKey: ['commission-rates'],
    queryFn: () => api.get('/settings/commission-rates').then(r => r.data?.data ?? {}),
  })

  useEffect(() => {
    if (rates) {
      const initial: Record<string, string> = {}
      for (const [k, v] of Object.entries(rates)) initial[k] = String(v)
      setDraft(initial)
    }
  }, [rates])

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, number> = {}
      for (const [k, v] of Object.entries(draft)) {
        if (v !== '') payload[k] = parseFloat(v)
      }
      return api.patch('/settings/commission-rates', payload)
    },
    onSuccess: () => {
      toast.success(t('adminCommissions.updated'))
      queryClient.invalidateQueries({ queryKey: ['commission-rates'] })
    },
    onError: (err: any) => toast.error(err?.message || t('adminCommissions.updateError')),
  })

  const setRate = (key: string, val: string) => setDraft(d => ({ ...d, [key]: val }))

  const RateRow = ({ cat }: { cat: { key: string; label: string; emoji: string } }) => {
    const rateVal = parseFloat(draft[cat.key] || '0') || 0
    const amount = parseFloat(previewAmount) || 0
    const fee = Math.round(amount * (rateVal / 100) * 100) / 100
    const payout = Math.round((amount - fee) * 100) / 100
    return (
      <div className="flex items-center gap-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
        <span className="text-xl shrink-0">{cat.emoji}</span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 min-w-[140px]">{t(cat.label)}</span>
        <div className="flex items-center gap-1.5">
          <input
            type="number" min={0} max={100} step={0.5}
            value={draft[cat.key] ?? ''}
            onChange={e => setRate(cat.key, e.target.value)}
            className="input w-20 text-sm text-right"
          />
          <span className="text-sm text-gray-400">%</span>
        </div>
        <div className="hidden sm:block text-xs text-gray-400 w-48 text-right">
          <Trans i18nKey="adminCommissions.preview" values={{ amount: previewAmount || 0, fee: fee.toFixed(2), payout: payout.toFixed(2) }}
            components={{ strong1: <strong className="text-gray-600 dark:text-gray-300" />, strong2: <strong className="text-green-600" /> }} />
        </div>
      </div>
    )
  }

  if (isLoading) return <div className="page-container py-8 flex justify-center"><LoadingSpinner /></div>

  return (
    <div className="page-container py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
            <Percent size={20} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('adminCommissions.title')}</h1>
            <p className="text-sm text-gray-500">{t('adminCommissions.subtitle')}</p>
          </div>
        </div>
        <button onClick={() => save.mutate()} disabled={save.isPending}
          className="btn-primary flex items-center gap-2 px-4 py-2.5">
          <Save size={16} />{save.isPending ? t('adminCommissions.saving') : t('common.save')}
        </button>
      </div>

      <div className="card p-4 mb-6 flex items-center gap-3 bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20">
        <Info size={16} className="text-blue-600 shrink-0" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          {t('adminCommissions.phaseNote')}
        </p>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-gray-500">{t('adminCommissions.tryAmount')}</span>
        <input type="number" value={previewAmount} onChange={e => setPreviewAmount(e.target.value)} className="input w-24 text-sm" />
        <span className="text-xs text-gray-500">€</span>
      </div>

      {/* Products */}
      <div className="card p-5 mb-5">
        <h2 className="font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2"><ShoppingBag size={16}/> {t('adminCommissions.productsTitle')}</h2>
        <p className="text-xs text-gray-500 mb-3">{t('adminCommissions.productsNote')}</p>
        {PRODUCT_CATEGORIES.map(cat => <RateRow key={cat.key} cat={cat} />)}
      </div>

      {/* Services */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2"><Wrench size={16}/> {t('adminCommissions.servicesTitle')}</h2>
        <p className="text-xs text-gray-500 mb-3">{t('adminCommissions.servicesNote')}</p>
        <RateRow cat={SERVICE_CATEGORIES[0]} />
        <button onClick={() => setShowAdvanced(s => !s)} className="text-xs text-brand-900 dark:text-brand-400 font-medium mt-3 mb-1">
          {showAdvanced ? t('adminCommissions.hideAdvanced') : t('adminCommissions.showAdvanced')}
        </button>
        {showAdvanced && (
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            {SERVICE_CATEGORIES.slice(1).map(cat => <RateRow key={cat.key} cat={cat} />)}
          </div>
        )}
      </div>
    </div>
  )
}