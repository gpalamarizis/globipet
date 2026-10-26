import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CreditCard, Receipt, FileText, Download, AlertTriangle, ChevronLeft, Info, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { fmtDateShort, dateLocale } from '@/lib/dates'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

/**
 * Ε18 — Πληρωμές και αποδεικτικά (/account/payments).
 *
 * · Τρόποι πληρωμής: POST /payments/billing-portal → Stripe Customer Portal
 *   (κάρτα και τιμολόγια συνδρομών). Στη Viva δεν αποθηκεύονται κάρτες.
 * · Ιστορικό: GET /payments/history (Viva: παραγγελίες, κρατήσεις,
 *   τηλεϊατρική, εκδηλώσεις · Stripe: τιμολόγια συνδρομών).
 * · Αποδεικτικό (Viva): POST /payments/receipt-link → βραχύβιος υπογεγραμμένος
 *   σύνδεσμος σε σελίδα HTML για εκτύπωση/PDF (ίδιο μοτίβο με τον ιατρικό φάκελο).
 */
type Kind = 'order' | 'booking' | 'telehealth' | 'event' | 'subscription'
interface Payment {
  id: string
  kind: Kind
  ref: string
  description: string | null
  amount: number
  currency: 'EUR'
  status: 'paid' | 'refunded' | 'partially_refunded'
  refunded_amount: number | null
  date: string
  receipt: boolean
  invoice_url: string | null
  invoice_pdf: string | null
}

const KIND_KEYS: Record<Kind, string> = {
  order: 'payments.kind_order',
  booking: 'payments.kind_booking',
  telehealth: 'payments.kind_telehealth',
  event: 'payments.kind_event',
  subscription: 'payments.kind_subscription',
}

/** Μόνο σύνδεσμοι https (του Stripe) γίνονται σύνδεσμοι — τίποτα javascript:/data:. */
const safeHttps = (u: string | null | undefined) => (u && /^https:\/\//i.test(u.trim()) ? u.trim() : null)

const fmtEur = (v: number, lang: string) => {
  try {
    return new Intl.NumberFormat(dateLocale(lang), { style: 'currency', currency: 'EUR' }).format(v)
  } catch {
    return `€${v.toFixed(2)}`
  }
}

/**
 * Σήμα κατάστασης + (πλήρης ή μερική επιστροφή) το ποσό επιστροφής όταν είναι
 * γνωστό (>0)· αλλιώς μόνο το σήμα. Ίδια συμπεριφορά με το κινητό (payments.tsx).
 */
function StatusBadge({ p }: { p: Payment }) {
  const { t, i18n } = useTranslation()
  if (p.status === 'refunded' || p.status === 'partially_refunded') {
    const amt = p.refunded_amount == null ? NaN : Number(p.refunded_amount)
    return (
      <>
        <span className={cn(p.status === 'refunded' ? 'badge-gray' : 'badge-orange', 'whitespace-nowrap')}>
          {t(p.status === 'refunded' ? 'payments.status_refunded' : 'payments.status_partially_refunded')}
        </span>
        {Number.isFinite(amt) && amt > 0 && (
          <p className="text-xs text-gray-500 mt-1 whitespace-nowrap tabular-nums">
            {t('payments.refundedAmount', { amount: fmtEur(amt, i18n.language) })}
          </p>
        )}
      </>
    )
  }
  return <span className="badge-green whitespace-nowrap">{t('payments.status_paid')}</span>
}

export default function PaymentsPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [receiptBusy, setReceiptBusy] = useState<string | null>(null)
  // Μετά το onSuccess η σελίδα φεύγει για το Stripe: το κουμπί μένει κλειδωμένο
  // ώσπου να φύγει. Επιστροφή με «Πίσω» από bfcache → ξεκλείδωμα.
  const [redirecting, setRedirecting] = useState(false)
  // Αποδεικτικό: κλείδωμα με ref (το state αργεί ένα render) — όπως το κινητό.
  const receiptLock = useRef(false)
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) setRedirecting(false) }
    window.addEventListener('pageshow', onShow)
    return () => window.removeEventListener('pageshow', onShow)
  }, [])

  const { data, isLoading, isError, refetch } = useQuery<{ data: Payment[]; stripe_ok: boolean }>({
    queryKey: ['payments-history'],
    queryFn: () => api.get('/payments/history').then(r => r.data),
  })
  const items: Payment[] = Array.isArray(data?.data) ? data!.data : []
  const stripeOk = data?.stripe_ok !== false

  const portal = useMutation({
    mutationFn: () => api.post('/payments/billing-portal', {}).then(r => r.data?.data),
    onSuccess: (d) => {
      if (d?.url) { setRedirecting(true); window.location.href = d.url }
      else toast.error(t('payments.portalError'))
    },
    onError: (e: any) => {
      const code = e?.response?.data?.code
      toast.error(code === 'no_stripe_customer' ? t('payments.noStripeCustomer')
        : e?.response?.status === 503 ? t('payments.portalUnavailable')
        : (e?.response?.data?.message || t('payments.portalError')))
    },
  })

  /**
   * Η καρτέλα ανοίγει ΑΜΕΣΩΣ στο κλικ (αλλιώς ο browser τη μπλοκάρει ως
   * αναδυόμενο, γιατί ο σύνδεσμος έρχεται μετά από αίτημα) και χωρίς opener —
   * ίδιο μοτίβο με την εξαγωγή του ιατρικού φακέλου (PetPassport).
   */
  const openReceipt = async (p: Payment) => {
    if (receiptLock.current) return
    receiptLock.current = true
    const sep = p.id.indexOf(':')
    const rawId = sep >= 0 ? p.id.slice(sep + 1) : p.id
    setReceiptBusy(p.id)
    const w = window.open('', '_blank')
    if (w) w.opener = null
    try {
      const { data: r } = await api.post('/payments/receipt-link', { kind: p.kind, id: rawId })
      const url = r?.path ? `${api.defaults.baseURL || ''}${r.path}` : r?.url
      if (!url) throw new Error('no url')
      if (w) w.location.href = url
      else window.location.assign(url)
    } catch (e: any) {
      w?.close()
      toast.error(e?.response?.status === 404 ? t('payments.receiptNotFound') : t('payments.receiptError'))
    } finally {
      receiptLock.current = false
      setReceiptBusy(null)
    }
  }

  const Actions = ({ p, className }: { p: Payment; className?: string }) => {
    const inv = safeHttps(p.invoice_url)
    const pdf = safeHttps(p.invoice_pdf)
    if (!p.receipt && !inv && !pdf) return <span className="text-xs text-gray-400">—</span>
    const linkCls = 'inline-flex items-center gap-1 text-sm font-medium text-brand-900 dark:text-brand-400 hover:underline whitespace-nowrap'
    return (
      <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1', className)}>
        {p.receipt && (
          <button type="button" onClick={() => openReceipt(p)} disabled={!!receiptBusy}
            className={cn(linkCls, 'disabled:opacity-50')}>
            <Receipt size={14} aria-hidden="true" />
            {receiptBusy === p.id ? t('common.loading') : t('payments.receipt')}
          </button>
        )}
        {inv && (
          <a href={inv} target="_blank" rel="noopener noreferrer" className={linkCls}>
            <FileText size={14} aria-hidden="true" />{t('payments.invoice')}
          </a>
        )}
        {pdf && (
          <a href={pdf} target="_blank" rel="noopener noreferrer" className={linkCls}>
            <Download size={14} aria-hidden="true" />{t('payments.pdf')}
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="page-container py-8 pb-24 lg:pb-8 max-w-4xl mx-auto">
      <Link to="/profile" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4">
        <ChevronLeft size={16} aria-hidden="true" />{t('payments.backToAccount')}
      </Link>
      <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-6">{t('payments.title')}</h1>

      {/* Τρόποι πληρωμής */}
      <section aria-labelledby="pm-title" className="card p-5 mb-8">
        <div className="flex items-center gap-2 mb-2">
          <CreditCard size={18} className="text-brand-900 dark:text-brand-400 shrink-0" aria-hidden="true" />
          <h2 id="pm-title" className="font-bold text-gray-900 dark:text-white">{t('payments.methodsTitle')}</h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('payments.methodsText')}</p>
        <button onClick={() => { if (!portal.isPending && !redirecting) portal.mutate() }}
          disabled={portal.isPending || redirecting}
          className="btn-primary text-sm inline-flex items-center gap-2">
          <ExternalLink size={16} aria-hidden="true" />
          {portal.isPending || redirecting ? t('payments.redirecting') : t('payments.manageCard')}
        </button>
        <p className="text-xs text-gray-500 mt-4 flex items-start gap-1.5">
          <Info size={14} className="shrink-0 mt-px" aria-hidden="true" />
          <span>{t('payments.vivaNote')}</span>
        </p>
      </section>

      {/* Ιστορικό πληρωμών */}
      <section aria-labelledby="ph-title">
        <h2 id="ph-title" className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('payments.historyTitle')}</h2>

        {!isLoading && !isError && !stripeOk && (
          <div className="card p-3 mb-3 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-px" aria-hidden="true" />
            <p className="text-xs text-amber-800 dark:text-amber-300">{t('payments.stripeWarning')}</p>
          </div>
        )}

        {isLoading ? (
          <div className="card p-10 flex justify-center"><LoadingSpinner /></div>
        ) : isError ? (
          <div className="card p-6 text-center space-y-3">
            <p className="text-sm text-gray-700 dark:text-gray-300">{t('payments.loadError')}</p>
            <button onClick={() => refetch()} className="btn-secondary text-sm">{t('payments.retry')}</button>
          </div>
        ) : items.length === 0 ? (
          <div className="card p-10 text-center">
            <Receipt size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" aria-hidden="true" />
            <p className="font-semibold text-gray-900 dark:text-white mb-1">{t('payments.emptyTitle')}</p>
            <p className="text-sm text-gray-500">{t('payments.emptyText')}</p>
          </div>
        ) : (
          <>
            {/* Πίνακας (από md και πάνω) */}
            <div className="card hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-100 dark:border-gray-800">
                    <th scope="col" className="px-4 py-3 font-semibold">{t('payments.colDate')}</th>
                    <th scope="col" className="px-4 py-3 font-semibold">{t('payments.colItem')}</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">{t('payments.colAmount')}</th>
                    <th scope="col" className="px-4 py-3 font-semibold">{t('payments.colStatus')}</th>
                    <th scope="col" className="px-4 py-3 font-semibold">{t('payments.colActions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {items.map(p => (
                    <tr key={p.id} className="align-middle">
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap tabular-nums">{fmtDateShort(p.date, lang)}</td>
                      <td className="px-4 py-3 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white">{t(KIND_KEYS[p.kind] ?? 'payments.kind_other')}</p>
                        <p className="text-xs text-gray-500 mt-0.5 break-words">
                          {[p.description, p.ref ? `#${p.ref}` : ''].filter(Boolean).join(' · ')}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white whitespace-nowrap tabular-nums">{fmtEur(Number(p.amount) || 0, lang)}</td>
                      <td className="px-4 py-3"><StatusBadge p={p} /></td>
                      <td className="px-4 py-3"><Actions p={p} className="flex-nowrap" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Κάρτες (κινητό) */}
            <div className="md:hidden space-y-3">
              {items.map(p => (
                <div key={p.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{t(KIND_KEYS[p.kind] ?? 'payments.kind_other')}</p>
                      {p.description && <p className="text-xs text-gray-500 mt-0.5 break-words">{p.description}</p>}
                      <p className="text-xs text-gray-400 mt-0.5 tabular-nums">
                        {[fmtDateShort(p.date, lang), p.ref ? `#${p.ref}` : ''].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{fmtEur(Number(p.amount) || 0, lang)}</p>
                      <div className="mt-1"><StatusBadge p={p} /></div>
                    </div>
                  </div>
                  {(p.receipt || safeHttps(p.invoice_url) || safeHttps(p.invoice_pdf)) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <Actions p={p} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">{t('payments.receiptNote')}</p>
          </>
        )}
      </section>
    </div>
  )
}
