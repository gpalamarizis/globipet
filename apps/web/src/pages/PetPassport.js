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
exports.default = PetPassport;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var framer_motion_1 = require("framer-motion");
var recharts_1 = require("recharts");
var lucide_react_1 = require("lucide-react");
var api_1 = require("@/lib/api");
var auth_1 = require("@/store/auth");
var utils_1 = require("@/lib/utils");
var react_hot_toast_1 = require("react-hot-toast");
// ─── TAB DEFINITIONS ─────────────────────────────────────────────
var TABS = [
    { id: 'identity', label: 'Ταυτότητα', icon: lucide_react_1.BookOpen },
    { id: 'vaccines', label: 'Εμβόλια', icon: lucide_react_1.Syringe },
    { id: 'health', label: 'Εξετάσεις', icon: lucide_react_1.Stethoscope },
    { id: 'meds', label: 'Φάρμακα', icon: lucide_react_1.Pill },
    { id: 'lab', label: 'Εργαστήριο', icon: lucide_react_1.FlaskConical },
    { id: 'imaging', label: 'Απεικονιστικές', icon: lucide_react_1.ScanLine },
    { id: 'surgery', label: 'Χειρουργεία', icon: lucide_react_1.Scissors },
    { id: 'allergies', label: 'Αλλεργίες', icon: lucide_react_1.AlertTriangle },
    { id: 'chronic', label: 'Χρόνιες Παθήσεις', icon: lucide_react_1.Heart },
    { id: 'dental', label: 'Οδοντιατρικά', icon: lucide_react_1.Smile },
    { id: 'weight', label: 'Βάρος', icon: lucide_react_1.Scale },
    { id: 'genetic', label: 'Γενετικές', icon: lucide_react_1.Dna },
    { id: 'vitals', label: 'Ζωτικά', icon: lucide_react_1.Activity },
    { id: 'pedigree', label: 'Pedigree', icon: lucide_react_1.Award },
    { id: 'travel', label: 'Διαβατήριο', icon: lucide_react_1.Plane },
    { id: 'access', label: 'Πρόσβαση', icon: lucide_react_1.Users },
];
var speciesEmoji = { dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰', fish: '🐟', reptile: '🦎', horse: '🐴', other: '🐾' };
// ─── REUSABLE COMPONENTS ─────────────────────────────────────────
function RecordCard(_a) {
    var title = _a.title, subtitle = _a.subtitle, date = _a.date, badge = _a.badge, badgeColor = _a.badgeColor, onDelete = _a.onDelete, children = _a.children;
    var _b = (0, react_1.useState)(false), open = _b[0], setOpen = _b[1];
    return (<div className="card p-4 mb-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{title}</p>
            {badge && <span className={(0, utils_1.cn)('text-xs px-2 py-0.5 rounded-full font-medium', badgeColor || 'bg-gray-100 text-gray-600')}>{badge}</span>}
          </div>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          {date && <p className="text-xs text-gray-400 mt-0.5">📅 {date}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {children && <button onClick={function () { return setOpen(function (o) { return !o; }); }} className="btn-ghost p-1.5"><lucide_react_1.ChevronDown size={14} className={(0, utils_1.cn)('transition-transform', open && 'rotate-180')}/></button>}
          {onDelete && <button onClick={onDelete} className="btn-ghost p-1.5 text-red-500 hover:text-red-700"><lucide_react_1.Trash2 size={14}/></button>}
        </div>
      </div>
      {open && children && <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-400 space-y-1">{children}</div>}
    </div>);
}
function Field(_a) {
    var label = _a.label, value = _a.value;
    if (!value)
        return null;
    return <p><span className="font-medium text-gray-700 dark:text-gray-300">{label}:</span> {String(value)}</p>;
}
function EmptyState(_a) {
    var label = _a.label, onAdd = _a.onAdd;
    return (<div className="text-center py-12">
      <p className="text-gray-400 mb-3">Δεν υπάρχουν εγγραφές</p>
      <button onClick={onAdd} className="btn-primary text-sm px-4 py-2 flex items-center gap-2 mx-auto"><lucide_react_1.Plus size={14}/>{label}</button>
    </div>);
}
// ─── MODAL WRAPPER ───────────────────────────────────────────────
function Modal(_a) {
    var title = _a.title, onClose = _a.onClose, onSave = _a.onSave, saving = _a.saving, children = _a.children;
    return (<framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <framer_motion_1.motion.div initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} onClick={function (e) { return e.stopPropagation(); }} className="w-full max-w-lg mx-auto card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="btn-ghost p-2"><lucide_react_1.X size={18}/></button>
        </div>
        <div className="space-y-3">{children}</div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="btn-secondary flex-1">Άκυρο</button>
          <button onClick={onSave} disabled={saving} className="btn-primary flex-1">{saving ? 'Αποθήκευση...' : 'Αποθήκευση'}</button>
        </div>
      </framer_motion_1.motion.div>
    </framer_motion_1.motion.div>);
}
function F(_a) {
    var label = _a.label, name = _a.name, form = _a.form, setForm = _a.setForm, _b = _a.type, type = _b === void 0 ? 'text' : _b, options = _a.options;
    var inputCls = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-800 dark:text-white";
    return (<div>
      <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
      {options ? (<select className={inputCls} value={form[name] || ''} onChange={function (e) { return setForm(function (f) {
            var _a;
            return (__assign(__assign({}, f), (_a = {}, _a[name] = e.target.value, _a)));
        }); }}>
          {options.map(function (o) { return <option key={o.value || o} value={o.value || o}>{o.label || o}</option>; })}
        </select>) : type === 'textarea' ? (<textarea className={inputCls} rows={3} value={form[name] || ''} onChange={function (e) { return setForm(function (f) {
            var _a;
            return (__assign(__assign({}, f), (_a = {}, _a[name] = e.target.value, _a)));
        }); }}/>) : (<input type={type} className={inputCls} value={form[name] || ''} onChange={function (e) { return setForm(function (f) {
            var _a;
            return (__assign(__assign({}, f), (_a = {}, _a[name] = e.target.value, _a)));
        }); }}/>)}
    </div>);
}
// ─── MAIN COMPONENT ──────────────────────────────────────────────
function PetPassport() {
    var _a, _b, _c, _d, _e;
    var user = (0, auth_1.useAuthStore)().user;
    var qc = (0, react_query_1.useQueryClient)();
    var _f = (0, react_1.useState)(null), selectedPetId = _f[0], setSelectedPetId = _f[1];
    var _g = (0, react_1.useState)('identity'), activeTab = _g[0], setActiveTab = _g[1];
    var _h = (0, react_1.useState)(null), modal = _h[0], setModal = _h[1];
    var _j = (0, react_1.useState)({}), form = _j[0], setForm = _j[1];
    var _k = (0, react_query_1.useQuery)({
        queryKey: ['my-pets'],
        queryFn: function () { return api_1.api.get('/pets/my').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: !!user,
    }).data, pets = _k === void 0 ? [] : _k;
    var activePetId = selectedPetId || (pets.length === 1 ? (_a = pets[0]) === null || _a === void 0 ? void 0 : _a.id : null);
    var _l = (0, react_query_1.useQuery)({
        queryKey: ['passport', activePetId],
        queryFn: function () { return api_1.api.get("/passport/".concat(activePetId)).then(function (r) { return r.data; }); },
        enabled: !!activePetId,
    }), passport = _l.data, isLoading = _l.isLoading;
    var inv = function () { return qc.invalidateQueries({ queryKey: ['passport', activePetId] }); };
    function useCrud(endpoint, idField) {
        if (idField === void 0) { idField = 'id'; }
        var create = (0, react_query_1.useMutation)({
            mutationFn: function (data) { return api_1.api.post("/passport/".concat(endpoint, "/").concat(activePetId), data); },
            onSuccess: function () { inv(); setModal(null); setForm({}); react_hot_toast_1.default.success('Αποθηκεύτηκε!'); },
            onError: function () { return react_hot_toast_1.default.error('Σφάλμα αποθήκευσης'); },
        });
        var remove = (0, react_query_1.useMutation)({
            mutationFn: function (id) { return api_1.api.delete("/passport/".concat(endpoint, "/").concat(id)); },
            onSuccess: function () { inv(); react_hot_toast_1.default.success('Διαγράφηκε'); },
        });
        return { create: create, remove: remove };
    }
    var vac = useCrud('vaccination');
    var health = useCrud('health');
    var meds = useCrud('medication');
    var lab = useCrud('lab');
    var imaging = useCrud('imaging');
    var surgery = useCrud('surgery');
    var allergy = useCrud('allergy');
    var chronic = useCrud('chronic');
    var dental = useCrud('dental');
    var weight = useCrud('weight');
    var genetic = useCrud('genetic');
    var vitals = useCrud('vitals');
    var travel = useCrud('travel');
    var addAccess = (0, react_query_1.useMutation)({
        mutationFn: function (data) { return api_1.api.post("/passport/access/".concat(activePetId), data); },
        onSuccess: function () { inv(); setModal(null); setForm({}); react_hot_toast_1.default.success('Πρόσβαση χορηγήθηκε'); },
    });
    var revokeAccess = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_1.api.delete("/passport/access/".concat(id)); },
        onSuccess: function () { inv(); react_hot_toast_1.default.success('Πρόσβαση ανακλήθηκε'); },
    });
    var openModal = function (type, defaults) {
        if (defaults === void 0) { defaults = {}; }
        setModal(type);
        setForm(defaults);
    };
    var pet = passport === null || passport === void 0 ? void 0 : passport.pet;
    var p = passport || {};
    var severityColor = function (s) { return s === 'severe' || s === 'anaphylactic' ? 'bg-red-100 text-red-700' : s === 'moderate' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'; };
    return (<div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6">
      <div className="max-w-4xl mx-auto px-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center"><lucide_react_1.BookOpen size={20} className="text-orange-600"/></div>
            <div>
              <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Ιατρικός Φάκελος</h1>
              <p className="text-sm text-gray-500">Πλήρες ιστορικό υγείας & διαβατήριο κατοικιδίου</p>
            </div>
          </div>
          {activePetId && (<a href={"".concat(import.meta.env.VITE_API_URL || 'https://api.globipet.com', "/passport/").concat(activePetId, "/pdf")} target="_blank" rel="noreferrer" className="btn-secondary flex items-center gap-2 text-sm px-4 py-2.5">
              <lucide_react_1.FileDown size={15}/> Εξαγωγή PDF
            </a>)}
        </div>

        {/* Pet selector */}
        {pets.length > 1 && (<div className="flex flex-wrap gap-2 mb-5">
            {pets.map(function (p) { return (<button key={p.id} onClick={function () { return setSelectedPetId(p.id); }} className={(0, utils_1.cn)('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all', activePetId === p.id ? 'bg-brand-900 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300')}>
                <span>{speciesEmoji[p.species] || '🐾'}</span>{p.name}
              </button>); })}
          </div>)}

        {!activePetId && <div className="card p-8 text-center text-gray-400">Επίλεξε κατοικίδιο για να δεις τον φάκελο</div>}

        {activePetId && !isLoading && pet && (<>
            {/* Alerts for allergies & chronic conditions */}
            {(((_b = p.allergies) === null || _b === void 0 ? void 0 : _b.length) > 0 || ((_c = p.chronicConditions) === null || _c === void 0 ? void 0 : _c.filter(function (c) { return c.status === 'active'; }).length) > 0) && (<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                {((_d = p.allergies) === null || _d === void 0 ? void 0 : _d.length) > 0 && (<div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                    <lucide_react_1.AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5"/>
                    <div><p className="text-xs font-bold text-red-700 mb-1">ΑΛΛΕΡΓΙΕΣ</p>
                      <p className="text-xs text-red-600">{p.allergies.map(function (a) { return a.allergen; }).join(', ')}</p></div>
                  </div>)}
                {((_e = p.chronicConditions) === null || _e === void 0 ? void 0 : _e.filter(function (c) { return c.status === 'active'; }).length) > 0 && (<div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                    <lucide_react_1.Heart size={16} className="text-yellow-600 shrink-0 mt-0.5"/>
                    <div><p className="text-xs font-bold text-yellow-700 mb-1">ΧΡΟΝΙΕΣ ΠΑΘΗΣΕΙΣ</p>
                      <p className="text-xs text-yellow-600">{p.chronicConditions.filter(function (c) { return c.status === 'active'; }).map(function (c) { return c.condition; }).join(', ')}</p></div>
                  </div>)}
              </div>)}

            {/* Tabs */}
            <div className="flex flex-wrap gap-1 mb-5">
              {TABS.map(function (tab) { return (<button key={tab.id} onClick={function () { return setActiveTab(tab.id); }} className={(0, utils_1.cn)('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all', activeTab === tab.id ? 'bg-brand-900 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400')}>
                  <tab.icon size={13}/>{tab.label}
                </button>); })}
            </div>

            {/* ── IDENTITY ── */}
            {activeTab === 'identity' && (<div className="card p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-4xl">{speciesEmoji[pet.species] || '🐾'}</div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{pet.name}</h2>
                    <p className="text-gray-500">{pet.breed || pet.species}</p>
                    <p className="text-xs text-gray-400 mt-1">ID: {pet.id.slice(0, 8)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[['Είδος', pet.species], ['Ράτσα', pet.breed], ['Φύλο', pet.gender], ['Γέννηση', pet.birthday],
                    ['Χρώμα', pet.color], ['Αποστειρωμένο', pet.is_sterilized ? 'Ναι' : 'Όχι'],
                    ['Μικροτσίπ', pet.microchip], ['Αριθμός Διαβατηρίου', pet.passport_number]
                ].filter(function (_a) {
                    var v = _a[1];
                    return v;
                }).map(function (_a) {
                    var l = _a[0], v = _a[1];
                    return (<div key={l}><p className="text-xs text-gray-400">{l}</p><p className="font-medium text-gray-900 dark:text-white">{v}</p></div>);
                })}
                </div>
              </div>)}

            {/* ── VACCINES ── */}
            {activeTab === 'vaccines' && (<>
                <button onClick={function () { return openModal('vaccine', { date_administered: new Date().toISOString().split('T')[0] }); }} className="btn-primary text-sm flex items-center gap-2 mb-4"><lucide_react_1.Plus size={14}/>Νέο Εμβόλιο</button>
                {(p.vaccinations || []).length === 0 ? <EmptyState label="Προσθήκη εμβολίου" onAdd={function () { return openModal('vaccine', {}); }}/> :
                    (p.vaccinations || []).map(function (v) { return (<RecordCard key={v.id} title={v.vaccine_name} subtitle={"".concat(v.vaccine_type, " \u00B7 ").concat(v.vet_name || '')} date={v.date_administered} badge={v.next_due_date && new Date(v.next_due_date) < new Date() ? 'Εκπρόθεσμο' : v.next_due_date ? "\u0395\u03C0\u03CC\u03BC\u03B5\u03BD\u03BF: ".concat(v.next_due_date) : undefined} badgeColor={v.next_due_date && new Date(v.next_due_date) < new Date() ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'} onDelete={function () { return vac.remove.mutate(v.id); }}>
                      <Field label="Τύπος" value={v.vaccine_type}/><Field label="Κτηνίατρος" value={v.vet_name}/><Field label="Σημειώσεις" value={v.notes}/>
                    </RecordCard>); })}
              </>)}

            {/* ── HEALTH ── */}
            {activeTab === 'health' && (<>
                <button onClick={function () { return openModal('health', { date: new Date().toISOString().split('T')[0], record_type: 'examination' }); }} className="btn-primary text-sm flex items-center gap-2 mb-4"><lucide_react_1.Plus size={14}/>Νέα Εξέταση</button>
                {(p.healthRecords || []).length === 0 ? <EmptyState label="Προσθήκη εξέτασης" onAdd={function () { return openModal('health', {}); }}/> :
                    (p.healthRecords || []).map(function (h) { return (<RecordCard key={h.id} title={h.title} subtitle={"".concat(h.record_type, " \u00B7 ").concat(h.vet_name || '', " \u00B7 ").concat(h.clinic_name || '')} date={h.date} onDelete={function () { return health.remove.mutate(h.id); }}>
                      <Field label="Περιγραφή" value={h.description}/><Field label="Κόστος" value={h.cost ? "".concat(h.cost, "\u20AC") : null}/><Field label="Επόμενο Ραντεβού" value={h.next_appointment}/>
                    </RecordCard>); })}
              </>)}

            {/* ── MEDICATIONS ── */}
            {activeTab === 'meds' && (<>
                <button onClick={function () { return openModal('med', { start_date: new Date().toISOString().split('T')[0], is_active: true }); }} className="btn-primary text-sm flex items-center gap-2 mb-4"><lucide_react_1.Plus size={14}/>Νέο Φάρμακο</button>
                {(p.medications || []).length === 0 ? <EmptyState label="Προσθήκη φαρμάκου" onAdd={function () { return openModal('med', {}); }}/> :
                    (p.medications || []).map(function (m) { return (<RecordCard key={m.id} title={"".concat(m.name, " ").concat(m.dosage)} subtitle={"".concat(m.frequency, " \u00B7 ").concat(m.prescribed_by || '')} date={"".concat(m.start_date).concat(m.end_date ? ' → ' + m.end_date : '')} badge={m.is_active ? 'Ενεργό' : 'Ολοκληρώθηκε'} badgeColor={m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'} onDelete={function () { return meds.remove.mutate(m.id); }}>
                      <Field label="Δραστική" value={m.active_ingredient}/><Field label="Οδός χορήγησης" value={m.route}/><Field label="Αιτία" value={m.reason}/><Field label="Παρενέργειες" value={m.side_effects}/>
                    </RecordCard>); })}
              </>)}

            {/* ── LAB ── */}
            {activeTab === 'lab' && (<>
                <button onClick={function () { return openModal('lab', { date: new Date().toISOString().split('T')[0] }); }} className="btn-primary text-sm flex items-center gap-2 mb-4"><lucide_react_1.Plus size={14}/>Νέα Εργαστηριακή</button>
                {(p.labResults || []).length === 0 ? <EmptyState label="Προσθήκη αποτελέσματος" onAdd={function () { return openModal('lab', {}); }}/> :
                    (p.labResults || []).map(function (l) {
                        var _a;
                        return (<RecordCard key={l.id} title={l.title} subtitle={"".concat(l.result_type, " \u00B7 ").concat(l.lab_name || '', " \u00B7 ").concat(l.vet_name || '')} date={l.date} badge={l.is_abnormal ? 'Παθολογικά' : 'Φυσιολογικά'} badgeColor={l.is_abnormal ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'} onDelete={function () { return lab.remove.mutate(l.id); }}>
                      <Field label="Ευρήματα" value={l.findings}/><Field label="Εργαστήριο" value={l.lab_name}/>
                      {((_a = l.file_urls) === null || _a === void 0 ? void 0 : _a.length) > 0 && <p className="font-medium">Αρχεία: {l.file_urls.map(function (u, i) { return <a key={i} href={u} target="_blank" rel="noreferrer" className="text-blue-500 underline mr-2">Αρχείο {i + 1} <lucide_react_1.ExternalLink size={10} className="inline"/></a>; })}</p>}
                    </RecordCard>);
                    })}
              </>)}

            {/* ── IMAGING ── */}
            {activeTab === 'imaging' && (<>
                <button onClick={function () { return openModal('imaging', { date: new Date().toISOString().split('T')[0] }); }} className="btn-primary text-sm flex items-center gap-2 mb-4"><lucide_react_1.Plus size={14}/>Νέα Απεικόνιση</button>
                {(p.imaging || []).length === 0 ? <EmptyState label="Προσθήκη απεικονιστικής" onAdd={function () { return openModal('imaging', {}); }}/> :
                    (p.imaging || []).map(function (img) {
                        var _a;
                        return (<RecordCard key={img.id} title={img.imaging_type.toUpperCase()} subtitle={"".concat(img.body_region || '', " \u00B7 ").concat(img.vet_name || '', " \u00B7 ").concat(img.clinic_name || '')} date={img.date} onDelete={function () { return imaging.remove.mutate(img.id); }}>
                      <Field label="Ευρήματα" value={img.findings}/><Field label="Έκθεση" value={img.report}/>
                      {((_a = img.file_urls) === null || _a === void 0 ? void 0 : _a.length) > 0 && <p>Αρχεία: {img.file_urls.map(function (u, i) { return <a key={i} href={u} target="_blank" rel="noreferrer" className="text-blue-500 underline mr-2">Εικόνα {i + 1}</a>; })}</p>}
                    </RecordCard>);
                    })}
              </>)}

            {/* ── SURGERY ── */}
            {activeTab === 'surgery' && (<>
                <button onClick={function () { return openModal('surgery', { date: new Date().toISOString().split('T')[0] }); }} className="btn-primary text-sm flex items-center gap-2 mb-4"><lucide_react_1.Plus size={14}/>Νέο Χειρουργείο</button>
                {(p.surgeries || []).length === 0 ? <EmptyState label="Προσθήκη χειρουργείου" onAdd={function () { return openModal('surgery', {}); }}/> :
                    (p.surgeries || []).map(function (s) { return (<RecordCard key={s.id} title={s.procedure} subtitle={"".concat(s.surgeon_name || '', " \u00B7 ").concat(s.clinic_name || '')} date={s.date} onDelete={function () { return surgery.remove.mutate(s.id); }}>
                      <Field label="Κατηγορία" value={s.category}/><Field label="Αναισθησία" value={s.anesthesia}/><Field label="Διάρκεια" value={s.duration_min ? "".concat(s.duration_min, " \u03BB\u03B5\u03C0\u03C4\u03AC") : null}/>
                      <Field label="Επιπλοκές" value={s.complications}/><Field label="Αποτέλεσμα" value={s.outcome}/><Field label="Follow-up" value={s.follow_up}/><Field label="Κόστος" value={s.cost ? "".concat(s.cost, "\u20AC") : null}/>
                    </RecordCard>); })}
              </>)}

            {/* ── ALLERGIES ── */}
            {activeTab === 'allergies' && (<>
                <button onClick={function () { return openModal('allergy', {}); }} className="btn-primary text-sm flex items-center gap-2 mb-4"><lucide_react_1.Plus size={14}/>Νέα Αλλεργία</button>
                {(p.allergies || []).length === 0 ? <EmptyState label="Προσθήκη αλλεργίας" onAdd={function () { return openModal('allergy', {}); }}/> :
                    (p.allergies || []).map(function (a) { return (<RecordCard key={a.id} title={a.allergen} subtitle={"".concat(a.allergen_type, " \u00B7 ").concat(a.reaction || '')} badge={a.severity} badgeColor={severityColor(a.severity)} onDelete={function () { return allergy.remove.mutate(a.id); }}>
                      <Field label="Αντίδραση" value={a.reaction}/><Field label="Θεραπεία" value={a.treatment}/><Field label="Διεγνώσθηκε από" value={a.diagnosed_by}/>
                    </RecordCard>); })}
              </>)}

            {/* ── CHRONIC ── */}
            {activeTab === 'chronic' && (<>
                <button onClick={function () { return openModal('chronic', { status: 'active' }); }} className="btn-primary text-sm flex items-center gap-2 mb-4"><lucide_react_1.Plus size={14}/>Νέα Χρόνια Πάθηση</button>
                {(p.chronicConditions || []).length === 0 ? <EmptyState label="Προσθήκη πάθησης" onAdd={function () { return openModal('chronic', {}); }}/> :
                    (p.chronicConditions || []).map(function (c) { return (<RecordCard key={c.id} title={c.condition} subtitle={"".concat(c.diagnosed_by || '', " \u00B7 ").concat(c.clinic_name || '')} date={c.diagnosed_date} badge={c.status === 'active' ? 'Ενεργή' : c.status === 'managed' ? 'Ελεγχόμενη' : 'Σε ύφεση'} badgeColor={c.status === 'active' ? 'bg-red-100 text-red-700' : c.status === 'managed' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'} onDelete={function () { return chronic.remove.mutate(c.id); }}>
                      <Field label="ICD Κωδικός" value={c.icd_code}/><Field label="Σχέδιο θεραπείας" value={c.treatment_plan}/><Field label="Παρακολούθηση" value={c.monitoring}/>
                    </RecordCard>); })}
              </>)}

            {/* ── DENTAL ── */}
            {activeTab === 'dental' && (<>
                <button onClick={function () { return openModal('dental', { date: new Date().toISOString().split('T')[0] }); }} className="btn-primary text-sm flex items-center gap-2 mb-4"><lucide_react_1.Plus size={14}/>Νέα Οδοντιατρική Πράξη</button>
                {(p.dentalRecords || []).length === 0 ? <EmptyState label="Προσθήκη οδοντιατρικής" onAdd={function () { return openModal('dental', {}); }}/> :
                    (p.dentalRecords || []).map(function (d) { return (<RecordCard key={d.id} title={d.procedure} subtitle={"".concat(d.vet_name || '', " \u00B7 ").concat(d.clinic_name || '')} date={d.date} onDelete={function () { return dental.remove.mutate(d.id); }}>
                      <Field label="Δόντια" value={d.teeth_treated}/><Field label="Ευρήματα" value={d.findings}/><Field label="Στάδιο" value={d.grade}/><Field label="Επόμενος καθαρισμός" value={d.next_due}/><Field label="Κόστος" value={d.cost ? "".concat(d.cost, "\u20AC") : null}/>
                    </RecordCard>); })}
              </>)}

            {/* ── WEIGHT CHART ── */}
            {activeTab === 'weight' && (<>
                <button onClick={function () { return openModal('weight', { date: new Date().toISOString().split('T')[0] }); }} className="btn-primary text-sm flex items-center gap-2 mb-4"><lucide_react_1.Plus size={14}/>Νέα Μέτρηση</button>
                {(p.weightRecords || []).length > 1 && (<div className="card p-4 mb-4">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Γράφημα Βάρους</p>
                    <recharts_1.ResponsiveContainer width="100%" height={180}>
                      <recharts_1.LineChart data={p.weightRecords.map(function (w) { return ({ date: w.date.slice(5), kg: w.weight_kg }); })}>
                        <recharts_1.XAxis dataKey="date" tick={{ fontSize: 11 }}/>
                        <recharts_1.YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']}/>
                        <recharts_1.Tooltip formatter={function (v) { return ["".concat(v, " kg"), 'Βάρος']; }}/>
                        <recharts_1.Line type="monotone" dataKey="kg" stroke="#E65100" strokeWidth={2} dot={{ r: 4, fill: '#E65100' }}/>
                      </recharts_1.LineChart>
                    </recharts_1.ResponsiveContainer>
                  </div>)}
                {(p.weightRecords || []).length === 0 ? <EmptyState label="Προσθήκη μέτρησης" onAdd={function () { return openModal('weight', {}); }}/> :
                    (p.weightRecords || []).slice().reverse().map(function (w) { return (<RecordCard key={w.id} title={"".concat(w.weight_kg, " kg")} subtitle={"BCS: ".concat(w.bcs || '-', "/9 \u00B7 ").concat(w.vet_name || '')} date={w.date} onDelete={function () { return weight.remove.mutate(w.id); }}>
                      <Field label="Σημειώσεις" value={w.notes}/>
                    </RecordCard>); })}
              </>)}

            {/* ── GENETIC ── */}
            {activeTab === 'genetic' && (<>
                <button onClick={function () { return openModal('genetic', { date: new Date().toISOString().split('T')[0] }); }} className="btn-primary text-sm flex items-center gap-2 mb-4"><lucide_react_1.Plus size={14}/>Νέα Γενετική Εξέταση</button>
                {(p.geneticTests || []).length === 0 ? <EmptyState label="Προσθήκη γενετικής" onAdd={function () { return openModal('genetic', {}); }}/> :
                    (p.geneticTests || []).map(function (g) {
                        var _a, _b;
                        return (<RecordCard key={g.id} title={g.test_name} subtitle={g.provider} date={g.date} onDelete={function () { return genetic.remove.mutate(g.id); }}>
                      <Field label="Αποτελέσματα" value={g.results}/>
                      {((_a = g.breeds_detected) === null || _a === void 0 ? void 0 : _a.length) > 0 && <p><span className="font-medium">Ράτσες:</span> {g.breeds_detected.join(', ')}</p>}
                      {((_b = g.conditions_found) === null || _b === void 0 ? void 0 : _b.length) > 0 && <p><span className="font-medium">Παθήσεις:</span> {g.conditions_found.join(', ')}</p>}
                    </RecordCard>);
                    })}
              </>)}

            {/* ── VITALS ── */}
            {activeTab === 'vitals' && (<>
                <button onClick={function () { return openModal('vitals', { date: new Date().toISOString().split('T')[0] }); }} className="btn-primary text-sm flex items-center gap-2 mb-4"><lucide_react_1.Plus size={14}/>Νέα Μέτρηση Ζωτικών</button>
                {(p.vitalSigns || []).length === 0 ? <EmptyState label="Προσθήκη ζωτικών" onAdd={function () { return openModal('vitals', {}); }}/> :
                    (p.vitalSigns || []).map(function (v) { return (<RecordCard key={v.id} title={"".concat(v.temperature_c ? v.temperature_c + '°C' : '', " ").concat(v.heart_rate ? v.heart_rate + ' bpm' : '', " ").concat(v.weight_kg ? v.weight_kg + ' kg' : '').trim()} subtitle={v.vet_name} date={v.date} onDelete={function () { return vitals.remove.mutate(v.id); }}>
                      <Field label="Θερμοκρασία" value={v.temperature_c ? "".concat(v.temperature_c, "\u00B0C") : null}/>
                      <Field label="Καρδιακοί παλμοί" value={v.heart_rate ? "".concat(v.heart_rate, " bpm") : null}/>
                      <Field label="Αναπνευστικός ρυθμός" value={v.respiratory_rate ? "".concat(v.respiratory_rate, " /min") : null}/>
                      <Field label="Αρτηριακή πίεση" value={v.blood_pressure}/><Field label="Τριχοειδής επαναπλήρωση" value={v.capillary_refill}/>
                    </RecordCard>); })}
              </>)}

            {/* ── PEDIGREE ── */}
            {activeTab === 'pedigree' && (<div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 dark:text-white">Στοιχεία Pedigree</h3>
                  <button onClick={function () { return openModal('pedigree', p.pedigree || {}); }} className="btn-secondary text-xs flex items-center gap-1.5"><lucide_react_1.Edit2 size={13}/>Επεξεργασία</button>
                </div>
                {p.pedigree ? (<div className="grid grid-cols-2 gap-4 text-sm">
                    {[['Αρ. Εγγραφής', p.pedigree.registration_number], ['Kennel Club', p.pedigree.kennel_club],
                        ['Πατέρας', p.pedigree.father_name], ['Μητέρα', p.pedigree.mother_name],
                        ['Εκτροφέας', p.pedigree.breeder_name], ['Επικοινωνία', p.pedigree.breeder_contact]
                    ].filter(function (_a) {
                        var v = _a[1];
                        return v;
                    }).map(function (_a) {
                        var l = _a[0], v = _a[1];
                        return (<div key={l}><p className="text-xs text-gray-400">{l}</p><p className="font-medium">{v}</p></div>);
                    })}
                  </div>) : <EmptyState label="Προσθήκη Pedigree" onAdd={function () { return openModal('pedigree', {}); }}/>}
              </div>)}

            {/* ── TRAVEL / PASSPORT ── */}
            {activeTab === 'travel' && (<>
                {/* Info banner */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  <div className="card p-4 border-l-4 border-blue-500">
                    <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-2">🇬🇷 Εσωτερικό Ταξίδι</p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <li>✅ Μικροτσίπ (ISO 11784/11785)</li>
                      <li>✅ Εμβόλιο Λύσσας σε ισχύ</li>
                      <li>✅ Βιβλιάριο υγείας</li>
                      <li>✅ Κτηνιατρικό πιστοποιητικό</li>
                    </ul>
                  </div>
                  <div className="card p-4 border-l-4 border-orange-500">
                    <p className="text-xs font-bold text-orange-700 dark:text-orange-400 mb-2">🌍 Διεθνές Ταξίδι (ΕΕ)</p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <li>✅ EU Pet Passport</li>
                      <li>✅ Μικροτσίπ πριν τον εμβολιασμό</li>
                      <li>✅ Εμβόλιο Λύσσας (21+ ημέρες)</li>
                      <li>✅ Τίτλοι αντισωμάτων (εκτός ΕΕ)</li>
                      <li>✅ Θεράπευση Echinococcus (σκύλοι)</li>
                    </ul>
                  </div>
                </div>

                {/* Passport checklist status */}
                {passport && (<div className="card p-4 mb-4 bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3">📋 Κατάσταση Εγγράφων</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { label: 'Μικροτσίπ', ok: !!(pet === null || pet === void 0 ? void 0 : pet.microchip) },
                        { label: 'Εμβόλιο Λύσσας', ok: (passport.vaccinations || []).some(function (v) { return v.vaccine_type === 'rabies' && (!v.next_due_date || new Date(v.next_due_date) > new Date()); }) },
                        { label: 'Εξέταση SNAP', ok: (passport.healthRecords || []).length > 0 },
                        { label: 'Ταξιδιωτικά Έγγραφα', ok: (passport.travelDocs || []).length > 0 },
                    ].map(function (_a) {
                        var label = _a.label, ok = _a.ok;
                        return (<div key={label} className={(0, utils_1.cn)('flex items-center gap-2 p-2 rounded-lg', ok ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20')}>
                          <span>{ok ? '✅' : '❌'}</span>
                          <span className={ok ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{label}</span>
                        </div>);
                    })}
                    </div>
                  </div>)}

                <button onClick={function () { return openModal('travel', {}); }} className="btn-primary text-sm flex items-center gap-2 mb-4"><lucide_react_1.Plus size={14}/>Νέο Ταξίδι / Έγγραφο</button>
                {(p.travelDocs || []).length === 0 ? <EmptyState label="Προσθήκη ταξιδιού" onAdd={function () { return openModal('travel', {}); }}/> :
                    (p.travelDocs || []).map(function (t) { return (<RecordCard key={t.id} title={"".concat(t.origin_city || '', " \u2192 ").concat(t.destination_city)} subtitle={"".concat(t.travel_type, " \u00B7 ").concat(t.carrier || '')} date={t.departure_date} onDelete={function () { return travel.remove.mutate(t.id); }}>
                      <Field label="Χώρα" value={t.destination_country}/><Field label="Επιστροφή" value={t.return_date}/><Field label="Κωδικός" value={t.booking_ref}/>
                    </RecordCard>); })}
              </>)}

            {/* ── ACCESS ── */}
            {activeTab === 'access' && (<>
                <div className="card p-4 mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30">
                  <div className="flex items-start gap-2">
                    <lucide_react_1.Shield size={16} className="text-blue-600 shrink-0 mt-0.5"/>
                    <p className="text-xs text-blue-700 dark:text-blue-300">Χορήγησε πρόσβαση σε συγκεκριμένους κτηνιάτρους για να δουν τον φάκελο του ζώου σου. Μπορείς να ανακαλέσεις την πρόσβαση οποτεδήποτε.</p>
                  </div>
                </div>
                <button onClick={function () { return openModal('access', {}); }} className="btn-primary text-sm flex items-center gap-2 mb-4"><lucide_react_1.Plus size={14}/>Χορήγηση Πρόσβασης</button>
                {(p.accessList || []).length === 0 ? (<div className="text-center py-12 text-gray-400">Κανείς κτηνίατρος δεν έχει πρόσβαση ακόμα</div>) : (p.accessList || []).map(function (a) { return (<RecordCard key={a.id} title={a.provider_name} subtitle={a.provider_email} badge={a.status === 'approved' ? 'Εγκεκριμένη' : 'Ανακλήθηκε'} badgeColor={a.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'} onDelete={a.status === 'approved' ? function () { return revokeAccess.mutate(a.id); } : undefined}>
                    <Field label="Αιτία" value={a.reason}/><Field label="Εγκρίθηκε" value={a.granted_at ? new Date(a.granted_at).toLocaleDateString('el-GR') : null}/><Field label="Λήξη" value={a.expires_at ? new Date(a.expires_at).toLocaleDateString('el-GR') : 'Χωρίς λήξη'}/>
                  </RecordCard>); })}
              </>)}
          </>)}

        {isLoading && <div className="text-center py-16 text-gray-400">Φόρτωση φακέλου...</div>}
      </div>

      {/* ─── MODALS ─────────────────────────────────────────────── */}
      <framer_motion_1.AnimatePresence>
        {modal === 'vaccine' && (<Modal title="Νέο Εμβόλιο" onClose={function () { return setModal(null); }} onSave={function () { return vac.create.mutate(form); }} saving={vac.create.isPending}>
            <F label="Εμβόλιο *" name="vaccine_name" form={form} setForm={setForm}/>
            <F label="Τύπος" name="vaccine_type" form={form} setForm={setForm} options={[{ value: '', label: '—' }, { value: 'core', label: 'Core' }, { value: 'non_core', label: 'Non-Core' }, { value: 'rabies', label: 'Λύσσα' }, { value: 'other', label: 'Άλλο' }]}/>
            <F label="Ημ. Χορήγησης *" name="date_administered" form={form} setForm={setForm} type="date"/>
            <F label="Επόμενη Δόση" name="next_due_date" form={form} setForm={setForm} type="date"/>
            <F label="Κτηνίατρος" name="vet_name" form={form} setForm={setForm}/>
            <F label="Σημειώσεις" name="notes" form={form} setForm={setForm} type="textarea"/>
          </Modal>)}

        {modal === 'health' && (<Modal title="Νέα Εξέταση" onClose={function () { return setModal(null); }} onSave={function () { return health.create.mutate(form); }} saving={health.create.isPending}>
            <F label="Τίτλος *" name="title" form={form} setForm={setForm}/>
            <F label="Τύπος" name="record_type" form={form} setForm={setForm} options={['examination', 'diagnosis', 'follow_up', 'specialist', 'emergency', 'other']}/>
            <F label="Ημερομηνία *" name="date" form={form} setForm={setForm} type="date"/>
            <F label="Κτηνίατρος" name="vet_name" form={form} setForm={setForm}/>
            <F label="Κλινική" name="clinic_name" form={form} setForm={setForm}/>
            <F label="Περιγραφή" name="description" form={form} setForm={setForm} type="textarea"/>
            <F label="Κόστος (€)" name="cost" form={form} setForm={setForm} type="number"/>
            <F label="Επόμενο Ραντεβού" name="next_appointment" form={form} setForm={setForm} type="date"/>
          </Modal>)}

        {modal === 'med' && (<Modal title="Νέο Φάρμακο" onClose={function () { return setModal(null); }} onSave={function () { return meds.create.mutate(form); }} saving={meds.create.isPending}>
            <F label="Όνομα Φαρμάκου *" name="name" form={form} setForm={setForm}/>
            <F label="Δραστική Ουσία" name="active_ingredient" form={form} setForm={setForm}/>
            <F label="Δοσολογία *" name="dosage" form={form} setForm={setForm}/>
            <F label="Συχνότητα *" name="frequency" form={form} setForm={setForm} options={['Μία φορά/ημέρα', 'Δύο φορές/ημέρα', 'Τρεις φορές/ημέρα', 'Εβδομαδιαία', 'Μηνιαία', 'Κατά ανάγκη']}/>
            <F label="Οδός Χορήγησης" name="route" form={form} setForm={setForm} options={[{ value: '', label: '—' }, { value: 'oral', label: 'Από το στόμα' }, { value: 'injection', label: 'Ένεση' }, { value: 'topical', label: 'Τοπικά' }, { value: 'eye_drops', label: 'Οφθαλμικές σταγόνες' }, { value: 'ear_drops', label: 'Ωτικές σταγόνες' }]}/>
            <F label="Ημ. Έναρξης *" name="start_date" form={form} setForm={setForm} type="date"/>
            <F label="Ημ. Λήξης" name="end_date" form={form} setForm={setForm} type="date"/>
            <F label="Συνταγογραφήθηκε από" name="prescribed_by" form={form} setForm={setForm}/>
            <F label="Αιτία χορήγησης" name="reason" form={form} setForm={setForm}/>
            <F label="Πιθανές Παρενέργειες" name="side_effects" form={form} setForm={setForm} type="textarea"/>
          </Modal>)}

        {modal === 'lab' && (<Modal title="Νέα Εργαστηριακή Εξέταση" onClose={function () { return setModal(null); }} onSave={function () { return lab.create.mutate(form); }} saving={lab.create.isPending}>
            <F label="Τίτλος *" name="title" form={form} setForm={setForm}/>
            <F label="Τύπος Εξέτασης" name="result_type" form={form} setForm={setForm} options={[{ value: 'blood_count', label: 'Αιματολογικό' }, { value: 'biochemistry', label: 'Βιοχημικός Έλεγχος' }, { value: 'urine', label: 'Ούρων' }, { value: 'fecal', label: 'Κοπράνων' }, { value: 'biopsy', label: 'Βιοψία' }, { value: 'culture', label: 'Καλλιέργεια' }, { value: 'hormone', label: 'Ορμόνες' }, { value: 'serology', label: 'Ορολογία' }, { value: 'other', label: 'Άλλο' }]}/>
            <F label="Ημερομηνία *" name="date" form={form} setForm={setForm} type="date"/>
            <F label="Εργαστήριο" name="lab_name" form={form} setForm={setForm}/>
            <F label="Κτηνίατρος" name="vet_name" form={form} setForm={setForm}/>
            <F label="Κλινική" name="clinic_name" form={form} setForm={setForm}/>
            <F label="Ευρήματα" name="findings" form={form} setForm={setForm} type="textarea"/>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="abnormal" checked={form.is_abnormal || false} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { is_abnormal: e.target.checked })); }); }}/>
              <label htmlFor="abnormal" className="text-sm text-gray-700 dark:text-gray-300">Παθολογικά Αποτελέσματα</label>
            </div>
          </Modal>)}

        {modal === 'imaging' && (<Modal title="Νέα Απεικονιστική Εξέταση" onClose={function () { return setModal(null); }} onSave={function () { return imaging.create.mutate(form); }} saving={imaging.create.isPending}>
            <F label="Τύπος *" name="imaging_type" form={form} setForm={setForm} options={[{ value: 'xray', label: 'Ακτινογραφία (X-Ray)' }, { value: 'ultrasound', label: 'Υπερηχογράφημα' }, { value: 'ct', label: 'CT Scan' }, { value: 'mri', label: 'MRI' }, { value: 'endoscopy', label: 'Ενδοσκόπηση' }, { value: 'echocardiogram', label: 'Ηχοκαρδιογράφημα' }, { value: 'other', label: 'Άλλο' }]}/>
            <F label="Περιοχή Σώματος" name="body_region" form={form} setForm={setForm}/>
            <F label="Ημερομηνία *" name="date" form={form} setForm={setForm} type="date"/>
            <F label="Κτηνίατρος" name="vet_name" form={form} setForm={setForm}/>
            <F label="Κλινική" name="clinic_name" form={form} setForm={setForm}/>
            <F label="Ευρήματα" name="findings" form={form} setForm={setForm} type="textarea"/>
            <F label="Έκθεση" name="report" form={form} setForm={setForm} type="textarea"/>
          </Modal>)}

        {modal === 'surgery' && (<Modal title="Νέο Χειρουργείο / Επέμβαση" onClose={function () { return setModal(null); }} onSave={function () { return surgery.create.mutate(form); }} saving={surgery.create.isPending}>
            <F label="Επέμβαση *" name="procedure" form={form} setForm={setForm}/>
            <F label="Κατηγορία" name="category" form={form} setForm={setForm} options={[{ value: '', label: '—' }, { value: 'orthopedic', label: 'Ορθοπεδική' }, { value: 'soft_tissue', label: 'Μαλακών Ιστών' }, { value: 'dental', label: 'Οδοντιατρική' }, { value: 'ophthalmic', label: 'Οφθαλμολογική' }, { value: 'neurological', label: 'Νευρολογική' }, { value: 'reproductive', label: 'Αναπαραγωγική' }, { value: 'other', label: 'Άλλη' }]}/>
            <F label="Ημερομηνία *" name="date" form={form} setForm={setForm} type="date"/>
            <F label="Χειρουργός" name="surgeon_name" form={form} setForm={setForm}/>
            <F label="Κλινική" name="clinic_name" form={form} setForm={setForm}/>
            <F label="Αναισθησία" name="anesthesia" form={form} setForm={setForm} options={[{ value: '', label: '—' }, { value: 'general', label: 'Γενική' }, { value: 'local', label: 'Τοπική' }, { value: 'sedation', label: 'Κατακόρυφη' }]}/>
            <F label="Διάρκεια (λεπτά)" name="duration_min" form={form} setForm={setForm} type="number"/>
            <F label="Επιπλοκές" name="complications" form={form} setForm={setForm} type="textarea"/>
            <F label="Αποτέλεσμα" name="outcome" form={form} setForm={setForm}/>
            <F label="Follow-up" name="follow_up" form={form} setForm={setForm}/>
            <F label="Κόστος (€)" name="cost" form={form} setForm={setForm} type="number"/>
          </Modal>)}

        {modal === 'allergy' && (<Modal title="Νέα Αλλεργία" onClose={function () { return setModal(null); }} onSave={function () { return allergy.create.mutate(form); }} saving={allergy.create.isPending}>
            <F label="Αλλεργιογόνο *" name="allergen" form={form} setForm={setForm}/>
            <F label="Τύπος" name="allergen_type" form={form} setForm={setForm} options={[{ value: 'food', label: 'Τροφής' }, { value: 'medication', label: 'Φαρμάκου' }, { value: 'environmental', label: 'Περιβαλλοντικό' }, { value: 'insect', label: 'Εντόμου' }, { value: 'contact', label: 'Επαφής' }, { value: 'other', label: 'Άλλο' }]}/>
            <F label="Αντίδραση" name="reaction" form={form} setForm={setForm} type="textarea"/>
            <F label="Σοβαρότητα" name="severity" form={form} setForm={setForm} options={[{ value: 'mild', label: 'Ήπια' }, { value: 'moderate', label: 'Μέτρια' }, { value: 'severe', label: 'Σοβαρή' }, { value: 'anaphylactic', label: 'Αναφυλακτική' }]}/>
            <F label="Θεραπεία" name="treatment" form={form} setForm={setForm}/>
            <F label="Διεγνώσθηκε από" name="diagnosed_by" form={form} setForm={setForm}/>
            <F label="Ημ. Διάγνωσης" name="diagnosed_date" form={form} setForm={setForm} type="date"/>
          </Modal>)}

        {modal === 'chronic' && (<Modal title="Νέα Χρόνια Πάθηση" onClose={function () { return setModal(null); }} onSave={function () { return chronic.create.mutate(form); }} saving={chronic.create.isPending}>
            <F label="Πάθηση *" name="condition" form={form} setForm={setForm}/>
            <F label="ICD Κωδικός" name="icd_code" form={form} setForm={setForm}/>
            <F label="Κατάσταση" name="status" form={form} setForm={setForm} options={[{ value: 'active', label: 'Ενεργή' }, { value: 'managed', label: 'Ελεγχόμενη' }, { value: 'resolved', label: 'Σε ύφεση' }]}/>
            <F label="Ημ. Διάγνωσης" name="diagnosed_date" form={form} setForm={setForm} type="date"/>
            <F label="Διεγνώσθηκε από" name="diagnosed_by" form={form} setForm={setForm}/>
            <F label="Κλινική" name="clinic_name" form={form} setForm={setForm}/>
            <F label="Σχέδιο Θεραπείας" name="treatment_plan" form={form} setForm={setForm} type="textarea"/>
            <F label="Παρακολούθηση" name="monitoring" form={form} setForm={setForm}/>
          </Modal>)}

        {modal === 'dental' && (<Modal title="Νέα Οδοντιατρική Πράξη" onClose={function () { return setModal(null); }} onSave={function () { return dental.create.mutate(form); }} saving={dental.create.isPending}>
            <F label="Πράξη *" name="procedure" form={form} setForm={setForm} options={[{ value: 'cleaning', label: 'Καθαρισμός' }, { value: 'extraction', label: 'Εξαγωγή' }, { value: 'xray', label: 'Ακτινογραφία Δοντιών' }, { value: 'root_canal', label: 'Ριζοθεραπεία' }, { value: 'other', label: 'Άλλο' }]}/>
            <F label="Ημερομηνία *" name="date" form={form} setForm={setForm} type="date"/>
            <F label="Κτηνίατρος" name="vet_name" form={form} setForm={setForm}/>
            <F label="Κλινική" name="clinic_name" form={form} setForm={setForm}/>
            <F label="Δόντια / Περιοχή" name="teeth_treated" form={form} setForm={setForm}/>
            <F label="Ευρήματα" name="findings" form={form} setForm={setForm} type="textarea"/>
            <F label="Στάδιο Νόσου" name="grade" form={form} setForm={setForm} options={[{ value: '', label: '—' }, { value: 'Stage 1', label: 'Στάδιο 1' }, { value: 'Stage 2', label: 'Στάδιο 2' }, { value: 'Stage 3', label: 'Στάδιο 3' }, { value: 'Stage 4', label: 'Στάδιο 4' }]}/>
            <F label="Επόμενος Καθαρισμός" name="next_due" form={form} setForm={setForm} type="date"/>
            <F label="Κόστος (€)" name="cost" form={form} setForm={setForm} type="number"/>
          </Modal>)}

        {modal === 'weight' && (<Modal title="Νέα Μέτρηση Βάρους" onClose={function () { return setModal(null); }} onSave={function () { return weight.create.mutate(form); }} saving={weight.create.isPending}>
            <F label="Βάρος (kg) *" name="weight_kg" form={form} setForm={setForm} type="number"/>
            <F label="BCS (1-9)" name="bcs" form={form} setForm={setForm} options={__spreadArray([{ value: '', label: '—' }], [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) { return ({ value: String(n), label: "".concat(n, " \u2014 ").concat(['Καχεκτικό', 'Λεπτό', 'Ελαφρώς Λεπτό', 'Ιδανικό', 'Ιδανικό', 'Ελαφρώς Παχύ', 'Παχύ', 'Παχύσαρκο', 'Σοβαρά Παχύσαρκο'][n - 1]) }); }), true)}/>
            <F label="Ημερομηνία *" name="date" form={form} setForm={setForm} type="date"/>
            <F label="Κτηνίατρος" name="vet_name" form={form} setForm={setForm}/>
            <F label="Σημειώσεις" name="notes" form={form} setForm={setForm}/>
          </Modal>)}

        {modal === 'genetic' && (<Modal title="Νέα Γενετική Εξέταση" onClose={function () { return setModal(null); }} onSave={function () { return genetic.create.mutate(form); }} saving={genetic.create.isPending}>
            <F label="Εξέταση *" name="test_name" form={form} setForm={setForm}/>
            <F label="Πάροχος" name="provider" form={form} setForm={setForm} options={[{ value: '', label: '—' }, { value: 'Embark', label: 'Embark' }, { value: 'Wisdom Panel', label: 'Wisdom Panel' }, { value: 'DNAmy', label: 'DNAmy' }, { value: 'other', label: 'Άλλος' }]}/>
            <F label="Ημερομηνία *" name="date" form={form} setForm={setForm} type="date"/>
            <F label="Αποτελέσματα" name="results" form={form} setForm={setForm} type="textarea"/>
          </Modal>)}

        {modal === 'vitals' && (<Modal title="Νέα Μέτρηση Ζωτικών Σημείων" onClose={function () { return setModal(null); }} onSave={function () { return vitals.create.mutate(form); }} saving={vitals.create.isPending}>
            <F label="Ημερομηνία *" name="date" form={form} setForm={setForm} type="date"/>
            <F label="Θερμοκρασία (°C)" name="temperature_c" form={form} setForm={setForm} type="number"/>
            <F label="Καρδιακοί Παλμοί (bpm)" name="heart_rate" form={form} setForm={setForm} type="number"/>
            <F label="Αναπνευστικός Ρυθμός (/min)" name="respiratory_rate" form={form} setForm={setForm} type="number"/>
            <F label="Βάρος (kg)" name="weight_kg" form={form} setForm={setForm} type="number"/>
            <F label="Αρτηριακή Πίεση" name="blood_pressure" form={form} setForm={setForm}/>
            <F label="Τριχοειδής Επαναπλήρωση" name="capillary_refill" form={form} setForm={setForm} options={[{ value: '', label: '—' }, { value: '<2sec', label: '< 2 δευτ. (Φυσιολογική)' }, { value: '2-3sec', label: '2-3 δευτ. (Παθολογική)' }, { value: '>3sec', label: '> 3 δευτ. (Κρίσιμη)' }]}/>
            <F label="Κτηνίατρος" name="vet_name" form={form} setForm={setForm}/>
            <F label="Σημειώσεις" name="notes" form={form} setForm={setForm}/>
          </Modal>)}

        {modal === 'pedigree' && (<Modal title="Στοιχεία Pedigree" onClose={function () { return setModal(null); }} onSave={function () { return api_1.api.put("/passport/pedigree/".concat(activePetId), __assign(__assign({}, form), { certifications: form.certifications ? String(form.certifications).split(',').map(function (s) { return s.trim(); }) : [] })).then(function () { inv(); setModal(null); react_hot_toast_1.default.success('Αποθηκεύτηκε!'); }); }} saving={false}>
            <F label="Αρ. Εγγραφής" name="registration_number" form={form} setForm={setForm}/>
            <F label="Kennel Club" name="kennel_club" form={form} setForm={setForm}/>
            <F label="Όνομα Πατέρα" name="father_name" form={form} setForm={setForm}/>
            <F label="Όνομα Μητέρας" name="mother_name" form={form} setForm={setForm}/>
            <F label="Εκτροφέας" name="breeder_name" form={form} setForm={setForm}/>
            <F label="Επικοινωνία Εκτροφέα" name="breeder_contact" form={form} setForm={setForm}/>
            <F label="Πιστοποιήσεις (χωρισμένες με κόμμα)" name="certifications" form={form} setForm={setForm}/>
            <F label="Σημειώσεις" name="notes" form={form} setForm={setForm} type="textarea"/>
          </Modal>)}

        {modal === 'travel' && (<Modal title="Νέο Ταξίδι" onClose={function () { return setModal(null); }} onSave={function () { return travel.create.mutate(form); }} saving={travel.create.isPending}>
            <F label="Τύπος *" name="travel_type" form={form} setForm={setForm} options={[{ value: 'flight', label: '✈️ Αεροπλάνο' }, { value: 'ferry', label: '🚢 Πλοίο' }, { value: 'train', label: '🚂 Τρένο' }, { value: 'road', label: '🚗 Οδικώς' }, { value: 'international', label: '🌍 Διεθνές' }]}/>
            <F label="Αφετηρία" name="origin_city" form={form} setForm={setForm}/>
            <F label="Προορισμός *" name="destination_city" form={form} setForm={setForm}/>
            <F label="Χώρα Προορισμού" name="destination_country" form={form} setForm={setForm}/>
            <F label="Ημ. Αναχώρησης *" name="departure_date" form={form} setForm={setForm} type="date"/>
            <F label="Ημ. Επιστροφής" name="return_date" form={form} setForm={setForm} type="date"/>
            <F label="Μεταφορέας" name="carrier" form={form} setForm={setForm}/>
            <F label="Κωδικός Κράτησης" name="booking_ref" form={form} setForm={setForm}/>
          </Modal>)}

        {modal === 'access' && (<Modal title="Χορήγηση Πρόσβασης σε Κτηνίατρο" onClose={function () { return setModal(null); }} onSave={function () { return addAccess.mutate(form); }} saving={addAccess.isPending}>
            <F label="Email Κτηνιάτρου *" name="provider_email" form={form} setForm={setForm} type="email"/>
            <F label="Όνομα Κτηνιάτρου" name="provider_name" form={form} setForm={setForm}/>
            <F label="Αιτία / Σχόλιο" name="reason" form={form} setForm={setForm}/>
            <F label="Λήξη Πρόσβασης" name="expires_at" form={form} setForm={setForm} type="date"/>
          </Modal>)}
      </framer_motion_1.AnimatePresence>
    </div>);
}
