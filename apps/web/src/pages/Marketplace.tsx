import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Search, Filter, SlidersHorizontal, Grid, List, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { api } from '@/lib/api'
import ProductCard from '@/components/features/marketplace/ProductCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import type { Product, ProductCategory } from '@/types'

const categoryKeys: { value: ProductCategory | 'all'; key: string; emoji: string }[] = [
  { value: 'all',         key: 'all',         emoji: '🛍️' },
  { value: 'food',        key: 'food',        emoji: '🦴' },
  { value: 'toys',        key: 'toys',        emoji: '🎾' },
  { value: 'accessories', key: 'accessories', emoji: '🎀' },
  { value: 'health',      key: 'health',      emoji: '💊' },
  { value: 'grooming',    key: 'grooming',    emoji: '✂️' },
  { value: 'training',    key: 'training',    emoji: '🎓' },
  { value: 'housing',     key: 'housing',     emoji: '🏠' },
]

const sortKeys = ['featured', 'price_asc', 'price_desc', 'rating', 'newest']

export default function Marketplace() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [category, setCategory] = useState<string>(searchParams.get('category') || 'all')
  const [sort, setSort] = useState('featured')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [priceRange, setPriceRange] = useState([0, 500])
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['products', { search, category, sort, priceRange, page }],
    queryFn: () => api.get('/products', {
      params: {
        q: search || undefined,
        category: category !== 'all' ? category : undefined,
        sort,
        min_price: priceRange[0] || undefined,
        max_price: priceRange[1] < 500 ? priceRange[1] : undefined,
        page,
        limit: 12,
      }
    }).then(r => r.data),
  })

  const getCategoryLabel = (key: string) => t(`marketplace.categories.${key}`)

  return (
    <div className="page-container py-8 pb-24 lg:pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="section-title mb-1">{t('marketplace.title')}</h1>
        <p className="text-gray-500 text-sm">{t('marketplace.subtitle')}</p>
      </div>

      {/* Search + Sort bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder={t('marketplace.searchPlaceholder')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="input pl-10 py-2.5"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="input py-2.5 w-auto cursor-pointer text-sm"
        >
          {sortKeys.map(k => <option key={k} value={k}>{t(`marketplace.sort.${k}`)}</option>)}
        </select>
        <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
          <button
            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
            onClick={() => setViewMode('grid')}
          ><Grid size={16} /></button>
          <button
            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
            onClick={() => setViewMode('list')}
          ><List size={16} /></button>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {categoryKeys.map((cat) => (
          <button
            key={cat.value}
            onClick={() => { setCategory(cat.value); setPage(1) }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              category === cat.value
                ? 'bg-brand-900 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-brand-300'
            }`}
          >
            <span>{cat.emoji}</span>
            {getCategoryLabel(cat.key)}
          </button>
        ))}
      </div>

      {/* Results count */}
      {!isLoading && data && (
        <p className="text-sm text-gray-500 mb-4">
          {data.total} {t('marketplace.results')}
          {category !== 'all' && ` ${t('marketplace.inCategory')} "${getCategoryLabel(category)}"`}
        </p>
      )}

      {/* Products grid */}
      {isLoading ? (
        <div className="flex justify-center py-24"><LoadingSpinner /></div>
      ) : (
        <>
          <motion.div
            layout
            className={`grid gap-4 ${
              viewMode === 'grid'
                ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                : 'grid-cols-1'
            }`}
          >
            <AnimatePresence mode="popLayout">
              {data?.data?.map((product: Product, i: number) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <ProductCard product={product} viewMode={viewMode} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Empty state */}
          {data?.data?.length === 0 && (
            <div className="text-center py-24">
              <p className="text-4xl mb-4">🔍</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('marketplace.noResults')}</p>
              <p className="text-gray-500 text-sm">{t('marketplace.noResultsDesc')}</p>
            </div>
          )}

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${
                    page === p
                      ? 'bg-brand-900 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-brand-300'
                  }`}
                >{p}</button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
