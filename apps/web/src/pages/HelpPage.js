"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HelpPage;
var react_i18next_1 = require("react-i18next");
var framer_motion_1 = require("framer-motion");
var react_router_dom_1 = require("react-router-dom");
var lucide_react_1 = require("lucide-react");
function HelpPage() {
    var t = (0, react_i18next_1.useTranslation)().t;
    var channels = [
        { icon: lucide_react_1.MessageSquare, title: t('help.liveChat'), desc: t('help.liveChatDesc'), action: t('help.startChat'), href: '#' },
        { icon: lucide_react_1.Mail, title: t('help.email'), desc: t('help.emailDesc'), action: 'support@globipet.com', href: 'mailto:support@globipet.com' },
        { icon: lucide_react_1.BookOpen, title: t('help.faq'), desc: t('help.faqDesc'), action: t('help.browseFaq'), href: '/faq' },
        { icon: lucide_react_1.Phone, title: t('help.phone'), desc: t('help.phoneDesc'), action: '+30 210 000 0000', href: 'tel:+302100000000' },
    ];
    var topics = [
        { title: t('help.topicAccount'), items: [t('help.topicAccount1'), t('help.topicAccount2'), t('help.topicAccount3')] },
        { title: t('help.topicBookings'), items: [t('help.topicBookings1'), t('help.topicBookings2'), t('help.topicBookings3')] },
        { title: t('help.topicPayments'), items: [t('help.topicPayments1'), t('help.topicPayments2'), t('help.topicPayments3')] },
        { title: t('help.topicProviders'), items: [t('help.topicProviders1'), t('help.topicProviders2'), t('help.topicProviders3')] },
    ];
    return (<div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <section className="bg-[#0F2A3F] text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <lucide_react_1.HelpCircle size={48} className="mx-auto mb-4 text-yellow-400"/>
            <h1 className="text-4xl lg:text-5xl font-display font-black mb-4">{t('help.title')}</h1>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">{t('help.subtitle')}</p>
          </framer_motion_1.motion.div>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">{t('help.contactChannels')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {channels.map(function (c) { return (<a key={c.title} href={c.href} className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all border border-gray-100 dark:border-gray-800 group">
                <div className="w-12 h-12 bg-brand-50 dark:bg-brand-900/30 rounded-xl flex items-center justify-center mb-4">
                  <c.icon size={22} className="text-brand-900 dark:text-yellow-400"/>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">{c.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{c.desc}</p>
                <p className="text-sm text-brand-900 dark:text-yellow-400 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                  {c.action} <lucide_react_1.ArrowRight size={14}/>
                </p>
              </a>); })}
          </div>
        </div>
      </section>

      <section className="py-12 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">{t('help.popularTopics')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {topics.map(function (t) { return (<div key={t.title} className="bg-gray-50 dark:bg-gray-950 rounded-2xl p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">{t.title}</h3>
                <ul className="space-y-2">
                  {t.items.map(function (item) { return (<li key={item}>
                      <react_router_dom_1.Link to="/faq" className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-900 dark:hover:text-yellow-400 transition-colors flex items-center gap-2">
                        <lucide_react_1.ArrowRight size={12}/> {item}
                      </react_router_dom_1.Link>
                    </li>); })}
                </ul>
              </div>); })}
          </div>
        </div>
      </section>
    </div>);
}
