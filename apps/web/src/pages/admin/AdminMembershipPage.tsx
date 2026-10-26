import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Crown, Save, Info, Users, AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

/**
 * Ε18 — Ρυθμίσεις GlobiPet Plus (GET/PUT /membership/admin).
 * Ίδια όρια με τον server (routes/membership.ts)· ο server ελέγχει ξανά και
 * στέλνει 400 { message } σε άκυρη τιμή — το μήνυμα εμφανίζεται ως έχει.
 */
interface AdminData {
  plan: { id: string; name: string; price_monthly: number; price_annual: number | null; is_active: boolean } | null
  config: { points_multiplier: number; ai_daily_limit: number }
  counts: { members: number; payment_failed: number }
}

interface Draft {
  name: string
  price_monthly: string
  price_annual: string
  is_active: boolean
  points_multiplier: string
  ai_daily_limit: string
}

/** Δεκαδικό με κόμμα ή τελεία («4,99» = «4.99»)· οτιδήποτε άλλο → NaN. */
function parseDec(s: string): number {
  const v = s.trim().replace(',', '.')
  return /^\d+(\.\d+)?$/.test(v) ? Number(v) : NaN
}
const twoDecimals = (n: number) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6

/** Επιστρέφει κλειδί μετάφρασης σφάλματος ή null. */
function validate(d: Draft): string | null {
  const name = d.name.trim()
  if (name.length < 2 || name.length > 60) return 'adminMembership.errName'
  const pm = parseDec(d.price_monthly)
  if (!Number.isFinite(pm) || pm < 0.5 || pm > 999 || !twoDecimals(pm)) return 'adminMembership.errPriceMonthly'
  if (d.price_annual.trim() !== '') {
    const pa = parseDec(d.price_annual)
    if (!Number.isFinite(pa) || pa < 0.5 || pa > 9999 || !twoDecimals(pa)) return 'adminMembership.errPriceAnnual'
  }
  const mult = parseDec(d.points_multiplier)
  if (!Number.isFinite(mult) || mult < 1 || mult > 10 || !Number.isInteger(mult * 2)) return 'adminMembership.errMultiplier'
  const lim = d.ai_daily_limit.trim()
  if (!/^\d+$/.test(lim) || Number(lim) < 1 || Number(lim) > 1000) return 'adminMembership.errLimit'
  return null
}

const toDraft = (d: AdminData): Draft => ({
  name: d.plan?.name ?? 'GlobiPet Plus',
  price_monthly: d.plan ? String(d.plan.price_monthly) : '',
  price_annual: d.plan?.price_annual != null ? String(d.plan.price_annual) : '',
  is_active: d.plan?.is_active ?? false,
  points_multiplier: String(d.config?.points_multiplier ?? 2),
  ai_daily_limit: String(d.config?.ai_daily_limit ?? 120),
})

export default function AdminMembershipPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [draft, setDraft] = useState<Draft | null>(null)

  const { data, isLoading, isError, refetch } = useQuery<AdminData>({
    queryKey: ['admin-membership'],
    queryFn: () => api.get('/membership/admin').then(r => r.data?.data),
  })

  useEffect(() => { if (data) setDraft(toDraft(data)) }, [data])

  const save = useMutation({
    mutationFn: (d: Draft) => api.put('/membership/admin', {
      name: d.name.trim(),
      price_monthly: parseDec(d.price_monthly),
      price_annual: d.price_annual.trim() === '' ? null : parseDec(d.price_annual),
      is_active: d.is_active,
      points_multiplier: parseDec(d.points_multiplier),
      ai_daily_limit: Number(d.ai_daily_limit.trim()),
    }).then(r => r.data?.data as AdminData),
    onSuccess: (fresh) => {
      toast.success(t('adminMembership.saved'))
      if (fresh) qc.setQueryData(['admin-membership'], fresh)
      qc.invalidateQueries({ queryKey: ['admin-membership'] })
      qc.invalidateQueries({ queryKey: ['membership'] })
      qc.invalidateQueries({ queryKey: ['admin-ai-plans'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || t('adminMembership.saveError')),
  })

  if (isLoading) return <div className="page-container py-8 flex justify-center"><LoadingSpinner /></div>
  if (isError || !draft) return (
    <div className="page-container py-8">
      <div className="card p-6 text-center space-y-3">
        <p className="text-sm text-gray-700 dark:text-gray-300">{t('adminMembership.loadError')}</p>
        <button onClick={() => refetch()} className="btn-secondary text-sm">{t('adminMembership.retry')}</button>
      </div>
    </div>
  )

  const error = validate(draft)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft(d => d && ({ ...d, [k]: v }))
  const rowCls = 'flex flex-wrap sm:flex-nowrap items-center gap-x-4 gap-y-2 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0'
  const labelCls = 'text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 min-w-[180px]'

  return (
    <div className="page-container py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
            <Crown size={20} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('adminMembership.title')}</h1>
            <p className="text-sm text-gray-500">{t('adminMembership.subtitle')}</p>
          </div>
        </div>
        <button onClick={() => { if (!error) save.mutate(draft) }} disabled={save.isPending || !!error}
          className="btn-primary flex items-center gap-2 px-4 py-2.5 disabled:opacity-60">
          <Save size={16} />{save.isPending ? t('adminMembership.saving') : t('common.save')}
        </button>
      </div>

      <div className="card p-4 mb-6 flex items-center gap-3 bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20">
        <Info size={16} className="text-blue-600 shrink-0" />
        <p className="text-xs text-blue-700 dark:text-blue-300">{t('adminMembership.priceNote')}</p>
      </div>

      {/* Μετρητές */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="card p-4 flex items-center gap-3">
          <Users size={18} className="text-green-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{data?.counts?.members ?? 0}</p>
            <p className="text-xs text-gray-500">{t('adminMembership.members')}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{data?.counts?.payment_failed ?? 0}</p>
            <p className="text-xs text-gray-500">{t('adminMembership.paymentFailed')}</p>
          </div>
        </div>
      </div>

      {!data?.plan && (
        <div className="card p-4 mb-5 flex items-center gap-3 bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20">
          <Info size={16} className="text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-300">{t('adminMembership.noPlanNote')}</p>
        </div>
      )}

      {/* Πλάνο */}
      <div className="card p-5 mb-5">
        <h2 className="font-bold text-gray-900 dark:text-white mb-1">{t('adminMembership.planTitle')}</h2>
        <p className="text-xs text-gray-500 mb-3">{t('adminMembership.planNote')}</p>
        <div className={rowCls}>
          <label htmlFor="mb-name" className={labelCls}>{t('adminMembership.name')}</label>
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <input id="mb-name" type="text" maxLength={60} value={draft.name}
              onChange={e => set('name', e.target.value)}
              className="input flex-1 sm:flex-none sm:w-64 text-sm" />
            <span className="w-6 shrink-0" aria-hidden="true" />
          </div>
        </div>
        <div className={rowCls}>
          <label htmlFor="mb-pm" className={labelCls}>{t('adminMembership.priceMonthly')}</label>
          <div className="flex items-center gap-1.5">
            <input id="mb-pm" type="text" inputMode="decimal" value={draft.price_monthly}
              onChange={e => set('price_monthly', e.target.value)}
              className="input w-28 text-sm text-right" />
            <span className="text-sm text-gray-400 w-6">€</span>
          </div>
        </div>
        <div className={rowCls}>
          <div className={labelCls}>
            <label htmlFor="mb-pa">{t('adminMembership.priceAnnual')}</label>
            <p className="text-xs text-gray-500 font-normal mt-0.5">{t('adminMembership.priceAnnualHint')}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <input id="mb-pa" type="text" inputMode="decimal" value={draft.price_annual}
              onChange={e => set('price_annual', e.target.value)}
              className="input w-28 text-sm text-right" />
            <span className="text-sm text-gray-400 w-6">€</span>
          </div>
        </div>
        <div className={rowCls}>
          <label htmlFor="mb-active" className={labelCls}>{t('adminMembership.active')}</label>
          <div className="flex items-center gap-1.5">
            {/* Στοίχιση με τη δεξιά άκρη των πεδίων τιμής (w-28). */}
            <span className="w-28 flex justify-end">
              <input id="mb-active" type="checkbox" checked={draft.is_active}
                onChange={e => set('is_active', e.target.checked)}
                className="w-5 h-5 rounded" />
            </span>
            <span className="w-6" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Οφέλη */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 dark:text-white mb-1">{t('adminMembership.benefitsTitle')}</h2>
        <p className="text-xs text-gray-500 mb-3">{t('adminMembership.benefitsNote')}</p>
        <div className={rowCls}>
          <label htmlFor="mb-mult" className={labelCls}>{t('adminMembership.multiplier')}</label>
          <div className="flex items-center gap-1.5">
            <input id="mb-mult" type="number" min={1} max={10} step={0.5} inputMode="decimal" value={draft.points_multiplier}
              onChange={e => set('points_multiplier', e.target.value)}
              className="input w-28 text-sm text-right" />
            <span className="text-sm text-gray-400 w-6">×</span>
          </div>
        </div>
        <div className={rowCls}>
          <label htmlFor="mb-lim" className={labelCls}>{t('adminMembership.dailyLimit')}</label>
          <div className="flex items-center gap-1.5">
            <input id="mb-lim" type="number" min={1} max={1000} step={1} inputMode="numeric" value={draft.ai_daily_limit}
              onChange={e => set('ai_daily_limit', e.target.value)}
              className="input w-28 text-sm text-right" />
            <span className="w-6" aria-hidden="true" />
          </div>
        </div>
        {error && <p className="text-xs text-red-600 mt-3">{t(error)}</p>}
      </div>

      <p className="text-xs text-gray-500 mt-4">
        <Link to="/membership" className="text-brand-900 dark:text-brand-400 underline">{t('adminMembership.viewPublic')}</Link>
      </p>
    </div>
  )
}
