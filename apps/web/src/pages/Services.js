"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Services;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var react_i18next_1 = require("react-i18next");
var lucide_react_1 = require("lucide-react");
var framer_motion_1 = require("framer-motion");
var react_router_dom_1 = require("react-router-dom");
var api_1 = require("@/lib/api");
var ServiceCard_1 = require("@/components/features/services/ServiceCard");
var ServicesMap_1 = require("@/components/features/services/ServicesMap");
var LoadingSkeleton_1 = require("@/components/ui/LoadingSkeleton");
var serviceTypeKeys = [
    { value: 'all', key: 'all', emoji: '🔍' },
    { value: 'veterinary', key: 'veterinary', emoji: '🩺' },
    { value: 'grooming', key: 'grooming', emoji: '✂️' },
    { value: 'training', key: 'training', emoji: '🎓' },
    { value: 'hosting', key: 'hosting', emoji: '🏠' },
    { value: 'walking', key: 'walking', emoji: '🚶' },
    { value: 'pet_taxi', key: 'pet_taxi', emoji: '🚕' },
    { value: 'photography', key: 'photography', emoji: '📸' },
    { value: 'pharmacy', key: 'pharmacy', emoji: '💊' },
];
var hostingSubTypes = [
    { value: 'pet_sitting', key: 'pet_sitting', emoji: '🏡' },
    { value: 'boarding', key: 'boarding', emoji: '🏨' },
];
function Services() {
    var _a, _b, _c, _d;
    var t = (0, react_i18next_1.useTranslation)().t;
    var searchParams = (0, react_router_dom_1.useSearchParams)()[0];
    var _e = (0, react_1.useState)(searchParams.get('q') || ''), search = _e[0], setSearch = _e[1];
    var _f = (0, react_1.useState)(searchParams.get('city') || ''), city = _f[0], setCity = _f[1];
    var _g = (0, react_1.useState)(searchParams.get('type') || 'all'), type = _g[0], setType = _g[1];
    var _h = (0, react_1.useState)('list'), viewMode = _h[0], setViewMode = _h[1];
    var _j = (0, react_1.useState)(false), onlyVerified = _j[0], setOnlyVerified = _j[1];
    var _k = (0, react_1.useState)(false), onlyEmergency = _k[0], setOnlyEmergency = _k[1];
    var _l = (0, react_1.useState)(0), minRating = _l[0], setMinRating = _l[1];
    var _m = (0, react_query_1.useQuery)({
        queryKey: ['services', { search: search, city: city, type: type, onlyVerified: onlyVerified, onlyEmergency: onlyEmergency, minRating: minRating }],
        queryFn: function () { return api_1.api.get('/services', {
            params: {
                q: search || undefined,
                city: city || undefined,
                service_type: type !== 'all' ? type : undefined,
                verified: onlyVerified || undefined,
                emergency: onlyEmergency || undefined,
                min_rating: minRating > 0 ? minRating : undefined,
            }
        }).then(function (r) { return r.data; }); },
    }), data = _m.data, isLoading = _m.isLoading;
    var getTypeLabel = function (key) {
        if (key === 'all')
            return t('services.allServices');
        return t("services.types.".concat(key));
    };
    return (<div className="page-container py-8 pb-24 lg:pb-8">
      <div className="mb-6">
        <h1 className="section-title mb-1">{t('services.title')}</h1>
        <p className="text-gray-500 text-sm">{t('services.subtitle')}</p>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <lucide_react_1.Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
          <input className="input pl-10 py-2.5" placeholder={t('services.searchPlaceholder')} value={search} onChange={function (e) { return setSearch(e.target.value); }}/>
        </div>
        <div className="relative">
          <lucide_react_1.MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
          <input className="input pl-10 py-2.5 w-36" placeholder={t('services.cityPlaceholder')} value={city} onChange={function (e) { return setCity(e.target.value); }}/>
        </div>
        <div className="flex border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden" role="group" aria-label="Προβολή">
          <button onClick={function () { return setViewMode('list'); }} aria-label="Προβολή λίστας" aria-pressed={viewMode === 'list'} className={"px-3 py-2 text-sm transition-colors ".concat(viewMode === 'list' ? 'bg-brand-900 text-white' : 'hover:bg-gray-50 dark:hover:bg-gray-800')}><lucide_react_1.List size={16} aria-hidden="true"/></button>
          <button onClick={function () { return setViewMode('map'); }} aria-label="Προβολή χάρτη" aria-pressed={viewMode === 'map'} className={"px-3 py-2 text-sm transition-colors ".concat(viewMode === 'map' ? 'bg-brand-900 text-white' : 'hover:bg-gray-50 dark:hover:bg-gray-800')}><lucide_react_1.Map size={16} aria-hidden="true"/></button>
        </div>
      </div>

      {/* Type filter */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        {serviceTypeKeys.map(function (st) {
            var isHosting = st.value === 'hosting';
            var isActive = isHosting
                ? (type === 'pet_sitting' || type === 'boarding')
                : type === st.value;
            return (<button key={st.value} onClick={function () { return setType(isHosting ? ((type === 'pet_sitting' || type === 'boarding') ? type : 'pet_sitting') : st.value); }} className={"flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ".concat(isActive
                    ? 'bg-brand-900 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-brand-300')}>
              <span>{st.emoji}</span>{getTypeLabel(st.key)}
            </button>);
        })}
      </div>

      {/* Φιλοξενία sub-options: ιδιώτης vs ξενοδοχείο */}
      {(type === 'pet_sitting' || type === 'boarding') && (<div className="flex items-center gap-1.5 flex-wrap mb-4 pl-1">
          {hostingSubTypes.map(function (sub) { return (<button key={sub.value} onClick={function () { return setType(sub.value); }} className={"flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ".concat(type === sub.value
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-orange-300')}>
              <span>{sub.emoji}</span>{getTypeLabel(sub.key)}
            </button>); })}
        </div>)}

      {/* Quick filters */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={function () { return setOnlyVerified(!onlyVerified); }} className={"flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ".concat(onlyVerified ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400')}>
          <lucide_react_1.CheckCircle size={13}/> {t('services.verified')}
        </button>
        <button onClick={function () { return setOnlyEmergency(!onlyEmergency); }} className={"flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ".concat(onlyEmergency ? 'bg-red-600 text-white border-red-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400')}>
          🚨 {t('services.emergency')}
        </button>
        {[4, 4.5].map(function (r) { return (<button key={r} onClick={function () { return setMinRating(minRating === r ? 0 : r); }} className={"flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ".concat(minRating === r ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400')}>
            <lucide_react_1.Star size={12} fill="currentColor"/> {r}+
          </button>); })}
      </div>

      {isLoading ? (<LoadingSkeleton_1.default variant="card" count={8}/>) : viewMode === 'map' ? (<ServicesMap_1.default services={(_a = data === null || data === void 0 ? void 0 : data.data) !== null && _a !== void 0 ? _a : []}/>) : (<>
          {((_b = data === null || data === void 0 ? void 0 : data.data) === null || _b === void 0 ? void 0 : _b.length) > 0 && (<p className="text-sm text-gray-500 mb-4">{data.total} {t('services.results')}</p>)}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(_c = data === null || data === void 0 ? void 0 : data.data) === null || _c === void 0 ? void 0 : _c.map(function (service, i) { return (<framer_motion_1.motion.div key={service.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <ServiceCard_1.default service={service}/>
              </framer_motion_1.motion.div>); })}
          </div>
          {((_d = data === null || data === void 0 ? void 0 : data.data) === null || _d === void 0 ? void 0 : _d.length) === 0 && (<div className="text-center py-24">
              <p className="text-4xl mb-4">🔍</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('services.noResults')}</p>
              <p className="text-gray-500 text-sm">{t('services.noResultsDesc')}</p>
            </div>)}
        </>)}
    </div>);
}
