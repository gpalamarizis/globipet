import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { api } from '../../src/lib/api'
import { useAuthStore } from '../../src/store/auth'

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Αναμονή',     color: '#92400E', bg: '#FEF3C7' },
  confirmed: { label: 'Επιβεβαιωμένη', color: '#065F46', bg: '#D1FAE5' },
  completed: { label: 'Ολοκληρώθηκε', color: '#1E40AF', bg: '#DBEAFE' },
  cancelled: { label: 'Ακυρώθηκε',   color: '#991B1B', bg: '#FEE2E2' },
}

export default function BookingsScreen() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
  const [refreshing, setRefreshing] = useState(false)

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings', activeTab],
    queryFn: () => api.get(`/bookings?status=${activeTab === 'upcoming' ? 'pending,confirmed' : 'completed,cancelled'}`).then(r => r.data?.data ?? []),
    enabled: isAuthenticated,
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/bookings/${id}/cancel`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  })

  const onRefresh = async () => {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['bookings'] })
    setRefreshing(false)
  }

  if (!isAuthenticated) return (
    <View style={styles.centered}>
      <Text style={styles.lockEmoji}>🔒</Text>
      <Text style={styles.guestTitle}>Συνδεθείτε για τις κρατήσεις σας</Text>
      <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/auth/login')}>
        <Text style={styles.loginBtnText}>Σύνδεση</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Κρατήσεις</Text>
        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
            onPress={() => setActiveTab('upcoming')}>
            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>Προσεχείς</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'past' && styles.tabActive]}
            onPress={() => setActiveTab('past')}>
            <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>Παρελθόν</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator color="#E65100" size="large"/></View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E65100"/>}>
          {bookings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📅</Text>
              <Text style={styles.emptyTitle}>Δεν υπάρχουν κρατήσεις</Text>
              <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/services')}>
                <Text style={styles.browseBtnText}>Δείτε υπηρεσίες</Text>
              </TouchableOpacity>
            </View>
          ) : bookings.map((b: any) => {
            const status = STATUS_LABELS[b.status] || STATUS_LABELS.pending
            return (
              <View key={b.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.serviceInfo}>
                    <View style={styles.serviceIcon}>
                      <Text style={styles.serviceIconText}>✂️</Text>
                    </View>
                    <View style={styles.serviceText}>
                      <Text style={styles.serviceName}>{b.service_name || 'Υπηρεσία'}</Text>
                      <Text style={styles.providerName}>{b.provider_name || 'Πάροχος'}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>

                <View style={styles.divider}/>

                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>📅</Text>
                    <Text style={styles.detailText}>
                      {b.appointment_date ? new Date(b.appointment_date).toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long' }) : '—'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>⏰</Text>
                    <Text style={styles.detailText}>{b.appointment_time || '—'}</Text>
                  </View>
                  {b.pet_name && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailIcon}>🐾</Text>
                      <Text style={styles.detailText}>{b.pet_name}</Text>
                    </View>
                  )}
                  {b.total_price && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailIcon}>💶</Text>
                      <Text style={styles.detailText}>€{b.total_price}</Text>
                    </View>
                  )}
                </View>

                {b.status === 'pending' || b.status === 'confirmed' ? (
                  <TouchableOpacity style={styles.cancelBtn}
                    onPress={() => cancelMutation.mutate(b.id)}>
                    <Text style={styles.cancelBtnText}>Ακύρωση κράτησης</Text>
                  </TouchableOpacity>
                ) : b.status === 'completed' ? (
                  <TouchableOpacity style={styles.rebookBtn}
                    onPress={() => router.push(`/services/${b.service_id}`)}>
                    <Text style={styles.rebookBtnText}>Νέα κράτηση</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 0, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 16 },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#E65100' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  tabTextActive: { color: '#E65100' },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  serviceInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  serviceIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  serviceIconText: { fontSize: 20 },
  serviceText: { flex: 1 },
  serviceName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  providerName: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  cardDetails: { gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailIcon: { fontSize: 14, width: 20 },
  detailText: { fontSize: 13, color: '#374151' },
  cancelBtn: { marginTop: 14, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#FCA5A5', alignItems: 'center' },
  cancelBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 14 },
  rebookBtn: { marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: '#FFF7ED', alignItems: 'center' },
  rebookBtnText: { color: '#E65100', fontWeight: '700', fontSize: 14 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  lockEmoji: { fontSize: 48, marginBottom: 16 },
  guestTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 24, textAlign: 'center' },
  loginBtn: { backgroundColor: '#E65100', borderRadius: 12, padding: 16, width: '100%', alignItems: 'center' },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginBottom: 20 },
  browseBtn: { backgroundColor: '#E65100', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  browseBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})
