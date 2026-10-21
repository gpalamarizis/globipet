import { useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Star, MapPin, Clock, Phone, Shield, Check,
  Calendar, ChevronRight, Heart, Share2, BadgeCheck, Home, Zap,
  Stethoscope, Scissors, GraduationCap, Footprints, Building2, Car, Camera, Pill, PawPrint, Package, Tag
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { cn, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ReviewReply from '@/components/provider/ReviewReply'

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
const typeLabelKeys: Record<string,string> = {
  veterinary:'cmpServiceCard.types.veterinary', grooming:'cmpServiceCard.types.grooming', training:'cmpServiceCard.types.training',
  pet_sitting:'cmpServiceCard.types.pet_sitting', walking:'cmpServiceCard.types.walking', boarding:'cmpServiceCard.types.boarding',
  pet_taxi:'cmpServiceCard.types.pet_taxi', photography:'cmpServiceCard.types.photography', pharmacy:'cmpServiceCard.types.pharmacy',
  adoption:'cmpServiceCard.types.adoption', shelter:'cmpServiceCard.types.shelter', other:'cmpServiceCard.types.other',
}

// Τοπική ημερομηνία ⇄ YYYY-MM-DD. Το toISOString() δίνει τη μέρα σε UTC
// (στην Ελλάδα, μετά τα μεσάνυχτα, ακόμη «χθες») και το new Date('YYYY-MM-DD')
// διαβάζεται ως UTC — άρα λάθος μέρα σε ζώνες δυτικά του Greenwich.
const toYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const fromYmd = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export default function ServiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { isAuthenticated, user } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState('')
  // Τα επιλεγμένα πακέτα κρατιούνται ως id -> ποσότητα: ο πελάτης μπορεί να
  // θέλει δύο φορές το ίδιο (π.χ. δύο σκύλοι, ίδιο μπάνιο).
  const [pkgQty, setPkgQty] = useState<Record<string, number>>({})
  const [selectedPet, setSelectedPet] = useState('')
  const [selectedStaff, setSelectedStaff] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [tab, setTab] = useState<'about' | 'reviews' | 'booking'>('about')
  const [bookingNote, setBookingNote] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const bookingRef = useRef<HTMLDivElement>(null)

  const goToBooking = () => {
    if (!isAuthenticated) { navigate('/login'); return }
    setTab('booking')
    setTimeout(() => bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  // Το κουμπί κοινοποίησης δεν είχε onClick. Ίδια λογική με το ProductDetail:
  // Web Share όπου υπάρχει, αλλιώς αντιγραφή συνδέσμου.
  const shareService = async () => {
    const url = `${window.location.origin}/services/${id}`
    const title = service?.provider_name ?? ''
    if (navigator.share) {
      try { await navigator.share({ title, url }); return }
      catch (e: any) { if (e?.name === 'AbortError') return }
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success(t('socialExtra.linkCopied'))
    } catch { toast.error(t('common.error')) }
  }

  const { data: service, isLoading } = useQuery({
    queryKey: ['service', id],
    queryFn: () => api.get(`/services/${id}`).then(r => r.data),
    enabled: !!id,
  })

  // Τα κατοικίδια του χρήστη, για να συνδεθεί η κράτηση με συγκεκριμένο ζώο.
  const { data: pets = [] } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets').then(r => r.data?.data ?? r.data ?? []),
    enabled: isAuthenticated,
  })

  // Τα πακέτα της υπηρεσίας με τις τιμές τους. Όταν ο πάροχος έχει ορίσει
  // πακέτα, η επιλογή είναι υποχρεωτική και ο server το επιβάλλει.
  const { data: packages = [] } = useQuery({
    queryKey: ['service-packages', id],
    queryFn: () => api.get(`/packages/service/${id}`).then(r => r.data?.data ?? []),
    enabled: !!id,
  })

  // Το προσωπικό της υπηρεσίας. Κενή λίστα σημαίνει πάροχος χωρίς γιατρούς.
  const { data: staff = [] } = useQuery({
    queryKey: ['service-staff', id],
    queryFn: () => api.get(`/staff/by-service/${id}`).then(r => r.data?.data ?? r.data ?? []),
    enabled: !!id,
  })

  const { data: reviews = [] } = useQuery({
    queryKey: ['service-reviews', id],
    // There is no /services/:id/reviews route — reviews are served from
    // /reviews with a service_id filter. The old path 404'd and the .catch
    // swallowed it, so this page showed no reviews at all, silently.
    queryFn: () => api.get(`/reviews?service_id=${id}`).then(r => r.data?.data ?? []),
    enabled: !!id,
  })

  const bookService = useMutation({
    // The payload used `date`, `time` and `provider_id`. None of those are
    // columns on Booking — it stores booking_date and booking_time, and the
    // provider is resolved from the service on the server. Prisma rejected
    // the unknown arguments, so this request never created a booking.
    // Κράτηση ΚΑΙ πληρωμή, σε μία κίνηση.
    //
    // Η κράτηση γεννιέται pending/unpaid και ο πελάτης φεύγει αμέσως για το
    // Viva. Αν γυρίσει πίσω χωρίς να πληρώσει, η κράτηση μένει απλήρωτη και
    // φαίνεται στο «Οι κρατήσεις μου» με κουμπί πληρωμής — δεν χάνεται.
    mutationFn: async () => {
      const { data: booking } = await api.post('/bookings', {
        service_id: id,
        booking_date: selectedDate,
        booking_time: selectedTime,
        notes: bookingNote,
        pet_id: selectedPet || undefined,
        staff_id: selectedStaff || undefined,
        packages: chosenPackages.map((pk: any) => ({
          package_id: pk.id,
          quantity: pkgQty[pk.id] ?? 1,
        })),
      })
      const { data: viva } = await api.post('/bookings/viva/checkout', {
        booking_id: booking.id,
      })
      if (viva?.checkoutUrl) {
        window.location.href = viva.checkoutUrl
        return null                       // φεύγουμε από τη σελίδα
      }
      // Χωρίς σελίδα πληρωμής δεν πανηγυρίζουμε: η κράτηση υπάρχει αλλά
      // είναι απλήρωτη, και ο χρήστης πρέπει να το ξέρει.
      throw new Error(t('bookings.noPaymentPage'))
    },
    // onSettled: η κράτηση δημιουργείται πριν το checkout, οπότε υπάρχει και
    // όταν η πληρωμή δεν ξεκινήσει — οι λίστες ανανεώνονται και τότε.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['my-next-booking'] })
    },
    onError: (err: any) => toast.error(err?.message || t('common.error')),
  })

  // Προεπισκόπηση έκπτωσης καμπάνιας — ο server υπολογίζει το ίδιο όταν
  // δημιουργεί την κράτηση, από τις τιμές της βάσης.
  const quotePackages = (packages as any[])
    .filter((pk: any) => (pkgQty[pk.id] ?? 0) > 0)
    .map((pk: any) => ({ package_id: pk.id, quantity: pkgQty[pk.id] }))
  const { data: quote } = useQuery({
    queryKey: ['quote-booking', id, quotePackages],
    queryFn: () => api.post('/campaigns/quote', { items: [{ type: 'booking', service_id: id, packages: quotePackages }] })
      .then(r => r.data?.data?.items?.[0] ?? null),
    enabled: isAuthenticated && !!id,
  })

  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00',
  ]

  // Generate next 14 days
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i + 1)
    return toYmd(d)
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

  // Το σύνολο υπολογίζεται εδώ ΜΟΝΟ για εμφάνιση. Η χρέωση γίνεται πάντα
  // με τις τιμές της βάσης — ο server δεν δέχεται ποσό από τον πελάτη.
  const chosenPackages = packages.filter((pk: any) => (pkgQty[pk.id] ?? 0) > 0)
  const packagesTotal = chosenPackages.reduce(
    (sum: number, pk: any) => sum + pk.price * (pkgQty[pk.id] ?? 0), 0)
  const displayTotal = chosenPackages.length ? packagesTotal : (service?.price ?? 0)

  // Όπου ο πάροχος έχει πακέτα, η επιλογή είναι υποχρεωτική.
  const packagesOk = packages.length === 0 || chosenPackages.length > 0
  const canBook = isAuthenticated && selectedDate && selectedTime && packagesOk
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
        <div className="lg:col-span-2 space-y-6 min-w-0">
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
                {t(`services.types.${service.service_type}` as any, { defaultValue: typeLabelKeys[service.service_type] ? t(typeLabelKeys[service.service_type]) : service.service_type })}
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
            <div className="flex" role="tablist" aria-label={t('serviceDetailExtra.tabsAriaLabel')}>
              {(['about', 'reviews', 'booking'] as const).map(t_ => (
                <button key={t_} onClick={() => setTab(t_)}
                  role="tab"
                  aria-selected={tab === t_}
                  className={cn('px-5 py-3 text-sm font-medium transition-all border-b-2 -mb-px',
                    tab === t_
                      ? 'border-brand-900 text-brand-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700')}>
                  {t_ === 'about' ? t('serviceDetailExtra.about')
                   : t_ === 'reviews' ? t('common.reviews')
                   : t('services.bookNow')}
                </button>
              ))}
            </div>
          </div>

          {tab === 'about' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {service.description || t('serviceDetailExtra.noDescription')}
              </p>

              {/* Provider info */}
              {service.provider_name && (
                <div className="card p-4 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xl font-bold text-brand-900">
                    {service.provider_name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white">{service.provider_name}</p>
                    {/* Service has no provider_bio column; the free-text
                        field is `description`. */}
                    {service.description && (
                      <p className="text-sm text-gray-500 truncate">{service.description}</p>
                    )}
                  </div>
                  {/* The column is contact_phone. */}
                  {service.contact_phone && (
                    <a href={`tel:${service.contact_phone}`}
                      className="p-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                      <Phone size={18} />
                    </a>
                  )}
                </div>
              )}

              {/* Features */}
            </motion.div>
          )}

          {tab === 'reviews' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {reviews.length === 0 ? (
                <div className="text-center py-12">
                  <Star size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">{t('serviceDetailExtra.noReviews')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((r: any) => (
                    <div key={r.id} className="card p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xs font-bold text-brand-900">
                            {/* Review έχει customer_name (όχι user_name) — schema.prisma. */}
                            {r.customer_name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{r.customer_name}</span>
                        </div>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={12}
                              className={s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                          ))}
                        </div>
                      </div>
                      {r.comment && <p className="text-sm text-gray-600 dark:text-gray-400">{r.comment}</p>}
                      {/* Απάντηση παρόχου (δημόσια)· ο ίδιος ο πάροχος της κριτικής απαντά/διορθώνει από εδώ. */}
                      <ReviewReply review={r}
                        canEdit={isAuthenticated && !!user?.email && (user.email === r.provider_email || user.role === 'admin')}
                        invalidate={[['service-reviews', id], ['provider-reviews']]} />
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
                  <button onClick={() => navigate('/login')} className="btn-primary">{t('auth.login')}</button>
                </div>
              ) : (
                <>
                  {/* Κατοικίδιο — μόνο αν ο χρήστης έχει. Προαιρετικό:
                      υπάρχουν υπηρεσίες που δεν αφορούν συγκεκριμένο ζώο. */}
                  {pets.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                        <PawPrint size={14} className="inline mr-1.5" />{t('serviceDetailExtra.forPet')}
                      </label>
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {pets.map((pet: any) => (
                          <button key={pet.id} onClick={() => setSelectedPet(selectedPet === pet.id ? '' : pet.id)}
                            className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border-2 whitespace-nowrap transition-all',
                              selectedPet === pet.id
                                ? 'border-brand-900 bg-brand-50 dark:bg-brand-900/20 text-brand-900'
                                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand-300')}>
                            <span className="text-base">{pet.species === 'cat' ? '🐈' : '🐕'}</span>
                            <span className="text-sm font-medium">{pet.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Πακέτα με τιμές. Όπου υπάρχουν, η επιλογή είναι
                      υποχρεωτική — το ίδιο επιβάλλει και ο server. */}
                  {packages.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                        <Package size={14} className="inline mr-1.5" />{t('serviceDetailExtra.choosePackages')}
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="space-y-2">
                        {packages.map((pk: any) => {
                          const qty = pkgQty[pk.id] ?? 0
                          return (
                            <div key={pk.id}
                              className={cn('flex items-center gap-3 p-3 rounded-xl border-2 transition-all',
                                qty > 0 ? 'border-brand-900 bg-brand-50 dark:bg-brand-900/20'
                                        : 'border-gray-200 dark:border-gray-700')}>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{pk.name}</p>
                                {pk.description && (
                                  <p className="text-xs text-gray-500 truncate">{pk.description}</p>
                                )}
                              </div>
                              <p className="font-bold text-sm text-gray-900 dark:text-white whitespace-nowrap">
                                {formatCurrency(pk.price)}
                              </p>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button type="button" aria-label={t('common.remove')}
                                  onClick={() => setPkgQty(q => ({ ...q, [pk.id]: Math.max(0, (q[pk.id] ?? 0) - 1) }))}
                                  disabled={qty === 0}
                                  className="w-7 h-7 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-30">−</button>
                                <span className="w-5 text-center text-sm font-semibold text-gray-900 dark:text-white">{qty}</span>
                                <button type="button" aria-label={t('common.add')}
                                  onClick={() => setPkgQty(q => ({ ...q, [pk.id]: (q[pk.id] ?? 0) + 1 }))}
                                  className="w-7 h-7 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300">+</button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {!packagesOk && (
                        <p className="text-xs text-red-500 mt-2">{t('serviceDetailExtra.packageRequired')}</p>
                      )}
                    </div>
                  )}

                  {/* Γιατρός — μόνο όπου ο πάροχος έχει προσωπικό. Προαιρετικό:
                      ο πελάτης μπορεί να μην έχει προτίμηση. */}
                  {staff.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                        <Stethoscope size={14} className="inline mr-1.5" />{t('serviceDetailExtra.choosePractitioner')}
                      </label>
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        <button onClick={() => setSelectedStaff('')}
                          className={cn('px-3 py-2 rounded-xl border-2 text-sm font-medium whitespace-nowrap transition-all',
                            selectedStaff === ''
                              ? 'border-brand-900 bg-brand-50 dark:bg-brand-900/20 text-brand-900'
                              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400')}>
                          {t('serviceDetailExtra.anyPractitioner')}
                        </button>
                        {staff.map((m: any) => (
                          <button key={m.id} onClick={() => setSelectedStaff(m.id)}
                            className={cn('px-3 py-2 rounded-xl border-2 text-sm font-medium whitespace-nowrap transition-all',
                              selectedStaff === m.id
                                ? 'border-brand-900 bg-brand-50 dark:bg-brand-900/20 text-brand-900'
                                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand-300')}>
                            {m.full_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Date picker */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      <Calendar size={14} className="inline mr-1.5" />{t('serviceDetailExtra.date')}
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {dates.map(d => {
                        const date = fromYmd(d)
                        const day = date.toLocaleDateString(i18n.language, { weekday: 'short' })
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
                        <Clock size={14} className="inline mr-1.5" />{t('serviceDetailExtra.time')}
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
                      {t('serviceDetailExtra.addNote')}
                    </button>
                  )}

                  {/* Το σύνολο ΠΡΙΝ το κουμπί: ο χρήστης βλέπει τι θα πληρώσει
                      πριν φύγει για το Viva, όχι αφού φτάσει εκεί. */}
                  {/* Έκπτωση καμπάνιας ΠΑΝΩ από το σύνολο: αρχική τιμή → έκπτωση → τελικό. */}
                  {quote?.discount > 0 && (
                    <div className="flex items-start justify-between gap-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-sm text-green-700 dark:text-green-400">
                      <span className="flex items-start gap-1.5 min-w-0">
                        <Tag size={13} className="shrink-0 mt-[3px]" />
                        <span className="break-words">{t('campaignDiscount.line', { title: quote.campaign?.title })}</span>
                      </span>
                      <span className="shrink-0">
                        <s className="text-gray-400 mr-2">{formatCurrency(quote.line)}</s>−{formatCurrency(quote.discount)}
                      </span>
                    </div>
                  )}
                  <div className={cn('flex items-center justify-between py-3', !(quote?.discount > 0) && 'border-t border-gray-200 dark:border-gray-700')}>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('serviceDetailExtra.total')}
                    </span>
                    <span className="text-xl font-bold text-brand-900 dark:text-brand-400">
                      {formatCurrency(quote?.discount > 0 ? quote.final : displayTotal)}
                    </span>
                  </div>

                  <button
                    onClick={() => bookService.mutate()}
                    disabled={!canBook || bookService.isPending}
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                    <Calendar size={18} />
                    {bookService.isPending ? t('bookingsExtra.sending') : t('services.bookNow')}
                  </button>
                  <p className="text-xs text-gray-400 text-center mt-2">{t('bookingPolicy.note')}</p>
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
            {/* There is no price_per column, so neither branch ever
                rendered and the price showed with no unit beside it. Services
                are priced per session. */}
            {service.price > 0 && (
              <p className="text-sm text-gray-500 mb-4">{t('serviceDetailExtra.perSession')}</p>
            )}

            <button
              onClick={goToBooking}
              className="btn-primary w-full mb-3 flex items-center justify-center gap-2">
              <Calendar size={16} />
              {t('services.bookNow')}
            </button>

            <button onClick={shareService} className="btn-secondary w-full flex items-center justify-center gap-2" aria-label={t('serviceDetailExtra.shareAriaLabel')}>
              <Share2 size={16} />
              {t('serviceDetailExtra.share')}
            </button>

            {/* Quick info */}
            <div className="mt-4 space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              {service.city && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('serviceDetailExtra.location')}</span>
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
          <p className="text-xs text-gray-500">{t('serviceDetailExtra.price')}</p>
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
