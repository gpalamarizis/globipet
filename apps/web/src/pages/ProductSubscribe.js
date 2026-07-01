"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ProductSubscribe;
var react_router_dom_1 = require("react-router-dom");
var react_query_1 = require("@tanstack/react-query");
var lucide_react_1 = require("lucide-react");
var api_1 = require("@/lib/api");
var react_hot_toast_1 = require("react-hot-toast");
var LoadingSpinner_1 = require("@/components/ui/LoadingSpinner");
function ProductSubscribe() {
    var _a;
    var id = (0, react_router_dom_1.useParams)().id;
    var navigate = (0, react_router_dom_1.useNavigate)();
    var _b = (0, react_query_1.useQuery)({
        queryKey: ['product', id],
        queryFn: function () { return api_1.api.get("/products/".concat(id)).then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : r.data; }); },
    }), product = _b.data, isLoading = _b.isLoading;
    var discountData = (0, react_query_1.useQuery)({
        queryKey: ['food-subscription-discount'],
        queryFn: function () { return api_1.api.get('/settings/food-subscription-discount').then(function (r) { var _a; return (_a = r.data) === null || _a === void 0 ? void 0 : _a.data; }); },
    }).data;
    var checkout = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_1.api.post("/subscriptions/food/".concat(id, "/checkout")); },
        onSuccess: function (res) {
            var _a, _b;
            var url = (_b = (_a = res.data) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.checkout_url;
            if (url)
                window.location.href = url;
        },
        onError: function (err) { var _a, _b; return react_hot_toast_1.default.error(((_b = (_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Σφάλμα δημιουργίας συνδρομής'); },
    });
    if (isLoading)
        return <div className="page-container py-16 flex justify-center"><LoadingSpinner_1.default /></div>;
    if (!product)
        return <div className="page-container py-16 text-center text-gray-500">Το προϊόν δεν βρέθηκε</div>;
    var discountPercent = (_a = discountData === null || discountData === void 0 ? void 0 : discountData.discount_percent) !== null && _a !== void 0 ? _a : 0;
    var monthlyPrice = Math.round(product.price * (1 - discountPercent / 100) * 100) / 100;
    if (!product.is_subscribable) {
        return (<div className="page-container py-16 text-center">
        <p className="text-gray-500 mb-4">Αυτό το προϊόν δεν διαθέτει επιλογή συνδρομής.</p>
        <button onClick={function () { return navigate("/marketplace/".concat(id)); }} className="btn-secondary">Πίσω στο προϊόν</button>
      </div>);
    }
    return (<div className="page-container py-10 max-w-lg mx-auto">
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          {product.image_url && <img src={product.image_url} alt={product.name} className="w-16 h-16 rounded-xl object-cover"/>}
          <div>
            <h1 className="font-bold text-lg text-gray-900 dark:text-white">{product.name}</h1>
            <p className="text-sm text-gray-500">Συνδρομή 12 μηνών</p>
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/10 rounded-xl p-4 mb-6">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-bold text-brand-900 dark:text-brand-400">€{monthlyPrice}</span>
            <span className="text-sm text-gray-500">/μήνα</span>
            {discountPercent > 0 && (<span className="text-xs text-gray-400 line-through ml-1">€{product.price}</span>)}
          </div>
          {discountPercent > 0 && (<p className="text-xs text-green-700 font-medium">Έκπτωση {discountPercent}% σε σχέση με μεμονωμένη αγορά</p>)}
        </div>

        <ul className="space-y-3 mb-6">
          <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <lucide_react_1.Truck size={16} className="text-brand-900 dark:text-brand-400"/> Αυτόματη μηνιαία παράδοση, 12 φορές
          </li>
          <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <lucide_react_1.ShieldCheck size={16} className="text-brand-900 dark:text-brand-400"/> Ασφαλής χρέωση κάρτας κάθε μήνα
          </li>
          <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <lucide_react_1.RotateCcw size={16} className="text-brand-900 dark:text-brand-400"/> Ακύρωση οποιαδήποτε στιγμή
          </li>
        </ul>

        <button onClick={function () { return checkout.mutate(); }} disabled={checkout.isPending} className="btn-primary w-full py-3 disabled:opacity-60">
          {checkout.isPending ? 'Μεταφορά στην πληρωμή...' : 'Ξεκίνα τη συνδρομή'}
        </button>
      </div>
    </div>);
}
