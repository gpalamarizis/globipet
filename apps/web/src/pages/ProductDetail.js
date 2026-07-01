"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ProductDetail;
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var react_query_1 = require("@tanstack/react-query");
var react_i18next_1 = require("react-i18next");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
var api_1 = require("@/lib/api");
var auth_1 = require("@/store/auth");
var utils_1 = require("@/lib/utils");
var react_hot_toast_1 = require("react-hot-toast");
var LoadingSpinner_1 = require("@/components/ui/LoadingSpinner");
function ProductDetail() {
    var id = (0, react_router_dom_1.useParams)().id;
    var navigate = (0, react_router_dom_1.useNavigate)();
    var t = (0, react_i18next_1.useTranslation)().t;
    var _a = (0, auth_1.useAuthStore)(), isAuthenticated = _a.isAuthenticated, user = _a.user;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _b = (0, react_1.useState)(1), quantity = _b[0], setQuantity = _b[1];
    var _c = (0, react_1.useState)(0), selectedImage = _c[0], setSelectedImage = _c[1];
    var _d = (0, react_1.useState)('description'), tab = _d[0], setTab = _d[1];
    var _e = (0, react_query_1.useQuery)({
        queryKey: ['product', id],
        queryFn: function () { return api_1.api.get("/products/".concat(id)).then(function (r) { return r.data; }); },
        enabled: !!id,
    }), product = _e.data, isLoading = _e.isLoading;
    var _f = (0, react_query_1.useQuery)({
        queryKey: ['wishlist', user === null || user === void 0 ? void 0 : user.email],
        queryFn: function () { return api_1.api.get('/wishlist').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: !!user,
    }).data, wishlist = _f === void 0 ? [] : _f;
    var inWishlist = wishlist.some(function (w) { return w.product_id === (product === null || product === void 0 ? void 0 : product.id); });
    var _g = (0, react_query_1.useQuery)({
        queryKey: ['reviews', id],
        queryFn: function () { return api_1.api.get("/products/".concat(id, "/reviews")).then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }).catch(function () { return []; }); },
        enabled: !!id,
    }).data, reviews = _g === void 0 ? [] : _g;
    var addToCart = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_1.api.post('/cart', {
            product_id: product.id,
            product_name: product.name,
            product_price: product.sale_price || product.price,
            product_image: product.image_url,
            quantity: quantity,
        }); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ['cart'] });
            react_hot_toast_1.default.success(t('cart.added'));
        },
        onError: function () { return react_hot_toast_1.default.error(t('common.error')); },
    });
    var toggleWishlist = (0, react_query_1.useMutation)({
        mutationFn: function () { return inWishlist
            ? api_1.api.delete("/wishlist/".concat(product.id))
            : api_1.api.post('/wishlist', {
                product_id: product.id,
                product_name: product.name,
                product_price: product.sale_price || product.price,
                product_image: product.image_url,
            }); },
        onSuccess: function () { return queryClient.invalidateQueries({ queryKey: ['wishlist'] }); },
    });
    if (isLoading)
        return (<div className="page-container py-24 flex justify-center">
      <LoadingSpinner_1.default />
    </div>);
    if (!product)
        return (<div className="page-container py-16 text-center">
      <lucide_react_1.Package size={48} className="mx-auto text-gray-300 mb-4"/>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        {t('common.noResults')}
      </h2>
      <button onClick={function () { return navigate('/marketplace'); }} className="btn-primary mt-4">
        {t('nav.marketplace')}
      </button>
    </div>);
    var images = product.image_url ? [product.image_url] : [];
    var price = product.sale_price || product.price;
    var avgRating = reviews.length > 0
        ? reviews.reduce(function (s, r) { return s + r.rating; }, 0) / reviews.length
        : product.rating || 0;
    return (<div className="page-container py-8 pb-24 lg:pb-8 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <button onClick={function () { return navigate(-1); }} className="hover:text-brand-900 flex items-center gap-1">
          <lucide_react_1.ArrowLeft size={15}/> {t('common.back')}
        </button>
        <lucide_react_1.ChevronRight size={13}/>
        <react_router_dom_1.Link to="/marketplace" className="hover:text-brand-900">{t('nav.marketplace')}</react_router_dom_1.Link>
        <lucide_react_1.ChevronRight size={13}/>
        <span className="text-gray-900 dark:text-white truncate max-w-[200px]">{product.name}</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Images */}
        <framer_motion_1.motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-3">
            {images[selectedImage]
            ? <img src={images[selectedImage]} alt={product.name} className="w-full h-full object-cover"/>
            : <div className="w-full h-full flex items-center justify-center text-8xl">📦</div>}
          </div>
          {images.length > 1 && (<div className="flex gap-2">
              {images.map(function (img, i) { return (<button key={i} onClick={function () { return setSelectedImage(i); }} className={(0, utils_1.cn)('w-16 h-16 rounded-xl overflow-hidden border-2 transition-all', selectedImage === i ? 'border-brand-900' : 'border-transparent')}>
                  <img src={img} alt="" className="w-full h-full object-cover"/>
                </button>); })}
            </div>)}
        </framer_motion_1.motion.div>

        {/* Info */}
        <framer_motion_1.motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
          {/* Brand + badges */}
          <div className="flex items-center gap-2">
            {product.brand && <span className="text-sm text-gray-500 font-medium">{product.brand}</span>}
            {product.is_featured && (<span className="badge bg-brand-900 text-white text-xs">⭐ Featured</span>)}
            {product.discount_percentage && (<span className="badge bg-red-500 text-white text-xs">-{product.discount_percentage}%</span>)}
          </div>

          {/* Name */}
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white leading-tight">
            {product.name}
          </h1>

          {/* Rating */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(function (s) { return (<lucide_react_1.Star key={s} size={16} className={s <= Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}/>); })}
            </div>
            <span className="text-sm text-gray-500">
              {avgRating.toFixed(1)} ({reviews.length || product.reviews_count || 0} {t('common.reviews')})
            </span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {(0, utils_1.formatCurrency)(price)}
            </span>
            {product.sale_price && (<span className="text-lg text-gray-400 line-through">{(0, utils_1.formatCurrency)(product.price)}</span>)}
          </div>

          {/* Stock */}
          <div className="flex items-center gap-2">
            {product.stock > 0 ? (<>
                <lucide_react_1.Check size={16} className="text-green-500"/>
                <span className="text-sm text-green-600 font-medium">
                  {product.stock > 10 ? 'In stock' : "Only ".concat(product.stock, " left")}
                </span>
              </>) : (<span className="text-sm text-red-500 font-medium">Out of stock</span>)}
          </div>

          {/* Quantity */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Qty:</span>
            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl">
              <button onClick={function () { return setQuantity(function (q) { return Math.max(1, q - 1); }); }} className="p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-l-xl transition-colors">
                <lucide_react_1.Minus size={15}/>
              </button>
              <span className="px-4 py-2 text-sm font-bold min-w-[40px] text-center">{quantity}</span>
              <button onClick={function () { return setQuantity(function (q) { return Math.min(product.stock || 99, q + 1); }); }} className="p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-r-xl transition-colors">
                <lucide_react_1.Plus size={15}/>
              </button>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="flex gap-3">
            <button onClick={function () { return isAuthenticated ? addToCart.mutate() : navigate('/auth'); }} disabled={addToCart.isPending || product.stock === 0} className="btn-primary flex-1 flex items-center justify-center gap-2 py-3">
              <lucide_react_1.ShoppingCart size={18}/>
              {addToCart.isPending ? t('common.loading') : t('marketplace.addToCart')}
            </button>
            {isAuthenticated && (<button onClick={function () { return toggleWishlist.mutate(); }} className={(0, utils_1.cn)('p-3 rounded-xl border-2 transition-all', inWishlist
                ? 'border-red-300 bg-red-50 text-red-500 dark:bg-red-900/20'
                : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-red-300')}>
                <lucide_react_1.Heart size={20} fill={inWishlist ? 'currentColor' : 'none'}/>
              </button>)}
            <button className="p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gray-300 transition-all">
              <lucide_react_1.Share2 size={20}/>
            </button>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
            { icon: <lucide_react_1.Truck size={16}/>, text: 'Free shipping €50+' },
            { icon: <lucide_react_1.Shield size={16}/>, text: 'Secure payment' },
            { icon: <lucide_react_1.RotateCcw size={16}/>, text: '30-day returns' },
        ].map(function (b, i) { return (<div key={i} className="flex flex-col items-center gap-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-center">
                <span className="text-brand-900">{b.icon}</span>
                <span className="text-xs text-gray-500">{b.text}</span>
              </div>); })}
          </div>
        </framer_motion_1.motion.div>
      </div>

      {/* Tabs */}
      <div className="mt-10">
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          {['description', 'reviews', 'shipping'].map(function (t_) { return (<button key={t_} onClick={function () { return setTab(t_); }} className={(0, utils_1.cn)('px-5 py-3 text-sm font-medium transition-all border-b-2 -mb-px', tab === t_
                ? 'border-brand-900 text-brand-900'
                : 'border-transparent text-gray-500 hover:text-gray-700')}>
              {t_ === 'description' ? t('common.filter') === 'Filter' ? 'Description' : 'Περιγραφή'
                : t_ === 'reviews' ? t('common.reviews')
                    : 'Shipping'}
            </button>); })}
        </div>

        {tab === 'description' && (<framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="prose dark:prose-invert max-w-none">
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {product.description || 'No description available for this product.'}
            </p>
            {product.weight && (<div className="mt-4 grid grid-cols-2 gap-3">
                {[
                    { label: 'Weight', value: "".concat(product.weight, "g") },
                    { label: 'Category', value: product.category },
                    product.brand && { label: 'Brand', value: product.brand },
                ].filter(Boolean).map(function (attr, i) { return (<div key={i} className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm">
                    <span className="text-gray-500">{attr.label}</span>
                    <span className="font-medium text-gray-900 dark:text-white capitalize">{attr.value}</span>
                  </div>); })}
              </div>)}
          </framer_motion_1.motion.div>)}

        {tab === 'reviews' && (<framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {reviews.length === 0 ? (<div className="text-center py-12">
                <lucide_react_1.Star size={40} className="mx-auto text-gray-300 mb-3"/>
                <p className="text-gray-500">No reviews yet. Be the first!</p>
              </div>) : (<div className="space-y-4">
                {reviews.map(function (r) {
                    var _a, _b;
                    return (<div key={r.id} className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xs font-bold text-brand-900">
                          {((_b = (_a = r.user_name) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.toUpperCase()) || 'U'}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{r.user_name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(function (s) { return (<lucide_react_1.Star key={s} size={12} className={s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}/>); })}
                      </div>
                    </div>
                    {r.comment && <p className="text-sm text-gray-600 dark:text-gray-400">{r.comment}</p>}
                  </div>);
                })}
              </div>)}
          </framer_motion_1.motion.div>)}

        {tab === 'shipping' && (<framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {[
                { icon: '🚚', title: 'Standard Shipping', desc: '3-5 business days • Free over €50' },
                { icon: '⚡', title: 'Express Shipping', desc: '1-2 business days • €4.99' },
                { icon: '🔄', title: 'Returns', desc: '30 days free returns' },
            ].map(function (s, i) { return (<div key={i} className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span className="text-2xl">{s.icon}</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{s.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                </div>
              </div>); })}
          </framer_motion_1.motion.div>)}
      </div>
    </div>);
}
