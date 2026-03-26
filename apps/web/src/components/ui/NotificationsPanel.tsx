import { useQuery } from '@tanstack/react-query'
import { X, Bell } from 'lucide-react'
import { api } from '@/lib/api'
import { cn, formatRelativeTime } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'

export default function NotificationsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications?limit=20').then(r => r.data?.data ?? []),
    enabled: open,
  })
  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.96 }}
            className="fixed top-16 right-4 z-50 w-80 card shadow-modal overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Bell size={16}/>Ειδοποιήσεις</h3>
              <button onClick={onClose} className="btn-ghost p-1"><X size={16}/></button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400">Δεν υπάρχουν ειδοποιήσεις</div>
              ) : notifications.map((n: any) => (
                <div key={n.id} className={cn('px-4 py-3 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors', !n.is_read && 'bg-brand-50/50 dark:bg-brand-900/10')}>
                  <p className="text-sm text-gray-800 dark:text-gray-200">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(n.created_at)}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
