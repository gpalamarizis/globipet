import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

export default function NotFound() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <p className="text-8xl mb-6">🐾</p>
        <h1 className="text-4xl font-display font-bold text-gray-900 dark:text-white mb-3">{t('notFound.title')}</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">{t('notFound.message')}</p>
        <Link to="/" className="btn-primary inline-flex items-center gap-2"><Home size={18}/>{t('notFound.home')}</Link>
      </motion.div>
    </div>
  )
}
