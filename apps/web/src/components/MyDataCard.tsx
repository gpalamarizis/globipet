import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Download, Trash2, ShieldCheck, Undo2, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'
import { fmtDateShort } from '@/lib/dates'
import toast from 'react-hot-toast'

/**
 * Δικαιώματα δεδομένων — GDPR Άρθρα 17 και 20.
 *
 * Τα endpoints υπήρχαν στον server αλλά καμία σελίδα δεν τα καλούσε: ο
 * χρήστης δεν μπορούσε ούτε να εξάγει τα δεδομένα του ούτε να ζητήσει
 * διαγραφή. Το δικαίωμα υπάρχει μόνο αν μπορεί να ασκηθεί.
 *
 * Η εξαγωγή κατεβαίνει ως αρχείο JSON απευθείας από τον browser — χωρίς
 * ενδιάμεσο διακομιστή, ώστε τα δεδομένα να μην περνούν από αλλού.
 */
export default function MyDataCard() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState('')

  const { data: status } = useQuery({
    queryKey: ['delete-status'],
    queryFn: () => api.get('/user-rights/delete-status').then(r => r.data?.data ?? r.data),
  })

  const exportData = useMutation({
    mutationFn: () => api.get('/user-rights/export').then(r => r.data),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `globipet-data-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(t('privacy.exportDone'))
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || t('common.error')),
  })

  const requestDelete = useMutation({
    mutationFn: () => api.post('/user-rights/delete-request', { reason: reason.trim() || undefined }),
    // Μόνο το μεταφρασμένο κείμενο — όχι το ελληνικό message του server.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delete-status'] })
      setConfirming(false); setReason('')
      toast.success(t('privacy.deleteRequestedHint'))
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || t('common.error')),
  })

  const cancelDelete = useMutation({
    mutationFn: () => api.post('/user-rights/cancel-delete', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delete-status'] })
      toast.success(t('privacy.cancelledHint'))
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || t('common.error')),
  })

  const pending = !!status?.pending || status?.status === 'pending'
  const scheduled = status?.scheduled_for ?? status?.delete_after

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} className="text-brand-900" />
        <h3 className="font-bold text-gray-900 dark:text-white">{t('privacy.title')}</h3>
      </div>
      <p className="text-sm text-gray-500">{t('privacy.subtitle')}</p>

      {/* Εκκρεμές αίτημα — πρώτο, γιατί είναι το πιο επείγον */}
      {pending && (
        <div className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-900/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-600" />
            <span className="font-semibold text-red-700">{t('privacy.pendingTitle')}</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {scheduled
              ? t('privacy.pendingOn', { date: fmtDateShort(String(scheduled), i18n.language) })
              : t('privacy.pendingHint')}
          </p>
          <button onClick={() => cancelDelete.mutate()} disabled={cancelDelete.isPending}
            className="btn-primary flex items-center gap-2 text-sm">
            <Undo2 size={15} />{t('privacy.cancelDelete')}
          </button>
        </div>
      )}

      {/* Άρθρο 20 — φορητότητα */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Download size={16} className="text-brand-900" />
          <span className="font-medium text-gray-900 dark:text-white">{t('privacy.exportTitle')}</span>
        </div>
        <p className="text-sm text-gray-500">{t('privacy.exportDesc')}</p>
        <button onClick={() => exportData.mutate()} disabled={exportData.isPending}
          className="btn-ghost border border-gray-300 dark:border-gray-600 text-sm">
          {exportData.isPending ? t('common.loading') : t('privacy.exportAction')}
        </button>
      </div>

      {/* Άρθρο 17 — διαγραφή */}
      {!pending && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Trash2 size={16} className="text-red-500" />
            <span className="font-medium text-gray-900 dark:text-white">{t('privacy.deleteTitle')}</span>
          </div>
          <p className="text-sm text-gray-500">{t('privacy.deleteDesc')}</p>

          {confirming ? (
            <div className="space-y-3 pt-1">
              <textarea value={reason} onChange={e => setReason(e.target.value)}
                placeholder={t('privacy.reasonHint')} rows={3} className="input w-full text-sm" />
              <div className="flex gap-2">
                <button onClick={() => { setConfirming(false); setReason('') }}
                  className="btn-ghost border border-gray-300 dark:border-gray-600 text-sm flex-1">
                  {t('common.cancel')}
                </button>
                <button onClick={() => requestDelete.mutate()} disabled={requestDelete.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-2 text-sm font-medium flex-1">
                  {t('privacy.confirmDelete')}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirming(true)}
              className="text-red-600 hover:text-red-700 text-sm font-medium">
              {t('privacy.deleteAction')}
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400">{t('privacy.legalNote')}</p>
    </div>
  )
}
