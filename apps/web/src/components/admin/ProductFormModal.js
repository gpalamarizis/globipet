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
exports.default = ProductFormModal;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
var api_1 = require("@/lib/api");
var react_hot_toast_1 = require("react-hot-toast");
var CATEGORIES = [
    { value: 'food', label: 'Τροφές 🦴' },
    { value: 'toys', label: 'Παιχνίδια 🎾' },
    { value: 'accessories', label: 'Αξεσουάρ 🎀' },
];
var SPECIES = ['dog', 'cat', 'bird', 'rabbit', 'fish', 'reptile', 'horse'];
function ProductFormModal(_a) {
    var open = _a.open, onClose = _a.onClose, product = _a.product;
    var queryClient = (0, react_query_1.useQueryClient)();
    var isEdit = !!(product === null || product === void 0 ? void 0 : product.id);
    var _b = (0, react_1.useState)({
        name: '', description: '', price: '', category: 'food', brand: '',
        stock: '0', image_url: '', target_species: [],
        is_featured: false, discount_percentage: '', sale_price: '',
    }), form = _b[0], setForm = _b[1];
    (0, react_1.useEffect)(function () {
        if (product) {
            setForm({
                name: product.name || '',
                description: product.description || '',
                price: String(product.price || ''),
                category: product.category || 'food',
                brand: product.brand || '',
                stock: String(product.stock || 0),
                image_url: product.image_url || '',
                target_species: product.target_species || [],
                is_featured: !!product.is_featured,
                discount_percentage: String(product.discount_percentage || ''),
                sale_price: String(product.sale_price || ''),
            });
        }
        else {
            setForm({
                name: '', description: '', price: '', category: 'food', brand: '',
                stock: '0', image_url: '', target_species: [],
                is_featured: false, discount_percentage: '', sale_price: '',
            });
        }
    }, [product, open]);
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
                name: form.name,
                description: form.description,
                price: parseFloat(form.price),
                category: form.category,
                brand: form.brand || undefined,
                stock: parseInt(form.stock) || 0,
                image_url: form.image_url || undefined,
                target_species: form.target_species,
                is_featured: form.is_featured,
            };
            if (form.discount_percentage)
                data.discount_percentage = parseInt(form.discount_percentage);
            if (form.sale_price)
                data.sale_price = parseFloat(form.sale_price);
            return isEdit
                ? api_1.api.patch("/products/".concat(product.id), data)
                : api_1.api.post('/products', data);
        },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
            react_hot_toast_1.default.success(isEdit ? 'Το προϊόν ενημερώθηκε' : 'Το προϊόν προστέθηκε');
            onClose();
        },
        onError: function (err) { var _a, _b; return react_hot_toast_1.default.error(((_b = (_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Σφάλμα'); },
    });
    var handleSubmit = function (e) {
        e.preventDefault();
        if (!form.name.trim())
            return react_hot_toast_1.default.error('Το όνομα είναι υποχρεωτικό');
        if (!form.price || isNaN(parseFloat(form.price)))
            return react_hot_toast_1.default.error('Μη έγκυρη τιμή');
        save.mutate();
    };
    var toggleSpecies = function (s) {
        setForm(function (f) { return (__assign(__assign({}, f), { target_species: f.target_species.includes(s)
                ? f.target_species.filter(function (x) { return x !== s; })
                : __spreadArray(__spreadArray([], f.target_species, true), [s], false) })); });
    };
    return (<framer_motion_1.AnimatePresence>
      {open && (<framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
          <framer_motion_1.motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col" onClick={function (e) { return e.stopPropagation(); }}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <lucide_react_1.Package size={20} className="text-brand-900"/>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {isEdit ? 'Επεξεργασία Προϊόντος' : 'Νέο Προϊόν'}
                </h3>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><lucide_react_1.X size={18}/></button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Όνομα *</label>
                <input className="input" value={form.name} onChange={function (e) { return setForm(__assign(__assign({}, form), { name: e.target.value })); }} required autoFocus/>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Περιγραφή</label>
                <textarea className="input resize-none" rows={3} value={form.description} onChange={function (e) { return setForm(__assign(__assign({}, form), { description: e.target.value })); }}/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Τιμή (€) *</label>
                  <input type="number" step="0.01" className="input" value={form.price} onChange={function (e) { return setForm(__assign(__assign({}, form), { price: e.target.value })); }} required/>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Κατηγορία *</label>
                  <select className="input" value={form.category} onChange={function (e) { return setForm(__assign(__assign({}, form), { category: e.target.value })); }}>
                    {CATEGORIES.map(function (c) { return <option key={c.value} value={c.value}>{c.label}</option>; })}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Μάρκα</label>
                  <input className="input" value={form.brand} onChange={function (e) { return setForm(__assign(__assign({}, form), { brand: e.target.value })); }}/>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Απόθεμα</label>
                  <input type="number" className="input" value={form.stock} onChange={function (e) { return setForm(__assign(__assign({}, form), { stock: e.target.value })); }}/>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">URL Εικόνας</label>
                <input className="input" placeholder="https://..." value={form.image_url} onChange={function (e) { return setForm(__assign(__assign({}, form), { image_url: e.target.value })); }}/>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Είδος ζώου (multiple)</label>
                <div className="flex flex-wrap gap-2">
                  {SPECIES.map(function (s) { return (<button key={s} type="button" onClick={function () { return toggleSpecies(s); }} className={"px-3 py-1.5 rounded-full text-xs font-medium border transition-all ".concat(form.target_species.includes(s)
                    ? 'bg-brand-900 text-white border-brand-900'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600')}>{s}</button>); })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Έκπτωση %</label>
                  <input type="number" min="0" max="100" className="input" value={form.discount_percentage} onChange={function (e) { return setForm(__assign(__assign({}, form), { discount_percentage: e.target.value })); }}/>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Τιμή Προσφοράς (€)</label>
                  <input type="number" step="0.01" className="input" value={form.sale_price} onChange={function (e) { return setForm(__assign(__assign({}, form), { sale_price: e.target.value })); }}/>
                </div>
              </div>

              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4" checked={form.is_featured} onChange={function (e) { return setForm(__assign(__assign({}, form), { is_featured: e.target.checked })); }}/>
                <span className="text-sm text-gray-700 dark:text-gray-300">Προτεινόμενο προϊόν (Featured)</span>
              </label>
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
