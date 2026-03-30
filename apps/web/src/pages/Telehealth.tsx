import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Video, Calendar, Clock, Star, Phone, PhoneOff, Mic, MicOff, VideoOff, MessageSquare, X, ChevronRight, Shield, Award, Search } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { cn, getInitials, formatRelativeTime } from '@/lib/utils'
import toast from 'react-hot-toast'

// Mock vets data (will come from API)
const mockVets = [
  { id: '1', name: 'Δρ. Μαρία Παπαδοπούλου', specialty: 'Γενική Κτηνιατρική', rating: 4.9, reviews: 124, price: 25, available: true, photo: null, experience: 12, languages: ['Ελληνικά', 'English'] },
  { id: '2', name: 'Δρ. Νίκος Γεωργίου', specialty: 'Δερματολογία', rating: 4.8, reviews: 89, price: 35, available: true, photo: null, experience: 8, languages: ['Ελληνικά'] },
  { id: '3', name: 'Δρ. Anna Schmidt', specialty: 'Χειρουργική', rating: 4.7, reviews: 203, price: 45, available: false, photo: null, experience: 15, languages: ['English', 'Deutsch'] },
  { id: '4', name: 'Δρ. Κώστας Αλεξίου', specialty: 'Ορθοπεδική', rating: 4.9, reviews: 67, price: 40, available: true, photo: null, experience: 10, languages: ['Ελληνικά', 'English'] },
  { id: '5', name: 'Δρ. Sofia Martinez', specialty: 'Καρδιολογία', rating: 4.6, reviews: 45, price: 50, available: true, photo: null, experience: 7, languages: ['English', 'Español'] },
  { id: '6', name: 'Δρ. Ελένη Νικολάου', specialty: 'Οδοντιατρική', rating: 4.8, reviews: 91, price: 30, available: false, photo: null, experience: 9, languages: ['Ελληνικά'] },
]

function JitsiCall({ roomName, vetName, onEnd }: { roomName: string; vetName: string; onEnd: () => void }) {
  const { user } = useAuthStore()
  const [muted, setMuted] = useState(false)
  const [videoOff, setVideoOff] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const jitsiUrl = `https://meet.jit.si/${roomName}#userInfo.displayName="${encodeURIComponent(user?.full_name || 'Guest')}"&config.startWithAudioMuted=${muted}&config.startWithVideoMuted=${videoOff}&config.toolbarButtons=[]&config.disableDeepLinking=true&config.prejoinPageEnabled=false`

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-white font-medium text-sm">{vetName}</span>
          <span className="text-gray-400 text-xs">Τηλεϊατρική Συνεδρία</span>
        </div>
        <button onClick={onEnd} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Video */}
      <div className="flex-1 relative">
        <iframe
          src={jitsiUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="w-full h-full border-0"
          title="Jitsi Meet"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 px-4 py-4 bg-gray-900 border-t border-gray-800">
        <button onClick={() => setMuted(!muted)}
          className={cn('w-12 h-12 rounded-full flex items-center justify-center transition-all', muted ? 'bg-red-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600')}>
          {muted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <button onClick={() => setVideoOff(!videoOff)}
          className={cn('w-12 h-12 rounded-full flex items-center justify-center transition-all', videoOff ? 'bg-red-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600')}>
          {videoOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>
        <button onClick={() => setChatOpen(!chatOpen)}
          className="w-12 h-12 rounded-full bg-gray-700 text-white hover:bg-gray-600 flex items-center justify-center transition-all">
          <MessageSquare size={20} />
        </button>
        <button onClick={onEnd}
          className="w-14 h-14 rounded-full bg-red-600 text-white hover:bg-red-700 flex items-center justify-center transition-all shadow-lg">
          <PhoneOff size={24} />
        </button>
      </div>
    </motion.div>
  )
}

export default function Telehealth() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuthStore()
  const [activeCall, setActiveCall] = useState<{ roomName: string; vetName: string } | null>(null)
  const [selectedVet, setSelectedVet] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [specialtyFilter, setSpecialtyFilter] = useState('all')

  const specialties = ['all', 'Γενική Κτηνιατρική', 'Δερματολογία', 'Χειρουργική', 'Ορθοπεδική', 'Καρδιολογία', 'Οδοντιατρική']

  const filteredVets = mockVets.filter(v => {
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase()) || v.specialty.toLowerCase().includes(search.toLowerCase())
    const matchSpecialty = specialtyFilter === 'all' || v.specialty === specialtyFilter
    return matchSearch && matchSpecialty
  })

  const startCall = (vet: any) => {
    if (!isAuthenticated) { toast.error('Συνδεθείτε για να ξεκινήσετε κλήση'); return }
    const roomName = `globipet-vet-${vet.id}-${Date.now()}`
    setActiveCall({ roomName, vetName: vet.name })
    setSelectedVet(null)
  }

  const endCall = () => {
    setActiveCall(null)
    toast.success('Η κλήση τερματίστηκε')
  }

  return (
    <>
      {activeCall && <JitsiCall roomName={activeCall.roomName} vetName={activeCall.vetName} onEnd={endCall} />}

      <div className="page-container py-8 pb-24 lg:pb-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Video size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Τηλεϊατρική</h1>
              <p className="text-sm text-gray-500">Βιντεοκλήση με εξειδικευμένο κτηνίατρο</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: Shield, label: 'Ασφαλείς κλήσεις', value: '100%', color: 'text-green-600' },
            { icon: Clock, label: 'Μέση αναμονή', value: '< 5 λεπτά', color: 'text-blue-600' },
            { icon: Award, label: 'Κτηνίατροι', value: '50+', color: 'text-orange-600' },
          ].map((stat, i) => (
            <div key={i} className="card p-4 text-center">
              <stat.icon size={20} className={cn('mx-auto mb-2', stat.color)} />
              <p className="font-bold text-gray-900 dark:text-white text-sm">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex items-center gap-2 flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5">
            <Search size={16} className="text-gray-400 shrink-0" />
            <input type="text" placeholder="Αναζήτηση κτηνιάτρου..." value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400" />
          </div>
          <select value={specialtyFilter} onChange={e => setSpecialtyFilter(e.target.value)}
            className="input text-sm">
            {specialties.map(s => <option key={s} value={s}>{s === 'all' ? 'Όλες οι ειδικότητες' : s}</option>)}
          </select>
        </div>

        {/* Vet list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVets.map((vet, i) => (
            <motion.div key={vet.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-semibold text-sm shrink-0">
                  {getInitials(vet.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{vet.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{vet.specialty}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star size={11} className="text-yellow-500 fill-yellow-500" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{vet.rating}</span>
                    <span className="text-xs text-gray-400">({vet.reviews})</span>
                  </div>
                </div>
                <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', vet.available ? 'bg-green-500' : 'bg-gray-300')} />
              </div>

              <div className="flex items-center justify-between mb-4 text-xs text-gray-500">
                <span>{vet.experience} χρόνια εμπειρία</span>
                <span className="font-semibold text-gray-900 dark:text-white">€{vet.price}/συνεδρία</span>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setSelectedVet(vet)}
                  className="flex-1 btn-secondary text-xs py-2">
                  Προφίλ
                </button>
                <button onClick={() => startCall(vet)} disabled={!vet.available}
                  className={cn('flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl font-medium transition-all',
                    vet.available ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed')}>
                  <Video size={13} />
                  {vet.available ? 'Κλήση' : 'Μη διαθέσιμος'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredVets.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold text-gray-900 dark:text-white">Δεν βρέθηκαν κτηνίατροι</p>
            <p className="text-sm text-gray-500 mt-1">Δοκιμάστε διαφορετικά φίλτρα</p>
          </div>
        )}
      </div>

      {/* Vet detail modal */}
      <AnimatePresence>
        {selectedVet && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedVet(null)} />
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto card p-6 shadow-2xl">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold">
                    {getInitials(selectedVet.name)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{selectedVet.name}</p>
                    <p className="text-sm text-gray-500">{selectedVet.specialty}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star size={12} className="text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-medium">{selectedVet.rating}</span>
                      <span className="text-xs text-gray-400">({selectedVet.reviews} κριτικές)</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedVet(null)} className="btn-ghost p-2"><X size={18} /></button>
              </div>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Εμπειρία</span><span className="font-medium">{selectedVet.experience} χρόνια</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Γλώσσες</span><span className="font-medium">{selectedVet.languages.join(', ')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Τιμή συνεδρίας</span><span className="font-bold text-gray-900 dark:text-white">€{selectedVet.price}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Διαθεσιμότητα</span>
                  <span className={cn('font-medium', selectedVet.available ? 'text-green-600' : 'text-red-500')}>
                    {selectedVet.available ? '● Διαθέσιμος τώρα' : '● Μη διαθέσιμος'}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setSelectedVet(null)} className="btn-secondary flex-1">Κλείσιμο</button>
                <button onClick={() => startCall(selectedVet)} disabled={!selectedVet.available}
                  className={cn('flex-1 flex items-center justify-center gap-2 rounded-xl font-semibold text-sm py-2.5 transition-all',
                    selectedVet.available ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed')}>
                  <Video size={16} />
                  Έναρξη κλήσης
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
