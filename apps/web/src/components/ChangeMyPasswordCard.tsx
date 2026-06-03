import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Eye, EyeOff, Key, Check } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

export default function ChangeMyPasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [success, setSuccess] = useState(false)

  const changePassword = useMutation({
    mutationFn: () => api.post('/users/me/password', { current_password: currentPassword, new_password: newPassword }),
    onSuccess: () => {
      toast.success('Ο κωδικός άλλαξε επιτυχώς')
      setCurrentPassword(''); setNewPassword(''); setConfirm('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Σφάλμα κατά την αλλαγή κωδικού')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      toast.error('Ο νέος κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες')
      return
    }
    if (newPassword !== confirm) {
      toast.error('Οι κωδικοί δεν ταιριάζουν')
      return
    }
    if (currentPassword === newPassword) {
      toast.error('Ο νέος κωδικός είναι ίδιος με τον τρέχοντα')
      return
    }
    changePassword.mutate()
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Key size={18} className="text-brand-900" />
        <h3 className="font-bold text-gray-900 dark:text-white">Αλλαγή κωδικού</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Τρέχων κωδικός</label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              className="input pr-10"
              placeholder="••••••••"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
            />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showCurrent ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Νέος κωδικός</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              className="input pr-10"
              placeholder="••••••••"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showNew ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Επιβεβαίωση νέου κωδικού</label>
          <input
            type={showNew ? 'text' : 'password'}
            className="input"
            placeholder="••••••••"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={changePassword.isPending || !currentPassword || !newPassword || newPassword !== confirm}
          className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
        >
          {success ? (
            <><Check size={16}/> Επιτυχώς</>
          ) : changePassword.isPending ? (
            'Αλλαγή...'
          ) : (
            <><Key size={16}/> Αλλαγή κωδικού</>
          )}
        </button>
      </form>
    </div>
  )
}
