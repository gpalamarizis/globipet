import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronRight,
  Sparkles, Clock, Search, Settings, Building2, Euro
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
  grooming:    { label: 'Περιποίηση',         emoji: '✂️' },
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
  const packagesWithoutPrice = (activeService?.packages || []).filter((p: any) => !p.price || p.price === 0).length

  const toggleGroup = (g: string) => {
    setCollapsedGroups(prev => {
      const n = new Set(prev)
      n.has(g) ? n.delete(g) : n.add(g)
      return n
    })
  }

  if (isLoading) {
    return <div className="page-container py-8"><div className="skeleton h-12 w-64 mb-6"/></div>
  }

  if (services.length === 0) {
    return (
      <div className="page-container py-16 text-center">
        <Package size={48} className="mx-auto text-gray-300 mb-4"/>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Δεν έχετε υπηρεσίες ακόμα</h2>
        <button onClick={() => setShowNewServiceModal(true)} className="btn-primary inline-flex items-center gap-2 mt-4">
          <Plus size={15}/> Δημιουργία υπηρεσίας
        </button>
        <NewServiceModal open={showNewServiceModal} onClose={() => setShowNewServiceModal(false)}
          onCreated={(id) => {
            queryClient.invalidateQueries({ queryKey: ['provider-packages'] })
            setShowNewServiceModal(false)
            setSelectedServiceId(id)
          }}/>
      </div>
    )
  }

  return (
    <div className="page-container py-8 pb-24">
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

      {services.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {services.map((s: any) => {
            const cat = CATEGORY_LABELS[s.category] || CATEGORY_LABELS.other
            const isActive = (selectedServiceId || services[0]?.id) === s.id
            return (
              <button key={s.id} onClick={() => setSelectedServiceId(s.id)}
                className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-all border-2 flex items-center gap-2',
                  isActive ? 'border-brand-900 bg-brand-50 text-brand-900' : 'border-gray-200 hover:border-gray-300 text-gray-600')}>
                <span>{cat.emoji}</span>
                <span>{s.title}</span>
                <span className="text-xs opacity-60">({s.packages?.length ?? 0})</span>
              </button>
            )
          })}
        </div>
      )}

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
                  {totalCount} πακέτα · {Object.keys(groupedPackages).length} κατηγορίες
                  {activeService.city && ` · 📍 ${activeService.city}`}
                </p>
                {packagesWithoutPrice > 0 && (
                  <p className="text-xs text-amber-700 mt-2 font-medium">
                    ⚠️ {packagesWithoutPrice} πακέτα χωρίς τιμή — δεν εμφανίζονται στους πελάτες
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => setShowServiceEditModal(true)} className="btn-ghost p-2 hover:bg-white/50" title="Επεξεργασία">
                <Settings size={16} className="text-gray-700"/>
              </button>
              <button onClick={() => {
                if (confirm(`Διαγραφή υπηρεσίας "${activeService.title}";`)) deleteService.mutate(activeService.id)
              }} className="btn-ghost p-2 hover:bg-red-50" title="Διαγραφή">
                <Trash2 size={16} className="text-red-500"/>
              </button>
            </div>
          </div>
        </div>
      )}

      {totalCount === 0 ? (
        <div className="card p-12 text-center">
          <Package size={40} className="mx-auto text-gray-300 mb-3"/>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Δεν έχετε πακέτα</h3>
          <button onClick={() => setShowPresetModal(true)} className="btn-primary inline-flex items-center gap-2 mt-4">
            <Sparkles size={15}/> Φόρτωση από κατάλογο
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
                      <p className="text-xs text-gray-500">{items.length} πακέτα</p>
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
                          <div key={pkg.id} className={cn('p-4 flex items-center gap-3', !pkg.is_active && 'opacity-50')}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm text-gray-900 dark:text-white">{pkg.name}</p>
                                {pkg.size && <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', meta.color, 'border')}>{SIZE_LABELS[pkg.size]}</span>}
                                {pkg.modality && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200">{MODALITY_LABELS[pkg.modality] || pkg.modality}</span>}
                                {pkg.pet_type && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-orange-50 text-orange-700 border border-orange-200">{pkg.pet_type === 'dog' ? '🐕' : pkg.pet_type === 'cat' ? '🐈' : '🐾'}</span>}
                                {pkg.is_addon && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200">Add-on</span>}
                              </div>
                              {pkg.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{pkg.description}</p>}
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                <span className="flex items-center gap-1"><Clock size={11}/> {pkg.duration_minutes}΄</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              {pkg.price > 0 ? (
                                <p className="font-bold text-lg text-gray-900 dark:text-white">€{pkg.price.toFixed(2)}</p>
                              ) : (
                                <p className="text-xs font-semibold text-amber-600">Χωρίς τιμή</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => toggleActive.mutate({ id: pkg.id, is_active: !pkg.is_active })} className="btn-ghost p-1.5">
                                {pkg.is_active ? <Check size={14} className="text-green-600"/> : <X size={14} className="text-gray-400"/>}
                              </button>
                              <button onClick={() => { setEditingPackage(pkg); setShowCustomModal(true) }} className="btn-ghost p-1.5">
                                <Edit2 size={14} className="text-gray-500"/>
                              </button>
                              <button onClick={() => { if (confirm(`Διαγραφή "${pkg.name}";`)) deletePackage.mutate(pkg.id) }} className="btn-ghost p-1.5 hover:bg-red-50">
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

      <PresetCatalogModal open={showPresetModal} onClose={() => setShowPresetModal(false)}
        serviceId={activeService?.id} category={activeService?.category}
        onImported={() => { queryClient.invalidateQueries({ queryKey: ['provider-packages'] }); setShowPresetModal(false) }}/>
      <CustomPackageModal open={showCustomModal}
        onClose={() => { setShowCustomModal(false); setEditingPackage(null) }}
        serviceId={activeService?.id} editing={editingPackage}
        onSaved={() => { queryClient.invalidateQueries({ queryKey: ['provider-packages'] }); setShowCustomModal(false); setEditingPackage(null) }}/>
      <ServiceEditModal open={showServiceEditModal} onClose={() => setShowServiceEditModal(false)} service={activeService}
        onSaved={() => { queryClient.invalidateQueries({ queryKey: ['provider-packages'] }); setShowServiceEditModal(false) }}/>
      <NewServiceModal open={showNewServiceModal} onClose={() => setShowNewServiceModal(false)}
        onCreated={(id) => {
          queryClient.invalidateQueries({ queryKey: ['provider-packages'] })
          setShowNewServiceModal(false)
          setSelectedServiceId(id)
        }}/>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Preset Catalog Modal — pick templates AND set prices in one step
// ═══════════════════════════════════════════════════════════════
function PresetCatalogModal({ open, onClose, serviceId, category, onImported }: any) {
  // Map<template_id, { price, duration_minutes }>
  const [selectedMap, setSelectedMap] = useState<Map<string, { price: string; duration_minutes: number }>>(new Map())
  const [search, setSearch] = useState('')
  const [filterGroup, setFilterGroup] = useState<string>('all')

  useEffect(() => {
    if (!open) {
      setSelectedMap(new Map())
      setSearch('')
      setFilterGroup('all')
    }
  }, [open])

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['catalog-preset', category],
    queryFn: () => category ? api.get(`/catalog/preset/${category}`).then(r => r.data?.data ?? []) : Promise.resolve([]),
    enabled: open && !!category,
  })

  const importMutation = useMutation({
    mutationFn: (packages: any[]) => api.post('/packages/bulk', {
      service_id: serviceId,
      packages_with_prices: packages
    }),
    onSuccess: (res: any) => {
      toast.success(`Προστέθηκαν ${res.data.count} πακέτα`)
      setSelectedMap(new Map())
      onImported()
    },
    onError: () => toast.error('Σφάλμα εισαγωγής'),
  })

  const filtered = useMemo(() => {
    return templates.filter((t: any) => {
      if (filterGroup !== 'all' && t.group !== filterGroup) return false
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [templates, search, filterGroup])

  const groups = useMemo(() => Array.from(new Set<string>(templates.map((t: any) => t.group as string))), [templates])

  const toggleTemplate = (tpl: any) => {
    setSelectedMap(prev => {
      const next = new Map(prev)
      if (next.has(tpl.id)) next.delete(tpl.id)
      else next.set(tpl.id, { price: '', duration_minutes: tpl.duration_minutes })
      return next
    })
  }

  const updatePrice = (templateId: string, price: string) => {
    setSelectedMap(prev => {
      const next = new Map(prev)
      const cur = next.get(templateId)
      if (cur) next.set(templateId, { ...cur, price })
      return next
    })
  }

  const handleImport = () => {
    const packages = Array.from(selectedMap.entries())
      .filter(([, v]) => v.price !== '' && parseFloat(v.price) > 0)
      .map(([template_id, v]) => ({
        template_id,
        price: parseFloat(v.price),
        duration_minutes: v.duration_minutes,
      }))

    if (packages.length === 0) {
      toast.error('Συμπληρώστε τιμές για τα επιλεγμένα πακέτα')
      return
    }
    if (packages.length < selectedMap.size) {
      toast.error(`${selectedMap.size - packages.length} πακέτα δεν έχουν τιμή — συμπληρώστε τις πρώτα`)
      return
    }
    importMutation.mutate(packages)
  }

  const missingPrices = Array.from(selectedMap.values()).filter(v => !v.price || parseFloat(v.price) <= 0).length

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
          <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-modal max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">

            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-500"/> Κατάλογος υπηρεσιών
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Επιλέξτε υπηρεσίες και ορίστε τιμές</p>
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
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-16 w-full"/>)}</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Δεν βρέθηκαν υπηρεσίες</div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((tpl: any) => {
                    const selected = selectedMap.get(tpl.id)
                    const isSelected = !!selected
                    const meta = GROUP_META[tpl.group] || GROUP_META.other
                    return (
                      <div key={tpl.id}
                        className={cn('rounded-xl border-2 transition-all',
                          isSelected
                            ? 'border-brand-900 bg-brand-50/50 dark:bg-brand-900/20'
                            : 'border-gray-200 dark:border-gray-700')}>
                        <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => toggleTemplate(tpl)}>
                          <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                            isSelected ? 'bg-brand-900 border-brand-900' : 'border-gray-300')}>
                            {isSelected && <Check size={12} className="text-white"/>}
                          </div>
                          <span className="text-xl shrink-0">{meta.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm text-gray-900 dark:text-white">{tpl.name}</p>
                              {tpl.size && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{SIZE_LABELS[tpl.size]}</span>}
                              {tpl.modality && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">{MODALITY_LABELS[tpl.modality] || tpl.modality}</span>}
                              {tpl.pet_type && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700">{tpl.pet_type === 'dog' ? '🐕' : tpl.pet_type === 'cat' ? '🐈' : '🐾'}</span>}
                              {tpl.is_addon && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">Add-on</span>}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{tpl.duration_minutes}΄ · {meta.label}</p>
                            {tpl.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{tpl.description}</p>}
                          </div>
                        </div>

                        {/* Price input — εμφανίζεται μόνο όταν είναι επιλεγμένο */}
                        {isSelected && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                            className="border-t border-brand-200 dark:border-brand-800 px-3 py-2.5 bg-white dark:bg-gray-900 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">Η τιμή σας:</label>
                              <div className="relative flex-1 max-w-[160px]">
                                <Euro size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/>
                                <input type="number" step="0.01" min="0" autoFocus
                                  value={selected.price}
                                  onChange={e => updatePrice(tpl.id, e.target.value)}
                                  placeholder="0.00"
                                  className="input pl-7 py-1.5 text-sm"
                                  onClick={e => e.stopPropagation()}/>
                              </div>
                              <span className="text-xs text-gray-400">· {tpl.duration_minutes}΄</span>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedMap.size > 0 ? <><strong>{selectedMap.size}</strong> επιλεγμένα</> : <span className="text-gray-400">Καμία επιλογή</span>}
                </p>
                {missingPrices > 0 && (
                  <p className="text-xs text-amber-600 mt-0.5">⚠️ {missingPrices} χωρίς τιμή</p>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} className="btn-secondary">Άκυρο</button>
                <button onClick={handleImport} disabled={selectedMap.size === 0 || importMutation.isPending}
                  className="btn-primary flex items-center gap-2">
                  {importMutation.isPending ? 'Εισαγωγή...' : <>Εισαγωγή ({selectedMap.size - missingPrices})</>}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ═══════════════════════════════════════════════════════════════
// Service Edit Modal
// ═══════════════════════════════════════════════════════════════
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
        specializations: Array.isArray(service.specializations) ? service.specializations.join(', ') : '',
        pet_types: Array.isArray(service.pet_types) ? service.pet_types.join(',') : '',
        languages: Array.isArray(service.languages) ? service.languages.join(',') : 'el,en',
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
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><Settings size={18}/> Επεξεργασία υπηρεσίας</h3>
            <button onClick={onClose} className="btn-ghost p-2"><X size={18}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Όνομα *</label>
              <input className="input" value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})}/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Περιγραφή</label>
              <textarea rows={3} className="input" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Πόλη</label>
                <input className="input" value={form.city || ''} onChange={e => setForm({...form, city: e.target.value})}/>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Έτη εμπειρίας</label>
                <input type="number" className="input" value={form.years_experience || 0} onChange={e => setForm({...form, years_experience: parseInt(e.target.value) || 0})}/>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Διεύθυνση</label>
              <input className="input" value={form.location || ''} onChange={e => setForm({...form, location: e.target.value})}/>
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

// ═══════════════════════════════════════════════════════════════
// New Service Modal — wizard, no preset prices step (uses preset modal after)
// ═══════════════════════════════════════════════════════════════
function NewServiceModal({ open, onClose, onCreated }: any) {
  const [step, setStep] = useState<1 | 2>(1)
  const [category, setCategory] = useState<string>('')
  const [form, setForm] = useState<any>({
    title: '', description: '', city: '', country: 'GR', location: '',
    home_visits: false, emergency_available: false, years_experience: 0,
  })

  useEffect(() => {
    if (!open) {
      setStep(1); setCategory('')
      setForm({ title: '', description: '', city: '', country: 'GR', location: '',
        home_visits: false, emergency_available: false, years_experience: 0 })
    }
  }, [open])

  const createService = useMutation({
    mutationFn: () => api.post('/packages/setup', {
      category, title: form.title, description: form.description,
      city: form.city, country: form.country, location: form.location,
      home_visits: form.home_visits, emergency_available: form.emergency_available,
      years_experience: form.years_experience,
      packages_with_prices: [], // δεν δίνουμε τιμές εδώ - θα τις βάλει μετά από το catalog
    }),
    onSuccess: (res: any) => {
      toast.success('🎉 Νέα υπηρεσία. Πρόσθεσε πακέτα από τον κατάλογο.')
      onCreated(res.data.service?.id)
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Σφάλμα'),
  })

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
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><Building2 size={18}/> Νέα υπηρεσία</h3>
              <div className="flex items-center gap-1 mt-2">
                {[1,2].map(n => (
                  <div key={n} className="flex items-center">
                    <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold',
                      step >= n ? 'bg-brand-900 text-white' : 'bg-gray-200 text-gray-400')}>
                      {step > n ? <Check size={10}/> : n}
                    </div>
                    {n < 2 && <div className={cn('w-8 h-0.5 mx-1', step > n ? 'bg-brand-900' : 'bg-gray-200')}/>}
                  </div>
                ))}
              </div>
            </div>
            <button onClick={onClose} className="btn-ghost p-2"><X size={18}/></button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {step === 1 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
                  <button key={key} onClick={() => setCategory(key)}
                    className={cn('p-4 rounded-xl border-2 text-left transition-all',
                      category === key ? 'border-brand-900 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-brand-300')}>
                    <div className="text-3xl mb-2">{val.emoji}</div>
                    <div className="font-semibold text-sm text-gray-900 dark:text-white">{val.label}</div>
                  </button>
                ))}
              </div>
            )}
            {step === 2 && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Όνομα *</label>
                  <input className="input" value={form.title} onChange={e => setForm({...form, title: e.target.value})}/>
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
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.home_visits} onChange={e => setForm({...form, home_visits: e.target.checked})}/> Κατ' οίκον</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.emergency_available} onChange={e => setForm({...form, emergency_available: e.target.checked})}/> Έκτακτα</label>
                </div>
                <p className="text-xs text-gray-500 italic mt-2">💡 Μετά τη δημιουργία, θα μπορείτε να προσθέσετε πακέτα με τις τιμές σας από τον κατάλογο.</p>
              </div>
            )}
          </div>

          <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex gap-2 justify-end">
            {step > 1 && <button onClick={() => setStep(1)} className="btn-secondary">Πίσω</button>}
            <button onClick={onClose} className="btn-secondary">Άκυρο</button>
            <button onClick={() => {
              if (step === 1) {
                if (!category) return toast.error('Επέλεξε κατηγορία')
                setStep(2)
              } else {
                if (!form.title) return toast.error('Δώσε όνομα')
                createService.mutate()
              }
            }} disabled={createService.isPending} className="btn-primary">
              {createService.isPending ? 'Δημιουργία...' : step === 2 ? 'Δημιουργία' : 'Συνέχεια →'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ═══════════════════════════════════════════════════════════════
// Custom Package Add/Edit Modal
// ═══════════════════════════════════════════════════════════════
function CustomPackageModal({ open, onClose, serviceId, editing, onSaved }: any) {
  const [form, setForm] = useState<any>({
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
    onError: (e: any) => toast.error(e.response?.data?.message || 'Σφάλμα'),
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
            <h3 className="font-bold text-gray-900 dark:text-white">{editing ? 'Επεξεργασία πακέτου' : 'Νέο πακέτο'}</h3>
            <button onClick={onClose} className="btn-ghost p-2"><X size={18}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Όνομα *</label>
              <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})}/>
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
              <textarea rows={2} className="input" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})}/>
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
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Τρόπος</label>
                <select className="input" value={form.modality || ''} onChange={e => setForm({...form, modality: e.target.value || null})}>
                  <option value="">— (δεν εξαρτάται)</option>
                  <option value="in_clinic">Στο ιατρείο</option>
                  <option value="home_visit">Κατ' οίκον</option>
                  <option value="telehealth">Τηλεσυμβ.</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_addon} onChange={e => setForm({...form, is_addon: e.target.checked})}/> Add-on</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})}/> Ενεργό</label>
            </div>
          </div>
          <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex gap-2 justify-end">
            <button onClick={onClose} className="btn-secondary">Άκυρο</button>
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name || !form.price} className="btn-primary">
              {saveMutation.isPending ? 'Αποθήκευση...' : (editing ? 'Ενημέρωση' : 'Προσθήκη')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}