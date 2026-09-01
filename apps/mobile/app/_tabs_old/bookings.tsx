import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../src/store/auth'
import { useRouter } from 'expo-router'
import { api } from '../../src/lib/api'

const statusColor: Record<string,string> = { pending:'#FEF3C7', confirmed:'#D1FAE5', completed:'#DBEAFE', cancelled:'#FEE2E2' }
const statusText: Record<string,string> = { pending:'Εκκρεμεί', confirmed:'Επιβεβ.', completed:'Ολοκλ.', cancelled:'Ακυρ.' }

export default function BookingsScreen() {
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()

  const { data: bookings = [] } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => api.get('/bookings/my').then(r => r.data?.data ?? []),
    enabled: isAuthenticated,
  })

  if (!isAuthenticated) return (
    <View style={styles.center}>
      <Text style={styles.emoji}>🔒</Text>
      <TouchableOpacity style={styles.btn} onPress={() => router.push('/auth/login')}>
        <Text style={styles.btnText}>Σύνδεση</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Κρατήσεις</Text>
      </View>
      <FlatList data={bookings} keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }: any) => (
          <View style={styles.card}>
            <View style={styles.cardIcon}><Text style={{ fontSize: 24 }}>✂️</Text></View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{item.service_name || 'Υπηρεσία'}</Text>
              <Text style={styles.cardDate}>{item.scheduled_at ? new Date(item.scheduled_at).toLocaleDateString('el-GR') : '—'}</Text>
              <Text style={styles.cardProvider}>{item.provider_name || '—'}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor[item.status] || '#F3F4F6' }]}>
              <Text style={styles.statusText}>{statusText[item.status] || item.status}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyEmoji}>📅</Text><Text style={styles.emptyText}>Δεν υπάρχουν κρατήσεις</Text></View>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  cardDate: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  cardProvider: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700', color: '#374151' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
  emoji: { fontSize: 48, marginBottom: 16 },
  btn: { backgroundColor: '#E65100', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  btnText: { color: '#fff', fontWeight: '700' },
})
