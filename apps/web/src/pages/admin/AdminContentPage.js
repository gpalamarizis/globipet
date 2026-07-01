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
exports.default = AdminContentPage;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var lucide_react_1 = require("lucide-react");
var api_1 = require("@/lib/api");
var utils_1 = require("@/lib/utils");
var react_hot_toast_1 = require("react-hot-toast");
var SECTIONS = [
    {
        id: 'home',
        label: 'Αρχική Σελίδα',
        icon: lucide_react_1.Home,
        preview: 'globipet.com',
        fields: [
            { key: 'tagline', label: 'Tagline (badge πάνω από τίτλο)', type: 'text', placeholder: '#1 Pet Super-App' },
            { key: 'hero_title_1', label: 'Τίτλος — γραμμή 1 (πορτοκαλί)', type: 'text', placeholder: 'Η καλύτερη' },
            { key: 'hero_title_2', label: 'Τίτλος — γραμμή 2 (πορτοκαλί)', type: 'text', placeholder: 'καλύτερους φίλους' },
            { key: 'hero_subtitle', label: 'Υπότιτλος', type: 'text', placeholder: 'Το all-in-one pet super-app...' },
            { key: 'hero_cta', label: 'Κουμπί CTA', type: 'text', placeholder: 'Ξεκινήστε Τώρα' },
            { key: 'stat_users', label: 'Στατιστικό — Χρήστες', type: 'text', placeholder: '50K+' },
            { key: 'stat_users_label', label: 'Ετικέτα Χρηστών', type: 'text', placeholder: 'Χρήστες' },
            { key: 'stat_providers', label: 'Στατιστικό — Πάροχοι', type: 'text', placeholder: '2K+' },
            { key: 'stat_providers_label', label: 'Ετικέτα Παρόχων', type: 'text', placeholder: 'Πάροχοι' },
            { key: 'stat_pets', label: 'Στατιστικό — Κατοικίδια', type: 'text', placeholder: '120K+' },
            { key: 'stat_pets_label', label: 'Ετικέτα Κατοικιδίων', type: 'text', placeholder: 'Κατοικίδια' },
            { key: 'stat_rating', label: 'Στατιστικό — Βαθμολογία', type: 'text', placeholder: '4.9★' },
            { key: 'stat_rating_label', label: 'Ετικέτα Βαθμολογίας', type: 'text', placeholder: 'Βαθμολογία' },
            { key: 'services_title', label: 'Τίτλος Ενότητας Υπηρεσιών', type: 'text', placeholder: 'Υπηρεσίες' },
            { key: 'services_subtitle', label: 'Υπότιτλος Ενότητας Υπηρεσιών', type: 'text', placeholder: 'Βρες τον καλύτερο πάροχο κοντά σου' },
            { key: 'marquee_text', label: 'Κυλιόμενο Κείμενο (marquee)', type: 'text', placeholder: 'Η καλύτερη εφαρμογή κατοικιδίων στον κόσμο' },
        ],
    },
    {
        id: 'general',
        label: 'Γενικές Ρυθμίσεις',
        icon: lucide_react_1.Info,
        preview: 'Όλες οι σελίδες',
        fields: [
            { key: 'site_name', label: 'Όνομα Site', type: 'text', placeholder: 'GlobiPet' },
            { key: 'tagline', label: 'Tagline', type: 'text', placeholder: '#1 Pet Super-App' },
            { key: 'footer_slogan', label: 'Footer Slogan', type: 'text', placeholder: 'Best care for the best human\'s friends' },
            { key: 'contact_email', label: 'Email Επικοινωνίας', type: 'text', placeholder: 'info@globipet.com' },
        ],
    },
    {
        id: 'telehealth',
        label: 'Τηλεϊατρική',
        icon: lucide_react_1.Video,
        preview: 'globipet.com/telehealth',
        fields: [
            { key: 'page_title', label: 'Τίτλος Σελίδας', type: 'text', placeholder: 'Τηλεϊατρική' },
            { key: 'page_subtitle', label: 'Υπότιτλος Σελίδας', type: 'textarea', placeholder: 'Βιντεοκλήση με εξειδικευμένο κτηνίατρο' },
        ],
    },
    {
        id: 'legal',
        label: 'Νομική Υποστήριξη',
        icon: lucide_react_1.Scale,
        preview: 'globipet.com/legal',
        fields: [
            { key: 'page_title', label: 'Τίτλος Σελίδας', type: 'text', placeholder: 'Νομική Υποστήριξη Κατοικιδίων' },
            { key: 'page_subtitle', label: 'Υπότιτλος Σελίδας', type: 'textarea', placeholder: 'AI νομικός σύμβουλος...' },
        ],
    },
];
function AdminContentPage() {
    var qc = (0, react_query_1.useQueryClient)();
    var _a = (0, react_1.useState)('home'), activeSection = _a[0], setActiveSection = _a[1];
    var _b = (0, react_1.useState)({}), draft = _b[0], setDraft = _b[1];
    var _c = (0, react_1.useState)(false), hasChanges = _c[0], setHasChanges = _c[1];
    var _d = (0, react_query_1.useQuery)({
        queryKey: ['admin-content'],
        queryFn: function () { return api_1.api.get('/settings/content').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : {}; }); },
    }), allContent = _d.data, isLoading = _d.isLoading;
    var section = SECTIONS.find(function (s) { return s.id === activeSection; });
    var savedContent = (allContent === null || allContent === void 0 ? void 0 : allContent[activeSection]) || {};
    (0, react_1.useEffect)(function () {
        setDraft(savedContent);
        setHasChanges(false);
    }, [activeSection, allContent]);
    var setField = function (key, val) {
        setDraft(function (d) {
            var _a;
            return (__assign(__assign({}, d), (_a = {}, _a[key] = val, _a)));
        });
        setHasChanges(true);
    };
    var save = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_1.api.patch("/settings/content/".concat(activeSection), draft); },
        onSuccess: function () {
            react_hot_toast_1.default.success('Αποθηκεύτηκε!');
            setHasChanges(false);
            qc.invalidateQueries({ queryKey: ['admin-content'] });
            qc.invalidateQueries({ queryKey: ['content-home'] });
        },
        onError: function () { return react_hot_toast_1.default.error('Σφάλμα αποθήκευσης'); },
    });
    var reset = function () {
        setDraft(savedContent);
        setHasChanges(false);
        (0, react_hot_toast_1.default)('Επαναφορά αλλαγών', { icon: '↩️' });
    };
    return (<div className="page-container py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
            <lucide_react_1.Layout size={20} className="text-purple-600"/>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Περιεχόμενο Σελίδων</h1>
            <p className="text-sm text-gray-500">Άλλαξε κείμενα και στατιστικά χωρίς κώδικα</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (<button onClick={reset} className="btn-secondary flex items-center gap-2 text-sm px-3 py-2">
              <lucide_react_1.RotateCcw size={14}/> Αναίρεση
            </button>)}
          <a href={section.preview.startsWith('globipet') ? "https://".concat(section.preview) : '#'} target="_blank" rel="noreferrer" className="btn-secondary flex items-center gap-2 text-sm px-3 py-2">
            <lucide_react_1.Eye size={14}/> Προεπισκόπηση
          </a>
          <button onClick={function () { return save.mutate(); }} disabled={!hasChanges || save.isPending} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50">
            <lucide_react_1.Save size={14}/> {save.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Section tabs */}
        <div className="w-52 shrink-0">
          <div className="space-y-1">
            {SECTIONS.map(function (s) { return (<button key={s.id} onClick={function () { return setActiveSection(s.id); }} className={(0, utils_1.cn)('w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all', activeSection === s.id
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
                <s.icon size={16}/>
                <div className="min-w-0">
                  <p className="truncate">{s.label}</p>
                  <p className={(0, utils_1.cn)('text-[10px] truncate', activeSection === s.id ? 'text-purple-200' : 'text-gray-400')}>{s.preview}</p>
                </div>
              </button>); })}
          </div>
        </div>

        {/* Fields */}
        <div className="flex-1">
          {isLoading ? (<div className="card p-8 text-center text-gray-400">Φόρτωση...</div>) : (<div className="card p-6">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                <section.icon size={18} className="text-purple-600"/>
                <h2 className="font-bold text-gray-900 dark:text-white">{section.label}</h2>
                {hasChanges && (<span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                    Μη αποθηκευμένες αλλαγές
                  </span>)}
              </div>

              <div className="space-y-5">
                {section.fields.map(function (field) {
                var _a, _b, _c, _d;
                return (<div key={field.key}>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">
                      {field.label}
                    </label>
                    <div className="relative">
                      {field.type === 'textarea' ? (<textarea value={(_b = (_a = draft[field.key]) !== null && _a !== void 0 ? _a : savedContent[field.key]) !== null && _b !== void 0 ? _b : ''} onChange={function (e) { return setField(field.key, e.target.value); }} placeholder={field.placeholder} rows={3} className="input w-full resize-none text-sm"/>) : (<input type="text" value={(_d = (_c = draft[field.key]) !== null && _c !== void 0 ? _c : savedContent[field.key]) !== null && _d !== void 0 ? _d : ''} onChange={function (e) { return setField(field.key, e.target.value); }} placeholder={field.placeholder} className="input w-full text-sm pr-8"/>)}
                      {(draft[field.key] !== savedContent[field.key]) && draft[field.key] !== undefined && (<lucide_react_1.Pencil size={12} className="absolute right-2.5 top-3 text-amber-500"/>)}
                    </div>
                    {field.placeholder && (<p className="text-xs text-gray-400 mt-1">Προεπιλογή: {field.placeholder}</p>)}
                  </div>);
            })}
              </div>

              {/* Live preview for home */}
              {activeSection === 'home' && (<div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Προεπισκόπηση Hero</p>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 text-center">
                    <div className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-xs px-3 py-1 rounded-full font-semibold mb-3">
                      ⚡ {draft.tagline || '#1 Pet Super-App'}
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2 leading-tight">
                      <span className="text-orange-600">{draft.hero_title_1 || 'Η καλύτερη'}</span>
                      {' '}φροντίδα για τους{' '}
                      <span className="text-orange-600">{draft.hero_title_2 || 'καλύτερους φίλους'}</span> σου
                    </h1>
                    <p className="text-sm text-gray-500 mb-4">{draft.hero_subtitle || 'Το all-in-one pet super-app...'}</p>
                    <div className="grid grid-cols-4 gap-2 mt-4">
                      {[
                    [draft.stat_users || '50K+', draft.stat_users_label || 'Χρήστες'],
                    [draft.stat_providers || '2K+', draft.stat_providers_label || 'Πάροχοι'],
                    [draft.stat_pets || '120K+', draft.stat_pets_label || 'Κατοικίδια'],
                    [draft.stat_rating || '4.9★', draft.stat_rating_label || 'Βαθμολογία'],
                ].map(function (_a) {
                    var val = _a[0], label = _a[1];
                    return (<div key={label} className="bg-white dark:bg-gray-700 rounded-xl p-2 text-center">
                          <p className="text-sm font-black text-orange-600">{val}</p>
                          <p className="text-[10px] text-gray-500">{label}</p>
                        </div>);
                })}
                    </div>
                  </div>
                </div>)}
            </div>)}
        </div>
      </div>
    </div>);
}
