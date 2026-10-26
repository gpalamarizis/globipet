import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Award, Save, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

/**
 * Ρυθμίσεις προγράμματος επιβράβευσης (Ε17) — PUT /loyalty/admin/config.
 * Ο server ελέγχει ξανά τα ίδια (και καταγράφει την αλλαγή στο audit).
 */
type Tier = 'bronze' | 'silver' | 'gold' | 'platinum'
const TIERS: Tier[] = ['bronze', 'silver', 'gold', 'platinum']
const MAX_DISCOUNT = 50

interface Draft {
  points_per_euro: string
  thresholds: Record<Tier, string>
  ai_discount_percent: Record<Tier, string>
}

/** Πόντοι/€ από το πεδίο: δεκαδικό με κόμμα ή τελεία («1,5» = «1.5»)· οτιδήποτε άλλο → NaN. */
function parsePointsPerEuro(s: string): number {
  const v = s.trim().replace(',', '.')
  return /^\d+(\.\d+)?$/.test(v) ? Number(v) : NaN
}

/** Ίδιοι κανόνες με το backend (lib/loyalty validateLoyaltyConfig). Επιστρέφει κλειδί μετάφρασης σφάλματος. */
function validate(d: Draft): string | null {
  const ppe = parsePointsPerEuro(d.points_per_euro)
  if (d.points_per_euro.trim() === '' || !Number.isFinite(ppe) || ppe < 0 || ppe > 1000 || Math.abs(Math.round(ppe * 100) - ppe * 100) > 1e-6) {
    return 'adminLoyalty.errPointsPerEuro'
  }
  const th = TIERS.map(k => (k === 'bronze' ? 0 : Number(d.thresholds[k])))
  if (TIERS.some(k => k !== 'bronze' && d.thresholds[k].trim() === '') || th.some(v => !Number.isInteger(v) || v < 0)) {
    return 'adminLoyalty.errThresholds'
  }
  if (!(th[1] > th[0] && th[2] > th[1] && th[3] > th[2])) return 'adminLoyalty.errIncreasing'
  if (TIERS.some(k => {
    const v = Number(d.ai_discount_percent[k])
    return d.ai_discount_percent[k].trim() === '' || !Number.isInteger(v) || v < 0 || v > MAX_DISCOUNT
  })) return 'adminLoyalty.errDiscount'
  return null
}

export default function AdminLoyaltyPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<Draft | null>(null)

  const { data: config, isLoading } = useQuery({
    queryKey: ['admin-loyalty-config'],
    queryFn: () => api.get('/loyalty/admin/config').then(r => r.data?.data),
  })

  useEffect(() => {
    if (!config) return
    setDraft({
      points_per_euro: String(config.points_per_euro),
      thresholds: Object.fromEntries(TIERS.map(k => [k, String(config.thresholds?.[k] ?? 0)])) as Record<Tier, string>,
      ai_discount_percent: Object.fromEntries(TIERS.map(k => [k, String(config.ai_discount_percent?.[k] ?? 0)])) as Record<Tier, string>,
    })
  }, [config])

  const save = useMutation({
    mutationFn: (d: Draft) => api.put('/loyalty/admin/config', {
      points_per_euro: parsePointsPerEuro(d.points_per_euro),
      thresholds: Object.fromEntries(TIERS.map(k => [k, k === 'bronze' ? 0 : Number(d.thresholds[k])])),
      ai_discount_percent: Object.fromEntries(TIERS.map(k => [k, Number(d.ai_discount_percent[k])])),
    }),
    onSuccess: () => {
      toast.success(t('adminLoyalty.saved'))
      queryClient.invalidateQueries({ queryKey: ['admin-loyalty-config'] })
      queryClient.invalidateQueries({ queryKey: ['my-loyalty'] })
      queryClient.invalidateQueries({ queryKey: ['loyalty-config'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || t('adminLoyalty.saveError')),
  })

  if (isLoading || !draft) return <div className="page-container py-8 flex justify-center"><LoadingSpinner /></div>

  const error = validate(draft)
  const setThreshold = (k: Tier, v: string) => setDraft(d => d && ({ ...d, thresholds: { ...d.thresholds, [k]: v } }))
  const setDiscount = (k: Tier, v: string) => setDraft(d => d && ({ ...d, ai_discount_percent: { ...d.ai_discount_percent, [k]: v } }))

  return (
    <div className="page-container py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
            <Award size={20} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('adminLoyalty.title')}</h1>
            <p className="text-sm text-gray-500">{t('adminLoyalty.subtitle')}</p>
          </div>
        </div>
        <button onClick={() => { if (!error) save.mutate(draft) }} disabled={save.isPending || !!error}
          className="btn-primary flex items-center gap-2 px-4 py-2.5 disabled:opacity-60">
          <Save size={16} />{save.isPending ? t('adminLoyalty.saving') : t('common.save')}
        </button>
      </div>

      <div className="card p-4 mb-6 flex items-center gap-3 bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20">
        <Info size={16} className="text-blue-600 shrink-0" />
        <p className="text-xs text-blue-700 dark:text-blue-300">{t('adminLoyalty.note')}</p>
      </div>

      {/* Πόντοι ανά ευρώ */}
      <div className="card p-5 mb-5">
        <h2 className="font-bold text-gray-900 dark:text-white mb-1">{t('adminLoyalty.earnTitle')}</h2>
        <p className="text-xs text-gray-500 mb-3">{t('adminLoyalty.earnNote')}</p>
        <div className="flex items-center gap-4 py-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 min-w-[140px]">{t('adminLoyalty.pointsPerEuro')}</span>
          <div className="flex items-center gap-1.5">
            {/* text + decimal: δέχεται και κόμμα (ελληνικό πληκτρολόγιο) — μετατρέπεται σε τελεία. */}
            <input type="text" inputMode="decimal"
              value={draft.points_per_euro}
              onChange={e => setDraft(d => d && ({ ...d, points_per_euro: e.target.value }))}
              className="input w-24 text-sm text-right" />
            <span className="text-sm text-gray-400 w-8">/ €</span>
          </div>
        </div>
      </div>

      {/* Επίπεδα: όριο πόντων + έκπτωση AI */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 dark:text-white mb-1">{t('adminLoyalty.tiersTitle')}</h2>
        <p className="text-xs text-gray-500 mb-3">{t('adminLoyalty.tiersNote')}</p>
        <div className="hidden sm:flex items-center gap-4 pb-2 border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-500">
          <span className="flex-1 min-w-[140px]">{t('adminLoyalty.colTier')}</span>
          <span className="w-[8.5rem] text-right">{t('adminLoyalty.colThreshold')}</span>
          <span className="w-[7.5rem] text-right">{t('adminLoyalty.colDiscount')}</span>
        </div>
        {TIERS.map(k => (
          <div key={k} className="flex flex-wrap sm:flex-nowrap items-center gap-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 min-w-[140px]">{t(`loyalty.${k}`)}</span>
            <div className="flex items-center justify-between sm:justify-end gap-1.5 w-full sm:w-[8.5rem]">
              <span className="sm:hidden text-xs text-gray-500">{t('adminLoyalty.colThreshold')}</span>
              <span className="flex items-center gap-1.5">
                <input type="number" min={0} step={1} inputMode="numeric"
                  aria-label={`${t(`loyalty.${k}`)} — ${t('adminLoyalty.colThreshold')}`}
                  value={k === 'bronze' ? '0' : draft.thresholds[k]}
                  disabled={k === 'bronze'}
                  onChange={e => setThreshold(k, e.target.value)}
                  className="input w-24 text-sm text-right disabled:opacity-60" />
              </span>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-1.5 w-full sm:w-[7.5rem]">
              <span className="sm:hidden text-xs text-gray-500">{t('adminLoyalty.colDiscount')}</span>
              <span className="flex items-center gap-1.5">
                <input type="number" min={0} max={MAX_DISCOUNT} step={1} inputMode="numeric"
                  aria-label={`${t(`loyalty.${k}`)} — ${t('adminLoyalty.colDiscount')}`}
                  value={draft.ai_discount_percent[k]}
                  onChange={e => setDiscount(k, e.target.value)}
                  className="input w-20 text-sm text-right" />
                <span className="text-sm text-gray-400 w-8">%</span>
              </span>
            </div>
          </div>
        ))}
        {error && <p className="text-xs text-red-600 mt-3">{t(error)}</p>}
      </div>
    </div>
  )
}
