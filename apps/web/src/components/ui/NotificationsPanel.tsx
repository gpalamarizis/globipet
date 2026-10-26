import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Bell, Trash2, CheckCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { cn, formatRelativeTime } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

// Μόνο εσωτερικές διαδρομές της εφαρμογής ("/…" αλλά όχι "//…" ή "/\…",
// που ο browser τα ερμηνεύει ως άλλο domain).
const isInternalPath = (l: unknown): l is string => typeof l === 'string' && /^\/(?![\/\\])/.test(l)

export default function NotificationsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const navigate = useNavigate()
  // Δικό του κλειδί: το ['notifications'] το χρησιμοποιεί ήδη η κεφαλίδα
  // (MainLayout) για ΜΟΝΟ τις αδιάβαστες — με κοινό κλειδί η μία λίστα
  // έγραφε πάνω στην άλλη στην cache.
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', 'panel'],
    queryFn: () => api.get('/notifications?limit=20').then(r => r.data?.data ?? []),
    enabled: open,
  })
  // Ίδιες ενέργειες με το κινητό (app/notifications.tsx): ανάγνωση με
  // πάτημα, «όλες αναγνωσμένες», διαγραφή. Χωρίς αυτές η κουκκίδα της
  // κεφαλίδας δεν έσβηνε ποτέ.
  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] })
  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: refresh,
  })
  const markAll = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: refresh,
  })
  const hasUnread = notifications.some((n: any) => !n.is_read)
  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.96 }}
            className="fixed top-16 right-4 z-50 w-80 card shadow-modal overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Bell size={16}/>{t('nav.notifications')}</h3>
              <div className="flex items-center gap-1">
                {hasUnread && (
                  <button onClick={() => markAll.mutate()} disabled={markAll.isPending}
                    title={t('cmpNotifPanel.markAll')} aria-label={t('cmpNotifPanel.markAll')} className="btn-ghost p-1">
                    <CheckCheck size={16}/>
                  </button>
                )}
                <button onClick={onClose} className="btn-ghost p-1"><X size={16}/></button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400">{t('cmpNotifPanel.empty')}</div>
              ) : notifications.map((n: any) => (
                <div key={n.id} onClick={() => {
                  if (!n.is_read) markRead.mutate(n.id)
                  if (isInternalPath(n.link)) { onClose(); navigate(n.link) }
                }}
                  className={cn('px-4 py-3 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-start gap-2 cursor-pointer', !n.is_read && 'bg-brand-50/50 dark:bg-brand-900/10')}>
                  <div className="flex-1 min-w-0">
                    {n.title && <p className="text-sm font-semibold text-gray-900 dark:text-white">{n.title}</p>}
                    <p className="text-sm text-gray-800 dark:text-gray-200">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(n.created_at)}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); remove.mutate(n.id) }}
                    aria-label={t('common.delete')} className="btn-ghost p-1 text-gray-400 hover:text-red-600 shrink-0">
                    <Trash2 size={14}/>
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
