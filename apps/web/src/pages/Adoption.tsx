import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { HeartHandshake, Search, Plus, Heart, FileText, SlidersHorizontal, PawPrint, LayoutList } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { AdoptionCard, AiAssistant, LegalGuide, SPECIES, GUIDE_COUNTRIES, type AdoptionListing } from '@/components/features/adoption/shared'

/**
 * Υιοθεσία — κατάλογος ζώων, ιστορίες επιτυχίας, νομικός οδηγός & AI.
 * Δημόσια σελίδα: η αναζήτηση δεν χρειάζεται λογαριασμό· η αίτηση και τα
 * αγαπημένα ναι. Ίδιες καρτέλες/φίλτρα με την οθόνη app/adoption του κινητού.
 */
type Tab = 'animals' | 'stories' | 'guide'
const AGES = ['baby', 'young', 'adult', 'senior'] as const
const SIZES = ['small', 'medium', 'large', 'xlarge'] as const

export default function AdoptionPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user, isAuthenticated } = useAuthStore()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'animals'
  const setTab = (v: Tab) => { const p = new URLSearchParams(params); p.set('tab', v); setParams(p, { replace: true }) }

  const userCountry = (user?.country || '').toUpperCase()
  const [guideCountry, setGuideCountry] = useState<string>((GUIDE_COUNTRIES as readonly string[]).includes(userCountry) ? userCountry : 'GR')

  const [q, setQ] = useState('')
  const [species, setSpecies] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState('')
  const [size, setSize] = useState('')
  const [country, setCountry] = useState('')
  const [listerType, setListerType] = useState('')
  const [compat, setCompat] = useState<{ kids?: boolean; dogs?: boolean; cats?: boolean; special?: boolean }>({})
  const [sort, setSort] = useState('newest')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [showMore, setShowMore] = useState(false)

  const filters = useMemo(() => ({
    q: q.trim() || undefined, species: species || undefined, age: age || undefined, sex: sex || undefined, size: size || undefined,
    country: country || undefined, lister_type: listerType || undefined,
    good_with_kids: compat.kids ? 'yes' : undefined, good_with_dogs: compat.dogs ? 'yes' : undefined, good_with_cats: compat.cats ? 'yes' : undefined,
    special_needs: compat.special ? 'true' : undefined,
    sort: sort === 'newest' ? undefined : sort, lat: sort === 'nearest' ? coords?.lat : undefined, lng: sort === 'nearest' ? coords?.lng : undefined,
    status: tab === 'stories' ? 'adopted' : undefined,
  }), [q, species, age, sex, size, country, listerType, compat, sort, coords, tab])

  const list = useInfiniteQuery({
    queryKey: ['adoption-listings', filters],
    queryFn: ({ pageParam }) => api.get('/adoption/listings', { params: { ...filters, page: pageParam, limit: 24 } }).then(r => r.data),
    initialPageParam: 1,
    getNextPageParam: (last: any) => (last.page < last.totalPages ? last.page + 1 : undefined),
    enabled: tab !== 'guide',
  })
  const rows: AdoptionListing[] = list.data?.pages.flatMap((p: any) => p.data) ?? []
  const total: number = list.data?.pages[0]?.total ?? 0

  const toggleFavorite = async (l: AdoptionListing) => {
    if (!isAuthenticated) { navigate('/login'); return }
    try {
      if (l.is_favorite) await api.delete(`/adoption/listings/${l.id}/favorite`)
      else await api.post(`/adoption/listings/${l.id}/favorite`, {})
      qc.invalidateQueries({ queryKey: ['adoption-listings'] })
      qc.invalidateQueries({ queryKey: ['adoption-favorites'] })
    } catch (e: any) { toast.error(e?.response?.data?.message || t('adoption.common.error')) }
  }

  const chooseSort = (v: string) => {
    if (v === 'nearest' && !coords) {
      if (!navigator.geolocation) return
      navigator.geolocation.getCurrentPosition(
        p => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setSort('nearest') },
        () => toast.error(t('adoption.common.error')),
        { timeout: 10000 },
      )
      return
    }
    setSort(v)
  }

  const clear = () => { setQ(''); setSpecies(''); setAge(''); setSex(''); setSize(''); setCountry(''); setListerType(''); setCompat({}); setSort('newest') }
  const chip = (on: boolean) => cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
    on ? 'bg-brand-900 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700')

  return (
    <div className="page-container py-8 space-y-6">
      {/* Κεφαλίδα */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center shrink-0">
            <HeartHandshake size={24} className="text-rose-500" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('adoption.title')}</h1>
            <p className="text-sm text-gray-500">{t('adoption.subtitle')}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAuthenticated && (
            <>
              <Link to="/adoption/applications" className="btn-secondary text-sm flex items-center gap-2"><FileText size={16} />{t('adoption.cta.myApplications')}</Link>
              <Link to="/adoption/manage" className="btn-secondary text-sm flex items-center gap-2"><LayoutList size={16} />{t('adoption.cta.manage')}</Link>
            </>
          )}
          <Link to={isAuthenticated ? '/adoption/manage?new=1' : '/login'} className="btn-primary text-sm flex items-center gap-2"><Plus size={16} />{t('adoption.cta.give')}</Link>
        </div>
      </div>

      {/* Καρτέλες */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl w-full sm:w-fit overflow-x-auto" role="tablist">
        {(['animals', 'stories', 'guide'] as Tab[]).map(k => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={cn('flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
              tab === k ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500')}>
            {t(`adoption.tabs.${k}`)}
          </button>
        ))}
      </div>

      {tab === 'guide' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <LegalGuide country={guideCountry} onCountry={setGuideCountry} />
          <AiAssistant country={guideCountry} />
        </div>
      ) : (
        <>
          {tab === 'animals' && (
            <div className="card p-4 space-y-3">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('adoption.filters.search')} className="input pl-9" />
                </div>
                <select value={sort} onChange={e => chooseSort(e.target.value)} className="input md:w-56" aria-label={t('adoption.filters.sort')}>
                  <option value="newest">{t('adoption.filters.sortNewest')}</option>
                  <option value="nearest">{t('adoption.filters.sortNearest')}</option>
                  <option value="youngest_animal">{t('adoption.filters.sortYoungest')}</option>
                  <option value="oldest_animal">{t('adoption.filters.sortOldest')}</option>
                </select>
                <button type="button" onClick={() => setShowMore(s => !s)} aria-expanded={showMore}
                  className="btn-secondary text-sm flex items-center justify-center gap-2"><SlidersHorizontal size={16} />{t('adoption.filters.more')}</button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t('adoption.filters.species')}>
                <button type="button" className={chip(!species)} onClick={() => setSpecies('')}>{t('adoption.filters.all')}</button>
                {SPECIES.map(s => <button key={s} type="button" className={chip(species === s)} onClick={() => setSpecies(s)}>{t(`adoption.species.${s}`)}</button>)}
              </div>
              {showMore && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                  <select value={age} onChange={e => setAge(e.target.value)} className="input" aria-label={t('adoption.filters.age')}>
                    <option value="">{t('adoption.filters.age')}: {t('adoption.filters.all')}</option>
                    {AGES.map(a => <option key={a} value={a}>{t(`adoption.age.${a}`)}</option>)}
                  </select>
                  <select value={sex} onChange={e => setSex(e.target.value)} className="input" aria-label={t('adoption.filters.sex')}>
                    <option value="">{t('adoption.filters.sex')}: {t('adoption.filters.all')}</option>
                    <option value="male">{t('adoption.sex.male')}</option><option value="female">{t('adoption.sex.female')}</option>
                  </select>
                  <select value={size} onChange={e => setSize(e.target.value)} className="input" aria-label={t('adoption.filters.size')}>
                    <option value="">{t('adoption.filters.size')}: {t('adoption.filters.all')}</option>
                    {SIZES.map(s => <option key={s} value={s}>{t(`adoption.size.${s}`)}</option>)}
                  </select>
                  <select value={country} onChange={e => setCountry(e.target.value)} className="input" aria-label={t('adoption.filters.country')}>
                    <option value="">{t('adoption.filters.country')}: {t('adoption.filters.all')}</option>
                    {GUIDE_COUNTRIES.map(c => <option key={c} value={c}>{t(`adoption.countries.${c}`)}</option>)}
                  </select>
                  <select value={listerType} onChange={e => setListerType(e.target.value)} className="input" aria-label={t('adoption.filters.listerType')}>
                    <option value="">{t('adoption.filters.listerType')}: {t('adoption.filters.all')}</option>
                    <option value="organisation">{t('adoption.filters.organisations')}</option>
                    <option value="individual">{t('adoption.filters.individuals')}</option>
                  </select>
                  <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center gap-2">
                    {([['kids', 'goodWithKids'], ['dogs', 'goodWithDogs'], ['cats', 'goodWithCats'], ['special', 'specialNeeds']] as const).map(([k, label]) => (
                      <button key={k} type="button" aria-pressed={!!compat[k]} className={chip(!!compat[k])}
                        onClick={() => setCompat(c => ({ ...c, [k]: !c[k] }))}>{t(`adoption.filters.${label}`)}</button>
                    ))}
                    <button type="button" onClick={clear} className="btn-ghost text-sm ml-auto">{t('adoption.filters.clear')}</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {list.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="card h-72 skeleton" />)}
            </div>
          ) : rows.length === 0 ? (
            <div className="card p-12 text-center">
              <PawPrint size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">{tab === 'stories' ? t('adoption.stories.empty') : t('adoption.manage.emptyHint')}</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500">{t('adoption.filters.results', { count: total })}</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {rows.map(l => <AdoptionCard key={l.id} l={l} onToggleFavorite={tab === 'animals' ? toggleFavorite : undefined} />)}
              </div>
              {list.hasNextPage && (
                <div className="flex justify-center">
                  <button type="button" onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage} className="btn-secondary">
                    {list.isFetchingNextPage ? t('adoption.common.loading') : t('adoption.common.loadMore')}
                  </button>
                </div>
              )}
            </>
          )}

          {isAuthenticated && tab === 'animals' && <FavoritesStrip />}
        </>
      )}
    </div>
  )
}

/** Τα αγαπημένα μου, κάτω από τον κατάλογο. */
function FavoritesStrip() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const favs = useInfiniteQuery({
    queryKey: ['adoption-favorites'],
    queryFn: () => api.get('/adoption/favorites').then(r => ({ data: r.data?.data ?? [], page: 1, totalPages: 1 })),
    initialPageParam: 1,
    getNextPageParam: () => undefined,
    enabled: open,
  })
  const rows: AdoptionListing[] = favs.data?.pages[0]?.data ?? []
  const toggle = async (l: AdoptionListing) => {
    await api.delete(`/adoption/listings/${l.id}/favorite`).catch(() => {})
    qc.invalidateQueries({ queryKey: ['adoption-favorites'] })
    qc.invalidateQueries({ queryKey: ['adoption-listings'] })
  }
  return (
    <div className="pt-4">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="btn-ghost flex items-center gap-2 text-sm">
        <Heart size={16} className="text-rose-500" />{t('adoption.cta.favorites')}
      </button>
      {open && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-3">
          {rows.map(l => <AdoptionCard key={l.id} l={l} onToggleFavorite={toggle} />)}
          {!favs.isLoading && rows.length === 0 && <p className="text-sm text-gray-500">—</p>}
        </div>
      )}
    </div>
  )
}
