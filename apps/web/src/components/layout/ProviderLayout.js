"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ProviderLayout;
var react_router_dom_1 = require("react-router-dom");
var react_router_dom_2 = require("react-router-dom");
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
var tabs = [
    { path: '/provider', label: 'Επισκόπηση', icon: lucide_react_1.LayoutDashboard, exact: true },
    { path: '/provider/services', label: 'Υπηρεσίες', icon: lucide_react_1.Wrench },
    { path: '/provider/bookings', label: 'Κρατήσεις', icon: lucide_react_1.Calendar },
    { path: '/provider/marketing', label: 'Marketing', icon: lucide_react_1.Megaphone },
    { path: '/provider/clients', label: 'Πελάτες', icon: lucide_react_1.Users },
];
function ProviderLayout() {
    var pathname = (0, react_router_dom_2.useLocation)().pathname;
    return (<div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-16 z-40">
        <div className="page-container">
          <div className="flex flex-wrap gap-1 py-1">
            {tabs.map(function (tab) {
            var active = tab.exact ? pathname === tab.path : pathname.startsWith(tab.path);
            return (<react_router_dom_2.Link key={tab.path} to={tab.path} className={(0, utils_1.cn)('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all', active ? 'bg-brand-900 text-white' : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800')}>
                  <tab.icon size={16}/>{tab.label}
                </react_router_dom_2.Link>);
        })}
          </div>
        </div>
      </div>
      <div className="page-container py-6"><react_router_dom_1.Outlet /></div>
    </div>);
}
