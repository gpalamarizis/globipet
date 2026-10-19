import { MapPin } from 'lucide-react'
import type { Service } from '@/types'
import { useTranslation } from 'react-i18next'

interface Props {
  services: Service[]
}

export default function ServicesMap({ services }: Props) {
  const { t } = useTranslation()
  return (
    <div className="w-full h-96 bg-gray-100 dark:bg-gray-800 rounded-2xl flex flex-col items-center justify-center gap-3 border border-gray-200 dark:border-gray-700">
      <MapPin size={40} className="text-gray-400" />
      <p className="text-gray-500 font-medium">{t('cmpServicesMap.title')}</p>
      <p className="text-sm text-gray-400 text-center max-w-xs">
        {t('cmpServicesMap.found', { count: services.length })}
      </p>
      <p className="text-xs text-gray-400">
        {t('cmpServicesMap.apiKeyNote')}
      </p>
    </div>
  )
}
