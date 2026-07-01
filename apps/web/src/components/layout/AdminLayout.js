"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminLayout;
var react_router_dom_1 = require("react-router-dom");
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
var tabs = [
    { path: '/admin', label: 'Επισκόπηση', icon: lucide_react_1.LayoutDashboard, exact: true },
    { path: '/admin/catalog', label: 'Κατάλογος', icon: lucide_react_1.BookOpen },
    { path: '/admin/services', label: 'Υπηρεσίες', icon: lucide_react_1.Building2 },
    { path: '/admin/packages', label: 'Πακέτα', icon: lucide_react_1.Package },
    { path: '/admin/subscriptions', label: 'Συνδρομές', icon: lucide_react_1.Layers },
    { path: '/admin/commissions', label: 'Προμήθειες', icon: lucide_react_1.Percent },
    { path: '/admin/messages', label: 'Μηνύματα', icon: lucide_react_1.Mail },
];
function AdminLayout() {
    var pathname = (0, react_router_dom_1.useLocation)().pathname;
    return (<div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-40">
        <div className="page-container">
          <div className="flex flex-wrap gap-1 py-2">
            {tabs.map(function (tab) {
            var active = tab.exact ? pathname === tab.path : pathname.startsWith(tab.path);
            return (<react_router_dom_1.Link key={tab.path} to={tab.path} className={(0, utils_1.cn)('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all', active ? 'bg-brand-900 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
                  <tab.icon size={16}/>{tab.label}
                </react_router_dom_1.Link>);
        })}
          </div>
        </div>
      </div>
      <react_router_dom_1.Outlet />
    </div>);
}
