import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
      toast.success('Email αποστολής επαναφοράς εστάλη!')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Σφάλμα αποστολής email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <img src="/logo.png" alt="GlobiPet" className="h-10 w-auto" />
          </Link>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Επαναφορά κωδικού</h1>
          <p className="text-gray-500 text-sm mt-1">Θα σας στείλουμε οδηγίες στο email σας</p>
        </div>

        <div className="card p-6">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Email εστάλη!</h3>
              <p className="text-sm text-gray-500 mb-4">
                Ελέγξτε το inbox σας στο <strong>{email}</strong> για οδηγίες επαναφοράς κωδικού.
              </p>
              <p className="text-xs text-gray-400">Δεν το βρίσκετε; Ελέγξτε τα spam.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" className="input pl-9" placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Αποστολή...' : 'Αποστολή οδηγιών'}
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-4">
          <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft size={14}/> Πίσω στη σύνδεση
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
