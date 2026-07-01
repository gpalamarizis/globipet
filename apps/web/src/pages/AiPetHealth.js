"use strict";
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
exports.default = AiPetHealth;
var react_1 = require("react");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
var api_1 = require("@/lib/api");
var react_router_dom_1 = require("react-router-dom");
var react_hot_toast_1 = require("react-hot-toast");
// The AI sometimes returns richer objects (e.g. {name, probability}) instead of plain strings —
// render whatever shape comes back without crashing React.
function renderItem(item) {
    if (item == null)
        return '';
    if (typeof item === 'string' || typeof item === 'number')
        return String(item);
    if (typeof item === 'object') {
        if (item.name) {
            var prob = item.probability ? " (".concat(item.probability, ")") : '';
            return "".concat(item.name).concat(prob);
        }
        return Object.values(item).filter(function (v) { return typeof v === 'string' || typeof v === 'number'; }).join(' — ');
    }
    return String(item);
}
var analysisTypes = [
    {
        id: 'skin',
        icon: lucide_react_1.Microscope,
        title: 'Ανάλυση Δέρματος',
        description: 'Ανίχνευση δερματικών παθήσεων, εξανθημάτων, τριχόπτωσης',
        color: 'orange',
        examples: ['Εξάνθημα / Ερεθισμός', 'Τριχόπτωση', 'Τραύμα / Πληγή', 'Παράσιτα', 'Αλλεργία'],
    },
    {
        id: 'eye',
        icon: lucide_react_1.Eye,
        title: 'Ανάλυση Ματιών',
        description: 'Ανίχνευση οφθαλμολογικών προβλημάτων και παθήσεων',
        color: 'blue',
        examples: ['Ερυθρότητα / Φλεγμονή', 'Έκκριση', 'Θολερότητα', 'Οίδημα βλεφάρου', 'Κερατίτιδα'],
    },
    {
        id: 'stool_urine',
        icon: lucide_react_1.FlaskConical,
        title: 'Ούρα & Περιττώματα',
        description: 'AI ανάλυση δείγματος με πλήρες ιστορικό ζώου',
        color: 'teal',
        examples: ['Αίμα στα κόπρανα', 'Διάρροια', 'Σκούρα ούρα', 'Αλλαγή χρώματος', 'Ασυνήθιστη σύσταση'],
    },
];
function AiPetHealth() {
    var _this = this;
    var _a = (0, react_1.useState)('select'), step = _a[0], setStep = _a[1];
    var _b = (0, react_1.useState)(null), analysisType = _b[0], setAnalysisType = _b[1];
    var _c = (0, react_1.useState)(null), imageUrl = _c[0], setImageUrl = _c[1];
    var _d = (0, react_1.useState)(null), imageFile = _d[0], setImageFile = _d[1];
    var navigate = (0, react_router_dom_1.useNavigate)();
    var _e = (0, react_1.useState)(null), result = _e[0], setResult = _e[1];
    var _f = (0, react_1.useState)(false), uploading = _f[0], setUploading = _f[1];
    var fileInputRef = (0, react_1.useRef)(null);
    var handleSelectType = function (type) {
        if (type === 'stool_urine') {
            navigate('/ai-stool-urine');
            return;
        }
        setAnalysisType(type);
        setStep('upload');
    };
    var handleFileChange = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var file, objectUrl;
        var _a;
        return __generator(this, function (_b) {
            file = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0];
            if (!file)
                return [2 /*return*/];
            setImageFile(file);
            objectUrl = URL.createObjectURL(file);
            setImageUrl(objectUrl);
            return [2 /*return*/];
        });
    }); };
    var handleAnalyze = function () { return __awaiter(_this, void 0, void 0, function () {
        var uploadedUrl, data, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!imageFile || !analysisType)
                        return [2 /*return*/];
                    setStep('analyzing');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    setUploading(true);
                    return [4 /*yield*/, (0, api_1.uploadFile)(imageFile, 'ai-health')];
                case 2:
                    uploadedUrl = _a.sent();
                    setUploading(false);
                    return [4 /*yield*/, api_1.api.post('/ai/pet-health', {
                            image_url: uploadedUrl,
                            analysis_type: analysisType,
                        })];
                case 3:
                    data = (_a.sent()).data;
                    setResult(data);
                    setStep('result');
                    return [3 /*break*/, 5];
                case 4:
                    err_1 = _a.sent();
                    react_hot_toast_1.default.error('Σφάλμα κατά την ανάλυση');
                    setStep('upload');
                    setUploading(false);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleReset = function () {
        setStep('select');
        setAnalysisType(null);
        setImageUrl(null);
        setImageFile(null);
        setResult(null);
    };
    var severityConfig = {
        low: { color: 'green', label: 'Χαμηλή ανησυχία', icon: lucide_react_1.CheckCircle },
        medium: { color: 'orange', label: 'Μέτρια ανησυχία', icon: lucide_react_1.AlertTriangle },
        high: { color: 'red', label: 'Υψηλή ανησυχία', icon: lucide_react_1.AlertTriangle },
    };
    return (<div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <div className="max-w-3xl mx-auto px-4">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <lucide_react_1.Stethoscope size={32} className="text-white"/>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">AI Pet Health Assistant</h1>
          <p className="text-gray-500 dark:text-gray-400">Ανάλυση φωτογραφιών με τεχνητή νοημοσύνη για έγκαιρη διάγνωση</p>
        </div>

        <framer_motion_1.AnimatePresence mode="wait">

          {/* Step 1: Select type */}
          {step === 'select' && (<framer_motion_1.motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {analysisTypes.map(function (type) { return (<button key={type.id} onClick={function () { return handleSelectType(type.id); }} className="bg-white dark:bg-gray-900 rounded-2xl p-6 text-left border-2 border-transparent hover:border-orange-400 transition-all shadow-sm hover:shadow-md group">
                    <div className={"w-12 h-12 rounded-xl flex items-center justify-center mb-4 ".concat(type.color === 'orange' ? 'bg-orange-100 dark:bg-orange-900/20' : type.color === 'teal' ? 'bg-teal-100 dark:bg-teal-900/20' : 'bg-blue-100 dark:bg-blue-900/20')}>
                      <type.icon size={24} className={type.color === 'orange' ? 'text-orange-500' : type.color === 'teal' ? 'text-teal-500' : 'text-blue-500'}/>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{type.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{type.description}</p>
                    <div className="space-y-1">
                      {type.examples.map(function (ex) { return (<div key={ex} className="flex items-center gap-2 text-xs text-gray-400">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-300"/>
                          {ex}
                        </div>); })}
                    </div>
                    <div className="flex items-center gap-1 mt-4 text-orange-500 text-sm font-medium group-hover:gap-2 transition-all">
                      Επιλογή <lucide_react_1.ChevronRight size={16}/>
                    </div>
                  </button>); })}
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300">
                <strong>⚠️ Σημαντικό:</strong> Το AI assistant παρέχει ενδεικτική ανάλυση και δεν υποκαθιστά την επίσκεψη σε κτηνίατρο. Σε περίπτωση αμφιβολίας, επικοινωνήστε με εξειδικευμένο κτηνίατρο.
              </div>
            </framer_motion_1.motion.div>)}

          {/* Step 2: Upload */}
          {step === 'upload' && (<framer_motion_1.motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm mb-4">
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={handleReset} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
                    <lucide_react_1.X size={18} className="text-gray-400"/>
                  </button>
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white">
                      {analysisType === 'skin' ? '🔬 Ανάλυση Δέρματος' : '👁️ Ανάλυση Ματιών'}
                    </h2>
                    <p className="text-sm text-gray-400">Ανεβάστε φωτογραφία για ανάλυση</p>
                  </div>
                </div>

                {!imageUrl ? (<div onClick={function () { var _a; return (_a = fileInputRef.current) === null || _a === void 0 ? void 0 : _a.click(); }} className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-12 text-center cursor-pointer hover:border-orange-400 transition-colors">
                    <lucide_react_1.Camera size={40} className="text-gray-300 mx-auto mb-3"/>
                    <p className="text-gray-500 font-medium mb-1">Κλικ για επιλογή φωτογραφίας</p>
                    <p className="text-gray-400 text-sm">JPG, PNG έως 5MB</p>
                  </div>) : (<div className="relative">
                    <img src={imageUrl} alt="preview" className="w-full max-h-80 object-contain rounded-xl bg-gray-100 dark:bg-gray-800"/>
                    <button onClick={function () { setImageUrl(null); setImageFile(null); }} className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white">
                      <lucide_react_1.X size={16}/>
                    </button>
                  </div>)}

                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange}/>

                {imageUrl && (<div className="mt-4 space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-sm text-gray-500">
                      <strong className="text-gray-700 dark:text-gray-300">Συμβουλές για καλύτερα αποτελέσματα:</strong>
                      <ul className="mt-1 space-y-1 list-disc list-inside">
                        {analysisType === 'skin'
                    ? ['Φωτογραφίστε κοντά στην πάσχουσα περιοχή', 'Καλός φωτισμός χωρίς φλας', 'Η περιοχή να είναι καθαρή']
                    : ['Κρατήστε το μάτι ανοιχτό', 'Φυσικό φως χωρίς λάμψη', 'Φωτογραφίστε και τα δύο μάτια αν υπάρχει σύγκριση']}
                      </ul>
                    </div>
                    <button onClick={handleAnalyze} className="w-full py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                      <lucide_react_1.Stethoscope size={18}/>
                      Εκκίνηση Ανάλυσης AI
                    </button>
                  </div>)}
              </div>
            </framer_motion_1.motion.div>)}

          {/* Step 3: Analyzing */}
          {step === 'analyzing' && (<framer_motion_1.motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-white dark:bg-gray-900 rounded-2xl p-12 shadow-sm text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <lucide_react_1.Stethoscope size={36} className="text-white"/>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Ανάλυση σε εξέλιξη...</h2>
              <p className="text-gray-400 mb-6">{uploading ? 'Μεταφόρτωση φωτογραφίας...' : 'Το AI αναλύει την εικόνα...'}</p>
              <div className="flex justify-center gap-1">
                {[0, 1, 2].map(function (i) { return (<div key={i} className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "".concat(i * 0.15, "s") }}/>); })}
              </div>
            </framer_motion_1.motion.div>)}

          {/* Step 4: Result */}
          {step === 'result' && result && (<framer_motion_1.motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              {(function () {
                var sev = severityConfig[result.severity];
                return (<div className="space-y-4">
                    {/* Severity banner */}
                    <div className={"rounded-2xl p-5 flex items-center gap-4 ".concat(result.severity === 'low' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
                        result.severity === 'medium' ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800' :
                            'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800')}>
                      <sev.icon size={32} className={result.severity === 'low' ? 'text-green-500' :
                        result.severity === 'medium' ? 'text-orange-500' : 'text-red-500'}/>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{sev.label}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{result.urgency}</p>
                      </div>
                    </div>

                    {/* Findings */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">🔍 Ευρήματα</h3>
                      <ul className="space-y-2">
                        {result.findings.map(function (f, i) { return (<li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0"/>
                            {renderItem(f)}
                          </li>); })}
                      </ul>
                    </div>

                    {/* Possible conditions */}
                    {result.conditions.length > 0 && (<div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">📋 Πιθανές Παθήσεις</h3>
                        <div className="flex flex-wrap gap-2">
                          {result.conditions.map(function (c, i) { return (<span key={i} className="px-3 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-full text-sm">{renderItem(c)}</span>); })}
                        </div>
                      </div>)}

                    {/* Recommendation */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">💡 Σύσταση</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{result.recommendation}</p>
                    </div>

                    {/* CTA */}
                    <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl p-5 text-white">
                      <h3 className="font-semibold mb-1">Θέλετε επαγγελματική γνώμη;</h3>
                      <p className="text-sm text-orange-100 mb-3">Συνδεθείτε με εξειδικευμένο κτηνίατρο τώρα</p>
                      <react_router_dom_1.Link to="/telehealth" className="block w-full py-2.5 bg-white text-orange-600 rounded-xl font-medium text-center text-sm hover:bg-orange-50 transition-colors">
                        Τηλεϊατρική Συνεδρία →
                      </react_router_dom_1.Link>
                    </div>

                    {/* Disclaimer */}
                    <div className="text-xs text-gray-400 text-center px-4">{result.disclaimer}</div>

                    <button onClick={handleReset} className="w-full py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      Νέα Ανάλυση
                    </button>
                  </div>);
            })()}
            </framer_motion_1.motion.div>)}
        </framer_motion_1.AnimatePresence>
      </div>
    </div>);
}
