import { useQuery, useQueries } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Star, MessageSquare, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { fmtDateShort } from '@/lib/dates'

/**
 * Ε17 — «Οι κριτικές μου» (Λογαριασμός → Η δραστηριότητά μου).
 *
 * GET /reviews/my επιστρέφει τις γραμμές του πίνακα reviews (service_id ή
 * product_id, rating, comment, response, response_date, created_at) και
 * (Ε17) service_title / provider_name / product_name. Μόνο αν λείπουν (παλιός
 * server) παίρνουμε τα ονόματα υπηρεσίας από το δημόσιο GET /services/:id.
 * Για τα προϊόντα ΔΕΝ καλούμε το GET /products/:id: μετράει προβολή
 * (views_count) — χωρίς product_name δείχνουμε «Προϊόν» με σύνδεσμο.
 * Ίδιο query (και κλειδί) με τη σελίδα Λογαριασμού.
 */
export default function MyReviews() {
  const { t, i18n } = useTranslation()

  const { data: reviews = [], isLoading } = useQuery<any[]>({
    queryKey: ['my-reviews'],
    queryFn: () => api.get('/reviews/my').then(r => r.data?.data ?? []).catch(() => []),
  })

  const serviceIds = [...new Set(reviews.filter(r => r.service_id && !r.service_title && !r.provider_name).map(r => r.service_id))] as string[]
  const serviceQueries = useQueries({
    queries: serviceIds.map(id => ({
      queryKey: ['review-service', id],
      queryFn: () => api.get(`/services/${id}`).then(r => r.data ?? null).catch(() => null),
      staleTime: 5 * 60_000,
    })),
  })
  const services: Record<string, any> = {}
  serviceIds.forEach((id, i) => { if (serviceQueries[i]?.data) services[id] = serviceQueries[i].data })

  return (
    <div className="page-container py-8 pb-24 lg:pb-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-6">{t('accountHub.myReviews')}</h1>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="card p-5"><div className="skeleton h-20 w-full" /></div>)}</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16">
          <Star size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('myReviews.empty')}</h3>
          <p className="text-gray-500 mb-6">{t('myReviews.emptyDesc')}</p>
          <Link to="/bookings" className="btn-primary">{t('bookings.title')}</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r: any, i: number) => {
            const svc = r.service_id ? services[r.service_id] : null
            const isProduct = !r.service_id && !!r.product_id
            const svcTitle: string | null = r.service_title || svc?.title || null
            const svcProvider: string | null = r.provider_name || svc?.provider_name || null
            const title = isProduct
              ? (r.product_name || t('reviewReply.product'))
              : (svcTitle || svcProvider || t('reviewReply.service'))
            const subtitle = !isProduct && svcTitle && svcProvider ? svcProvider : null
            const to = isProduct ? `/marketplace/${r.product_id}` : r.service_id ? `/services/${r.service_id}` : null
            const rating = Math.max(0, Math.min(5, Number(r.rating) || 0))
            return (
              <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.04 }}
                className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {to ? (
                      <Link to={to} className="font-semibold text-gray-900 dark:text-white hover:text-brand-900 dark:hover:text-brand-400 flex items-center gap-1">
                        <span className="truncate">{title}</span>
                        <ChevronRight size={14} className="text-gray-400 shrink-0" aria-hidden="true" />
                      </Link>
                    ) : (
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{title}</p>
                    )}
                    {subtitle && <p className="text-sm text-gray-500 truncate">{subtitle}</p>}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 mt-0.5">{fmtDateShort(r.created_at, i18n.language)}</span>
                </div>

                <div className="flex items-center gap-0.5 mt-2" role="img" aria-label={t('myReviews.stars', { count: rating })}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} size={14} aria-hidden="true"
                      className={cn(n <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600')} />
                  ))}
                </div>

                {r.comment
                  ? <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-line break-words">{r.comment}</p>
                  : <p className="text-sm text-gray-400 mt-2">{t('reviewReply.noComment')}</p>}

                {r.response && (
                  <div className="mt-3 rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <MessageSquare size={12} aria-hidden="true" /> {isProduct ? t('reviews.sellerReply') : t('reviewReply.providerReply')}
                      {r.response_date && <span className="font-normal text-gray-400">· {fmtDateShort(r.response_date, i18n.language)}</span>}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-line break-words">{r.response}</p>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
