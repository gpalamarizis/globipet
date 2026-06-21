import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Video, Clock, Star, Search, Shield, Award, X, Lock, Calendar } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { cn, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function Telehealth() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const [selectedVet, setSelectedVet] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('')
  const [selectedPetId, setSelectedPetId] = useState('')

  // Real veterinary providers (telehealth-capable) from the services directory
  const { data: vets = [], isLoading } = useQuery({
    queryKey: ['telehealth-vets'],
    queryFn: () => api.get('/services?service_type=veterinary&limit=24').then(r => r.data?.data ?? []),
  })

  const { data: pets = [] } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets/my').then(r => r.data?.data ?? []).catch(() => []),
    enabled: isAuthenticated,
  })

  const filteredVets = vets.filter((v: any) =>
    v.provider_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.specializations?.some((s: string) => s.toLowerCase().includes(search.toLowerCase()))
  )

  const bookConsultation = useMutation({
    mutationFn: async () => {
      if (!selectedVet) throw new Error('Δεν επιλέχθηκε κτηνίατρος')
      const pet = pets.find((p: any) => p.id === selectedPetId)
      const { data } = await api.post('/telehealth', {
        provider_email: selectedVet.provider_email,
        provider_name: selectedVet.provider_name,
        service_id: selectedVet.id,
        pet_id: selectedPetId || undefined,
        pet_name: pet?.name,
        scheduled_date: bookingDate,
        scheduled_time: bookingTime,
        duration: 30,
        price: selectedVet.price,
      })
      return data
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    },
    onError: (err: any) => toast.error(err?.message || 'Σφάλμα κατά την κράτηση'),
  })

  const openBooking = (vet: any) => {
    if (!isAuthenticated) { toast.error('Συνδεθείτε για να κλείσετε ραντεβού'); return }
    setSelectedVet(vet)
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
    setBookingDate(tomorrow.toISOString().split('T')[0])
    setBookingTime('10:00')
  }

  return (
    <>
      <div className="page-container py-8 pb-24 lg:pb-8">
        {/* Header */}
        <div className="mb-8">
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
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: Shield, label: 'Ασφαλείς πληρωμές', value: 'Viva Wallet', color: 'text-green-600' },
            { icon: Clock, label: 'Διάρκεια συνεδρίας', value: '30 λεπτά', color: 'text-blue-600' },
            { icon: Award, label: 'Κτηνίατροι', value: String(vets.length), color: 'text-orange-600' },
          ].map((stat, i) => (
            <div key={i} className="card p-4 text-center">
              <stat.icon size={20} className={cn('mx-auto mb-2', stat.color)} />
              <p className="font-bold text-gray-900 dark:text-white text-sm">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 mb-6">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input type="text" placeholder="Αναζήτηση κτηνιάτρου..." value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400" />
        </div>

        {/* Vet list */}
        {isLoading ? (
          <div className="text-center py-16 text-gray-400">Φόρτωση...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVets.map((vet: any, i: number) => (
              <motion.div key={vet.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-semibold text-sm shrink-0">
                    {getInitials(vet.provider_name)}
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
                  <span>{vet.years_experience || 0} χρόνια εμπειρία</span>
                  <span className="font-semibold text-gray-900 dark:text-white">€{vet.price}/συνεδρία</span>
                </div>

                <button onClick={() => openBooking(vet)}
                  className="w-full flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all">
                  <Video size={13} /> Κλείσε & Πλήρωσε
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {!isLoading && filteredVets.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold text-gray-900 dark:text-white">Δεν βρέθηκαν κτηνίατροι</p>
            <p className="text-sm text-gray-500 mt-1">Δοκιμάστε διαφορετική αναζήτηση</p>
          </div>
        )}
      </div>

      {/* Booking modal */}
      <AnimatePresence>
        {selectedVet && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedVet(null)} />
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold">
                    {getInitials(selectedVet.provider_name)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{selectedVet.provider_name}</p>
                    <p className="text-sm text-gray-500">{selectedVet.specializations?.[0] || 'Γενική Κτηνιατρική'}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedVet(null)} className="btn-ghost p-2"><X size={18} /></button>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Ημερομηνία</label>
                  <input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} className="input w-full text-sm" min={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Ώρα</label>
                  <input type="time" value={bookingTime} onChange={e => setBookingTime(e.target.value)} className="input w-full text-sm" />
                </div>
                {pets.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Κατοικίδιο (προαιρετικό)</label>
                    <select value={selectedPetId} onChange={e => setSelectedPetId(e.target.value)} className="input w-full text-sm">
                      <option value="">— Επίλεξε —</option>
                      {pets.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-4 flex items-center gap-2">
                <Lock size={13} className="text-blue-600 shrink-0" />
                <span className="text-xs text-blue-600">Θα μεταφερθείς στο ασφαλές περιβάλλον πληρωμής Viva Wallet. Η κλήση ξεκλειδώνει μετά την επιβεβαίωση πληρωμής.</span>
              </div>

              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-500">Κόστος συνεδρίας</span>
                <span className="font-bold text-lg text-gray-900 dark:text-white">€{selectedVet.price}</span>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setSelectedVet(null)} className="btn-secondary flex-1">Άκυρο</button>
                <button onClick={() => bookConsultation.mutate()} disabled={!bookingDate || !bookingTime || bookConsultation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl font-semibold text-sm py-2.5 bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-50">
                  <Lock size={14}/>{bookConsultation.isPending ? 'Επεξεργασία...' : 'Πλήρωσε & Κλείσε'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}