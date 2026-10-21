import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { UserX, CheckCircle, RefreshCw, Undo2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

/**
 * Ε15 — Αιτήματα διαγραφής λογαριασμού (GET /admin/deletion-requests).
 *
 *   kind 'under_age'    → ο λογαριασμός έκλεισε γιατί δηλώθηκε ηλικία κάτω των
 *                         15· σβήνεται στην ημερομηνία διαγραφής. «Ακύρωση
 *                         αιτήματος» (POST /admin/deletion-requests/:id/cancel,
 *                         με υποχρεωτική σημείωση) τον ξανανοίγει — ο χρήστης
 *                         ξαναδηλώνει ημερομηνία γέννησης στη σύνδεση.
 *   kind 'user_request' → αίτημα του ίδιου του χρήστη (30 ημέρες): μόνο ενημέρωση.
 *   status 'failed'     → η διαγραφή απέτυχε στη μέση: μόνο ενημέρωση.
 *   status 'executing'  → η διαγραφή τρέχει τώρα ή διακόπηκε στη μέση: μόνο ενημέρωση.
 *   also_user_request → under_age που είχε ήδη και αίτημα του ίδιου του χρήστη:
 *                         δεν ακυρώνεται (ο χρήστης ζήτησε διαγραφή).
 */

type Row = {
  id: string
  kind: 'under_age' | 'user_request'
  status: 'pending' | 'failed' | 'executing'
  scheduled_for: string
  created_at: string
  user_id: string | null
  email: string | null
  full_name: string | null
  role: string | null
  also_user_request: boolean
  can_cancel: boolean
}

export default function AdminDeletionRequestsPage() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const [cancelling, setCancelling] = useState<Row | null>(null)
  const [note, setNote] = useState('')

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-deletion-requests'],
    queryFn: () => api.get('/admin/deletion-requests').then(r => r.data),
  })
  const rows: Row[] = data?.data ?? []

  const day = (iso: string) => new Date(iso).toLocaleDateString(i18n.language, {
    day: '2-digit', month: 'short', year: 'numeric',
  })
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-deletion-requests'] })

  const cancel = useMutation({
    mutationFn: (r: Row) => api.post(`/admin/deletion-requests/${encodeURIComponent(r.id)}/cancel`, { note: note.trim() }).then(x => x.data),
    onSuccess: () => {
      setCancelling(null)
      setNote('')
      refresh()
      toast.success(t('adminDeletions.cancelDone'))
    },
    onError: (err: any) => {
      refresh()
      toast.error(err?.message || t('adminDeletions.error'))
    },
  })

  const noteOk = note.trim().length >= 3

  return (
    <div className="page-container py-6">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
            <UserX size={20} className="text-brand-900 dark:text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
              {t('adminDeletions.title')}
            </h1>
            <p className="text-sm text-gray-500">{t('adminDeletions.subtitle', { count: rows.length })}</p>
          </div>
        </div>
        <button onClick={refresh} disabled={isFetching}
          className="btn-secondary text-sm inline-flex items-center gap-1.5">
          <RefreshCw size={14} className={cn(isFetching && 'animate-spin')} /> {t('adminDeletions.refresh')}
        </button>
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center"><LoadingSpinner /></div>
      ) : rows.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500">{t('adminDeletions.empty')}</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 font-semibold align-middle">{t('adminDeletions.col_user')}</th>
                <th className="px-4 py-3 font-semibold align-middle">{t('adminDeletions.col_kind')}</th>
                <th className="px-4 py-3 font-semibold align-middle">{t('adminDeletions.col_requested')}</th>
                <th className="px-4 py-3 font-semibold align-middle">{t('adminDeletions.col_scheduled')}</th>
                <th className="px-4 py-3 font-semibold align-middle text-right">{t('adminDeletions.col_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-gray-50 dark:border-gray-800/60 last:border-0">
                  <td className="px-4 py-3 align-middle">
                    <div className="font-medium text-gray-900 dark:text-white">{r.full_name || '—'}</div>
                    <div className="text-xs text-gray-500 break-all">{r.email ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <span className={cn('badge text-xs whitespace-nowrap',
                      r.kind === 'under_age' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700')}>
                      {t(`adminDeletions.kind_${r.kind}`)}
                    </span>
                    {(r.status === 'failed' || r.status === 'executing') && (
                      <span className="badge text-xs whitespace-nowrap ml-1 bg-red-50 text-red-700">{t(`adminDeletions.status_${r.status}`)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-middle text-gray-500 whitespace-nowrap">{day(r.created_at)}</td>
                  <td className="px-4 py-3 align-middle text-gray-700 dark:text-gray-300 whitespace-nowrap">{day(r.scheduled_for)}</td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex justify-end">
                      {r.can_cancel ? (
                        <button onClick={() => { setCancelling(r); setNote('') }}
                          className="btn-secondary text-xs whitespace-nowrap inline-flex items-center gap-1">
                          <Undo2 size={12} /> {t('adminDeletions.cancel')}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 text-right max-w-[14rem]">
                          {r.status === 'failed' || r.status === 'executing' ? t('adminDeletions.failedHint')
                            : r.also_user_request ? t('adminDeletions.alsoUserRequestHint')
                            : t('adminDeletions.userRequestHint')}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cancelling && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => !cancel.isPending && setCancelling(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-gray-900 dark:text-white mb-1">{t('adminDeletions.cancelTitle')}</h2>
            <p className="text-sm text-gray-500 mb-4">
              {t('adminDeletions.cancelHint', { email: cancelling.email ?? '—' })}
            </p>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              placeholder={t('adminDeletions.notePh')} className="input w-full" />
            {!noteOk && note.length > 0 && (
              <p className="text-xs text-red-600 mt-2">{t('adminDeletions.noteRequired')}</p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setCancelling(null)} disabled={cancel.isPending} className="btn-secondary text-sm">
                {t('adminDeletions.close')}
              </button>
              <button onClick={() => cancel.mutate(cancelling)} disabled={!noteOk || cancel.isPending} className="btn-primary text-sm">
                {cancel.isPending ? t('adminDeletions.sending') : t('adminDeletions.cancelAction')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
