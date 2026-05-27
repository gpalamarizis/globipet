import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { X, PawPrint, Save } from 'lucide-react'
import ImageUploadField from '@/components/admin/ImageUploadField'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  service?: any
}

const SERVICE_TYPES = [
  { value: 'veterinary',  label: 'Κτηνιατρείο 🩺' },
  { value: 'grooming',    label: 'Grooming ✂️' },
  { value: 'training',    label: 'Εκπαίδευση 🎓' },
  { value: 'pet_sitting', label: 'Pet Sitting 🏠' },
  { value: 'walking',     label: 'Βόλτα 🚶' },
  { value: 'boarding',    label: 'Φιλοξενία 🛏️' },
  { value: 'pet_taxi',    label: 'Pet Taxi 🚕' },
  { value: 'photography', label: 'Φωτογράφηση 📸' },
  { value: 'pharmacy',    label: 'Φαρμακείο 💊' },
]

const SPECIES = ['dog', 'cat', 'bird', 'rabbit', 'fish', 'reptile', 'horse']
const LANGUAGES = ['el', 'en', 'es', 'fr', 'zh']
const DAYS = [{n:1,l:'Δευ'},{n:2,l:'Τρι'},{n:3,l:'Τετ'},{n:4,l:'Πεμ'},{n:5,l:'Παρ'},{n:6,l:'Σαβ'},{n:7,l:'Κυρ'}]

export default function ServiceFormModal({ open, onClose, service }: Props) {
  const queryClient = useQueryClient()
  const isEdit = !!service?.id

  const [form, setForm] = useState({
    provider_name: '', provider_email: '', service_type: 'veterinary',
    description: '', price: '', city: '', location: '',
    contact_phone: '', contact_email: '', image_url: '',
    years_experience: '', home_visits: false, emergency_available: false,
    is_verified: false,
    specializations: '', pet_types: [] as string[],
    languages: ['el'] as string[],
    available_days: [1,2,3,4,5] as number[],
  })

  useEffect(() => {
    if (service) {
      setForm({
        provider_name: service.provider_name || '',
        provider_email: service.provider_email || '',
        service_type: service.service_type || 'veterinary',
        description: service.description || '',
        price: String(service.price || ''),
        city: service.city || '',
        location: service.location || '',
        contact_phone: service.contact_phone || '',
        contact_email: service.contact_email || '',
        image_url: service.image_url || '',
        years_experience: String(service.years_experience || ''),
        home_visits: !!service.home_visits,
        emergency_available: !!service.emergency_available,
        is_verified: !!service.is_verified,
        specializations: (service.specializations || []).join(','),
        pet_types: service.pet_types || [],
        languages: service.languages?.length ? service.languages : ['el'],
        available_days: service.available_days?.length ? service.available_days : [1,2,3,4,5],
      })
    } else {
      setForm({
        provider_name: '', provider_email: '', service_type: 'veterinary',
        description: '', price: '', city: '', location: '',
        contact_phone: '', contact_email: '', image_url: '',
        years_experience: '', home_visits: false, emergency_available: false,
        is_verified: false,
        specializations: '', pet_types: [],
        languages: ['el'], available_days: [1,2,3,4,5],
      })
    }
  }, [service, open])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const save = useMutation({
    mutationFn: () => {
      const data: any = {
        provider_name: form.provider_name,
        provider_email: form.provider_email,
        service_type: form.service_type,
        description: form.description,
        price: parseFloat(form.price) || 0,
        city: form.city,
        location: form.location || undefined,
        contact_phone: form.contact_phone || undefined,
        contact_email: form.contact_email || undefined,
        image_url: form.image_url || undefined,
        home_visits: form.home_visits,
        emergency_available: form.emergency_available,
        is_verified: form.is_verified,
        specializations: form.specializations.split(',').map(s => s.trim()).filter(Boolean),
        pet_types: form.pet_types,
        languages: form.languages,
        available_days: form.available_days,
      }
      if (form.years_experience) data.years_experience = parseInt(form.years_experience)
      return isEdit
        ? api.patch(`/services/${service.id}`, data)
        : api.post('/services', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] })
      toast.success(isEdit ? 'Η υπηρεσία ενημερώθηκε' : 'Η υπηρεσία προστέθηκε')
      onClose()
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Σφάλμα'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.provider_name.trim()) return toast.error('Το όνομα παρόχου είναι υποχρεωτικό')
    if (!form.provider_email.trim()) return toast.error('Το email παρόχου είναι υποχρεωτικό')
    if (!form.city.trim()) return toast.error('Η πόλη είναι υποχρεωτική')
    save.mutate()
  }

  const toggle = <K extends keyof typeof form>(key: K, value: any) => {
    const arr = form[key] as any[]
    setForm({...form, [key]: arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value]})
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <PawPrint size={20} className="text-brand-900" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {isEdit ? 'Επεξεργασία Υπηρεσίας' : 'Νέα Υπηρεσία'}
                </h3>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X size={18}/></button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Όνομα Παρόχου *</label>
                  <input className="input" value={form.provider_name} onChange={e => setForm({...form, provider_name: e.target.value})} required autoFocus />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Email Παρόχου *</label>
                  <input type="email" className="input" value={form.provider_email} onChange={e => setForm({...form, provider_email: e.target.value})} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Τύπος Υπηρεσίας *</label>
                  <select className="input" value={form.service_type} onChange={e => setForm({...form, service_type: e.target.value})}>
                    {SERVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Τιμή (€)</label>
                  <input type="number" step="0.01" className="input" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Περιγραφή</label>
                <textarea className="input resize-none" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Πόλη *</label>
                  <input className="input" value={form.city} onChange={e => setForm({...form, city: e.target.value})} required />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Διεύθυνση</label>
                  <input className="input" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Τηλέφωνο</label>
                  <input className="input" value={form.contact_phone} onChange={e => setForm({...form, contact_phone: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Email Επικοινωνίας</label>
                  <input type="email" className="input" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Είδη ζώων</label>
                <div className="flex flex-wrap gap-2">
                  {SPECIES.map(s => (
                    <button key={s} type="button" onClick={() => toggle('pet_types', s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                        form.pet_types.includes(s) ? 'bg-brand-900 text-white border-brand-900' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600'
                      }`}>{s}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Γλώσσες</label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map(l => (
                    <button key={l} type="button" onClick={() => toggle('languages', l)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border uppercase ${
                        form.languages.includes(l) ? 'bg-brand-900 text-white border-brand-900' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600'
                      }`}>{l}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Ημέρες λειτουργίας</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(d => (
                    <button key={d.n} type="button" onClick={() => toggle('available_days', d.n)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                        form.available_days.includes(d.n) ? 'bg-brand-900 text-white border-brand-900' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600'
                      }`}>{d.l}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Ειδικότητες (comma-separated)</label>
                <input className="input" placeholder="surgery, dental, cardiology" value={form.specializations} onChange={e => setForm({...form, specializations: e.target.value})} />
              </div>

              <ImageUploadField
                label="Εικόνα υπηρεσίας"
                value={form.image_url}
                onChange={(url) => setForm({...form, image_url: url})}
                folder="services"
              />

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Έτη Εμπειρίας</label>
                <input type="number" className="input" value={form.years_experience} onChange={e => setForm({...form, years_experience: e.target.value})} />
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4" checked={form.home_visits} onChange={e => setForm({...form, home_visits: e.target.checked})} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Κατ' οίκον</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4" checked={form.emergency_available} onChange={e => setForm({...form, emergency_available: e.target.checked})} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Έκτακτα</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4" checked={form.is_verified} onChange={e => setForm({...form, is_verified: e.target.checked})} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Επαληθευμένος</span>
                </label>
              </div>
            </form>

            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100 dark:border-gray-800">
              <button onClick={onClose} className="btn-secondary">Ακύρωση</button>
              <button onClick={handleSubmit} disabled={save.isPending} className="btn-primary flex items-center gap-2">
                <Save size={16}/>{save.isPending ? 'Αποθήκευση...' : (isEdit ? 'Ενημέρωση' : 'Δημιουργία')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
