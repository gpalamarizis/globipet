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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminDashboard;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
var auth_1 = require("@/store/auth");
var api_1 = require("@/lib/api");
var utils_1 = require("@/lib/utils");
var react_router_dom_1 = require("react-router-dom");
var react_hot_toast_1 = require("react-hot-toast");
var ChangePasswordModal_1 = require("@/components/admin/ChangePasswordModal");
var TranslationEditor_1 = require("@/components/admin/TranslationEditor");
var ProductFormModal_1 = require("@/components/admin/ProductFormModal");
var ServiceFormModal_1 = require("@/components/admin/ServiceFormModal");
var BulkImportModal_1 = require("@/components/admin/BulkImportModal");
function StatCard(_a) {
    var Icon = _a.icon, label = _a.label, value = _a.value, change = _a.change, color = _a.color;
    return (<div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={(0, utils_1.cn)('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
          <Icon size={18} className="text-white"/>
        </div>
        {change != null && <span className={(0, utils_1.cn)('text-xs font-semibold px-2 py-0.5 rounded-full', change > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600')}>
          {change > 0 ? '+' : ''}{change}%
        </span>}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>);
}
function UsersTab() {
    var queryClient = (0, react_query_1.useQueryClient)();
    var _a = (0, react_1.useState)(''), search = _a[0], setSearch = _a[1];
    var _b = (0, react_1.useState)('all'), roleFilter = _b[0], setRoleFilter = _b[1];
    var _c = (0, react_1.useState)(false), showCreate = _c[0], setShowCreate = _c[1];
    var _d = (0, react_1.useState)(false), showPass = _d[0], setShowPass = _d[1];
    var _e = (0, react_1.useState)({ full_name: '', email: '', password: '', role: 'user' }), newUser = _e[0], setNewUser = _e[1];
    var _f = (0, react_1.useState)(null), passwordUser = _f[0], setPasswordUser = _f[1];
    var _g = (0, react_query_1.useQuery)({
        queryKey: ['admin-users'],
        queryFn: function () { return api_1.api.get('/admin/users').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }), _h = _g.data, users = _h === void 0 ? [] : _h, isLoading = _g.isLoading;
    var createUser = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_1.api.post('/admin/users', newUser); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            react_hot_toast_1.default.success('Χρήστης δημιουργήθηκε!');
            setShowCreate(false);
            setNewUser({ full_name: '', email: '', password: '', role: 'user' });
        },
        onError: function (err) { var _a, _b; return react_hot_toast_1.default.error(((_b = (_a = err.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Σφάλμα δημιουργίας'); },
    });
    var updateUser = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var id = _a.id, data = _a.data;
            return api_1.api.patch("/admin/users/".concat(id), data);
        },
        onSuccess: function () { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); react_hot_toast_1.default.success('Χρήστης ενημερώθηκε'); },
    });
    var deleteUser = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_1.api.delete("/admin/users/".concat(id)); },
        onSuccess: function () { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); react_hot_toast_1.default.success('Χρήστης διαγράφηκε'); },
    });
    var filtered = users.filter(function (u) {
        var _a, _b;
        var matchSearch = ((_a = u.full_name) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(search.toLowerCase())) || ((_b = u.email) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(search.toLowerCase()));
        var matchRole = roleFilter === 'all' || u.role === roleFilter;
        return matchSearch && matchRole;
    });
    return (<div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex items-center gap-2 flex-1 input">
          <lucide_react_1.Search size={15} className="text-gray-400 shrink-0"/>
          <input className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400" placeholder="Αναζήτηση χρήστη..." value={search} onChange={function (e) { return setSearch(e.target.value); }}/>
        </div>
        <select value={roleFilter} onChange={function (e) { return setRoleFilter(e.target.value); }} className="input text-sm">
          <option value="all">Όλοι</option>
          <option value="user">Ιδιοκτήτες</option>
          <option value="service_provider">Πάροχοι</option>
          <option value="admin">Admins</option>
        </select>
        <button onClick={function () { return setShowCreate(!showCreate); }} className="btn-primary flex items-center gap-2 text-sm shrink-0">
          <lucide_react_1.Plus size={16}/> Νέος χρήστης
        </button>
      </div>

      <framer_motion_1.AnimatePresence>
        {showCreate && (<framer_motion_1.motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card p-5 border-2 border-brand-200 dark:border-brand-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Δημιουργία νέου χρήστη</h3>
              <button onClick={function () { return setShowCreate(false); }} className="btn-ghost p-1"><lucide_react_1.X size={16}/></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Ονοματεπώνυμο</label>
                <input className="input" placeholder="Γιώργης Παπαδόπουλος" value={newUser.full_name} onChange={function (e) { return setNewUser(function (u) { return (__assign(__assign({}, u), { full_name: e.target.value })); }); }}/>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Email *</label>
                <input className="input" type="email" placeholder="user@example.com" value={newUser.email} onChange={function (e) { return setNewUser(function (u) { return (__assign(__assign({}, u), { email: e.target.value })); }); }}/>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Κωδικός *</label>
                <div className="relative">
                  <input className="input pr-10" type={showPass ? 'text' : 'password'} placeholder="Τουλάχιστον 8 χαρακτήρες" value={newUser.password} onChange={function (e) { return setNewUser(function (u) { return (__assign(__assign({}, u), { password: e.target.value })); }); }}/>
                  <button type="button" onClick={function () { return setShowPass(!showPass); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass ? <lucide_react_1.EyeOff size={15}/> : <lucide_react_1.Eye size={15}/>}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Ρόλος</label>
                <select className="input" value={newUser.role} onChange={function (e) { return setNewUser(function (u) { return (__assign(__assign({}, u), { role: e.target.value })); }); }}>
                  <option value="user">Ιδιοκτήτης</option>
                  <option value="service_provider">Πάροχος</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={function () { return setShowCreate(false); }} className="btn-secondary flex-1">Ακύρωση</button>
              <button onClick={function () { return createUser.mutate(); }} disabled={!newUser.email || !newUser.password || createUser.isPending} className="btn-primary flex-1">
                {createUser.isPending ? 'Δημιουργία...' : 'Δημιουργία χρήστη'}
              </button>
            </div>
          </framer_motion_1.motion.div>)}
      </framer_motion_1.AnimatePresence>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Χρήστης</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Ρόλος</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Εγγραφή</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Ενέργειες</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? ([1, 2, 3, 4, 5].map(function (i) { return (<tr key={i}><td colSpan={4} className="px-4 py-3"><div className="skeleton h-8 w-full"/></td></tr>); })) : filtered.length === 0 ? (<tr><td colSpan={4} className="text-center py-12 text-gray-400">
                {users.length === 0 ? 'Δεν βρέθηκαν χρήστες' : 'Δεν βρέθηκαν αποτελέσματα'}
              </td></tr>) : filtered.map(function (u) { return (<tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 overflow-hidden flex items-center justify-center text-brand-900 font-semibold text-xs shrink-0">
                      {u.profile_photo
                ? <img src={u.profile_photo} alt="" className="w-full h-full object-cover"/>
                : (0, utils_1.getInitials)(u.full_name || u.email || 'U')}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{u.full_name || '—'}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select value={u.role} onChange={function (e) { return updateUser.mutate({ id: u.id, data: { role: e.target.value } }); }} className={(0, utils_1.cn)('text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer', u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                u.role === 'service_provider' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700')}>
                    <option value="user">Ιδιοκτήτης</option>
                    <option value="service_provider">Πάροχος</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('el-GR') : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={function () { return setPasswordUser(u); }} title="Αλλαγή κωδικού" className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                      <lucide_react_1.Key size={14} className="text-blue-500"/>
                    </button>
                    <button onClick={function () { if (confirm("\u0394\u03B9\u03B1\u03B3\u03C1\u03B1\u03C6\u03AE \u03C7\u03C1\u03AE\u03C3\u03C4\u03B7 ".concat(u.email, ";")))
            deleteUser.mutate(u.id); }} title="Διαγραφή χρήστη" className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <lucide_react_1.Trash2 size={14} className="text-red-500"/>
                    </button>
                  </div>
                </td>
              </tr>); })}
          </tbody>
        </table>
        {filtered.length > 0 && (<div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500">{filtered.length} χρήστες</p>
          </div>)}
      </div>

      <ChangePasswordModal_1.default user={passwordUser} onClose={function () { return setPasswordUser(null); }}/>
    </div>);
}
function ProvidersTab() {
    var queryClient = (0, react_query_1.useQueryClient)();
    var _a = (0, react_query_1.useQuery)({
        queryKey: ['admin-providers'],
        queryFn: function () { return api_1.api.get('/admin/users?role=service_provider').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }), _b = _a.data, providers = _b === void 0 ? [] : _b, isLoading = _a.isLoading;
    var verifyProvider = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var id = _a.id, verified = _a.verified;
            return api_1.api.patch("/admin/users/".concat(id), { is_verified: verified });
        },
        onSuccess: function () { queryClient.invalidateQueries({ queryKey: ['admin-providers'] }); react_hot_toast_1.default.success('Πάροχος ενημερώθηκε'); },
    });
    return (<div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Πάροχος</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Επαλήθευση</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Ενέργειες</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {isLoading ? [1, 2, 3].map(function (i) { return <tr key={i}><td colSpan={3} className="px-4 py-3"><div className="skeleton h-8 w-full"/></td></tr>; })
            : providers.length === 0 ? <tr><td colSpan={3} className="text-center py-12 text-gray-400">Δεν βρέθηκαν πάροχοι</td></tr>
                : providers.map(function (p) { return (<tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs">
                    {(0, utils_1.getInitials)(p.full_name || 'P')}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{p.full_name}</p>
                    <p className="text-xs text-gray-500">{p.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={(0, utils_1.cn)('text-xs px-2 py-0.5 rounded-full font-medium', p.is_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                  {p.is_verified ? '✓ Επαληθευμένος' : '⏳ Εκκρεμεί'}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <button onClick={function () { return verifyProvider.mutate({ id: p.id, verified: !p.is_verified }); }} className={(0, utils_1.cn)('text-xs px-3 py-1.5 rounded-lg font-medium transition-all', p.is_verified ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100')}>
                  {p.is_verified ? 'Αφαίρεση' : 'Επαλήθευση'}
                </button>
              </td>
            </tr>); })}
        </tbody>
      </table>
    </div>);
}
function ProductsTab() {
    var queryClient = (0, react_query_1.useQueryClient)();
    var _a = (0, react_1.useState)(''), search = _a[0], setSearch = _a[1];
    var _b = (0, react_1.useState)(null), translateProduct = _b[0], setTranslateProduct = _b[1];
    var _c = (0, react_1.useState)(null), editProduct = _c[0], setEditProduct = _c[1];
    var _d = (0, react_1.useState)(false), newProductOpen = _d[0], setNewProductOpen = _d[1];
    var _e = (0, react_1.useState)(false), bulkOpen = _e[0], setBulkOpen = _e[1];
    var _f = (0, react_query_1.useQuery)({
        queryKey: ['admin-products'],
        queryFn: function () { return api_1.api.get('/products?limit=50').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }), _g = _f.data, products = _g === void 0 ? [] : _g, isLoading = _f.isLoading;
    var deleteProduct = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_1.api.delete("/products/".concat(id)); },
        onSuccess: function () { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); react_hot_toast_1.default.success('Προϊόν διαγράφηκε'); },
    });
    var saveTranslations = (0, react_query_1.useMutation)({
        mutationFn: function (vars) { return api_1.api.patch("/products/".concat(vars.id), {
            name_translations: vars.translations.name,
            description_translations: vars.translations.description,
        }); },
        onSuccess: function () { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); react_hot_toast_1.default.success('Οι μεταφράσεις αποθηκεύτηκαν'); },
    });
    var filtered = products.filter(function (p) { var _a; return (_a = p.name) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(search.toLowerCase()); });
    return (<div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 input flex-1">
          <lucide_react_1.Search size={15} className="text-gray-400 shrink-0"/>
          <input className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400" placeholder="Αναζήτηση προϊόντος..." value={search} onChange={function (e) { return setSearch(e.target.value); }}/>
        </div>
        <button onClick={function () { return setBulkOpen(true); }} className="btn-secondary flex items-center gap-1.5 text-sm whitespace-nowrap">
          <lucide_react_1.FileSpreadsheet size={14}/> Excel Import
        </button>
        <button onClick={function () { return setNewProductOpen(true); }} className="btn-primary flex items-center gap-1.5 text-sm whitespace-nowrap">
          <lucide_react_1.Plus size={14}/> Νέο Προϊόν
        </button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Προϊόν</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Κατηγορία</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Τιμή</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Ενέργειες</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? [1, 2, 3].map(function (i) { return <tr key={i}><td colSpan={4} className="px-4 py-3"><div className="skeleton h-8 w-full"/></td></tr>; })
            : filtered.length === 0 ? <tr><td colSpan={4} className="text-center py-12 text-gray-400">Δεν βρέθηκαν προϊόντα</td></tr>
                : filtered.map(function (p) { return (<tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">📦</div>
                    <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{p.category}</td>
                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">€{p.price}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={function () { return setEditProduct(p); }} title="Επεξεργασία" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><lucide_react_1.Edit2 size={14} className="text-gray-600"/></button>
                    <button onClick={function () { return setTranslateProduct(p); }} title="Μεταφράσεις" className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"><lucide_react_1.Globe size={14} className="text-blue-500"/></button>
                    <button onClick={function () { if (confirm('Διαγραφή προϊόντος;'))
                    deleteProduct.mutate(p.id); }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><lucide_react_1.Trash2 size={14} className="text-red-500"/></button>
                  </div>
                </td>
              </tr>); })}
          </tbody>
        </table>
      </div>

      <TranslationEditor_1.default open={!!translateProduct} onClose={function () { return setTranslateProduct(null); }} title={"\u039C\u03B5\u03C4\u03B1\u03C6\u03C1\u03AC\u03C3\u03B5\u03B9\u03C2: ".concat((translateProduct === null || translateProduct === void 0 ? void 0 : translateProduct.name) || '')} defaultName={translateProduct === null || translateProduct === void 0 ? void 0 : translateProduct.name} defaultDescription={translateProduct === null || translateProduct === void 0 ? void 0 : translateProduct.description} initialName={translateProduct === null || translateProduct === void 0 ? void 0 : translateProduct.name_translations} initialDescription={translateProduct === null || translateProduct === void 0 ? void 0 : translateProduct.description_translations} onSave={function (t) { return translateProduct && saveTranslations.mutate({ id: translateProduct.id, translations: t }); }}/>

      <ProductFormModal_1.default open={newProductOpen} onClose={function () { return setNewProductOpen(false); }}/>
      <ProductFormModal_1.default open={!!editProduct} onClose={function () { return setEditProduct(null); }} product={editProduct}/>
      <BulkImportModal_1.default open={bulkOpen} onClose={function () { return setBulkOpen(false); }} type="products"/>
    </div>);
}
function ServicesTab() {
    var queryClient = (0, react_query_1.useQueryClient)();
    var _a = (0, react_1.useState)(''), search = _a[0], setSearch = _a[1];
    var _b = (0, react_1.useState)(null), translateService = _b[0], setTranslateService = _b[1];
    var _c = (0, react_1.useState)(null), editService = _c[0], setEditService = _c[1];
    var _d = (0, react_1.useState)(false), newServiceOpen = _d[0], setNewServiceOpen = _d[1];
    var _e = (0, react_1.useState)(false), bulkOpen = _e[0], setBulkOpen = _e[1];
    var _f = (0, react_query_1.useQuery)({
        queryKey: ['admin-services'],
        queryFn: function () { return api_1.api.get('/services?limit=50').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }), _g = _f.data, services = _g === void 0 ? [] : _g, isLoading = _f.isLoading;
    var deleteService = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_1.api.delete("/services/".concat(id)); },
        onSuccess: function () { queryClient.invalidateQueries({ queryKey: ['admin-services'] }); react_hot_toast_1.default.success('Υπηρεσία διαγράφηκε'); },
    });
    var saveTranslations = (0, react_query_1.useMutation)({
        mutationFn: function (vars) { return api_1.api.patch("/services/".concat(vars.id), {
            provider_name_translations: vars.translations.name,
            description_translations: vars.translations.description,
        }); },
        onSuccess: function () { queryClient.invalidateQueries({ queryKey: ['admin-services'] }); react_hot_toast_1.default.success('Οι μεταφράσεις αποθηκεύτηκαν'); },
    });
    var filtered = services.filter(function (s) {
        var _a, _b;
        return ((_a = s.provider_name) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(search.toLowerCase())) ||
            ((_b = s.service_type) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(search.toLowerCase()));
    });
    return (<div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 input flex-1">
          <lucide_react_1.Search size={15} className="text-gray-400 shrink-0"/>
          <input className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400" placeholder="Αναζήτηση υπηρεσίας..." value={search} onChange={function (e) { return setSearch(e.target.value); }}/>
        </div>
        <button onClick={function () { return setBulkOpen(true); }} className="btn-secondary flex items-center gap-1.5 text-sm whitespace-nowrap">
          <lucide_react_1.FileSpreadsheet size={14}/> Excel Import
        </button>
        <button onClick={function () { return setNewServiceOpen(true); }} className="btn-primary flex items-center gap-1.5 text-sm whitespace-nowrap">
          <lucide_react_1.Plus size={14}/> Νέα Υπηρεσία
        </button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Πάροχος</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Τύπος</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Πόλη</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Τιμή</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Ενέργειες</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? [1, 2, 3].map(function (i) { return <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="skeleton h-8 w-full"/></td></tr>; })
            : filtered.length === 0 ? <tr><td colSpan={5} className="text-center py-12 text-gray-400">Δεν βρέθηκαν υπηρεσίες</td></tr>
                : filtered.map(function (s) { return (<tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">🩺</div>
                    <span className="font-medium text-gray-900 dark:text-white">{s.provider_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{s.service_type}</td>
                <td className="px-4 py-3 text-gray-500">{s.city}</td>
                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">€{s.price}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={function () { return setEditService(s); }} title="Επεξεργασία" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><lucide_react_1.Edit2 size={14} className="text-gray-600"/></button>
                    <button onClick={function () { return setTranslateService(s); }} title="Μεταφράσεις" className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"><lucide_react_1.Globe size={14} className="text-blue-500"/></button>
                    <button onClick={function () { if (confirm('Διαγραφή υπηρεσίας;'))
                    deleteService.mutate(s.id); }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><lucide_react_1.Trash2 size={14} className="text-red-500"/></button>
                  </div>
                </td>
              </tr>); })}
          </tbody>
        </table>
      </div>

      <TranslationEditor_1.default open={!!translateService} onClose={function () { return setTranslateService(null); }} title={"\u039C\u03B5\u03C4\u03B1\u03C6\u03C1\u03AC\u03C3\u03B5\u03B9\u03C2: ".concat((translateService === null || translateService === void 0 ? void 0 : translateService.provider_name) || '')} defaultName={translateService === null || translateService === void 0 ? void 0 : translateService.provider_name} defaultDescription={translateService === null || translateService === void 0 ? void 0 : translateService.description} initialName={translateService === null || translateService === void 0 ? void 0 : translateService.provider_name_translations} initialDescription={translateService === null || translateService === void 0 ? void 0 : translateService.description_translations} onSave={function (t) { return translateService && saveTranslations.mutate({ id: translateService.id, translations: t }); }}/>

      <ServiceFormModal_1.default open={newServiceOpen} onClose={function () { return setNewServiceOpen(false); }}/>
      <ServiceFormModal_1.default open={!!editService} onClose={function () { return setEditService(null); }} service={editService}/>
      <BulkImportModal_1.default open={bulkOpen} onClose={function () { return setBulkOpen(false); }} type="services"/>
    </div>);
}
function OrdersTab() {
    var _a = (0, react_1.useState)('all'), statusFilter = _a[0], setStatusFilter = _a[1];
    var _b = (0, react_query_1.useQuery)({
        queryKey: ['admin-orders'],
        queryFn: function () { return api_1.api.get('/orders?limit=50').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }), _c = _b.data, orders = _c === void 0 ? [] : _c, isLoading = _b.isLoading;
    var filtered = orders.filter(function (o) { return statusFilter === 'all' || o.status === statusFilter; });
    return (<div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(function (s) { return (<button key={s} onClick={function () { return setStatusFilter(s); }} className={(0, utils_1.cn)('text-xs px-3 py-1.5 rounded-full font-medium transition-all', statusFilter === s ? 'bg-brand-900 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600')}>
            {s === 'all' ? 'Όλες' : s === 'pending' ? 'Εκκρεμείς' : s === 'confirmed' ? 'Επιβεβ.' : s === 'shipped' ? 'Αποστολή' : s === 'delivered' ? 'Παράδοση' : 'Ακυρ.'}
          </button>); })}
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">ID</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Σύνολο</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Κατάσταση</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Ημερομηνία</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? [1, 2, 3].map(function (i) { return <tr key={i}><td colSpan={4} className="px-4 py-3"><div className="skeleton h-8 w-full"/></td></tr>; })
            : filtered.length === 0 ? <tr><td colSpan={4} className="text-center py-12 text-gray-400">Δεν βρέθηκαν παραγγελίες</td></tr>
                : filtered.map(function (o) {
                    var _a, _b;
                    return (<tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">#{(_a = o.id) === null || _a === void 0 ? void 0 : _a.slice(0, 8)}</td>
                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">€{((_b = o.total_amount) === null || _b === void 0 ? void 0 : _b.toFixed(2)) || '—'}</td>
                <td className="px-4 py-3">
                  <span className={(0, utils_1.cn)('text-xs px-2 py-0.5 rounded-full font-medium', o.status === 'delivered' ? 'bg-green-100 text-green-700' :
                            o.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                o.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                                    'bg-yellow-100 text-yellow-700')}>
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{o.created_at ? new Date(o.created_at).toLocaleDateString('el-GR') : '—'}</td>
              </tr>);
                })}
          </tbody>
        </table>
      </div>
    </div>);
}
function DatabaseTab() {
    var _this = this;
    var _a, _b, _c, _d;
    var _e = (0, react_1.useState)("SELECT id, full_name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 20;"), query = _e[0], setQuery = _e[1];
    var _f = (0, react_1.useState)(null), result = _f[0], setResult = _f[1];
    var _g = (0, react_1.useState)(false), loading = _g[0], setLoading = _g[1];
    var _h = (0, react_1.useState)(''), error = _h[0], setError = _h[1];
    var runQuery = function () { return __awaiter(_this, void 0, void 0, function () {
        var data, err_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!query.trim())
                        return [2 /*return*/];
                    setLoading(true);
                    setError('');
                    setResult(null);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, api_1.api.post('/admin/query', { sql: query })];
                case 2:
                    data = (_c.sent()).data;
                    setResult(data);
                    return [3 /*break*/, 5];
                case 3:
                    err_1 = _c.sent();
                    setError(((_b = (_a = err_1.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Σφάλμα εκτέλεσης query');
                    return [3 /*break*/, 5];
                case 4:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var quickQueries = [
        { label: 'Χρήστες', sql: "SELECT id, full_name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 20;" },
        { label: 'Παραγγελίες', sql: "SELECT id, total_amount, status, created_at FROM orders ORDER BY created_at DESC LIMIT 20;" },
        { label: 'Κατοικίδια', sql: "SELECT id, name, species, breed FROM pets ORDER BY created_at DESC LIMIT 20;" },
        { label: 'Πίνακες', sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" },
    ];
    return (<div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <lucide_react_1.AlertTriangle size={14} className="text-orange-500"/>
          <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Προσοχή: Μόνο για διαχειριστές. Τα DELETE/DROP queries είναι μη αναστρέψιμα.</p>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {quickQueries.map(function (q) { return (<button key={q.label} onClick={function () { return setQuery(q.sql); }} className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition-colors">
              {q.label}
            </button>); })}
        </div>
        <textarea value={query} onChange={function (e) { return setQuery(e.target.value); }} rows={4} className="w-full font-mono text-sm bg-gray-900 text-green-400 p-4 rounded-xl resize-none outline-none border border-gray-700" placeholder="SELECT * FROM ..."/>
        <div className="flex justify-end mt-2">
          <button onClick={runQuery} disabled={loading} className="btn-primary flex items-center gap-2 text-sm">
            <lucide_react_1.Play size={14}/> {loading ? 'Εκτέλεση...' : 'Εκτέλεση Query'}
          </button>
        </div>
      </div>

      {error && <div className="card p-4 bg-red-50 dark:bg-red-900/20 border-red-200"><p className="text-sm text-red-600 font-mono">{error}</p></div>}

      {result && (<div className="card overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex justify-between">
            <span className="text-xs font-medium text-gray-500">{(_c = (_a = result.rowCount) !== null && _a !== void 0 ? _a : (_b = result.rows) === null || _b === void 0 ? void 0 : _b.length) !== null && _c !== void 0 ? _c : 0} αποτελέσματα</span>
            <span className="text-xs text-gray-400">{result.duration}ms</span>
          </div>
          {((_d = result.rows) === null || _d === void 0 ? void 0 : _d.length) > 0 ? (<div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>{Object.keys(result.rows[0]).map(function (k) { return <th key={k} className="text-left px-3 py-2 font-medium text-gray-500">{k}</th>; })}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono">
                  {result.rows.map(function (row, i) { return (<tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      {Object.values(row).map(function (v, j) { return (<td key={j} className="px-3 py-2 text-gray-700 dark:text-gray-300 max-w-xs truncate">
                          {v === null ? <span className="text-gray-400">NULL</span> : String(v)}
                        </td>); })}
                    </tr>); })}
                </tbody>
              </table>
            </div>) : <p className="text-center py-8 text-gray-400 text-sm">Δεν επιστράφηκαν δεδομένα</p>}
        </div>)}
    </div>);
}
var TIER_LABELS = {
    basic: 'Βασικό', standard: 'Standard', premium: 'Premium', comprehensive: 'Ολοκληρωμένο'
};
function InsuranceTab() {
    var _this = this;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _a = (0, react_1.useState)(false), showProviderModal = _a[0], setShowProviderModal = _a[1];
    var _b = (0, react_1.useState)(false), showPlanModal = _b[0], setShowPlanModal = _b[1];
    var _c = (0, react_1.useState)(null), editingProvider = _c[0], setEditingProvider = _c[1];
    var _d = (0, react_1.useState)(null), editingPlan = _d[0], setEditingPlan = _d[1];
    var _e = (0, react_1.useState)(null), expandedProvider = _e[0], setExpandedProvider = _e[1];
    var _f = (0, react_1.useState)(false), importing = _f[0], setImporting = _f[1];
    var _g = (0, react_query_1.useQuery)({
        queryKey: ['admin-insurance-providers'],
        queryFn: function () { return api_1.api.get('/insurance/providers').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }), _h = _g.data, providers = _h === void 0 ? [] : _h, isLoading = _g.isLoading;
    var deleteProvider = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_1.api.delete("/admin/insurance/providers/".concat(id)); },
        onSuccess: function () { queryClient.invalidateQueries({ queryKey: ['admin-insurance-providers'] }); react_hot_toast_1.default.success('Διαγράφηκε'); },
        onError: function () { return react_hot_toast_1.default.error('Σφάλμα διαγραφής'); },
    });
    var deletePlan = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_1.api.delete("/admin/insurance/plans/".concat(id)); },
        onSuccess: function () { queryClient.invalidateQueries({ queryKey: ['admin-insurance-providers'] }); react_hot_toast_1.default.success('Διαγράφηκε'); },
        onError: function () { return react_hot_toast_1.default.error('Σφάλμα διαγραφής'); },
    });
    var handleBulkImport = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var file, XLSX, data, wb, providersSheet, plansSheet, providers_1, plans, result, _a, providers_created, plans_created, errors, err_2;
        var _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    file = (_b = e.target.files) === null || _b === void 0 ? void 0 : _b[0];
                    if (!file)
                        return [2 /*return*/];
                    setImporting(true);
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 5, 6, 7]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('xlsx'); })];
                case 2:
                    XLSX = _e.sent();
                    return [4 /*yield*/, file.arrayBuffer()];
                case 3:
                    data = _e.sent();
                    wb = XLSX.read(data);
                    providersSheet = wb.Sheets['Insurance Providers'];
                    plansSheet = wb.Sheets['Insurance Plans'];
                    providers_1 = providersSheet
                        ? XLSX.utils.sheet_to_json(providersSheet, { range: 4 }).filter(function (r) { return r['name *'] || r.name; })
                            .map(function (r) { return ({ name: r['name *'] || r.name, name_el: r.name_el, website: r.website, phone: r.phone, email: r.email, description: r.description, logo_url: r.logo_url, display_order: r.display_order }); })
                        : [];
                    plans = plansSheet
                        ? XLSX.utils.sheet_to_json(plansSheet, { range: 4 }).filter(function (r) { return r['provider_name *'] || r.provider_name; })
                            .map(function (r) { return ({ provider_name: r['provider_name *'] || r.provider_name, plan_name: r['plan_name *'] || r.plan_name, plan_name_el: r.plan_name_el, tier: r['tier *'] || r.tier, price_monthly: r['price_monthly *'] || r.price_monthly, price_annual: r.price_annual, covers_accidents: r['covers_accidents *'] || r.covers_accidents, covers_illness: r['covers_illness *'] || r.covers_illness, covers_surgery: r.covers_surgery, covers_dental: r.covers_dental, covers_preventive: r.covers_preventive, covers_liability: r.covers_liability, covers_death: r.covers_death, annual_limit: r.annual_limit, deductible: r.deductible, reimbursement_pct: r.reimbursement_pct, waiting_days: r.waiting_days, pet_types: r.pet_types }); })
                        : [];
                    return [4 /*yield*/, api_1.api.post('/insurance/bulk-import', { providers: providers_1, plans: plans })];
                case 4:
                    result = _e.sent();
                    _a = result.data, providers_created = _a.providers_created, plans_created = _a.plans_created, errors = _a.errors;
                    react_hot_toast_1.default.success("\u2705 ".concat(providers_created, " \u03B5\u03C4\u03B1\u03B9\u03C1\u03B5\u03AF\u03B5\u03C2, ").concat(plans_created, " \u03C0\u03BB\u03AC\u03BD\u03B1 \u03B5\u03B9\u03C3\u03AE\u03C7\u03B8\u03B7\u03C3\u03B1\u03BD"));
                    if ((errors === null || errors === void 0 ? void 0 : errors.length) > 0)
                        react_hot_toast_1.default.error("\u26A0\uFE0F ".concat(errors.length, " \u03C3\u03C6\u03AC\u03BB\u03BC\u03B1\u03C4\u03B1"));
                    queryClient.invalidateQueries({ queryKey: ['admin-insurance-providers'] });
                    return [3 /*break*/, 7];
                case 5:
                    err_2 = _e.sent();
                    react_hot_toast_1.default.error(((_d = (_c = err_2.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) || 'Σφάλμα κατά την εισαγωγή');
                    return [3 /*break*/, 7];
                case 6:
                    setImporting(false);
                    e.target.value = '';
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    }); };
    return (<div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Ασφαλιστικές Εταιρείες</h2>
          <p className="text-sm text-gray-500">Διαχείριση ασφαλιστικών εταιρειών και πλάνων</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/templates/GlobiPet_Insurance_Import_Template.xlsx" download className="btn-secondary flex items-center gap-2 text-sm">
            <lucide_react_1.Download size={15}/> Template
          </a>
          <label className={"btn-secondary flex items-center gap-2 text-sm cursor-pointer ".concat(importing ? 'opacity-50' : '')}>
            <lucide_react_1.Upload size={15}/> {importing ? 'Εισαγωγή...' : 'Bulk Import'}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleBulkImport} disabled={importing}/>
          </label>
          <button onClick={function () { setEditingProvider(null); setShowProviderModal(true); }} className="btn-primary flex items-center gap-2 text-sm">
            <lucide_react_1.Plus size={15}/> Νέα Εταιρεία
          </button>
        </div>
      </div>

      {isLoading ? (<div className="space-y-3">{[1, 2, 3].map(function (i) { return <div key={i} className="skeleton h-16 w-full"/>; })}</div>) : providers.length === 0 ? (<div className="card p-12 text-center">
          <lucide_react_1.Shield size={40} className="mx-auto text-gray-300 mb-3"/>
          <p className="font-semibold text-gray-900 dark:text-white mb-2">Δεν υπάρχουν ασφαλιστικές εταιρείες</p>
          <button onClick={function () { setEditingProvider(null); setShowProviderModal(true); }} className="btn-primary inline-flex items-center gap-2 mt-2">
            <lucide_react_1.Plus size={15}/> Προσθήκη
          </button>
        </div>) : (<div className="space-y-3">
          {providers.map(function (provider) {
                var _a, _b;
                return (<div key={provider.id} className="card overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <button onClick={function () { return setExpandedProvider(expandedProvider === provider.id ? null : provider.id); }} className="flex items-center gap-3 flex-1 text-left">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                    <lucide_react_1.Shield size={18} className="text-brand-900"/>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{provider.name_el || provider.name}</p>
                    <p className="text-xs text-gray-500">{((_a = provider.plans) === null || _a === void 0 ? void 0 : _a.length) || 0} πλάνα</p>
                  </div>
                  {expandedProvider === provider.id ? <lucide_react_1.ChevronDown size={16} className="text-gray-400 ml-auto"/> : <lucide_react_1.ChevronRight size={16} className="text-gray-400 ml-auto"/>}
                </button>
                <div className="flex items-center gap-1">
                  <button onClick={function () { setEditingPlan({ provider_id: provider.id }); setShowPlanModal(true); }} className="btn-ghost p-1.5 text-xs flex items-center gap-1 text-brand-900">
                    <lucide_react_1.Plus size={13}/> Πλάνο
                  </button>
                  <button onClick={function () { setEditingProvider(provider); setShowProviderModal(true); }} className="btn-ghost p-1.5">
                    <lucide_react_1.Edit2 size={14} className="text-gray-500"/>
                  </button>
                  <button onClick={function () { if (confirm("\u0394\u03B9\u03B1\u03B3\u03C1\u03B1\u03C6\u03AE \"".concat(provider.name, "\";")))
                    deleteProvider.mutate(provider.id); }} className="btn-ghost p-1.5">
                    <lucide_react_1.Trash2 size={14} className="text-red-500"/>
                  </button>
                </div>
              </div>
              <framer_motion_1.AnimatePresence>
                {expandedProvider === provider.id && ((_b = provider.plans) === null || _b === void 0 ? void 0 : _b.length) > 0 && (<framer_motion_1.motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-gray-100 dark:border-gray-800">
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {provider.plans.map(function (plan) { return (<div key={plan.id} className={(0, utils_1.cn)('flex items-center gap-3 px-4 py-3', !plan.is_active && 'opacity-50')}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{plan.name_el || plan.name}</p>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-900 font-medium">{TIER_LABELS[plan.tier] || plan.tier}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">€{plan.price_monthly}/μήνα</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={function () { setEditingPlan(plan); setShowPlanModal(true); }} className="btn-ghost p-1.5">
                              <lucide_react_1.Edit2 size={13} className="text-gray-500"/>
                            </button>
                            <button onClick={function () { if (confirm("\u0394\u03B9\u03B1\u03B3\u03C1\u03B1\u03C6\u03AE \"".concat(plan.name, "\";")))
                            deletePlan.mutate(plan.id); }} className="btn-ghost p-1.5">
                              <lucide_react_1.Trash2 size={13} className="text-red-500"/>
                            </button>
                          </div>
                        </div>); })}
                    </div>
                  </framer_motion_1.motion.div>)}
              </framer_motion_1.AnimatePresence>
            </div>);
            })}
        </div>)}

      <InsuranceProviderModal open={showProviderModal} onClose={function () { setShowProviderModal(false); setEditingProvider(null); }} editing={editingProvider} onSaved={function () { queryClient.invalidateQueries({ queryKey: ['admin-insurance-providers'] }); setShowProviderModal(false); setEditingProvider(null); }}/>
      <InsurancePlanModal open={showPlanModal} onClose={function () { setShowPlanModal(false); setEditingPlan(null); }} editing={editingPlan} onSaved={function () { queryClient.invalidateQueries({ queryKey: ['admin-insurance-providers'] }); setShowPlanModal(false); setEditingPlan(null); }}/>
    </div>);
}
function InsuranceProviderModal(_a) {
    var open = _a.open, onClose = _a.onClose, editing = _a.editing, onSaved = _a.onSaved;
    var _b = (0, react_1.useState)({}), form = _b[0], setForm = _b[1];
    (0, react_1.useEffect)(function () {
        if (open)
            setForm(editing ? __assign({}, editing) : { name: '', name_el: '', website: '', phone: '', email: '', description: '', is_active: true });
    }, [open, editing]);
    var saveMutation = (0, react_query_1.useMutation)({
        mutationFn: function () { return editing ? api_1.api.patch("/admin/insurance/providers/".concat(editing.id), form) : api_1.api.post('/admin/insurance/providers', form); },
        onSuccess: function () { react_hot_toast_1.default.success(editing ? 'Ενημερώθηκε' : 'Προστέθηκε'); onSaved(); },
        onError: function () { return react_hot_toast_1.default.error('Σφάλμα'); },
    });
    if (!open)
        return null;
    return (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-modal max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={function (e) { return e.stopPropagation(); }}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold">{editing ? 'Επεξεργασία Εταιρείας' : 'Νέα Εταιρεία'}</h3>
          <button onClick={onClose} className="btn-ghost p-2"><lucide_react_1.X size={18}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {[['name', 'Όνομα (EN) *'], ['name_el', 'Όνομα (ΕΛ)'], ['website', 'Website'], ['phone', 'Τηλέφωνο'], ['email', 'Email'], ['logo_url', 'Logo URL']].map(function (_a) {
            var key = _a[0], label = _a[1];
            return (<div key={key}>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
              <input className="input" value={form[key] || ''} onChange={function (e) {
                var _a;
                return setForm(__assign(__assign({}, form), (_a = {}, _a[key] = e.target.value, _a)));
            }}/>
            </div>);
        })}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Περιγραφή</label>
            <textarea rows={3} className="input" value={form.description || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { description: e.target.value })); }}/>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.is_active} onChange={function (e) { return setForm(__assign(__assign({}, form), { is_active: e.target.checked })); }}/> Ενεργή</label>
        </div>
        <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">Άκυρο</button>
          <button onClick={function () { return saveMutation.mutate(); }} disabled={saveMutation.isPending || !form.name} className="btn-primary">
            {saveMutation.isPending ? 'Αποθήκευση...' : (editing ? 'Ενημέρωση' : 'Προσθήκη')}
          </button>
        </div>
      </div>
    </div>);
}
function InsurancePlanModal(_a) {
    var open = _a.open, onClose = _a.onClose, editing = _a.editing, onSaved = _a.onSaved;
    var _b = (0, react_1.useState)({}), form = _b[0], setForm = _b[1];
    var _c = (0, react_query_1.useQuery)({
        queryKey: ['admin-insurance-providers'],
        queryFn: function () { return api_1.api.get('/insurance/providers').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }).data, providers = _c === void 0 ? [] : _c;
    (0, react_1.useEffect)(function () {
        if (open)
            setForm(editing ? __assign(__assign({}, editing), { pet_types: editing.pet_types || [] }) : {
                provider_id: '', name: '', name_el: '', tier: 'basic', price_monthly: '',
                covers_accidents: true, covers_illness: true, covers_surgery: false, covers_dental: false,
                covers_preventive: false, covers_liability: false, covers_death: false,
                pet_types: [], is_active: true, is_featured: false,
            });
    }, [open, editing]);
    var saveMutation = (0, react_query_1.useMutation)({
        mutationFn: function () { return (editing === null || editing === void 0 ? void 0 : editing.id) ? api_1.api.patch("/admin/insurance/plans/".concat(editing.id), form) : api_1.api.post('/admin/insurance/plans', form); },
        onSuccess: function () { react_hot_toast_1.default.success((editing === null || editing === void 0 ? void 0 : editing.id) ? 'Ενημερώθηκε' : 'Προστέθηκε'); onSaved(); },
        onError: function (e) { var _a, _b; return react_hot_toast_1.default.error(((_b = (_a = e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Σφάλμα'); },
    });
    var togglePetType = function (type) {
        var types = form.pet_types || [];
        setForm(__assign(__assign({}, form), { pet_types: types.includes(type) ? types.filter(function (t) { return t !== type; }) : __spreadArray(__spreadArray([], types, true), [type], false) }));
    };
    if (!open)
        return null;
    return (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-modal max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={function (e) { return e.stopPropagation(); }}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold">{(editing === null || editing === void 0 ? void 0 : editing.id) ? 'Επεξεργασία Πλάνου' : 'Νέο Πλάνο'}</h3>
          <button onClick={onClose} className="btn-ghost p-2"><lucide_react_1.X size={18}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Εταιρεία *</label>
            <select className="input" value={form.provider_id || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { provider_id: e.target.value })); }}>
              <option value="">Επιλέξτε εταιρεία</option>
              {providers.map(function (p) { return <option key={p.id} value={p.id}>{p.name_el || p.name}</option>; })}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-gray-500 mb-1 block">Όνομα (EN) *</label><input className="input" value={form.name || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { name: e.target.value })); }}/></div>
            <div><label className="text-xs font-medium text-gray-500 mb-1 block">Όνομα (ΕΛ)</label><input className="input" value={form.name_el || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { name_el: e.target.value })); }}/></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Κατηγορία *</label>
              <select className="input" value={form.tier || 'basic'} onChange={function (e) { return setForm(__assign(__assign({}, form), { tier: e.target.value })); }}>
                {Object.entries(TIER_LABELS).map(function (_a) {
        var k = _a[0], v = _a[1];
        return <option key={k} value={k}>{v}</option>;
    })}
              </select>
            </div>
            <div><label className="text-xs font-medium text-gray-500 mb-1 block">€/μήνα *</label><input type="number" className="input" value={form.price_monthly || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { price_monthly: parseFloat(e.target.value) })); }}/></div>
            <div><label className="text-xs font-medium text-gray-500 mb-1 block">€/χρόνο</label><input type="number" className="input" value={form.price_annual || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { price_annual: parseFloat(e.target.value) || null })); }}/></div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Κάλυψη</label>
            <div className="flex flex-wrap gap-3">
              {[['covers_accidents', 'Ατυχήματα'], ['covers_illness', 'Ασθένεια'], ['covers_surgery', 'Χειρουργείο'], ['covers_dental', 'Οδοντιατρείο'], ['covers_preventive', 'Πρόληψη'], ['covers_liability', 'Αστ. ευθύνη'], ['covers_death', 'Θάνατος']].map(function (_a) {
            var key = _a[0], label = _a[1];
            return (<label key={key} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={!!form[key]} onChange={function (e) {
                var _a;
                return setForm(__assign(__assign({}, form), (_a = {}, _a[key] = e.target.checked, _a)));
            }}/> {label}</label>);
        })}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Τύποι κατοικιδίων</label>
            <div className="flex gap-3">
              {[['dog', '🐕 Σκύλος'], ['cat', '🐈 Γάτα'], ['rabbit', '🐇 Κουνέλι'], ['bird', '🦜 Πτηνό']].map(function (_a) {
            var type = _a[0], label = _a[1];
            return (<label key={type} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={(form.pet_types || []).includes(type)} onChange={function () { return togglePetType(type); }}/> {label}</label>);
        })}
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.is_active} onChange={function (e) { return setForm(__assign(__assign({}, form), { is_active: e.target.checked })); }}/> Ενεργό</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.is_featured} onChange={function (e) { return setForm(__assign(__assign({}, form), { is_featured: e.target.checked })); }}/> Featured</label>
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">Άκυρο</button>
          <button onClick={function () { return saveMutation.mutate(); }} disabled={saveMutation.isPending || !form.name || !form.provider_id || !form.price_monthly} className="btn-primary">
            {saveMutation.isPending ? 'Αποθήκευση...' : ((editing === null || editing === void 0 ? void 0 : editing.id) ? 'Ενημέρωση' : 'Προσθήκη')}
          </button>
        </div>
      </div>
    </div>);
}
function AdminDashboard() {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    var user = (0, auth_1.useAuthStore)().user;
    var _j = (0, react_1.useState)('overview'), activeTab = _j[0], setActiveTab = _j[1];
    if ((user === null || user === void 0 ? void 0 : user.role) !== 'admin')
        return <react_router_dom_1.Navigate to="/" replace/>;
    var stats = (0, react_query_1.useQuery)({
        queryKey: ['admin-stats'],
        queryFn: function () { return api_1.api.get('/admin/stats').then(function (r) { return r.data; }); },
    }).data;
    var tabs = [
        { id: 'overview', label: 'Επισκόπηση', icon: lucide_react_1.TrendingUp },
        { id: 'users', label: 'Χρήστες', icon: lucide_react_1.Users },
        { id: 'providers', label: 'Πάροχοι', icon: lucide_react_1.Shield },
        { id: 'products', label: 'Προϊόντα', icon: lucide_react_1.Package },
        { id: 'services', label: 'Υπηρεσίες', icon: lucide_react_1.PawPrint },
        { id: 'orders', label: 'Παραγγελίες', icon: lucide_react_1.ClipboardList },
        { id: 'database', label: 'Βάση', icon: lucide_react_1.Database },
        { id: 'insurance', label: 'Ασφάλιση', icon: lucide_react_1.Shield },
    ];
    return (<div className="page-container py-8 pb-24 lg:pb-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <lucide_react_1.Shield size={20} className="text-purple-600 dark:text-purple-400"/>
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">Διαχείριση εφαρμογής GlobiPet</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {tabs.map(function (tab) { return (<button key={tab.id} onClick={function () { return setActiveTab(tab.id); }} className={(0, utils_1.cn)('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0', activeTab === tab.id ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
            <tab.icon size={15}/>
            {tab.label}
          </button>); })}
      </div>

      {activeTab === 'overview' && (<div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={lucide_react_1.Users} label="Χρήστες" value={(_a = stats === null || stats === void 0 ? void 0 : stats.users) !== null && _a !== void 0 ? _a : '—'} change={12} color="bg-blue-500"/>
            <StatCard icon={lucide_react_1.PawPrint} label="Κατοικίδια" value={(_b = stats === null || stats === void 0 ? void 0 : stats.pets) !== null && _b !== void 0 ? _b : '—'} change={8} color="bg-orange-500"/>
            <StatCard icon={lucide_react_1.ShoppingBag} label="Παραγγελίες" value={(_c = stats === null || stats === void 0 ? void 0 : stats.orders) !== null && _c !== void 0 ? _c : '—'} change={-3} color="bg-green-500"/>
            <StatCard icon={lucide_react_1.TrendingUp} label="Έσοδα" value={"\u20AC".concat((_d = stats === null || stats === void 0 ? void 0 : stats.revenue) !== null && _d !== void 0 ? _d : '0')} change={15} color="bg-purple-500"/>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={lucide_react_1.Shield} label="Πάροχοι" value={(_e = stats === null || stats === void 0 ? void 0 : stats.providers) !== null && _e !== void 0 ? _e : '—'} change={5} color="bg-teal-500"/>
            <StatCard icon={lucide_react_1.Package} label="Προϊόντα" value={(_f = stats === null || stats === void 0 ? void 0 : stats.products) !== null && _f !== void 0 ? _f : '—'} change={2} color="bg-pink-500"/>
            <StatCard icon={lucide_react_1.ClipboardList} label="Κρατήσεις" value={(_g = stats === null || stats === void 0 ? void 0 : stats.bookings) !== null && _g !== void 0 ? _g : '—'} change={18} color="bg-yellow-500"/>
            <StatCard icon={lucide_react_1.Database} label="Εγγραφές DB" value={(_h = stats === null || stats === void 0 ? void 0 : stats.total_records) !== null && _h !== void 0 ? _h : '—'} change={null} color="bg-gray-500"/>
          </div>
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Γρήγορες ενέργειες</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Διαχείριση χρηστών', tab: 'users', icon: lucide_react_1.Users },
                { label: 'Εκκρεμείς παραγγελίες', tab: 'orders', icon: lucide_react_1.ClipboardList },
                { label: 'Επαλήθευση παρόχων', tab: 'providers', icon: lucide_react_1.Shield },
                { label: 'Προϊόντα', tab: 'products', icon: lucide_react_1.Package },
                { label: 'SQL Query', tab: 'database', icon: lucide_react_1.Database },
                { label: 'Νέος χρήστης', tab: 'users', icon: lucide_react_1.Users },
            ].map(function (item, i) { return (<button key={i} onClick={function () { return setActiveTab(item.tab); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left border border-gray-100 dark:border-gray-800">
                  <item.icon size={16} className="text-gray-400 shrink-0"/>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                  <lucide_react_1.ChevronRight size={14} className="text-gray-400 ml-auto"/>
                </button>); })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Ειδικές σελίδες</h4>
              <div className="flex flex-wrap gap-3">
                <react_router_dom_1.Link to="/admin/catalog" className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <lucide_react_1.Database size={15} className="text-gray-400"/> Κατάλογος Υπηρεσιών <lucide_react_1.ChevronRight size={13} className="text-gray-400"/>
                </react_router_dom_1.Link>
                <button onClick={function () { return setActiveTab('insurance'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <lucide_react_1.Shield size={15} className="text-gray-400"/> Ασφαλιστικές Εταιρείες <lucide_react_1.ChevronRight size={13} className="text-gray-400"/>
                </button>
                <react_router_dom_1.Link to="/admin/subscriptions" className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <lucide_react_1.Layers size={15} className="text-gray-400"/> Συνδρομές <lucide_react_1.ChevronRight size={13} className="text-gray-400"/>
                </react_router_dom_1.Link>
              </div>
            </div>
          </div>
        </div>)}

      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'providers' && <ProvidersTab />}
      {activeTab === 'products' && <ProductsTab />}
      {activeTab === 'services' && <ServicesTab />}
      {activeTab === 'orders' && <OrdersTab />}
      {activeTab === 'database' && <DatabaseTab />}
      {activeTab === 'insurance' && <InsuranceTab />}
    </div>);
}
