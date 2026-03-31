import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Package, ChevronRight, ShoppingBag } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

const statusLabels: Record<string, string> = {
  pending: 'Εκκρεμεί',
  confirmed: 'Επιβεβαιώθηκε',
  shipped: 'Αποστάλθηκε',
  delivered: 'Παραδόθηκε',
  cancelled: 'Ακυρώθηκε',
}

export default function MyOrders() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuthStore()

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => api.get('/orders/my').then(r => r.data?.data ?? []),
    enabled: isAuthenticated,
  })

  if (!isAuthenticated) return (
    <div className="page-container py-16 text-center">
      <p className="text-4xl mb-3">🔒</p>
      <p className="font-semibold text-gray-900 dark:text-white mb-2">Απαιτείται σύνδεση</p>
      <Link to="/login" className="btn-primary inline-block">Σύνδεση</Link>
    </div>
  )

  return (
    <div className="page-container py-8 pb-24 lg:pb-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-6">Οι παραγγελίες μου</h1>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card p-5"><div className="skeleton h-20 w-full"/></div>)}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">Δεν έχετε παραγγελίες ακόμα</h3>
          <p className="text-gray-500 mb-6">Ανακαλύψτε τα προϊόντα μας</p>
          <Link to="/marketplace" className="btn-primary">Αγορές</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order: any, i: number) => (
            <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={`/orders/${order.id}`} className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow block">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0">
                  <Package size={20} className="text-brand-900" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                      Παραγγελία #{order.id?.slice(0, 8).toUpperCase()}
                    </p>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusColors[order.status] || 'bg-gray-100 text-gray-700')}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleDateString('el-GR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-gray-900 dark:text-white">€{order.total_amount?.toFixed(2)}</p>
                  <ChevronRight size={16} className="text-gray-400 ml-auto mt-1" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
