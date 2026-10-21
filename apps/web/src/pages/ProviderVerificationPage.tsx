import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { BadgeCheck, Clock, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'

/**
 * Αίτηση επαλήθευσης παρόχου — web.
 *
 * Το backend (POST/GET /provider/verification-request) υπήρχε, αλλά μόνο το
 * κινητό είχε φόρμα (mobile/app/verification.tsx). Ίδια πεδία, ίδια ροή:
 *   · χωρίς αίτηση ή με απορριφθείσα → φόρμα (με τον λόγο απόρριψης)
 *   · εκκρεμής ή εγκεκριμένη → μόνο η κατάσταση
 *
 * Διαδρομή /provider/verification (μέσα στο ProviderLayout).
 */

type Status = 'pending' | 'approved' | 'rejected'
const STATUS: Record<Status, { labelKey: string; textKey: string; Icon: any; cls: string }> = {
  pending:  { labelKey: 'providerVerify.under_review', textKey: 'providerVerify.under_review_note', Icon: Clock,
              cls: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
  approved: { labelKey: 'providerVerify.approved', textKey: 'providerVerify.verified_services', Icon: CheckCircle2,
              cls: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
  rejected: { labelKey: 'providerVerify.rejected', textKey: 'providerVerify.resubmit', Icon: XCircle,
              cls: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' },
}

const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'
const hintCls = 'text-xs text-gray-500 mt-1'

export default function ProviderVerificationPage() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    phone: (user as any)?.phone || '',
    city: (user as any)?.city || '',
    business_name: '',
    tax_number: '',
    years_experience: '',
    specializations: '',
    bio: '',
    website: '',
  })
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const { data: request, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-verification'],
    queryFn: () => api.get('/provider/verification-request').then(r => r.data?.data ?? null),
    enabled: !!user,
  })

  const submit = useMutation({
    mutationFn: () => api.post('/provider/verification-request', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-verification'] })
      toast.success(`${t('providerVerify.submitted')} — ${t('providerVerify.submitted_note')}`)
    },
    onError: (e: any) => toast.error(e?.message || t('providerVerify.genericError')),
  })

  const back = (
    <Link to="/provider" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white mb-4">
      <ArrowLeft size={16} aria-hidden="true" /> {t('providerVerify.backToDashboard')}
    </Link>
  )

  if (isLoading) return (
    <div className="max-w-2xl mx-auto">
      {back}
      <div className="card p-6 animate-pulse h-40" />
    </div>
  )

  if (isError) return (
    <div className="max-w-2xl mx-auto">
      {back}
      <div className="card p-6 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('providerVerify.loadError')}</p>
        <button type="button" onClick={() => refetch()} className="btn-primary px-4 py-2 text-sm">{t('providerVerify.retry')}</button>
      </div>
    </div>
  )

  // Εκκρεμής ή εγκεκριμένη αίτηση: δεν έχει νόημα να ξαναδεί τη φόρμα.
  if (request && request.status !== 'rejected') {
    const st = STATUS[request.status as Status] ?? STATUS.pending
    return (
      <div className="max-w-2xl mx-auto">
        {back}
        <div className="card p-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('providerVerify.verification')}</h1>
          <div className="flex items-center gap-3 mb-3">
            <st.Icon size={28} className={request.status === 'approved' ? 'text-green-600' : 'text-amber-500'} aria-hidden="true" />
            <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', st.cls)}>{t(st.labelKey)}</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">{t(st.textKey)}</p>
          <p className="text-xs text-gray-500 mt-2">
            {t('providerVerify.submitted_on', {
              date: new Date(request.created_at).toLocaleDateString(i18n.language, { day: '2-digit', month: 'long', year: 'numeric' }),
            })}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {back}
      <div className="mb-5 flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0">
          <BadgeCheck size={20} className="text-brand-900 dark:text-brand-400" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('providerVerify.title')}</h1>
          <p className="text-sm text-gray-500">{t('providerVerify.badge_trust')}</p>
        </div>
      </div>

      {request?.status === 'rejected' && (
        <div className="card p-4 mb-5 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mb-2">
            <XCircle size={18} className="text-red-600 shrink-0" aria-hidden="true" />
            <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', STATUS.rejected.cls)}>{t('providerVerify.rejected_before')}</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">{t('providerVerify.resubmit')}</p>
          {/* Ο λόγος του διαχειριστή — ως κείμενο, όχι HTML. */}
          {!!request.review_notes && (
            <p className="text-sm text-gray-900 dark:text-white mt-2 whitespace-pre-line">{request.review_notes}</p>
          )}
        </div>
      )}

      <form className="card p-5 sm:p-6 space-y-6"
        onSubmit={e => { e.preventDefault(); if (form.full_name.trim() && !submit.isPending) submit.mutate() }}>
        <fieldset className="space-y-4">
          <legend className="text-sm font-bold text-gray-900 dark:text-white mb-2">{t('providerVerify.contact')}</legend>
          <div>
            <label htmlFor="pv-name" className={labelCls}>{t('providerVerify.full_name')}</label>
            <input id="pv-name" className="input" value={form.full_name} required
              onChange={e => set('full_name', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pv-phone" className={labelCls}>{t('providerVerify.phone')}</label>
              <input id="pv-phone" type="tel" className="input" value={form.phone}
                onChange={e => set('phone', e.target.value)} />
            </div>
            <div>
              <label htmlFor="pv-city" className={labelCls}>{t('providerVerify.city')}</label>
              <input id="pv-city" className="input" value={form.city}
                onChange={e => set('city', e.target.value)} />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-bold text-gray-900 dark:text-white mb-2">{t('providerVerify.business')}</legend>
          <div>
            <label htmlFor="pv-business" className={labelCls}>{t('providerVerify.legal_name')}</label>
            <input id="pv-business" className="input" value={form.business_name} placeholder={t('providerVerify.optional')}
              onChange={e => set('business_name', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pv-vat" className={labelCls}>{t('providerVerify.vat')}</label>
              <input id="pv-vat" inputMode="numeric" className="input" value={form.tax_number}
                onChange={e => set('tax_number', e.target.value)} />
              <p className={hintCls}>{t('providerVerify.vat_note')}</p>
            </div>
            <div>
              <label htmlFor="pv-web" className={labelCls}>{t('providerVerify.website')}</label>
              <input id="pv-web" type="url" className="input" value={form.website} placeholder="https://" autoCapitalize="none"
                onChange={e => set('website', e.target.value)} />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-bold text-gray-900 dark:text-white mb-2">{t('providerVerify.experience')}</legend>
          <div>
            <label htmlFor="pv-years" className={labelCls}>{t('providerVerify.years')}</label>
            <input id="pv-years" inputMode="numeric" className="input sm:max-w-[200px]" value={form.years_experience}
              onChange={e => set('years_experience', e.target.value.replace(/[^0-9]/g, ''))} />
          </div>
          <div>
            <label htmlFor="pv-spec" className={labelCls}>{t('providerVerify.specialties')}</label>
            <input id="pv-spec" className="input" value={form.specializations}
              onChange={e => set('specializations', e.target.value)} />
            <p className={hintCls}>{t('providerVerify.specialties_hint')}</p>
          </div>
          <div>
            <label htmlFor="pv-bio" className={labelCls}>{t('providerVerify.about')}</label>
            <textarea id="pv-bio" rows={4} className="input" value={form.bio} placeholder={t('providerVerify.what_you_offer')}
              onChange={e => set('bio', e.target.value)} />
          </div>
        </fieldset>

        <button type="submit" disabled={!form.full_name.trim() || submit.isPending}
          className="btn-primary w-full py-3 text-sm disabled:opacity-60">
          {submit.isPending ? t('providerVerify.submitting') : t('providerVerify.submit')}
        </button>
      </form>
    </div>
  )
}
