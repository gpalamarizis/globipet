"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LegalPage;
var react_i18next_1 = require("react-i18next");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
function LegalPage(_a) {
    var variant = _a.variant;
    var t = (0, react_i18next_1.useTranslation)().t;
    var Icon = variant === 'terms' ? lucide_react_1.FileText : variant === 'privacy' ? lucide_react_1.Lock : lucide_react_1.Cookie;
    // Section count per variant
    var sectionsByVariant = {
        terms: 10,
        privacy: 8,
        cookies: 6,
    };
    var numSections = sectionsByVariant[variant];
    return (<div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <section className="bg-[#0F2A3F] text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Icon size={48} className="mx-auto mb-4 text-yellow-400"/>
            <h1 className="text-4xl lg:text-5xl font-display font-black mb-4">{t("".concat(variant, ".title"))}</h1>
            <p className="text-lg text-white/70">{t("".concat(variant, ".lastUpdated"))}: {t("".concat(variant, ".updatedDate"))}</p>
          </framer_motion_1.motion.div>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-2xl p-8 lg:p-12 border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-8">{t("".concat(variant, ".intro"))}</p>

            {Array.from({ length: numSections }).map(function (_, i) {
            var n = i + 1;
            return (<framer_motion_1.motion.div key={n} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }} className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    {n}. {t("".concat(variant, ".s").concat(n, "Title"))}
                  </h2>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{t("".concat(variant, ".s").concat(n, "Body"))}</p>
                </framer_motion_1.motion.div>);
        })}

            <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("".concat(variant, ".contactNote"))}: <a href="mailto:legal@globipet.com" className="text-brand-900 dark:text-yellow-400 hover:underline">legal@globipet.com</a></p>
            </div>
          </div>
        </div>
      </section>
    </div>);
}
