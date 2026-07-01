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
exports.default = ImageUploadField;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var api_1 = require("@/lib/api");
var react_hot_toast_1 = require("react-hot-toast");
var ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
var MAX_SIZE_MB = 5;
function ImageUploadField(_a) {
    var _this = this;
    var value = _a.value, onChange = _a.onChange, _b = _a.folder, folder = _b === void 0 ? 'uploads' : _b, _c = _a.label, label = _c === void 0 ? 'Εικόνα' : _c, _d = _a.className, className = _d === void 0 ? '' : _d;
    var _e = (0, react_1.useState)(value && value.startsWith('http') ? 'url' : 'upload'), mode = _e[0], setMode = _e[1];
    var _f = (0, react_1.useState)(false), uploading = _f[0], setUploading = _f[1];
    var _g = (0, react_1.useState)(false), dragActive = _g[0], setDragActive = _g[1];
    var fileRef = (0, react_1.useRef)(null);
    var validateFile = function (file) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
            return 'Επιτρέπονται μόνο εικόνες (JPG, PNG, WebP, GIF)';
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            return "\u0397 \u03B5\u03B9\u03BA\u03CC\u03BD\u03B1 \u03B5\u03AF\u03BD\u03B1\u03B9 \u03C0\u03BF\u03BB\u03CD \u03BC\u03B5\u03B3\u03AC\u03BB\u03B7. \u039C\u03AD\u03B3\u03B9\u03C3\u03C4\u03BF: ".concat(MAX_SIZE_MB, "MB");
        }
        return null;
    };
    var uploadFile = function (file) { return __awaiter(_this, void 0, void 0, function () {
        var error, fd, data, err_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    error = validateFile(file);
                    if (error) {
                        react_hot_toast_1.default.error(error);
                        return [2 /*return*/];
                    }
                    setUploading(true);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, 4, 5]);
                    fd = new FormData();
                    fd.append('file', file);
                    return [4 /*yield*/, api_1.api.post("/upload?folder=".concat(folder), fd, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        })];
                case 2:
                    data = (_c.sent()).data;
                    onChange(data.url);
                    react_hot_toast_1.default.success('Η εικόνα ανέβηκε επιτυχώς');
                    return [3 /*break*/, 5];
                case 3:
                    err_1 = _c.sent();
                    react_hot_toast_1.default.error(((_b = (_a = err_1 === null || err_1 === void 0 ? void 0 : err_1.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Σφάλμα κατά το upload');
                    return [3 /*break*/, 5];
                case 4:
                    setUploading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleFileSelect = function (e) {
        var _a;
        var file = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0];
        if (file)
            uploadFile(file);
    };
    var handleDrop = function (e) {
        var _a;
        e.preventDefault();
        setDragActive(false);
        var file = (_a = e.dataTransfer.files) === null || _a === void 0 ? void 0 : _a[0];
        if (file)
            uploadFile(file);
    };
    var removeImage = function () {
        onChange('');
        if (fileRef.current)
            fileRef.current.value = '';
    };
    return (<div className={className}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          <button type="button" onClick={function () { return setMode('upload'); }} className={"flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ".concat(mode === 'upload'
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-500')}>
            <lucide_react_1.Upload size={11}/>Upload
          </button>
          <button type="button" onClick={function () { return setMode('url'); }} className={"flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ".concat(mode === 'url'
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-500')}>
            <lucide_react_1.Link2 size={11}/>URL
          </button>
        </div>
      </div>

      {/* Preview if image exists */}
      {value && (<div className="relative mb-2 group">
          <img src={value} alt="Preview" className="w-full max-h-48 object-contain rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" onError={function (e) {
                e.target.style.display = 'none';
            }}/>
          <button type="button" onClick={removeImage} className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity" title="Αφαίρεση εικόνας">
            <lucide_react_1.X size={14}/>
          </button>
        </div>)}

      {mode === 'upload' ? (<div onDragOver={function (e) { e.preventDefault(); setDragActive(true); }} onDragLeave={function () { return setDragActive(false); }} onDrop={handleDrop} onClick={function () { var _a; return (_a = fileRef.current) === null || _a === void 0 ? void 0 : _a.click(); }} className={"relative cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-all ".concat(dragActive
                ? 'border-brand-900 bg-brand-50 dark:bg-brand-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-brand-900 hover:bg-gray-50 dark:hover:bg-gray-800', " ").concat(uploading ? 'pointer-events-none opacity-60' : '')}>
          <input ref={fileRef} type="file" accept={ACCEPTED_TYPES.join(',')} onChange={handleFileSelect} className="hidden" disabled={uploading}/>
          {uploading ? (<div className="flex flex-col items-center gap-2">
              <lucide_react_1.Loader2 size={28} className="text-brand-900 animate-spin"/>
              <p className="text-sm text-gray-600 dark:text-gray-400">Ανέβασμα...</p>
            </div>) : (<div className="flex flex-col items-center gap-2">
              <lucide_react_1.Image size={28} className="text-gray-400"/>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {value ? 'Αλλαγή εικόνας' : 'Κάντε κλικ ή σύρετε εικόνα εδώ'}
              </p>
              <p className="text-xs text-gray-500">JPG, PNG, WebP, GIF · έως {MAX_SIZE_MB}MB</p>
            </div>)}
        </div>) : (<input type="url" className="input" placeholder="https://example.com/image.jpg" value={value} onChange={function (e) { return onChange(e.target.value); }}/>)}
    </div>);
}
