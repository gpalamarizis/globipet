import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import {
  BookOpen, Syringe, Stethoscope, Award, Plane, Plus, X, Trash2,
  Pill, FlaskConical, ScanLine, Scissors, AlertTriangle, Heart, Smile,
  Scale, Dna, Activity, Shield, FileDown, Users, Edit2, ChevronDown, ExternalLink
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

// ─── TAB DEFINITIONS ─────────────────────────────────────────────
const TABS = [
  { id: 'identity',   labelKey: 'passport.identity',      icon: BookOpen },
  { id: 'vaccines',   labelKey: 'passport.vaccines',         icon: Syringe },
  { id: 'health',     labelKey: 'passport.visits',       icon: Stethoscope },
  { id: 'meds',       labelKey: 'passport.medications',         icon: Pill },
  { id: 'lab',        labelKey: 'passport.lab',      icon: FlaskConical },
  { id: 'imaging',    labelKey: 'passport.imaging',  icon: ScanLine },
  { id: 'surgery',    labelKey: 'passport.surgeries',     icon: Scissors },
  { id: 'allergies',  labelKey: 'passport.allergies',       icon: AlertTriangle },
  { id: 'chronic',    labelKey: 'passport.chronic',icon: Heart },
  { id: 'dental',     labelKey: 'passport.dental',    icon: Smile },
  { id: 'weight',     labelKey: 'passport.weight',           icon: Scale },
  { id: 'genetic',    labelKey: 'passport.genetic',       icon: Dna },
  { id: 'vitals',     labelKey: 'passport.vitals',          icon: Activity },
  { id: 'pedigree',   labelKey: 'passport.pedigree',        icon: Award },
  { id: 'travel',     labelKey: 'passport.travel',      icon: Plane },
  { id: 'access',     labelKey: 'passport.access',        icon: Users },
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
  const { t } = useTranslation()
  return (
    <div className="text-center py-12">
      <p className="text-gray-400 mb-3">{t('pgPassport.noRecords')}</p>
      <button onClick={onAdd} className="btn-primary text-sm px-4 py-2 flex items-center gap-2 mx-auto"><Plus size={14} />{label}</button>
    </div>
  )
}

// ─── MODAL WRAPPER ───────────────────────────────────────────────
function Modal({ title, onClose, onSave, saving, children }: any) {
  const { t } = useTranslation()
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
          <button onClick={onClose} className="btn-secondary flex-1">{t('pgPassport.cancel')}</button>
          <button onClick={onSave} disabled={saving} className="btn-primary flex-1">{saving ? t('pgPassport.saving') : t('common.save')}</button>
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
  const { t, i18n } = useTranslation()
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
      onSuccess: () => { inv(); setModal(null); setForm({}); toast.success(t('pgPassport.savedToast')) },
      onError: () => toast.error(t('pgPassport.saveError')),
    })
    const remove = useMutation({
      mutationFn: (id: string) => api.delete(`/passport/${endpoint}/${id}`),
      onSuccess: () => { inv(); toast.success(t('common.deleted')) },
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
    onSuccess: () => { inv(); setModal(null); setForm({}); toast.success(t('pgPassport.accessGranted')) },
  })
  const revokeAccess = useMutation({
    mutationFn: (id: string) => api.delete(`/passport/access/${id}`),
    onSuccess: () => { inv(); toast.success(t('pgPassport.accessRevoked')) },
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
              <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('pgPassport.title')}</h1>
              <p className="text-sm text-gray-500">{t('pgPassport.subtitle')}</p>
            </div>
          </div>
          {activePetId && (
            <a href={`${import.meta.env.VITE_API_URL || 'https://api.globipet.com'}/passport/${activePetId}/pdf`}
              target="_blank" rel="noreferrer"
              className="btn-secondary flex items-center gap-2 text-sm px-4 py-2.5">
              <FileDown size={15} /> {t('pgPassport.exportPdf')}
            </a>
          )}
        </div>

        {/* Pet selector */}
        {pets.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {pets.map((p: any) => (
              <button key={p.id} onClick={() => setSelectedPetId(p.id)}
                className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                  activePetId === p.id ? 'bg-brand-900 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300')}>
                <span>{speciesEmoji[p.species] || '🐾'}</span>{p.name}
              </button>
            ))}
          </div>
        )}

        {!activePetId && <div className="card p-8 text-center text-gray-400">{t('pgPassport.selectPet')}</div>}

        {activePetId && !isLoading && pet && (
          <>
            {/* Alerts for allergies & chronic conditions */}
            {(p.allergies?.length > 0 || p.chronicConditions?.filter((c: any) => c.status === 'active').length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                {p.allergies?.length > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                    <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                    <div><p className="text-xs font-bold text-red-700 mb-1">{t('pgPassport.alertAllergies')}</p>
                      <p className="text-xs text-red-600">{p.allergies.map((a: any) => a.allergen).join(', ')}</p></div>
                  </div>
                )}
                {p.chronicConditions?.filter((c: any) => c.status === 'active').length > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                    <Heart size={16} className="text-yellow-600 shrink-0 mt-0.5" />
                    <div><p className="text-xs font-bold text-yellow-700 mb-1">{t('pgPassport.alertChronic')}</p>
                      <p className="text-xs text-yellow-600">{p.chronicConditions.filter((c: any) => c.status === 'active').map((c: any) => c.condition).join(', ')}</p></div>
                  </div>
                )}
              </div>
            )}

            {/* Tabs */}
            <div className="flex flex-wrap gap-1 mb-5">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all',
                    activeTab === tab.id ? 'bg-brand-900 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400')}>
                  <tab.icon size={13} />{t(tab.labelKey)}
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
                  {/*
                    Four of the eight entries here read columns that do not
                    exist on Pet: birthday, is_sterilized, microchip and
                    passport_number. The first, third and fourth simply
                    rendered blank and were dropped by the filter.

                    is_sterilized was worse than blank. Undefined is falsy, so
                    the ternary printed "Όχι" for every animal — a passport
                    stating, in writing, that a neutered pet is not neutered.
                    On a document a vet may act on, a confident wrong answer
                    is the one thing that must not ship. It is out until the
                    column and its form field exist.

                    Age is what the Pet row actually carries.
                  */}
                  {[[t('pgPassport.species'), pet.species], [t('pgPassport.breed'), pet.breed], [t('pgPassport.gender'), pet.gender],
                    [t('pgPassport.age'), pet.age ? t('pgPassport.ageYears', { count: pet.age }) : null],
                    [t('pgPassport.color'), pet.color],
                    [t('pgPassport.microchip'), pet.microchip_number],
                    // Three states, not two. Null means nobody has said, and
                    // the filter below drops the row rather than guessing.
                    [t('pgPassport.sterilised'), pet.is_sterilized === true ? t('common.yes')
                      : pet.is_sterilized === false ? t('common.no') : null],
                    [t('pgPassport.vaccinations'), pet.vaccination_status]
                  ].filter(([, v]) => v).map(([l, v]) => (
                    <div key={l}><p className="text-xs text-gray-400">{l}</p><p className="font-medium text-gray-900 dark:text-white">{v as string}</p></div>
                  ))}
                </div>
              </div>
            )}

            {/* ── VACCINES ── */}
            {activeTab === 'vaccines' && (
              <>
                <button onClick={() => openModal('vaccine', { date_administered: new Date().toISOString().split('T')[0] })} className="btn-primary text-sm flex items-center gap-2 mb-4"><Plus size={14} />{t('pgPassport.newVaccine')}</button>
                {(p.vaccinations || []).length === 0 ? <EmptyState label={t('pgPassport.addVaccine')} onAdd={() => openModal('vaccine', {})} /> :
                  (p.vaccinations || []).map((v: any) => (
                    <RecordCard key={v.id} title={v.vaccine_name} subtitle={`${v.vaccine_type} · ${v.vet_name || ''}`} date={v.date_administered}
                      badge={v.next_due_date && new Date(v.next_due_date) < new Date() ? t('pgPassport.overdue') : v.next_due_date ? t('pgPassport.nextDue', { date: v.next_due_date }) : undefined}
                      badgeColor={v.next_due_date && new Date(v.next_due_date) < new Date() ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}
                      onDelete={() => vac.remove.mutate(v.id)}>
                      <Field label={t('pgPassport.type')} value={v.vaccine_type} /><Field label={t('pgPassport.vet')} value={v.vet_name} /><Field label={t('pgPassport.notes')} value={v.notes} />
                    </RecordCard>
                  ))}
              </>
            )}

            {/* ── HEALTH ── */}
            {activeTab === 'health' && (
              <>
                <button onClick={() => openModal('health', { date: new Date().toISOString().split('T')[0], record_type: 'examination' })} className="btn-primary text-sm flex items-center gap-2 mb-4"><Plus size={14} />{t('pgPassport.newExam')}</button>
                {(p.healthRecords || []).length === 0 ? <EmptyState label={t('pgPassport.addExam')} onAdd={() => openModal('health', {})} /> :
                  (p.healthRecords || []).map((h: any) => (
                    <RecordCard key={h.id} title={h.title} subtitle={`${h.record_type} · ${h.vet_name || ''} · ${h.clinic_name || ''}`} date={h.date} onDelete={() => health.remove.mutate(h.id)}>
                      <Field label={t('pgPassport.description')} value={h.description} /><Field label={t('pgPassport.cost')} value={h.cost ? `${h.cost}€` : null} /><Field label={t('pgPassport.nextAppointment')} value={h.next_appointment} />
                    </RecordCard>
                  ))}
              </>
            )}

            {/* ── MEDICATIONS ── */}
            {activeTab === 'meds' && (
              <>
                <button onClick={() => openModal('med', { start_date: new Date().toISOString().split('T')[0], is_active: true })} className="btn-primary text-sm flex items-center gap-2 mb-4"><Plus size={14} />{t('pgPassport.newMed')}</button>
                {(p.medications || []).length === 0 ? <EmptyState label={t('pgPassport.addMed')} onAdd={() => openModal('med', {})} /> :
                  (p.medications || []).map((m: any) => (
                    <RecordCard key={m.id} title={`${m.name} ${m.dosage}`} subtitle={`${m.frequency} · ${m.prescribed_by || ''}`}
                      date={`${m.start_date}${m.end_date ? ' → ' + m.end_date : ''}`}
                      badge={m.is_active ? t('pgPassport.activeBadge') : t('pgPassport.completed')} badgeColor={m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}
                      onDelete={() => meds.remove.mutate(m.id)}>
                      <Field label={t('pgPassport.activeIngredientShort')} value={m.active_ingredient} /><Field label={t('pgPassport.routeOfAdmin')} value={m.route} /><Field label={t('pgPassport.reason')} value={m.reason} /><Field label={t('pgPassport.sideEffects')} value={m.side_effects} />
                    </RecordCard>
                  ))}
              </>
            )}

            {/* ── LAB ── */}
            {activeTab === 'lab' && (
              <>
                <button onClick={() => openModal('lab', { date: new Date().toISOString().split('T')[0] })} className="btn-primary text-sm flex items-center gap-2 mb-4"><Plus size={14} />{t('pgPassport.newLab')}</button>
                {(p.labResults || []).length === 0 ? <EmptyState label={t('pgPassport.addResult')} onAdd={() => openModal('lab', {})} /> :
                  (p.labResults || []).map((l: any) => (
                    <RecordCard key={l.id} title={l.title} subtitle={`${l.result_type} · ${l.lab_name || ''} · ${l.vet_name || ''}`} date={l.date}
                      badge={l.is_abnormal ? t('pgPassport.abnormal') : t('pgPassport.normal')} badgeColor={l.is_abnormal ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}
                      onDelete={() => lab.remove.mutate(l.id)}>
                      <Field label={t('pgPassport.findings')} value={l.findings} /><Field label={t('pgPassport.laboratory')} value={l.lab_name} />
                      {l.file_urls?.length > 0 && <p className="font-medium">{t('pgPassport.files')}: {l.file_urls.map((u: string, i: number) => <a key={i} href={u} target="_blank" rel="noreferrer" className="text-blue-500 underline mr-2">{t('pgPassport.fileN', { n: i+1 })} <ExternalLink size={10} className="inline"/></a>)}</p>}
                    </RecordCard>
                  ))}
              </>
            )}

            {/* ── IMAGING ── */}
            {activeTab === 'imaging' && (
              <>
                <button onClick={() => openModal('imaging', { date: new Date().toISOString().split('T')[0] })} className="btn-primary text-sm flex items-center gap-2 mb-4"><Plus size={14} />{t('pgPassport.newImaging')}</button>
                {(p.imaging || []).length === 0 ? <EmptyState label={t('pgPassport.addImaging')} onAdd={() => openModal('imaging', {})} /> :
                  (p.imaging || []).map((img: any) => (
                    <RecordCard key={img.id} title={img.imaging_type.toUpperCase()} subtitle={`${img.body_region || ''} · ${img.vet_name || ''} · ${img.clinic_name || ''}`} date={img.date} onDelete={() => imaging.remove.mutate(img.id)}>
                      <Field label={t('pgPassport.findings')} value={img.findings} /><Field label={t('pgPassport.report')} value={img.report} />
                      {img.file_urls?.length > 0 && <p>{t('pgPassport.files')}: {img.file_urls.map((u: string, i: number) => <a key={i} href={u} target="_blank" rel="noreferrer" className="text-blue-500 underline mr-2">{t('pgPassport.imageN', { n: i+1 })}</a>)}</p>}
                    </RecordCard>
                  ))}
              </>
            )}

            {/* ── SURGERY ── */}
            {activeTab === 'surgery' && (
              <>
                <button onClick={() => openModal('surgery', { date: new Date().toISOString().split('T')[0] })} className="btn-primary text-sm flex items-center gap-2 mb-4"><Plus size={14} />{t('pgPassport.newSurgery')}</button>
                {(p.surgeries || []).length === 0 ? <EmptyState label={t('pgPassport.addSurgery')} onAdd={() => openModal('surgery', {})} /> :
                  (p.surgeries || []).map((s: any) => (
                    <RecordCard key={s.id} title={s.procedure} subtitle={`${s.surgeon_name || ''} · ${s.clinic_name || ''}`} date={s.date} onDelete={() => surgery.remove.mutate(s.id)}>
                      <Field label={t('pgPassport.category')} value={s.category} /><Field label={t('pgPassport.anesthesia')} value={s.anesthesia} /><Field label={t('pgPassport.duration')} value={s.duration_min ? t('pgPassport.minutes', { count: s.duration_min }) : null} />
                      <Field label={t('pgPassport.complications')} value={s.complications} /><Field label={t('pgPassport.outcome')} value={s.outcome} /><Field label={t('pgPassport.followUp')} value={s.follow_up} /><Field label={t('pgPassport.cost')} value={s.cost ? `${s.cost}€` : null} />
                    </RecordCard>
                  ))}
              </>
            )}

            {/* ── ALLERGIES ── */}
            {activeTab === 'allergies' && (
              <>
                <button onClick={() => openModal('allergy', {})} className="btn-primary text-sm flex items-center gap-2 mb-4"><Plus size={14} />{t('pgPassport.newAllergy')}</button>
                {(p.allergies || []).length === 0 ? <EmptyState label={t('pgPassport.addAllergy')} onAdd={() => openModal('allergy', {})} /> :
                  (p.allergies || []).map((a: any) => (
                    <RecordCard key={a.id} title={a.allergen} subtitle={`${a.allergen_type} · ${a.reaction || ''}`}
                      badge={a.severity} badgeColor={severityColor(a.severity)} onDelete={() => allergy.remove.mutate(a.id)}>
                      <Field label={t('pgPassport.reaction')} value={a.reaction} /><Field label={t('pgPassport.treatment')} value={a.treatment} /><Field label={t('pgPassport.diagnosedBy')} value={a.diagnosed_by} />
                    </RecordCard>
                  ))}
              </>
            )}

            {/* ── CHRONIC ── */}
            {activeTab === 'chronic' && (
              <>
                <button onClick={() => openModal('chronic', { status: 'active' })} className="btn-primary text-sm flex items-center gap-2 mb-4"><Plus size={14} />{t('pgPassport.newChronic')}</button>
                {(p.chronicConditions || []).length === 0 ? <EmptyState label={t('pgPassport.addCondition')} onAdd={() => openModal('chronic', {})} /> :
                  (p.chronicConditions || []).map((c: any) => (
                    <RecordCard key={c.id} title={c.condition} subtitle={`${c.diagnosed_by || ''} · ${c.clinic_name || ''}`} date={c.diagnosed_date}
                      badge={c.status === 'active' ? t('pgPassport.chronicStatus.active') : c.status === 'managed' ? t('pgPassport.chronicStatus.managed') : t('pgPassport.chronicStatus.resolved')}
                      badgeColor={c.status === 'active' ? 'bg-red-100 text-red-700' : c.status === 'managed' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}
                      onDelete={() => chronic.remove.mutate(c.id)}>
                      <Field label={t('pgPassport.icdCode')} value={c.icd_code} /><Field label={t('pgPassport.treatmentPlan')} value={c.treatment_plan} /><Field label={t('pgPassport.monitoring')} value={c.monitoring} />
                    </RecordCard>
                  ))}
              </>
            )}

            {/* ── DENTAL ── */}
            {activeTab === 'dental' && (
              <>
                <button onClick={() => openModal('dental', { date: new Date().toISOString().split('T')[0] })} className="btn-primary text-sm flex items-center gap-2 mb-4"><Plus size={14} />{t('pgPassport.newDental')}</button>
                {(p.dentalRecords || []).length === 0 ? <EmptyState label={t('pgPassport.addDental')} onAdd={() => openModal('dental', {})} /> :
                  (p.dentalRecords || []).map((d: any) => (
                    <RecordCard key={d.id} title={d.procedure} subtitle={`${d.vet_name || ''} · ${d.clinic_name || ''}`} date={d.date} onDelete={() => dental.remove.mutate(d.id)}>
                      <Field label={t('pgPassport.teeth')} value={d.teeth_treated} /><Field label={t('pgPassport.findings')} value={d.findings} /><Field label={t('pgPassport.stage')} value={d.grade} /><Field label={t('pgPassport.nextCleaning')} value={d.next_due} /><Field label={t('pgPassport.cost')} value={d.cost ? `${d.cost}€` : null} />
                    </RecordCard>
                  ))}
              </>
            )}

            {/* ── WEIGHT CHART ── */}
            {activeTab === 'weight' && (
              <>
                <button onClick={() => openModal('weight', { date: new Date().toISOString().split('T')[0] })} className="btn-primary text-sm flex items-center gap-2 mb-4"><Plus size={14} />{t('pgPassport.newMeasurement')}</button>
                {(p.weightRecords || []).length > 1 && (
                  <div className="card p-4 mb-4">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('pgPassport.weightChart')}</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={p.weightRecords.map((w: any) => ({ date: w.date.slice(5), kg: w.weight_kg }))}>
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                        <Tooltip formatter={(v: any) => [`${v} kg`, t('pgPassport.weight')]} />
                        <Line type="monotone" dataKey="kg" stroke="#E65100" strokeWidth={2} dot={{ r: 4, fill: '#E65100' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {(p.weightRecords || []).length === 0 ? <EmptyState label={t('pgPassport.addMeasurement')} onAdd={() => openModal('weight', {})} /> :
                  (p.weightRecords || []).slice().reverse().map((w: any) => (
                    <RecordCard key={w.id} title={`${w.weight_kg} kg`} subtitle={`BCS: ${w.bcs || '-'}/9 · ${w.vet_name || ''}`} date={w.date} onDelete={() => weight.remove.mutate(w.id)}>
                      <Field label={t('pgPassport.notes')} value={w.notes} />
                    </RecordCard>
                  ))}
              </>
            )}

            {/* ── GENETIC ── */}
            {activeTab === 'genetic' && (
              <>
                <button onClick={() => openModal('genetic', { date: new Date().toISOString().split('T')[0] })} className="btn-primary text-sm flex items-center gap-2 mb-4"><Plus size={14} />{t('pgPassport.newGenetic')}</button>
                {(p.geneticTests || []).length === 0 ? <EmptyState label={t('pgPassport.addGenetic')} onAdd={() => openModal('genetic', {})} /> :
                  (p.geneticTests || []).map((g: any) => (
                    <RecordCard key={g.id} title={g.test_name} subtitle={g.provider} date={g.date} onDelete={() => genetic.remove.mutate(g.id)}>
                      <Field label={t('pgPassport.results')} value={g.results} />
                      {g.breeds_detected?.length > 0 && <p><span className="font-medium">{t('pgPassport.breeds')}:</span> {g.breeds_detected.join(', ')}</p>}
                      {g.conditions_found?.length > 0 && <p><span className="font-medium">{t('pgPassport.conditions')}:</span> {g.conditions_found.join(', ')}</p>}
                    </RecordCard>
                  ))}
              </>
            )}

            {/* ── VITALS ── */}
            {activeTab === 'vitals' && (
              <>
                <button onClick={() => openModal('vitals', { date: new Date().toISOString().split('T')[0] })} className="btn-primary text-sm flex items-center gap-2 mb-4"><Plus size={14} />{t('pgPassport.newVitals')}</button>
                {(p.vitalSigns || []).length === 0 ? <EmptyState label={t('pgPassport.addVitals')} onAdd={() => openModal('vitals', {})} /> :
                  (p.vitalSigns || []).map((v: any) => (
                    <RecordCard key={v.id} title={`${v.temperature_c ? v.temperature_c + '°C' : ''} ${v.heart_rate ? v.heart_rate + ' bpm' : ''} ${v.weight_kg ? v.weight_kg + ' kg' : ''}`.trim()} subtitle={v.vet_name} date={v.date} onDelete={() => vitals.remove.mutate(v.id)}>
                      <Field label={t('pgPassport.temperature')} value={v.temperature_c ? `${v.temperature_c}°C` : null} />
                      <Field label={t('pgPassport.heartRate')} value={v.heart_rate ? `${v.heart_rate} bpm` : null} />
                      <Field label={t('pgPassport.respRate')} value={v.respiratory_rate ? `${v.respiratory_rate} /min` : null} />
                      <Field label={t('pgPassport.bloodPressure')} value={v.blood_pressure} /><Field label={t('pgPassport.crt')} value={v.capillary_refill} />
                    </RecordCard>
                  ))}
              </>
            )}

            {/* ── PEDIGREE ── */}
            {activeTab === 'pedigree' && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 dark:text-white">{t('pgPassport.pedigreeTitle')}</h3>
                  <button onClick={() => openModal('pedigree', p.pedigree || {})} className="btn-secondary text-xs flex items-center gap-1.5"><Edit2 size={13} />{t('common.edit')}</button>
                </div>
                {p.pedigree ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {[[t('pgPassport.regNumber'), p.pedigree.registration_number], [t('pgPassport.kennelClub'), p.pedigree.kennel_club],
                      [t('pgPassport.father'), p.pedigree.father_name], [t('pgPassport.mother'), p.pedigree.mother_name],
                      [t('pgPassport.breeder'), p.pedigree.breeder_name], [t('pgPassport.contact'), p.pedigree.breeder_contact]
                    ].filter(([, v]) => v).map(([l, v]) => (
                      <div key={l}><p className="text-xs text-gray-400">{l}</p><p className="font-medium">{v as string}</p></div>
                    ))}
                  </div>
                ) : <EmptyState label={t('pgPassport.addPedigree')} onAdd={() => openModal('pedigree', {})} />}
              </div>
            )}

            {/* ── TRAVEL / PASSPORT ── */}
            {activeTab === 'travel' && (
              <>
                {/* Info banner */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  <div className="card p-4 border-l-4 border-blue-500">
                    <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-2">{t('pgPassport.domesticTravel')}</p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <li>✅ {t('pgPassport.microchipIso')}</li>
                      <li>✅ {t('pgPassport.rabiesValid')}</li>
                      <li>✅ {t('pgPassport.healthBooklet')}</li>
                      <li>✅ {t('pgPassport.vetCertificate')}</li>
                    </ul>
                  </div>
                  <div className="card p-4 border-l-4 border-orange-500">
                    <p className="text-xs font-bold text-orange-700 dark:text-orange-400 mb-2">{t('pgPassport.intlTravel')}</p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <li>✅ {t('pgPassport.euPetPassport')}</li>
                      <li>✅ {t('pgPassport.microchipBeforeVaccine')}</li>
                      <li>✅ {t('pgPassport.rabies21')}</li>
                      <li>✅ {t('pgPassport.antibodyTitre')}</li>
                      <li>✅ {t('pgPassport.echinococcus')}</li>
                    </ul>
                  </div>
                </div>

                {/* Passport checklist status */}
                {passport && (
                  <div className="card p-4 mb-4 bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3">{t('pgPassport.docStatus')}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { label: t('pgPassport.microchip'), ok: !!(pet as any)?.microchip },
                        { label: t('pgPassport.rabiesVaccine'), ok: (passport.vaccinations || []).some((v: any) => v.vaccine_type === 'rabies' && (!v.next_due_date || new Date(v.next_due_date) > new Date())) },
                        { label: t('pgPassport.snapTest'), ok: (passport.healthRecords || []).length > 0 },
                        { label: t('pgPassport.travelDocs'), ok: (passport.travelDocs || []).length > 0 },
                      ].map(({ label, ok }) => (
                        <div key={label} className={cn('flex items-center gap-2 p-2 rounded-lg', ok ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20')}>
                          <span>{ok ? '✅' : '❌'}</span>
                          <span className={ok ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={() => openModal('travel', {})} className="btn-primary text-sm flex items-center gap-2 mb-4"><Plus size={14} />{t('pgPassport.newTravelDoc')}</button>
                {(p.travelDocs || []).length === 0 ? <EmptyState label={t('pgPassport.addTravel')} onAdd={() => openModal('travel', {})} /> :
                  (p.travelDocs || []).map((t: any) => (
                    <RecordCard key={t.id} title={`${t.origin_city || ''} → ${t.destination_city}`} subtitle={`${t.travel_type} · ${t.carrier || ''}`} date={t.departure_date} onDelete={() => travel.remove.mutate(t.id)}>
                      <Field label={t('pgPassport.country')} value={t.destination_country} /><Field label={t('pgPassport.returnLabel')} value={t.return_date} /><Field label={t('pgPassport.code')} value={t.booking_ref} />
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
                    <p className="text-xs text-blue-700 dark:text-blue-300">{t('pgPassport.accessInfo')}</p>
                  </div>
                </div>
                <button onClick={() => openModal('access', {})} className="btn-primary text-sm flex items-center gap-2 mb-4"><Plus size={14} />{t('pgPassport.grantAccess')}</button>
                {(p.accessList || []).length === 0 ? (
                  <div className="text-center py-12 text-gray-400">{t('pgPassport.noVetAccess')}</div>
                ) : (p.accessList || []).map((a: any) => (
                  <RecordCard key={a.id} title={a.provider_name} subtitle={a.provider_email}
                    badge={a.status === 'approved' ? t('pgPassport.approved') : t('pgPassport.revoked')}
                    badgeColor={a.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}
                    onDelete={a.status === 'approved' ? () => revokeAccess.mutate(a.id) : undefined}>
                    <Field label={t('pgPassport.reason')} value={a.reason} /><Field label={t('pgPassport.grantedOn')} value={a.granted_at ? new Date(a.granted_at).toLocaleDateString(i18n.language) : null} /><Field label={t('pgPassport.expiry')} value={a.expires_at ? new Date(a.expires_at).toLocaleDateString(i18n.language) : t('pgPassport.noExpiry')} />
                  </RecordCard>
                ))}
              </>
            )}
          </>
        )}

        {isLoading && <div className="text-center py-16 text-gray-400">{t('pgPassport.loadingRecord')}</div>}
      </div>

      {/* ─── MODALS ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {modal === 'vaccine' && (
          <Modal title={t('pgPassport.newVaccine')} onClose={() => setModal(null)} onSave={() => vac.create.mutate(form)} saving={vac.create.isPending}>
            <F label={t('pgPassport.vaccineReq')} name="vaccine_name" form={form} setForm={setForm} />
            <F label={t('pgPassport.type')} name="vaccine_type" form={form} setForm={setForm} options={[{value:'',label:'—'},{value:'core',label:t('pgPassport.vacType.core')},{value:'non_core',label:t('pgPassport.vacType.nonCore')},{value:'rabies',label:t('pgPassport.vacType.rabies')},{value:'other',label:t('pgPassport.other')}]} />
            <F label={t('pgPassport.dateAdministeredReq')} name="date_administered" form={form} setForm={setForm} type="date" />
            <F label={t('pgPassport.nextDose')} name="next_due_date" form={form} setForm={setForm} type="date" />
            <F label={t('pgPassport.vet')} name="vet_name" form={form} setForm={setForm} />
            <F label={t('pgPassport.notes')} name="notes" form={form} setForm={setForm} type="textarea" />
          </Modal>
        )}

        {modal === 'health' && (
          <Modal title={t('pgPassport.newExam')} onClose={() => setModal(null)} onSave={() => health.create.mutate(form)} saving={health.create.isPending}>
            <F label={t('pgPassport.titleReq')} name="title" form={form} setForm={setForm} />
            <F label={t('pgPassport.type')} name="record_type" form={form} setForm={setForm} options={[{value:'examination',label:t('pgPassport.recordType.examination')},{value:'diagnosis',label:t('pgPassport.recordType.diagnosis')},{value:'follow_up',label:t('pgPassport.recordType.followUp')},{value:'specialist',label:t('pgPassport.recordType.specialist')},{value:'emergency',label:t('pgPassport.recordType.emergency')},{value:'other',label:t('pgPassport.other')}]} />
            <F label={t('pgPassport.dateReq')} name="date" form={form} setForm={setForm} type="date" />
            <F label={t('pgPassport.vet')} name="vet_name" form={form} setForm={setForm} />
            <F label={t('pgPassport.clinic')} name="clinic_name" form={form} setForm={setForm} />
            <F label={t('pgPassport.description')} name="description" form={form} setForm={setForm} type="textarea" />
            <F label={t('pgPassport.costEur')} name="cost" form={form} setForm={setForm} type="number" />
            <F label={t('pgPassport.nextAppointment')} name="next_appointment" form={form} setForm={setForm} type="date" />
          </Modal>
        )}

        {modal === 'med' && (
          <Modal title={t('pgPassport.newMed')} onClose={() => setModal(null)} onSave={() => meds.create.mutate(form)} saving={meds.create.isPending}>
            <F label={t('pgPassport.medNameReq')} name="name" form={form} setForm={setForm} />
            <F label={t('pgPassport.activeIngredient')} name="active_ingredient" form={form} setForm={setForm} />
            <F label={t('pgPassport.dosageReq')} name="dosage" form={form} setForm={setForm} />
            <F label={t('pgPassport.frequencyReq')} name="frequency" form={form} setForm={setForm} options={['onceDaily','twiceDaily','threeDaily','weekly','monthly','asNeeded'].map(k => ({ value: t(`pgPassport.freq.${k}`, { lng: 'el' }), label: t(`pgPassport.freq.${k}`) }))} />
            <F label={t('pgPassport.routeOfAdminCap')} name="route" form={form} setForm={setForm} options={[{value:'',label:'—'},{value:'oral',label:t('pgPassport.route.oral')},{value:'injection',label:t('pgPassport.route.injection')},{value:'topical',label:t('pgPassport.route.topical')},{value:'eye_drops',label:t('pgPassport.route.eyeDrops')},{value:'ear_drops',label:t('pgPassport.route.earDrops')}]} />
            <F label={t('pgPassport.startDateReq')} name="start_date" form={form} setForm={setForm} type="date" />
            <F label={t('pgPassport.endDate')} name="end_date" form={form} setForm={setForm} type="date" />
            <F label={t('pgPassport.prescribedBy')} name="prescribed_by" form={form} setForm={setForm} />
            <F label={t('pgPassport.reasonForAdmin')} name="reason" form={form} setForm={setForm} />
            <F label={t('pgPassport.possibleSideEffects')} name="side_effects" form={form} setForm={setForm} type="textarea" />
          </Modal>
        )}

        {modal === 'lab' && (
          <Modal title={t('pgPassport.newLabTitle')} onClose={() => setModal(null)} onSave={() => lab.create.mutate(form)} saving={lab.create.isPending}>
            <F label={t('pgPassport.titleReq')} name="title" form={form} setForm={setForm} />
            <F label={t('pgPassport.testType')} name="result_type" form={form} setForm={setForm} options={[{value:'blood_count',label:t('pgPassport.labType.bloodCount')},{value:'biochemistry',label:t('pgPassport.labType.biochemistry')},{value:'urine',label:t('pgPassport.labType.urine')},{value:'fecal',label:t('pgPassport.labType.fecal')},{value:'biopsy',label:t('pgPassport.labType.biopsy')},{value:'culture',label:t('pgPassport.labType.culture')},{value:'hormone',label:t('pgPassport.labType.hormone')},{value:'serology',label:t('pgPassport.labType.serology')},{value:'other',label:t('pgPassport.other')}]} />
            <F label={t('pgPassport.dateReq')} name="date" form={form} setForm={setForm} type="date" />
            <F label={t('pgPassport.laboratory')} name="lab_name" form={form} setForm={setForm} />
            <F label={t('pgPassport.vet')} name="vet_name" form={form} setForm={setForm} />
            <F label={t('pgPassport.clinic')} name="clinic_name" form={form} setForm={setForm} />
            <F label={t('pgPassport.findings')} name="findings" form={form} setForm={setForm} type="textarea" />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="abnormal" checked={form.is_abnormal || false} onChange={e => setForm((f: any) => ({ ...f, is_abnormal: e.target.checked }))} />
              <label htmlFor="abnormal" className="text-sm text-gray-700 dark:text-gray-300">{t('pgPassport.abnormalResults')}</label>
            </div>
          </Modal>
        )}

        {modal === 'imaging' && (
          <Modal title={t('pgPassport.newImagingTitle')} onClose={() => setModal(null)} onSave={() => imaging.create.mutate(form)} saving={imaging.create.isPending}>
            <F label={t('pgPassport.typeReq')} name="imaging_type" form={form} setForm={setForm} options={[{value:'xray',label:t('pgPassport.imgType.xray')},{value:'ultrasound',label:t('pgPassport.imgType.ultrasound')},{value:'ct',label:t('pgPassport.imgType.ct')},{value:'mri',label:t('pgPassport.imgType.mri')},{value:'endoscopy',label:t('pgPassport.imgType.endoscopy')},{value:'echocardiogram',label:t('pgPassport.imgType.echocardiogram')},{value:'other',label:t('pgPassport.other')}]} />
            <F label={t('pgPassport.bodyRegion')} name="body_region" form={form} setForm={setForm} />
            <F label={t('pgPassport.dateReq')} name="date" form={form} setForm={setForm} type="date" />
            <F label={t('pgPassport.vet')} name="vet_name" form={form} setForm={setForm} />
            <F label={t('pgPassport.clinic')} name="clinic_name" form={form} setForm={setForm} />
            <F label={t('pgPassport.findings')} name="findings" form={form} setForm={setForm} type="textarea" />
            <F label={t('pgPassport.report')} name="report" form={form} setForm={setForm} type="textarea" />
          </Modal>
        )}

        {modal === 'surgery' && (
          <Modal title={t('pgPassport.newSurgeryTitle')} onClose={() => setModal(null)} onSave={() => surgery.create.mutate(form)} saving={surgery.create.isPending}>
            <F label={t('pgPassport.procedureReq')} name="procedure" form={form} setForm={setForm} />
            <F label={t('pgPassport.category')} name="category" form={form} setForm={setForm} options={[{value:'',label:'—'},{value:'orthopedic',label:t('pgPassport.surgCat.orthopedic')},{value:'soft_tissue',label:t('pgPassport.surgCat.softTissue')},{value:'dental',label:t('pgPassport.surgCat.dental')},{value:'ophthalmic',label:t('pgPassport.surgCat.ophthalmic')},{value:'neurological',label:t('pgPassport.surgCat.neurological')},{value:'reproductive',label:t('pgPassport.surgCat.reproductive')},{value:'other',label:t('pgPassport.otherF')}]} />
            <F label={t('pgPassport.dateReq')} name="date" form={form} setForm={setForm} type="date" />
            <F label={t('pgPassport.surgeon')} name="surgeon_name" form={form} setForm={setForm} />
            <F label={t('pgPassport.clinic')} name="clinic_name" form={form} setForm={setForm} />
            <F label={t('pgPassport.anesthesia')} name="anesthesia" form={form} setForm={setForm} options={[{value:'',label:'—'},{value:'general',label:t('pgPassport.anesth.general')},{value:'local',label:t('pgPassport.anesth.local')},{value:'sedation',label:t('pgPassport.anesth.sedation')}]} />
            <F label={t('pgPassport.durationMin')} name="duration_min" form={form} setForm={setForm} type="number" />
            <F label={t('pgPassport.complications')} name="complications" form={form} setForm={setForm} type="textarea" />
            <F label={t('pgPassport.outcome')} name="outcome" form={form} setForm={setForm} />
            <F label={t('pgPassport.followUp')} name="follow_up" form={form} setForm={setForm} />
            <F label={t('pgPassport.costEur')} name="cost" form={form} setForm={setForm} type="number" />
          </Modal>
        )}

        {modal === 'allergy' && (
          <Modal title={t('pgPassport.newAllergy')} onClose={() => setModal(null)} onSave={() => allergy.create.mutate(form)} saving={allergy.create.isPending}>
            <F label={t('pgPassport.allergenReq')} name="allergen" form={form} setForm={setForm} />
            <F label={t('pgPassport.type')} name="allergen_type" form={form} setForm={setForm} options={[{value:'food',label:t('pgPassport.allergenType.food')},{value:'medication',label:t('pgPassport.allergenType.medication')},{value:'environmental',label:t('pgPassport.allergenType.environmental')},{value:'insect',label:t('pgPassport.allergenType.insect')},{value:'contact',label:t('pgPassport.allergenType.contact')},{value:'other',label:t('pgPassport.other')}]} />
            <F label={t('pgPassport.reaction')} name="reaction" form={form} setForm={setForm} type="textarea" />
            <F label={t('pgPassport.severity')} name="severity" form={form} setForm={setForm} options={[{value:'mild',label:t('pgPassport.severityOpt.mild')},{value:'moderate',label:t('pgPassport.severityOpt.moderate')},{value:'severe',label:t('pgPassport.severityOpt.severe')},{value:'anaphylactic',label:t('pgPassport.severityOpt.anaphylactic')}]} />
            <F label={t('pgPassport.treatment')} name="treatment" form={form} setForm={setForm} />
            <F label={t('pgPassport.diagnosedBy')} name="diagnosed_by" form={form} setForm={setForm} />
            <F label={t('pgPassport.diagnosisDate')} name="diagnosed_date" form={form} setForm={setForm} type="date" />
          </Modal>
        )}

        {modal === 'chronic' && (
          <Modal title={t('pgPassport.newChronic')} onClose={() => setModal(null)} onSave={() => chronic.create.mutate(form)} saving={chronic.create.isPending}>
            <F label={t('pgPassport.conditionReq')} name="condition" form={form} setForm={setForm} />
            <F label={t('pgPassport.icdCode')} name="icd_code" form={form} setForm={setForm} />
            <F label={t('pgPassport.status')} name="status" form={form} setForm={setForm} options={[{value:'active',label:t('pgPassport.chronicStatus.active')},{value:'managed',label:t('pgPassport.chronicStatus.managed')},{value:'resolved',label:t('pgPassport.chronicStatus.resolved')}]} />
            <F label={t('pgPassport.diagnosisDate')} name="diagnosed_date" form={form} setForm={setForm} type="date" />
            <F label={t('pgPassport.diagnosedBy')} name="diagnosed_by" form={form} setForm={setForm} />
            <F label={t('pgPassport.clinic')} name="clinic_name" form={form} setForm={setForm} />
            <F label={t('pgPassport.treatmentPlanCap')} name="treatment_plan" form={form} setForm={setForm} type="textarea" />
            <F label={t('pgPassport.monitoring')} name="monitoring" form={form} setForm={setForm} />
          </Modal>
        )}

        {modal === 'dental' && (
          <Modal title={t('pgPassport.newDental')} onClose={() => setModal(null)} onSave={() => dental.create.mutate(form)} saving={dental.create.isPending}>
            <F label={t('pgPassport.procedureActReq')} name="procedure" form={form} setForm={setForm} options={[{value:'cleaning',label:t('pgPassport.dentalProc.cleaning')},{value:'extraction',label:t('pgPassport.dentalProc.extraction')},{value:'xray',label:t('pgPassport.dentalProc.xray')},{value:'root_canal',label:t('pgPassport.dentalProc.rootCanal')},{value:'other',label:t('pgPassport.other')}]} />
            <F label={t('pgPassport.dateReq')} name="date" form={form} setForm={setForm} type="date" />
            <F label={t('pgPassport.vet')} name="vet_name" form={form} setForm={setForm} />
            <F label={t('pgPassport.clinic')} name="clinic_name" form={form} setForm={setForm} />
            <F label={t('pgPassport.teethArea')} name="teeth_treated" form={form} setForm={setForm} />
            <F label={t('pgPassport.findings')} name="findings" form={form} setForm={setForm} type="textarea" />
            <F label={t('pgPassport.diseaseStage')} name="grade" form={form} setForm={setForm} options={[{value:'',label:'—'},{value:'Stage 1',label:t('pgPassport.stageN', { n: 1 })},{value:'Stage 2',label:t('pgPassport.stageN', { n: 2 })},{value:'Stage 3',label:t('pgPassport.stageN', { n: 3 })},{value:'Stage 4',label:t('pgPassport.stageN', { n: 4 })}]} />
            <F label={t('pgPassport.nextCleaningCap')} name="next_due" form={form} setForm={setForm} type="date" />
            <F label={t('pgPassport.costEur')} name="cost" form={form} setForm={setForm} type="number" />
          </Modal>
        )}

        {modal === 'weight' && (
          <Modal title={t('pgPassport.newWeightTitle')} onClose={() => setModal(null)} onSave={() => weight.create.mutate(form)} saving={weight.create.isPending}>
            <F label={t('pgPassport.weightKgReq')} name="weight_kg" form={form} setForm={setForm} type="number" />
            <F label="BCS (1-9)" name="bcs" form={form} setForm={setForm} options={[{value:'',label:'—'},...[1,2,3,4,5,6,7,8,9].map(n => ({value:String(n),label:`${n} — ${[t('pgPassport.bcs.emaciated'),t('pgPassport.bcs.thin'),t('pgPassport.bcs.slightlyThin'),t('pgPassport.bcs.ideal'),t('pgPassport.bcs.ideal'),t('pgPassport.bcs.slightlyOverweight'),t('pgPassport.bcs.overweight'),t('pgPassport.bcs.obese'),t('pgPassport.bcs.severelyObese')][n-1]}`}))]} />
            <F label={t('pgPassport.dateReq')} name="date" form={form} setForm={setForm} type="date" />
            <F label={t('pgPassport.vet')} name="vet_name" form={form} setForm={setForm} />
            <F label={t('pgPassport.notes')} name="notes" form={form} setForm={setForm} />
          </Modal>
        )}

        {modal === 'genetic' && (
          <Modal title={t('pgPassport.newGenetic')} onClose={() => setModal(null)} onSave={() => genetic.create.mutate(form)} saving={genetic.create.isPending}>
            <F label={t('pgPassport.testReq')} name="test_name" form={form} setForm={setForm} />
            <F label={t('pgPassport.provider')} name="provider" form={form} setForm={setForm} options={[{value:'',label:'—'},{value:'Embark',label:'Embark'},{value:'Wisdom Panel',label:'Wisdom Panel'},{value:'DNAmy',label:'DNAmy'},{value:'other',label:t('pgPassport.otherM')}]} />
            <F label={t('pgPassport.dateReq')} name="date" form={form} setForm={setForm} type="date" />
            <F label={t('pgPassport.results')} name="results" form={form} setForm={setForm} type="textarea" />
          </Modal>
        )}

        {modal === 'vitals' && (
          <Modal title={t('pgPassport.newVitalsTitle')} onClose={() => setModal(null)} onSave={() => vitals.create.mutate(form)} saving={vitals.create.isPending}>
            <F label={t('pgPassport.dateReq')} name="date" form={form} setForm={setForm} type="date" />
            <F label={t('pgPassport.temperatureC')} name="temperature_c" form={form} setForm={setForm} type="number" />
            <F label={t('pgPassport.heartRateBpm')} name="heart_rate" form={form} setForm={setForm} type="number" />
            <F label={t('pgPassport.respRateMin')} name="respiratory_rate" form={form} setForm={setForm} type="number" />
            <F label={t('pgPassport.weightKg')} name="weight_kg" form={form} setForm={setForm} type="number" />
            <F label={t('pgPassport.bloodPressureCap')} name="blood_pressure" form={form} setForm={setForm} />
            <F label={t('pgPassport.crtCap')} name="capillary_refill" form={form} setForm={setForm} options={[{value:'',label:'—'},{value:'<2sec',label:t('pgPassport.crtOpt.normal')},{value:'2-3sec',label:t('pgPassport.crtOpt.prolonged')},{value:'>3sec',label:t('pgPassport.crtOpt.critical')}]} />
            <F label={t('pgPassport.vet')} name="vet_name" form={form} setForm={setForm} />
            <F label={t('pgPassport.notes')} name="notes" form={form} setForm={setForm} />
          </Modal>
        )}

        {modal === 'pedigree' && (
          <Modal title={t('pgPassport.pedigreeTitle')} onClose={() => setModal(null)}
            onSave={() => api.put(`/passport/pedigree/${activePetId}`, { ...form, certifications: form.certifications ? String(form.certifications).split(',').map((s: string) => s.trim()) : [] }).then(() => { inv(); setModal(null); toast.success(t('pgPassport.savedToast')) })}
            saving={false}>
            <F label={t('pgPassport.regNumber')} name="registration_number" form={form} setForm={setForm} />
            <F label={t('pgPassport.kennelClub')} name="kennel_club" form={form} setForm={setForm} />
            <F label={t('pgPassport.fatherName')} name="father_name" form={form} setForm={setForm} />
            <F label={t('pgPassport.motherName')} name="mother_name" form={form} setForm={setForm} />
            <F label={t('pgPassport.breeder')} name="breeder_name" form={form} setForm={setForm} />
            <F label={t('pgPassport.breederContact')} name="breeder_contact" form={form} setForm={setForm} />
            <F label={t('pgPassport.certifications')} name="certifications" form={form} setForm={setForm} />
            <F label={t('pgPassport.notes')} name="notes" form={form} setForm={setForm} type="textarea" />
          </Modal>
        )}

        {modal === 'travel' && (
          <Modal title={t('pgPassport.newTrip')} onClose={() => setModal(null)} onSave={() => travel.create.mutate(form)} saving={travel.create.isPending}>
            <F label={t('pgPassport.typeReq')} name="travel_type" form={form} setForm={setForm} options={[{value:'flight',label:t('pgPassport.travelType.flight')},{value:'ferry',label:t('pgPassport.travelType.ferry')},{value:'train',label:t('pgPassport.travelType.train')},{value:'road',label:t('pgPassport.travelType.road')},{value:'international',label:t('pgPassport.travelType.international')}]} />
            <F label={t('pgPassport.origin')} name="origin_city" form={form} setForm={setForm} />
            <F label={t('pgPassport.destinationReq')} name="destination_city" form={form} setForm={setForm} />
            <F label={t('pgPassport.destCountry')} name="destination_country" form={form} setForm={setForm} />
            <F label={t('pgPassport.departureReq')} name="departure_date" form={form} setForm={setForm} type="date" />
            <F label={t('pgPassport.returnDate')} name="return_date" form={form} setForm={setForm} type="date" />
            <F label={t('pgPassport.carrier')} name="carrier" form={form} setForm={setForm} />
            <F label={t('pgPassport.bookingRef')} name="booking_ref" form={form} setForm={setForm} />
          </Modal>
        )}

        {modal === 'access' && (
          <Modal title={t('pgPassport.grantAccessTitle')} onClose={() => setModal(null)} onSave={() => addAccess.mutate(form)} saving={addAccess.isPending}>
            <F label={t('pgPassport.vetEmailReq')} name="provider_email" form={form} setForm={setForm} type="email" />
            <F label={t('pgPassport.vetName')} name="provider_name" form={form} setForm={setForm} />
            <F label={t('pgPassport.reasonComment')} name="reason" form={form} setForm={setForm} />
            <F label={t('pgPassport.accessExpiry')} name="expires_at" form={form} setForm={setForm} type="date" />
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}