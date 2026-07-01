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
exports.default = LanguageSwitcher;
var react_1 = require("react");
var react_i18next_1 = require("react-i18next");
var lucide_react_1 = require("lucide-react");
var framer_motion_1 = require("framer-motion");
var LANGUAGES = [
    { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
];
function LanguageSwitcher(_a) {
    var _this = this;
    var _b = _a.variant, variant = _b === void 0 ? 'compact' : _b, onLanguageChange = _a.onLanguageChange;
    var i18n = (0, react_i18next_1.useTranslation)().i18n;
    var _c = (0, react_1.useState)(false), open = _c[0], setOpen = _c[1];
    var ref = (0, react_1.useRef)(null);
    var currentLang = LANGUAGES.find(function (l) { return l.code === i18n.language; }) || LANGUAGES[0];
    // Click outside to close
    (0, react_1.useEffect)(function () {
        var handler = function (e) {
            if (ref.current && !ref.current.contains(e.target))
                setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return function () { return document.removeEventListener('mousedown', handler); };
    }, []);
    var handleSelect = function (code) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, i18n.changeLanguage(code)];
                case 1:
                    _a.sent();
                    localStorage.setItem('globipet_language', code);
                    setOpen(false);
                    onLanguageChange === null || onLanguageChange === void 0 ? void 0 : onLanguageChange(code);
                    return [2 /*return*/];
            }
        });
    }); };
    return (<div ref={ref} className="relative">
      <button onClick={function () { return setOpen(!open); }} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
        {variant === 'compact' ? (<>
            <lucide_react_1.Globe size={16}/>
            <span className="hidden sm:inline">{currentLang.flag}</span>
          </>) : (<>
            <span className="text-base">{currentLang.flag}</span>
            <span>{currentLang.name}</span>
          </>)}
        <lucide_react_1.ChevronDown size={14} className={"transition-transform ".concat(open ? 'rotate-180' : '')}/>
      </button>

      <framer_motion_1.AnimatePresence>
        {open && (<framer_motion_1.motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.96 }} transition={{ duration: 0.15 }} className="absolute right-0 top-full mt-2 min-w-[180px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden z-50">
            {LANGUAGES.map(function (lang) { return (<button key={lang.code} onClick={function () { return handleSelect(lang.code); }} className={"w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ".concat(i18n.language === lang.code
                    ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-900 dark:text-brand-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800')}>
                <span className="text-base">{lang.flag}</span>
                <span className="flex-1 text-left">{lang.name}</span>
                {i18n.language === lang.code && <lucide_react_1.Check size={14} className="text-brand-900"/>}
              </button>); })}
          </framer_motion_1.motion.div>)}
      </framer_motion_1.AnimatePresence>
    </div>);
}
