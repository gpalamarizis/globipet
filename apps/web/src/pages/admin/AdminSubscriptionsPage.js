"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminSubscriptionsPage;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var lucide_react_1 = require("lucide-react");
var api_1 = require("@/lib/api");
var utils_1 = require("@/lib/utils");
var react_hot_toast_1 = require("react-hot-toast");
var LoadingSpinner_1 = require("@/components/ui/LoadingSpinner");
var TABS = [
    { id: 'overview', label: 'Επισκόπηση', icon: lucide_react_1.Layers },
    { id: 'ai', label: 'AI Υγεία', icon: lucide_react_1.Brain },
    { id: 'food', label: 'Τροφή', icon: lucide_react_1.Package },
    { id: 'insurance', label: 'Ασφάλιση', icon: lucide_react_1.Shield },
];
var STATUS_LABELS = {
    none: 'Κανένα', trial: 'Trial', active: 'Ενεργό', expired: 'Έληξε',
    cancelled: 'Ακυρωμένο', payment_failed: 'Αποτυχία πληρωμής', paused: 'Σε παύση',
};
var STATUS_COLORS = {
    trial: 'bg-amber-50 text-amber-700', active: 'bg-green-50 text-green-700',
    expired: 'bg-gray-100 text-gray-600', cancelled: 'bg-gray-100 text-gray-600',
    payment_failed: 'bg-red-50 text-red-700', paused: 'bg-blue-50 text-blue-700',
};
function AdminSubscriptionsPage() {
    var _a;
    var _b = (0, react_1.useState)('overview'), activeTab = _b[0], setActiveTab = _b[1];
    var queryClient = (0, react_query_1.useQueryClient)();
    var _c = (0, react_1.useState)(''), discountInput = _c[0], setDiscountInput = _c[1];
    var discountSetting = (0, react_query_1.useQuery)({
        queryKey: ['food-subscription-discount'],
        queryFn: function () { return api_1.api.get('/settings/food-subscription-discount').then(function (r) { var _a; return (_a = r.data) === null || _a === void 0 ? void 0 : _a.data; }); },
    }).data;
    var updateDiscount = (0, react_query_1.useMutation)({
        mutationFn: function (discount_percent) { return api_1.api.patch('/settings/admin/food-subscription-discount', { discount_percent: discount_percent }); },
        onSuccess: function () {
            react_hot_toast_1.default.success('Η έκπτωση ενημερώθηκε');
            queryClient.invalidateQueries({ queryKey: ['food-subscription-discount'] });
        },
        onError: function () { return react_hot_toast_1.default.error('Σφάλμα ενημέρωσης'); },
    });
    var _d = (0, react_query_1.useQuery)({
        queryKey: ['admin-subscriptions-overview'],
        queryFn: function () { return api_1.api.get('/admin/subscriptions/overview').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: activeTab === 'overview',
    }), overview = _d.data, loadingOverview = _d.isLoading;
    var _e = (0, react_query_1.useQuery)({
        queryKey: ['admin-subscriptions-ai'],
        queryFn: function () { return api_1.api.get('/admin/subscriptions/ai').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: activeTab === 'ai',
    }), aiUsers = _e.data, loadingAi = _e.isLoading;
    var _f = (0, react_query_1.useQuery)({
        queryKey: ['admin-subscriptions-food'],
        queryFn: function () { return api_1.api.get('/admin/subscriptions/food').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: activeTab === 'food',
    }), foodSubs = _f.data, loadingFood = _f.isLoading;
    var _g = (0, react_query_1.useQuery)({
        queryKey: ['admin-subscriptions-insurance'],
        queryFn: function () { return api_1.api.get('/admin/subscriptions/insurance').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: activeTab === 'insurance',
    }), insuranceSubs = _g.data, loadingInsurance = _g.isLoading;
    var updateFoodStatus = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var id = _a.id, status = _a.status;
            return api_1.api.patch("/admin/subscriptions/food/".concat(id), { status: status });
        },
        onSuccess: function () {
            react_hot_toast_1.default.success('Ενημερώθηκε');
            queryClient.invalidateQueries({ queryKey: ['admin-subscriptions-food'] });
        },
    });
    var StatusBadge = function (_a) {
        var status = _a.status;
        return (<span className={(0, utils_1.cn)('text-xs font-medium px-2 py-1 rounded-full', STATUS_COLORS[status] || 'bg-gray-100 text-gray-600')}>
      {STATUS_LABELS[status] || status}
    </span>);
    };
    return (<div className="page-container py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
          <lucide_react_1.Layers size={20} className="text-purple-600"/>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Συνδρομές</h1>
          <p className="text-sm text-gray-500">Διαχείριση AI, τροφής και ασφαλιστικών συνδρομών</p>
        </div>
      </div>

      {/* Global discount setting */}
      <div className="card p-4 mb-6 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <lucide_react_1.Settings2 size={16} className="text-gray-400"/>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Global έκπτωση 12μηνης συνδρομής τροφής: <strong>{(_a = discountSetting === null || discountSetting === void 0 ? void 0 : discountSetting.discount_percent) !== null && _a !== void 0 ? _a : 0}%</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input type="number" min={0} max={100} placeholder="π.χ. 15" value={discountInput} onChange={function (e) { return setDiscountInput(e.target.value); }} className="input w-24 text-sm"/>
          <button onClick={function () { return discountInput !== '' && updateDiscount.mutate(parseFloat(discountInput)); }} disabled={updateDiscount.isPending || discountInput === ''} className="btn-primary px-3 py-2 text-xs">
            Ενημέρωση %
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {TABS.map(function (tab) { return (<button key={tab.id} onClick={function () { return setActiveTab(tab.id); }} className={(0, utils_1.cn)('flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg transition-all', activeTab === tab.id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500')}>
            <tab.icon size={14}/>{tab.label}
          </button>); })}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (loadingOverview ? <div className="flex justify-center py-12"><LoadingSpinner_1.default /></div> : (<div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-left text-xs text-gray-500">
                <tr>
                  <th className="p-3">Τύπος</th><th className="p-3">Χρήστης</th><th className="p-3">Πλάνο</th>
                  <th className="p-3">Κατάσταση</th><th className="p-3">Έναρξη</th>
                </tr>
              </thead>
              <tbody>
                {overview === null || overview === void 0 ? void 0 : overview.map(function (row, i) { return (<tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="p-3 capitalize text-gray-500">{row.type}</td>
                    <td className="p-3">
                      <p className="font-medium text-gray-900 dark:text-white">{row.user_name}</p>
                      <p className="text-xs text-gray-500">{row.user_email}</p>
                    </td>
                    <td className="p-3">{row.plan_name}{row.price ? " \u2014 \u20AC".concat(row.price, "/\u03BC\u03AE\u03BD\u03B1") : ''}</td>
                    <td className="p-3"><StatusBadge status={row.status}/></td>
                    <td className="p-3 text-gray-500">{row.started_at ? new Date(row.started_at).toLocaleDateString('el-GR') : '—'}</td>
                  </tr>); })}
                {(overview === null || overview === void 0 ? void 0 : overview.length) === 0 && (<tr><td colSpan={5} className="p-8 text-center text-gray-500">Δεν υπάρχουν συνδρομές ακόμα</td></tr>)}
              </tbody>
            </table>
          </div>))}

      {/* AI tab */}
      {activeTab === 'ai' && (loadingAi ? <div className="flex justify-center py-12"><LoadingSpinner_1.default /></div> : (<div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-left text-xs text-gray-500">
                <tr><th className="p-3">Χρήστης</th><th className="p-3">Κατάσταση</th><th className="p-3">Trial από</th></tr>
              </thead>
              <tbody>
                {aiUsers === null || aiUsers === void 0 ? void 0 : aiUsers.map(function (u) { return (<tr key={u.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="p-3">
                      <p className="font-medium text-gray-900 dark:text-white">{u.full_name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </td>
                    <td className="p-3"><StatusBadge status={u.ai_subscription_status}/></td>
                    <td className="p-3 text-gray-500">{u.ai_trial_started_at ? new Date(u.ai_trial_started_at).toLocaleDateString('el-GR') : '—'}</td>
                  </tr>); })}
                {(aiUsers === null || aiUsers === void 0 ? void 0 : aiUsers.length) === 0 && (<tr><td colSpan={3} className="p-8 text-center text-gray-500">Κανένας χρήστης δεν έχει ενεργοποιήσει AI trial/συνδρομή</td></tr>)}
              </tbody>
            </table>
          </div>))}

      {/* Food tab */}
      {activeTab === 'food' && (loadingFood ? <div className="flex justify-center py-12"><LoadingSpinner_1.default /></div> : (<div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-left text-xs text-gray-500">
                <tr>
                  <th className="p-3">Χρήστης</th><th className="p-3">Προϊόν</th><th className="p-3">Τιμή/μήνα</th>
                  <th className="p-3">Παραδόσεις</th><th className="p-3">Κατάσταση</th><th className="p-3">Ενέργειες</th>
                </tr>
              </thead>
              <tbody>
                {foodSubs === null || foodSubs === void 0 ? void 0 : foodSubs.map(function (s) {
                var _a, _b, _c;
                return (<tr key={s.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="p-3">
                      <p className="font-medium text-gray-900 dark:text-white">{(_a = s.user) === null || _a === void 0 ? void 0 : _a.full_name}</p>
                      <p className="text-xs text-gray-500">{(_b = s.user) === null || _b === void 0 ? void 0 : _b.email}</p>
                    </td>
                    <td className="p-3">{(_c = s.product) === null || _c === void 0 ? void 0 : _c.name}</td>
                    <td className="p-3">€{s.monthly_price}</td>
                    <td className="p-3">{s.deliveries_completed}/12</td>
                    <td className="p-3"><StatusBadge status={s.status}/></td>
                    <td className="p-3 flex gap-1.5">
                      {s.status === 'active' && (<button onClick={function () { return updateFoodStatus.mutate({ id: s.id, status: 'paused' }); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title="Παύση">
                          <lucide_react_1.X size={14} className="text-gray-500"/>
                        </button>)}
                      {s.status === 'paused' && (<button onClick={function () { return updateFoodStatus.mutate({ id: s.id, status: 'active' }); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title="Επανενεργοποίηση">
                          <lucide_react_1.Check size={14} className="text-green-600"/>
                        </button>)}
                    </td>
                  </tr>);
            })}
                {(foodSubs === null || foodSubs === void 0 ? void 0 : foodSubs.length) === 0 && (<tr><td colSpan={6} className="p-8 text-center text-gray-500">Δεν υπάρχουν συνδρομές τροφής ακόμα</td></tr>)}
              </tbody>
            </table>
          </div>))}

      {/* Insurance tab */}
      {activeTab === 'insurance' && (loadingInsurance ? <div className="flex justify-center py-12"><LoadingSpinner_1.default /></div> : (<div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-left text-xs text-gray-500">
                <tr><th className="p-3">Χρήστης</th><th className="p-3">Πλάνο</th><th className="p-3">Κατάσταση</th><th className="p-3">Από</th></tr>
              </thead>
              <tbody>
                {insuranceSubs === null || insuranceSubs === void 0 ? void 0 : insuranceSubs.map(function (s) {
                var _a, _b, _c, _d, _e, _f;
                return (<tr key={s.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="p-3">
                      <p className="font-medium text-gray-900 dark:text-white">{(_a = s.user) === null || _a === void 0 ? void 0 : _a.full_name}</p>
                      <p className="text-xs text-gray-500">{(_b = s.user) === null || _b === void 0 ? void 0 : _b.email}</p>
                    </td>
                    <td className="p-3">{((_c = s.plan) === null || _c === void 0 ? void 0 : _c.name_el) || ((_d = s.plan) === null || _d === void 0 ? void 0 : _d.name)} ({(_f = (_e = s.plan) === null || _e === void 0 ? void 0 : _e.provider) === null || _f === void 0 ? void 0 : _f.name})</td>
                    <td className="p-3"><StatusBadge status={s.status}/></td>
                    <td className="p-3 text-gray-500">{new Date(s.started_at).toLocaleDateString('el-GR')}</td>
                  </tr>);
            })}
                {(insuranceSubs === null || insuranceSubs === void 0 ? void 0 : insuranceSubs.length) === 0 && (<tr><td colSpan={4} className="p-8 text-center text-gray-500">Δεν έχει καταχωρηθεί καμία ασφάλιση χρήστη ακόμα</td></tr>)}
              </tbody>
            </table>
          </div>))}
    </div>);
}
