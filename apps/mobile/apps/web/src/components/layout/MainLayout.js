"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MainLayout;
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var react_i18next_1 = require("react-i18next");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
var auth_1 = require("@/store/auth");
var react_query_1 = require("@tanstack/react-query");
var api_1 = require("@/lib/api");
var utils_1 = require("@/lib/utils");
var LanguageSelector_1 = require("@/components/ui/LanguageSelector");
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
];
var communityDropdown = [
    { path: '/playdates', labelKey: 'nav.playdates', icon: lucide_react_1.PawPrint, color: 'text-green-500' },
    { path: '/communities', labelKey: 'nav.communities', icon: lucide_react_1.Building2, color: 'text-purple-500' },
];
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
      <button onClick={function () { return setOpen(function (o) { return !o; }); }} className={(0, utils_1.cn)('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all', isActive || open
            ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-900 dark:text-brand-400'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
        <Icon size={14}/>
        {label}
        <lucide_react_1.ChevronDown size={12} className={(0, utils_1.cn)('transition-transform', open && 'rotate-180')}/>
      </button>

      {open && (<div className="absolute top-full left-0 mt-1.5 w-52 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 py-2 z-50">
          {items.map(function (item) { return (<react_router_dom_1.Link key={item.path} to={item.path} onClick={function () { return setOpen(false); }} className={(0, utils_1.cn)('flex items-center gap-3 px-4 py-2.5 text-sm transition-colors', location.pathname === item.path
                    ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-900 dark:text-brand-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800')}>
              <item.icon size={16} className={item.color}/>
              {t(item.labelKey)}
            </react_router_dom_1.Link>); })}
        </div>)}
    </div>);
}
function MainLayout() {
    var _a;
    var t = (0, react_i18next_1.useTranslation)().t;
    var location = (0, react_router_dom_1.useLocation)();
    var _b = (0, auth_1.useAuthStore)(), user = _b.user, isAuthenticated = _b.isAuthenticated, logout = _b.logout;
    var _c = (0, react_1.useState)(false), mobileOpen = _c[0], setMobileOpen = _c[1];
    var _d = (0, react_1.useState)(false), cartOpen = _d[0], setCartOpen = _d[1];
    var _e = (0, react_1.useState)(false), notifOpen = _e[0], setNotifOpen = _e[1];
    var _f = (0, react_1.useState)(false), userMenuOpen = _f[0], setUserMenuOpen = _f[1];
    var _g = (0, react_1.useState)(false), mobileServicesOpen = _g[0], setMobileServicesOpen = _g[1];
    var _h = (0, react_1.useState)(false), mobileCommunityOpen = _h[0], setMobileCommunityOpen = _h[1];
    var userMenuRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        var handler = function (e) {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return function () { return document.removeEventListener('mousedown', handler); };
    }, []);
    var _j = (0, react_query_1.useQuery)({
        queryKey: ['cart'],
        queryFn: function () { return api_1.api.get('/cart').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: isAuthenticated,
    }).data, cartItems = _j === void 0 ? [] : _j;
    var _k = (0, react_query_1.useQuery)({
        queryKey: ['notifications'],
        queryFn: function () { return api_1.api.get('/notifications?unread=true').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: isAuthenticated,
    }).data, notifications = _k === void 0 ? [] : _k;
    return (<div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">

            {/* Logo */}
            <react_router_dom_1.Link to="/" className="flex items-center shrink-0">
              <img src="/logo-clean.png" alt="GlobiPet" className="h-16 w-auto"/>
            </react_router_dom_1.Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {simpleNavItems.map(function (item) { return (<react_router_dom_1.Link key={item.path} to={item.path} className={(0, utils_1.cn)('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all', location.pathname === item.path
                ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-900 dark:text-brand-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
                  <item.icon size={14}/>
                  {t(item.labelKey)}
                </react_router_dom_1.Link>); })}

              <NavDropdown label={t('nav.services')} icon={lucide_react_1.Scissors} items={servicesDropdown}/>
              <NavDropdown label={t('nav.community')} icon={lucide_react_1.PawPrint} items={communityDropdown}/>
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <LanguageSelector_1.default />

              <button className="btn-ghost p-2.5 hidden sm:flex">
                <lucide_react_1.Search size={18} className="text-gray-500"/>
              </button>

              {isAuthenticated && (<>
                  <button onClick={function () { return setNotifOpen(!notifOpen); }} className="btn-ghost p-2.5 relative">
                    <lucide_react_1.Bell size={18} className="text-gray-500"/>
                    {notifications.length > 0 && (<span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"/>)}
                  </button>

                  <button onClick={function () { return setCartOpen(true); }} className="btn-ghost p-2.5 relative">
                    <lucide_react_1.ShoppingCart size={18} className="text-gray-500"/>
                    {cartItems.length > 0 && (<span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {cartItems.length}
                      </span>)}
                  </button>

                  {/* User menu */}
                  <div className="relative" ref={userMenuRef}>
                    <button onClick={function () { return setUserMenuOpen(!userMenuOpen); }} className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-brand-100 overflow-hidden flex items-center justify-center text-brand-900 font-semibold text-sm shrink-0">
                        {(user === null || user === void 0 ? void 0 : user.profile_photo)
                ? <img src={user.profile_photo} alt="" className="w-full h-full object-cover"/>
                : <span>{(0, utils_1.getInitials)((user === null || user === void 0 ? void 0 : user.full_name) || 'U')}</span>}
                      </div>
                      <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
                        {(_a = user === null || user === void 0 ? void 0 : user.full_name) === null || _a === void 0 ? void 0 : _a.split(' ')[0]}
                      </span>
                      <lucide_react_1.ChevronDown size={14} className="text-gray-400"/>
                    </button>

                    <framer_motion_1.AnimatePresence>
                      {userMenuOpen && (<framer_motion_1.motion.div initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4 }} className="absolute right-0 top-full mt-1 w-56 card shadow-modal py-1 z-50">
                          <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{user === null || user === void 0 ? void 0 : user.full_name}</p>
                            <p className="text-xs text-gray-500 truncate">{user === null || user === void 0 ? void 0 : user.email}</p>
                          </div>
                          {[
                    { to: '/profile', icon: lucide_react_1.User, label: t('nav.profile') },
                    { to: '/my-pets', icon: lucide_react_1.PawPrint, label: t('nav.myPets') },
                    { to: '/bookings', icon: lucide_react_1.Calendar, label: t('nav.myBookings') },
                    { to: '/orders', icon: lucide_react_1.ShoppingBag, label: 'Παραγγελίες' },
                    { to: '/wishlist', icon: lucide_react_1.Heart, label: 'Wishlist' },
                    { to: '/tracker', icon: lucide_react_1.MapPin, label: t('nav.petTracker') },
                    { to: '/telehealth', icon: lucide_react_1.MessageSquare, label: t('nav.telehealth') },
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
                        </framer_motion_1.motion.div>)}
                    </framer_motion_1.AnimatePresence>
                  </div>
                </>)}

              {!isAuthenticated && (<div className="hidden sm:flex items-center gap-2">
                  <react_router_dom_1.Link to="/login" className="btn-ghost px-4 py-2 text-sm font-medium">{t('nav.login')}</react_router_dom_1.Link>
                  <react_router_dom_1.Link to="/register" className="btn-primary px-4 py-2 text-sm">{t('auth.register')}</react_router_dom_1.Link>
                </div>)}

              <button onClick={function () { return setMobileOpen(!mobileOpen); }} className="lg:hidden btn-ghost p-2">
                {mobileOpen ? <lucide_react_1.X size={20}/> : <lucide_react_1.Menu size={20}/>}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <framer_motion_1.AnimatePresence>
          {mobileOpen && (<framer_motion_1.motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="lg:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="px-4 py-3 space-y-1">
                {simpleNavItems.map(function (item) { return (<react_router_dom_1.Link key={item.path} to={item.path} onClick={function () { return setMobileOpen(false); }} className={(0, utils_1.cn)('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium', location.pathname === item.path ? 'bg-brand-50 text-brand-900' : 'text-gray-700 dark:text-gray-300')}>
                    <item.icon size={18}/>
                    {t(item.labelKey)}
                  </react_router_dom_1.Link>); })}

                {/* Services section */}
                <button onClick={function () { return setMobileServicesOpen(function (o) { return !o; }); }} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300">
                  <span className="flex items-center gap-3"><lucide_react_1.Scissors size={18}/>{t('nav.services')}</span>
                  <lucide_react_1.ChevronDown size={16} className={(0, utils_1.cn)('transition-transform', mobileServicesOpen && 'rotate-180')}/>
                </button>
                {mobileServicesOpen && (<div className="pl-4 space-y-1">
                    {servicesDropdown.map(function (item) { return (<react_router_dom_1.Link key={item.path} to={item.path} onClick={function () { return setMobileOpen(false); }} className={(0, utils_1.cn)('flex items-center gap-3 px-3 py-2 rounded-xl text-sm', location.pathname === item.path ? 'bg-brand-50 text-brand-900 font-medium' : 'text-gray-600 dark:text-gray-400')}>
                        <item.icon size={16} className={item.color}/>
                        {t(item.labelKey)}
                      </react_router_dom_1.Link>); })}
                  </div>)}

                {/* Community section */}
                <button onClick={function () { return setMobileCommunityOpen(function (o) { return !o; }); }} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300">
                  <span className="flex items-center gap-3"><lucide_react_1.PawPrint size={18}/>{t('nav.community')}</span>
                  <lucide_react_1.ChevronDown size={16} className={(0, utils_1.cn)('transition-transform', mobileCommunityOpen && 'rotate-180')}/>
                </button>
                {mobileCommunityOpen && (<div className="pl-4 space-y-1">
                    {communityDropdown.map(function (item) { return (<react_router_dom_1.Link key={item.path} to={item.path} onClick={function () { return setMobileOpen(false); }} className={(0, utils_1.cn)('flex items-center gap-3 px-3 py-2 rounded-xl text-sm', location.pathname === item.path ? 'bg-brand-50 text-brand-900 font-medium' : 'text-gray-600 dark:text-gray-400')}>
                        <item.icon size={16} className={item.color}/>
                        {t(item.labelKey)}
                      </react_router_dom_1.Link>); })}
                  </div>)}

                {!isAuthenticated && (<div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <react_router_dom_1.Link to="/login" onClick={function () { return setMobileOpen(false); }} className="btn-secondary flex-1 text-center py-2 text-sm">{t('nav.login')}</react_router_dom_1.Link>
                    <react_router_dom_1.Link to="/register" onClick={function () { return setMobileOpen(false); }} className="btn-primary flex-1 text-center py-2 text-sm">{t('auth.register')}</react_router_dom_1.Link>
                  </div>)}
                {isAuthenticated && (user === null || user === void 0 ? void 0 : user.role) === 'admin' && (<react_router_dom_1.Link to="/admin" onClick={function () { return setMobileOpen(false); }} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-purple-600">
                    <lucide_react_1.Shield size={18}/>Admin
                  </react_router_dom_1.Link>)}
                {isAuthenticated && (<button onClick={function () { setMobileOpen(false); logout(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600">
                    <lucide_react_1.LogOut size={18}/>
                    {t('nav.logout')}
                  </button>)}
              </div>
            </framer_motion_1.motion.div>)}
        </framer_motion_1.AnimatePresence>
      </header>

      <main className="flex-1">
        <react_router_dom_1.Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 lg:col-span-1">
              <img src="/logo-clean.png" alt="GlobiPet" className="h-16 w-auto mb-3"/>
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
      <CartDrawer_1.default open={cartOpen} onClose={function () { return setCartOpen(false); }}/>
      <NotificationsPanel_1.default open={notifOpen} onClose={function () { return setNotifOpen(false); }}/>
    </div>);
}
