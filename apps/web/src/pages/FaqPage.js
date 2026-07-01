"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FaqPage;
var react_1 = require("react");
var react_i18next_1 = require("react-i18next");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
function FaqPage() {
    var t = (0, react_i18next_1.useTranslation)().t;
    var _a = (0, react_1.useState)(0), openIdx = _a[0], setOpenIdx = _a[1];
    var faqs = [
        { q: t('faq.q1'), a: t('faq.a1') },
        { q: t('faq.q2'), a: t('faq.a2') },
        { q: t('faq.q3'), a: t('faq.a3') },
        { q: t('faq.q4'), a: t('faq.a4') },
        { q: t('faq.q5'), a: t('faq.a5') },
        { q: t('faq.q6'), a: t('faq.a6') },
        { q: t('faq.q7'), a: t('faq.a7') },
        { q: t('faq.q8'), a: t('faq.a8') },
        { q: t('faq.q9'), a: t('faq.a9') },
        { q: t('faq.q10'), a: t('faq.a10') },
    ];
    return (<div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <section className="bg-[#0F2A3F] text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <lucide_react_1.HelpCircle size={48} className="mx-auto mb-4 text-yellow-400"/>
            <h1 className="text-4xl lg:text-5xl font-display font-black mb-4">{t('faq.title')}</h1>
            <p className="text-lg text-white/70">{t('faq.subtitle')}</p>
          </framer_motion_1.motion.div>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map(function (faq, idx) { return (<framer_motion_1.motion.div key={idx} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.05 }} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <button onClick={function () { return setOpenIdx(openIdx === idx ? null : idx); }} aria-expanded={openIdx === idx} className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <span className="font-semibold text-gray-900 dark:text-white pr-4">{faq.q}</span>
                <lucide_react_1.ChevronDown size={20} className={"text-gray-400 shrink-0 transition-transform ".concat(openIdx === idx ? 'rotate-180' : '')}/>
              </button>
              <framer_motion_1.AnimatePresence>
                {openIdx === idx && (<framer_motion_1.motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <p className="px-6 pb-5 text-gray-600 dark:text-gray-400 leading-relaxed">{faq.a}</p>
                  </framer_motion_1.motion.div>)}
              </framer_motion_1.AnimatePresence>
            </framer_motion_1.motion.div>); })}
        </div>
      </section>
    </div>);
}
