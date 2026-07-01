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
exports.default = ProviderDashboard;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
var auth_1 = require("@/store/auth");
var api_1 = require("@/lib/api");
var utils_1 = require("@/lib/utils");
var react_router_dom_1 = require("react-router-dom");
var react_hot_toast_1 = require("react-hot-toast");
var XLSX = require("xlsx");
// ─── Import Tab ───────────────────────────────────────────────────
function ImportTab() {
    var _this = this;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _a = (0, react_1.useState)(null), file = _a[0], setFile = _a[1];
    var _b = (0, react_1.useState)([]), preview = _b[0], setPreview = _b[1];
    var _c = (0, react_1.useState)([]), columns = _c[0], setColumns = _c[1];
    var _d = (0, react_1.useState)('products'), importType = _d[0], setImportType = _d[1];
    var _e = (0, react_1.useState)(false), importing = _e[0], setImporting = _e[1];
    var fileRef = (0, react_1.useRef)(null);
    var parseFile = function (f) { return __awaiter(_this, void 0, void 0, function () {
        var ext, buffer, wb, ws, data, headers_1, err_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    setFile(f);
                    ext = (_a = f.name.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 5, , 6]);
                    if (!(ext === 'xlsx' || ext === 'xls' || ext === 'csv')) return [3 /*break*/, 3];
                    return [4 /*yield*/, f.arrayBuffer()];
                case 2:
                    buffer = _b.sent();
                    wb = XLSX.read(buffer);
                    ws = wb.Sheets[wb.SheetNames[0]];
                    data = XLSX.utils.sheet_to_json(ws, { header: 1 });
                    if (data.length > 0) {
                        headers_1 = data[0].map(String);
                        setColumns(headers_1);
                        setPreview(data.slice(1, 6).map(function (row) {
                            var obj = {};
                            headers_1.forEach(function (h, i) { var _a; return obj[h] = (_a = row[i]) !== null && _a !== void 0 ? _a : ''; });
                            return obj;
                        }));
                    }
                    return [3 /*break*/, 4];
                case 3:
                    if (ext === 'docx' || ext === 'doc') {
                        // For Word files, show manual entry guidance
                        (0, react_hot_toast_1.default)('Αρχείο Word εντοπίστηκε. Θα εξαχθούν δεδομένα αυτόματα.');
                        setColumns(['Όνομα', 'Τιμή', 'Περιγραφή', 'Κατηγορία']);
                        setPreview([{ 'Όνομα': 'Παράδειγμα', 'Τιμή': '10', 'Περιγραφή': 'Περιγραφή', 'Κατηγορία': 'other' }]);
                    }
                    _b.label = 4;
                case 4: return [3 /*break*/, 6];
                case 5:
                    err_1 = _b.sent();
                    react_hot_toast_1.default.error('Σφάλμα ανάγνωσης αρχείου');
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var doImport = function () { return __awaiter(_this, void 0, void 0, function () {
        var endpoint, items, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!preview.length)
                        return [2 /*return*/];
                    setImporting(true);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, 4, 5]);
                    endpoint = importType === 'products' ? '/products/bulk' : '/services/bulk';
                    items = preview.map(function (row) { return ({
                        name: row['Όνομα'] || row['name'] || row['Name'] || Object.values(row)[0],
                        price: parseFloat(row['Τιμή'] || row['price'] || row['Price'] || '0'),
                        description: row['Περιγραφή'] || row['description'] || row['Description'] || '',
                        category: row['Κατηγορία'] || row['category'] || row['Category'] || 'other',
                    }); });
                    return [4 /*yield*/, api_1.api.post(endpoint, { items: items })];
                case 2:
                    _b.sent();
                    react_hot_toast_1.default.success("".concat(items.length, " \u03B5\u03B3\u03B3\u03C1\u03B1\u03C6\u03AD\u03C2 \u03B5\u03B9\u03C3\u03AE\u03C7\u03B8\u03B7\u03C3\u03B1\u03BD \u03B5\u03C0\u03B9\u03C4\u03C5\u03C7\u03CE\u03C2!"));
                    queryClient.invalidateQueries({ queryKey: ['provider-products'] });
                    queryClient.invalidateQueries({ queryKey: ['provider-services'] });
                    setFile(null);
                    setPreview([]);
                    setColumns([]);
                    return [3 /*break*/, 5];
                case 3:
                    _a = _b.sent();
                    react_hot_toast_1.default.error('Σφάλμα εισαγωγής δεδομένων');
                    return [3 /*break*/, 5];
                case 4:
                    setImporting(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var downloadTemplate = function (type) {
        var headers = type === 'products'
            ? ['Όνομα', 'Τιμή', 'Περιγραφή', 'Κατηγορία', 'Απόθεμα']
            : ['Όνομα', 'Τιμή', 'Περιγραφή', 'Τύπος', 'Διάρκεια (λεπτά)'];
        var ws = XLSX.utils.aoa_to_sheet([headers, headers.map(function () { return 'Παράδειγμα'; })]);
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, "globipet_".concat(type, "_template.xlsx"));
        react_hot_toast_1.default.success('Template κατεβάστηκε!');
    };
    return (<div className="space-y-6">
      {/* Import type */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Τύπος εισαγωγής</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { value: 'products', label: 'Προϊόντα', icon: lucide_react_1.Package, desc: 'Εισαγωγή προϊόντων marketplace' },
            { value: 'services', label: 'Υπηρεσίες', icon: lucide_react_1.Scissors, desc: 'Εισαγωγή υπηρεσιών' },
        ].map(function (opt) { return (<button key={opt.value} onClick={function () { return setImportType(opt.value); }} className={(0, utils_1.cn)('p-4 rounded-xl border text-left transition-all', importType === opt.value ? 'border-brand-900 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-gray-700')}>
              <opt.icon size={20} className={(0, utils_1.cn)('mb-2', importType === opt.value ? 'text-brand-900' : 'text-gray-400')}/>
              <p className="font-semibold text-sm text-gray-900 dark:text-white">{opt.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
            </button>); })}
        </div>

        {/* Download templates */}
        <div className="flex gap-3">
          <button onClick={function () { return downloadTemplate('products'); }} className="flex items-center gap-2 text-xs text-brand-900 hover:underline">
            <lucide_react_1.Download size={13}/> Template Προϊόντων (.xlsx)
          </button>
          <button onClick={function () { return downloadTemplate('services'); }} className="flex items-center gap-2 text-xs text-brand-900 hover:underline">
            <lucide_react_1.Download size={13}/> Template Υπηρεσιών (.xlsx)
          </button>
        </div>
      </div>

      {/* Upload zone */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Ανέβασμα αρχείου</h3>
        <div onClick={function () { var _a; return (_a = fileRef.current) === null || _a === void 0 ? void 0 : _a.click(); }} className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-10 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 dark:hover:bg-brand-900/10 transition-all">
          <div className="flex justify-center gap-4 mb-4">
            <lucide_react_1.FileSpreadsheet size={32} className="text-green-500"/>
            <lucide_react_1.FileText size={32} className="text-blue-500"/>
          </div>
          <p className="font-medium text-gray-700 dark:text-gray-300">Σύρετε αρχείο ή κλικ για επιλογή</p>
          <p className="text-sm text-gray-400 mt-1">Excel (.xlsx, .xls), CSV, Word (.docx)</p>
          {file && <p className="text-sm text-brand-900 font-medium mt-3">✓ {file.name}</p>}
        </div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.docx,.doc" className="hidden" onChange={function (e) { var _a; var f = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0]; if (f)
        parseFile(f); }}/>
      </div>

      {/* Preview */}
      {preview.length > 0 && (<div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Προεπισκόπηση ({preview.length} εγγραφές)</h3>
            <div className="flex items-center gap-2 text-xs text-green-600">
              <lucide_react_1.CheckCircle size={14}/> Έτοιμο για εισαγωγή
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>{columns.map(function (c) { return <th key={c} className="text-left px-4 py-2 text-xs font-medium text-gray-500">{c}</th>; })}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {preview.map(function (row, i) { return (<tr key={i}>{columns.map(function (c) { return <td key={c} className="px-4 py-2 text-xs text-gray-700 dark:text-gray-300">{row[c]}</td>; })}</tr>); })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
            <button onClick={doImport} disabled={importing} className="btn-primary flex items-center gap-2">
              <lucide_react_1.Upload size={16}/> {importing ? 'Εισαγωγή...' : "\u0395\u03B9\u03C3\u03B1\u03B3\u03C9\u03B3\u03AE ".concat(preview.length, " \u03B5\u03B3\u03B3\u03C1\u03B1\u03C6\u03CE\u03BD")}
            </button>
          </div>
        </div>)}
    </div>);
}
// ─── Calendar Tab ─────────────────────────────────────────────────
function CalendarTab() {
    var _this = this;
    var user = (0, auth_1.useAuthStore)().user;
    var _a = (0, react_1.useState)(false), syncing = _a[0], setSyncing = _a[1];
    var syncGoogle = function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            setSyncing(true);
            try {
                window.open("https://globipetbackend-production.up.railway.app/api/calendar/google/auth?userId=".concat(user === null || user === void 0 ? void 0 : user.id), '_blank', 'width=500,height=600');
                react_hot_toast_1.default.success('Ανοίχτηκε η σύνδεση Google Calendar');
            }
            finally {
                setSyncing(false);
            }
            return [2 /*return*/];
        });
    }); };
    var syncOutlook = function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            setSyncing(true);
            try {
                window.open("https://globipetbackend-production.up.railway.app/api/calendar/outlook/auth?userId=".concat(user === null || user === void 0 ? void 0 : user.id), '_blank', 'width=500,height=600');
                react_hot_toast_1.default.success('Ανοίχτηκε η σύνδεση Microsoft Outlook');
            }
            finally {
                setSyncing(false);
            }
            return [2 /*return*/];
        });
    }); };
    var _b = (0, react_query_1.useQuery)({
        queryKey: ['provider-bookings'],
        queryFn: function () { return api_1.api.get('/bookings/provider').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: !!user,
    }).data, bookings = _b === void 0 ? [] : _b;
    // Simple calendar grid
    var today = new Date();
    var daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    var firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
    var days = Array.from({ length: daysInMonth }, function (_, i) { return i + 1; });
    return (<div className="space-y-6">
      {/* Calendar sync */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Συγχρονισμός Ημερολογίου</h3>
        <p className="text-sm text-gray-500 mb-4">Συνδέστε το ημερολόγιό σας για αυτόματο συγχρονισμό κρατήσεων</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={syncGoogle} className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all">
            <svg width="24" height="24" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            <div className="text-left">
              <p className="font-medium text-sm text-gray-900 dark:text-white">Google Calendar</p>
              <p className="text-xs text-gray-500">Σύνδεση με Google</p>
            </div>
          </button>
          <button onClick={syncOutlook} className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#0078D4"><path d="M24 12.204c0-.687-.563-1.244-1.258-1.244h-9.416V3.258C13.326 2.563 12.763 2 12.07 2H1.258C.563 2 0 2.563 0 3.258v17.484C0 21.437.563 22 1.258 22h21.484C23.437 22 24 21.437 24 20.742v-8.538z"/></svg>
            <div className="text-left">
              <p className="font-medium text-sm text-gray-900 dark:text-white">Microsoft Outlook</p>
              <p className="text-xs text-gray-500">Σύνδεση με Microsoft</p>
            </div>
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {today.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })}
          </h3>
          <div className="flex gap-2">
            <button className="btn-ghost p-2">‹</button>
            <button className="btn-ghost p-2">›</button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Κυ', 'Δε', 'Τρ', 'Τε', 'Πέ', 'Πα', 'Σά'].map(function (d) { return (<div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>); })}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }, function (_, i) { return <div key={"empty-".concat(i)}/>; })}
          {days.map(function (day) {
            var isToday = day === today.getDate();
            var hasBooking = bookings.some(function (b) { return new Date(b.scheduled_at).getDate() === day; });
            return (<div key={day} className={(0, utils_1.cn)('aspect-square flex items-center justify-center rounded-xl text-sm cursor-pointer transition-all relative', isToday ? 'bg-brand-900 text-white font-bold' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300')}>
                {day}
                {hasBooking && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500"/>}
              </div>);
        })}
        </div>
      </div>

      {/* Upcoming bookings */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Επερχόμενες Κρατήσεις</h3>
        {bookings.length === 0 ? (<p className="text-center text-gray-400 py-6 text-sm">Δεν υπάρχουν κρατήσεις</p>) : bookings.slice(0, 5).map(function (b) { return (<div key={b.id} className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0">
              <lucide_react_1.Calendar size={16} className="text-brand-900"/>
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm text-gray-900 dark:text-white">{b.service_name || 'Κράτηση'}</p>
              <p className="text-xs text-gray-500">{b.user_name} · {new Date(b.scheduled_at).toLocaleDateString('el-GR')}</p>
            </div>
            <span className={(0, utils_1.cn)('text-xs px-2 py-0.5 rounded-full font-medium', b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                b.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600')}>
              {b.status === 'confirmed' ? 'Επιβεβ.' : b.status === 'pending' ? 'Εκκρεμεί' : b.status}
            </span>
          </div>); })}
      </div>
    </div>);
}
// ─── Services Tab ─────────────────────────────────────────────────
function ServicesTab() {
    var user = (0, auth_1.useAuthStore)().user;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _a = (0, react_1.useState)(false), showForm = _a[0], setShowForm = _a[1];
    var _b = (0, react_1.useState)({ name: '', description: '', price: '', type: 'grooming', duration_minutes: '60' }), form = _b[0], setForm = _b[1];
    var _c = (0, react_query_1.useQuery)({
        queryKey: ['provider-services'],
        queryFn: function () { return api_1.api.get('/services/my').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: !!user,
    }), _d = _c.data, services = _d === void 0 ? [] : _d, isLoading = _c.isLoading;
    var addService = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_1.api.post('/services', __assign(__assign({}, form), { price: parseFloat(form.price), duration_minutes: parseInt(form.duration_minutes) })); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ['provider-services'] });
            react_hot_toast_1.default.success('Υπηρεσία προστέθηκε!');
            setShowForm(false);
            setForm({ name: '', description: '', price: '', type: 'grooming', duration_minutes: '60' });
        },
        onError: function () { return react_hot_toast_1.default.error('Σφάλμα προσθήκης υπηρεσίας'); },
    });
    var deleteService = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_1.api.delete("/services/".concat(id)); },
        onSuccess: function () { queryClient.invalidateQueries({ queryKey: ['provider-services'] }); react_hot_toast_1.default.success('Υπηρεσία διαγράφηκε'); },
    });
    return (<div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{services.length} υπηρεσίες</p>
        <button onClick={function () { return setShowForm(!showForm); }} className="btn-primary flex items-center gap-2 text-sm">
          <lucide_react_1.Plus size={16}/> Νέα Υπηρεσία
        </button>
      </div>

      <framer_motion_1.AnimatePresence>
        {showForm && (<framer_motion_1.motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card p-5">
            <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">Νέα Υπηρεσία</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-xs font-medium text-gray-500 mb-1 block">Όνομα</label><input className="input" placeholder="π.χ. Grooming Σκύλου" value={form.name} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { name: e.target.value })); }); }}/></div>
              <div><label className="text-xs font-medium text-gray-500 mb-1 block">Τύπος</label>
                <select className="input" value={form.type} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { type: e.target.value })); }); }}>
                  {['grooming', 'veterinary', 'walking', 'pet_sitting', 'training', 'boarding', 'photography', 'pet_taxi', 'other'].map(function (t) { return <option key={t} value={t}>{t}</option>; })}
                </select>
              </div>
              <div><label className="text-xs font-medium text-gray-500 mb-1 block">Τιμή (€)</label><input className="input" type="number" placeholder="25" value={form.price} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { price: e.target.value })); }); }}/></div>
              <div><label className="text-xs font-medium text-gray-500 mb-1 block">Διάρκεια (λεπτά)</label><input className="input" type="number" placeholder="60" value={form.duration_minutes} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { duration_minutes: e.target.value })); }); }}/></div>
              <div><label className="text-xs font-medium text-gray-500 mb-1 block">Περιγραφή</label><textarea className="input resize-none" rows={2} placeholder="Περιγραφή υπηρεσίας..." value={form.description} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { description: e.target.value })); }); }}/></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={function () { return setShowForm(false); }} className="btn-secondary flex-1">Ακύρωση</button>
              <button onClick={function () { return addService.mutate(); }} disabled={!form.name || !form.price || addService.isPending} className="btn-primary flex-1">
                {addService.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
              </button>
            </div>
          </framer_motion_1.motion.div>)}
      </framer_motion_1.AnimatePresence>

      <div className="grid gap-3">
        {isLoading ? [1, 2, 3].map(function (i) { return <div key={i} className="card p-4"><div className="skeleton h-16 w-full"/></div>; })
            : services.length === 0 ? (<div className="card p-10 text-center">
            <lucide_react_1.Scissors size={32} className="mx-auto text-gray-300 mb-3"/>
            <p className="text-gray-500">Δεν έχετε υπηρεσίες ακόμα</p>
            <button onClick={function () { return setShowForm(true); }} className="btn-primary mt-4 text-sm">Προσθήκη πρώτης υπηρεσίας</button>
          </div>) : services.map(function (s) { return (<div key={s.id} className="card p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0">
              <lucide_react_1.Scissors size={16} className="text-brand-900"/>
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white">{s.name}</p>
              <p className="text-xs text-gray-500">{s.type} · {s.duration_minutes} λεπτά</p>
            </div>
            <p className="font-bold text-gray-900 dark:text-white">€{s.price}</p>
            <div className="flex gap-1">
              <button className="btn-ghost p-2"><lucide_react_1.Edit size={14} className="text-gray-400"/></button>
              <button onClick={function () { if (confirm('Διαγραφή;'))
                deleteService.mutate(s.id); }} className="btn-ghost p-2"><lucide_react_1.Trash2 size={14} className="text-red-400"/></button>
            </div>
          </div>); })}
      </div>
    </div>);
}
// ─── Products Tab ─────────────────────────────────────────────────
function ProductsTab() {
    var user = (0, auth_1.useAuthStore)().user;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _a = (0, react_1.useState)(false), showForm = _a[0], setShowForm = _a[1];
    var _b = (0, react_1.useState)({ name: '', description: '', price: '', category: 'food', stock: '0' }), form = _b[0], setForm = _b[1];
    var fileRef = (0, react_1.useRef)(null);
    var _c = (0, react_query_1.useQuery)({
        queryKey: ['provider-products'],
        queryFn: function () { return api_1.api.get('/products/my').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: !!user,
    }), _d = _c.data, products = _d === void 0 ? [] : _d, isLoading = _c.isLoading;
    var addProduct = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_1.api.post('/products', __assign(__assign({}, form), { price: parseFloat(form.price), stock: parseInt(form.stock) })); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ['provider-products'] });
            react_hot_toast_1.default.success('Προϊόν προστέθηκε!');
            setShowForm(false);
            setForm({ name: '', description: '', price: '', category: 'food', stock: '0' });
        },
    });
    var deleteProduct = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_1.api.delete("/products/".concat(id)); },
        onSuccess: function () { queryClient.invalidateQueries({ queryKey: ['provider-products'] }); react_hot_toast_1.default.success('Προϊόν διαγράφηκε'); },
    });
    return (<div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{products.length} προϊόντα</p>
        <button onClick={function () { return setShowForm(!showForm); }} className="btn-primary flex items-center gap-2 text-sm">
          <lucide_react_1.Plus size={16}/> Νέο Προϊόν
        </button>
      </div>

      <framer_motion_1.AnimatePresence>
        {showForm && (<framer_motion_1.motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card p-5">
            <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">Νέο Προϊόν</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-xs font-medium text-gray-500 mb-1 block">Όνομα</label><input className="input" placeholder="π.χ. Royal Canin Adult" value={form.name} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { name: e.target.value })); }); }}/></div>
              <div><label className="text-xs font-medium text-gray-500 mb-1 block">Κατηγορία</label>
                <select className="input" value={form.category} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { category: e.target.value })); }); }}>
                  {['food', 'toys', 'accessories', 'health', 'grooming', 'training', 'housing', 'other'].map(function (c) { return <option key={c} value={c}>{c}</option>; })}
                </select>
              </div>
              <div><label className="text-xs font-medium text-gray-500 mb-1 block">Τιμή (€)</label><input className="input" type="number" placeholder="15.99" value={form.price} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { price: e.target.value })); }); }}/></div>
              <div><label className="text-xs font-medium text-gray-500 mb-1 block">Απόθεμα</label><input className="input" type="number" placeholder="100" value={form.stock} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { stock: e.target.value })); }); }}/></div>
              <div><label className="text-xs font-medium text-gray-500 mb-1 block">Περιγραφή</label><textarea className="input resize-none" rows={2} placeholder="Περιγραφή προϊόντος..." value={form.description} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { description: e.target.value })); }); }}/></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={function () { return setShowForm(false); }} className="btn-secondary flex-1">Ακύρωση</button>
              <button onClick={function () { return addProduct.mutate(); }} disabled={!form.name || !form.price || addProduct.isPending} className="btn-primary flex-1">
                {addProduct.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
              </button>
            </div>
          </framer_motion_1.motion.div>)}
      </framer_motion_1.AnimatePresence>

      <div className="grid gap-3">
        {isLoading ? [1, 2, 3].map(function (i) { return <div key={i} className="card p-4"><div className="skeleton h-16 w-full"/></div>; })
            : products.length === 0 ? (<div className="card p-10 text-center">
            <lucide_react_1.Package size={32} className="mx-auto text-gray-300 mb-3"/>
            <p className="text-gray-500">Δεν έχετε προϊόντα ακόμα</p>
            <button onClick={function () { return setShowForm(true); }} className="btn-primary mt-4 text-sm">Προσθήκη πρώτου προϊόντος</button>
          </div>) : products.map(function (p) {
                var _a, _b;
                return (<div key={p.id} className="card p-4 flex items-center gap-4">
            {((_a = p.images) === null || _a === void 0 ? void 0 : _a[0]) ? <img src={p.images[0]} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0"/>
                        : <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 text-xl">📦</div>}
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
              <p className="text-xs text-gray-500">{p.category} · Απόθεμα: {(_b = p.stock) !== null && _b !== void 0 ? _b : '—'}</p>
            </div>
            <p className="font-bold text-gray-900 dark:text-white">€{p.price}</p>
            <div className="flex gap-1">
              <button className="btn-ghost p-2"><lucide_react_1.Edit size={14} className="text-gray-400"/></button>
              <button onClick={function () { if (confirm('Διαγραφή;'))
                    deleteProduct.mutate(p.id); }} className="btn-ghost p-2"><lucide_react_1.Trash2 size={14} className="text-red-400"/></button>
            </div>
          </div>);
            })}
      </div>
    </div>);
}
// ─── Main Provider Dashboard ──────────────────────────────────────
function ProviderDashboard() {
    var _a, _b, _c, _d;
    var user = (0, auth_1.useAuthStore)().user;
    var _e = (0, react_1.useState)('overview'), activeTab = _e[0], setActiveTab = _e[1];
    var canAccess = (user === null || user === void 0 ? void 0 : user.role) === 'service_provider' || (user === null || user === void 0 ? void 0 : user.role) === 'both' || (user === null || user === void 0 ? void 0 : user.role) === 'admin';
    if (!canAccess)
        return <react_router_dom_1.Navigate to="/" replace/>;
    var stats = (0, react_query_1.useQuery)({
        queryKey: ['provider-stats'],
        queryFn: function () { return api_1.api.get('/provider/stats').then(function (r) { return r.data; }); },
        enabled: !!user,
    }).data;
    // Availability for telehealth
    var _f = (0, react_query_1.useQuery)({
        queryKey: ['my-vet-services'],
        queryFn: function () { return api_1.api.get('/services/my').then(function (r) { var _a, _b; return ((_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []).filter(function (s) { return s.service_type === 'veterinary'; }); }); },
        enabled: !!user,
    }).data, myServices = _f === void 0 ? [] : _f;
    var isVet = myServices.length > 0;
    var isAvailableNow = myServices.some(function (s) { return s.is_available_now; });
    var toggleAvailability = (0, react_query_1.useMutation)({
        mutationFn: function (is_available) { return api_1.api.patch('/telehealth/availability', { is_available: is_available }); },
        onSuccess: function (_, is_available) {
            react_hot_toast_1.default.success(is_available ? '🟢 Είστε πλέον διαθέσιμος για τηλεϊατρική' : '⚫ Απενεργοποιήσατε τη διαθεσιμότητα');
        },
        onError: function () { return react_hot_toast_1.default.error('Σφάλμα αλλαγής διαθεσιμότητας'); },
    });
    var tabs = [
        { id: 'overview', label: 'Επισκόπηση', icon: lucide_react_1.TrendingUp },
        { id: 'services', label: 'Υπηρεσίες', icon: lucide_react_1.Scissors },
        { id: 'products', label: 'Προϊόντα', icon: lucide_react_1.Package },
        { id: 'bookings', label: 'Κρατήσεις', icon: lucide_react_1.Clock },
        { id: 'calendar', label: 'Ημερολόγιο', icon: lucide_react_1.Calendar },
        { id: 'import', label: 'Import', icon: lucide_react_1.Upload },
    ];
    return (<div className="page-container py-8 pb-24 lg:pb-8">
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-900 font-bold text-lg shrink-0">
            {(0, utils_1.getInitials)((user === null || user === void 0 ? void 0 : user.full_name) || 'P')}
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Dashboard Παρόχου</h1>
            <p className="text-sm text-gray-500">{user === null || user === void 0 ? void 0 : user.full_name} · {user === null || user === void 0 ? void 0 : user.email}</p>
          </div>
        </div>

        {/* Telehealth availability toggle — only shown to vets */}
        {isVet && (<button onClick={function () { return toggleAvailability.mutate(!isAvailableNow); }} disabled={toggleAvailability.isPending} className={(0, utils_1.cn)('flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all border-2', isAvailableNow
                ? 'bg-green-500 border-green-500 text-white hover:bg-green-600'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-green-400')}>
            <lucide_react_1.Video size={16}/>
            <span className={(0, utils_1.cn)('w-2 h-2 rounded-full', isAvailableNow ? 'bg-white animate-pulse' : 'bg-gray-400')}/>
            {isAvailableNow ? 'Διαθέσιμος για Τηλεϊατρική' : 'Εκτός Τηλεϊατρικής'}
          </button>)}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6">
        {tabs.map(function (tab) { return (<button key={tab.id} onClick={function () { return setActiveTab(tab.id); }} className={(0, utils_1.cn)('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all', activeTab === tab.id ? 'bg-brand-900 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
            <tab.icon size={15}/>
            {tab.label}
          </button>); })}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (<div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
                { label: 'Συνολικές κρατήσεις', value: (_a = stats === null || stats === void 0 ? void 0 : stats.bookings) !== null && _a !== void 0 ? _a : '0', icon: lucide_react_1.Calendar, color: 'bg-blue-500' },
                { label: 'Συνολικά έσοδα', value: "\u20AC".concat((_b = stats === null || stats === void 0 ? void 0 : stats.revenue) !== null && _b !== void 0 ? _b : '0'), icon: lucide_react_1.TrendingUp, color: 'bg-green-500' },
                { label: 'Υπηρεσίες', value: (_c = stats === null || stats === void 0 ? void 0 : stats.services) !== null && _c !== void 0 ? _c : '0', icon: lucide_react_1.Scissors, color: 'bg-orange-500' },
                { label: 'Αξιολόγηση', value: (_d = stats === null || stats === void 0 ? void 0 : stats.rating) !== null && _d !== void 0 ? _d : '—', icon: lucide_react_1.Star, color: 'bg-yellow-500' },
            ].map(function (s, i) { return (<div key={i} className="card p-5">
                <div className={(0, utils_1.cn)('w-10 h-10 rounded-xl flex items-center justify-center mb-3', s.color)}>
                  <s.icon size={18} className="text-white"/>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
              </div>); })}
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Γρήγορες ενέργειες</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Προσθήκη υπηρεσίας', tab: 'services', icon: lucide_react_1.Scissors },
                { label: 'Προσθήκη προϊόντος', tab: 'products', icon: lucide_react_1.Package },
                { label: 'Import από Excel', tab: 'import', icon: lucide_react_1.FileSpreadsheet },
                { label: 'Κρατήσεις', tab: 'bookings', icon: lucide_react_1.Clock },
                { label: 'Ημερολόγιο', tab: 'calendar', icon: lucide_react_1.Calendar },
                { label: 'Google Calendar', tab: 'calendar', icon: lucide_react_1.Calendar },
            ].map(function (item, i) { return (<button key={i} onClick={function () { return setActiveTab(item.tab); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-100 dark:border-gray-800 transition-colors text-left">
                  <item.icon size={16} className="text-gray-400 shrink-0"/>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                  <lucide_react_1.ChevronRight size={14} className="text-gray-400 ml-auto"/>
                </button>); })}
            </div>
          </div>
        </div>)}

      {activeTab === 'services' && <ServicesTab />}
      {activeTab === 'products' && <ProductsTab />}
      {activeTab === 'calendar' && <CalendarTab />}
      {activeTab === 'import' && <ImportTab />}
      {activeTab === 'bookings' && (<div className="card p-5 text-center py-12">
          <lucide_react_1.Clock size={32} className="mx-auto text-gray-300 mb-3"/>
          <p className="text-gray-500">Οι κρατήσεις θα εμφανιστούν εδώ</p>
        </div>)}
    </div>);
}
