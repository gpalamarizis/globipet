import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { RotateCcw, Package, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'
import { cn, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { dateLocale } from '@/lib/dates'

/**
 * Οι συνδρομές τροφής μου (Stripe, 12 μηνιαίες παραδόσεις).
 *
 * Η σελίδα συνδρομής έλεγε «Ακύρωση οποιαδήποτε στιγμή», αλλά καμία οθόνη
 * δεν καλούσε το POST /subscriptions/food/:id/cancel — ο χρήστης δεν είχε
 * τρόπο να σταματήσει τη χρέωση.
 *
 * ΤΙ ΚΑΝΕΙ Η ΑΚΥΡΩΣΗ (routes/subscriptions.ts)
 *   Άμεση ακύρωση στο Stripe, όχι στο τέλος της περιόδου: καμία νέα χρέωση.
 *   Δεν γίνεται επιστροφή· η παράδοση που έχει ήδη πληρωθεί είναι ήδη
 *   παραγγελία και αποστέλλεται κανονικά. Αυτό λέει και η επιβεβαίωση.
 *
 * Εδώ (στο Προφίλ) καταλήγει και η ειδοποίηση αποτυχημένης πληρωμής
 * (link '/profile' στο webhook).
 */

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  payment_failed: 'bg-red-100 text-red-700',
  paused: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-gray-100 text-gray-600',
  completed: 'bg-blue-100 text-blue-700',
}

export default function MySubscriptionsCard() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const { data: subs = [] } = useQuery({
    queryKey: ['my-food-subscriptions'],
    queryFn: () => api.get('/subscriptions/food/my').then(r => r.data?.data ?? []),
  })

  const cancel = useMutation({
    mutationFn: (id: string) => api.post(`/subscriptions/food/${id}/cancel`),
    onSuccess: () => {
      setConfirmId(null)
      qc.invalidateQueries({ queryKey: ['my-food-subscriptions'] })
      toast.success(t('mySubs.cancelledToast'))
    },
    onError: (e: any) => toast.error(e?.message || t('common.error')),
  })

  if (!subs.length) return null

  const fmtDate = (d?: string | null) => {
    if (!d) return ''
    const x = new Date(d)
    return isNaN(x.getTime()) ? '' : x.toLocaleDateString(dateLocale(i18n.language), { day: '2-digit', month: 'long', year: 'numeric' })
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <RotateCcw size={18} className="text-brand-900" />
        <h3 className="font-bold text-gray-900 dark:text-white">{t('mySubs.title')}</h3>
      </div>

      {subs.map((s: any) => {
        const total = s.deliveries_total ?? 12
        const canCancel = s.can_cancel ?? (s.status !== 'cancelled' && s.status !== 'completed')
        const confirming = confirmId === s.id
        return (
          <div key={s.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <div className="flex items-start gap-3">
              {s.product?.image_url
                ? <img src={s.product.image_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                : <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0"><Package size={18} className="text-gray-400" /></div>}
              <div className="flex-1 min-w-0">
                {s.product?.id
                  ? <Link to={`/marketplace/${s.product.id}`} className="font-medium text-gray-900 dark:text-white hover:underline block truncate">{s.product?.name}</Link>
                  : <p className="font-medium text-gray-900 dark:text-white truncate">{s.product?.name}</p>}
                <p className="text-sm text-gray-500">
                  {formatCurrency(Number(s.monthly_price ?? 0))} {t('pgSubscribe.perMonth')} · {t('mySubs.deliveries', { done: s.deliveries_completed ?? 0, total })}
                </p>
                {s.status === 'active' && s.next_delivery_date && (
                  <p className="text-xs text-gray-400 mt-0.5">{t('mySubs.nextCharge', { date: fmtDate(s.next_delivery_date) })}</p>
                )}
                {!canCancel && s.end_date && (
                  <p className="text-xs text-gray-400 mt-0.5">{t('mySubs.endedOn', { date: fmtDate(s.end_date) })}</p>
                )}
              </div>
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', STATUS_STYLE[s.status] || 'bg-gray-100 text-gray-600')}>
                {String(t(`mySubs.status_${s.status}`, { defaultValue: s.status }))}
              </span>
            </div>

            {s.status === 'payment_failed' && (
              <p className="text-xs text-red-600 flex items-start gap-1.5">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {t('mySubs.paymentFailedHint')}
              </p>
            )}

            {canCancel && (confirming ? (
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 space-y-3">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {t('mySubs.confirmText', { done: s.deliveries_completed ?? 0, total })}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmId(null)} disabled={cancel.isPending}
                    className="btn-ghost border border-gray-300 dark:border-gray-600 text-sm flex-1">
                    {t('mySubs.keep')}
                  </button>
                  <button onClick={() => cancel.mutate(s.id)} disabled={cancel.isPending}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl px-4 py-2 text-sm font-medium flex-1">
                    {cancel.isPending ? t('common.loading') : t('mySubs.confirmCancel')}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmId(s.id)} className="text-red-600 hover:text-red-700 text-sm font-medium">
                {t('mySubs.cancel')}
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}
