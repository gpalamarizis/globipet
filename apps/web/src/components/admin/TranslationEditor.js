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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TranslationEditor;
var react_1 = require("react");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
var LANGUAGES = [
    { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
];
function TranslationEditor(_a) {
    var _b, _c, _d, _e;
    var open = _a.open, onClose = _a.onClose, onSave = _a.onSave, initialName = _a.initialName, initialDescription = _a.initialDescription, defaultName = _a.defaultName, defaultDescription = _a.defaultDescription, _f = _a.fields, fields = _f === void 0 ? ['name', 'description'] : _f, _g = _a.title, title = _g === void 0 ? 'Επεξεργασία μεταφράσεων' : _g;
    var _h = (0, react_1.useState)('en'), activeLang = _h[0], setActiveLang = _h[1];
    var _j = (0, react_1.useState)({}), nameTranslations = _j[0], setNameTranslations = _j[1];
    var _k = (0, react_1.useState)({}), descTranslations = _k[0], setDescTranslations = _k[1];
    (0, react_1.useEffect)(function () {
        if (open) {
            setNameTranslations(__assign({ el: defaultName || '' }, (initialName || {})));
            setDescTranslations(__assign({ el: defaultDescription || '' }, (initialDescription || {})));
        }
    }, [open, initialName, initialDescription, defaultName, defaultDescription]);
    // Body scroll lock
    (0, react_1.useEffect)(function () {
        if (open)
            document.body.style.overflow = 'hidden';
        else
            document.body.style.overflow = '';
        return function () { document.body.style.overflow = ''; };
    }, [open]);
    var handleSave = function () {
        var result = {};
        if (fields.includes('name')) {
            // Don't include the Greek (default) in translations
            var _1 = nameTranslations.el, rest = __rest(nameTranslations, ["el"]);
            result.name = rest;
        }
        if (fields.includes('description')) {
            var _2 = descTranslations.el, rest = __rest(descTranslations, ["el"]);
            result.description = rest;
        }
        onSave(result);
        onClose();
    };
    return (<framer_motion_1.AnimatePresence>
      {open && (<framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
          <framer_motion_1.motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }} className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col" onClick={function (e) { return e.stopPropagation(); }}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <lucide_react_1.Globe size={20} className="text-brand-900"/>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <lucide_react_1.X size={18}/>
              </button>
            </div>

            {/* Language tabs */}
            <div className="flex border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
              {LANGUAGES.filter(function (l) { return l.code !== 'el'; }).map(function (lang) {
                var _a, _b;
                var hasTranslation = ((!fields.includes('name') || !!((_a = nameTranslations[lang.code]) === null || _a === void 0 ? void 0 : _a.trim())) &&
                    (!fields.includes('description') || !!((_b = descTranslations[lang.code]) === null || _b === void 0 ? void 0 : _b.trim())));
                return (<button key={lang.code} onClick={function () { return setActiveLang(lang.code); }} className={"flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ".concat(activeLang === lang.code
                        ? 'border-brand-900 text-brand-900 dark:text-brand-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300')}>
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                    {hasTranslation && <lucide_react_1.Check size={12} className="text-green-500"/>}
                  </button>);
            })}
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Greek (default - readonly) */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">🇬🇷</span>
                  <span className="text-sm font-medium text-gray-500">Ελληνικά (default)</span>
                </div>
                {fields.includes('name') && (<div className="mb-2">
                    <label className="text-xs text-gray-500 mb-1 block">Όνομα</label>
                    <input type="text" className="input bg-white dark:bg-gray-900" value={defaultName || ''} readOnly/>
                  </div>)}
                {fields.includes('description') && (<div>
                    <label className="text-xs text-gray-500 mb-1 block">Περιγραφή</label>
                    <textarea className="input bg-white dark:bg-gray-900 resize-none" rows={3} value={defaultDescription || ''} readOnly/>
                  </div>)}
              </div>

              {/* Selected language editor */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">{(_b = LANGUAGES.find(function (l) { return l.code === activeLang; })) === null || _b === void 0 ? void 0 : _b.flag}</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {(_c = LANGUAGES.find(function (l) { return l.code === activeLang; })) === null || _c === void 0 ? void 0 : _c.name}
                  </span>
                </div>
                {fields.includes('name') && (<div className="mb-3">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Όνομα</label>
                    <input type="text" className="input" placeholder={"\u039C\u03B5\u03C4\u03AC\u03C6\u03C1\u03B1\u03C3\u03B7 \u03C3\u03C4\u03B1 ".concat((_d = LANGUAGES.find(function (l) { return l.code === activeLang; })) === null || _d === void 0 ? void 0 : _d.name)} value={nameTranslations[activeLang] || ''} onChange={function (e) {
                var _a;
                return setNameTranslations(__assign(__assign({}, nameTranslations), (_a = {}, _a[activeLang] = e.target.value, _a)));
            }}/>
                  </div>)}
                {fields.includes('description') && (<div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Περιγραφή</label>
                    <textarea className="input resize-none" rows={5} placeholder={"\u039C\u03B5\u03C4\u03AC\u03C6\u03C1\u03B1\u03C3\u03B7 \u03C3\u03C4\u03B1 ".concat((_e = LANGUAGES.find(function (l) { return l.code === activeLang; })) === null || _e === void 0 ? void 0 : _e.name)} value={descTranslations[activeLang] || ''} onChange={function (e) {
                var _a;
                return setDescTranslations(__assign(__assign({}, descTranslations), (_a = {}, _a[activeLang] = e.target.value, _a)));
            }}/>
                  </div>)}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-5 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500">
                💡 Αφήστε άδειο για να χρησιμοποιηθεί η ελληνική έκδοση
              </p>
              <div className="flex gap-2">
                <button onClick={onClose} className="btn-secondary">Ακύρωση</button>
                <button onClick={handleSave} className="btn-primary">Αποθήκευση μεταφράσεων</button>
              </div>
            </div>
          </framer_motion_1.motion.div>
        </framer_motion_1.motion.div>)}
    </framer_motion_1.AnimatePresence>);
}
