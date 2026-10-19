import { useState, useCallback } from 'react'
import { useTabSpace } from '@/hooks/useTabSpace'
import { useTranslation } from 'react-i18next'
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, FlatList, Image, RefreshControl, Platform, StatusBar, Alert, ActivityIndicator } from 'react-native'
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Search, X, ShoppingCart, Package, Star, Heart } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { useAuthStore } from '../../src/store/auth'
import { colors, space, radius, type, weight, shadow, icon, touch } from '@/theme'
import CampaignBanner from '@/components/CampaignBanner'

/**
 * Ύψος μπάρας κατάστασης συν αναπνοή.
 *
 * StatusBar.currentHeight δίνει την πραγματική τιμή στο Android. Τα
 * useSafeAreaInsets επιστρέφουν 0 όταν η εφαρμογή δεν είναι ρητά
 * edge-to-edge, ενώ το σύστημα σχεδιάζει ούτως ή άλλως από κάτω — γι'
 * αυτό δεν τα εμπιστευόμαστε εδώ. Κάτω όριο 48, όσο ίσχυε πριν.
 */
const HEADER_TOP = Math.max((Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0) + space.lg, 48)

/**
 * Κατάστημα.
 *
 * ΤΙ ΑΛΛΑΞΕ
 *   Τα φίλτρα ήταν σε wrap που έπιανε δύο σειρές· τώρα κυλάνε οριζόντια.
 *
 *   Το «προσθήκη στο καλάθι» δεν έλεγε τίποτα — ούτε επιτυχία ούτε
 *   αποτυχία. Ο χρήστης πατούσε και δεν ήξερε αν έγινε. Τώρα το κουμπί
 *   αλλάζει κατάσταση όσο τρέχει και εμφανίζει μήνυμα.
 *
 *   Ο μη συνδεδεμένος πήγαινε σιωπηλά πουθενά· τώρα οδηγείται στη σύνδεση.
 */

/**
 * Οι κατηγορίες είναι ΟΙ ΤΙΜΕΣ που αποθηκεύει η φόρμα προϊόντος
 * ((provider)/product-form.tsx και web ProviderDashboard). Υπήρχε φίλτρο
 * «hygiene» που δεν αντιστοιχεί σε καμία κατηγορία προϊόντος — έδινε
 * πάντα άδεια λίστα — ενώ grooming/training/housing/other έλειπαν. Ίδια
 * λίστα με το web.
 */
const CATEGORIES = [
  { id: 'all',         labelKey: 'marketplace.categories.all',         emoji: '🛍️' },
  { id: 'food',        labelKey: 'marketplace.categories.food',        emoji: '🦴' },
  { id: 'toys',        labelKey: 'marketplace.categories.toys',        emoji: '🎾' },
  { id: 'accessories', labelKey: 'marketplace.categories.accessories', emoji: '🎀' },
  { id: 'health',      labelKey: 'marketplace.categories.health',      emoji: '💊' },
  { id: 'grooming',    labelKey: 'marketplace.categories.grooming',    emoji: '✂️' },
  { id: 'training',    labelKey: 'marketplace.categories.training',    emoji: '🎓' },
  { id: 'housing',     labelKey: 'marketplace.categories.housing',     emoji: '🏠' },
  { id: 'other',       labelKey: 'marketplace.categories.other',       emoji: '📦' },
]

/** Ίδιες τιμές ταξινόμησης με το web — τις καταλαβαίνει το GET /products. */
const SORTS = ['featured', 'price_asc', 'price_desc', 'rating', 'newest'] as const
const PAGE_SIZE = 24

export default function MarketplaceScreen() {
  const tabSpace = useTabSpace()
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<typeof SORTS[number]>('featured')
  const [refreshing, setRefreshing] = useState(false)
  const [added, setAdded] = useState<string | null>(null)

  // Σελιδοποίηση όπως στο web (24 ανά σελίδα): πριν φόρτωνε μόνο τα πρώτα
  // 30 και τα υπόλοιπα προϊόντα δεν εμφανίζονταν ποτέ στο κινητό.
  const productsQuery = useInfiniteQuery({
    queryKey: ['products', category, search, sort],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api.get('/products', {
      params: {
        ...(category !== 'all' ? { category } : {}),
        ...(search ? { q: search } : {}),
        sort,
        page: pageParam,
        limit: PAGE_SIZE,
      },
    }).then(r => r.data),
    getNextPageParam: (last: any) =>
      last && Number(last.page) < Number(last.totalPages) ? Number(last.page) + 1 : undefined,
  })
  const { isLoading } = productsQuery
  // Χωρίς διπλά κατά id: αν μπει νέο προϊόν ανάμεσα σε δύο σελίδες, το
  // offset μετακινείται και το ίδιο προϊόν ξαναέρχεται στην επόμενη (διπλό
  // key στη FlatList).
  const products: any[] = (() => {
    const seen = new Set<string>()
    return (productsQuery.data?.pages.flatMap((p: any) => p?.data ?? []) ?? []).filter((x: any) => {
      if (x?.id == null) return true
      if (seen.has(x.id)) return false
      seen.add(x.id); return true
    })
  })()
  const total: number | undefined = productsQuery.data?.pages[0]?.total

  // Η καρδιά στην κάρτα, όπως στο web (ProductCard).
  const { data: wishlist = [] } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get('/wishlist').then(r => r.data?.data ?? []),
    enabled: isAuthenticated,
  })
  const isWished = (id: string) => wishlist.some((w: any) => w.product_id === id)

  const toggleWish = useMutation({
    // action: ο server κάνει ό,τι ζητήθηκε, οπότε δεύτερο ίδιο αίτημα δεν αναιρεί το πρώτο.
    mutationFn: (id: string) => api.post('/wishlist', { product_id: id, action: isWished(id) ? 'remove' : 'add' }),
    onSuccess: (r: any, id) => {
      qc.setQueriesData({ queryKey: ['wishlist'] }, (old: any) => {
        if (!Array.isArray(old)) return old
        const rest = old.filter((w: any) => w.product_id !== id)
        return r?.data?.added && r.data.data ? [r.data.data, ...rest] : rest
      })
      qc.invalidateQueries({ queryKey: ['wishlist'] })
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const addToCart = useMutation({
    // Τιμή και όνομα τα διαβάζει ο server από τον πίνακα προϊόντων.
    mutationFn: (productId: string) => api.post('/cart', { product_id: productId, quantity: 1 }),
    onSuccess: (_d, productId) => {
      qc.invalidateQueries({ queryKey: ['cart'] })
      // Σύντομη επιβεβαίωση πάνω στο ίδιο το κουμπί — δεν χρειάζεται toast
      // για κάτι που έγινε εκεί που κοιτάει ο χρήστης.
      setAdded(productId)
      setTimeout(() => setAdded(null), 1500)
    },
    // Το web δείχνει το σφάλμα· εδώ αποτυχία περνούσε σιωπηλά.
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['products'] })
    setRefreshing(false)
  }, [qc])

  const handleAdd = (id: string) => {
    if (!isAuthenticated) { router.push('/auth/login' as any); return }
    addToCart.mutate(id)
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.title}>{t('marketplace.title')}</Text>
          <TouchableOpacity
            style={s.cartBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/cart' as any)}>
            <ShoppingCart size={icon.md} color={colors.textOnDark} />
          </TouchableOpacity>
        </View>

        <View style={s.searchRow}>
          <Search size={icon.md} color={colors.textLight} />
          <TextInput
            style={s.search}
            placeholder={t('marketplace.search_product')}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.textLight}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <X size={icon.sm} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}
        contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm, alignItems: 'center' }}>
        {CATEGORIES.map(c => {
          const active = category === c.id
          return (
            <TouchableOpacity
              key={c.id}
              activeOpacity={0.7}
              style={[s.chip, active && s.chipActive]}
              onPress={() => setCategory(c.id)}>
              <Text style={s.chipEmoji}>{c.emoji}</Text>
              <Text style={[s.chipText, active && s.chipTextActive]}>{t(c.labelKey)}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Ταξινόμηση — ίδιες επιλογές με το web. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.sortRow}
        contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm, alignItems: 'center' }}>
        {SORTS.map(k => {
          const active = sort === k
          return (
            <TouchableOpacity key={k} activeOpacity={0.7}
              style={[s.sortChip, active && s.chipActive]}
              onPress={() => setSort(k)}>
              <Text style={[s.sortText, active && s.chipTextActive]}>{t(`marketplace.sort.${k}`)}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <FlatList
        data={products}
        ListHeaderComponent={
          <>
            <CampaignBanner page="marketplace" slot="banner" />
            {/* Πλήθος αποτελεσμάτων, όπως στο web. */}
            {!isLoading && total != null && (
              <Text style={s.count}>
                {t('marketplace.results_count', { count: total })}
                {category !== 'all' && ` · ${t(CATEGORIES.find(c => c.id === category)?.labelKey ?? '')}`}
              </Text>
            )}
          </>
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (productsQuery.hasNextPage && !productsQuery.isFetchingNextPage) productsQuery.fetchNextPage()
        }}
        ListFooterComponent={productsQuery.isFetchingNextPage
          ? <ActivityIndicator color={colors.brand} style={{ marginTop: space.md }} />
          : null}
        keyExtractor={i => i.id}
        numColumns={2}
        columnWrapperStyle={{ gap: space.md }}
        contentContainerStyle={{ padding: space.lg, paddingBottom: tabSpace.paddingBottom, gap: space.md }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }
        ListEmptyComponent={
          isLoading
            ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
                {[0, 1, 2, 3].map(i => (
                  <View key={i} style={[s.card, { width: '47.5%' }]}>
                    <View style={[s.imgBox, s.skeleton]} />
                    <View style={[s.skeleton, { height: 12, marginTop: space.sm, borderRadius: radius.sm }]} />
                    <View style={[s.skeleton, { height: 12, width: '50%', marginTop: space.xs, borderRadius: radius.sm }]} />
                  </View>
                ))}
              </View>
            : <View style={s.empty}>
                <Package size={icon.hero} color={colors.border} />
                <Text style={s.emptyTitle}>{t('marketplace.no_products')}</Text>
                <Text style={s.emptyText}>
                  {search ? t('common.try_another_search') : t('common.try_another_category')}
                </Text>
              </View>
        }
        renderItem={({ item }) => {
          const price = item.sale_price ?? item.price
          const onSale = item.sale_price != null && item.sale_price < item.price
          const busy = addToCart.isPending && addToCart.variables === item.id
          const justAdded = added === item.id
          return (
            <TouchableOpacity
              style={s.card}
              activeOpacity={0.85}
              onPress={() => router.push(`/products/${item.id}` as any)}>
              <View style={s.imgBox}>
                {item.image_url
                  ? <Image source={{ uri: item.image_url }} style={s.img} />
                  : <Package size={icon.xl} color={colors.border} />}
                {isAuthenticated && (
                  <TouchableOpacity style={s.heartBtn} hitSlop={8}
                    accessibilityLabel={t('wishlist.title')}
                    disabled={toggleWish.isPending && toggleWish.variables === item.id}
                    onPress={() => toggleWish.mutate(item.id)}>
                    <Heart size={icon.sm} color={isWished(item.id) ? colors.danger : colors.textLight}
                      fill={isWished(item.id) ? colors.danger : 'transparent'} />
                  </TouchableOpacity>
                )}
                {onSale && (
                  <View style={s.saleTag}>
                    <Text style={s.saleText}>
                      -{Math.round((1 - item.sale_price / item.price) * 100)}%
                    </Text>
                  </View>
                )}
              </View>

              <Text style={s.name} numberOfLines={2}>{item.name}</Text>

              {item.reviews_count > 0 && (
                <View style={s.ratingRow}>
                  <Star size={icon.xs} color={colors.accent} fill={colors.accent} />
                  <Text style={s.rating}>{item.rating?.toFixed(1)} ({item.reviews_count})</Text>
                </View>
              )}

              <View style={s.priceRow}>
                <Text style={s.price}>€{Number(price ?? 0).toFixed(2)}</Text>
                {onSale && <Text style={s.oldPrice}>€{Number(item.price ?? 0).toFixed(2)}</Text>}
              </View>

              <TouchableOpacity
                style={[s.addBtn, justAdded && s.addBtnDone]}
                activeOpacity={0.8}
                disabled={busy || item.stock === 0}
                onPress={() => handleAdd(item.id)}>
                <Text style={[s.addText, justAdded && s.addTextDone]}>
                  {item.stock === 0 ? t('marketplace.out_of_stock')
                    : justAdded ? t('marketplace.added')
                    : busy ? '…'
                    : t('marketplace.in_cart')}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    // Σταθερό και ασφαλές: η κεφαλίδα μπορεί να αποδοθεί σε πολλά
    // σημεία της ίδιας οθόνης (συνδεδεμένος / αποσυνδεδεμένος χρήστης),
    // και inline παράκαμψη θα ίσχυε μόνο σε όποια θυμηθεί κανείς.
    paddingTop: HEADER_TOP,
    backgroundColor: colors.navy,
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: space.md,
  },
  title: { ...type.title, color: colors.textOnDark, fontWeight: weight.bold },
  cartBtn: {
    width: touch.min, height: touch.min, borderRadius: radius.md,
    backgroundColor: colors.navySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    backgroundColor: colors.surface,
    height: touch.comfortable,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
  },
  search: { flex: 1, ...type.body, color: colors.text, padding: 0 },

  filterRow: { paddingTop: space.lg, maxHeight: 68, flexGrow: 0 },
  sortRow: { paddingTop: space.sm, maxHeight: 52, flexGrow: 0 },
  sortChip: {
    paddingHorizontal: space.md, height: 36, justifyContent: 'center',
    borderRadius: radius.full, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  sortText: { ...type.caption, color: colors.textMuted, fontWeight: weight.semibold },
  count: { ...type.caption, color: colors.textMuted, marginBottom: space.sm },
  heartBtn: {
    position: 'absolute', top: space.sm, right: space.sm,
    width: 30, height: 30, borderRadius: radius.full,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: space.xs,
    paddingHorizontal: space.lg,
    height: touch.min,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.brandLight, borderColor: colors.brand },
  chipEmoji: { fontSize: 16 },
  chipText: { ...type.body, color: colors.textMuted, fontWeight: weight.semibold },
  chipTextActive: { color: colors.brand, fontWeight: weight.bold },

  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    ...shadow.sm,
  },
  imgBox: {
    height: 130, borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  img: { width: '100%', height: '100%' },
  saleTag: {
    position: 'absolute', top: space.sm, left: space.sm,
    backgroundColor: colors.danger,
    paddingHorizontal: space.sm, paddingVertical: 2,
    borderRadius: radius.sm,
  },
  saleText: { ...type.caption, color: '#fff', fontWeight: weight.bold },

  name: {
    ...type.caption, color: colors.text, fontWeight: weight.semibold,
    marginTop: space.sm, minHeight: 32,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs },
  rating: { ...type.caption, color: colors.textMuted },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs, marginTop: space.xs },
  price: { ...type.emphasis, color: colors.brand, fontWeight: weight.bold },
  oldPrice: { ...type.caption, color: colors.textLight, textDecorationLine: 'line-through' },

  addBtn: {
    marginTop: space.sm,
    height: touch.min,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnDone: { backgroundColor: colors.successBg },
  addText: { ...type.caption, color: '#fff', fontWeight: weight.bold },
  addTextDone: { color: colors.success },

  skeleton: { backgroundColor: colors.surfaceAlt },

  empty: { alignItems: 'center', paddingTop: 80, gap: space.sm },
  emptyTitle: { ...type.emphasis, color: colors.text, fontWeight: weight.semibold, marginTop: space.md },
  emptyText: { ...type.body, color: colors.textMuted },
})
