import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Eye, EyeOff, Key } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

interface Props {
  user: { id: string; email: string; full_name?: string } | null
  onClose: () => void
}

export default function ChangePasswordModal({ user, onClose }: Props) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)

  const changePassword = useMutation({
    mutationFn: () => api.patch(`/admin/users/${user!.id}`, { password }),
    onSuccess: () => {
      toast.success('Ο κωδικός άλλαξε επιτυχώς')
      setPassword(''); setConfirm('')
      onClose()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Σφάλμα κατά την αλλαγή κωδικού')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      toast.error('Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες')
      return
    }
    if (password !== confirm) {
      toast.error('Οι κωδικοί δεν ταιριάζουν')
      return
    }
    changePassword.mutate()
  }

  return (
    <AnimatePresence>
      {user && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Key size={20} className="text-brand-900" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Αλλαγή κωδικού</h3>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={18} />
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-4">
              <p className="text-xs text-gray-500 mb-1">Χρήστης</p>
              <p className="font-medium text-gray-900 dark:text-white text-sm">{user.full_name || user.email}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Νέος κωδικός</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Επιβεβαίωση</label>
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
                ⚠️ Ο χρήστης θα πρέπει να συνδεθεί ξανά με τον νέο κωδικό.
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary flex-1">
                  Ακύρωση
                </button>
                <button
                  type="submit"
                  disabled={changePassword.isPending || password.length < 6 || password !== confirm}
                  className="btn-primary flex-1"
                >
                  {changePassword.isPending ? 'Αλλαγή...' : 'Αλλαγή κωδικού'}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
