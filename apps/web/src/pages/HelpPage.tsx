import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Mail, MessageSquare, BookOpen, HelpCircle, Phone, ArrowRight } from 'lucide-react'

export default function HelpPage() {
  const { t } = useTranslation()

  const channels = [
    { icon: MessageSquare, title: t('help.liveChat'), desc: t('help.liveChatDesc'), action: t('help.startChat'), href: '#' },
    { icon: Mail, title: t('help.email'), desc: t('help.emailDesc'), action: 'support@globipet.com', href: 'mailto:support@globipet.com' },
    { icon: BookOpen, title: t('help.faq'), desc: t('help.faqDesc'), action: t('help.browseFaq'), href: '/faq' },
    { icon: Phone, title: t('help.phone'), desc: t('help.phoneDesc'), action: '+30 210 000 0000', href: 'tel:+302100000000' },
  ]

  const topics = [
    { title: t('help.topicAccount'), items: [t('help.topicAccount1'), t('help.topicAccount2'), t('help.topicAccount3')] },
    { title: t('help.topicBookings'), items: [t('help.topicBookings1'), t('help.topicBookings2'), t('help.topicBookings3')] },
    { title: t('help.topicPayments'), items: [t('help.topicPayments1'), t('help.topicPayments2'), t('help.topicPayments3')] },
    { title: t('help.topicProviders'), items: [t('help.topicProviders1'), t('help.topicProviders2'), t('help.topicProviders3')] },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <section className="bg-[#0F2A3F] text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <HelpCircle size={48} className="mx-auto mb-4 text-yellow-400" />
            <h1 className="text-4xl lg:text-5xl font-display font-black mb-4">{t('help.title')}</h1>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">{t('help.subtitle')}</p>
          </motion.div>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">{t('help.contactChannels')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {channels.map((c) => (
              <a key={c.title} href={c.href}
                className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all border border-gray-100 dark:border-gray-800 group">
                <div className="w-12 h-12 bg-brand-50 dark:bg-brand-900/30 rounded-xl flex items-center justify-center mb-4">
                  <c.icon size={22} className="text-brand-900 dark:text-yellow-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">{c.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{c.desc}</p>
                <p className="text-sm text-brand-900 dark:text-yellow-400 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                  {c.action} <ArrowRight size={14} />
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">{t('help.popularTopics')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {topics.map((t) => (
              <div key={t.title} className="bg-gray-50 dark:bg-gray-950 rounded-2xl p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">{t.title}</h3>
                <ul className="space-y-2">
                  {t.items.map((item) => (
                    <li key={item}>
                      <Link to="/faq" className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-900 dark:hover:text-yellow-400 transition-colors flex items-center gap-2">
                        <ArrowRight size={12} /> {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
