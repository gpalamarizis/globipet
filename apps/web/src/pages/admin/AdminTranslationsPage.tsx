import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Languages, Search, X, Save, AlertTriangle, Check } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

/**
 * Admin translations manager.
 *
 * Data model (backend /api/translations):
 *   entities: breed, achievement, insurance_provider, insurance_plan, ai_plan,
 *             catalog_template, specialty, service, service_package, product
 *   languages: el, en, es, fr, zh
 *   fields: per-entity list returned by GET /translations/config
 *
 * UX:
 *   1. Pick entity from dropdown
 *   2. See list of records — filter to "missing in <lang>" or "all"
 *   3. Click a record → modal with a tab per language, one input per field
 *   4. Save writes all languages at once via PUT /translations/:entity/:id
 */

type EntityKey =
  | 'breed' | 'achievement' | 'insurance_provider' | 'insurance_plan'
  | 'ai_plan' | 'catalog_template' | 'specialty'
  | 'service' | 'service_package' | 'product'

type LangCode = 'el' | 'en' | 'es' | 'fr' | 'zh'

const LANGS: { code: LangCode; label: string; flag: string }[] = [
  { code: 'el', label: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'es', label: 'Español',  flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'zh', label: '中文',      flag: '🇨🇳' },
]

// Where to fetch the list of records for each entity, and which fields to
// show as the record's label in the picker. Everything is admin-visible
// (provider-owned entities also list all records for the admin).
const LIST_ADAPTERS: Record<EntityKey, {
  url: string
  labelField: string
  extractor?: (raw: any) => any[]
}> = {
  breed:              { url: '/breeds',                       labelField: 'name' },
  achievement:        { url: '/achievements',                 labelField: 'name' },
  insurance_provider: { url: '/insurance/providers',          labelField: 'name' },
  insurance_plan:     { url: '/insurance/plans',              labelField: 'name' },
  ai_plan:            { url: '/ai-plans',                     labelField: 'name' },
  catalog_template:   { url: '/admin/catalog/templates',      labelField: 'name' },
  specialty:          { url: '/specialties',                  labelField: 'name' },
  service:            { url: '/services?limit=500',           labelField: 'title' },
  service_package:    { url: '/admin/catalog/packages',       labelField: 'name' },
  product:            { url: '/products?limit=500',           labelField: 'name' },
}

interface Config {
  languages: readonly string[]
  entities: { entity: EntityKey; fields: string[]; providerOwned: boolean }[]
}

export default function AdminTranslationsPage() {
  const { t } = useTranslation()
  const [entity, setEntity] = useState<EntityKey>('breed')
  const [search, setSearch] = useState('')
  const [missingLang, setMissingLang] = useState<LangCode | ''>('en')
  const [selected, setSelected] = useState<{ id: string; label: string } | null>(null)

  // Which fields does this entity have?
  const configQuery = useQuery({
    queryKey: ['translations-config'],
    queryFn: () => api.get('/translations/config').then(r => r.data.data as Config),
    staleTime: Infinity,
  })
  const fields = useMemo(
    () => configQuery.data?.entities.find(e => e.entity === entity)?.fields ?? [],
    [configQuery.data, entity]
  )

  // The list of records for the picked entity
  const adapter = LIST_ADAPTERS[entity]
  const listQuery = useQuery({
    queryKey: ['translations-list', entity],
    queryFn: async () => {
      const { data } = await api.get(adapter.url)
      // Backends are inconsistent: some return { data: [] }, some return []
      const raw = data?.data ?? data ?? []
      return Array.isArray(raw) ? raw : (raw.data ?? [])
    },
  })

  // The set of record IDs that already have a translation in `missingLang`.
  // Uses the /translations/missing/:entity endpoint which returns records
  // WITHOUT a translation — we invert it to identify "already translated".
  const missingQuery = useQuery({
    queryKey: ['translations-missing', entity, missingLang],
    queryFn: () => missingLang
      ? api.get(`/translations/missing/${entity}?lang=${missingLang}`).then(r =>
          new Set((r.data.data as Array<{ id: string }>).map(x => x.id)))
      : Promise.resolve(new Set<string>()),
    enabled: !!missingLang,
  })

  const rows = useMemo(() => {
    const all = listQuery.data ?? []
    const q = search.trim().toLowerCase()
    return all
      .filter((r: any) => !q || String(r[adapter.labelField] ?? '').toLowerCase().includes(q))
      .filter((r: any) => !missingLang || missingQuery.data?.has(r.id))
      .slice(0, 500)
  }, [listQuery.data, missingQuery.data, adapter.labelField, missingLang, search])

  return (
    <div className="page-container py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
          <Languages size={20} className="text-brand-900 dark:text-yellow-400" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
            {t('adminTranslations.title')}
          </h1>
          <p className="text-sm text-gray-500">{t('adminTranslations.subtitle')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select value={entity} onChange={e => { setEntity(e.target.value as EntityKey); setSelected(null) }}
                  className="input text-sm">
            {configQuery.data?.entities.map(e => (
              <option key={e.entity} value={e.entity}>
                {t(`adminTranslations.entities.${e.entity}`, e.entity)}
                {e.providerOwned ? ' ★' : ''}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)}
                   placeholder={t('adminTranslations.searchPlaceholder')}
                   className="input text-sm pl-8 w-full" />
          </div>
          <select value={missingLang} onChange={e => setMissingLang(e.target.value as LangCode | '')}
                  className="input text-sm">
            <option value="">{t('adminTranslations.showAll')}</option>
            {LANGS.filter(l => l.code !== 'el').map(l => (
              <option key={l.code} value={l.code}>
                {t('adminTranslations.missingIn', { lang: l.label, flag: l.flag })}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {t('adminTranslations.providerOwnedNote')}
        </p>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">{t('adminTranslations.record')}</th>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {listQuery.isLoading && (
                <tr><td colSpan={3} className="px-3 py-8 text-center text-gray-400">{t('common.loading')}</td></tr>
              )}
              {!listQuery.isLoading && rows.length === 0 && (
                <tr><td colSpan={3} className="px-3 py-8 text-center text-gray-400">{t('adminTranslations.empty')}</td></tr>
              )}
              {rows.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">
                    {r[adapter.labelField] || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500 truncate max-w-[240px]">{r.id}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => setSelected({ id: r.id, label: r[adapter.labelField] || r.id })}
                      className="btn-secondary text-xs px-3 py-1">
                      {t('adminTranslations.edit')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor */}
      {selected && (
        <TranslationEditor
          entity={entity}
          recordId={selected.id}
          recordLabel={selected.label}
          fields={fields}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

// ─── Editor modal ────────────────────────────────────────────────────

function TranslationEditor({
  entity, recordId, recordLabel, fields, onClose,
}: {
  entity: EntityKey
  recordId: string
  recordLabel: string
  fields: string[]
  onClose: () => void
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [activeLang, setActiveLang] = useState<LangCode>('en')
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({})

  // Load current translations for this record.
  // Backend returns { el: { name: '…' }, en: { name: '…' } } — already grouped.
  const query = useQuery({
    queryKey: ['translations-record', entity, recordId],
    queryFn: async () => {
      const { data } = await api.get(`/translations/${entity}/${recordId}`)
      const byLang = (data?.data ?? {}) as Record<string, Record<string, string>>
      setDraft(byLang)
      return byLang
    },
  })

  const save = useMutation({
    mutationFn: () => api.put(`/translations/${entity}/${recordId}`, draft),
    onSuccess: () => {
      toast.success(t('common.saved'))
      qc.invalidateQueries({ queryKey: ['translations-record', entity, recordId] })
      qc.invalidateQueries({ queryKey: ['translations-missing', entity] })
      onClose()
    },
    onError: () => toast.error(t('common.error')),
  })

  const setField = (lang: LangCode, field: string, value: string) => {
    setDraft(prev => ({ ...prev, [lang]: { ...(prev[lang] ?? {}), [field]: value } }))
  }

  const hasContent = (lang: LangCode) =>
    fields.some(f => (draft[lang]?.[f] ?? '').trim().length > 0)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">{recordLabel}</h2>
            <p className="text-xs text-gray-500 font-mono">{entity} · {recordId}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={18}/></button>
        </div>

        {/* Language tabs */}
        <div className="flex gap-1 px-4 pt-3 border-b border-gray-100 dark:border-gray-800">
          {LANGS.map(l => {
            const filled = hasContent(l.code)
            const active = activeLang === l.code
            const isSource = l.code === 'el'
            return (
              <button key={l.code} onClick={() => setActiveLang(l.code)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-lg border-b-2 ${
                        active
                          ? 'border-brand-900 text-brand-900 dark:text-yellow-400 dark:border-yellow-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}>
                <span>{l.flag}</span>
                <span>{l.label}</span>
                {isSource
                  ? <span className="text-[10px] text-gray-400 ml-0.5">{t('adminTranslations.source')}</span>
                  : filled
                    ? <Check size={12} className="text-emerald-500"/>
                    : <AlertTriangle size={12} className="text-amber-500"/>}
              </button>
            )
          })}
        </div>

        {/* Fields for active language */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {query.isLoading && <div className="text-center text-gray-400 py-8">{t('common.loading')}</div>}
          {!query.isLoading && activeLang === 'el' && (
            <div className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300 p-3 rounded-lg">
              {t('adminTranslations.sourceNote')}
            </div>
          )}
          {!query.isLoading && fields.map(f => (
            <div key={f}>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{f}</label>
              <textarea
                value={draft[activeLang]?.[f] ?? ''}
                onChange={e => setField(activeLang, f, e.target.value)}
                placeholder={t('adminTranslations.emptyMeansFallback')}
                rows={f.includes('description') ? 5 : 2}
                className="input w-full mt-1"/>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="btn-secondary text-sm">{t('common.cancel')}</button>
          <button onClick={() => save.mutate()} disabled={save.isPending}
                  className="btn-primary text-sm inline-flex items-center gap-1.5">
            <Save size={14}/> {save.isPending ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
