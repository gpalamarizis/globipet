import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  TrendingUp, Eye, ShoppingBag, Euro, Package, AlertTriangle,
  ArrowUpDown, BarChart3, EyeOff, Star, Flame,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { cn, formatCurrency } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

/**
 * Shop statistics.
 *
 * Products had no view counter until now, so "most viewed" could not be
 * answered — and neither could the more useful question behind it: which
 * products people open and then do not buy. That ratio is the conversion
 * column below.
 *
 * An admin sees the whole shop; a provider sees their own products. The
 * server decides which, so the page does not have to.
 */

const RANGES = [7, 30, 90, 365]

type SortKey = 'revenue' | 'units' | 'views' | 'conversion' | 'rating'

export default function MarketInsights() {
  const { t } = useTranslation()
  const { user } = useAuthStore()

  /**
   * Two audiences, one route.
   *
   * Whoever runs the shop gets the trading view. Everyone else gets the
   * popular list — the only part of this that is any of their business, and
   * genuinely useful to them. Sending a customer to a 403 taught them
   * nothing.
   */
  const canSeeTrading = ['admin', 'service_provider', 'both']
    .includes((user as any)?.role)

  const [days, setDays] = useState(30)
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState<SortKey>('revenue')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['shop-insights', days, category],
    queryFn: () => api.get('/insights/shop', {
      params: { days, category: category || undefined },
    }).then(r => r.data?.data),
    enabled: canSeeTrading,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['shop-insight-categories'],
    queryFn: () => api.get('/insights/shop/categories').then(r => r.data?.data ?? []),
    enabled: canSeeTrading,
  })

  const { data: popular = [], isLoading: popularLoading } = useQuery({
    queryKey: ['popular-products', days],
    queryFn: () => api.get('/insights/popular', { params: { days, limit: 24 } })
      .then(r => r.data?.data ?? []),
    enabled: !canSeeTrading,
  })

  /** Views that turned into a sale. Meaningless below a handful of views. */
  const conversion = (r: any) => (r.views > 0 ? (r.orders / r.views) * 100 : 0)

  const rows = useMemo(() => {
    const list = [...(data?.products ?? [])]
    list.sort((a: any, b: any) => {
      if (sort === 'conversion') return conversion(b) - conversion(a)
      return (b[sort] ?? 0) - (a[sort] ?? 0)
    })
    return list
  }, [data, sort])

  // ─── Customer view ───────────────────────────────────────────────
  if (!canSeeTrading) {
    return (
      <div className="page-container py-8 pb-24 lg:pb-8">
        <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
          <div>
            <h1 className="section-title mb-1 flex items-center gap-2">
              <Flame size={22} className="text-orange-500" />
              {t('insights.popularTitle', 'Δημοφιλέστερα προϊόντα')}
            </h1>
            <p className="text-gray-500 text-sm">
              {t('insights.popularSubtitle', 'Αυτά επιλέγουν οι υπόλοιποι ιδιοκτήτες')}
            </p>
          </div>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            {[7, 30, 90].map(r => (
              <button key={r} onClick={() => setDays(r)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  days === r ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500')}>
                {r} {t('insights.days', 'ημέρες')}
              </button>
            ))}
          </div>
        </div>

        {popularLoading ? (
          <div className="py-24 flex justify-center"><LoadingSpinner /></div>
        ) : popular.length === 0 ? (
          <div className="text-center py-24">
            <Flame size={44} className="mx-auto text-gray-200 mb-4" />
            <p className="font-semibold text-gray-900 dark:text-white mb-2">
              {t('insights.noPopular', 'Δεν υπάρχουν ακόμη δημοφιλή προϊόντα')}
            </p>
            <Link to="/marketplace" className="btn-primary mt-2">
              {t('insights.browse', 'Δες το κατάστημα')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {popular.map((p: any) => (
              <Link key={p.id} to={`/marketplace/${p.id}`}
                className="card overflow-hidden group hover:shadow-card-hover transition-all block relative">
                {/* The first three are worth calling out; a badge on every
                    card would rank nothing. */}
                {p.rank <= 3 && (
                  <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">
                    {p.rank}
                  </div>
                )}
                <div className="aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full flex items-center justify-center">
                        <Package size={32} className="text-gray-300" />
                      </div>}
                </div>
                <div className="p-3">
                  <p className="font-medium text-xs text-gray-900 dark:text-white line-clamp-2 leading-snug">
                    {p.name}
                  </p>
                  {p.brand && <p className="text-[10px] text-gray-400 mt-0.5">{p.brand}</p>}
                  <div className="flex items-center gap-0.5 mt-1">
                    <Star size={9} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-[10px] text-gray-500">
                      {p.rating} ({p.reviews_count})
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1.5">
                    <p className="font-bold text-sm text-gray-900 dark:text-white">
                      {formatCurrency(p.price)}
                    </p>
                    {p.original_price && (
                      <p className="text-[10px] text-gray-400 line-through">
                        {formatCurrency(p.original_price)}
                      </p>
                    )}
                  </div>
                  {!p.in_stock && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {t('insights.outOfStock', 'Εξαντλήθηκε')}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─── Trading view ────────────────────────────────────────────────
  if (isLoading) return (
    <div className="page-container py-24 flex justify-center"><LoadingSpinner /></div>
  )

  if (isError) return (
    <div className="page-container py-16 text-center">
      <BarChart3 size={44} className="mx-auto text-gray-200 mb-4" />
      <p className="font-semibold text-gray-900 dark:text-white mb-2">
        {(error as any)?.message || t('insights.noAccess', 'Δεν έχεις πρόσβαση σε αυτά τα στατιστικά')}
      </p>
      <Link to="/" className="btn-primary mt-2">{t('nav.home', 'Αρχική')}</Link>
    </div>
  )

  const totals = data?.totals ?? { revenue: 0, units: 0, orders: 0, views: 0, products: 0 }
  const overallConversion = totals.views > 0 ? (totals.orders / totals.views) * 100 : 0

  const SortButton = ({ k, label }: { k: SortKey; label: string }) => (
    <button onClick={() => setSort(k)}
      className={cn('flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors',
        sort === k ? 'bg-brand-900 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800')}>
      {label} {sort === k && <ArrowUpDown size={10} />}
    </button>
  )

  return (
    <div className="page-container py-8 pb-24 lg:pb-8">
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="section-title mb-1">{t('insights.title', 'Στατιστικά καταστήματος')}</h1>
          <p className="text-gray-500 text-sm">
            {data?.scope === 'platform'
              ? t('insights.scopePlatform', 'Όλο το κατάστημα')
              : t('insights.scopeProvider', 'Τα δικά σου προϊόντα')}
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {RANGES.map(r => (
            <button key={r} onClick={() => setDays(r)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                days === r ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500')}>
              {r === 365 ? t('insights.year', '1 έτος') : `${r} ${t('insights.days', 'ημέρες')}`}
            </button>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          { icon: Euro,        label: t('insights.revenue', 'Έσοδα'),        value: formatCurrency(totals.revenue) },
          { icon: ShoppingBag, label: t('insights.units', 'Τεμάχια'),        value: String(totals.units) },
          { icon: Package,     label: t('insights.orders', 'Παραγγελίες'),   value: String(totals.orders) },
          { icon: Eye,         label: t('insights.views', 'Προβολές'),       value: String(totals.views) },
          { icon: TrendingUp,  label: t('insights.conversion', 'Μετατροπή'), value: `${overallConversion.toFixed(1)}%` },
        ].map((s, i) => (
          <div key={i} className="card p-4">
            <s.icon size={15} className="text-gray-400 mb-2" />
            <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-[11px] text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-5">
          <button onClick={() => setCategory('')}
            className={cn('px-2.5 py-1.5 rounded-full text-xs font-medium transition-all',
              !category ? 'bg-brand-900 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700')}>
            {t('insights.allCategories', 'Όλες')}
          </button>
          {categories.map((c: any) => (
            <button key={c.category} onClick={() => setCategory(c.category)}
              className={cn('px-2.5 py-1.5 rounded-full text-xs font-medium transition-all',
                category === c.category ? 'bg-brand-900 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700')}>
              {c.category} <span className="opacity-60">{c.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Revenue over time */}
      {data?.daily?.length > 0 && (() => {
        const max = Math.max(1, ...data.daily.map((d: any) => d.revenue))
        return (
          <div className="card p-5 mb-6">
            <h2 className="font-semibold text-sm text-gray-900 dark:text-white mb-4">
              {t('insights.overTime', 'Έσοδα ανά ημέρα')}
            </h2>
            <div className="flex items-end gap-[2px] h-32">
              {data.daily.map((d: any) => (
                <div key={d.day} className="flex-1 group relative">
                  <div
                    className="w-full bg-brand-900/80 dark:bg-yellow-400/80 rounded-t-sm hover:bg-brand-900 transition-colors"
                    style={{ height: `${Math.max(2, (d.revenue / max) * 100)}%` }} />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap bg-gray-900 text-white text-[10px] px-2 py-1 rounded z-10">
                    {d.day} · {formatCurrency(d.revenue)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Product table */}
      <div className="card overflow-hidden mb-6">
        <div className="flex items-center gap-2 p-4 border-b border-gray-100 dark:border-gray-800 flex-wrap">
          <h2 className="font-semibold text-sm text-gray-900 dark:text-white mr-2">
            {t('insights.products', 'Προϊόντα')}
          </h2>
          <SortButton k="revenue"    label={t('insights.revenue', 'Έσοδα')} />
          <SortButton k="units"      label={t('insights.units', 'Τεμάχια')} />
          <SortButton k="views"      label={t('insights.views', 'Προβολές')} />
          <SortButton k="conversion" label={t('insights.conversion', 'Μετατροπή')} />
          <SortButton k="rating"     label={t('insights.rating', 'Βαθμολογία')} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">{t('insights.product', 'Προϊόν')}</th>
                <th className="px-3 py-2 text-right">{t('insights.views', 'Προβολές')}</th>
                <th className="px-3 py-2 text-right">{t('insights.units', 'Τεμάχια')}</th>
                <th className="px-3 py-2 text-right">{t('insights.conversion', 'Μετατροπή')}</th>
                <th className="px-3 py-2 text-right">{t('insights.revenue', 'Έσοδα')}</th>
                <th className="px-3 py-2 text-right">{t('insights.stock', 'Απόθεμα')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-10 text-center text-gray-400">
                  {t('insights.noProducts', 'Κανένα προϊόν σε αυτό το εύρος')}
                </td></tr>
              )}
              {rows.map((r: any) => {
                const conv = conversion(r)
                return (
                  <tr key={r.product_id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-3 py-2">
                      <Link to={`/marketplace/${r.product_id}`} className="flex items-center gap-2 group">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 flex items-center justify-center">
                          {r.image_url
                            ? <img src={r.image_url} alt="" className="w-full h-full object-cover" />
                            : <Package size={14} className="text-gray-300" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate max-w-[220px] group-hover:text-brand-900">
                            {r.name}
                          </p>
                          <p className="text-[11px] text-gray-400">{r.category}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{r.views}</td>
                    <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{r.units}</td>
                    <td className={cn('px-3 py-2 text-right font-medium',
                      // Below ten views the ratio is noise, so it is not coloured.
                      r.views < 10 ? 'text-gray-400'
                        : conv >= 5 ? 'text-green-600'
                        : conv >= 1 ? 'text-gray-600 dark:text-gray-400'
                        : 'text-amber-600')}>
                      {r.views > 0 ? `${conv.toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(r.revenue)}
                    </td>
                    <td className={cn('px-3 py-2 text-right',
                      r.stock === 0 ? 'text-red-500 font-medium'
                        : r.stock <= 5 ? 'text-amber-600' : 'text-gray-500')}>
                      {r.stock}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two lists worth their own space */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-amber-500" />
            {t('insights.lowStock', 'Χαμηλό απόθεμα')}
          </h3>
          {(data?.low_stock ?? []).length === 0
            ? <p className="text-sm text-gray-400">{t('insights.none', '—')}</p>
            : data.low_stock.map((r: any) => (
                <div key={r.product_id} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <Link to={`/marketplace/${r.product_id}`} className="text-sm text-gray-700 dark:text-gray-300 truncate hover:text-brand-900">
                    {r.name}
                  </Link>
                  <span className="text-sm font-medium text-amber-600 shrink-0 ml-2">{r.stock}</span>
                </div>
              ))}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
            <EyeOff size={14} className="text-gray-400" />
            {t('insights.neverViewed', 'Χωρίς καμία προβολή')}
          </h3>
          <p className="text-[11px] text-gray-400 mb-2">
            {t('insights.neverViewedHint', 'Κανείς δεν τα άνοιξε — ίσως χρειάζονται φωτογραφία ή καλύτερο τίτλο.')}
          </p>
          {(data?.never_viewed ?? []).length === 0
            ? <p className="text-sm text-gray-400">{t('insights.none', '—')}</p>
            : data.never_viewed.map((r: any) => (
                <div key={r.product_id} className="py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <Link to={`/marketplace/${r.product_id}`} className="text-sm text-gray-700 dark:text-gray-300 truncate hover:text-brand-900">
                    {r.name}
                  </Link>
                </div>
              ))}
        </div>
      </div>
    </div>
  )
}
