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
exports.default = BulkImportModal;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
var XLSX = require("xlsx");
var api_1 = require("@/lib/api");
var react_hot_toast_1 = require("react-hot-toast");
var CONFIG = {
    products: {
        title: 'Μαζική Εισαγωγή Προϊόντων',
        endpoint: '/admin/bulk-import/products',
        queryKey: 'admin-products',
        templateUrl: '/templates/products_template.xlsx',
        templateName: 'products_template.xlsx',
        required: ['name', 'price', 'category'],
    },
    services: {
        title: 'Μαζική Εισαγωγή Υπηρεσιών',
        endpoint: '/admin/bulk-import/services',
        queryKey: 'admin-services',
        templateUrl: '/templates/services_template.xlsx',
        templateName: 'services_template.xlsx',
        required: ['provider_name', 'provider_email', 'service_type', 'city'],
    },
};
function BulkImportModal(_a) {
    var _this = this;
    var _b;
    var open = _a.open, onClose = _a.onClose, type = _a.type;
    var queryClient = (0, react_query_1.useQueryClient)();
    var cfg = CONFIG[type];
    var _c = (0, react_1.useState)(null), file = _c[0], setFile = _c[1];
    var _d = (0, react_1.useState)([]), parsed = _d[0], setParsed = _d[1];
    var _e = (0, react_1.useState)([]), parseErrors = _e[0], setParseErrors = _e[1];
    var _f = (0, react_1.useState)(null), result = _f[0], setResult = _f[1];
    var fileRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        if (!open) {
            setFile(null);
            setParsed([]);
            setParseErrors([]);
            setResult(null);
        }
    }, [open]);
    (0, react_1.useEffect)(function () {
        if (open)
            document.body.style.overflow = 'hidden';
        else
            document.body.style.overflow = '';
        return function () { document.body.style.overflow = ''; };
    }, [open]);
    var handleFile = function (f) { return __awaiter(_this, void 0, void 0, function () {
        var buffer, wb, sheet, rows, keys_1, dataRows, items_1, errors_1, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setFile(f);
                    setParsed([]);
                    setParseErrors([]);
                    setResult(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, f.arrayBuffer()];
                case 2:
                    buffer = _a.sent();
                    wb = XLSX.read(buffer, { type: 'array' });
                    sheet = wb.Sheets[wb.SheetNames[0]];
                    rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                    if (rows.length < 3) {
                        setParseErrors(['Το αρχείο δεν περιέχει δεδομένα. Συμπληρώστε γραμμές από τη γραμμή 3.']);
                        return [2 /*return*/];
                    }
                    keys_1 = rows[0].map(function (k) { return String(k).trim(); });
                    dataRows = rows.slice(2) // Skip header (row 1) and label (row 2)
                    ;
                    items_1 = [];
                    errors_1 = [];
                    dataRows.forEach(function (row, idx) {
                        // Skip empty rows
                        if (row.every(function (c) { return !c || String(c).trim() === ''; }))
                            return;
                        var obj = {};
                        keys_1.forEach(function (key, i) {
                            var val = row[i];
                            if (val !== '' && val !== null && val !== undefined) {
                                obj[key] = val;
                            }
                        });
                        // Validate required
                        var missing = cfg.required.filter(function (r) { return !obj[r] && obj[r] !== 0; });
                        if (missing.length > 0) {
                            errors_1.push("\u0393\u03C1\u03B1\u03BC\u03BC\u03AE ".concat(idx + 3, ": \u039B\u03B5\u03AF\u03C0\u03BF\u03C5\u03BD \u03C4\u03B1 \u03C0\u03B5\u03B4\u03AF\u03B1: ").concat(missing.join(', ')));
                        }
                        else {
                            items_1.push(obj);
                        }
                    });
                    setParsed(items_1);
                    setParseErrors(errors_1);
                    if (items_1.length === 0 && errors_1.length === 0) {
                        setParseErrors(['Δεν βρέθηκαν δεδομένα στο αρχείο']);
                    }
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _a.sent();
                    setParseErrors(['Δεν μπόρεσα να διαβάσω το αρχείο: ' + err_1.message]);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var importData = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_1.api.post(cfg.endpoint, { items: parsed }).then(function (r) { return r.data; }); },
        onSuccess: function (data) {
            setResult(data);
            queryClient.invalidateQueries({ queryKey: [cfg.queryKey] });
            if (data.failed === 0) {
                react_hot_toast_1.default.success("\u0395\u03B9\u03C3\u03AE\u03C7\u03B8\u03B7\u03C3\u03B1\u03BD ".concat(data.created, " \u03B5\u03B3\u03B3\u03C1\u03B1\u03C6\u03AD\u03C2 \u03B5\u03C0\u03B9\u03C4\u03C5\u03C7\u03CE\u03C2!"));
            }
            else {
                react_hot_toast_1.default.success("\u0395\u03B9\u03C3\u03AE\u03C7\u03B8\u03B7\u03C3\u03B1\u03BD ".concat(data.created, " \u03B5\u03B3\u03B3\u03C1\u03B1\u03C6\u03AD\u03C2, ").concat(data.failed, " \u03B1\u03C0\u03AD\u03C4\u03C5\u03C7\u03B1\u03BD"));
            }
        },
        onError: function (err) { var _a, _b; return react_hot_toast_1.default.error(((_b = (_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Σφάλμα κατά την εισαγωγή'); },
    });
    var downloadTemplate = function () {
        var link = document.createElement('a');
        link.href = cfg.templateUrl;
        link.download = cfg.templateName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    return (<framer_motion_1.AnimatePresence>
      {open && (<framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
          <framer_motion_1.motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col" onClick={function (e) { return e.stopPropagation(); }}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <lucide_react_1.FileSpreadsheet size={20} className="text-brand-900"/>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{cfg.title}</h3>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><lucide_react_1.X size={18}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Step 1: Download template */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">1</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">Κατεβάστε το template</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Συμπληρώστε το Excel αρχείο με τα δεδομένα σας. Δείτε τις οδηγίες στο 2ο sheet.
                  </p>
                  <button onClick={downloadTemplate} className="btn-secondary text-xs flex items-center gap-1.5">
                    <lucide_react_1.Download size={14}/> Κατέβασμα Template
                  </button>
                </div>
              </div>

              {/* Step 2: Upload file */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-900 text-white flex items-center justify-center font-bold text-sm shrink-0">2</div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">Ανέβασμα συμπληρωμένου Excel</p>
                    <p className="text-xs text-gray-500 mb-3">.xlsx, .xls, ή .csv</p>

                    <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={function (e) { var _a; var f = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0]; if (f)
            handleFile(f); }}/>
                    <button onClick={function () { var _a; return (_a = fileRef.current) === null || _a === void 0 ? void 0 : _a.click(); }} className="btn-primary text-xs flex items-center gap-1.5">
                      <lucide_react_1.Upload size={14}/> {file ? 'Αλλαγή αρχείου' : 'Επιλογή αρχείου'}
                    </button>
                    {file && (<p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        📎 {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </p>)}
                  </div>
                </div>
              </div>

              {/* Parse errors */}
              {parseErrors.length > 0 && (<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <lucide_react_1.AlertCircle size={16} className="text-red-600"/>
                    <p className="font-semibold text-red-700 dark:text-red-400 text-sm">Σφάλματα στο αρχείο</p>
                  </div>
                  <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 list-disc list-inside">
                    {parseErrors.slice(0, 10).map(function (e, i) { return <li key={i}>{e}</li>; })}
                    {parseErrors.length > 10 && <li>...και άλλα {parseErrors.length - 10}</li>}
                  </ul>
                </div>)}

              {/* Parsed preview */}
              {parsed.length > 0 && !result && (<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <lucide_react_1.CheckCircle size={16} className="text-green-600"/>
                    <p className="font-semibold text-green-700 dark:text-green-400 text-sm">
                      Βρέθηκαν {parsed.length} εγγραφές έτοιμες για εισαγωγή
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Πατήστε "Εισαγωγή" για να τις προσθέσετε στη βάση.
                  </p>
                </div>)}

              {/* Import result */}
              {result && (<div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{result.created}</p>
                      <p className="text-xs text-gray-500">Επιτυχείς</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                      <p className="text-xs text-gray-500">Αποτυχίες</p>
                    </div>
                  </div>
                  {((_b = result.errors) === null || _b === void 0 ? void 0 : _b.length) > 0 && (<div className="mt-3 max-h-40 overflow-y-auto">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Σφάλματα:</p>
                      <ul className="text-xs text-red-600 space-y-1">
                        {result.errors.map(function (e, i) { return (<li key={i}>• Γραμμή {e.row}: {e.error}</li>); })}
                      </ul>
                    </div>)}
                </div>)}
            </div>

            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100 dark:border-gray-800">
              <button onClick={onClose} className="btn-secondary">
                {result ? 'Κλείσιμο' : 'Ακύρωση'}
              </button>
              {!result && parsed.length > 0 && (<button onClick={function () { return importData.mutate(); }} disabled={importData.isPending} className="btn-primary flex items-center gap-2">
                  {importData.isPending ? <><lucide_react_1.Loader2 size={16} className="animate-spin"/>Εισαγωγή...</> : <><lucide_react_1.Upload size={16}/>Εισαγωγή {parsed.length} εγγραφών</>}
                </button>)}
            </div>
          </framer_motion_1.motion.div>
        </framer_motion_1.motion.div>)}
    </framer_motion_1.AnimatePresence>);
}
