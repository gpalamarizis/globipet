import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import toast from 'react-hot-toast'
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
import AiFeatureGuard from '@/components/guards/AiFeatureGuard'
import CookieBanner from '@/components/CookieBanner'

const Home              = lazy(() => import('@/pages/Home'))
const Social            = lazy(() => import('@/pages/Social'))
const Marketplace       = lazy(() => import('@/pages/Marketplace'))
const ProductDetail     = lazy(() => import('@/pages/ProductDetail'))
const Services          = lazy(() => import('@/pages/Services'))
const ServiceDetail     = lazy(() => import('@/pages/ServiceDetail'))
const AiPetHealth       = lazy(() => import('@/pages/AiPetHealth'))
const AiEmotion         = lazy(() => import('@/pages/AiEmotion'))
const AiStoolUrine      = lazy(() => import('@/pages/AiStoolUrine'))
const PetLegal          = lazy(() => import('@/pages/PetLegal'))
const PetPassport       = lazy(() => import('@/pages/PetPassport'))
const Playdates         = lazy(() => import('@/pages/Playdates'))
const Communities       = lazy(() => import('@/pages/Communities'))
const Telehealth        = lazy(() => import('@/pages/Telehealth'))
const TelehealthConfirmation = lazy(() => import('@/pages/TelehealthConfirmation'))
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
const ProviderStaffPage = lazy(() => import('@/pages/provider/ProviderStaffPage'))
const AdminDashboard    = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminCatalogPage  = lazy(() => import('@/pages/admin/AdminCatalogPage'))
const AdminServicesPage = lazy(() => import('@/pages/admin/AdminServicesPage'))
const AdminPackagesPage = lazy(() => import('@/pages/admin/AdminPackagesPage'))
const AdminSubscriptionsPage = lazy(() => import('@/pages/admin/AdminSubscriptionsPage'))
const AdminAiPlansPage    = lazy(() => import('@/pages/admin/AdminAiPlansPage'))
const TrialPage           = lazy(() => import('@/pages/TrialPage'))
const PricingPage         = lazy(() => import('@/pages/PricingPage'))
const PrivacyPolicyPage   = lazy(() => import('@/pages/PrivacyPolicyPage'))
const TermsOfServicePage  = lazy(() => import('@/pages/TermsOfServicePage'))
const CookiePreferencesPage = lazy(() => import('@/pages/CookiePreferencesPage'))
const AdminCommissionsPage = lazy(() => import('@/pages/admin/AdminCommissionsPage'))
const InboxPage = lazy(() => import('@/pages/InboxPage'))
const AdminMessagesPage    = lazy(() => import('@/pages/admin/AdminMessagesPage'))
const AdminContentPage     = lazy(() => import('@/pages/admin/AdminContentPage'))
const AdminAuditLogPage    = lazy(() => import('@/pages/admin/AdminAuditLogPage'))
const AdminGovernancePage  = lazy(() => import('@/pages/admin/AdminGovernancePage'))
const ProductSubscribe  = lazy(() => import('@/pages/ProductSubscribe'))
const NotFound          = lazy(() => import('@/pages/NotFound'))
const AboutPage         = lazy(() => import('@/pages/AboutPage'))
const HelpPage          = lazy(() => import('@/pages/HelpPage'))
const FaqPage           = lazy(() => import('@/pages/FaqPage'))
const ContactPage       = lazy(() => import('@/pages/ContactPage'))
const LegalPage         = lazy(() => import('@/pages/LegalPage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1, refetchOnWindowFocus: false },
    mutations: {
      /**
       * Last-resort failure notice for writes.
       *
       * A third of the mutations in the app had no onError of their own, so a
       * failed save or delete did nothing visible at all — the user pressed
       * delete, the row stayed, and nothing explained why. This default fires
       * only for those; any mutation that defines its own onError overrides
       * it and this never runs.
       *
       * 401 is excluded because the api interceptor already redirects to the
       * login page, and a toast on the way out is just noise.
       */
      onError: (err: any) => {
        if (err?.statusCode === 401) return
        toast.error(err?.message || err?.response?.data?.message || 'Η ενέργεια απέτυχε')
      },
    },
  },
})

/**
 * OAuth callback processor.
 *
 * After Google/Facebook login the backend redirects to:
 *   https://globipet.com/?token=<jwt>&user=<url-encoded-json>
 *
 * WHY MODULE-LEVEL + HARD RELOAD
 *   Two things had to be true for the first paint to show the logged-in
 *   state: (1) the auth store had to see the user before rendering, and
 *   (2) the render itself had to be a fresh one. useEffect and setAuth
 *   satisfied neither in practice. This version:
 *     - Runs at import time (before any React code executes)
 *     - Writes directly to localStorage in the exact shape Zustand's
 *       `persist` middleware expects (key `globipet-auth`)
 *     - Then hard-navigates to the clean URL via location.replace(), so
 *       the entire app boots from scratch with the store hydrating from
 *       the freshly-written localStorage entry
 *
 *   The hard reload is instant (no network round-trip since the SPA is
 *   already cached) and eliminates every edge case around React lifecycle
 *   timing, Cloudflare cache of a stale bundle, etc.
 */
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  const userStr = params.get('user')
  if (token && userStr) {
    try {
      const user = JSON.parse(decodeURIComponent(userStr))
      localStorage.setItem('globipet-auth', JSON.stringify({
        state: { user, token, isAuthenticated: true },
        version: 0,
      }))
    } catch (err) {
      console.error('OAuth callback: bad user payload', err)
    }
    // Strip credentials from the URL and hard-reload so the app boots
    // fresh with the store hydrated from localStorage.
    params.delete('token')
    params.delete('user')
    const search = params.toString()
    const clean = window.location.pathname + (search ? '?' + search : '')
    window.location.replace(clean)
    // location.replace() halts further script execution on this page —
    // the rest of App.tsx will not run until the new page loads.
  }
}

function OAuthHandler() {
  // The work happens above at module scope. This component exists only
  // so <OAuthHandler /> in the JSX below keeps compiling.
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
                <Route path="/about"           element={<AboutPage />} />
                <Route path="/help"            element={<HelpPage />} />
                <Route path="/faq"             element={<FaqPage />} />
                <Route path="/contact"         element={<ContactPage />} />
                <Route path="/terms"           element={<LegalPage variant="terms" />} />
                <Route path="/privacy"         element={<LegalPage variant="privacy" />} />
                <Route path="/cookies"         element={<LegalPage variant="cookies" />} />
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
                <Route path="/ai-health"       element={<PrivateRoute><AiFeatureGuard><AiPetHealth /></AiFeatureGuard></PrivateRoute>} />
                <Route path="/ai-emotion"      element={<PrivateRoute><AiFeatureGuard><AiEmotion /></AiFeatureGuard></PrivateRoute>} />
                <Route path="/ai-stool-urine"  element={<PrivateRoute><AiFeatureGuard><AiStoolUrine /></AiFeatureGuard></PrivateRoute>} />
                <Route path="/trial"           element={<TrialPage />} />
                <Route path="/pricing"         element={<PricingPage />} />
                <Route path="/privacy"         element={<PrivacyPolicyPage />} />
                <Route path="/terms"           element={<TermsOfServicePage />} />
                <Route path="/cookies"         element={<CookiePreferencesPage />} />
                <Route path="/legal"           element={<PetLegal />} />
                <Route path="/passport"        element={<PrivateRoute><PetPassport /></PrivateRoute>} />
                <Route path="/playdates"       element={<PrivateRoute><Playdates /></PrivateRoute>} />
                <Route path="/communities"     element={<PrivateRoute><Communities /></PrivateRoute>} />
                <Route path="/telehealth"      element={<PrivateRoute><Telehealth /></PrivateRoute>} />
                <Route path="/telehealth/:id/confirmation" element={<PrivateRoute><TelehealthConfirmation /></PrivateRoute>} />
                <Route path="/my-pets"         element={<PrivateRoute><MyPets /></PrivateRoute>} />
                <Route path="/my-pets/:id"     element={<PrivateRoute><PetDetail /></PrivateRoute>} />
                <Route path="/medical-center"  element={<PrivateRoute><PetMedicalCenter /></PrivateRoute>} />
                <Route path="/tracker"         element={<PrivateRoute><PetTracker /></PrivateRoute>} />
                <Route path="/bookings"        element={<PrivateRoute><MyBookings /></PrivateRoute>} />
                <Route path="/community"       element={<PrivateRoute><Community /></PrivateRoute>} />
                <Route path="/profile"         element={<PrivateRoute><Profile /></PrivateRoute>} />
                <Route path="/inbox" element={<InboxPage />} />
                <Route path="/wishlist"        element={<PrivateRoute><Wishlist /></PrivateRoute>} />
                <Route path="/checkout"        element={<PrivateRoute><Checkout /></PrivateRoute>} />
                <Route path="/orders"          element={<PrivateRoute><MyOrders /></PrivateRoute>} />
                <Route path="/orders/:id"      element={<PrivateRoute><OrderConfirmation /></PrivateRoute>} />
                {/* Viva redirects here after a card payment — see successUrl in
                    lib/viva.ts. The route did not exist, so a customer who had
                    just been charged landed on the 404 page. */}
                <Route path="/orders/:id/confirmation" element={<PrivateRoute><OrderConfirmation /></PrivateRoute>} />
                <Route path="/market-insights" element={<PrivateRoute><MarketInsights /></PrivateRoute>} />
              </Route>

              <Route element={<ProviderRoute><ProviderLayout /></ProviderRoute>}>
                <Route path="/provider"          element={<ProviderDashboard />} />
                <Route path="/provider/packages" element={<ProviderPackagesPage />} />
                <Route path="/provider/staff"    element={<ProviderStaffPage />} />
                <Route path="/provider/*"        element={<ProviderDashboard />} />
              </Route>

              <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
                <Route path="/admin"               element={<AdminDashboard />} />
                <Route path="/admin/catalog"       element={<AdminCatalogPage />} />
                <Route path="/admin/services"      element={<AdminServicesPage />} />
                <Route path="/admin/packages"      element={<AdminPackagesPage />} />
                <Route path="/admin/subscriptions" element={<AdminSubscriptionsPage />} />
                <Route path="/admin/ai-plans"      element={<AdminAiPlansPage />} />
                <Route path="/admin/commissions"   element={<AdminCommissionsPage />} />
                <Route path="/admin/messages"      element={<AdminMessagesPage />} />
                <Route path="/admin/content"       element={<AdminContentPage />} />
                <Route path="/admin/audit-logs"    element={<AdminAuditLogPage />} />
                <Route path="/admin/governance"    element={<AdminGovernancePage />} />
                <Route path="/admin/*"             element={<AdminDashboard />} />
              </Route>
              <Route path="*"        element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>

        <CookieBanner />
        <Toaster position="top-right" toastOptions={{
          duration: 4000,
          style: { borderRadius: '12px', background: '#1a1a1a', color: '#fff', fontSize: '14px' },
        }} />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </I18nextProvider>
  )
}