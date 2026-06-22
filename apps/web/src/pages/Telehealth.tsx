import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Video, Clock, Star, Search, Shield, Award, X, Lock, Zap, Calendar } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { cn, getInitials } from '@/lib/utils'
import { useWsStore } from '@/store/ws'
import toast from 'react-hot-toast'

type Tab = 'now' | 'scheduled'

export default function Telehealth() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('now')
  const [selectedVet, setSelectedVet] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('')
  const [selectedPetId, setSelectedPetId] = useState('')

  // Available now
  const { data: availableVets = [], isLoading: loadingNow } = useQuery({
    queryKey: ['telehealth-available-now'],
    queryFn: () => api.get('/telehealth/available-now').then(r => r.data?.data ?? []),
    refetchInterval: 30_000, // re-poll every 30s
  })

  // All vets for scheduled tab
  const { data: allVets = [], isLoading: loadingAll } = useQuery({
    queryKey: ['telehealth-vets'],
    queryFn: () => api.get('/services?service_type=veterinary&limit=24').then(r => r.data?.data ?? []),
    enabled: tab === 'scheduled',
  })

  const { data: pets = [] } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets/my').then(r => r.data?.data ?? []).catch(() => []),
    enabled: isAuthenticated,
  })

  // Real-time availability updates via WebSocket
  const wsLastMsg = useWsStore?.((s: any) => s.lastMessage)
  useEffect(() => {
    if (wsLastMsg?.type === 'vet_availability_change') {
      queryClient.invalidateQueries({ queryKey: ['telehealth-available-now'] })
    }
  }, [wsLastMsg, queryClient])

  const vets = tab === 'now' ? availableVets : allVets
  const isLoading = tab === 'now' ? loadingNow : loadingAll
  const filtered = vets.filter((v: any) =>
    v.provider_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.specializations?.some((s: string) => s.toLowerCase().includes(search.toLowerCase()))
  )

  const bookConsultation = useMutation({
    mutationFn: async () => {
      if (!selectedVet) throw new Error('Δεν επιλέχθηκε κτηνίατρος')
      const pet = pets.find((p: any) => p.id === selectedPetId)
      const isNow = tab === 'now'
      const now = new Date()
      const { data } = await api.post('/telehealth', {
        provider_email: selectedVet.provider_email,
        provider_name: selectedVet.provider_name,
        service_id: selectedVet.id,
        pet_id: selectedPetId || undefined,
        pet_name: pet?.name,
        scheduled_date: isNow ? now.toISOString().split('T')[0] : bookingDate,
        scheduled_time: isNow ? now.toTimeString().slice(0, 5) : bookingTime,
        duration: 30,
        price: selectedVet.price,
      })
      return data
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) window.location.href = data.checkoutUrl
    },
    onError: (err: any) => toast.error(err?.message || 'Σφάλμα κατά την κράτηση'),
  })

  const openBooking = (vet: any) => {
    if (!isAuthenticated) { toast.error('Συνδεθείτε για να κλείσετε ραντεβού'); return }
    setSelectedVet(vet)
    if (tab === 'scheduled') {
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
      setBookingDate(tomorrow.toISOString().split('T')[0])
      setBookingTime('10:00')
    }
  }

  const VetCard = ({ vet }: { vet: any }) => (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-semibold text-sm shrink-0">
            {getInitials(vet.provider_name)}
          </div>
          {vet.is_available_now && (
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{vet.provider_name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{vet.specializations?.[0] || 'Γενική Κτηνιατρική'}</p>
          <div className="flex items-center gap-1 mt-1">
            <Star size={11} className="text-yellow-500 fill-yellow-500" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{vet.rating || 0}</span>
            <span className="text-xs text-gray-400">({vet.reviews_count || 0})</span>
          </div>
        </div>
        {vet.is_verified && <Shield size={14} className="text-blue-500 shrink-0 mt-1.5" />}
      </div>

      <div className="flex items-center justify-between mb-4 text-xs text-gray-500">
        {vet.is_available_now
          ? <span className="flex items-center gap-1 text-green-600 font-medium"><span className="w-1.5 h-1.5 bg-green-500 rounded-full" />Διαθέσιμος τώρα</span>
          : <span>{vet.years_experience || 0} χρόνια εμπειρία</span>}
        <span className="font-semibold text-gray-900 dark:text-white">€{vet.price}/συνεδρία</span>
      </div>

      <button onClick={() => openBooking(vet)}
        className={cn('w-full flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-xl font-medium transition-all',
          vet.is_available_now
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-blue-600 text-white hover:bg-blue-700')}>
        {vet.is_available_now ? <><Zap size={13} /> Κάλεσε Τώρα</> : <><Calendar size={13} /> Κλείσε Ραντεβού</>}
      </button>
    </motion.div>
  )

  return (
    <>
      <div className="page-container py-8 pb-24 lg:pb-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Video size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Τηλεϊατρική</h1>
              <p className="text-sm text-gray-500">Βιντεοκλήση με εξειδικευμένο κτηνίατρο — πληρωμή πριν τη συνεδρία</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { icon: Zap, label: 'Διαθέσιμοι τώρα', value: String(availableVets.length), color: 'text-green-600' },
            { icon: Clock, label: 'Διάρκεια', value: '30 λεπτά', color: 'text-blue-600' },
            { icon: Shield, label: 'Πληρωμή', value: 'Viva Wallet', color: 'text-orange-600' },
          ].map((stat, i) => (
            <div key={i} className="card p-4 text-center">
              <stat.icon size={20} className={cn('mx-auto mb-2', stat.color)} />
              <p className="font-bold text-gray-900 dark:text-white text-sm">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          <button onClick={() => setTab('now')}
            className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
              tab === 'now' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500')}>
            <Zap size={15} className={availableVets.length > 0 ? 'text-green-500' : ''} />
            Διαθέσιμοι Τώρα
            {availableVets.length > 0 && (
              <span className="bg-green-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">{availableVets.length}</span>
            )}
          </button>
          <button onClick={() => setTab('scheduled')}
            className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
              tab === 'scheduled' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500')}>
            <Calendar size={15} /> Προγραμματισμένη
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 mb-5">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input type="text" placeholder="Αναζήτηση κτηνιάτρου..." value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400" />
        </div>

        {/* Empty state for "now" tab */}
        {tab === 'now' && !isLoading && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🩺</p>
            <p className="font-semibold text-gray-900 dark:text-white mb-1">Κανένας κτηνίατρος διαθέσιμος αυτή τη στιγμή</p>
            <p className="text-sm text-gray-500 mb-4">Η λίστα ενημερώνεται κάθε 30 δευτερόλεπτα αυτόματα</p>
            <button onClick={() => setTab('scheduled')} className="btn-primary text-sm px-5 py-2.5">
              Κλείσε Προγραμματισμένο Ραντεβού
            </button>
          </div>
        )}

        {/* Vet grid */}
        {(isLoading) ? (
          <div className="text-center py-16 text-gray-400">Φόρτωση...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((vet: any) => <VetCard key={vet.id} vet={vet} />)}
          </div>
        )}

        {tab === 'scheduled' && !isLoading && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold text-gray-900 dark:text-white">Δεν βρέθηκαν κτηνίατροι</p>
          </div>
        )}
      </div>

      {/* Booking modal */}
      <AnimatePresence>
        {selectedVet && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
            onClick={() => setSelectedVet(null)}>
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md mx-auto card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">

              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold">
                      {getInitials(selectedVet.provider_name)}
                    </div>
                    {selectedVet.is_available_now && (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{selectedVet.provider_name}</p>
                    <p className="text-sm text-gray-500">{selectedVet.specializations?.[0] || 'Γενική Κτηνιατρική'}</p>
                    {selectedVet.is_available_now && (
                      <p className="text-xs text-green-600 font-medium mt-0.5">● Διαθέσιμος τώρα</p>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelectedVet(null)} className="btn-ghost p-2"><X size={18} /></button>
              </div>

              {tab === 'now' ? (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl mb-4 flex items-center gap-3">
                  <Zap size={20} className="text-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-700 dark:text-green-400">Άμεση Κλήση</p>
                    <p className="text-xs text-green-600">Μόλις ολοκληρωθεί η πληρωμή, ο κτηνίατρος λαμβάνει ειδοποίηση και εισέρχεται στη βιντεοκλήση.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 mb-5">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Ημερομηνία</label>
                    <input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} className="input w-full text-sm" min={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Ώρα</label>
                    <input type="time" value={bookingTime} onChange={e => setBookingTime(e.target.value)} className="input w-full text-sm" />
                  </div>
                </div>
              )}

              {pets.length > 0 && (
                <div className="mb-4">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Κατοικίδιο (προαιρετικό)</label>
                  <select value={selectedPetId} onChange={e => setSelectedPetId(e.target.value)} className="input w-full text-sm">
                    <option value="">— Επίλεξε —</option>
                    {pets.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-4 flex items-center gap-2">
                <Lock size={13} className="text-blue-600 shrink-0" />
                <span className="text-xs text-blue-600">Ασφαλής πληρωμή μέσω Viva Wallet. Η κλήση ξεκλειδώνει μετά την επιβεβαίωση.</span>
              </div>

              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-500">Κόστος συνεδρίας</span>
                <span className="font-bold text-lg text-gray-900 dark:text-white">€{selectedVet.price}</span>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setSelectedVet(null)} className="btn-secondary flex-1">Άκυρο</button>
                <button onClick={() => bookConsultation.mutate()}
                  disabled={(tab === 'scheduled' && (!bookingDate || !bookingTime)) || bookConsultation.isPending}
                  className={cn('flex-1 flex items-center justify-center gap-2 rounded-xl font-semibold text-sm py-2.5 text-white transition-all disabled:opacity-50',
                    tab === 'now' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700')}>
                  {tab === 'now' ? <Zap size={14}/> : <Lock size={14}/>}
                  {bookConsultation.isPending ? 'Επεξεργασία...' : tab === 'now' ? 'Πλήρωσε & Κάλεσε Τώρα' : 'Πλήρωσε & Κλείσε'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}