"use strict";
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
exports.default = Telehealth;
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var react_query_1 = require("@tanstack/react-query");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
var auth_1 = require("@/store/auth");
var api_1 = require("@/lib/api");
var utils_1 = require("@/lib/utils");
var ws_1 = require("@/store/ws");
var react_hot_toast_1 = require("react-hot-toast");
function Telehealth() {
    var _this = this;
    var _a;
    var navigate = (0, react_router_dom_1.useNavigate)();
    var _b = (0, auth_1.useAuthStore)(), isAuthenticated = _b.isAuthenticated, user = _b.user;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _c = (0, react_1.useState)('now'), tab = _c[0], setTab = _c[1];
    var _d = (0, react_1.useState)(null), selectedVet = _d[0], setSelectedVet = _d[1];
    var _e = (0, react_1.useState)(''), search = _e[0], setSearch = _e[1];
    var _f = (0, react_1.useState)(''), bookingDate = _f[0], setBookingDate = _f[1];
    var _g = (0, react_1.useState)(''), bookingTime = _g[0], setBookingTime = _g[1];
    var _h = (0, react_1.useState)(''), selectedPetId = _h[0], setSelectedPetId = _h[1];
    // Available now
    var _j = (0, react_query_1.useQuery)({
        queryKey: ['telehealth-available-now'],
        queryFn: function () { return api_1.api.get('/telehealth/available-now').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        refetchInterval: 30000, // re-poll every 30s
    }), _k = _j.data, availableVets = _k === void 0 ? [] : _k, loadingNow = _j.isLoading;
    // All vets for scheduled tab
    var _l = (0, react_query_1.useQuery)({
        queryKey: ['telehealth-vets'],
        queryFn: function () { return api_1.api.get('/services?service_type=veterinary&limit=24').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: tab === 'scheduled',
    }), _m = _l.data, allVets = _m === void 0 ? [] : _m, loadingAll = _l.isLoading;
    var _o = (0, react_query_1.useQuery)({
        queryKey: ['my-pets'],
        queryFn: function () { return api_1.api.get('/pets/my').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }).catch(function () { return []; }); },
        enabled: isAuthenticated,
    }).data, pets = _o === void 0 ? [] : _o;
    // Real-time availability updates via WebSocket
    var wsLastMsg = ws_1.useWsStore === null || ws_1.useWsStore === void 0 ? void 0 : (0, ws_1.useWsStore)(function (s) { return s.lastMessage; });
    (0, react_1.useEffect)(function () {
        if ((wsLastMsg === null || wsLastMsg === void 0 ? void 0 : wsLastMsg.type) === 'vet_availability_change') {
            queryClient.invalidateQueries({ queryKey: ['telehealth-available-now'] });
        }
    }, [wsLastMsg, queryClient]);
    var vets = tab === 'now' ? availableVets : allVets;
    var isLoading = tab === 'now' ? loadingNow : loadingAll;
    var filtered = vets.filter(function (v) {
        var _a, _b;
        return ((_a = v.provider_name) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(search.toLowerCase())) ||
            ((_b = v.specializations) === null || _b === void 0 ? void 0 : _b.some(function (s) { return s.toLowerCase().includes(search.toLowerCase()); }));
    });
    var bookConsultation = (0, react_query_1.useMutation)({
        mutationFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var pet, isNow, now, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!selectedVet)
                            throw new Error('Δεν επιλέχθηκε κτηνίατρος');
                        pet = pets.find(function (p) { return p.id === selectedPetId; });
                        isNow = tab === 'now';
                        now = new Date();
                        return [4 /*yield*/, api_1.api.post('/telehealth', {
                                provider_email: selectedVet.provider_email,
                                provider_name: selectedVet.provider_name,
                                service_id: selectedVet.id,
                                pet_id: selectedPetId || undefined,
                                pet_name: pet === null || pet === void 0 ? void 0 : pet.name,
                                scheduled_date: isNow ? now.toISOString().split('T')[0] : bookingDate,
                                scheduled_time: isNow ? now.toTimeString().slice(0, 5) : bookingTime,
                                duration: 30,
                                price: selectedVet.price,
                            })];
                    case 1:
                        data = (_a.sent()).data;
                        return [2 /*return*/, data];
                }
            });
        }); },
        onSuccess: function (data) {
            if (data.checkoutUrl)
                window.location.href = data.checkoutUrl;
        },
        onError: function (err) { return react_hot_toast_1.default.error((err === null || err === void 0 ? void 0 : err.message) || 'Σφάλμα κατά την κράτηση'); },
    });
    var openBooking = function (vet) {
        if (!isAuthenticated) {
            react_hot_toast_1.default.error('Συνδεθείτε για να κλείσετε ραντεβού');
            return;
        }
        setSelectedVet(vet);
        if (tab === 'scheduled') {
            var tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setBookingDate(tomorrow.toISOString().split('T')[0]);
            setBookingTime('10:00');
        }
    };
    var VetCard = function (_a) {
        var _b;
        var vet = _a.vet;
        return (<framer_motion_1.motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-semibold text-sm shrink-0">
            {(0, utils_1.getInitials)(vet.provider_name)}
          </div>
          {vet.is_available_now && (<span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"/>)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{vet.provider_name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{((_b = vet.specializations) === null || _b === void 0 ? void 0 : _b[0]) || 'Γενική Κτηνιατρική'}</p>
          <div className="flex items-center gap-1 mt-1">
            <lucide_react_1.Star size={11} className="text-yellow-500 fill-yellow-500"/>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{vet.rating || 0}</span>
            <span className="text-xs text-gray-400">({vet.reviews_count || 0})</span>
          </div>
        </div>
        {vet.is_verified && <lucide_react_1.Shield size={14} className="text-blue-500 shrink-0 mt-1.5"/>}
      </div>

      <div className="flex items-center justify-between mb-4 text-xs text-gray-500">
        {vet.is_available_now
                ? <span className="flex items-center gap-1 text-green-600 font-medium"><span className="w-1.5 h-1.5 bg-green-500 rounded-full"/>Διαθέσιμος τώρα</span>
                : <span>{vet.years_experience || 0} χρόνια εμπειρία</span>}
        <span className="font-semibold text-gray-900 dark:text-white">€{vet.price}/συνεδρία</span>
      </div>

      <button onClick={function () { return openBooking(vet); }} className={(0, utils_1.cn)('w-full flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-xl font-medium transition-all', vet.is_available_now
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-blue-600 text-white hover:bg-blue-700')}>
        {vet.is_available_now ? <><lucide_react_1.Zap size={13}/> Κάλεσε Τώρα</> : <><lucide_react_1.Calendar size={13}/> Κλείσε Ραντεβού</>}
      </button>
    </framer_motion_1.motion.div>);
    };
    return (<>
      <div className="page-container py-8 pb-24 lg:pb-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <lucide_react_1.Video size={20} className="text-blue-600 dark:text-blue-400"/>
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Τηλεϊατρική</h1>
              <p className="text-sm text-gray-500">Βιντεοκλήση με εξειδικευμένο κτηνίατρο — πληρωμή πριν τη συνεδρία</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { icon: lucide_react_1.Zap, label: 'Διαθέσιμοι τώρα', value: String(availableVets.length), color: 'text-green-600' },
            { icon: lucide_react_1.Clock, label: 'Διάρκεια', value: '30 λεπτά', color: 'text-blue-600' },
            { icon: lucide_react_1.Shield, label: 'Πληρωμή', value: 'Viva Wallet', color: 'text-orange-600' },
        ].map(function (stat, i) { return (<div key={i} className="card p-4 text-center">
              <stat.icon size={20} className={(0, utils_1.cn)('mx-auto mb-2', stat.color)}/>
              <p className="font-bold text-gray-900 dark:text-white text-sm">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>); })}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          <button onClick={function () { return setTab('now'); }} className={(0, utils_1.cn)('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all', tab === 'now' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500')}>
            <lucide_react_1.Zap size={15} className={availableVets.length > 0 ? 'text-green-500' : ''}/>
            Διαθέσιμοι Τώρα
            {availableVets.length > 0 && (<span className="bg-green-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">{availableVets.length}</span>)}
          </button>
          <button onClick={function () { return setTab('scheduled'); }} className={(0, utils_1.cn)('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all', tab === 'scheduled' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500')}>
            <lucide_react_1.Calendar size={15}/> Προγραμματισμένη
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 mb-5">
          <lucide_react_1.Search size={16} className="text-gray-400 shrink-0"/>
          <input type="text" placeholder="Αναζήτηση κτηνιάτρου..." value={search} onChange={function (e) { return setSearch(e.target.value); }} className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"/>
        </div>

        {/* Empty state for "now" tab */}
        {tab === 'now' && !isLoading && filtered.length === 0 && (<div className="text-center py-16">
            <p className="text-5xl mb-4">🩺</p>
            <p className="font-semibold text-gray-900 dark:text-white mb-1">Κανένας κτηνίατρος διαθέσιμος αυτή τη στιγμή</p>
            <p className="text-sm text-gray-500 mb-4">Η λίστα ενημερώνεται κάθε 30 δευτερόλεπτα αυτόματα</p>
            <button onClick={function () { return setTab('scheduled'); }} className="btn-primary text-sm px-5 py-2.5">
              Κλείσε Προγραμματισμένο Ραντεβού
            </button>
          </div>)}

        {/* Vet grid */}
        {(isLoading) ? (<div className="text-center py-16 text-gray-400">Φόρτωση...</div>) : (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(function (vet) { return <VetCard key={vet.id} vet={vet}/>; })}
          </div>)}

        {tab === 'scheduled' && !isLoading && filtered.length === 0 && (<div className="text-center py-16">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold text-gray-900 dark:text-white">Δεν βρέθηκαν κτηνίατροι</p>
          </div>)}
      </div>

      {/* Booking modal */}
      <framer_motion_1.AnimatePresence>
        {selectedVet && (<framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={function () { return setSelectedVet(null); }}>
            <framer_motion_1.motion.div initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} onClick={function (e) { return e.stopPropagation(); }} className="w-full max-w-md mx-auto card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">

              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold">
                      {(0, utils_1.getInitials)(selectedVet.provider_name)}
                    </div>
                    {selectedVet.is_available_now && (<span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"/>)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{selectedVet.provider_name}</p>
                    <p className="text-sm text-gray-500">{((_a = selectedVet.specializations) === null || _a === void 0 ? void 0 : _a[0]) || 'Γενική Κτηνιατρική'}</p>
                    {selectedVet.is_available_now && (<p className="text-xs text-green-600 font-medium mt-0.5">● Διαθέσιμος τώρα</p>)}
                  </div>
                </div>
                <button onClick={function () { return setSelectedVet(null); }} className="btn-ghost p-2"><lucide_react_1.X size={18}/></button>
              </div>

              {tab === 'now' ? (<div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl mb-4 flex items-center gap-3">
                  <lucide_react_1.Zap size={20} className="text-green-600 shrink-0"/>
                  <div>
                    <p className="text-sm font-semibold text-green-700 dark:text-green-400">Άμεση Κλήση</p>
                    <p className="text-xs text-green-600">Μόλις ολοκληρωθεί η πληρωμή, ο κτηνίατρος λαμβάνει ειδοποίηση και εισέρχεται στη βιντεοκλήση.</p>
                  </div>
                </div>) : (<div className="space-y-3 mb-5">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Ημερομηνία</label>
                    <input type="date" value={bookingDate} onChange={function (e) { return setBookingDate(e.target.value); }} className="input w-full text-sm" min={new Date().toISOString().split('T')[0]}/>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Ώρα</label>
                    <input type="time" value={bookingTime} onChange={function (e) { return setBookingTime(e.target.value); }} className="input w-full text-sm"/>
                  </div>
                </div>)}

              {pets.length > 0 && (<div className="mb-4">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Κατοικίδιο (προαιρετικό)</label>
                  <select value={selectedPetId} onChange={function (e) { return setSelectedPetId(e.target.value); }} className="input w-full text-sm">
                    <option value="">— Επίλεξε —</option>
                    {pets.map(function (p) { return <option key={p.id} value={p.id}>{p.name}</option>; })}
                  </select>
                </div>)}

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-4 flex items-center gap-2">
                <lucide_react_1.Lock size={13} className="text-blue-600 shrink-0"/>
                <span className="text-xs text-blue-600">Ασφαλής πληρωμή μέσω Viva Wallet. Η κλήση ξεκλειδώνει μετά την επιβεβαίωση.</span>
              </div>

              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-500">Κόστος συνεδρίας</span>
                <span className="font-bold text-lg text-gray-900 dark:text-white">€{selectedVet.price}</span>
              </div>

              <div className="flex gap-3">
                <button onClick={function () { return setSelectedVet(null); }} className="btn-secondary flex-1">Άκυρο</button>
                <button onClick={function () { return bookConsultation.mutate(); }} disabled={(tab === 'scheduled' && (!bookingDate || !bookingTime)) || bookConsultation.isPending} className={(0, utils_1.cn)('flex-1 flex items-center justify-center gap-2 rounded-xl font-semibold text-sm py-2.5 text-white transition-all disabled:opacity-50', tab === 'now' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700')}>
                  {tab === 'now' ? <lucide_react_1.Zap size={14}/> : <lucide_react_1.Lock size={14}/>}
                  {bookConsultation.isPending ? 'Επεξεργασία...' : tab === 'now' ? 'Πλήρωσε & Κάλεσε Τώρα' : 'Πλήρωσε & Κλείσε'}
                </button>
              </div>
            </framer_motion_1.motion.div>
          </framer_motion_1.motion.div>)}
      </framer_motion_1.AnimatePresence>
    </>);
}
