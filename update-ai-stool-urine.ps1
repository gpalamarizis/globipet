$root = "C:\gp"

$f1 = @'
import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/lib/i18n'
import { useAuthStore } from '@/store/auth'
import MainLayout from '@/components/layout/MainLayout'
import AuthLayout from '@/components/layout/AuthLayout'
import ProviderLayout from '@/components/layout/ProviderLayout'
import AdminLayout from '@/components/layout/AdminLayout'
import LoadingScreen from '@/components/ui/LoadingScreen'

const Home              = lazy(() => import('@/pages/Home'))
const Social            = lazy(() => import('@/pages/Social'))
const Marketplace       = lazy(() => import('@/pages/Marketplace'))
const ProductDetail     = lazy(() => import('@/pages/ProductDetail'))
const Services          = lazy(() => import('@/pages/Services'))
const ServiceDetail     = lazy(() => import('@/pages/ServiceDetail'))
const AiPetHealth       = lazy(() => import('@/pages/AiPetHealth'))
const AiEmotion         = lazy(() => import('@/pages/AiEmotion'))
const AiStoolUrine      = lazy(() => import('@/pages/AiStoolUrine'))
const PetPassport       = lazy(() => import('@/pages/PetPassport'))
const Playdates         = lazy(() => import('@/pages/Playdates'))
const Communities       = lazy(() => import('@/pages/Communities'))
const Telehealth        = lazy(() => import('@/pages/Telehealth'))
const Insurance         = lazy(() => import('@/pages/Insurance'))
const MyPets            = lazy(() => import('@/pages/MyPets'))
const PetDetail         = lazy(() => import('@/pages/PetDetail'))
const PetMedicalCenter  = lazy(() => import('@/pages/PetMedicalCenter'))
const PetTracker        = lazy(() => import('@/pages/PetTracker'))
const MyBookings        = lazy(() => import('@/pages/MyBookings'))
const Events            = lazy(() => import('@/pages/Events'))
const EventDetail       = lazy(() => import('@/pages/EventDetail'))
const Community         = lazy(() => import('@/pages/Community'))
const Forum             = lazy(() => import('@/pages/Forum'))
const ForumTopic        = lazy(() => import('@/pages/ForumTopic'))
const BreedExplorer     = lazy(() => import('@/pages/BreedExplorer'))
const BreedDetail       = lazy(() => import('@/pages/BreedDetail'))
const Profile           = lazy(() => import('@/pages/Profile'))
const Wishlist          = lazy(() => import('@/pages/Wishlist'))
const Checkout          = lazy(() => import('@/pages/Checkout'))
const MyOrders          = lazy(() => import('@/pages/MyOrders'))
const OrderConfirmation = lazy(() => import('@/pages/OrderConfirmation'))
const MarketInsights    = lazy(() => import('@/pages/MarketInsights'))
const Login             = lazy(() => import('@/pages/auth/Login'))
const Register          = lazy(() => import('@/pages/auth/Register'))
const ForgotPassword    = lazy(() => import('@/pages/auth/ForgotPassword'))
const ResetPassword     = lazy(() => import('@/pages/auth/ResetPassword'))
const ProviderDashboard = lazy(() => import('@/pages/provider/ProviderDashboard'))
const ProviderPackagesPage = lazy(() => import('@/pages/provider/ProviderPackagesPage'))
const AdminDashboard    = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminCatalogPage  = lazy(() => import('@/pages/admin/AdminCatalogPage'))
const AdminServicesPage = lazy(() => import('@/pages/admin/AdminServicesPage'))
const AdminPackagesPage = lazy(() => import('@/pages/admin/AdminPackagesPage'))
const AdminSubscriptionsPage = lazy(() => import('@/pages/admin/AdminSubscriptionsPage'))
const ProductSubscribe  = lazy(() => import('@/pages/ProductSubscribe'))
const NotFound          = lazy(() => import('@/pages/NotFound'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1, refetchOnWindowFocus: false } },
})

function OAuthHandler() {
  return null
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function ProviderRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  const canAccess = user?.role === 'service_provider' || user?.role === 'both' || user?.role === 'admin'
  return canAccess ? <>{children}</> : <Navigate to="/" replace />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  return user?.role === 'admin' ? <>{children}</> : <Navigate to="/" replace />
}

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <OAuthHandler />
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route element={<AuthLayout />}>
                <Route path="/login"           element={<Login />} />
                <Route path="/register"        element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password"  element={<ResetPassword />} />
              </Route>

              <Route element={<MainLayout />}>
                <Route path="/"                element={<Home />} />
                <Route path="/social"          element={<Social />} />
                <Route path="/marketplace"     element={<Marketplace />} />
                <Route path="/marketplace/:id" element={<ProductDetail />} />
                <Route path="/marketplace/:id/subscribe" element={<PrivateRoute><ProductSubscribe /></PrivateRoute>} />
                <Route path="/services"        element={<Services />} />
                <Route path="/services/:id"    element={<ServiceDetail />} />
                <Route path="/events"          element={<Events />} />
                <Route path="/events/:id"      element={<EventDetail />} />
                <Route path="/breeds"          element={<BreedExplorer />} />
                <Route path="/breeds/:id"      element={<BreedDetail />} />
                <Route path="/forum"           element={<Forum />} />
                <Route path="/forum/:id"       element={<ForumTopic />} />
                <Route path="/insurance"       element={<Insurance />} />
                <Route path="/ai-health"       element={<PrivateRoute><AiPetHealth /></PrivateRoute>} />
                <Route path="/ai-emotion"      element={<PrivateRoute><AiEmotion /></PrivateRoute>} />
                <Route path="/ai-stool-urine"  element={<PrivateRoute><AiStoolUrine /></PrivateRoute>} />
                <Route path="/passport"        element={<PrivateRoute><PetPassport /></PrivateRoute>} />
                <Route path="/playdates"       element={<PrivateRoute><Playdates /></PrivateRoute>} />
                <Route path="/communities"     element={<PrivateRoute><Communities /></PrivateRoute>} />
                <Route path="/telehealth"      element={<PrivateRoute><Telehealth /></PrivateRoute>} />
                <Route path="/my-pets"         element={<PrivateRoute><MyPets /></PrivateRoute>} />
                <Route path="/my-pets/:id"     element={<PrivateRoute><PetDetail /></PrivateRoute>} />
                <Route path="/medical-center"  element={<PrivateRoute><PetMedicalCenter /></PrivateRoute>} />
                <Route path="/tracker"         element={<PrivateRoute><PetTracker /></PrivateRoute>} />
                <Route path="/bookings"        element={<PrivateRoute><MyBookings /></PrivateRoute>} />
                <Route path="/community"       element={<PrivateRoute><Community /></PrivateRoute>} />
                <Route path="/profile"         element={<PrivateRoute><Profile /></PrivateRoute>} />
                <Route path="/wishlist"        element={<PrivateRoute><Wishlist /></PrivateRoute>} />
                <Route path="/checkout"        element={<PrivateRoute><Checkout /></PrivateRoute>} />
                <Route path="/orders"          element={<PrivateRoute><MyOrders /></PrivateRoute>} />
                <Route path="/orders/:id"      element={<PrivateRoute><OrderConfirmation /></PrivateRoute>} />
                <Route path="/market-insights" element={<PrivateRoute><MarketInsights /></PrivateRoute>} />
              </Route>

              <Route element={<ProviderRoute><ProviderLayout /></ProviderRoute>}>
                <Route path="/provider"          element={<ProviderDashboard />} />
                <Route path="/provider/packages" element={<ProviderPackagesPage />} />
                <Route path="/provider/*"        element={<ProviderDashboard />} />
              </Route>

              <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
                <Route path="/admin"               element={<AdminDashboard />} />
                <Route path="/admin/catalog"       element={<AdminCatalogPage />} />
                <Route path="/admin/services"      element={<AdminServicesPage />} />
                <Route path="/admin/packages"      element={<AdminPackagesPage />} />
                <Route path="/admin/subscriptions" element={<AdminSubscriptionsPage />} />
                <Route path="/admin/*"             element={<AdminDashboard />} />
              </Route>
              <Route path="*"        element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>

        <Toaster position="top-right" toastOptions={{
          duration: 4000,
          style: { borderRadius: '12px', background: '#1a1a1a', color: '#fff', fontSize: '14px' },
        }} />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </I18nextProvider>
  )
}
'@
$dir = Split-Path (Join-Path $root "apps\web\src\App.tsx")
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Content -Path (Join-Path $root "apps\web\src\App.tsx") -Value $f1 -Encoding UTF8 -NoNewline
Write-Host "OK: apps\web\src\App.tsx"

$f2 = @'
import { useState, useRef, useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Heart, ShoppingBag, Scissors, Search, Bell, ShoppingCart, Menu, X, ChevronDown, LogOut, User, Settings, PawPrint, Calendar, MessageSquare, Stethoscope, MapPin, Shield, Brain, BookOpen, Building2, FlaskConical } from 'lucide-react'
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
  { path: '/services',       labelKey: 'nav.services',      icon: Scissors,    color: 'text-orange-500' },
  { path: '/telehealth',     labelKey: 'nav.telehealth',    icon: Stethoscope, color: 'text-blue-500' },
  { path: '/insurance',      labelKey: 'nav.insurance',     icon: Shield,      color: 'text-green-500' },
  { path: '/tracker',        labelKey: 'nav.petTracker',    icon: MapPin,      color: 'text-red-500' },
  { path: '/ai-health',      labelKey: 'nav.aiHealth',      icon: Brain,       color: 'text-purple-500' },
  { path: '/ai-emotion',     labelKey: 'nav.aiEmotion',     icon: Heart,       color: 'text-pink-500' },
  { path: '/ai-stool-urine', labelKey: 'nav.aiStoolUrine',  icon: FlaskConical, color: 'text-teal-500' },
]

const communityDropdown = [
  { path: '/playdates',   labelKey: 'nav.playdates',   icon: PawPrint,  color: 'text-green-500' },
  { path: '/communities', labelKey: 'nav.communities', icon: Building2, color: 'text-purple-500' },
]

function NavDropdown({ label, icon: Icon, items }: {
  label: string
  icon: any
  items: typeof servicesDropdown
}) {
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
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
          isActive || open
            ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-900 dark:text-brand-400'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
        )}
      >
        <Icon size={14} />
        {label}
        <ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-52 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 py-2 z-50">
          {items.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                location.pathname === item.path
                  ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-900 dark:text-brand-400 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
            >
              <item.icon size={16} className={item.color} />
              {t(item.labelKey)}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MainLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const { user, isAuthenticated, logout } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false)
  const [mobileCommunityOpen, setMobileCommunityOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => { setUserMenuOpen(false) }, [location.pathname])

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
              <img src="/logo-clean.png" alt="GlobiPet" className="h-16 w-auto" />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {simpleNavItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                    location.pathname === item.path
                      ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-900 dark:text-brand-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  <item.icon size={14} />
                  {t(item.labelKey)}
                </Link>
              ))}

              <NavDropdown label={t('nav.services')} icon={Scissors} items={servicesDropdown} />
              <NavDropdown label={t('nav.community')} icon={PawPrint} items={communityDropdown} />
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
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
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
                          { to: '/wishlist',   icon: Heart,         label: 'Wishlist' },
                          { to: '/tracker',    icon: MapPin,        label: t('nav.petTracker') },
                          { to: '/telehealth', icon: MessageSquare, label: t('nav.telehealth') },
                        ].map(item => (
                          <Link
                            key={item.to}
                            to={item.to}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          >
                            <item.icon size={15} className="text-gray-400" />
                            {item.label}
                          </Link>
                        ))}
                        {(user?.role === 'service_provider' || user?.role === 'admin') && (
                          <Link
                            to="/provider"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-t border-gray-100 dark:border-gray-800 mt-1"
                          >
                            <Settings size={15} className="text-gray-400" />
                            {t('nav.providerDashboard')}
                          </Link>
                        )}
                        {user?.role === 'admin' && (
                          <Link
                            to="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          >
                            <Shield size={15} className="text-gray-400" />
                            {t('nav.admin')}
                          </Link>
                        )}
                        <div className="border-t border-gray-100 dark:border-gray-800 mt-1">
                          <button
                            onClick={() => { setUserMenuOpen(false); logout() }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
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
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"
            >
              <div className="px-4 py-3 space-y-1">
                {simpleNavItems.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
                      location.pathname === item.path ? 'bg-brand-50 text-brand-900' : 'text-gray-700 dark:text-gray-300'
                    )}
                  >
                    <item.icon size={18} />
                    {t(item.labelKey)}
                  </Link>
                ))}

                {/* Services section */}
                <button
                  onClick={() => setMobileServicesOpen(o => !o)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  <span className="flex items-center gap-3"><Scissors size={18} />{t('nav.services')}</span>
                  <ChevronDown size={16} className={cn('transition-transform', mobileServicesOpen && 'rotate-180')} />
                </button>
                {mobileServicesOpen && (
                  <div className="pl-4 space-y-1">
                    {servicesDropdown.map(item => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-xl text-sm',
                          location.pathname === item.path ? 'bg-brand-50 text-brand-900 font-medium' : 'text-gray-600 dark:text-gray-400'
                        )}
                      >
                        <item.icon size={16} className={item.color} />
                        {t(item.labelKey)}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Community section */}
                <button
                  onClick={() => setMobileCommunityOpen(o => !o)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  <span className="flex items-center gap-3"><PawPrint size={18} />{t('nav.community')}</span>
                  <ChevronDown size={16} className={cn('transition-transform', mobileCommunityOpen && 'rotate-180')} />
                </button>
                {mobileCommunityOpen && (
                  <div className="pl-4 space-y-1">
                    {communityDropdown.map(item => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-xl text-sm',
                          location.pathname === item.path ? 'bg-brand-50 text-brand-900 font-medium' : 'text-gray-600 dark:text-gray-400'
                        )}
                      >
                        <item.icon size={16} className={item.color} />
                        {t(item.labelKey)}
                      </Link>
                    ))}
                  </div>
                )}

                {!isAuthenticated && (
                  <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-secondary flex-1 text-center py-2 text-sm">{t('nav.login')}</Link>
                    <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-primary flex-1 text-center py-2 text-sm">{t('auth.register')}</Link>
                  </div>
                )}
                {isAuthenticated && user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-purple-600"
                  >
                    <Shield size={18} />Admin
                  </Link>
                )}
                {isAuthenticated && (
                  <button
                    onClick={() => { setMobileOpen(false); logout() }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600"
                  >
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
              <img src="/logo-clean.png" alt="GlobiPet" className="h-16 w-auto mb-3" />
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

      {/* Drawers */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  )
}
'@
$dir = Split-Path (Join-Path $root "apps\web\src\components\layout\MainLayout.tsx")
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Content -Path (Join-Path $root "apps\web\src\components\layout\MainLayout.tsx") -Value $f2 -Encoding UTF8 -NoNewline
Write-Host "OK: apps\web\src\components\layout\MainLayout.tsx"

$f3 = @'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

const el = {
  nav: {
    home: 'Αρχική', shop: 'Κατάστημα', marketplace: 'Marketplace',
    services: 'Υπηρεσίες', telehealth: 'Τηλεϊατρική', social: 'Social',
    forum: 'Forum', community: 'Κοινότητα', events: 'Εκδηλώσεις',
    myPets: 'Τα Ζωάκια μου', medicalCenter: 'Ιατρικό Κέντρο',
    petTracker: 'Tracker', myBookings: 'Κρατήσεις', profile: 'Προφίλ',
    provider: 'Πάροχος', providerDashboard: 'Dashboard Παρόχου',
    providerTools: 'Εργαλεία Παρόχου', admin: 'Admin', login: 'Σύνδεση',
    logout: 'Αποσύνδεση', breeds: 'Ράτσες', insurance: 'Ασφάλιση',
    aiHealth: 'AI Υγεία', aiEmotion: 'AI Emotion', aiStoolUrine: 'AI Ούρα & Περιττώματα', passport: 'Passport', playdates: 'Playdates', communities: 'Κοινότητες',
  },
  auth: {
    login: 'Σύνδεση', register: 'Εγγραφή', logout: 'Αποσύνδεση',
    email: 'Email', password: 'Κωδικός', forgotPassword: 'Ξέχασα τον κωδικό',
    noAccount: 'Δεν έχετε λογαριασμό;', hasAccount: 'Έχετε ήδη λογαριασμό;',
    fullName: 'Ονοματεπώνυμο', loginWith: 'Σύνδεση με',
    registerWith: 'Εγγραφή με', orWithEmail: 'ή με email',
    createAccount: 'Δημιουργία λογαριασμού', welcome: 'Καλώς ήρθατε!',
    signInAccount: 'Συνδεθείτε στον λογαριασμό σας',
    joinCommunity: 'Γίνετε μέλος της κοινότητάς μας',
    petOwner: 'Ιδιοκτήτης', petOwnerDesc: 'Έχω κατοικίδιο',
    provider: 'Πάροχος', providerDesc: 'Παρέχω υπηρεσίες',
    accountType: 'Τύπος λογαριασμού',
    acceptTerms: 'Αποδέχεστε τους', terms: 'Όρους Χρήσης', and: 'και την', privacy: 'Πολιτική Απορρήτου',
    minChars: 'Τουλάχιστον 8 χαρακτήρες',
  },
  home: {
    tagline: 'Η #1 πλατφόρμα για κατοικίδια στην Ελλάδα',
    heroTitle: 'Ό,τι χρειάζεται το κατοικίδιό σας',
    heroSubtitle: 'Υπηρεσίες, κατάστημα, τηλεϊατρική, tracker και κοινότητα σε μία εφαρμογή.',
    searchPlaceholder: 'Αναζήτηση υπηρεσίας...',
    cityPlaceholder: 'Πόλη...',
    search: 'Αναζήτηση',
    topProviders: 'Κορυφαίοι Πάροχοι',
    allProviders: 'Όλοι',
    shop: 'Κατάστημα',
    shopDesc: 'Τρόφιμα, παιχνίδια, αξεσουάρ και άλλα',
    allProducts: 'Κατάστημα',
    upcomingEvents: 'Εκδηλώσεις',
    allEvents: 'Όλες',
    aiTitle: 'Έξυπνες προτάσεις για το κατοικίδιό σου',
    aiDesc: 'Εξατομικευμένα πλάνα διατροφής, υγείας και wellness βασισμένα στο ιατρικό ιστορικό.',
    viewPets: 'Δες τα κατοικίδιά σου',
    wellnessPlans: 'Wellness Plans',
    marketTitle: 'Αναλύσεις αγοράς κατοικιδίων',
    marketDesc: 'Τάσεις, στατιστικά και αναλύσεις για την αγορά κατοικιδίων.',
    explore: 'Εξερεύνηση',
    users: 'Ιδιοκτήτες', pets: 'Κατοικίδια', rating: 'Βαθμολογία', security: 'Ασφάλεια',
    socialFeed: 'Social Feed', socialDesc: 'Μοιραστείτε στιγμές',
    marketplaceTitle: 'Κατάστημα', marketplaceDesc: 'Τρόφιμα, παιχνίδια και αξεσουάρ',
    servicesTitle: 'Υπηρεσίες', servicesDesc: 'Κτηνίατροι, grooming και εκπαίδευση',
    eventsTitle: 'Εκδηλώσεις', eventsDesc: 'Εκθέσεις, αγώνες και meetups',
    findPet: 'GPS Tracker', findPetDesc: 'Βρείτε το κατοικίδιό σας',
    aiPowered: 'AI-Powered',
  },
  services: {
    title: 'Υπηρεσίες',
    subtitle: 'Βρείτε τον κατάλληλο πάροχο για το κατοικίδιό σας',
    allServices: 'Όλες', bookNow: 'Κράτηση', viewReviews: 'Κριτικές',
    searchPlaceholder: 'Αναζήτηση...',
    cityPlaceholder: 'Πόλη...',
    verified: 'Επαληθευμένοι',
    emergency: 'Έκτακτα',
    noResults: 'Δεν βρέθηκαν υπηρεσίες',
    noResultsDesc: 'Δοκιμάστε διαφορετικά φίλτρα',
    results: 'αποτελέσματα',
    homeVisits: 'Κατ\' οίκον',
    yearsExp: 'χρ εμπ.',
    types: {
      veterinary: 'Κτηνίατρος', veterinary_clinic: 'Κλινική', grooming: 'Περιποίηση',
      training: 'Εκπαίδευση', hosting: 'Φιλοξενία', pet_sitting: 'Ιδιώτης (Ημερήσια φύλαξη)', walking: 'Βόλτες',
      boarding: 'Ξενοδοχείο Ζώων (Πολυήμερες διακοπές)', photography: 'Φωτογράφιση', pharmacy: 'Φαρμακείο',
      adoption: 'Υιοθεσία', shelter: 'Καταφύγιο', pet_taxi: 'Pet Taxi', other: 'Άλλο',
    },
  },
  marketplace: {
    title: 'Κατάστημα',
    subtitle: 'Τρόφιμα, παιχνίδια, αξεσουάρ και πολλά ακόμα',
    searchPlaceholder: 'Αναζήτηση προϊόντος...',
    noResults: 'Δεν βρέθηκαν προϊόντα',
    noResultsDesc: 'Δοκιμάστε διαφορετικούς όρους αναζήτησης',
    results: 'αποτελέσματα',
    addToCart: 'Καλάθι',
    inCategory: 'σε',
    categories: {
      all: 'Όλα', food: 'Τροφές', toys: 'Παιχνίδια', accessories: 'Αξεσουάρ', other: 'Άλλα',
    },
    sort: {
      featured: 'Προτεινόμενα', price_asc: 'Τιμή: Χαμηλή → Υψηλή',
      price_desc: 'Τιμή: Υψηλή → Χαμηλή', rating: 'Βαθμολογία', newest: 'Νεότερα',
    },
  },
  social: {
    title: 'Social Feed',
    newPost: 'Νέο Post',
    postPlaceholder: 'Μοιραστείτε κάτι για το κατοικίδιό σας...',
    publish: 'Δημοσίευση',
    publishing: 'Αποστολή...',
    cancel: 'Ακύρωση',
    hashtagHint: '#hashtag (Enter)',
    published: 'Η δημοσίευση αναρτήθηκε!',
    noPostsTitle: 'Δεν υπάρχουν δημοσιεύσεις ακόμα',
    noPostsDesc: 'Γίνε ο πρώτος που θα μοιραστεί κάτι!',
    filters: { all: 'Όλα', following: 'Ακολουθώ', trending: 'Trending' },
  },
  pets: {
    title: 'Τα Κατοικίδιά μου',
    subtitle: 'καταχωρημένα',
    addPet: 'Προσθήκη', noPets: 'Δεν έχετε κατοικίδια ακόμα',
    noPetsDesc: 'Προσθέστε το πρώτο σας κατοικίδιο για να ξεκινήσετε',
    addFirst: 'Προσθήκη κατοικίδιου',
    health: 'Υγεία', tracker: 'Tracker', wellness: 'Wellness',
    name: 'Όνομα', species: 'Είδος', breed: 'Ράτσα', age: 'Ηλικία',
    weight: 'Βάρος', gender: 'Φύλο', male: 'Αρσενικό', female: 'Θηλυκό',
    microchip: 'Microchip', vaccinations: 'Εμβόλια',
    isLost: 'Χαμένο', markAsLost: 'Σήμανση ως Χαμένο', markAsFound: 'Βρέθηκε',
    color: 'Χρώμα', addModal: 'Προσθήκη κατοικίδιου',
    save: 'Αποθήκευση', saving: 'Αποθήκευση...',
    added: 'προστέθηκε!', addError: 'Σφάλμα κατά την προσθήκη',
    years: 'ετών',
  },
  bookings: {
    title: 'Κρατήσεις μου',
    upcoming: 'Επερχόμενες', past: 'Παρελθόν', all: 'Όλες',
    noBookings: 'Δεν υπάρχουν κρατήσεις',
    noBookingsDesc: 'Κάνε την πρώτη σου κράτηση στις Υπηρεσίες',
    cancel: 'Ακύρωση', cancelled: 'Η κράτηση ακυρώθηκε',
    rate: 'Αξιολόγηση', submitReview: 'Υποβολή', reviewSubmitted: 'Η κριτική υποβλήθηκε!',
    status: { pending: 'Εκκρεμεί', confirmed: 'Επιβεβαιώθηκε', completed: 'Ολοκληρώθηκε', cancelled: 'Ακυρώθηκε' },
    minutes: 'λεπτά',
  },
  profile: {
    title: 'Προφίλ',
    edit: 'Επεξεργασία', save: 'Αποθήκευση', saving: 'Αποθήκευση...', cancel: 'Ακύρωση',
    saved: 'Το προφίλ αποθηκεύτηκε!',
    bio: 'Bio...', phone: 'Τηλέφωνο', city: 'Πόλη', website: 'Website',
    loyalty: 'Loyalty Program', points: 'πόντοι',
    tabs: { overview: 'Επισκόπηση', achievements: 'Επιτεύγματα', orders: 'Παραγγελίες', bookings: 'Κρατήσεις' },
    noOrders: 'Δεν υπάρχουν παραγγελίες', noBookings: 'Δεν υπάρχουν κρατήσεις',
    stats: { orders: 'Παραγγελίες', bookings: 'Κρατήσεις', achievements: 'Επιτεύγματα', points: 'Πόντοι' },
  },
  footer: {
    slogan: 'Best care for the best human\'s friends',
    explore: 'Εξερεύνηση', support: 'Υποστήριξη', legal: 'Νομικά',
    contact: 'Επικοινωνία', faq: 'FAQ', help: 'Βοήθεια',
    terms: 'Όροι Χρήσης', privacy: 'Απόρρητο', cookies: 'Cookies',
    allRights: 'Με επιφύλαξη παντός δικαιώματος.',
  },
  common: {
    loading: 'Φόρτωση...', error: 'Σφάλμα', save: 'Αποθήκευση',
    cancel: 'Ακύρωση', delete: 'Διαγραφή', edit: 'Επεξεργασία',
    add: 'Προσθήκη', close: 'Κλείσιμο', search: 'Αναζήτηση',
    filter: 'Φίλτρο', sort: 'Ταξινόμηση', noResults: 'Δεν βρέθηκαν αποτελέσματα',
    viewAll: 'Προβολή όλων', back: 'Πίσω', next: 'Επόμενο', previous: 'Προηγούμενο',
    confirm: 'Επιβεβαίωση', yes: 'Ναι', no: 'Όχι', submit: 'Υποβολή',
    required: 'Υποχρεωτικό', optional: 'Προαιρετικό', success: 'Επιτυχία!',
    from: 'από', reviews: 'κριτικές', free: 'Δωρεάν', year: 'έτη',
  },
  loyalty: {
    points: 'Πόντοι', tier: 'Επίπεδο', bronze: 'Bronze', silver: 'Silver',
    gold: 'Gold', platinum: 'Platinum', achievements: 'Επιτεύγματα',
    rewards: 'Ανταμοιβές', redeem: 'Εξαργύρωση',
  },
  cart: {
    title: 'Καλάθι', empty: 'Το καλάθι σας είναι άδειο',
    checkout: 'Ολοκλήρωση αγοράς', total: 'Σύνολο', added: 'Προστέθηκε στο καλάθι!',
  },
  notFound: {
    title: '404', message: 'Αυτή η σελίδα έχει χαθεί σαν κατοικίδιο...', home: 'Αρχική',
  },

  orders: {
    title: 'Οι Παραγγελίες μου',
    orderNumber: 'Παραγγελία',
    noOrders: 'Δεν έχετε παραγγελίες ακόμα',
    noOrdersDesc: 'Ανακαλύψτε τα προϊόντα μας',
    shop: 'Αγορές',
    status: { pending: 'Εκκρεμεί', confirmed: 'Επιβεβαιώθηκε', shipped: 'Αποστάλθηκε', delivered: 'Παραδόθηκε', cancelled: 'Ακυρώθηκε' },
  },
  orderConfirm: {
    title: 'Η παραγγελία σας ολοκληρώθηκε!',
    subtitle: 'Σας ευχαριστούμε για την παραγγελία σας. Θα λάβετε email επιβεβαίωσης σύντομα.',
    details: 'ΛΕΠΤΟΜΕΡΕΙΕΣ ΠΑΡΑΓΓΕΛΙΑΣ',
    orderNumber: 'Αριθμός παραγγελίας', total: 'Σύνολο', status: 'Κατάσταση', confirmed: 'Επιβεβαιώθηκε',
    myOrders: 'Οι παραγγελίες μου', continueShopping: 'Συνέχεια αγορών',
    steps: { confirmation: 'Επιβεβαίωση', preparing: 'Προετοιμασία', shipping: 'Αποστολή', delivery: 'Παράδοση' },
  },
  tracker: {
    title: 'GPS Tracker', realtime: 'Σύνδεση real-time', offline: 'Εκτός σύνδεσης',
    lostPetAlert: 'Χαμένο κατοικίδιο!', lostPetMsg: 'Ο {{name}} δεν έχει εντοπιστεί εδώ και {{minutes}} λεπτά',
    locate: 'Εντοπισμός', addTracker: 'Προσθήκη tracker',
    battery: 'Μπαταρία', signal: 'Σήμα', signalGood: 'Καλό', signalWeak: 'Αδύναμο', signalNone: 'Καμία',
    lastUpdate: 'Τελευταία ενημέρωση', status: 'Κατάσταση', lost: 'Χαμένο', safe: 'Ασφαλές',
    now: 'Τώρα', minutesAgo: 'λεπτά πριν', hoursAgo: 'ώρες πριν',
    directions: 'Οδηγίες', ping: 'Ping', pingSent: 'Αποστολή ειδοποίησης στο tracker!',
  },
  petsExtra: {
    lostBadge: 'ΧΑΜΕΝΟ', deleted: 'Το κατοικίδιο διαγράφηκε',
  },
  bookingsExtra: {
    newBooking: 'Νέα κράτηση', explore: 'Εξερεύνηση υπηρεσιών',
    details: 'Λεπτομέρειες', service: 'Υπηρεσία',
    reviewTitle: 'Αξιολόγηση υπηρεσίας', sending: 'Αποστολή...',
    commentPlaceholder: 'Σχόλια (προαιρετικά)...', cancelConfirm: 'Σίγουρα θέλετε να ακυρώσετε την κράτηση;',
  },
  authExtra: {
    requiredTitle: 'Απαιτείται σύνδεση',
  },
  notFoundExtra: {
    title: 'Σελίδα δεν βρέθηκε',
    message: 'Η σελίδα που ζητάτε δεν υπάρχει ή έχει μετακινηθεί.',
    home: 'Επιστροφή στην αρχική',
  },
  socialExtra: {
    published: 'Η δημοσίευση δημιουργήθηκε!', hashtagHint: 'Προσθήκη hashtag (πατήστε Enter)',
    noPostsTitle: 'Δεν υπάρχουν αναρτήσεις', noPostsDesc: 'Γίνετε ο πρώτος που θα μοιραστεί κάτι',
  },
  homeExtra: {
    users: 'Χρήστες', providers: 'Πάροχοι', pets: 'Κατοικίδια', rating: 'Βαθμολογία',
    aiPowered: 'AI-POWERED', explore: 'Εξερεύνηση',
  },
  commonExtra: {
    viewAll: 'Όλα',
  },

  authExtraLogin: {
    welcomeTitle: 'Καλώς ήρθατε!',
    welcomeSubtitle: 'Συνδεθείτε στον λογαριασμό σας',
    welcomeRegisterTitle: 'Δημιουργία λογαριασμού',
    welcomeRegisterSubtitle: 'Ξεκινήστε τη GlobiPet εμπειρία',
    loginGoogle: 'Σύνδεση με Google',
    loginFacebook: 'Σύνδεση με Facebook',
    registerGoogle: 'Εγγραφή με Google',
    registerFacebook: 'Εγγραφή με Facebook',
    orWithEmail: 'ή με email',
    email: 'Email',
    password: 'Κωδικός',
    fullName: 'Ονοματεπώνυμο',
    confirmPassword: 'Επιβεβαίωση κωδικού',
    forgotPassword: 'Ξέχασα τον κωδικό',
    loggingIn: 'Σύνδεση...',
    registering: 'Εγγραφή...',
    noAccount: 'Δεν έχετε λογαριασμό;',
    hasAccount: 'Έχετε ήδη λογαριασμό;',
    invalidCredentials: 'Λανθασμένα στοιχεία',
    passwordMismatch: 'Οι κωδικοί δεν ταιριάζουν',
    iAm: 'Είμαι',
    rolePetOwner: 'Ιδιοκτήτης κατοικίδιου',
    roleProvider: 'Πάροχος υπηρεσιών',
    roleBoth: 'Και τα δύο',
    forgotTitle: 'Ξεχάσατε τον κωδικό;',
    forgotSubtitle: 'Στείλτε μας το email σας και θα σας στείλουμε σύνδεσμο επαναφοράς',
    sendReset: 'Αποστολή',
    backToLogin: 'Επιστροφή στη σύνδεση',
    resetSent: 'Σας στείλαμε email!',
    resetTitle: 'Ορισμός νέου κωδικού',
    newPassword: 'Νέος κωδικός',
    resetPassword: 'Επαναφορά κωδικού',
    passwordReset: 'Ο κωδικός ενημερώθηκε!',
  },
}

// English
const en: typeof el = {
  nav: {
    home: 'Home', shop: 'Shop', marketplace: 'Marketplace',
    services: 'Services', telehealth: 'Telehealth', social: 'Social',
    forum: 'Forum', community: 'Community', events: 'Events',
    myPets: 'My Pets', medicalCenter: 'Medical Center',
    petTracker: 'Tracker', myBookings: 'Bookings', profile: 'Profile',
    provider: 'Provider', providerDashboard: 'Provider Dashboard',
    providerTools: 'Provider Tools', admin: 'Admin', login: 'Login',
    logout: 'Logout', breeds: 'Breeds', insurance: 'Insurance',
    aiHealth: 'AI Health', aiEmotion: 'AI Emotion', aiStoolUrine: 'AI Stool & Urine', passport: 'Passport', playdates: 'Playdates', communities: 'Communities',
  },
  auth: {
    login: 'Login', register: 'Register', logout: 'Logout',
    email: 'Email', password: 'Password', forgotPassword: 'Forgot password',
    noAccount: "Don't have an account?", hasAccount: 'Already have an account?',
    fullName: 'Full Name', loginWith: 'Login with', registerWith: 'Register with',
    orWithEmail: 'or with email', createAccount: 'Create account', welcome: 'Welcome back!',
    signInAccount: 'Sign in to your account', joinCommunity: 'Join our community',
    petOwner: 'Pet Owner', petOwnerDesc: 'I have a pet',
    provider: 'Provider', providerDesc: 'I provide services',
    accountType: 'Account type',
    acceptTerms: 'You accept the', terms: 'Terms of Service', and: 'and the', privacy: 'Privacy Policy',
    minChars: 'At least 8 characters',
  },
  home: {
    tagline: 'The #1 pet platform in Greece',
    heroTitle: 'Everything your pet needs',
    heroSubtitle: 'Services, marketplace, telehealth, tracker and community in one app.',
    searchPlaceholder: 'Search for a service...', cityPlaceholder: 'City...', search: 'Search',
    topProviders: 'Top Providers', allProviders: 'All',
    shop: 'Marketplace', shopDesc: 'Food, toys, accessories and more', allProducts: 'Marketplace',
    upcomingEvents: 'Events', allEvents: 'All',
    aiTitle: 'Smart recommendations for your pet', aiDesc: 'Personalized nutrition, health and wellness plans.',
    viewPets: 'View my pets', wellnessPlans: 'Wellness Plans',
    marketTitle: 'Pet market insights', marketDesc: 'Trends, stats and analysis.',
    explore: 'Explore', users: 'Owners', pets: 'Pets', rating: 'Rating', security: 'Security',
    socialFeed: 'Social Feed', socialDesc: 'Share moments',
    marketplaceTitle: 'Marketplace', marketplaceDesc: 'Food, toys and accessories',
    servicesTitle: 'Services', servicesDesc: 'Vets, grooming and training',
    eventsTitle: 'Events', eventsDesc: 'Shows, competitions and meetups',
    findPet: 'GPS Tracker', findPetDesc: 'Find your pet', aiPowered: 'AI-Powered',
  },
  services: {
    title: 'Services', subtitle: 'Find the right provider for your pet',
    allServices: 'All', bookNow: 'Book Now', viewReviews: 'Reviews',
    searchPlaceholder: 'Search...', cityPlaceholder: 'City...',
    verified: 'Verified', emergency: 'Emergency',
    noResults: 'No services found', noResultsDesc: 'Try different filters',
    results: 'results', homeVisits: 'Home visits', yearsExp: 'yrs exp.',
    types: {
      veterinary: 'Veterinary', veterinary_clinic: 'Clinic', grooming: 'Grooming',
      training: 'Training', hosting: 'Boarding & Sitting', pet_sitting: 'Pet Sitting', walking: 'Walking',
      boarding: 'Pet Hotel', photography: 'Photography', pharmacy: 'Pharmacy',
      adoption: 'Adoption', shelter: 'Shelter', pet_taxi: 'Pet Taxi', other: 'Other',
    },
  },
  marketplace: {
    title: 'Marketplace', subtitle: 'Food, toys, accessories and more',
    searchPlaceholder: 'Search product...', noResults: 'No products found',
    noResultsDesc: 'Try different search terms', results: 'results', addToCart: 'Cart', inCategory: 'in',
    categories: {
      all: 'All', food: 'Food', toys: 'Toys', accessories: 'Accessories', other: 'Other',
    },
    sort: {
      featured: 'Featured', price_asc: 'Price: Low → High',
      price_desc: 'Price: High → Low', rating: 'Rating', newest: 'Newest',
    },
  },
  social: {
    title: 'Social Feed', newPost: 'New Post',
    postPlaceholder: 'Share something about your pet...',
    publish: 'Publish', publishing: 'Sending...', cancel: 'Cancel',
    hashtagHint: '#hashtag (Enter)', published: 'Post published!',
    noPostsTitle: 'No posts yet', noPostsDesc: 'Be the first to share something!',
    filters: { all: 'All', following: 'Following', trending: 'Trending' },
  },
  pets: {
    title: 'My Pets', subtitle: 'registered', addPet: 'Add', noPets: 'No pets yet',
    noPetsDesc: 'Add your first pet to get started', addFirst: 'Add a pet',
    health: 'Health', tracker: 'Tracker', wellness: 'Wellness',
    name: 'Name', species: 'Species', breed: 'Breed', age: 'Age',
    weight: 'Weight', gender: 'Gender', male: 'Male', female: 'Female',
    microchip: 'Microchip', vaccinations: 'Vaccinations',
    isLost: 'Lost', markAsLost: 'Mark as Lost', markAsFound: 'Found',
    color: 'Color', addModal: 'Add pet', save: 'Save', saving: 'Saving...',
    added: 'added!', addError: 'Error adding pet', years: 'years',
  },
  bookings: {
    title: 'My Bookings', upcoming: 'Upcoming', past: 'Past', all: 'All',
    noBookings: 'No bookings yet', noBookingsDesc: 'Make your first booking in Services',
    cancel: 'Cancel', cancelled: 'Booking cancelled',
    rate: 'Rate', submitReview: 'Submit', reviewSubmitted: 'Review submitted!',
    status: { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' },
    minutes: 'minutes',
  },
  profile: {
    title: 'Profile', edit: 'Edit', save: 'Save', saving: 'Saving...', cancel: 'Cancel',
    saved: 'Profile saved!', bio: 'Bio...', phone: 'Phone', city: 'City', website: 'Website',
    loyalty: 'Loyalty Program', points: 'points',
    tabs: { overview: 'Overview', achievements: 'Achievements', orders: 'Orders', bookings: 'Bookings' },
    noOrders: 'No orders yet', noBookings: 'No bookings yet',
    stats: { orders: 'Orders', bookings: 'Bookings', achievements: 'Achievements', points: 'Points' },
  },
  footer: {
    slogan: 'Best care for the best human\'s friends',
    explore: 'Explore', support: 'Support', legal: 'Legal',
    contact: 'Contact', faq: 'FAQ', help: 'Help',
    terms: 'Terms of Service', privacy: 'Privacy Policy', cookies: 'Cookies',
    allRights: 'All rights reserved.',
  },
  common: {
    loading: 'Loading...', error: 'Error', save: 'Save',
    cancel: 'Cancel', delete: 'Delete', edit: 'Edit',
    add: 'Add', close: 'Close', search: 'Search',
    filter: 'Filter', sort: 'Sort', noResults: 'No results found',
    viewAll: 'View all', back: 'Back', next: 'Next', previous: 'Previous',
    confirm: 'Confirm', yes: 'Yes', no: 'No', submit: 'Submit',
    required: 'Required', optional: 'Optional', success: 'Success!',
    from: 'from', reviews: 'reviews', free: 'Free', year: 'years',
  },
  loyalty: {
    points: 'Points', tier: 'Tier', bronze: 'Bronze', silver: 'Silver',
    gold: 'Gold', platinum: 'Platinum', achievements: 'Achievements',
    rewards: 'Rewards', redeem: 'Redeem',
  },
  cart: {
    title: 'Cart', empty: 'Your cart is empty',
    checkout: 'Checkout', total: 'Total', added: 'Added to cart!',
  },
  notFound: { title: '404', message: 'This page got lost like a pet...', home: 'Home' },

  orders: {
    title: 'My Orders', orderNumber: 'Order',
    noOrders: 'No orders yet', noOrdersDesc: 'Discover our products', shop: 'Shop',
    status: { pending: 'Pending', confirmed: 'Confirmed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' },
  },
  orderConfirm: {
    title: 'Your order is complete!',
    subtitle: 'Thank you for your order. You will receive a confirmation email shortly.',
    details: 'ORDER DETAILS', orderNumber: 'Order number', total: 'Total', status: 'Status', confirmed: 'Confirmed',
    myOrders: 'My Orders', continueShopping: 'Continue shopping',
    steps: { confirmation: 'Confirmation', preparing: 'Preparing', shipping: 'Shipping', delivery: 'Delivery' },
  },
  tracker: {
    title: 'GPS Tracker', realtime: 'Real-time connection', offline: 'Offline',
    lostPetAlert: 'Lost pet!', lostPetMsg: '{{name}} has not been located for {{minutes}} minutes',
    locate: 'Locate', addTracker: 'Add tracker',
    battery: 'Battery', signal: 'Signal', signalGood: 'Good', signalWeak: 'Weak', signalNone: 'None',
    lastUpdate: 'Last update', status: 'Status', lost: 'Lost', safe: 'Safe',
    now: 'Now', minutesAgo: 'minutes ago', hoursAgo: 'hours ago',
    directions: 'Directions', ping: 'Ping', pingSent: 'Notification sent to tracker!',
  },
  petsExtra: {
    lostBadge: 'LOST', deleted: 'Pet deleted',
  },
  bookingsExtra: {
    newBooking: 'New booking', explore: 'Explore services',
    details: 'Details', service: 'Service',
    reviewTitle: 'Rate Service', sending: 'Sending...',
    commentPlaceholder: 'Comments (optional)...', cancelConfirm: 'Are you sure you want to cancel?',
  },
  authExtra: {
    requiredTitle: 'Login required',
  },
  notFoundExtra: {
    title: 'Page not found',
    message: 'The page you are looking for does not exist or has been moved.',
    home: 'Back to home',
  },
  socialExtra: {
    published: 'Post published!', hashtagHint: 'Add hashtag (press Enter)',
    noPostsTitle: 'No posts yet', noPostsDesc: 'Be the first to share something',
  },
  homeExtra: {
    users: 'Users', providers: 'Providers', pets: 'Pets', rating: 'Rating',
    aiPowered: 'AI-POWERED', explore: 'Explore',
  },
  commonExtra: {
    viewAll: 'View All',
  },

  authExtraLogin: {
    welcomeTitle: 'Welcome back!',
    welcomeSubtitle: 'Sign in to your account',
    welcomeRegisterTitle: 'Create account',
    welcomeRegisterSubtitle: 'Start your GlobiPet experience',
    loginGoogle: 'Sign in with Google',
    loginFacebook: 'Sign in with Facebook',
    registerGoogle: 'Sign up with Google',
    registerFacebook: 'Sign up with Facebook',
    orWithEmail: 'or with email',
    email: 'Email',
    password: 'Password',
    fullName: 'Full name',
    confirmPassword: 'Confirm password',
    forgotPassword: 'Forgot password',
    loggingIn: 'Signing in...',
    registering: 'Signing up...',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    invalidCredentials: 'Invalid credentials',
    passwordMismatch: 'Passwords do not match',
    iAm: 'I am a',
    rolePetOwner: 'Pet owner',
    roleProvider: 'Service provider',
    roleBoth: 'Both',
    forgotTitle: 'Forgot password?',
    forgotSubtitle: 'Send us your email and we will send you a reset link',
    sendReset: 'Send',
    backToLogin: 'Back to login',
    resetSent: 'Email sent!',
    resetTitle: 'Set new password',
    newPassword: 'New password',
    resetPassword: 'Reset password',
    passwordReset: 'Password updated!',
  },
}

// Spanish
const es: typeof el = {
  nav: {
    home: 'Inicio', shop: 'Tienda', marketplace: 'Marketplace',
    services: 'Servicios', telehealth: 'Telesalud', social: 'Social',
    forum: 'Foro', community: 'Comunidad', events: 'Eventos',
    myPets: 'Mis Mascotas', medicalCenter: 'Centro Médico',
    petTracker: 'Rastreador', myBookings: 'Reservas', profile: 'Perfil',
    provider: 'Proveedor', providerDashboard: 'Panel Proveedor',
    providerTools: 'Herramientas', admin: 'Admin', login: 'Iniciar sesión',
    logout: 'Cerrar sesión', breeds: 'Razas', insurance: 'Seguro',
    aiHealth: 'Salud AI', aiEmotion: 'AI Emoción', aiStoolUrine: 'AI Orina & Heces', passport: 'Pasaporte', playdates: 'Playdates', communities: 'Comunidades',
  },
  auth: {
    login: 'Iniciar sesión', register: 'Registrarse', logout: 'Cerrar sesión',
    email: 'Email', password: 'Contraseña', forgotPassword: 'Olvidé mi contraseña',
    noAccount: '¿No tienes cuenta?', hasAccount: '¿Ya tienes cuenta?',
    fullName: 'Nombre completo', loginWith: 'Iniciar con', registerWith: 'Registrarse con',
    orWithEmail: 'o con email', createAccount: 'Crear cuenta', welcome: '¡Bienvenido!',
    signInAccount: 'Inicia sesión en tu cuenta', joinCommunity: 'Únete a nuestra comunidad',
    petOwner: 'Dueño', petOwnerDesc: 'Tengo una mascota',
    provider: 'Proveedor', providerDesc: 'Ofrezco servicios',
    accountType: 'Tipo de cuenta',
    acceptTerms: 'Aceptas los', terms: 'Términos de Servicio', and: 'y la', privacy: 'Política de Privacidad',
    minChars: 'Al menos 8 caracteres',
  },
  home: {
    tagline: 'La plataforma #1 para mascotas en Grecia',
    heroTitle: 'Todo lo que necesita tu mascota',
    heroSubtitle: 'Servicios, tienda, telesalud, rastreador y comunidad en una app.',
    searchPlaceholder: 'Buscar servicio...', cityPlaceholder: 'Ciudad...', search: 'Buscar',
    topProviders: 'Mejores Proveedores', allProviders: 'Todos',
    shop: 'Tienda', shopDesc: 'Comida, juguetes y accesorios', allProducts: 'Tienda',
    upcomingEvents: 'Eventos', allEvents: 'Todos',
    aiTitle: 'Recomendaciones inteligentes para tu mascota', aiDesc: 'Planes personalizados de nutrición y salud.',
    viewPets: 'Ver mis mascotas', wellnessPlans: 'Planes Wellness',
    marketTitle: 'Análisis del mercado de mascotas', marketDesc: 'Tendencias y estadísticas.',
    explore: 'Explorar', users: 'Dueños', pets: 'Mascotas', rating: 'Valoración', security: 'Seguridad',
    socialFeed: 'Social Feed', socialDesc: 'Comparte momentos',
    marketplaceTitle: 'Tienda', marketplaceDesc: 'Comida, juguetes y accesorios',
    servicesTitle: 'Servicios', servicesDesc: 'Veterinarios, peluquería y entrenamiento',
    eventsTitle: 'Eventos', eventsDesc: 'Exposiciones y competiciones',
    findPet: 'GPS Tracker', findPetDesc: 'Encuentra tu mascota', aiPowered: 'Potenciado por IA',
  },
  services: {
    title: 'Servicios', subtitle: 'Encuentra el proveedor adecuado para tu mascota',
    allServices: 'Todos', bookNow: 'Reservar', viewReviews: 'Reseñas',
    searchPlaceholder: 'Buscar...', cityPlaceholder: 'Ciudad...',
    verified: 'Verificados', emergency: 'Emergencias',
    noResults: 'No se encontraron servicios', noResultsDesc: 'Intenta con otros filtros',
    results: 'resultados', homeVisits: 'Visitas a domicilio', yearsExp: 'años exp.',
    types: {
      veterinary: 'Veterinario', veterinary_clinic: 'Clínica', grooming: 'Peluquería',
      training: 'Entrenamiento', pet_sitting: 'Cuidado', walking: 'Paseos',
      boarding: 'Hospedaje', photography: 'Fotografía', pharmacy: 'Farmacia',
      adoption: 'Adopción', shelter: 'Refugio', pet_taxi: 'Pet Taxi', other: 'Otro',
    },
  },
  marketplace: {
    title: 'Tienda', subtitle: 'Comida, juguetes, accesorios y más',
    searchPlaceholder: 'Buscar producto...', noResults: 'No se encontraron productos',
    noResultsDesc: 'Intenta con otros términos', results: 'resultados', addToCart: 'Cesta', inCategory: 'en',
    categories: {
      all: 'Todo', food: 'Alimentación', toys: 'Juguetes', accessories: 'Accesorios',
      health: 'Salud', grooming: 'Peluquería', training: 'Entrenamiento', housing: 'Vivienda', other: 'Otros',
    },
    sort: {
      featured: 'Destacados', price_asc: 'Precio: Bajo → Alto',
      price_desc: 'Precio: Alto → Bajo', rating: 'Valoración', newest: 'Más nuevos',
    },
  },
  social: {
    title: 'Social Feed', newPost: 'Nueva publicación',
    postPlaceholder: 'Comparte algo sobre tu mascota...',
    publish: 'Publicar', publishing: 'Enviando...', cancel: 'Cancelar',
    hashtagHint: '#hashtag (Enter)', published: '¡Publicación enviada!',
    noPostsTitle: 'Aún no hay publicaciones', noPostsDesc: '¡Sé el primero en compartir algo!',
    filters: { all: 'Todo', following: 'Siguiendo', trending: 'Tendencias' },
  },
  pets: {
    title: 'Mis Mascotas', subtitle: 'registradas', addPet: 'Añadir', noPets: 'Aún no tienes mascotas',
    noPetsDesc: 'Añade tu primera mascota para comenzar', addFirst: 'Añadir mascota',
    health: 'Salud', tracker: 'Rastreador', wellness: 'Wellness',
    name: 'Nombre', species: 'Especie', breed: 'Raza', age: 'Edad',
    weight: 'Peso', gender: 'Género', male: 'Macho', female: 'Hembra',
    microchip: 'Microchip', vaccinations: 'Vacunas',
    isLost: 'Perdido', markAsLost: 'Marcar como perdido', markAsFound: 'Encontrado',
    color: 'Color', addModal: 'Añadir mascota', save: 'Guardar', saving: 'Guardando...',
    added: '¡añadido!', addError: 'Error al añadir', years: 'años',
  },
  bookings: {
    title: 'Mis Reservas', upcoming: 'Próximas', past: 'Pasadas', all: 'Todas',
    noBookings: 'Sin reservas', noBookingsDesc: 'Haz tu primera reserva en Servicios',
    cancel: 'Cancelar', cancelled: 'Reserva cancelada',
    rate: 'Valorar', submitReview: 'Enviar', reviewSubmitted: '¡Reseña enviada!',
    status: { pending: 'Pendiente', confirmed: 'Confirmado', completed: 'Completado', cancelled: 'Cancelado' },
    minutes: 'minutos',
  },
  profile: {
    title: 'Perfil', edit: 'Editar', save: 'Guardar', saving: 'Guardando...', cancel: 'Cancelar',
    saved: '¡Perfil guardado!', bio: 'Bio...', phone: 'Teléfono', city: 'Ciudad', website: 'Sitio web',
    loyalty: 'Programa de Fidelidad', points: 'puntos',
    tabs: { overview: 'Resumen', achievements: 'Logros', orders: 'Pedidos', bookings: 'Reservas' },
    noOrders: 'Sin pedidos', noBookings: 'Sin reservas',
    stats: { orders: 'Pedidos', bookings: 'Reservas', achievements: 'Logros', points: 'Puntos' },
  },
  footer: {
    slogan: 'Best care for the best human\'s friends',
    explore: 'Explorar', support: 'Soporte', legal: 'Legal',
    contact: 'Contacto', faq: 'FAQ', help: 'Ayuda',
    terms: 'Términos', privacy: 'Privacidad', cookies: 'Cookies',
    allRights: 'Todos los derechos reservados.',
  },
  common: {
    loading: 'Cargando...', error: 'Error', save: 'Guardar',
    cancel: 'Cancelar', delete: 'Eliminar', edit: 'Editar',
    add: 'Añadir', close: 'Cerrar', search: 'Buscar',
    filter: 'Filtrar', sort: 'Ordenar', noResults: 'Sin resultados',
    viewAll: 'Ver todo', back: 'Atrás', next: 'Siguiente', previous: 'Anterior',
    confirm: 'Confirmar', yes: 'Sí', no: 'No', submit: 'Enviar',
    required: 'Obligatorio', optional: 'Opcional', success: '¡Éxito!',
    from: 'desde', reviews: 'reseñas', free: 'Gratis', year: 'años',
  },
  loyalty: {
    points: 'Puntos', tier: 'Nivel', bronze: 'Bronce', silver: 'Plata',
    gold: 'Oro', platinum: 'Platino', achievements: 'Logros',
    rewards: 'Recompensas', redeem: 'Canjear',
  },
  cart: {
    title: 'Cesta', empty: 'Tu cesta está vacía',
    checkout: 'Finalizar compra', total: 'Total', added: '¡Añadido a la cesta!',
  },
  notFound: { title: '404', message: 'Esta página se perdió como una mascota...', home: 'Inicio' },

  orders: {
    title: 'Mis Pedidos', orderNumber: 'Pedido',
    noOrders: 'No tienes pedidos', noOrdersDesc: 'Descubre nuestros productos', shop: 'Comprar',
    status: { pending: 'Pendiente', confirmed: 'Confirmado', shipped: 'Enviado', delivered: 'Entregado', cancelled: 'Cancelado' },
  },
  orderConfirm: {
    title: '¡Tu pedido está completo!',
    subtitle: 'Gracias por tu pedido. Recibirás un email de confirmación pronto.',
    details: 'DETALLES DEL PEDIDO', orderNumber: 'Número de pedido', total: 'Total', status: 'Estado', confirmed: 'Confirmado',
    myOrders: 'Mis Pedidos', continueShopping: 'Seguir comprando',
    steps: { confirmation: 'Confirmación', preparing: 'Preparación', shipping: 'Envío', delivery: 'Entrega' },
  },
  tracker: {
    title: 'GPS Tracker', realtime: 'Conexión en tiempo real', offline: 'Sin conexión',
    lostPetAlert: '¡Mascota perdida!', lostPetMsg: '{{name}} no ha sido localizado durante {{minutes}} minutos',
    locate: 'Localizar', addTracker: 'Añadir tracker',
    battery: 'Batería', signal: 'Señal', signalGood: 'Buena', signalWeak: 'Débil', signalNone: 'Ninguna',
    lastUpdate: 'Última actualización', status: 'Estado', lost: 'Perdida', safe: 'Segura',
    now: 'Ahora', minutesAgo: 'minutos atrás', hoursAgo: 'horas atrás',
    directions: 'Direcciones', ping: 'Ping', pingSent: '¡Notificación enviada al tracker!',
  },
  petsExtra: {
    lostBadge: 'PERDIDA', deleted: 'Mascota eliminada',
  },
  bookingsExtra: {
    newBooking: 'Nueva reserva', explore: 'Explorar servicios',
    details: 'Detalles', service: 'Servicio',
    reviewTitle: 'Valorar servicio', sending: 'Enviando...',
    commentPlaceholder: 'Comentarios (opcional)...', cancelConfirm: '¿Seguro que quieres cancelar?',
  },
  authExtra: {
    requiredTitle: 'Inicio de sesión requerido',
  },
  notFoundExtra: {
    title: 'Página no encontrada',
    message: 'La página que buscas no existe o ha sido movida.',
    home: 'Volver al inicio',
  },
  socialExtra: {
    published: '¡Publicación creada!', hashtagHint: 'Añadir hashtag (pulsa Enter)',
    noPostsTitle: 'No hay publicaciones', noPostsDesc: 'Sé el primero en compartir algo',
  },
  homeExtra: {
    users: 'Usuarios', providers: 'Proveedores', pets: 'Mascotas', rating: 'Valoración',
    aiPowered: 'AI-POWERED', explore: 'Explorar',
  },
  commonExtra: {
    viewAll: 'Ver Todo',
  },

  authExtraLogin: {
    welcomeTitle: '¡Bienvenido!',
    welcomeSubtitle: 'Inicia sesión en tu cuenta',
    welcomeRegisterTitle: 'Crear cuenta',
    welcomeRegisterSubtitle: 'Comienza tu experiencia GlobiPet',
    loginGoogle: 'Iniciar con Google',
    loginFacebook: 'Iniciar con Facebook',
    registerGoogle: 'Registrarse con Google',
    registerFacebook: 'Registrarse con Facebook',
    orWithEmail: 'o con email',
    email: 'Email',
    password: 'Contraseña',
    fullName: 'Nombre completo',
    confirmPassword: 'Confirmar contraseña',
    forgotPassword: 'Olvidé mi contraseña',
    loggingIn: 'Iniciando...',
    registering: 'Registrando...',
    noAccount: '¿No tienes cuenta?',
    hasAccount: '¿Ya tienes cuenta?',
    invalidCredentials: 'Credenciales inválidas',
    passwordMismatch: 'Las contraseñas no coinciden',
    iAm: 'Soy',
    rolePetOwner: 'Dueño de mascota',
    roleProvider: 'Proveedor de servicios',
    roleBoth: 'Ambos',
    forgotTitle: '¿Olvidaste tu contraseña?',
    forgotSubtitle: 'Envíanos tu email y te enviaremos un enlace de recuperación',
    sendReset: 'Enviar',
    backToLogin: 'Volver al inicio',
    resetSent: '¡Email enviado!',
    resetTitle: 'Establecer nueva contraseña',
    newPassword: 'Nueva contraseña',
    resetPassword: 'Restablecer contraseña',
    passwordReset: '¡Contraseña actualizada!',
  },
}

// French
const fr: typeof el = {
  nav: {
    home: 'Accueil', shop: 'Boutique', marketplace: 'Marketplace',
    services: 'Services', telehealth: 'Télésanté', social: 'Social',
    forum: 'Forum', community: 'Communauté', events: 'Événements',
    myPets: 'Mes Animaux', medicalCenter: 'Centre Médical',
    petTracker: 'Tracker', myBookings: 'Réservations', profile: 'Profil',
    provider: 'Prestataire', providerDashboard: 'Tableau de bord',
    providerTools: 'Outils', admin: 'Admin', login: 'Connexion',
    logout: 'Déconnexion', breeds: 'Races', insurance: 'Assurance',
    aiHealth: 'Santé IA', aiEmotion: 'Émotion IA', aiStoolUrine: 'IA Urines & Selles', passport: 'Passeport', playdates: 'Playdates', communities: 'Communautés',
  },
  auth: {
    login: 'Connexion', register: "S'inscrire", logout: 'Déconnexion',
    email: 'Email', password: 'Mot de passe', forgotPassword: 'Mot de passe oublié',
    noAccount: 'Pas de compte?', hasAccount: 'Déjà un compte?',
    fullName: 'Nom complet', loginWith: 'Se connecter avec', registerWith: "S'inscrire avec",
    orWithEmail: 'ou avec email', createAccount: 'Créer un compte', welcome: 'Bienvenue!',
    signInAccount: 'Connectez-vous à votre compte', joinCommunity: 'Rejoignez notre communauté',
    petOwner: 'Propriétaire', petOwnerDesc: "J'ai un animal",
    provider: 'Prestataire', providerDesc: 'Je fournis des services',
    accountType: 'Type de compte',
    acceptTerms: 'Vous acceptez les', terms: "Conditions d'utilisation", and: 'et la', privacy: 'Politique de confidentialité',
    minChars: 'Au moins 8 caractères',
  },
  home: {
    tagline: 'La plateforme #1 pour animaux en Grèce',
    heroTitle: 'Tout ce dont votre animal a besoin',
    heroSubtitle: 'Services, boutique, télésanté, tracker et communauté en une app.',
    searchPlaceholder: 'Rechercher un service...', cityPlaceholder: 'Ville...', search: 'Rechercher',
    topProviders: 'Meilleurs Prestataires', allProviders: 'Tous',
    shop: 'Boutique', shopDesc: 'Nourriture, jouets et accessoires', allProducts: 'Boutique',
    upcomingEvents: 'Événements', allEvents: 'Tous',
    aiTitle: 'Recommandations intelligentes pour votre animal', aiDesc: 'Plans personnalisés de nutrition et santé.',
    viewPets: 'Voir mes animaux', wellnessPlans: 'Plans Wellness',
    marketTitle: 'Analyse du marché animalier', marketDesc: 'Tendances et statistiques.',
    explore: 'Explorer', users: 'Propriétaires', pets: 'Animaux', rating: 'Note', security: 'Sécurité',
    socialFeed: 'Social Feed', socialDesc: 'Partagez des moments',
    marketplaceTitle: 'Boutique', marketplaceDesc: 'Nourriture, jouets et accessoires',
    servicesTitle: 'Services', servicesDesc: 'Vétérinaires, toilettage et dressage',
    eventsTitle: 'Événements', eventsDesc: 'Expositions et compétitions',
    findPet: 'GPS Tracker', findPetDesc: 'Retrouvez votre animal', aiPowered: 'Propulsé par IA',
  },
  services: {
    title: 'Services', subtitle: 'Trouvez le bon prestataire pour votre animal',
    allServices: 'Tous', bookNow: 'Réserver', viewReviews: 'Avis',
    searchPlaceholder: 'Rechercher...', cityPlaceholder: 'Ville...',
    verified: 'Vérifiés', emergency: 'Urgences',
    noResults: 'Aucun service trouvé', noResultsDesc: 'Essayez d\'autres filtres',
    results: 'résultats', homeVisits: 'Visites à domicile', yearsExp: 'ans exp.',
    types: {
      veterinary: 'Vétérinaire', veterinary_clinic: 'Clinique', grooming: 'Toilettage',
      training: 'Dressage', pet_sitting: 'Garde', walking: 'Promenades',
      boarding: 'Pension', photography: 'Photographie', pharmacy: 'Pharmacie',
      adoption: 'Adoption', shelter: 'Refuge', pet_taxi: 'Pet Taxi', other: 'Autre',
    },
  },
  marketplace: {
    title: 'Boutique', subtitle: 'Nourriture, jouets, accessoires et plus',
    searchPlaceholder: 'Rechercher un produit...', noResults: 'Aucun produit trouvé',
    noResultsDesc: 'Essayez d\'autres termes', results: 'résultats', addToCart: 'Panier', inCategory: 'dans',
    categories: {
      all: 'Tout', food: 'Alimentation', toys: 'Jouets', accessories: 'Accessoires',
      health: 'Santé', grooming: 'Toilettage', training: 'Dressage', housing: 'Logement', other: 'Autres',
    },
    sort: {
      featured: 'En vedette', price_asc: 'Prix: Bas → Élevé',
      price_desc: 'Prix: Élevé → Bas', rating: 'Note', newest: 'Plus récents',
    },
  },
  social: {
    title: 'Social Feed', newPost: 'Nouvelle publication',
    postPlaceholder: 'Partagez quelque chose sur votre animal...',
    publish: 'Publier', publishing: 'Envoi...', cancel: 'Annuler',
    hashtagHint: '#hashtag (Entrée)', published: 'Publication envoyée!',
    noPostsTitle: 'Pas encore de publications', noPostsDesc: 'Soyez le premier à partager!',
    filters: { all: 'Tout', following: 'Abonnements', trending: 'Tendances' },
  },
  pets: {
    title: 'Mes Animaux', subtitle: 'enregistrés', addPet: 'Ajouter', noPets: "Pas encore d'animaux",
    noPetsDesc: 'Ajoutez votre premier animal pour commencer', addFirst: 'Ajouter un animal',
    health: 'Santé', tracker: 'Tracker', wellness: 'Wellness',
    name: 'Nom', species: 'Espèce', breed: 'Race', age: 'Âge',
    weight: 'Poids', gender: 'Sexe', male: 'Mâle', female: 'Femelle',
    microchip: 'Micropuce', vaccinations: 'Vaccinations',
    isLost: 'Perdu', markAsLost: 'Signaler perdu', markAsFound: 'Retrouvé',
    color: 'Couleur', addModal: 'Ajouter un animal', save: 'Enregistrer', saving: 'Enregistrement...',
    added: 'ajouté!', addError: "Erreur lors de l'ajout", years: 'ans',
  },
  bookings: {
    title: 'Mes Réservations', upcoming: 'À venir', past: 'Passées', all: 'Toutes',
    noBookings: 'Pas de réservations', noBookingsDesc: 'Faites votre première réservation',
    cancel: 'Annuler', cancelled: 'Réservation annulée',
    rate: 'Évaluer', submitReview: 'Soumettre', reviewSubmitted: 'Avis soumis!',
    status: { pending: 'En attente', confirmed: 'Confirmé', completed: 'Terminé', cancelled: 'Annulé' },
    minutes: 'minutes',
  },
  profile: {
    title: 'Profil', edit: 'Modifier', save: 'Enregistrer', saving: 'Enregistrement...', cancel: 'Annuler',
    saved: 'Profil enregistré!', bio: 'Bio...', phone: 'Téléphone', city: 'Ville', website: 'Site web',
    loyalty: 'Programme de fidélité', points: 'points',
    tabs: { overview: 'Aperçu', achievements: 'Réalisations', orders: 'Commandes', bookings: 'Réservations' },
    noOrders: 'Pas de commandes', noBookings: 'Pas de réservations',
    stats: { orders: 'Commandes', bookings: 'Réservations', achievements: 'Réalisations', points: 'Points' },
  },
  footer: {
    slogan: 'Best care for the best human\'s friends',
    explore: 'Explorer', support: 'Support', legal: 'Légal',
    contact: 'Contact', faq: 'FAQ', help: 'Aide',
    terms: 'Conditions', privacy: 'Confidentialité', cookies: 'Cookies',
    allRights: 'Tous droits réservés.',
  },
  common: {
    loading: 'Chargement...', error: 'Erreur', save: 'Enregistrer',
    cancel: 'Annuler', delete: 'Supprimer', edit: 'Modifier',
    add: 'Ajouter', close: 'Fermer', search: 'Rechercher',
    filter: 'Filtrer', sort: 'Trier', noResults: 'Aucun résultat',
    viewAll: 'Voir tout', back: 'Retour', next: 'Suivant', previous: 'Précédent',
    confirm: 'Confirmer', yes: 'Oui', no: 'Non', submit: 'Soumettre',
    required: 'Obligatoire', optional: 'Optionnel', success: 'Succès!',
    from: 'depuis', reviews: 'avis', free: 'Gratuit', year: 'ans',
  },
  loyalty: {
    points: 'Points', tier: 'Niveau', bronze: 'Bronze', silver: 'Argent',
    gold: 'Or', platinum: 'Platine', achievements: 'Réalisations',
    rewards: 'Récompenses', redeem: 'Échanger',
  },
  cart: {
    title: 'Panier', empty: 'Votre panier est vide',
    checkout: 'Passer la commande', total: 'Total', added: 'Ajouté au panier!',
  },
  notFound: { title: '404', message: 'Cette page s\'est perdue comme un animal...', home: 'Accueil' },

  orders: {
    title: 'Mes Commandes', orderNumber: 'Commande',
    noOrders: 'Pas de commandes', noOrdersDesc: 'Découvrez nos produits', shop: 'Boutique',
    status: { pending: 'En attente', confirmed: 'Confirmée', shipped: 'Expédiée', delivered: 'Livrée', cancelled: 'Annulée' },
  },
  orderConfirm: {
    title: 'Votre commande est complète!',
    subtitle: 'Merci pour votre commande. Vous recevrez un email de confirmation bientôt.',
    details: 'DÉTAILS DE LA COMMANDE', orderNumber: 'Numéro de commande', total: 'Total', status: 'Statut', confirmed: 'Confirmée',
    myOrders: 'Mes Commandes', continueShopping: 'Continuer les achats',
    steps: { confirmation: 'Confirmation', preparing: 'Préparation', shipping: 'Expédition', delivery: 'Livraison' },
  },
  tracker: {
    title: 'GPS Tracker', realtime: 'Connexion temps réel', offline: 'Hors ligne',
    lostPetAlert: 'Animal perdu!', lostPetMsg: '{{name}} n\'a pas été localisé depuis {{minutes}} minutes',
    locate: 'Localiser', addTracker: 'Ajouter un tracker',
    battery: 'Batterie', signal: 'Signal', signalGood: 'Bon', signalWeak: 'Faible', signalNone: 'Aucun',
    lastUpdate: 'Dernière mise à jour', status: 'Statut', lost: 'Perdu', safe: 'En sécurité',
    now: 'Maintenant', minutesAgo: 'minutes', hoursAgo: 'heures',
    directions: 'Directions', ping: 'Ping', pingSent: 'Notification envoyée au tracker!',
  },
  petsExtra: {
    lostBadge: 'PERDU', deleted: 'Animal supprimé',
  },
  bookingsExtra: {
    newBooking: 'Nouvelle réservation', explore: 'Explorer les services',
    details: 'Détails', service: 'Service',
    reviewTitle: 'Évaluer le service', sending: 'Envoi...',
    commentPlaceholder: 'Commentaires (optionnel)...', cancelConfirm: 'Voulez-vous vraiment annuler?',
  },
  authExtra: {
    requiredTitle: 'Connexion requise',
  },
  notFoundExtra: {
    title: 'Page non trouvée',
    message: 'La page recherchée n\'existe pas ou a été déplacée.',
    home: 'Retour à l\'accueil',
  },
  socialExtra: {
    published: 'Publication créée!', hashtagHint: 'Ajouter hashtag (Entrée)',
    noPostsTitle: 'Pas de publications', noPostsDesc: 'Soyez le premier à partager',
  },
  homeExtra: {
    users: 'Utilisateurs', providers: 'Prestataires', pets: 'Animaux', rating: 'Note',
    aiPowered: 'AI-POWERED', explore: 'Explorer',
  },
  commonExtra: {
    viewAll: 'Tout Voir',
  },

  authExtraLogin: {
    welcomeTitle: 'Bienvenue!',
    welcomeSubtitle: 'Connectez-vous à votre compte',
    welcomeRegisterTitle: 'Créer un compte',
    welcomeRegisterSubtitle: 'Commencez votre expérience GlobiPet',
    loginGoogle: 'Se connecter avec Google',
    loginFacebook: 'Se connecter avec Facebook',
    registerGoogle: "S'inscrire avec Google",
    registerFacebook: "S'inscrire avec Facebook",
    orWithEmail: 'ou avec email',
    email: 'Email',
    password: 'Mot de passe',
    fullName: 'Nom complet',
    confirmPassword: 'Confirmer le mot de passe',
    forgotPassword: 'Mot de passe oublié',
    loggingIn: 'Connexion...',
    registering: 'Inscription...',
    noAccount: "Vous n'avez pas de compte?",
    hasAccount: 'Vous avez déjà un compte?',
    invalidCredentials: 'Identifiants invalides',
    passwordMismatch: 'Les mots de passe ne correspondent pas',
    iAm: 'Je suis',
    rolePetOwner: "Propriétaire d'animal",
    roleProvider: 'Prestataire de services',
    roleBoth: 'Les deux',
    forgotTitle: 'Mot de passe oublié?',
    forgotSubtitle: 'Envoyez-nous votre email et nous vous enverrons un lien de réinitialisation',
    sendReset: 'Envoyer',
    backToLogin: 'Retour à la connexion',
    resetSent: 'Email envoyé!',
    resetTitle: 'Définir un nouveau mot de passe',
    newPassword: 'Nouveau mot de passe',
    resetPassword: 'Réinitialiser le mot de passe',
    passwordReset: 'Mot de passe mis à jour!',
  },
}

// Chinese
const zh: typeof el = {
  nav: {
    home: '首页', shop: '商店', marketplace: '市场',
    services: '服务', telehealth: '远程医疗', social: '社交',
    forum: '论坛', community: '社区', events: '活动',
    myPets: '我的宠物', medicalCenter: '医疗中心',
    petTracker: '追踪器', myBookings: '预约', profile: '个人资料',
    provider: '服务商', providerDashboard: '服务商面板',
    providerTools: '工具', admin: '管理员', login: '登录',
    logout: '退出', breeds: '品种', insurance: '保险',
    aiHealth: 'AI健康', aiEmotion: 'AI情感', aiStoolUrine: 'AI尿液&粪便', passport: '护照', playdates: '玩耍约会', communities: '社区',
  },
  auth: {
    login: '登录', register: '注册', logout: '退出',
    email: '邮箱', password: '密码', forgotPassword: '忘记密码',
    noAccount: '没有账号?', hasAccount: '已有账号?',
    fullName: '全名', loginWith: '使用登录', registerWith: '使用注册',
    orWithEmail: '或使用邮箱', createAccount: '创建账号', welcome: '欢迎回来!',
    signInAccount: '登录您的账号', joinCommunity: '加入我们的社区',
    petOwner: '宠物主人', petOwnerDesc: '我有宠物',
    provider: '服务提供商', providerDesc: '我提供服务',
    accountType: '账号类型',
    acceptTerms: '您接受', terms: '服务条款', and: '和', privacy: '隐私政策',
    minChars: '至少8个字符',
  },
  home: {
    tagline: '希腊#1宠物平台',
    heroTitle: '您的宠物所需的一切',
    heroSubtitle: '服务、商店、远程医疗、追踪器和社区，尽在一个应用。',
    searchPlaceholder: '搜索服务...', cityPlaceholder: '城市...', search: '搜索',
    topProviders: '顶级服务商', allProviders: '全部',
    shop: '商店', shopDesc: '食品、玩具和配件', allProducts: '商店',
    upcomingEvents: '活动', allEvents: '全部',
    aiTitle: '为您的宠物提供智能建议', aiDesc: '个性化营养、健康和健康计划。',
    viewPets: '查看我的宠物', wellnessPlans: '健康计划',
    marketTitle: '宠物市场分析', marketDesc: '趋势和统计数据。',
    explore: '探索', users: '主人', pets: '宠物', rating: '评分', security: '安全',
    socialFeed: '社交动态', socialDesc: '分享时刻',
    marketplaceTitle: '商店', marketplaceDesc: '食品、玩具和配件',
    servicesTitle: '服务', servicesDesc: '兽医、美容和培训',
    eventsTitle: '活动', eventsDesc: '展览和比赛',
    findPet: 'GPS追踪', findPetDesc: '找到您的宠物', aiPowered: 'AI驱动',
  },
  services: {
    title: '服务', subtitle: '为您的宠物找到合适的服务商',
    allServices: '全部', bookNow: '预约', viewReviews: '评价',
    searchPlaceholder: '搜索...', cityPlaceholder: '城市...',
    verified: '已认证', emergency: '紧急服务',
    noResults: '未找到服务', noResultsDesc: '尝试其他筛选条件',
    results: '个结果', homeVisits: '上门服务', yearsExp: '年经验',
    types: {
      veterinary: '兽医', veterinary_clinic: '诊所', grooming: '美容',
      training: '培训', pet_sitting: '寄养', walking: '遛狗',
      boarding: '寄宿', photography: '摄影', pharmacy: '药房',
      adoption: '领养', shelter: '收容所', pet_taxi: '宠物出租车', other: '其他',
    },
  },
  marketplace: {
    title: '商店', subtitle: '食品、玩具、配件等',
    searchPlaceholder: '搜索商品...', noResults: '未找到商品',
    noResultsDesc: '尝试其他搜索词', results: '个结果', addToCart: '购物车', inCategory: '在',
    categories: {
      all: '全部', food: '食品', toys: '玩具', accessories: '配件',
      health: '健康', grooming: '美容', training: '培训', housing: '住所', other: '其他',
    },
    sort: {
      featured: '推荐', price_asc: '价格: 低 → 高',
      price_desc: '价格: 高 → 低', rating: '评分', newest: '最新',
    },
  },
  social: {
    title: '社交动态', newPost: '新帖子',
    postPlaceholder: '分享关于您宠物的内容...',
    publish: '发布', publishing: '发送中...', cancel: '取消',
    hashtagHint: '#标签 (回车)', published: '帖子已发布!',
    noPostsTitle: '暂无帖子', noPostsDesc: '成为第一个分享的人!',
    filters: { all: '全部', following: '关注', trending: '热门' },
  },
  pets: {
    title: '我的宠物', subtitle: '已注册', addPet: '添加', noPets: '暂无宠物',
    noPetsDesc: '添加您的第一只宠物开始使用', addFirst: '添加宠物',
    health: '健康', tracker: '追踪器', wellness: '健康',
    name: '名字', species: '种类', breed: '品种', age: '年龄',
    weight: '体重', gender: '性别', male: '雄性', female: '雌性',
    microchip: '芯片', vaccinations: '疫苗',
    isLost: '走失', markAsLost: '标记为走失', markAsFound: '已找到',
    color: '颜色', addModal: '添加宠物', save: '保存', saving: '保存中...',
    added: '已添加!', addError: '添加错误', years: '岁',
  },
  bookings: {
    title: '我的预约', upcoming: '即将到来', past: '过去', all: '全部',
    noBookings: '暂无预约', noBookingsDesc: '在服务页面进行第一次预约',
    cancel: '取消', cancelled: '预约已取消',
    rate: '评价', submitReview: '提交', reviewSubmitted: '评价已提交!',
    status: { pending: '待处理', confirmed: '已确认', completed: '已完成', cancelled: '已取消' },
    minutes: '分钟',
  },
  profile: {
    title: '个人资料', edit: '编辑', save: '保存', saving: '保存中...', cancel: '取消',
    saved: '资料已保存!', bio: '简介...', phone: '电话', city: '城市', website: '网站',
    loyalty: '会员计划', points: '积分',
    tabs: { overview: '概览', achievements: '成就', orders: '订单', bookings: '预约' },
    noOrders: '暂无订单', noBookings: '暂无预约',
    stats: { orders: '订单', bookings: '预约', achievements: '成就', points: '积分' },
  },
  footer: {
    slogan: 'Best care for the best human\'s friends',
    explore: '探索', support: '支持', legal: '法律',
    contact: '联系', faq: '常见问题', help: '帮助',
    terms: '服务条款', privacy: '隐私政策', cookies: 'Cookies',
    allRights: '版权所有。',
  },
  common: {
    loading: '加载中...', error: '错误', save: '保存',
    cancel: '取消', delete: '删除', edit: '编辑',
    add: '添加', close: '关闭', search: '搜索',
    filter: '筛选', sort: '排序', noResults: '无结果',
    viewAll: '查看全部', back: '返回', next: '下一步', previous: '上一步',
    confirm: '确认', yes: '是', no: '否', submit: '提交',
    required: '必填', optional: '可选', success: '成功!',
    from: '从', reviews: '评价', free: '免费', year: '岁',
  },
  loyalty: {
    points: '积分', tier: '等级', bronze: '铜牌', silver: '银牌',
    gold: '金牌', platinum: '铂金', achievements: '成就',
    rewards: '奖励', redeem: '兑换',
  },
  cart: {
    title: '购物车', empty: '购物车为空',
    checkout: '结账', total: '总计', added: '已添加到购物车!',
  },
  notFound: { title: '404', message: '此页面像宠物一样迷路了...', home: '首页' },

  orders: {
    title: '我的订单', orderNumber: '订单',
    noOrders: '暂无订单', noOrdersDesc: '探索我们的商品', shop: '购物',
    status: { pending: '待处理', confirmed: '已确认', shipped: '已发货', delivered: '已送达', cancelled: '已取消' },
  },
  orderConfirm: {
    title: '您的订单已完成!',
    subtitle: '感谢您的订单。您将很快收到确认邮件。',
    details: '订单详情', orderNumber: '订单号', total: '总计', status: '状态', confirmed: '已确认',
    myOrders: '我的订单', continueShopping: '继续购物',
    steps: { confirmation: '确认', preparing: '准备中', shipping: '运输中', delivery: '送达' },
  },
  tracker: {
    title: 'GPS追踪器', realtime: '实时连接', offline: '离线',
    lostPetAlert: '走失宠物!', lostPetMsg: '{{name}}已经{{minutes}}分钟未被定位',
    locate: '定位', addTracker: '添加追踪器',
    battery: '电池', signal: '信号', signalGood: '良好', signalWeak: '弱', signalNone: '无',
    lastUpdate: '最后更新', status: '状态', lost: '走失', safe: '安全',
    now: '现在', minutesAgo: '分钟前', hoursAgo: '小时前',
    directions: '导航', ping: 'Ping', pingSent: '已向追踪器发送通知!',
  },
  petsExtra: {
    lostBadge: '走失', deleted: '宠物已删除',
  },
  bookingsExtra: {
    newBooking: '新预约', explore: '探索服务',
    details: '详情', service: '服务',
    reviewTitle: '评价服务', sending: '发送中...',
    commentPlaceholder: '评论(可选)...', cancelConfirm: '确定要取消吗?',
  },
  authExtra: {
    requiredTitle: '需要登录',
  },
  notFoundExtra: {
    title: '页面未找到',
    message: '您要查找的页面不存在或已被移动。',
    home: '返回首页',
  },
  socialExtra: {
    published: '帖子已发布!', hashtagHint: '添加标签(按Enter)',
    noPostsTitle: '暂无帖子', noPostsDesc: '成为第一个分享的人',
  },
  homeExtra: {
    users: '用户', providers: '服务商', pets: '宠物', rating: '评分',
    aiPowered: 'AI-POWERED', explore: '探索',
  },
  commonExtra: {
    viewAll: '查看全部',
  },

  authExtraLogin: {
    welcomeTitle: '欢迎回来!',
    welcomeSubtitle: '登录您的帐户',
    welcomeRegisterTitle: '创建帐户',
    welcomeRegisterSubtitle: '开始您的GlobiPet体验',
    loginGoogle: '使用Google登录',
    loginFacebook: '使用Facebook登录',
    registerGoogle: '使用Google注册',
    registerFacebook: '使用Facebook注册',
    orWithEmail: '或使用邮箱',
    email: '邮箱',
    password: '密码',
    fullName: '全名',
    confirmPassword: '确认密码',
    forgotPassword: '忘记密码',
    loggingIn: '登录中...',
    registering: '注册中...',
    noAccount: '没有帐户?',
    hasAccount: '已有帐户?',
    invalidCredentials: '凭据无效',
    passwordMismatch: '密码不匹配',
    iAm: '我是',
    rolePetOwner: '宠物主人',
    roleProvider: '服务提供商',
    roleBoth: '两者都是',
    forgotTitle: '忘记密码?',
    forgotSubtitle: '发送您的邮箱,我们将向您发送重置链接',
    sendReset: '发送',
    backToLogin: '返回登录',
    resetSent: '邮件已发送!',
    resetTitle: '设置新密码',
    newPassword: '新密码',
    resetPassword: '重置密码',
    passwordReset: '密码已更新!',
  },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      el: { translation: el },
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      zh: { translation: zh },
    },
    fallbackLng: 'el',
    defaultNS: 'translation',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

export default i18n
'@
$dir = Split-Path (Join-Path $root "apps\web\src\lib\i18n.ts")
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Content -Path (Join-Path $root "apps\web\src\lib\i18n.ts") -Value $f3 -Encoding UTF8 -NoNewline
Write-Host "OK: apps\web\src\lib\i18n.ts"

$f4 = @'
import { useState, useRef } from 'react'
import { Camera, Upload, X, FlaskConical, AlertTriangle, CheckCircle, Loader2, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { api, uploadFile } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

type SampleType = 'stool' | 'urine'
type Species = 'dog' | 'cat'

interface AnalysisResult {
  sample_type: SampleType
  severity: 'normal' | 'mild' | 'moderate' | 'severe'
  color: string
  consistency?: string
  findings: string[]
  likely_causes: string[]
  context_factors: string[]
  comparison_sources: string[]
  recommendation: string
  vet_urgency: 'routine' | 'within_48h' | 'today' | 'emergency'
  vet_urgency_el: string
  home_care: string[]
  warning_signs: string[]
  disclaimer: string
}

const SEVERITY_CONFIG = {
  normal:   { label: 'Φυσιολογικό',  color: 'text-green-700 bg-green-50 border-green-200',  icon: CheckCircle,    iconColor: 'text-green-500' },
  mild:     { label: 'Ήπιο',          color: 'text-yellow-700 bg-yellow-50 border-yellow-200', icon: Info,          iconColor: 'text-yellow-500' },
  moderate: { label: 'Μέτριο',        color: 'text-orange-700 bg-orange-50 border-orange-200', icon: AlertTriangle, iconColor: 'text-orange-500' },
  severe:   { label: 'Σοβαρό',        color: 'text-red-700 bg-red-50 border-red-200',         icon: AlertTriangle, iconColor: 'text-red-500' },
}

const URGENCY_CONFIG = {
  routine:    { color: 'bg-green-100 text-green-800' },
  within_48h: { color: 'bg-yellow-100 text-yellow-800' },
  today:      { color: 'bg-orange-100 text-orange-800' },
  emergency:  { color: 'bg-red-100 text-red-800' },
}

function renderItem(item: any): string {
  if (item == null) return ''
  if (typeof item === 'string') return item
  if (typeof item === 'object') return Object.values(item).filter(v => typeof v === 'string').join(' — ')
  return String(item)
}

export default function AiStoolUrine() {
  const [sampleType, setSampleType] = useState<SampleType>('stool')
  const [species, setSpecies] = useState<Species>('dog')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [showHistory, setShowHistory] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // History form fields
  const [form, setForm] = useState({
    breed: '',
    age_years: '',
    weight_kg: '',
    is_sterilized: '' as '' | 'true' | 'false',
    ate_from_street: false,
    recent_medications: '',
    diet_change: '',
    last_normal_stool: '',
    symptoms: '',
    additional_notes: '',
  })

  // Load user's pets to pre-fill data
  const { data: pets = [] } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets/my').then(r => r.data?.data ?? []).catch(() => []),
  })

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadFile(file, 'stool-urine')
      setImageUrl(url)
    } catch {
      toast.error('Σφάλμα κατά το ανέβασμα της εικόνας')
    } finally {
      setUploading(false)
    }
  }

  const handlePetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pet = pets.find((p: any) => p.id === e.target.value)
    if (!pet) return
    setSpecies(pet.species === 'cat' ? 'cat' : 'dog')
    setForm(f => ({
      ...f,
      breed: pet.breed || '',
      age_years: pet.age != null ? String(pet.age) : '',
      weight_kg: pet.weight != null ? String(pet.weight) : '',
    }))
  }

  const handleAnalyze = async () => {
    if (!imageUrl) return toast.error('Ανέβασε πρώτα μια φωτογραφία')
    setAnalyzing(true)
    setResult(null)
    try {
      const payload = {
        image_url: imageUrl,
        sample_type: sampleType,
        species,
        breed: form.breed || undefined,
        age_years: form.age_years ? Number(form.age_years) : undefined,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
        is_sterilized: form.is_sterilized === '' ? undefined : form.is_sterilized === 'true',
        ate_from_street: form.ate_from_street || undefined,
        recent_medications: form.recent_medications || undefined,
        diet_change: form.diet_change || undefined,
        last_normal_stool: form.last_normal_stool || undefined,
        symptoms: form.symptoms || undefined,
        additional_notes: form.additional_notes || undefined,
      }
      const res = await api.post('/ai/stool-urine', payload)
      setResult(res.data)
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα ανάλυσης')
    } finally {
      setAnalyzing(false)
    }
  }

  const sev = result ? SEVERITY_CONFIG[result.severity] : null
  const urg = result ? URGENCY_CONFIG[result.vet_urgency] : null

  return (
    <div className="page-container py-8 pb-24 lg:pb-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
          <FlaskConical size={20} className="text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-gray-900 dark:text-white">AI Ανάλυση Ούρων & Περιττωμάτων</h1>
          <p className="text-sm text-gray-500">Ανέβασε φωτογραφία για κτηνιατρική αξιολόγηση με AI</p>
        </div>
      </div>

      {/* Sample type + Species selector */}
      <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Τύπος Δείγματος</p>
          <div className="flex gap-2">
            {([['stool','💩','Περιττώματα'],['urine','💧','Ούρα']] as const).map(([v, em, lb]) => (
              <button key={v} onClick={() => setSampleType(v)}
                className={cn('flex-1 py-2 rounded-xl border text-sm font-medium transition-all', sampleType === v ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400')}>
                {em} {lb}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Είδος</p>
          <div className="flex gap-2">
            {([['dog','🐶','Σκύλος'],['cat','🐱','Γάτα']] as const).map(([v, em, lb]) => (
              <button key={v} onClick={() => setSpecies(v)}
                className={cn('flex-1 py-2 rounded-xl border text-sm font-medium transition-all', species === v ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400')}>
                {em} {lb}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Photo upload */}
      <div className="card p-4 mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Φωτογραφία</p>
        {imageUrl ? (
          <div className="relative">
            <img src={imageUrl} alt="sample" className="w-full max-h-64 object-contain rounded-xl bg-gray-50 dark:bg-gray-800" />
            <button onClick={() => { setImageUrl(null); setResult(null) }}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow flex items-center justify-center hover:bg-red-50">
              <X size={14} className="text-gray-600" />
            </button>
          </div>
        ) : (
          <div onClick={() => fileInputRef.current?.click()}
            className="h-40 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-teal-400 transition-colors">
            {uploading
              ? <Loader2 size={24} className="text-teal-500 animate-spin" />
              : <>
                  <div className="flex gap-3">
                    <Camera size={20} className="text-gray-400" />
                    <Upload size={20} className="text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">Κάνε κλικ για φωτογραφία ή ανέβασμα</p>
                  <p className="text-xs text-gray-400">Τράβηξε από κοντά, με καλό φωτισμό</p>
                </>}
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
      </div>

      {/* History form */}
      <div className="card mb-4 overflow-hidden">
        <button onClick={() => setShowHistory(h => !h)}
          className="w-full flex items-center justify-between p-4 text-left">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Ιστορικό Ζώου</p>
            <p className="text-xs text-gray-500 mt-0.5">Προαιρετικό αλλά βελτιώνει σημαντικά την ανάλυση</p>
          </div>
          {showHistory ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>

        {showHistory && (
          <div className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-gray-800 pt-4">

            {/* Pre-fill from pets */}
            {pets.length > 0 && (
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Συμπλήρωση από υπάρχον κατοικίδιο</label>
                <select onChange={handlePetSelect} defaultValue=""
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400">
                  <option value="">— Επίλεξε κατοικίδιο —</option>
                  {pets.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.species})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Ράτσα</label>
                <input value={form.breed} onChange={e => setForm(f => ({...f, breed: e.target.value}))}
                  placeholder="π.χ. Labrador" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Ηλικία (έτη)</label>
                <input type="number" min="0" max="25" value={form.age_years} onChange={e => setForm(f => ({...f, age_years: e.target.value}))}
                  placeholder="π.χ. 4" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Βάρος (kg)</label>
                <input type="number" min="0" value={form.weight_kg} onChange={e => setForm(f => ({...f, weight_kg: e.target.value}))}
                  placeholder="π.χ. 12" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Στείρωση</label>
                <select value={form.is_sterilized} onChange={e => setForm(f => ({...f, is_sterilized: e.target.value as any}))}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400">
                  <option value="">Άγνωστο</option>
                  <option value="true">Ναι, στειρωμένο</option>
                  <option value="false">Όχι</option>
                </select>
              </div>
            </div>

            {/* Boolean: ate from street */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.ate_from_street} onChange={e => setForm(f => ({...f, ate_from_street: e.target.checked}))}
                className="w-4 h-4 rounded accent-teal-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Έφαγε κάτι από τον δρόμο ή άγνωστη τροφή πρόσφατα</span>
            </label>

            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Πρόσφατα φάρμακα / αντιπαρασιτικά</label>
              <input value={form.recent_medications} onChange={e => setForm(f => ({...f, recent_medications: e.target.value}))}
                placeholder="π.χ. Nexgard πριν 3 μέρες" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400" />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Πρόσφατη αλλαγή διατροφής</label>
              <input value={form.diet_change} onChange={e => setForm(f => ({...f, diet_change: e.target.value}))}
                placeholder="π.χ. άλλαξα σε Royal Canin πριν 5 μέρες" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400" />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Πότε ήταν τα τελευταία φυσιολογικά περιττώματα;</label>
              <input value={form.last_normal_stool} onChange={e => setForm(f => ({...f, last_normal_stool: e.target.value}))}
                placeholder="π.χ. χθες το πρωί" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400" />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Άλλα συμπτώματα που παρατήρησες</label>
              <textarea value={form.symptoms} onChange={e => setForm(f => ({...f, symptoms: e.target.value}))}
                placeholder="π.χ. λήθαργος, εμετός, αρνείται φαγητό, πολυδιψία..." rows={2}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Επιπλέον πληροφορίες</label>
              <textarea value={form.additional_notes} onChange={e => setForm(f => ({...f, additional_notes: e.target.value}))}
                placeholder="π.χ. πρόσφατα ταξίδι, επαφή με άλλα ζώα, stress..." rows={2}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      <button onClick={handleAnalyze} disabled={!imageUrl || analyzing}
        className="w-full btn-primary py-3 flex items-center justify-center gap-2 mb-8 disabled:opacity-50">
        {analyzing
          ? <><Loader2 size={18} className="animate-spin" /> Ανάλυση σε εξέλιξη...</>
          : <><FlaskConical size={18} /> Ανάλυση με AI</>}
      </button>

      {/* Result */}
      {result && sev && urg && (
        <div className="space-y-4">
          {/* Severity badge */}
          <div className={cn('card p-5 border flex items-start gap-4', sev.color)}>
            <sev.icon size={22} className={cn('shrink-0 mt-0.5', sev.iconColor)} />
            <div>
              <p className="font-bold text-lg">{sev.label}</p>
              <p className="text-sm mt-1">{result.recommendation}</p>
            </div>
          </div>

          {/* Urgency + summary */}
          <div className="card p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Επείγον</p>
              <span className={cn('inline-block px-3 py-1 rounded-full text-xs font-bold', urg.color)}>{result.vet_urgency_el}</span>
            </div>
            {result.color && (
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Χρώμα</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{result.color}</p>
              </div>
            )}
            {result.consistency && (
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Σύσταση</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{result.consistency}</p>
              </div>
            )}
          </div>

          {/* Findings */}
          {result.findings?.length > 0 && (
            <div className="card p-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">🔍 Ευρήματα</p>
              <ul className="space-y-1.5">
                {result.findings.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-teal-500 mt-0.5 shrink-0">•</span>{renderItem(f)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Likely causes */}
          {result.likely_causes?.length > 0 && (
            <div className="card p-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">💡 Πιθανές Αιτίες</p>
              <ul className="space-y-1.5">
                {result.likely_causes.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-orange-400 mt-0.5 shrink-0">•</span>{renderItem(c)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Context factors */}
          {result.context_factors?.length > 0 && (
            <div className="card p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3">📋 Επίδραση Ιστορικού</p>
              <ul className="space-y-1.5">
                {result.context_factors.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-300">
                    <span className="mt-0.5 shrink-0">•</span>{renderItem(c)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Home care */}
          {result.home_care?.length > 0 && (
            <div className="card p-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">🏠 Τι Κάνεις στο Σπίτι</p>
              <ul className="space-y-1.5">
                {result.home_care.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-green-500 mt-0.5 shrink-0">✓</span>{renderItem(h)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warning signs */}
          {result.warning_signs?.length > 0 && (
            <div className="card p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3">⚠️ Πήγαινε Αμέσως σε Κτηνίατρο Αν...</p>
              <ul className="space-y-1.5">
                {result.warning_signs.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                    <span className="mt-0.5 shrink-0">•</span>{renderItem(w)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sources */}
          {result.comparison_sources?.length > 0 && (
            <div className="card p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Πηγές Αναφοράς</p>
              <ul className="space-y-1">
                {result.comparison_sources.map((s, i) => (
                  <li key={i} className="text-xs text-gray-400">{renderItem(s)}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-xs text-gray-400 text-center px-4 pb-4">{result.disclaimer}</p>
        </div>
      )}
    </div>
  )
}
'@
$dir = Split-Path (Join-Path $root "apps\web\src\pages\AiStoolUrine.tsx")
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Content -Path (Join-Path $root "apps\web\src\pages\AiStoolUrine.tsx") -Value $f4 -Encoding UTF8 -NoNewline
Write-Host "OK: apps\web\src\pages\AiStoolUrine.tsx"

$f5 = @'
import type { FastifyPluginAsync } from 'fastify'
import Anthropic from '@anthropic-ai/sdk'

const aiRoutes: FastifyPluginAsync = async (app) => {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // Extract the final text block from a response that may include web_search tool blocks
  function extractFinalText(content: any[]): string {
    const textBlocks = content.filter((b: any) => b.type === 'text').map((b: any) => b.text)
    return textBlocks[textBlocks.length - 1] || ''
  }

  function parseJsonResponse(text: string) {
    const cleaned = text.replace(/```json|```/g, '').trim()
    // Claude sometimes adds a short lead-in/trailing note after using tools — extract just the {...} block
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
      throw new Error('Δεν βρέθηκε έγκυρο JSON στην απάντηση του AI')
    }
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1))
  }

  const webSearchTool = { type: 'web_search_20250305' as const, name: 'web_search' as const }

  // Pet Health Analysis — now compares against public veterinary reference data via web search
  app.post('/pet-health', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { image_url, analysis_type, breed, species } = req.body as { image_url: string; analysis_type: 'skin' | 'eye'; breed?: string; species?: string }
    if (!image_url || !analysis_type) return reply.code(400).send({ message: 'Απαιτούνται image_url και analysis_type' })

    // The /upload endpoint falls back to a base64 data: URI when no storage (R2) is configured.
    // Claude's "url" image source can't fetch data: URIs — convert those to a base64 image block instead.
    const dataUrlMatch = image_url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
    const imageContent = dataUrlMatch
      ? { type: 'image' as const, source: { type: 'base64' as const, media_type: dataUrlMatch[1] as any, data: dataUrlMatch[2] } }
      : { type: 'image' as const, source: { type: 'url' as const, url: image_url } }

    const systemPrompt = analysis_type === 'skin'
      ? `Είσαι κτηνιατρικός βοηθός AI εξειδικευμένος στη δερματολογία ζώων συντροφιάς. Όταν χρειάζεται, αναζητάς στο διαδίκτυο αξιόπιστες κτηνιατρικές πηγές (π.χ. veterinary partner, merck vet manual, pet health sites) για να συγκρίνεις τα ευρήματα με γνωστές παθήσεις/φυσιολογικά πρότυπα της ράτσας. Πάντα απαντάς σε JSON και ΜΟΝΟ JSON στο τελικό σου μήνυμα, χωρίς markdown.`
      : `Είσαι κτηνιατρικός βοηθός AI εξειδικευμένος στην οφθαλμολογία ζώων συντροφιάς. Όταν χρειάζεται, αναζητάς στο διαδίκτυο αξιόπιστες κτηνιατρικές πηγές για να συγκρίνεις τα ευρήματα με γνωστές παθήσεις/φυσιολογικά πρότυπα της ράτσας. Πάντα απαντάς σε JSON και ΜΟΝΟ JSON στο τελικό σου μήνυμα, χωρίς markdown.`

    const userPrompt = `Ανάλυσε αυτή τη φωτογραφία ${analysis_type === 'skin' ? 'δέρματος' : 'ματιού'} κατοικίδιου ζώου${breed ? ` (ράτσα: ${breed})` : ''}${species ? ` (είδος: ${species})` : ''}.
Αν χρειάζεται, ψάξε στο διαδίκτυο για να συγκρίνεις τα ευρήματα με δημόσιες κτηνιατρικές πηγές σχετικά με συνήθεις παθήσεις αυτής της ράτσας/είδους.
Επέστρεψε ΜΟΝΟ JSON ως τελική απάντηση. Τα "findings" και "conditions" πρέπει να είναι arrays από ΑΠΛΑ strings (όχι objects):
{"severity":"low"|"medium"|"high","findings":["..."],"conditions":["..."],"comparison_sources":["σύντομη αναφορά πηγής 1","σύντομη αναφορά πηγής 2"],"recommendation":"","urgency":"","disclaimer":"Αυτή η ανάλυση είναι ενδεικτική και δεν υποκαθιστά την επίσκεψη σε κτηνίατρο."}`

    try {
      const response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 1536,
        system: systemPrompt,
        tools: [webSearchTool],
        messages: [{ role: 'user', content: [imageContent, { type: 'text', text: userPrompt }] }]
      })
      const text = extractFinalText(response.content as any[])
      return parseJsonResponse(text)
    } catch (err: any) {
      console.error('AI health error:', err)
      return reply.code(500).send({ message: 'Σφάλμα ανάλυσης: ' + err.message })
    }
  })

  // Pet Emotion Analysis - single frame (image URL or base64)
  app.post('/emotion', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { image_url, image_base64, media_type, species, context } = req.body as any

    if (!image_url && !image_base64) return reply.code(400).send({ message: 'Απαιτείται εικόνα' })

    const systemPrompt = `Είσαι ειδικός AI στη συναισθηματική νοημοσύνη ζώων συντροφιάς.
Αναλύεις εικόνες/frames βίντεο κατοικίδιων ζώων και αξιολογείς:
- Συναισθηματική κατάσταση (happy, calm, anxious, fearful, excited, playful, tired, stressed, neutral)
- Γλώσσα σώματος (στάση, αυτιά, ουρά, μάτια, στόμα)
- Επίπεδο ενέργειας (1-10)
- Συμβουλές για τον ιδιοκτήτη
Όταν χρειάζεται, μπορείς να αναζητήσεις στο διαδίκτυο δημόσιες πηγές για συμπεριφορά της ράτσας/είδους ώστε η σύγκριση να είναι πιο ακριβής.
Απαντάς ΜΟΝΟ σε JSON στο τελικό σου μήνυμα, χωρίς markdown.`

    const userPrompt = `Ανάλυσε τη συναισθηματική κατάσταση ${species ? `του ${species}` : 'του κατοικίδιου'} σε αυτή την εικόνα.
${context ? `Πλαίσιο: ${context}` : ''}

Επέστρεψε ΜΟΝΟ JSON:
{
  "emotion": "happy|calm|anxious|fearful|excited|playful|tired|stressed|neutral",
  "emotion_el": "χαρούμενο|ήρεμο|ανήσυχο|φοβισμένο|ενθουσιασμένο|παιχνιδιάρικο|κουρασμένο|αγχωμένο|ουδέτερο",
  "confidence": 0.0-1.0,
  "energy_level": 1-10,
  "body_language": {
    "posture": "περιγραφή στάσης",
    "ears": "περιγραφή αυτιών",
    "tail": "περιγραφή ουράς",
    "eyes": "περιγραφή ματιών",
    "mouth": "περιγραφή στόματος"
  },
  "observations": ["παρατήρηση 1", "παρατήρηση 2"],
  "advice": "συμβουλή για τον ιδιοκτήτη",
  "welfare_score": 1-10
}`

    try {
      const imageContent = image_base64
        ? { type: 'image' as const, source: { type: 'base64' as const, media_type: media_type || 'image/jpeg', data: image_base64 } }
        : { type: 'image' as const, source: { type: 'url' as const, url: image_url } }

      const response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 1536,
        system: systemPrompt,
        tools: [webSearchTool],
        messages: [{ role: 'user', content: [imageContent, { type: 'text', text: userPrompt }] }]
      })
      const text = extractFinalText(response.content as any[])
      return parseJsonResponse(text)
    } catch (err: any) {
      console.error('AI emotion error:', err)
      return reply.code(500).send({ message: 'Σφάλμα ανάλυσης: ' + err.message })
    }
  })

  // Pet Emotion - analyze uploaded video frames (multiple frames)
  app.post('/emotion/video', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { frames, species, duration_seconds } = req.body as any
    // frames: array of base64 strings (extracted from video on frontend)
    if (!frames || !Array.isArray(frames) || frames.length === 0) return reply.code(400).send({ message: 'Απαιτούνται frames' })

    const systemPrompt = `Είσαι ειδικός AI στη συναισθηματική νοημοσύνη ζώων. Αναλύεις πολλαπλά frames βίντεο για να αξιολογήσεις τη συνολική συναισθηματική κατάσταση. Όταν χρειάζεται, αναζητάς στο διαδίκτυο δημόσιες πηγές για συμπεριφορά της ράτσας/είδους. Απαντάς ΜΟΝΟ JSON στο τελικό σου μήνυμα.`

    // Αναλύουμε έως 5 frames
    const framesToAnalyze = frames.slice(0, 5)

    const imageContents = framesToAnalyze.map((f: string) => ({
      type: 'image' as const,
      source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data: f }
    }))

    const userPrompt = `Αυτά είναι ${framesToAnalyze.length} frames από βίντεο διάρκειας ${duration_seconds || '?'} δευτερολέπτων ${species ? `ενός ${species}` : 'ενός κατοικίδιου'}.
Ανάλυσε τη συναισθηματική κατάσταση συνολικά.

Επέστρεψε ΜΟΝΟ JSON:
{
  "overall_emotion": "happy|calm|anxious|fearful|excited|playful|tired|stressed|neutral",
  "overall_emotion_el": "ελληνική μετάφραση",
  "confidence": 0.0-1.0,
  "energy_level": 1-10,
  "welfare_score": 1-10,
  "emotion_timeline": [{"frame": 1, "emotion": "...", "note": "..."}],
  "key_observations": ["παρατήρηση 1", "παρατήρηση 2", "παρατήρηση 3"],
  "body_language_summary": "σύνοψη γλώσσας σώματος",
  "advice": "συμβουλές για τον ιδιοκτήτη",
  "needs_attention": true|false,
  "attention_reason": "αιτία αν needs_attention=true"
}`

    try {
      const response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 2048,
        system: systemPrompt,
        tools: [webSearchTool],
        messages: [{ role: 'user', content: [...imageContents, { type: 'text', text: userPrompt }] }]
      })
      const text = extractFinalText(response.content as any[])
      return parseJsonResponse(text)
    } catch (err: any) {
      console.error('AI emotion video error:', err)
      return reply.code(500).send({ message: 'Σφάλμα ανάλυσης: ' + err.message })
    }
  })
  // Stool & Urine Analysis
  app.post('/stool-urine', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const {
      image_url,
      sample_type,   // 'stool' | 'urine'
      species,       // 'dog' | 'cat'
      breed,
      age_years,
      weight_kg,
      is_sterilized,
      ate_from_street,
      recent_medications,
      diet_change,
      last_normal_stool,
      symptoms,      // free text
      additional_notes,
    } = req.body as any

    if (!image_url || !sample_type || !species) {
      return reply.code(400).send({ message: 'Απαιτούνται image_url, sample_type, species' })
    }

    const dataUrlMatch = image_url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
    const imageContent = dataUrlMatch
      ? { type: 'image' as const, source: { type: 'base64' as const, media_type: dataUrlMatch[1] as any, data: dataUrlMatch[2] } }
      : { type: 'image' as const, source: { type: 'url' as const, url: image_url } }

    const sampleEl = sample_type === 'stool' ? 'περιττώματα' : 'ούρα'
    const speciesEl = species === 'dog' ? 'σκύλου' : 'γάτας'

    const contextParts = [
      `Είδος: ${speciesEl}`,
      breed ? `Ράτσα: ${breed}` : null,
      age_years != null ? `Ηλικία: ${age_years} έτη` : null,
      weight_kg != null ? `Βάρος: ${weight_kg} kg` : null,
      is_sterilized != null ? `Στείρωση: ${is_sterilized ? 'Ναι' : 'Όχι'}` : null,
      ate_from_street ? `Έφαγε κάτι από τον δρόμο πρόσφατα: Ναι` : null,
      recent_medications ? `Πρόσφατα φάρμακα/αντιπαρασιτικά: ${recent_medications}` : null,
      diet_change ? `Αλλαγή διατροφής: ${diet_change}` : null,
      last_normal_stool ? `Τελευταία φυσιολογικά περιττώματα: ${last_normal_stool}` : null,
      symptoms ? `Συμπτώματα που παρατηρήθηκαν: ${symptoms}` : null,
      additional_notes ? `Επιπλέον σημειώσεις: ${additional_notes}` : null,
    ].filter(Boolean).join('\n')

    const systemPrompt = `Είσαι κτηνιατρικός βοηθός AI εξειδικευμένος στη γαστρεντερολογία και ουρολογία ζώων συντροφιάς.
Αναλύεις φωτογραφίες περιττωμάτων και ούρων σκύλων και γατών λαμβάνοντας υπόψη το ιστορικό του ζώου.
Όταν χρειάζεται, αναζητάς σε αξιόπιστες κτηνιατρικές πηγές (Merck Vet Manual, VCA Hospitals, PetMD, WSAVA guidelines) για να συγκρίνεις τα ευρήματα.
Απαντάς ΜΟΝΟ σε JSON και ΜΟΝΟ JSON στο τελικό σου μήνυμα, χωρίς markdown backticks.`

    const userPrompt = `Ανάλυσε αυτή τη φωτογραφία ${sampleEl} ${speciesEl}.

ΙΣΤΟΡΙΚΟ ΖΩΟΥ:
${contextParts}

Λάβε υπόψη όλο το ιστορικό κατά την ανάλυση (π.χ. αν έφαγε από τον δρόμο, αν είναι στείρο, αλλαγές διατροφής, φάρμακα).
Αν χρειάζεται, ψάξε σε κτηνιατρικές πηγές για συχνές αιτίες και φυσιολογικό εύρος για αυτό το είδος/ράτσα/ηλικία.

Επέστρεψε ΜΟΝΟ JSON με αυτή τη δομή:
{
  "sample_type": "${sample_type}",
  "severity": "normal"|"mild"|"moderate"|"severe",
  "color": "χρώμα δείγματος",
  "consistency": "σύσταση (μόνο για περιττώματα)",
  "findings": ["εύρημα 1 ως plain string", "εύρημα 2 ως plain string"],
  "likely_causes": ["πιθανή αιτία 1", "πιθανή αιτία 2"],
  "context_factors": ["πώς επηρεάζει το ιστορικό τα ευρήματα"],
  "comparison_sources": ["σύντομη αναφορά πηγής"],
  "recommendation": "σαφής σύσταση για τον ιδιοκτήτη",
  "vet_urgency": "routine"|"within_48h"|"today"|"emergency",
  "vet_urgency_el": "Τακτικό ραντεβού"|"Εντός 48 ωρών"|"Σήμερα"|"Άμεσα / Έκτακτο",
  "home_care": ["τι μπορεί να κάνει ο ιδιοκτήτης στο σπίτι"],
  "warning_signs": ["συμπτώματα που να οδηγούν αμέσως σε κτηνίατρο"],
  "disclaimer": "Αυτή η ανάλυση είναι ενδεικτική και δεν υποκαθιστά την εξέταση από κτηνίατρο."
}`

    try {
      const response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 2048,
        system: systemPrompt,
        tools: [webSearchTool],
        messages: [{ role: 'user', content: [imageContent, { type: 'text', text: userPrompt }] }]
      })
      const text = extractFinalText(response.content as any[])
      return parseJsonResponse(text)
    } catch (err: any) {
      console.error('AI stool/urine error:', err)
      return reply.code(500).send({ message: 'Σφάλμα ανάλυσης: ' + err.message })
    }
  })
}

export default aiRoutes
'@
$dir = Split-Path (Join-Path $root "apps\backend\src\routes\ai.ts")
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Content -Path (Join-Path $root "apps\backend\src\routes\ai.ts") -Value $f5 -Encoding UTF8 -NoNewline
Write-Host "OK: apps\backend\src\routes\ai.ts"

Write-Host "Done - 5 files."