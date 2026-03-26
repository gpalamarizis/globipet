import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Camera } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
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

export default function AddPetModal({ open, onClose }: Props) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    name: '', species: 'dog', breed: '', age: '', weight: '',
    gender: 'male', color: '', microchip_number: '',
  })

  const addPet = useMutation({
    mutationFn: () => api.post('/pets', {
      ...form,
      age: form.age ? Number(form.age) : undefined,
      weight: form.weight ? Number(form.weight) : undefined,
      owner_email: user?.email,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-pets'] })
      toast.success(`${form.name} προστέθηκε!`)
      onClose()
      setForm({ name: '', species: 'dog', breed: '', age: '', weight: '', gender: 'male', color: '', microchip_number: '' })
    },
    onError: () => toast.error('Σφάλμα κατά την προσθήκη'),
  })

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-lg mx-auto card p-6 shadow-modal max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Προσθήκη κατοικίδιου</h2>
              <button onClick={onClose} className="btn-ghost p-2"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Όνομα *</label>
                <input className="input" placeholder="π.χ. Ρέξ" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Είδος *</label>
                <div className="grid grid-cols-4 gap-2">
                  {species.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, species: s.value }))}
                      className={`p-2 rounded-xl border text-center transition-all ${form.species === s.value ? 'border-brand-900 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-brand-300'}`}
                    >
                      <span className="text-xl block">{s.emoji}</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Ράτσα</label>
                  <input className="input" placeholder="π.χ. Labrador" value={form.breed} onChange={e => setForm(f => ({ ...f, breed: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Χρώμα</label>
                  <input className="input" placeholder="π.χ. Καφέ" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Ηλικία (έτη)</label>
                  <input className="input" type="number" placeholder="π.χ. 3" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Βάρος (kg)</label>
                  <input className="input" type="number" placeholder="π.χ. 25" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Φύλο</label>
                <div className="flex gap-2">
                  {[{ v: 'male', l: '♂ Αρσενικό' }, { v: 'female', l: '♀ Θηλυκό' }].map(g => (
                    <button key={g.v} type="button" onClick={() => setForm(f => ({ ...f, gender: g.v }))}
                      className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${form.gender === g.v ? 'border-brand-900 bg-brand-50 dark:bg-brand-900/20 text-brand-900 dark:text-brand-400' : 'border-gray-200 dark:border-gray-700'}`}>
                      {g.l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Αριθμός Microchip</label>
                <input className="input" placeholder="15 ψηφία" value={form.microchip_number} onChange={e => setForm(f => ({ ...f, microchip_number: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={onClose} className="btn-secondary flex-1">Ακύρωση</button>
              <button
                onClick={() => addPet.mutate()}
                disabled={!form.name || addPet.isPending}
                className="btn-primary flex-1"
              >
                {addPet.isPending ? 'Αποθήκευση...' : 'Προσθήκη'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
