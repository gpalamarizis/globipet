import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Radar, Search, Download, ExternalLink, Phone, Globe, Info, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

/**
 * Ε20 — «Σάρωση παρόχων»: αναζήτηση επαγγελματιών κατοικιδίων σε μια περιοχή
 * (Google Places API New, μέσω backend /admin/provider-scan) για πρόσκληση στο GlobiPet.
 * Τα αποτελέσματα της Google ΔΕΝ αποθηκεύονται· αποθηκεύεται μόνο place_id +
 * κατάσταση/σημείωση επαφής (δικά μας δεδομένα).
 */
const STATUSES = ['new', 'contacted', 'interested', 'registered', 'not_interested'] as const
type LeadStatus = typeof STATUSES[number]

interface Lead { status: LeadStatus; note: string; updated_at: string }
interface PlaceResult {
  place_id: string
  name: string | null
  address: string | null
  phone: string | null
  international_phone: string | null
  website: string | null
  rating: number | null
  ratings_count: number | null
  maps_url: string | null
  business_status: string | null
  primary_type: string | null
  lead: Lead | null
}
interface StoredLead extends Lead { place_id: string; category: string | null; area: string | null; updated_by: string | null }
interface Usage { month_requests: number; month_limit: number }

const mapsLinkForId = (id: string) => `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(id)}`
const httpsOnly = (u: string | null): string | null => {
  if (!u) return null
  try { return new URL(u).protocol === 'https:' ? u : null } catch { return null }
}
const telHref = (p: string) => `tel:${p.replace(/[^\d+]/g, '')}`

/** Κελί CSV: προστασία CSV injection (= + - @ στην αρχή → πρόθεμα ') + escape εισαγωγικών. */
function csvCell(v: unknown): string {
  let s = v == null ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}
const pad = (n: number) => String(n).padStart(2, '0')
function stamp(d = new Date()): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`
}
const errMsg = (err: any, fallback: string) => err?.response?.data?.message || fallback

export default function AdminProviderScanPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'search' | 'leads'>('search')
  const [category, setCategory] = useState('vet')
  const [area, setArea] = useState('')
  // Η τρέχουσα αναζήτηση (για «Περισσότερα»: ίδια κατηγορία/περιοχή με το pageToken).
  const [current, setCurrent] = useState<{ category: string; area: string } | null>(null)
  const [results, setResults] = useState<PlaceResult[]>([])
  const [nextToken, setNextToken] = useState<string | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [searched, setSearched] = useState(false)

  const { data: catData, isLoading } = useQuery({
    queryKey: ['admin-provider-scan-categories'],
    queryFn: () => api.get('/admin/provider-scan/categories').then(r => r.data),
  })
  const categories: { key: string }[] = catData?.data ?? []
  useEffect(() => { if (catData?.usage) setUsage(catData.usage) }, [catData])

  const { data: leads = [], isLoading: leadsLoading } = useQuery<StoredLead[]>({
    queryKey: ['admin-provider-scan-leads'],
    queryFn: () => api.get('/admin/provider-scan/leads').then(r => r.data?.data ?? []),
    enabled: tab === 'leads',
  })

  const search = useMutation({
    mutationFn: (v: { category: string; area: string; page_token?: string }) =>
      api.post('/admin/provider-scan/search', v).then(r => r.data),
    onSuccess: (res, v) => {
      const page: PlaceResult[] = res?.data?.results ?? []
      setResults(prev => {
        if (!v.page_token) return page
        const seen = new Set(prev.map(r => r.place_id))
        return [...prev, ...page.filter(r => !seen.has(r.place_id))]
      })
      setNextToken(res?.data?.next_page_token ?? null)
      if (res?.usage) setUsage(res.usage)
      setCurrent({ category: v.category, area: v.area })
      setSearched(true)
    },
    onError: (err: any) => {
      if (err?.response?.data?.usage) setUsage(err.response.data.usage)
      toast.error(errMsg(err, t('adminScan.searchError')))
    },
  })

  const saveLead = useMutation({
    mutationFn: (v: { place_id: string; status: LeadStatus; note: string; category?: string | null; area?: string | null }) =>
      api.put(`/admin/provider-scan/leads/${encodeURIComponent(v.place_id)}`, {
        status: v.status, note: v.note,
        ...(v.category ? { category: v.category } : {}),
        ...(v.area ? { area: v.area } : {}),
      }).then(r => r.data?.data),
    onSuccess: (d: StoredLead) => {
      setResults(prev => prev.map(r => r.place_id === d.place_id
        ? { ...r, lead: { status: d.status, note: d.note, updated_at: d.updated_at } } : r))
      queryClient.invalidateQueries({ queryKey: ['admin-provider-scan-leads'] })
      toast.success(t('adminScan.leadSaved'))
    },
    onError: (err: any) => toast.error(errMsg(err, t('adminScan.leadError'))),
  })

  const trimmedArea = area.replace(/\s+/g, ' ').trim()
  const areaValid = trimmedArea.length >= 2 && trimmedArea.length <= 80
  const runSearch = () => {
    if (!areaValid || search.isPending) return
    search.mutate({ category, area: trimmedArea })
  }
  const loadMore = () => {
    if (!current || !nextToken || search.isPending) return
    search.mutate({ ...current, page_token: nextToken })
  }

  const exportCsv = () => {
    if (!results.length) return
    // Ε20 — όροι Google Maps Platform: εκτός εφαρμογής ΜΟΝΟ το place_id (που
    // επιτρέπεται να αποθηκεύεται) και τα δικά μας δεδομένα — όχι όνομα,
    // τηλέφωνο, διεύθυνση κ.λπ. Ο σύνδεσμος ανοίγει την επιχείρηση στο Google Maps.
    const head = ['colPlaceId', 'colMaps', 'category', 'area', 'colStatus', 'colNote']
      .map(k => t(`adminScan.${k}`))
    const lines = results.map(r => [
      r.place_id, `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(r.place_id)}`,
      current ? t(`adminScan.cat.${current.category}`) : '', current?.area ?? '',
      r.lead ? t(`adminScan.status.${r.lead.status}`) : '', r.lead?.note ?? '',
    ].map(csvCell).join(','))
    const csv = '﻿' + [head.map(csvCell).join(','), ...lines].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const slug = (current?.area ?? '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 40)
    a.href = url
    a.download = `globipet-providers-${current?.category ?? 'all'}${slug ? `-${slug}` : ''}_${stamp()}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  if (isLoading) return <div className="page-container py-8 flex justify-center"><LoadingSpinner /></div>

  return (
    <div className="page-container py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
            <Radar size={20} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('adminScan.title')}</h1>
            <p className="text-sm text-gray-500">{t('adminScan.subtitle')}</p>
          </div>
        </div>
        {usage && (
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2">
            {t('adminScan.usage', { used: usage.month_requests, limit: usage.month_limit })}
          </span>
        )}
      </div>

      {catData && catData.configured === false && (
        <div className="card p-4 mb-5 flex items-center gap-3 bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20">
          <Info size={16} className="text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300">{t('adminScan.notConfigured')}</p>
        </div>
      )}

      <div className="flex gap-1 mb-5">
        {(['search', 'leads'] as const).map(k => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === k ? 'bg-brand-900 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            {t(k === 'search' ? 'adminScan.tabSearch' : 'adminScan.tabLeads')}
          </button>
        ))}
      </div>

      {tab === 'search' && (
        <>
          <form className="card p-5 mb-5" onSubmit={e => { e.preventDefault(); runSearch() }}>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <label className="flex flex-col gap-1.5 sm:w-56">
                <span className="text-xs font-semibold text-gray-500">{t('adminScan.category')}</span>
                <select value={category} onChange={e => setCategory(e.target.value)} className="input text-sm">
                  {categories.map(c => <option key={c.key} value={c.key}>{t(`adminScan.cat.${c.key}`)}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 flex-1">
                <span className="text-xs font-semibold text-gray-500">{t('adminScan.area')}</span>
                <input type="text" value={area} maxLength={80} onChange={e => setArea(e.target.value)}
                  placeholder={t('adminScan.areaPlaceholder')} className="input text-sm" />
              </label>
              <button type="submit" disabled={!areaValid || search.isPending}
                className="btn-primary flex items-center justify-center gap-2 px-4 py-2.5 disabled:opacity-60">
                <Search size={16} />{search.isPending ? t('adminScan.searching') : t('adminScan.search')}
              </button>
            </div>
          </form>

          {searched && (
            <div className="card p-5">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                <p className="text-sm text-gray-600 dark:text-gray-300">{t('adminScan.resultsCount', { count: results.length })}</p>
                <button onClick={exportCsv} disabled={!results.length}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
                  <Download size={16} />{t('adminScan.exportCsv')}
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-3">{t('adminScan.exportNote')}</p>

              {!results.length ? (
                <p className="text-sm text-gray-500 py-6 text-center">{t('adminScan.noResults')}</p>
              ) : (
                <>
                  {/* Επικεφαλίδες μόνο σε μεγάλες οθόνες· στα 375px κάθε γραμμή γίνεται κάρτα. */}
                  <div className="hidden lg:grid grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_7rem_minmax(0,1.6fr)] gap-4 pb-2 border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-500">
                    <span>{t('adminScan.colName')}</span>
                    <span>{t('adminScan.colContact')}</span>
                    <span>{t('adminScan.colRating')}</span>
                    <span>{t('adminScan.colStatus')}</span>
                  </div>
                  {results.map(r => (
                    <ResultRow key={r.place_id} r={r} saving={saveLead.isPending && saveLead.variables?.place_id === r.place_id}
                      onSave={(status, note) => saveLead.mutate({ place_id: r.place_id, status, note, category: current?.category, area: current?.area })} />
                  ))}
                </>
              )}

              <div className="flex items-center justify-between flex-wrap gap-3 mt-4">
                <span className="text-xs text-gray-500">{t('adminScan.attribution')}</span>
                {nextToken && (
                  <button onClick={loadMore} disabled={search.isPending}
                    className="btn-primary px-4 py-2.5 disabled:opacity-60">
                    {search.isPending ? t('adminScan.searching') : t('adminScan.more')}
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'leads' && (
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 dark:text-white mb-1">{t('adminScan.tabLeads')}</h2>
          <p className="text-xs text-gray-500 mb-3">{t('adminScan.leadsNote')}</p>
          {leadsLoading ? (
            <div className="py-6 flex justify-center"><LoadingSpinner /></div>
          ) : !leads.length ? (
            <p className="text-sm text-gray-500 py-6 text-center">{t('adminScan.noLeads')}</p>
          ) : leads.map(l => (
            <LeadRow key={l.place_id} l={l} saving={saveLead.isPending && saveLead.variables?.place_id === l.place_id}
              onSave={(status, note) => saveLead.mutate({ place_id: l.place_id, status, note })} />
          ))}
        </div>
      )}
    </div>
  )
}

/** Επιλογή κατάστασης + σημείωση (αποθήκευση με την αλλαγή κατάστασης ή όταν φύγει η εστίαση από τη σημείωση). */
function LeadEditor({ status, note, saving, onSave, label }: {
  status: LeadStatus | null; note: string; saving: boolean; label: string
  onSave: (status: LeadStatus, note: string) => void
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(note)
  useEffect(() => { setDraft(note) }, [note])
  const effective: LeadStatus = status ?? 'new'
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <select value={status ?? ''} disabled={saving}
        aria-label={`${label} — ${t('adminScan.colStatus')}`}
        onChange={e => { if (e.target.value) onSave(e.target.value as LeadStatus, draft.trim()) }}
        className="input text-sm disabled:opacity-60">
        {!status && <option value="">{t('adminScan.statusNone')}</option>}
        {STATUSES.map(s => <option key={s} value={s}>{t(`adminScan.status.${s}`)}</option>)}
      </select>
      <input type="text" value={draft} maxLength={500} disabled={saving}
        aria-label={`${label} — ${t('adminScan.colNote')}`}
        placeholder={t('adminScan.notePlaceholder')}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { if (draft.trim() !== note) onSave(effective, draft.trim()) }}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        className="input text-sm disabled:opacity-60" />
    </div>
  )
}

function ResultRow({ r, saving, onSave }: { r: PlaceResult; saving: boolean; onSave: (s: LeadStatus, n: string) => void }) {
  const { t } = useTranslation()
  const site = httpsOnly(r.website)
  const maps = httpsOnly(r.maps_url) ?? mapsLinkForId(r.place_id)
  const name = r.name ?? r.place_id
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_7rem_minmax(0,1.6fr)] gap-3 lg:gap-4 py-4 border-b border-gray-100 dark:border-gray-800 last:border-0 lg:items-start">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white break-words">{name}</p>
        {r.address && <p className="text-xs text-gray-500 mt-0.5 break-words">{r.address}</p>}
        {r.business_status && r.business_status !== 'OPERATIONAL' && (
          <p className="text-xs text-red-600 mt-0.5">{t('adminScan.notOperational')}</p>
        )}
        <a href={maps} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
          <ExternalLink size={12} />{t('adminScan.openMaps')}
        </a>
      </div>
      <div className="flex flex-col gap-1 min-w-0 text-sm">
        {r.phone ? (
          <a href={telHref(r.international_phone ?? r.phone)} className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-200 hover:underline">
            <Phone size={14} className="shrink-0" />{r.phone}
          </a>
        ) : <span className="text-xs text-gray-400">{t('adminScan.noPhone')}</span>}
        {site && (
          <a href={site} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-blue-600 hover:underline min-w-0">
            <Globe size={14} className="shrink-0" /><span className="truncate">{new URL(site).hostname}</span>
          </a>
        )}
      </div>
      <div className="text-sm text-gray-700 dark:text-gray-200">
        {r.rating != null ? (
          <span className="inline-flex items-center gap-1">
            <Star size={14} className="text-yellow-500 shrink-0" />
            {r.rating.toFixed(1)}{r.ratings_count != null && <span className="text-xs text-gray-500">({r.ratings_count})</span>}
          </span>
        ) : <span className="text-xs text-gray-400">—</span>}
      </div>
      <LeadEditor status={r.lead?.status ?? null} note={r.lead?.note ?? ''} saving={saving} label={name} onSave={onSave} />
    </div>
  )
}

function LeadRow({ l, saving, onSave }: { l: StoredLead; saving: boolean; onSave: (s: LeadStatus, n: string) => void }) {
  const { t, i18n } = useTranslation()
  const when = l.updated_at ? new Date(l.updated_at) : null
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)] gap-3 lg:gap-4 py-4 border-b border-gray-100 dark:border-gray-800 last:border-0 lg:items-start">
      <div className="min-w-0">
        <a href={mapsLinkForId(l.place_id)} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline min-w-0">
          <ExternalLink size={14} className="shrink-0" /><span className="truncate">{t('adminScan.openMaps')}</span>
        </a>
        <p className="text-xs text-gray-400 mt-0.5 font-mono break-all">{l.place_id}</p>
        <p className="text-xs text-gray-500 mt-1">
          {[l.category ? t(`adminScan.cat.${l.category}`) : null, l.area,
            when && !isNaN(when.getTime()) ? when.toLocaleString(i18n.language) : null].filter(Boolean).join(' · ')}
        </p>
      </div>
      <LeadEditor status={l.status} note={l.note} saving={saving} label={l.place_id} onSave={onSave} />
    </div>
  )
}
