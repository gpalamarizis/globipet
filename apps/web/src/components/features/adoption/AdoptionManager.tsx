import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, EyeOff, RotateCcw, Trash2, Eye, Inbox, PawPrint, ChevronRight, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { fmtDateShort } from '@/lib/dates'
import ListingFormModal from './ListingFormModal'
import { ageLabel, APP_STATUS_CLS, LISTING_STATUS_CLS, SPECIES_EMOJI, type AdoptionListing } from './shared'

/**
 * Διαχείριση αγγελιών υιοθεσίας — ΚΟΙΝΗ για ιδιώτες (/adoption/manage) και
 * για οργανισμούς (καρτέλα «Υιοθεσία» στον πίνακα παρόχου). Ο καθαρός
 * πάροχος δεν βλέπει τις καταναλωτικές σελίδες, οπότε η ίδια λειτουργία
 * ζει και μέσα στον δικό του χώρο.
 */
type Mine = AdoptionListing & { applications_total: number; applications_open: number; applications_new: number }

export default function AdoptionManager() {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage || 'el').slice(0, 2)
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState<AdoptionListing | null | undefined>(undefined)
  const [selected, setSelected] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  // ?new=1 (από το κουμπί «Δώσε για υιοθεσία») ανοίγει αμέσως τη φόρμα.
  useEffect(() => {
    if (params.get('new') === '1') { setEditing(null); const p = new URLSearchParams(params); p.delete('new'); setParams(p, { replace: true }) }
  }, [params, setParams])

  const { data: mine = [], isLoading } = useQuery<Mine[]>({ queryKey: ['adoption-mine'], queryFn: () => api.get('/adoption/listings/mine').then(r => r.data.data) })
  const { data: received = [] } = useQuery<any[]>({
    queryKey: ['adoption-received', selected, statusFilter],
    queryFn: () => api.get('/adoption/applications/received', { params: { listing_id: selected || undefined, status: statusFilter || undefined } }).then(r => r.data.data),
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['adoption-mine'] })
    qc.invalidateQueries({ queryKey: ['adoption-received'] })
    qc.invalidateQueries({ queryKey: ['adoption-listings'] })
  }
  const act = async (fn: () => Promise<any>) => {
    try { await fn(); refresh() } catch (e: any) { toast.error(e?.response?.data?.message || t('adoption.common.error')) }
  }
  const withdraw = (l: Mine) => { if (window.confirm(t('adoption.manage.confirmWithdraw'))) act(() => api.patch(`/adoption/listings/${l.id}`, { status: 'withdrawn' })) }
  const restore = (l: Mine) => act(() => api.patch(`/adoption/listings/${l.id}`, { status: 'available' }))
  const remove = (l: Mine) => { if (window.confirm(t('adoption.manage.confirmDelete'))) act(() => api.delete(`/adoption/listings/${l.id}`)) }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('adoption.manage.title')}</h2>
          <p className="text-sm text-gray-500">{t('adoption.manage.subtitle')}</p>
        </div>
        <button type="button" onClick={() => setEditing(null)} className="btn-primary flex items-center justify-center gap-2"><Plus size={16} />{t('adoption.manage.newListing')}</button>
      </div>

      {isLoading ? <div className="card h-40 skeleton" /> : mine.length === 0 ? (
        <div className="card p-10 text-center">
          <PawPrint size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="font-semibold text-gray-900 dark:text-white">{t('adoption.manage.empty')}</p>
          <p className="text-sm text-gray-500 mt-1">{t('adoption.manage.emptyHint')}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {mine.map(l => (
            <div key={l.id} className={cn('card p-4 flex flex-col md:flex-row md:items-center gap-4', selected === l.id && 'ring-2 ring-brand-900')}>
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 flex items-center justify-center text-2xl">
                  {l.photos?.[0] ? <img src={l.photos[0]} alt="" className="w-full h-full object-cover" /> : SPECIES_EMOJI[l.species]}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white truncate">{l.name}</span>
                    <span className={LISTING_STATUS_CLS[l.status]}>{t(`adoption.status.${l.status}`)}</span>
                    {l.applications_new > 0 && <span className="badge-blue">{t('adoption.manage.newApps', { count: l.applications_new })}</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{t(`adoption.species.${l.species}`)} · {ageLabel(t, l.age_weeks)} · {l.city} · {t('adoption.detail.views', { count: l.views_count })}</p>
                  {l.is_hidden && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertTriangle size={12} />{t('adoption.manage.hiddenByAdmin', { reason: l.hidden_reason || '—' })}</p>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
                <button type="button" onClick={() => setSelected(s => s === l.id ? '' : l.id)} aria-pressed={selected === l.id} className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5">
                  <Inbox size={14} />{t('adoption.manage.applications', { count: l.applications_total })}
                </button>
                <Link to={`/adoption/${l.id}`} className="btn-ghost text-xs px-3 py-2 flex items-center gap-1.5"><Eye size={14} />{t('adoption.manage.view')}</Link>
                {l.status !== 'adopted' && <button type="button" onClick={() => setEditing(l)} className="btn-ghost text-xs px-3 py-2 flex items-center gap-1.5"><Pencil size={14} />{t('adoption.manage.edit')}</button>}
                {(l.status === 'available' || l.status === 'reserved') && <button type="button" onClick={() => withdraw(l)} className="btn-ghost text-xs px-3 py-2 flex items-center gap-1.5"><EyeOff size={14} />{t('adoption.manage.withdraw')}</button>}
                {l.status === 'withdrawn' && <button type="button" onClick={() => restore(l)} className="btn-ghost text-xs px-3 py-2 flex items-center gap-1.5"><RotateCcw size={14} />{t('adoption.manage.restore')}</button>}
                {l.status !== 'adopted' && <button type="button" onClick={() => remove(l)} className="btn-ghost text-xs px-3 py-2 flex items-center gap-1.5 text-red-600"><Trash2 size={14} />{t('adoption.manage.delete')}</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Αιτήσεις */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-gray-900 dark:text-white">
            {selected ? t('adoption.manage.applicationsFor', { name: mine.find(m => m.id === selected)?.name ?? '' }) : t('adoption.manage.received')}
          </h3>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-auto text-sm" aria-label={t('adoption.app.status')}>
            <option value="">{t('adoption.manage.all')}</option>
            {['pending', 'reviewing', 'approved', 'completed', 'rejected', 'withdrawn'].map(s => <option key={s} value={s}>{t(`adoption.appStatus.${s}`)}</option>)}
          </select>
        </div>
        {received.length === 0 ? <p className="text-sm text-gray-500">{t('adoption.manage.noApplications')}</p> : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {received.map(a => (
              <Link key={a.id} to={`/adoption/applications/${a.id}`} className="flex items-center gap-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-2 px-2 rounded-xl">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white truncate">{a.applicant_name}</span>
                    <span className={APP_STATUS_CLS[a.status]}>{t(`adoption.appStatus.${a.status}`)}</span>
                    {a.unread_messages > 0 && <span className="badge-orange">{t('adoption.apps.unread', { count: a.unread_messages })}</span>}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{a.listing?.name} · {t('adoption.apps.submitted', { date: fmtDateShort(a.created_at, lang) })}</p>
                </div>
                <ChevronRight size={16} className="text-gray-400 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {editing !== undefined && (
        <ListingFormModal listing={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); refresh() }} />
      )}
    </div>
  )
}
