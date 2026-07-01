"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UserMenu;
var react_1 = require("react");
var framer_motion_1 = require("framer-motion");
var react_router_dom_1 = require("react-router-dom");
var lucide_react_1 = require("lucide-react");
var auth_1 = require("@/store/auth");
var react_i18next_1 = require("react-i18next");
function UserMenu(_a) {
    var open = _a.open, onClose = _a.onClose;
    var _b = (0, auth_1.useAuthStore)(), user = _b.user, logout = _b.logout;
    var t = (0, react_i18next_1.useTranslation)().t;
    var location = (0, react_router_dom_1.useLocation)();
    (0, react_1.useEffect)(function () {
        onClose();
    }, [location.pathname]);
    return (<framer_motion_1.AnimatePresence>
      {open && (<>
          <div className="fixed inset-0 z-40" onClick={onClose}/>
          <framer_motion_1.motion.div initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.96 }} className="fixed top-16 right-4 w-56 card shadow-modal py-1 z-50">
            <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{user === null || user === void 0 ? void 0 : user.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{user === null || user === void 0 ? void 0 : user.email}</p>
            </div>
            {[
                { to: '/profile', icon: lucide_react_1.User, label: t('nav.profile') },
                { to: '/my-pets', icon: lucide_react_1.PawPrint, label: t('nav.myPets') },
                { to: '/bookings', icon: lucide_react_1.Calendar, label: t('nav.myBookings') },
                { to: '/orders', icon: lucide_react_1.ShoppingBag, label: t('orders.title') },
                { to: '/wishlist', icon: lucide_react_1.Heart, label: 'Wishlist' },
                { to: '/tracker', icon: lucide_react_1.MapPin, label: t('nav.petTracker') },
                { to: '/telehealth', icon: lucide_react_1.MessageSquare, label: t('nav.telehealth') },
            ].map(function (item) { return (<react_router_dom_1.Link key={item.to} to={item.to} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <item.icon size={15} className="text-gray-400"/>
                {item.label}
              </react_router_dom_1.Link>); })}
            {((user === null || user === void 0 ? void 0 : user.role) === 'service_provider' || (user === null || user === void 0 ? void 0 : user.role) === 'admin') && (<react_router_dom_1.Link to="/provider/packages" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-t border-gray-100 dark:border-gray-800 mt-1">
                <lucide_react_1.Package size={15} className="text-gray-400"/>
                Τα πακέτα μου
              </react_router_dom_1.Link>)}
            {((user === null || user === void 0 ? void 0 : user.role) === 'service_provider' || (user === null || user === void 0 ? void 0 : user.role) === 'admin') && (<react_router_dom_1.Link to="/provider" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-t border-gray-100 dark:border-gray-800 mt-1">
                <lucide_react_1.Settings size={15} className="text-gray-400"/>
                {t('nav.providerDashboard')}
              </react_router_dom_1.Link>)}
            {(user === null || user === void 0 ? void 0 : user.role) === 'admin' && (<react_router_dom_1.Link to="/admin" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <lucide_react_1.Shield size={15} className="text-gray-400"/>
                {t('nav.admin')}
              </react_router_dom_1.Link>)}
            <div className="border-t border-gray-100 dark:border-gray-800 mt-1">
              <button onClick={function () { onClose(); logout(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <lucide_react_1.LogOut size={15}/>
                {t('nav.logout')}
              </button>
            </div>
          </framer_motion_1.motion.div>
        </>)}
    </framer_motion_1.AnimatePresence>);
}
