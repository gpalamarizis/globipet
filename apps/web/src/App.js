"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var react_query_1 = require("@tanstack/react-query");
var react_query_devtools_1 = require("@tanstack/react-query-devtools");
var react_hot_toast_1 = require("react-hot-toast");
var react_i18next_1 = require("react-i18next");
var i18n_1 = require("@/lib/i18n");
var auth_1 = require("@/store/auth");
var MainLayout_1 = require("@/components/layout/MainLayout");
var AuthLayout_1 = require("@/components/layout/AuthLayout");
var ProviderLayout_1 = require("@/components/layout/ProviderLayout");
var AdminLayout_1 = require("@/components/layout/AdminLayout");
var LoadingScreen_1 = require("@/components/ui/LoadingScreen");
var Home = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/Home'); }); });
var Social = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/Social'); }); });
var Marketplace = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/Marketplace'); }); });
var ProductDetail = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/ProductDetail'); }); });
var Services = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/Services'); }); });
var ServiceDetail = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/ServiceDetail'); }); });
var AiPetHealth = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/AiPetHealth'); }); });
var AiEmotion = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/AiEmotion'); }); });
var AiStoolUrine = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/AiStoolUrine'); }); });
var PetLegal = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/PetLegal'); }); });
var PetPassport = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/PetPassport'); }); });
var Playdates = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/Playdates'); }); });
var Communities = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/Communities'); }); });
var Telehealth = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/Telehealth'); }); });
var TelehealthConfirmation = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/TelehealthConfirmation'); }); });
var Insurance = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/Insurance'); }); });
var MyPets = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/MyPets'); }); });
var PetDetail = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/PetDetail'); }); });
var PetMedicalCenter = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/PetMedicalCenter'); }); });
var PetTracker = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/PetTracker'); }); });
var MyBookings = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/MyBookings'); }); });
var Events = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/Events'); }); });
var EventDetail = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/EventDetail'); }); });
var Community = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/Community'); }); });
var Forum = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/Forum'); }); });
var ForumTopic = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/ForumTopic'); }); });
var BreedExplorer = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/BreedExplorer'); }); });
var BreedDetail = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/BreedDetail'); }); });
var Profile = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/Profile'); }); });
var Wishlist = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/Wishlist'); }); });
var Checkout = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/Checkout'); }); });
var MyOrders = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/MyOrders'); }); });
var OrderConfirmation = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/OrderConfirmation'); }); });
var MarketInsights = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/MarketInsights'); }); });
var Login = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/auth/Login'); }); });
var Register = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/auth/Register'); }); });
var ForgotPassword = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/auth/ForgotPassword'); }); });
var ResetPassword = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/auth/ResetPassword'); }); });
var ProviderDashboard = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/provider/ProviderDashboard'); }); });
var ProviderPackagesPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/provider/ProviderPackagesPage'); }); });
var AdminDashboard = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/admin/AdminDashboard'); }); });
var AdminCatalogPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/admin/AdminCatalogPage'); }); });
var AdminServicesPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/admin/AdminServicesPage'); }); });
var AdminPackagesPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/admin/AdminPackagesPage'); }); });
var AdminSubscriptionsPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/admin/AdminSubscriptionsPage'); }); });
var AdminCommissionsPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/admin/AdminCommissionsPage'); }); });
var AdminMessagesPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/admin/AdminMessagesPage'); }); });
var AdminContentPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/admin/AdminContentPage'); }); });
var ProductSubscribe = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/ProductSubscribe'); }); });
var NotFound = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/NotFound'); }); });
var AboutPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/AboutPage'); }); });
var HelpPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/HelpPage'); }); });
var FaqPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/FaqPage'); }); });
var ContactPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/ContactPage'); }); });
var LegalPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/pages/LegalPage'); }); });
var queryClient = new react_query_1.QueryClient({
    defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1, refetchOnWindowFocus: false } },
});
function OAuthHandler() {
    return null;
}
function PrivateRoute(_a) {
    var children = _a.children;
    var isAuthenticated = (0, auth_1.useAuthStore)().isAuthenticated;
    return isAuthenticated ? <>{children}</> : <react_router_dom_1.Navigate to="/login" replace/>;
}
function ProviderRoute(_a) {
    var children = _a.children;
    var user = (0, auth_1.useAuthStore)().user;
    var canAccess = (user === null || user === void 0 ? void 0 : user.role) === 'service_provider' || (user === null || user === void 0 ? void 0 : user.role) === 'both' || (user === null || user === void 0 ? void 0 : user.role) === 'admin';
    return canAccess ? <>{children}</> : <react_router_dom_1.Navigate to="/" replace/>;
}
function AdminRoute(_a) {
    var children = _a.children;
    var user = (0, auth_1.useAuthStore)().user;
    return (user === null || user === void 0 ? void 0 : user.role) === 'admin' ? <>{children}</> : <react_router_dom_1.Navigate to="/" replace/>;
}
function App() {
    return (<react_i18next_1.I18nextProvider i18n={i18n_1.default}>
      <react_query_1.QueryClientProvider client={queryClient}>
        <react_router_dom_1.BrowserRouter>
          <OAuthHandler />
          <react_1.Suspense fallback={<LoadingScreen_1.default />}>
            <react_router_dom_1.Routes>
              <react_router_dom_1.Route element={<AuthLayout_1.default />}>
                <react_router_dom_1.Route path="/login" element={<Login />}/>
                <react_router_dom_1.Route path="/register" element={<Register />}/>
                <react_router_dom_1.Route path="/forgot-password" element={<ForgotPassword />}/>
                <react_router_dom_1.Route path="/reset-password" element={<ResetPassword />}/>
              </react_router_dom_1.Route>

              <react_router_dom_1.Route element={<MainLayout_1.default />}>
                <react_router_dom_1.Route path="/" element={<Home />}/>
                <react_router_dom_1.Route path="/about" element={<AboutPage />}/>
                <react_router_dom_1.Route path="/help" element={<HelpPage />}/>
                <react_router_dom_1.Route path="/faq" element={<FaqPage />}/>
                <react_router_dom_1.Route path="/contact" element={<ContactPage />}/>
                <react_router_dom_1.Route path="/terms" element={<LegalPage variant="terms"/>}/>
                <react_router_dom_1.Route path="/privacy" element={<LegalPage variant="privacy"/>}/>
                <react_router_dom_1.Route path="/cookies" element={<LegalPage variant="cookies"/>}/>
                <react_router_dom_1.Route path="/social" element={<Social />}/>
                <react_router_dom_1.Route path="/marketplace" element={<Marketplace />}/>
                <react_router_dom_1.Route path="/marketplace/:id" element={<ProductDetail />}/>
                <react_router_dom_1.Route path="/marketplace/:id/subscribe" element={<PrivateRoute><ProductSubscribe /></PrivateRoute>}/>
                <react_router_dom_1.Route path="/services" element={<Services />}/>
                <react_router_dom_1.Route path="/services/:id" element={<ServiceDetail />}/>
                <react_router_dom_1.Route path="/events" element={<Events />}/>
                <react_router_dom_1.Route path="/events/:id" element={<EventDetail />}/>
                <react_router_dom_1.Route path="/breeds" element={<BreedExplorer />}/>
                <react_router_dom_1.Route path="/breeds/:id" element={<BreedDetail />}/>
                <react_router_dom_1.Route path="/forum" element={<Forum />}/>
                <react_router_dom_1.Route path="/forum/:id" element={<ForumTopic />}/>
                <react_router_dom_1.Route path="/insurance" element={<Insurance />}/>
                <react_router_dom_1.Route path="/ai-health" element={<PrivateRoute><AiPetHealth /></PrivateRoute>}/>
                <react_router_dom_1.Route path="/ai-emotion" element={<PrivateRoute><AiEmotion /></PrivateRoute>}/>
                <react_router_dom_1.Route path="/ai-stool-urine" element={<PrivateRoute><AiStoolUrine /></PrivateRoute>}/>
                <react_router_dom_1.Route path="/legal" element={<PetLegal />}/>
                <react_router_dom_1.Route path="/passport" element={<PrivateRoute><PetPassport /></PrivateRoute>}/>
                <react_router_dom_1.Route path="/playdates" element={<PrivateRoute><Playdates /></PrivateRoute>}/>
                <react_router_dom_1.Route path="/communities" element={<PrivateRoute><Communities /></PrivateRoute>}/>
                <react_router_dom_1.Route path="/telehealth" element={<PrivateRoute><Telehealth /></PrivateRoute>}/>
                <react_router_dom_1.Route path="/telehealth/:id/confirmation" element={<PrivateRoute><TelehealthConfirmation /></PrivateRoute>}/>
                <react_router_dom_1.Route path="/my-pets" element={<PrivateRoute><MyPets /></PrivateRoute>}/>
                <react_router_dom_1.Route path="/my-pets/:id" element={<PrivateRoute><PetDetail /></PrivateRoute>}/>
                <react_router_dom_1.Route path="/medical-center" element={<PrivateRoute><PetMedicalCenter /></PrivateRoute>}/>
                <react_router_dom_1.Route path="/tracker" element={<PrivateRoute><PetTracker /></PrivateRoute>}/>
                <react_router_dom_1.Route path="/bookings" element={<PrivateRoute><MyBookings /></PrivateRoute>}/>
                <react_router_dom_1.Route path="/community" element={<PrivateRoute><Community /></PrivateRoute>}/>
                <react_router_dom_1.Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>}/>
                <react_router_dom_1.Route path="/wishlist" element={<PrivateRoute><Wishlist /></PrivateRoute>}/>
                <react_router_dom_1.Route path="/checkout" element={<PrivateRoute><Checkout /></PrivateRoute>}/>
                <react_router_dom_1.Route path="/orders" element={<PrivateRoute><MyOrders /></PrivateRoute>}/>
                <react_router_dom_1.Route path="/orders/:id" element={<PrivateRoute><OrderConfirmation /></PrivateRoute>}/>
                <react_router_dom_1.Route path="/market-insights" element={<PrivateRoute><MarketInsights /></PrivateRoute>}/>
              </react_router_dom_1.Route>

              <react_router_dom_1.Route element={<ProviderRoute><ProviderLayout_1.default /></ProviderRoute>}>
                <react_router_dom_1.Route path="/provider" element={<ProviderDashboard />}/>
                <react_router_dom_1.Route path="/provider/packages" element={<ProviderPackagesPage />}/>
                <react_router_dom_1.Route path="/provider/*" element={<ProviderDashboard />}/>
              </react_router_dom_1.Route>

              <react_router_dom_1.Route element={<AdminRoute><AdminLayout_1.default /></AdminRoute>}>
                <react_router_dom_1.Route path="/admin" element={<AdminDashboard />}/>
                <react_router_dom_1.Route path="/admin/catalog" element={<AdminCatalogPage />}/>
                <react_router_dom_1.Route path="/admin/services" element={<AdminServicesPage />}/>
                <react_router_dom_1.Route path="/admin/packages" element={<AdminPackagesPage />}/>
                <react_router_dom_1.Route path="/admin/subscriptions" element={<AdminSubscriptionsPage />}/>
                <react_router_dom_1.Route path="/admin/commissions" element={<AdminCommissionsPage />}/>
                <react_router_dom_1.Route path="/admin/messages" element={<AdminMessagesPage />}/>
                <react_router_dom_1.Route path="/admin/content" element={<AdminContentPage />}/>
                <react_router_dom_1.Route path="/admin/*" element={<AdminDashboard />}/>
              </react_router_dom_1.Route>
              <react_router_dom_1.Route path="*" element={<NotFound />}/>
            </react_router_dom_1.Routes>
          </react_1.Suspense>
        </react_router_dom_1.BrowserRouter>

        <react_hot_toast_1.Toaster position="top-right" toastOptions={{
            duration: 4000,
            style: { borderRadius: '12px', background: '#1a1a1a', color: '#fff', fontSize: '14px' },
        }}/>
        <react_query_devtools_1.ReactQueryDevtools initialIsOpen={false}/>
      </react_query_1.QueryClientProvider>
    </react_i18next_1.I18nextProvider>);
}
