import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, MapPin, Scissors, Stethoscope, ShoppingBag, ArrowRight, Zap, Shield, ShieldCheck, Star, Lock, Users, Car, GraduationCap, Home as HomeIcon, Video, Pill, Calendar, Brain, PawPrint } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import ServiceCard from '@/components/features/services/ServiceCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import CampaignBanner from '@/components/CampaignBanner'

function AnimatedStat({ value, suffix, label, color, decimals = 0 }: { value: number, suffix: string, label: string, color: string, decimals?: number }) {
  const [current, setCurrent] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !started) {
        setStarted(true)
        const duration = 1500
        const steps = 60
        const stepValue = value / steps
        let i = 0
        const timer = setInterval(() => {
          i++
          setCurrent(Math.min(stepValue * i, value))
          if (i >= steps) clearInterval(timer)
        }, duration / steps)
      }
    }, { threshold: 0.3 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value, started])

  const displayValue = decimals > 0 ? current.toFixed(decimals) : Math.floor(current).toLocaleString('el-GR')
  return (
    <div ref={ref} className="text-center">

      <p className={`text-2xl md:text-3xl font-black ${color}`}>{displayValue}{suffix}</p>
      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </div>
  )
}

export default function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchCity, setSearchCity] = useState('')

  const { data: content } = useQuery({
    queryKey: ['content-home'],
    queryFn: () => api.get('/settings/content/home').then(r => r.data?.data ?? {}),
    staleTime: 5 * 60 * 1000,
  })

  const c = content || {}

  const { data: featuredProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => api.get('/products?featured=true&limit=4').then(r => r.data),
  })
  const { data: featuredServices, isLoading: loadingServices } = useQuery({
    queryKey: ['featured-services'],
    queryFn: () => api.get('/services?limit=4').then(r => r.data),
  })

  // Personalized data for logged-in users
  const { data: myPets } = useQuery({
    queryKey: ['my-pets-home'],
    queryFn: () => api.get('/pets').then(r => r.data?.data ?? []),
    enabled: isAuthenticated,
    staleTime: 60_000,
  })
  const { data: nextBooking } = useQuery({
    queryKey: ['my-next-booking'],
    queryFn: () => api.get('/bookings/me?upcoming=true&limit=1').then(r => r.data?.data?.[0] ?? null),
    enabled: isAuthenticated,
    staleTime: 60_000,
  })
  const { data: aiStatus } = useQuery<any>({
    queryKey: ['ai-subscription-status'],
    queryFn: () => api.get('/ai-subscriptions/my-status').then(r => r.data?.data),
    enabled: isAuthenticated,
    staleTime: 60_000,
  })
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(`/services?q=${encodeURIComponent(searchQuery)}&city=${encodeURIComponent(searchCity)}`)
  }

  const stats = [
    { value: c.stat_users || '50K+',     label: c.stat_users_label || t('home.stats.users') },
    { value: c.stat_providers || '2K+',  label: c.stat_providers_label || t('home.stats.providers') },
    { value: c.stat_pets || '120K+',     label: c.stat_pets_label || t('home.stats.pets') },
    { value: c.stat_rating || '4.9★',    label: c.stat_rating_label || t('home.stats.rating') },
  ]

  const categories = [
    { icon: Scissors,      label: t('home.categories.grooming'),    type: 'grooming',    color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' },
    { icon: Stethoscope,   label: t('home.categories.veterinary'),  type: 'veterinary',  color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' },
    { emoji: '🚶',         label: t('home.categories.walking'),     type: 'walking',     color: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
    { icon: HomeIcon,      label: t('home.categories.hosting'),     type: 'pet_sitting', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
    { icon: GraduationCap, label: t('home.categories.training'),    type: 'training',    color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' },
    { icon: Car,           label: t('home.categories.transport'),   type: 'pet_taxi',    color: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' },
    { icon: Video,         label: t('home.categories.telehealth'),  type: 'telehealth',  color: 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400' },
    { icon: Pill,          label: t('home.categories.pharmacy'),    type: 'pharmacy',    color: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' },
    { icon: Shield,        label: t('home.categories.insurance'),   type: 'insurance',   color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' },
  ]

  // Duplicate for seamless loop

  return (
    <div className="pb-20 lg:pb-0">      {/* ── HERO with cinematic video ─────────────────────── */}
      <section style={{ position: 'relative', height: '560px', overflow: 'hidden' }}>

            {/* Mobile: lightweight poster image as hero (69 KB) → massive LCP win */}
            <img
              src="/videos/hero-1-poster.jpg"
              alt=""
              fetchPriority="high"
              width={768}
              height={560}
              className="lg:hidden"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />

            {/* Desktop: cinematic video */}
            <video
              className="hero-video hidden lg:block"
              autoPlay muted loop playsInline
              preload="auto"
              poster="/videos/hero-1-poster.jpg"
              width={1920}
              height={560}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}>
              <source src="/videos/hero-1.mp4" type="video/mp4" />
            </video>

            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.55) 100%)', zIndex: 1 }} />

            <div style={{ position: 'absolute', inset: 0, zIndex: 2 }} className="flex flex-col items-center justify-center px-6 py-12 text-center">

              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }}
                className="inline-flex items-center gap-2 bg-yellow-400/20 backdrop-blur-sm border border-yellow-400/30 rounded-full px-4 py-2 mb-6">
                <Zap size={14} className="text-yellow-400" />
                <p className="text-xs font-bold text-yellow-400 tracking-widest uppercase">AI Powered Pet Platform</p>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }}
                className="text-4xl lg:text-6xl font-display font-black text-white leading-tight max-w-3xl drop-shadow-2xl">
                {t('home.hero.title1')}<br/>{t('home.hero.title2')} <span className="text-yellow-400">{t('home.hero.title3')}</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.8 }}
                className="text-base lg:text-lg text-white/90 mt-6 max-w-2xl leading-relaxed drop-shadow-lg">
                {t('home.hero.subtitle')}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.8 }}
                className="flex flex-wrap gap-2 justify-center mt-8">
                <span className="bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs px-4 py-2 rounded-full">{t('home.hero.badges.aiHealth')}</span>
                <span className="bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs px-4 py-2 rounded-full">{t('home.hero.badges.emotion')}</span>
                <span className="bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs px-4 py-2 rounded-full">{t('home.hero.badges.wellness')}</span>
                <span className="bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs px-4 py-2 rounded-full">{t('home.hero.badges.telehealth')}</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.8 }}
                className="flex gap-3 mt-10 flex-wrap justify-center">
                <Link to="/trial" className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold text-base px-8 py-4 rounded-xl transition-all shadow-2xl hover:shadow-yellow-400/50 hover:-translate-y-0.5">
                  {t('home.hero.tryFree')}
                </Link>
                <Link to="/services" className="bg-white/10 backdrop-blur-sm border border-white/30 text-white font-medium text-base px-8 py-4 rounded-xl hover:bg-white/20 transition-all">
                  {t('home.hero.learnMore')}
                </Link>
              </motion.div>

              {/* trust signals */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3, duration: 0.8 }}
                className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-6 text-white/80 text-xs">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-yellow-400" />{t('home.trust.verified')}
                </span>
                <span className="hidden sm:inline text-white/30">·</span>
                <span className="flex items-center gap-1.5">
                  <Star size={14} className="text-yellow-400 fill-yellow-400" />{t('home.trust.rating')}
                </span>
                <span className="hidden sm:inline text-white/30">·</span>
                <span className="flex items-center gap-1.5">
                  <Lock size={14} className="text-yellow-400" />{t('home.trust.securePayments')}
                </span>
              </motion.div>

            </div>
      </section>

      {/* Καμπάνιες: αν δεν υπάρχει ενεργή, δεν αποδίδεται τίποτα */}
      <div className="page-container my-8">
        <CampaignBanner page="home" slot="hero" />
      </div>

      {/* ── PERSONALIZED WELCOME (logged-in only) ──────────── */}
      {isAuthenticated && user && (
        <section className="bg-gradient-to-br from-yellow-50 via-orange-50 to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 px-4 py-8 border-b border-gray-100 dark:border-gray-800">
          <div className="max-w-6xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              {/* AI trial countdown banner (shown only if user is in trial) */}
              {aiStatus?.ai_subscription_status === 'trial' && aiStatus.trial_days_left !== null && (
                <Link to="/pricing" className={cn(
                  'flex items-center gap-3 mb-4 p-3 rounded-2xl border transition-all hover:shadow-md',
                  aiStatus.trial_days_left > 7 ? 'bg-green-50 dark:bg-green-900/20 border-green-200'
                  : aiStatus.trial_days_left > 0 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200')}>
                  <span className="text-2xl">🎁</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {t('home.trialBanner.title', { days: aiStatus.trial_days_left })}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {t('home.trialBanner.subtitle', { plan: aiStatus.plan?.name_el || aiStatus.plan?.name || 'AI' })}
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-gray-400" />
                </Link>
              )}
              {aiStatus?.ai_subscription_status === 'expired' && (
                <Link to="/pricing" className="flex items-center gap-3 mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-2xl hover:shadow-md transition-all">
                  <span className="text-2xl">⚠️</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{t('home.trialBanner.expiredTitle')}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{t('home.trialBanner.expiredSubtitle')}</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-400" />
                </Link>
              )}
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">👋</span>
                <div>
                  <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
                    {t('home.welcome.title')}, <span className="text-brand-900 dark:text-yellow-400">{user.full_name?.split(' ')[0] || t('home.welcome.friend')}</span>!
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('home.welcome.subtitle')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Next booking card */}
                <Link to={nextBooking ? `/bookings/${nextBooking.id}` : '/services'}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700 group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                      <Calendar size={20} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <ArrowRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">{t('home.cards.nextBooking')}</h3>
                  {nextBooking ? (
                    <>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">{nextBooking.service?.title || t('home.cards.appointment')}</p>
                      <p className="text-xs text-brand-900 dark:text-yellow-400 font-semibold mt-1">
                        {new Date(nextBooking.start_time).toLocaleDateString('el-GR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('home.cards.noBooking')}</p>
                  )}
                </Link>

                {/* My pets card */}
                <Link to="/pets"
                  className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700 group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                      <PawPrint size={20} className="text-orange-600 dark:text-orange-400" />
                    </div>
                    <ArrowRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">{t('home.cards.myPets')}</h3>
                  {myPets && myPets.length > 0 ? (
                    <>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {myPets.length} {t(myPets.length === 1 ? 'home.cards.petSingular' : 'home.cards.petPlural')}
                      </p>
                      <div className="flex -space-x-2 mt-2">
                        {myPets.slice(0, 4).map((pet: any, i: number) => (
                          <div key={pet.id} className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-100 to-brand-300 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-bold text-brand-900"
                            style={{ zIndex: 4 - i }}>
                            {pet.name?.[0] || '?'}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('home.cards.noPets')}</p>
                  )}
                </Link>

                {/* Quick AI check card */}
                <Link to="/ai-health"
                  className="bg-gradient-to-br from-purple-500 to-indigo-600 dark:from-purple-700 dark:to-indigo-800 rounded-2xl p-5 text-white hover:shadow-xl transition-all group relative overflow-hidden">
                  <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <Brain size={20} className="text-white" />
                      </div>
                      <ArrowRight size={16} className="text-white/80 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <h3 className="font-bold text-sm mb-1">{t('home.cards.aiHealthTitle')}</h3>
                    <p className="text-xs text-white/80">{t('home.cards.aiHealthDesc')}</p>
                  </div>
                </Link>

              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ── TRUST BAR (animated stats) ───────────────────── */}
      <section className="bg-white dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800 py-6 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: 50000, suffix: '+', label: t('home.trustBar.owners'),   color: 'text-brand-900' },
            { value: 2000,  suffix: '+', label: t('home.trustBar.providers'), color: 'text-purple-600' },
            { value: 120000, suffix: '+', label: t('home.trustBar.pets'),     color: 'text-orange-600' },
            { value: 4.9,   suffix: '★', label: t('home.trustBar.rating'),    color: 'text-amber-500', decimals: 1 },
          ].map(stat => (
            <AnimatedStat key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      {/* Search bar */}
      <div className="bg-gray-50 dark:bg-gray-950 px-4 py-6">
        <motion.form onSubmit={handleSearch}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="flex flex-col sm:flex-row gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-1.5 rounded-2xl shadow-lg max-w-xl mx-auto">
          <div className="flex items-center gap-2.5 flex-1 px-3">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input type="text" placeholder={t('home.search.queryPlaceholder')}
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400 text-gray-900 dark:text-white" />
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 border-l border-gray-100 dark:border-gray-700">
            <MapPin size={13} className="text-gray-400 shrink-0" />
            <input type="text" placeholder={t('home.search.cityPlaceholder')} value={searchCity} onChange={e => setSearchCity(e.target.value)}
              className="w-24 bg-transparent text-sm outline-none placeholder:text-gray-400 text-gray-900 dark:text-white" />
          </div>
          <button type="submit" className="btn-primary shrink-0 rounded-xl">{t('home.search.button')}</button>
        </motion.form>
      </div>

      {/* Featured services 2×3 grid */}
      <div className="px-4 py-8 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              { path: '/telehealth', emoji: '🩺', title: t('home.featured.telehealth.title'),  sub: t('home.featured.telehealth.sub'),  bg: 'from-blue-500 to-blue-700',    img: 'https://images.unsplash.com/photo-1612531386530-97286d97c2d2?w=600&q=80' },
              { path: '/ai-health',  emoji: '🧠', title: t('home.featured.aiHealth.title'),    sub: t('home.featured.aiHealth.sub'),    bg: 'from-purple-500 to-purple-700', img: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=600&q=80' },
              { path: '/passport',   emoji: '📋', title: t('home.featured.medicalFile.title'), sub: t('home.featured.medicalFile.sub'), bg: 'from-orange-500 to-orange-700', img: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=600&q=80' },
              { path: '/services',   emoji: '✂️', title: t('home.featured.services.title'),    sub: t('home.featured.services.sub'),    bg: 'from-green-500 to-green-700',   img: 'https://images.unsplash.com/photo-1591946614720-90a587da4a36?w=600&q=80' },
              { path: '/telehealth', emoji: '💻', title: t('home.featured.telehealth247.title'), sub: t('home.featured.telehealth247.sub'), bg: 'from-teal-500 to-teal-700', img: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=600&q=80' },
              { path: '/legal',      emoji: '⚖️', title: t('home.featured.legal.title'),       sub: t('home.featured.legal.sub'),       bg: 'from-indigo-500 to-indigo-700', img: 'https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=600&q=80' },
            ].map(item => (
              <Link key={item.path + item.title} to={item.path}
                className="relative overflow-hidden rounded-2xl aspect-[4/3] group cursor-pointer block shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                <img src={item.img} alt={item.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={e => { (e.target as any).style.display = 'none' }} />
                <div className={`absolute inset-0 bg-gradient-to-br ${item.bg} opacity-70 group-hover:opacity-60 transition-opacity`} />
                <div className="absolute inset-0 p-4 flex flex-col justify-end">
                  <span className="text-2xl mb-1">{item.emoji}</span>
                  <p className="text-white font-bold text-lg leading-tight">{item.title}</p>
                  <p className="text-white/80 text-xs mt-0.5">{item.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── STATS REMOVED ── */}

      {/* ── CATEGORIES ───────────────────────────────────── */}
      <section className="py-12 bg-white dark:bg-gray-900">
        <div className="page-container">
          <div className="flex items-center justify-between mb-7">
            <div>
              <h2 className="section-title">{t('home.categoriesSection.title')}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{t('home.categoriesSection.subtitle')}</p>
            </div>
            <Link to="/services" className="flex items-center gap-1 text-sm text-brand-900 dark:text-brand-400 font-medium hover:gap-2 transition-all">
              {t('home.categoriesSection.viewAll')} <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-5 lg:grid-cols-9 gap-2">
            {categories.map((cat, i) => (
              <motion.div key={i} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link
                  to={`/services?type=${cat.type}`}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${cat.color} group-hover:scale-110 transition-transform`}>
                    {'emoji' in cat
                      ? <span className="text-xl">{cat.emoji}</span>
                      : <cat.icon size={20} />}
                  </div>
                  <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400 text-center leading-tight">{cat.label}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED SERVICES ────────────────────────────── */}

      {/* ── MARKETPLACE (logged in only) ──────────────────── */}
      {isAuthenticated && (
      <section className="py-12 bg-white dark:bg-gray-900">
        <div className="page-container">
          <div className="flex items-center justify-between mb-7">
            <div>
              <h2 className="section-title">{t('home.marketplaceSection.title')}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{t('home.marketplaceSection.subtitle')}</p>
            </div>
            <Link to="/marketplace" className="flex items-center gap-1 text-sm text-brand-900 dark:text-brand-400 font-medium hover:gap-2 transition-all">
              {t('home.marketplaceSection.viewAll')} <ArrowRight size={14} />
            </Link>
          </div>
          {loadingProducts
            ? <div className="flex justify-center py-12"><LoadingSpinner /></div>
            : <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Featured product — first result */}
                {featuredProducts?.data?.[0] && (
                  <Link
                    to={`/marketplace/${featuredProducts.data[0].id}`}
                    className="bg-orange-50 dark:bg-orange-900/10 rounded-2xl p-6 flex items-center gap-6 hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors"
                  >
                    {featuredProducts.data[0].imageUrl
                      ? <img src={featuredProducts.data[0].imageUrl} alt={featuredProducts.data[0].name} className="w-24 h-24 object-contain rounded-xl flex-shrink-0" />
                      : <div className="w-24 h-24 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                          <ShoppingBag size={32} className="text-brand-900 dark:text-brand-400" />
                        </div>}
                    <div>
                      <p className="text-[10px] font-bold text-brand-900 dark:text-brand-400 uppercase tracking-wider mb-1">{t('home.marketplaceSection.featured')}</p>
                      <p className="font-semibold text-gray-900 dark:text-white mb-2 leading-snug">{featuredProducts.data[0].name}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold text-brand-900 dark:text-brand-400">€{featuredProducts.data[0].price}</span>
                        {featuredProducts.data[0].originalPrice && (
                          <span className="text-sm text-gray-400 line-through">€{featuredProducts.data[0].originalPrice}</span>
                        )}
                      </div>
                      <span className="inline-block mt-3 bg-brand-900 text-white text-xs font-semibold px-4 py-1.5 rounded-lg">
                        {t('home.marketplaceSection.addToCart')}
                      </span>
                    </div>
                  </Link>
                )}
                {/* Mini list — remaining results */}
                <div className="flex flex-col gap-3">
                  {featuredProducts?.data?.slice(1, 4).map((product: any) => (
                    <Link
                      key={product.id}
                      to={`/marketplace/${product.id}`}
                      className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex items-center gap-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      {product.imageUrl
                        ? <img src={product.imageUrl} alt={product.name} className="w-12 h-12 object-contain rounded-lg flex-shrink-0" />
                        : <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                            <ShoppingBag size={18} className="text-gray-400" />
                          </div>}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{product.name}</p>
                        <p className="text-sm text-brand-900 dark:text-brand-400 font-bold mt-0.5">€{product.price}</p>
                      </div>
                      <ArrowRight size={14} className="text-gray-400 shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>}
        </div>
      </section>
      )}

      {/* ── AI BANNER ────────────────────────────────────── */}
      {/* ── FOOTER CTA ───────────────────────────────────── */}
      <section className="bg-brand-900 py-16 px-4 text-center text-white">
        <h2 className="text-3xl font-display font-bold tracking-tight mb-3">{t('home.footerCta.title')}</h2>
        <p className="text-white/70 text-sm mb-8">{t('home.footerCta.subtitle')}</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <a
            href="https://apps.apple.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-brand-900 font-bold text-sm px-6 py-3 rounded-xl hover:bg-orange-50 transition-colors"
          >
            📱 App Store
          </a>
          <a
            href="https://play.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white border-2 border-white/30 text-sm font-semibold px-6 py-3 rounded-xl hover:border-white/60 transition-colors"
          >
            ▶ Google Play
          </a>
        </div>
      </section>
    </div>
  )
} 
