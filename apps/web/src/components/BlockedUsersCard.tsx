import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Ban } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'

/**
 * Αποκλεισμένοι χρήστες — λίστα και άρση αποκλεισμού (App Store 1.2).
 * Μόνο όνομα· το email του αποκλεισμένου δεν φτάνει ποτέ στον browser.
 * Ίδιο με την εφαρμογή (mobile/src/components/BlockedUsersCard.tsx).
 */
export default function BlockedUsersCard() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data: rows = [] } = useQuery({
    queryKey: ['moderation-blocks'],
    queryFn: () => api.get('/moderation/blocks').then(r => (r.data?.data ?? []) as { id: string; blocked_name: string | null }[]),
  })
  const unblock = useMutation({
    mutationFn: (id: string) => api.delete(`/moderation/blocks/${id}`),
    onSuccess: () => qc.invalidateQueries(),
    onError: (e: any) => toast.error(e?.response?.data?.message || t('common.error')),
  })

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Ban size={18} className="text-gray-500" />
        <h3 className="font-bold text-gray-900 dark:text-white">{t('moderation.blockedUsers')}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">{t('moderation.noBlocked')}</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map(r => (
            <li key={r.id} className="flex items-center gap-3 py-2">
              <span className="flex-1 min-w-0 truncate text-sm text-gray-800 dark:text-gray-200">{r.blocked_name || t('moderation.unknownUser')}</span>
              <button type="button" disabled={unblock.isPending} onClick={() => unblock.mutate(r.id)}
                className="text-sm font-semibold text-brand-900 dark:text-yellow-400 hover:underline disabled:opacity-50">
                {t('moderation.unblock')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
