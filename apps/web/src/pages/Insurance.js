"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Insurance;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var lucide_react_1 = require("lucide-react");
var api_1 = require("@/lib/api");
var utils_1 = require("@/lib/utils");
var TIER_LABELS = {
    basic: { label: 'Βασικό', color: '#374151', bg: '#F3F4F6' },
    standard: { label: 'Standard', color: '#1E40AF', bg: '#DBEAFE' },
    premium: { label: 'Premium', color: '#6D28D9', bg: '#EDE9FE' },
    comprehensive: { label: 'Ολοκληρωμένο', color: '#065F46', bg: '#D1FAE5' },
};
var PET_TYPE_LABELS = {
    dog: '🐕 Σκύλος', cat: '🐈 Γάτα', rabbit: '🐇 Κουνέλι', bird: '🦜 Πτηνό',
};
function Insurance() {
    var _a = (0, react_1.useState)(''), petType = _a[0], setPetType = _a[1];
    var _b = (0, react_1.useState)(''), tier = _b[0], setTier = _b[1];
    var _c = (0, react_1.useState)(''), maxPrice = _c[0], setMaxPrice = _c[1];
    var _d = (0, react_1.useState)(false), coversSurgery = _d[0], setCoversSurgery = _d[1];
    var _e = (0, react_1.useState)(false), coversDental = _e[0], setCoversDental = _e[1];
    var _f = (0, react_1.useState)(null), expandedPlan = _f[0], setExpandedPlan = _f[1];
    var _g = (0, react_query_1.useQuery)({
        queryKey: ['insurance-plans', petType, tier, maxPrice, coversSurgery, coversDental],
        queryFn: function () { return api_1.api.get('/insurance/plans', {
            params: {
                pet_type: petType || undefined,
                tier: tier || undefined,
                max_price: maxPrice || undefined,
                covers_surgery: coversSurgery || undefined,
                covers_dental: coversDental || undefined,
            }
        }).then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }), _h = _g.data, plans = _h === void 0 ? [] : _h, isLoading = _g.isLoading;
    return (<div className="page-container py-8 pb-24 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
          <lucide_react_1.Shield size={28} className="text-brand-900"/> Ασφάλιση Κατοικιδίου
        </h1>
        <p className="text-gray-500">Συγκρίνετε πλάνα ασφάλισης από τις κορυφαίες ασφαλιστικές εταιρείες</p>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Τύπος κατοικιδίου</label>
            <select className="input text-sm" value={petType} onChange={function (e) { return setPetType(e.target.value); }}>
              <option value="">Όλα</option>
              {Object.entries(PET_TYPE_LABELS).map(function (_a) {
        var k = _a[0], v = _a[1];
        return <option key={k} value={k}>{v}</option>;
    })}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Κατηγορία</label>
            <select className="input text-sm" value={tier} onChange={function (e) { return setTier(e.target.value); }}>
              <option value="">Όλες</option>
              {Object.entries(TIER_LABELS).map(function (_a) {
        var k = _a[0], v = _a[1];
        return <option key={k} value={k}>{v.label}</option>;
    })}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Μέγιστη μηνιαία τιμή (€)</label>
            <input className="input text-sm" type="number" placeholder="π.χ. 30" value={maxPrice} onChange={function (e) { return setMaxPrice(e.target.value); }}/>
          </div>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={coversSurgery} onChange={function (e) { return setCoversSurgery(e.target.checked); }} className="rounded"/>
              Κάλυψη χειρουργείου
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={coversDental} onChange={function (e) { return setCoversDental(e.target.checked); }} className="rounded"/>
              Κάλυψη οδοντιατρείου
            </label>
          </div>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (<div className="space-y-4">{[1, 2, 3].map(function (i) { return <div key={i} className="skeleton h-40 w-full rounded-2xl"/>; })}</div>) : plans.length === 0 ? (<div className="text-center py-20">
          <lucide_react_1.Shield size={48} className="mx-auto text-gray-200 mb-4"/>
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Δεν βρέθηκαν πλάνα</p>
          <p className="text-gray-500 text-sm">Δοκιμάστε διαφορετικά φίλτρα</p>
        </div>) : (<div className="space-y-4">
          <p className="text-sm text-gray-500">{plans.length} πλάνα διαθέσιμα</p>
          {plans.map(function (plan) {
                var _a, _b, _c, _d, _e, _f;
                var tier = TIER_LABELS[plan.tier] || TIER_LABELS.basic;
                var isExpanded = expandedPlan === plan.id;
                return (<div key={plan.id} className={(0, utils_1.cn)('card overflow-hidden', plan.is_featured && 'ring-2 ring-brand-900')}>
                {plan.is_featured && (<div className="bg-brand-900 text-white text-xs font-bold px-4 py-1 flex items-center gap-1">
                    <lucide_react_1.Star size={11} fill="white"/> Προτεινόμενο
                  </div>)}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      {((_a = plan.provider) === null || _a === void 0 ? void 0 : _a.logo_url) ? (<img src={plan.provider.logo_url} alt={plan.provider.name} className="h-12 w-auto object-contain"/>) : (<div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
                          <lucide_react_1.Shield size={22} className="text-brand-900"/>
                        </div>)}
                      <div>
                        <p className="text-xs text-gray-500">{((_b = plan.provider) === null || _b === void 0 ? void 0 : _b.name_el) || ((_c = plan.provider) === null || _c === void 0 ? void 0 : _c.name)}</p>
                        <h3 className="font-bold text-gray-900 dark:text-white">{plan.name_el || plan.name}</h3>
                        <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: tier.bg, color: tier.color }}>
                          {tier.label}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-black text-brand-900">€{plan.price_monthly}<span className="text-sm font-normal text-gray-500">/μήνα</span></p>
                      {plan.price_annual && (<p className="text-xs text-gray-500">€{plan.price_annual}/χρόνο</p>)}
                    </div>
                  </div>

                  {/* Coverage chips */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {[
                        { key: 'covers_accidents', label: 'Ατυχήματα' },
                        { key: 'covers_illness', label: 'Ασθένεια' },
                        { key: 'covers_surgery', label: 'Χειρουργείο' },
                        { key: 'covers_dental', label: 'Οδοντιατρείο' },
                        { key: 'covers_preventive', label: 'Πρόληψη' },
                        { key: 'covers_liability', label: 'Αστική ευθύνη' },
                        { key: 'covers_death', label: 'Θάνατος' },
                    ].map(function (_a) {
                        var key = _a.key, label = _a.label;
                        return (<span key={key} className={(0, utils_1.cn)('flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium', plan[key] ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400 line-through')}>
                        {plan[key] ? <lucide_react_1.Check size={11}/> : <lucide_react_1.X size={11}/>} {label}
                      </span>);
                    })}
                  </div>

                  {/* Expand button */}
                  <button onClick={function () { return setExpandedPlan(isExpanded ? null : plan.id); }} className="mt-4 flex items-center gap-1 text-sm text-brand-900 font-medium hover:underline">
                    {isExpanded ? <><lucide_react_1.ChevronUp size={16}/> Λιγότερα</> : <><lucide_react_1.ChevronDown size={16}/> Περισσότερες λεπτομέρειες</>}
                  </button>

                  {isExpanded && (<div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {plan.annual_limit && (<div>
                          <p className="text-xs text-gray-500">Ετήσιο όριο</p>
                          <p className="font-semibold text-gray-900 dark:text-white">€{plan.annual_limit.toLocaleString()}</p>
                        </div>)}
                      {plan.deductible && (<div>
                          <p className="text-xs text-gray-500">Απαλλαγή</p>
                          <p className="font-semibold text-gray-900 dark:text-white">€{plan.deductible}</p>
                        </div>)}
                      {plan.reimbursement_percent && (<div>
                          <p className="text-xs text-gray-500">Αποζημίωση</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{plan.reimbursement_percent}%</p>
                        </div>)}
                      {plan.waiting_period_days && (<div>
                          <p className="text-xs text-gray-500">Περίοδος αναμονής</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{plan.waiting_period_days} ημέρες</p>
                        </div>)}
                      {plan.max_age_years && (<div>
                          <p className="text-xs text-gray-500">Μέγιστη ηλικία</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{plan.max_age_years} χρόνια</p>
                        </div>)}
                      {((_d = plan.features) === null || _d === void 0 ? void 0 : _d.length) > 0 && (<div className="col-span-full">
                          <p className="text-xs text-gray-500 mb-2">Πρόσθετα οφέλη</p>
                          <div className="flex flex-wrap gap-1">
                            {plan.features.map(function (f, i) { return (<span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{f}</span>); })}
                          </div>
                        </div>)}
                    </div>)}

                  {/* Actions */}
                  <div className="flex gap-3 mt-4">
                    {((_e = plan.provider) === null || _e === void 0 ? void 0 : _e.website) && (<a href={plan.provider.website} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1 text-center text-sm flex items-center justify-center gap-2">
                        <lucide_react_1.Globe size={15}/> Αίτηση ασφάλισης
                      </a>)}
                    {((_f = plan.provider) === null || _f === void 0 ? void 0 : _f.phone) && (<a href={"tel:".concat(plan.provider.phone)} className="btn-secondary flex items-center gap-2 text-sm px-4">
                        <lucide_react_1.Phone size={15}/> {plan.provider.phone}
                      </a>)}
                  </div>
                </div>
              </div>);
            })}
        </div>)}
    </div>);
}
