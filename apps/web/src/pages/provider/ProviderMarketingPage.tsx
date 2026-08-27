import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Megaphone, Plus, X, Edit, Trash2, Eye, MousePointerClick,
  Percent, Euro, Calendar, Target, MonitorPlay, Users, CheckCircle2,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import CampaignMediaUpload from '@/components/provider/CampaignMediaUpload'

/**
 * Καμπάνιες παρόχου.
 *
 * Μια καμπάνια έχει τρία ανεξάρτητα κομμάτια:
 *   Έκπτωση  — τι εκπτώνει και πόσο
 *   Προβολή  — πού εμφανίζεται banner ή βίντεο
 *   Κοινό    — σε ποιους απευθύνεται
 *
 * Καθένα είναι προαιρετικό: banner χωρίς έκπτωση, έκπτωση χωρίς banner,
 * ή στοχευμένη προσφορά σε λίγους πελάτες.
 */

type Campaign = {
  id: string
  title: string
  description?: string | null
  discount_type?: 'percent' | 'amount' | null
  discount_value?: number | null
  min_order?: number | null
  starts_at: string
  ends_at: string
  boost: number
  is_active: boolean
  views: number
  clicks: number
  redemptions: number
  targets: number
  placements: number
  audience: number
  live: boolean
}

const PAGES: { value: string; label: string }[] = [
  { value: 'all',            label: 'Όλες οι σελίδες' },
  { value: 'home',           label: 'Αρχική' },
  { value: 'services',       label: 'Υπηρεσίες' },
  { value: 'service_detail', label: 'Σελίδα υπηρεσίας' },
  { value: 'marketplace',    label: 'Κατάστημα' },
  { value: 'product_detail', label: 'Σελίδα προϊόντος' },
  { value: 'social',         label: 'Social' },
  { value: 'playdates',      label: 'Playdates' },
  { value: 'communities',    label: 'Κοινότητες' },
  { value: 'events',         label: 'Εκδηλώσεις' },
  { value: 'forum',          label: 'Φόρουμ' },
  { value: 'telehealth',     label: 'Τηλεϊατρική' },
  { value: 'insurance',      label: 'Ασφάλεια' },
  { value: 'pets',           label: 'Τα ζώα μου' },
]

const SLOTS = [
  { value: 'hero',    label: 'Κεντρικό (hero)' },
  { value: 'banner',  label: 'Banner' },
  { value: 'sidebar', label: 'Πλαϊνό' },
  { value: 'inline',  label: 'Μέσα στο περιεχόμενο' },
  { value: 'popup',   label: 'Αναδυόμενο' },
]

const EMPTY = {
  title: '', description: '',
  discount_type: '' as '' | 'percent' | 'amount',
  discount_value: '', min_order: '',
  starts_at: new Date().toISOString().slice(0, 10),
  ends_at: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
  boost: '0', is_active: true,
}

export default function ProviderMarketingPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Campaign | null>(null)
  const [form, setForm] = useState<any>(EMPTY)
  const [detailFor, setDetailFor] = useState<Campaign | null>(null)
  const [tab, setTab] = useState<'targets' | 'placements' | 'audience'>('targets')

  // ── Δεδομένα ────────────────────────────────────────────────────────
  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ['my-campaigns'],
    queryFn: () => api.get('/campaigns/mine').then(r => r.data?.data ?? []),
  })

  const { data: services = [] } = useQuery({
    queryKey: ['my-services-all'],
    queryFn: () => api.get('/services/my').then(r => r.data?.data ?? []),
  })

  const { data: products = [] } = useQuery({
    queryKey: ['my-products'],
    queryFn: () => api.get('/products/my').then(r => r.data?.data ?? []).catch(() => []),
  })

  const { data: customers = [] } = useQuery({
    queryKey: ['my-customers'],
    queryFn: () => api.get('/customers').then(r => r.data?.data ?? []).catch(() => []),
    enabled: !!detailFor,
  })

  const { data: detail } = useQuery({
    queryKey: ['campaign', detailFor?.id],
    queryFn: () => api.get(`/campaigns/${detailFor!.id}`).then(r => r.data?.data),
    enabled: !!detailFor,
  })

  // ── Ενέργειες ───────────────────────────────────────────────────────
  const save = useMutation({
    mutationFn: (body: any) =>
      editing ? api.patch(`/campaigns/${editing.id}`, body) : api.post('/campaigns', body),
    onSuccess: () => {
      toast.success(editing ? 'Αποθηκεύτηκε' : 'Η καμπάνια δημιουργήθηκε')
      qc.invalidateQueries({ queryKey: ['my-campaigns'] })
      setShowForm(false); setEditing(null); setForm(EMPTY)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Σφάλμα αποθήκευσης'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/campaigns/${id}`),
    onSuccess: () => {
      toast.success('Διαγράφηκε')
      qc.invalidateQueries({ queryKey: ['my-campaigns'] })
      setDetailFor(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Σφάλμα διαγραφής'),
  })

  const toggle = useMutation({
    mutationFn: (c: Campaign) => api.patch(`/campaigns/${c.id}`, { is_active: !c.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-campaigns'] }),
  })

  const saveTargets = useMutation({
    mutationFn: (targets: any[]) => api.put(`/campaigns/${detailFor!.id}/targets`, { targets }),
    onSuccess: () => {
      toast.success('Αποθηκεύτηκε τι αφορά')
      qc.invalidateQueries({ queryKey: ['campaign', detailFor?.id] })
      qc.invalidateQueries({ queryKey: ['my-campaigns'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Σφάλμα'),
  })

  const savePlacements = useMutation({
    mutationFn: (placements: any[]) => api.put(`/campaigns/${detailFor!.id}/placements`, { placements }),
    onSuccess: () => {
      toast.success('Αποθηκεύτηκαν οι προβολές')
      qc.invalidateQueries({ queryKey: ['campaign', detailFor?.id] })
      qc.invalidateQueries({ queryKey: ['my-campaigns'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Σφάλμα'),
  })

  const saveAudience = useMutation({
    mutationFn: (emails: string[]) => api.put(`/campaigns/${detailFor!.id}/audience`, { emails }),
    onSuccess: () => {
      toast.success('Αποθηκεύτηκε το κοινό')
      qc.invalidateQueries({ queryKey: ['campaign', detailFor?.id] })
      qc.invalidateQueries({ queryKey: ['my-campaigns'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Σφάλμα'),
  })

  // ── Βοηθητικά ───────────────────────────────────────────────────────
  const openNew = () => { setEditing(null); setForm(EMPTY); setShowForm(true) }

  const openEdit = (c: Campaign) => {
    setEditing(c)
    setForm({
      title: c.title, description: c.description || '',
      discount_type: c.discount_type || '',
      discount_value: c.discount_value != null ? String(c.discount_value) : '',
      min_order: c.min_order != null ? String(c.min_order) : '',
      starts_at: c.starts_at.slice(0, 10),
      ends_at: c.ends_at.slice(0, 10),
      boost: String(c.boost ?? 0),
      is_active: c.is_active,
    })
    setShowForm(true)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return toast.error('Ο τίτλος είναι υποχρεωτικός')
    if (new Date(form.ends_at) <= new Date(form.starts_at)) {
      return toast.error('Η λήξη πρέπει να είναι μετά την έναρξη')
    }
    const hasType = !!form.discount_type
    const hasValue = form.discount_value !== ''
    if (hasType !== hasValue) {
      return toast.error('Συμπλήρωσε και τύπο και ποσό έκπτωσης, ή κανένα')
    }
    if (hasType && form.discount_type === 'percent' && Number(form.discount_value) > 100) {
      return toast.error('Το ποσοστό δεν μπορεί να ξεπερνά το 100')
    }
    save.mutate({
      title: form.title.trim(),
      description: form.description || null,
      discount_type: hasType ? form.discount_type : null,
      discount_value: hasValue ? Number(form.discount_value) : null,
      min_order: form.min_order !== '' ? Number(form.min_order) : null,
      starts_at: form.starts_at,
      ends_at: form.ends_at,
      boost: Number(form.boost) || 0,
      is_active: form.is_active,
    })
  }

  const discountLabel = (c: Campaign) =>
    !c.discount_type ? 'μόνο προβολή'
      : c.discount_type === 'percent' ? `-${c.discount_value}%` : `-${c.discount_value}€`

  const daysLeft = (iso: string) =>
    Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5)

  return (
    <div className="space-y-5">

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Megaphone size={18} className="text-brand-900" />
            Καμπάνιες
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Εκπτώσεις, banner στο site και στοχευμένες προσφορές σε πελάτες.
          </p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> Νέα καμπάνια
        </button>
      </div>

      {/* Λίστα */}
      {isLoading ? (
        <div className="card p-12 text-center text-gray-500">Φόρτωση...</div>
      ) : campaigns.length === 0 ? (
        <div className="card p-12 text-center">
          <Megaphone size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-700 dark:text-gray-300">Δεν έχεις καμπάνιες</p>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            Φτιάξε έκπτωση σε συγκεκριμένες υπηρεσίες, banner στην αρχική, ή
            προσφορά μόνο για τους καλύτερους πελάτες σου.
          </p>
          <button onClick={openNew} className="btn-primary inline-flex items-center gap-2 mt-4">
            <Plus size={15} /> Νέα καμπάνια
          </button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {campaigns.map(c => {
            const left = daysLeft(c.ends_at)
            return (
              <motion.div key={c.id} layout
                className={cn('card p-4', !c.is_active && 'opacity-60')}>

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 dark:text-white truncate">
                        {c.title}
                      </span>
                      {c.live ? (
                        <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          ενεργή
                        </span>
                      ) : (
                        <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-gray-200 text-gray-600">
                          {new Date(c.starts_at) > new Date() ? 'προγραμματισμένη' : 'έληξε'}
                        </span>
                      )}
                    </div>
                    {c.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{c.description}</p>
                    )}
                  </div>

                  <span className={cn(
                    'text-sm font-bold shrink-0 px-2 py-1 rounded-lg',
                    c.discount_type
                      ? 'bg-brand-100 text-brand-900 dark:bg-brand-900/30 dark:text-brand-200'
                      : 'bg-gray-100 text-gray-500 text-xs font-medium',
                  )}>
                    {discountLabel(c)}
                  </span>
                </div>

                {/* Τα τρία κομμάτια */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <span className={cn('inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full',
                    c.targets ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400')}>
                    <Target size={11} /> {c.targets ? `${c.targets} στόχοι` : 'χωρίς στόχο'}
                  </span>
                  <span className={cn('inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full',
                    c.placements ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                 : 'bg-gray-50 text-gray-400')}>
                    <MonitorPlay size={11} /> {c.placements ? `${c.placements} προβολές` : 'χωρίς banner'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    <Users size={11} /> {c.audience ? `${c.audience} πελάτες` : 'σε όλους'}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1"><Eye size={12} /> {c.views}</span>
                  <span className="inline-flex items-center gap-1"><MousePointerClick size={12} /> {c.clicks}</span>
                  <span className="inline-flex items-center gap-1"><CheckCircle2 size={12} /> {c.redemptions}</span>
                  <span className="ml-auto">
                    {left > 0 ? `${left} μέρες ακόμα` : 'έληξε'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <button onClick={() => { setDetailFor(c); setTab('targets') }}
                    className="btn-secondary text-xs py-1.5">Ρυθμίσεις</button>
                  <button onClick={() => openEdit(c)} className="btn-ghost flex items-center gap-1.5 text-xs py-1.5">
                    <Edit size={13} /> Επεξεργασία
                  </button>
                  <button onClick={() => toggle.mutate(c)} className="btn-ghost text-xs py-1.5">
                    {c.is_active ? 'Παύση' : 'Ενεργοποίηση'}
                  </button>
                  <button
                    onClick={() => { if (confirm(`Διαγραφή της καμπάνιας «${c.title}»;`)) remove.mutate(c.id) }}
                    className="btn-ghost p-1.5 hover:bg-red-50 ml-auto">
                    <Trash2 size={13} className="text-red-400" />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ── Φόρμα καμπάνιας ──────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowForm(false)}>
            <motion.div className="card w-full max-w-xl max-h-[90vh] overflow-y-auto p-6"
              initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }}
              onClick={e => e.stopPropagation()}>

              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-display font-bold">
                  {editing ? 'Επεξεργασία καμπάνιας' : 'Νέα καμπάνια'}
                </h3>
                <button onClick={() => setShowForm(false)} className="btn-ghost p-2"><X size={18} /></button>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="label">Τίτλος *</label>
                  <input className="input" value={form.title} required
                    placeholder="π.χ. Φθινοπωρινή προσφορά"
                    onChange={e => setForm({ ...form, title: e.target.value })} />
                </div>

                <div>
                  <label className="label">Περιγραφή</label>
                  <textarea className="input" rows={2} value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                    Έκπτωση — προαιρετική
                  </p>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                      <label className="label">Τύπος</label>
                      <select className="input" value={form.discount_type}
                        onChange={e => setForm({ ...form, discount_type: e.target.value })}>
                        <option value="">— χωρίς —</option>
                        <option value="percent">Ποσοστό %</option>
                        <option value="amount">Ποσό €</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">
                        {form.discount_type === 'amount' ? 'Ευρώ' : 'Ποσοστό'}
                      </label>
                      <input className="input" type="number" min={0}
                        max={form.discount_type === 'percent' ? 100 : undefined}
                        step={form.discount_type === 'amount' ? '0.01' : '1'}
                        value={form.discount_value} disabled={!form.discount_type}
                        onChange={e => setForm({ ...form, discount_value: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Ελάχιστο ποσό</label>
                      <input className="input" type="number" min={0} step="0.01"
                        placeholder="—" value={form.min_order}
                        onChange={e => setForm({ ...form, min_order: e.target.value })} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Άφησε τον τύπο κενό για καμπάνια μόνο προβολής, χωρίς έκπτωση.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Έναρξη *</label>
                    <input className="input" type="date" value={form.starts_at} required
                      onChange={e => setForm({ ...form, starts_at: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Λήξη *</label>
                    <input className="input" type="date" value={form.ends_at} required
                      onChange={e => setForm({ ...form, ends_at: e.target.value })} />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Προτεραιότητα προβολής</label>
                    <input className="input" type="number" min={0} max={100} value={form.boost}
                      onChange={e => setForm({ ...form, boost: e.target.value })} />
                    <p className="text-xs text-gray-500 mt-1">
                      Μεγαλύτερο = εμφανίζεται ψηλότερα.
                    </p>
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.is_active}
                        onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                      Ενεργή
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                    Ακύρωση
                  </button>
                  <button type="submit" className="btn-primary" disabled={save.isPending}>
                    {save.isPending ? 'Αποθήκευση...' : (editing ? 'Αποθήκευση' : 'Δημιουργία')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Ρυθμίσεις: στόχοι, προβολές, κοινό ───────────────────── */}
      <AnimatePresence>
        {detailFor && (
          <CampaignSettings
            campaign={detailFor}
            detail={detail}
            services={services}
            products={products}
            customers={customers}
            tab={tab}
            setTab={setTab}
            onClose={() => setDetailFor(null)}
            onSaveTargets={t => saveTargets.mutate(t)}
            onSavePlacements={p => savePlacements.mutate(p)}
            onSaveAudience={a => saveAudience.mutate(a)}
            pending={saveTargets.isPending || savePlacements.isPending || saveAudience.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  Ρυθμίσεις καμπάνιας
// ═══════════════════════════════════════════════════════════════════════

function CampaignSettings({
  campaign, detail, services, products, customers,
  tab, setTab, onClose, onSaveTargets, onSavePlacements, onSaveAudience, pending,
}: any) {
  const [targets, setTargets] = useState<any[] | null>(null)
  const [placements, setPlacements] = useState<any[] | null>(null)
  const [audience, setAudience] = useState<string[] | null>(null)

  const T = targets ?? detail?.targets ?? []
  const P = placements ?? detail?.placements ?? []
  const A = audience ?? detail?.audience ?? []

  const hasTarget = (type: string, id?: string) =>
    T.some((t: any) => t.target_type === type && (id ? t.target_id === id : !t.target_id))

  const toggleTarget = (type: string, id?: string) => {
    const next = hasTarget(type, id)
      ? T.filter((t: any) => !(t.target_type === type && (id ? t.target_id === id : !t.target_id)))
      : [...T, { target_type: type, target_id: id ?? null }]
    setTargets(next)
  }

  const addPlacement = () =>
    setPlacements([...P, { page: 'home', slot: 'banner', media_type: 'image',
                           headline: campaign.title, is_active: true }])

  const updPlacement = (i: number, patch: any) =>
    setPlacements(P.map((p: any, j: number) => j === i ? { ...p, ...patch } : p))

  const delPlacement = (i: number) =>
    setPlacements(P.filter((_: any, j: number) => j !== i))

  const toggleCustomer = (email: string) =>
    setAudience(A.includes(email) ? A.filter((e: string) => e !== email) : [...A, email])

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="card w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6"
        initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }}
        onClick={(e: any) => e.stopPropagation()}>

        <div className="flex items-start justify-between mb-1 gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-display font-bold truncate">{campaign.title}</h3>
            <p className="text-sm text-gray-500">Ρυθμίσεις καμπάνιας</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-2 shrink-0"><X size={18} /></button>
        </div>

        <div className="flex gap-1.5 mt-4 mb-5 flex-wrap">
          {[
            { id: 'targets',    label: 'Τι αφορά',       icon: Target },
            { id: 'placements', label: 'Πού προβάλλεται', icon: MonitorPlay },
            { id: 'audience',   label: 'Σε ποιους',       icon: Users },
          ].map(t => {
            const Icon = t.icon
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-colors',
                  tab === t.id ? 'bg-brand-900 text-white'
                               : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300')}>
                <Icon size={14} /> {t.label}
              </button>
            )
          })}
        </div>

        {/* ── Τι αφορά ─────────────────────────────────────────── */}
        {tab === 'targets' && (
          <div className="space-y-4">
            {!campaign.discount_type && (
              <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
                Η καμπάνια δεν έχει έκπτωση, οπότε οι στόχοι δεν επηρεάζουν τιμές.
                Χρησιμεύουν μόνο αν προσθέσεις έκπτωση αργότερα.
              </p>
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Συνολικά</p>
              <div className="flex flex-wrap gap-1.5">
                {[['all_services', 'Όλες οι υπηρεσίες μου'], ['all_products', 'Όλα τα προϊόντα μου']].map(([type, label]) => (
                  <button key={type} type="button" onClick={() => toggleTarget(type)}
                    className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors',
                      hasTarget(type) ? 'bg-brand-900 text-white border-brand-900'
                                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300')}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {services.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  Συγκεκριμένες υπηρεσίες
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {services.map((s: any) => (
                    <button key={s.id} type="button" onClick={() => toggleTarget('service', s.id)}
                      className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors',
                        hasTarget('service', s.id) ? 'bg-brand-900 text-white border-brand-900'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300')}>
                      {s.title || s.provider_name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {products.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  Συγκεκριμένα προϊόντα
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {products.map((p: any) => (
                    <button key={p.id} type="button" onClick={() => toggleTarget('product', p.id)}
                      className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors',
                        hasTarget('product', p.id) ? 'bg-brand-900 text-white border-brand-900'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300')}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button onClick={() => onSaveTargets(T)} className="btn-primary" disabled={pending}>
                Αποθήκευση ({T.length})
              </button>
            </div>
          </div>
        )}

        {/* ── Πού προβάλλεται ──────────────────────────────────── */}
        {tab === 'placements' && (
          <div className="space-y-3">
            {P.length === 0 && (
              <p className="text-sm text-gray-500 py-4 text-center">
                Καμία προβολή. Πρόσθεσε banner ή βίντεο σε όποιες σελίδες θέλεις.
              </p>
            )}

            {P.map((p: any, i: number) => (
              <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-3">
                <div className="grid sm:grid-cols-3 gap-2">
                  <div>
                    <label className="label">Σελίδα</label>
                    <select className="input text-sm" value={p.page}
                      onChange={e => updPlacement(i, { page: e.target.value })}>
                      {PAGES.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Θέση</label>
                    <select className="input text-sm" value={p.slot || 'banner'}
                      onChange={e => updPlacement(i, { slot: e.target.value })}>
                      {SLOTS.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Μέσο</label>
                    <select className="input text-sm" value={p.media_type || 'image'}
                      onChange={e => updPlacement(i, { media_type: e.target.value })}>
                      <option value="image">Εικόνα</option>
                      <option value="video">Βίντεο</option>
                      <option value="none">Μόνο κείμενο</option>
                    </select>
                  </div>
                </div>

                {p.media_type !== 'none' && (
                  <CampaignMediaUpload
                    slot={p.slot || 'banner'}
                    mediaType={p.media_type === 'video' ? 'video' : 'image'}
                    value={p.media_url}
                    onChange={(url) => updPlacement(i, { media_url: url })}
                  />
                )}

                <div className="grid sm:grid-cols-2 gap-2">
                  <div>
                    <label className="label">Τίτλος</label>
                    <input className="input text-sm" value={p.headline || ''}
                      onChange={e => updPlacement(i, { headline: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Κείμενο κουμπιού</label>
                    <input className="input text-sm" value={p.cta_label || ''}
                      placeholder="Δες την προσφορά"
                      onChange={e => updPlacement(i, { cta_label: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="label">Υπότιτλος</label>
                  <input className="input text-sm" value={p.subtext || ''}
                    onChange={e => updPlacement(i, { subtext: e.target.value })} />
                </div>

                <div>
                  <label className="label">Πού οδηγεί το κλικ</label>
                  {/* Dropdown αντί για ελεύθερο κείμενο: ο πάροχος δεν
                      χρειάζεται να ξέρει διαδρομές, και δεν κάνει λάθος. */}
                  <select className="input text-sm" value={p.link_url || ''}
                    onChange={e => updPlacement(i, { link_url: e.target.value })}>
                    <option value="">— πουθενά —</option>
                    <optgroup label="Γενικά">
                      <option value="/services">Όλες οι υπηρεσίες</option>
                      <option value="/marketplace">Το κατάστημα</option>
                    </optgroup>
                    {services.length > 0 && (
                      <optgroup label="Οι υπηρεσίες μου">
                        {services.map((s: any) => (
                          <option key={s.id} value={`/services/${s.id}`}>
                            {s.title || s.provider_name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {products.length > 0 && (
                      <optgroup label="Τα προϊόντα μου">
                        {products.map((pr: any) => (
                          <option key={pr.id} value={`/products/${pr.id}`}>{pr.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div className="flex justify-end">
                  <button type="button" onClick={() => delPlacement(i)}
                    className="btn-ghost text-xs py-1 text-red-500">Αφαίρεση</button>
                </div>
              </div>
            ))}

            <div className="flex justify-between pt-2">
              <button onClick={addPlacement} className="btn-secondary text-sm">
                <Plus size={14} className="inline mr-1" /> Προσθήκη προβολής
              </button>
              <button onClick={() => onSavePlacements(P)} className="btn-primary" disabled={pending}>
                Αποθήκευση ({P.length})
              </button>
            </div>
          </div>
        )}

        {/* ── Σε ποιους ────────────────────────────────────────── */}
        {tab === 'audience' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              {A.length === 0
                ? 'Χωρίς επιλογή, η καμπάνια ισχύει για όλους. Επίλεξε πελάτες για στοχευμένη προσφορά.'
                : `Η προσφορά θα ισχύει μόνο για ${A.length} πελάτες.`}
            </p>

            {customers.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">
                Δεν έχεις ακόμα πελάτες με κρατήσεις.
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
                {customers.map((c: any) => (
                  <button key={c.email} type="button" onClick={() => toggleCustomer(c.email)}
                    className="w-full flex items-center gap-3 p-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <input type="checkbox" readOnly checked={A.includes(c.email)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name || c.email}</p>
                      <p className="text-xs text-gray-500">
                        {c.bookings} κρατήσεις · {Math.round(c.spent)}€
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button onClick={() => setAudience([])} className="btn-ghost text-sm">
                Καθαρισμός — σε όλους
              </button>
              <button onClick={() => onSaveAudience(A)} className="btn-primary" disabled={pending}>
                Αποθήκευση ({A.length})
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
