import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, MapPin, Scissors, Stethoscope, ShoppingBag, Calendar, Star, ArrowRight, Zap, Shield, Heart, TrendingUp, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import ProductCard from '@/components/features/marketplace/ProductCard'
import ServiceCard from '@/components/features/services/ServiceCard'
import EventCard from '@/components/features/events/EventCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchCity, setSearchCity] = useState('')

  const { data: featuredProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => api.get('/products?featured=true&limit=4').then(r => r.data),
  })
  const { data: featuredServices, isLoading: loadingServices } = useQuery({
    queryKey: ['featured-services'],
    queryFn: () => api.get('/services?limit=4').then(r => r.data),
  })
  const { data: upcomingEvents, isLoading: loadingEvents } = useQuery({
    queryKey: ['upcoming-events'],
    queryFn: () => api.get('/events?upcoming=true&limit=3').then(r => r.data),
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(`/services?q=${encodeURIComponent(searchQuery)}&city=${encodeURIComponent(searchCity)}`)
  }

  const stats = [
    { value: '50K+', label: t('home.users'), icon: Users },
    { value: '2K+',  label: t('home.pets') === 'Κατοικίδια' ? 'Πάροχοι' : 'Providers', icon: Shield },
    { value: '120K+', label: t('home.pets'), icon: Heart },
    { value: '4.9★', label: t('home.rating'), icon: Star },
  ]

  const categories = [
    { icon: Scissors,    label: t('services.types.grooming'),    type: 'grooming',    color: 'bg-pink-50 text-pink-700' },
    { icon: Stethoscope, label: t('services.types.veterinary'),  type: 'veterinary',  color: 'bg-blue-50 text-blue-700' },
    { emoji: '🚶',       label: t('services.types.walking'),     type: 'walking',     color: 'bg-green-50 text-green-700' },
    { emoji: '🏠',       label: t('services.types.pet_sitting'), type: 'pet_sitting', color: 'bg-orange-50 text-orange-700' },
    { emoji: '🎓',       label: t('services.types.training'),    type: 'training',    color: 'bg-purple-50 text-purple-700' },
    { emoji: '🚕',       label: t('services.types.pet_taxi'),    type: 'pet_taxi',    color: 'bg-yellow-50 text-yellow-700' },
    { emoji: '📸',       label: t('services.types.photography'), type: 'photography', color: 'bg-teal-50 text-teal-700' },
    { icon: ShoppingBag, label: t('services.types.pharmacy'),    type: 'pharmacy',    color: 'bg-red-50 text-red-700' },
  ]

  return (
    <div className="pb-20 lg:pb-0">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand-100/50 blur-3xl" />
          <div className="absolute top-32 -left-16 w-64 h-64 rounded-full bg-blue-100/50 blur-3xl" />
        </div>
        <div className="page-container py-16 lg:py-24 relative">
          <div className="max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-full px-4 py-1.5 text-sm font-medium text-brand-900 dark:text-brand-400 mb-6 shadow-sm">
                <Zap size={14} /> {t('home.tagline')}
              </div>
              <h1 className="text-4xl lg:text-6xl font-display font-bold tracking-tight text-gray-900 dark:text-white mb-6 leading-tight">
                Best care for the<br /><span className="text-gradient">best human's friends</span>
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-10 max-w-xl leading-relaxed">
                {t('home.heroSubtitle')}
              </p>
            </motion.div>
            <motion.form onSubmit={handleSearch} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
              className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-card border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3 flex-1 px-3">
                <Search size={18} className="text-gray-400 shrink-0" />
                <input type="text" placeholder={t('home.searchPlaceholder')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400" />
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 border-l border-gray-100 dark:border-gray-700">
                <MapPin size={16} className="text-gray-400 shrink-0" />
                <input type="text" placeholder={t('home.cityPlaceholder')} value={searchCity} onChange={e => setSearchCity(e.target.value)}
                  className="w-32 bg-transparent text-sm outline-none placeholder:text-gray-400" />
              </div>
              <button type="submit" className="btn-primary shrink-0">{t('home.search')}</button>
            </motion.form>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="page-container py-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 + 0.2 }} className="text-center">
                <p className="text-2xl lg:text-3xl font-display font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 bg-white dark:bg-gray-900">
        <div className="page-container">
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title">{t('nav.services')}</h2>
            <Link to="/services" className="flex items-center gap-1.5 text-sm text-brand-900 dark:text-brand-400 font-medium hover:gap-2.5 transition-all">
              {t('common.viewAll')} <ArrowRight size={15} />
            </Link>
          </div>
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
            {categories.map((cat, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link to={`/services?type=${cat.type}`} className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${cat.color} dark:bg-gray-800 group-hover:scale-110 transition-transform`}>
                    {'emoji' in cat ? <span className="text-xl">{cat.emoji}</span> : <cat.icon size={22} />}
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">{cat.label}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Services */}
      <section className="py-12 bg-gray-50 dark:bg-gray-950">
        <div className="page-container">
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title">{t('home.topProviders')}</h2>
            <Link to="/services" className="flex items-center gap-1.5 text-sm text-brand-900 dark:text-brand-400 font-medium hover:gap-2.5 transition-all">
              {t('home.allProviders')} <ArrowRight size={15} />
            </Link>
          </div>
          {loadingServices ? <div className="flex justify-center py-12"><LoadingSpinner /></div> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredServices?.data?.map((service: any) => <ServiceCard key={service.id} service={service} />)}
            </div>
          )}
        </div>
      </section>

      {/* Products */}
      <section className="py-12 bg-white dark:bg-gray-900">
        <div className="page-container">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="section-title">{t('home.shop')}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{t('home.shopDesc')}</p>
            </div>
            <Link to="/marketplace" className="flex items-center gap-1.5 text-sm text-brand-900 dark:text-brand-400 font-medium hover:gap-2.5 transition-all">
              {t('home.allProducts')} <ArrowRight size={15} />
            </Link>
          </div>
          {loadingProducts ? <div className="flex justify-center py-12"><LoadingSpinner /></div> : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredProducts?.data?.map((product: any) => <ProductCard key={product.id} product={product} />)}
            </div>
          )}
        </div>
      </section>

      {/* Events */}
      {!loadingEvents && upcomingEvents?.data?.length > 0 && (
        <section className="py-12 bg-gray-50 dark:bg-gray-950">
          <div className="page-container">
            <div className="flex items-center justify-between mb-6">
              <h2 className="section-title">{t('home.upcomingEvents')}</h2>
              <Link to="/events" className="flex items-center gap-1.5 text-sm text-brand-900 dark:text-brand-400 font-medium hover:gap-2.5 transition-all">
                {t('home.allEvents')} <ArrowRight size={15} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingEvents.data.map((event: any) => <EventCard key={event.id} event={event} />)}
            </div>
          </div>
        </section>
      )}

      {/* AI Banner */}
      <section className="py-12 bg-white dark:bg-gray-900">
        <div className="page-container">
          <div className="rounded-3xl bg-gradient-to-r from-brand-900 to-orange-600 p-8 lg:p-12 text-white overflow-hidden relative">
            <div className="absolute right-0 top-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={20} className="text-yellow-300" />
                <span className="text-sm font-semibold text-yellow-300 uppercase tracking-wider">{t('home.aiPowered')}</span>
              </div>
              <h2 className="text-2xl lg:text-4xl font-display font-bold mb-4 leading-tight">{t('home.aiTitle')}</h2>
              <p className="text-white/80 mb-8 max-w-lg">{t('home.aiDesc')}</p>
              <div className="flex flex-wrap gap-3">
                <Link to="/my-pets" className="bg-white text-brand-900 font-semibold px-5 py-2.5 rounded-xl hover:bg-orange-50 transition-colors">{t('home.viewPets')}</Link>
                <Link to="/medical-center" className="bg-white/15 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-white/25 transition-colors border border-white/20">{t('home.wellnessPlans')}</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Market Insights */}
      <section className="py-12 bg-gray-50 dark:bg-gray-950">
        <div className="page-container">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={18} className="text-brand-900 dark:text-brand-400" />
                <span className="text-sm font-semibold text-brand-900 dark:text-brand-400">Market Insights</span>
              </div>
              <h2 className="section-title mb-3">{t('home.marketTitle')}</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{t('home.marketDesc')}</p>
              <Link to="/market-insights" className="btn-primary inline-flex items-center gap-2">{t('home.explore')} <ArrowRight size={16} /></Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Pet Market Greece', value: '€890M', change: '+12%' },
                { label: 'New pets/year', value: '180K', change: '+8%' },
                { label: 'Online purchases', value: '42%', change: '+18%' },
                { label: 'Telehealth demand', value: '3.2x', change: '+220%' },
              ].map((stat, i) => (
                <div key={i} className="card p-4">
                  <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                  <p className="text-xl font-display font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  <p className="text-xs text-green-600 font-semibold mt-1">{stat.change} YoY</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
