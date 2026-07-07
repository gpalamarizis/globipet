import { useTranslation } from 'react-i18next'
import { Shield } from 'lucide-react'

/**
 * Privacy Policy page. Content lives entirely in i18n so translations are
 * managed in a single place. Structure follows GDPR Article 13 disclosure
 * requirements.
 *
 * NOTE: This is drafted in good faith based on the actual data flows in
 * the app but is NOT legal advice. A qualified lawyer should review before
 * relying on this text for compliance purposes.
 */
export default function PrivacyPolicyPage() {
  const { t } = useTranslation()
  const sections = [
    'controller', 'dataCollected', 'purposes', 'lawfulBasis', 'sharing',
    'subprocessors', 'transfers', 'retention', 'rights', 'security', 'cookies', 'changes', 'contact',
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
            <Shield size={22} className="text-brand-900 dark:text-yellow-400" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-black text-gray-900 dark:text-white">{t('privacy.title')}</h1>
            <p className="text-sm text-gray-500">{t('privacy.lastUpdated', { date: '07/07/2026' })}</p>
          </div>
        </div>

        <div className="card p-6 md:p-8 space-y-8 prose prose-sm dark:prose-invert max-w-none">
          <p className="text-base text-gray-600 dark:text-gray-400">{t('privacy.intro')}</p>

          {sections.map(sec => (
            <section key={sec}>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t(`privacy.sections.${sec}.title`)}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{t(`privacy.sections.${sec}.body`)}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
