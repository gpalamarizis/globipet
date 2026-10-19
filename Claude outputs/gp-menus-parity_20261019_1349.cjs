#!/usr/bin/env node
/**
 * GlobiPet — μενού web & mobile, πλήρης ισοτιμία (19/10/2026)
 *
 * Τρέχει από τη ρίζα του monorepo (C:\gp):   node <αυτό-το-αρχείο>
 *
 * ΤΙ ΚΑΝΕΙ
 *  WEB
 *   1. Μενού «Υπηρεσίες»: + Ιατρικό Κέντρο, + AI Ούρα & Περιττώματα.
 *   2. Μενού «Κοινότητα»: + Εκδηλώσεις, + Ράτσες, + Δημοφιλή (market insights).
 *   3. Όλα τα σκληροκωδικοποιημένα ελληνικά του MainLayout (Περισσότερα,
 *      Υπηρεσίες, Κοινότητα, Λογαριασμός, Παραγγελίες, Wishlist, aria-labels)
 *      γίνονται κλειδιά μετάφρασης — 5 γλώσσες.
 *   4. Ο λογαριασμός «both» βλέπει πλέον τον σύνδεσμο «Dashboard Παρόχου»
 *      (πριν μόνο service_provider/admin — στο κινητό τον έβλεπε ήδη).
 *   5. Λίστα επιθυμιών και στο μενού χρήστη του desktop (υπήρχε μόνο στο drawer).
 *   6. Η σελίδα /market-insights δεν είχε καμία μετάφραση (μόνο ελληνικά
 *      defaults): προστίθεται namespace `insights` σε 5 γλώσσες.
 *  MOBILE
 *   7. Νέα οθόνη app/market-insights.tsx — ίδια λογική με το web: δημοφιλή
 *      για πελάτες, εμπορικά στοιχεία για admin/πάροχο/both.
 *   8. Κάρτα «Δημοφιλέστερα προϊόντα» στην «Ανακάλυψη».
 *   9. (provider)/insights: διάβαζε πεδία term/count που το /insights/popular
 *      δεν επιστρέφει (κενές γραμμές). Τώρα δείχνει τα ίδια με την καρτέλα
 *      Στατιστικά του web dashboard.
 *  10. Namespace `insights` στα 5 locales του κινητού.
 *
 * ΑΣΦΑΛΕΙΑ
 *  - Δεν αγγίζει βάση, prisma, backend ή .env.
 *  - Ελέγχει ΟΛΑ τα σημεία πρώτα. Αν έστω ένα δεν ταιριάζει, δεν γράφει τίποτα.
 *  - Ξανατρέχει άφοβα: ό,τι έχει ήδη εφαρμοστεί το προσπερνά.
 *  - Κρατά BOM και τέλη γραμμών (LF/CRLF) κάθε αρχείου.
 */
const fs = require('fs')
const path = require('path')

const ROOT = process.cwd()
const P = (...p) => path.join(ROOT, ...p)
if (!fs.existsSync(P('apps', 'web')) || !fs.existsSync(P('apps', 'mobile'))) {
  console.error('ΣΦΑΛΜΑ: τρέξε το από τη ρίζα του monorepo (C:\\gp).')
  process.exit(1)
}

const VIEW = "import { useCallback, useMemo, useState } from 'react'\nimport { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'\nimport { useTranslation } from 'react-i18next'\nimport { useRouter } from 'expo-router'\nimport { useQuery, useQueryClient } from '@tanstack/react-query'\nimport {\n  Flame, Package, Star, BarChart3, AlertTriangle, EyeOff,\n  Euro, ShoppingBag, Eye, TrendingUp,\n} from 'lucide-react-native'\nimport { api } from '@/lib/api'\nimport { useAuthStore } from '@/store/auth'\nimport { Screen, Card, Button, EmptyState, SkeletonRows } from '@/components/ui'\nimport { colors, space, radius, type, weight, icon } from '@/theme'\n\n/**\n * Στατιστικά καταστήματος — η ίδια οθόνη με το /market-insights του web.\n *\n * ΔΥΟ ΚΟΙΝΑ, ΜΙΑ ΟΘΟΝΗ\n *   Admin, πάροχος και «both» βλέπουν τα εμπορικά στοιχεία (έσοδα, τεμάχια,\n *   προβολές, μετατροπή, απόθεμα) — ο server αποφασίζει αν είναι όλο το\n *   κατάστημα ή μόνο τα δικά τους. Όλοι οι άλλοι βλέπουν τα δημοφιλή\n *   προϊόντα. Ίδιος κανόνας με το web, ίδια endpoints.\n *\n * ΓΙΑΤΙ ΚΟΙΝΟ COMPONENT\n *   Το χρησιμοποιούν δύο διαδρομές: η «Ανακάλυψη» (/market-insights) και ο\n *   χώρος παρόχου ((provider)/insights). Η παλιά οθόνη παρόχου διάβαζε\n *   πεδία `term`/`count` από το /insights/popular, που δεν τα επιστρέφει —\n *   έδειχνε κενές γραμμές. Τώρα και οι δύο δείχνουν το ίδιο, σωστά.\n *\n * ΧΩΡΙΣ ΓΡΑΦΗΜΑ ΗΜΕΡΩΝ\n *   Σε πλάτος κινητού 30–365 μπάρες γίνονται γραμμές του ενός pixel. Οι\n *   αριθμοί και η ταξινόμηση λένε το ίδιο πράγμα και διαβάζονται.\n */\n\nconst POPULAR_RANGES = [7, 30, 90]\nconst TRADING_RANGES = [7, 30, 90, 365]\ntype SortKey = 'revenue' | 'units' | 'views' | 'conversion' | 'rating'\nconst SORTS: SortKey[] = ['revenue', 'units', 'views', 'conversion', 'rating']\n\n/** Πόσα προϊόντα δείχνουμε πριν το «Όλα». */\nconst PAGE = 20\n\nconst money = (n: any) => `€${Number(n ?? 0).toFixed(2)}`\nconst conversionOf = (r: any) => (r.views > 0 ? (r.orders / r.views) * 100 : 0)\n\n/** Ζεύγη για πλέγμα δύο στηλών με ακριβή στοίχιση. */\nfunction pairs<T>(list: T[]): [T, T | null][] {\n  const out: [T, T | null][] = []\n  for (let i = 0; i < list.length; i += 2) out.push([list[i], list[i + 1] ?? null])\n  return out\n}\n\nexport function MarketInsightsView({ title }: { title?: string }) {\n  const { t } = useTranslation()\n  const router = useRouter()\n  const qc = useQueryClient()\n  const isAuthenticated = useAuthStore(st => st.isAuthenticated)\n  const role = useAuthStore(st => st.user?.role)\n  const canSeeTrading = ['admin', 'service_provider', 'both'].includes(role as any)\n\n  const [days, setDays] = useState(30)\n  const [category, setCategory] = useState('')\n  const [sort, setSort] = useState<SortKey>('revenue')\n  const [showAll, setShowAll] = useState(false)\n  const [refreshing, setRefreshing] = useState(false)\n\n  const shop = useQuery({\n    queryKey: ['shop-insights', days, category],\n    queryFn: () => api.get('/insights/shop', { params: { days, category: category || undefined } })\n      .then(r => r.data?.data),\n    enabled: isAuthenticated && canSeeTrading,\n  })\n\n  const { data: categories = [] } = useQuery({\n    queryKey: ['shop-insight-categories'],\n    queryFn: () => api.get('/insights/shop/categories').then(r => r.data?.data ?? []),\n    enabled: isAuthenticated && canSeeTrading,\n  })\n\n  const popular = useQuery({\n    queryKey: ['popular-products', days],\n    queryFn: () => api.get('/insights/popular', { params: { days, limit: 24 } })\n      .then(r => r.data?.data ?? []),\n    enabled: isAuthenticated && !canSeeTrading,\n  })\n\n  const rows = useMemo(() => {\n    const list = [...(shop.data?.products ?? [])]\n    list.sort((a: any, b: any) => sort === 'conversion'\n      ? conversionOf(b) - conversionOf(a)\n      : (b[sort] ?? 0) - (a[sort] ?? 0))\n    return list\n  }, [shop.data, sort])\n\n  const onRefresh = useCallback(async () => {\n    setRefreshing(true)\n    await Promise.all([\n      qc.invalidateQueries({ queryKey: ['shop-insights'] }),\n      qc.invalidateQueries({ queryKey: ['shop-insight-categories'] }),\n      qc.invalidateQueries({ queryKey: ['popular-products'] }),\n    ])\n    setRefreshing(false)\n  }, [qc])\n\n  const heading = title ?? (canSeeTrading ? t('insights.title') : t('insights.popularTitle'))\n  const catLabel = (c: string) => t(`marketplace.categories.${c}`, { defaultValue: c })\n  const openProduct = (id: string) => router.push(`/products/${id}` as any)\n\n  const RangeChips = ({ ranges }: { ranges: number[] }) => (\n    <View style={s.chips}>\n      {ranges.map(r => {\n        const on = days === r\n        return (\n          <TouchableOpacity key={r} activeOpacity={0.7} style={[s.chip, on && s.chipOn]}\n            onPress={() => { setDays(r); setShowAll(false) }}>\n            <Text style={[s.chipTxt, on && s.chipTxtOn]}>\n              {r === 365 ? t('insights.year') : `${r} ${t('insights.days')}`}\n            </Text>\n          </TouchableOpacity>\n        )\n      })}\n    </View>\n  )\n\n  // ─── Επισκέπτης: ίδιο με το PrivateRoute του web ─────────────────\n  if (!isAuthenticated) return (\n    <Screen title={heading}>\n      <EmptyState icon={Flame} title={t('insights.loginPrompt')}\n        action={<Button label={t('auth.login')} onPress={() => router.push('/auth/login' as any)} />} />\n    </Screen>\n  )\n\n  // ─── Πελάτης: δημοφιλή προϊόντα ──────────────────────────────────\n  if (!canSeeTrading) {\n    const list: any[] = popular.data ?? []\n    return (\n      <Screen title={heading} onRefresh={onRefresh} refreshing={refreshing}>\n        <Text style={s.intro}>{t('insights.popularSubtitle')}</Text>\n        <RangeChips ranges={POPULAR_RANGES} />\n\n        {popular.isLoading ? <SkeletonRows count={4} height={180} /> :\n         list.length === 0 ? (\n          <EmptyState icon={Flame} title={t('insights.noPopular')}\n            action={<Button label={t('insights.browse')}\n              onPress={() => router.push('/(tabs)/marketplace' as any)} />} />\n        ) : pairs(list).map(([a, b]) => (\n          <View key={a.id} style={s.gridRow}>\n            {[a, b].map((p, i) => p ? (\n              <TouchableOpacity key={p.id} activeOpacity={0.8} style={s.tile}\n                onPress={() => openProduct(p.id)}>\n                <View style={s.tileImgWrap}>\n                  {p.image_url\n                    ? <Image source={{ uri: p.image_url }} style={s.tileImg} />\n                    : <View style={[s.tileImg, s.center]}><Package size={icon.xl} color={colors.textLight} /></View>}\n                  {/* Μόνο οι τρεις πρώτοι παίρνουν σήμα, όπως στο web. */}\n                  {p.rank <= 3 && (\n                    <View style={s.rank}><Text style={s.rankTxt}>{p.rank}</Text></View>\n                  )}\n                </View>\n                <View style={s.tileBody}>\n                  <Text style={s.tileName} numberOfLines={2}>{p.name}</Text>\n                  {/* Πάντα μία γραμμή, ώστε τιμές και αστέρια να στοιχίζονται στο ζεύγος. */}\n                  <Text style={s.tileBrand} numberOfLines={1}>{p.brand || ' '}</Text>\n                  <View style={s.ratingRow}>\n                    <Star size={11} color={colors.accent} fill={colors.accent} />\n                    <Text style={s.ratingTxt}>{p.rating} ({p.reviews_count})</Text>\n                  </View>\n                  <View style={s.priceRow}>\n                    <Text style={s.price}>{money(p.price)}</Text>\n                    {!!p.original_price && <Text style={s.oldPrice}>{money(p.original_price)}</Text>}\n                  </View>\n                  {!p.in_stock && <Text style={s.outStock}>{t('insights.outOfStock')}</Text>}\n                </View>\n              </TouchableOpacity>\n            ) : <View key={`empty-${i}`} style={s.tileSpacer} />)}\n          </View>\n        ))}\n      </Screen>\n    )\n  }\n\n  // ─── Admin / πάροχος: εμπορικά στοιχεία ──────────────────────────\n  if (shop.isError) return (\n    <Screen title={heading} onRefresh={onRefresh} refreshing={refreshing}>\n      <EmptyState icon={BarChart3}\n        title={(shop.error as any)?.response?.data?.message || t('insights.noAccess')} />\n    </Screen>\n  )\n\n  const data = shop.data\n  const totals = data?.totals ?? { revenue: 0, units: 0, orders: 0, views: 0, products: 0 }\n  const overall = totals.views > 0 ? (totals.orders / totals.views) * 100 : 0\n  const visible = showAll ? rows : rows.slice(0, PAGE)\n\n  const Stat = ({ Ico, label, value }: { Ico: any; label: string; value: string }) => (\n    <View style={s.stat}>\n      <Ico size={icon.sm} color={colors.textLight} />\n      <Text style={s.statValue} numberOfLines={1}>{value}</Text>\n      <Text style={s.statLabel} numberOfLines={1}>{label}</Text>\n    </View>\n  )\n\n  return (\n    <Screen title={heading} onRefresh={onRefresh} refreshing={refreshing}>\n      <Text style={s.intro}>\n        {data?.scope === 'platform' ? t('insights.scopePlatform') : t('insights.scopeProvider')}\n      </Text>\n      <RangeChips ranges={TRADING_RANGES} />\n\n      {shop.isLoading ? <SkeletonRows count={5} /> : (\n        <>\n          {/* Έσοδα σε όλο το πλάτος, τα υπόλοιπα τέσσερα σε δύο ίσες στήλες. */}\n          <View style={[s.stat, s.statWide]}>\n            <Euro size={icon.sm} color={colors.textLight} />\n            <Text style={[s.statValue, s.statValueWide]}>{money(totals.revenue)}</Text>\n            <Text style={s.statLabel}>{t('insights.revenue')}</Text>\n          </View>\n          <View style={s.gridRow}>\n            <Stat Ico={ShoppingBag} label={t('insights.units')} value={String(totals.units)} />\n            <Stat Ico={Package} label={t('insights.orders')} value={String(totals.orders)} />\n          </View>\n          <View style={s.gridRow}>\n            <Stat Ico={Eye} label={t('insights.views')} value={String(totals.views)} />\n            <Stat Ico={TrendingUp} label={t('insights.conversion')} value={`${overall.toFixed(1)}%`} />\n          </View>\n\n          {categories.length > 0 && (\n            <View style={[s.chips, { marginTop: space.sm }]}>\n              {[{ category: '', count: null }, ...categories].map((c: any) => {\n                const on = category === c.category\n                return (\n                  <TouchableOpacity key={c.category || 'all'} activeOpacity={0.7}\n                    style={[s.chip, on && s.chipOn]}\n                    onPress={() => { setCategory(c.category); setShowAll(false) }}>\n                    <Text style={[s.chipTxt, on && s.chipTxtOn]}>\n                      {c.category ? `${catLabel(c.category)} ${c.count}` : t('insights.allCategories')}\n                    </Text>\n                  </TouchableOpacity>\n                )\n              })}\n            </View>\n          )}\n\n          <Text style={s.section}>{t('insights.products')}</Text>\n          <View style={s.chips}>\n            {SORTS.map(k => {\n              const on = sort === k\n              return (\n                <TouchableOpacity key={k} activeOpacity={0.7} style={[s.chip, on && s.chipOn]}\n                  onPress={() => setSort(k)}>\n                  <Text style={[s.chipTxt, on && s.chipTxtOn]}>{t(`insights.${k}`)}</Text>\n                </TouchableOpacity>\n              )\n            })}\n          </View>\n\n          {rows.length === 0 ? (\n            <EmptyState icon={Package} title={t('insights.noProducts')} />\n          ) : visible.map((r: any) => {\n            const conv = conversionOf(r)\n            // Κάτω από δέκα προβολές το ποσοστό είναι θόρυβος — δεν χρωματίζεται.\n            const convColor = r.views < 10 ? colors.textLight\n              : conv >= 5 ? colors.success : conv >= 1 ? colors.textMuted : colors.warning\n            const stockColor = r.stock === 0 ? colors.danger : r.stock <= 5 ? colors.warning : colors.textMuted\n            return (\n              <Card key={r.product_id} onPress={() => openProduct(r.product_id)}>\n                <View style={s.prodHead}>\n                  {r.image_url\n                    ? <Image source={{ uri: r.image_url }} style={s.thumb} />\n                    : <View style={[s.thumb, s.center]}><Package size={icon.sm} color={colors.textLight} /></View>}\n                  <View style={{ flex: 1, minWidth: 0 }}>\n                    <Text style={s.prodName} numberOfLines={2}>{r.name}</Text>\n                    {!!r.category && <Text style={s.prodCat} numberOfLines={1}>{catLabel(r.category)}</Text>}\n                  </View>\n                  <Text style={s.prodRevenue}>{money(r.revenue)}</Text>\n                </View>\n                <View style={s.metrics}>\n                  {[\n                    { label: t('insights.views'), value: String(r.views), color: colors.textMuted },\n                    { label: t('insights.units'), value: String(r.units), color: colors.textMuted },\n                    { label: t('insights.conversion'), value: r.views > 0 ? `${conv.toFixed(1)}%` : '—', color: convColor },\n                    { label: t('insights.stock'), value: String(r.stock), color: stockColor },\n                  ].map(m => (\n                    <View key={m.label} style={s.metric}>\n                      <Text style={[s.metricValue, { color: m.color }]}>{m.value}</Text>\n                      <Text style={s.metricLabel} numberOfLines={1}>{m.label}</Text>\n                    </View>\n                  ))}\n                </View>\n              </Card>\n            )\n          })}\n\n          {!showAll && rows.length > PAGE && (\n            <Button variant=\"secondary\" full label={t('common.see_all_count', { count: rows.length })}\n              onPress={() => setShowAll(true)} />\n          )}\n\n          <Card style={{ marginTop: space.md }}>\n            <View style={s.listHead}>\n              <AlertTriangle size={icon.sm} color={colors.warning} />\n              <Text style={s.listTitle}>{t('insights.lowStock')}</Text>\n            </View>\n            {(data?.low_stock ?? []).length === 0\n              ? <Text style={s.none}>{t('insights.none')}</Text>\n              : data.low_stock.map((r: any) => (\n                  <TouchableOpacity key={r.product_id} style={s.listRow} onPress={() => openProduct(r.product_id)}>\n                    <Text style={s.listName} numberOfLines={1}>{r.name}</Text>\n                    <Text style={s.listStock}>{r.stock}</Text>\n                  </TouchableOpacity>\n                ))}\n          </Card>\n\n          <Card>\n            <View style={s.listHead}>\n              <EyeOff size={icon.sm} color={colors.textLight} />\n              <Text style={s.listTitle}>{t('insights.neverViewed')}</Text>\n            </View>\n            <Text style={s.hint}>{t('insights.neverViewedHint')}</Text>\n            {(data?.never_viewed ?? []).length === 0\n              ? <Text style={s.none}>{t('insights.none')}</Text>\n              : data.never_viewed.map((r: any) => (\n                  <TouchableOpacity key={r.product_id} style={s.listRow} onPress={() => openProduct(r.product_id)}>\n                    <Text style={s.listName} numberOfLines={1}>{r.name}</Text>\n                  </TouchableOpacity>\n                ))}\n          </Card>\n        </>\n      )}\n    </Screen>\n  )\n}\n\nexport default MarketInsightsView\n\nconst s = StyleSheet.create({\n  intro: { ...type.body, color: colors.textMuted, marginBottom: space.md },\n  center: { alignItems: 'center', justifyContent: 'center' },\n\n  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md },\n  chip: {\n    paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.lg,\n    borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface,\n  },\n  chipOn: { borderColor: colors.brand, backgroundColor: colors.brandTint },\n  chipTxt: { ...type.caption, color: colors.textMuted, fontWeight: weight.medium },\n  chipTxtOn: { color: colors.brand, fontWeight: weight.bold },\n\n  // Πλέγμα δύο στηλών: κάθε γραμμή έχει πάντα δύο κελιά ίσου πλάτους.\n  gridRow: { flexDirection: 'row', gap: space.md, marginBottom: space.md },\n\n  tile: {\n    flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg,\n    borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden',\n  },\n  tileSpacer: { flex: 1 },\n  tileImgWrap: { position: 'relative' },\n  tileImg: { width: '100%', aspectRatio: 1, backgroundColor: colors.surfaceAlt },\n  rank: {\n    position: 'absolute', top: space.sm, left: space.sm,\n    width: 24, height: 24, borderRadius: 12, backgroundColor: colors.brand,\n    alignItems: 'center', justifyContent: 'center',\n  },\n  rankTxt: { ...type.caption, color: colors.textOnDark, fontWeight: weight.bold },\n  tileBody: { padding: space.md },\n  tileName: { ...type.caption, color: colors.text, fontWeight: weight.semibold, minHeight: 32 },\n  tileBrand: { ...type.caption, color: colors.textLight, marginTop: 2 },\n  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: space.xs },\n  ratingTxt: { ...type.caption, color: colors.textMuted },\n  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs, marginTop: space.xs },\n  price: { ...type.body, color: colors.text, fontWeight: weight.bold },\n  oldPrice: { ...type.caption, color: colors.textLight, textDecorationLine: 'line-through' },\n  outStock: { ...type.caption, color: colors.danger, marginTop: space.xs },\n\n  stat: {\n    flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg,\n    borderWidth: 1, borderColor: colors.borderLight, padding: space.lg,\n  },\n  statWide: { flex: 0, marginBottom: space.md },\n  statValue: { ...type.section, color: colors.text, fontWeight: weight.bold, marginTop: space.sm },\n  statValueWide: { ...type.title },\n  statLabel: { ...type.caption, color: colors.textMuted },\n\n  section: { ...type.emphasis, color: colors.text, fontWeight: weight.bold, marginTop: space.md, marginBottom: space.sm },\n\n  prodHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },\n  thumb: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },\n  prodName: { ...type.body, color: colors.text, fontWeight: weight.semibold },\n  prodCat: { ...type.caption, color: colors.textLight },\n  prodRevenue: { ...type.body, color: colors.text, fontWeight: weight.bold },\n  metrics: {\n    flexDirection: 'row', marginTop: space.md, paddingTop: space.md,\n    borderTopWidth: 1, borderTopColor: colors.borderLight,\n  },\n  metric: { flex: 1, alignItems: 'center' },\n  metricValue: { ...type.body, fontWeight: weight.semibold },\n  metricLabel: { ...type.caption, color: colors.textLight },\n\n  listHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: space.sm },\n  listTitle: { ...type.body, color: colors.text, fontWeight: weight.semibold },\n  hint: { ...type.caption, color: colors.textLight, marginBottom: space.sm },\n  none: { ...type.caption, color: colors.textLight },\n  listRow: {\n    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm,\n    minHeight: 44, borderBottomWidth: 1, borderBottomColor: colors.borderLight,\n  },\n  listName: { ...type.body, color: colors.textMuted, flex: 1 },\n  listStock: { ...type.body, color: colors.warning, fontWeight: weight.semibold },\n})\n"
const INSIGHTS = {
 "el": {
  "title": "Στατιστικά καταστήματος",
  "popularTitle": "Δημοφιλέστερα προϊόντα",
  "popularSubtitle": "Αυτά επιλέγουν οι υπόλοιποι ιδιοκτήτες",
  "discoverSubtitle": "Τι αγοράζουν οι άλλοι ιδιοκτήτες",
  "loginPrompt": "Συνδέσου για να δεις τα δημοφιλή προϊόντα",
  "days": "ημέρες",
  "year": "1 έτος",
  "noPopular": "Δεν υπάρχουν ακόμη δημοφιλή προϊόντα",
  "browse": "Δες το κατάστημα",
  "outOfStock": "Εξαντλήθηκε",
  "noAccess": "Δεν έχεις πρόσβαση σε αυτά τα στατιστικά",
  "scopePlatform": "Όλο το κατάστημα",
  "scopeProvider": "Τα δικά σου προϊόντα",
  "revenue": "Έσοδα",
  "units": "Τεμάχια",
  "orders": "Παραγγελίες",
  "views": "Προβολές",
  "conversion": "Μετατροπή",
  "rating": "Βαθμολογία",
  "allCategories": "Όλες",
  "overTime": "Έσοδα ανά ημέρα",
  "products": "Προϊόντα",
  "product": "Προϊόν",
  "stock": "Απόθεμα",
  "noProducts": "Κανένα προϊόν σε αυτό το εύρος",
  "lowStock": "Χαμηλό απόθεμα",
  "none": "—",
  "neverViewed": "Χωρίς καμία προβολή",
  "neverViewedHint": "Κανείς δεν τα άνοιξε — ίσως χρειάζονται φωτογραφία ή καλύτερο τίτλο."
 },
 "en": {
  "title": "Shop statistics",
  "popularTitle": "Most popular products",
  "popularSubtitle": "What other owners are choosing",
  "discoverSubtitle": "What other owners are buying",
  "loginPrompt": "Sign in to see the most popular products",
  "days": "days",
  "year": "1 year",
  "noPopular": "No popular products yet",
  "browse": "Browse the shop",
  "outOfStock": "Out of stock",
  "noAccess": "You do not have access to these statistics",
  "scopePlatform": "The whole shop",
  "scopeProvider": "Your own products",
  "revenue": "Revenue",
  "units": "Units",
  "orders": "Orders",
  "views": "Views",
  "conversion": "Conversion",
  "rating": "Rating",
  "allCategories": "All",
  "overTime": "Revenue per day",
  "products": "Products",
  "product": "Product",
  "stock": "Stock",
  "noProducts": "No products in this range",
  "lowStock": "Low stock",
  "none": "—",
  "neverViewed": "Never viewed",
  "neverViewedHint": "Nobody has opened these — they may need a photo or a better title."
 },
 "es": {
  "title": "Estadísticas de la tienda",
  "popularTitle": "Productos más populares",
  "popularSubtitle": "Lo que eligen otros dueños",
  "discoverSubtitle": "Lo que compran otros dueños",
  "loginPrompt": "Inicia sesión para ver los productos más populares",
  "days": "días",
  "year": "1 año",
  "noPopular": "Aún no hay productos populares",
  "browse": "Ver la tienda",
  "outOfStock": "Agotado",
  "noAccess": "No tienes acceso a estas estadísticas",
  "scopePlatform": "Toda la tienda",
  "scopeProvider": "Tus productos",
  "revenue": "Ingresos",
  "units": "Unidades",
  "orders": "Pedidos",
  "views": "Vistas",
  "conversion": "Conversión",
  "rating": "Valoración",
  "allCategories": "Todas",
  "overTime": "Ingresos por día",
  "products": "Productos",
  "product": "Producto",
  "stock": "Stock",
  "noProducts": "Ningún producto en este periodo",
  "lowStock": "Stock bajo",
  "none": "—",
  "neverViewed": "Sin ninguna vista",
  "neverViewedHint": "Nadie los ha abierto: quizá necesiten una foto o un título mejor."
 },
 "fr": {
  "title": "Statistiques de la boutique",
  "popularTitle": "Produits les plus populaires",
  "popularSubtitle": "Ce que choisissent les autres propriétaires",
  "discoverSubtitle": "Ce qu’achètent les autres propriétaires",
  "loginPrompt": "Connectez-vous pour voir les produits les plus populaires",
  "days": "jours",
  "year": "1 an",
  "noPopular": "Pas encore de produits populaires",
  "browse": "Voir la boutique",
  "outOfStock": "Épuisé",
  "noAccess": "Vous n’avez pas accès à ces statistiques",
  "scopePlatform": "Toute la boutique",
  "scopeProvider": "Vos produits",
  "revenue": "Chiffre d’affaires",
  "units": "Unités",
  "orders": "Commandes",
  "views": "Vues",
  "conversion": "Conversion",
  "rating": "Note",
  "allCategories": "Toutes",
  "overTime": "Chiffre d’affaires par jour",
  "products": "Produits",
  "product": "Produit",
  "stock": "Stock",
  "noProducts": "Aucun produit sur cette période",
  "lowStock": "Stock faible",
  "none": "—",
  "neverViewed": "Jamais consultés",
  "neverViewedHint": "Personne ne les a ouverts — il leur faut peut-être une photo ou un meilleur titre."
 },
 "zh": {
  "title": "商店统计",
  "popularTitle": "最受欢迎的商品",
  "popularSubtitle": "其他主人的选择",
  "discoverSubtitle": "其他主人在买什么",
  "loginPrompt": "登录以查看最受欢迎的商品",
  "days": "天",
  "year": "1 年",
  "noPopular": "暂无热门商品",
  "browse": "浏览商店",
  "outOfStock": "已售罄",
  "noAccess": "您无权查看这些统计数据",
  "scopePlatform": "整个商店",
  "scopeProvider": "您自己的商品",
  "revenue": "收入",
  "units": "件数",
  "orders": "订单",
  "views": "浏览量",
  "conversion": "转化率",
  "rating": "评分",
  "allCategories": "全部",
  "overTime": "每日收入",
  "products": "商品",
  "product": "商品",
  "stock": "库存",
  "noProducts": "此期间没有商品",
  "lowStock": "库存不足",
  "none": "—",
  "neverViewed": "从未被浏览",
  "neverViewedHint": "还没有人打开过——也许需要一张照片或更好的标题。"
 }
}
const NAV = {
 "el": {
  "orders": "Παραγγελίες",
  "wishlist": "Λίστα επιθυμιών",
  "more": "Περισσότερα",
  "account": "Λογαριασμός",
  "popular": "Δημοφιλή",
  "mainNav": "Κύρια πλοήγηση",
  "mobileNav": "Πλοήγηση κινητού",
  "moreOptions": "Περισσότερες επιλογές",
  "search": "Αναζήτηση",
  "notifications": "Ειδοποιήσεις",
  "unread": "{{count}} μη αναγνωσμένες",
  "cart": "Καλάθι",
  "cartItems": "{{count}} αντικείμενα",
  "userMenu": "Μενού χρήστη",
  "skipToContent": "Μετάβαση στο περιεχόμενο"
 },
 "en": {
  "orders": "Orders",
  "wishlist": "Wishlist",
  "more": "More",
  "account": "Account",
  "popular": "Popular",
  "mainNav": "Main navigation",
  "mobileNav": "Mobile navigation",
  "moreOptions": "More options",
  "search": "Search",
  "notifications": "Notifications",
  "unread": "{{count}} unread",
  "cart": "Cart",
  "cartItems": "{{count}} items",
  "userMenu": "User menu",
  "skipToContent": "Skip to content"
 },
 "es": {
  "orders": "Pedidos",
  "wishlist": "Lista de deseos",
  "more": "Más",
  "account": "Cuenta",
  "popular": "Populares",
  "mainNav": "Navegación principal",
  "mobileNav": "Navegación móvil",
  "moreOptions": "Más opciones",
  "search": "Buscar",
  "notifications": "Notificaciones",
  "unread": "{{count}} sin leer",
  "cart": "Carrito",
  "cartItems": "{{count}} artículos",
  "userMenu": "Menú de usuario",
  "skipToContent": "Ir al contenido"
 },
 "fr": {
  "orders": "Commandes",
  "wishlist": "Liste d’envies",
  "more": "Plus",
  "account": "Compte",
  "popular": "Populaires",
  "mainNav": "Navigation principale",
  "mobileNav": "Navigation mobile",
  "moreOptions": "Plus d’options",
  "search": "Rechercher",
  "notifications": "Notifications",
  "unread": "{{count}} non lues",
  "cart": "Panier",
  "cartItems": "{{count}} articles",
  "userMenu": "Menu utilisateur",
  "skipToContent": "Aller au contenu"
 },
 "zh": {
  "orders": "订单",
  "wishlist": "心愿单",
  "more": "更多",
  "account": "账户",
  "popular": "热门",
  "mainNav": "主导航",
  "mobileNav": "移动端导航",
  "moreOptions": "更多选项",
  "search": "搜索",
  "notifications": "通知",
  "unread": "{{count}} 条未读",
  "cart": "购物车",
  "cartItems": "{{count}} 件商品",
  "userMenu": "用户菜单",
  "skipToContent": "跳到内容"
 }
}
const LANGS = ['el', 'en', 'es', 'fr', 'zh']

// ─── βοηθητικά ────────────────────────────────────────────────────
const errors = []
const writes = []   // { file, text, bom, crlf } ή { file, raw }
const notes = []

function load(rel) {
  const file = P(...rel.split('/'))
  if (!fs.existsSync(file)) { errors.push(`Λείπει: ${rel}`); return null }
  let s = fs.readFileSync(file, 'utf8')
  const bom = s.charCodeAt(0) === 0xFEFF
  if (bom) s = s.slice(1)
  const crlf = s.includes('\r\n')
  if (crlf) s = s.replace(/\r\n/g, '\n')
  return { rel, file, s, bom, crlf, changed: false }
}
function save(f) {
  if (!f || !f.changed) return
  let s = f.s
  if (f.crlf) s = s.replace(/\n/g, '\r\n')
  if (f.bom) s = '\uFEFF' + s
  writes.push({ file: f.file, rel: f.rel, raw: s })
}
/** Αντικατάσταση με έλεγχο. all=true για όλες τις εμφανίσεις. */
function rep(f, oldStr, newStr, all = false) {
  if (!f) return
  // Πρώτα ο έλεγχος «ήδη εφαρμοσμένο»: σε προσθήκες το νέο κείμενο περιέχει
  // το παλιό, οπότε ο αντίστροφος έλεγχος θα το ξαναπρόσθετε.
  if (f.s.includes(newStr) && !(all && f.s.includes(oldStr) && !newStr.includes(oldStr))) return
  if (f.s.includes(oldStr)) {
    f.s = all ? f.s.split(oldStr).join(newStr) : f.s.replace(oldStr, () => newStr)
    f.changed = true
  } else {
    errors.push(`${f.rel}: δεν βρέθηκε το σημείο:\n      ${oldStr.split('\n')[0].trim().slice(0, 110)}`)
  }
}
const q = v => `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

// ═══ WEB: MainLayout.tsx ═════════════════════════════════════════
{
  const f = load('apps/web/src/components/layout/MainLayout.tsx')

  rep(f, `Home as HomeIcon, HeartHandshake } from 'lucide-react'`,
         `Home as HomeIcon, HeartHandshake, HeartPulse, FlaskConical, CalendarDays, Dog, Flame } from 'lucide-react'`)

  // Υπηρεσίες: Ιατρικό Κέντρο + AI Ούρα & Περιττώματα (υπάρχουν ήδη στο κινητό)
  rep(f,
`  { path: '/services',   labelKey: 'nav.services',   icon: Scissors,    color: 'text-orange-500' },
  { path: '/telehealth',`,
`  { path: '/services',   labelKey: 'nav.services',   icon: Scissors,    color: 'text-orange-500' },
  { path: '/medical-center', labelKey: 'nav.medicalCenter', icon: HeartPulse, color: 'text-rose-500' },
  { path: '/telehealth',`)
  rep(f,
`  { path: '/ai-health',  labelKey: 'nav.aiHealth',   icon: Brain,       color: 'text-purple-500' },
`,
`  { path: '/ai-health',  labelKey: 'nav.aiHealth',   icon: Brain,       color: 'text-purple-500' },
  { path: '/ai-stool-urine', labelKey: 'nav.aiStoolUrine', icon: FlaskConical, color: 'text-amber-600' },
`)

  // Κοινότητα: Εκδηλώσεις + Ράτσες + Δημοφιλή (υπήρχαν μόνο στο footer)
  rep(f,
`  { path: '/forum',       labelKey: 'nav.forum',       icon: MessageSquare, color: 'text-blue-500' },
`,
`  { path: '/forum',       labelKey: 'nav.forum',       icon: MessageSquare, color: 'text-blue-500' },
  { path: '/events',      labelKey: 'nav.events',      icon: CalendarDays,  color: 'text-orange-500' },
  { path: '/breeds',      labelKey: 'nav.breeds',      icon: Dog,           color: 'text-yellow-600' },
  { path: '/market-insights', labelKey: 'nav.popular', icon: Flame,         color: 'text-orange-600' },
`)

  // Σκληροκωδικοποιημένα ελληνικά → μεταφράσεις
  rep(f, `aria-label="Κύρια πλοήγηση"`, `aria-label={t('nav.mainNav')}`)
  rep(f, `aria-label="Αναζήτηση"`, `aria-label={t('nav.search')}`)
  rep(f,
    'aria-label={`Ειδοποιήσεις${notifications.length > 0 ? ` (${notifications.length} μη αναγνωσμένες)` : \'\'}`}',
    'aria-label={`${t(\'nav.notifications\')}${notifications.length > 0 ? ` (${t(\'nav.unread\', { count: notifications.length })})` : \'\'}`}')
  rep(f,
    'aria-label={`Καλάθι${cartItems.length > 0 ? ` (${cartItems.length} αντικείμενα)` : \'\'}`}',
    'aria-label={`${t(\'nav.cart\')}${cartItems.length > 0 ? ` (${t(\'nav.cartItems\', { count: cartItems.length })})` : \'\'}`}')
  rep(f, `aria-label="Μενού χρήστη"`, `aria-label={t('nav.userMenu')}`)
  rep(f, `className="skip-link">Μετάβαση στο περιεχόμενο</a>`, `className="skip-link">{t('nav.skipToContent')}</a>`)
  rep(f, `t('nav.popular', 'Δημοφιλή')`, `t('nav.popular')`)
  rep(f, `aria-label="Πλοήγηση κινητού"`, `aria-label={t('nav.mobileNav')}`)
  rep(f, `aria-label="Περισσότερες επιλογές"`, `aria-label={t('nav.moreOptions')}`, true)
  rep(f, `<span className="text-[10px] font-medium">Περισσότερα</span>`,
         `<span className="text-[10px] font-medium">{t('nav.more')}</span>`)
  rep(f, `tracking-wider mb-2 mt-3">Υπηρεσίες</p>`, `tracking-wider mb-2 mt-3">{t('nav.services')}</p>`)
  rep(f, `tracking-wider mb-2">Κοινότητα</p>`, `tracking-wider mb-2">{t('nav.community')}</p>`)
  rep(f, `tracking-wider mb-2">Λογαριασμός</p>`, `tracking-wider mb-2">{t('nav.account')}</p>`)

  // Μενού χρήστη desktop: Παραγγελίες μεταφρασμένο + Λίστα επιθυμιών
  rep(f,
`{ to: '/orders',     icon: ShoppingBag,   label: 'Παραγγελίες' },`,
`{ to: '/orders',     icon: ShoppingBag,   label: t('nav.orders') },
                          { to: '/wishlist',   icon: Heart,         label: t('nav.wishlist') },`)
  // Drawer κινητού web
  rep(f, `{ to: '/orders',   icon: ShoppingBag, label: 'Παραγγελίες' },`,
         `{ to: '/orders',   icon: ShoppingBag, label: t('nav.orders') },`)
  rep(f, `{ to: '/wishlist', icon: Heart,       label: 'Wishlist' },`,
         `{ to: '/wishlist', icon: Heart,       label: t('nav.wishlist') },`)

  // Ο «both» είναι και πάροχος — ίδιο με το κινητό και το App.tsx (canAccess)
  rep(f, `(user?.role === 'service_provider' || user?.role === 'admin')`,
         `(user?.role === 'service_provider' || user?.role === 'both' || user?.role === 'admin')`, true)

  save(f)
}

// ═══ WEB: i18n.ts ════════════════════════════════════════════════
{
  const f = load('apps/web/src/lib/i18n.ts')
  if (f) {
    // Σειρά δηλώσεων: el, en, es, fr, zh — επαληθεύεται, δεν υποτίθεται.
    const decl = [...f.s.matchAll(/^const (el|en|es|fr|zh)\b/gm)].map(m => ({ lang: m[1], at: m.index }))
    if (decl.map(d => d.lang).join() !== LANGS.join()) {
      errors.push(`i18n.ts: απρόσμενη σειρά γλωσσών (${decl.map(d => d.lang).join()})`)
    } else {
      // από το τέλος προς την αρχή, ώστε οι θέσεις να μη μετακινούνται
      for (let i = LANGS.length - 1; i >= 0; i--) {
        const lang = LANGS[i]
        const start = decl[i].at
        const end = i + 1 < decl.length ? decl[i + 1].at : f.s.length
        let block = f.s.slice(start, end)
        const navAt = block.indexOf('\n  nav: {\n')
        if (navAt < 0) { errors.push(`i18n.ts (${lang}): δεν βρέθηκε το nav`); continue }

        // nav: νέα κλειδιά (μόνο όσα λείπουν)
        const navEnd = block.indexOf('\n  },', navAt)
        const navBody = block.slice(navAt, navEnd)
        const missingNav = Object.entries(NAV[lang]).filter(([k]) => !new RegExp(`[\\s{,]${k}:`).test(navBody))
        if (missingNav.length) {
          const line = '\n    ' + missingNav.map(([k, v]) => `${k}: ${q(v)},`).join(' ')
          const insertAt = navAt + '\n  nav: {'.length
          block = block.slice(0, insertAt) + line + block.slice(insertAt)
        }

        // insights: νέο namespace πριν από το nav
        if (!/\n  insights: \{/.test(block)) {
          const lines = Object.entries(INSIGHTS[lang]).map(([k, v]) => `    ${k}: ${q(v)},`).join('\n')
          const ins = `\n  insights: {\n${lines}\n  },`
          const at = block.indexOf('\n  nav: {\n')
          block = block.slice(0, at) + ins + block.slice(at)
        }
        if (block !== f.s.slice(start, end)) {
          f.s = f.s.slice(0, start) + block + f.s.slice(end)
          f.changed = true
        }
      }
    }
    save(f)
  }
}

// ═══ MOBILE: locales ═════════════════════════════════════════════
for (const lang of LANGS) {
  const rel = `apps/mobile/locales/${lang}.json`
  const file = P(...rel.split('/'))
  if (!fs.existsSync(file)) { errors.push(`Λείπει: ${rel}`); continue }
  const raw = fs.readFileSync(file, 'utf8')
  let j
  try { j = JSON.parse(raw.replace(/^\uFEFF/, '')) } catch (e) { errors.push(`${rel}: άκυρο JSON`); continue }
  const before = JSON.stringify(j)
  j.insights = { ...(j.insights || {}), ...INSIGHTS[lang] }
  if (JSON.stringify(j) !== before) {
    let s = JSON.stringify(j, null, 2) + '\n'
    if (raw.includes('\r\n')) s = s.replace(/\n/g, '\r\n')
    writes.push({ file, rel, raw: s })
  }
}

// ═══ MOBILE: κοινό component + οθόνες ════════════════════════════
const newFile = (rel, content) => {
  const file = P(...rel.split('/'))
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') === content) return
  writes.push({ file, rel, raw: content })
}

newFile('apps/mobile/src/components/MarketInsightsView.tsx', VIEW)

newFile('apps/mobile/app/market-insights.tsx',
`import MarketInsightsView from '@/components/MarketInsightsView'

/**
 * Δημοφιλή προϊόντα / στατιστικά καταστήματος — αντίστοιχο του
 * /market-insights του web. Η λογική ζει στο MarketInsightsView, που το
 * μοιράζεται και ο χώρος παρόχου.
 */
export default function MarketInsightsScreen() {
  return <MarketInsightsView />
}
`)

{
  const rel = 'apps/mobile/app/(provider)/insights.tsx'
  const target =
`import { useTranslation } from 'react-i18next'
import MarketInsightsView from '@/components/MarketInsightsView'

/**
 * Στατιστικά παρόχου.
 *
 * Πριν: διάβαζε \`term\`/\`count\` από το /insights/popular, που επιστρέφει
 * προϊόντα — όχι όρους αναζήτησης — και έδειχνε κενές γραμμές. Τώρα δείχνει
 * τα ίδια με την καρτέλα «Στατιστικά» του web dashboard (/insights/shop):
 * έσοδα, τεμάχια, προβολές, μετατροπή, απόθεμα, μόνο για τα δικά του προϊόντα.
 */
export default function ProviderInsights() {
  const { t } = useTranslation()
  return <MarketInsightsView title={t('providerTabs.insights')} />
}
`
  const file = P(...rel.split('/'))
  if (!fs.existsSync(file)) errors.push(`Λείπει: ${rel}`)
  else {
    const cur = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
    if (cur !== target) {
      if (!cur.includes("api.get('/insights/popular')")) {
        errors.push(`${rel}: έχει αλλάξει από την έκδοση που ελέγχθηκε — δεν το αντικαθιστώ`)
      } else writes.push({ file, rel, raw: target })
    }
  }
}

// ═══ MOBILE: Ανακάλυψη ═══════════════════════════════════════════
{
  const f = load('apps/mobile/app/(tabs)/discover.tsx')
  rep(f, `Home as HomeIcon, HeartHandshake } from 'lucide-react-native'`,
         `Home as HomeIcon, HeartHandshake, Flame } from 'lucide-react-native'`)
  rep(f,
`  { key: 'communities', Icon: Users,       titleKey: 'discover.communities',        subKey: 'discover.owner_groups',        route: '/communities',tint: 'photography' },
`,
`  { key: 'communities', Icon: Users,       titleKey: 'discover.communities',        subKey: 'discover.owner_groups',        route: '/communities',tint: 'photography' },
  { key: 'popular', Icon: Flame, titleKey: 'insights.popularTitle', subKey: 'insights.discoverSubtitle', route: '/market-insights', tint: 'pharmacy' },
`)
  save(f)
}

// ═══ Εφαρμογή ════════════════════════════════════════════════════
if (errors.length) {
  console.error('\nΔΕΝ ΓΡΑΦΤΗΚΕ ΤΙΠΟΤΑ — βρέθηκαν προβλήματα:\n')
  errors.forEach(e => console.error('  ✗ ' + e))
  process.exit(1)
}
if (!writes.length) {
  console.log('Όλα είχαν ήδη εφαρμοστεί — καμία αλλαγή.')
  process.exit(0)
}
for (const w of writes) {
  fs.mkdirSync(path.dirname(w.file), { recursive: true })
  fs.writeFileSync(w.file, w.raw, 'utf8')
  console.log('  ✓ ' + w.rel)
}

// Επαλήθευση μετά την εγγραφή: ίδια κλειδιά insights σε όλες τις γλώσσες
const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => v && typeof v === 'object' ? flat(v, p + k + '.') : [p + k])
const keysets = LANGS.map(l => new Set(flat(JSON.parse(fs.readFileSync(P('apps', 'mobile', 'locales', l + '.json'), 'utf8').replace(/^\uFEFF/, '')))))
const union = new Set(keysets.flatMap(s => [...s]))
const gaps = LANGS.map((l, i) => [l, [...union].filter(k => !keysets[i].has(k))]).filter(([, m]) => m.length)
if (gaps.length) gaps.forEach(([l, m]) => console.error(`  ✗ mobile ${l}: λείπουν ${m.length} κλειδιά`))
else console.log('  ✓ mobile locales: ίδια κλειδιά και στις 5 γλώσσες')

console.log(`\nΈτοιμο — ${writes.length} αρχεία.`)
