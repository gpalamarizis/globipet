"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ProductCard;
var react_router_dom_1 = require("react-router-dom");
var lucide_react_1 = require("lucide-react");
var react_query_1 = require("@tanstack/react-query");
var api_1 = require("@/lib/api");
var auth_1 = require("@/store/auth");
var utils_1 = require("@/lib/utils");
var react_hot_toast_1 = require("react-hot-toast");
// #6: illustration fallback per product category (instead of one generic 📦 emoji)
var categoryIllustration = {
    food: { Icon: lucide_react_1.Bone, bg: 'bg-amber-50 dark:bg-amber-900/15', fg: 'text-amber-400 dark:text-amber-500' },
    toys: { Icon: lucide_react_1.Gamepad2, bg: 'bg-blue-50 dark:bg-blue-900/15', fg: 'text-blue-400 dark:text-blue-500' },
    accessories: { Icon: lucide_react_1.Tag, bg: 'bg-pink-50 dark:bg-pink-900/15', fg: 'text-pink-400 dark:text-pink-500' },
    health: { Icon: lucide_react_1.HeartPulse, bg: 'bg-red-50 dark:bg-red-900/15', fg: 'text-red-400 dark:text-red-500' },
    grooming: { Icon: lucide_react_1.Scissors, bg: 'bg-purple-50 dark:bg-purple-900/15', fg: 'text-purple-400 dark:text-purple-500' },
    training: { Icon: lucide_react_1.GraduationCap, bg: 'bg-green-50 dark:bg-green-900/15', fg: 'text-green-400 dark:text-green-500' },
    housing: { Icon: lucide_react_1.Home, bg: 'bg-orange-50 dark:bg-orange-900/15', fg: 'text-orange-400 dark:text-orange-500' },
};
var defaultIllustration = { Icon: lucide_react_1.Package, bg: 'bg-gray-50 dark:bg-gray-800', fg: 'text-gray-300 dark:text-gray-600' };
function ProductCard(_a) {
    var product = _a.product, _b = _a.viewMode, viewMode = _b === void 0 ? 'grid' : _b;
    var _c = (0, auth_1.useAuthStore)(), isAuthenticated = _c.isAuthenticated, user = _c.user;
    var queryClient = (0, react_query_1.useQueryClient)();
    var illustration = categoryIllustration[product.category] || defaultIllustration;
    var CategoryIcon = illustration.Icon, illuBg = illustration.bg, illuFg = illustration.fg;
    var _d = (0, react_query_1.useQuery)({ queryKey: ['wishlist', user === null || user === void 0 ? void 0 : user.email], queryFn: function () { return api_1.api.get('/wishlist').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); }, enabled: !!user }).data, wishlist = _d === void 0 ? [] : _d;
    var inWishlist = wishlist.some(function (w) { return w.product_id === product.id; });
    var addToCart = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_1.api.post('/cart', { product_id: product.id, product_name: product.name, product_price: product.price, product_image: product.image_url, quantity: 1 }); },
        onSuccess: function () { queryClient.invalidateQueries({ queryKey: ['cart'] }); react_hot_toast_1.default.success('Προστέθηκε στο καλάθι!'); }
    });
    var toggleWishlist = (0, react_query_1.useMutation)({
        mutationFn: function () { return inWishlist ? api_1.api.delete("/wishlist/".concat(product.id)) : api_1.api.post('/wishlist', { product_id: product.id, product_name: product.name, product_price: product.price, product_image: product.image_url }); },
        onSuccess: function () { return queryClient.invalidateQueries({ queryKey: ['wishlist'] }); }
    });
    if (viewMode === 'list') {
        return (<div className="card p-4 flex gap-4 hover:shadow-card-hover transition-all">
        <react_router_dom_1.Link to={"/marketplace/".concat(product.id)} className="shrink-0">
          <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden">
            {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover"/> : <div className={(0, utils_1.cn)('w-full h-full flex items-center justify-center', illuBg)}><CategoryIcon size={26} className={illuFg} strokeWidth={1.5}/></div>}
          </div>
        </react_router_dom_1.Link>
        <div className="flex-1 min-w-0">
          <react_router_dom_1.Link to={"/marketplace/".concat(product.id)}><p className="font-semibold text-gray-900 dark:text-white hover:text-brand-900 truncate">{product.name}</p></react_router_dom_1.Link>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{product.brand}</p>
          <div className="flex items-center gap-1 mt-1"><lucide_react_1.Star size={12} className="text-yellow-400 fill-yellow-400"/><span className="text-xs text-gray-500">{product.rating}</span></div>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          <p className="font-bold text-brand-900">{(0, utils_1.formatCurrency)(product.sale_price || product.price)}</p>
          {product.sale_price && <p className="text-xs text-gray-400 line-through">{(0, utils_1.formatCurrency)(product.price)}</p>}
          <button onClick={function () { return isAuthenticated ? addToCart.mutate() : null; }} disabled={addToCart.isPending} className="btn-primary py-1.5 text-xs flex items-center gap-1"><lucide_react_1.ShoppingCart size={13}/>Καλάθι</button>
        </div>
      </div>);
    }
    return (<div className="card overflow-hidden group hover:shadow-card-hover transition-all duration-200">
      <react_router_dom_1.Link to={"/marketplace/".concat(product.id)} className="block relative">
        <div className="aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden">
          {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/> : <div className={(0, utils_1.cn)('w-full h-full flex items-center justify-center', illuBg)}><CategoryIcon size={40} className={illuFg} strokeWidth={1.5}/></div>}
        </div>
        {product.discount_percentage && <div className="absolute top-2 left-2 badge bg-red-500 text-white">-{product.discount_percentage}%</div>}
        {product.is_featured && <div className="absolute top-2 right-2 badge bg-brand-900 text-white">⭐</div>}
      </react_router_dom_1.Link>

      <div className="p-3">
        <react_router_dom_1.Link to={"/marketplace/".concat(product.id)}>
          <p className="font-semibold text-sm text-gray-900 dark:text-white hover:text-brand-900 line-clamp-2 leading-snug">{product.name}</p>
        </react_router_dom_1.Link>
        {product.brand && <p className="text-xs text-gray-400 mt-0.5">{product.brand}</p>}
        <div className="flex items-center gap-1 mt-1">
          <lucide_react_1.Star size={11} className="text-yellow-400 fill-yellow-400"/>
          <span className="text-xs text-gray-500">{product.rating} ({product.reviews_count})</span>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div>
            <p className="font-bold text-gray-900 dark:text-white">{(0, utils_1.formatCurrency)(product.sale_price || product.price)}</p>
            {product.sale_price && <p className="text-xs text-gray-400 line-through">{(0, utils_1.formatCurrency)(product.price)}</p>}
          </div>
          <div className="flex gap-1">
            {isAuthenticated && (<button onClick={function () { return toggleWishlist.mutate(); }} className={(0, utils_1.cn)('p-2 rounded-lg transition-colors', inWishlist ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
                <lucide_react_1.Heart size={15} fill={inWishlist ? 'currentColor' : 'none'}/>
              </button>)}
            <button onClick={function () { return isAuthenticated ? addToCart.mutate() : null; }} disabled={addToCart.isPending || product.stock === 0} className="p-2 rounded-lg bg-brand-900 text-white hover:bg-brand-800 transition-colors disabled:opacity-50">
              <lucide_react_1.ShoppingCart size={15}/>
            </button>
          </div>
        </div>
      </div>
    </div>);
}
