import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { RotateCcw, Search, CheckCircle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

/**
 * Αποτυχημένες / κολλημένες επιστροφές χρημάτων (GET /admin/refunds/pending).
 *
 *   «Έλεγχος στη Viva»         → ?check=1, κατάσταση κάθε συναλλαγής (statusId)
 *   «Ξαναδοκίμασε επιστροφή»   → POST /admin/refunds/retry (μόνο εγγραφές εκδηλώσεων σε refund_failed),
 *                                 με επιβεβαίωση του ποσού
 *   «Σήμανση ως λυμένο»        → POST /admin/refunds/resolve με υποχρεωτική σημείωση (καμία κλήση στη Viva)
 */

type Item = {
  kind: 'event_registration' | 'booking' | 'telehealth' | 'order' | 'audit'
  id: string
  resource: string
  resource_id: string
  status: string | null
  email: string | null
  amount: number | null
  transaction_id: string | null
  date: string
  reason: string | null
  last_error: string | null
  action: string | null
  attempts: number
  title: string | null
  can_retry: boolean
  viva_status?: string | null
  requested_amount?: number | null
}

const KNOWN_REASONS = ['full', 'cancelled', 'event_cancelled', 'booking_cancel', 'telehealth_cancel', 'admin_refund']
const KNOWN_VIVA = ['F', 'R', 'E', 'A', 'X', 'error', 'unknown']
const KNOWN_RESOURCES = ['event_registration', 'booking', 'telehealth', 'order', 'product_subscription']
const KNOWN_STATUSES = ['refund_failed', 'refunding']

const VIVA_CLS: Record<string, string> = {
  R: 'bg-green-100 text-green-700',
  F: 'bg-amber-100 text-amber-700',
  E: 'bg-red-100 text-red-700',
  error: 'bg-red-100 text-red-700',
}

export default function AdminRefundsPage() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const [check, setCheck] = useState(false)
  const [retrying, setRetrying] = useState<Item | null>(null)
  const [resolving, setResolving] = useState<Item | null>(null)
  const [note, setNote] = useState('')
  const [refundAmount, setRefundAmount] = useState('')

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-refunds', check],
    queryFn: () => api.get('/admin/refunds/pending', { params: check ? { check: 1 } : {} }).then(r => r.data),
  })
  const rows: Item[] = data?.data ?? []

  const money = (n: number | null) => n === null || n === undefined
    ? '—'
    : new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'EUR' }).format(n)
  const when = (iso: string) => new Date(iso).toLocaleString(i18n.language, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const kindLabel = (r: Item) => r.kind === 'audit' || r.kind === 'order'
    ? (KNOWN_RESOURCES.includes(r.resource) ? t(`adminRefunds.res_${r.resource}`) : r.resource)
    : t(`adminRefunds.kind_${r.kind}`)
  const reasonLabel = (r: Item) => !r.reason ? '—'
    : KNOWN_REASONS.includes(r.reason) ? t(`adminRefunds.reason_${r.reason}`) : r.reason
  // Επιστροφή admin ή ακύρωση (κράτηση/τηλεϊατρική) που έμεινε σε εξέλιξη:
  // προεπιλογή το ποσό που ζητήθηκε τότε (requested_amount του server).
  const hasRequested = (r: Item) => r.reason === 'admin_refund' || (r.requested_amount !== null && r.requested_amount !== undefined)
  const resolveAmount = (r: Item): number | null =>
    hasRequested(r) ? (r.requested_amount ?? r.amount) : r.amount
  const vivaLabel = (s: string) => KNOWN_VIVA.includes(s) ? t(`adminRefunds.viva_${s}`) : s

  const done = () => {
    qc.invalidateQueries({ queryKey: ['admin-refunds'] })
    qc.invalidateQueries({ queryKey: ['admin-refunds-count'] })
  }

  const retry = useMutation({
    mutationFn: (r: Item) => api.post('/admin/refunds/retry', { kind: r.kind, id: r.id, amount: r.amount }).then(x => x.data),
    onSuccess: (res: any) => {
      setRetrying(null)
      done()
      toast.success(res?.already ? t('adminRefunds.retryAlready') : t('adminRefunds.retryDone'))
    },
    onError: (err: any) => {
      done()
      toast.error(err?.message || t('adminRefunds.error'))
    },
  })

  const resolve = useMutation({
    mutationFn: (r: Item) => api.post('/admin/refunds/resolve', {
      kind: r.kind, id: r.id, note: note.trim(),
      ...((r.kind === 'booking' || r.kind === 'telehealth' || r.kind === 'order') && refundAmount.trim() !== ''
        ? { refund_amount: Number(refundAmount.replace(',', '.')) } : {}),
    }).then(x => x.data),
    onSuccess: () => {
      setResolving(null)
      setNote('')
      setRefundAmount('')
      done()
      toast.success(t('adminRefunds.resolveDone'))
    },
    onError: (err: any) => toast.error(err?.message || t('adminRefunds.error')),
  })

  const noteOk = note.trim().length >= 3

  return (
    <div className="page-container py-6">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
            <RotateCcw size={20} className="text-brand-900 dark:text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
              {t('adminRefunds.title')}
            </h1>
            <p className="text-sm text-gray-500">
              {t('adminRefunds.subtitle', { count: data?.count ?? 0 })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => done()} disabled={isFetching}
            className="btn-secondary text-sm inline-flex items-center gap-1.5">
            <RefreshCw size={14} className={cn(isFetching && 'animate-spin')} /> {t('adminRefunds.refresh')}
          </button>
          <button onClick={() => { if (check) done(); else setCheck(true) }} disabled={isFetching}
            className="btn-primary border border-transparent text-sm inline-flex items-center gap-1.5">
            <Search size={14} /> {isFetching && check ? t('adminRefunds.checking') : t('adminRefunds.checkViva')}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center"><LoadingSpinner /></div>
      ) : rows.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500">{t('adminRefunds.empty')}</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 font-semibold align-middle">{t('adminRefunds.col_type')}</th>
                <th className="px-4 py-3 font-semibold align-middle">{t('adminRefunds.col_user')}</th>
                <th className="px-4 py-3 font-semibold align-middle text-right">{t('adminRefunds.col_amount')}</th>
                <th className="px-4 py-3 font-semibold align-middle">{t('adminRefunds.col_txn')}</th>
                <th className="px-4 py-3 font-semibold align-middle">{t('adminRefunds.col_date')}</th>
                <th className="px-4 py-3 font-semibold align-middle">{t('adminRefunds.col_reason')}</th>
                <th className="px-4 py-3 font-semibold align-middle">{t('adminRefunds.col_error')}</th>
                {check && <th className="px-4 py-3 font-semibold align-middle">{t('adminRefunds.col_viva')}</th>}
                <th className="px-4 py-3 font-semibold align-middle text-right">{t('adminRefunds.col_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={`${r.kind}-${r.id}`} className="border-b border-gray-50 dark:border-gray-800/60 last:border-0">
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-gray-900 dark:text-white whitespace-nowrap">{kindLabel(r)}</div>
                    {r.title && <div className="text-xs text-gray-500 max-w-[14rem] truncate" title={r.title}>{r.title}</div>}
                    {r.status && (
                      <span className="badge text-xs mt-1 bg-red-50 text-red-700">
                        {KNOWN_STATUSES.includes(r.status) ? t(`adminRefunds.status_${r.status}`) : r.status}
                      </span>
                    )}
                    {r.attempts > 1 && (
                      <div className="text-xs text-gray-400 mt-1">{t('adminRefunds.attempts', { count: r.attempts })}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-gray-700 dark:text-gray-300 break-all">{r.email ?? '—'}</td>
                  <td className="px-4 py-3 align-top text-right font-semibold text-gray-900 dark:text-white whitespace-nowrap">{money(r.amount)}</td>
                  <td className="px-4 py-3 align-top font-mono text-xs text-gray-500 break-all max-w-[12rem]">{r.transaction_id ?? '—'}</td>
                  <td className="px-4 py-3 align-top text-gray-500 whitespace-nowrap">{when(r.date)}</td>
                  <td className="px-4 py-3 align-top text-gray-700 dark:text-gray-300">{reasonLabel(r)}</td>
                  <td className="px-4 py-3 align-top text-xs text-red-600 dark:text-red-400 max-w-[16rem] break-words">{r.last_error ?? '—'}</td>
                  {check && (
                    <td className="px-4 py-3 align-top">
                      {r.viva_status
                        ? <span className={cn('badge text-xs', VIVA_CLS[r.viva_status] ?? 'bg-gray-100 text-gray-700')}>{vivaLabel(r.viva_status)}</span>
                        : <span className="text-gray-400">—</span>}
                    </td>
                  )}
                  <td className="px-4 py-3 align-top">
                    <div className="flex justify-end gap-2">
                      {r.can_retry && (
                        <button onClick={() => setRetrying(r)}
                          className="btn-primary border border-transparent text-xs whitespace-nowrap inline-flex items-center gap-1">
                          <RotateCcw size={12} /> {t('adminRefunds.retry')}
                        </button>
                      )}
                      <button onClick={() => { setResolving(r); setNote(''); setRefundAmount('') }}
                        className="btn-secondary text-xs whitespace-nowrap inline-flex items-center gap-1">
                        <CheckCircle size={12} /> {t('adminRefunds.resolve')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {retrying && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => !retry.isPending && setRetrying(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-gray-900 dark:text-white mb-2">{t('adminRefunds.retryTitle')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('adminRefunds.retryConfirm', { amount: money(retrying.amount), email: retrying.email ?? '—' })}
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setRetrying(null)} disabled={retry.isPending} className="btn-secondary text-sm">
                {t('adminRefunds.cancel')}
              </button>
              <button onClick={() => retry.mutate(retrying)} disabled={retry.isPending} className="btn-primary border border-transparent text-sm">
                {retry.isPending ? t('adminRefunds.sending') : t('adminRefunds.retryAction', { amount: money(retrying.amount) })}
              </button>
            </div>
          </div>
        </div>
      )}

      {resolving && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => !resolve.isPending && setResolving(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-gray-900 dark:text-white mb-1">{t('adminRefunds.resolveTitle')}</h2>
            <p className="text-sm text-gray-500 mb-4">{t('adminRefunds.resolveHint')}</p>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={4}
              placeholder={t('adminRefunds.notePh')} className="input w-full" />
            {(resolving.kind === 'booking' || resolving.kind === 'telehealth' || resolving.kind === 'order') && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('adminRefunds.refundAmount')}
                </label>
                <input type="text" inputMode="decimal" value={refundAmount}
                  onChange={e => setRefundAmount(e.target.value)}
                  placeholder={resolveAmount(resolving) !== null ? String(resolveAmount(resolving)) : ''}
                  className="input w-full" />
                <p className="text-xs text-gray-400 mt-1">{hasRequested(resolving)
                  ? t('adminRefunds.refundAmountHintAdmin', { amount: money(resolveAmount(resolving)) })
                  : t('adminRefunds.refundAmountHint', { amount: money(resolving.amount) })}</p>
              </div>
            )}
            {!noteOk && note.length > 0 && (
              <p className="text-xs text-red-600 mt-2">{t('adminRefunds.noteRequired')}</p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setResolving(null)} disabled={resolve.isPending} className="btn-secondary text-sm">
                {t('adminRefunds.cancel')}
              </button>
              <button onClick={() => resolve.mutate(resolving)} disabled={resolve.isPending || !noteOk} className="btn-primary border border-transparent text-sm">
                {resolve.isPending ? t('adminRefunds.sending') : t('adminRefunds.resolve')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
