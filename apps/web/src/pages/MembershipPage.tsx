import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Crown, Sparkles, Gauge, Award, LifeBuoy, AlertTriangle, CheckCircle2, Info, CreditCard, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import { fmtDateShort, dateLocale } from '@/lib/dates'
import LoadingScreen from '@/components/ui/LoadingScreen'

/**
 * Ε18 — GlobiPet Plus: δημόσια σελίδα της συνδρομής μέλους.
 *
 * Όλα τα νούμερα (τιμές, πολλαπλασιαστής πόντων, ημερήσιο όριο AI, έκπτωση
 * επιπέδου) έρχονται από το GET /membership — ο admin τα αλλάζει χωρίς νέα
 * έκδοση. Αγορά: POST /membership/checkout → Stripe. Ακύρωση: το ΥΠΑΡΧΟΝ
 * POST /ai-subscriptions/cancel (ίδιο με τη σελίδα Τιμών).
 */
export interface MembershipInfo {
  available: boolean
  plan: { id: string; name: string; price_monthly: number; price_annual: number | null; currency: 'EUR' } | null
  benefits: { points_multiplier: number; ai_daily_limit: number; ai_daily_limit_standard: number }
  tier_discount_percent: number
  me: null | {
    status: 'none' | 'trial' | 'member' | 'payment_failed' | 'other_ai_plan'
    current_period_end: string | null
    can_cancel: boolean
    other_plan_name: string | null
  }
}

/** Κοινό πρόθεμα κλειδιού με τον Λογαριασμό και τη σελίδα Τιμών (['membership', userId]). */
const MEMBERSHIP_QUERY_KEY = ['membership'] as const

/** Ποσό σε € στη μορφή της γλώσσας (π.χ. 4,99 €). */
const fmtEur = (v: number, lang: string) => {
  try {
    return new Intl.NumberFormat(dateLocale(lang), { style: 'currency', currency: 'EUR' }).format(v)
  } catch {
    return `€${v.toFixed(2)}`
  }
}
/** Αριθμός στη μορφή της γλώσσας (π.χ. 1,5). */
const fmtNum = (v: number, lang: string) => {
  try { return new Intl.NumberFormat(dateLocale(lang), { maximumFractionDigits: 2 }).format(v) } catch { return String(v) }
}

export default function MembershipPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated, user } = useAuthStore()
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [confirming, setConfirming] = useState(false)
  // Μετά το onSuccess η σελίδα φεύγει για το Stripe: τα κουμπιά μένουν κλειδωμένα
  // ώσπου να φύγει (όχι διπλό checkout/portal). Επιστροφή με «Πίσω» από bfcache → ξεκλείδωμα.
  const [redirecting, setRedirecting] = useState(false)
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) setRedirecting(false) }
    window.addEventListener('pageshow', onShow)
    return () => window.removeEventListener('pageshow', onShow)
  }, [])

  const { data: info, isLoading, isError, refetch } = useQuery<MembershipInfo>({
    // Ο χρήστης στο κλειδί: μετά από σύνδεση/αποσύνδεση το «me» ξαναζητείται.
    queryKey: [...MEMBERSHIP_QUERY_KEY, user?.id ?? 'anon'],
    queryFn: () => api.get('/membership').then(r => r.data?.data),
  })

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: MEMBERSHIP_QUERY_KEY })
    qc.invalidateQueries({ queryKey: ['ai-subscription-status'] })
  }

  // Επιστροφή από το Stripe: μήνυμα, ανανέωση (και ξανά σε λίγο — το webhook
  // μπορεί να φτάσει μετά την επιστροφή) και καθάρισμα της παραμέτρου.
  useEffect(() => {
    const st = searchParams.get('checkout')
    if (st !== 'success' && st !== 'cancelled') return
    if (st === 'success') toast.success(t('membership.checkoutSuccess'), { id: 'membership-checkout' })
    else toast(t('membership.checkoutCancelled'), { id: 'membership-checkout' })
    refreshAll()
    const again = st === 'success' ? setTimeout(refreshAll, 5000) : undefined
    const next = new URLSearchParams(searchParams)
    next.delete('checkout')
    setSearchParams(next, { replace: true })
    return () => { if (again) clearTimeout(again) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Χωρίς ετήσια τιμή → μόνο μηνιαία.
  useEffect(() => {
    if (billing === 'annual' && info && !info.plan?.price_annual) setBilling('monthly')
  }, [info, billing])

  const checkout = useMutation({
    mutationFn: (b: 'monthly' | 'annual') =>
      api.post('/membership/checkout', { billing: b }).then(r => r.data?.data),
    onSuccess: (data) => {
      if (data?.checkout_url) { setRedirecting(true); window.location.href = data.checkout_url }
      else toast.error(t('membership.checkoutError'))
    },
    onError: (err: any) => {
      // 409: ο server εξηγεί (ήδη μέλος / άλλο πλάνο AI / εκκρεμής πληρωμή).
      toast.error(err?.response?.data?.message || err?.message || t('membership.checkoutError'))
      if (err?.response?.status === 409) refreshAll()
    },
  })

  const cancel = useMutation({
    mutationFn: () => api.post('/ai-subscriptions/cancel', {}),
    onSuccess: () => {
      setConfirming(false)
      refreshAll()
      toast.success(t('membership.cancelledToast'))
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || t('common.error')),
  })

  const portal = useMutation({
    mutationFn: () => api.post('/payments/billing-portal', {}).then(r => r.data?.data),
    onSuccess: (data) => {
      if (data?.url) { setRedirecting(true); window.location.href = data.url }
      else toast.error(t('payments.portalError'))
    },
    onError: (e: any) => {
      const code = e?.response?.data?.code
      toast.error(code === 'no_stripe_customer' ? t('payments.noStripeCustomer')
        : e?.response?.status === 503 ? t('payments.portalUnavailable')
        : (e?.response?.data?.message || t('payments.portalError')))
    },
  })

  const buy = () => {
    if (redirecting || checkout.isPending) return
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent('/membership')}`)
      return
    }
    // Η περίοδος που φαίνεται: ετήσια μόνο αν υπάρχει ετήσια τιμή.
    checkout.mutate(billing === 'annual' && info?.plan?.price_annual ? 'annual' : 'monthly')
  }
  const openPortal = () => {
    if (redirecting || portal.isPending) return
    portal.mutate()
  }

  if (isLoading) return <LoadingScreen />

  const plan = info?.plan ?? null
  const benefits = info?.benefits
  const me = info?.me ?? null
  const status = me?.status ?? 'none'
  const tierPct = Math.max(0, Math.min(100, Number(info?.tier_discount_percent) || 0))
  const hasAnnual = !!plan?.price_annual
  const annualSaving = plan && plan.price_annual
    ? Math.round((1 - plan.price_annual / (plan.price_monthly * 12)) * 100)
    : 0
  const base = plan ? (billing === 'annual' && plan.price_annual ? plan.price_annual : plan.price_monthly) : 0
  /** Τιμή πρώτης περιόδου μετά την έκπτωση επιπέδου, στο λεπτό (όπως το Stripe). */
  const firstPeriod = Math.round(base * (100 - tierPct)) / 100
  const perLabel = billing === 'annual' && hasAnnual ? t('membership.perYear') : t('membership.perMonth')
  const canBuy = !!info?.available && !!plan && (status === 'none' || status === 'trial')
  // Μέλος (και με αποτυχημένη πληρωμή): βλέπει τα οφέλη και ΟΧΙ «Σύντομα διαθέσιμο»,
  // ακόμα κι αν ο admin απενεργοποίησε το πλάνο για νέα μέλη — όπως το κινητό.
  const isMember = status === 'member' || status === 'payment_failed'

  const benefitCards = benefits ? [
    { icon: Sparkles, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
      title: t('membership.benefitAiTitle'), desc: t('membership.benefitAiDesc') },
    { icon: Gauge, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
      title: t('membership.benefitLimitTitle', { limit: benefits.ai_daily_limit }),
      desc: t('membership.benefitLimitDesc', { limit: benefits.ai_daily_limit, standard: benefits.ai_daily_limit_standard }) },
    { icon: Award, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
      title: t('membership.benefitPointsTitle', { mult: fmtNum(benefits.points_multiplier, lang) }),
      desc: t('membership.benefitPointsDesc', { mult: fmtNum(benefits.points_multiplier, lang) }) },
    { icon: LifeBuoy, color: 'text-green-600 bg-green-50 dark:bg-green-900/20',
      title: t('membership.benefitSupportTitle'), desc: t('membership.benefitSupportDesc') },
  ] : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Ήρωας */}
      <section className="max-w-4xl mx-auto px-4 pt-16 pb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-900 text-white text-xs font-bold px-4 py-1.5 rounded-full mb-4">
          <Crown size={14} aria-hidden="true" /> {t('membership.badge')}
        </div>
        <h1 className="text-4xl lg:text-5xl font-display font-black text-gray-900 dark:text-white mb-4 break-words">
          {plan?.name || t('membership.defaultName')}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          {t('membership.subtitle')}
        </p>
      </section>

      {isError && (
        <section className="max-w-xl mx-auto px-4 pb-8">
          <div className="card p-5 text-center space-y-3">
            <p className="text-sm text-gray-700 dark:text-gray-300">{t('membership.loadError')}</p>
            <button onClick={() => refetch()} className="btn-secondary text-sm">{t('membership.retry')}</button>
          </div>
        </section>
      )}

      {/* Κατάσταση μέλους */}
      {status === 'member' && (
        <section className="max-w-xl mx-auto px-4 pb-8">
          <div className="card p-5 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={20} className="text-green-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">{t('membership.memberTitle', { name: plan?.name || t('membership.defaultName') })}</p>
                {me?.current_period_end && (
                  <p className="text-sm text-gray-500 mt-0.5">{t('membership.renews', { date: fmtDateShort(me.current_period_end, lang) })}</p>
                )}
              </div>
              <span className="badge-green shrink-0">{t('membership.statusActive')}</span>
            </div>
            {me?.can_cancel && (confirming ? (
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 space-y-3">
                <p className="text-sm text-gray-700 dark:text-gray-300">{t('membership.cancelConfirm')}</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirming(false)} disabled={cancel.isPending}
                    className="btn-ghost border border-gray-300 dark:border-gray-600 text-sm flex-1">
                    {t('membership.keep')}
                  </button>
                  <button onClick={() => cancel.mutate()} disabled={cancel.isPending}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl px-4 py-2 text-sm font-medium flex-1">
                    {cancel.isPending ? t('common.loading') : t('membership.confirmCancel')}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirming(true)} className="text-red-600 hover:text-red-700 text-sm font-medium">
                {t('membership.cancel')}
              </button>
            ))}
          </div>
        </section>
      )}

      {status === 'payment_failed' && (
        <section className="max-w-xl mx-auto px-4 pb-8">
          <div className="card p-5 space-y-3 border-red-200 dark:border-red-900/40">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">{t('membership.paymentFailedTitle')}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{t('membership.paymentFailedText')}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={openPortal} disabled={portal.isPending || redirecting}
                className="btn-primary text-sm inline-flex items-center gap-2">
                <CreditCard size={16} aria-hidden="true" />
                {portal.isPending || redirecting ? t('membership.redirecting') : t('membership.manageCard')}
              </button>
              {me?.can_cancel && !confirming && (
                <button onClick={() => setConfirming(true)} className="text-red-600 hover:text-red-700 text-sm font-medium">
                  {t('membership.cancel')}
                </button>
              )}
            </div>
            {me?.can_cancel && confirming && (
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 space-y-3">
                <p className="text-sm text-gray-700 dark:text-gray-300">{t('membership.cancelConfirm')}</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirming(false)} disabled={cancel.isPending}
                    className="btn-ghost border border-gray-300 dark:border-gray-600 text-sm flex-1">
                    {t('membership.keep')}
                  </button>
                  <button onClick={() => cancel.mutate()} disabled={cancel.isPending}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl px-4 py-2 text-sm font-medium flex-1">
                    {cancel.isPending ? t('common.loading') : t('membership.confirmCancel')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Όπως το κινητό: πάντα όταν υπάρχει άλλο ενεργό πλάνο AI (και αν το Plus δεν διατίθεται). */}
      {status === 'other_ai_plan' && (
        <section className="max-w-xl mx-auto px-4 pb-8">
          <div className="card p-5 flex items-start gap-3">
            <Info size={20} className="text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0 space-y-2">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {me?.other_plan_name
                  ? t('membership.otherPlanText', { plan: me.other_plan_name })
                  : t('membership.otherPlanTextNoName')}
              </p>
              <Link to="/pricing" className="inline-block text-sm font-medium text-brand-900 dark:text-brand-400 underline">
                {t('membership.otherPlanLink')}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Οφέλη */}
      {benefitCards.length > 0 && (info?.available || isMember) && (
        <section className="max-w-4xl mx-auto px-4 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {benefitCards.map((b, i) => (
              <div key={i} className="card p-5 flex items-start gap-4">
                <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center shrink-0', b.color)}>
                  <b.icon size={20} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-gray-900 dark:text-white">{b.title}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Μη διαθέσιμο */}
      {info && !info.available && !isMember && (
        <section className="max-w-xl mx-auto px-4 pb-16">
          <div className="card p-8 text-center">
            <Clock size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" aria-hidden="true" />
            <p className="font-semibold text-gray-900 dark:text-white mb-1">{t('membership.comingSoon')}</p>
            <p className="text-sm text-gray-500">{t('membership.comingSoonText')}</p>
          </div>
        </section>
      )}

      {/* Αγορά */}
      {canBuy && plan && (
        <section className="max-w-md mx-auto px-4 pb-16">
          <div className="card p-6 ring-2 ring-brand-900 shadow-lg">
            {status === 'trial' && (
              <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 mb-4">
                {t('membership.trialNote')}
              </p>
            )}

            {hasAnnual && (
              <div className="flex justify-center mb-5">
                <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1" role="group" aria-label={t('membership.billingLabel')}>
                  <button onClick={() => setBilling('monthly')} aria-pressed={billing === 'monthly'}
                    className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
                      billing === 'monthly' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500')}>
                    {t('membership.monthly')}
                  </button>
                  <button onClick={() => setBilling('annual')} aria-pressed={billing === 'annual'}
                    className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all inline-flex items-center gap-1',
                      billing === 'annual' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500')}>
                    {t('membership.annual')}
                    {annualSaving > 0 && (
                      <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        −{annualSaving}%
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="text-center mb-5">
              {tierPct > 0 && (
                <p className="text-sm text-gray-400 flex items-center justify-center gap-2">
                  <span className="line-through">{fmtEur(base, lang)}</span>
                  <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">−{tierPct}%</span>
                </p>
              )}
              <p className="text-4xl font-black text-brand-900 dark:text-brand-400">
                {fmtEur(tierPct > 0 ? firstPeriod : base, lang)}
                <span className="text-sm font-normal text-gray-500"> / {perLabel}</span>
              </p>
              {billing === 'annual' && hasAnnual && (
                <p className="text-xs text-gray-400 mt-1">{t('membership.annualPerMonth', { amount: fmtEur(Math.round(base / 12 * 100) / 100, lang) })}</p>
              )}
              {tierPct > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  {t(billing === 'annual' && hasAnnual ? 'membership.tierDiscountYear' : 'membership.tierDiscountMonth',
                    { percent: tierPct, price: fmtEur(base, lang) })}
                </p>
              )}
            </div>

            <button onClick={buy} disabled={checkout.isPending || redirecting}
              className="w-full btn-primary flex items-center justify-center gap-2">
              <Crown size={16} aria-hidden="true" />
              {checkout.isPending || redirecting ? t('membership.redirecting')
                : isAuthenticated ? t('membership.join') : t('membership.loginToJoin')}
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">{t('membership.secureNote')}</p>
          </div>
        </section>
      )}

      {/* Μέλος / άλλη κατάσταση: απλώς απόσταση στο τέλος */}
      {!canBuy && (info?.available || isMember) && <div className="pb-8" />}
    </div>
  )
}
