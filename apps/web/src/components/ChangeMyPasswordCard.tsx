import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Key, Check } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

/**
 * Αλλαγή κωδικού — ίδια ροή με την οθόνη «Αλλαγή κωδικού» του κινητού.
 *
 * ΤΙ ΔΙΟΡΘΩΘΗΚΕ
 *   - Όλα τα κείμενα ήταν μόνο στα ελληνικά· τώρα σε 5 γλώσσες.
 *   - Η φόρμα δεχόταν 6 χαρακτήρες ενώ ο server απαιτεί 8, οπότε ο χρήστης
 *     μάθαινε το σφάλμα μόνο μετά την υποβολή.
 */
export default function ChangeMyPasswordCard() {
  const { t } = useTranslation()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [success, setSuccess] = useState(false)

  const changePassword = useMutation({
    mutationFn: () => api.post('/users/me/password', { current_password: currentPassword, new_password: newPassword }),
    onSuccess: () => {
      toast.success(t('account.passwordChanged'))
      setCurrentPassword(''); setNewPassword(''); setConfirm('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || t('account.passwordError'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) { toast.error(t('account.passwordMin')); return }
    if (newPassword !== confirm) { toast.error(t('account.passwordMismatch')); return }
    if (currentPassword === newPassword) { toast.error(t('account.passwordSame')); return }
    changePassword.mutate()
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-1">
        <Key size={18} className="text-brand-900" />
        <h3 className="font-bold text-gray-900 dark:text-white">{t('account.changePassword')}</h3>
      </div>
      <p className="text-xs text-gray-400 mb-4">{t('account.socialHint')}</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('account.currentPassword')}</label>
          <div className="relative">
            <input type={showCurrent ? 'text' : 'password'} className="input pr-10" placeholder="••••••••"
              value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)} aria-label={t('account.showPasswords')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('account.newPassword')}</label>
          <div className="relative">
            <input type={showNew ? 'text' : 'password'} className="input pr-10" placeholder="••••••••"
              value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
            <button type="button" onClick={() => setShowNew(!showNew)} aria-label={t('account.showPasswords')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('account.confirmPassword')}</label>
          <input type={showNew ? 'text' : 'password'} className="input" placeholder="••••••••"
            value={confirm} onChange={e => setConfirm(e.target.value)} required autoComplete="new-password" />
        </div>

        <button type="submit"
          disabled={changePassword.isPending || !currentPassword || !newPassword || newPassword !== confirm}
          className="btn-primary w-full mt-4 flex items-center justify-center gap-2">
          {success ? (<><Check size={16} /> {t('account.done')}</>)
            : changePassword.isPending ? t('account.changing')
            : (<><Key size={16} /> {t('account.changePassword')}</>)}
        </button>
      </form>
    </div>
  )
}
