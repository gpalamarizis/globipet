import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronRight,
  Sparkles, Clock, Search, Settings, Building2
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const GROUP_META: Record<string, { label: string; color: string; emoji: string }> = {
  bathing:      { label: 'Μπάνιο',           color: 'bg-sky-50 text-sky-700 border-sky-200',           emoji: '🛁' },
  haircut:      { label: 'Κούρεμα',          color: 'bg-purple-50 text-purple-700 border-purple-200', emoji: '✂️' },
  addon:        { label: 'Extras (à la carte)', color: 'bg-amber-50 text-amber-700 border-amber-200',  emoji: '✨' },
  consultation: { label: 'Επισκέψεις',       color: 'bg-blue-50 text-blue-700 border-blue-200',       emoji: '🩺' },
  vaccination:  { label: 'Εμβολιασμοί',      color: 'bg-emerald-50 text-emerald-700 border-emerald-200', emoji: '💉' },
  surgery:      { label: 'Χειρουργικές',     color: 'bg-rose-50 text-rose-700 border-rose-200',       emoji: '🏥' },
  dental:       { label: 'Οδοντιατρικά',     color: 'bg-cyan-50 text-cyan-700 border-cyan-200',       emoji: '🦷' },
  diagnostics:  { label: 'Διαγνωστικά',      color: 'bg-indigo-50 text-indigo-700 border-indigo-200', emoji: '🔬' },
  specialty:    { label: 'Ειδικότητες',      color: 'bg-violet-50 text-violet-700 border-violet-200', emoji: '👨‍⚕️' },
  oncology:     { label: 'Ογκολογία',        color: 'bg-pink-50 text-pink-700 border-pink-200',       emoji: '🎗️' },
  service:      { label: 'Υπηρεσίες',        color: 'bg-teal-50 text-teal-700 border-teal-200',       emoji: '🐕' },
  emergency:    { label: 'Έκτακτα',          color: 'bg-red-50 text-red-700 border-red-200',          emoji: '🚨' },
  other:        { label: 'Άλλα',             color: 'bg-gray-50 text-gray-700 border-gray-200',       emoji: '📋' },
}
const SIZE_LABELS: Record<string, string> = { small: 'Μικρό', medium: 'Μεσαίο', large: 'Μεγάλο', xlarge: 'Πολύ μεγάλο' }
const MODALITY_LABELS: Record<string, string> = {
  in_clinic: 'Στο ιατρείο', home_visit: 'Κατ\' οίκον', telehealth: 'Τηλεσυμβ.', emergency: 'Έκτακτο'
}
const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  grooming:    { label: 'Grooming',           emoji: '✂️' },
  veterinary:  { label: 'Κτηνίατρος',          emoji: '🩺' },
  clinic:      { label: 'Κτηνιατρική κλινική', emoji: '🏥' },
  walking:     { label: 'Dog walking',         emoji: '🚶' },
  sitting:     { label: 'Pet sitting',         emoji: '🏡' },
  boarding:    { label: 'Boarding',            emoji: '🏨' },
  daycare:     { label: 'Daycare',             emoji: '☀️' },
  training:    { label: 'Εκπαίδευση',           emoji: '🎓' },
  transport:   { label: 'Μεταφορά',             emoji: '🚐' },
  photography: { label: 'Φωτογράφιση',           emoji: '📷' },
  other:       { label: 'Άλλο',                emoji: '✨' },
}

export default function ProviderPackagesPage() {
  const queryClient = useQueryClient()
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
  const [showPresetModal, setShowPresetModal] = useState(false)
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [showServiceEditModal, setShowServiceEditModal] = useState(false)
  const [showNewServiceModal, setShowNewServiceModal] = useState(false)
  const [editingPackage, setEditingPackage] = useState<any>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['provider-packages'],
    queryFn: () => api.get('/packages/my').then(r => r.data?.data ?? []),
  })

  const activeService = useMemo(() => {
    if (selectedServiceId) return services.find((s: any) => s.id === selectedServiceId)
    return services[0]
  }, [services, selectedServiceId])

  const deletePackage = useMutation({
    mutationFn: (id: string) => api.delete(`/packages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-packages'] })
      toast.success('Πακέτο διαγράφηκε')
    },
    onError: () => toast.error('Σφάλμα διαγραφής'),
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: any) => api.patch(`/packages/${id}`, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['provider-packages'] }),
  })

  const deleteService = useMutation({
    mutationFn: (id: string) => api.delete(`/packages/services/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-packages'] })
      toast.success('Η υπηρεσία διαγράφηκε')
      setSelectedServiceId(null)
    },
    onError: () => toast.error('Σφάλμα διαγραφής'),
  })

  const groupedPackages = useMemo(() => {
    if (!activeService) return {}
    const grouped: Record<string, any[]> = {}
    for (const pkg of activeService.packages || []) {
      if (!grouped[pkg.group]) grouped[pkg.group] = []
      grouped[pkg.group].push(pkg)
    }
    return grouped
  }, [activeService])

  const totalCount = activeService?.packages?.length ?? 0

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      next.has(group) ? next.delete(group) : next.add(group)
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="page-container py-8">
        <div className="skeleton h-12 w-64 mb-6"/>
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="skeleton h-20 w-full"/>)}</div>
      </div>
    )
  }

  // Empty state — no services yet
  if (services.length === 0) {
    return (
      <div className="page-container py-16 text-center">
        <Package size={48} className="mx-auto text-gray-300 mb-4"/>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Δεν έχετε υπηρεσίες ακόμα</h2>
        <p className="text-gray-500 mb-4">Δημιουργήστε την πρώτη σας υπηρεσία για να ξεκινήσετε</p>
        <button onClick={() => setShowNewServiceModal(true)} className="btn-primary inline-flex items-center gap-2">
          <Plus size={15}/> Δημιουργία υπηρεσίας
        </button>
        <NewServiceModal
          open={showNewServiceModal}
          onClose={() => setShowNewServiceModal(false)}
          onCreated={(id) => {
            queryClient.invalidateQueries({ queryKey: ['provider-packages'] })
            setShowNewServiceModal(false)
            setSelectedServiceId(id)
          }}
        />
      </div>
    )
  }

  return (
    <div className="page-container py-8 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Πακέτα υπηρεσιών</h1>
          <p className="text-sm text-gray-500 mt-1">Διαχειριστείτε τις υπηρεσίες, τις τιμές και τις παραλλαγές σας</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowNewServiceModal(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <Building2 size={15}/> Νέα υπηρεσία
          </button>
          <button onClick={() => setShowPresetModal(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <Sparkles size={15}/> Φόρτωση από κατάλογο
          </button>
          <button onClick={() => { setEditingPackage(null); setShowCustomModal(true) }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={15}/> Νέο πακέτο
          </button>
        </div>
      </div>

      {/* Service selector tabs */}
      {services.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {services.map((s: any) => {
            const cat = CATEGORY_LABELS[s.category] || CATEGORY_LABELS.other
            const isActive = (selectedServiceId || services[0]?.id) === s.id
            return (
              <button key={s.id} onClick={() => setSelectedServiceId(s.id)}
                className={cn('px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border-2 flex items-center gap-2',
                  isActive
                    ? 'border-brand-900 bg-brand-50 text-brand-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                )}>
                <span>{cat.emoji}</span>
                <span>{s.title}</span>
                <span className="text-xs opacity-60">({s.packages?.length ?? 0})</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Service summary card with edit/delete */}
      {activeService && (
        <div className="card p-5 mb-6 bg-gradient-to-br from-brand-50 to-amber-50 dark:from-brand-900/20 dark:to-amber-900/20 border-brand-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="text-3xl shrink-0">{CATEGORY_LABELS[activeService.category]?.emoji || '✨'}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-brand-700 uppercase tracking-wide">
                  {CATEGORY_LABELS[activeService.category]?.label || activeService.category}
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5 truncate">{activeService.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalCount} πακέτα · {Object.keys(groupedPackages).length} κατηγορίες · {(activeService.packages || []).filter((p: any) => p.is_active).length} ενεργά
                  {activeService.city && ` · 📍 ${activeService.city}`}
                </p>
                {activeService.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{activeService.description}</p>
                )}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => setShowServiceEditModal(true)}
                className="btn-ghost p-2 hover:bg-white/50" title="Επεξεργασία υπηρεσίας">
                <Settings size={16} className="text-gray-700"/>
              </button>
              <button
                onClick={() => {
                  if (confirm(`Διαγραφή υπηρεσίας "${activeService.title}" και όλων των πακέτων της;`)) {
                    deleteService.mutate(activeService.id)
                  }
                }}
                className="btn-ghost p-2 hover:bg-red-50" title="Διαγραφή υπηρεσίας">
                <Trash2 size={16} className="text-red-500"/>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty packages */}
      {totalCount === 0 ? (
        <div className="card p-12 text-center">
          <Package size={40} className="mx-auto text-gray-300 mb-3"/>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Δεν έχετε πακέτα σε αυτή την υπηρεσία</h3>
          <p className="text-sm text-gray-500 mb-4">Ξεκινήστε γρήγορα με τον προτεινόμενο κατάλογο της κατηγορίας σας</p>
          <button onClick={() => setShowPresetModal(true)} className="btn-primary inline-flex items-center gap-2">
            <Sparkles size={15}/> Φόρτωση προτεινόμενων
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedPackages).map(([group, items]) => {
            const meta = GROUP_META[group] || GROUP_META.other
            const isCollapsed = collapsedGroups.has(group)
            return (
              <div key={group} className="card overflow-hidden">
                <button onClick={() => toggleGroup(group)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{meta.emoji}</span>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{meta.label}</h3>
                      <p className="text-xs text-gray-500">{items.length} πακέτα · από €{Math.min(...items.map((i: any) => i.price)).toFixed(2)}</p>
                    </div>
                  </div>
                  {isCollapsed ? <ChevronRight size={18} className="text-gray-400"/> : <ChevronDown size={18} className="text-gray-400"/>}
                </button>

                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-gray-100 dark:border-gray-800">
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {items.map((pkg: any) => (
                          <div key={pkg.id} className={cn('p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/30',
                            !pkg.is_active && 'opacity-50')}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm text-gray-900 dark:text-white">{pkg.name}</p>
                                {pkg.size && <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', meta.color, 'border')}>{SIZE_LABELS[pkg.size]}</span>}
                                {pkg.modality && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200">{MODALITY_LABELS[pkg.modality] || pkg.modality}</span>}
                                {pkg.pet_type && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-orange-50 text-orange-700 border border-orange-200">{pkg.pet_type === 'dog' ? '🐕' : pkg.pet_type === 'cat' ? '🐈' : '🐾'} {pkg.pet_type}</span>}
                                {pkg.is_addon && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200">Add-on</span>}
                                {!pkg.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">Ανενεργό</span>}
                              </div>
                              {pkg.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{pkg.description}</p>}
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                <span className="flex items-center gap-1"><Clock size={11}/> {pkg.duration_minutes}΄</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-lg text-gray-900 dark:text-white">€{pkg.price.toFixed(2)}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => toggleActive.mutate({ id: pkg.id, is_active: !pkg.is_active })}
                                className="btn-ghost p-1.5" title={pkg.is_active ? 'Απενεργοποίηση' : 'Ενεργοποίηση'}>
                                {pkg.is_active ? <Check size={14} className="text-green-600"/> : <X size={14} className="text-gray-400"/>}
                              </button>
                              <button onClick={() => { setEditingPackage(pkg); setShowCustomModal(true) }}
                                className="btn-ghost p-1.5" title="Επεξεργασία">
                                <Edit2 size={14} className="text-gray-500"/>
                              </button>
                              <button onClick={() => { if (confirm(`Διαγραφή "${pkg.name}";`)) deletePackage.mutate(pkg.id) }}
                                className="btn-ghost p-1.5 hover:bg-red-50" title="Διαγραφή">
                                <Trash2 size={14} className="text-red-500"/>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      <PresetCatalogModal
        open={showPresetModal}
        onClose={() => setShowPresetModal(false)}
        serviceId={activeService?.id}
        category={activeService?.category}
        onImported={() => { queryClient.invalidateQueries({ queryKey: ['provider-packages'] }); setShowPresetModal(false) }}
      />
      <CustomPackageModal
        open={showCustomModal}
        onClose={() => { setShowCustomModal(false); setEditingPackage(null) }}
        serviceId={activeService?.id}
        editing={editingPackage}
        onSaved={() => { queryClient.invalidateQueries({ queryKey: ['provider-packages'] }); setShowCustomModal(false); setEditingPackage(null) }}
      />
      <ServiceEditModal
        open={showServiceEditModal}
        onClose={() => setShowServiceEditModal(false)}
        service={activeService}
        onSaved={() => { queryClient.invalidateQueries({ queryKey: ['provider-packages'] }); setShowServiceEditModal(false) }}
      />
      <NewServiceModal
        open={showNewServiceModal}
        onClose={() => setShowNewServiceModal(false)}
        onCreated={(id) => {
          queryClient.invalidateQueries({ queryKey: ['provider-packages'] })
          setShowNewServiceModal(false)
          setSelectedServiceId(id)
        }}
      />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Modal: Edit existing service
// ──────────────────────────────────────────────────────────────
function ServiceEditModal({ open, onClose, service, onSaved }: any) {
  const [form, setForm] = useState<any>({})

  useEffect(() => {
    if (service && open) {
      setForm({
        title: service.title || '',
        description: service.description || '',
        city: service.city || '',
        country: service.country || 'GR',
        location: service.location || '',
        home_visits: !!service.home_visits,
        emergency_available: !!service.emergency_available,
        years_experience: service.years_experience || 0,
        specializations: Array.isArray(service.specializations) ? service.specializations.join(', ') : (service.specializations || ''),
        pet_types: Array.isArray(service.pet_types) ? service.pet_types.join(',') : (service.pet_types || ''),
        languages: Array.isArray(service.languages) ? service.languages.join(',') : (service.languages || 'el,en'),
        is_active: service.is_active !== false,
      })
    }
  }, [service, open])

  const saveMutation = useMutation({
    mutationFn: () => api.patch(`/packages/services/${service.id}`, form),
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
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings size={18}/> Επεξεργασία υπηρεσίας
            </h3>
            <button onClick={onClose} className="btn-ghost p-2"><X size={18}/></button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Όνομα υπηρεσίας *</label>
              <input className="input" value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Περιγραφή</label>
              <textarea rows={3} className="input" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Πόλη</label>
                <input className="input" value={form.city || ''} onChange={e => setForm({...form, city: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Χώρα</label>
                <select className="input" value={form.country || 'GR'} onChange={e => setForm({...form, country: e.target.value})}>
                  <option value="GR">Ελλάδα</option>
                  <option value="CY">Κύπρος</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Διεύθυνση</label>
              <input className="input" value={form.location || ''} onChange={e => setForm({...form, location: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Έτη εμπειρίας</label>
              <input type="number" className="input" value={form.years_experience || 0} onChange={e => setForm({...form, years_experience: parseInt(e.target.value) || 0})} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Εξειδικεύσεις (χωρισμένες με κόμμα)</label>
              <input className="input" value={form.specializations || ''} onChange={e => setForm({...form, specializations: e.target.value})}
                placeholder="κουρά, μπάνιο, ξεκοτσίδωμα"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Τύποι κατοικιδίων</label>
                <input className="input" value={form.pet_types || ''} onChange={e => setForm({...form, pet_types: e.target.value})}
                  placeholder="dog,cat,bird"/>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Γλώσσες</label>
                <input className="input" value={form.languages || ''} onChange={e => setForm({...form, languages: e.target.value})}
                  placeholder="el,en"/>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.home_visits} onChange={e => setForm({...form, home_visits: e.target.checked})}/>
                Κατ' οίκον επισκέψεις
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.emergency_available} onChange={e => setForm({...form, emergency_available: e.target.checked})}/>
                Διαθέσιμος για έκτακτα
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})}/>
                Ενεργή υπηρεσία
              </label>
            </div>
          </div>

          <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex gap-2 justify-end">
            <button onClick={onClose} className="btn-secondary">Άκυρο</button>
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.title}
              className="btn-primary">
              {saveMutation.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ──────────────────────────────────────────────────────────────
// Modal: Create new service
// ──────────────────────────────────────────────────────────────
function NewServiceModal({ open, onClose, onCreated }: any) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [category, setCategory] = useState<string>('')
  const [form, setForm] = useState<any>({
    title: '', description: '', city: '', country: 'GR', location: '',
    home_visits: false, emergency_available: false, years_experience: 0,
  })
  const [selectedPresets, setSelectedPresets] = useState<Set<number>>(new Set())
  const [presetSearch, setPresetSearch] = useState('')

  useEffect(() => {
    if (!open) {
      setStep(1)
      setCategory('')
      setForm({ title: '', description: '', city: '', country: 'GR', location: '',
        home_visits: false, emergency_available: false, years_experience: 0 })
      setSelectedPresets(new Set())
      setPresetSearch('')
    }
  }, [open])

  const { data: presets = [], isLoading: presetsLoading } = useQuery({
    queryKey: ['catalog-preset-new', category],
    queryFn: () => category ? api.get(`/catalog/preset/${category}`).then(r => r.data?.data ?? []) : Promise.resolve([]),
    enabled: !!category && step === 3,
  })

  const filtered = presets.filter((p: any) =>
    !presetSearch || p.name.toLowerCase().includes(presetSearch.toLowerCase()))

  const createService = useMutation({
    mutationFn: () => api.post('/packages/setup', {
      category,
      title: form.title,
      description: form.description,
      city: form.city,
      country: form.country,
      location: form.location,
      home_visits: form.home_visits,
      emergency_available: form.emergency_available,
      years_experience: form.years_experience,
      preset_keys: Array.from(selectedPresets),
    }),
    onSuccess: (res: any) => {
      toast.success('🎉 Νέα υπηρεσία δημιουργήθηκε')
      onCreated(res.data.service?.id)
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Σφάλμα δημιουργίας'),
  })

  const handleNext = () => {
    if (step === 1) {
      if (!category) return toast.error('Επέλεξε κατηγορία')
      setStep(2)
    } else if (step === 2) {
      if (!form.title) return toast.error('Δώσε όνομα στην υπηρεσία')
      setStep(3)
    } else {
      createService.mutate()
    }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
          onClick={e => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-modal max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">

          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 size={18}/> Νέα υπηρεσία
              </h3>
              <div className="flex items-center gap-1 mt-2">
                {[1,2,3].map(n => (
                  <div key={n} className="flex items-center">
                    <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold',
                      step >= n ? 'bg-brand-900 text-white' : 'bg-gray-200 text-gray-400')}>
                      {step > n ? <Check size={10}/> : n}
                    </div>
                    {n < 3 && <div className={cn('w-8 h-0.5 mx-1', step > n ? 'bg-brand-900' : 'bg-gray-200')}/>}
                  </div>
                ))}
              </div>
            </div>
            <button onClick={onClose} className="btn-ghost p-2"><X size={18}/></button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {/* Step 1: Category */}
            {step === 1 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
                  <button key={key} onClick={() => setCategory(key)}
                    className={cn('p-4 rounded-xl border-2 text-left transition-all',
                      category === key
                        ? 'border-brand-900 bg-brand-50 dark:bg-brand-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-brand-300')}>
                    <div className="text-3xl mb-2">{val.emoji}</div>
                    <div className="font-semibold text-sm text-gray-900 dark:text-white">{val.label}</div>
                    {category === key && (
                      <div className="mt-2 text-xs text-brand-900 font-medium flex items-center gap-1">
                        <Check size={12}/> Επιλεγμένο
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: Service info */}
            {step === 2 && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Όνομα υπηρεσίας *</label>
                  <input className="input" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                    placeholder="π.χ. Pet Spa Athens"/>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Περιγραφή</label>
                  <textarea rows={3} className="input" value={form.description} onChange={e => setForm({...form, description: e.target.value})}/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Πόλη</label>
                    <input className="input" value={form.city} onChange={e => setForm({...form, city: e.target.value})}/>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Έτη εμπειρίας</label>
                    <input type="number" className="input" value={form.years_experience} onChange={e => setForm({...form, years_experience: parseInt(e.target.value) || 0})}/>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Διεύθυνση</label>
                  <input className="input" value={form.location} onChange={e => setForm({...form, location: e.target.value})}/>
                </div>
                <div className="flex flex-wrap gap-4 pt-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.home_visits} onChange={e => setForm({...form, home_visits: e.target.checked})}/>
                    Κατ' οίκον
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.emergency_available} onChange={e => setForm({...form, emergency_available: e.target.checked})}/>
                    Έκτακτα
                  </label>
                </div>
              </div>
            )}

            {/* Step 3: Packages */}
            {step === 3 && (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                  <Sparkles size={14} className="mt-0.5 shrink-0"/>
                  <span>Επιλέξτε αρχικά πακέτα από τον κατάλογο. Μπορείτε να τα τροποποιήσετε μετά.</span>
                </div>
                {presetsLoading ? (
                  <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-12 w-full"/>)}</div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 input">
                      <Search size={14} className="text-gray-400 shrink-0"/>
                      <input value={presetSearch} onChange={e => setPresetSearch(e.target.value)} placeholder="Αναζήτηση..."
                        className="flex-1 bg-transparent text-sm outline-none"/>
                    </div>
                    <div className="flex gap-2">
                      <button type="button"
                        onClick={() => setSelectedPresets(new Set(filtered.map((p: any) => presets.indexOf(p))))}
                        className="text-xs btn-secondary">Όλα</button>
                      <button type="button" onClick={() => setSelectedPresets(new Set())}
                        className="text-xs btn-secondary">Καμία</button>
                    </div>
                    <div className="max-h-72 overflow-y-auto space-y-2">
                      {filtered.map((pkg: any) => {
                        const idx = presets.indexOf(pkg)
                        const isSelected = selectedPresets.has(idx)
                        const meta = GROUP_META[pkg.group] || GROUP_META.other
                        return (
                          <label key={idx}
                            className={cn('flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                              isSelected
                                ? 'border-brand-900 bg-brand-50/50 dark:bg-brand-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300')}>
                            <input type="checkbox" checked={isSelected} className="sr-only"
                              onChange={() => {
                                const next = new Set(selectedPresets)
                                next.has(idx) ? next.delete(idx) : next.add(idx)
                                setSelectedPresets(next)
                              }}/>
                            <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center shrink-0',
                              isSelected ? 'bg-brand-900 border-brand-900' : 'border-gray-300')}>
                              {isSelected && <Check size={12} className="text-white"/>}
                            </div>
                            <span className="text-xl shrink-0">{meta.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-900 dark:text-white">{pkg.name}</p>
                              <p className="text-xs text-gray-500">{meta.label} · {pkg.duration_minutes}΄</p>
                            </div>
                            <p className="font-bold text-sm text-gray-900 dark:text-white shrink-0">€{pkg.price.toFixed(2)}</p>
                          </label>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex gap-2 justify-end">
            {step > 1 && <button onClick={() => setStep((step - 1) as any)} className="btn-secondary">Πίσω</button>}
            <button onClick={onClose} className="btn-secondary">Άκυρο</button>
            <button onClick={handleNext} disabled={createService.isPending} className="btn-primary">
              {createService.isPending ? 'Δημιουργία...' :
               step === 3 ? `Δημιουργία${selectedPresets.size > 0 ? ` (${selectedPresets.size})` : ''}` : 'Συνέχεια →'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ──────────────────────────────────────────────────────────────
// Modal: Preset catalog (load packages into existing service)
// ──────────────────────────────────────────────────────────────
function PresetCatalogModal({ open, onClose, serviceId, category, onImported }: any) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')
  const [filterGroup, setFilterGroup] = useState<string>('all')

  const { data: presets = [], isLoading } = useQuery({
    queryKey: ['catalog-preset', category],
    queryFn: () => category ? api.get(`/catalog/preset/${category}`).then(r => r.data?.data ?? []) : Promise.resolve([]),
    enabled: open && !!category,
  })

  const importMutation = useMutation({
    mutationFn: (packages: any[]) => api.post('/packages/bulk', { service_id: serviceId, packages }),
    onSuccess: (res: any) => {
      toast.success(`Προστέθηκαν ${res.data.count} πακέτα`)
      setSelected(new Set())
      onImported()
    },
    onError: () => toast.error('Σφάλμα εισαγωγής'),
  })

  const filtered = useMemo(() => {
    return presets.filter((p: any) => {
      if (filterGroup !== 'all' && p.group !== filterGroup) return false
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [presets, search, filterGroup])

  const groups = useMemo(() => Array.from(new Set<string>(presets.map((p: any) => p.group as string))), [presets])

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((_: any, i: number) => presets.indexOf(filtered[i]))))
  }

  const handleImport = () => {
    const toImport = Array.from(selected).map(i => presets[i])
    if (toImport.length === 0) return toast.error('Επιλέξτε τουλάχιστον ένα πακέτο')
    importMutation.mutate(toImport)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
          <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-modal max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">

            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-500"/> Κατάλογος υπηρεσιών
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Επιλέξτε όσα παρέχετε. Μπορείτε να τα επεξεργαστείτε μετά.</p>
              </div>
              <button onClick={onClose} className="btn-ghost p-2"><X size={18}/></button>
            </div>

            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2 flex-1 input">
                <Search size={14} className="text-gray-400 shrink-0"/>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Αναζήτηση..."
                  className="flex-1 bg-transparent text-sm outline-none"/>
              </div>
              <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} className="input text-sm">
                <option value="all">Όλες οι κατηγορίες</option>
                {groups.map(g => <option key={g} value={g}>{GROUP_META[g]?.label || g}</option>)}
              </select>
              <button onClick={toggleAll} className="btn-secondary text-sm whitespace-nowrap">
                {selected.size === filtered.length && filtered.length > 0 ? 'Καμία' : 'Όλα'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-14 w-full"/>)}</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Δεν βρέθηκαν πακέτα</div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((pkg: any) => {
                    const originalIdx = presets.indexOf(pkg)
                    const isSelected = selected.has(originalIdx)
                    const meta = GROUP_META[pkg.group] || GROUP_META.other
                    return (
                      <label key={originalIdx}
                        className={cn('flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                          isSelected
                            ? 'border-brand-900 bg-brand-50/50 dark:bg-brand-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300')}>
                        <input type="checkbox" checked={isSelected} className="sr-only"
                          onChange={() => {
                            const next = new Set(selected)
                            next.has(originalIdx) ? next.delete(originalIdx) : next.add(originalIdx)
                            setSelected(next)
                          }}/>
                        <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                          isSelected ? 'bg-brand-900 border-brand-900' : 'border-gray-300')}>
                          {isSelected && <Check size={12} className="text-white"/>}
                        </div>
                        <span className="text-xl shrink-0">{meta.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm text-gray-900 dark:text-white">{pkg.name}</p>
                            {pkg.size && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{SIZE_LABELS[pkg.size]}</span>}
                            {pkg.modality && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">{MODALITY_LABELS[pkg.modality] || pkg.modality}</span>}
                            {pkg.is_addon && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">Add-on</span>}
                          </div>
                          {pkg.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{pkg.description}</p>}
                          <p className="text-xs text-gray-400 mt-0.5">{pkg.duration_minutes}΄ · {meta.label}</p>
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white shrink-0">€{pkg.price.toFixed(2)}</p>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selected.size > 0
                  ? <><strong>{selected.size}</strong> επιλεγμένα από {presets.length}</>
                  : <span className="text-gray-400">Καμία επιλογή ακόμα</span>}
              </p>
              <div className="flex gap-2">
                <button onClick={onClose} className="btn-secondary">Άκυρο</button>
                <button onClick={handleImport} disabled={selected.size === 0 || importMutation.isPending}
                  className="btn-primary flex items-center gap-2">
                  {importMutation.isPending ? 'Εισαγωγή...' : <>Εισαγωγή ({selected.size})</>}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ──────────────────────────────────────────────────────────────
// Modal: Add/Edit custom package
// ──────────────────────────────────────────────────────────────
function CustomPackageModal({ open, onClose, serviceId, editing, onSaved }: any) {
  const [form, setForm] = useState<any>(editing || {
    group: 'service', name: '', description: '',
    size: '', pet_type: '', breed_group: '', modality: '',
    price: '', duration_minutes: 60, is_addon: false, is_active: true
  })

  useEffect(() => {
    if (editing) setForm({ ...editing, price: String(editing.price) })
    else setForm({
      group: 'service', name: '', description: '',
      size: '', pet_type: '', breed_group: '', modality: '',
      price: '', duration_minutes: 60, is_addon: false, is_active: true
    })
  }, [editing, open])

  const saveMutation = useMutation({
    mutationFn: () => editing
      ? api.patch(`/packages/${editing.id}`, { ...form, service_id: undefined })
      : api.post('/packages', { ...form, service_id: serviceId }),
    onSuccess: () => {
      toast.success(editing ? 'Πακέτο ενημερώθηκε' : 'Πακέτο προστέθηκε')
      onSaved()
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Σφάλμα αποθήκευσης'),
  })

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
          onClick={e => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-modal max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">

          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-bold text-gray-900 dark:text-white">
              {editing ? 'Επεξεργασία πακέτου' : 'Νέο πακέτο'}
            </h3>
            <button onClick={onClose} className="btn-ghost p-2"><X size={18}/></button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Όνομα *</label>
              <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="π.χ. Πλήρες grooming"/>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Κατηγορία</label>
                <select className="input" value={form.group} onChange={e => setForm({...form, group: e.target.value})}>
                  {Object.entries(GROUP_META).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.emoji} {meta.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Τιμή (€) *</label>
                <input type="number" step="0.01" className="input" value={form.price} onChange={e => setForm({...form, price: e.target.value})}/>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Περιγραφή</label>
              <textarea rows={2} className="input" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} placeholder="Σύντομη περιγραφή (προαιρετικό)"/>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Διάρκεια (λεπτά)</label>
                <input type="number" className="input" value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: parseInt(e.target.value) || 60})}/>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Μέγεθος</label>
                <select className="input" value={form.size || ''} onChange={e => setForm({...form, size: e.target.value || null})}>
                  <option value="">— (δεν εξαρτάται)</option>
                  <option value="small">Μικρό</option>
                  <option value="medium">Μεσαίο</option>
                  <option value="large">Μεγάλο</option>
                  <option value="xlarge">Πολύ μεγάλο</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Τύπος κατοικιδίου</label>
                <select className="input" value={form.pet_type || ''} onChange={e => setForm({...form, pet_type: e.target.value || null})}>
                  <option value="">— (όλα)</option>
                  <option value="dog">🐕 Σκύλος</option>
                  <option value="cat">🐈 Γάτα</option>
                  <option value="rabbit">🐰 Κουνέλι</option>
                  <option value="bird">🐦 Πτηνό</option>
                  <option value="other">Άλλο</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Τρόπος</label>
                <select className="input" value={form.modality || ''} onChange={e => setForm({...form, modality: e.target.value || null})}>
                  <option value="">— (δεν εξαρτάται)</option>
                  <option value="in_clinic">Στο ιατρείο</option>
                  <option value="home_visit">Κατ' οίκον</option>
                  <option value="telehealth">Τηλεσυμβ.</option>
                  <option value="emergency">Έκτακτο</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_addon} onChange={e => setForm({...form, is_addon: e.target.checked})}/>
                Add-on (à la carte)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})}/>
                Ενεργό
              </label>
            </div>
          </div>

          <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex gap-2 justify-end">
            <button onClick={onClose} className="btn-secondary">Άκυρο</button>
            <button onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !form.name || !form.price}
              className="btn-primary">
              {saveMutation.isPending ? 'Αποθήκευση...' : (editing ? 'Ενημέρωση' : 'Προσθήκη')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
