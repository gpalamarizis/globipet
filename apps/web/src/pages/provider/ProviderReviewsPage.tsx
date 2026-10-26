import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Star, MessageSquare } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import ReviewReply from '@/components/provider/ReviewReply'
import { dateLocale } from '@/lib/dates'

/**
 * Κριτικές που έλαβε ο πάροχος, με απάντηση.
 *
 * GET /reviews?provider_email=<εγώ> (έως 200, νεότερες πρώτα) — υπηρεσίες ΚΑΙ
 * προϊόντα. Η απάντηση γράφεται με PATCH /reviews/:id/response (ReviewReply)
 * και εμφανίζεται δημόσια κάτω από την κριτική (ServiceDetail/ProductDetail).
 * Ίδια λειτουργία με το κινητό (ProviderReviews στην Επισκόπηση παρόχου).
 */
export default function ProviderReviewsPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuthStore()
  const [onlyUnanswered, setOnlyUnanswered] = useState(false)

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['provider-reviews', user?.email],
    queryFn: () => api.get('/reviews', { params: { provider_email: user!.email } }).then(r => r.data?.data ?? []),
    enabled: !!user?.email,
  })
  // Ονόματα υπηρεσιών/προϊόντων (ίδια queryKeys με τις καρτέλες του πίνακα).
  const { data: services = [] } = useQuery({
    queryKey: ['provider-services'],
    queryFn: () => api.get('/services/my').then(r => r.data?.data ?? []),
    enabled: !!user,
  })
  const { data: products = [] } = useQuery({
    queryKey: ['provider-products'],
    queryFn: () => api.get('/products/my').then(r => r.data?.data ?? []),
    enabled: !!user,
  })
  const names = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of services as any[]) m.set(s.id, s.title || s.provider_name)
    for (const p of products as any[]) m.set(p.id, p.name)
    return m
  }, [services, products])

  const rows = (reviews as any[]).filter(r => !onlyUnanswered || !r.response)
  const unanswered = (reviews as any[]).filter(r => !r.response).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-gray-500">
          {t('reviewReply.count', { count: reviews.length })}
          {unanswered > 0 && ` · ${t('reviewReply.unansweredCount', { count: unanswered })}`}
        </p>
        <button onClick={() => setOnlyUnanswered(v => !v)}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
            onlyUnanswered
              ? 'bg-brand-900 text-white border-brand-900'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400')}>
          <MessageSquare size={13} /> {t('reviewReply.onlyUnanswered')}
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-12">{t('common.loading')}</p>
      ) : rows.length === 0 ? (
        <div className="card p-10 text-center">
          <Star size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">{onlyUnanswered ? t('reviewReply.allAnswered') : t('reviewReply.empty')}</p>
        </div>
      ) : rows.map((r: any) => {
        const target = names.get(r.service_id || r.product_id)
        return (
          <div key={r.id} className="card p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.customer_name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {r.product_id ? t('reviewReply.product') : t('reviewReply.service')}
                  {target ? `: ${target}` : ''}
                  {r.created_at ? ` · ${new Date(r.created_at).toLocaleDateString(dateLocale(i18n.language))}` : ''}
                </p>
              </div>
              <div className="flex gap-0.5 shrink-0 pt-0.5">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} size={12}
                    className={s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                ))}
              </div>
            </div>
            {r.comment
              ? <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">{r.comment}</p>
              : <p className="text-xs text-gray-400 italic">{t('reviewReply.noComment')}</p>}
            <ReviewReply review={r} canEdit
              label={r.product_id ? t('reviews.sellerReply') : undefined}
              invalidate={[['provider-reviews'], ['service-reviews'], ['product-reviews']]} />
          </div>
        )
      })}
    </div>
  )
}
