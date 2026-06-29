import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { FileText, Lock, Cookie } from 'lucide-react'

interface Props {
  variant: 'terms' | 'privacy' | 'cookies'
}

export default function LegalPage({ variant }: Props) {
  const { t } = useTranslation()

  const Icon = variant === 'terms' ? FileText : variant === 'privacy' ? Lock : Cookie

  // Section count per variant
  const sectionsByVariant = {
    terms: 10,
    privacy: 8,
    cookies: 6,
  }
  const numSections = sectionsByVariant[variant]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <section className="bg-[#0F2A3F] text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Icon size={48} className="mx-auto mb-4 text-yellow-400" />
            <h1 className="text-4xl lg:text-5xl font-display font-black mb-4">{t(`${variant}.title`)}</h1>
            <p className="text-lg text-white/70">{t(`${variant}.lastUpdated`)}: {t(`${variant}.updatedDate`)}</p>
          </motion.div>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-2xl p-8 lg:p-12 border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-8">{t(`${variant}.intro`)}</p>

            {Array.from({ length: numSections }).map((_, i) => {
              const n = i + 1
              return (
                <motion.div key={n}
                  initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.03 }}
                  className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    {n}. {t(`${variant}.s${n}Title`)}
                  </h2>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{t(`${variant}.s${n}Body`)}</p>
                </motion.div>
              )
            })}

            <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">{t(`${variant}.contactNote`)}: <a href="mailto:legal@globipet.com" className="text-brand-900 dark:text-yellow-400 hover:underline">legal@globipet.com</a></p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
