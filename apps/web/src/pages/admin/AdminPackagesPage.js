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
exports.default = AdminPackagesPage;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
var react_router_dom_1 = require("react-router-dom");
var api_1 = require("@/lib/api");
var utils_1 = require("@/lib/utils");
var react_hot_toast_1 = require("react-hot-toast");
var GROUP_META = {
    bathing: { label: 'Μπάνιο', emoji: '🛁' },
    haircut: { label: 'Κούρεμα', emoji: '✂️' },
    addon: { label: 'Extras', emoji: '✨' },
    consultation: { label: 'Επισκέψεις', emoji: '🩺' },
    vaccination: { label: 'Εμβολιασμοί', emoji: '💉' },
    surgery: { label: 'Χειρουργικές', emoji: '🏥' },
    dental: { label: 'Οδοντιατρικά', emoji: '🦷' },
    diagnostics: { label: 'Διαγνωστικά', emoji: '🔬' },
    specialty: { label: 'Ειδικότητες', emoji: '👨‍⚕️' },
    oncology: { label: 'Ογκολογία', emoji: '🎗️' },
    service: { label: 'Υπηρεσίες', emoji: '🐕' },
    other: { label: 'Άλλα', emoji: '📋' },
};
var SIZE_LABELS = {
    small: 'Μικρό', medium: 'Μεσαίο', large: 'Μεγάλο', xlarge: 'Πολύ μεγάλο'
};
function AdminPackagesPage() {
    var queryClient = (0, react_query_1.useQueryClient)();
    var _a = (0, react_1.useState)(''), search = _a[0], setSearch = _a[1];
    var _b = (0, react_1.useState)('all'), filterGroup = _b[0], setFilterGroup = _b[1];
    var _c = (0, react_1.useState)('all'), filterStatus = _c[0], setFilterStatus = _c[1];
    var _d = (0, react_1.useState)(null), editingPkg = _d[0], setEditingPkg = _d[1];
    var _e = (0, react_query_1.useQuery)({
        queryKey: ['admin-packages'],
        queryFn: function () { return api_1.api.get('/admin/catalog/packages').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }), _f = _e.data, packages = _f === void 0 ? [] : _f, isLoading = _e.isLoading;
    var deleteMutation = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_1.api.delete("/admin/catalog/packages/".concat(id)); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ['admin-packages'] });
            react_hot_toast_1.default.success('Πακέτο διαγράφηκε');
        },
    });
    var toggleActive = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var id = _a.id, is_active = _a.is_active;
            return api_1.api.patch("/admin/catalog/packages/".concat(id), { is_active: is_active });
        },
        onSuccess: function () { return queryClient.invalidateQueries({ queryKey: ['admin-packages'] }); },
    });
    var filtered = (0, react_1.useMemo)(function () {
        return packages.filter(function (p) {
            var _a, _b, _c, _d, _e;
            if (filterGroup !== 'all' && p.group !== filterGroup)
                return false;
            if (filterStatus === 'active' && !p.is_active)
                return false;
            if (filterStatus === 'inactive' && p.is_active)
                return false;
            if (filterStatus === 'no_price' && p.price > 0)
                return false;
            if (search) {
                var q = search.toLowerCase();
                if (!((_a = p.name) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(q)) &&
                    !((_c = (_b = p.service) === null || _b === void 0 ? void 0 : _b.title) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes(q)) &&
                    !((_e = (_d = p.service) === null || _d === void 0 ? void 0 : _d.provider_email) === null || _e === void 0 ? void 0 : _e.toLowerCase().includes(q)))
                    return false;
            }
            return true;
        });
    }, [packages, search, filterGroup, filterStatus]);
    var groups = (0, react_1.useMemo)(function () { return Array.from(new Set(packages.map(function (p) { return p.group; }))); }, [packages]);
    var noPriceCount = packages.filter(function (p) { return !p.price || p.price === 0; }).length;
    return (<div className="page-container py-8 pb-24 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <react_router_dom_1.Link to="/admin" className="btn-ghost p-2"><lucide_react_1.ArrowLeft size={18}/></react_router_dom_1.Link>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <lucide_react_1.Package size={22}/> Πακέτα παρόχων
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Όλα τα πακέτα όλων των παρόχων στην πλατφόρμα</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex items-center gap-2 flex-1 input">
          <lucide_react_1.Search size={14} className="text-gray-400 shrink-0"/>
          <input value={search} onChange={function (e) { return setSearch(e.target.value); }} placeholder="Αναζήτηση (πακέτο, υπηρεσία, email)..." className="flex-1 bg-transparent text-sm outline-none"/>
        </div>
        <select value={filterGroup} onChange={function (e) { return setFilterGroup(e.target.value); }} className="input text-sm">
          <option value="all">Όλες οι ομάδες</option>
          {groups.map(function (g) { var _a; return <option key={g} value={g}>{((_a = GROUP_META[g]) === null || _a === void 0 ? void 0 : _a.label) || g}</option>; })}
        </select>
        <select value={filterStatus} onChange={function (e) { return setFilterStatus(e.target.value); }} className="input text-sm">
          <option value="all">Όλα</option>
          <option value="active">Ενεργά</option>
          <option value="inactive">Ανενεργά</option>
          <option value="no_price">Χωρίς τιμή</option>
        </select>
      </div>

      <div className="card p-4 mb-4 bg-gradient-to-br from-brand-50 to-amber-50 dark:from-brand-900/20 dark:to-amber-900/20 border-brand-100">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          <strong>{filtered.length}</strong> από <strong>{packages.length}</strong> πακέτα
          {noPriceCount > 0 && (<span className="text-amber-700 ml-2">
              · ⚠️ {noPriceCount} χωρίς τιμή
            </span>)}
        </p>
      </div>

      {isLoading ? (<div className="space-y-3">{[1, 2, 3, 4].map(function (i) { return <div key={i} className="skeleton h-20 w-full"/>; })}</div>) : filtered.length === 0 ? (<div className="card p-12 text-center">
          <lucide_react_1.Package size={40} className="mx-auto text-gray-300 mb-3"/>
          <h3 className="font-semibold text-gray-900 dark:text-white">Δεν βρέθηκαν πακέτα</h3>
        </div>) : (<div className="space-y-2">
          {filtered.map(function (pkg) {
                var _a, _b;
                var meta = GROUP_META[pkg.group] || GROUP_META.other;
                return (<div key={pkg.id} className={(0, utils_1.cn)('card p-3 flex items-center gap-3', !pkg.is_active && 'opacity-60')}>
                <span className="text-2xl shrink-0">{meta.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{pkg.name}</p>
                    {pkg.size && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{SIZE_LABELS[pkg.size]}</span>}
                    {pkg.modality && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">{pkg.modality}</span>}
                    {pkg.pet_type && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700">{pkg.pet_type === 'dog' ? '🐕' : '🐈'}</span>}
                    {pkg.is_addon && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">Add-on</span>}
                    {!pkg.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">Ανενεργό</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1"><lucide_react_1.Building2 size={11}/> {((_a = pkg.service) === null || _a === void 0 ? void 0 : _a.title) || '—'}</span>
                    <span className="text-gray-400">{(_b = pkg.service) === null || _b === void 0 ? void 0 : _b.provider_email}</span>
                    <span className="flex items-center gap-1"><lucide_react_1.Clock size={11}/> {pkg.duration_minutes}΄</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {pkg.price > 0 ? (<p className="font-bold text-lg text-gray-900 dark:text-white">€{pkg.price.toFixed(2)}</p>) : (<p className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                      <lucide_react_1.AlertTriangle size={11}/> Χωρίς τιμή
                    </p>)}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={function () { return toggleActive.mutate({ id: pkg.id, is_active: !pkg.is_active }); }} className="btn-ghost p-1.5">
                    {pkg.is_active ? <lucide_react_1.Check size={14} className="text-green-600"/> : <lucide_react_1.X size={14} className="text-gray-400"/>}
                  </button>
                  <button onClick={function () { return setEditingPkg(pkg); }} className="btn-ghost p-1.5">
                    <lucide_react_1.Edit2 size={14} className="text-gray-500"/>
                  </button>
                  <button onClick={function () { if (confirm("\u0394\u03B9\u03B1\u03B3\u03C1\u03B1\u03C6\u03AE \"".concat(pkg.name, "\";")))
                    deleteMutation.mutate(pkg.id); }} className="btn-ghost p-1.5 hover:bg-red-50">
                    <lucide_react_1.Trash2 size={14} className="text-red-500"/>
                  </button>
                </div>
              </div>);
            })}
        </div>)}

      <PackageEditModal open={!!editingPkg} onClose={function () { return setEditingPkg(null); }} pkg={editingPkg} onSaved={function () {
            queryClient.invalidateQueries({ queryKey: ['admin-packages'] });
            setEditingPkg(null);
        }}/>
    </div>);
}
// ═══════════════════════════════════════════════════════════════
function PackageEditModal(_a) {
    var _b, _c;
    var open = _a.open, onClose = _a.onClose, pkg = _a.pkg, onSaved = _a.onSaved;
    var _d = (0, react_1.useState)({}), form = _d[0], setForm = _d[1];
    (0, react_1.useEffect)(function () {
        if (pkg && open) {
            setForm({
                name: pkg.name || '',
                group: pkg.group || 'service',
                description: pkg.description || '',
                size: pkg.size || '',
                pet_type: pkg.pet_type || '',
                modality: pkg.modality || '',
                breed_group: pkg.breed_group || '',
                price: String(pkg.price || ''),
                duration_minutes: pkg.duration_minutes || 60,
                is_addon: !!pkg.is_addon,
                is_active: pkg.is_active !== false,
            });
        }
    }, [pkg, open]);
    var saveMutation = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_1.api.patch("/admin/catalog/packages/".concat(pkg.id), form); },
        onSuccess: function () { react_hot_toast_1.default.success('Πακέτο ενημερώθηκε'); onSaved(); },
        onError: function (e) { var _a, _b; return react_hot_toast_1.default.error(((_b = (_a = e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Σφάλμα'); },
    });
    if (!open || !pkg)
        return null;
    return (<framer_motion_1.AnimatePresence>
      <framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <framer_motion_1.motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={function (e) { return e.stopPropagation(); }} className="bg-white dark:bg-gray-900 rounded-2xl shadow-modal max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">Επεξεργασία πακέτου</h3>
              <p className="text-xs text-gray-500 mt-0.5">{(_b = pkg.service) === null || _b === void 0 ? void 0 : _b.title} · {(_c = pkg.service) === null || _c === void 0 ? void 0 : _c.provider_email}</p>
            </div>
            <button onClick={onClose} className="btn-ghost p-2"><lucide_react_1.X size={18}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Όνομα *</label>
              <input className="input" value={form.name} onChange={function (e) { return setForm(__assign(__assign({}, form), { name: e.target.value })); }}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Ομάδα</label>
                <select className="input" value={form.group} onChange={function (e) { return setForm(__assign(__assign({}, form), { group: e.target.value })); }}>
                  {Object.entries(GROUP_META).map(function (_a) {
            var key = _a[0], meta = _a[1];
            return (<option key={key} value={key}>{meta.emoji} {meta.label}</option>);
        })}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Τιμή (€) *</label>
                <input type="number" step="0.01" className="input" value={form.price} onChange={function (e) { return setForm(__assign(__assign({}, form), { price: e.target.value })); }}/>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Περιγραφή</label>
              <textarea rows={2} className="input" value={form.description || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { description: e.target.value })); }}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Διάρκεια (λεπτά)</label>
                <input type="number" className="input" value={form.duration_minutes} onChange={function (e) { return setForm(__assign(__assign({}, form), { duration_minutes: parseInt(e.target.value) || 60 })); }}/>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Μέγεθος</label>
                <select className="input" value={form.size || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { size: e.target.value || null })); }}>
                  <option value="">—</option>
                  <option value="small">Μικρό</option>
                  <option value="medium">Μεσαίο</option>
                  <option value="large">Μεγάλο</option>
                  <option value="xlarge">Πολύ μεγάλο</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Pet type</label>
                <select className="input" value={form.pet_type || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { pet_type: e.target.value || null })); }}>
                  <option value="">—</option>
                  <option value="dog">🐕 Σκύλος</option>
                  <option value="cat">🐈 Γάτα</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Modality</label>
                <select className="input" value={form.modality || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { modality: e.target.value || null })); }}>
                  <option value="">—</option>
                  <option value="in_clinic">Στο ιατρείο</option>
                  <option value="home_visit">Κατ' οίκον</option>
                  <option value="telehealth">Τηλεσυμβ.</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.is_addon} onChange={function (e) { return setForm(__assign(__assign({}, form), { is_addon: e.target.checked })); }}/>
                Add-on
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.is_active} onChange={function (e) { return setForm(__assign(__assign({}, form), { is_active: e.target.checked })); }}/>
                Ενεργό
              </label>
            </div>
          </div>
          <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex gap-2 justify-end">
            <button onClick={onClose} className="btn-secondary">Άκυρο</button>
            <button onClick={function () { return saveMutation.mutate(); }} disabled={saveMutation.isPending || !form.name} className="btn-primary">
              {saveMutation.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
            </button>
          </div>
        </framer_motion_1.motion.div>
      </framer_motion_1.motion.div>
    </framer_motion_1.AnimatePresence>);
}
