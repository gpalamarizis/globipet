import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, Clock, MapPin, Star, X, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'

const statusConfig = {
  pending:   { label: 'Εκκρεμεί',    color: 'badge-orange', icon: AlertCircle },
  confirmed: { label: 'Επιβεβαιώθηκε', color: 'badge-blue',  icon: CheckCircle },
  completed: { label: 'Ολοκληρώθηκε', color: 'badge-green',  icon: CheckCircle },
  cancelled: { label: 'Ακυρώθηκε',   color: 'badge-red',    icon: XCircle },
}

export default function MyBookings() {
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('upcoming')
  const [ratingModal, setRatingModal] = useState(null)
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState('')

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['my-bookings', activeTab],
    queryFn: () => api.get(`/bookings?tab=${activeTab}`).then(r => r.data?.data ?? []),
    enabled: isAuthenticated,
  })

  const cancelBooking = useMutation({
    mutationFn: (id) => api.patch(`/bookings/${id}`, { status: 'cancelled' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-bookings'] }); toast.success('Η κράτηση ακυρώθηκε') }
  })

  const submitReview = useMutation({
    mutationFn: ({ bookingId, serviceId, providerEmail }) =>
      api.post('/reviews', { booking_id: bookingId, service_id: serviceId, provider_email: providerEmail, rating, comment: review }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-bookings'] }); setRatingModal(null); toast.success('Η κριτική υποβλήθηκε!') }
  })

  return (
    <div className="page-container py-8 pb-24 lg:pb-8">
      <h1 className="section-title mb-6">Κρατήσεις μου</h1>

      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {[{id:'upcoming',l:'Επερχόμενες'},{id:'past',l:'Παρελθόν'},{id:'all',l:'Όλες'}].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn('px-4 py-2 text-sm font-medium rounded-lg transition-all', activeTab===tab.id ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700')}>
            {tab.l}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card p-4 h-24 skeleton"/>)}</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-24"><Calendar size={48} className="text-gray-300 mx-auto mb-4"/><p className="font-semibold text-gray-900 dark:text-white mb-1">Δεν υπάρχουν κρατήσεις</p><p className="text-sm text-gray-500">Κανε την πρώτη σου κράτηση στις Υπηρεσίες</p></div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking, i) => {
            const status = statusConfig[booking.status] || statusConfig.pending
            const StatusIcon = status.icon
            return (
              <motion.div key={booking.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{booking.provider_name}</h3>
                      <span className={cn('badge', status.color)}>{status.label}</span>
                    </div>
                    {booking.pet_name && <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">🐾 {booking.pet_name}</p>}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Calendar size={12}/>{booking.booking_date}</span>
                      <span className="flex items-center gap-1"><Clock size={12}/>{booking.booking_time}</span>
                      {booking.duration && <span className="flex items-center gap-1"><Clock size={12}/>{booking.duration} λεπτά</span>}
                    </div>
                    {booking.notes && <p className="text-xs text-gray-400 mt-2 italic">"{booking.notes}"</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-lg text-gray-900 dark:text-white">{booking.total_price}€</p>
                    <div className="flex flex-col gap-1 mt-2">
                      {booking.status === 'pending' && (
                        <button onClick={() => cancelBooking.mutate(booking.id)} className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 justify-end"><X size={12}/>Ακύρωση</button>
                      )}
                      {booking.status === 'completed' && !booking.rating && (
                        <button onClick={() => setRatingModal(booking)} className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1 justify-end"><Star size={12}/>Αξιολόγηση</button>
                      )}
                      {booking.rating && (
                        <div className="flex items-center gap-0.5 justify-end">{[1,2,3,4,5].map(s=><Star key={s} size={12} className={s<=booking.rating?'text-yellow-400 fill-yellow-400':'text-gray-300'}/>)}</div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Rating Modal */}
      {ratingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card p-6 w-full max-w-md">
            <h3 className="font-semibold text-lg mb-4">Αξιολόγηση — {ratingModal.provider_name}</h3>
            <div className="flex gap-2 justify-center mb-4">
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => setRating(s)}>
                  <Star size={32} className={s<=rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                </button>
              ))}
            </div>
            <textarea className="input resize-none mb-4" rows={3} placeholder="Γράψτε την κριτική σας..." value={review} onChange={e => setReview(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={() => setRatingModal(null)} className="btn-secondary flex-1">Ακύρωση</button>
              <button onClick={() => submitReview.mutate({ bookingId: ratingModal.id, serviceId: ratingModal.service_id, providerEmail: ratingModal.provider_email })} className="btn-primary flex-1">Υποβολή</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
