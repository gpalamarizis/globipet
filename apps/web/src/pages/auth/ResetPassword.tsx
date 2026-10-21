import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import { motion } from 'framer-motion'
import { Eye, EyeOff, CheckCircle2, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function ResetPassword() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)
  // Ο σύνδεσμος του email ανοίγει πάντα στον browser (δεν υπάρχουν App Links).
  // Σε κινητό, μετά την αλλαγή, προτείνουμε και το άνοιγμα της εφαρμογής.
  const onPhone = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Ίδιο όριο με τον server (auth.ts) και το κινητό: τουλάχιστον 8 χαρακτήρες.
    if (password.length < 8) {
      toast.error(t('account.passwordMin'))
      return
    }
    if (password !== confirmPassword) {
      toast.error(t('authExtraLogin.passwordMismatch'))
      return
    }
    setIsLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      toast.success(t('authExtraLogin.passwordReset'))
      // Σε υπολογιστή όπως πριν· σε κινητό οθόνη με «Άνοιξε την εφαρμογή».
      if (onPhone) setDone(true)
      else navigate('/login')
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
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('authExtraLogin.resetTitle')}</h1>
        </div>

        {done ? (
          <div className="card p-6 text-center space-y-4">
            <CheckCircle2 size={40} className="mx-auto text-green-600" aria-hidden="true" />
            <p className="text-sm text-gray-700 dark:text-gray-300">{t('resetDone.message')}</p>
            <a href="globipet://auth/login" className="btn-primary w-full flex items-center justify-center gap-2">
              <Smartphone size={16} aria-hidden="true" /> {t('resetDone.openApp')}
            </a>
            <Link to="/login" className="btn-secondary w-full block text-center">{t('resetDone.loginWeb')}</Link>
          </div>
        ) : (
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('authExtraLogin.newPassword')}</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} className="input pr-10" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPass ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('authExtraLogin.confirmPassword')}</label>
              <input type={showPass ? 'text' : 'password'} className="input" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full">
              {isLoading ? t('common.loading') : t('authExtraLogin.resetPassword')}
            </button>
          </form>
        </div>
        )}
      </motion.div>
    </div>
  )
}
