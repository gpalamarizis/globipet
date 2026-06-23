import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, FlatList, Image } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { api } from '../../src/lib/api'

const O = '#E65100'

const SERVICE_TYPES = [
  { id: 'all',         label: 'Όλες',         emoji: '🐾' },
  { id: 'grooming',    label: 'Περιποίηση',   emoji: '✂️' },
  { id: 'veterinary',  label: 'Κτηνίατρος',  emoji: '🩺' },
  { id: 'walking',     label: 'Βόλτες',       emoji: '🚶' },
  { id: 'pet_sitting', label: 'Φιλοξενία',    emoji: '🏠' },
  { id: 'training',    label: 'Εκπαίδευση',   emoji: '🎓' },
  { id: 'pet_taxi',    label: 'Taxi',          emoji: '🚗' },
  { id: 'photography', label: 'Φωτογράφηση',  emoji: '📸' },
  { id: 'pharmacy',    label: 'Φαρμακείο',    emoji: '💊' },
  { id: 'legal',       label: 'Νομικά',        emoji: '⚖️' },
]

export default function ServicesScreen() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services', type, search],
    queryFn: () => api.get(`/services?${type !== 'all' ? `service_type=${type}&` : ''}search=${search}&limit=30`).then(r => r.data?.data ?? []),
  })

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Υπηρεσίες</Text>
        <View style={s.searchRow}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput style={s.search} placeholder="Αναζήτηση..." value={search}
            onChangeText={setSearch} placeholderTextColor="#9CA3AF" />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}><Text style={s.clearBtn}>✕</Text></TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category filter — wrap, no scroll */}
      <View style={s.filterContainer}>
        <View style={s.filterWrap}>
          {SERVICE_TYPES.map(t => (
            <TouchableOpacity key={t.id} style={[s.chip, type === t.id && s.chipActive]}
              onPress={() => setType(t.id)}>
              <Text style={s.chipEmoji}>{t.emoji}</Text>
              <Text style={[s.chipText, type === t.id && s.chipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Results */}
      <FlatList
        data={services}
        keyExtractor={i => i.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>{isLoading ? '⏳' : '🔍'}</Text>
            <Text style={s.emptyText}>{isLoading ? 'Φόρτωση...' : 'Δεν βρέθηκαν υπηρεσίες'}</Text>
          </View>
        }
        renderItem={({ item }: any) => (
          <TouchableOpacity style={s.card} onPress={() => router.push(`/services/${item.id}` as any)} activeOpacity={0.7}>
            {/* Avatar / photo */}
            <View style={s.avatar}>
              {item.image_url
                ? <Image source={{ uri: item.image_url }} style={s.avatarImg} />
                : <Text style={s.avatarEmoji}>
                    {item.service_type === 'grooming' ? '✂️' : item.service_type === 'veterinary' ? '🩺' :
                     item.service_type === 'walking' ? '🚶' : item.service_type === 'training' ? '🎓' :
                     item.service_type === 'pet_taxi' ? '🚗' : '🐾'}
                  </Text>
              }
            </View>
            {/* Info */}
            <View style={s.info}>
              <Text style={s.name} numberOfLines={1}>{item.provider_name}</Text>
              <Text style={s.sub} numberOfLines={1}>
                {SERVICE_TYPES.find(t => t.id === item.service_type)?.label || item.service_type}
                {item.city ? ` · ${item.city}` : ''}
              </Text>
              <View style={s.ratingRow}>
                <Text style={s.star}>⭐</Text>
                <Text style={s.rating}>{item.rating?.toFixed(1) || '5.0'}</Text>
                <Text style={s.ratingCount}>({item.reviews_count || 0})</Text>
              </View>
            </View>
            {/* Price + book */}
            <View style={s.right}>
              <Text style={s.price}>€{item.price}</Text>
              <View style={s.bookBtn}>
                <Text style={s.bookText}>Κράτηση</Text>
              </View>
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
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  searchIcon: { fontSize: 15, marginRight: 8 },
  search: { flex: 1, fontSize: 14, color: '#111827' },
  clearBtn: { color: '#9CA3AF', fontSize: 16, paddingLeft: 8 },
  filterContainer: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  filterWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6' },
  chipActive: { backgroundColor: O },
  chipEmoji: { fontSize: 13 },
  chipText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
  avatar: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginRight: 12, overflow: 'hidden', flexShrink: 0 },
  avatarImg: { width: 52, height: 52, borderRadius: 14 },
  avatarEmoji: { fontSize: 22 },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  sub: { fontSize: 12, color: '#6B7280', marginBottom: 3 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  star: { fontSize: 11 },
  rating: { fontSize: 12, fontWeight: '700', color: '#111827' },
  ratingCount: { fontSize: 11, color: '#9CA3AF' },
  right: { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  price: { fontSize: 15, fontWeight: '800', color: O },
  bookBtn: { backgroundColor: O, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  bookText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: '#9CA3AF', fontSize: 15 },
})