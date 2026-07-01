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
exports.default = AiStoolUrine;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var api_1 = require("@/lib/api");
var react_query_1 = require("@tanstack/react-query");
var react_hot_toast_1 = require("react-hot-toast");
var utils_1 = require("@/lib/utils");
var SEVERITY_CONFIG = {
    normal: { label: 'Φυσιολογικό', color: 'text-green-700 bg-green-50 border-green-200', icon: lucide_react_1.CheckCircle, iconColor: 'text-green-500' },
    mild: { label: 'Ήπιο', color: 'text-yellow-700 bg-yellow-50 border-yellow-200', icon: lucide_react_1.Info, iconColor: 'text-yellow-500' },
    moderate: { label: 'Μέτριο', color: 'text-orange-700 bg-orange-50 border-orange-200', icon: lucide_react_1.AlertTriangle, iconColor: 'text-orange-500' },
    severe: { label: 'Σοβαρό', color: 'text-red-700 bg-red-50 border-red-200', icon: lucide_react_1.AlertTriangle, iconColor: 'text-red-500' },
};
var URGENCY_CONFIG = {
    routine: { color: 'bg-green-100 text-green-800' },
    within_48h: { color: 'bg-yellow-100 text-yellow-800' },
    today: { color: 'bg-orange-100 text-orange-800' },
    emergency: { color: 'bg-red-100 text-red-800' },
};
function renderItem(item) {
    if (item == null)
        return '';
    if (typeof item === 'string')
        return item;
    if (typeof item === 'object')
        return Object.values(item).filter(function (v) { return typeof v === 'string'; }).join(' — ');
    return String(item);
}
function AiStoolUrine() {
    var _this = this;
    var _a, _b, _c, _d, _e, _f;
    var _g = (0, react_1.useState)('stool'), sampleType = _g[0], setSampleType = _g[1];
    var _h = (0, react_1.useState)('dog'), species = _h[0], setSpecies = _h[1];
    var _j = (0, react_1.useState)(null), imageUrl = _j[0], setImageUrl = _j[1];
    var _k = (0, react_1.useState)(false), uploading = _k[0], setUploading = _k[1];
    var _l = (0, react_1.useState)(false), analyzing = _l[0], setAnalyzing = _l[1];
    var _m = (0, react_1.useState)(null), result = _m[0], setResult = _m[1];
    var _o = (0, react_1.useState)(true), showHistory = _o[0], setShowHistory = _o[1];
    var fileInputRef = (0, react_1.useRef)(null);
    // History form fields
    var _p = (0, react_1.useState)({
        breed: '',
        age_years: '',
        weight_kg: '',
        is_sterilized: '',
        ate_from_street: false,
        recent_medications: '',
        diet_change: '',
        last_normal_stool: '',
        symptoms: '',
        additional_notes: '',
    }), form = _p[0], setForm = _p[1];
    // Load user's pets to pre-fill data
    var _q = (0, react_query_1.useQuery)({
        queryKey: ['my-pets'],
        queryFn: function () { return api_1.api.get('/pets/my').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }).catch(function () { return []; }); },
    }).data, pets = _q === void 0 ? [] : _q;
    var handleFileSelect = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var file, url, _a;
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
                    return [4 /*yield*/, (0, api_1.uploadFile)(file, 'stool-urine')];
                case 2:
                    url = _c.sent();
                    setImageUrl(url);
                    return [3 /*break*/, 5];
                case 3:
                    _a = _c.sent();
                    react_hot_toast_1.default.error('Σφάλμα κατά το ανέβασμα της εικόνας');
                    return [3 /*break*/, 5];
                case 4:
                    setUploading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handlePetSelect = function (e) {
        var pet = pets.find(function (p) { return p.id === e.target.value; });
        if (!pet)
            return;
        setSpecies(pet.species === 'cat' ? 'cat' : 'dog');
        setForm(function (f) { return (__assign(__assign({}, f), { breed: pet.breed || '', age_years: pet.age != null ? String(pet.age) : '', weight_kg: pet.weight != null ? String(pet.weight) : '' })); });
    };
    var handleAnalyze = function () { return __awaiter(_this, void 0, void 0, function () {
        var payload, res, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!imageUrl)
                        return [2 /*return*/, react_hot_toast_1.default.error('Ανέβασε πρώτα μια φωτογραφία')];
                    setAnalyzing(true);
                    setResult(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    payload = {
                        image_url: imageUrl,
                        sample_type: sampleType,
                        species: species,
                        breed: form.breed || undefined,
                        age_years: form.age_years ? Number(form.age_years) : undefined,
                        weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
                        is_sterilized: form.is_sterilized === '' ? undefined : form.is_sterilized === 'true',
                        ate_from_street: form.ate_from_street || undefined,
                        recent_medications: form.recent_medications || undefined,
                        diet_change: form.diet_change || undefined,
                        last_normal_stool: form.last_normal_stool || undefined,
                        symptoms: form.symptoms || undefined,
                        additional_notes: form.additional_notes || undefined,
                    };
                    return [4 /*yield*/, api_1.api.post('/ai/stool-urine', payload)];
                case 2:
                    res = _a.sent();
                    setResult(res.data);
                    return [3 /*break*/, 5];
                case 3:
                    err_1 = _a.sent();
                    react_hot_toast_1.default.error((err_1 === null || err_1 === void 0 ? void 0 : err_1.message) || 'Σφάλμα ανάλυσης');
                    return [3 /*break*/, 5];
                case 4:
                    setAnalyzing(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var sev = result ? SEVERITY_CONFIG[result.severity] : null;
    var urg = result ? URGENCY_CONFIG[result.vet_urgency] : null;
    return (<div className="page-container py-8 pb-24 lg:pb-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
          <lucide_react_1.FlaskConical size={20} className="text-teal-600 dark:text-teal-400"/>
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-gray-900 dark:text-white">AI Ανάλυση Ούρων & Περιττωμάτων</h1>
          <p className="text-sm text-gray-500">Ανέβασε φωτογραφία για κτηνιατρική αξιολόγηση με AI</p>
        </div>
      </div>

      {/* Sample type + Species selector */}
      <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Τύπος Δείγματος</p>
          <div className="flex gap-2">
            {[['stool', '💩', 'Περιττώματα'], ['urine', '💧', 'Ούρα']].map(function (_a) {
            var v = _a[0], em = _a[1], lb = _a[2];
            return (<button key={v} onClick={function () { return setSampleType(v); }} className={(0, utils_1.cn)('flex-1 py-2 rounded-xl border text-sm font-medium transition-all', sampleType === v ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400')}>
                {em} {lb}
              </button>);
        })}
          </div>
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Είδος</p>
          <div className="flex gap-2">
            {[['dog', '🐶', 'Σκύλος'], ['cat', '🐱', 'Γάτα']].map(function (_a) {
            var v = _a[0], em = _a[1], lb = _a[2];
            return (<button key={v} onClick={function () { return setSpecies(v); }} className={(0, utils_1.cn)('flex-1 py-2 rounded-xl border text-sm font-medium transition-all', species === v ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400')}>
                {em} {lb}
              </button>);
        })}
          </div>
        </div>
      </div>

      {/* Photo upload */}
      <div className="card p-4 mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Φωτογραφία</p>
        {imageUrl ? (<div className="relative">
            <img src={imageUrl} alt="sample" className="w-full max-h-64 object-contain rounded-xl bg-gray-50 dark:bg-gray-800"/>
            <button onClick={function () { setImageUrl(null); setResult(null); }} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow flex items-center justify-center hover:bg-red-50">
              <lucide_react_1.X size={14} className="text-gray-600"/>
            </button>
          </div>) : (<div onClick={function () { var _a; return (_a = fileInputRef.current) === null || _a === void 0 ? void 0 : _a.click(); }} className="h-40 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-teal-400 transition-colors">
            {uploading
                ? <lucide_react_1.Loader2 size={24} className="text-teal-500 animate-spin"/>
                : <>
                  <div className="flex gap-3">
                    <lucide_react_1.Camera size={20} className="text-gray-400"/>
                    <lucide_react_1.Upload size={20} className="text-gray-400"/>
                  </div>
                  <p className="text-sm text-gray-500">Κάνε κλικ για φωτογραφία ή ανέβασμα</p>
                  <p className="text-xs text-gray-400">Τράβηξε από κοντά, με καλό φωτισμό</p>
                </>}
          </div>)}
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect}/>
      </div>

      {/* History form */}
      <div className="card mb-4 overflow-hidden">
        <button onClick={function () { return setShowHistory(function (h) { return !h; }); }} className="w-full flex items-center justify-between p-4 text-left">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Ιστορικό Ζώου</p>
            <p className="text-xs text-gray-500 mt-0.5">Προαιρετικό αλλά βελτιώνει σημαντικά την ανάλυση</p>
          </div>
          {showHistory ? <lucide_react_1.ChevronUp size={16} className="text-gray-400"/> : <lucide_react_1.ChevronDown size={16} className="text-gray-400"/>}
        </button>

        {showHistory && (<div className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-gray-800 pt-4">

            {/* Pre-fill from pets */}
            {pets.length > 0 && (<div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Συμπλήρωση από υπάρχον κατοικίδιο</label>
                <select onChange={handlePetSelect} defaultValue="" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400">
                  <option value="">— Επίλεξε κατοικίδιο —</option>
                  {pets.map(function (p) { return (<option key={p.id} value={p.id}>{p.name} ({p.species})</option>); })}
                </select>
              </div>)}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Ράτσα</label>
                <input value={form.breed} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { breed: e.target.value })); }); }} placeholder="π.χ. Labrador" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400"/>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Ηλικία (έτη)</label>
                <input type="number" min="0" max="25" value={form.age_years} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { age_years: e.target.value })); }); }} placeholder="π.χ. 4" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400"/>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Βάρος (kg)</label>
                <input type="number" min="0" value={form.weight_kg} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { weight_kg: e.target.value })); }); }} placeholder="π.χ. 12" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400"/>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Στείρωση</label>
                <select value={form.is_sterilized} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { is_sterilized: e.target.value })); }); }} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400">
                  <option value="">Άγνωστο</option>
                  <option value="true">Ναι, στειρωμένο</option>
                  <option value="false">Όχι</option>
                </select>
              </div>
            </div>

            {/* Boolean: ate from street */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.ate_from_street} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { ate_from_street: e.target.checked })); }); }} className="w-4 h-4 rounded accent-teal-500"/>
              <span className="text-sm text-gray-700 dark:text-gray-300">Έφαγε κάτι από τον δρόμο ή άγνωστη τροφή πρόσφατα</span>
            </label>

            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Πρόσφατα φάρμακα / αντιπαρασιτικά</label>
              <input value={form.recent_medications} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { recent_medications: e.target.value })); }); }} placeholder="π.χ. Nexgard πριν 3 μέρες" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400"/>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Πρόσφατη αλλαγή διατροφής</label>
              <input value={form.diet_change} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { diet_change: e.target.value })); }); }} placeholder="π.χ. άλλαξα σε Royal Canin πριν 5 μέρες" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400"/>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Πότε ήταν τα τελευταία φυσιολογικά περιττώματα;</label>
              <input value={form.last_normal_stool} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { last_normal_stool: e.target.value })); }); }} placeholder="π.χ. χθες το πρωί" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400"/>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Άλλα συμπτώματα που παρατήρησες</label>
              <textarea value={form.symptoms} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { symptoms: e.target.value })); }); }} placeholder="π.χ. λήθαργος, εμετός, αρνείται φαγητό, πολυδιψία..." rows={2} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400 resize-none"/>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Επιπλέον πληροφορίες</label>
              <textarea value={form.additional_notes} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { additional_notes: e.target.value })); }); }} placeholder="π.χ. πρόσφατα ταξίδι, επαφή με άλλα ζώα, stress..." rows={2} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-teal-400 resize-none"/>
            </div>
          </div>)}
      </div>

      {/* CTA */}
      <button onClick={handleAnalyze} disabled={!imageUrl || analyzing} className="w-full btn-primary py-3 flex items-center justify-center gap-2 mb-8 disabled:opacity-50">
        {analyzing
            ? <><lucide_react_1.Loader2 size={18} className="animate-spin"/> Ανάλυση σε εξέλιξη...</>
            : <><lucide_react_1.FlaskConical size={18}/> Ανάλυση με AI</>}
      </button>

      {/* Result */}
      {result && sev && urg && (<div className="space-y-4">
          {/* Severity badge */}
          <div className={(0, utils_1.cn)('card p-5 border flex items-start gap-4', sev.color)}>
            <sev.icon size={22} className={(0, utils_1.cn)('shrink-0 mt-0.5', sev.iconColor)}/>
            <div>
              <p className="font-bold text-lg">{sev.label}</p>
              <p className="text-sm mt-1">{result.recommendation}</p>
            </div>
          </div>

          {/* Urgency + summary */}
          <div className="card p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Επείγον</p>
              <span className={(0, utils_1.cn)('inline-block px-3 py-1 rounded-full text-xs font-bold', urg.color)}>{result.vet_urgency_el}</span>
            </div>
            {result.color && (<div className="text-right">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Χρώμα</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{result.color}</p>
              </div>)}
            {result.consistency && (<div className="text-right">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Σύσταση</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{result.consistency}</p>
              </div>)}
          </div>

          {/* Findings */}
          {((_a = result.findings) === null || _a === void 0 ? void 0 : _a.length) > 0 && (<div className="card p-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">🔍 Ευρήματα</p>
              <ul className="space-y-1.5">
                {result.findings.map(function (f, i) { return (<li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-teal-500 mt-0.5 shrink-0">•</span>{renderItem(f)}
                  </li>); })}
              </ul>
            </div>)}

          {/* Likely causes */}
          {((_b = result.likely_causes) === null || _b === void 0 ? void 0 : _b.length) > 0 && (<div className="card p-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">💡 Πιθανές Αιτίες</p>
              <ul className="space-y-1.5">
                {result.likely_causes.map(function (c, i) { return (<li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-orange-400 mt-0.5 shrink-0">•</span>{renderItem(c)}
                  </li>); })}
              </ul>
            </div>)}

          {/* Context factors */}
          {((_c = result.context_factors) === null || _c === void 0 ? void 0 : _c.length) > 0 && (<div className="card p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3">📋 Επίδραση Ιστορικού</p>
              <ul className="space-y-1.5">
                {result.context_factors.map(function (c, i) { return (<li key={i} className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-300">
                    <span className="mt-0.5 shrink-0">•</span>{renderItem(c)}
                  </li>); })}
              </ul>
            </div>)}

          {/* Home care */}
          {((_d = result.home_care) === null || _d === void 0 ? void 0 : _d.length) > 0 && (<div className="card p-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">🏠 Τι Κάνεις στο Σπίτι</p>
              <ul className="space-y-1.5">
                {result.home_care.map(function (h, i) { return (<li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-green-500 mt-0.5 shrink-0">✓</span>{renderItem(h)}
                  </li>); })}
              </ul>
            </div>)}

          {/* Warning signs */}
          {((_e = result.warning_signs) === null || _e === void 0 ? void 0 : _e.length) > 0 && (<div className="card p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3">⚠️ Πήγαινε Αμέσως σε Κτηνίατρο Αν...</p>
              <ul className="space-y-1.5">
                {result.warning_signs.map(function (w, i) { return (<li key={i} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                    <span className="mt-0.5 shrink-0">•</span>{renderItem(w)}
                  </li>); })}
              </ul>
            </div>)}

          {/* Sources */}
          {((_f = result.comparison_sources) === null || _f === void 0 ? void 0 : _f.length) > 0 && (<div className="card p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Πηγές Αναφοράς</p>
              <ul className="space-y-1">
                {result.comparison_sources.map(function (s, i) { return (<li key={i} className="text-xs text-gray-400">{renderItem(s)}</li>); })}
              </ul>
            </div>)}

          {/* Disclaimer */}
          <p className="text-xs text-gray-400 text-center px-4 pb-4">{result.disclaimer}</p>
        </div>)}
    </div>);
}
