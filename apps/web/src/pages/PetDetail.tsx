import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Syringe, Stethoscope, MapPin, Pill, AlertTriangle,
  Activity, Weight, ChevronRight, Battery, Clock, ShieldAlert,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

/**
 * One pet, everything about it.
 *
 * The data already existed — /passport/:petId returns the full medical file
 * and /tracker returns the position history — but nothing rendered it. This
 * page was a placeholder reading "σελίδα σε ανάπτυξη", so a pet's vaccination
 * schedule and GPS trail had no home in the interface.
 */

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰',
  fish: '🐟', reptile: '🦎', horse: '🐴', other: '🐾',
}
const emojiFor = (s?: string) => SPECIES_EMOJI[String(s).toLowerCase()] ?? '🐾'

/** Dates are stored as plain strings ("2026-09-04"), not timestamps. */
function fmtDate(value?: string | null, locale = 'el-GR') {
  if (!value) return '—'
  const d = new Date(value)
  return isNaN(d.getTime()) ? value : d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
}

/** A vaccination is due when its next date has passed. */
function isOverdue(nextDue?: string | null) {
  if (!nextDue) return false
  const d = new Date(nextDue)
  return !isNaN(d.getTime()) && d < new Date()
}

function Empty({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="text-center py-10">
      <Icon size={32} className="mx-auto text-gray-300 mb-2" />
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  )
}

function Row({ title, subtitle, right, tone }: { title: string; subtitle?: string; right?: string; tone?: 'warn' | 'danger' }) {
  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="min-w-0">
        <p className={cn('text-sm font-medium',
          tone === 'danger' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : 'text-gray-900 dark:text-white')}>
          {title}
        </p>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {right && <span className="text-xs text-gray-500 shrink-0 whitespace-nowrap">{right}</span>}
    </div>
  )
}

export default function PetDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const [tab, setTab] = useState<'overview' | 'medical' | 'vaccines' | 'location'>('overview')

  const localeMap: Record<string, string> = { el: 'el-GR', en: 'en-US', es: 'es-ES', fr: 'fr-FR', zh: 'zh-CN' }
  const locale = localeMap[i18n.language] || 'el-GR'
  const d = (v?: string | null) => fmtDate(v, locale)

  const { data: passport, isLoading, isError } = useQuery({
    queryKey: ['pet-passport', id],
    queryFn: () => api.get(`/passport/${id}`).then(r => r.data),
    enabled: !!id,
  })

  // Position history for this pet, newest first.
  const { data: locations = [] } = useQuery({
    queryKey: ['pet-locations', id],
    queryFn: () => api.get(`/tracker?pet_id=${id}&limit=25`).then(r => r.data?.data ?? []),
    enabled: !!id && tab === 'location',
  })

  // The collar registered to this pet, if any.
  const { data: devices = [] } = useQuery({
    queryKey: ['tracker-devices'],
    queryFn: () => api.get('/tracker/devices').then(r => r.data?.data ?? []),
    enabled: !!id && tab === 'location',
  })

  if (isLoading) return (
    <div className="page-container py-24 flex justify-center"><LoadingSpinner /></div>
  )

  if (isError || !passport?.pet) return (
    <div className="page-container py-16 text-center">
      <p className="text-4xl mb-3">🐾</p>
      <p className="font-semibold text-gray-900 dark:text-white mb-2">
        {t('petDetail.notFound', 'Το κατοικίδιο δεν βρέθηκε')}
      </p>
      <button onClick={() => navigate('/my-pets')} className="btn-primary mt-2">
        {t('petDetail.backToPets', 'Τα κατοικίδιά μου')}
      </button>
    </div>
  )

  const {
    pet, vaccinations = [], healthRecords = [], medications = [],
    allergies = [], chronicConditions = [], weightRecords = [],
  } = passport

  const device = devices.find((dev: any) => dev.pet_id === pet.id)
  const latest = locations[0]
  const activeMeds = medications.filter((m: any) => m.is_active)
  const overdueVaccines = vaccinations.filter((v: any) => isOverdue(v.next_due_date))
  const latestWeight = weightRecords.length ? weightRecords[weightRecords.length - 1] : null

  const tabs = [
    { id: 'overview',  label: t('petDetail.tabs.overview', 'Επισκόπηση') },
    { id: 'medical',   label: t('petDetail.tabs.medical', 'Ιατρικά') },
    { id: 'vaccines',  label: t('petDetail.tabs.vaccines', 'Εμβόλια') },
    { id: 'location',  label: t('petDetail.tabs.location', 'Τοποθεσία') },
  ] as const

  return (
    <div className="page-container py-6 pb-24 lg:pb-8 max-w-3xl mx-auto">
      <button onClick={() => navigate('/my-pets')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-900 mb-4">
        <ArrowLeft size={15} /> {t('petDetail.backToPets', 'Τα κατοικίδιά μου')}
      </button>

      {/* Header */}
      <div className="card overflow-hidden mb-5">
        <div className="h-28 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-gray-800 dark:to-gray-700 relative">
          {pet.is_lost && (
            <div className="absolute top-3 left-3 bg-red-600 text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-medium">
              <AlertTriangle size={11} /> {t('petsExtra.lostBadge', 'Χαμένο')}
            </div>
          )}
        </div>
        <div className="px-5 pb-5 -mt-10">
          <div className="w-20 h-20 rounded-2xl bg-white dark:bg-gray-900 border-4 border-white dark:border-gray-900 overflow-hidden flex items-center justify-center shadow-sm">
            {pet.image_url
              ? <img src={pet.image_url} alt={pet.name} className="w-full h-full object-cover" />
              : <span className="text-4xl">{emojiFor(pet.species)}</span>}
          </div>
          <h1 className="text-xl font-display font-bold text-gray-900 dark:text-white mt-3">{pet.name}</h1>
          <p className="text-sm text-gray-500">
            {[pet.breed || pet.species, pet.age && `${pet.age} ${t('pets.years', 'ετών')}`, pet.color]
              .filter(Boolean).join(' · ')}
          </p>

          {/* Anything needing attention, surfaced before the tabs. */}
          {(overdueVaccines.length > 0 || allergies.length > 0) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {overdueVaccines.length > 0 && (
                <button onClick={() => setTab('vaccines')}
                  className="flex items-center gap-1.5 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full">
                  <Syringe size={11} />
                  {t('petDetail.vaccinesDue', { count: overdueVaccines.length, defaultValue: `${overdueVaccines.length} εμβόλια εκκρεμούν` })}
                </button>
              )}
              {allergies.length > 0 && (
                <button onClick={() => setTab('medical')}
                  className="flex items-center gap-1.5 text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-2.5 py-1 rounded-full">
                  <ShieldAlert size={11} />
                  {t('petDetail.allergiesCount', { count: allergies.length, defaultValue: `${allergies.length} αλλεργίες` })}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        {tabs.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            className={cn('flex-1 text-xs font-medium py-2 rounded-lg transition-all',
              tab === tb.id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500')}>
            {tb.label}
          </button>
        ))}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>

        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Weight,      label: t('petDetail.weight', 'Βάρος'),   value: latestWeight ? `${latestWeight.weight_kg} kg` : pet.weight ? `${pet.weight} kg` : '—' },
                { icon: Syringe,     label: t('petDetail.vaccines', 'Εμβόλια'), value: String(vaccinations.length) },
                { icon: Pill,        label: t('petDetail.meds', 'Φάρμακα'),   value: String(activeMeds.length) },
                { icon: Stethoscope, label: t('petDetail.visits', 'Επισκέψεις'), value: String(healthRecords.length) },
              ].map((s, i) => (
                <div key={i} className="card p-3 text-center">
                  <s.icon size={15} className="mx-auto mb-1.5 text-gray-400" />
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{s.value}</p>
                  <p className="text-[11px] text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                {t('petDetail.details', 'Στοιχεία')}
              </h3>
              {[
                [t('petDetail.species', 'Είδος'), pet.species],
                [t('petDetail.breed', 'Ράτσα'), pet.breed],
                [t('petDetail.gender', 'Φύλο'), pet.gender === 'male' ? '♂' : pet.gender === 'female' ? '♀' : null],
                [t('petDetail.microchip', 'Microchip'), pet.microchip_number],
                [t('petDetail.sterilized', 'Στειρωμένο'),
                  pet.is_sterilized === true ? t('common.yes', 'Ναι')
                    : pet.is_sterilized === false ? t('common.no', 'Όχι') : null],
              ].filter(([, v]) => v).map(([k, v]) => (
                <Row key={String(k)} title={String(k)} right={String(v)} />
              ))}
            </div>

            {chronicConditions.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                  <Activity size={14} /> {t('petDetail.chronic', 'Χρόνιες παθήσεις')}
                </h3>
                {chronicConditions.map((c: any) => (
                  <Row key={c.id} title={c.condition}
                    subtitle={[c.status, c.treatment_plan].filter(Boolean).join(' · ')}
                    right={d(c.diagnosed_date)}
                    tone={c.status === 'active' ? 'warn' : undefined} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'medical' && (
          <div className="space-y-4">
            {allergies.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-red-500" /> {t('petDetail.allergies', 'Αλλεργίες')}
                </h3>
                {allergies.map((a: any) => (
                  <Row key={a.id} title={a.allergen}
                    subtitle={[a.reaction, a.treatment].filter(Boolean).join(' · ')}
                    right={a.severity}
                    tone={a.severity === 'severe' ? 'danger' : 'warn'} />
                ))}
              </div>
            )}

            {activeMeds.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                  <Pill size={14} /> {t('petDetail.activeMeds', 'Ενεργή αγωγή')}
                </h3>
                {activeMeds.map((m: any) => (
                  <Row key={m.id} title={m.name}
                    subtitle={[m.dosage, m.frequency].filter(Boolean).join(' · ')}
                    right={d(m.start_date)} />
                ))}
              </div>
            )}

            <div className="card p-5">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                <Stethoscope size={14} /> {t('petDetail.history', 'Ιατρικό ιστορικό')}
              </h3>
              {healthRecords.length === 0
                ? <Empty icon={Stethoscope} text={t('petDetail.noRecords', 'Καμία καταχώρηση ακόμη')} />
                : healthRecords.map((r: any) => (
                    <Row key={r.id} title={r.title}
                      subtitle={[r.record_type, r.vet_name, r.clinic_name].filter(Boolean).join(' · ')}
                      right={d(r.date)} />
                  ))}
            </div>
          </div>
        )}

        {tab === 'vaccines' && (
          <div className="card p-5">
            {vaccinations.length === 0
              ? <Empty icon={Syringe} text={t('petDetail.noVaccines', 'Κανένα εμβόλιο καταχωρημένο')} />
              : vaccinations.map((v: any) => {
                  const due = isOverdue(v.next_due_date)
                  return (
                    <Row key={v.id}
                      title={v.vaccine_name}
                      subtitle={[
                        `${t('petDetail.given', 'Χορηγήθηκε')}: ${d(v.date_administered)}`,
                        v.vet_name,
                      ].filter(Boolean).join(' · ')}
                      right={v.next_due_date
                        ? `${due ? '⚠ ' : ''}${d(v.next_due_date)}`
                        : undefined}
                      tone={due ? 'warn' : undefined} />
                  )
                })}
          </div>
        )}

        {tab === 'location' && (
          <div className="space-y-4">
            {device ? (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">
                      {device.name || device.device_id}
                    </p>
                    <p className="text-xs text-gray-500">{device.device_id}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Battery size={13} />
                      {device.battery_percent != null ? `${device.battery_percent}%` : '—'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={13} />
                      {device.last_seen_at ? d(device.last_seen_at) : '—'}
                    </span>
                  </div>
                </div>
                {latest && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${latest.latitude},${latest.longitude}`}
                    target="_blank" rel="noopener noreferrer"
                    className="btn-secondary text-xs inline-flex items-center gap-1.5">
                    <MapPin size={13} /> {t('tracker.directions', 'Οδηγίες')}
                  </a>
                )}
              </div>
            ) : (
              <div className="card p-5 text-center">
                <MapPin size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                  {t('petDetail.noDevice', 'Καμία συνδεδεμένη συσκευή GPS')}
                </p>
                <Link to="/tracker" className="text-sm text-brand-900 dark:text-yellow-400 hover:underline">
                  {t('petDetail.addDevice', 'Σύνδεσε συσκευή')} <ChevronRight size={12} className="inline" />
                </Link>
              </div>
            )}

            <div className="card p-5">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                {t('petDetail.locationHistory', 'Ιστορικό θέσεων')}
              </h3>
              {locations.length === 0
                ? <Empty icon={MapPin} text={t('petDetail.noLocations', 'Καμία καταγεγραμμένη θέση')} />
                : locations.map((loc: any) => (
                    <Row key={loc.id}
                      title={`${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`}
                      subtitle={loc.status === 'lost' ? t('tracker.lost', 'Χαμένο') : t('tracker.safe', 'Ασφαλές')}
                      right={new Date(loc.created_at).toLocaleString(locale, {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                      tone={loc.status === 'lost' ? 'danger' : undefined} />
                  ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
