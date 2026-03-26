import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const { login, isLoading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try { await login(email, password); navigate('/') }
    catch (err: any) { toast.error(err.message || 'Λανθασμένα στοιχεία') }
  }

  const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4"><span className="text-3xl">🐾</span><span className="font-display font-bold text-2xl text-gradient">GlobiPet</span></Link>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Καλώς ήρθατε!</h1>
          <p className="text-gray-500 text-sm mt-1">Συνδεθείτε στον λογαριασμό σας</p>
        </div>

        <div className="card p-6">
          <div className="space-y-2 mb-5">
            <button onClick={() => window.location.href = `${API}/auth/google`}
              className="w-full flex items-center justify-center gap-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Σύνδεση με Google
            </button>
            <button onClick={() => window.location.href = `${API}/auth/facebook`}
              className="w-full flex items-center justify-center gap-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Σύνδεση με Facebook
            </button>
          </div>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100 dark:border-gray-800"/></div>
            <div className="relative text-center text-xs text-gray-400"><span className="bg-white dark:bg-gray-900 px-3">ή με email</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Email</label>
              <input type="email" className="input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Κωδικός</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} className="input pr-10" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPass ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
              </div>
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-brand-900 hover:underline">Ξέχασα τον κωδικό</Link>
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full">{isLoading ? 'Σύνδεση...' : 'Σύνδεση'}</button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Δεν έχετε λογαριασμό; <Link to="/register" className="text-brand-900 font-medium hover:underline">Εγγραφή</Link>
        </p>
      </motion.div>
    </div>
  )
}
