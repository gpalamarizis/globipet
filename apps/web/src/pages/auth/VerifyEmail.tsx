import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import LanguageSwitcher from '@/components/LanguageSwitcher'

/**
 * Ε12 — σελίδα του συνδέσμου επιβεβαίωσης email (/verify-email?token=…).
 *
 * Δεν απαιτεί σύνδεση: ο σύνδεσμος μπορεί να ανοίξει σε άλλον browser ή
 * από το κινητό. Αν ο χρήστης είναι συνδεδεμένος εδώ, ξαναδιαβάζεται το
 * /auth/me ώστε να φύγει η μπάρα «Επιβεβαίωσε το email σου».
 */
export default function VerifyEmail() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const { isAuthenticated, refreshUser } = useAuthStore()
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>(token ? 'loading' : 'error')
  const [message, setMessage] = useState('')
  // StrictMode τρέχει το effect δύο φορές· το τοκεν είναι μίας χρήσης.
  const sent = useRef(false)

  useEffect(() => {
    if (!token || sent.current) return
    sent.current = true
    api.post('/auth/verify-email', { token })
      .then(() => {
        setStatus('ok')
        if (isAuthenticated) void refreshUser()
      })
      .catch((err: any) => {
        setMessage(err?.response?.data?.message || err?.message || '')
        setStatus('error')
      })
  }, [token, isAuthenticated, refreshUser])

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
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('emailVerify.pageTitle')}</h1>
        </div>

        <div className="card p-6 text-center">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-3 text-gray-600 dark:text-gray-300">
              <Loader2 size={32} className="animate-spin text-brand-500" />
              <p className="text-sm">{t('emailVerify.checking')}</p>
            </div>
          )}
          {status === 'ok' && (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 size={40} className="text-green-500" />
              <p className="font-semibold text-gray-900 dark:text-white">{t('emailVerify.successTitle')}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">{t('emailVerify.successBody')}</p>
              <Link to={isAuthenticated ? '/' : '/login'} className="btn-primary block w-full text-center mt-2">
                {isAuthenticated ? t('emailVerify.continue') : t('emailVerify.goLogin')}
              </Link>
            </div>
          )}
          {status === 'error' && (
            <div className="flex flex-col items-center gap-3">
              <XCircle size={40} className="text-red-500" />
              <p className="font-semibold text-gray-900 dark:text-white">{t('emailVerify.errorTitle')}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">{message || t('emailVerify.errorBody')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('emailVerify.errorHint')}</p>
              <Link to={isAuthenticated ? '/' : '/login'} className="btn-secondary block w-full text-center mt-2">
                {isAuthenticated ? t('emailVerify.continue') : t('emailVerify.goLogin')}
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
