import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Camera } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, uploadFile } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

interface Props {
  open: boolean
  onClose: () => void
  editing?: any
}

const species = [
  { value: 'dog', labelKey: 'cmpAddPet.species.dog', emoji: '🐶' },
  { value: 'cat', labelKey: 'cmpAddPet.species.cat', emoji: '🐱' },
  { value: 'bird', labelKey: 'cmpAddPet.species.bird', emoji: '🐦' },
  { value: 'rabbit', labelKey: 'cmpAddPet.species.rabbit', emoji: '🐰' },
  { value: 'fish', labelKey: 'cmpAddPet.species.fish', emoji: '🐟' },
  { value: 'reptile', labelKey: 'cmpAddPet.species.reptile', emoji: '🦎' },
  { value: 'horse', labelKey: 'cmpAddPet.species.horse', emoji: '🐴' },
  { value: 'other', labelKey: 'cmpAddPet.species.other', emoji: '🐾' },
]

// is_sterilized is deliberately a three-way choice, not a checkbox. On a pet
// passport "unknown" is a real answer, and a checkbox would record every
// unanswered case as "not neutered" — the exact false claim the passport used
// to print for every animal.
const emptyForm = { name: '', species: 'dog', breed: '', age: '', weight: '', gender: 'male', color: '', microchip_number: '', image_url: '', is_sterilized: '' }

export default function AddPetModal({ open, onClose, editing }: Props) {
  const { t } = useTranslation()
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
        is_sterilized: editing.is_sterilized === true ? 'yes'
          : editing.is_sterilized === false ? 'no' : '',
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
      toast.success(t('cmpAddPet.photoUploaded'))
    } catch {
      toast.error(t('cmpAddPet.uploadError'))
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
        is_sterilized: form.is_sterilized === 'yes' ? true
          : form.is_sterilized === 'no' ? false : null,
      }
      if (editing) return api.patch(`/pets/${editing.id}`, data)
      return api.post('/pets', data)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-pets'] })
      toast.success(editing ? t('cmpAddPet.updated', { name: form.name }) : t('cmpAddPet.added', { name: form.name }))
      setForm(emptyForm)
      onClose()
    },
    onError: () => toast.error(t('cmpAddPet.saveError')),
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
                {editing ? t('cmpAddPet.editTitle') : t('cmpAddPet.addTitle')}
              </h2>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"><X size={18} /></button>
            </div>

            <div className="space-y-4 flex-1">
              <div className="flex justify-center">
                <div onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-2xl bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-orange-400 transition-colors overflow-hidden">
                  {form.image_url
                    ? <img src={form.image_url} alt={t('cmpAddPet.photoAlt')} className="w-full h-full object-cover"/>
                    : uploading
                      ? <span className="text-xs text-gray-400">{t('cmpAddPet.uploading')}</span>
                      : <Camera size={28} className="text-gray-400"/>
                  }
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload}/>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('cmpAddPet.nameLabel')}</label>
                <input className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-800"
                  placeholder={t('cmpAddPet.namePlaceholder')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('cmpAddPet.speciesLabel')}</label>
                <div className="grid grid-cols-4 gap-2">
                  {species.map(s => (
                    <button key={s.value} type="button" onClick={() => setForm(f => ({ ...f, species: s.value }))}
                      className={`p-2 rounded-xl border text-center transition-all ${form.species === s.value ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'}`}>
                      <span className="text-xl block">{s.emoji}</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{t(s.labelKey)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[['breed',t('cmpAddPet.breed'),t('cmpAddPet.breedPlaceholder')],['color',t('cmpAddPet.color'),t('cmpAddPet.colorPlaceholder')]].map(([k,l,p]) => (
                  <div key={k}>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{l}</label>
                    <input className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-800"
                      placeholder={p} value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                  </div>
                ))}
                {[['age',t('cmpAddPet.age'),t('cmpAddPet.agePlaceholder')],['weight',t('cmpAddPet.weight'),t('cmpAddPet.weightPlaceholder')]].map(([k,l,p]) => (
                  <div key={k}>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{l}</label>
                    <input type="number" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-800"
                      placeholder={p} value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('cmpAddPet.gender')}</label>
                <div className="flex gap-2">
                  {[{ v: 'male', l: t('cmpAddPet.male') }, { v: 'female', l: t('cmpAddPet.female') }].map(g => (
                    <button key={g.v} type="button" onClick={() => setForm(f => ({ ...f, gender: g.v }))}
                      className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${form.gender === g.v ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700' : 'border-gray-200 dark:border-gray-700'}`}>
                      {g.l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('cmpAddPet.sterilized')}</label>
                <div className="flex gap-2">
                  {[{ v: 'yes', l: t('common.yes') }, { v: 'no', l: t('common.no') }, { v: '', l: t('cmpAddPet.unknown') }].map(o => (
                    <button key={o.v || 'unknown'} type="button" onClick={() => setForm(f => ({ ...f, is_sterilized: o.v }))}
                      className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${form.is_sterilized === o.v ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700' : 'border-gray-200 dark:border-gray-700'}`}>
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('cmpAddPet.microchip')}</label>
                <input className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-800"
                  placeholder={t('cmpAddPet.microchipPlaceholder')} value={form.microchip_number} onChange={e => setForm(f => ({ ...f, microchip_number: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium">{t('common.cancel')}</button>
              <button onClick={() => savePet.mutate()} disabled={!form.name || savePet.isPending}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium disabled:opacity-50">
                {savePet.isPending ? t('cmpAddPet.saving') : editing ? t('cmpAddPet.update') : t('common.add')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
