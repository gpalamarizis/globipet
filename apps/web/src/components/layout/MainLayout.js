"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MainLayout;
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var react_i18next_1 = require("react-i18next");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
var theme_1 = require("@/store/theme");
var auth_1 = require("@/store/auth");
var react_query_1 = require("@tanstack/react-query");
var api_1 = require("@/lib/api");
var utils_1 = require("@/lib/utils");
var LanguageSelector_1 = require("@/components/ui/LanguageSelector");
var PetQuickWidget_1 = require("@/components/layout/PetQuickWidget");
var CartDrawer_1 = require("@/components/features/marketplace/CartDrawer");
var NotificationsPanel_1 = require("@/components/ui/NotificationsPanel");
var simpleNavItems = [
    { path: '/', labelKey: 'nav.home', icon: lucide_react_1.Home },
    { path: '/social', labelKey: 'nav.social', icon: lucide_react_1.Heart },
    { path: '/marketplace', labelKey: 'nav.shop', icon: lucide_react_1.ShoppingBag },
    { path: '/passport', labelKey: 'nav.passport', icon: lucide_react_1.BookOpen },
];
var servicesDropdown = [
    { path: '/services', labelKey: 'nav.services', icon: lucide_react_1.Scissors, color: 'text-orange-500' },
    { path: '/telehealth', labelKey: 'nav.telehealth', icon: lucide_react_1.Stethoscope, color: 'text-blue-500' },
    { path: '/insurance', labelKey: 'nav.insurance', icon: lucide_react_1.Shield, color: 'text-green-500' },
    { path: '/tracker', labelKey: 'nav.petTracker', icon: lucide_react_1.MapPin, color: 'text-red-500' },
    { path: '/ai-health', labelKey: 'nav.aiHealth', icon: lucide_react_1.Brain, color: 'text-purple-500' },
    { path: '/ai-emotion', labelKey: 'nav.aiEmotion', icon: lucide_react_1.Heart, color: 'text-pink-500' },
    { path: '/legal', labelKey: 'nav.legal', icon: lucide_react_1.Scale, color: 'text-indigo-500' },
];
var communityDropdown = [
    { path: '/playdates', labelKey: 'nav.playdates', icon: lucide_react_1.PawPrint, color: 'text-green-500' },
    { path: '/communities', labelKey: 'nav.communities', icon: lucide_react_1.Building2, color: 'text-purple-500' },
];
// ─── Bottom tab bar items (mobile) ───────────────────────────────
var bottomTabs = [
    { path: '/', labelKey: 'nav.home', icon: lucide_react_1.Home },
    { path: '/social', labelKey: 'nav.social', icon: lucide_react_1.Heart },
    { path: '/marketplace', labelKey: 'nav.shop', icon: lucide_react_1.ShoppingBag },
    { path: '/passport', labelKey: 'nav.passport', icon: lucide_react_1.BookOpen },
];
// ─── Desktop NavDropdown ─────────────────────────────────────────
function NavDropdown(_a) {
    var label = _a.label, Icon = _a.icon, items = _a.items;
    var t = (0, react_i18next_1.useTranslation)().t;
    var location = (0, react_router_dom_1.useLocation)();
    var _b = (0, react_1.useState)(false), open = _b[0], setOpen = _b[1];
    var ref = (0, react_1.useRef)(null);
    var isActive = items.some(function (i) { return location.pathname === i.path; });
    (0, react_1.useEffect)(function () {
        var handler = function (e) {
            if (ref.current && !ref.current.contains(e.target))
                setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return function () { return document.removeEventListener('mousedown', handler); };
    }, []);
    (0, react_1.useEffect)(function () { setOpen(false); }, [location.pathname]);
    return (<div ref={ref} className="relative">
      <button onClick={function () { return setOpen(function (o) { return !o; }); }} aria-haspopup="true" aria-expanded={open} className={(0, utils_1.cn)('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all', isActive || open
            ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-900 dark:text-brand-400'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
        <Icon size={14} aria-hidden="true"/>
        {label}
        <lucide_react_1.ChevronDown size={12} aria-hidden="true" className={(0, utils_1.cn)('transition-transform', open && 'rotate-180')}/>
      </button>
      {open && (<div role="menu" className="absolute top-full left-0 mt-1.5 w-52 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 py-2 z-50">
          {items.map(function (item) { return (<react_router_dom_1.Link key={item.path} to={item.path} onClick={function () { return setOpen(false); }} role="menuitem" aria-current={location.pathname === item.path ? 'page' : undefined} className={(0, utils_1.cn)('flex items-center gap-3 px-4 py-2.5 text-sm transition-colors', location.pathname === item.path
                    ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-900 dark:text-brand-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800')}>
              <item.icon size={16} className={item.color} aria-hidden="true"/>
              {t(item.labelKey)}
            </react_router_dom_1.Link>); })}
        </div>)}
    </div>);
}
// ─── Main Layout ─────────────────────────────────────────────────
function ThemeToggle() {
    var _a = (0, theme_1.useThemeStore)(), theme = _a.theme, toggleTheme = _a.toggleTheme;
    var isDark = theme === 'dark';
    return (<button onClick={toggleTheme} className="btn-ghost p-2.5 relative group" aria-label={isDark ? 'Light mode' : 'Dark mode'} title={isDark ? 'Light mode' : 'Dark mode'}>
      {isDark
            ? <lucide_react_1.Sun size={18} className="text-yellow-400 group-hover:rotate-45 transition-transform duration-300"/>
            : <lucide_react_1.Moon size={18} className="text-gray-600 group-hover:-rotate-12 transition-transform duration-300"/>}
    </button>);
}
function MainLayout() {
    var _a;
    var t = (0, react_i18next_1.useTranslation)().t;
    var location = (0, react_router_dom_1.useLocation)();
    var _b = (0, auth_1.useAuthStore)(), user = _b.user, isAuthenticated = _b.isAuthenticated, logout = _b.logout;
    var _c = (0, react_1.useState)(false), moreOpen = _c[0], setMoreOpen = _c[1];
    var _d = (0, react_1.useState)(false), cartOpen = _d[0], setCartOpen = _d[1];
    var _e = (0, react_1.useState)(false), notifOpen = _e[0], setNotifOpen = _e[1];
    var _f = (0, react_1.useState)(false), userMenuOpen = _f[0], setUserMenuOpen = _f[1];
    var userMenuRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        var handler = function (e) {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target))
                setUserMenuOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return function () { return document.removeEventListener('mousedown', handler); };
    }, []);
    (0, react_1.useEffect)(function () { setUserMenuOpen(false); setMoreOpen(false); }, [location.pathname]);
    // A11Y: close menus on ESC key
    (0, react_1.useEffect)(function () {
        var handler = function (e) {
            if (e.key === 'Escape') {
                setUserMenuOpen(false);
                setMoreOpen(false);
                setNotifOpen(false);
                setCartOpen(false);
            }
        };
        document.addEventListener('keydown', handler);
        return function () { return document.removeEventListener('keydown', handler); };
    }, []);
    var _g = (0, react_query_1.useQuery)({
        queryKey: ['cart'],
        queryFn: function () { return api_1.api.get('/cart').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: isAuthenticated,
    }).data, cartItems = _g === void 0 ? [] : _g;
    var _h = (0, react_query_1.useQuery)({
        queryKey: ['notifications'],
        queryFn: function () { return api_1.api.get('/notifications?unread=true').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: isAuthenticated,
    }).data, notifications = _h === void 0 ? [] : _h;
    return (<div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ── HEADER ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-4">

            {/* Logo — icon only on mobile, full logo on desktop */}
            <react_router_dom_1.Link to="/" className="flex items-center shrink-0">
              <img src="/logo-clean.png" alt="GlobiPet" className="lg:hidden h-9 w-9 object-cover object-left rounded-xl"/>
              <img src="/logo-clean.png" alt="GlobiPet" className="hidden lg:block h-14 w-auto"/>
            </react_router_dom_1.Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-0.5" aria-label="Κύρια πλοήγηση">
              {simpleNavItems.map(function (item) { return (<react_router_dom_1.Link key={item.path} to={item.path} aria-current={location.pathname === item.path ? 'page' : undefined} className={(0, utils_1.cn)('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all', location.pathname === item.path
                ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-900 dark:text-brand-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
                  <item.icon size={14} aria-hidden="true"/>
                  {t(item.labelKey)}
                </react_router_dom_1.Link>); })}
              <NavDropdown label={t('nav.services')} icon={lucide_react_1.Scissors} items={servicesDropdown}/>
              <NavDropdown label={t('nav.community')} icon={lucide_react_1.PawPrint} items={communityDropdown}/>
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-1.5">
              <LanguageSelector_1.default />

              <ThemeToggle />

              <button className="btn-ghost p-2.5 hidden sm:flex" aria-label="Αναζήτηση">
                <lucide_react_1.Search size={18} className="text-gray-500 dark:text-gray-400" aria-hidden="true"/>
              </button>

              {isAuthenticated && (<>
                  <button onClick={function () { return setNotifOpen(!notifOpen); }} className="btn-ghost p-2.5 relative" aria-label={"\u0395\u03B9\u03B4\u03BF\u03C0\u03BF\u03B9\u03AE\u03C3\u03B5\u03B9\u03C2".concat(notifications.length > 0 ? " (".concat(notifications.length, " \u03BC\u03B7 \u03B1\u03BD\u03B1\u03B3\u03BD\u03C9\u03C3\u03BC\u03AD\u03BD\u03B5\u03C2)") : '')} aria-expanded={notifOpen}>
                    <lucide_react_1.Bell size={18} className="text-gray-500" aria-hidden="true"/>
                    {notifications.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true"/>}
                  </button>
                  <button onClick={function () { return setCartOpen(true); }} className="btn-ghost p-2.5 relative" aria-label={"\u039A\u03B1\u03BB\u03AC\u03B8\u03B9".concat(cartItems.length > 0 ? " (".concat(cartItems.length, " \u03B1\u03BD\u03C4\u03B9\u03BA\u03B5\u03AF\u03BC\u03B5\u03BD\u03B1)") : '')}>
                    <lucide_react_1.ShoppingCart size={18} className="text-gray-500" aria-hidden="true"/>
                    {cartItems.length > 0 && (<span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center" aria-hidden="true">
                        {cartItems.length}
                      </span>)}
                  </button>

                  {/* User menu (desktop) */}
                  <div className="hidden lg:block relative" ref={userMenuRef}>
                    <button onClick={function () { return setUserMenuOpen(!userMenuOpen); }} aria-haspopup="true" aria-expanded={userMenuOpen} aria-label="Μενού χρήστη" className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-brand-100 overflow-hidden flex items-center justify-center text-brand-900 font-semibold text-sm shrink-0">
                        {(user === null || user === void 0 ? void 0 : user.profile_photo)
                ? <img src={user.profile_photo} alt="" className="w-full h-full object-cover"/>
                : <span>{(0, utils_1.getInitials)((user === null || user === void 0 ? void 0 : user.full_name) || 'U')}</span>}
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
                        {(_a = user === null || user === void 0 ? void 0 : user.full_name) === null || _a === void 0 ? void 0 : _a.split(' ')[0]}
                      </span>
                      <lucide_react_1.ChevronDown size={14} className="text-gray-400"/>
                    </button>
                    {userMenuOpen && (<div className="absolute right-0 top-full mt-1 w-56 card shadow-modal py-1 z-50">
                        <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{user === null || user === void 0 ? void 0 : user.full_name}</p>
                          <p className="text-xs text-gray-500 truncate">{user === null || user === void 0 ? void 0 : user.email}</p>
                        </div>
                        {[
                    { to: '/profile', icon: lucide_react_1.User, label: t('nav.profile') },
                    { to: '/my-pets', icon: lucide_react_1.PawPrint, label: t('nav.myPets') },
                    { to: '/bookings', icon: lucide_react_1.Calendar, label: t('nav.myBookings') },
                    { to: '/orders', icon: lucide_react_1.ShoppingBag, label: 'Παραγγελίες' },
                    { to: '/telehealth', icon: lucide_react_1.Video, label: t('nav.telehealth') },
                ].map(function (item) { return (<react_router_dom_1.Link key={item.to} to={item.to} onClick={function () { return setUserMenuOpen(false); }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <item.icon size={15} className="text-gray-400"/>
                            {item.label}
                          </react_router_dom_1.Link>); })}
                        {((user === null || user === void 0 ? void 0 : user.role) === 'service_provider' || (user === null || user === void 0 ? void 0 : user.role) === 'admin') && (<react_router_dom_1.Link to="/provider" onClick={function () { return setUserMenuOpen(false); }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-t border-gray-100 dark:border-gray-800 mt-1">
                            <lucide_react_1.Settings size={15} className="text-gray-400"/>
                            {t('nav.providerDashboard')}
                          </react_router_dom_1.Link>)}
                        {(user === null || user === void 0 ? void 0 : user.role) === 'admin' && (<react_router_dom_1.Link to="/admin" onClick={function () { return setUserMenuOpen(false); }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <lucide_react_1.Shield size={15} className="text-gray-400"/>
                            {t('nav.admin')}
                          </react_router_dom_1.Link>)}
                        <div className="border-t border-gray-100 dark:border-gray-800 mt-1">
                          <button onClick={function () { setUserMenuOpen(false); logout(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <lucide_react_1.LogOut size={15}/>
                            {t('nav.logout')}
                          </button>
                        </div>
                      </div>)}
                  </div>
                </>)}

              {!isAuthenticated && (<div className="hidden lg:flex items-center gap-2">
                  <react_router_dom_1.Link to="/login" className="btn-ghost px-4 py-2 text-sm font-medium">{t('nav.login')}</react_router_dom_1.Link>
                  <react_router_dom_1.Link to="/register" className="btn-primary px-4 py-2 text-sm">{t('auth.register')}</react_router_dom_1.Link>
                </div>)}
            </div>
          </div>
        </div>
      </header>

      {/* ── A11Y: Skip to main content ─────────────────────── */}
      <a href="#main-content" className="skip-link">Μετάβαση στο περιεχόμενο</a>

      {/* ── MAIN CONTENT (extra bottom padding on mobile for tab bar) ── */}
      <main id="main-content" className="flex-1 pb-20 lg:pb-0">
        <framer_motion_1.AnimatePresence mode="wait" initial={false}>
          <framer_motion_1.motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
            <react_router_dom_1.Outlet />
          </framer_motion_1.motion.div>
        </framer_motion_1.AnimatePresence>
      </main>

      {/* ── Floating Pet Quick Actions Widget ──────────────────── */}
      <PetQuickWidget_1.default />

      {/* ── FOOTER (desktop only) ──────────────────────────────── */}
      <footer className="hidden lg:block bg-gray-900 text-gray-400 py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 lg:col-span-1">
              <img src="/logo-clean.png" alt="GlobiPet" className="h-14 w-auto mb-3"/>
              <p className="text-sm text-gray-500">{t('footer.slogan')}</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">{t('footer.explore')}</h4>
              <ul className="space-y-2 text-sm">
                {['/services', '/marketplace', '/events', '/breeds'].map(function (path, i) { return (<li key={path}>
                    <react_router_dom_1.Link to={path} className="hover:text-white transition-colors">
                      {[t('nav.services'), t('nav.shop'), t('nav.events'), t('nav.breeds')][i]}
                    </react_router_dom_1.Link>
                  </li>); })}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">{t('footer.support')}</h4>
              <ul className="space-y-2 text-sm">
                <li><react_router_dom_1.Link to="/about" className="hover:text-white transition-colors">{t('footer.aboutUs')}</react_router_dom_1.Link></li>
                <li><react_router_dom_1.Link to="/help" className="hover:text-white transition-colors">{t('footer.help')}</react_router_dom_1.Link></li>
                <li><react_router_dom_1.Link to="/faq" className="hover:text-white transition-colors">{t('footer.faq')}</react_router_dom_1.Link></li>
                <li><react_router_dom_1.Link to="/contact" className="hover:text-white transition-colors">{t('footer.contact')}</react_router_dom_1.Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">{t('footer.legal')}</h4>
              <ul className="space-y-2 text-sm">
                <li><react_router_dom_1.Link to="/terms" className="hover:text-white transition-colors">{t('footer.terms')}</react_router_dom_1.Link></li>
                <li><react_router_dom_1.Link to="/privacy" className="hover:text-white transition-colors">{t('footer.privacy')}</react_router_dom_1.Link></li>
                <li><react_router_dom_1.Link to="/cookies" className="hover:text-white transition-colors">{t('footer.cookies')}</react_router_dom_1.Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-xs text-gray-600">
            © {new Date().getFullYear()} GlobiPet. {t('footer.allRights')}
          </div>
        </div>
      </footer>

      {/* ── MOBILE BOTTOM TAB BAR ─────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 safe-area-bottom" aria-label="Πλοήγηση κινητού">
        <div className="flex items-center justify-around px-2 py-2">
          {bottomTabs.map(function (tab) {
            var isActive = tab.path === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.path);
            return (<react_router_dom_1.Link key={tab.path} to={tab.path} aria-current={isActive ? 'page' : undefined} className={(0, utils_1.cn)('flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all min-w-0', isActive ? 'text-brand-900 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500')}>
                <tab.icon size={22} strokeWidth={isActive ? 2.5 : 1.8} aria-hidden="true"/>
                <span className="text-[10px] font-medium truncate max-w-[56px]">{t(tab.labelKey)}</span>
              </react_router_dom_1.Link>);
        })}
          {/* Περισσότερα */}
          <button onClick={function () { return setMoreOpen(true); }} aria-label="Περισσότερες επιλογές" aria-expanded={moreOpen} className={(0, utils_1.cn)('flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all', moreOpen ? 'text-brand-900 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500')}>
            <lucide_react_1.MoreHorizontal size={22} strokeWidth={1.8} aria-hidden="true"/>
            <span className="text-[10px] font-medium">Περισσότερα</span>
          </button>
        </div>
      </nav>

      {/* ── MOBILE "ΠΕΡΙΣΣΟΤΕΡΑ" FULL DRAWER ─────────────────── */}
      <framer_motion_1.AnimatePresence>
        {moreOpen && (<>
            <framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="lg:hidden fixed inset-0 bg-black/40 z-50" onClick={function () { return setMoreOpen(false); }} aria-hidden="true"/>
            <framer_motion_1.motion.div role="dialog" aria-modal="true" aria-label="Περισσότερες επιλογές" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-gray-900 rounded-t-3xl max-h-[90vh] overflow-y-auto">

              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full"/>
              </div>

              <div className="px-4 pb-8">
                {/* User info (if logged in) */}
                {isAuthenticated && (<div className="flex items-center gap-3 py-4 mb-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="w-12 h-12 rounded-full bg-brand-100 overflow-hidden flex items-center justify-center text-brand-900 font-bold shrink-0">
                      {(user === null || user === void 0 ? void 0 : user.profile_photo)
                    ? <img src={user.profile_photo} alt="" className="w-full h-full object-cover"/>
                    : <span>{(0, utils_1.getInitials)((user === null || user === void 0 ? void 0 : user.full_name) || 'U')}</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{user === null || user === void 0 ? void 0 : user.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{user === null || user === void 0 ? void 0 : user.email}</p>
                    </div>
                  </div>)}

                {/* Υπηρεσίες */}
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-3">Υπηρεσίες</p>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {servicesDropdown.map(function (item) { return (<react_router_dom_1.Link key={item.path} to={item.path} onClick={function () { return setMoreOpen(false); }} className={(0, utils_1.cn)('flex flex-col items-center gap-1.5 p-3 rounded-2xl text-center transition-all', location.pathname === item.path ? 'bg-brand-50 dark:bg-brand-900/20' : 'bg-gray-50 dark:bg-gray-800')}>
                      <item.icon size={22} className={item.color}/>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">{t(item.labelKey)}</span>
                    </react_router_dom_1.Link>); })}
                </div>

                {/* Κοινότητα */}
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Κοινότητα</p>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {communityDropdown.map(function (item) { return (<react_router_dom_1.Link key={item.path} to={item.path} onClick={function () { return setMoreOpen(false); }} className={(0, utils_1.cn)('flex flex-col items-center gap-1.5 p-3 rounded-2xl text-center transition-all', location.pathname === item.path ? 'bg-brand-50 dark:bg-brand-900/20' : 'bg-gray-50 dark:bg-gray-800')}>
                      <item.icon size={22} className={item.color}/>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t(item.labelKey)}</span>
                    </react_router_dom_1.Link>); })}
                </div>

                {/* Λογαριασμός */}
                {isAuthenticated ? (<>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Λογαριασμός</p>
                    <div className="space-y-1">
                      {[
                    { to: '/profile', icon: lucide_react_1.User, label: t('nav.profile') },
                    { to: '/my-pets', icon: lucide_react_1.PawPrint, label: t('nav.myPets') },
                    { to: '/bookings', icon: lucide_react_1.Calendar, label: t('nav.myBookings') },
                    { to: '/orders', icon: lucide_react_1.ShoppingBag, label: 'Παραγγελίες' },
                    { to: '/wishlist', icon: lucide_react_1.Heart, label: 'Wishlist' },
                ].map(function (item) { return (<react_router_dom_1.Link key={item.to} to={item.to} onClick={function () { return setMoreOpen(false); }} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <item.icon size={18} className="text-gray-400 shrink-0"/>
                          {item.label}
                        </react_router_dom_1.Link>); })}
                      {((user === null || user === void 0 ? void 0 : user.role) === 'service_provider' || (user === null || user === void 0 ? void 0 : user.role) === 'admin') && (<react_router_dom_1.Link to="/provider" onClick={function () { return setMoreOpen(false); }} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <lucide_react_1.Settings size={18} className="text-gray-400 shrink-0"/>
                          {t('nav.providerDashboard')}
                        </react_router_dom_1.Link>)}
                      {(user === null || user === void 0 ? void 0 : user.role) === 'admin' && (<react_router_dom_1.Link to="/admin" onClick={function () { return setMoreOpen(false); }} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                          <lucide_react_1.Shield size={18} className="shrink-0"/>
                          {t('nav.admin')}
                        </react_router_dom_1.Link>)}
                      <button onClick={function () { setMoreOpen(false); logout(); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <lucide_react_1.LogOut size={18} className="shrink-0"/>
                        {t('nav.logout')}
                      </button>
                    </div>
                  </>) : (<div className="flex gap-2 mt-4">
                    <react_router_dom_1.Link to="/login" onClick={function () { return setMoreOpen(false); }} className="btn-secondary flex-1 text-center py-3 text-sm">{t('nav.login')}</react_router_dom_1.Link>
                    <react_router_dom_1.Link to="/register" onClick={function () { return setMoreOpen(false); }} className="btn-primary flex-1 text-center py-3 text-sm">{t('auth.register')}</react_router_dom_1.Link>
                  </div>)}
              </div>
            </framer_motion_1.motion.div>
          </>)}
      </framer_motion_1.AnimatePresence>

      {/* ── DRAWERS ────────────────────────────────────────────── */}
      <CartDrawer_1.default open={cartOpen} onClose={function () { return setCartOpen(false); }}/>
      <NotificationsPanel_1.default open={notifOpen} onClose={function () { return setNotifOpen(false); }}/>
    </div>);
}
