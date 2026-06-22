$root = "C:\gp"

$f1 = @'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Video, Clock, Star, Search, Shield, Award, X, Lock, Calendar } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { cn, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function Telehealth() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const [selectedVet, setSelectedVet] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('')
  const [selectedPetId, setSelectedPetId] = useState('')

  // Real veterinary providers (telehealth-capable) from the services directory
  const { data: vets = [], isLoading } = useQuery({
    queryKey: ['telehealth-vets'],
    queryFn: () => api.get('/services?service_type=veterinary&limit=24').then(r => r.data?.data ?? []),
  })

  const { data: pets = [] } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets/my').then(r => r.data?.data ?? []).catch(() => []),
    enabled: isAuthenticated,
  })

  const filteredVets = vets.filter((v: any) =>
    v.provider_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.specializations?.some((s: string) => s.toLowerCase().includes(search.toLowerCase()))
  )

  const bookConsultation = useMutation({
    mutationFn: async () => {
      if (!selectedVet) throw new Error('Δεν επιλέχθηκε κτηνίατρος')
      const pet = pets.find((p: any) => p.id === selectedPetId)
      const { data } = await api.post('/telehealth', {
        provider_email: selectedVet.provider_email,
        provider_name: selectedVet.provider_name,
        service_id: selectedVet.id,
        pet_id: selectedPetId || undefined,
        pet_name: pet?.name,
        scheduled_date: bookingDate,
        scheduled_time: bookingTime,
        duration: 30,
        price: selectedVet.price,
      })
      return data
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    },
    onError: (err: any) => toast.error(err?.message || 'Σφάλμα κατά την κράτηση'),
  })

  const openBooking = (vet: any) => {
    if (!isAuthenticated) { toast.error('Συνδεθείτε για να κλείσετε ραντεβού'); return }
    setSelectedVet(vet)
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
    setBookingDate(tomorrow.toISOString().split('T')[0])
    setBookingTime('10:00')
  }

  return (
    <>
      <div className="page-container py-8 pb-24 lg:pb-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Video size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Τηλεϊατρική</h1>
              <p className="text-sm text-gray-500">Βιντεοκλήση με εξειδικευμένο κτηνίατρο — πληρωμή πριν τη συνεδρία</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: Shield, label: 'Ασφαλείς πληρωμές', value: 'Viva Wallet', color: 'text-green-600' },
            { icon: Clock, label: 'Διάρκεια συνεδρίας', value: '30 λεπτά', color: 'text-blue-600' },
            { icon: Award, label: 'Κτηνίατροι', value: String(vets.length), color: 'text-orange-600' },
          ].map((stat, i) => (
            <div key={i} className="card p-4 text-center">
              <stat.icon size={20} className={cn('mx-auto mb-2', stat.color)} />
              <p className="font-bold text-gray-900 dark:text-white text-sm">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 mb-6">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input type="text" placeholder="Αναζήτηση κτηνιάτρου..." value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400" />
        </div>

        {/* Vet list */}
        {isLoading ? (
          <div className="text-center py-16 text-gray-400">Φόρτωση...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVets.map((vet: any, i: number) => (
              <motion.div key={vet.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-semibold text-sm shrink-0">
                    {getInitials(vet.provider_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{vet.provider_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{vet.specializations?.[0] || 'Γενική Κτηνιατρική'}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={11} className="text-yellow-500 fill-yellow-500" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{vet.rating || 0}</span>
                      <span className="text-xs text-gray-400">({vet.reviews_count || 0})</span>
                    </div>
                  </div>
                  {vet.is_verified && <Shield size={14} className="text-blue-500 shrink-0 mt-1.5" />}
                </div>

                <div className="flex items-center justify-between mb-4 text-xs text-gray-500">
                  <span>{vet.years_experience || 0} χρόνια εμπειρία</span>
                  <span className="font-semibold text-gray-900 dark:text-white">€{vet.price}/συνεδρία</span>
                </div>

                <button onClick={() => openBooking(vet)}
                  className="w-full flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all">
                  <Video size={13} /> Κλείσε & Πλήρωσε
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {!isLoading && filteredVets.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold text-gray-900 dark:text-white">Δεν βρέθηκαν κτηνίατροι</p>
            <p className="text-sm text-gray-500 mt-1">Δοκιμάστε διαφορετική αναζήτηση</p>
          </div>
        )}
      </div>

      {/* Booking modal */}
      <AnimatePresence>
        {selectedVet && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={() => setSelectedVet(null)}>
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md mx-auto card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold">
                    {getInitials(selectedVet.provider_name)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{selectedVet.provider_name}</p>
                    <p className="text-sm text-gray-500">{selectedVet.specializations?.[0] || 'Γενική Κτηνιατρική'}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedVet(null)} className="btn-ghost p-2"><X size={18} /></button>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Ημερομηνία</label>
                  <input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} className="input w-full text-sm" min={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Ώρα</label>
                  <input type="time" value={bookingTime} onChange={e => setBookingTime(e.target.value)} className="input w-full text-sm" />
                </div>
                {pets.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Κατοικίδιο (προαιρετικό)</label>
                    <select value={selectedPetId} onChange={e => setSelectedPetId(e.target.value)} className="input w-full text-sm">
                      <option value="">— Επίλεξε —</option>
                      {pets.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-4 flex items-center gap-2">
                <Lock size={13} className="text-blue-600 shrink-0" />
                <span className="text-xs text-blue-600">Θα μεταφερθείς στο ασφαλές περιβάλλον πληρωμής Viva Wallet. Η κλήση ξεκλειδώνει μετά την επιβεβαίωση πληρωμής.</span>
              </div>

              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-500">Κόστος συνεδρίας</span>
                <span className="font-bold text-lg text-gray-900 dark:text-white">€{selectedVet.price}</span>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setSelectedVet(null)} className="btn-secondary flex-1">Άκυρο</button>
                <button onClick={() => bookConsultation.mutate()} disabled={!bookingDate || !bookingTime || bookConsultation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl font-semibold text-sm py-2.5 bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-50">
                  <Lock size={14}/>{bookConsultation.isPending ? 'Επεξεργασία...' : 'Πλήρωσε & Κλείσε'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
'@
Set-Content -Path (Join-Path $root "apps\web\src\pages\Telehealth.tsx") -Value $f1 -Encoding UTF8 -NoNewline
Write-Host "OK: apps\web\src\pages\Telehealth.tsx"

$f2 = @'
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
  const { t, i18n } = useTranslation()
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'all'>('upcoming')
  const [reviewBooking, setReviewBooking] = useState<any>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const localeMap: Record<string, string> = { el: 'el-GR', en: 'en-US', es: 'es-ES', fr: 'fr-FR', zh: 'zh-CN' }
  const locale = localeMap[i18n.language] || 'el-GR'

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
      <Link to="/login" className="btn-primary">{t('auth.login')}</Link>
    </div>
  )

  return (
    <div className="page-container py-8 pb-24 lg:pb-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('bookings.title')}</h1>
        <Link to="/services" className="btn-primary text-sm flex items-center gap-2">
          <Plus size={16}/> {t('bookingsExtra.newBooking')}
        </Link>
      </div>

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
          <Link to="/services" className="btn-primary">{t('bookingsExtra.explore')}</Link>
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
                    <p className="font-semibold text-gray-900 dark:text-white">{booking.service_name || t('bookingsExtra.service')}</p>
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
                  {booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: 'short' }) : '—'}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={12}/>
                  {booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '—'}
                  {booking.duration_minutes && ` · ${booking.duration_minutes} ${t('bookings.minutes')}`}
                </div>
                {booking.location && <div className="flex items-center gap-1.5 col-span-2"><MapPin size={12}/>{booking.location}</div>}
              </div>

              <div className="flex gap-2">
                {booking.status === 'pending' && (
                  <button onClick={() => { if(confirm(t('bookingsExtra.cancelConfirm'))) cancelBooking.mutate(booking.id) }}
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
                  {t('bookingsExtra.details')} <ChevronRight size={12}/>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {reviewBooking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={() => setReviewBooking(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm mx-auto card p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 dark:text-white">{t('bookingsExtra.reviewTitle')}</h3>
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
              <textarea className="input resize-none mb-4" rows={3} placeholder={t('bookingsExtra.commentPlaceholder')}
                value={comment} onChange={e => setComment(e.target.value)} />
              <div className="flex gap-3">
                <button onClick={() => setReviewBooking(null)} className="btn-secondary flex-1">{t('common.cancel')}</button>
                <button onClick={() => submitReview.mutate()} disabled={submitReview.isPending} className="btn-primary flex-1">
                  {submitReview.isPending ? t('bookingsExtra.sending') : t('bookings.submitReview')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
'@
Set-Content -Path (Join-Path $root "apps\web\src\pages\MyBookings.tsx") -Value $f2 -Encoding UTF8 -NoNewline
Write-Host "OK: apps\web\src\pages\MyBookings.tsx"

$f3 = @'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Calendar, Clock, Users, Plus, X, Check, Dog, Heart, Map, List } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'

const eventTypes = [
  { value: 'walk', label: '🚶 Βόλτα' },
  { value: 'play', label: '🎾 Παιχνίδι' },
  { value: 'meetup', label: '🐾 Meetup' },
  { value: 'training', label: '🎓 Εκπαίδευση' },
  { value: 'other', label: '✨ Άλλο' },
]

const petTypeOptions = ['dog', 'cat', 'rabbit', 'bird', 'other']
const petTypeEmoji: Record<string, string> = { dog: '🐶', cat: '🐱', rabbit: '🐰', bird: '🐦', other: '🐾' }

export default function Playdates() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'discover' | 'my'>('discover')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState<string | null>(null)
  const [filterType, setFilterType] = useState('all')
  const [cityFilter, setCityFilter] = useState('')

  const [form, setForm] = useState({
    title: '', description: '', event_type: 'meetup',
    date: '', time: '', duration_minutes: 60,
    location: '', city: user?.city || '',
    max_participants: 10, pet_types: [] as string[], is_public: true,
  })
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['playdates', cityFilter, filterType],
    queryFn: () => api.get('/playdates', { params: { city: cityFilter || undefined, event_type: filterType !== 'all' ? filterType : undefined } }).then(r => r.data),
    enabled: !!user,
  })

  const { data: myData } = useQuery({
    queryKey: ['playdates-my'],
    queryFn: () => api.get('/playdates/my').then(r => r.data),
    enabled: !!user && tab === 'my',
  })

  const createEvent = useMutation({
    mutationFn: () => api.post('/playdates', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['playdates'] }); qc.invalidateQueries({ queryKey: ['playdates-my'] }); setShowCreateModal(false); setForm({ title: '', description: '', event_type: 'meetup', date: '', time: '', duration_minutes: 60, location: '', city: user?.city || '', max_participants: 10, pet_types: [], is_public: true }); toast.success('Το event δημιουργήθηκε!') },
    onError: () => toast.error('Σφάλμα δημιουργίας'),
  })

  const sendInvite = useMutation({
    mutationFn: () => api.post(`/playdates/${showInviteModal}/invite`, { invitee_email: inviteEmail, message: inviteMsg }),
    onSuccess: () => { setShowInviteModal(null); setInviteEmail(''); setInviteMsg(''); toast.success('Πρόσκληση στάλθηκε!') },
    onError: (e: any) => toast.error(e?.message || 'Σφάλμα'),
  })

  const respondInvite = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/playdates/invitation/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['playdates-my'] }); toast.success('Απάντηση καταχωρήθηκε!') },
  })

  const deleteEvent = useMutation({
    mutationFn: (id: string) => api.delete(`/playdates/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['playdates'] }); qc.invalidateQueries({ queryKey: ['playdates-my'] }); toast.success('Διαγράφηκε') },
  })

  const togglePetType = (pt: string) => setForm(f => ({ ...f, pet_types: f.pet_types.includes(pt) ? f.pet_types.filter(p => p !== pt) : [...f.pet_types, pt] }))

  const inputCls = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-800 dark:text-white"
  const labelCls = "text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block"

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <div className="max-w-3xl mx-auto px-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Dog size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Pet Playdates</h1>
              <p className="text-sm text-gray-500">Βρες παρέα για το κατοικίδιό σου</p>
            </div>
          </div>
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors">
            <Plus size={16} /> Νέο Event
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-gray-900 rounded-2xl p-1.5 mb-4 shadow-sm">
          {[{ id: 'discover', label: '🔍 Ανακάλυψη' }, { id: 'my', label: '⭐ Δικά μου' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.id ? 'bg-green-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'discover' && (
          <>
            {/* Filters */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <input className="flex-1 min-w-32 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none dark:bg-gray-900"
                placeholder="🏙️ Πόλη..." value={cityFilter} onChange={e => setCityFilter(e.target.value)} />
              <div className="flex gap-1 overflow-x-auto">
                <button onClick={() => setFilterType('all')} className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap ${filterType === 'all' ? 'bg-green-500 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600'}`}>Όλα</button>
                {eventTypes.map(et => (
                  <button key={et.value} onClick={() => setFilterType(et.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap ${filterType === et.value ? 'bg-green-500 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600'}`}>
                    {et.label}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <>
                {/* Events */}
                {data?.events?.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">📅 Events κοντά σου</h2>
                    <div className="space-y-3">
                      {data.events.map((ev: any) => (
                        <div key={ev.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{eventTypes.find(t => t.value === ev.event_type)?.label.split(' ')[0] || '🐾'}</span>
                                <h3 className="font-semibold text-gray-900 dark:text-white">{ev.title}</h3>
                              </div>
                              {ev.description && <p className="text-sm text-gray-500 mb-2">{ev.description}</p>}
                              <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                                <span className="flex items-center gap-1"><Calendar size={12} />{ev.date} {ev.time}</span>
                                <span className="flex items-center gap-1"><MapPin size={12} />{ev.location}, {ev.city}</span>
                                <span className="flex items-center gap-1"><Users size={12} />{ev.invitations?.length || 0}/{ev.max_participants}</span>
                              </div>
                            </div>
                            {ev.creator_email === user?.email && (
                              <div className="flex gap-1">
                                <button onClick={() => setShowInviteModal(ev.id)} className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded-lg">Πρόσκληση</button>
                                <button onClick={() => deleteEvent.mutate(ev.id)} className="p-1 text-gray-400 hover:text-red-500"><X size={14} /></button>
                              </div>
                            )}
                            {ev.creator_email !== user?.email && (
                              <button onClick={() => setShowInviteModal(ev.id)} className="px-3 py-1.5 text-xs bg-green-500 text-white rounded-xl">Συμμετοχή</button>
                            )}
                          </div>
                          {ev.invitations?.length > 0 && (
                            <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-50 dark:border-gray-800">
                              <span className="text-xs text-gray-400">Συμμετέχουν:</span>
                              {ev.invitations.slice(0, 5).map((inv: any, i: number) => (
                                <div key={i} className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs overflow-hidden">
                                  {inv.invitee_photo ? <img src={inv.invitee_photo} className="w-full h-full object-cover" /> : inv.invitee_name[0]}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nearby owners */}
                {data?.nearbyOwners?.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">👥 Ιδιοκτήτες κοντά σου</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {data.nearbyOwners.map((owner: any) => (
                        <div key={owner.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center overflow-hidden shrink-0">
                            {owner.profile_photo ? <img src={owner.profile_photo} className="w-full h-full object-cover" /> : <span className="text-green-700 font-semibold text-sm">{owner.full_name[0]}</span>}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{owner.full_name}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={10} />{owner.city}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data?.events?.length === 0 && data?.nearbyOwners?.length === 0 && (
                  <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl shadow-sm">
                    <p className="text-4xl mb-3">🐾</p>
                    <p className="font-semibold text-gray-900 dark:text-white mb-1">Δεν βρέθηκαν αποτελέσματα</p>
                    <p className="text-sm text-gray-500">Δοκίμασε άλλη πόλη ή δημιούργησε το πρώτο event!</p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === 'my' && (
          <div className="space-y-6">
            {/* My events */}
            <div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">📅 Events που δημιούργησα</h2>
              {myData?.events?.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Δεν έχεις δημιουργήσει events ακόμα</p>}
              <div className="space-y-3">
                {myData?.events?.map((ev: any) => (
                  <div key={ev.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{ev.title}</h3>
                      <div className="flex gap-2">
                        <button onClick={() => setShowInviteModal(ev.id)} className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded-lg">+ Πρόσκληση</button>
                        <button onClick={() => deleteEvent.mutate(ev.id)} className="p-1 text-gray-400 hover:text-red-500"><X size={14} /></button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{ev.date} {ev.time} · {ev.location}</p>
                    <p className="text-xs text-gray-400">{ev.invitations?.filter((i: any) => i.status === 'accepted').length} αποδέχθηκαν</p>
                  </div>
                ))}
              </div>
            </div>

            {/* My invitations */}
            <div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">📬 Προσκλήσεις που έλαβα</h2>
              {myData?.invitations?.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Δεν έχεις λάβει προσκλήσεις ακόμα</p>}
              <div className="space-y-3">
                {myData?.invitations?.map((inv: any) => (
                  <div key={inv.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{inv.event.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">{inv.event.date} {inv.event.time} · {inv.event.location}</p>
                    {inv.message && <p className="text-sm text-gray-500 mt-1 italic">"{inv.message}"</p>}
                    {inv.status === 'pending' ? (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => respondInvite.mutate({ id: inv.id, status: 'accepted' })}
                          className="flex-1 py-2 bg-green-500 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1">
                          <Check size={14} /> Αποδοχή
                        </button>
                        <button onClick={() => respondInvite.mutate({ id: inv.id, status: 'declined' })}
                          className="flex-1 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400">
                          Απόρριψη
                        </button>
                      </div>
                    ) : (
                      <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${inv.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {inv.status === 'accepted' ? '✅ Αποδέχθηκες' : '❌ Απέρριψες'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCreateModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-4 bottom-4 z-50 max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Νέο Playdate Event</h3>
                <button onClick={() => setShowCreateModal(false)}><X size={18} className="text-gray-400" /></button>
              </div>
              <div className="space-y-3">
                <div><label className={labelCls}>Τίτλος *</label><input className={inputCls} value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="π.χ. Βόλτα στο Πεδίον Άρεως" /></div>
                <div><label className={labelCls}>Τύπος</label>
                  <div className="flex flex-wrap gap-2">
                    {eventTypes.map(et => (
                      <button key={et.value} type="button" onClick={() => setForm(f => ({...f, event_type: et.value}))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${form.event_type === et.value ? 'bg-green-500 text-white border-green-500' : 'border-gray-200 dark:border-gray-700 text-gray-600'}`}>
                        {et.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div><label className={labelCls}>Περιγραφή</label><textarea className={inputCls} rows={2} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={labelCls}>Ημερομηνία *</label><input type="date" className={inputCls} value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} /></div>
                  <div><label className={labelCls}>Ώρα *</label><input type="time" className={inputCls} value={form.time} onChange={e => setForm(f => ({...f, time: e.target.value}))} /></div>
                </div>
                <div><label className={labelCls}>Τοποθεσία *</label><input className={inputCls} value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} placeholder="π.χ. Πεδίον Άρεως, Αθήνα" /></div>
                <div><label className={labelCls}>Πόλη *</label><input className={inputCls} value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={labelCls}>Διάρκεια (λεπτά)</label><input type="number" className={inputCls} value={form.duration_minutes} onChange={e => setForm(f => ({...f, duration_minutes: Number(e.target.value)}))} /></div>
                  <div><label className={labelCls}>Μέγιστοι συμμετέχοντες</label><input type="number" className={inputCls} value={form.max_participants} onChange={e => setForm(f => ({...f, max_participants: Number(e.target.value)}))} /></div>
                </div>
                <div><label className={labelCls}>Είδη κατοικίδιων</label>
                  <div className="flex flex-wrap gap-2">
                    {petTypeOptions.map(pt => (
                      <button key={pt} type="button" onClick={() => togglePetType(pt)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${form.pet_types.includes(pt) ? 'bg-green-500 text-white border-green-500' : 'border-gray-200 dark:border-gray-700 text-gray-600'}`}>
                        {petTypeEmoji[pt]} {pt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={() => createEvent.mutate()} disabled={!form.title || !form.date || !form.time || !form.location || !form.city || createEvent.isPending}
                className="w-full mt-4 py-3 bg-green-500 text-white rounded-xl font-medium disabled:opacity-50">
                {createEvent.isPending ? 'Δημιουργία...' : 'Δημιουργία Event'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowInviteModal(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Αποστολή Πρόσκλησης</h3>
                <button onClick={() => setShowInviteModal(null)}><X size={18} className="text-gray-400" /></button>
              </div>
              <div className="space-y-3">
                <div><label className={labelCls}>Email χρήστη *</label><input className={inputCls} type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@example.com" /></div>
                <div><label className={labelCls}>Μήνυμα (προαιρετικό)</label><textarea className={inputCls} rows={2} value={inviteMsg} onChange={e => setInviteMsg(e.target.value)} placeholder="Έλα να βγάλουμε τα σκυλιά μαζί!" /></div>
              </div>
              <button onClick={() => sendInvite.mutate()} disabled={!inviteEmail || sendInvite.isPending}
                className="w-full mt-4 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {sendInvite.isPending ? 'Αποστολή...' : 'Αποστολή Πρόσκλησης'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
'@
Set-Content -Path (Join-Path $root "apps\web\src\pages\Playdates.tsx") -Value $f3 -Encoding UTF8 -NoNewline
Write-Host "OK: apps\web\src\pages\Playdates.tsx"

Write-Host "Done — real root cause fixed (Framer Motion transform conflict)."