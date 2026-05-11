import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { CheckCircle, Package, Truck, Home, ShoppingBag } from 'lucide-react'
import { api } from '@/lib/api'

export default function OrderConfirmation() {
  const { t } = useTranslation()
  const { id } = useParams()
  const [params] = useSearchParams()

  const { data: order } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}`).then(r => r.data),
    enabled: !!id,
  })

  return (
    <div className="page-container py-16 text-center max-w-lg mx-auto">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 0.5 }}>
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-600" />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-2">
          {t('orderConfirm.title')} 🎉
        </h1>
        <p className="text-gray-500 mb-6">{t('orderConfirm.subtitle')}</p>

        {order && (
          <div className="card p-5 text-left mb-6">
            <p className="text-xs font-medium text-gray-500 mb-3">{t('orderConfirm.details')}</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('orderConfirm.orderNumber')}</span>
                <span className="font-mono font-medium">#{order.id?.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('orderConfirm.total')}</span>
                <span className="font-bold text-gray-900 dark:text-white">€{order.total_amount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('orderConfirm.status')}</span>
                <span className="text-green-600 font-medium">{t('orderConfirm.confirmed')}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center gap-8 mb-8">
          {[
            { icon: CheckCircle, key: 'confirmation', done: true },
            { icon: Package, key: 'preparing', done: false },
            { icon: Truck, key: 'shipping', done: false },
            { icon: Home, key: 'delivery', done: false },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${s.done ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                <s.icon size={18} />
              </div>
              <p className="text-xs text-gray-500">{t(`orderConfirm.steps.${s.key}`)}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Link to="/orders" className="btn-secondary flex-1 flex items-center justify-center gap-2">
            <Package size={16}/> {t('orderConfirm.myOrders')}
          </Link>
          <Link to="/marketplace" className="btn-primary flex-1 flex items-center justify-center gap-2">
            <ShoppingBag size={16}/> {t('orderConfirm.continueShopping')}
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
