"use strict";
// NOTE: This is an EXAMPLE success handler.
// If you already have an OrderConfirmation page, just add the Viva verification
// logic shown in the useEffect below to your existing page.
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
exports.default = OrderConfirmation;
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var react_query_1 = require("@tanstack/react-query");
var lucide_react_1 = require("lucide-react");
var api_1 = require("@/lib/api");
function OrderConfirmation() {
    var _this = this;
    var _a;
    var id = (0, react_router_dom_1.useParams)().id;
    var params = (0, react_router_dom_1.useSearchParams)()[0];
    var navigate = (0, react_router_dom_1.useNavigate)();
    var _b = (0, react_1.useState)(false), verifying = _b[0], setVerifying = _b[1];
    // Viva returns these query params on redirect: ?t=transactionId&s=orderCode&eventId=...
    var transactionId = params.get('t');
    var vivaSuccess = params.get('s'); // orderCode present = came back from Viva
    var _c = (0, react_query_1.useQuery)({
        queryKey: ['order', id],
        queryFn: function () { return api_1.api.get("/orders/".concat(id)).then(function (r) { return r.data; }); },
        enabled: !!id,
    }), order = _c.data, refetch = _c.refetch;
    // Verify Viva payment when redirected back
    (0, react_1.useEffect)(function () {
        var verify = function () { return __awaiter(_this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(transactionId && id)) return [3 /*break*/, 6];
                        setVerifying(true);
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 4, 5, 6]);
                        return [4 /*yield*/, api_1.api.post('/orders/viva/verify', {
                                order_id: id,
                                transaction_id: transactionId,
                            })];
                    case 2:
                        _b.sent();
                        return [4 /*yield*/, refetch()];
                    case 3:
                        _b.sent();
                        return [3 /*break*/, 6];
                    case 4:
                        _a = _b.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        setVerifying(false);
                        return [7 /*endfinally*/];
                    case 6: return [2 /*return*/];
                }
            });
        }); };
        verify();
    }, [transactionId, id]);
    var isPaid = (order === null || order === void 0 ? void 0 : order.payment_status) === 'paid';
    return (<div className="page-container py-16 max-w-lg mx-auto text-center">
      {verifying ? (<>
          <lucide_react_1.Loader2 size={56} className="mx-auto text-brand-900 animate-spin mb-4"/>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Επιβεβαίωση πληρωμής...</h1>
          <p className="text-gray-500">Παρακαλώ περιμένετε</p>
        </>) : isPaid ? (<>
          <lucide_react_1.CheckCircle size={56} className="mx-auto text-green-500 mb-4"/>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Η πληρωμή ολοκληρώθηκε! 🎉</h1>
          <p className="text-gray-500 mb-6">Η παραγγελία σας επιβεβαιώθηκε και θα την επεξεργαστούμε σύντομα.</p>
          <div className="card p-4 mb-6 text-left">
            <p className="text-sm text-gray-500">Αριθμός παραγγελίας</p>
            <p className="font-mono font-bold text-gray-900 dark:text-white">#{id === null || id === void 0 ? void 0 : id.slice(0, 8)}</p>
            <p className="text-sm text-gray-500 mt-2">Σύνολο</p>
            <p className="font-bold text-gray-900 dark:text-white">€{(_a = order === null || order === void 0 ? void 0 : order.total_amount) === null || _a === void 0 ? void 0 : _a.toFixed(2)}</p>
          </div>
          <button onClick={function () { return navigate('/orders'); }} className="btn-primary w-full">
            <lucide_react_1.Package size={16} className="inline mr-2"/>Οι παραγγελίες μου
          </button>
        </>) : (<>
          <lucide_react_1.XCircle size={56} className="mx-auto text-amber-500 mb-4"/>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Εκκρεμεί πληρωμή</h1>
          <p className="text-gray-500 mb-6">Η παραγγελία δημιουργήθηκε αλλά η πληρωμή δεν έχει επιβεβαιωθεί ακόμα.</p>
          <button onClick={function () { return navigate('/orders'); }} className="btn-secondary w-full">Οι παραγγελίες μου</button>
        </>)}
    </div>);
}
