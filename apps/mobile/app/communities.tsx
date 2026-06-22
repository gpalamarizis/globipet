import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { api } from '../src/lib/api'
import { useAuthStore } from '../src/store/auth'

const ORANGE = '#E65100'

export default function CommunitiesScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()

  const { data = [], isLoading } = useQuery({
    queryKey: ['communities'],
    queryFn: () => api.get('/communities').then(r => r.data?.data ?? []),
  })

  const join = useMutation({
    mutationFn: (id: string) => api.post(`/communities/${id}/join`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['communities'] }); Alert.alert('✅', 'Εγγραφήκατε!') },
  })

  const typeEmoji: Record<string, string> = { dogs: '🐶', cats: '🐱', birds: '🐦', rabbits: '🐰', general: '🐾' }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.backText}>‹</Text></TouchableOpacity>
        <Text style={s.title}>Κοινότητες</Text>
        <View style={{ width: 32 }} />
      </View>

      {isLoading ? <ActivityIndicator color={ORANGE} style={{ marginTop: 40 }} /> :
        data.length === 0 ? (
          <View style={s.empty}><Text style={s.emptyEmoji}>🏘️</Text><Text style={s.emptyText}>Δεν υπάρχουν κοινότητες</Text></View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {data.map((c: any) => (
              <View key={c.id} style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.emoji}>{typeEmoji[c.type] || '🐾'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>{c.name}</Text>
                    <Text style={s.members}>{c.members_count || 0} μέλη</Text>
                  </View>
                  {c.is_private && <Text style={s.privateBadge}>🔒</Text>}
                </View>
                {c.description && <Text style={s.desc} numberOfLines={2}>{c.description}</Text>}
                {isAuthenticated && !c.is_member && (
                  <TouchableOpacity style={s.joinBtn} onPress={() => join.mutate(c.id)}>
                    <Text style={s.joinText}>Εγγραφή</Text>
                  </TouchableOpacity>
                )}
                {c.is_member && <Text style={s.memberText}>✅ Μέλος</Text>}
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
  members: { fontSize: 12, color: '#9CA3AF' },
  privateBadge: { fontSize: 18 },
  desc: { fontSize: 13, color: '#6B7280', marginBottom: 10 },
  joinBtn: { backgroundColor: ORANGE, borderRadius: 12, padding: 12, alignItems: 'center' },
  joinText: { color: '#fff', fontWeight: '700' },
  memberText: { color: '#10B981', fontWeight: '600', textAlign: 'center' },
})