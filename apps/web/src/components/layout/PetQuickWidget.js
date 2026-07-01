"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PetQuickWidget;
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
var react_query_1 = require("@tanstack/react-query");
var auth_1 = require("@/store/auth");
var api_1 = require("@/lib/api");
/**
 * Floating quick-actions widget for logged-in users.
 * Hidden on auth pages, home (already has personalized section), and mobile (tab bar handles it).
 */
function PetQuickWidget() {
    var isAuthenticated = (0, auth_1.useAuthStore)().isAuthenticated;
    var location = (0, react_router_dom_1.useLocation)();
    var _a = (0, react_1.useState)(false), open = _a[0], setOpen = _a[1];
    // Hide on routes where it doesn't make sense
    var hideOn = ['/login', '/register', '/', '/forgot-password', '/reset-password', '/onboarding'];
    var shouldHide = hideOn.some(function (p) { return location.pathname === p; }) || location.pathname.startsWith('/admin');
    var pets = (0, react_query_1.useQuery)({
        queryKey: ['my-pets-widget'],
        queryFn: function () { return api_1.api.get('/pets').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: isAuthenticated && !shouldHide,
        staleTime: 5 * 60 * 1000,
    }).data;
    if (!isAuthenticated || shouldHide)
        return null;
    var firstPet = pets === null || pets === void 0 ? void 0 : pets[0];
    var actions = [
        { icon: lucide_react_1.Calendar, label: 'Νέο ραντεβού', path: '/services', color: 'bg-blue-500 hover:bg-blue-600' },
        { icon: lucide_react_1.Video, label: 'Τηλεϊατρική', path: '/telehealth', color: 'bg-teal-500 hover:bg-teal-600' },
        { icon: lucide_react_1.Brain, label: 'AI Health', path: '/ai-health', color: 'bg-purple-500 hover:bg-purple-600' },
        { icon: lucide_react_1.Stethoscope, label: 'Pet Profile', path: firstPet ? "/pets/".concat(firstPet.id) : '/pets', color: 'bg-orange-500 hover:bg-orange-600' },
    ];
    return (<div className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-40 hidden lg:block">
      <framer_motion_1.AnimatePresence>
        {open && (<framer_motion_1.motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }} transition={{ duration: 0.2 }} className="mb-3 flex flex-col gap-2 items-end">
            {actions.map(function (action, i) { return (<framer_motion_1.motion.div key={action.path} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3">
                <span className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                  {action.label}
                </span>
                <react_router_dom_1.Link to={action.path} onClick={function () { return setOpen(false); }} aria-label={action.label} className={"w-12 h-12 rounded-full ".concat(action.color, " text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center")}>
                  <action.icon size={20}/>
                </react_router_dom_1.Link>
              </framer_motion_1.motion.div>); })}
          </framer_motion_1.motion.div>)}
      </framer_motion_1.AnimatePresence>

      <button onClick={function () { return setOpen(!open); }} aria-label={open ? 'Κλείσιμο μενού' : 'Άνοιγμα γρήγορου μενού'} aria-expanded={open} className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 dark:from-yellow-400 dark:to-orange-500 text-white dark:text-gray-900 shadow-2xl hover:shadow-brand-500/50 dark:hover:shadow-yellow-400/50 hover:scale-110 transition-all flex items-center justify-center group">
        <framer_motion_1.AnimatePresence mode="wait">
          {open ? (<framer_motion_1.motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <lucide_react_1.X size={24}/>
            </framer_motion_1.motion.div>) : (<framer_motion_1.motion.div key="paw" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <lucide_react_1.PawPrint size={24} className="group-hover:rotate-12 transition-transform"/>
            </framer_motion_1.motion.div>)}
        </framer_motion_1.AnimatePresence>
      </button>
    </div>);
}
