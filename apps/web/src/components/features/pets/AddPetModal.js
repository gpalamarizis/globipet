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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AddPetModal;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var lucide_react_1 = require("lucide-react");
var framer_motion_1 = require("framer-motion");
var api_1 = require("@/lib/api");
var auth_1 = require("@/store/auth");
var react_hot_toast_1 = require("react-hot-toast");
var species = [
    { value: 'dog', label: 'Σκύλος', emoji: '🐶' },
    { value: 'cat', label: 'Γάτα', emoji: '🐱' },
    { value: 'bird', label: 'Πτηνό', emoji: '🐦' },
    { value: 'rabbit', label: 'Κουνέλι', emoji: '🐰' },
    { value: 'fish', label: 'Ψάρι', emoji: '🐟' },
    { value: 'reptile', label: 'Ερπετό', emoji: '🦎' },
    { value: 'horse', label: 'Άλογο', emoji: '🐴' },
    { value: 'other', label: 'Άλλο', emoji: '🐾' },
];
var emptyForm = { name: '', species: 'dog', breed: '', age: '', weight: '', gender: 'male', color: '', microchip_number: '', image_url: '' };
function AddPetModal(_a) {
    var _this = this;
    var open = _a.open, onClose = _a.onClose, editing = _a.editing;
    var user = (0, auth_1.useAuthStore)().user;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _b = (0, react_1.useState)(emptyForm), form = _b[0], setForm = _b[1];
    var _c = (0, react_1.useState)(false), uploading = _c[0], setUploading = _c[1];
    var fileInputRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        if (!open)
            return;
        if (editing) {
            setForm({
                name: editing.name || '',
                species: editing.species || 'dog',
                breed: editing.breed || '',
                age: editing.age != null ? String(editing.age) : '',
                weight: editing.weight != null ? String(editing.weight) : '',
                gender: editing.gender || 'male',
                color: editing.color || '',
                microchip_number: editing.microchip_number || '',
                image_url: editing.image_url || '',
            });
        }
        else {
            setForm(emptyForm);
        }
    }, [open, editing]);
    var handlePhotoUpload = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var file, url_1, _a;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    file = (_b = e.target.files) === null || _b === void 0 ? void 0 : _b[0];
                    if (!file)
                        return [2 /*return*/];
                    setUploading(true);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, (0, api_1.uploadFile)(file, 'pets')];
                case 2:
                    url_1 = _c.sent();
                    setForm(function (f) { return (__assign(__assign({}, f), { image_url: url_1 })); });
                    react_hot_toast_1.default.success('Φωτογραφία ανέβηκε!');
                    return [3 /*break*/, 5];
                case 3:
                    _a = _c.sent();
                    react_hot_toast_1.default.error('Σφάλμα κατά το upload');
                    return [3 /*break*/, 5];
                case 4:
                    setUploading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var savePet = (0, react_query_1.useMutation)({
        mutationFn: function () {
            var data = {
                name: form.name,
                species: form.species,
                breed: form.breed || null,
                age: form.age ? Number(form.age) : null,
                weight: form.weight ? Number(form.weight) : null,
                gender: form.gender,
                color: form.color || null,
                microchip_number: form.microchip_number || null,
                image_url: form.image_url || null,
            };
            if (editing)
                return api_1.api.patch("/pets/".concat(editing.id), data);
            return api_1.api.post('/pets', data);
        },
        onSuccess: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, queryClient.invalidateQueries({ queryKey: ['my-pets'] })];
                    case 1:
                        _a.sent();
                        react_hot_toast_1.default.success(editing ? "".concat(form.name, " \u03B5\u03BD\u03B7\u03BC\u03B5\u03C1\u03CE\u03B8\u03B7\u03BA\u03B5!") : "".concat(form.name, " \u03C0\u03C1\u03BF\u03C3\u03C4\u03AD\u03B8\u03B7\u03BA\u03B5!"));
                        setForm(emptyForm);
                        onClose();
                        return [2 /*return*/];
                }
            });
        }); },
        onError: function () { return react_hot_toast_1.default.error('Σφάλμα κατά την αποθήκευση'); },
    });
    return (<framer_motion_1.AnimatePresence>
      {open && (<>
          <framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50" onClick={onClose}/>
          <framer_motion_1.motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="fixed inset-x-4 top-4 bottom-4 z-50 max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-y-auto flex flex-col p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editing ? 'Επεξεργασία κατοικίδιου' : 'Προσθήκη κατοικίδιου'}
              </h2>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"><lucide_react_1.X size={18}/></button>
            </div>

            <div className="space-y-4 flex-1">
              <div className="flex justify-center">
                <div onClick={function () { var _a; return (_a = fileInputRef.current) === null || _a === void 0 ? void 0 : _a.click(); }} className="w-24 h-24 rounded-2xl bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-orange-400 transition-colors overflow-hidden">
                  {form.image_url
                ? <img src={form.image_url} alt="pet" className="w-full h-full object-cover"/>
                : uploading
                    ? <span className="text-xs text-gray-400">Ανέβασμα...</span>
                    : <lucide_react_1.Camera size={28} className="text-gray-400"/>}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload}/>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Όνομα *</label>
                <input className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-800" placeholder="π.χ. Ρέξ" value={form.name} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { name: e.target.value })); }); }}/>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Είδος *</label>
                <div className="grid grid-cols-4 gap-2">
                  {species.map(function (s) { return (<button key={s.value} type="button" onClick={function () { return setForm(function (f) { return (__assign(__assign({}, f), { species: s.value })); }); }} className={"p-2 rounded-xl border text-center transition-all ".concat(form.species === s.value ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-orange-300')}>
                      <span className="text-xl block">{s.emoji}</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{s.label}</span>
                    </button>); })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[['breed', 'Ράτσα', 'π.χ. Labrador'], ['color', 'Χρώμα', 'π.χ. Καφέ']].map(function (_a) {
                var k = _a[0], l = _a[1], p = _a[2];
                return (<div key={k}>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{l}</label>
                    <input className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-800" placeholder={p} value={form[k]} onChange={function (e) { return setForm(function (f) {
                    var _a;
                    return (__assign(__assign({}, f), (_a = {}, _a[k] = e.target.value, _a)));
                }); }}/>
                  </div>);
            })}
                {[['age', 'Ηλικία (έτη)', 'π.χ. 3'], ['weight', 'Βάρος (kg)', 'π.χ. 25']].map(function (_a) {
                var k = _a[0], l = _a[1], p = _a[2];
                return (<div key={k}>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{l}</label>
                    <input type="number" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-800" placeholder={p} value={form[k]} onChange={function (e) { return setForm(function (f) {
                    var _a;
                    return (__assign(__assign({}, f), (_a = {}, _a[k] = e.target.value, _a)));
                }); }}/>
                  </div>);
            })}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Φύλο</label>
                <div className="flex gap-2">
                  {[{ v: 'male', l: '♂ Αρσενικό' }, { v: 'female', l: '♀ Θηλυκό' }].map(function (g) { return (<button key={g.v} type="button" onClick={function () { return setForm(function (f) { return (__assign(__assign({}, f), { gender: g.v })); }); }} className={"flex-1 py-2 rounded-xl border text-sm font-medium transition-all ".concat(form.gender === g.v ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700' : 'border-gray-200 dark:border-gray-700')}>
                      {g.l}
                    </button>); })}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Αριθμός Microchip</label>
                <input className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-800" placeholder="15 ψηφία" value={form.microchip_number} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { microchip_number: e.target.value })); }); }}/>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium">Ακύρωση</button>
              <button onClick={function () { return savePet.mutate(); }} disabled={!form.name || savePet.isPending} className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium disabled:opacity-50">
                {savePet.isPending ? 'Αποθήκευση...' : editing ? 'Ενημέρωση' : 'Προσθήκη'}
              </button>
            </div>
          </framer_motion_1.motion.div>
        </>)}
    </framer_motion_1.AnimatePresence>);
}
