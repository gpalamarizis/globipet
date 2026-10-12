import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Search, X, Send, StickyNote, Star, Calendar, Euro,
  PawPrint, MessageSquare, Filter, CheckSquare, Square, Tag, Megaphone,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

/**
 * Πελάτες παρόχου.
 *
 * Προκύπτουν από τις κρατήσεις — δεν υπάρχει ξεχωριστός πίνακας. Έτσι η
 * λίστα είναι πάντα ακριβής χωρίς συγχρονισμό.
 *
 * Ο πάροχος μπορεί να φιλτράρει, να επιλέξει πολλούς, και να στείλει
 * μήνυμα ΕΝΤΟΣ πλατφόρμας — καμία αποστολή email.
 */

type Customer = {
  email: string
  name: string | null
  bookings: number
  completed: number
  cancelled: number
  spent: number
  first_booking: string | null
  last_booking: string | null
  avg_rating: number
  pets: number
  note?: string | null
  tags?: string[] | null
}

const SORTS = [
  { value: 'last',     labelKey: 'providerCus.sortRecent' },
  { value: 'spent',    labelKey: 'providerCus.sortSpent' },
  { value: 'bookings', labelKey: 'providerCus.sortBookings' },
  { value: 'name',     labelKey: 'providerCus.sortName' },
]

export default function ProviderCustomersPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('last')
  const [minBookings, setMinBookings] = useState('')
  const [minSpent, setMinSpent] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [detailFor, setDetailFor] = useState<Customer | null>(null)
  const [composing, setComposing] = useState(false)
  const [msg, setMsg] = useState({ subject: '', body: '', campaign_id: '' })

  // ── Δεδομένα ────────────────────────────────────────────────────────
  const params = useMemo(() => {
    const p = new URLSearchParams()
    if (q.trim()) p.set('q', q.trim())
    if (sort) p.set('sort', sort)
    if (minBookings) p.set('min_bookings', minBookings)
    if (minSpent) p.set('min_spent', minSpent)
    return p.toString()
  }, [q, sort, minBookings, minSpent])

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['customers', params],
    queryFn: () => api.get(`/customers?${params}`).then(r => r.data?.data ?? []),
  })

  const { data: campaigns = [] } = useQuery({
    queryKey: ['my-campaigns'],
    queryFn: () => api.get('/campaigns/mine').then(r => r.data?.data ?? []),
    enabled: composing,
  })

  const { data: detail } = useQuery({
    queryKey: ['customer', detailFor?.email],
    queryFn: () => api.get(`/customers/${encodeURIComponent(detailFor!.email)}`).then(r => r.data?.data),
    enabled: !!detailFor,
  })

  // ── Ενέργειες ───────────────────────────────────────────────────────
  const send = useMutation({
    mutationFn: () => api.post('/customers/message', {
      emails: [...selected],
      subject: msg.subject || null,
      body: msg.body,
      campaign_id: msg.campaign_id || null,
    }),
    onSuccess: (r: any) => {
      const { sent = 0, rejected } = r?.data ?? {}
      toast.success(t('providerCus.sentTo', { count: sent }))
      if (rejected?.length) toast(t('providerCus.rejectedNote', { count: rejected.length }), { icon: '⚠️' })
      setComposing(false); setSelected(new Set()); setMsg({ subject: '', body: '', campaign_id: '' })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('providerCus.errSend')),
  })

  const saveNote = useMutation({
    mutationFn: (body: any) =>
      api.put(`/customers/${encodeURIComponent(detailFor!.email)}/note`, body),
    onSuccess: () => {
      toast.success(t('providerCus.noteSaved'))
      qc.invalidateQueries({ queryKey: ['customer', detailFor?.email] })
      qc.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('providerCus.error')),
  })

  // ── Επιλογή ─────────────────────────────────────────────────────────
  const toggle = (email: string) => {
    const next = new Set(selected)
    next.has(email) ? next.delete(email) : next.add(email)
    setSelected(next)
  }

  const allSelected = customers.length > 0 && customers.every(c => selected.has(c.email))
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(customers.map(c => c.email)))

  const clearFilters = () => { setQ(''); setMinBookings(''); setMinSpent(''); setSort('last') }
  const hasFilters = !!(q || minBookings || minSpent)

  const money = (n: number) => `${Math.round(n)}€`

  return (
    <div className="space-y-4">

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users size={18} className="text-brand-900" />{t('providerCus.title')}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{t('providerCus.subtitle')}</p>
        </div>
        {selected.size > 0 && (
          <button onClick={() => setComposing(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Send size={15} /> {t('providerCus.msgTo', { count: selected.size })}
          </button>
        )}
      </div>

      {/* Αναζήτηση και φίλτρα */}
      <div className="card p-3 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder={t('providerCus.search')}
              value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <select className="input w-auto" value={sort} onChange={e => setSort(e.target.value)}>
            {SORTS.map(so => <option key={so.value} value={so.value}>{t(so.labelKey)}</option>)}
          </select>
          <button onClick={() => setShowFilters(!showFilters)}
            className={cn('btn-secondary flex items-center gap-1.5 text-sm',
              hasFilters && 'border-brand-400 text-brand-900')}>
            <Filter size={14} />{t('providerCus.filters')}</button>
        </div>

        {showFilters && (
          <div className="grid sm:grid-cols-3 gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div>
              <label className="label">{t('providerCus.minBookings')}</label>
              <input className="input text-sm" type="number" min={0} placeholder="—"
                value={minBookings} onChange={e => setMinBookings(e.target.value)} />
            </div>
            <div>
              <label className="label">{t('providerCus.minSpend')}</label>
              <input className="input text-sm" type="number" min={0} placeholder="—"
                value={minSpent} onChange={e => setMinSpent(e.target.value)} />
            </div>
            <div className="flex items-end pb-1">
              <button onClick={clearFilters} className="btn-ghost text-sm" disabled={!hasFilters}>{t('providerCus.clear')}</button>
            </div>
          </div>
        )}
      </div>

      {/* Λίστα */}
      {isLoading ? (
        <div className="card p-12 text-center text-gray-500">{t('providerCus.loading')}</div>
      ) : customers.length === 0 ? (
        <div className="card p-12 text-center">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-700 dark:text-gray-300">
            {hasFilters ? t('providerCus.noMatch') : t('providerCus.empty')}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {hasFilters ? t('providerCus.relaxFilters')
                        : t('providerCus.emptyHint')}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <button onClick={toggleAll}
            className="w-full flex items-center gap-3 p-3 text-left text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
            {allSelected ? <CheckSquare size={16} className="text-brand-900" /> : <Square size={16} />}
            {allSelected ? t('providerCus.deselectAll') : t('providerCus.selectAll', { count: customers.length })}
            {selected.size > 0 && (
              <span className="ml-auto text-brand-900 font-medium">{t('providerCus.selectedCount', { count: selected.size })}</span>
            )}
          </button>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {customers.map(c => {
              const on = selected.has(c.email)
              return (
                <div key={c.email}
                  className={cn('flex items-center gap-3 p-3 transition-colors',
                    on ? 'bg-brand-50/50 dark:bg-brand-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50')}>

                  <button onClick={() => toggle(c.email)} className="shrink-0">
                    {on ? <CheckSquare size={17} className="text-brand-900" />
                        : <Square size={17} className="text-gray-300" />}
                  </button>

                  <button onClick={() => setDetailFor(c)} className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                        {c.name || c.email}
                      </span>
                      {c.note && <StickyNote size={12} className="text-amber-500 shrink-0" />}
                      {(c.tags ?? []).slice(0, 2).map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={11} /> {t('providerCus.bookingCount', { count: c.bookings })}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Euro size={11} /> {money(c.spent)}
                      </span>
                      {c.pets > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <PawPrint size={11} /> {c.pets}
                        </span>
                      )}
                      {c.avg_rating > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Star size={11} className="text-yellow-500" /> {Number(c.avg_rating).toFixed(1)}
                        </span>
                      )}
                      {c.cancelled > 0 && (
                        <span className="text-red-400">{t('providerCus.cancelCount', { count: c.cancelled })}</span>
                      )}
                    </div>
                  </button>

                  <span className="text-xs text-gray-400 shrink-0 hidden sm:block">
                    {c.last_booking}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Καρτέλα πελάτη ───────────────────────────────────────── */}
      <AnimatePresence>
        {detailFor && (
          <CustomerDetail
            customer={detailFor}
            detail={detail}
            onClose={() => setDetailFor(null)}
            onSaveNote={(b: any) => saveNote.mutate(b)}
            onMessage={() => { setSelected(new Set([detailFor.email])); setDetailFor(null); setComposing(true) }}
            pending={saveNote.isPending}
          />
        )}
      </AnimatePresence>

      {/* ── Σύνθεση μηνύματος ────────────────────────────────────── */}
      <AnimatePresence>
        {composing && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setComposing(false)}>
            <motion.div className="card w-full max-w-lg p-6"
              initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }}
              onClick={e => e.stopPropagation()}>

              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-display font-bold">{t('providerCus.message')}</h3>
                <button onClick={() => setComposing(false)} className="btn-ghost p-2"><X size={18} /></button>
              </div>
              <p className="text-sm text-gray-500 mb-5">
                {t('providerCus.toRecipients')} {selected.size} {selected.size === 1 ? t('providerCus.customer') : t('providerCus.customers')}.
                {t('providerCus.inAppNote')}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="label">{t('providerCus.subject')}</label>
                  <input className="input" value={msg.subject}
                    placeholder={t('providerCus.phSubject')}
                    onChange={e => setMsg({ ...msg, subject: e.target.value })} />
                </div>

                <div>
                  <label className="label">{t('providerCus.messageReq')}</label>
                  <textarea className="input" rows={5} value={msg.body} required
                    onChange={e => setMsg({ ...msg, body: e.target.value })} />
                </div>

                <div>
                  <label className="label">{t('providerCus.attachedOffer')}</label>
                  <select className="input" value={msg.campaign_id}
                    onChange={e => setMsg({ ...msg, campaign_id: e.target.value })}>
                    <option value="">{t('providerCus.none')}</option>
                    {campaigns.filter((c: any) => c.discount_type).map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.discount_type === 'percent' ? `-${c.discount_value}%` : `-${c.discount_value}€`})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">{t('providerCus.offerHint')}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-5">
                <button onClick={() => setComposing(false)} className="btn-secondary">{t('providerCus.cancel')}</button>
                <button onClick={() => send.mutate()} className="btn-primary"
                  disabled={send.isPending || !msg.body.trim()}>
                  {send.isPending ? t('providerCus.sending') : t('providerCus.send', { count: selected.size })}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  Καρτέλα πελάτη
// ═══════════════════════════════════════════════════════════════════════

function CustomerDetail({ customer, detail, onClose, onSaveNote, onMessage, pending }: any) {
  const { t } = useTranslation()
  const [note, setNote] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[] | null>(null)

  const N = note ?? detail?.note?.note ?? ''
  const T = tags ?? detail?.note?.tags ?? []

  const addTag = () => {
    const v = tagInput.trim()
    if (!v || T.includes(v)) { setTagInput(''); return }
    setTags([...T, v]); setTagInput('')
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
        initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }}
        onClick={(e: any) => e.stopPropagation()}>

        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="min-w-0">
            <h3 className="text-lg font-display font-bold truncate">
              {customer.name || customer.email}
            </h3>
            <p className="text-sm text-gray-500 truncate">{customer.email}</p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button onClick={onMessage} className="btn-secondary flex items-center gap-1.5 text-sm">
              <Send size={14} />{t('providerCus.message')}</button>
            <button onClick={onClose} className="btn-ghost p-2"><X size={18} /></button>
          </div>
        </div>

        {/* Σύνοψη */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          {[
            [t('providerCus.bookings'), customer.bookings],
            [t('providerCus.completed'), customer.completed],
            [t('providerCus.spend'), `${Math.round(customer.spent)}€`],
            [t('providerCus.rating'), customer.avg_rating > 0 ? Number(customer.avg_rating).toFixed(1) : '—'],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Σημείωση */}
        <div className="mb-5">
          <label className="label flex items-center gap-1.5">
            <StickyNote size={14} />{t('providerCus.note')}</label>
          <textarea className="input" rows={3} value={N}
            placeholder={t('providerCus.phNote')}
            onChange={e => setNote(e.target.value)} />

          <div className="flex gap-2 mt-2">
            <input className="input flex-1 text-sm" placeholder={t('providerCus.tag')}
              value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }} />
            <button type="button" onClick={addTag} className="btn-secondary text-sm px-4">
              <Tag size={14} />
            </button>
          </div>
          {T.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {T.map((t: string) => (
                <span key={t} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-900 dark:text-brand-200">
                  {t}
                  <button type="button" onClick={() => setTags(T.filter((x: string) => x !== t))}>
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex justify-end mt-2">
            <button onClick={() => onSaveNote({ note: N, tags: T })}
              className="btn-primary text-sm" disabled={pending}>{t('providerCus.saveNote')}</button>
          </div>
        </div>

        {/* Ζώα */}
        {detail?.pets?.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{t('providerCus.theirPets')}</p>
            <div className="flex flex-wrap gap-1.5">
              {detail.pets.map((p: any, i: number) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
                  <PawPrint size={11} /> {p.name}
                  {p.breed && <span className="text-gray-400">· {p.breed}</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Κρατήσεις */}
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{t('providerCus.bookingHistory')}</p>
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 max-h-56 overflow-y-auto">
            {(detail?.bookings ?? []).map((b: any) => (
              <div key={b.id} className="flex items-center gap-3 p-2.5 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{b.booking_date} · {b.booking_time}</p>
                  {b.staff_name && <p className="text-xs text-gray-500">{b.staff_name}</p>}
                </div>
                {b.rating && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-yellow-600">
                    <Star size={11} /> {b.rating}
                  </span>
                )}
                <span className="text-sm font-medium">{Math.round(b.total_price)}€</span>
                <span className={cn('text-[11px] px-1.5 py-0.5 rounded shrink-0',
                  b.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : b.status === 'cancelled' ? 'bg-red-100 text-red-600 dark:bg-red-900/30'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400')}>
                  {b.status === 'completed' ? t('providerCus.stCompleted')
                    : b.status === 'cancelled' ? t('providerCus.stCancelled') : t('providerCus.stConfirmed')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Μηνύματα */}
        {detail?.messages?.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1.5">
              <MessageSquare size={12} />{t('providerCus.sentMessages')}</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {detail.messages.map((m: any) => (
                <div key={m.id} className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-2.5">
                  <div className="flex items-center gap-2">
                    {m.subject && <span className="text-sm font-medium">{m.subject}</span>}
                    <span className={cn('text-[11px] ml-auto',
                      m.read_at ? 'text-green-600' : 'text-gray-400')}>
                      {m.read_at ? t('providerCus.read') : t('providerCus.unread')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-0.5">{m.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
