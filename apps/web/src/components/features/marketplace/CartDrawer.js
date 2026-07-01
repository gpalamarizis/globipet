"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CartDrawer;
var react_query_1 = require("@tanstack/react-query");
var lucide_react_1 = require("lucide-react");
var react_router_dom_1 = require("react-router-dom");
var react_1 = require("react");
var api_1 = require("@/lib/api");
var auth_1 = require("@/store/auth");
var utils_1 = require("@/lib/utils");
function CartDrawer(_a) {
    var open = _a.open, onClose = _a.onClose;
    var user = (0, auth_1.useAuthStore)().user;
    var queryClient = (0, react_query_1.useQueryClient)();
    // Close on Escape key
    (0, react_1.useEffect)(function () {
        if (!open)
            return;
        var handler = function (e) { if (e.key === 'Escape')
            onClose(); };
        document.addEventListener('keydown', handler);
        return function () { return document.removeEventListener('keydown', handler); };
    }, [open, onClose]);
    var _b = (0, react_query_1.useQuery)({
        queryKey: ['cart'],
        queryFn: function () { return api_1.api.get('/cart').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: !!user && open,
    }).data, cart = _b === void 0 ? [] : _b;
    var updateQty = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var id = _a.id, qty = _a.qty;
            return qty <= 0 ? api_1.api.delete("/cart/".concat(id)) : api_1.api.patch("/cart/".concat(id), { quantity: qty });
        },
        onSuccess: function () { return queryClient.invalidateQueries({ queryKey: ['cart'] }); },
    });
    var total = cart.reduce(function (s, i) { return s + i.product_price * i.quantity; }, 0);
    if (!open)
        return null;
    return (<>
      {/* Overlay — z-[100] to sit above checkout and any other page content */}
      <div className="fixed inset-0 bg-black/40 z-[100]" onClick={onClose}/>

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white dark:bg-gray-900 shadow-modal z-[101] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold flex items-center gap-2"><lucide_react_1.ShoppingCart size={18}/>Καλάθι ({cart.length})</h2>
          <button onClick={onClose} className="btn-ghost p-2" aria-label="Κλείσιμο"><lucide_react_1.X size={18}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (<div className="text-center py-16 text-gray-400">
              <lucide_react_1.ShoppingCart size={40} className="mx-auto mb-3 opacity-30"/>
              <p className="text-sm">Το καλάθι σας είναι άδειο</p>
            </div>) : cart.map(function (item) { return (<div key={item.id} className="flex gap-3 items-center">
              <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0">
                {item.product_image ? <img src={item.product_image} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.product_name}</p>
                <p className="text-sm font-bold text-brand-900 mt-0.5">{(0, utils_1.formatCurrency)(item.product_price)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={function () { return updateQty.mutate({ id: item.id, qty: item.quantity - 1 }); }} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100"><lucide_react_1.Minus size={12}/></button>
                <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                <button onClick={function () { return updateQty.mutate({ id: item.id, qty: item.quantity + 1 }); }} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100"><lucide_react_1.Plus size={12}/></button>
              </div>
            </div>); })}
        </div>
        {cart.length > 0 && (<div className="p-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex justify-between mb-4">
              <span className="text-sm text-gray-500">Σύνολο</span>
              <span className="font-bold text-lg text-gray-900 dark:text-white">{(0, utils_1.formatCurrency)(total)}</span>
            </div>
            <react_router_dom_1.Link to="/checkout" onClick={onClose} className="btn-primary w-full flex items-center justify-center gap-2">
              Ολοκλήρωση αγοράς <lucide_react_1.ArrowRight size={16}/>
            </react_router_dom_1.Link>
          </div>)}
      </div>
    </>);
}
