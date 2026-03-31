import { useState, useRef, useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Heart, ShoppingBag, Scissors, Search, Bell, ShoppingCart, Menu, X, ChevronDown, LogOut, User, Settings, PawPrint, Calendar, MessageSquare, Users, Stethoscope, MapPin, BarChart3, Shield } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { cn, getInitials } from '@/lib/utils'
import LanguageSelector from '@/components/ui/LanguageSelector'
import CartDrawer from '@/components/features/marketplace/CartDrawer'
import NotificationsPanel from '@/components/ui/NotificationsPanel'

const navItems = [
  { path: '/',            labelKey: 'nav.home',      icon: Home },
  { path: '/social',      labelKey: 'nav.social',    icon: Heart },
  { path: '/marketplace', labelKey: 'nav.shop',      icon: ShoppingBag },
  { path: '/services',    labelKey: 'nav.services',  icon: Scissors },
  { path: '/telehealth',  labelKey: 'nav.telehealth', icon: Stethoscope },
  { path: '/tracker',     labelKey: 'nav.petTracker', icon: MapPin },
]

export default function MainLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">

            {/* Logo */}
            <Link to="/" className="flex items-center shrink-0">
              <img src="/logo.png" alt="GlobiPet" className="h-10 w-auto" />
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map(item => (
                <Link key={item.path} to={item.path}
                  className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                    location.pathname === item.path
                      ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-900 dark:text-brand-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}>
                  <item.icon size={16} />
                  {t(item.labelKey)}
                </Link>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <LanguageSelector />

              <button className="btn-ghost p-2.5 hidden sm:flex">
                <Search size={18} className="text-gray-500" />
              </button>

              {isAuthenticated && (
                <>
                  <button onClick={() => setNotifOpen(!notifOpen)} className="btn-ghost p-2.5 relative">
                    <Bell size={18} className="text-gray-500" />
                    {notifications.length > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </button>

                  <button onClick={() => setCartOpen(true)} className="btn-ghost p-2.5 relative">
                    <ShoppingCart size={18} className="text-gray-500" />
                    {cartItems.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {cartItems.length}
                      </span>
                    )}
                  </button>

                  {/* User menu */}
                  <div className="relative" ref={userMenuRef}>
                    <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-brand-100 overflow-hidden flex items-center justify-center text-brand-900 font-semibold text-sm shrink-0">
                        {user?.profile_photo
                          ? <img src={user.profile_photo} alt="" className="w-full h-full object-cover" />
                          : <span>{getInitials(user?.full_name || 'U')}</span>
                        }
                      </div>
                      <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
                        {user?.full_name?.split(' ')[0]}
                      </span>
                      <ChevronDown size={14} className="text-gray-400" />
                    </button>

                    <AnimatePresence>
                      {userMenuOpen && (
                        <motion.div initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4 }}
                          className="absolute right-0 top-full mt-1 w-56 card shadow-modal py-1 z-50">
                          <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.full_name}</p>
                            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                          </div>
                          {[
                            { to: '/profile',    icon: User,          label: t('nav.profile') },
                            { to: '/my-pets',    icon: PawPrint,      label: t('nav.myPets') },
                            { to: '/bookings',   icon: Calendar,      label: t('nav.myBookings') },
                            { to: '/orders',     icon: ShoppingBag,   label: t('nav.shop') },
                            { to: '/wishlist',   icon: Heart,         label: 'Wishlist' },
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
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}

              {!isAuthenticated && (
                <div className="hidden sm:flex items-center gap-2">
                  <Link to="/login" className="btn-ghost px-4 py-2 text-sm font-medium">{t('nav.login')}</Link>
                  <Link to="/register" className="btn-primary px-4 py-2 text-sm">{t('auth.register')}</Link>
                </div>
              )}

              <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden btn-ghost p-2">
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="px-4 py-3 space-y-1">
                {navItems.map(item => (
                  <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
                    className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
                      location.pathname === item.path ? 'bg-brand-50 text-brand-900' : 'text-gray-700 dark:text-gray-300')}>
                    <item.icon size={18} />
                    {t(item.labelKey)}
                  </Link>
                ))}
                {!isAuthenticated && (
                  <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-secondary flex-1 text-center py-2 text-sm">{t('nav.login')}</Link>
                    <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-primary flex-1 text-center py-2 text-sm">{t('auth.register')}</Link>
                  </div>
                )}
                {isAuthenticated && (
                  <button onClick={() => { setMobileOpen(false); logout() }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600">
                    <LogOut size={18} />
                    {t('nav.logout')}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 lg:col-span-1">
              <img src="/logo.png" alt="GlobiPet" className="h-10 w-auto mb-3 brightness-0 invert" />
              <p className="text-sm text-gray-500">{t('footer.slogan')}</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">{t('footer.explore')}</h4>
              <ul className="space-y-2 text-sm">
                {['/services', '/marketplace', '/events', '/breeds'].map((path, i) => (
                  <li key={path}><Link to={path} className="hover:text-white transition-colors">{[t('nav.services'), t('nav.shop'), t('nav.events'), t('nav.breeds')][i]}</Link></li>
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

      {/* Drawers */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  )
}
