"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminCommissionsPage;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var lucide_react_1 = require("lucide-react");
var api_1 = require("@/lib/api");
var react_hot_toast_1 = require("react-hot-toast");
var LoadingSpinner_1 = require("@/components/ui/LoadingSpinner");
var PRODUCT_CATEGORIES = [
    { key: 'food', label: 'Τροφές', emoji: '🦴' },
    { key: 'toys', label: 'Παιχνίδια', emoji: '🎾' },
    { key: 'accessories', label: 'Αξεσουάρ', emoji: '🎀' },
];
var SERVICE_CATEGORIES = [
    { key: 'services_default', label: 'Προεπιλογή Υπηρεσιών', emoji: '✨' },
    { key: 'veterinary', label: 'Κτηνίατρος', emoji: '🩺' },
    { key: 'grooming', label: 'Περιποίηση', emoji: '✂️' },
    { key: 'training', label: 'Εκπαίδευση', emoji: '🎓' },
    { key: 'hosting', label: 'Φιλοξενία', emoji: '🏠' },
    { key: 'walking', label: 'Βόλτες', emoji: '🚶' },
    { key: 'pet_taxi', label: 'Pet Taxi', emoji: '🚕' },
    { key: 'photography', label: 'Φωτογράφηση', emoji: '📸' },
    { key: 'pharmacy', label: 'Φαρμακείο', emoji: '💊' },
    { key: 'telehealth', label: 'Τηλεϊατρική', emoji: '🩻' },
];
function AdminCommissionsPage() {
    var queryClient = (0, react_query_1.useQueryClient)();
    var _a = (0, react_1.useState)({}), draft = _a[0], setDraft = _a[1];
    var _b = (0, react_1.useState)('100'), previewAmount = _b[0], setPreviewAmount = _b[1];
    var _c = (0, react_1.useState)(false), showAdvanced = _c[0], setShowAdvanced = _c[1];
    var _d = (0, react_query_1.useQuery)({
        queryKey: ['commission-rates'],
        queryFn: function () { return api_1.api.get('/settings/commission-rates').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : {}; }); },
    }), rates = _d.data, isLoading = _d.isLoading;
    (0, react_1.useEffect)(function () {
        if (rates) {
            var initial = {};
            for (var _i = 0, _a = Object.entries(rates); _i < _a.length; _i++) {
                var _b = _a[_i], k = _b[0], v = _b[1];
                initial[k] = String(v);
            }
            setDraft(initial);
        }
    }, [rates]);
    var save = (0, react_query_1.useMutation)({
        mutationFn: function () {
            var payload = {};
            for (var _i = 0, _a = Object.entries(draft); _i < _a.length; _i++) {
                var _b = _a[_i], k = _b[0], v = _b[1];
                if (v !== '')
                    payload[k] = parseFloat(v);
            }
            return api_1.api.patch('/settings/commission-rates', payload);
        },
        onSuccess: function () {
            react_hot_toast_1.default.success('Τα ποσοστά προμήθειας ενημερώθηκαν');
            queryClient.invalidateQueries({ queryKey: ['commission-rates'] });
        },
        onError: function (err) { return react_hot_toast_1.default.error((err === null || err === void 0 ? void 0 : err.message) || 'Σφάλμα ενημέρωσης'); },
    });
    var setRate = function (key, val) { return setDraft(function (d) {
        var _a;
        return (__assign(__assign({}, d), (_a = {}, _a[key] = val, _a)));
    }); };
    var RateRow = function (_a) {
        var _b;
        var cat = _a.cat;
        var rateVal = parseFloat(draft[cat.key] || '0') || 0;
        var amount = parseFloat(previewAmount) || 0;
        var fee = Math.round(amount * (rateVal / 100) * 100) / 100;
        var payout = Math.round((amount - fee) * 100) / 100;
        return (<div className="flex items-center gap-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
        <span className="text-xl shrink-0">{cat.emoji}</span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 min-w-[140px]">{cat.label}</span>
        <div className="flex items-center gap-1.5">
          <input type="number" min={0} max={100} step={0.5} value={(_b = draft[cat.key]) !== null && _b !== void 0 ? _b : ''} onChange={function (e) { return setRate(cat.key, e.target.value); }} className="input w-20 text-sm text-right"/>
          <span className="text-sm text-gray-400">%</span>
        </div>
        <div className="hidden sm:block text-xs text-gray-400 w-48 text-right">
          σε {previewAmount || 0}€ → πλατφόρμα <strong className="text-gray-600 dark:text-gray-300">{fee.toFixed(2)}€</strong>, πάροχος <strong className="text-green-600">{payout.toFixed(2)}€</strong>
        </div>
      </div>);
    };
    if (isLoading)
        return <div className="page-container py-8 flex justify-center"><LoadingSpinner_1.default /></div>;
    return (<div className="page-container py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
            <lucide_react_1.Percent size={20} className="text-orange-600"/>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Προμήθειες Πλατφόρμας</h1>
            <p className="text-sm text-gray-500">Ποσοστό που κρατά το GlobiPet ανά κατηγορία προϊόντος/υπηρεσίας</p>
          </div>
        </div>
        <button onClick={function () { return save.mutate(); }} disabled={save.isPending} className="btn-primary flex items-center gap-2 px-4 py-2.5">
          <lucide_react_1.Save size={16}/>{save.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
        </button>
      </div>

      <div className="card p-4 mb-6 flex items-center gap-3 bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20">
        <lucide_react_1.Info size={16} className="text-blue-600 shrink-0"/>
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Φάση 1: τα ποσά καταγράφονται αυτόματα σε κάθε παραγγελία/κράτηση/συνεδρία (ορατά παρακάτω στα αντίστοιχα tabs), αλλά η μεταφορά χρημάτων στον πάροχο γίνεται ακόμα χειροκίνητα — αυτόματο payout (Stripe Connect/Viva sub-merchants) θα προστεθεί σε επόμενη φάση.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-gray-500">Δοκίμασε με ποσό</span>
        <input type="number" value={previewAmount} onChange={function (e) { return setPreviewAmount(e.target.value); }} className="input w-24 text-sm"/>
        <span className="text-xs text-gray-500">€</span>
      </div>

      {/* Products */}
      <div className="card p-5 mb-5">
        <h2 className="font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2"><lucide_react_1.ShoppingBag size={16}/> Προϊόντα (Κατάστημα)</h2>
        <p className="text-xs text-gray-500 mb-3">Εφαρμόζεται μόνο σε προϊόντα με δηλωμένο πάροχο (provider_email) — δικά σας/admin προϊόντα δεν έχουν προμήθεια.</p>
        {PRODUCT_CATEGORIES.map(function (cat) { return <RateRow key={cat.key} cat={cat}/>; })}
      </div>

      {/* Services */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2"><lucide_react_1.Wrench size={16}/> Υπηρεσίες & Τηλεϊατρική</h2>
        <p className="text-xs text-gray-500 mb-3">Η «Προεπιλογή Υπηρεσιών» ισχύει για κάθε τύπο υπηρεσίας χωρίς δικό του ποσοστό παρακάτω.</p>
        <RateRow cat={SERVICE_CATEGORIES[0]}/>
        <button onClick={function () { return setShowAdvanced(function (s) { return !s; }); }} className="text-xs text-brand-900 dark:text-brand-400 font-medium mt-3 mb-1">
          {showAdvanced ? '− Απόκρυψη ανά τύπο υπηρεσίας' : '+ Εξειδίκευση ανά τύπο υπηρεσίας'}
        </button>
        {showAdvanced && (<div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            {SERVICE_CATEGORIES.slice(1).map(function (cat) { return <RateRow key={cat.key} cat={cat}/>; })}
          </div>)}
      </div>
    </div>);
}
