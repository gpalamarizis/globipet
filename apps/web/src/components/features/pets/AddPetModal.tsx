import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Camera } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, uploadFile } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  editing?: any
}

const species = [
  { value: 'dog', label: 'Σκύλος', emoji: '🐶' },
  { value: 'cat', label: 'Γάτα', emoji: '🐱' },
  { value: 'bird', label: 'Πτηνό', emoji: '🐦' },
  { value: 'rabbit', label: 'Κουνέλι', emoji: '🐰' },
  { value: 'fish', label: 'Ψάρι', emoji: '🐟' },
  { value: 'reptile', label: 'Ερπετό', emoji: '🦎' },
  { value: 'horse', label: 'Άλογο', emoji: '🐴' },
  { value: 'other', label: 'Άλλο', emoji: '🐾' },
]

const emptyForm = { name: '', species: 'dog', breed: '', age: '', weight: '', gender: 'male', color: '', microchip_number: '', image_url: '' }

export default function AddPetModal({ open, onClose, editing }: Props) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(emptyForm)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        name: editing.name || '',
        species: editing.species || 'dog',
        breed: editing.breed || '',
        age: editing.age != null ? String(editing.age) : '',
        weight: editing.weight != null ? String(editing.weight) : '',
        gender: editing.gender || 'male',
        color: editing.color || '',
        microchip_number: editing.microchip_number || '',
        image_url: editing.image_url || '',
      })
    } else {
      setForm(emptyForm)
    }
  }, [open, editing])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadFile(file, 'pets')
      setForm(f => ({ ...f, image_url: url }))
      toast.success('Φωτογραφία ανέβηκε!')
    } catch {
      toast.error('Σφάλμα κατά το upload')
    } finally {
      setUploading(false)
    }
  }

  const savePet = useMutation({
    mutationFn: () => {
      const data = {
        name: form.name,
        species: form.species,
        breed: form.breed || null,
        age: form.age ? Number(form.age) : null,
        weight: form.weight ? Number(form.weight) : null,
        gender: form.gender,
        color: form.color || null,
        microchip_number: form.microchip_number || null,
        image_url: form.image_url || null,
      }
      if (editing) return api.patch(`/pets/${editing.id}`, data)
      return api.post('/pets', data)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-pets'] })
      toast.success(editing ? `${form.name} ενημερώθηκε!` : `${form.name} προστέθηκε!`)
      setForm(emptyForm)
      onClose()
    },
    onError: () => toast.error('Σφάλμα κατά την αποθήκευση'),
  })

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed inset-x-4 top-4 bottom-4 z-50 max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-y-auto flex flex-col p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editing ? 'Επεξεργασία κατοικίδιου' : 'Προσθήκη κατοικίδιου'}
              </h2>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"><X size={18} /></button>
            </div>

            <div className="space-y-4 flex-1">
              <div className="flex justify-center">
                <div onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-2xl bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-orange-400 transition-colors overflow-hidden">
                  {form.image_url
                    ? <img src={form.image_url} alt="pet" className="w-full h-full object-cover"/>
                    : uploading
                      ? <span className="text-xs text-gray-400">Ανέβασμα...</span>
                      : <Camera size={28} className="text-gray-400"/>
                  }
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload}/>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Όνομα *</label>
                <input className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-800"
                  placeholder="π.χ. Ρέξ" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Είδος *</label>
                <div className="grid grid-cols-4 gap-2">
                  {species.map(s => (
                    <button key={s.value} type="button" onClick={() => setForm(f => ({ ...f, species: s.value }))}
                      className={`p-2 rounded-xl border text-center transition-all ${form.species === s.value ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'}`}>
                      <span className="text-xl block">{s.emoji}</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[['breed','Ράτσα','π.χ. Labrador'],['color','Χρώμα','π.χ. Καφέ']].map(([k,l,p]) => (
                  <div key={k}>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{l}</label>
                    <input className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-800"
                      placeholder={p} value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                  </div>
                ))}
                {[['age','Ηλικία (έτη)','π.χ. 3'],['weight','Βάρος (kg)','π.χ. 25']].map(([k,l,p]) => (
                  <div key={k}>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{l}</label>
                    <input type="number" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-800"
                      placeholder={p} value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Φύλο</label>
                <div className="flex gap-2">
                  {[{ v: 'male', l: '♂ Αρσενικό' }, { v: 'female', l: '♀ Θηλυκό' }].map(g => (
                    <button key={g.v} type="button" onClick={() => setForm(f => ({ ...f, gender: g.v }))}
                      className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${form.gender === g.v ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700' : 'border-gray-200 dark:border-gray-700'}`}>
                      {g.l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Αριθμός Microchip</label>
                <input className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-800"
                  placeholder="15 ψηφία" value={form.microchip_number} onChange={e => setForm(f => ({ ...f, microchip_number: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium">Ακύρωση</button>
              <button onClick={() => savePet.mutate()} disabled={!form.name || savePet.isPending}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium disabled:opacity-50">
                {savePet.isPending ? 'Αποθήκευση...' : editing ? 'Ενημέρωση' : 'Προσθήκη'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
