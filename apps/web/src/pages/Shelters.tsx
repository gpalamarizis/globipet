import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Home, MapPin, Phone, Globe, BadgeCheck, Search } from 'lucide-react'
import { api } from '@/lib/api'

/**
 * Επίσημο Μητρώο Καταφυγίων.
 *
 * Δημόσια δεδομένα, όχι πάροχοι της πλατφόρμας. Το όνομα του διαχειριστή
 * δεν εμφανίζεται όταν είναι φυσικό πρόσωπο — ο server το κόβει ήδη, αλλά
 * η σελίδα δεν το ζητά ούτε το υποθέτει.
 */
const CATEGORIES = [
  { value: '',                labelKey: 'common.all' },
  { value: 'municipality',    labelKey: 'shelters.catMunicipality' },
  { value: 'association',     labelKey: 'shelters.catAssociation' },
  { value: 'private',         labelKey: 'shelters.catPrivate' },
  { value: 'inter_municipal', labelKey: 'shelters.catInterMunicipal' },
]

export default function Shelters() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  const { data: shelters = [], isLoading } = useQuery({
    queryKey: ['official-shelters'],
    queryFn: () => api.get('/registry/shelters').then(r => r.data?.data ?? []),
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return shelters.filter((s: any) =>
      (!category || s.category === category) &&
      (!q || s.name.toLowerCase().includes(q) || (s.municipality ?? '').toLowerCase().includes(q)))
  }, [shelters, search, category])

  const catLabel = (c: string) =>
    t(`shelters.cat${c.charAt(0).toUpperCase()}${c.slice(1).replace(/_(.)/g, (_, x) => x.toUpperCase())}`,
      { defaultValue: c })

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
          <Home className="text-brand-900" size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('shelters.title')}</h1>
          <p className="text-sm text-gray-500">{t('shelters.subtitle')}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('shelters.search')} className="input w-full pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <button key={c.labelKey} onClick={() => setCategory(c.value)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                category === c.value
                  ? 'bg-brand-900 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}`}>
              {t(c.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 h-32 animate-pulse bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 py-12 text-center">{t('common.no_results')}</p>
      ) : (
        <>
          <p className="text-sm text-gray-500">{t('shelters.count', { count: filtered.length })}</p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s: any) => (
              <div key={s.id} className="card p-5 space-y-2">
                <div className="flex items-start gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex-1">{s.name}</h3>
                  {s.is_claimed && <BadgeCheck size={16} className="text-green-600 shrink-0" />}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <MapPin size={14} />{s.municipality}
                </div>
                {s.operator_name && (
                  <p className="text-sm text-gray-400">{s.operator_name}</p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="px-2 py-0.5 rounded-lg text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {catLabel(s.category)}
                  </span>
                  {s.official_code && (
                    <span className="px-2 py-0.5 rounded-lg text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                      {s.official_code}
                    </span>
                  )}
                </div>
                {(s.phone || s.website) && (
                  <div className="flex flex-wrap gap-4 pt-1 text-sm">
                    {s.phone && (
                      <a href={`tel:${s.phone}`} className="flex items-center gap-1 text-brand-900 hover:underline">
                        <Phone size={14} />{s.phone}
                      </a>
                    )}
                    {s.website && (
                      <a href={s.website.startsWith('http') ? s.website : `https://${s.website}`}
                        target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-brand-900 hover:underline">
                        <Globe size={14} />{t('shelters.website')}
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center pt-4">{t('shelters.source')}</p>
        </>
      )}
    </div>
  )
}
