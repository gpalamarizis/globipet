import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Star, MapPin, Clock, Phone, Shield, Check,
  Calendar, ChevronRight, ChevronDown, Heart, Share2, BadgeCheck, Home, Zap,
  Plus, Minus, ShoppingCart, X, Package
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { cn, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

// ─── Group metadata ──────────────────────────────────────────
const GROUP_META: Record<string, { label: string; emoji: string }> = {
  bathing:      { label: 'Μπάνιο',           emoji: '🛁' },
  haircut:      { label: 'Κούρεμα',          emoji: '✂️' },
  addon:        { label: 'Extras',           emoji: '✨' },
  consultation: { label: 'Επισκέψεις',       emoji: '🩺' },
  vaccination:  { label: 'Εμβολιασμοί',      emoji: '💉' },
  surgery:      { label: 'Χειρουργικές',     emoji: '🏥' },
  dental:       { label: 'Οδοντιατρικά',     emoji: '🦷' },
  diagnostics:  { label: 'Διαγνωστικά',      emoji: '🔬' },
  specialty:    { label: 'Ειδικότητες',      emoji: '👨‍⚕️' },
  oncology:     { label: 'Ογκολογία',        emoji: '🎗️' },
  service:      { label: 'Υπηρεσίες',        emoji: '🐕' },
  emergency:    { label: 'Έκτακτα',          emoji: '🚨' },
  other:        { label: 'Άλλα',             emoji: '📋' },
}
const SIZE_LABELS: Record<string, string> = { small: 'Μικρό', medium: 'Μεσαίο', large: 'Μεγάλο', xlarge: 'Πολύ μεγάλο' }
const MODALITY_LABELS: Record<string, string> = {
  in_clinic: 'Στο ιατρείο', home_visit: 'Κατ\' οίκον', telehealth: 'Τηλεσυμβ.', emergency: 'Έκτακτο'
}

// Order of groups in display
const GROUP_ORDER = [
  'consultation', 'service', 'bathing', 'haircut',
  'vaccination', 'dental', 'diagnostics', 'specialty', 'surgery', 'oncology',
  'emergency', 'other', 'addon'
]

interface Selection {
  package: any
  quantity: number
}

export default function ServiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [tab, setTab] = useState<'about' | 'packages' | 'reviews' | 'booking'>('packages')
  const [bookingNote, setBookingNote] = useState('')
  const [selections, setSelections] = useState<Map<string, Selection>>(new Map())
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [cartOpen, setCartOpen] = useState(false)

  const { data: service, isLoading } = useQuery({
    queryKey: ['service', id],
    queryFn: () => api.get(`/services/${id}`).then(r => r.data),
    enabled: !!id,
  })

  const { data: packagesData } = useQuery({
    queryKey: ['service-packages', id],
    queryFn: () => api.get(`/packages/service/${id}`).then(r => r.data),
    enabled: !!id,
  })

  const { data: reviews = [] } = useQuery({
    queryKey: ['service-reviews', id],
    queryFn: () => api.get(`/services/${id}/reviews`).then(r => r.data?.data ?? []).catch(() => []),
    enabled: !!id,
  })

  // Group packages by `group` (in fixed order)
  const groupedPackages = useMemo(() => {
    const all = (packagesData?.data || []).filter((p: any) => p.is_active)
    const grouped: Record<string, any[]> = {}
    for (const pkg of all) {
      if (!grouped[pkg.group]) grouped[pkg.group] = []
      grouped[pkg.group].push(pkg)
    }
    // Return ordered entries
    return GROUP_ORDER
      .filter(g => grouped[g])
      .map(g => [g, grouped[g]] as [string, any[]])
      .concat(Object.entries(grouped).filter(([g]) => !GROUP_ORDER.includes(g)))
  }, [packagesData])

  const hasPackages = groupedPackages.length > 0

  // Auto-pick tab based on availability
  useMemo(() => {
    if (service && !hasPackages && tab === 'packages') setTab('about')
  }, [service, hasPackages])

  // Cart totals
  const cartItems = Array.from(selections.values())
  const totalPrice = cartItems.reduce((s, sel) => s + sel.package.price * sel.quantity, 0)
  const totalDuration = cartItems.reduce((s, sel) => s + (sel.package.duration_minutes || 0) * sel.quantity, 0)

  const updateQty = (pkg: any, delta: number) => {
    setSelections(prev => {
      const next = new Map(prev)
      const cur = next.get(pkg.id)
      const newQty = (cur?.quantity || 0) + delta
      if (newQty <= 0) next.delete(pkg.id)
      else next.set(pkg.id, { package: pkg, quantity: newQty })
      return next
    })
  }

  const setQty = (pkg: any, qty: number) => {
    setSelections(prev => {
      const next = new Map(prev)
      if (qty <= 0) next.delete(pkg.id)
      else next.set(pkg.id, { package: pkg, quantity: qty })
      return next
    })
  }

  const toggleGroup = (g: string) => {
    setCollapsedGroups(prev => {
      const n = new Set(prev)
      n.has(g) ? n.delete(g) : n.add(g)
      return n
    })
  }

  const bookService = useMutation({
    mutationFn: () => api.post('/bookings', {
      service_id: id,
      scheduled_at: `${selectedDate}T${selectedTime}:00`,
      notes: bookingNote,
      total_price: totalPrice || service?.price || 0,
      packages: cartItems.map(s => ({
        package_id: s.package.id,
        quantity: s.quantity,
        price_snapshot: s.package.price,
        name_snapshot: s.package.name,
      })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      toast.success('✅ Η κράτηση καταχωρήθηκε')
      navigate('/bookings')
    },
    onError: () => toast.error('Σφάλμα κατά την κράτηση'),
  })

  const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i + 1)
    return d.toISOString().split('T')[0]
  })

  if (isLoading) return (
    <div className="page-container py-24 flex justify-center"><LoadingSpinner /></div>
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

  const hasSelections = cartItems.length > 0
  const canBook = isAuthenticated && selectedDate && selectedTime && (hasSelections || !hasPackages)

  return (
    <div className="page-container py-8 pb-32 lg:pb-8 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <button onClick={() => navigate(-1)} className="hover:text-brand-900 flex items-center gap-1">
          <ArrowLeft size={15} /> {t('common.back')}
        </button>
        <ChevronRight size={13} />
        <Link to="/services" className="hover:text-brand-900">{t('nav.services')}</Link>
        <ChevronRight size={13} />
        <span className="text-gray-900 dark:text-white truncate max-w-[200px]">{service.name}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="aspect-video rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
            {service.image_url || service.cover_image
              ? <img src={service.image_url || service.cover_image} alt={service.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-8xl">🐾</div>
            }
          </motion.div>

          {/* Header */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.1 } }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="badge bg-brand-50 text-brand-900 dark:bg-brand-900/20 text-xs capitalize">
                {t(`services.types.${service.type || service.category}` as any) || service.type || service.category}
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
              {service.name || service.title}
            </h1>

            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={15}
                    className={s <= Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                ))}
              </div>
              <span className="text-sm text-gray-500">
                {avgRating.toFixed(1)} ({reviews.length || service.reviews_count || service.review_count || 0} {t('common.reviews')})
              </span>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              {service.city && <span className="flex items-center gap-1.5"><MapPin size={14} /> {service.city}</span>}
              {service.home_visits && <span className="flex items-center gap-1.5 text-green-600"><Home size={14} /> {t('services.homeVisits')}</span>}
              {service.years_experience > 0 && <span className="flex items-center gap-1.5"><Shield size={14} /> {service.years_experience} {t('services.yearsExp')}</span>}
            </div>
          </motion.div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex overflow-x-auto">
              {hasPackages && (
                <button onClick={() => setTab('packages')}
                  className={cn('px-5 py-3 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap',
                    tab === 'packages' ? 'border-brand-900 text-brand-900' : 'border-transparent text-gray-500 hover:text-gray-700')}>
                  📋 Υπηρεσίες & τιμές
                </button>
              )}
              <button onClick={() => setTab('about')}
                className={cn('px-5 py-3 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap',
                  tab === 'about' ? 'border-brand-900 text-brand-900' : 'border-transparent text-gray-500 hover:text-gray-700')}>
                Σχετικά
              </button>
              <button onClick={() => setTab('reviews')}
                className={cn('px-5 py-3 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap',
                  tab === 'reviews' ? 'border-brand-900 text-brand-900' : 'border-transparent text-gray-500 hover:text-gray-700')}>
                {t('common.reviews')} ({reviews.length})
              </button>
              <button onClick={() => setTab('booking')}
                className={cn('px-5 py-3 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap',
                  tab === 'booking' ? 'border-brand-900 text-brand-900' : 'border-transparent text-gray-500 hover:text-gray-700')}>
                📅 Κράτηση
              </button>
            </div>
          </div>

          {/* PACKAGES TAB */}
          {tab === 'packages' && hasPackages && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                <Package size={14} className="mt-0.5 shrink-0"/>
                <span>Επιλέξτε όσες υπηρεσίες χρειάζεστε. Συνολική τιμή υπολογίζεται αυτόματα.</span>
              </div>

              {groupedPackages.map(([group, items]) => {
                const meta = GROUP_META[group] || GROUP_META.other
                const isCollapsed = collapsedGroups.has(group)
                const minPrice = Math.min(...items.map((i: any) => i.price))
                return (
                  <div key={group} className="card overflow-hidden">
                    <button onClick={() => toggleGroup(group)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{meta.emoji}</span>
                        <div className="text-left">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{meta.label}</h3>
                          <p className="text-xs text-gray-500">{items.length} επιλογές · από €{minPrice.toFixed(2)}</p>
                        </div>
                      </div>
                      {isCollapsed ? <ChevronRight size={18} className="text-gray-400"/> : <ChevronDown size={18} className="text-gray-400"/>}
                    </button>

                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-gray-100 dark:border-gray-800">
                          <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {items.map((pkg: any) => {
                              const sel = selections.get(pkg.id)
                              const qty = sel?.quantity || 0
                              return (
                                <div key={pkg.id} className={cn('p-4 flex items-center gap-3 transition-colors',
                                  qty > 0 && 'bg-brand-50/30 dark:bg-brand-900/10')}>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-medium text-sm text-gray-900 dark:text-white">{pkg.name}</p>
                                      {pkg.size && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">{SIZE_LABELS[pkg.size]}</span>}
                                      {pkg.modality && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">{MODALITY_LABELS[pkg.modality] || pkg.modality}</span>}
                                      {pkg.pet_type && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700">{pkg.pet_type === 'dog' ? '🐕' : pkg.pet_type === 'cat' ? '🐈' : '🐾'}</span>}
                                    </div>
                                    {pkg.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{pkg.description}</p>}
                                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                      <Clock size={11}/> {pkg.duration_minutes}΄
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0 min-w-[60px]">
                                    <p className="font-bold text-gray-900 dark:text-white">€{pkg.price.toFixed(2)}</p>
                                  </div>
                                  <div className="shrink-0">
                                    {qty === 0 ? (
                                      <button onClick={() => updateQty(pkg, 1)}
                                        className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
                                        <Plus size={12}/> Προσθήκη
                                      </button>
                                    ) : (
                                      <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <button onClick={() => updateQty(pkg, -1)}
                                          className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-l-lg">
                                          <Minus size={12}/>
                                        </button>
                                        <span className="w-6 text-center text-sm font-bold">{qty}</span>
                                        <button onClick={() => updateQty(pkg, 1)}
                                          className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-lg">
                                          <Plus size={12}/>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}

              {hasSelections && (
                <div className="card p-4 bg-gradient-to-br from-brand-50 to-amber-50 dark:from-brand-900/20 dark:to-amber-900/20 border-brand-100 sticky bottom-4 z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600">{cartItems.length} υπηρεσίες · ~{Math.round(totalDuration / 60 * 10) / 10}ω</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">€{totalPrice.toFixed(2)}</p>
                    </div>
                    <button onClick={() => setTab('booking')} className="btn-primary flex items-center gap-2">
                      Συνέχεια <ChevronRight size={16}/>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ABOUT TAB */}
          {tab === 'about' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {service.description || 'No description available.'}
              </p>

              {service.provider_name && (
                <div className="card p-4 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xl font-bold text-brand-900">
                    {service.provider_name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white">{service.provider_name}</p>
                    {service.provider_bio && <p className="text-sm text-gray-500 truncate">{service.provider_bio}</p>}
                  </div>
                  {service.provider_phone && (
                    <a href={`tel:${service.provider_phone}`}
                      className="p-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                      <Phone size={18} />
                    </a>
                  )}
                </div>
              )}

              {service.specializations?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">Εξειδικεύσεις</h3>
                  <div className="flex flex-wrap gap-2">
                    {service.specializations.map((s: string, i: number) => (
                      <span key={i} className="badge bg-purple-50 text-purple-700 dark:bg-purple-900/20 text-xs">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {service.features?.length > 0 && (
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

          {/* REVIEWS TAB */}
          {tab === 'reviews' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {reviews.length === 0 ? (
                <div className="text-center py-12">
                  <Star size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">Δεν υπάρχουν κριτικές ακόμα.</p>
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
                            <Star key={s} size={12} className={s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
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

          {/* BOOKING TAB */}
          {tab === 'booking' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              {!isAuthenticated ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Συνδεθείτε για να κάνετε κράτηση</p>
                  <button onClick={() => navigate('/login')} className="btn-primary">{t('auth.login')}</button>
                </div>
              ) : (
                <>
                  {/* Selected packages preview */}
                  {hasPackages && (
                    hasSelections ? (
                      <div className="card p-4 bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-semibold text-sm text-gray-900 dark:text-white">Επιλεγμένες υπηρεσίες</p>
                          <button onClick={() => setTab('packages')} className="text-xs text-brand-900 hover:underline">Επεξεργασία</button>
                        </div>
                        <div className="space-y-2">
                          {cartItems.map(s => (
                            <div key={s.package.id} className="flex justify-between items-center text-sm">
                              <span className="flex-1">{s.quantity}× {s.package.name}</span>
                              <span className="font-medium">€{(s.package.price * s.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between font-bold">
                            <span>Σύνολο</span><span>€{totalPrice.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="card p-4 bg-amber-50 dark:bg-amber-900/10 border-amber-200">
                        <p className="text-sm text-amber-800 dark:text-amber-300">
                          ⚠️ Δεν έχετε επιλέξει υπηρεσίες ακόμα.
                          <button onClick={() => setTab('packages')} className="ml-1 underline font-medium">Επιλέξτε εδώ</button>
                        </p>
                      </div>
                    )
                  )}

                  {/* Date picker */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      <Calendar size={14} className="inline mr-1.5" />Ημερομηνία
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {dates.map(d => {
                        const date = new Date(d)
                        const day = date.toLocaleDateString('el', { weekday: 'short' })
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
                        <Clock size={14} className="inline mr-1.5" />Ώρα
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

                  {/* Notes */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Σημειώσεις (προαιρετικό)
                    </label>
                    <textarea
                      value={bookingNote}
                      onChange={e => setBookingNote(e.target.value)}
                      placeholder="Π.χ. ευαίσθητο δέρμα, αλλεργίες, ειδικές οδηγίες..."
                      className="input w-full h-24 resize-none"
                    />
                  </div>

                  <button
                    onClick={() => bookService.mutate()}
                    disabled={!canBook || bookService.isPending}
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                    <Calendar size={18} />
                    {bookService.isPending ? 'Αποστολή...' : `Κράτηση${totalPrice > 0 ? ` (€${totalPrice.toFixed(2)})` : ''}`}
                  </button>
                </>
              )}
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card p-5 sticky top-20">
            {hasSelections ? (
              <>
                <p className="text-xs text-gray-500 mb-1">Συνολική τιμή</p>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">€{totalPrice.toFixed(2)}</div>
                <p className="text-sm text-gray-500 mb-4">{cartItems.length} υπηρεσίες</p>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {service.price ? formatCurrency(service.price) : (hasPackages ? 'Επιλέξτε' : t('common.free'))}
                </div>
                {service.price_per === 'hour' && <p className="text-sm text-gray-500 mb-4">/ ώρα</p>}
                {service.price_per === 'session' && <p className="text-sm text-gray-500 mb-4">/ συνεδρία</p>}
                {hasPackages && !service.price && <p className="text-sm text-gray-500 mb-4">Δείτε τιμές υπηρεσιών</p>}
              </>
            )}

            <button
              onClick={() => {
                if (!isAuthenticated) return navigate('/login')
                if (hasPackages && !hasSelections) setTab('packages')
                else setTab('booking')
              }}
              className="btn-primary w-full mb-3 flex items-center justify-center gap-2">
              <Calendar size={16} />
              {hasPackages && !hasSelections ? 'Επιλογή υπηρεσιών' : t('services.bookNow')}
            </button>

            <button className="btn-secondary w-full flex items-center justify-center gap-2">
              <Share2 size={16} />Κοινοποίηση
            </button>

            <div className="mt-4 space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              {totalDuration > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Συνολική διάρκεια</span>
                  <span className="font-medium text-gray-900 dark:text-white">~{Math.round(totalDuration / 60 * 10) / 10}ω</span>
                </div>
              )}
              {service.city && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Τοποθεσία</span>
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
    </div>
  )
}
