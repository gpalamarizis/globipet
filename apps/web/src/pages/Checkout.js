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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Checkout;
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var react_i18next_1 = require("react-i18next");
var lucide_react_1 = require("lucide-react");
var react_query_1 = require("@tanstack/react-query");
var auth_1 = require("@/store/auth");
var api_1 = require("@/lib/api");
var utils_1 = require("@/lib/utils");
var react_hot_toast_1 = require("react-hot-toast");
var SHIPPING_METHODS = [
    { id: 'boxnow', label: 'BoxNow Locker', price: 2.50, desc: '1-2 εργάσιμες · Παραλαβή από locker', icon: '📦' },
    { id: 'acs', label: 'ACS Courier', price: 3.99, desc: '1-3 εργάσιμες · Παράδοση στην πόρτα', icon: '🚚' },
    { id: 'elta', label: 'ΕΛΤΑ Courier', price: 4.50, desc: '2-4 εργάσιμες · Παράδοση στην πόρτα', icon: '✉️' },
];
function Checkout() {
    var _this = this;
    var t = (0, react_i18next_1.useTranslation)().t;
    var navigate = (0, react_router_dom_1.useNavigate)();
    var user = (0, auth_1.useAuthStore)().user;
    var _a = (0, react_1.useState)('address'), step = _a[0], setStep = _a[1];
    var _b = (0, react_1.useState)({
        full_name: (user === null || user === void 0 ? void 0 : user.full_name) || '',
        phone: '',
        street: '',
        city: '',
        postal_code: '',
        country: 'GR',
    }), address = _b[0], setAddress = _b[1];
    var _c = (0, react_1.useState)('boxnow'), shippingMethod = _c[0], setShippingMethod = _c[1];
    var _d = (0, react_1.useState)('card'), paymentMethod = _d[0], setPaymentMethod = _d[1];
    var _e = (0, react_query_1.useQuery)({
        queryKey: ['cart'],
        queryFn: function () { return api_1.api.get('/cart').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }).data, cartItems = _e === void 0 ? [] : _e;
    var selectedShipping = SHIPPING_METHODS.find(function (m) { return m.id === shippingMethod; });
    var subtotal = cartItems.reduce(function (sum, item) { var _a, _b; return sum + (((_b = (_a = item.product_price) !== null && _a !== void 0 ? _a : item.price) !== null && _b !== void 0 ? _b : 0) * item.quantity); }, 0);
    var shipping = subtotal > 50 ? 0 : selectedShipping.price;
    var grandTotal = subtotal + shipping;
    var steps = [
        { id: 'address', label: 'Διεύθυνση' },
        { id: 'shipping', label: 'Αποστολή' },
        { id: 'payment', label: 'Πληρωμή' },
        { id: 'review', label: 'Επιβεβαίωση' },
    ];
    var placeOrder = (0, react_query_1.useMutation)({
        mutationFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var items, order, viva;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        items = cartItems.map(function (item) {
                            var _a, _b;
                            return ({
                                product_id: item.product_id || item.id,
                                product_name: item.product_name || item.name,
                                product_price: (_b = (_a = item.product_price) !== null && _a !== void 0 ? _a : item.price) !== null && _b !== void 0 ? _b : 0,
                                product_image: item.product_image || item.image || null,
                                quantity: item.quantity,
                            });
                        });
                        return [4 /*yield*/, api_1.api.post('/orders', {
                                items: items,
                                shipping_address: __assign(__assign({}, address), { shipping_method: shippingMethod, shipping_cost: shipping }),
                                payment_method: paymentMethod,
                                total_amount: grandTotal,
                            })];
                    case 1:
                        order = (_a.sent()).data;
                        if (!(paymentMethod === 'card')) return [3 /*break*/, 3];
                        return [4 /*yield*/, api_1.api.post('/orders/viva/checkout', {
                                order_id: order.id,
                                total_amount: grandTotal,
                            })];
                    case 2:
                        viva = (_a.sent()).data;
                        if (viva.checkoutUrl) {
                            window.location.href = viva.checkoutUrl;
                            return [2 /*return*/];
                        }
                        _a.label = 3;
                    case 3: return [2 /*return*/, order];
                }
            });
        }); },
        onSuccess: function (order) {
            if (order) {
                react_hot_toast_1.default.success('Παραγγελία ολοκληρώθηκε! 🎉');
                navigate("/orders/".concat(order.id));
            }
        },
        onError: function (err) { return react_hot_toast_1.default.error((err === null || err === void 0 ? void 0 : err.message) || 'Σφάλμα κατά την παραγγελία'); },
    });
    if (cartItems.length === 0)
        return (<div className="page-container py-16 text-center">
      <lucide_react_1.ShoppingBag size={48} className="mx-auto text-gray-300 mb-4"/>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Το καλάθι σας είναι άδειο</h2>
      <button onClick={function () { return navigate('/marketplace'); }} className="btn-primary mt-4">Αγορές</button>
    </div>);
    var stepIdx = steps.findIndex(function (s) { return s.id === step; });
    return (<div className="page-container py-8 pb-24 lg:pb-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={function () { return navigate(-1); }} className="btn-ghost p-2"><lucide_react_1.ArrowLeft size={18}/></button>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Ολοκλήρωση παραγγελίας</h1>
      </div>

      {/* Steps */}
      <div className="flex items-center justify-center mb-8">
        {steps.map(function (s, i) { return (<div key={s.id} className="flex items-center">
            <div className={(0, utils_1.cn)('flex items-center gap-2', step === s.id ? 'text-brand-900' : i < stepIdx ? 'text-green-600' : 'text-gray-400')}>
              <div className={(0, utils_1.cn)('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all', step === s.id ? 'border-brand-900 bg-brand-50 text-brand-900' :
                i < stepIdx ? 'border-green-500 bg-green-500 text-white' : 'border-gray-200 text-gray-400')}>
                {i < stepIdx ? <lucide_react_1.Check size={14}/> : i + 1}
              </div>
              <span className="text-sm font-medium hidden sm:block">{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className={(0, utils_1.cn)('w-10 h-0.5 mx-2', i < stepIdx ? 'bg-green-500' : 'bg-gray-200')}/>}
          </div>); })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">

          {/* Step 1: Address */}
          {step === 'address' && (<div className="card p-6">
              <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><lucide_react_1.Truck size={18}/> Διεύθυνση παράδοσης</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Ονοματεπώνυμο</label>
                  <input className="input" value={address.full_name} onChange={function (e) { return setAddress(function (a) { return (__assign(__assign({}, a), { full_name: e.target.value })); }); }} placeholder="Γιώργος Παπαδόπουλος"/>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Τηλέφωνο</label>
                  <input className="input" value={address.phone} onChange={function (e) { return setAddress(function (a) { return (__assign(__assign({}, a), { phone: e.target.value })); }); }} placeholder="+30 6900000000"/>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Χώρα</label>
                  <select className="input" value={address.country} onChange={function (e) { return setAddress(function (a) { return (__assign(__assign({}, a), { country: e.target.value })); }); }}>
                    <option value="GR">Ελλάδα</option>
                    <option value="CY">Κύπρος</option>
                    <option value="DE">Γερμανία</option>
                    <option value="GB">Ηνωμένο Βασίλειο</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Οδός και αριθμός</label>
                  <input className="input" value={address.street} onChange={function (e) { return setAddress(function (a) { return (__assign(__assign({}, a), { street: e.target.value })); }); }} placeholder="Λεωφόρος Αθηνών 123"/>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Πόλη</label>
                  <input className="input" value={address.city} onChange={function (e) { return setAddress(function (a) { return (__assign(__assign({}, a), { city: e.target.value })); }); }} placeholder="Αθήνα"/>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">ΤΚ</label>
                  <input className="input" value={address.postal_code} onChange={function (e) { return setAddress(function (a) { return (__assign(__assign({}, a), { postal_code: e.target.value })); }); }} placeholder="10431"/>
                </div>
              </div>
              <button onClick={function () { return setStep('shipping'); }} disabled={!address.full_name || !address.street || !address.city} className="btn-primary w-full mt-4 flex items-center justify-center gap-2">
                Συνέχεια <lucide_react_1.ChevronRight size={16}/>
              </button>
            </div>)}

          {/* Step 2: Shipping */}
          {step === 'shipping' && (<div className="card p-6">
              <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><lucide_react_1.Package size={18}/> Τρόπος αποστολής</h2>
              <div className="space-y-3 mb-5">
                {SHIPPING_METHODS.map(function (m) { return (<label key={m.id} className={(0, utils_1.cn)('flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all', shippingMethod === m.id ? 'border-brand-900 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300')}>
                    <input type="radio" name="shipping" value={m.id} checked={shippingMethod === m.id} onChange={function () { return setShippingMethod(m.id); }} className="sr-only"/>
                    <span className="text-2xl">{m.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{m.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
                    </div>
                    <div className="text-right">
                      {subtotal > 50
                    ? <span className="text-sm font-bold text-green-600">Δωρεάν</span>
                    : <span className="text-sm font-bold text-gray-900 dark:text-white">€{m.price.toFixed(2)}</span>}
                    </div>
                    {shippingMethod === m.id && <lucide_react_1.Check size={16} className="text-brand-900 shrink-0"/>}
                  </label>); })}
              </div>
              {subtotal > 50 && (<p className="text-xs text-green-600 font-medium mb-4 text-center">🎉 Δωρεάν αποστολή για αγορές άνω των €50!</p>)}
              <div className="flex gap-3">
                <button onClick={function () { return setStep('address'); }} className="btn-secondary flex-1">Πίσω</button>
                <button onClick={function () { return setStep('payment'); }} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  Συνέχεια <lucide_react_1.ChevronRight size={16}/>
                </button>
              </div>
            </div>)}

          {/* Step 3: Payment */}
          {step === 'payment' && (<div className="card p-6">
              <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><lucide_react_1.CreditCard size={18}/> Τρόπος πληρωμής</h2>
              <div className="space-y-3 mb-5">
                {[
                { id: 'card', label: 'Κάρτα / Apple Pay / Google Pay', icon: '💳' },
                { id: 'cash', label: 'Αντικαταβολή', icon: '💵' },
            ].map(function (m) { return (<label key={m.id} className={(0, utils_1.cn)('flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all', paymentMethod === m.id ? 'border-brand-900 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-gray-700')}>
                    <input type="radio" name="payment" value={m.id} checked={paymentMethod === m.id} onChange={function () { return setPaymentMethod(m.id); }} className="sr-only"/>
                    <span className="text-xl">{m.icon}</span>
                    <span className="font-medium text-sm text-gray-900 dark:text-white flex-1">{m.label}</span>
                    {paymentMethod === m.id && <lucide_react_1.Check size={16} className="text-brand-900"/>}
                  </label>); })}
              </div>
              {paymentMethod === 'card' && (<div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-4">
                  <div className="flex items-center gap-2">
                    <lucide_react_1.Lock size={14} className="text-blue-600"/>
                    <span className="text-xs text-blue-600 font-medium">Θα μεταφερθείτε στο ασφαλές περιβάλλον πληρωμής Viva Wallet</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Αποδεκτές κάρτες: Visa, Mastercard, American Express. Έως 12 άτοκες δόσεις.</p>
                </div>)}
              <div className="flex gap-3">
                <button onClick={function () { return setStep('shipping'); }} className="btn-secondary flex-1">Πίσω</button>
                <button onClick={function () { return setStep('review'); }} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  Συνέχεια <lucide_react_1.ChevronRight size={16}/>
                </button>
              </div>
            </div>)}

          {/* Step 4: Review */}
          {step === 'review' && (<div className="card p-6">
              <h2 className="font-bold text-gray-900 dark:text-white mb-4">Επιβεβαίωση παραγγελίας</h2>
              <div className="space-y-3 mb-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">ΔΙΕΥΘΥΝΣΗ ΠΑΡΑΔΟΣΗΣ</p>
                  <p className="text-sm text-gray-900 dark:text-white">{address.full_name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{address.street}, {address.city} {address.postal_code}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{address.phone}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">ΤΡΟΠΟΣ ΑΠΟΣΤΟΛΗΣ</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedShipping.icon} {selectedShipping.label} · {subtotal > 50 ? 'Δωρεάν' : "\u20AC".concat(selectedShipping.price.toFixed(2))}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">ΤΡΟΠΟΣ ΠΛΗΡΩΜΗΣ</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {paymentMethod === 'card' ? '💳 Κάρτα μέσω Viva Wallet' : '💵 Αντικαταβολή'}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={function () { return setStep('payment'); }} className="btn-secondary flex-1">Πίσω</button>
                <button onClick={function () { return placeOrder.mutate(); }} disabled={placeOrder.isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <lucide_react_1.Lock size={14}/>
                  {placeOrder.isPending ? 'Επεξεργασία...' : "\u03A0\u03B1\u03C1\u03B1\u03B3\u03B3\u03B5\u03BB\u03AF\u03B1 \u20AC".concat(grandTotal.toFixed(2))}
                </button>
              </div>
            </div>)}
        </div>

        {/* Order summary */}
        <div className="card p-5 h-fit sticky top-20">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">Σύνοψη παραγγελίας</h3>
          <div className="space-y-3 mb-4">
            {cartItems.map(function (item) {
            var _a, _b, _c, _d, _e;
            return (<div key={item.id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm shrink-0">
                  {((_a = item.product_image) !== null && _a !== void 0 ? _a : item.image) ? <img src={(_b = item.product_image) !== null && _b !== void 0 ? _b : item.image} alt="" className="w-full h-full object-cover rounded-lg"/> : '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{(_c = item.product_name) !== null && _c !== void 0 ? _c : item.name}</p>
                  <p className="text-xs text-gray-500">x{item.quantity}</p>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">€{(((_e = (_d = item.product_price) !== null && _d !== void 0 ? _d : item.price) !== null && _e !== void 0 ? _e : 0) * item.quantity).toFixed(2)}</p>
              </div>);
        })}
          </div>
          <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Υποσύνολο</span><span>€{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Μεταφορικά</span>
              <span className={shipping === 0 ? 'text-green-600 font-medium' : ''}>{shipping === 0 ? 'Δωρεάν' : "\u20AC".concat(shipping.toFixed(2))}</span>
            </div>
            {subtotal > 50 && <p className="text-xs text-green-600">🎉 Δωρεάν αποστολή!</p>}
            <div className="flex justify-between font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-gray-800">
              <span>Σύνολο</span><span>€{grandTotal.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
            <lucide_react_1.Lock size={12}/> Ασφαλής πληρωμή με κρυπτογράφηση SSL
          </div>
        </div>
      </div>
    </div>);
}
