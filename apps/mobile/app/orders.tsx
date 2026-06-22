import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { api } from '../src/lib/api'

const ORANGE = '#E65100'

export default function OrdersScreen() {
  const router = useRouter()
  const { data = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get('/orders/my').then(r => r.data?.data ?? []),
  })

  const statusLabel = (s: string) => ({ pending: 'Εκκρεμεί', confirmed: 'Επιβεβαιώθηκε', processing: 'Σε επεξεργασία', shipped: 'Εστάλη', delivered: 'Παραδόθηκε', cancelled: 'Ακυρώθηκε' }[s] || s)
  const statusColor = (s: string) => ({ confirmed: '#10B981', processing: '#3B82F6', shipped: '#8B5CF6', delivered: '#10B981', pending: '#F59E0B', cancelled: '#EF4444' }[s] || '#6B7280')

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.backText}>‹</Text></TouchableOpacity>
        <Text style={s.title}>Παραγγελίες</Text>
        <View style={{ width: 32 }} />
      </View>

      {isLoading ? <ActivityIndicator color={ORANGE} style={{ marginTop: 40 }} /> :
        data.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>📦</Text>
            <Text style={s.emptyText}>Δεν υπάρχουν παραγγελίες</Text>
            <TouchableOpacity style={s.shopBtn} onPress={() => router.push('/(tabs)/marketplace')}>
              <Text style={s.shopBtnText}>Πήγαινε στο Κατάστημα</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {data.map((order: any) => (
              <View key={order.id} style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.orderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
                  <View style={[s.badge, { backgroundColor: statusColor(order.status) + '20' }]}>
                    <Text style={[s.badgeText, { color: statusColor(order.status) }]}>{statusLabel(order.status)}</Text>
                  </View>
                </View>
                <Text style={s.date}>{new Date(order.created_at).toLocaleDateString('el-GR')}</Text>
                {(order.items || []).slice(0, 3).map((item: any, i: number) => (
                  <View key={i} style={s.item}>
                    <Text style={s.itemName}>{item.name || item.product_name}</Text>
                    <Text style={s.itemQty}>×{item.quantity}</Text>
                  </View>
                ))}
                {order.items?.length > 3 && <Text style={s.moreItems}>+{order.items.length - 3} ακόμα προϊόντα</Text>}
                <View style={s.footer}>
                  {order.tracking_number && <Text style={s.tracking}>🚚 {order.tracking_number}</Text>}
                  <Text style={s.total}>€{order.total_amount?.toFixed(2)}</Text>
                </View>
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
  emptyEmoji: { fontSize: 48, marginBottom: 12 }, emptyText: { fontSize: 16, color: '#6B7280', marginBottom: 20 },
  shopBtn: { backgroundColor: ORANGE, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  shopBtnText: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  orderId: { fontSize: 14, fontWeight: '700', color: '#111827' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  date: { fontSize: 12, color: '#9CA3AF', marginBottom: 10 },
  item: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  itemName: { fontSize: 13, color: '#374151', flex: 1 },
  itemQty: { fontSize: 13, color: '#6B7280' },
  moreItems: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  tracking: { fontSize: 12, color: '#6B7280' },
  total: { fontSize: 18, fontWeight: '800', color: ORANGE },
})