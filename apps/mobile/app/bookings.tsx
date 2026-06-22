import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { api } from '../src/lib/api'

const ORANGE = '#E65100'

export default function BookingsScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')

  const { data = [], isLoading } = useQuery({
    queryKey: ['bookings', tab],
    queryFn: () => api.get(`/bookings?tab=${tab}`).then(r => r.data?.data ?? []),
  })

  const cancel = useMutation({
    mutationFn: (id: string) => api.patch(`/bookings/${id}`, { status: 'cancelled' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bookings'] }); Alert.alert('Ακυρώθηκε') },
  })

  const statusColor = (s: string) => ({ confirmed: '#10B981', pending: '#F59E0B', cancelled: '#EF4444' }[s] || '#6B7280')
  const statusLabel = (s: string) => ({ confirmed: 'Επιβεβαιωμένη', pending: 'Εκκρεμεί', cancelled: 'Ακυρώθηκε' }[s] || s)

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={s.backText}>‹</Text></TouchableOpacity>
        <Text style={s.title}>Κρατήσεις</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tab === 'upcoming' && s.tabActive]} onPress={() => setTab('upcoming')}>
          <Text style={[s.tabText, tab === 'upcoming' && s.tabActive && { color: '#111827' }]}>Επερχόμενες</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'past' && s.tabActive]} onPress={() => setTab('past')}>
          <Text style={[s.tabText, tab === 'past' && s.tabActive && { color: '#111827' }]}>Παρελθόν</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? <ActivityIndicator color={ORANGE} style={{ marginTop: 40 }} /> :
        data.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>📅</Text>
            <Text style={s.emptyText}>Δεν υπάρχουν κρατήσεις</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {data.map((b: any) => (
              <View key={b.id} style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.cardTitle}>{b.service_name || b.provider_name}</Text>
                  <View style={[s.badge, { backgroundColor: statusColor(b.status) + '20' }]}>
                    <Text style={[s.badgeText, { color: statusColor(b.status) }]}>{statusLabel(b.status)}</Text>
                  </View>
                </View>
                <Text style={s.cardInfo}>👤 {b.provider_name}</Text>
                <Text style={s.cardInfo}>📅 {b.booking_date} στις {b.booking_time}</Text>
                {b.pet_name && <Text style={s.cardInfo}>🐾 {b.pet_name}</Text>}
                <Text style={s.cardPrice}>€{b.total_price}</Text>
                {tab === 'upcoming' && b.status !== 'cancelled' && (
                  <TouchableOpacity style={s.cancelBtn} onPress={() => Alert.alert('Ακύρωση', 'Ακύρωση κράτησης;', [
                    { text: 'Όχι', style: 'cancel' },
                    { text: 'Ναι', style: 'destructive', onPress: () => cancel.mutate(b.id) },
                  ])}>
                    <Text style={s.cancelText}>Ακύρωση</Text>
                  </TouchableOpacity>
                )}
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
  backBtn: { width: 32 }, backText: { color: ORANGE, fontSize: 24 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  tabs: { flexDirection: 'row', margin: 16, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', elevation: 2 },
  tabText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 }, emptyText: { fontSize: 16, color: '#6B7280' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardInfo: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  cardPrice: { fontSize: 16, fontWeight: '700', color: ORANGE, marginTop: 8 },
  cancelBtn: { marginTop: 12, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#FCA5A5', alignItems: 'center' },
  cancelText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
})