import { Outlet, useLocation, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, ShoppingBag, Scissors, Heart, MapPin, Calendar,
  Users, MessageSquare, BookOpen, User, Bell, Search,
  Menu, X, ChevronDown, LogOut, Settings, Shield
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useTranslation } from 'react-i18next'
import CartDrawer from '@/components/features/marketplace/CartDrawer'
import NotificationsPanel from '@/components/ui/NotificationsPanel'
import LanguageSelector from '@/components/ui/LanguageSelector'
import { cn } from '@/lib/utils'

const navItems = [
  { path: '/',            icon: Home,        labelKey: 'nav.home' },
  { path: '/social',      icon: Heart,       labelKey: 'nav.social' },
  { path: '/marketplace', icon: ShoppingBag, labelKey: 'nav.shop' },
  { path: '/services',    icon: Scissors,    labelKey: 'nav.services' },
  { path: '/my-pets',     icon: null,        labelKey: 'nav.pets',    emoji: '🐾', requiresAuth: true },
  { path: '/tracker',     icon: MapPin,      labelKey: 'nav.tracker', requiresAuth: true },
  { path: '/bookings',    icon: Calendar,    labelKey: 'nav.bookings',requiresAuth: true },
  { path: '/events',      icon: null,        labelKey: 'nav.events',  emoji: '🎉' },
  { path: '/community',   icon: Users,       labelKey: 'nav.community',requiresAuth: true },
  { path: '/forum',       icon: MessageSquare, labelKey: 'nav.forum' },
  { path: '/breeds',      icon: BookOpen,    labelKey: 'nav.breeds' },
]

export default function MainLayout() {
  const location = useLocation()
  const { t } = useTranslation()
  const { user, isAuthenticated, logout } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => { setMobileMenuOpen(false) }, [location.pathname])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top Navbar */}
      <header className={cn(
        'sticky top-0 z-50 transition-all duration-200',
        scrolled ? 'glass shadow-sm border-b border-gray-100 dark:border-gray-800' : 'bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800'
      )}>
        <div className="page-container">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0">
              <span className="text-2xl">🐾</span>
              <span className="font-display font-bold text-xl text-gradient">GlobiPet</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.slice(0, 6).map((item) => {
                const active = location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(item.path))
                if (item.requiresAuth && !isAuthenticated) return null
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn('nav-item text-xs', active && 'active')}
                  >
                    {item.icon
                      ? <item.icon size={18} />
                      : <span className="text-lg leading-none">{item.emoji}</span>
                    }
                    <span>{t(item.labelKey)}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              {/* Language selector */}
              <LanguageSelector />

              {/* Search */}
              <button className="btn-ghost p-2.5">
                <Search size={18} />
              </button>

              {isAuthenticated ? (
                <>
                  {/* Notifications */}
                  <button
                    className="btn-ghost p-2.5 relative"
                    onClick={() => setNotifOpen(!notifOpen)}
                  >
                    <Bell size={18} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-900 rounded-full" />
                  </button>

                  {/* Cart */}
                  <button
                    className="btn-ghost p-2.5"
                    onClick={() => setCartOpen(true)}
                  >
                    <ShoppingBag size={18} />
                  </button>

                  {/* User menu */}
                  <div className="relative">
                    <button
                      className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                    >
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-900 font-semibold text-sm overflow-hidden">
                        {user?.profile_photo
                          ? <img src={user.profile_photo} alt="" className="w-full h-full object-cover" />
                          : user?.full_name?.charAt(0) ?? 'U'
                        }
                      </div>
                      <ChevronDown size={14} className="text-gray-400" />
                    </button>

                    <AnimatePresence>
                      {userMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.96 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-2 w-56 card shadow-modal z-50 py-2"
                          onMouseLeave={() => setUserMenuOpen(false)}
                        >
                          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 mb-1">
                            <p className="font-semibold text-sm">{user?.full_name}</p>
                            <p className="text-xs text-gray-500">{user?.email}</p>
                          </div>
                          <Link to="/profile" className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm transition-colors">
                            <User size={15} /> {t('nav.profile')}
                          </Link>
                          {(user?.role === 'service_provider' || user?.role === 'both') && (
                            <Link to="/provider" className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm transition-colors">
                              <Settings size={15} /> {t('nav.providerDashboard')}
                            </Link>
                          )}
                          {user?.role === 'admin' && (
                            <Link to="/admin" className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm transition-colors">
                              <Shield size={15} /> {t('nav.adminDashboard')}
                            </Link>
                          )}
                          <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
                            <button
                              onClick={logout}
                              className="flex items-center gap-3 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 text-sm w-full transition-colors"
                            >
                              <LogOut size={15} /> {t('nav.logout')}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login" className="btn-ghost text-sm">{t('auth.login')}</Link>
                  <Link to="/register" className="btn-primary text-sm py-2">{t('auth.register')}</Link>
                </div>
              )}

              {/* Mobile menu toggle */}
              <button
                className="lg:hidden btn-ghost p-2.5"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden"
            >
              <div className="page-container py-3 grid grid-cols-4 gap-1">
                {navItems.map((item) => {
                  const active = location.pathname === item.path
                  if (item.requiresAuth && !isAuthenticated) return null
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn('nav-item text-xs', active && 'active')}
                    >
                      {item.icon
                        ? <item.icon size={20} />
                        : <span className="text-xl">{item.emoji}</span>
                      }
                      <span className="truncate">{t(item.labelKey)}</span>
                    </Link>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Page content */}
      <main className="min-h-[calc(100vh-4rem)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 z-40 pb-safe">
        <div className="flex items-center justify-around px-2 py-1">
          {[
            { path: '/', icon: Home, label: t('nav.home') },
            { path: '/marketplace', icon: ShoppingBag, label: t('nav.shop') },
            { path: '/services', icon: Scissors, label: t('nav.services') },
            { path: '/social', icon: Heart, label: t('nav.social') },
            { path: '/profile', icon: User, label: t('nav.profile') },
          ].map((item) => {
            const active = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn('flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all duration-150 min-w-[52px]',
                  active ? 'text-brand-900 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'
                )}
              >
                <item.icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Drawers */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  )
}
