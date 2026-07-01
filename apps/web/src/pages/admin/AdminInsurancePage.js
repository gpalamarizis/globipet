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
exports.default = AdminInsurancePage;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
var react_router_dom_1 = require("react-router-dom");
var api_1 = require("@/lib/api");
var utils_1 = require("@/lib/utils");
var react_hot_toast_1 = require("react-hot-toast");
var XLSX = require("xlsx");
var TIER_LABELS = {
    basic: 'Βασικό', standard: 'Standard', premium: 'Premium', comprehensive: 'Ολοκληρωμένο'
};
function AdminInsurancePage() {
    var _this = this;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _a = (0, react_1.useState)(false), showProviderModal = _a[0], setShowProviderModal = _a[1];
    var _b = (0, react_1.useState)(false), showPlanModal = _b[0], setShowPlanModal = _b[1];
    var _c = (0, react_1.useState)(null), editingProvider = _c[0], setEditingProvider = _c[1];
    var _d = (0, react_1.useState)(null), editingPlan = _d[0], setEditingPlan = _d[1];
    var _e = (0, react_1.useState)(null), expandedProvider = _e[0], setExpandedProvider = _e[1];
    var _f = (0, react_1.useState)(false), importing = _f[0], setImporting = _f[1];
    var handleBulkImport = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var file, data, wb, providersSheet, plansSheet, providers_1, plans, result, _a, providers_created, plans_created, errors, err_1;
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
                    _e.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, file.arrayBuffer()];
                case 2:
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
                case 3:
                    result = _e.sent();
                    _a = result.data, providers_created = _a.providers_created, plans_created = _a.plans_created, errors = _a.errors;
                    react_hot_toast_1.default.success("\u2705 ".concat(providers_created, " \u03B5\u03C4\u03B1\u03B9\u03C1\u03B5\u03AF\u03B5\u03C2, ").concat(plans_created, " \u03C0\u03BB\u03AC\u03BD\u03B1 \u03B5\u03B9\u03C3\u03AE\u03C7\u03B8\u03B7\u03C3\u03B1\u03BD"));
                    if ((errors === null || errors === void 0 ? void 0 : errors.length) > 0) {
                        react_hot_toast_1.default.error("\u26A0\uFE0F ".concat(errors.length, " \u03C3\u03C6\u03AC\u03BB\u03BC\u03B1\u03C4\u03B1 - \u03B4\u03B5\u03C2 console"));
                        console.error('Import errors:', errors);
                    }
                    queryClient.invalidateQueries({ queryKey: ['admin-insurance-providers'] });
                    return [3 /*break*/, 6];
                case 4:
                    err_1 = _e.sent();
                    react_hot_toast_1.default.error(((_d = (_c = err_1.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) || 'Σφάλμα κατά την εισαγωγή');
                    return [3 /*break*/, 6];
                case 5:
                    setImporting(false);
                    e.target.value = '';
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
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
    return (<div className="page-container py-8 pb-24 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <react_router_dom_1.Link to="/admin" className="btn-ghost p-2"><lucide_react_1.ArrowLeft size={18}/></react_router_dom_1.Link>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <lucide_react_1.Shield size={22}/> Ασφαλιστικές Εταιρείες
          </h1>
          <p className="text-sm text-gray-500">Διαχείριση ασφαλιστικών εταιρειών και πλάνων</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/templates/GlobiPet_Insurance_Import_Template.xlsx" download className="btn-secondary flex items-center gap-2 text-sm">
            <lucide_react_1.Download size={15}/> Template Excel
          </a>
          <label className={"btn-secondary flex items-center gap-2 text-sm cursor-pointer ".concat(importing ? 'opacity-50' : '')}>
            <lucide_react_1.Upload size={15}/> {importing ? 'Εισαγωγή...' : 'Bulk Import Excel'}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleBulkImport} disabled={importing}/>
          </label>
          <button onClick={function () { setEditingProvider(null); setShowProviderModal(true); }} className="btn-primary flex items-center gap-2 text-sm">
            <lucide_react_1.Plus size={15}/> Νέα Εταιρεία
          </button>
        </div>
      </div>

      {isLoading ? (<div className="space-y-3">{[1, 2, 3].map(function (i) { return <div key={i} className="skeleton h-20 w-full"/>; })}</div>) : providers.length === 0 ? (<div className="card p-12 text-center">
          <lucide_react_1.Shield size={40} className="mx-auto text-gray-300 mb-3"/>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Δεν υπάρχουν ασφαλιστικές εταιρείες</h3>
          <button onClick={function () { setEditingProvider(null); setShowProviderModal(true); }} className="btn-primary inline-flex items-center gap-2 mt-2">
            <lucide_react_1.Plus size={15}/> Προσθήκη
          </button>
        </div>) : (<div className="space-y-3">
          {providers.map(function (provider) {
                var _a, _b;
                return (<div key={provider.id} className="card overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <button onClick={function () { return setExpandedProvider(expandedProvider === provider.id ? null : provider.id); }} className="flex items-center gap-3 flex-1 text-left">
                  {provider.logo_url
                        ? <img src={provider.logo_url} alt={provider.name} className="h-10 w-auto object-contain"/>
                        : <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center"><lucide_react_1.Shield size={18} className="text-brand-900"/></div>}
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{provider.name_el || provider.name}</p>
                    <p className="text-xs text-gray-500">{((_a = provider.plans) === null || _a === void 0 ? void 0 : _a.length) || 0} πλάνα</p>
                  </div>
                  {expandedProvider === provider.id ? <lucide_react_1.ChevronDown size={16} className="text-gray-400 ml-auto"/> : <lucide_react_1.ChevronRight size={16} className="text-gray-400 ml-auto"/>}
                </button>
                <div className="flex items-center gap-1">
                  <button onClick={function () { setEditingProvider(null); setEditingPlan({ provider_id: provider.id }); setShowPlanModal(true); }} className="btn-ghost p-1.5 text-xs flex items-center gap-1 text-brand-900">
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
                      {provider.plans.map(function (plan) {
                            var _a;
                            return (<div key={plan.id} className={(0, utils_1.cn)('flex items-center gap-3 px-4 py-3', !plan.is_active && 'opacity-50')}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{plan.name_el || plan.name}</p>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-900 font-medium">{TIER_LABELS[plan.tier] || plan.tier}</span>
                              {plan.is_featured && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Featured</span>}
                              {!plan.is_active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Ανενεργό</span>}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">€{plan.price_monthly}/μήνα · {(_a = plan.pet_types) === null || _a === void 0 ? void 0 : _a.join(', ')}</p>
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
                        </div>);
                        })}
                    </div>
                  </framer_motion_1.motion.div>)}
              </framer_motion_1.AnimatePresence>
            </div>);
            })}
        </div>)}

      <ProviderModal open={showProviderModal} onClose={function () { setShowProviderModal(false); setEditingProvider(null); }} editing={editingProvider} onSaved={function () { queryClient.invalidateQueries({ queryKey: ['admin-insurance-providers'] }); setShowProviderModal(false); setEditingProvider(null); }}/>

      <PlanModal open={showPlanModal} onClose={function () { setShowPlanModal(false); setEditingPlan(null); }} editing={editingPlan} onSaved={function () { queryClient.invalidateQueries({ queryKey: ['admin-insurance-providers'] }); setShowPlanModal(false); setEditingPlan(null); }}/>
    </div>);
}
function ProviderModal(_a) {
    var open = _a.open, onClose = _a.onClose, editing = _a.editing, onSaved = _a.onSaved;
    var _b = (0, react_1.useState)({}), form = _b[0], setForm = _b[1];
    (0, react_1.useEffect)(function () {
        if (open)
            setForm(editing ? __assign({}, editing) : { name: '', name_el: '', website: '', phone: '', email: '', description: '', is_active: true, display_order: 0 });
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
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.is_active} onChange={function (e) { return setForm(__assign(__assign({}, form), { is_active: e.target.checked })); }}/> Ενεργή
          </label>
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
function PlanModal(_a) {
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
                price_annual: '', covers_accidents: true, covers_illness: true, covers_surgery: false,
                covers_dental: false, covers_preventive: false, covers_liability: false, covers_death: false,
                annual_limit: '', deductible: '', reimbursement_percent: 80, waiting_period_days: 14,
                pet_types: [], is_active: true, is_featured: false, display_order: 0,
            });
    }, [open, editing]);
    var saveMutation = (0, react_query_1.useMutation)({
        mutationFn: function () { return editing && editing.id ? api_1.api.patch("/admin/insurance/plans/".concat(editing.id), form) : api_1.api.post('/admin/insurance/plans', form); },
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
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Όνομα (EN) *</label>
              <input className="input" value={form.name || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { name: e.target.value })); }}/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Όνομα (ΕΛ)</label>
              <input className="input" value={form.name_el || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { name_el: e.target.value })); }}/>
            </div>
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
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">€/μήνα *</label>
              <input type="number" className="input" value={form.price_monthly || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { price_monthly: parseFloat(e.target.value) })); }}/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">€/χρόνο</label>
              <input type="number" className="input" value={form.price_annual || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { price_annual: parseFloat(e.target.value) || null })); }}/>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Ετήσιο όριο (€)</label>
              <input type="number" className="input" value={form.annual_limit || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { annual_limit: parseFloat(e.target.value) || null })); }}/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Απαλλαγή (€)</label>
              <input type="number" className="input" value={form.deductible || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { deductible: parseFloat(e.target.value) || null })); }}/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Αποζημίωση %</label>
              <input type="number" className="input" value={form.reimbursement_percent || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { reimbursement_percent: parseInt(e.target.value) || null })); }}/>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Κάλυψη</label>
            <div className="flex flex-wrap gap-3">
              {[['covers_accidents', 'Ατυχήματα'], ['covers_illness', 'Ασθένεια'], ['covers_surgery', 'Χειρουργείο'],
            ['covers_dental', 'Οδοντιατρείο'], ['covers_preventive', 'Πρόληψη'], ['covers_liability', 'Αστ. ευθύνη'], ['covers_death', 'Θάνατος']].map(function (_a) {
            var key = _a[0], label = _a[1];
            return (<label key={key} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={!!form[key]} onChange={function (e) {
                var _a;
                return setForm(__assign(__assign({}, form), (_a = {}, _a[key] = e.target.checked, _a)));
            }}/> {label}
                </label>);
        })}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Τύποι κατοικιδίων</label>
            <div className="flex gap-3">
              {[['dog', '🐕 Σκύλος'], ['cat', '🐈 Γάτα'], ['rabbit', '🐇 Κουνέλι'], ['bird', '🦜 Πτηνό']].map(function (_a) {
            var type = _a[0], label = _a[1];
            return (<label key={type} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={(form.pet_types || []).includes(type)} onChange={function () { return togglePetType(type); }}/> {label}
                </label>);
        })}
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.is_active} onChange={function (e) { return setForm(__assign(__assign({}, form), { is_active: e.target.checked })); }}/> Ενεργό
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.is_featured} onChange={function (e) { return setForm(__assign(__assign({}, form), { is_featured: e.target.checked })); }}/> Featured
            </label>
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
