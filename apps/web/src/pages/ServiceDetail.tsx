import { useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Star, MapPin, Clock, Phone, Shield, Check,
  Calendar, ChevronRight, Heart, Share2, BadgeCheck, Home, Zap,
  Stethoscope, Scissors, GraduationCap, Footprints, Building2, Car, Camera, Pill, PawPrint,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { cn, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

// #6: illustration fallback per service type (instead of one generic 🐾 emoji)
const typeIllustration: Record<string, { Icon: typeof Stethoscope, bg: string, fg: string }> = {
  veterinary:  { Icon: Stethoscope,   bg: 'bg-red-50 dark:bg-red-900/15',       fg: 'text-red-400 dark:text-red-500' },
  grooming:    { Icon: Scissors,      bg: 'bg-purple-50 dark:bg-purple-900/15', fg: 'text-purple-400 dark:text-purple-500' },
  training:    { Icon: GraduationCap, bg: 'bg-blue-50 dark:bg-blue-900/15',     fg: 'text-blue-400 dark:text-blue-500' },
  pet_sitting: { Icon: Home,          bg: 'bg-green-50 dark:bg-green-900/15',   fg: 'text-green-400 dark:text-green-500' },
  walking:     { Icon: Footprints,    bg: 'bg-yellow-50 dark:bg-yellow-900/15', fg: 'text-yellow-500 dark:text-yellow-500' },
  boarding:    { Icon: Building2,     bg: 'bg-orange-50 dark:bg-orange-900/15', fg: 'text-orange-400 dark:text-orange-500' },
  pet_taxi:    { Icon: Car,           bg: 'bg-teal-50 dark:bg-teal-900/15',     fg: 'text-teal-400 dark:text-teal-500' },
  photography: { Icon: Camera,        bg: 'bg-pink-50 dark:bg-pink-900/15',     fg: 'text-pink-400 dark:text-pink-500' },
  pharmacy:    { Icon: Pill,          bg: 'bg-indigo-50 dark:bg-indigo-900/15', fg: 'text-indigo-400 dark:text-indigo-500' },
}
const defaultIllustration = { Icon: PawPrint, bg: 'bg-gray-50 dark:bg-gray-800', fg: 'text-gray-300 dark:text-gray-600' }

// Local label fallback so a missing/incomplete i18n key never shows the raw key to the user
const typeLabels: Record<string,string> = {
  veterinary:'Κτηνίατρος', grooming:'Περιποίηση', training:'Εκπαίδευση',
  pet_sitting:'Φιλοξενία · Ιδιώτης', walking:'Βόλτες', boarding:'Φιλοξενία · Ξενοδοχείο',
  pet_taxi:'Pet Taxi', photography:'Φωτογράφιση', pharmacy:'Φαρμακείο',
  adoption:'Υιοθεσία', shelter:'Καταφύγιο', other:'Άλλο',
}

export default function ServiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [tab, setTab] = useState<'about' | 'reviews' | 'booking'>('about')
  const [bookingNote, setBookingNote] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const bookingRef = useRef<HTMLDivElement>(null)

  const goToBooking = () => {
    if (!isAuthenticated) { navigate('/auth'); return }
    setTab('booking')
    setTimeout(() => bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const { data: service, isLoading } = useQuery({
    queryKey: ['service', id],
    queryFn: () => api.get(`/services/${id}`).then(r => r.data),
    enabled: !!id,
  })

  const { data: reviews = [] } = useQuery({
    queryKey: ['service-reviews', id],
    queryFn: () => api.get(`/services/${id}/reviews`).then(r => r.data?.data ?? []).catch(() => []),
    enabled: !!id,
  })

  const bookService = useMutation({
    mutationFn: () => api.post('/bookings', {
      service_id: id,
      provider_id: service?.provider_id,
      date: selectedDate,
      time: selectedTime,
      notes: bookingNote,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      toast.success('✅ ' + t('bookings.status.confirmed'))
      navigate('/bookings')
    },
    onError: () => toast.error(t('common.error')),
  })

  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00',
  ]

  // Generate next 14 days
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i + 1)
    return d.toISOString().split('T')[0]
  })

  if (isLoading) return (
    <div className="page-container py-24 flex justify-center">
      <LoadingSpinner />
    </div>
  )

  if (!service) return (
    <div className="page-container py-16 text-center">
      <p className="text-4xl mb-4">🐾</p>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('common.noResults')}</h2>
      <button onClick={() => navigate('/services')} className="btn-primary mt-4">{t('nav.services')}</button>
    </div>
  )

  const avgRating = reviews.length > 0
    ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length
    : service.rating || 0

  const canBook = isAuthenticated && selectedDate && selectedTime
  const illustration = typeIllustration[service.service_type] || defaultIllustration
  const { Icon: TypeIcon, bg: illuBg, fg: illuFg } = illustration

  return (
    <div className="page-container py-8 pb-24 lg:pb-8 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <button onClick={() => navigate(-1)} className="hover:text-brand-900 flex items-center gap-1">
          <ArrowLeft size={15} /> {t('common.back')}
        </button>
        <ChevronRight size={13} />
        <Link to="/services" className="hover:text-brand-900">{t('nav.services')}</Link>
        <ChevronRight size={13} />
        <span className="text-gray-900 dark:text-white truncate max-w-[200px]">{service.provider_name}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero image */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="aspect-video rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
            {service.image_url
              ? <img src={service.image_url} alt={service.provider_name} className="w-full h-full object-cover" />
              : <div className={cn('w-full h-full flex items-center justify-center', illuBg)}><TypeIcon size={72} className={illuFg} strokeWidth={1.5} /></div>
            }
          </motion.div>

          {/* Header */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.1 } }}>
            {/* Type badge */}
            <div className="flex items-center gap-2 mb-3">
              <span className="badge bg-brand-50 text-brand-900 dark:bg-brand-900/20 text-xs capitalize">
                {t(`services.types.${service.service_type}` as any, { defaultValue: typeLabels[service.service_type] || service.service_type })}
              </span>
              {service.is_verified && (
                <span className="flex items-center gap-1 badge bg-green-50 text-green-700 dark:bg-green-900/20 text-xs">
                  <BadgeCheck size={11} /> {t('services.verified')}
                </span>
              )}
              {service.emergency_available && (
                <span className="badge bg-red-50 text-red-600 dark:bg-red-900/20 text-xs">
                  <Zap size={11} className="inline mr-1" />{t('services.emergency')}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-2">
              {service.provider_name}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={15}
                    className={s <= Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                ))}
              </div>
              <span className="text-sm text-gray-500">
                {avgRating.toFixed(1)} ({reviews.length || service.reviews_count || 0} {t('common.reviews')})
              </span>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              {service.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} /> {service.city}
                </span>
              )}
              {service.duration && (
                <span className="flex items-center gap-1.5">
                  <Clock size={14} /> {service.duration} {t('bookings.minutes')}
                </span>
              )}
              {service.home_visits && (
                <span className="flex items-center gap-1.5 text-green-600">
                  <Home size={14} /> {t('services.homeVisits')}
                </span>
              )}
              {service.years_experience && (
                <span className="flex items-center gap-1.5">
                  <Shield size={14} /> {service.years_experience} {t('services.yearsExp')}
                </span>
              )}
            </div>
          </motion.div>

          {/* Tabs */}
          <div ref={bookingRef} className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex">
              {(['about', 'reviews', 'booking'] as const).map(t_ => (
                <button key={t_} onClick={() => setTab(t_)}
                  className={cn('px-5 py-3 text-sm font-medium transition-all border-b-2 -mb-px',
                    tab === t_
                      ? 'border-brand-900 text-brand-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700')}>
                  {t_ === 'about' ? 'About'
                   : t_ === 'reviews' ? t('common.reviews')
                   : t('services.bookNow')}
                </button>
              ))}
            </div>
          </div>

          {tab === 'about' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {service.description || 'No description available.'}
              </p>

              {/* Provider info */}
              {service.provider_name && (
                <div className="card p-4 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xl font-bold text-brand-900">
                    {service.provider_name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white">{service.provider_name}</p>
                    {service.provider_bio && (
                      <p className="text-sm text-gray-500 truncate">{service.provider_bio}</p>
                    )}
                  </div>
                  {service.provider_phone && (
                    <a href={`tel:${service.provider_phone}`}
                      className="p-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                      <Phone size={18} />
                    </a>
                  )}
                </div>
              )}

              {/* Features */}
              {service.features && service.features.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {service.features.map((f: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <Check size={14} className="text-green-500 shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{f}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {tab === 'reviews' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {reviews.length === 0 ? (
                <div className="text-center py-12">
                  <Star size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No reviews yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((r: any) => (
                    <div key={r.id} className="card p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xs font-bold text-brand-900">
                            {r.user_name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{r.user_name}</span>
                        </div>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={12}
                              className={s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                          ))}
                        </div>
                      </div>
                      {r.comment && <p className="text-sm text-gray-600 dark:text-gray-400">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {tab === 'booking' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              {!isAuthenticated ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">{t('authExtra.requiredTitle')}</p>
                  <button onClick={() => navigate('/auth')} className="btn-primary">{t('auth.login')}</button>
                </div>
              ) : (
                <>
                  {/* Date picker */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      <Calendar size={14} className="inline mr-1.5" />Date
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {dates.map(d => {
                        const date = new Date(d)
                        const day = date.toLocaleDateString('en', { weekday: 'short' })
                        const num = date.getDate()
                        return (
                          <button key={d} onClick={() => setSelectedDate(d)}
                            className={cn('flex flex-col items-center p-3 rounded-xl border-2 min-w-[60px] transition-all',
                              selectedDate === d
                                ? 'border-brand-900 bg-brand-50 dark:bg-brand-900/20 text-brand-900'
                                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand-300')}>
                            <span className="text-xs font-medium">{day}</span>
                            <span className="text-lg font-bold">{num}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Time picker */}
                  {selectedDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                        <Clock size={14} className="inline mr-1.5" />Time
                      </label>
                      <div className="grid grid-cols-5 gap-2">
                        {timeSlots.map(time => (
                          <button key={time} onClick={() => setSelectedTime(time)}
                            className={cn('py-2 px-3 rounded-xl text-sm font-medium border-2 transition-all',
                              selectedTime === time
                                ? 'border-brand-900 bg-brand-50 dark:bg-brand-900/20 text-brand-900'
                                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand-300')}>
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes — collapsed by default to keep the flow short */}
                  {showNotes ? (
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                        {t('bookingsExtra.commentPlaceholder')}
                      </label>
                      <textarea
                        autoFocus
                        value={bookingNote}
                        onChange={e => setBookingNote(e.target.value)}
                        placeholder={t('bookingsExtra.commentPlaceholder')}
                        className="input w-full h-24 resize-none"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowNotes(true)}
                      className="text-sm text-brand-900 dark:text-brand-400 font-medium hover:underline">
                      + Προσθήκη σημείωσης (προαιρετικό)
                    </button>
                  )}

                  <button
                    onClick={() => bookService.mutate()}
                    disabled={!canBook || bookService.isPending}
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                    <Calendar size={18} />
                    {bookService.isPending ? t('bookingsExtra.sending') : t('services.bookNow')}
                  </button>
                </>
              )}
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Price card */}
          <div className="card p-5 sticky top-20">
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {service.price ? formatCurrency(service.price) : t('common.free')}
            </div>
            {service.price_per === 'hour' && (
              <p className="text-sm text-gray-500 mb-4">/ hour</p>
            )}
            {service.price_per === 'session' && (
              <p className="text-sm text-gray-500 mb-4">/ session</p>
            )}

            <button
              onClick={goToBooking}
              className="btn-primary w-full mb-3 flex items-center justify-center gap-2">
              <Calendar size={16} />
              {t('services.bookNow')}
            </button>

            <button className="btn-secondary w-full flex items-center justify-center gap-2">
              <Share2 size={16} />
              Share
            </button>

            {/* Quick info */}
            <div className="mt-4 space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              {service.duration && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Duration</span>
                  <span className="font-medium text-gray-900 dark:text-white">{service.duration} min</span>
                </div>
              )}
              {service.city && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Location</span>
                  <span className="font-medium text-gray-900 dark:text-white">{service.city}</span>
                </div>
              )}
              {service.home_visits && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('services.homeVisits')}</span>
                  <Check size={16} className="text-green-500" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* #10: mobile sticky booking bar — 1-tap access, no scroll/tab hunting */}
      <div className="lg:hidden fixed bottom-20 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between gap-3 shadow-card-hover">
        <div>
          <p className="text-xs text-gray-500">Τιμή</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {service.price ? formatCurrency(service.price) : t('common.free')}
          </p>
        </div>
        <button onClick={goToBooking} className="btn-primary flex-1 max-w-[200px] flex items-center justify-center gap-2 py-3">
          <Calendar size={16} />
          {t('services.bookNow')}
        </button>
      </div>
    </div>
  )
}
