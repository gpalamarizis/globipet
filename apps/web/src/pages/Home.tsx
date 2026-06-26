import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, MapPin, Scissors, Stethoscope, ShoppingBag, ArrowRight, Zap, Shield, Users, Car, GraduationCap, Home as HomeIcon, Video, Pill } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import ServiceCard from '@/components/features/services/ServiceCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
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
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(`/services?q=${encodeURIComponent(searchQuery)}&city=${encodeURIComponent(searchCity)}`)
  }

  const stats = [
    { value: c.stat_users || '50K+',     label: c.stat_users_label || 'Χρήστες' },
    { value: c.stat_providers || '2K+',  label: c.stat_providers_label || 'Πάροχοι' },
    { value: c.stat_pets || '120K+',     label: c.stat_pets_label || 'Κατοικίδια' },
    { value: c.stat_rating || '4.9★',   label: c.stat_rating_label || 'Βαθμολογία' },
  ]

  const categories = [
    { icon: Scissors,      label: 'Περιποίηση',    type: 'grooming',    color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' },
    { icon: Stethoscope,   label: 'Κτηνίατρος',    type: 'veterinary',  color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' },
    { emoji: '🚶',         label: 'Βόλτα',          type: 'walking',     color: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
    { icon: HomeIcon,      label: 'Φιλοξενία',      type: 'pet_sitting', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
    { icon: GraduationCap, label: 'Εκπαίδευση',    type: 'training',    color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' },
    { icon: Car,           label: 'Μεταφορά',       type: 'pet_taxi',    color: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' },
    { icon: Video,         label: 'Τηλειατρική',    type: 'telehealth',  color: 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400' },
    { icon: Pill,          label: 'Φαρμακείο',      type: 'pharmacy',    color: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' },
    { icon: Shield,        label: 'Ασφάλεια',       type: 'insurance',   color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' },
  ]

  // Duplicate for seamless loop

  return (
    <div className="pb-20 lg:pb-0">
      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="bg-gray-50 dark:bg-gray-950 px-4 pt-4 pb-0">
        <div className="mx-auto" style={{ maxWidth: '1075px' }}>
          <div className="flex gap-4 min-h-[420px]">

            {/* LEFT BOX — navy */}
            <div className="flex-1 bg-[#0F2A3F] rounded-3xl px-10 py-12 flex flex-col items-center justify-center gap-5">
              <p className="text-xs font-bold text-brand-900 tracking-widest uppercase">⚡ AI POWERED</p>
              <h1 className="text-3xl lg:text-4xl font-display font-bold text-white text-center leading-snug">
                Ο γιατρός του κατοικιδίου σου<br/>είναι πάντα <span className="text-yellow-400">διαθέσιμος</span>
              </h1>
              <p className="text-sm text-white/60 text-center leading-relaxed max-w-sm">
                Ανάλυση συμπτωμάτων, health tracking, emotion detection και εξατομικευμένα πλάνα διατροφής — όλα με τεχνητή νοημοσύνη.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {['AI Health Check', 'Emotion Detector', 'Wellness Tracker', 'Τηλεϊατρική 24/7'].map(b => (
                  <span key={b} className="bg-white/10 text-white text-xs px-3 py-1.5 rounded-full">{b}</span>
                ))}
              </div>
              <div className="flex gap-3 mt-2">
                <Link to="/register" className="bg-brand-900 hover:bg-brand-800 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors">Δοκίμασε δωρεάν</Link>
                <Link to="/services" className="bg-transparent border border-white/30 text-white font-medium text-sm px-6 py-3 rounded-xl hover:bg-white/10 transition-colors">Μάθε περισσότερα</Link>
              </div>
            </div>

            {/* RIGHT BOX — white with navy border */}
            <div className="flex-1 bg-white dark:bg-gray-900 border-[2.5px] border-[#0F2A3F] rounded-3xl px-10 py-12 flex flex-col justify-center gap-7">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm px-5 py-3 rounded-2xl self-start">
                🧠 AI Powered Pet Platform
              </div>
              <div className="inline-flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 text-brand-900 dark:text-brand-400 font-black text-2xl lg:text-3xl px-6 py-4 rounded-2xl self-start">
                <Zap size={24} /> #1 Pet Super-App
              </div>
              <p className="text-base lg:text-lg font-semibold text-gray-700 dark:text-gray-300 leading-loose">
                fewer apps →<br/>
                lower search friction →<br/>
                higher trust + better health outcomes →<br/>
                increased provider business
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Search bar */}
      <div className="bg-gray-50 dark:bg-gray-950 px-4 py-6">
        <motion.form onSubmit={handleSearch}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="flex flex-col sm:flex-row gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-1.5 rounded-2xl shadow-lg max-w-xl mx-auto">
          <div className="flex items-center gap-2.5 flex-1 px-3">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input type="text" placeholder="Τι ψάχνεις; grooming, κτηνίατρος…"
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400 text-gray-900 dark:text-white" />
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 border-l border-gray-100 dark:border-gray-700">
            <MapPin size={13} className="text-gray-400 shrink-0" />
            <input type="text" placeholder="Πόλη" value={searchCity} onChange={e => setSearchCity(e.target.value)}
              className="w-24 bg-transparent text-sm outline-none placeholder:text-gray-400 text-gray-900 dark:text-white" />
          </div>
          <button type="submit" className="btn-primary shrink-0 rounded-xl">Αναζήτηση</button>
        </motion.form>
      </div>

      {/* Featured services 2×3 grid */}
      <div className="px-4 py-8 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              { path: '/telehealth', emoji: '🩺', title: 'Τηλεϊατρική',       sub: 'Βιντεοκλήση με κτηνίατρο',  bg: 'from-blue-500 to-blue-700',    img: 'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=400&q=80' },
              { path: '/ai-health',  emoji: '🧠', title: 'AI Υγεία',           sub: 'Ανάλυση φωτογραφίας',       bg: 'from-purple-500 to-purple-700', img: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=80' },
              { path: '/passport',   emoji: '📋', title: 'Ιατρικός Φάκελος',  sub: 'Πλήρες ιστορικό υγείας',    bg: 'from-orange-500 to-orange-700', img: 'https://images.unsplash.com/photo-1548767797-d8c844163c4a?w=400&q=80' },
              { path: '/services',   emoji: '✂️', title: 'Υπηρεσίες',          sub: 'Grooming, εκπαίδευση κ.α.', bg: 'from-green-500 to-green-700',   img: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&q=80' },
              { path: '/telehealth', emoji: '💻', title: 'Τηλεϊατρική 24/7',  sub: 'Άμεση σύνδεση με κτηνίατρο', bg: 'from-teal-500 to-teal-700',   img: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80' },
              { path: '/legal',      emoji: '⚖️', title: 'Νομική Υποστήριξη', sub: 'AI νομικός σύμβουλος',       bg: 'from-indigo-500 to-indigo-700', img: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&q=80' },
            ].map(item => (
              <Link key={item.path + item.title} to={item.path}
                className="relative overflow-hidden rounded-2xl aspect-[4/3] group cursor-pointer block">
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
              <h2 className="section-title">Μάθε τις υπηρεσίες μας...</h2>
              <p className="text-sm text-gray-500 mt-0.5">Βρες τον καλύτερο πάροχο κοντά σου</p>
            </div>
            <Link to="/services" className="flex items-center gap-1 text-sm text-brand-900 dark:text-brand-400 font-medium hover:gap-2 transition-all">
              Όλες <ArrowRight size={14} />
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
              <h2 className="section-title">Marketplace</h2>
              <p className="text-sm text-gray-500 mt-0.5">Τροφές, παιχνίδια και αξεσουάρ με delivery</p>
            </div>
            <Link to="/marketplace" className="flex items-center gap-1 text-sm text-brand-900 dark:text-brand-400 font-medium hover:gap-2 transition-all">
              Όλα <ArrowRight size={14} />
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
                      <p className="text-[10px] font-bold text-brand-900 dark:text-brand-400 uppercase tracking-wider mb-1">Προτεινόμενο</p>
                      <p className="font-semibold text-gray-900 dark:text-white mb-2 leading-snug">{featuredProducts.data[0].name}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold text-brand-900 dark:text-brand-400">€{featuredProducts.data[0].price}</span>
                        {featuredProducts.data[0].originalPrice && (
                          <span className="text-sm text-gray-400 line-through">€{featuredProducts.data[0].originalPrice}</span>
                        )}
                      </div>
                      <span className="inline-block mt-3 bg-brand-900 text-white text-xs font-semibold px-4 py-1.5 rounded-lg">
                        Προσθήκη στο καλάθι
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
        <h2 className="text-3xl font-display font-bold tracking-tight mb-3">Ξεκίνα δωρεάν σήμερα</h2>
        <p className="text-white/70 text-sm mb-8">Πάνω από 50.000 ιδιοκτήτες κατοικίδιων εμπιστεύονται το GlobiPet</p>
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
