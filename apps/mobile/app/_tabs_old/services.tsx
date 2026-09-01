import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, FlatList } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { api } from '../../src/lib/api'

const types = ['all','grooming','veterinary','walking','pet_sitting','training','boarding','pet_taxi']
const typeLabels: Record<string,string> = { all:'Όλες', grooming:'Grooming', veterinary:'Κτηνίατρος', walking:'Βόλτες', pet_sitting:'Sitting', training:'Εκπαίδευση', boarding:'Boarding', pet_taxi:'Taxi' }

export default function ServicesScreen() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services', type, search],
    queryFn: () => api.get(`/services?type=${type !== 'all' ? type : ''}&search=${search}&limit=20`).then(r => r.data?.data ?? []),
  })

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Υπηρεσίες</Text>
        <TextInput style={styles.search} placeholder="🔍  Αναζήτηση..." value={search}
          onChangeText={setSearch} placeholderTextColor="#9CA3AF" />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {types.map(t => (
          <TouchableOpacity key={t} style={[styles.filterChip, type === t && styles.filterChipActive]} onPress={() => setType(t)}>
            <Text style={[styles.filterText, type === t && styles.filterTextActive]}>{typeLabels[t]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList data={services} keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }: any) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/services/${item.id}`)}>
            <View style={styles.cardAvatar}>
              <Text style={styles.cardAvatarText}>{item.name?.[0] || '🐾'}</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardType}>{item.type} · {item.duration_minutes} λεπτά</Text>
              <Text style={styles.cardRating}>⭐ {item.rating || '5.0'} · {item.reviews_count || 0} κριτικές</Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.cardPrice}>€{item.price}</Text>
              <TouchableOpacity style={styles.bookBtn}>
                <Text style={styles.bookBtnText}>Κράτηση</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Δεν βρέθηκαν υπηρεσίες</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 12 },
  search: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827' },
  filters: { backgroundColor: '#fff', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  filterChipActive: { backgroundColor: '#E65100' },
  filterText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  filterTextActive: { color: '#fff', fontWeight: '700' },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardAvatarText: { fontSize: 20, fontWeight: '700', color: '#E65100' },
  cardContent: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  cardType: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  cardRating: { fontSize: 12, color: '#6B7280' },
  cardRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  cardPrice: { fontSize: 15, fontWeight: '700', color: '#E65100' },
  bookBtn: { backgroundColor: '#E65100', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginTop: 6 },
  bookBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
})
