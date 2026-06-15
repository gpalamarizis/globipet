import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Syringe, Stethoscope, Award, Plane, Plus, X, ChevronDown, Trash2, Upload } from 'lucide-react'
import { api, uploadFile } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'

const tabs = [
  { id: 'identity', label: 'Ταυτότητα', icon: BookOpen },
  { id: 'vaccinations', label: 'Εμβόλια', icon: Syringe },
  { id: 'health', label: 'Εξετάσεις', icon: Stethoscope },
  { id: 'pedigree', label: 'Pedigree', icon: Award },
  { id: 'travel', label: 'Ταξίδια', icon: Plane },
]

const travelTypes = [
  { value: 'flight', label: '✈️ Αεροπλάνο' },
  { value: 'ferry', label: '🚢 Πλοίο' },
  { value: 'train', label: '🚂 Τρένο' },
  { value: 'road', label: '🚗 Οδικώς' },
  { value: 'international', label: '🌍 Διεθνές' },
]

const speciesEmoji: Record<string, string> = {
  dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰', fish: '🐟', reptile: '🦎', horse: '🐴', other: '🐾'
}

export default function PetPassport() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('identity')

  // Modals
  const [showVacModal, setShowVacModal] = useState(false)
  const [showHealthModal, setShowHealthModal] = useState(false)
  const [showTravelModal, setShowTravelModal] = useState(false)
  const [showPedigreeModal, setShowPedigreeModal] = useState(false)

  // Forms
  const [vacForm, setVacForm] = useState({ vaccine_name: '', vaccine_type: '', date_administered: '', next_due_date: '', vet_name: '' })
  const [healthForm, setHealthForm] = useState({ record_type: 'examination', title: '', description: '', date: '', vet_name: '', clinic_name: '', cost: '' })
  const [travelForm, setTravelForm] = useState({ travel_type: 'flight', origin_city: '', destination_city: '', destination_country: '', departure_date: '', return_date: '', carrier: '', booking_ref: '', notes: '' })
  const [pedigreeForm, setPedigreeForm] = useState({ registration_number: '', kennel_club: '', father_name: '', mother_name: '', breeder_name: '', breeder_contact: '', certifications: '', notes: '' })

  const { data: pets = [] } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets/my').then(r => r.data?.data ?? []),
    enabled: !!user,
    onSuccess: (data: any[]) => { if (data.length === 1 && !selectedPetId) setSelectedPetId(data[0].id) }
  })

  const activePetId = selectedPetId || (pets.length === 1 ? pets[0]?.id : null)

  const { data: passport, isLoading } = useQuery({
    queryKey: ['passport', activePetId],
    queryFn: () => api.get(`/passport/${activePetId}`).then(r => r.data),
    enabled: !!activePetId,
  })

  const addVaccination = useMutation({
    mutationFn: () => api.post(`/passport/vaccination/${activePetId}`, vacForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['passport', activePetId] }); setShowVacModal(false); setVacForm({ vaccine_name: '', vaccine_type: '', date_administered: '', next_due_date: '', vet_name: '' }); toast.success('Εμβόλιο καταχωρήθηκε!') },
    onError: () => toast.error('Σφάλμα αποθήκευσης'),
  })

  const addHealth = useMutation({
    mutationFn: () => api.post(`/passport/health/${activePetId}`, { ...healthForm, cost: healthForm.cost ? Number(healthForm.cost) : null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['passport', activePetId] }); setShowHealthModal(false); setHealthForm({ record_type: 'examination', title: '', description: '', date: '', vet_name: '', clinic_name: '', cost: '' }); toast.success('Εξέταση καταχωρήθηκε!') },
    onError: () => toast.error('Σφάλμα αποθήκευσης'),
  })

  const addTravel = useMutation({
    mutationFn: () => api.post(`/passport/travel/${activePetId}`, travelForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['passport', activePetId] }); setShowTravelModal(false); setTravelForm({ travel_type: 'flight', origin_city: '', destination_city: '', destination_country: '', departure_date: '', return_date: '', carrier: '', booking_ref: '', notes: '' }); toast.success('Ταξίδι καταχωρήθηκε!') },
    onError: () => toast.error('Σφάλμα αποθήκευσης'),
  })

  const savePedigree = useMutation({
    mutationFn: () => api.put(`/passport/pedigree/${activePetId}`, { ...pedigreeForm, certifications: pedigreeForm.certifications ? pedigreeForm.certifications.split(',').map(s => s.trim()) : [] }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['passport', activePetId] }); setShowPedigreeModal(false); toast.success('Pedigree αποθηκεύτηκε!') },
    onError: () => toast.error('Σφάλμα αποθήκευσης'),
  })

  const deleteTravel = useMutation({
    mutationFn: (id: string) => api.delete(`/passport/travel/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['passport', activePetId] }); toast.success('Διαγράφηκε') },
  })

  const pet = passport?.pet
  const inputCls = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-800 dark:text-white"
  const labelCls = "text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block"

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <div className="max-w-3xl mx-auto px-4">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <BookOpen size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Pet Digital Passport</h1>
            <p className="text-sm text-gray-500">Όλα τα έγγραφα του κατοικίδιου σε ένα σημείο</p>
          </div>
        </div>

        {/* Pet selector */}
        {pets.length > 1 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {pets.map((p: any) => (
              <button key={p.id} onClick={() => setSelectedPetId(p.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium whitespace-nowrap transition-all ${
                  activePetId === p.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                }`}>
                <span>{speciesEmoji[p.species] || '🐾'}</span>
                {p.name}
              </button>
            ))}
          </div>
        )}

        {!activePetId ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center shadow-sm">
            <p className="text-4xl mb-3">🐾</p>
            <p className="text-gray-500">Επιλέξτε κατοικίδιο για να δείτε το passport</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-24"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <>
            {/* Pet card */}
            {pet && (
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-5 mb-6 text-white shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/20 flex items-center justify-center shrink-0">
                    {pet.image_url
                      ? <img src={pet.image_url} alt={pet.name} className="w-full h-full object-cover" />
                      : <span className="text-4xl">{speciesEmoji[pet.species] || '🐾'}</span>
                    }
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold">{pet.name}</h2>
                    <p className="text-blue-100 text-sm">{pet.breed || pet.species}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-blue-100">
                      {pet.age && <span>🎂 {pet.age} ετών</span>}
                      {pet.weight && <span>⚖️ {pet.weight}kg</span>}
                      {pet.gender && <span>{pet.gender === 'male' ? '♂' : '♀'}</span>}
                      {pet.color && <span>🎨 {pet.color}</span>}
                    </div>
                    {pet.microchip_number && (
                      <div className="mt-2 bg-white/20 rounded-lg px-3 py-1 text-xs inline-block">
                        🔷 Microchip: {pet.microchip_number}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 bg-white dark:bg-gray-900 rounded-2xl p-1.5 mb-4 shadow-sm overflow-x-auto">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}>
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

                {/* Identity */}
                {activeTab === 'identity' && (
                  <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm space-y-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Στοιχεία Ταυτότητας</h3>
                    {[
                      ['Όνομα', pet?.name],
                      ['Είδος', pet?.species],
                      ['Ράτσα', pet?.breed],
                      ['Ηλικία', pet?.age ? `${pet.age} έτη` : null],
                      ['Βάρος', pet?.weight ? `${pet.weight} kg` : null],
                      ['Φύλο', pet?.gender === 'male' ? 'Αρσενικό' : pet?.gender === 'female' ? 'Θηλυκό' : null],
                      ['Χρώμα', pet?.color],
                      ['Microchip', pet?.microchip_number],
                    ].map(([label, value]) => value ? (
                      <div key={label as string} className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                        <span className="text-sm text-gray-500">{label}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{value}</span>
                      </div>
                    ) : null)}
                  </div>
                )}

                {/* Vaccinations */}
                {activeTab === 'vaccinations' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500">{passport?.vaccinations?.length || 0} καταχωρήσεις</p>
                      <button onClick={() => setShowVacModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-sm font-medium">
                        <Plus size={14} /> Προσθήκη
                      </button>
                    </div>
                    {passport?.vaccinations?.length === 0 && (
                      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center shadow-sm">
                        <p className="text-3xl mb-2">💉</p>
                        <p className="text-gray-500 text-sm">Δεν υπάρχουν εμβόλια καταχωρημένα</p>
                      </div>
                    )}
                    {passport?.vaccinations?.map((v: any) => (
                      <div key={v.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{v.vaccine_name}</p>
                            <p className="text-xs text-gray-400">{v.vaccine_type}</p>
                          </div>
                          {v.is_overdue && <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs">Ληγμένο</span>}
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>📅 {v.date_administered}</span>
                          {v.next_due_date && <span>⏰ Επόμενο: {v.next_due_date}</span>}
                          {v.vet_name && <span>👨‍⚕️ {v.vet_name}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Health Records */}
                {activeTab === 'health' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500">{passport?.healthRecords?.length || 0} καταχωρήσεις</p>
                      <button onClick={() => setShowHealthModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-sm font-medium">
                        <Plus size={14} /> Προσθήκη
                      </button>
                    </div>
                    {passport?.healthRecords?.length === 0 && (
                      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center shadow-sm">
                        <p className="text-3xl mb-2">🩺</p>
                        <p className="text-gray-500 text-sm">Δεν υπάρχουν εξετάσεις καταχωρημένες</p>
                      </div>
                    )}
                    {passport?.healthRecords?.map((r: any) => (
                      <div key={r.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{r.title}</p>
                            <p className="text-xs text-gray-400">{r.record_type}</p>
                          </div>
                          <span className="text-xs text-gray-400">{r.date}</span>
                        </div>
                        {r.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{r.description}</p>}
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          {r.vet_name && <span>👨‍⚕️ {r.vet_name}</span>}
                          {r.clinic_name && <span>🏥 {r.clinic_name}</span>}
                          {r.cost && <span>💶 €{r.cost}</span>}
                          {r.next_appointment && <span>⏰ {r.next_appointment}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pedigree */}
                {activeTab === 'pedigree' && (
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <button onClick={() => {
                        if (passport?.pedigree) setPedigreeForm({ ...passport.pedigree, certifications: passport.pedigree.certifications?.join(', ') || '' })
                        setShowPedigreeModal(true)
                      }} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-sm font-medium">
                        <Plus size={14} /> {passport?.pedigree ? 'Επεξεργασία' : 'Προσθήκη'}
                      </button>
                    </div>
                    {!passport?.pedigree ? (
                      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center shadow-sm">
                        <p className="text-3xl mb-2">🏆</p>
                        <p className="text-gray-500 text-sm">Δεν υπάρχουν στοιχεία pedigree</p>
                      </div>
                    ) : (
                      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm space-y-3">
                        {[
                          ['Αριθμός Εγγραφής', passport.pedigree.registration_number],
                          ['Kennel Club', passport.pedigree.kennel_club],
                          ['Πατέρας', passport.pedigree.father_name],
                          ['Μητέρα', passport.pedigree.mother_name],
                          ['Breeder', passport.pedigree.breeder_name],
                          ['Επικοινωνία Breeder', passport.pedigree.breeder_contact],
                          ['Σημειώσεις', passport.pedigree.notes],
                        ].map(([l, v]) => v ? (
                          <div key={l as string} className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                            <span className="text-sm text-gray-500">{l}</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{v}</span>
                          </div>
                        ) : null)}
                        {passport.pedigree.certifications?.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {passport.pedigree.certifications.map((c: string) => (
                              <span key={c} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full text-xs">{c}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Travel */}
                {activeTab === 'travel' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500">{passport?.travelDocs?.length || 0} ταξίδια</p>
                      <button onClick={() => setShowTravelModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-sm font-medium">
                        <Plus size={14} /> Νέο Ταξίδι
                      </button>
                    </div>
                    {passport?.travelDocs?.length === 0 && (
                      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center shadow-sm">
                        <p className="text-3xl mb-2">✈️</p>
                        <p className="text-gray-500 text-sm">Δεν υπάρχουν ταξίδια καταχωρημένα</p>
                      </div>
                    )}
                    {passport?.travelDocs?.map((t: any) => (
                      <div key={t.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{travelTypes.find(tt => tt.value === t.travel_type)?.label.split(' ')[0] || '✈️'}</span>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {t.origin_city ? `${t.origin_city} → ` : ''}{t.destination_city}
                                {t.destination_country ? `, ${t.destination_country}` : ''}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                              <span>📅 {t.departure_date}</span>
                              {t.return_date && <span>↩️ {t.return_date}</span>}
                              {t.carrier && <span>🏢 {t.carrier}</span>}
                              {t.booking_ref && <span>🎫 {t.booking_ref}</span>}
                            </div>
                            {t.notes && <p className="text-xs text-gray-400 mt-1">{t.notes}</p>}
                          </div>
                          <button onClick={() => deleteTravel.mutate(t.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Vaccination Modal */}
      <AnimatePresence>
        {showVacModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowVacModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-8 z-50 max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Νέο Εμβόλιο</h3>
                <button onClick={() => setShowVacModal(false)}><X size={18} className="text-gray-400" /></button>
              </div>
              <div className="space-y-3">
                <div><label className={labelCls}>Εμβόλιο *</label><input className={inputCls} value={vacForm.vaccine_name} onChange={e => setVacForm(f => ({...f, vaccine_name: e.target.value}))} placeholder="π.χ. Λύσσα" /></div>
                <div><label className={labelCls}>Τύπος</label><input className={inputCls} value={vacForm.vaccine_type} onChange={e => setVacForm(f => ({...f, vaccine_type: e.target.value}))} placeholder="π.χ. Ετήσιο" /></div>
                <div><label className={labelCls}>Ημερομηνία *</label><input type="date" className={inputCls} value={vacForm.date_administered} onChange={e => setVacForm(f => ({...f, date_administered: e.target.value}))} /></div>
                <div><label className={labelCls}>Επόμενο</label><input type="date" className={inputCls} value={vacForm.next_due_date} onChange={e => setVacForm(f => ({...f, next_due_date: e.target.value}))} /></div>
                <div><label className={labelCls}>Κτηνίατρος</label><input className={inputCls} value={vacForm.vet_name} onChange={e => setVacForm(f => ({...f, vet_name: e.target.value}))} placeholder="Όνομα κτηνιάτρου" /></div>
              </div>
              <button onClick={() => addVaccination.mutate()} disabled={!vacForm.vaccine_name || !vacForm.date_administered || addVaccination.isPending}
                className="w-full mt-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {addVaccination.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Health Modal */}
      <AnimatePresence>
        {showHealthModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowHealthModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-4 bottom-4 z-50 max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Νέα Εξέταση</h3>
                <button onClick={() => setShowHealthModal(false)}><X size={18} className="text-gray-400" /></button>
              </div>
              <div className="space-y-3">
                <div><label className={labelCls}>Τύπος</label>
                  <select className={inputCls} value={healthForm.record_type} onChange={e => setHealthForm(f => ({...f, record_type: e.target.value}))}>
                    {['examination','vaccination','surgery','diagnosis','medication','dental','other'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Τίτλος *</label><input className={inputCls} value={healthForm.title} onChange={e => setHealthForm(f => ({...f, title: e.target.value}))} placeholder="π.χ. Ετήσιος έλεγχος" /></div>
                <div><label className={labelCls}>Ημερομηνία *</label><input type="date" className={inputCls} value={healthForm.date} onChange={e => setHealthForm(f => ({...f, date: e.target.value}))} /></div>
                <div><label className={labelCls}>Περιγραφή</label><textarea className={inputCls} rows={2} value={healthForm.description} onChange={e => setHealthForm(f => ({...f, description: e.target.value}))} /></div>
                <div><label className={labelCls}>Κτηνίατρος</label><input className={inputCls} value={healthForm.vet_name} onChange={e => setHealthForm(f => ({...f, vet_name: e.target.value}))} /></div>
                <div><label className={labelCls}>Κλινική</label><input className={inputCls} value={healthForm.clinic_name} onChange={e => setHealthForm(f => ({...f, clinic_name: e.target.value}))} /></div>
                <div><label className={labelCls}>Κόστος (€)</label><input type="number" className={inputCls} value={healthForm.cost} onChange={e => setHealthForm(f => ({...f, cost: e.target.value}))} /></div>
                <div><label className={labelCls}>Επόμενο ραντεβού</label><input type="date" className={inputCls} value={healthForm.next_appointment} onChange={e => setHealthForm(f => ({...f, next_appointment: e.target.value}))} /></div>
              </div>
              <button onClick={() => addHealth.mutate()} disabled={!healthForm.title || !healthForm.date || addHealth.isPending}
                className="w-full mt-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {addHealth.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Travel Modal */}
      <AnimatePresence>
        {showTravelModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowTravelModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-4 bottom-4 z-50 max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Νέο Ταξίδι</h3>
                <button onClick={() => setShowTravelModal(false)}><X size={18} className="text-gray-400" /></button>
              </div>
              <div className="space-y-3">
                <div><label className={labelCls}>Τύπος *</label>
                  <select className={inputCls} value={travelForm.travel_type} onChange={e => setTravelForm(f => ({...f, travel_type: e.target.value}))}>
                    {travelTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Από</label><input className={inputCls} value={travelForm.origin_city} onChange={e => setTravelForm(f => ({...f, origin_city: e.target.value}))} placeholder="π.χ. Αθήνα" /></div>
                <div><label className={labelCls}>Προς *</label><input className={inputCls} value={travelForm.destination_city} onChange={e => setTravelForm(f => ({...f, destination_city: e.target.value}))} placeholder="π.χ. Θεσσαλονίκη" /></div>
                <div><label className={labelCls}>Χώρα Προορισμού</label><input className={inputCls} value={travelForm.destination_country} onChange={e => setTravelForm(f => ({...f, destination_country: e.target.value}))} placeholder="π.χ. GR" /></div>
                <div><label className={labelCls}>Ημερομηνία Αναχώρησης *</label><input type="date" className={inputCls} value={travelForm.departure_date} onChange={e => setTravelForm(f => ({...f, departure_date: e.target.value}))} /></div>
                <div><label className={labelCls}>Ημερομηνία Επιστροφής</label><input type="date" className={inputCls} value={travelForm.return_date} onChange={e => setTravelForm(f => ({...f, return_date: e.target.value}))} /></div>
                <div><label className={labelCls}>Μεταφορέας</label><input className={inputCls} value={travelForm.carrier} onChange={e => setTravelForm(f => ({...f, carrier: e.target.value}))} placeholder="π.χ. Aegean, Attica Ferries" /></div>
                <div><label className={labelCls}>Αριθμός Κράτησης</label><input className={inputCls} value={travelForm.booking_ref} onChange={e => setTravelForm(f => ({...f, booking_ref: e.target.value}))} /></div>
                <div><label className={labelCls}>Σημειώσεις</label><textarea className={inputCls} rows={2} value={travelForm.notes} onChange={e => setTravelForm(f => ({...f, notes: e.target.value}))} /></div>
              </div>
              <button onClick={() => addTravel.mutate()} disabled={!travelForm.destination_city || !travelForm.departure_date || addTravel.isPending}
                className="w-full mt-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {addTravel.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Pedigree Modal */}
      <AnimatePresence>
        {showPedigreeModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowPedigreeModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-4 bottom-4 z-50 max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Pedigree</h3>
                <button onClick={() => setShowPedigreeModal(false)}><X size={18} className="text-gray-400" /></button>
              </div>
              <div className="space-y-3">
                <div><label className={labelCls}>Αριθμός Εγγραφής</label><input className={inputCls} value={pedigreeForm.registration_number} onChange={e => setPedigreeForm(f => ({...f, registration_number: e.target.value}))} /></div>
                <div><label className={labelCls}>Kennel Club</label><input className={inputCls} value={pedigreeForm.kennel_club} onChange={e => setPedigreeForm(f => ({...f, kennel_club: e.target.value}))} placeholder="π.χ. FCI, AKC" /></div>
                <div><label className={labelCls}>Πατέρας</label><input className={inputCls} value={pedigreeForm.father_name} onChange={e => setPedigreeForm(f => ({...f, father_name: e.target.value}))} /></div>
                <div><label className={labelCls}>Μητέρα</label><input className={inputCls} value={pedigreeForm.mother_name} onChange={e => setPedigreeForm(f => ({...f, mother_name: e.target.value}))} /></div>
                <div><label className={labelCls}>Breeder</label><input className={inputCls} value={pedigreeForm.breeder_name} onChange={e => setPedigreeForm(f => ({...f, breeder_name: e.target.value}))} /></div>
                <div><label className={labelCls}>Επικοινωνία Breeder</label><input className={inputCls} value={pedigreeForm.breeder_contact} onChange={e => setPedigreeForm(f => ({...f, breeder_contact: e.target.value}))} /></div>
                <div><label className={labelCls}>Πιστοποιήσεις (χωρισμένες με κόμμα)</label><input className={inputCls} value={pedigreeForm.certifications} onChange={e => setPedigreeForm(f => ({...f, certifications: e.target.value}))} placeholder="π.χ. HD-A, OFA, CERF" /></div>
                <div><label className={labelCls}>Σημειώσεις</label><textarea className={inputCls} rows={2} value={pedigreeForm.notes} onChange={e => setPedigreeForm(f => ({...f, notes: e.target.value}))} /></div>
              </div>
              <button onClick={() => savePedigree.mutate()} disabled={savePedigree.isPending}
                className="w-full mt-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {savePedigree.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
