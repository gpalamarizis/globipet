import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, FlatList, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { api } from '../../src/lib/api'

const types = [
  { value: 'all', label: 'Όλες', emoji: '🔍' },
  { value: 'grooming', label: 'Grooming', emoji: '✂️' },
  { value: 'veterinary', label: 'Κτηνίατρος', emoji: '🩺' },
  { value: 'walking', label: 'Βόλτες', emoji: '🚶' },
  { value: 'pet_sitting', label: 'Sitting', emoji: '🏠' },
  { value: 'training', label: 'Εκπαίδευση', emoji: '🎓' },
  { value: 'boarding', label: 'Boarding', emoji: '🛏️' },
  { value: 'pet_taxi', label: 'Taxi', emoji: '🚕' },
  { value: 'insurance', label: 'Ασφάλιση', emoji: '🛡️' },
]

export default function ServicesScreen() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [onlyVerified, setOnlyVerified] = useState(false)
  const [onlyEmergency, setOnlyEmergency] = useState(false)

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services', type, search, onlyVerified, onlyEmergency],
    queryFn: () => api.get('/services', {
      params: {
        service_type: type !== 'all' ? type : undefined,
        q: search || undefined,
        verified: onlyVerified || undefined,
        emergency: onlyEmergency || undefined,
        limit: 20,
      }
    }).then(r => r.data?.data ?? []),
  })

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Υπηρεσίες</Text>
        <TextInput style={styles.search} placeholder="🔍  Αναζήτηση..." value={search}
          onChangeText={setSearch} placeholderTextColor="#9CA3AF" />
        <View style={styles.quickFilters}>
          <TouchableOpacity style={[styles.quickChip, onlyVerified && styles.quickChipActive]}
            onPress={() => setOnlyVerified(!onlyVerified)}>
            <Text style={[styles.quickChipText, onlyVerified && styles.quickChipTextActive]}>✓ Επαληθευμένοι</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickChip, onlyEmergency && styles.quickChipActiveRed]}
            onPress={() => setOnlyEmergency(!onlyEmergency)}>
            <Text style={[styles.quickChipText, onlyEmergency && styles.quickChipTextActive]}>🚨 Έκτακτα</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}
        contentContainerStyle={{ paddingHorizontal: 16 }}>
        {types.map(t => (
          <TouchableOpacity key={t.value} style={[styles.filterChip, type === t.value && styles.filterChipActive]}
            onPress={() => t.value === 'insurance' ? router.push('/insurance') : setType(t.value)}>
            <Text style={styles.filterEmoji}>{t.emoji}</Text>
            <Text style={[styles.filterText, type === t.value && styles.filterTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator color="#E65100" size="large"/></View>
      ) : (
        <FlatList data={services} keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }: any) => (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/services/${item.id}`)}>
              <View style={styles.cardAvatar}>
                <Text style={styles.cardAvatarText}>{item.title?.[0] || '🐾'}</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardName} numberOfLines={1}>{item.title}</Text>
                  {item.is_verified && <Text style={styles.verifiedBadge}>✓</Text>}
                </View>
                <Text style={styles.cardType}>{item.category} · {item.city}</Text>
                <View style={styles.cardMeta}>
                  <Text style={styles.cardRating}>⭐ {item.rating?.toFixed(1) || '5.0'}</Text>
                  <Text style={styles.cardReviews}>{item.review_count || 0} κριτικές</Text>
                  {item.emergency_available && <Text style={styles.emergencyBadge}>🚨 Έκτακτα</Text>}
                </View>
              </View>
              <View style={styles.cardRight}>
                <TouchableOpacity style={styles.bookBtn} onPress={() => router.push(`/services/${item.id}`)}>
                  <Text style={styles.bookBtnText}>Κράτηση</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>Δεν βρέθηκαν υπηρεσίες</Text>
              <Text style={styles.emptySubtitle}>Δοκιμάστε διαφορετικά φίλτρα</Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 12 },
  search: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827', marginBottom: 10 },
  quickFilters: { flexDirection: 'row', gap: 8 },
  quickChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  quickChipActive: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  quickChipActiveRed: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  quickChipText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  quickChipTextActive: { color: '#fff', fontWeight: '700' },
  filters: { backgroundColor: '#fff', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  filterChipActive: { backgroundColor: '#E65100' },
  filterEmoji: { fontSize: 13 },
  filterText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  filterTextActive: { color: '#fff', fontWeight: '700' },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardAvatarText: { fontSize: 22, fontWeight: '700', color: '#E65100' },
  cardContent: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1 },
  verifiedBadge: { fontSize: 12, color: '#10B981', fontWeight: '700' },
  cardType: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardRating: { fontSize: 12, color: '#F59E0B', fontWeight: '600' },
  cardReviews: { fontSize: 11, color: '#9CA3AF' },
  emergencyBadge: { fontSize: 11, color: '#DC2626', fontWeight: '600' },
  cardRight: { alignItems: 'flex-end', justifyContent: 'center' },
  bookBtn: { backgroundColor: '#E65100', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  bookBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#9CA3AF' },
})
