import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { api } from '../src/lib/api'
import { useAuthStore } from '../src/store/auth'

const ORANGE = '#E65100'

export default function PlaydatesScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()

  const { data = [], isLoading } = useQuery({
    queryKey: ['playdates'],
    queryFn: () => api.get('/playdates').then(r => r.data?.data ?? []),
  })

  const join = useMutation({
    mutationFn: (id: string) => api.post(`/playdates/${id}/join`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['playdates'] }); Alert.alert('✅', 'Συμμετείχατε!') },
    onError: () => Alert.alert('Σφάλμα', 'Δεν ήταν δυνατή η συμμετοχή'),
  })

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.backText}>‹</Text></TouchableOpacity>
        <Text style={s.title}>Playdates</Text>
        <View style={{ width: 32 }} />
      </View>

      {isLoading ? <ActivityIndicator color={ORANGE} style={{ marginTop: 40 }} /> :
        data.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🐾</Text>
            <Text style={s.emptyText}>Δεν υπάρχουν playdates</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {data.map((event: any) => (
              <View key={event.id} style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.emoji}>{event.pet_type === 'cat' ? '🐱' : '🐶'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>{event.title}</Text>
                    <Text style={s.cardSub}>📍 {event.location}</Text>
                  </View>
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{event.participants_count || 0} 🐾</Text>
                  </View>
                </View>
                <Text style={s.date}>📅 {event.date} {event.time}</Text>
                {event.description && <Text style={s.desc} numberOfLines={2}>{event.description}</Text>}
                {isAuthenticated && !event.is_joined && (
                  <TouchableOpacity style={s.joinBtn} onPress={() => join.mutate(event.id)}>
                    <Text style={s.joinText}>Συμμετοχή</Text>
                  </TouchableOpacity>
                )}
                {event.is_joined && <Text style={s.joinedText}>✅ Συμμετέχετε</Text>}
              </View>
            ))}
          </ScrollView>
        )}
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backText: { color: ORANGE, fontSize: 24, width: 32 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 }, emptyText: { fontSize: 16, color: '#6B7280' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  emoji: { fontSize: 32 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardSub: { fontSize: 13, color: '#6B7280' },
  badge: { backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '700', color: ORANGE },
  date: { fontSize: 13, color: '#374151', marginBottom: 6 },
  desc: { fontSize: 13, color: '#6B7280', marginBottom: 10 },
  joinBtn: { backgroundColor: ORANGE, borderRadius: 12, padding: 12, alignItems: 'center' },
  joinText: { color: '#fff', fontWeight: '700' },
  joinedText: { color: '#10B981', fontWeight: '600', textAlign: 'center', marginTop: 4 },
})