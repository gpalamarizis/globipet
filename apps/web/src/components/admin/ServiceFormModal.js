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
exports.default = ServiceFormModal;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
var api_1 = require("@/lib/api");
var react_hot_toast_1 = require("react-hot-toast");
var SERVICE_TYPES = [
    { value: 'veterinary', label: 'Κτηνιατρείο 🩺' },
    { value: 'grooming', label: 'Περιποίηση ✂️' },
    { value: 'training', label: 'Εκπαίδευση 🎓' },
    { value: 'pet_sitting', label: 'Φιλοξενία · Ιδιώτης 🏡' },
    { value: 'walking', label: 'Βόλτα 🚶' },
    { value: 'boarding', label: 'Φιλοξενία · Ξενοδοχείο 🏨' },
    { value: 'pet_taxi', label: 'Pet Taxi 🚕' },
    { value: 'photography', label: 'Φωτογράφηση 📸' },
    { value: 'pharmacy', label: 'Φαρμακείο 💊' },
];
var SPECIES = ['dog', 'cat', 'bird', 'rabbit', 'fish', 'reptile', 'horse'];
var LANGUAGES = ['el', 'en', 'es', 'fr', 'zh'];
var DAYS = [{ n: 1, l: 'Δευ' }, { n: 2, l: 'Τρι' }, { n: 3, l: 'Τετ' }, { n: 4, l: 'Πεμ' }, { n: 5, l: 'Παρ' }, { n: 6, l: 'Σαβ' }, { n: 7, l: 'Κυρ' }];
function ServiceFormModal(_a) {
    var open = _a.open, onClose = _a.onClose, service = _a.service;
    var queryClient = (0, react_query_1.useQueryClient)();
    var isEdit = !!(service === null || service === void 0 ? void 0 : service.id);
    var _b = (0, react_1.useState)({
        provider_name: '', provider_email: '', service_type: 'veterinary',
        description: '', price: '', city: '', location: '',
        contact_phone: '', contact_email: '', image_url: '',
        years_experience: '', home_visits: false, emergency_available: false,
        is_verified: false,
        specializations: '', pet_types: [],
        languages: ['el'],
        available_days: [1, 2, 3, 4, 5],
    }), form = _b[0], setForm = _b[1];
    (0, react_1.useEffect)(function () {
        var _a, _b;
        if (service) {
            setForm({
                provider_name: service.provider_name || '',
                provider_email: service.provider_email || '',
                service_type: service.service_type || 'veterinary',
                description: service.description || '',
                price: String(service.price || ''),
                city: service.city || '',
                location: service.location || '',
                contact_phone: service.contact_phone || '',
                contact_email: service.contact_email || '',
                image_url: service.image_url || '',
                years_experience: String(service.years_experience || ''),
                home_visits: !!service.home_visits,
                emergency_available: !!service.emergency_available,
                is_verified: !!service.is_verified,
                specializations: (service.specializations || []).join(','),
                pet_types: service.pet_types || [],
                languages: ((_a = service.languages) === null || _a === void 0 ? void 0 : _a.length) ? service.languages : ['el'],
                available_days: ((_b = service.available_days) === null || _b === void 0 ? void 0 : _b.length) ? service.available_days : [1, 2, 3, 4, 5],
            });
        }
        else {
            setForm({
                provider_name: '', provider_email: '', service_type: 'veterinary',
                description: '', price: '', city: '', location: '',
                contact_phone: '', contact_email: '', image_url: '',
                years_experience: '', home_visits: false, emergency_available: false,
                is_verified: false,
                specializations: '', pet_types: [],
                languages: ['el'], available_days: [1, 2, 3, 4, 5],
            });
        }
    }, [service, open]);
    (0, react_1.useEffect)(function () {
        if (open)
            document.body.style.overflow = 'hidden';
        else
            document.body.style.overflow = '';
        return function () { document.body.style.overflow = ''; };
    }, [open]);
    var save = (0, react_query_1.useMutation)({
        mutationFn: function () {
            var data = {
                provider_name: form.provider_name,
                provider_email: form.provider_email,
                service_type: form.service_type,
                description: form.description,
                price: parseFloat(form.price) || 0,
                city: form.city,
                location: form.location || undefined,
                contact_phone: form.contact_phone || undefined,
                contact_email: form.contact_email || undefined,
                image_url: form.image_url || undefined,
                home_visits: form.home_visits,
                emergency_available: form.emergency_available,
                is_verified: form.is_verified,
                specializations: form.specializations.split(',').map(function (s) { return s.trim(); }).filter(Boolean),
                pet_types: form.pet_types,
                languages: form.languages,
                available_days: form.available_days,
            };
            if (form.years_experience)
                data.years_experience = parseInt(form.years_experience);
            return isEdit
                ? api_1.api.patch("/services/".concat(service.id), data)
                : api_1.api.post('/services', data);
        },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ['admin-services'] });
            react_hot_toast_1.default.success(isEdit ? 'Η υπηρεσία ενημερώθηκε' : 'Η υπηρεσία προστέθηκε');
            onClose();
        },
        onError: function (err) { var _a, _b; return react_hot_toast_1.default.error(((_b = (_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Σφάλμα'); },
    });
    var handleSubmit = function (e) {
        e.preventDefault();
        if (!form.provider_name.trim())
            return react_hot_toast_1.default.error('Το όνομα παρόχου είναι υποχρεωτικό');
        if (!form.provider_email.trim())
            return react_hot_toast_1.default.error('Το email παρόχου είναι υποχρεωτικό');
        if (!form.city.trim())
            return react_hot_toast_1.default.error('Η πόλη είναι υποχρεωτική');
        save.mutate();
    };
    var toggle = function (key, value) {
        var _a;
        var arr = form[key];
        setForm(__assign(__assign({}, form), (_a = {}, _a[key] = arr.includes(value) ? arr.filter(function (x) { return x !== value; }) : __spreadArray(__spreadArray([], arr, true), [value], false), _a)));
    };
    return (<framer_motion_1.AnimatePresence>
      {open && (<framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
          <framer_motion_1.motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col" onClick={function (e) { return e.stopPropagation(); }}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <lucide_react_1.PawPrint size={20} className="text-brand-900"/>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {isEdit ? 'Επεξεργασία Υπηρεσίας' : 'Νέα Υπηρεσία'}
                </h3>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><lucide_react_1.X size={18}/></button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Όνομα Παρόχου *</label>
                  <input className="input" value={form.provider_name} onChange={function (e) { return setForm(__assign(__assign({}, form), { provider_name: e.target.value })); }} required autoFocus/>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Email Παρόχου *</label>
                  <input type="email" className="input" value={form.provider_email} onChange={function (e) { return setForm(__assign(__assign({}, form), { provider_email: e.target.value })); }} required/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Τύπος Υπηρεσίας *</label>
                  <select className="input" value={form.service_type} onChange={function (e) { return setForm(__assign(__assign({}, form), { service_type: e.target.value })); }}>
                    {SERVICE_TYPES.map(function (t) { return <option key={t.value} value={t.value}>{t.label}</option>; })}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Τιμή (€)</label>
                  <input type="number" step="0.01" className="input" value={form.price} onChange={function (e) { return setForm(__assign(__assign({}, form), { price: e.target.value })); }}/>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Περιγραφή</label>
                <textarea className="input resize-none" rows={3} value={form.description} onChange={function (e) { return setForm(__assign(__assign({}, form), { description: e.target.value })); }}/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Πόλη *</label>
                  <input className="input" value={form.city} onChange={function (e) { return setForm(__assign(__assign({}, form), { city: e.target.value })); }} required/>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Διεύθυνση</label>
                  <input className="input" value={form.location} onChange={function (e) { return setForm(__assign(__assign({}, form), { location: e.target.value })); }}/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Τηλέφωνο</label>
                  <input className="input" value={form.contact_phone} onChange={function (e) { return setForm(__assign(__assign({}, form), { contact_phone: e.target.value })); }}/>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Email Επικοινωνίας</label>
                  <input type="email" className="input" value={form.contact_email} onChange={function (e) { return setForm(__assign(__assign({}, form), { contact_email: e.target.value })); }}/>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Είδη ζώων</label>
                <div className="flex flex-wrap gap-2">
                  {SPECIES.map(function (s) { return (<button key={s} type="button" onClick={function () { return toggle('pet_types', s); }} className={"px-3 py-1.5 rounded-full text-xs font-medium border ".concat(form.pet_types.includes(s) ? 'bg-brand-900 text-white border-brand-900' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600')}>{s}</button>); })}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Γλώσσες</label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map(function (l) { return (<button key={l} type="button" onClick={function () { return toggle('languages', l); }} className={"px-3 py-1.5 rounded-full text-xs font-medium border uppercase ".concat(form.languages.includes(l) ? 'bg-brand-900 text-white border-brand-900' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600')}>{l}</button>); })}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Ημέρες λειτουργίας</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(function (d) { return (<button key={d.n} type="button" onClick={function () { return toggle('available_days', d.n); }} className={"px-3 py-1.5 rounded-full text-xs font-medium border ".concat(form.available_days.includes(d.n) ? 'bg-brand-900 text-white border-brand-900' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600')}>{d.l}</button>); })}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Ειδικότητες (comma-separated)</label>
                <input className="input" placeholder="surgery, dental, cardiology" value={form.specializations} onChange={function (e) { return setForm(__assign(__assign({}, form), { specializations: e.target.value })); }}/>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">URL Εικόνας</label>
                <input className="input" placeholder="https://..." value={form.image_url} onChange={function (e) { return setForm(__assign(__assign({}, form), { image_url: e.target.value })); }}/>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Έτη Εμπειρίας</label>
                <input type="number" className="input" value={form.years_experience} onChange={function (e) { return setForm(__assign(__assign({}, form), { years_experience: e.target.value })); }}/>
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4" checked={form.home_visits} onChange={function (e) { return setForm(__assign(__assign({}, form), { home_visits: e.target.checked })); }}/>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Κατ' οίκον</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4" checked={form.emergency_available} onChange={function (e) { return setForm(__assign(__assign({}, form), { emergency_available: e.target.checked })); }}/>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Έκτακτα</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4" checked={form.is_verified} onChange={function (e) { return setForm(__assign(__assign({}, form), { is_verified: e.target.checked })); }}/>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Επαληθευμένος</span>
                </label>
              </div>
            </form>

            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100 dark:border-gray-800">
              <button onClick={onClose} className="btn-secondary">Ακύρωση</button>
              <button onClick={handleSubmit} disabled={save.isPending} className="btn-primary flex items-center gap-2">
                <lucide_react_1.Save size={16}/>{save.isPending ? 'Αποθήκευση...' : (isEdit ? 'Ενημέρωση' : 'Δημιουργία')}
              </button>
            </div>
          </framer_motion_1.motion.div>
        </framer_motion_1.motion.div>)}
    </framer_motion_1.AnimatePresence>);
}
