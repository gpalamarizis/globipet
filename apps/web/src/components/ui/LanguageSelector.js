"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LanguageSelector;
var react_1 = require("react");
var react_i18next_1 = require("react-i18next");
var lucide_react_1 = require("lucide-react");
var framer_motion_1 = require("framer-motion");
var utils_1 = require("@/lib/utils");
var languages = [
    { code: 'el', label: 'Ελληνικά', flag: '🇬🇷' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'zh', label: '中文', flag: '🇨🇳' },
];
function LanguageSelector() {
    var i18n = (0, react_i18next_1.useTranslation)().i18n;
    var _a = (0, react_1.useState)(false), open = _a[0], setOpen = _a[1];
    var current = languages.find(function (l) { return l.code === i18n.language; }) || languages[0];
    var change = function (code) {
        i18n.changeLanguage(code);
        setOpen(false);
    };
    return (<div className="relative">
      <button onClick={function () { return setOpen(!open); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm">
        <span className="text-base">{current.flag}</span>
        <span className="hidden sm:block text-gray-600 dark:text-gray-400 font-medium">{current.code.toUpperCase()}</span>
        <lucide_react_1.ChevronDown size={13} className="text-gray-400"/>
      </button>

      <framer_motion_1.AnimatePresence>
        {open && (<>
            <div className="fixed inset-0 z-40" onClick={function () { return setOpen(false); }}/>
            <framer_motion_1.motion.div initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.96 }} transition={{ duration: 0.15 }} className="absolute right-0 top-full mt-1 w-44 card shadow-modal z-50 py-1 overflow-hidden">
              {languages.map(function (lang) { return (<button key={lang.code} onClick={function () { return change(lang.code); }} className={(0, utils_1.cn)('w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800', i18n.language === lang.code
                    ? 'text-brand-900 dark:text-brand-400 font-semibold bg-brand-50 dark:bg-brand-900/10'
                    : 'text-gray-700 dark:text-gray-300')}>
                  <span className="text-base">{lang.flag}</span>
                  <span>{lang.label}</span>
                  {i18n.language === lang.code && <span className="ml-auto text-brand-900">✓</span>}
                </button>); })}
            </framer_motion_1.motion.div>
          </>)}
      </framer_motion_1.AnimatePresence>
    </div>);
}
