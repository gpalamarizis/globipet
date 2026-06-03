import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import { motion } from 'framer-motion'
import { CheckCircle, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function ForgotPassword() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4 relative">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher variant="full" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <span className="text-3xl">🐾</span>
            <span className="font-display font-bold text-2xl text-gradient">GlobiPet</span>
          </Link>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('authExtraLogin.forgotTitle')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('authExtraLogin.forgotSubtitle')}</p>
        </div>

        <div className="card p-6">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white mb-2">{t('authExtraLogin.resetSent')}</h2>
              <p className="text-sm text-gray-500">{t('authExtraLogin.forgotSubtitle')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('authExtraLogin.email')}</label>
                <input type="email" className="input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <button type="submit" disabled={isLoading} className="btn-primary w-full">
                {isLoading ? t('common.loading') : t('authExtraLogin.sendReset')}
              </button>
            </form>
          )}
        </div>

        <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-gray-500 mt-4 hover:text-brand-900">
          <ArrowLeft size={14}/> {t('authExtraLogin.backToLogin')}
        </Link>
      </motion.div>
    </div>
  )
}
