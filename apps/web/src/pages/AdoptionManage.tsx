import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import AdoptionManager from '@/components/features/adoption/AdoptionManager'

/** Οι αγγελίες υιοθεσίας μου (ιδιώτες). Οι οργανισμοί έχουν το ίδιο στην καρτέλα «Υιοθεσία» του πίνακα παρόχου. */
export default function AdoptionManagePage() {
  const { t } = useTranslation()
  return (
    <div className="page-container py-8 space-y-6">
      <Link to="/adoption" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white"><ArrowLeft size={16} />{t('adoption.detail.back')}</Link>
      <AdoptionManager />
    </div>
  )
}
