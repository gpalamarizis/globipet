import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ShieldCheck, Truck, RotateCcw } from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useTranslation } from 'react-i18next'

export default function ProductSubscribe() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get(`/products/${id}`).then(r => r.data?.data ?? r.data),
  })

  const { data: discountData } = useQuery({
    queryKey: ['food-subscription-discount'],
    queryFn: () => api.get('/settings/food-subscription-discount').then(r => r.data?.data),
  })

  const checkout = useMutation({
    mutationFn: () => api.post(`/subscriptions/food/${id}/checkout`),
    onSuccess: (res) => {
      const url = res.data?.data?.checkout_url
      if (url) window.location.href = url
    },
    // The api interceptor rejects with { message, statusCode, errors } — the
    // original axios error is gone by then. Reading err.response.data.message
    // always found undefined, so the real reason ("you already have an active
    // subscription for this product") was replaced by the generic fallback.
    onError: (err: any) => toast.error(err?.message || t('pgSubscribe.createError')),
  })

  if (isLoading) return <div className="page-container py-16 flex justify-center"><LoadingSpinner /></div>
  if (!product) return <div className="page-container py-16 text-center text-gray-500">{t('pgSubscribe.notFound')}</div>

  const discountPercent = discountData?.discount_percent ?? 0
  // Ίδια στρογγυλοποίηση με τον server (routes/subscriptions.ts), εμφάνιση με 2 δεκαδικά.
  const monthlyPrice = Math.round(product.price * (1 - discountPercent / 100) * 100) / 100

  if (!product.is_subscribable) {
    return (
      <div className="page-container py-16 text-center">
        <p className="text-gray-500 mb-4">{t('pgSubscribe.notSubscribable')}</p>
        <button onClick={() => navigate(`/marketplace/${id}`)} className="btn-secondary">{t('pgSubscribe.backToProduct')}</button>
      </div>
    )
  }

  return (
    <div className="page-container py-10 max-w-lg mx-auto">
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          {product.image_url && <img src={product.image_url} alt={product.name} className="w-16 h-16 rounded-xl object-cover" />}
          <div>
            <h1 className="font-bold text-lg text-gray-900 dark:text-white">{product.name}</h1>
            <p className="text-sm text-gray-500">{t('pgSubscribe.duration')}</p>
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/10 rounded-xl p-4 mb-6">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-bold text-brand-900 dark:text-brand-400">{formatCurrency(monthlyPrice)}</span>
            <span className="text-sm text-gray-500">{t('pgSubscribe.perMonth')}</span>
            {discountPercent > 0 && (
              <span className="text-xs text-gray-400 line-through ml-1">{formatCurrency(product.price)}</span>
            )}
          </div>
          {discountPercent > 0 && (
            <p className="text-xs text-green-700 font-medium">{t('pgSubscribe.discount', { percent: discountPercent })}</p>
          )}
        </div>

        <ul className="space-y-3 mb-6">
          <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Truck size={16} className="text-brand-900 dark:text-brand-400" /> {t('pgSubscribe.featDelivery')}
          </li>
          <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <ShieldCheck size={16} className="text-brand-900 dark:text-brand-400" /> {t('pgSubscribe.featSecure')}
          </li>
          <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <RotateCcw size={16} className="text-brand-900 dark:text-brand-400" /> {t('pgSubscribe.featCancelWhere')}
          </li>
        </ul>

        <button
          onClick={() => checkout.mutate()}
          disabled={checkout.isPending}
          className="btn-primary w-full py-3 disabled:opacity-60"
        >
          {checkout.isPending ? t('pgSubscribe.redirecting') : t('pgSubscribe.start')}
        </button>
        {/* Διάρκεια και χρέωση, όπως η σημείωση του κινητού. */}
        <p className="text-xs text-gray-400 text-center mt-3">{t('pgSubscribe.paymentNote')}</p>
      </div>
    </div>
  )
}
