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