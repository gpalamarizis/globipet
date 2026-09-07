import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  FlatList, Image, RefreshControl,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Search, X, ShoppingCart, Package, Star } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { useAuthStore } from '../../src/store/auth'
import { colors, space, radius, type, weight, shadow, icon, touch } from '@/theme'

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

const CATEGORIES = [
  { id: 'all',         label: 'Όλα',       emoji: '🛍️' },
  { id: 'food',        label: 'Τροφές',    emoji: '🦴' },
  { id: 'toys',        label: 'Παιχνίδια', emoji: '🎾' },
  { id: 'accessories', label: 'Αξεσουάρ',  emoji: '🎀' },
  { id: 'health',      label: 'Υγεία',     emoji: '💊' },
  { id: 'hygiene',     label: 'Υγιεινή',   emoji: '🛁' },
]

export default function MarketplaceScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [refreshing, setRefreshing] = useState(false)
  const [added, setAdded] = useState<string | null>(null)

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', category, search],
    queryFn: () => api.get('/products', {
      params: {
        ...(category !== 'all' ? { category } : {}),
        ...(search ? { q: search } : {}),
        limit: 30,
      },
    }).then(r => r.data?.data ?? []),
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
          <Text style={s.title}>Κατάστημα</Text>
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
            placeholder="Αναζήτηση προϊόντος"
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterRow}
        contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm }}>
        {CATEGORIES.map(c => {
          const active = category === c.id
          return (
            <TouchableOpacity
              key={c.id}
              activeOpacity={0.7}
              style={[s.chip, active && s.chipActive]}
              onPress={() => setCategory(c.id)}>
              <Text style={s.chipEmoji}>{c.emoji}</Text>
              <Text style={[s.chipText, active && s.chipTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <FlatList
        data={products}
        keyExtractor={i => i.id}
        numColumns={2}
        columnWrapperStyle={{ gap: space.md }}
        contentContainerStyle={{ padding: space.lg, paddingBottom: 100, gap: space.md }}
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
                <Text style={s.emptyTitle}>Δεν βρέθηκαν προϊόντα</Text>
                <Text style={s.emptyText}>
                  {search ? 'Δοκίμασε άλλη αναζήτηση' : 'Δοκίμασε άλλη κατηγορία'}
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
                <Text style={s.price}>€{price}</Text>
                {onSale && <Text style={s.oldPrice}>€{item.price}</Text>}
              </View>

              <TouchableOpacity
                style={[s.addBtn, justAdded && s.addBtnDone]}
                activeOpacity={0.8}
                disabled={busy || item.stock === 0}
                onPress={() => handleAdd(item.id)}>
                <Text style={[s.addText, justAdded && s.addTextDone]}>
                  {item.stock === 0 ? 'Εξαντλήθηκε'
                    : justAdded ? '✓ Προστέθηκε'
                    : busy ? '…'
                    : 'Στο καλάθι'}
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
    backgroundColor: colors.navy,
    paddingTop: space.xxxl + space.lg,
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

  filterRow: { paddingVertical: space.lg, maxHeight: 68, flexGrow: 0 },
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
