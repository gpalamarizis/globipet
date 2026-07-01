"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MyOrders;
var react_query_1 = require("@tanstack/react-query");
var react_router_dom_1 = require("react-router-dom");
var framer_motion_1 = require("framer-motion");
var react_i18next_1 = require("react-i18next");
var lucide_react_1 = require("lucide-react");
var auth_1 = require("@/store/auth");
var api_1 = require("@/lib/api");
var utils_1 = require("@/lib/utils");
var statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    shipped: 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
};
function MyOrders() {
    var _a = (0, react_i18next_1.useTranslation)(), t = _a.t, i18n = _a.i18n;
    var isAuthenticated = (0, auth_1.useAuthStore)().isAuthenticated;
    var localeMap = { el: 'el-GR', en: 'en-US', es: 'es-ES', fr: 'fr-FR', zh: 'zh-CN' };
    var _b = (0, react_query_1.useQuery)({
        queryKey: ['my-orders'],
        queryFn: function () { return api_1.api.get('/orders/my').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: isAuthenticated,
    }), _c = _b.data, orders = _c === void 0 ? [] : _c, isLoading = _b.isLoading;
    if (!isAuthenticated)
        return (<div className="page-container py-16 text-center">
      <p className="text-4xl mb-3">🔒</p>
      <p className="font-semibold text-gray-900 dark:text-white mb-2">{t('auth.requiredTitle')}</p>
      <react_router_dom_1.Link to="/login" className="btn-primary inline-block">{t('auth.login')}</react_router_dom_1.Link>
    </div>);
    return (<div className="page-container py-8 pb-24 lg:pb-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-6">{t('orders.title')}</h1>

      {isLoading ? (<div className="space-y-3">{[1, 2, 3].map(function (i) { return <div key={i} className="card p-5"><div className="skeleton h-20 w-full"/></div>; })}</div>) : orders.length === 0 ? (<div className="text-center py-16">
          <lucide_react_1.ShoppingBag size={48} className="mx-auto text-gray-300 mb-4"/>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('orders.noOrders')}</h3>
          <p className="text-gray-500 mb-6">{t('orders.noOrdersDesc')}</p>
          <react_router_dom_1.Link to="/marketplace" className="btn-primary">{t('orders.shop')}</react_router_dom_1.Link>
        </div>) : (<div className="space-y-3">
          {orders.map(function (order, i) {
                var _a, _b;
                return (<framer_motion_1.motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <react_router_dom_1.Link to={"/orders/".concat(order.id)} className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow block">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0">
                  <lucide_react_1.Package size={20} className="text-brand-900"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                      {t('orders.orderNumber')} #{(_a = order.id) === null || _a === void 0 ? void 0 : _a.slice(0, 8).toUpperCase()}
                    </p>
                    <span className={(0, utils_1.cn)('text-xs px-2 py-0.5 rounded-full font-medium', statusColors[order.status] || 'bg-gray-100 text-gray-700')}>
                      {t("orders.status.".concat(order.status))}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleDateString(localeMap[i18n.language] || 'el-GR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-gray-900 dark:text-white">€{(_b = order.total_amount) === null || _b === void 0 ? void 0 : _b.toFixed(2)}</p>
                  <lucide_react_1.ChevronRight size={16} className="text-gray-400 ml-auto mt-1"/>
                </div>
              </react_router_dom_1.Link>
            </framer_motion_1.motion.div>);
            })}
        </div>)}
    </div>);
}
