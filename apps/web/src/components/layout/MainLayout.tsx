import { useState, useRef, useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, Heart, ShoppingBag, Scissors, Search, Bell, ShoppingCart,
  Menu, X, ChevronDown, LogOut, User, Settings, PawPrint, Calendar,
  MessageSquare, Stethoscope, MapPin, Shield, Brain, BookOpen,
  Building2, MoreHorizontal, Video, FileText, Dna
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { cn, getInitials } from '@/lib/utils'
import LanguageSelector from '@/components/ui/LanguageSelector'
import CartDrawer from '@/components/features/marketplace/CartDrawer'
import NotificationsPanel from '@/components/ui/NotificationsPanel'

const simpleNavItems = [
  { path: '/',            labelKey: 'nav.home',     icon: Home },
  { path: '/social',      labelKey: 'nav.social',   icon: Heart },
  { path: '/marketplace', labelKey: 'nav.shop',     icon: ShoppingBag },
  { path: '/passport',    labelKey: 'nav.passport', icon: BookOpen },
]

const servicesDropdown = [
  { path: '/services',   labelKey: 'nav.services',   icon: Scissors,    color: 'text-orange-500' },
  { path: '/telehealth', labelKey: 'nav.telehealth', icon: Stethoscope, color: 'text-blue-500' },
  { path: '/insurance',  labelKey: 'nav.insurance',  icon: Shield,      color: 'text-green-500' },
  { path: '/tracker',    labelKey: 'nav.petTracker', icon: MapPin,      color: 'text-red-500' },
  { path: '/ai-health',  labelKey: 'nav.aiHealth',   icon: Brain,       color: 'text-purple-500' },
  { path: '/ai-emotion', labelKey: 'nav.aiEmotion',  icon: Heart,       color: 'text-pink-500' },
]

const communityDropdown = [
  { path: '/playdates',   labelKey: 'nav.playdates',   icon: PawPrint,   color: 'text-green-500' },
  { path: '/communities', labelKey: 'nav.communities', icon: Building2,  color: 'text-purple-500' },
]

// ─── Bottom tab bar items (mobile) ───────────────────────────────
const bottomTabs = [
  { path: '/',            labelKey: 'nav.home',     icon: Home },
  { path: '/social',      labelKey: 'nav.social',   icon: Heart },
  { path: '/marketplace', labelKey: 'nav.shop',     icon: ShoppingBag },
  { path: '/passport',    labelKey: 'nav.passport', icon: BookOpen },
]

// ─── Desktop NavDropdown ─────────────────────────────────────────
function NavDropdown({ label, icon: Icon, items }: { label: string; icon: any; items: typeof servicesDropdown }) {
  const { t } = useTranslation()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isActive = items.some(i => location.pathname === i.path)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => { setOpen(false) }, [location.pathname])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
          isActive || open
            ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-900 dark:text-brand-400'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
        <Icon size={14} />
        {label}
        <ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-52 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 py-2 z-50">
          {items.map(item => (
            <Link key={item.path} to={item.path} onClick={() => setOpen(false)}
              className={cn('flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                location.pathname === item.path
                  ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-900 dark:text-brand-400 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800')}>
              <item.icon size={16} className={item.color} />
              {t(item.labelKey)}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Layout ─────────────────────────────────────────────────
export default function MainLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const { user, isAuthenticated, logout } = useAuthStore()
  const [moreOpen, setMoreOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => { setUserMenuOpen(false); setMoreOpen(false) }, [location.pathname])

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get('/cart').then(r => r.data?.data ?? []),
    enabled: isAuthenticated,
  })

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications?unread=true').then(r => r.data?.data ?? []),
    enabled: isAuthenticated,
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ── HEADER ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-4">

            {/* Logo — icon only on mobile, full logo on desktop */}
            <Link to="/" className="flex items-center shrink-0">
              <img src="/logo-clean.png" alt="GlobiPet"
                className="lg:hidden h-9 w-9 object-cover object-left rounded-xl"
              />
              <img src="/logo-clean.png" alt="GlobiPet"
                className="hidden lg:block h-14 w-auto"
              />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {simpleNavItems.map(item => (
                <Link key={item.path} to={item.path}
                  className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                    location.pathname === item.path
                      ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-900 dark:text-brand-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
                  <item.icon size={14} />
                  {t(item.labelKey)}
                </Link>
              ))}
              <NavDropdown label={t('nav.services')} icon={Scissors} items={servicesDropdown} />
              <NavDropdown label={t('nav.community')} icon={PawPrint} items={communityDropdown} />
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-1.5">
              <LanguageSelector />

              <button className="btn-ghost p-2.5 hidden sm:flex">
                <Search size={18} className="text-gray-500" />
              </button>

              {isAuthenticated && (
                <>
                  <button onClick={() => setNotifOpen(!notifOpen)} className="btn-ghost p-2.5 relative">
                    <Bell size={18} className="text-gray-500" />
                    {notifications.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />}
                  </button>
                  <button onClick={() => setCartOpen(true)} className="btn-ghost p-2.5 relative">
                    <ShoppingCart size={18} className="text-gray-500" />
                    {cartItems.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {cartItems.length}
                      </span>
                    )}
                  </button>

                  {/* User menu (desktop) */}
                  <div className="hidden lg:block relative" ref={userMenuRef}>
                    <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-brand-100 overflow-hidden flex items-center justify-center text-brand-900 font-semibold text-sm shrink-0">
                        {user?.profile_photo
                          ? <img src={user.profile_photo} alt="" className="w-full h-full object-cover" />
                          : <span>{getInitials(user?.full_name || 'U')}</span>}
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
                        {user?.full_name?.split(' ')[0]}
                      </span>
                      <ChevronDown size={14} className="text-gray-400" />
                    </button>
                    {userMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 w-56 card shadow-modal py-1 z-50">
                        <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.full_name}</p>
                          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        </div>
                        {[
                          { to: '/profile',    icon: User,          label: t('nav.profile') },
                          { to: '/my-pets',    icon: PawPrint,      label: t('nav.myPets') },
                          { to: '/bookings',   icon: Calendar,      label: t('nav.myBookings') },
                          { to: '/orders',     icon: ShoppingBag,   label: 'Παραγγελίες' },
                          { to: '/telehealth', icon: Video,         label: t('nav.telehealth') },
                        ].map(item => (
                          <Link key={item.to} to={item.to} onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <item.icon size={15} className="text-gray-400" />
                            {item.label}
                          </Link>
                        ))}
                        {(user?.role === 'service_provider' || user?.role === 'admin') && (
                          <Link to="/provider" onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-t border-gray-100 dark:border-gray-800 mt-1">
                            <Settings size={15} className="text-gray-400" />
                            {t('nav.providerDashboard')}
                          </Link>
                        )}
                        {user?.role === 'admin' && (
                          <Link to="/admin" onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <Shield size={15} className="text-gray-400" />
                            {t('nav.admin')}
                          </Link>
                        )}
                        <div className="border-t border-gray-100 dark:border-gray-800 mt-1">
                          <button onClick={() => { setUserMenuOpen(false); logout() }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <LogOut size={15} />
                            {t('nav.logout')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {!isAuthenticated && (
                <div className="hidden lg:flex items-center gap-2">
                  <Link to="/login" className="btn-ghost px-4 py-2 text-sm font-medium">{t('nav.login')}</Link>
                  <Link to="/register" className="btn-primary px-4 py-2 text-sm">{t('auth.register')}</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT (extra bottom padding on mobile for tab bar) ── */}
      <main className="flex-1 pb-20 lg:pb-0">
        <Outlet />
      </main>

      {/* ── FOOTER (desktop only) ──────────────────────────────── */}
      <footer className="hidden lg:block bg-gray-900 text-gray-400 py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 lg:col-span-1">
              <img src="/logo-clean.png" alt="GlobiPet" className="h-14 w-auto mb-3" />
              <p className="text-sm text-gray-500">{t('footer.slogan')}</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">{t('footer.explore')}</h4>
              <ul className="space-y-2 text-sm">
                {['/services', '/marketplace', '/events', '/breeds'].map((path, i) => (
                  <li key={path}>
                    <Link to={path} className="hover:text-white transition-colors">
                      {[t('nav.services'), t('nav.shop'), t('nav.events'), t('nav.breeds')][i]}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">{t('footer.support')}</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.help')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.faq')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.contact')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">{t('footer.legal')}</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.terms')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.privacy')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.cookies')}</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-xs text-gray-600">
            © {new Date().getFullYear()} GlobiPet. {t('footer.allRights')}
          </div>
        </div>
      </footer>

      {/* ── MOBILE BOTTOM TAB BAR ─────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {bottomTabs.map(tab => {
            const isActive = tab.path === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.path)
            return (
              <Link key={tab.path} to={tab.path}
                className={cn('flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all min-w-0',
                  isActive ? 'text-brand-900 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500')}>
                <tab.icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium truncate max-w-[56px]">{t(tab.labelKey)}</span>
              </Link>
            )
          })}
          {/* Περισσότερα */}
          <button onClick={() => setMoreOpen(true)}
            className={cn('flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all',
              moreOpen ? 'text-brand-900 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500')}>
            <MoreHorizontal size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-medium">Περισσότερα</span>
          </button>
        </div>
      </nav>

      {/* ── MOBILE "ΠΕΡΙΣΣΟΤΕΡΑ" FULL DRAWER ─────────────────── */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/40 z-50" onClick={() => setMoreOpen(false)} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-gray-900 rounded-t-3xl max-h-[90vh] overflow-y-auto">

              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
              </div>

              <div className="px-4 pb-8">
                {/* User info (if logged in) */}
                {isAuthenticated && (
                  <div className="flex items-center gap-3 py-4 mb-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="w-12 h-12 rounded-full bg-brand-100 overflow-hidden flex items-center justify-center text-brand-900 font-bold shrink-0">
                      {user?.profile_photo
                        ? <img src={user.profile_photo} alt="" className="w-full h-full object-cover" />
                        : <span>{getInitials(user?.full_name || 'U')}</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{user?.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                  </div>
                )}

                {/* Υπηρεσίες */}
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-3">Υπηρεσίες</p>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {servicesDropdown.map(item => (
                    <Link key={item.path} to={item.path} onClick={() => setMoreOpen(false)}
                      className={cn('flex flex-col items-center gap-1.5 p-3 rounded-2xl text-center transition-all',
                        location.pathname === item.path ? 'bg-brand-50 dark:bg-brand-900/20' : 'bg-gray-50 dark:bg-gray-800')}>
                      <item.icon size={22} className={item.color} />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">{t(item.labelKey)}</span>
                    </Link>
                  ))}
                </div>

                {/* Κοινότητα */}
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Κοινότητα</p>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {communityDropdown.map(item => (
                    <Link key={item.path} to={item.path} onClick={() => setMoreOpen(false)}
                      className={cn('flex flex-col items-center gap-1.5 p-3 rounded-2xl text-center transition-all',
                        location.pathname === item.path ? 'bg-brand-50 dark:bg-brand-900/20' : 'bg-gray-50 dark:bg-gray-800')}>
                      <item.icon size={22} className={item.color} />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t(item.labelKey)}</span>
                    </Link>
                  ))}
                </div>

                {/* Λογαριασμός */}
                {isAuthenticated ? (
                  <>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Λογαριασμός</p>
                    <div className="space-y-1">
                      {[
                        { to: '/profile',  icon: User,        label: t('nav.profile') },
                        { to: '/my-pets',  icon: PawPrint,    label: t('nav.myPets') },
                        { to: '/bookings', icon: Calendar,    label: t('nav.myBookings') },
                        { to: '/orders',   icon: ShoppingBag, label: 'Παραγγελίες' },
                        { to: '/wishlist', icon: Heart,       label: 'Wishlist' },
                      ].map(item => (
                        <Link key={item.to} to={item.to} onClick={() => setMoreOpen(false)}
                          className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <item.icon size={18} className="text-gray-400 shrink-0" />
                          {item.label}
                        </Link>
                      ))}
                      {(user?.role === 'service_provider' || user?.role === 'admin') && (
                        <Link to="/provider" onClick={() => setMoreOpen(false)}
                          className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <Settings size={18} className="text-gray-400 shrink-0" />
                          {t('nav.providerDashboard')}
                        </Link>
                      )}
                      {user?.role === 'admin' && (
                        <Link to="/admin" onClick={() => setMoreOpen(false)}
                          className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                          <Shield size={18} className="shrink-0" />
                          {t('nav.admin')}
                        </Link>
                      )}
                      <button onClick={() => { setMoreOpen(false); logout() }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <LogOut size={18} className="shrink-0" />
                        {t('nav.logout')}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex gap-2 mt-4">
                    <Link to="/login" onClick={() => setMoreOpen(false)} className="btn-secondary flex-1 text-center py-3 text-sm">{t('nav.login')}</Link>
                    <Link to="/register" onClick={() => setMoreOpen(false)} className="btn-primary flex-1 text-center py-3 text-sm">{t('auth.register')}</Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── DRAWERS ────────────────────────────────────────────── */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  )
}