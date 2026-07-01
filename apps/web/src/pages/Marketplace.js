"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Marketplace;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var react_i18next_1 = require("react-i18next");
var lucide_react_1 = require("lucide-react");
var framer_motion_1 = require("framer-motion");
var react_router_dom_1 = require("react-router-dom");
var api_1 = require("@/lib/api");
var ProductCard_1 = require("@/components/features/marketplace/ProductCard");
var LoadingSkeleton_1 = require("@/components/ui/LoadingSkeleton");
var categoryKeys = [
    { value: 'all', key: 'all', emoji: '🛍️' },
    { value: 'food', key: 'food', emoji: '🦴' },
    { value: 'toys', key: 'toys', emoji: '🎾' },
    { value: 'accessories', key: 'accessories', emoji: '🎀' },
];
var sortKeys = ['featured', 'price_asc', 'price_desc', 'rating', 'newest'];
function Marketplace() {
    var _a, _b;
    var t = (0, react_i18next_1.useTranslation)().t;
    var _c = (0, react_router_dom_1.useSearchParams)(), searchParams = _c[0], setSearchParams = _c[1];
    var _d = (0, react_1.useState)(searchParams.get('q') || ''), search = _d[0], setSearch = _d[1];
    var _e = (0, react_1.useState)(searchParams.get('category') || 'all'), category = _e[0], setCategory = _e[1];
    var _f = (0, react_1.useState)('featured'), sort = _f[0], setSort = _f[1];
    var _g = (0, react_1.useState)('grid'), viewMode = _g[0], setViewMode = _g[1];
    var _h = (0, react_1.useState)([0, 500]), priceRange = _h[0], setPriceRange = _h[1];
    var _j = (0, react_1.useState)(1), page = _j[0], setPage = _j[1];
    var _k = (0, react_query_1.useQuery)({
        queryKey: ['products', { search: search, category: category, sort: sort, priceRange: priceRange, page: page }],
        queryFn: function () { return api_1.api.get('/products', {
            params: {
                q: search || undefined,
                category: category !== 'all' ? category : undefined,
                sort: sort,
                min_price: priceRange[0] || undefined,
                max_price: priceRange[1] < 500 ? priceRange[1] : undefined,
                page: page,
                limit: 12,
            }
        }).then(function (r) { return r.data; }); },
    }), data = _k.data, isLoading = _k.isLoading, isFetching = _k.isFetching;
    var getCategoryLabel = function (key) { return t("marketplace.categories.".concat(key)); };
    return (<div className="page-container py-8 pb-24 lg:pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="section-title mb-1">{t('marketplace.title')}</h1>
        <p className="text-gray-500 text-sm">{t('marketplace.subtitle')}</p>
      </div>

      {/* Search + Sort bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 relative">
          <lucide_react_1.Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
          <input type="text" placeholder={t('marketplace.searchPlaceholder')} value={search} onChange={function (e) { setSearch(e.target.value); setPage(1); }} className="input pl-10 py-2.5"/>
        </div>
        <select value={sort} onChange={function (e) { return setSort(e.target.value); }} className="input py-2.5 w-auto cursor-pointer text-sm">
          {sortKeys.map(function (k) { return <option key={k} value={k}>{t("marketplace.sort.".concat(k))}</option>; })}
        </select>
        <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-xl p-1" role="group" aria-label="Προβολή">
          <button aria-label="Προβολή πλέγματος" aria-pressed={viewMode === 'grid'} className={"p-1.5 rounded-lg transition-colors ".concat(viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-700' : '')} onClick={function () { return setViewMode('grid'); }}><lucide_react_1.Grid size={16} aria-hidden="true"/></button>
          <button aria-label="Προβολή λίστας" aria-pressed={viewMode === 'list'} className={"p-1.5 rounded-lg transition-colors ".concat(viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-700' : '')} onClick={function () { return setViewMode('list'); }}><lucide_react_1.List size={16} aria-hidden="true"/></button>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {categoryKeys.map(function (cat) { return (<button key={cat.value} onClick={function () { setCategory(cat.value); setPage(1); }} className={"flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ".concat(category === cat.value
                ? 'bg-brand-900 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-brand-300')}>
            <span>{cat.emoji}</span>
            {getCategoryLabel(cat.key)}
          </button>); })}
      </div>

      {/* Results count */}
      {!isLoading && data && (<p className="text-sm text-gray-500 mb-4">
          {data.total} {t('marketplace.results')}
          {category !== 'all' && " ".concat(t('marketplace.inCategory'), " \"").concat(getCategoryLabel(category), "\"")}
        </p>)}

      {/* Products grid */}
      {isLoading ? (<LoadingSkeleton_1.default variant={viewMode === 'grid' ? 'card' : 'list-row'} count={viewMode === 'grid' ? 8 : 5}/>) : (<>
          <framer_motion_1.motion.div layout className={"grid gap-4 ".concat(viewMode === 'grid'
                ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                : 'grid-cols-1')}>
            <framer_motion_1.AnimatePresence mode="popLayout">
              {(_a = data === null || data === void 0 ? void 0 : data.data) === null || _a === void 0 ? void 0 : _a.map(function (product, i) { return (<framer_motion_1.motion.div key={product.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.03 }}>
                  <ProductCard_1.default product={product} viewMode={viewMode}/>
                </framer_motion_1.motion.div>); })}
            </framer_motion_1.AnimatePresence>
          </framer_motion_1.motion.div>

          {/* Empty state */}
          {((_b = data === null || data === void 0 ? void 0 : data.data) === null || _b === void 0 ? void 0 : _b.length) === 0 && (<div className="text-center py-24">
              <p className="text-4xl mb-4">🔍</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('marketplace.noResults')}</p>
              <p className="text-gray-500 text-sm">{t('marketplace.noResultsDesc')}</p>
            </div>)}

          {/* Pagination */}
          {data && data.totalPages > 1 && (<div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: data.totalPages }, function (_, i) { return i + 1; }).map(function (p) { return (<button key={p} onClick={function () { return setPage(p); }} className={"w-9 h-9 rounded-xl text-sm font-medium transition-all ".concat(page === p
                        ? 'bg-brand-900 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-brand-300')}>{p}</button>); })}
            </div>)}
        </>)}
    </div>);
}
