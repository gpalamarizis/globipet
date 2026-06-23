import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, FlatList, Image } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { api } from '../../src/lib/api'
import { useAuthStore } from '../../src/store/auth'

const O = '#E65100'

const CATEGORIES = [
  { id: 'all',         label: 'Όλα',        emoji: '🛍️' },
  { id: 'food',        label: 'Τροφές',     emoji: '🦴' },
  { id: 'toys',        label: 'Παιχνίδια',  emoji: '🎾' },
  { id: 'accessories', label: 'Αξεσουάρ',   emoji: '🎀' },
  { id: 'health',      label: 'Υγεία',      emoji: '💊' },
  { id: 'hygiene',     label: 'Υγιεινή',    emoji: '🛁' },
]

export default function MarketplaceScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', category, search],
    queryFn: () => api.get(`/products?${category !== 'all' ? `category=${category}&` : ''}search=${search}&limit=30`).then(r => r.data?.data ?? []),
  })

  const addToCart = useMutation({
    mutationFn: (productId: string) => api.post('/cart', { product_id: productId, quantity: 1 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  })

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Κατάστημα</Text>
        <View style={s.searchRow}>
          <Text>🔍</Text>
          <TextInput style={s.search} placeholder="Αναζήτηση..." value={search}
            onChangeText={setSearch} placeholderTextColor="#9CA3AF" />
        </View>
      </View>

      {/* Category filter — wrap */}
      <View style={s.filterWrap}>
        {CATEGORIES.map(c => (
          <TouchableOpacity key={c.id} style={[s.chip, category === c.id && s.chipActive]}
            onPress={() => setCategory(c.id)}>
            <Text style={s.chipEmoji}>{c.emoji}</Text>
            <Text style={[s.chipText, category === c.id && s.chipTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={products}
        keyExtractor={i => i.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 10 }}
        contentContainerStyle={{ padding: 12, paddingBottom: 100, gap: 10 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>{isLoading ? '⏳' : '🔍'}</Text>
            <Text style={s.emptyText}>{isLoading ? 'Φόρτωση...' : 'Δεν βρέθηκαν προϊόντα'}</Text>
          </View>
        }
        renderItem={({ item }: any) => (
          <TouchableOpacity style={s.card} activeOpacity={0.8}
            onPress={() => router.push(`/products/${item.id}` as any)}>
            <View style={s.imgBox}>
              {item.image_url
                ? <Image source={{ uri: item.image_url }} style={s.img} />
                : <Text style={{ fontSize: 36 }}>🛍️</Text>}
            </View>
            <Text style={s.name} numberOfLines={2}>{item.name}</Text>
            {item.brand && <Text style={s.brand}>{item.brand}</Text>}
            <View style={s.priceRow}>
              <Text style={s.price}>€{item.price}</Text>
              <TouchableOpacity style={s.cartBtn}
                onPress={(e) => { e.stopPropagation(); if (isAuthenticated) addToCart.mutate(item.id) }}>
                <Text style={s.cartBtnText}>+ Καλάθι</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 10 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, gap: 8 },
  search: { flex: 1, fontSize: 14, color: '#111827' },
  filterWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6' },
  chipActive: { backgroundColor: O },
  chipEmoji: { fontSize: 13 },
  chipText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
  imgBox: { width: '100%', height: 110, borderRadius: 10, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' },
  img: { width: '100%', height: 110 },
  name: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 2 },
  brand: { fontSize: 11, color: '#9CA3AF', marginBottom: 6 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 15, fontWeight: '800', color: O },
  cartBtn: { backgroundColor: O, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  cartBtnText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 16 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: '#9CA3AF', fontSize: 15 },
})