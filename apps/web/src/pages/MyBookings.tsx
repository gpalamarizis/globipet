import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Calendar, Clock, Star, X, MapPin, Phone, ChevronRight, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
}

export default function MyBookings() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'all'>('upcoming')
  const [reviewBooking, setReviewBooking] = useState<any>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => api.get('/bookings/my').then(r => r.data?.data ?? []),
    enabled: isAuthenticated,
  })

  const cancelBooking = useMutation({
    mutationFn: (id: string) => api.patch(`/bookings/${id}`, { status: 'cancelled' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-bookings'] }); toast.success(t('bookings.cancelled')) },
  })

  const submitReview = useMutation({
    mutationFn: () => api.post('/reviews', { booking_id: reviewBooking.id, service_id: reviewBooking.service_id, rating, comment }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-bookings'] }); setReviewBooking(null); toast.success(t('bookings.reviewSubmitted')) },
  })

  const now = new Date()
  const filtered = bookings.filter((b: any) => {
    const date = new Date(b.scheduled_at)
    if (activeTab === 'upcoming') return date >= now && b.status !== 'cancelled'
    if (activeTab === 'past') return date < now || b.status === 'completed'
    return true
  })

  if (!isAuthenticated) return (
    <div className="page-container py-16 text-center">
      <p className="text-4xl mb-3">🔒</p>
      <Link to="/login" className="btn-primary">Σύνδεση</Link>
    </div>
  )

  return (
    <div className="page-container py-8 pb-24 lg:pb-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('bookings.title')}</h1>
        <Link to="/services" className="btn-primary text-sm flex items-center gap-2">
          <Plus size={16}/> Νέα κράτηση
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'upcoming', label: t('bookings.upcoming') },
          { id: 'past',     label: t('bookings.past') },
          { id: 'all',      label: t('bookings.all') },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-all',
              activeTab === tab.id ? 'bg-brand-900 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400')}>
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card p-5"><div className="skeleton h-24 w-full"/></div>)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('bookings.noBookings')}</h3>
          <p className="text-gray-500 mb-6">{t('bookings.noBookingsDesc')}</p>
          <Link to="/services" className="btn-primary">Εξερεύνηση υπηρεσιών</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((booking: any, i: number) => (
            <motion.div key={booking.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0">
                    <span className="text-2xl">✂️</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{booking.service_name || 'Υπηρεσία'}</p>
                    <p className="text-xs text-gray-500">{booking.provider_name}</p>
                  </div>
                </div>
                <span className={cn('text-xs px-2 py-1 rounded-full font-medium', statusColors[booking.status] || 'bg-gray-100 text-gray-600')}>
                  {t(`bookings.status.${booking.status}`) || booking.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Calendar size={12}/>
                  {booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleDateString('el-GR', { weekday: 'short', day: '2-digit', month: 'short' }) : '—'}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={12}/>
                  {booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  {booking.duration_minutes && ` · ${booking.duration_minutes} λεπτά`}
                </div>
                {booking.location && <div className="flex items-center gap-1.5 col-span-2"><MapPin size={12}/>{booking.location}</div>}
              </div>

              <div className="flex gap-2">
                {booking.status === 'pending' && (
                  <button onClick={() => { if(confirm('Ακύρωση κράτησης;')) cancelBooking.mutate(booking.id) }}
                    className="flex-1 btn-secondary text-xs py-2 text-red-600 border-red-200 hover:bg-red-50">
                    {t('bookings.cancel')}
                  </button>
                )}
                {booking.status === 'completed' && !booking.review_id && (
                  <button onClick={() => setReviewBooking(booking)}
                    className="flex-1 btn-primary text-xs py-2 flex items-center justify-center gap-1.5">
                    <Star size={13}/> {t('bookings.rate')}
                  </button>
                )}
                <Link to={`/services/${booking.service_id}`} className="flex items-center gap-1 text-xs text-brand-900 hover:underline ml-auto">
                  Λεπτομέρειες <ChevronRight size={12}/>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Review modal */}
      <AnimatePresence>
        {reviewBooking && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40" onClick={() => setReviewBooking(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 dark:text-white">Αξιολόγηση υπηρεσίας</h3>
                <button onClick={() => setReviewBooking(null)} className="btn-ghost p-2"><X size={16}/></button>
              </div>
              <p className="text-sm text-gray-500 mb-4">{reviewBooking.service_name}</p>
              <div className="flex gap-2 justify-center mb-4">
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setRating(s)}>
                    <Star size={28} className={cn('transition-colors', s <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300')} />
                  </button>
                ))}
              </div>
              <textarea className="input resize-none mb-4" rows={3} placeholder="Σχόλια (προαιρετικά)..."
                value={comment} onChange={e => setComment(e.target.value)} />
              <div className="flex gap-3">
                <button onClick={() => setReviewBooking(null)} className="btn-secondary flex-1">Ακύρωση</button>
                <button onClick={() => submitReview.mutate()} disabled={submitReview.isPending} className="btn-primary flex-1">
                  {submitReview.isPending ? 'Αποστολή...' : t('bookings.submitReview')}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
