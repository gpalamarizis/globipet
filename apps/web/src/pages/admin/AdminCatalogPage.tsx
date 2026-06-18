import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Plus, Trash2, Edit2, Check, X, Search, Filter, Clock,
  ChevronDown, ChevronRight, ArrowLeft
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const GROUP_META: Record<string, { label: string; emoji: string }> = {
  bathing: { label: 'Μπάνιο', emoji: '🛁' },
  haircut: { label: 'Κούρεμα', emoji: '✂️' },
  addon: { label: 'Extras', emoji: '✨' },
  consultation: { label: 'Επισκέψεις', emoji: '🩺' },
  vaccination: { label: 'Εμβολιασμοί', emoji: '💉' },
  surgery: { label: 'Χειρουργικές', emoji: '🏥' },
  dental: { label: 'Οδοντιατρικά', emoji: '🦷' },
  diagnostics: { label: 'Διαγνωστικά', emoji: '🔬' },
  specialty: { label: 'Ειδικότητες', emoji: '👨‍⚕️' },
  oncology: { label: 'Ογκολογία', emoji: '🎗️' },
  service: { label: 'Υπηρεσίες', emoji: '🐕' },
  emergency: { label: 'Έκτακτα', emoji: '🚨' },
  other: { label: 'Άλλα', emoji: '📋' },
}

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  grooming: { label: 'Περιποίηση', emoji: '✂️' },
  veterinary: { label: 'Κτηνίατρος', emoji: '🩺' },
  clinic: { label: 'Κτηνιατρική κλινική', emoji: '🏥' },
  walking: { label: 'Dog walking', emoji: '🚶' },
  sitting: { label: 'Pet sitting', emoji: '🏡' },
  boarding: { label: 'Boarding', emoji: '🏨' },
  daycare: { label: 'Daycare', emoji: '☀️' },
  training: { label: 'Εκπαίδευση', emoji: '🎓' },
  transport: { label: 'Μεταφορά', emoji: '🚐' },
  photography: { label: 'Φωτογράφιση', emoji: '📷' },
  other: { label: 'Άλλο', emoji: '✨' },
}

const SIZE_LABELS: Record<string, string> = {
  small: 'Μικρό', medium: 'Μεσαίο', large: 'Μεγάλο', xlarge: 'Πολύ μεγάλο'
}

export default function AdminCatalogPage() {
  const queryClient = useQueryClient()
  const [selectedCategory, setSelectedCategory] = useState<string>('grooming')
  const [search, setSearch] = useState('')
  const [filterGroup, setFilterGroup] = useState('all')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['admin-catalog', selectedCategory],
    queryFn: () => api.get(`/admin/catalog/templates?category=${selectedCategory}`).then(r => r.data?.data ?? []),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/catalog/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-catalog'] })
      toast.success('Template διαγράφηκε')
    },
    onError: () => toast.error('Σφάλμα διαγραφής'),
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: any) => api.patch(`/admin/catalog/templates/${id}`, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-catalog'] }),
  })

  const filtered = useMemo(() => {
    return templates.filter((t: any) => {
      if (filterGroup !== 'all' && t.group !== filterGroup) return false
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [templates, search, filterGroup])

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {}
    for (const t of filtered) {
      if (!g[t.group]) g[t.group] = []
      g[t.group].push(t)
    }
    return g
  }, [filtered])

  const groups = useMemo(() => Array.from(new Set<string>(templates.map((t: any) => t.group as string))), [templates])

  const toggleGroup = (g: string) => {
    setCollapsedGroups(prev => {
      const n = new Set(prev)
      n.has(g) ? n.delete(g) : n.add(g)
      return n
    })
  }

  return (
    <div className="page-container py-8 pb-24 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link to="/admin" className="btn-ghost p-2"><ArrowLeft size={18}/></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen size={22}/> Κατάλογος υπηρεσιών
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Διαχείριση των διαθέσιμων templates που μπορούν να χρησιμοποιήσουν οι πάροχοι
          </p>
        </div>
        <button onClick={() => { setEditingTemplate(null); setShowModal(true) }}
          className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15}/> Νέο template
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-6 mt-6 overflow-x-auto pb-2">
        {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
          <button key={key} onClick={() => setSelectedCategory(key)}
            className={cn('px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border-2 flex items-center gap-2',
              selectedCategory === key
                ? 'border-brand-900 bg-brand-50 text-brand-900'
                : 'border-gray-200 hover:border-gray-300 text-gray-600')}>
            <span>{val.emoji}</span>
            <span>{val.label}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
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

      {/* Summary */}
      <div className="card p-4 mb-4 bg-gradient-to-br from-brand-50 to-amber-50 dark:from-brand-900/20 dark:to-amber-900/20 border-brand-100">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          <strong>{filtered.length}</strong> templates στην κατηγορία{' '}
          <strong>{CATEGORY_LABELS[selectedCategory]?.label}</strong>
          {' · '}{Object.keys(grouped).length} ομάδες
        </p>
      </div>

      {/* Templates list */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="skeleton h-20 w-full"/>)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <BookOpen size={40} className="mx-auto text-gray-300 mb-3"/>
          <h3 className="font-semibold text-gray-900 dark:text-white">Δεν βρέθηκαν templates</h3>
          <button onClick={() => { setEditingTemplate(null); setShowModal(true) }}
            className="btn-primary inline-flex items-center gap-2 mt-4">
            <Plus size={15}/> Προσθήκη
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([group, items]) => {
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
                      <p className="text-xs text-gray-500">{items.length} templates</p>
                    </div>
                  </div>
                  {isCollapsed ? <ChevronRight size={18} className="text-gray-400"/> : <ChevronDown size={18} className="text-gray-400"/>}
                </button>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-gray-100 dark:border-gray-800">
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {items.map((tpl: any) => (
                          <div key={tpl.id} className={cn('p-4 flex items-center gap-3', !tpl.is_active && 'opacity-50')}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm text-gray-900 dark:text-white">{tpl.name}</p>
                                {tpl.size && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{SIZE_LABELS[tpl.size]}</span>}
                                {tpl.modality && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">{tpl.modality}</span>}
                                {tpl.pet_type && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700">{tpl.pet_type === 'dog' ? '🐕' : '🐈'}</span>}
                                {tpl.is_addon && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">Add-on</span>}
                                {!tpl.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">Ανενεργό</span>}
                              </div>
                              {tpl.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{tpl.description}</p>}
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                <span className="flex items-center gap-1"><Clock size={11}/> {tpl.suggested_duration_minutes}΄</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => toggleActive.mutate({ id: tpl.id, is_active: !tpl.is_active })} className="btn-ghost p-1.5">
                                {tpl.is_active ? <Check size={14} className="text-green-600"/> : <X size={14} className="text-gray-400"/>}
                              </button>
                              <button onClick={() => { setEditingTemplate(tpl); setShowModal(true) }} className="btn-ghost p-1.5">
                                <Edit2 size={14} className="text-gray-500"/>
                              </button>
                              <button onClick={() => { if (confirm(`Διαγραφή "${tpl.name}";`)) deleteMutation.mutate(tpl.id) }} className="btn-ghost p-1.5 hover:bg-red-50">
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

      <TemplateModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingTemplate(null) }}
        editing={editingTemplate}
        defaultCategory={selectedCategory}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-catalog'] })
          setShowModal(false)
          setEditingTemplate(null)
        }}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
function TemplateModal({ open, onClose, editing, defaultCategory, onSaved }: any) {
  const [form, setForm] = useState<any>({})

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({ ...editing })
      } else {
        setForm({
          category: defaultCategory || 'grooming',
          group: 'service', name: '', description: '',
          size: '', pet_type: '', breed_group: '', modality: '',
          suggested_duration_minutes: 60,
          is_addon: false, is_active: true, display_order: 0,
        })
      }
    }
  }, [open, editing, defaultCategory])

  const saveMutation = useMutation({
    mutationFn: () => editing
      ? api.patch(`/admin/catalog/templates/${editing.id}`, form)
      : api.post('/admin/catalog/templates', form),
    onSuccess: () => {
      toast.success(editing ? 'Template ενημερώθηκε' : 'Template προστέθηκε')
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
            <h3 className="font-bold text-gray-900 dark:text-white">{editing ? 'Επεξεργασία template' : 'Νέο template'}</h3>
            <button onClick={onClose} className="btn-ghost p-2"><X size={18}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Όνομα *</label>
              <input className="input" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Κατηγορία *</label>
                <select className="input" value={form.category || ''} onChange={e => setForm({...form, category: e.target.value})}>
                  {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
                    <option key={key} value={key}>{val.emoji} {val.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Ομάδα *</label>
                <select className="input" value={form.group || ''} onChange={e => setForm({...form, group: e.target.value})}>
                  {Object.entries(GROUP_META).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.emoji} {meta.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Περιγραφή</label>
              <textarea rows={2} className="input" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Διάρκεια (λεπτά)</label>
                <input type="number" className="input" value={form.suggested_duration_minutes || 60}
                  onChange={e => setForm({...form, suggested_duration_minutes: parseInt(e.target.value) || 60})}/>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Σειρά</label>
                <input type="number" className="input" value={form.display_order || 0}
                  onChange={e => setForm({...form, display_order: parseInt(e.target.value) || 0})}/>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Μέγεθος</label>
                <select className="input" value={form.size || ''} onChange={e => setForm({...form, size: e.target.value || null})}>
                  <option value="">—</option>
                  <option value="small">Μικρό</option>
                  <option value="medium">Μεσαίο</option>
                  <option value="large">Μεγάλο</option>
                  <option value="xlarge">Πολύ μεγάλο</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Pet type</label>
                <select className="input" value={form.pet_type || ''} onChange={e => setForm({...form, pet_type: e.target.value || null})}>
                  <option value="">—</option>
                  <option value="dog">🐕 Σκύλος</option>
                  <option value="cat">🐈 Γάτα</option>
                  <option value="rabbit">🐰 Κουνέλι</option>
                  <option value="bird">🐦 Πτηνό</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Modality</label>
                <select className="input" value={form.modality || ''} onChange={e => setForm({...form, modality: e.target.value || null})}>
                  <option value="">—</option>
                  <option value="in_clinic">Στο ιατρείο</option>
                  <option value="home_visit">Κατ' οίκον</option>
                  <option value="telehealth">Τηλεσυμβ.</option>
                  <option value="emergency">Έκτακτο</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Breed group</label>
                <input className="input" value={form.breed_group || ''} onChange={e => setForm({...form, breed_group: e.target.value || null})}
                  placeholder="π.χ. terrier"/>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.is_addon} onChange={e => setForm({...form, is_addon: e.target.checked})}/>
                Add-on
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})}/>
                Ενεργό
              </label>
            </div>
          </div>
          <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex gap-2 justify-end">
            <button onClick={onClose} className="btn-secondary">Άκυρο</button>
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name || !form.category || !form.group} className="btn-primary">
              {saveMutation.isPending ? 'Αποθήκευση...' : (editing ? 'Ενημέρωση' : 'Προσθήκη')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
