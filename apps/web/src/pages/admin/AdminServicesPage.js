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
exports.default = AdminServicesPage;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
var react_router_dom_1 = require("react-router-dom");
var api_1 = require("@/lib/api");
var utils_1 = require("@/lib/utils");
var react_hot_toast_1 = require("react-hot-toast");
var CATEGORY_LABELS = {
    grooming: { label: 'Περιποίηση', emoji: '✂️' },
    veterinary: { label: 'Κτηνίατρος', emoji: '🩺' },
    clinic: { label: 'Κλινική', emoji: '🏥' },
    walking: { label: 'Walking', emoji: '🚶' },
    sitting: { label: 'Sitting', emoji: '🏡' },
    boarding: { label: 'Boarding', emoji: '🏨' },
    daycare: { label: 'Daycare', emoji: '☀️' },
    training: { label: 'Εκπαίδευση', emoji: '🎓' },
    transport: { label: 'Μεταφορά', emoji: '🚐' },
    photography: { label: 'Φωτογράφιση', emoji: '📷' },
    insurance: { label: 'Ασφάλιση', emoji: '🛡️' },
    other: { label: 'Άλλο', emoji: '✨' },
};
function AdminServicesPage() {
    var queryClient = (0, react_query_1.useQueryClient)();
    var _a = (0, react_1.useState)(''), search = _a[0], setSearch = _a[1];
    var _b = (0, react_1.useState)('all'), filterCategory = _b[0], setFilterCategory = _b[1];
    var _c = (0, react_1.useState)('all'), filterStatus = _c[0], setFilterStatus = _c[1];
    var _d = (0, react_1.useState)(null), editingService = _d[0], setEditingService = _d[1];
    var _e = (0, react_query_1.useQuery)({
        queryKey: ['admin-services'],
        queryFn: function () { return api_1.api.get('/admin/catalog/services').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }), _f = _e.data, services = _f === void 0 ? [] : _f, isLoading = _e.isLoading;
    var deleteMutation = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_1.api.delete("/admin/catalog/services/".concat(id)); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ['admin-services'] });
            react_hot_toast_1.default.success('Υπηρεσία διαγράφηκε');
        },
        onError: function () { return react_hot_toast_1.default.error('Σφάλμα'); },
    });
    var toggleActive = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var id = _a.id, is_active = _a.is_active;
            return api_1.api.patch("/admin/catalog/services/".concat(id), { is_active: is_active });
        },
        onSuccess: function () { return queryClient.invalidateQueries({ queryKey: ['admin-services'] }); },
    });
    var toggleVerified = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var id = _a.id, is_verified = _a.is_verified;
            return api_1.api.patch("/admin/catalog/services/".concat(id), { is_verified: is_verified });
        },
        onSuccess: function () { return queryClient.invalidateQueries({ queryKey: ['admin-services'] }); },
    });
    var filtered = (0, react_1.useMemo)(function () {
        return services.filter(function (s) {
            var _a, _b, _c;
            if (filterCategory !== 'all' && s.category !== filterCategory)
                return false;
            if (filterStatus === 'active' && !s.is_active)
                return false;
            if (filterStatus === 'inactive' && s.is_active)
                return false;
            if (filterStatus === 'verified' && !s.is_verified)
                return false;
            if (filterStatus === 'unverified' && s.is_verified)
                return false;
            if (search) {
                var q = search.toLowerCase();
                if (!((_a = s.title) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(q)) &&
                    !((_b = s.provider_email) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(q)) &&
                    !((_c = s.city) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes(q)))
                    return false;
            }
            return true;
        });
    }, [services, search, filterCategory, filterStatus]);
    return (<div className="page-container py-8 pb-24 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <react_router_dom_1.Link to="/admin" className="btn-ghost p-2"><lucide_react_1.ArrowLeft size={18}/></react_router_dom_1.Link>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <lucide_react_1.Building2 size={22}/> Υπηρεσίες παρόχων
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Διαχείριση όλων των υπηρεσιών στην πλατφόρμα</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex items-center gap-2 flex-1 input">
          <lucide_react_1.Search size={14} className="text-gray-400 shrink-0"/>
          <input value={search} onChange={function (e) { return setSearch(e.target.value); }} placeholder="Αναζήτηση (όνομα, email, πόλη)..." className="flex-1 bg-transparent text-sm outline-none"/>
        </div>
        <select value={filterCategory} onChange={function (e) { return setFilterCategory(e.target.value); }} className="input text-sm">
          <option value="all">Όλες οι κατηγορίες</option>
          {Object.entries(CATEGORY_LABELS).map(function (_a) {
            var key = _a[0], val = _a[1];
            return (<option key={key} value={key}>{val.emoji} {val.label}</option>);
        })}
        </select>
        <select value={filterStatus} onChange={function (e) { return setFilterStatus(e.target.value); }} className="input text-sm">
          <option value="all">Όλα τα status</option>
          <option value="active">Ενεργά</option>
          <option value="inactive">Ανενεργά</option>
          <option value="verified">Επιβεβαιωμένα</option>
          <option value="unverified">Μη επιβεβαιωμένα</option>
        </select>
      </div>

      <div className="card p-4 mb-4 bg-gradient-to-br from-brand-50 to-amber-50 dark:from-brand-900/20 dark:to-amber-900/20 border-brand-100">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          <strong>{filtered.length}</strong> από <strong>{services.length}</strong> υπηρεσίες ·{' '}
          {services.filter(function (s) { return s.is_verified; }).length} επιβεβαιωμένες ·{' '}
          {services.reduce(function (acc, s) { var _a, _b; return acc + ((_b = (_a = s.packages) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0); }, 0)} συνολικά πακέτα
        </p>
      </div>

      {isLoading ? (<div className="space-y-3">{[1, 2, 3].map(function (i) { return <div key={i} className="skeleton h-32 w-full"/>; })}</div>) : filtered.length === 0 ? (<div className="card p-12 text-center">
          <lucide_react_1.Building2 size={40} className="mx-auto text-gray-300 mb-3"/>
          <h3 className="font-semibold text-gray-900 dark:text-white">Δεν βρέθηκαν υπηρεσίες</h3>
        </div>) : (<div className="space-y-3">
          {filtered.map(function (s) {
                var _a, _b;
                var cat = CATEGORY_LABELS[s.category] || CATEGORY_LABELS.other;
                var packagesCount = (_b = (_a = s.packages) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
                var packagesWithoutPrice = (s.packages || []).filter(function (p) { return !p.price || p.price === 0; }).length;
                return (<div key={s.id} className={(0, utils_1.cn)('card p-4', !s.is_active && 'opacity-60')}>
                <div className="flex items-start gap-3">
                  <div className="text-3xl shrink-0">{cat.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-gray-900 dark:text-white">{s.title}</h3>
                      {s.is_verified && (<span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
                          <lucide_react_1.BadgeCheck size={10}/> Επιβεβαιωμένη
                        </span>)}
                      {!s.is_active && (<span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">Ανενεργή</span>)}
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700">{cat.label}</span>
                    </div>
                    {s.description && <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1 mt-1">{s.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1"><lucide_react_1.Mail size={11}/> {s.provider_email}</span>
                      {s.city && <span className="flex items-center gap-1"><lucide_react_1.MapPin size={11}/> {s.city}</span>}
                      <span className="flex items-center gap-1">
                        <lucide_react_1.Package size={11}/> {packagesCount} πακέτα
                        {packagesWithoutPrice > 0 && (<span className="text-amber-600"> ({packagesWithoutPrice} χωρίς τιμή)</span>)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={function () { return toggleVerified.mutate({ id: s.id, is_verified: !s.is_verified }); }} className="btn-ghost p-1.5" title={s.is_verified ? 'Αφαίρεση επιβεβαίωσης' : 'Επιβεβαίωση'}>
                      <lucide_react_1.BadgeCheck size={14} className={s.is_verified ? 'text-green-600' : 'text-gray-400'}/>
                    </button>
                    <button onClick={function () { return toggleActive.mutate({ id: s.id, is_active: !s.is_active }); }} className="btn-ghost p-1.5" title={s.is_active ? 'Απενεργοποίηση' : 'Ενεργοποίηση'}>
                      {s.is_active ? <lucide_react_1.Check size={14} className="text-green-600"/> : <lucide_react_1.X size={14} className="text-gray-400"/>}
                    </button>
                    <button onClick={function () { return setEditingService(s); }} className="btn-ghost p-1.5">
                      <lucide_react_1.Edit2 size={14} className="text-gray-500"/>
                    </button>
                    <button onClick={function () {
                        if (confirm("\u0394\u03B9\u03B1\u03B3\u03C1\u03B1\u03C6\u03AE \"".concat(s.title, "\" \u03BA\u03B1\u03B9 ").concat(packagesCount, " \u03C0\u03B1\u03BA\u03AD\u03C4\u03C9\u03BD;")))
                            deleteMutation.mutate(s.id);
                    }} className="btn-ghost p-1.5 hover:bg-red-50">
                      <lucide_react_1.Trash2 size={14} className="text-red-500"/>
                    </button>
                  </div>
                </div>
              </div>);
            })}
        </div>)}

      <ServiceEditModal open={!!editingService} onClose={function () { return setEditingService(null); }} service={editingService} onSaved={function () {
            queryClient.invalidateQueries({ queryKey: ['admin-services'] });
            setEditingService(null);
        }}/>
    </div>);
}
// ═══════════════════════════════════════════════════════════════
function ServiceEditModal(_a) {
    var open = _a.open, onClose = _a.onClose, service = _a.service, onSaved = _a.onSaved;
    var _b = (0, react_1.useState)({}), form = _b[0], setForm = _b[1];
    (0, react_1.useEffect)(function () {
        if (service && open) {
            setForm({
                title: service.title || '',
                description: service.description || '',
                category: service.category || 'other',
                city: service.city || '',
                country: service.country || 'GR',
                location: service.location || '',
                home_visits: !!service.home_visits,
                emergency_available: !!service.emergency_available,
                years_experience: service.years_experience || 0,
                specializations: Array.isArray(service.specializations) ? service.specializations.join(', ') : '',
                pet_types: Array.isArray(service.pet_types) ? service.pet_types.join(',') : '',
                languages: Array.isArray(service.languages) ? service.languages.join(',') : 'el,en',
                is_active: service.is_active !== false,
                is_verified: !!service.is_verified,
            });
        }
    }, [service, open]);
    var saveMutation = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_1.api.patch("/admin/catalog/services/".concat(service.id), form); },
        onSuccess: function () { react_hot_toast_1.default.success('Η υπηρεσία ενημερώθηκε'); onSaved(); },
        onError: function (e) { var _a, _b; return react_hot_toast_1.default.error(((_b = (_a = e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Σφάλμα'); },
    });
    if (!open || !service)
        return null;
    return (<framer_motion_1.AnimatePresence>
      <framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <framer_motion_1.motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={function (e) { return e.stopPropagation(); }} className="bg-white dark:bg-gray-900 rounded-2xl shadow-modal max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">Επεξεργασία υπηρεσίας</h3>
              <p className="text-xs text-gray-500 mt-0.5">{service.provider_email}</p>
            </div>
            <button onClick={onClose} className="btn-ghost p-2"><lucide_react_1.X size={18}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Όνομα *</label>
              <input className="input" value={form.title || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { title: e.target.value })); }}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Κατηγορία</label>
                <select className="input" value={form.category || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { category: e.target.value })); }}>
                  {Object.entries(CATEGORY_LABELS).map(function (_a) {
            var key = _a[0], val = _a[1];
            return (<option key={key} value={key}>{val.emoji} {val.label}</option>);
        })}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Πόλη</label>
                <input className="input" value={form.city || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { city: e.target.value })); }}/>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Περιγραφή</label>
              <textarea rows={3} className="input" value={form.description || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { description: e.target.value })); }}/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Διεύθυνση</label>
              <input className="input" value={form.location || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { location: e.target.value })); }}/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Έτη εμπειρίας</label>
              <input type="number" className="input" value={form.years_experience || 0} onChange={function (e) { return setForm(__assign(__assign({}, form), { years_experience: parseInt(e.target.value) || 0 })); }}/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Εξειδικεύσεις (χωρισμένες με κόμμα)</label>
              <input className="input" value={form.specializations || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { specializations: e.target.value })); }}/>
            </div>
            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.home_visits} onChange={function (e) { return setForm(__assign(__assign({}, form), { home_visits: e.target.checked })); }}/>
                Κατ' οίκον
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.emergency_available} onChange={function (e) { return setForm(__assign(__assign({}, form), { emergency_available: e.target.checked })); }}/>
                Έκτακτα
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.is_active} onChange={function (e) { return setForm(__assign(__assign({}, form), { is_active: e.target.checked })); }}/>
                Ενεργή
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.is_verified} onChange={function (e) { return setForm(__assign(__assign({}, form), { is_verified: e.target.checked })); }}/>
                Επιβεβαιωμένη
              </label>
            </div>
          </div>
          <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex gap-2 justify-end">
            <button onClick={onClose} className="btn-secondary">Άκυρο</button>
            <button onClick={function () { return saveMutation.mutate(); }} disabled={saveMutation.isPending || !form.title} className="btn-primary">
              {saveMutation.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
            </button>
          </div>
        </framer_motion_1.motion.div>
      </framer_motion_1.motion.div>
    </framer_motion_1.AnimatePresence>);
}
