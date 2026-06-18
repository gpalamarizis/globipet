import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, Trash2, Edit2, Check, X, Search, ArrowLeft, MapPin, Mail, Package, BadgeCheck
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  grooming: { label: 'Περιποίηση', emoji: '✂️' },
  veterinary: { label: 'Κτηνίατρος', emoji: '🩺' },
  clinic: { label: 'Κλινική', emoji: '🏥' },
  walking: { label: 'Walking', emoji: '🚶' },
  sitting: { label: 'Sitting', emoji: '🏡' },
  boarding: { label: 'Boarding', emoji: '🏨' },
  daycare: { label: 'Daycare', emoji: '☀️' },
  training: { label: 'Εκπαίδευση', emoji: '🎓' },
  transport: { label: 'Μεταφορά', emoji: '🚐' },
  photography: { label: 'Φωτογράφιση', emoji: '📷' },
  insurance: { label: 'Ασφάλιση', emoji: '🛡️' },
  other: { label: 'Άλλο', emoji: '✨' },
}

export default function AdminServicesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'verified' | 'unverified'>('all')
  const [editingService, setEditingService] = useState<any>(null)

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['admin-services'],
    queryFn: () => api.get('/admin/catalog/services').then(r => r.data?.data ?? []),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/catalog/services/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] })
      toast.success('Υπηρεσία διαγράφηκε')
    },
    onError: () => toast.error('Σφάλμα'),
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: any) => api.patch(`/admin/catalog/services/${id}`, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-services'] }),
  })

  const toggleVerified = useMutation({
    mutationFn: ({ id, is_verified }: any) => api.patch(`/admin/catalog/services/${id}`, { is_verified }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-services'] }),
  })

  const filtered = useMemo(() => {
    return services.filter((s: any) => {
      if (filterCategory !== 'all' && s.category !== filterCategory) return false
      if (filterStatus === 'active' && !s.is_active) return false
      if (filterStatus === 'inactive' && s.is_active) return false
      if (filterStatus === 'verified' && !s.is_verified) return false
      if (filterStatus === 'unverified' && s.is_verified) return false
      if (search) {
        const q = search.toLowerCase()
        if (!s.title?.toLowerCase().includes(q) &&
            !s.provider_email?.toLowerCase().includes(q) &&
            !s.city?.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [services, search, filterCategory, filterStatus])

  return (
    <div className="page-container py-8 pb-24 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin" className="btn-ghost p-2"><ArrowLeft size={18}/></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 size={22}/> Υπηρεσίες παρόχων
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Διαχείριση όλων των υπηρεσιών στην πλατφόρμα</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex items-center gap-2 flex-1 input">
          <Search size={14} className="text-gray-400 shrink-0"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Αναζήτηση (όνομα, email, πόλη)..."
            className="flex-1 bg-transparent text-sm outline-none"/>
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input text-sm">
          <option value="all">Όλες οι κατηγορίες</option>
          {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
            <option key={key} value={key}>{val.emoji} {val.label}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="input text-sm">
          <option value="all">Όλα τα status</option>
          <option value="active">Ενεργά</option>
          <option value="inactive">Ανενεργά</option>
          <option value="verified">Επιβεβαιωμένα</option>
          <option value="unverified">Μη επιβεβαιωμένα</option>
        </select>
      </div>

      <div className="card p-4 mb-4 bg-gradient-to-br from-brand-50 to-amber-50 dark:from-brand-900/20 dark:to-amber-900/20 border-brand-100">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          <strong>{filtered.length}</strong> από <strong>{services.length}</strong> υπηρεσίες ·{' '}
          {services.filter((s: any) => s.is_verified).length} επιβεβαιωμένες ·{' '}
          {services.reduce((acc: number, s: any) => acc + (s.packages?.length ?? 0), 0)} συνολικά πακέτα
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-32 w-full"/>)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 size={40} className="mx-auto text-gray-300 mb-3"/>
          <h3 className="font-semibold text-gray-900 dark:text-white">Δεν βρέθηκαν υπηρεσίες</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s: any) => {
            const cat = CATEGORY_LABELS[s.category] || CATEGORY_LABELS.other
            const packagesCount = s.packages?.length ?? 0
            const packagesWithoutPrice = (s.packages || []).filter((p: any) => !p.price || p.price === 0).length
            return (
              <div key={s.id} className={cn('card p-4', !s.is_active && 'opacity-60')}>
                <div className="flex items-start gap-3">
                  <div className="text-3xl shrink-0">{cat.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-gray-900 dark:text-white">{s.title}</h3>
                      {s.is_verified && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
                          <BadgeCheck size={10}/> Επιβεβαιωμένη
                        </span>
                      )}
                      {!s.is_active && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">Ανενεργή</span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700">{cat.label}</span>
                    </div>
                    {s.description && <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1 mt-1">{s.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1"><Mail size={11}/> {s.provider_email}</span>
                      {s.city && <span className="flex items-center gap-1"><MapPin size={11}/> {s.city}</span>}
                      <span className="flex items-center gap-1">
                        <Package size={11}/> {packagesCount} πακέτα
                        {packagesWithoutPrice > 0 && (
                          <span className="text-amber-600"> ({packagesWithoutPrice} χωρίς τιμή)</span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleVerified.mutate({ id: s.id, is_verified: !s.is_verified })}
                      className="btn-ghost p-1.5" title={s.is_verified ? 'Αφαίρεση επιβεβαίωσης' : 'Επιβεβαίωση'}>
                      <BadgeCheck size={14} className={s.is_verified ? 'text-green-600' : 'text-gray-400'}/>
                    </button>
                    <button onClick={() => toggleActive.mutate({ id: s.id, is_active: !s.is_active })}
                      className="btn-ghost p-1.5" title={s.is_active ? 'Απενεργοποίηση' : 'Ενεργοποίηση'}>
                      {s.is_active ? <Check size={14} className="text-green-600"/> : <X size={14} className="text-gray-400"/>}
                    </button>
                    <button onClick={() => setEditingService(s)} className="btn-ghost p-1.5">
                      <Edit2 size={14} className="text-gray-500"/>
                    </button>
                    <button onClick={() => {
                      if (confirm(`Διαγραφή "${s.title}" και ${packagesCount} πακέτων;`)) deleteMutation.mutate(s.id)
                    }} className="btn-ghost p-1.5 hover:bg-red-50">
                      <Trash2 size={14} className="text-red-500"/>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ServiceEditModal
        open={!!editingService}
        onClose={() => setEditingService(null)}
        service={editingService}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-services'] })
          setEditingService(null)
        }}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
function ServiceEditModal({ open, onClose, service, onSaved }: any) {
  const [form, setForm] = useState<any>({})

  useEffect(() => {
    if (service && open) {
      setForm({
        title: service.title || '',
        description: service.description || '',
        category: service.category || 'other',
        city: service.city || '',
        country: service.country || 'GR',
        location: service.location || '',
        home_visits: !!service.home_visits,
        emergency_available: !!service.emergency_available,
        years_experience: service.years_experience || 0,
        specializations: Array.isArray(service.specializations) ? service.specializations.join(', ') : '',
        pet_types: Array.isArray(service.pet_types) ? service.pet_types.join(',') : '',
        languages: Array.isArray(service.languages) ? service.languages.join(',') : 'el,en',
        is_active: service.is_active !== false,
        is_verified: !!service.is_verified,
      })
    }
  }, [service, open])

  const saveMutation = useMutation({
    mutationFn: () => api.patch(`/admin/catalog/services/${service.id}`, form),
    onSuccess: () => { toast.success('Η υπηρεσία ενημερώθηκε'); onSaved() },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Σφάλμα'),
  })

  if (!open || !service) return null

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
          onClick={e => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-modal max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">Επεξεργασία υπηρεσίας</h3>
              <p className="text-xs text-gray-500 mt-0.5">{service.provider_email}</p>
            </div>
            <button onClick={onClose} className="btn-ghost p-2"><X size={18}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Όνομα *</label>
              <input className="input" value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Κατηγορία</label>
                <select className="input" value={form.category || ''} onChange={e => setForm({...form, category: e.target.value})}>
                  {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
                    <option key={key} value={key}>{val.emoji} {val.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Πόλη</label>
                <input className="input" value={form.city || ''} onChange={e => setForm({...form, city: e.target.value})}/>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Περιγραφή</label>
              <textarea rows={3} className="input" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})}/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Διεύθυνση</label>
              <input className="input" value={form.location || ''} onChange={e => setForm({...form, location: e.target.value})}/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Έτη εμπειρίας</label>
              <input type="number" className="input" value={form.years_experience || 0}
                onChange={e => setForm({...form, years_experience: parseInt(e.target.value) || 0})}/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Εξειδικεύσεις (χωρισμένες με κόμμα)</label>
              <input className="input" value={form.specializations || ''} onChange={e => setForm({...form, specializations: e.target.value})}/>
            </div>
            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.home_visits} onChange={e => setForm({...form, home_visits: e.target.checked})}/>
                Κατ' οίκον
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.emergency_available} onChange={e => setForm({...form, emergency_available: e.target.checked})}/>
                Έκτακτα
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})}/>
                Ενεργή
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.is_verified} onChange={e => setForm({...form, is_verified: e.target.checked})}/>
                Επιβεβαιωμένη
              </label>
            </div>
          </div>
          <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex gap-2 justify-end">
            <button onClick={onClose} className="btn-secondary">Άκυρο</button>
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.title} className="btn-primary">
              {saveMutation.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
