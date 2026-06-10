import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, Trash2, Edit2, Check, X, Search, ArrowLeft, Clock, Building2, AlertTriangle
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
  other: { label: 'Άλλα', emoji: '📋' },
}

const SIZE_LABELS: Record<string, string> = {
  small: 'Μικρό', medium: 'Μεσαίο', large: 'Μεγάλο', xlarge: 'Πολύ μεγάλο'
}

export default function AdminPackagesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterGroup, setFilterGroup] = useState('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'no_price'>('all')
  const [editingPkg, setEditingPkg] = useState<any>(null)

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['admin-packages'],
    queryFn: () => api.get('/admin/catalog/packages').then(r => r.data?.data ?? []),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/catalog/packages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-packages'] })
      toast.success('Πακέτο διαγράφηκε')
    },
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: any) => api.patch(`/admin/catalog/packages/${id}`, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-packages'] }),
  })

  const filtered = useMemo(() => {
    return packages.filter((p: any) => {
      if (filterGroup !== 'all' && p.group !== filterGroup) return false
      if (filterStatus === 'active' && !p.is_active) return false
      if (filterStatus === 'inactive' && p.is_active) return false
      if (filterStatus === 'no_price' && p.price > 0) return false
      if (search) {
        const q = search.toLowerCase()
        if (!p.name?.toLowerCase().includes(q) &&
            !p.service?.title?.toLowerCase().includes(q) &&
            !p.service?.provider_email?.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [packages, search, filterGroup, filterStatus])

  const groups = useMemo(() => Array.from(new Set<string>(packages.map((p: any) => p.group as string))), [packages])

  const noPriceCount = packages.filter((p: any) => !p.price || p.price === 0).length

  return (
    <div className="page-container py-8 pb-24 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin" className="btn-ghost p-2"><ArrowLeft size={18}/></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package size={22}/> Πακέτα παρόχων
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Όλα τα πακέτα όλων των παρόχων στην πλατφόρμα</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex items-center gap-2 flex-1 input">
          <Search size={14} className="text-gray-400 shrink-0"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Αναζήτηση (πακέτο, υπηρεσία, email)..."
            className="flex-1 bg-transparent text-sm outline-none"/>
        </div>
        <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} className="input text-sm">
          <option value="all">Όλες οι ομάδες</option>
          {groups.map(g => <option key={g} value={g}>{GROUP_META[g]?.label || g}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="input text-sm">
          <option value="all">Όλα</option>
          <option value="active">Ενεργά</option>
          <option value="inactive">Ανενεργά</option>
          <option value="no_price">Χωρίς τιμή</option>
        </select>
      </div>

      <div className="card p-4 mb-4 bg-gradient-to-br from-brand-50 to-amber-50 dark:from-brand-900/20 dark:to-amber-900/20 border-brand-100">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          <strong>{filtered.length}</strong> από <strong>{packages.length}</strong> πακέτα
          {noPriceCount > 0 && (
            <span className="text-amber-700 ml-2">
              · ⚠️ {noPriceCount} χωρίς τιμή
            </span>
          )}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="skeleton h-20 w-full"/>)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Package size={40} className="mx-auto text-gray-300 mb-3"/>
          <h3 className="font-semibold text-gray-900 dark:text-white">Δεν βρέθηκαν πακέτα</h3>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((pkg: any) => {
            const meta = GROUP_META[pkg.group] || GROUP_META.other
            return (
              <div key={pkg.id} className={cn('card p-3 flex items-center gap-3', !pkg.is_active && 'opacity-60')}>
                <span className="text-2xl shrink-0">{meta.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{pkg.name}</p>
                    {pkg.size && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{SIZE_LABELS[pkg.size]}</span>}
                    {pkg.modality && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">{pkg.modality}</span>}
                    {pkg.pet_type && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700">{pkg.pet_type === 'dog' ? '🐕' : '🐈'}</span>}
                    {pkg.is_addon && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">Add-on</span>}
                    {!pkg.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">Ανενεργό</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1"><Building2 size={11}/> {pkg.service?.title || '—'}</span>
                    <span className="text-gray-400">{pkg.service?.provider_email}</span>
                    <span className="flex items-center gap-1"><Clock size={11}/> {pkg.duration_minutes}΄</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {pkg.price > 0 ? (
                    <p className="font-bold text-lg text-gray-900 dark:text-white">€{pkg.price.toFixed(2)}</p>
                  ) : (
                    <p className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                      <AlertTriangle size={11}/> Χωρίς τιμή
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleActive.mutate({ id: pkg.id, is_active: !pkg.is_active })} className="btn-ghost p-1.5">
                    {pkg.is_active ? <Check size={14} className="text-green-600"/> : <X size={14} className="text-gray-400"/>}
                  </button>
                  <button onClick={() => setEditingPkg(pkg)} className="btn-ghost p-1.5">
                    <Edit2 size={14} className="text-gray-500"/>
                  </button>
                  <button onClick={() => { if (confirm(`Διαγραφή "${pkg.name}";`)) deleteMutation.mutate(pkg.id) }}
                    className="btn-ghost p-1.5 hover:bg-red-50">
                    <Trash2 size={14} className="text-red-500"/>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <PackageEditModal
        open={!!editingPkg}
        onClose={() => setEditingPkg(null)}
        pkg={editingPkg}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-packages'] })
          setEditingPkg(null)
        }}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
function PackageEditModal({ open, onClose, pkg, onSaved }: any) {
  const [form, setForm] = useState<any>({})

  useEffect(() => {
    if (pkg && open) {
      setForm({
        name: pkg.name || '',
        group: pkg.group || 'service',
        description: pkg.description || '',
        size: pkg.size || '',
        pet_type: pkg.pet_type || '',
        modality: pkg.modality || '',
        breed_group: pkg.breed_group || '',
        price: String(pkg.price || ''),
        duration_minutes: pkg.duration_minutes || 60,
        is_addon: !!pkg.is_addon,
        is_active: pkg.is_active !== false,
      })
    }
  }, [pkg, open])

  const saveMutation = useMutation({
    mutationFn: () => api.patch(`/admin/catalog/packages/${pkg.id}`, form),
    onSuccess: () => { toast.success('Πακέτο ενημερώθηκε'); onSaved() },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Σφάλμα'),
  })

  if (!open || !pkg) return null

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
          onClick={e => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-modal max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">Επεξεργασία πακέτου</h3>
              <p className="text-xs text-gray-500 mt-0.5">{pkg.service?.title} · {pkg.service?.provider_email}</p>
            </div>
            <button onClick={onClose} className="btn-ghost p-2"><X size={18}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Όνομα *</label>
              <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Ομάδα</label>
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
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Modality</label>
                <select className="input" value={form.modality || ''} onChange={e => setForm({...form, modality: e.target.value || null})}>
                  <option value="">—</option>
                  <option value="in_clinic">Στο ιατρείο</option>
                  <option value="home_visit">Κατ' οίκον</option>
                  <option value="telehealth">Τηλεσυμβ.</option>
                </select>
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
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name} className="btn-primary">
              {saveMutation.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
