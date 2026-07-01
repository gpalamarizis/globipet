"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TelehealthConfirmation;
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var react_query_1 = require("@tanstack/react-query");
var lucide_react_1 = require("lucide-react");
var api_1 = require("@/lib/api");
var JitsiCall_1 = require("@/components/features/telehealth/JitsiCall");
function TelehealthConfirmation() {
    var id = (0, react_router_dom_1.useParams)().id;
    var searchParams = (0, react_router_dom_1.useSearchParams)()[0];
    var navigate = (0, react_router_dom_1.useNavigate)();
    var _a = (0, react_1.useState)(false), activeCall = _a[0], setActiveCall = _a[1];
    var transactionId = searchParams.get('t') || searchParams.get('transactionId') || searchParams.get('s');
    var _b = (0, react_query_1.useQuery)({
        queryKey: ['telehealth', id],
        queryFn: function () { return api_1.api.get("/telehealth/".concat(id)).then(function (r) { var _a; return (_a = r.data) === null || _a === void 0 ? void 0 : _a.data; }); },
        enabled: !!id,
    }), consultation = _b.data, refetch = _b.refetch;
    var verify = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_1.api.post("/telehealth/".concat(id, "/viva/verify"), { transaction_id: transactionId }); },
        onSuccess: function () { return refetch(); },
    });
    (0, react_1.useEffect)(function () {
        if (id && (consultation === null || consultation === void 0 ? void 0 : consultation.payment_status) !== 'paid') {
            verify.mutate();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);
    // Poll every 3s while still unpaid (covers webhook-confirmed-before-redirect cases)
    (0, react_1.useEffect)(function () {
        if ((consultation === null || consultation === void 0 ? void 0 : consultation.payment_status) === 'paid')
            return;
        var interval = setInterval(function () { return refetch(); }, 3000);
        return function () { return clearInterval(interval); };
    }, [consultation === null || consultation === void 0 ? void 0 : consultation.payment_status, refetch]);
    var isPaid = (consultation === null || consultation === void 0 ? void 0 : consultation.payment_status) === 'paid';
    var isPending = !consultation || consultation.payment_status === 'unpaid';
    if (activeCall && (consultation === null || consultation === void 0 ? void 0 : consultation.meeting_url)) {
        return <JitsiCall_1.default roomName={consultation.meeting_url} vetName={consultation.provider_name} onEnd={function () { return setActiveCall(false); }}/>;
    }
    return (<div className="page-container py-16 max-w-md mx-auto text-center">
      {isPaid ? (<>
          <lucide_react_1.CheckCircle size={56} className="mx-auto text-green-500 mb-4"/>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Η πληρωμή επιβεβαιώθηκε!</h1>
          <p className="text-sm text-gray-500 mb-6">Η συνεδρία σου με {consultation.provider_name} είναι έτοιμη.</p>
          <div className="card p-4 mb-6 text-left space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <lucide_react_1.Calendar size={14} className="text-gray-400"/> {consultation.scheduled_date}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <lucide_react_1.Clock size={14} className="text-gray-400"/> {consultation.scheduled_time}
            </div>
          </div>
          <button onClick={function () { return setActiveCall(true); }} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            <lucide_react_1.Video size={16}/> Είσοδος στην κλήση
          </button>
          <button onClick={function () { return navigate('/telehealth'); }} className="btn-secondary w-full mt-3">Πίσω στην Τηλεϊατρική</button>
        </>) : isPending ? (<>
          <lucide_react_1.Loader2 size={56} className="mx-auto text-blue-500 mb-4 animate-spin"/>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Επιβεβαίωση πληρωμής...</h1>
          <p className="text-sm text-gray-500">Περιμένουμε επιβεβαίωση από τη Viva Wallet. Μην κλείσεις αυτή τη σελίδα.</p>
        </>) : (<>
          <lucide_react_1.XCircle size={56} className="mx-auto text-red-500 mb-4"/>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Η πληρωμή δεν ολοκληρώθηκε</h1>
          <p className="text-sm text-gray-500 mb-6">Δοκίμασε ξανά ή επικοινώνησε μαζί μας αν χρεώθηκες.</p>
          <button onClick={function () { return navigate('/telehealth'); }} className="btn-primary w-full">Πίσω στην Τηλεϊατρική</button>
        </>)}
    </div>);
}
