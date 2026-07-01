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
exports.default = AdminCatalogPage;
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
    emergency: { label: 'Έκτακτα', emoji: '🚨' },
    other: { label: 'Άλλα', emoji: '📋' },
};
var CATEGORY_LABELS = {
    grooming: { label: 'Περιποίηση', emoji: '✂️' },
    veterinary: { label: 'Κτηνίατρος', emoji: '🩺' },
    clinic: { label: 'Κτηνιατρική κλινική', emoji: '🏥' },
    walking: { label: 'Dog walking', emoji: '🚶' },
    sitting: { label: 'Pet sitting', emoji: '🏡' },
    boarding: { label: 'Boarding', emoji: '🏨' },
    daycare: { label: 'Daycare', emoji: '☀️' },
    training: { label: 'Εκπαίδευση', emoji: '🎓' },
    transport: { label: 'Μεταφορά', emoji: '🚐' },
    photography: { label: 'Φωτογράφιση', emoji: '📷' },
    other: { label: 'Άλλο', emoji: '✨' },
};
var SIZE_LABELS = {
    small: 'Μικρό', medium: 'Μεσαίο', large: 'Μεγάλο', xlarge: 'Πολύ μεγάλο'
};
function AdminCatalogPage() {
    var _a;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _b = (0, react_1.useState)('grooming'), selectedCategory = _b[0], setSelectedCategory = _b[1];
    var _c = (0, react_1.useState)(''), search = _c[0], setSearch = _c[1];
    var _d = (0, react_1.useState)('all'), filterGroup = _d[0], setFilterGroup = _d[1];
    var _e = (0, react_1.useState)(new Set()), collapsedGroups = _e[0], setCollapsedGroups = _e[1];
    var _f = (0, react_1.useState)(null), editingTemplate = _f[0], setEditingTemplate = _f[1];
    var _g = (0, react_1.useState)(false), showModal = _g[0], setShowModal = _g[1];
    var _h = (0, react_query_1.useQuery)({
        queryKey: ['admin-catalog', selectedCategory],
        queryFn: function () { return api_1.api.get("/admin/catalog/templates?category=".concat(selectedCategory)).then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }), _j = _h.data, templates = _j === void 0 ? [] : _j, isLoading = _h.isLoading;
    var deleteMutation = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_1.api.delete("/admin/catalog/templates/".concat(id)); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ['admin-catalog'] });
            react_hot_toast_1.default.success('Template διαγράφηκε');
        },
        onError: function () { return react_hot_toast_1.default.error('Σφάλμα διαγραφής'); },
    });
    var toggleActive = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var id = _a.id, is_active = _a.is_active;
            return api_1.api.patch("/admin/catalog/templates/".concat(id), { is_active: is_active });
        },
        onSuccess: function () { return queryClient.invalidateQueries({ queryKey: ['admin-catalog'] }); },
    });
    var filtered = (0, react_1.useMemo)(function () {
        return templates.filter(function (t) {
            if (filterGroup !== 'all' && t.group !== filterGroup)
                return false;
            if (search && !t.name.toLowerCase().includes(search.toLowerCase()))
                return false;
            return true;
        });
    }, [templates, search, filterGroup]);
    var grouped = (0, react_1.useMemo)(function () {
        var g = {};
        for (var _i = 0, filtered_1 = filtered; _i < filtered_1.length; _i++) {
            var t = filtered_1[_i];
            if (!g[t.group])
                g[t.group] = [];
            g[t.group].push(t);
        }
        return g;
    }, [filtered]);
    var groups = (0, react_1.useMemo)(function () { return Array.from(new Set(templates.map(function (t) { return t.group; }))); }, [templates]);
    var toggleGroup = function (g) {
        setCollapsedGroups(function (prev) {
            var n = new Set(prev);
            n.has(g) ? n.delete(g) : n.add(g);
            return n;
        });
    };
    return (<div className="page-container py-8 pb-24 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <react_router_dom_1.Link to="/admin" className="btn-ghost p-2"><lucide_react_1.ArrowLeft size={18}/></react_router_dom_1.Link>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <lucide_react_1.BookOpen size={22}/> Κατάλογος υπηρεσιών
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Διαχείριση των διαθέσιμων templates που μπορούν να χρησιμοποιήσουν οι πάροχοι
          </p>
        </div>
        <button onClick={function () { setEditingTemplate(null); setShowModal(true); }} className="btn-primary flex items-center gap-2 text-sm">
          <lucide_react_1.Plus size={15}/> Νέο template
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-6 mt-6">
        {Object.entries(CATEGORY_LABELS).map(function (_a) {
            var key = _a[0], val = _a[1];
            return (<button key={key} onClick={function () { return setSelectedCategory(key); }} className={(0, utils_1.cn)('px-4 py-2 rounded-xl text-sm font-medium transition-all border-2 flex items-center gap-2', selectedCategory === key
                    ? 'border-brand-900 bg-brand-50 text-brand-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600')}>
            <span>{val.emoji}</span>
            <span>{val.label}</span>
          </button>);
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex items-center gap-2 flex-1 input">
          <lucide_react_1.Search size={14} className="text-gray-400 shrink-0"/>
          <input value={search} onChange={function (e) { return setSearch(e.target.value); }} placeholder="Αναζήτηση..." className="flex-1 bg-transparent text-sm outline-none"/>
        </div>
        <select value={filterGroup} onChange={function (e) { return setFilterGroup(e.target.value); }} className="input text-sm">
          <option value="all">Όλες οι κατηγορίες</option>
          {groups.map(function (g) { var _a; return <option key={g} value={g}>{((_a = GROUP_META[g]) === null || _a === void 0 ? void 0 : _a.label) || g}</option>; })}
        </select>
      </div>

      {/* Summary */}
      <div className="card p-4 mb-4 bg-gradient-to-br from-brand-50 to-amber-50 dark:from-brand-900/20 dark:to-amber-900/20 border-brand-100">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          <strong>{filtered.length}</strong> templates στην κατηγορία{' '}
          <strong>{(_a = CATEGORY_LABELS[selectedCategory]) === null || _a === void 0 ? void 0 : _a.label}</strong>
          {' · '}{Object.keys(grouped).length} ομάδες
        </p>
      </div>

      {/* Templates list */}
      {isLoading ? (<div className="space-y-3">{[1, 2, 3, 4].map(function (i) { return <div key={i} className="skeleton h-20 w-full"/>; })}</div>) : filtered.length === 0 ? (<div className="card p-12 text-center">
          <lucide_react_1.BookOpen size={40} className="mx-auto text-gray-300 mb-3"/>
          <h3 className="font-semibold text-gray-900 dark:text-white">Δεν βρέθηκαν templates</h3>
          <button onClick={function () { setEditingTemplate(null); setShowModal(true); }} className="btn-primary inline-flex items-center gap-2 mt-4">
            <lucide_react_1.Plus size={15}/> Προσθήκη
          </button>
        </div>) : (<div className="space-y-3">
          {Object.entries(grouped).map(function (_a) {
                var group = _a[0], items = _a[1];
                var meta = GROUP_META[group] || GROUP_META.other;
                var isCollapsed = collapsedGroups.has(group);
                return (<div key={group} className="card overflow-hidden">
                <button onClick={function () { return toggleGroup(group); }} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{meta.emoji}</span>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{meta.label}</h3>
                      <p className="text-xs text-gray-500">{items.length} templates</p>
                    </div>
                  </div>
                  {isCollapsed ? <lucide_react_1.ChevronRight size={18} className="text-gray-400"/> : <lucide_react_1.ChevronDown size={18} className="text-gray-400"/>}
                </button>
                <framer_motion_1.AnimatePresence>
                  {!isCollapsed && (<framer_motion_1.motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-gray-100 dark:border-gray-800">
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {items.map(function (tpl) { return (<div key={tpl.id} className={(0, utils_1.cn)('p-4 flex items-center gap-3', !tpl.is_active && 'opacity-50')}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm text-gray-900 dark:text-white">{tpl.name}</p>
                                {tpl.size && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{SIZE_LABELS[tpl.size]}</span>}
                                {tpl.modality && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">{tpl.modality}</span>}
                                {tpl.pet_type && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700">{tpl.pet_type === 'dog' ? '🐕' : '🐈'}</span>}
                                {tpl.is_addon && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">Add-on</span>}
                                {!tpl.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">Ανενεργό</span>}
                              </div>
                              {tpl.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{tpl.description}</p>}
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                <span className="flex items-center gap-1"><lucide_react_1.Clock size={11}/> {tpl.suggested_duration_minutes}΄</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={function () { return toggleActive.mutate({ id: tpl.id, is_active: !tpl.is_active }); }} className="btn-ghost p-1.5">
                                {tpl.is_active ? <lucide_react_1.Check size={14} className="text-green-600"/> : <lucide_react_1.X size={14} className="text-gray-400"/>}
                              </button>
                              <button onClick={function () { setEditingTemplate(tpl); setShowModal(true); }} className="btn-ghost p-1.5">
                                <lucide_react_1.Edit2 size={14} className="text-gray-500"/>
                              </button>
                              <button onClick={function () { if (confirm("\u0394\u03B9\u03B1\u03B3\u03C1\u03B1\u03C6\u03AE \"".concat(tpl.name, "\";")))
                            deleteMutation.mutate(tpl.id); }} className="btn-ghost p-1.5 hover:bg-red-50">
                                <lucide_react_1.Trash2 size={14} className="text-red-500"/>
                              </button>
                            </div>
                          </div>); })}
                      </div>
                    </framer_motion_1.motion.div>)}
                </framer_motion_1.AnimatePresence>
              </div>);
            })}
        </div>)}

      <TemplateModal open={showModal} onClose={function () { setShowModal(false); setEditingTemplate(null); }} editing={editingTemplate} defaultCategory={selectedCategory} onSaved={function () {
            queryClient.invalidateQueries({ queryKey: ['admin-catalog'] });
            setShowModal(false);
            setEditingTemplate(null);
        }}/>
    </div>);
}
// ═══════════════════════════════════════════════════════════════
function TemplateModal(_a) {
    var open = _a.open, onClose = _a.onClose, editing = _a.editing, defaultCategory = _a.defaultCategory, onSaved = _a.onSaved;
    var _b = (0, react_1.useState)({}), form = _b[0], setForm = _b[1];
    (0, react_1.useEffect)(function () {
        if (open) {
            if (editing) {
                setForm(__assign({}, editing));
            }
            else {
                setForm({
                    category: defaultCategory || 'grooming',
                    group: 'service', name: '', description: '',
                    size: '', pet_type: '', breed_group: '', modality: '',
                    suggested_duration_minutes: 60,
                    is_addon: false, is_active: true, display_order: 0,
                });
            }
        }
    }, [open, editing, defaultCategory]);
    var saveMutation = (0, react_query_1.useMutation)({
        mutationFn: function () { return editing
            ? api_1.api.patch("/admin/catalog/templates/".concat(editing.id), form)
            : api_1.api.post('/admin/catalog/templates', form); },
        onSuccess: function () {
            react_hot_toast_1.default.success(editing ? 'Template ενημερώθηκε' : 'Template προστέθηκε');
            onSaved();
        },
        onError: function (e) { var _a, _b; return react_hot_toast_1.default.error(((_b = (_a = e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Σφάλμα'); },
    });
    if (!open)
        return null;
    return (<framer_motion_1.AnimatePresence>
      <framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <framer_motion_1.motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={function (e) { return e.stopPropagation(); }} className="bg-white dark:bg-gray-900 rounded-2xl shadow-modal max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-bold text-gray-900 dark:text-white">{editing ? 'Επεξεργασία template' : 'Νέο template'}</h3>
            <button onClick={onClose} className="btn-ghost p-2"><lucide_react_1.X size={18}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Όνομα *</label>
              <input className="input" value={form.name || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { name: e.target.value })); }}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Κατηγορία *</label>
                <select className="input" value={form.category || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { category: e.target.value })); }}>
                  {Object.entries(CATEGORY_LABELS).map(function (_a) {
            var key = _a[0], val = _a[1];
            return (<option key={key} value={key}>{val.emoji} {val.label}</option>);
        })}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Ομάδα *</label>
                <select className="input" value={form.group || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { group: e.target.value })); }}>
                  {Object.entries(GROUP_META).map(function (_a) {
            var key = _a[0], meta = _a[1];
            return (<option key={key} value={key}>{meta.emoji} {meta.label}</option>);
        })}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Περιγραφή</label>
              <textarea rows={2} className="input" value={form.description || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { description: e.target.value })); }}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Διάρκεια (λεπτά)</label>
                <input type="number" className="input" value={form.suggested_duration_minutes || 60} onChange={function (e) { return setForm(__assign(__assign({}, form), { suggested_duration_minutes: parseInt(e.target.value) || 60 })); }}/>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Σειρά</label>
                <input type="number" className="input" value={form.display_order || 0} onChange={function (e) { return setForm(__assign(__assign({}, form), { display_order: parseInt(e.target.value) || 0 })); }}/>
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
                  <option value="rabbit">🐰 Κουνέλι</option>
                  <option value="bird">🐦 Πτηνό</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Modality</label>
                <select className="input" value={form.modality || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { modality: e.target.value || null })); }}>
                  <option value="">—</option>
                  <option value="in_clinic">Στο ιατρείο</option>
                  <option value="home_visit">Κατ' οίκον</option>
                  <option value="telehealth">Τηλεσυμβ.</option>
                  <option value="emergency">Έκτακτο</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Breed group</label>
                <input className="input" value={form.breed_group || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { breed_group: e.target.value || null })); }} placeholder="π.χ. terrier"/>
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
            <button onClick={function () { return saveMutation.mutate(); }} disabled={saveMutation.isPending || !form.name || !form.category || !form.group} className="btn-primary">
              {saveMutation.isPending ? 'Αποθήκευση...' : (editing ? 'Ενημέρωση' : 'Προσθήκη')}
            </button>
          </div>
        </framer_motion_1.motion.div>
      </framer_motion_1.motion.div>
    </framer_motion_1.AnimatePresence>);
}
