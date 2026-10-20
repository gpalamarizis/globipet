import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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

const PAGES: { value: string; labelKey: string }[] = [
  { value: 'all',            labelKey: 'providerMkt.pgAll' },
  { value: 'home',           labelKey: 'providerMkt.pgHome' },
  { value: 'services',       labelKey: 'providerMkt.pgServices' },
  { value: 'service_detail', labelKey: 'providerMkt.pgServiceDetail' },
  { value: 'marketplace',    labelKey: 'providerMkt.pgMarketplace' },
  { value: 'product_detail', labelKey: 'providerMkt.pgProductDetail' },
  { value: 'social',         labelKey: 'providerMkt.pgSocial' },
  { value: 'playdates',      labelKey: 'providerMkt.pgPlaydates' },
  { value: 'communities',    labelKey: 'providerMkt.pgCommunities' },
  { value: 'events',         labelKey: 'providerMkt.pgEvents' },
  { value: 'forum',          labelKey: 'providerMkt.pgForum' },
  { value: 'telehealth',     labelKey: 'providerMkt.pgTelehealth' },
  { value: 'insurance',      labelKey: 'providerMkt.pgInsurance' },
  { value: 'pets',           labelKey: 'providerMkt.pgMyPets' },
]

const SLOTS = [
  { value: 'hero',    labelKey: 'providerMkt.slHero' },
  { value: 'banner',  labelKey: 'providerMkt.slBanner' },
  { value: 'sidebar', labelKey: 'providerMkt.slSidebar' },
  { value: 'inline',  labelKey: 'providerMkt.slInline' },
  { value: 'popup',   labelKey: 'providerMkt.slPopup' },
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
  const { t } = useTranslation()
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
      toast.success(editing ? t('providerMkt.saved') : t('providerMkt.created'))
      qc.invalidateQueries({ queryKey: ['my-campaigns'] })
      setShowForm(false); setEditing(null); setForm(EMPTY)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('providerMkt.errSave')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/campaigns/${id}`),
    onSuccess: () => {
      toast.success(t('providerMkt.deleted'))
      qc.invalidateQueries({ queryKey: ['my-campaigns'] })
      setDetailFor(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('providerMkt.errDelete')),
  })

  const toggle = useMutation({
    mutationFn: (c: Campaign) => api.patch(`/campaigns/${c.id}`, { is_active: !c.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-campaigns'] }),
    onError: (e: any) => toast.error(e?.response?.data?.message || t('providerMkt.errSave')),
  })

  const saveTargets = useMutation({
    mutationFn: (targets: any[]) => api.put(`/campaigns/${detailFor!.id}/targets`, { targets }),
    onSuccess: () => {
      toast.success(t('providerMkt.savedTargets'))
      qc.invalidateQueries({ queryKey: ['campaign', detailFor?.id] })
      qc.invalidateQueries({ queryKey: ['my-campaigns'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('providerMkt.error')),
  })

  const savePlacements = useMutation({
    mutationFn: (placements: any[]) => api.put(`/campaigns/${detailFor!.id}/placements`, { placements }),
    onSuccess: () => {
      toast.success(t('providerMkt.savedPlacements'))
      qc.invalidateQueries({ queryKey: ['campaign', detailFor?.id] })
      qc.invalidateQueries({ queryKey: ['my-campaigns'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('providerMkt.error')),
  })

  const saveAudience = useMutation({
    mutationFn: (emails: string[]) => api.put(`/campaigns/${detailFor!.id}/audience`, { emails }),
    onSuccess: () => {
      toast.success(t('providerMkt.savedAudience'))
      qc.invalidateQueries({ queryKey: ['campaign', detailFor?.id] })
      qc.invalidateQueries({ queryKey: ['my-campaigns'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('providerMkt.error')),
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
    if (!form.title.trim()) return toast.error(t('providerMkt.errTitleRequired'))
    if (new Date(form.ends_at) <= new Date(form.starts_at)) {
      return toast.error(t('providerMkt.errEndBeforeStart'))
    }
    const hasType = !!form.discount_type
    const hasValue = form.discount_value !== ''
    if (hasType !== hasValue) {
      return toast.error(t('providerMkt.errDiscountPair'))
    }
    // Ίδιος κανόνας με το κινητό και τον server: η έκπτωση πρέπει να είναι > 0.
    if (hasType && !(Number(form.discount_value) > 0)) {
      return toast.error(t('providerMkt.errDiscountPair'))
    }
    if (hasType && form.discount_type === 'percent' && Number(form.discount_value) >= 100) {
      return toast.error(t('providerMkt.errPercentBelow100'))
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
    !c.discount_type ? t('providerMkt.stDisplayOnly')
      : c.discount_type === 'percent' ? `-${c.discount_value}%` : `-${c.discount_value}€`

  const daysLeft = (iso: string) =>
    Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5)

  return (
    <div className="space-y-5">

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Megaphone size={18} className="text-brand-900" />{t('providerMkt.title')}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{t('providerMkt.subtitle')}</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} />{t('providerMkt.newCampaign')}</button>
      </div>

      {/* Λίστα */}
      {isLoading ? (
        <div className="card p-12 text-center text-gray-500">{t('providerMkt.loading')}</div>
      ) : campaigns.length === 0 ? (
        <div className="card p-12 text-center">
          <Megaphone size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-700 dark:text-gray-300">{t('providerMkt.empty')}</p>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            {t('providerMkt.emptyHint')}
          </p>
          <button onClick={openNew} className="btn-primary inline-flex items-center gap-2 mt-4">
            <Plus size={15} />{t('providerMkt.newCampaign')}</button>
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
                        <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{t('providerMkt.stActive')}</span>
                      ) : (
                        <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-gray-200 text-gray-600">
                          {new Date(c.starts_at) > new Date() ? t('providerMkt.stScheduled') : t('providerMkt.stExpired')}
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
                    <Target size={11} /> {c.targets ? t('providerMkt.targetCount', { count: c.targets }) : t('providerMkt.noTarget')}
                  </span>
                  <span className={cn('inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full',
                    c.placements ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                 : 'bg-gray-50 text-gray-400')}>
                    <MonitorPlay size={11} /> {c.placements ? t('providerMkt.placementCount', { count: c.placements }) : t('providerMkt.noBanner')}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    <Users size={11} /> {c.audience ? t('providerMkt.audienceCount', { count: c.audience }) : t('providerMkt.toEveryone')}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1"><Eye size={12} /> {c.views}</span>
                  <span className="inline-flex items-center gap-1"><MousePointerClick size={12} /> {c.clicks}</span>
                  <span className="inline-flex items-center gap-1"><CheckCircle2 size={12} /> {c.redemptions}</span>
                  <span className="ml-auto">
                    {left > 0 ? t('providerMkt.daysLeft', { count: left }) : t('providerMkt.stExpired')}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <button onClick={() => { setDetailFor(c); setTab('targets') }}
                    className="btn-secondary text-xs py-1.5">{t('providerMkt.settings')}</button>
                  <button onClick={() => openEdit(c)} className="btn-ghost flex items-center gap-1.5 text-xs py-1.5">
                    <Edit size={13} />{t('providerMkt.edit')}</button>
                  <button onClick={() => toggle.mutate(c)} className="btn-ghost text-xs py-1.5">
                    {c.is_active ? t('providerMkt.pause') : t('providerMkt.enable')}
                  </button>
                  <button
                    onClick={() => { if (confirm(t('providerMkt.confirmDelete', { name: c.title }))) remove.mutate(c.id) }}
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
                  {editing ? t('providerMkt.editCampaign') : t('providerMkt.newCampaign')}
                </h3>
                <button onClick={() => setShowForm(false)} className="btn-ghost p-2"><X size={18} /></button>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="label">{t('providerMkt.fTitleReq')}</label>
                  <input className="input" value={form.title} required
                    placeholder={t('providerMkt.phTitle')}
                    onChange={e => setForm({ ...form, title: e.target.value })} />
                </div>

                <div>
                  <label className="label">{t('providerMkt.fDescription')}</label>
                  <textarea className="input" rows={2} value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{t('providerMkt.fDiscount')}</p>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                      <label className="label">{t('providerMkt.fType')}</label>
                      <select className="input" value={form.discount_type}
                        onChange={e => setForm({ ...form, discount_type: e.target.value })}>
                        <option value="">{t('providerMkt.none')}</option>
                        <option value="percent">{t('providerMkt.fPercentPct')}</option>
                        <option value="amount">{t('providerMkt.fAmountEur')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">
                        {form.discount_type === 'amount' ? t('providerMkt.fEuro') : t('providerMkt.fPercent')}
                      </label>
                      <input className="input" type="number" min={0}
                        max={form.discount_type === 'percent' ? 100 : undefined}
                        step={form.discount_type === 'amount' ? '0.01' : '1'}
                        value={form.discount_value} disabled={!form.discount_type}
                        onChange={e => setForm({ ...form, discount_value: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">{t('providerMkt.fMinAmount')}</label>
                      <input className="input" type="number" min={0} step="0.01"
                        placeholder="—" value={form.min_order}
                        onChange={e => setForm({ ...form, min_order: e.target.value })} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{t('providerMkt.noDiscountHint')}</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">{t('providerMkt.fStart')}</label>
                    <input className="input" type="date" value={form.starts_at} required
                      onChange={e => setForm({ ...form, starts_at: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">{t('providerMkt.fEnd')}</label>
                    <input className="input" type="date" value={form.ends_at} required
                      onChange={e => setForm({ ...form, ends_at: e.target.value })} />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">{t('providerMkt.fPriority')}</label>
                    <input className="input" type="number" min={0} max={100} value={form.boost}
                      onChange={e => setForm({ ...form, boost: e.target.value })} />
                    <p className="text-xs text-gray-500 mt-1">{t('providerMkt.priorityHint')}</p>
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.is_active}
                        onChange={e => setForm({ ...form, is_active: e.target.checked })} />{t('providerMkt.active')}</label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">{t('providerMkt.cancel')}</button>
                  <button type="submit" className="btn-primary" disabled={save.isPending}>
                    {save.isPending ? t('providerMkt.saving') : (editing ? t('providerMkt.save') : t('providerMkt.create'))}
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
            onSaveTargets={(t: any) => saveTargets.mutate(t)}
            onSavePlacements={(p: any) => savePlacements.mutate(p)}
            onSaveAudience={(a: any) => saveAudience.mutate(a)}
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
  const { t } = useTranslation()
  const [targets, setTargets] = useState<any[] | null>(null)
  const [placements, setPlacements] = useState<any[] | null>(null)
  const [audience, setAudience] = useState<string[] | null>(null)

  const T = targets ?? detail?.targets ?? []
  // Παλιές προβολές με /products/:id εμφανίζονται με τη σωστή διαδρομή.
  const P = placements ?? (detail?.placements ?? []).map((p: any) =>
    p.link_url ? { ...p, link_url: String(p.link_url).replace(/^\/products\//, '/marketplace/') } : p)
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
            <p className="text-sm text-gray-500">{t('providerMkt.campaignSettings')}</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-2 shrink-0"><X size={18} /></button>
        </div>

        <div className="flex gap-1.5 mt-4 mb-5 flex-wrap">
          {[
            { id: 'targets',    label: t('providerMkt.whatItCovers'),       icon: Target },
            { id: 'placements', label: t('providerMkt.whereShown'), icon: MonitorPlay },
            { id: 'audience',   label: t('providerMkt.toWhom'),       icon: Users },
          ].map(pl => {
            const Icon = pl.icon
            return (
              <button key={pl.id} onClick={() => setTab(pl.id)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-colors',
                  tab === pl.id ? 'bg-brand-900 text-white'
                               : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300')}>
                <Icon size={14} /> {pl.label}
              </button>
            )
          })}
        </div>

        {/* ── Τι αφορά ─────────────────────────────────────────── */}
        {tab === 'targets' && (
          <div className="space-y-4">
            {!campaign.discount_type && (
              <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
                {t('providerMkt.noTargetHint')}
              </p>
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{t('providerMkt.total')}</p>
              <div className="flex flex-wrap gap-1.5">
                {[['all_services', t('providerMkt.allMyServices')], ['all_products', t('providerMkt.allMyProducts')]].map(([type, label]) => (
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
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{t('providerMkt.specificServices')}</p>
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
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{t('providerMkt.specificProducts')}</p>
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
                {t('providerMkt.saveCount', { count: T.length })}
              </button>
            </div>
          </div>
        )}

        {/* ── Πού προβάλλεται ──────────────────────────────────── */}
        {tab === 'placements' && (
          <div className="space-y-3">
            {P.length === 0 && (
              <p className="text-sm text-gray-500 py-4 text-center">{t('providerMkt.noPlacements')}</p>
            )}

            {P.map((p: any, i: number) => (
              <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-3">
                <div className="grid sm:grid-cols-3 gap-2">
                  <div>
                    <label className="label">{t('providerMkt.fPage')}</label>
                    <select className="input text-sm" value={p.page}
                      onChange={e => updPlacement(i, { page: e.target.value })}>
                      {PAGES.map(x => <option key={x.value} value={x.value}>{t(x.labelKey)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">{t('providerMkt.fSlot')}</label>
                    <select className="input text-sm" value={p.slot || 'banner'}
                      onChange={e => updPlacement(i, { slot: e.target.value })}>
                      {SLOTS.map(x => <option key={x.value} value={x.value}>{t(x.labelKey)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">{t('providerMkt.fMedia')}</label>
                    <select className="input text-sm" value={p.media_type || 'image'}
                      onChange={e => updPlacement(i, { media_type: e.target.value })}>
                      <option value="image">{t('providerMkt.fImage')}</option>
                      <option value="video">{t('providerMkt.fVideo')}</option>
                      <option value="none">{t('providerMkt.fTextOnly')}</option>
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
                    <label className="label">{t('providerMkt.fTitle')}</label>
                    <input className="input text-sm" value={p.headline || ''}
                      onChange={e => updPlacement(i, { headline: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">{t('providerMkt.fButtonText')}</label>
                    <input className="input text-sm" value={p.cta_label || ''}
                      placeholder={t('providerMkt.defaultCta')}
                      onChange={e => updPlacement(i, { cta_label: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="label">{t('providerMkt.fSubtitle')}</label>
                  <input className="input text-sm" value={p.subtext || ''}
                    onChange={e => updPlacement(i, { subtext: e.target.value })} />
                </div>

                <div>
                  <label className="label">{t('providerMkt.fLinkTo')}</label>
                  {/* Dropdown αντί για ελεύθερο κείμενο: ο πάροχος δεν
                      χρειάζεται να ξέρει διαδρομές, και δεν κάνει λάθος. */}
                  <select className="input text-sm" value={p.link_url || ''}
                    onChange={e => updPlacement(i, { link_url: e.target.value })}>
                    <option value="">{t('providerMkt.noneAnywhere')}</option>
                    <optgroup label={t('providerMkt.general')}>
                      <option value="/services">{t('providerMkt.allServices')}</option>
                      <option value="/marketplace">{t('providerMkt.theShop')}</option>
                    </optgroup>
                    {services.length > 0 && (
                      <optgroup label={t('providerMkt.myServices')}>
                        {services.map((s: any) => (
                          <option key={s.id} value={`/services/${s.id}`}>
                            {s.title || s.provider_name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {products.length > 0 && (
                      <optgroup label={t('providerMkt.myProducts')}>
                        {products.map((pr: any) => (
                          <option key={pr.id} value={`/marketplace/${pr.id}`}>{pr.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div className="flex justify-end">
                  <button type="button" onClick={() => delPlacement(i)}
                    className="btn-ghost text-xs py-1 text-red-500">{t('providerMkt.remove')}</button>
                </div>
              </div>
            ))}

            <div className="flex justify-between pt-2">
              <button onClick={addPlacement} className="btn-secondary text-sm">
                <Plus size={14} className="inline mr-1" />{t('providerMkt.addPlacement')}</button>
              <button onClick={() => onSavePlacements(P)} className="btn-primary" disabled={pending}>
                {t('providerMkt.saveCount', { count: P.length })}
              </button>
            </div>
          </div>
        )}

        {/* ── Σε ποιους ────────────────────────────────────────── */}
        {tab === 'audience' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              {A.length === 0
                ? t('providerMkt.audienceHint')
                : t('providerMkt.offerForCount', { count: A.length })}
            </p>

            {customers.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">{t('providerMkt.noCustomers')}</p>
            ) : (
              <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
                {customers.map((c: any) => (
                  <button key={c.email} type="button" onClick={() => toggleCustomer(c.email)}
                    className="w-full flex items-center gap-3 p-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <input type="checkbox" readOnly checked={A.includes(c.email)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name || c.email}</p>
                      <p className="text-xs text-gray-500">
                        {t('providerMkt.custStats', { b: c.bookings, s: Math.round(c.spent) })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button onClick={() => setAudience([])} className="btn-ghost text-sm">{t('providerMkt.clearAll')}</button>
              <button onClick={() => onSaveAudience(A)} className="btn-primary" disabled={pending}>
                {t('providerMkt.saveCount', { count: A.length })}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
