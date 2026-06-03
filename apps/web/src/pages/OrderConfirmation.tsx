import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CheckCircle, XCircle, Loader2, Package } from 'lucide-react'
import { api } from '@/lib/api'

export default function OrderConfirmation() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [verifying, setVerifying] = useState(false)

  const transactionId = params.get('t')

  const { data: order, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}`).then(r => r.data),
    enabled: !!id,
  })

  useEffect(() => {
    const verify = async () => {
      if (transactionId && id) {
        setVerifying(true)
        try {
          await api.post('/orders/viva/verify', {
            order_id: id,
            transaction_id: transactionId,
          })
          await refetch()
        } catch {
          // verification will also happen via webhook
        } finally {
          setVerifying(false)
        }
      }
    }
    verify()
  }, [transactionId, id])

  const isPaid = order?.status === 'confirmed'

  return (
    <div className="page-container py-16 max-w-lg mx-auto text-center">
      {verifying ? (
        <>
          <Loader2 size={56} className="mx-auto text-brand-900 animate-spin mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('common.loading')}</h1>
          <p className="text-gray-500">{t('orderConfirm.steps.confirmation')}</p>
        </>
      ) : isPaid ? (
        <>
          <CheckCircle size={56} className="mx-auto text-green-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('orderConfirm.title')} 🎉</h1>
          <p className="text-gray-500 mb-6">{t('orderConfirm.subtitle')}</p>
          <div className="card p-4 mb-6 text-left">
            <p className="text-sm text-gray-500">{t('orderConfirm.orderNumber')}</p>
            <p className="font-mono font-bold text-gray-900 dark:text-white">#{id?.slice(0, 8)}</p>
            <p className="text-sm text-gray-500 mt-2">{t('orderConfirm.total')}</p>
            <p className="font-bold text-gray-900 dark:text-white">€{Number(order?.total_amount || 0).toFixed(2)}</p>
          </div>
          <button onClick={() => navigate('/orders')} className="btn-primary w-full">
            <Package size={16} className="inline mr-2"/>{t('orderConfirm.myOrders')}
          </button>
        </>
      ) : (
        <>
          <XCircle size={56} className="mx-auto text-amber-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('common.error')}</h1>
          <p className="text-gray-500 mb-6">{t('orderConfirm.subtitle')}</p>
          <button onClick={() => navigate('/orders')} className="btn-secondary w-full">{t('orderConfirm.myOrders')}</button>
        </>
      )}
    </div>
  )
}
