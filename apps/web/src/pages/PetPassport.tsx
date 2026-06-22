import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import {
  BookOpen, Syringe, Stethoscope, Award, Plane, Plus, X, Trash2,
  Pill, FlaskConical, Scan, Scissors, AlertTriangle, Heart, Tooth,
  Weight, Dna, Activity, Shield, FileDown, Users, Edit2, ChevronDown, ExternalLink
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

// ─── TAB DEFINITIONS ─────────────────────────────────────────────
const TABS = [
  { id: 'identity',   label: 'Ταυτότητα',      icon: BookOpen },
  { id: 'vaccines',   label: 'Εμβόλια',         icon: Syringe },
  { id: 'health',     label: 'Εξετάσεις',       icon: Stethoscope },
  { id: 'meds',       label: 'Φάρμακα',         icon: Pill },
  { id: 'lab',        label: 'Εργαστήριο',      icon: FlaskConical },
  { id: 'imaging',    label: 'Απεικονιστικές',  icon: Scan },
  { id: 'surgery',    label: 'Χειρουργεία',     icon: Scissors },
  { id: 'allergies',  label: 'Αλλεργίες',       icon: AlertTriangle },
  { id: 'chronic',    label: 'Χρόνιες Παθήσεις',icon: Heart },
  { id: 'dental',     label: 'Οδοντιατρικά',    icon: Tooth },
  { id: 'weight',     label: 'Βάρος',           icon: Weight },
  { id: 'genetic',    label: 'Γενετικές',       icon: Dna },
  { id: 'vitals',     label: 'Ζωτικά',          icon: Activity },
  { id: 'pedigree',   label: 'Pedigree',        icon: Award },
  { id: 'travel',     label: 'Διαβατήριο',      icon: Plane },
  { id: 'access',     label: 'Πρόσβαση',        icon: Users },
]

const speciesEmoji: Record<string, string> = { dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰', fish: '🐟', reptile: '🦎', horse: '🐴', other: '🐾' }

// ─── REUSABLE COMPONENTS ─────────────────────────────────────────
function RecordCard({ title, subtitle, date, badge, badgeColor, onDelete, children }: any) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card p-4 mb-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{title}</p>
            {badge && <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', badgeColor || 'bg-gray-100 text-gray-600')}>{badge}</span>}
          </div>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          {date && <p className="text-xs text-gray-400 mt-0.5">📅 {date}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {children && <button onClick={() => setOpen(o => !o)} className="btn-ghost p-1.5"><ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} /></button>}
          {onDelete && <button onClick={onDelete} className="btn-ghost p-1.5 text-red-500 hover:text-red-700"><Trash2 size={14} /></button>}
        </div>
      </div>
      {open && children && <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-400 space-y-1">{children}</div>}
    </div>
  )
}

function Field({ label, value }: { label: string; value?: any }) {
  if (!value) return null
  return <p><span className="font-medium text-gray-700 dark:text-gray-300">{label}:</span> {String(value)}</p>
}

function EmptyState({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div className="text-center py-12">
      <p className="text-gray-400 mb-3">Δεν υπάρχουν εγγραφές</p>
      <button onClick={onAdd} className="btn-primary text-sm px-4 py-2 flex items-center gap-2 mx-auto"><Plus size={14} />{label}</button>
    </div>
  )
}

// ─── MODAL WRAPPER ───────────────────────────────────────────────
function Modal({ title, onClose, onSave, saving, children }: any) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg mx-auto card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="btn-ghost p-2"><X size={18} /></button>
        </div>
        <div className="space-y-3">{children}</div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="btn-secondary flex-1">Άκυρο</button>
          <button onClick={onSave} disabled={saving} className="btn-primary flex-1">{saving ? 'Αποθήκευση...' : 'Αποθήκευση'}</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function F({ label, name, form, setForm, type = 'text', options }: any) {
  const inputCls = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-800 dark:text-white"
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
      {options ? (
        <select className={inputCls} value={form[name] || ''} onChange={e => setForm((f: any) => ({ ...f, [name]: e.target.value }))}>
          {options.map((o: any) => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea className={inputCls} rows={3} value={form[name] || ''} onChange={e => setForm((f: any) => ({ ...f, [name]: e.target.value }))} />
      ) : (
        <input type={type} className={inputCls} value={form[name] || ''} onChange={e => setForm((f: any) => ({ ...f, [name]: e.target.value }))} />
      )}
    </div>
  )
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────
export default function PetPassport() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('identity')
  const [modal, setModal] = useState<string | null>(null)
  const [form, setForm] = useState<any>({})

  const { data: pets = [] } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets/my').then(r => r.data?.data ?? []),
    enabled: !!user,
  })

  const activePetId = selectedPetId || (pets.length === 1 ? pets[0]?.id : null)

  const { data: passport, isLoading } = useQuery({
    queryKey: ['passport', activePetId],
    queryFn: () => api.get(`/passport/${activePetId}`).then(r => r.data),
    enabled: !!activePetId,
  })

  const inv = () => qc.invalidateQueries({ queryKey: ['passport', activePetId] })

  function useCrud(endpoint: string, idField = 'id') {
    const create = useMutation({
      mutationFn: (data: any) => api.post(`/passport/${endpoint}/${activePetId}`, data),
      onSuccess: () => { inv(); setModal(null); setForm({}); toast.success('Αποθηκεύτηκε!') },
      onError: () => toast.error('Σφάλμα αποθήκευσης'),
    })
    const remove = useMutation({
      mutationFn: (id: string) => api.delete(`/passport/${endpoint}/${id}`),
      onSuccess: () => { inv(); toast.success('Διαγράφηκε') },
    })
    return { create, remove }
  }

  const vac = useCrud('vaccination')
  const health = useCrud('health')
  const meds = useCrud('medication')
  const lab = useCrud('lab')
  const imaging = useCrud('imaging')
  const surgery = useCrud('surgery')
  const allergy = useCrud('allergy')
  const chronic = useCrud('chronic')
  const dental = useCrud('dental')
  const weight = useCrud('weight')
  const genetic = useCrud('genetic')
  const vitals = useCrud('vitals')
  const travel = useCrud('travel')

  const addAccess = useMutation({
    mutationFn: (data: any) => api.post(`/passport/access/${activePetId}`, data),
    onSuccess: () => { inv(); setModal(null); setForm({}); toast.success('Πρόσβαση χορηγήθηκε') },
  })
  const revokeAccess = useMutation({
    mutationFn: (id: string) => api.delete(`/passport/access/${id}`),
    onSuccess: () => { inv(); toast.success('Πρόσβαση ανακλήθηκε') },
  })

  const openModal = (type: string, defaults: any = {}) => { setModal(type); setForm(defaults) }
  const pet = passport?.pet
  const p = passport || {}

  const severityColor = (s: string) => s === 'severe' || s === 'anaphylactic' ? 'bg-red-100 text-red-700' : s === 'moderate' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6">
      <div className="max-w-4xl mx-auto px-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center"><BookOpen size={20} className="text-orange-600" /></div>
            <div>
              <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Ιατρικός Φάκελος</h1>
              <p className="text-sm text-gray-500">Πλήρες ιστορικό υγείας & διαβατήριο κατοικιδίου</p>
            </div>
          </div>
          {activePetId && (
            <a href={`${import.meta.env.VITE_API_URL || 'https://api.globipet.com'}/passport/${activePetId}/pdf`}
              target="_blank" rel="noreferrer"
              className="btn-secondary flex items-center gap-2 text-sm px-4 py-2.5">
              <FileDown size={15} /> Εξαγωγή PDF
            </a>
          )}
        </div>

        {/* Pet selector */}
        {pets.length > 1 && (
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            {pets.map((p: any) => (
              <button key={p.id} onClick={() => setSelectedPetId(p.id)}
                className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0',
                  activePetId === p.id ? 'bg-brand-900 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300')}>
                <span>{speciesEmoji[p.species] || '🐾'}</span>{p.name}
              </button>
            ))}
          </div>
        )}

        {!activePetId && <div className="card p-8 text-center text-gray-400">Επίλεξε κατοικίδιο για να δεις τον φάκελο</div>}

        {activePetId && !isLoading && pet && (
          <>
            {/* Alerts for allergies & chronic conditions */}
            {(p.allergies?.length > 0 || p.chronicConditions?.filter((c: any) => c.status === 'active').length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                {p.allergies?.length > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                    <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                    <div><p className="text-xs font-bold text-red-700 mb-1">ΑΛΛΕΡΓΙΕΣ</p>
                      <p className="text-xs text-red-600">{p.allergies.map((a: any) => a.allergen).join(', ')}</p></div>
                  </div>
                )}
                {p.chronicConditions?.filter((c: any) => c.status === 'active').length > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                    <Heart size={16} className="text-yellow-600 shrink-0 mt-0.5" />
                    <div><p className="text-xs font-bold text-yellow-700 mb-1">ΧΡΟΝΙΕΣ ΠΑΘΗΣΕΙΣ</p>
                      <p className="text-xs text-yellow-600">{p.chronicConditions.filter((c: any) => c.status === 'active').map((c: any) => c.condition).join(', ')}</p></div>
                  </div>
                )}
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-2 mb-5">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0',
                    activeTab === tab.id ? 'bg-brand-900 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400')}>
                  <tab.icon size={13} />{tab.label}
                </button>
              ))}
            </div>

            {/* ── IDENTITY ── */}
            {activeTab === 'identity' && (
              <div className="card p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-4xl">{speciesEmoji[pet.species] || '🐾'}</div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{pet.name}</h2>
                    <p className="text-gray-500">{pet.breed || pet.species}</p>
                    <p className="text-xs text-gray-400 mt-1">ID: {pet.id.slice(0, 8)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[['Είδος', pet.species], ['Ράτσα', pet.breed], ['Φύλο', pet.gender], ['Γέννηση', pet.birthday],
                    ['Χρώμα', pet.color], ['Αποστειρωμένο', pet.is_sterilized ? 'Ναι' : 'Όχι'],
                    ['Μικροτσίπ', (pet as any).microchip], ['Αριθμός Διαβατηρίου', (pet as any).passport_number]
                  ].filter(([, v]) => v).map(([l, v]) => (
                    <div key={l}><p className="text-xs text-gray-400">{l}</p><p className="font-medium text-gray-900 dark:text-white">{v as string}</p></div>
                  ))}
                </div>
              </div>
            )}

            {/* ── VACCINES ── */}
            {activeTab === 'vaccines' && (
              <>
                <button onClick={() => openModal('vaccine', { date_administered: new Date().toISOString().split('T')[0] })} className="btn-primary text-sm flex items-center gap-2 mb-4"><Plus size={14} />Νέο Εμβόλιο</button>
                {(p.vaccinations || []).length === 0 ? <EmptyState label="Προσθήκη εμβολίου" onAdd={() => openModal('vaccine', {})} /> :
                  (p.vaccinations || []).map((v: any) => (
                    <RecordCard key={v.id} title={v.vaccine_name} subtitle={`${v.vaccine_type} · ${v.vet_name || ''}`} date={v.date_administered}
                      badge={v.next_due_date && new Date(v.next_due_date) < new Date() ? 'Εκπρόθεσμο' : v.next_due_date ? `Επόμενο: ${v.next_due_date}` : undefined}
                      badgeColor={v.next_due_date && new Date(v.next_due_date) < new Date() ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}
                      onDelete={() => vac.remove.mutate(v.id)}>
                      <Field label="Τύπος" value={v.vaccine_type} /><Field label="Κτηνίατρος" value={v.vet_name} /><Field label="Σημειώσεις" value={v.notes} />
                    </RecordCard>
                  ))}
              </>
            )}

            {/* ── HEALTH ── */}
            {activeTab === 'health' && (
              <>
                <button onClick={() => openModal('health', { date: new Date().toISOString().split('T')[0], record_type: 'examination' })} className="btn-primary text-sm flex items-center gap-2 mb-4"><Plus size={14} />Νέα Εξέταση</button>
                {(p.healthRecords || []).length === 0 ? <EmptyState label="Προσθήκη εξέτασης" onAdd={() => openModal('health', {})} /> :
                  (p.healthRecords || []).map((h: any) => (
                    <RecordCard key={h.id} title={h.title} subtitle={`${h.record_type} · ${h.vet_name || ''} · ${h.clinic_name || ''}`} date={h.date} onDelete={() => health.remove.mutate(h.id)}>
                      <Field label="Περιγραφή" value={h.description} /><Field label="Κόστος" value={h.cost ? `${h.cost}€` : null} /><Field label="Επόμενο Ραντεβού" value={h.next_appointment} />
                    </RecordCard>
                  ))}
              </>
            )}

            {/* ── MEDICATIONS ── */}
            {activeTab === 'meds' && (
              <>
                <button onClick={() => openModal('med', { start_date: new Date().toISOString().split('T')[0], is_active: true })} className="btn-primary text-sm flex items-center gap-2 mb-4"><Plus size={14} />Νέο Φάρμακο</button>
                {(p.medications || []).length === 0 ? <EmptyState label="Προσθήκη φαρμάκου" onAdd={() => openModal('med', {})} /> :
                  (p.medications || []).map((m: any) => (
                    <RecordCard key={m.id} title={`${m.name} ${m.dosage}`} subtitle={`${m.frequency} · ${m.prescribed_by || ''}`}
                      date={`${m.start_date}${m.end_date ? ' → ' + m.end_date : ''}`}
                      badge={m.is_active ? 'Ενεργό' : 'Ολοκληρώθηκε'} badgeColor={m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}
                      onDelete={() => meds.remove.mutate(m.id)}>
                      <Field label="Δραστική" value={m.active_ingredient} /><Field label="Οδός χορήγησης" value={m.route} /><Field label="Αιτία" value={m.reason} /><Field label="Παρενέργειες" value={m.side_effects} />
                    </RecordCard>
                  ))}
              </>
            )}

            {/* ── LAB ── */}
            {activeTab === 'lab' && (
              <>
                <button onClick={() => openModal('lab', { date: new Date().toISOString().split('T')[0] })} className="btn-primary text-sm flex items-center gap-2 mb-4"><Plus size={14} />Νέα Εργαστηριακή</button>
                {(p.labResults || []).length === 0 ? <EmptyState label="Προσθήκη αποτελέσματος" onAdd={() => openModal('lab', {})} /> :
                  (p.labResults || []).map((l: any) => (
                    <RecordCard key={l.id} title={l.title} subtitle={`${l.result_type} · ${l.lab_name || ''} · ${l.vet_name || ''}`} date={l.date}
                      badge={l.is_abnormal ? 'Παθολογικά' : 'Φυσιολογικά'} badgeColor={l.is_abnormal ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}
                      onDelete={() => lab.remove.mutate(l.id)}>
                      <Field label="Ευρήματα" value={l.findings} /><Field label="Εργαστήριο" value={l.lab_name} />
                      {l.file_urls?.length > 0 && <p className="font-medium">Αρχεία: {l.file_urls.map((u: string, i: number) => <a key={i} href={u} target="_blank" rel="noreferrer" className="text-blue-500 underline mr-2">Αρχείο {i+1} <ExternalLink size={10} className="inline"/></a>)}</p>}
                    </RecordCard>
                  ))}
              </>
            )}

            {/* ── IMAGING ── */}
            {activeTab === 'imaging' && (
              <>
                <button onClick={() => openModal('imaging', { date: new Date().toISOString().split('T')[0] })} className="btn-primary text-sm flex items-center gap-2 mb-4"><Plus size={14} />Νέα Απεικόνιση</button>
                {(p.imaging || []).length === 0 ? <EmptyState label="Προσθήκη απεικονιστικής" onAdd={() => openModal('imaging', {})} /> :
                  (p.imaging || []).map((img: any) => (
                    <RecordCard key={img.id} title={img.imaging_type.toUpperCase()} subtitle={`${img.body_region || ''} · ${img.vet_name || ''} · ${img.clinic_name || ''}`} date={img.date} onDelete={() => imaging.remove.mutate(img.id)}>
                      <Field label="Ευρήματα" value={img.findings} /><Field label="Έκθεση" value={img.report} />
                      {img.file_urls?.length > 0 && <p>Αρχεία: {img.file_urls.map((u: string, i: number) => <a key={i} href={u} target="_blank" rel="noreferrer" className="text-blue-500 underline mr-2">Εικόνα {i+1}</a>)}</p>}
                    </RecordCard>
                  ))}
              </>
            )}

            {/* ── SURGERY ── */}
            {activeTab === 'surgery' && (
              <>
                <button onClick={() => openModal('surgery', { date: new Date().toISOString().split('T')[0] })} className="btn-primary text-sm flex items-center gap-2 mb-4"><Plus size={14} />Νέο Χειρουργείο</button>
                {(p.surgeries || []).length === 0 ? <EmptyState label="Προσθήκη χειρουργείου" onAdd={() => openModal('surgery', {})} /> :
                  (p.surgeries || []).map((s: any) => (
                    <RecordCard key={s.id} title={s.procedure} subtitle={`${s.surgeon_name || ''} · ${s.clinic_name || ''}`} date={s.date} onDelete={() => surgery.remove.mutate(s.id)}>
                      <Field label="Κατηγορία" value={s.category} /><Field label="Αναισθησία" value={s.anesthesia} /><Field label="Διάρκεια" value={s.duration_min ? `${s.duration_min} λεπτά` : null} />
                      <Field label="Επιπλοκές" value={s.complications} /><Field label="Αποτέλεσμα" value={s.outcome} /><Field label="Follow-up" value={s.follow_up} /><Field label="Κόστος" value={s.cost ? `${s.cost}€` : null} />
                    </RecordCard>
                  ))}
              </>
            )}

            {/* ── ALLERGIES ── */}
            {activeTab === 'allergies' && (
              <>
                <button onClick={() => openModal('allergy', {})} className="btn-primary text-sm flex items-center gap-2 mb-4"><Plus size={14} />Νέα Αλλεργία</button>
                {(p.allergies || []).length === 0 ? <EmptyState label="Προσθήκη αλλεργίας" onAdd={() => openModal('allergy', {})} /> :
                  (p.allergies || []).map((a: any) => (
                    <RecordCard key={a.id} title={a.allergen} subtitle={`${a.allergen_type} · ${a.reaction || ''}`}
                      badge={a.severity} badgeColor={severityColor(a.severity)} onDelete={() => allergy.remove.mutate(a.id)}>
                      <Field label="Αντίδραση" value={a.reaction} /><Field label="Θεραπεία" value={a.treatment} /><Field label="Διεγνώσθηκε από" value={a.diagnosed_by} />
                    </RecordCard>
                  ))}
              </>
            )}

            {/* ── CHRONIC ── */}
            {activeTab === 'chronic' && (
              <>
                <button onClick={() => openModal('chronic', { status: 'active' })} className="btn-primary text-sm flex items-center gap-2 mb-4"><Plus size={14} />Νέα Χρόνια Πάθηση</button>
                {(p.chronicConditions || []).length === 0 ? <EmptyState label="Προσθήκη πάθησης" onAdd={() => openModal('chronic', {})} /> :
                  (p.chronicConditions || []).map((c: any) => (
                    <RecordCard key={c.id} title={c.condition} subtitle={`${c.diagnosed_by || ''} · ${c.clinic_name || ''}`} date={c.diagnosed_date}
                      badge={c.status === 'active' ? 'Ενεργή' : c.status === 'managed' ? 'Ελεγχόμενη' : 'Σε ύφεση'}
                      badgeColor={c.status === 'active' ? 'bg-red-100 text-red-700' : c.status === 'managed' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}
                      onDelete={() => chronic.remove.mutate(c.id)}>
                      <Field label="ICD Κωδικός" value={c.icd_code} /><Field label="Σχέδιο θεραπείας" value={c.treatment_plan} /><Field label="Παρακολούθηση" value={c.monitoring} />
                    </RecordCard>
                  ))}
              </>
            )}

            {/* ── DENTAL ── */}
            {activeTab === 'dental' && (
              <>
                <button onClick={() => openModal('dental', { date: new Date().toISOString().split('T')[0] })} className="btn-primary text-sm flex items-center gap-2 mb-4"><Plus size={14} />Νέα Οδοντιατρική Πράξη</button>
                {(p.dentalRecords || []).length === 0 ? <EmptyState label="Προσθήκη οδοντιατρικής" onAdd={() => openModal('dental', {})} /> :
                  (p.dentalRecords || []).map((d: any) => (
                    <RecordCard key={d.id} title={d.procedure} subtitle={`${d.vet_name || ''} · ${d.clinic_name || ''}`} date={d.date} onDelete={() => dental.remove.mutate(d.id)}>
                      <Field label="Δόντια" value={d.teeth_treated} /><Field label="Ευρήματα" value={d.findings} /><Field label="Στάδιο" value={d.grade} /><Field label="Επόμενος καθαρισμός" value={d.next_due} /><Field label="Κόστος" value={d.cost ? `${d.cost}€` : null} />
                    </RecordCard>
                  ))}
              </>
            )}

            {/* ── WEIGHT CHART ── */}
            {activeTab === 'weight' && (
              <>
                <button onClick={() => openModal('weight', { date: new Date().toISOString().split('T')[0] })} className="btn-primary text-sm flex items-center gap-2 mb-4"><Plus size={14} />Νέα Μέτρηση</button>
                {(p.weightRecords || []).length > 1 && (
                  <div className="card p-4 mb-4">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Γράφημα Βάρους</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={p.weightRecords.map((w: any) => ({ date: w.date.slice(5), kg: w.weight_kg }))}>
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                        <Tooltip formatter={(v: any) => [`${v} kg`, 'Βάρος']} />
                        <Line type="monotone" dataKey="kg" stroke="#E65100" strokeWidth={2} dot={{ r: 4, fill: '#E65100' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {(p.weightRecords || []).length === 0 ? <EmptyState label="Προσθήκη μέτρησης" onAdd={() => openModal('weight', {})} /> :
                  (p.weightRecords || []).slice().reverse().map((w: any) => (
                    <RecordCard key={w.id} title={`${w.weight_kg} kg`} subtitle={`BCS: ${w.bcs || '-'}/9 · ${w.vet_name || ''}`} date={w.date} onDelete={() => weight.remove.mutate(w.id)}>
                      <Field label="Σημειώσεις" value={w.notes} />
                    </RecordCard>
                  ))}
              </>
            )}

            {/* ── GENETIC ── */}
            {activeTab === 'genetic' && (
              <>
                <button onClick={() => openModal('genetic', { date: new Date().toISOString().split('T')[0] })} className="btn-primary text-sm flex items-center gap-2 mb-4"><Plus size={14} />Νέα Γενετική Εξέταση</button>
                {(p.geneticTests || []).length === 0 ? <EmptyState label="Προσθήκη γενετικής" onAdd={() => openModal('genetic', {})} /> :
                  (p.geneticTests || []).map((g: any) => (
                    <RecordCard key={g.id} title={g.test_name} subtitle={g.provider} date={g.date} onDelete={() => genetic.remove.mutate(g.id)}>
                      <Field label="Αποτελέσματα" value={g.results} />
                      {g.breeds_detected?.length > 0 && <p><span className="font-medium">Ράτσες:</span> {g.breeds_detected.join(', ')}</p>}
                      {g.conditions_found?.length > 0 && <p><span className="font-medium">Παθήσεις:</span> {g.conditions_found.join(', ')}</p>}
                    </RecordCard>
                  ))}
              </>
            )}

            {/* ── VITALS ── */}
            {activeTab === 'vitals' && (
              <>
                <button onClick={() => openModal('vitals', { date: new Date().toISOString().split('T')[0] })} className="btn-primary text-sm flex items-center gap-2 mb-4"><Plus size={14} />Νέα Μέτρηση Ζωτικών</button>
                {(p.vitalSigns || []).length === 0 ? <EmptyState label="Προσθήκη ζωτικών" onAdd={() => openModal('vitals', {})} /> :
                  (p.vitalSigns || []).map((v: any) => (
                    <RecordCard key={v.id} title={`${v.temperature_c ? v.temperature_c + '°C' : ''} ${v.heart_rate ? v.heart_rate + ' bpm' : ''} ${v.weight_kg ? v.weight_kg + ' kg' : ''}`.trim()} subtitle={v.vet_name} date={v.date} onDelete={() => vitals.remove.mutate(v.id)}>
                      <Field label="Θερμοκρασία" value={v.temperature_c ? `${v.temperature_c}°C` : null} />
                      <Field label="Καρδιακοί παλμοί" value={v.heart_rate ? `${v.heart_rate} bpm` : null} />
                      <Field label="Αναπνευστικός ρυθμός" value={v.respiratory_rate ? `${v.respiratory_rate} /min` : null} />
                      <Field label="Αρτηριακή πίεση" value={v.blood_pressure} /><Field label="Τριχοειδής επαναπλήρωση" value={v.capillary_refill} />
                    </RecordCard>
                  ))}
              </>
            )}

            {/* ── PEDIGREE ── */}
            {activeTab === 'pedigree' && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 dark:text-white">Στοιχεία Pedigree</h3>
                  <button onClick={() => openModal('pedigree', p.pedigree || {})} className="btn-secondary text-xs flex items-center gap-1.5"><Edit2 size={13} />Επεξεργασία</button>
                </div>
                {p.pedigree ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {[['Αρ. Εγγραφής', p.pedigree.registration_number], ['Kennel Club', p.pedigree.kennel_club],
                      ['Πατέρας', p.pedigree.father_name], ['Μητέρα', p.pedigree.mother_name],
                      ['Εκτροφέας', p.pedigree.breeder_name], ['Επικοινωνία', p.pedigree.breeder_contact]
                    ].filter(([, v]) => v).map(([l, v]) => (
                      <div key={l}><p className="text-xs text-gray-400">{l}</p><p className="font-medium">{v as string}</p></div>
                    ))}
                  </div>
                ) : <EmptyState label="Προσθήκη Pedigree" onAdd={() => openModal('pedigree', {})} />}
              </div>
            )}

            {/* ── TRAVEL / PASSPORT ── */}
            {activeTab === 'travel' && (
              <>
                {/* Info banner */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  <div className="card p-4 border-l-4 border-blue-500">
                    <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-2">🇬🇷 Εσωτερικό Ταξίδι</p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <li>✅ Μικροτσίπ (ISO 11784/11785)</li>
                      <li>✅ Εμβόλιο Λύσσας σε ισχύ</li>
                      <li>✅ Βιβλιάριο υγείας</li>
                      <li>✅ Κτηνιατρικό πιστοποιητικό</li>
                    </ul>
                  </div>
                  <div className="card p-4 border-l-4 border-orange-500">
                    <p className="text-xs font-bold text-orange-700 dark:text-orange-400 mb-2">🌍 Διεθνές Ταξίδι (ΕΕ)</p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <li>✅ EU Pet Passport</li>
                      <li>✅ Μικροτσίπ πριν τον εμβολιασμό</li>
                      <li>✅ Εμβόλιο Λύσσας (21+ ημέρες)</li>
                      <li>✅ Τίτλοι αντισωμάτων (εκτός ΕΕ)</li>
                      <li>✅ Θεράπευση Echinococcus (σκύλοι)</li>
                    </ul>
                  </div>
                </div>

                {/* Passport checklist status */}
                {passport && (
                  <div className="card p-4 mb-4 bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3">📋 Κατάσταση Εγγράφων</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { label: 'Μικροτσίπ', ok: !!(pet as any)?.microchip },
                        { label: 'Εμβόλιο Λύσσας', ok: (passport.vaccinations || []).some((v: any) => v.vaccine_type === 'rabies' && (!v.next_due_date || new Date(v.next_due_date) > new Date())) },
                        { label: 'Εξέταση SNAP', ok: (passport.healthRecords || []).length > 0 },
                        { label: 'Ταξιδιωτικά Έγγραφα', ok: (passport.travelDocs || []).length > 0 },
                      ].map(({ label, ok }) => (
                        <div key={label} className={cn('flex items-center gap-2 p-2 rounded-lg', ok ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20')}>
                          <span>{ok ? '✅' : '❌'}</span>
                          <span className={ok ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={() => openModal('travel', {})} className="btn-primary text-sm flex items-center gap-2 mb-4"><Plus size={14} />Νέο Ταξίδι / Έγγραφο</button>
                {(p.travelDocs || []).length === 0 ? <EmptyState label="Προσθήκη ταξιδιού" onAdd={() => openModal('travel', {})} /> :
                  (p.travelDocs || []).map((t: any) => (
                    <RecordCard key={t.id} title={`${t.origin_city || ''} → ${t.destination_city}`} subtitle={`${t.travel_type} · ${t.carrier || ''}`} date={t.departure_date} onDelete={() => travel.remove.mutate(t.id)}>
                      <Field label="Χώρα" value={t.destination_country} /><Field label="Επιστροφή" value={t.return_date} /><Field label="Κωδικός" value={t.booking_ref} />
                    </RecordCard>
                  ))}
              </>
            )}

            {/* ── ACCESS ── */}
            {activeTab === 'access' && (
              <>
                <div className="card p-4 mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30">
                  <div className="flex items-start gap-2">
                    <Shield size={16} className="text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 dark:text-blue-300">Χορήγησε πρόσβαση σε συγκεκριμένους κτηνιάτρους για να δουν τον φάκελο του ζώου σου. Μπορείς να ανακαλέσεις την πρόσβαση οποτεδήποτε.</p>
                  </div>
                </div>
                <button onClick={() => openModal('access', {})} className="btn-primary text-sm flex items-center gap-2 mb-4"><Plus size={14} />Χορήγηση Πρόσβασης</button>
                {(p.accessList || []).length === 0 ? (
                  <div className="text-center py-12 text-gray-400">Κανείς κτηνίατρος δεν έχει πρόσβαση ακόμα</div>
                ) : (p.accessList || []).map((a: any) => (
                  <RecordCard key={a.id} title={a.provider_name} subtitle={a.provider_email}
                    badge={a.status === 'approved' ? 'Εγκεκριμένη' : 'Ανακλήθηκε'}
                    badgeColor={a.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}
                    onDelete={a.status === 'approved' ? () => revokeAccess.mutate(a.id) : undefined}>
                    <Field label="Αιτία" value={a.reason} /><Field label="Εγκρίθηκε" value={a.granted_at ? new Date(a.granted_at).toLocaleDateString('el-GR') : null} /><Field label="Λήξη" value={a.expires_at ? new Date(a.expires_at).toLocaleDateString('el-GR') : 'Χωρίς λήξη'} />
                  </RecordCard>
                ))}
              </>
            )}
          </>
        )}

        {isLoading && <div className="text-center py-16 text-gray-400">Φόρτωση φακέλου...</div>}
      </div>

      {/* ─── MODALS ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {modal === 'vaccine' && (
          <Modal title="Νέο Εμβόλιο" onClose={() => setModal(null)} onSave={() => vac.create.mutate(form)} saving={vac.create.isPending}>
            <F label="Εμβόλιο *" name="vaccine_name" form={form} setForm={setForm} />
            <F label="Τύπος" name="vaccine_type" form={form} setForm={setForm} options={[{value:'',label:'—'},{value:'core',label:'Core'},{value:'non_core',label:'Non-Core'},{value:'rabies',label:'Λύσσα'},{value:'other',label:'Άλλο'}]} />
            <F label="Ημ. Χορήγησης *" name="date_administered" form={form} setForm={setForm} type="date" />
            <F label="Επόμενη Δόση" name="next_due_date" form={form} setForm={setForm} type="date" />
            <F label="Κτηνίατρος" name="vet_name" form={form} setForm={setForm} />
            <F label="Σημειώσεις" name="notes" form={form} setForm={setForm} type="textarea" />
          </Modal>
        )}

        {modal === 'health' && (
          <Modal title="Νέα Εξέταση" onClose={() => setModal(null)} onSave={() => health.create.mutate(form)} saving={health.create.isPending}>
            <F label="Τίτλος *" name="title" form={form} setForm={setForm} />
            <F label="Τύπος" name="record_type" form={form} setForm={setForm} options={['examination','diagnosis','follow_up','specialist','emergency','other']} />
            <F label="Ημερομηνία *" name="date" form={form} setForm={setForm} type="date" />
            <F label="Κτηνίατρος" name="vet_name" form={form} setForm={setForm} />
            <F label="Κλινική" name="clinic_name" form={form} setForm={setForm} />
            <F label="Περιγραφή" name="description" form={form} setForm={setForm} type="textarea" />
            <F label="Κόστος (€)" name="cost" form={form} setForm={setForm} type="number" />
            <F label="Επόμενο Ραντεβού" name="next_appointment" form={form} setForm={setForm} type="date" />
          </Modal>
        )}

        {modal === 'med' && (
          <Modal title="Νέο Φάρμακο" onClose={() => setModal(null)} onSave={() => meds.create.mutate(form)} saving={meds.create.isPending}>
            <F label="Όνομα Φαρμάκου *" name="name" form={form} setForm={setForm} />
            <F label="Δραστική Ουσία" name="active_ingredient" form={form} setForm={setForm} />
            <F label="Δοσολογία *" name="dosage" form={form} setForm={setForm} />
            <F label="Συχνότητα *" name="frequency" form={form} setForm={setForm} options={['Μία φορά/ημέρα','Δύο φορές/ημέρα','Τρεις φορές/ημέρα','Εβδομαδιαία','Μηνιαία','Κατά ανάγκη']} />
            <F label="Οδός Χορήγησης" name="route" form={form} setForm={setForm} options={[{value:'',label:'—'},{value:'oral',label:'Από το στόμα'},{value:'injection',label:'Ένεση'},{value:'topical',label:'Τοπικά'},{value:'eye_drops',label:'Οφθαλμικές σταγόνες'},{value:'ear_drops',label:'Ωτικές σταγόνες'}]} />
            <F label="Ημ. Έναρξης *" name="start_date" form={form} setForm={setForm} type="date" />
            <F label="Ημ. Λήξης" name="end_date" form={form} setForm={setForm} type="date" />
            <F label="Συνταγογραφήθηκε από" name="prescribed_by" form={form} setForm={setForm} />
            <F label="Αιτία χορήγησης" name="reason" form={form} setForm={setForm} />
            <F label="Πιθανές Παρενέργειες" name="side_effects" form={form} setForm={setForm} type="textarea" />
          </Modal>
        )}

        {modal === 'lab' && (
          <Modal title="Νέα Εργαστηριακή Εξέταση" onClose={() => setModal(null)} onSave={() => lab.create.mutate(form)} saving={lab.create.isPending}>
            <F label="Τίτλος *" name="title" form={form} setForm={setForm} />
            <F label="Τύπος Εξέτασης" name="result_type" form={form} setForm={setForm} options={[{value:'blood_count',label:'Αιματολογικό'},{value:'biochemistry',label:'Βιοχημικός Έλεγχος'},{value:'urine',label:'Ούρων'},{value:'fecal',label:'Κοπράνων'},{value:'biopsy',label:'Βιοψία'},{value:'culture',label:'Καλλιέργεια'},{value:'hormone',label:'Ορμόνες'},{value:'serology',label:'Ορολογία'},{value:'other',label:'Άλλο'}]} />
            <F label="Ημερομηνία *" name="date" form={form} setForm={setForm} type="date" />
            <F label="Εργαστήριο" name="lab_name" form={form} setForm={setForm} />
            <F label="Κτηνίατρος" name="vet_name" form={form} setForm={setForm} />
            <F label="Κλινική" name="clinic_name" form={form} setForm={setForm} />
            <F label="Ευρήματα" name="findings" form={form} setForm={setForm} type="textarea" />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="abnormal" checked={form.is_abnormal || false} onChange={e => setForm((f: any) => ({ ...f, is_abnormal: e.target.checked }))} />
              <label htmlFor="abnormal" className="text-sm text-gray-700 dark:text-gray-300">Παθολογικά Αποτελέσματα</label>
            </div>
          </Modal>
        )}

        {modal === 'imaging' && (
          <Modal title="Νέα Απεικονιστική Εξέταση" onClose={() => setModal(null)} onSave={() => imaging.create.mutate(form)} saving={imaging.create.isPending}>
            <F label="Τύπος *" name="imaging_type" form={form} setForm={setForm} options={[{value:'xray',label:'Ακτινογραφία (X-Ray)'},{value:'ultrasound',label:'Υπερηχογράφημα'},{value:'ct',label:'CT Scan'},{value:'mri',label:'MRI'},{value:'endoscopy',label:'Ενδοσκόπηση'},{value:'echocardiogram',label:'Ηχοκαρδιογράφημα'},{value:'other',label:'Άλλο'}]} />
            <F label="Περιοχή Σώματος" name="body_region" form={form} setForm={setForm} />
            <F label="Ημερομηνία *" name="date" form={form} setForm={setForm} type="date" />
            <F label="Κτηνίατρος" name="vet_name" form={form} setForm={setForm} />
            <F label="Κλινική" name="clinic_name" form={form} setForm={setForm} />
            <F label="Ευρήματα" name="findings" form={form} setForm={setForm} type="textarea" />
            <F label="Έκθεση" name="report" form={form} setForm={setForm} type="textarea" />
          </Modal>
        )}

        {modal === 'surgery' && (
          <Modal title="Νέο Χειρουργείο / Επέμβαση" onClose={() => setModal(null)} onSave={() => surgery.create.mutate(form)} saving={surgery.create.isPending}>
            <F label="Επέμβαση *" name="procedure" form={form} setForm={setForm} />
            <F label="Κατηγορία" name="category" form={form} setForm={setForm} options={[{value:'',label:'—'},{value:'orthopedic',label:'Ορθοπεδική'},{value:'soft_tissue',label:'Μαλακών Ιστών'},{value:'dental',label:'Οδοντιατρική'},{value:'ophthalmic',label:'Οφθαλμολογική'},{value:'neurological',label:'Νευρολογική'},{value:'reproductive',label:'Αναπαραγωγική'},{value:'other',label:'Άλλη'}]} />
            <F label="Ημερομηνία *" name="date" form={form} setForm={setForm} type="date" />
            <F label="Χειρουργός" name="surgeon_name" form={form} setForm={setForm} />
            <F label="Κλινική" name="clinic_name" form={form} setForm={setForm} />
            <F label="Αναισθησία" name="anesthesia" form={form} setForm={setForm} options={[{value:'',label:'—'},{value:'general',label:'Γενική'},{value:'local',label:'Τοπική'},{value:'sedation',label:'Κατακόρυφη'}]} />
            <F label="Διάρκεια (λεπτά)" name="duration_min" form={form} setForm={setForm} type="number" />
            <F label="Επιπλοκές" name="complications" form={form} setForm={setForm} type="textarea" />
            <F label="Αποτέλεσμα" name="outcome" form={form} setForm={setForm} />
            <F label="Follow-up" name="follow_up" form={form} setForm={setForm} />
            <F label="Κόστος (€)" name="cost" form={form} setForm={setForm} type="number" />
          </Modal>
        )}

        {modal === 'allergy' && (
          <Modal title="Νέα Αλλεργία" onClose={() => setModal(null)} onSave={() => allergy.create.mutate(form)} saving={allergy.create.isPending}>
            <F label="Αλλεργιογόνο *" name="allergen" form={form} setForm={setForm} />
            <F label="Τύπος" name="allergen_type" form={form} setForm={setForm} options={[{value:'food',label:'Τροφής'},{value:'medication',label:'Φαρμάκου'},{value:'environmental',label:'Περιβαλλοντικό'},{value:'insect',label:'Εντόμου'},{value:'contact',label:'Επαφής'},{value:'other',label:'Άλλο'}]} />
            <F label="Αντίδραση" name="reaction" form={form} setForm={setForm} type="textarea" />
            <F label="Σοβαρότητα" name="severity" form={form} setForm={setForm} options={[{value:'mild',label:'Ήπια'},{value:'moderate',label:'Μέτρια'},{value:'severe',label:'Σοβαρή'},{value:'anaphylactic',label:'Αναφυλακτική'}]} />
            <F label="Θεραπεία" name="treatment" form={form} setForm={setForm} />
            <F label="Διεγνώσθηκε από" name="diagnosed_by" form={form} setForm={setForm} />
            <F label="Ημ. Διάγνωσης" name="diagnosed_date" form={form} setForm={setForm} type="date" />
          </Modal>
        )}

        {modal === 'chronic' && (
          <Modal title="Νέα Χρόνια Πάθηση" onClose={() => setModal(null)} onSave={() => chronic.create.mutate(form)} saving={chronic.create.isPending}>
            <F label="Πάθηση *" name="condition" form={form} setForm={setForm} />
            <F label="ICD Κωδικός" name="icd_code" form={form} setForm={setForm} />
            <F label="Κατάσταση" name="status" form={form} setForm={setForm} options={[{value:'active',label:'Ενεργή'},{value:'managed',label:'Ελεγχόμενη'},{value:'resolved',label:'Σε ύφεση'}]} />
            <F label="Ημ. Διάγνωσης" name="diagnosed_date" form={form} setForm={setForm} type="date" />
            <F label="Διεγνώσθηκε από" name="diagnosed_by" form={form} setForm={setForm} />
            <F label="Κλινική" name="clinic_name" form={form} setForm={setForm} />
            <F label="Σχέδιο Θεραπείας" name="treatment_plan" form={form} setForm={setForm} type="textarea" />
            <F label="Παρακολούθηση" name="monitoring" form={form} setForm={setForm} />
          </Modal>
        )}

        {modal === 'dental' && (
          <Modal title="Νέα Οδοντιατρική Πράξη" onClose={() => setModal(null)} onSave={() => dental.create.mutate(form)} saving={dental.create.isPending}>
            <F label="Πράξη *" name="procedure" form={form} setForm={setForm} options={[{value:'cleaning',label:'Καθαρισμός'},{value:'extraction',label:'Εξαγωγή'},{value:'xray',label:'Ακτινογραφία Δοντιών'},{value:'root_canal',label:'Ριζοθεραπεία'},{value:'other',label:'Άλλο'}]} />
            <F label="Ημερομηνία *" name="date" form={form} setForm={setForm} type="date" />
            <F label="Κτηνίατρος" name="vet_name" form={form} setForm={setForm} />
            <F label="Κλινική" name="clinic_name" form={form} setForm={setForm} />
            <F label="Δόντια / Περιοχή" name="teeth_treated" form={form} setForm={setForm} />
            <F label="Ευρήματα" name="findings" form={form} setForm={setForm} type="textarea" />
            <F label="Στάδιο Νόσου" name="grade" form={form} setForm={setForm} options={[{value:'',label:'—'},{value:'Stage 1',label:'Στάδιο 1'},{value:'Stage 2',label:'Στάδιο 2'},{value:'Stage 3',label:'Στάδιο 3'},{value:'Stage 4',label:'Στάδιο 4'}]} />
            <F label="Επόμενος Καθαρισμός" name="next_due" form={form} setForm={setForm} type="date" />
            <F label="Κόστος (€)" name="cost" form={form} setForm={setForm} type="number" />
          </Modal>
        )}

        {modal === 'weight' && (
          <Modal title="Νέα Μέτρηση Βάρους" onClose={() => setModal(null)} onSave={() => weight.create.mutate(form)} saving={weight.create.isPending}>
            <F label="Βάρος (kg) *" name="weight_kg" form={form} setForm={setForm} type="number" />
            <F label="BCS (1-9)" name="bcs" form={form} setForm={setForm} options={[{value:'',label:'—'},...[1,2,3,4,5,6,7,8,9].map(n => ({value:String(n),label:`${n} — ${['Καχεκτικό','Λεπτό','Ελαφρώς Λεπτό','Ιδανικό','Ιδανικό','Ελαφρώς Παχύ','Παχύ','Παχύσαρκο','Σοβαρά Παχύσαρκο'][n-1]}`}))]} />
            <F label="Ημερομηνία *" name="date" form={form} setForm={setForm} type="date" />
            <F label="Κτηνίατρος" name="vet_name" form={form} setForm={setForm} />
            <F label="Σημειώσεις" name="notes" form={form} setForm={setForm} />
          </Modal>
        )}

        {modal === 'genetic' && (
          <Modal title="Νέα Γενετική Εξέταση" onClose={() => setModal(null)} onSave={() => genetic.create.mutate(form)} saving={genetic.create.isPending}>
            <F label="Εξέταση *" name="test_name" form={form} setForm={setForm} />
            <F label="Πάροχος" name="provider" form={form} setForm={setForm} options={[{value:'',label:'—'},{value:'Embark',label:'Embark'},{value:'Wisdom Panel',label:'Wisdom Panel'},{value:'DNAmy',label:'DNAmy'},{value:'other',label:'Άλλος'}]} />
            <F label="Ημερομηνία *" name="date" form={form} setForm={setForm} type="date" />
            <F label="Αποτελέσματα" name="results" form={form} setForm={setForm} type="textarea" />
          </Modal>
        )}

        {modal === 'vitals' && (
          <Modal title="Νέα Μέτρηση Ζωτικών Σημείων" onClose={() => setModal(null)} onSave={() => vitals.create.mutate(form)} saving={vitals.create.isPending}>
            <F label="Ημερομηνία *" name="date" form={form} setForm={setForm} type="date" />
            <F label="Θερμοκρασία (°C)" name="temperature_c" form={form} setForm={setForm} type="number" />
            <F label="Καρδιακοί Παλμοί (bpm)" name="heart_rate" form={form} setForm={setForm} type="number" />
            <F label="Αναπνευστικός Ρυθμός (/min)" name="respiratory_rate" form={form} setForm={setForm} type="number" />
            <F label="Βάρος (kg)" name="weight_kg" form={form} setForm={setForm} type="number" />
            <F label="Αρτηριακή Πίεση" name="blood_pressure" form={form} setForm={setForm} />
            <F label="Τριχοειδής Επαναπλήρωση" name="capillary_refill" form={form} setForm={setForm} options={[{value:'',label:'—'},{value:'<2sec',label:'< 2 δευτ. (Φυσιολογική)'},{value:'2-3sec',label:'2-3 δευτ. (Παθολογική)'},{value:'>3sec',label:'> 3 δευτ. (Κρίσιμη)'}]} />
            <F label="Κτηνίατρος" name="vet_name" form={form} setForm={setForm} />
            <F label="Σημειώσεις" name="notes" form={form} setForm={setForm} />
          </Modal>
        )}

        {modal === 'pedigree' && (
          <Modal title="Στοιχεία Pedigree" onClose={() => setModal(null)}
            onSave={() => api.put(`/passport/pedigree/${activePetId}`, { ...form, certifications: form.certifications ? String(form.certifications).split(',').map((s: string) => s.trim()) : [] }).then(() => { inv(); setModal(null); toast.success('Αποθηκεύτηκε!') })}
            saving={false}>
            <F label="Αρ. Εγγραφής" name="registration_number" form={form} setForm={setForm} />
            <F label="Kennel Club" name="kennel_club" form={form} setForm={setForm} />
            <F label="Όνομα Πατέρα" name="father_name" form={form} setForm={setForm} />
            <F label="Όνομα Μητέρας" name="mother_name" form={form} setForm={setForm} />
            <F label="Εκτροφέας" name="breeder_name" form={form} setForm={setForm} />
            <F label="Επικοινωνία Εκτροφέα" name="breeder_contact" form={form} setForm={setForm} />
            <F label="Πιστοποιήσεις (χωρισμένες με κόμμα)" name="certifications" form={form} setForm={setForm} />
            <F label="Σημειώσεις" name="notes" form={form} setForm={setForm} type="textarea" />
          </Modal>
        )}

        {modal === 'travel' && (
          <Modal title="Νέο Ταξίδι" onClose={() => setModal(null)} onSave={() => travel.create.mutate(form)} saving={travel.create.isPending}>
            <F label="Τύπος *" name="travel_type" form={form} setForm={setForm} options={[{value:'flight',label:'✈️ Αεροπλάνο'},{value:'ferry',label:'🚢 Πλοίο'},{value:'train',label:'🚂 Τρένο'},{value:'road',label:'🚗 Οδικώς'},{value:'international',label:'🌍 Διεθνές'}]} />
            <F label="Αφετηρία" name="origin_city" form={form} setForm={setForm} />
            <F label="Προορισμός *" name="destination_city" form={form} setForm={setForm} />
            <F label="Χώρα Προορισμού" name="destination_country" form={form} setForm={setForm} />
            <F label="Ημ. Αναχώρησης *" name="departure_date" form={form} setForm={setForm} type="date" />
            <F label="Ημ. Επιστροφής" name="return_date" form={form} setForm={setForm} type="date" />
            <F label="Μεταφορέας" name="carrier" form={form} setForm={setForm} />
            <F label="Κωδικός Κράτησης" name="booking_ref" form={form} setForm={setForm} />
          </Modal>
        )}

        {modal === 'access' && (
          <Modal title="Χορήγηση Πρόσβασης σε Κτηνίατρο" onClose={() => setModal(null)} onSave={() => addAccess.mutate(form)} saving={addAccess.isPending}>
            <F label="Email Κτηνιάτρου *" name="provider_email" form={form} setForm={setForm} type="email" />
            <F label="Όνομα Κτηνιάτρου" name="provider_name" form={form} setForm={setForm} />
            <F label="Αιτία / Σχόλιο" name="reason" form={form} setForm={setForm} />
            <F label="Λήξη Πρόσβασης" name="expires_at" form={form} setForm={setForm} type="date" />
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}