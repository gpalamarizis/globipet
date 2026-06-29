import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { PawPrint, X, Calendar, Video, Brain, Stethoscope } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'

/**
 * Floating quick-actions widget for logged-in users.
 * Hidden on auth pages, home (already has personalized section), and mobile (tab bar handles it).
 */
export default function PetQuickWidget() {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  // Hide on routes where it doesn't make sense
  const hideOn = ['/login', '/register', '/', '/forgot-password', '/reset-password', '/onboarding']
  const shouldHide = hideOn.some(p => location.pathname === p) || location.pathname.startsWith('/admin')

  const { data: pets } = useQuery({
    queryKey: ['my-pets-widget'],
    queryFn: () => api.get('/pets').then(r => r.data?.data ?? []),
    enabled: isAuthenticated && !shouldHide,
    staleTime: 5 * 60 * 1000,
  })

  if (!isAuthenticated || shouldHide) return null

  const firstPet = pets?.[0]

  const actions = [
    { icon: Calendar, label: 'Νέο ραντεβού', path: '/services', color: 'bg-blue-500 hover:bg-blue-600' },
    { icon: Video,    label: 'Τηλεϊατρική',   path: '/telehealth', color: 'bg-teal-500 hover:bg-teal-600' },
    { icon: Brain,    label: 'AI Health',     path: '/ai-health',  color: 'bg-purple-500 hover:bg-purple-600' },
    { icon: Stethoscope, label: 'Pet Profile', path: firstPet ? `/pets/${firstPet.id}` : '/pets', color: 'bg-orange-500 hover:bg-orange-600' },
  ]

  return (
    <div className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-40 hidden lg:block">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="mb-3 flex flex-col gap-2 items-end">
            {actions.map((action, i) => (
              <motion.div key={action.path}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3">
                <span className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                  {action.label}
                </span>
                <Link to={action.path}
                  onClick={() => setOpen(false)}
                  aria-label={action.label}
                  className={`w-12 h-12 rounded-full ${action.color} text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center`}>
                  <action.icon size={20} />
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Κλείσιμο μενού' : 'Άνοιγμα γρήγορου μενού'}
        aria-expanded={open}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 dark:from-yellow-400 dark:to-orange-500 text-white dark:text-gray-900 shadow-2xl hover:shadow-brand-500/50 dark:hover:shadow-yellow-400/50 hover:scale-110 transition-all flex items-center justify-center group">
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <X size={24} />
            </motion.div>
          ) : (
            <motion.div key="paw" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <PawPrint size={24} className="group-hover:rotate-12 transition-transform" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </div>
  )
}
