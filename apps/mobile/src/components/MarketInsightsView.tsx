import { useCallback, useMemo, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Flame, Package, Star, BarChart3, AlertTriangle, EyeOff,
  Euro, ShoppingBag, Eye, TrendingUp,
} from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, Card, Button, EmptyState, SkeletonRows } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Στατιστικά καταστήματος — η ίδια οθόνη με το /market-insights του web.
 *
 * ΔΥΟ ΚΟΙΝΑ, ΜΙΑ ΟΘΟΝΗ
 *   Admin, πάροχος και «both» βλέπουν τα εμπορικά στοιχεία (έσοδα, τεμάχια,
 *   προβολές, μετατροπή, απόθεμα) — ο server αποφασίζει αν είναι όλο το
 *   κατάστημα ή μόνο τα δικά τους. Όλοι οι άλλοι βλέπουν τα δημοφιλή
 *   προϊόντα. Ίδιος κανόνας με το web, ίδια endpoints.
 *
 * ΓΙΑΤΙ ΚΟΙΝΟ COMPONENT
 *   Το χρησιμοποιούν δύο διαδρομές: η «Ανακάλυψη» (/market-insights) και ο
 *   χώρος παρόχου ((provider)/insights). Η παλιά οθόνη παρόχου διάβαζε
 *   πεδία `term`/`count` από το /insights/popular, που δεν τα επιστρέφει —
 *   έδειχνε κενές γραμμές. Τώρα και οι δύο δείχνουν το ίδιο, σωστά.
 *
 * ΧΩΡΙΣ ΓΡΑΦΗΜΑ ΗΜΕΡΩΝ
 *   Σε πλάτος κινητού 30–365 μπάρες γίνονται γραμμές του ενός pixel. Οι
 *   αριθμοί και η ταξινόμηση λένε το ίδιο πράγμα και διαβάζονται.
 */

const POPULAR_RANGES = [7, 30, 90]
const TRADING_RANGES = [7, 30, 90, 365]
type SortKey = 'revenue' | 'units' | 'views' | 'conversion' | 'rating'
const SORTS: SortKey[] = ['revenue', 'units', 'views', 'conversion', 'rating']

/** Πόσα προϊόντα δείχνουμε πριν το «Όλα». */
const PAGE = 20

const money = (n: any) => `€${Number(n ?? 0).toFixed(2)}`
const conversionOf = (r: any) => (r.views > 0 ? (r.orders / r.views) * 100 : 0)

/** Ζεύγη για πλέγμα δύο στηλών με ακριβή στοίχιση. */
function pairs<T>(list: T[]): [T, T | null][] {
  const out: [T, T | null][] = []
  for (let i = 0; i < list.length; i += 2) out.push([list[i], list[i + 1] ?? null])
  return out
}

export function MarketInsightsView({ title }: { title?: string }) {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const isAuthenticated = useAuthStore(st => st.isAuthenticated)
  const role = useAuthStore(st => st.user?.role)
  const canSeeTrading = ['admin', 'service_provider', 'both'].includes(role as any)

  const [days, setDays] = useState(30)
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState<SortKey>('revenue')
  const [showAll, setShowAll] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const shop = useQuery({
    queryKey: ['shop-insights', days, category],
    queryFn: () => api.get('/insights/shop', { params: { days, category: category || undefined } })
      .then(r => r.data?.data),
    enabled: isAuthenticated && canSeeTrading,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['shop-insight-categories'],
    queryFn: () => api.get('/insights/shop/categories').then(r => r.data?.data ?? []),
    enabled: isAuthenticated && canSeeTrading,
  })

  const popular = useQuery({
    queryKey: ['popular-products', days],
    queryFn: () => api.get('/insights/popular', { params: { days, limit: 24 } })
      .then(r => r.data?.data ?? []),
    enabled: isAuthenticated && !canSeeTrading,
  })

  const rows = useMemo(() => {
    const list = [...(shop.data?.products ?? [])]
    list.sort((a: any, b: any) => sort === 'conversion'
      ? conversionOf(b) - conversionOf(a)
      : (b[sort] ?? 0) - (a[sort] ?? 0))
    return list
  }, [shop.data, sort])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['shop-insights'] }),
      qc.invalidateQueries({ queryKey: ['shop-insight-categories'] }),
      qc.invalidateQueries({ queryKey: ['popular-products'] }),
    ])
    setRefreshing(false)
  }, [qc])

  const heading = title ?? (canSeeTrading ? t('insights.title') : t('insights.popularTitle'))
  const catLabel = (c: string) => t(`marketplace.categories.${c}`, { defaultValue: c })
  const openProduct = (id: string) => router.push(`/products/${id}` as any)

  const RangeChips = ({ ranges }: { ranges: number[] }) => (
    <View style={s.chips}>
      {ranges.map(r => {
        const on = days === r
        return (
          <TouchableOpacity key={r} activeOpacity={0.7} style={[s.chip, on && s.chipOn]}
            onPress={() => { setDays(r); setShowAll(false) }}>
            <Text style={[s.chipTxt, on && s.chipTxtOn]}>
              {r === 365 ? t('insights.year') : `${r} ${t('insights.days')}`}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )

  // ─── Επισκέπτης: ίδιο με το PrivateRoute του web ─────────────────
  if (!isAuthenticated) return (
    <Screen title={heading}>
      <EmptyState icon={Flame} title={t('insights.loginPrompt')}
        action={<Button label={t('auth.login')} onPress={() => router.push('/auth/login' as any)} />} />
    </Screen>
  )

  // ─── Πελάτης: δημοφιλή προϊόντα ──────────────────────────────────
  if (!canSeeTrading) {
    const list: any[] = popular.data ?? []
    return (
      <Screen title={heading} onRefresh={onRefresh} refreshing={refreshing}>
        <Text style={s.intro}>{t('insights.popularSubtitle')}</Text>
        <RangeChips ranges={POPULAR_RANGES} />

        {popular.isLoading ? <SkeletonRows count={4} height={180} /> :
         list.length === 0 ? (
          <EmptyState icon={Flame} title={t('insights.noPopular')}
            action={<Button label={t('insights.browse')}
              onPress={() => router.push('/(tabs)/marketplace' as any)} />} />
        ) : pairs(list).map(([a, b]) => (
          <View key={a.id} style={s.gridRow}>
            {[a, b].map((p, i) => p ? (
              <TouchableOpacity key={p.id} activeOpacity={0.8} style={s.tile}
                onPress={() => openProduct(p.id)}>
                <View style={s.tileImgWrap}>
                  {p.image_url
                    ? <Image source={{ uri: p.image_url }} style={s.tileImg} />
                    : <View style={[s.tileImg, s.center]}><Package size={icon.xl} color={colors.textLight} /></View>}
                  {/* Μόνο οι τρεις πρώτοι παίρνουν σήμα, όπως στο web. */}
                  {p.rank <= 3 && (
                    <View style={s.rank}><Text style={s.rankTxt}>{p.rank}</Text></View>
                  )}
                </View>
                <View style={s.tileBody}>
                  <Text style={s.tileName} numberOfLines={2}>{p.name}</Text>
                  {/* Πάντα μία γραμμή, ώστε τιμές και αστέρια να στοιχίζονται στο ζεύγος. */}
                  <Text style={s.tileBrand} numberOfLines={1}>{p.brand || ' '}</Text>
                  <View style={s.ratingRow}>
                    <Star size={11} color={colors.accent} fill={colors.accent} />
                    <Text style={s.ratingTxt}>{p.rating} ({p.reviews_count})</Text>
                  </View>
                  <View style={s.priceRow}>
                    <Text style={s.price}>{money(p.price)}</Text>
                    {!!p.original_price && <Text style={s.oldPrice}>{money(p.original_price)}</Text>}
                  </View>
                  {!p.in_stock && <Text style={s.outStock}>{t('insights.outOfStock')}</Text>}
                </View>
              </TouchableOpacity>
            ) : <View key={`empty-${i}`} style={s.tileSpacer} />)}
          </View>
        ))}
      </Screen>
    )
  }

  // ─── Admin / πάροχος: εμπορικά στοιχεία ──────────────────────────
  if (shop.isError) return (
    <Screen title={heading} onRefresh={onRefresh} refreshing={refreshing}>
      <EmptyState icon={BarChart3}
        title={(shop.error as any)?.response?.data?.message || t('insights.noAccess')} />
    </Screen>
  )

  const data = shop.data
  const totals = data?.totals ?? { revenue: 0, units: 0, orders: 0, views: 0, products: 0 }
  const overall = totals.views > 0 ? (totals.orders / totals.views) * 100 : 0
  const visible = showAll ? rows : rows.slice(0, PAGE)

  const Stat = ({ Ico, label, value }: { Ico: any; label: string; value: string }) => (
    <View style={s.stat}>
      <Ico size={icon.sm} color={colors.textLight} />
      <Text style={s.statValue} numberOfLines={1}>{value}</Text>
      <Text style={s.statLabel} numberOfLines={1}>{label}</Text>
    </View>
  )

  return (
    <Screen title={heading} onRefresh={onRefresh} refreshing={refreshing}>
      <Text style={s.intro}>
        {data?.scope === 'platform' ? t('insights.scopePlatform') : t('insights.scopeProvider')}
      </Text>
      <RangeChips ranges={TRADING_RANGES} />

      {shop.isLoading ? <SkeletonRows count={5} /> : (
        <>
          {/* Έσοδα σε όλο το πλάτος, τα υπόλοιπα τέσσερα σε δύο ίσες στήλες. */}
          <View style={[s.stat, s.statWide]}>
            <Euro size={icon.sm} color={colors.textLight} />
            <Text style={[s.statValue, s.statValueWide]}>{money(totals.revenue)}</Text>
            <Text style={s.statLabel}>{t('insights.revenue')}</Text>
          </View>
          <View style={s.gridRow}>
            <Stat Ico={ShoppingBag} label={t('insights.units')} value={String(totals.units)} />
            <Stat Ico={Package} label={t('insights.orders')} value={String(totals.orders)} />
          </View>
          <View style={s.gridRow}>
            <Stat Ico={Eye} label={t('insights.views')} value={String(totals.views)} />
            <Stat Ico={TrendingUp} label={t('insights.conversion')} value={`${overall.toFixed(1)}%`} />
          </View>

          {categories.length > 0 && (
            <View style={[s.chips, { marginTop: space.sm }]}>
              {[{ category: '', count: null }, ...categories].map((c: any) => {
                const on = category === c.category
                return (
                  <TouchableOpacity key={c.category || 'all'} activeOpacity={0.7}
                    style={[s.chip, on && s.chipOn]}
                    onPress={() => { setCategory(c.category); setShowAll(false) }}>
                    <Text style={[s.chipTxt, on && s.chipTxtOn]}>
                      {c.category ? `${catLabel(c.category)} ${c.count}` : t('insights.allCategories')}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}

          <Text style={s.section}>{t('insights.products')}</Text>
          <View style={s.chips}>
            {SORTS.map(k => {
              const on = sort === k
              return (
                <TouchableOpacity key={k} activeOpacity={0.7} style={[s.chip, on && s.chipOn]}
                  onPress={() => setSort(k)}>
                  <Text style={[s.chipTxt, on && s.chipTxtOn]}>{t(`insights.${k}`)}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {rows.length === 0 ? (
            <EmptyState icon={Package} title={t('insights.noProducts')} />
          ) : visible.map((r: any) => {
            const conv = conversionOf(r)
            // Κάτω από δέκα προβολές το ποσοστό είναι θόρυβος — δεν χρωματίζεται.
            const convColor = r.views < 10 ? colors.textLight
              : conv >= 5 ? colors.success : conv >= 1 ? colors.textMuted : colors.warning
            const stockColor = r.stock === 0 ? colors.danger : r.stock <= 5 ? colors.warning : colors.textMuted
            return (
              <Card key={r.product_id} onPress={() => openProduct(r.product_id)}>
                <View style={s.prodHead}>
                  {r.image_url
                    ? <Image source={{ uri: r.image_url }} style={s.thumb} />
                    : <View style={[s.thumb, s.center]}><Package size={icon.sm} color={colors.textLight} /></View>}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.prodName} numberOfLines={2}>{r.name}</Text>
                    {!!r.category && <Text style={s.prodCat} numberOfLines={1}>{catLabel(r.category)}</Text>}
                  </View>
                  <Text style={s.prodRevenue}>{money(r.revenue)}</Text>
                </View>
                <View style={s.metrics}>
                  {[
                    { label: t('insights.views'), value: String(r.views), color: colors.textMuted },
                    { label: t('insights.units'), value: String(r.units), color: colors.textMuted },
                    { label: t('insights.conversion'), value: r.views > 0 ? `${conv.toFixed(1)}%` : '—', color: convColor },
                    { label: t('insights.stock'), value: String(r.stock), color: stockColor },
                  ].map(m => (
                    <View key={m.label} style={s.metric}>
                      <Text style={[s.metricValue, { color: m.color }]}>{m.value}</Text>
                      <Text style={s.metricLabel} numberOfLines={1}>{m.label}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            )
          })}

          {!showAll && rows.length > PAGE && (
            <Button variant="secondary" full label={t('common.see_all_count', { count: rows.length })}
              onPress={() => setShowAll(true)} />
          )}

          <Card style={{ marginTop: space.md }}>
            <View style={s.listHead}>
              <AlertTriangle size={icon.sm} color={colors.warning} />
              <Text style={s.listTitle}>{t('insights.lowStock')}</Text>
            </View>
            {(data?.low_stock ?? []).length === 0
              ? <Text style={s.none}>{t('insights.none')}</Text>
              : data.low_stock.map((r: any) => (
                  <TouchableOpacity key={r.product_id} style={s.listRow} onPress={() => openProduct(r.product_id)}>
                    <Text style={s.listName} numberOfLines={1}>{r.name}</Text>
                    <Text style={s.listStock}>{r.stock}</Text>
                  </TouchableOpacity>
                ))}
          </Card>

          <Card>
            <View style={s.listHead}>
              <EyeOff size={icon.sm} color={colors.textLight} />
              <Text style={s.listTitle}>{t('insights.neverViewed')}</Text>
            </View>
            <Text style={s.hint}>{t('insights.neverViewedHint')}</Text>
            {(data?.never_viewed ?? []).length === 0
              ? <Text style={s.none}>{t('insights.none')}</Text>
              : data.never_viewed.map((r: any) => (
                  <TouchableOpacity key={r.product_id} style={s.listRow} onPress={() => openProduct(r.product_id)}>
                    <Text style={s.listName} numberOfLines={1}>{r.name}</Text>
                  </TouchableOpacity>
                ))}
          </Card>
        </>
      )}
    </Screen>
  )
}

export default MarketInsightsView

const s = StyleSheet.create({
  intro: { ...type.body, color: colors.textMuted, marginBottom: space.md },
  center: { alignItems: 'center', justifyContent: 'center' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md },
  chip: {
    paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.lg,
    borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface,
  },
  chipOn: { borderColor: colors.brand, backgroundColor: colors.brandTint },
  chipTxt: { ...type.caption, color: colors.textMuted, fontWeight: weight.medium },
  chipTxtOn: { color: colors.brand, fontWeight: weight.bold },

  // Πλέγμα δύο στηλών: κάθε γραμμή έχει πάντα δύο κελιά ίσου πλάτους.
  gridRow: { flexDirection: 'row', gap: space.md, marginBottom: space.md },

  tile: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden',
  },
  tileSpacer: { flex: 1 },
  tileImgWrap: { position: 'relative' },
  tileImg: { width: '100%', aspectRatio: 1, backgroundColor: colors.surfaceAlt },
  rank: {
    position: 'absolute', top: space.sm, left: space.sm,
    width: 24, height: 24, borderRadius: 12, backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  rankTxt: { ...type.caption, color: colors.textOnDark, fontWeight: weight.bold },
  tileBody: { padding: space.md },
  tileName: { ...type.caption, color: colors.text, fontWeight: weight.semibold, minHeight: 32 },
  tileBrand: { ...type.caption, color: colors.textLight, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: space.xs },
  ratingTxt: { ...type.caption, color: colors.textMuted },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs, marginTop: space.xs },
  price: { ...type.body, color: colors.text, fontWeight: weight.bold },
  oldPrice: { ...type.caption, color: colors.textLight, textDecorationLine: 'line-through' },
  outStock: { ...type.caption, color: colors.danger, marginTop: space.xs },

  stat: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderLight, padding: space.lg,
  },
  statWide: { flex: 0, marginBottom: space.md },
  statValue: { ...type.section, color: colors.text, fontWeight: weight.bold, marginTop: space.sm },
  statValueWide: { ...type.title },
  statLabel: { ...type.caption, color: colors.textMuted },

  section: { ...type.emphasis, color: colors.text, fontWeight: weight.bold, marginTop: space.md, marginBottom: space.sm },

  prodHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  thumb: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  prodName: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  prodCat: { ...type.caption, color: colors.textLight },
  prodRevenue: { ...type.body, color: colors.text, fontWeight: weight.bold },
  metrics: {
    flexDirection: 'row', marginTop: space.md, paddingTop: space.md,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: { ...type.body, fontWeight: weight.semibold },
  metricLabel: { ...type.caption, color: colors.textLight },

  listHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: space.sm },
  listTitle: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  hint: { ...type.caption, color: colors.textLight, marginBottom: space.sm },
  none: { ...type.caption, color: colors.textLight },
  listRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm,
    minHeight: 44, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  listName: { ...type.body, color: colors.textMuted, flex: 1 },
  listStock: { ...type.body, color: colors.warning, fontWeight: weight.semibold },
})
