import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Brain, Heart, Activity, Video, Check, Sparkles, Clock } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function PetMedicalCenter() {
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  const { data: plans, isLoading } = useQuery({
    queryKey: ['ai-subscription-plans'],
    queryFn: () => api.get('/ai-subscriptions/plans').then(r => r.data?.data ?? []),
  })

  const { data: status } = useQuery({
    queryKey: ['ai-subscription-status'],
    queryFn: () => api.get('/ai-subscriptions/my-status').then(r => r.data?.data),
    enabled: isAuthenticated,
  })

  const startTrial = useMutation({
    mutationFn: () => api.post('/ai-subscriptions/start-trial'),
    onSuccess: () => {
      toast.success('Το δωρεάν 15-ήμερο trial ενεργοποιήθηκε! 🎉')
      queryClient.invalidateQueries({ queryKey: ['ai-subscription-status'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Σφάλμα ενεργοποίησης trial'),
  })

  const features = [
    { icon: Brain,    title: 'AI Health Check',    desc: 'Ανάλυση φωτογραφιών δέρματος & ματιού με σύγκριση σε δημόσιες κτηνιατρικές πηγές.' },
    { icon: Heart,    title: 'Emotion Detector',    desc: 'Κατανόηση της συναισθηματικής κατάστασης του κατοικίδιού σου από εικόνα ή βίντεο.' },
    { icon: Activity, title: 'Wellness Tracker',    desc: 'Συνεχής παρακολούθηση υγείας και ιστορικό αναλύσεων στο χρόνο.' },
    { icon: Video,    title: 'Τηλειατρική 24/7',    desc: 'Άμεση πρόσβαση σε κτηνίατρο online, χωρίς αναμονή.' },
  ]

  const renderTrialCta = () => {
    if (!isAuthenticated) {
      return (
        <Link to="/login" className="bg-amber-400 text-gray-900 font-bold text-sm px-6 py-3 rounded-xl hover:bg-amber-300 transition-colors inline-block">
          Συνδέσου για δωρεάν trial
        </Link>
      )
    }
    if (status?.ai_subscription_status === 'trial') {
      return (
        <div className="inline-flex items-center gap-2 bg-gray-800 border border-gray-700 text-amber-400 text-sm font-semibold px-5 py-3 rounded-xl">
          <Clock size={16} /> {status.trial_days_left} μέρες δωρεάν trial απομένουν
        </div>
      )
    }
    if (status?.ai_subscription_status === 'active') {
      return (
        <div className="inline-flex items-center gap-2 bg-green-900/30 border border-green-700 text-green-400 text-sm font-semibold px-5 py-3 rounded-xl">
          <Check size={16} /> Έχεις ενεργή συνδρομή
        </div>
      )
    }
    if (status?.ai_subscription_status === 'expired') {
      return (
        <p className="text-amber-400 text-sm font-medium">Το δωρεάν trial έληξε — επίλεξε πλάνο παρακάτω για να συνεχίσεις.</p>
      )
    }
    return (
      <button
        onClick={() => startTrial.mutate()}
        disabled={startTrial.isPending}
        className="bg-amber-400 text-gray-900 font-bold text-sm px-6 py-3 rounded-xl hover:bg-amber-300 transition-colors disabled:opacity-60"
      >
        {startTrial.isPending ? 'Ενεργοποίηση...' : 'Δοκίμασε δωρεάν για 15 μέρες'}
      </button>
    )
  }

  return (
    <div className="pb-20 lg:pb-0">
      {/* Hero */}
      <section className="bg-gray-950 text-white py-16 px-4">
        <div className="page-container">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Sparkles size={12} /> AI Powered Pet Medical Center
            </p>
            <h1 className="text-3xl lg:text-5xl font-display font-bold mb-4 leading-tight">
              Ο γιατρός του κατοικίδιού σου<br />είναι πάντα <span className="text-amber-400">διαθέσιμος</span>
            </h1>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Ανάλυση συμπτωμάτων με τεχνητή νοημοσύνη, συναισθηματική παρακολούθηση, wellness tracking και τηλειατρική — όλα σε ένα μέρος.
            </p>
            {renderTrialCta()}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 bg-white dark:bg-gray-900">
        <div className="page-container">
          <h2 className="section-title mb-7">Τι περιλαμβάνει</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="card p-5">
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mb-3">
                  <f.icon size={20} className="text-brand-900 dark:text-brand-400" />
                </div>
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-1.5">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-12 bg-gray-50 dark:bg-gray-950">
        <div className="page-container">
          <div className="text-center mb-8">
            <h2 className="section-title mb-2">Συνδρομητικά πλάνα</h2>
            <p className="text-sm text-gray-500 mb-5">Ξεκίνα με 15 μέρες δωρεάν, μετά επίλεξε το πλάνο που σου ταιριάζει</p>
            <div className="inline-flex bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
              <button onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${billingCycle === 'monthly' ? 'bg-brand-900 text-white' : 'text-gray-500'}`}>
                Μηνιαία
              </button>
              <button onClick={() => setBillingCycle('annual')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${billingCycle === 'annual' ? 'bg-brand-900 text-white' : 'text-gray-500'}`}>
                Ετήσια (έκπτωση)
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
              {plans?.map((plan: any) => {
                const price = billingCycle === 'annual' && plan.price_annual ? plan.price_annual : plan.price_monthly
                const period = billingCycle === 'annual' ? '/έτος' : '/μήνα'
                return (
                  <div key={plan.id}
                    className={`card p-6 relative ${plan.is_featured ? 'border-2 border-brand-900 shadow-lg' : ''}`}>
                    {plan.is_featured && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-900 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                        Δημοφιλές
                      </span>
                    )}
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{plan.name_el || plan.name}</h3>
                    <p className="text-xs text-gray-500 mb-4 leading-relaxed">{plan.description}</p>
                    <div className="flex items-baseline gap-1 mb-5">
                      <span className="text-3xl font-display font-bold text-gray-900 dark:text-white">€{price}</span>
                      <span className="text-sm text-gray-500">{period}</span>
                    </div>
                    <ul className="space-y-2 mb-6">
                      {plan.features?.map((feat: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Check size={15} className="text-green-600 shrink-0 mt-0.5" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                    <button className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      plan.is_featured ? 'bg-brand-900 text-white hover:bg-brand-800' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}>
                      Επιλογή πλάνου
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
