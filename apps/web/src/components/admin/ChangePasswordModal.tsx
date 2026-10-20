import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Eye, EyeOff, Key } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

interface Props {
  user: { id: string; email: string; full_name?: string } | null
  onClose: () => void
}

const MIN_PASSWORD = 8

export default function ChangePasswordModal({ user, onClose }: Props) {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)

  // Lock body scroll when modal is open
  useEffect(() => {
    if (user) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [user])

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && user) onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [user, onClose])

  const changePassword = useMutation({
    mutationFn: () => api.patch(`/admin/users/${user!.id}`, { password }),
    onSuccess: () => {
      toast.success(t('adminPwdModal.success'))
      setPassword(''); setConfirm('')
      onClose()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || t('adminPwdModal.error'))
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Ίδιο ελάχιστο με το backend (auth: 8 χαρακτήρες) και τη φόρμα νέου χρήστη.
    if (password.length < MIN_PASSWORD) {
      toast.error(t('account.passwordMin'))
      return
    }
    if (password !== confirm) {
      toast.error(t('adminPwdModal.mismatch'))
      return
    }
    changePassword.mutate()
  }

  return (
    <AnimatePresence>
      {user && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Key size={20} className="text-brand-900" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('adminPwdModal.title')}</h3>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={18} />
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-4">
              <p className="text-xs text-gray-500 mb-1">{t('adminPwdModal.user')}</p>
              <p className="font-medium text-gray-900 dark:text-white text-sm">{user.full_name || user.email}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('adminPwdModal.newPassword')}</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={MIN_PASSWORD}
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('adminPwdModal.confirm')}</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                />
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 text-xs text-yellow-800 dark:text-yellow-300">
                {t('adminPwdModal.reloginWarning')}
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary flex-1">
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={changePassword.isPending || password.length < MIN_PASSWORD || password !== confirm}
                  className="btn-primary flex-1"
                >
                  {changePassword.isPending ? t('adminPwdModal.changing') : t('adminPwdModal.title')}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
