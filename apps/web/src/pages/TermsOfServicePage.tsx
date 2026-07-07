import { useTranslation } from 'react-i18next'
import { FileText } from 'lucide-react'

export default function TermsOfServicePage() {
  const { t } = useTranslation()
  const sections = [
    'acceptance', 'accountRegistration', 'userConduct', 'petOwners', 'serviceProviders',
    'aiServices', 'payments', 'liability', 'intellectualProperty', 'termination', 'law', 'changes',
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
            <FileText size={22} className="text-brand-900 dark:text-yellow-400" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-black text-gray-900 dark:text-white">{t('terms.title')}</h1>
            <p className="text-sm text-gray-500">{t('terms.lastUpdated', { date: '07/07/2026' })}</p>
          </div>
        </div>

        <div className="card p-6 md:p-8 space-y-8 prose prose-sm dark:prose-invert max-w-none">
          <p className="text-base text-gray-600 dark:text-gray-400">{t('terms.intro')}</p>

          {sections.map(sec => (
            <section key={sec}>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t(`terms.sections.${sec}.title`)}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{t(`terms.sections.${sec}.body`)}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
