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
exports.default = Profile;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var framer_motion_1 = require("framer-motion");
var react_i18next_1 = require("react-i18next");
var lucide_react_1 = require("lucide-react");
var auth_1 = require("@/store/auth");
var api_1 = require("@/lib/api");
var utils_1 = require("@/lib/utils");
var react_hot_toast_1 = require("react-hot-toast");
var ChangeMyPasswordCard_1 = require("@/components/ChangeMyPasswordCard");
var TIER_THRESHOLDS = { bronze: 0, silver: 1000, gold: 5000, platinum: 10000 };
var TIER_LABELS = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum' };
var TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum'];
function Profile() {
    var _this = this;
    var _a, _b;
    var t = (0, react_i18next_1.useTranslation)().t;
    var _c = (0, auth_1.useAuthStore)(), user = _c.user, updateUser = _c.updateUser, logout = _c.logout;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _d = (0, react_1.useState)(false), editing = _d[0], setEditing = _d[1];
    var _e = (0, react_1.useState)('overview'), activeTab = _e[0], setActiveTab = _e[1];
    var _f = (0, react_1.useState)(false), uploading = _f[0], setUploading = _f[1];
    var fileRef = (0, react_1.useRef)(null);
    var _g = (0, react_1.useState)({
        full_name: (user === null || user === void 0 ? void 0 : user.full_name) || '',
        bio: (user === null || user === void 0 ? void 0 : user.bio) || '',
        phone: (user === null || user === void 0 ? void 0 : user.phone) || '',
        city: (user === null || user === void 0 ? void 0 : user.city) || '',
        website: (user === null || user === void 0 ? void 0 : user.website) || '',
    }), form = _g[0], setForm = _g[1];
    var hasGoogleAuth = !!(user === null || user === void 0 ? void 0 : user.google_id);
    var _h = (0, react_query_1.useQuery)({
        queryKey: ['my-orders'],
        queryFn: function () { return api_1.api.get('/orders/my').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: !!user,
    }).data, orders = _h === void 0 ? [] : _h;
    var _j = (0, react_query_1.useQuery)({
        queryKey: ['my-bookings'],
        queryFn: function () { return api_1.api.get('/bookings/my').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: !!user,
    }).data, bookings = _j === void 0 ? [] : _j;
    var _k = (0, react_query_1.useQuery)({
        queryKey: ['my-pets'],
        queryFn: function () { return api_1.api.get('/pets').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: !!user,
    }).data, pets = _k === void 0 ? [] : _k;
    var _l = (0, react_query_1.useQuery)({
        queryKey: ['my-reviews'],
        queryFn: function () { return api_1.api.get('/reviews/my').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }).catch(function () { return []; }); },
        enabled: !!user,
    }).data, reviews = _l === void 0 ? [] : _l;
    var loyalty = (0, react_query_1.useQuery)({
        queryKey: ['my-loyalty'],
        queryFn: function () { return api_1.api.get('/loyalty').then(function (r) { var _a; return (_a = r.data) === null || _a === void 0 ? void 0 : _a.data; }); },
        enabled: !!user,
    }).data;
    var tier = (loyalty === null || loyalty === void 0 ? void 0 : loyalty.tier) || 'bronze';
    var totalPoints = (_a = loyalty === null || loyalty === void 0 ? void 0 : loyalty.total_points) !== null && _a !== void 0 ? _a : 0;
    var tierIdx = TIER_ORDER.indexOf(tier);
    var nextTier = TIER_ORDER[tierIdx + 1];
    var nextThreshold = nextTier ? TIER_THRESHOLDS[nextTier] : null;
    var saveProfile = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_1.api.put("/users/".concat(user === null || user === void 0 ? void 0 : user.id), form); },
        onSuccess: function (res) {
            updateUser(res.data);
            setEditing(false);
            react_hot_toast_1.default.success(t('profile.saved'));
        },
        onError: function () { return react_hot_toast_1.default.error(t('common.error')); },
    });
    var uploadPhoto = function (file) { return __awaiter(_this, void 0, void 0, function () {
        var fd, data, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    setUploading(true);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, 5, 6]);
                    fd = new FormData();
                    fd.append('file', file);
                    fd.append('folder', 'profiles');
                    return [4 /*yield*/, api_1.api.post('/upload?folder=profiles', fd, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        })];
                case 2:
                    data = (_b.sent()).data;
                    return [4 /*yield*/, api_1.api.put("/users/".concat(user === null || user === void 0 ? void 0 : user.id), { profile_photo: data.url })];
                case 3:
                    _b.sent();
                    updateUser(__assign(__assign({}, user), { profile_photo: data.url }));
                    react_hot_toast_1.default.success('Φωτογραφία ενημερώθηκε!');
                    return [3 /*break*/, 6];
                case 4:
                    _a = _b.sent();
                    react_hot_toast_1.default.error('Σφάλμα κατά το upload');
                    return [3 /*break*/, 6];
                case 5:
                    setUploading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var tabs = [
        { id: 'overview', label: t('profile.tabs.overview') },
        { id: 'achievements', label: t('profile.tabs.achievements') },
        { id: 'orders', label: t('profile.tabs.orders') },
        { id: 'bookings', label: t('profile.tabs.bookings') },
    ];
    // Achievements computed from real user data, not hardcoded
    var achievements = [
        { icon: '🐾', title: 'Πρώτο Κατοικίδιο', desc: 'Προσθέσατε το πρώτο σας κατοικίδιο', unlocked: pets.length >= 1 },
        { icon: '🛒', title: 'Πρώτη Αγορά', desc: 'Ολοκληρώσατε την πρώτη σας παραγγελία', unlocked: orders.length >= 1 },
        { icon: '⭐', title: 'Super Reviewer', desc: 'Γράψατε 5 κριτικές', unlocked: reviews.length >= 5 },
        { icon: '📅', title: 'Τακτικός', desc: '10 κρατήσεις υπηρεσιών', unlocked: bookings.length >= 10 },
        { icon: '🏆', title: 'Loyalty Gold', desc: 'Φτάσατε Gold επίπεδο', unlocked: tier === 'gold' || tier === 'platinum' },
        { icon: '❤️', title: 'Pet Lover', desc: 'Προσθέσατε 3 κατοικίδια', unlocked: pets.length >= 3 },
    ];
    if (!user)
        return (<div className="page-container py-16 text-center">
      <p className="text-2xl mb-3">🔒</p>
      <p className="font-semibold text-gray-900 dark:text-white mb-2">Απαιτείται σύνδεση</p>
      <a href="/login" className="btn-primary inline-block">Σύνδεση</a>
    </div>);
    return (<div className="page-container py-8 pb-24 lg:pb-8 max-w-3xl mx-auto">
      {/* Profile card */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-4">
          {/* Avatar with upload */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-brand-100 overflow-hidden flex items-center justify-center text-brand-900 font-bold text-xl">
              {user.profile_photo
            ? <img src={user.profile_photo} alt="" className="w-full h-full object-cover"/>
            : <span>{(0, utils_1.getInitials)(user.full_name || 'U')}</span>}
            </div>
            <button onClick={function () { var _a; return (_a = fileRef.current) === null || _a === void 0 ? void 0 : _a.click(); }} className="absolute -bottom-1 -right-1 w-7 h-7 bg-brand-900 text-white rounded-full flex items-center justify-center shadow-md hover:bg-brand-800 transition-colors">
              {uploading ? <span className="animate-spin text-[10px]">⟳</span> : <lucide_react_1.Camera size={13}/>}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={function (e) { var _a; var f = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0]; if (f)
        uploadPhoto(f); }}/>
          </div>

          <div className="flex-1 min-w-0">
            {editing ? (<input className="input text-lg font-bold mb-2" value={form.full_name} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { full_name: e.target.value })); }); }}/>) : (<h1 className="text-xl font-bold text-gray-900 dark:text-white">{user.full_name}</h1>)}
            <p className="text-sm text-gray-500">{user.email}</p>
            <span className="inline-block mt-1 text-xs bg-brand-50 dark:bg-brand-900/20 text-brand-900 dark:text-brand-400 px-2 py-0.5 rounded-full font-medium">
              {user.role === 'service_provider' ? '🩺 Πάροχος' : user.role === 'admin' ? '⚡ Admin' : '🐾 Ιδιοκτήτης'}
            </span>
          </div>

          <div className="flex gap-2 shrink-0">
            {editing ? (<>
                <button onClick={function () { return setEditing(false); }} className="btn-ghost p-2"><lucide_react_1.X size={16}/></button>
                <button onClick={function () { return saveProfile.mutate(); }} disabled={saveProfile.isPending} className="btn-primary px-3 py-2 text-sm flex items-center gap-1.5">
                  <lucide_react_1.Save size={14}/>{saveProfile.isPending ? t('profile.saving') : t('profile.save')}
                </button>
              </>) : (<button onClick={function () { return setEditing(true); }} className="btn-secondary px-3 py-2 text-sm flex items-center gap-1.5">
                <lucide_react_1.Edit3 size={14}/>{t('profile.edit')}
              </button>)}
          </div>
        </div>

        {/* Edit form */}
        {editing && (<framer_motion_1.motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('profile.bio')}</label>
              <textarea className="input resize-none" rows={2} placeholder="Λίγα λόγια για εσάς..." value={form.bio} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { bio: e.target.value })); }); }}/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('profile.phone')}</label>
              <input className="input" placeholder="+30 6900000000" value={form.phone} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { phone: e.target.value })); }); }}/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('profile.city')}</label>
              <input className="input" placeholder="Αθήνα" value={form.city} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { city: e.target.value })); }); }}/>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('profile.website')}</label>
              <input className="input" placeholder="https://..." value={form.website} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { website: e.target.value })); }); }}/>
            </div>
          </framer_motion_1.motion.div>)}

        {/* Info display */}
        {!editing && (<div className="mt-4 flex flex-wrap gap-3">
            {(user === null || user === void 0 ? void 0 : user.bio) && <p className="text-sm text-gray-600 dark:text-gray-400 w-full">{user.bio}</p>}
            {(user === null || user === void 0 ? void 0 : user.city) && <span className="flex items-center gap-1 text-xs text-gray-500"><lucide_react_1.MapPin size={12}/>{user.city}</span>}
            {(user === null || user === void 0 ? void 0 : user.phone) && <span className="flex items-center gap-1 text-xs text-gray-500"><lucide_react_1.Phone size={12}/>{user.phone}</span>}
            {(user === null || user === void 0 ? void 0 : user.website) && <a href={user.website} target="_blank" className="flex items-center gap-1 text-xs text-brand-900 hover:underline"><lucide_react_1.Globe size={12}/>{user.website}</a>}
          </div>)}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
            { icon: lucide_react_1.Package, label: t('profile.stats.orders'), value: orders.length },
            { icon: lucide_react_1.Calendar, label: t('profile.stats.bookings'), value: bookings.length },
            { icon: lucide_react_1.Award, label: t('profile.stats.achievements'), value: achievements.filter(function (a) { return a.unlocked; }).length },
            { icon: lucide_react_1.Star, label: t('profile.stats.points'), value: totalPoints },
        ].map(function (s, i) { return (<div key={i} className="card p-3 text-center">
            <s.icon size={16} className="mx-auto mb-1.5 text-gray-400"/>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-[11px] text-gray-500">{s.label}</p>
          </div>); })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        {tabs.map(function (tab) { return (<button key={tab.id} onClick={function () { return setActiveTab(tab.id); }} className={(0, utils_1.cn)('flex-1 text-xs font-medium py-2 rounded-lg transition-all', activeTab === tab.id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500')}>
            {tab.label}
          </button>); })}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (<div className="card p-5">
          <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">{t('loyalty.tier')} — {(_b = TIER_LABELS[tier]) !== null && _b !== void 0 ? _b : tier}</h3>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-full h-3 mb-2">
            <div className="bg-orange-500 h-3 rounded-full" style={{ width: nextThreshold ? "".concat(Math.min(100, (totalPoints / nextThreshold) * 100), "%") : '100%' }}/>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{totalPoints} {t('loyalty.points')}</span>
            <span>{nextThreshold ? "".concat(nextThreshold, " \u03B3\u03B9\u03B1 ").concat(TIER_LABELS[nextTier]) : 'Ανώτατο επίπεδο'}</span>
          </div>
        </div>)}

      {activeTab === 'achievements' && (<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {achievements.map(function (a, i) { return (<div key={i} className={(0, utils_1.cn)('card p-4 text-center', !a.unlocked && 'opacity-40')}>
              <span className="text-3xl block mb-2">{a.icon}</span>
              <p className="font-semibold text-sm text-gray-900 dark:text-white">{a.title}</p>
              <p className="text-xs text-gray-500 mt-1">{a.desc}</p>
            </div>); })}
        </div>)}

      {activeTab === 'orders' && (<div className="card p-5">
          {orders.length === 0
                ? <p className="text-center text-gray-500 py-8">{t('profile.noOrders')}</p>
                : orders.map(function (o) { return <div key={o.id} className="py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 text-sm">{o.id}</div>; })}
        </div>)}

      {activeTab === 'bookings' && (<div className="card p-5">
          {bookings.length === 0
                ? <p className="text-center text-gray-500 py-8">{t('profile.noBookings')}</p>
                : bookings.map(function (b) { return <div key={b.id} className="py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 text-sm">{b.id}</div>; })}
        </div>)}

      {/* Change Password — only for users with an actual password (not Google sign-in) */}
      {!hasGoogleAuth && (<div className="mt-6">
          <ChangeMyPasswordCard_1.default />
        </div>)}

      {/* Logout */}
      <button onClick={logout} className="w-full mt-6 flex items-center justify-center gap-2 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
        <lucide_react_1.LogOut size={16}/> {t('nav.logout')}
      </button>
    </div>);
}
