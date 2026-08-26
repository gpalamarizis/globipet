import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Edit, Trash2, X, Stethoscope, BadgeCheck, Euro,
  Link2, Unlink, Clock, Video, User as UserIcon,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

/**
 * Διαχείριση γιατρών / επαγγελματικού προσωπικού κλινικής.
 *
 *  Η διοίκηση:  προσθέτει γιατρούς, ορίζει ειδικότητες και τιμές ανά υπηρεσία,
 *               συνδέει τον λογαριασμό του γιατρού με email.
 *  Ο γιατρός:   βλέπει τα δικά του ραντεβού — δεν αλλάζει τιμές.
 *
 * Όπου η διοίκηση δεν ορίσει τιμή, ισχύει η βασική τιμή του πακέτου.
 */

type Staff = {
  id: string
  service_id: string
  full_name: string
  title?: string | null
  specialties: string[]
  license_number?: string | null
  bio?: string | null
  photo_url?: string | null
  years_experience?: number | null
  languages: string[]
  email?: string | null
  phone?: string | null
  accepts_telehealth: boolean
  is_active: boolean
  has_account: boolean
  bookings_count?: number
}

type PriceRow = {
  package_id: string
  name: string
  base_price: number
  base_duration: number
  price: number
  duration_minutes: number
  custom_price: boolean
}

const EMPTY: Partial<Staff> & { service_id: string } = {
  service_id: '',
  full_name: '', title: 'Κτηνίατρος',
  specialties: [], license_number: '', bio: '',
  years_experience: undefined, languages: ['Ελληνικά'],
  email: '', phone: '',
  accepts_telehealth: false, is_active: true,
}

export default function ProviderStaffPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Staff | null>(null)
  const [form, setForm] = useState<any>(EMPTY)
  const [specInput, setSpecInput] = useState('')
  const [pricesFor, setPricesFor] = useState<Staff | null>(null)
  const [linkFor, setLinkFor] = useState<Staff | null>(null)
  const [linkEmail, setLinkEmail] = useState('')

  // ── Δεδομένα ───────────────────────────────────────────────────────
  const { data: services = [] } = useQuery({
    queryKey: ['my-services'],
    queryFn: () => api.get('/services/my').then(r => r.data?.data ?? r.data ?? []),
  })

  const { data: staff = [], isLoading } = useQuery<Staff[]>({
    queryKey: ['provider-staff'],
    queryFn: () => api.get('/staff/mine').then(r => r.data?.data ?? []),
  })

  const { data: prices = [], isLoading: pricesLoading } = useQuery<PriceRow[]>({
    queryKey: ['staff-prices', pricesFor?.id],
    queryFn: () => api.get(`/staff/${pricesFor!.id}/prices`).then(r => r.data?.data ?? []),
    enabled: !!pricesFor,
  })

  const [draft, setDraft] = useState<Record<string, { price: string; duration: string }>>({})

  // ── Ενέργειες ──────────────────────────────────────────────────────
  const save = useMutation({
    mutationFn: (body: any) =>
      editing ? api.patch(`/staff/${editing.id}`, body) : api.post('/staff', body),
    onSuccess: () => {
      toast.success(editing ? 'Αποθηκεύτηκε' : 'Ο γιατρός προστέθηκε')
      qc.invalidateQueries({ queryKey: ['provider-staff'] })
      setShowForm(false); setEditing(null); setForm(EMPTY)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Σφάλμα αποθήκευσης'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/staff/${id}`),
    onSuccess: () => {
      toast.success('Διαγράφηκε')
      qc.invalidateQueries({ queryKey: ['provider-staff'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Σφάλμα διαγραφής'),
  })

  const savePrices = useMutation({
    mutationFn: (payload: any) => api.put(`/staff/${pricesFor!.id}/prices`, payload),
    onSuccess: (r: any) => {
      toast.success(`Αποθηκεύτηκαν ${r?.data?.saved ?? 0} τιμές`)
      qc.invalidateQueries({ queryKey: ['staff-prices', pricesFor?.id] })
      setPricesFor(null); setDraft({})
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Σφάλμα αποθήκευσης τιμών'),
  })

  const linkAccount = useMutation({
    mutationFn: () => api.post(`/staff/${linkFor!.id}/link`, { email: linkEmail.trim() }),
    onSuccess: () => {
      toast.success('Ο λογαριασμός συνδέθηκε')
      qc.invalidateQueries({ queryKey: ['provider-staff'] })
      setLinkFor(null); setLinkEmail('')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Σφάλμα σύνδεσης'),
  })

  const unlinkAccount = useMutation({
    mutationFn: (id: string) => api.delete(`/staff/${id}/link`),
    onSuccess: () => {
      toast.success('Ο λογαριασμός αποσυνδέθηκε')
      qc.invalidateQueries({ queryKey: ['provider-staff'] })
    },
  })

  // ── Βοηθητικά ──────────────────────────────────────────────────────
  const openNew = () => {
    setEditing(null)
    setForm({ ...EMPTY, service_id: services[0]?.id || '' })
    setSpecInput(''); setShowForm(true)
  }

  const openEdit = (s: Staff) => {
    setEditing(s)
    setForm({
      ...EMPTY, ...s,
      specialties: s.specialties || [],
      languages: s.languages || [],
    })
    setSpecInput(''); setShowForm(true)
  }

  const addSpec = () => {
    const v = specInput.trim()
    if (!v) return
    if ((form.specialties || []).includes(v)) { setSpecInput(''); return }
    setForm({ ...form, specialties: [...(form.specialties || []), v] })
    setSpecInput('')
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.full_name?.trim()) return toast.error('Το ονοματεπώνυμο είναι υποχρεωτικό')
    if (!editing && !form.service_id) return toast.error('Επίλεξε υπηρεσία')
    const body: any = { ...form }
    if (body.years_experience === '' || body.years_experience === undefined) body.years_experience = null
    else body.years_experience = Number(body.years_experience)
    if (editing) delete body.service_id
    delete body.id; delete body.has_account; delete body.bookings_count
    save.mutate(body)
  }

  const openPrices = (s: Staff) => { setPricesFor(s); setDraft({}) }

  const submitPrices = () => {
    const rows = prices.map(p => {
      const d = draft[p.package_id]
      const price = d?.price !== undefined ? d.price : (p.custom_price ? String(p.price) : '')
      const duration = d?.duration !== undefined ? d.duration : String(p.duration_minutes)
      return { package_id: p.package_id, price, duration_minutes: duration }
    })
    savePrices.mutate({ prices: rows })
  }

  const serviceName = (id: string) =>
    services.find((s: any) => s.id === id)?.provider_name ||
    services.find((s: any) => s.id === id)?.title || '—'

  // ── Απόδοση ────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Stethoscope size={18} className="text-brand-900" />
            Γιατροί & Προσωπικό
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Ειδικότητες και τιμές ανά υπηρεσία. Όπου δεν ορίσεις τιμή, ισχύει η βασική του πακέτου.
          </p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> Προσθήκη γιατρού
        </button>
      </div>

      {isLoading ? (
        <div className="card p-12 text-center text-gray-500">Φόρτωση...</div>
      ) : staff.length === 0 ? (
        <div className="card p-12 text-center">
          <Stethoscope size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-700 dark:text-gray-300">Δεν έχεις καταχωρήσει γιατρούς</p>
          <p className="text-sm text-gray-500 mt-1">
            Πρόσθεσε το προσωπικό σου για να εμφανίζεται στους πελάτες κατά την κράτηση.
          </p>
          <button onClick={openNew} className="btn-primary inline-flex items-center gap-2 mt-4">
            <Plus size={15} /> Προσθήκη γιατρού
          </button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {staff.map(s => (
            <motion.div key={s.id} layout
              className={cn('card p-4', !s.is_active && 'opacity-60')}>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0 overflow-hidden">
                  {s.photo_url
                    ? <img src={s.photo_url} alt={s.full_name} className="w-full h-full object-cover" />
                    : <UserIcon size={20} className="text-brand-900" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 dark:text-white truncate">
                      {s.title ? `${s.title} ` : ''}{s.full_name}
                    </span>
                    {s.has_account && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <BadgeCheck size={11} /> λογαριασμός
                      </span>
                    )}
                    {s.accepts_telehealth && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <Video size={11} /> τηλεϊατρική
                      </span>
                    )}
                    {!s.is_active && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-gray-200 text-gray-600">ανενεργός</span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mt-0.5 truncate">{serviceName(s.service_id)}</p>

                  {s.specialties?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {s.specialties.map(sp => (
                        <span key={sp} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                          {sp}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    {s.license_number && <span>Αρ. μητρώου {s.license_number}</span>}
                    {s.years_experience ? <span>{s.years_experience} χρόνια</span> : null}
                    {typeof s.bookings_count === 'number' && (
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} /> {s.bookings_count} ραντεβού
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button onClick={() => openPrices(s)} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5">
                  <Euro size={13} /> Τιμές
                </button>
                <button onClick={() => openEdit(s)} className="btn-ghost flex items-center gap-1.5 text-xs py-1.5">
                  <Edit size={13} /> Επεξεργασία
                </button>
                {s.has_account ? (
                  <button
                    onClick={() => { if (confirm(`Αποσύνδεση λογαριασμού του ${s.full_name};`)) unlinkAccount.mutate(s.id) }}
                    className="btn-ghost flex items-center gap-1.5 text-xs py-1.5">
                    <Unlink size={13} /> Αποσύνδεση
                  </button>
                ) : (
                  <button onClick={() => { setLinkFor(s); setLinkEmail(s.email || '') }}
                    className="btn-ghost flex items-center gap-1.5 text-xs py-1.5">
                    <Link2 size={13} /> Σύνδεση λογαριασμού
                  </button>
                )}
                <button
                  onClick={() => { if (confirm(`Διαγραφή του ${s.full_name}; Τα ραντεβού του διατηρούνται.`)) remove.mutate(s.id) }}
                  className="btn-ghost p-1.5 hover:bg-red-50 ml-auto">
                  <Trash2 size={13} className="text-red-400" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Φόρμα γιατρού ────────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowForm(false)}>
            <motion.div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
              initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-display font-bold">
                  {editing ? 'Επεξεργασία γιατρού' : 'Νέος γιατρός'}
                </h3>
                <button onClick={() => setShowForm(false)} className="btn-ghost p-2"><X size={18} /></button>
              </div>

              <form onSubmit={submit} className="space-y-4">
                {!editing && (
                  <div>
                    <label className="label">Υπηρεσία *</label>
                    <select className="input" value={form.service_id}
                      onChange={e => setForm({ ...form, service_id: e.target.value })} required>
                      <option value="">— επίλεξε —</option>
                      {services.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.provider_name || s.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="label">Ονοματεπώνυμο *</label>
                    <input className="input" value={form.full_name || ''}
                      onChange={e => setForm({ ...form, full_name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="label">Τίτλος</label>
                    <input className="input" placeholder="Δρ. / Κτηνίατρος" value={form.title || ''}
                      onChange={e => setForm({ ...form, title: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="label">Ειδικότητες</label>
                  <div className="flex gap-2">
                    <input className="input flex-1" placeholder="π.χ. Χειρουργική"
                      value={specInput} onChange={e => setSpecInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSpec() } }} />
                    <button type="button" onClick={addSpec} className="btn-secondary px-4">Προσθήκη</button>
                  </div>
                  {(form.specialties || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.specialties.map((sp: string) => (
                        <span key={sp} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-900 dark:text-brand-200">
                          {sp}
                          <button type="button"
                            onClick={() => setForm({ ...form, specialties: form.specialties.filter((x: string) => x !== sp) })}>
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Αριθμός μητρώου</label>
                    <input className="input" value={form.license_number || ''}
                      onChange={e => setForm({ ...form, license_number: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Χρόνια εμπειρίας</label>
                    <input className="input" type="number" min={0} value={form.years_experience ?? ''}
                      onChange={e => setForm({ ...form, years_experience: e.target.value })} />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Email</label>
                    <input className="input" type="email" value={form.email || ''}
                      onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Τηλέφωνο</label>
                    <input className="input" value={form.phone || ''}
                      onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="label">Σύντομο βιογραφικό</label>
                  <textarea className="input" rows={3} value={form.bio || ''}
                    onChange={e => setForm({ ...form, bio: e.target.value })} />
                </div>

                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!form.accepts_telehealth}
                      onChange={e => setForm({ ...form, accepts_telehealth: e.target.checked })} />
                    Δέχεται τηλεϊατρική
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.is_active !== false}
                      onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                    Ενεργός
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Ακύρωση</button>
                  <button type="submit" className="btn-primary" disabled={save.isPending}>
                    {save.isPending ? 'Αποθήκευση...' : (editing ? 'Αποθήκευση' : 'Προσθήκη')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Τιμές ανά υπηρεσία ───────────────────────────────────── */}
      <AnimatePresence>
        {pricesFor && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPricesFor(null)}>
            <motion.div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
              initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-display font-bold">Τιμές — {pricesFor.full_name}</h3>
                <button onClick={() => setPricesFor(null)} className="btn-ghost p-2"><X size={18} /></button>
              </div>
              <p className="text-sm text-gray-500 mb-5">
                Άφησε το πεδίο κενό για να ισχύσει η βασική τιμή του πακέτου.
              </p>

              {pricesLoading ? (
                <div className="py-10 text-center text-gray-500">Φόρτωση...</div>
              ) : prices.length === 0 ? (
                <div className="py-10 text-center text-gray-500">
                  Η υπηρεσία δεν έχει πακέτα. Πρόσθεσε πρώτα πακέτα στην καρτέλα «Πακέτα».
                </div>
              ) : (
                <div className="space-y-2">
                  {prices.map(p => {
                    const d = draft[p.package_id]
                    const val = d?.price !== undefined ? d.price : (p.custom_price ? String(p.price) : '')
                    const dur = d?.duration !== undefined ? d.duration : String(p.duration_minutes)
                    return (
                      <div key={p.package_id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{p.name}</p>
                          <p className="text-xs text-gray-500">
                            βασική €{p.base_price} · {p.base_duration}′
                          </p>
                        </div>
                        <div className="w-24">
                          <input className="input text-sm" type="number" min={0} step="0.01"
                            placeholder={`€${p.base_price}`} value={val}
                            onChange={e => setDraft({
                              ...draft,
                              [p.package_id]: { price: e.target.value, duration: dur },
                            })} />
                        </div>
                        <div className="w-20">
                          <input className="input text-sm" type="number" min={5} step={5}
                            value={dur}
                            onChange={e => setDraft({
                              ...draft,
                              [p.package_id]: { price: val, duration: e.target.value },
                            })} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-5">
                <button onClick={() => setPricesFor(null)} className="btn-secondary">Ακύρωση</button>
                <button onClick={submitPrices} className="btn-primary"
                  disabled={savePrices.isPending || prices.length === 0}>
                  {savePrices.isPending ? 'Αποθήκευση...' : 'Αποθήκευση τιμών'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Σύνδεση λογαριασμού ──────────────────────────────────── */}
      <AnimatePresence>
        {linkFor && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setLinkFor(null)}>
            <motion.div className="card w-full max-w-md p-6"
              initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-display font-bold">Σύνδεση λογαριασμού</h3>
                <button onClick={() => setLinkFor(null)} className="btn-ghost p-2"><X size={18} /></button>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Ο γιατρός πρέπει να έχει ήδη εγγραφεί στο GlobiPet. Μετά τη σύνδεση θα βλέπει
                τα ραντεβού που του ανατίθενται.
              </p>
              <label className="label">Email λογαριασμού</label>
              <input className="input" type="email" value={linkEmail}
                onChange={e => setLinkEmail(e.target.value)}
                placeholder="giatros@example.com" />
              <div className="flex justify-end gap-2 pt-5">
                <button onClick={() => setLinkFor(null)} className="btn-secondary">Ακύρωση</button>
                <button onClick={() => linkAccount.mutate()} className="btn-primary"
                  disabled={linkAccount.isPending || !linkEmail.trim()}>
                  {linkAccount.isPending ? 'Σύνδεση...' : 'Σύνδεση'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
