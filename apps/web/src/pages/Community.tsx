import { useTranslation } from 'react-i18next'
export default function Community() {
  const { t } = useTranslation()
  return (
    <div className="page-container py-8 pb-24 lg:pb-8">
      <div className="text-center py-24">
        <p className="text-4xl mb-4">🐾</p>
        <h1 className="section-title mb-2">{t('pgCommunity.title')}</h1>
        <p className="text-gray-500 text-sm">{t('pgCommunity.underDevelopment')}</p>
      </div>
    </div>
  )
}
