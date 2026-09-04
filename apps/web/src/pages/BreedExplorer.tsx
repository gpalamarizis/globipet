import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Search, Ruler, Baby, Home, Heart, PawPrint } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'

/**
 * Breed directory.
 *
 * The footer of every page links here and breeds.ts has served this data all
 * along — the route rendered a "page under development" placeholder.
 */

const SPECIES = [
  { value: '',     labelKey: 'breeds.species.all', fallback: 'Όλα',    emoji: '🐾' },
  { value: 'dog',  labelKey: 'breeds.species.dog', fallback: 'Σκύλοι', emoji: '🐶' },
  { value: 'cat',  labelKey: 'breeds.species.cat', fallback: 'Γάτες',  emoji: '🐱' },
]

const SIZES = [
  { value: '',       labelKey: 'breeds.sizes.all',    fallback: 'Όλα' },
  { value: 'small',  labelKey: 'breeds.sizes.small',  fallback: 'Μικρό' },
  { value: 'medium', labelKey: 'breeds.sizes.medium', fallback: 'Μεσαίο' },
  { value: 'large',  labelKey: 'breeds.sizes.large',  fallback: 'Μεγάλο' },
  { value: 'giant',  labelKey: 'breeds.sizes.giant',  fallback: 'Πολύ μεγάλο' },
]

export default function BreedExplorer() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [species, setSpecies] = useState('')
  const [size, setSize] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['breeds', { search, species, size, page }],
    queryFn: () => api.get('/breeds', {
      params: {
        q: search || undefined,
        species: species || undefined,
        size: size || undefined,
        page,
        limit: 24,
      },
    }).then(r => r.data),
  })

  const breeds = data?.data ?? []

  const weightRange = (b: any) =>
    b.weight_min && b.weight_max ? `${b.weight_min}–${b.weight_max} kg`
      : b.weight_max ? `έως ${b.weight_max} kg`
      : null

  return (
    <div className="page-container py-8 pb-24 lg:pb-8">
      <div className="mb-6">
        <h1 className="section-title mb-1">{t('nav.breeds', 'Ράτσες')}</h1>
        <p className="text-gray-500 text-sm">
          {t('breeds.subtitle', 'Βρες τη ράτσα που ταιριάζει στη ζωή σου')}
        </p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input className="input pl-10 py-2.5"
          placeholder={t('breeds.searchPlaceholder', 'Αναζήτηση ράτσας...')}
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        {SPECIES.map(sp => (
          <button key={sp.value} onClick={() => { setSpecies(sp.value); setPage(1) }}
            className={cn('flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              species === sp.value
                ? 'bg-brand-900 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-brand-300')}>
            <span>{sp.emoji}</span>{t(sp.labelKey, sp.fallback)}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-6">
        {SIZES.map(sz => (
          <button key={sz.value} onClick={() => { setSize(sz.value); setPage(1) }}
            className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all',
              size === sz.value
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-orange-300')}>
            <Ruler size={10} />{t(sz.labelKey, sz.fallback)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingSkeleton variant="card" count={8} />
      ) : breeds.length === 0 ? (
        <div className="text-center py-24">
          <PawPrint size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('breeds.noResults', 'Καμία ράτσα')}
          </p>
          <p className="text-gray-500 text-sm">
            {t('breeds.noResultsDesc', 'Δοκίμασε άλλο όνομα ή φίλτρο.')}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">{data.total} {t('breeds.results', 'ράτσες')}</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {breeds.map((b: any, i: number) => (
              <motion.div key={b.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}>
                <Link to={`/breeds/${b.id}`}
                  className="card overflow-hidden group hover:shadow-card-hover transition-all block h-full">
                  <div className="aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    {b.image_url
                      ? <img src={b.image_url} alt={b.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      : <div className="w-full h-full flex items-center justify-center text-4xl">
                          {b.species === 'cat' ? '🐱' : '🐶'}
                        </div>}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1">
                      {b.name_el || b.name}
                    </p>
                    {b.name_el && b.name !== b.name_el && (
                      <p className="text-[11px] text-gray-400 line-clamp-1">{b.name}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {weightRange(b) && (
                        <span className="text-[10px] bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded-full">
                          {weightRange(b)}
                        </span>
                      )}
                      {b.apartment_friendly && (
                        <span className="flex items-center gap-0.5 text-[10px] bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full">
                          <Home size={9} /> {t('breeds.apartment', 'Διαμέρισμα')}
                        </span>
                      )}
                      {b.good_with_children && (
                        <span className="flex items-center gap-0.5 text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                          <Baby size={9} /> {t('breeds.children', 'Παιδιά')}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {data.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8 flex-wrap">
              {Array.from({ length: data.totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={cn('w-9 h-9 rounded-xl text-sm font-medium transition-all',
                    page === p
                      ? 'bg-brand-900 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-brand-300')}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
