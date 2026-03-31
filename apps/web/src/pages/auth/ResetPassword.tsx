import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { toast.error('Οι κωδικοί δεν ταιριάζουν'); return }
    if (password.length < 8) { toast.error('Τουλάχιστον 8 χαρακτήρες'); return }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      toast.success('Ο κωδικός άλλαξε επιτυχώς!')
      navigate('/login')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Σφάλμα επαναφοράς κωδικού')
    } finally { setLoading(false) }
  }

  if (!token) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-500 mb-4">Μη έγκυρος σύνδεσμος επαναφοράς</p>
        <Link to="/forgot-password" className="btn-primary">Νέο αίτημα</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/"><img src="/logo.png" alt="GlobiPet" className="h-10 w-auto mx-auto mb-4" /></Link>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Νέος κωδικός</h1>
        </div>
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Νέος κωδικός</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type={showPass ? 'text' : 'password'} className="input pl-9 pr-10"
                  placeholder="Τουλάχιστον 8 χαρακτήρες" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Επιβεβαίωση κωδικού</label>
              <input type="password" className="input" placeholder="Επαναλάβετε τον κωδικό"
                value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Αλλαγή...' : 'Αλλαγή κωδικού'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
