import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, TextInput, Image, StyleSheet, Dimensions } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { api } from '../../src/lib/api'

const { width } = Dimensions.get('window')

export default function MarketplaceScreen() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  const { data: products = [] } = useQuery({
    queryKey: ['products', category, search],
    queryFn: () => api.get(`/products?category=${category !== 'all' ? category : ''}&search=${search}&limit=20`).then(r => r.data?.data ?? []),
  })

  const categories = ['all','food','toys','accessories','health','grooming']
  const catLabels: Record<string,string> = { all:'Όλα', food:'Τροφές', toys:'Παιχνίδια', accessories:'Αξεσουάρ', health:'Υγεία', grooming:'Grooming' }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Κατάστημα</Text>
        <TextInput style={styles.search} placeholder="🔍  Αναζήτηση..." value={search}
          onChangeText={setSearch} placeholderTextColor="#9CA3AF" />
        <FlatList horizontal data={categories} keyExtractor={i => i} showsHorizontalScrollIndicator={false}
          style={{ marginTop: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.chip, category === item && styles.chipActive]} onPress={() => setCategory(item)}>
              <Text style={[styles.chipText, category === item && styles.chipTextActive]}>{catLabels[item]}</Text>
            </TouchableOpacity>
          )} />
      </View>

      <FlatList data={products} keyExtractor={i => i.id} numColumns={2}
        contentContainerStyle={{ padding: 8 }}
        renderItem={({ item }: any) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/marketplace/${item.id}`)}>
            <View style={styles.imgContainer}>
              {item.images?.[0] ? <Image source={{ uri: item.images[0] }} style={styles.img} />
                : <Text style={{ fontSize: 36 }}>📦</Text>}
            </View>
            <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.price}>€{item.price}</Text>
              <TouchableOpacity style={styles.addBtn}>
                <Text style={styles.addBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Δεν βρέθηκαν προϊόντα</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 12 },
  search: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  chipActive: { backgroundColor: '#E65100' },
  chipText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  card: { width: (width - 24) / 2, backgroundColor: '#fff', borderRadius: 16, margin: 4, padding: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  imgContainer: { height: 120, borderRadius: 12, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  name: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 8, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 15, fontWeight: '800', color: '#E65100' },
  addBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#E65100', alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 22 },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
})
