import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Linkedin, Globe, Heart, Shield, Brain, Stethoscope, Scale, MapPin, ShoppingBag, Users } from 'lucide-react'

const FOUNDERS = [
  {
    name: 'George Palamarizis',
    roleKey: 'about.founders.roles.ceo',
    bioKey: 'about.founders.bios.palamarizis',
    linkedin: 'https://www.linkedin.com/in/gpalamarizis/',
    photo: '/founders/palamarizis.jpg',
  },
  {
    name: 'Meropi Topalidou',
    roleKey: 'about.founders.roles.cto',
    bioKey: 'about.founders.bios.topalidou',
    linkedin: 'https://www.linkedin.com/in/meropi-topalidou/',
    photo: '/founders/topalidou.jpg',
  },
  {
    name: 'Vasilis Rallis',
    roleKey: 'about.founders.roles.coo',
    bioKey: 'about.founders.bios.rallis',
    linkedin: 'https://www.linkedin.com/in/vasilis-rallis/',
    photo: '/founders/rallis.jpg',
  },
]

const SERVICES = [
  { icon: Stethoscope, key: 'telehealth',   color: 'bg-blue-50 text-blue-600',     img: 'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=600&q=80' },
  { icon: Brain,       key: 'aiHealth',     color: 'bg-purple-50 text-purple-600', img: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=80' },
  { icon: Shield,      key: 'medicalFile',  color: 'bg-orange-50 text-orange-600', img: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=600&q=80' },
  { icon: Globe,       key: 'services',     color: 'bg-green-50 text-green-600',   img: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600&q=80' },
  { icon: Scale,       key: 'legal',        color: 'bg-indigo-50 text-indigo-600', img: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80' },
  { icon: ShoppingBag, key: 'marketplace',  color: 'bg-pink-50 text-pink-600',     img: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=600&q=80' },
  { icon: MapPin,      key: 'tracker',      color: 'bg-red-50 text-red-600',       img: 'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=600&q=80' },
  { icon: Heart,       key: 'insurance',    color: 'bg-teal-50 text-teal-600',     img: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=600&q=80' },
  { icon: Users,       key: 'community',    color: 'bg-yellow-50 text-yellow-600', img: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&q=80' },
]

const MISSION = [
  { emoji: '🐾', key: 'pets' },
  { emoji: '👥', key: 'owners' },
  { emoji: '🏥', key: 'providers' },
]

const STATS = [
  { value: '50K+',  key: 'users' },
  { value: '2K+',   key: 'providers' },
  { value: '120K+', key: 'pets' },
  { value: '4.9★',  key: 'rating' },
]

function FounderCard({ founder }: { founder: typeof FOUNDERS[0] }) {
  const { t } = useTranslation()
  const [imgError, setImgError] = useState(false)
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      className="card p-6 text-center">
      <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-4 bg-gray-100">
        {!imgError
          ? <img loading="lazy" decoding="async" src={founder.photo} alt={founder.name} className="w-full h-full object-cover"
              onError={() => setImgError(true)} />
          : <div className="w-full h-full flex items-center justify-center bg-brand-50">
              <span className="text-3xl font-bold text-brand-900">{founder.name[0]}</span>
            </div>}
      </div>
      <h3 className="font-bold text-lg text-gray-900 dark:text-white">{founder.name}</h3>
      <p className="text-sm text-brand-900 font-medium mb-2">{t(founder.roleKey)}</p>
      <p className="text-sm text-gray-500 mb-4 leading-relaxed">{t(founder.bioKey)}</p>
      <a href={founder.linkedin} target="_blank" rel="noreferrer"
        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
        <Linkedin size={16} /> LinkedIn
      </a>
    </motion.div>
  )
}

export default function AboutPage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* Hero */}
      <section className="bg-[#0F2A3F] text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <img loading="lazy" decoding="async" src="/logo-clean.png" alt="GlobiPet" className="h-16 w-auto mx-auto mb-6 brightness-0 invert" />
            <h1 className="text-4xl lg:text-5xl font-display font-black mb-4">
              {t('about.title')}
            </h1>
            <p className="text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
              {t('about.hero')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">{t('about.mission.title')}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-center">
              {MISSION.map(item => (
                <div key={item.key} className="p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                  <span className="text-4xl mb-3 block">{item.emoji}</span>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t(`about.mission.${item.key}.title`)}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{t(`about.mission.${item.key}.text`)}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Founders */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">{t('about.founders.title')}</h2>
          <p className="text-gray-500 text-center mb-10">{t('about.founders.subtitle')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {FOUNDERS.map(f => <FounderCard key={f.name} founder={f} />)}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">{t('about.services.title')}</h2>
          <p className="text-gray-500 text-center mb-10">{t('about.services.subtitle')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map(service => (
              <motion.div key={service.key} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="card overflow-hidden">
                <div className="h-40 overflow-hidden">
                  <img loading="lazy" decoding="async" src={service.img} alt={t(`about.services.items.${service.key}.title`)} className="w-full h-full object-cover" />
                </div>
                <div className="p-5">
                  <div className={`w-10 h-10 rounded-xl ${service.color} flex items-center justify-center mb-3`}>
                    <service.icon size={20} />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t(`about.services.items.${service.key}.title`)}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{t(`about.services.items.${service.key}.desc`)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 bg-[#0F2A3F] text-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-10 text-center">{t('about.stats.title')}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            {STATS.map(s => (
              <div key={s.key}>
                <p className="text-4xl font-black text-brand-400 mb-1">{s.value}</p>
                <p className="text-white/60 text-sm">{t(`about.stats.${s.key}`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
