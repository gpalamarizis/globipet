import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, Modal, ActivityIndicator } from 'react-native'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { api } from '../src/lib/api'
import { useAuthStore } from '../src/store/auth'

const ORANGE = '#E65100'

export default function TelehealthScreen() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [tab, setTab] = useState<'now' | 'scheduled'>('now')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('10:00')

  const { data: availableVets = [], isLoading: loadingNow, refetch } = useQuery({
    queryKey: ['telehealth-available'],
    queryFn: () => api.get('/telehealth/available-now').then(r => r.data?.data ?? []),
    refetchInterval: 30000,
  })

  const { data: allVets = [], isLoading: loadingAll } = useQuery({
    queryKey: ['telehealth-vets'],
    queryFn: () => api.get('/services?service_type=veterinary&limit=24').then(r => r.data?.data ?? []),
    enabled: tab === 'scheduled',
  })

  const vets = tab === 'now' ? availableVets : allVets
  const filtered = vets.filter((v: any) => v.provider_name?.toLowerCase().includes(search.toLowerCase()))
  const isLoading = tab === 'now' ? loadingNow : loadingAll

  const book = useMutation({
    mutationFn: () => api.post('/telehealth', {
      provider_email: selected.provider_email,
      provider_name: selected.provider_name,
      service_id: selected.id,
      scheduled_date: tab === 'now' ? new Date().toISOString().split('T')[0] : date,
      scheduled_time: tab === 'now' ? new Date().toTimeString().slice(0, 5) : time,
      duration: 30,
      price: selected.price,
    }),
    onSuccess: (res) => {
      setSelected(null)
      if (res.data?.checkoutUrl) {
        Alert.alert('Πληρωμή', `Μεταφορά στο Viva Wallet για πληρωμή €${selected.price}`, [
          { text: 'Άκυρο', style: 'cancel' },
          { text: 'Πλήρωσε', onPress: () => Alert.alert('Σύντομα', 'Άνοιγμα browser για πληρωμή') },
        ])
      }
    },
    onError: () => Alert.alert('Σφάλμα', 'Δεν ήταν δυνατή η κράτηση'),
  })

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹ Πίσω</Text>
        </TouchableOpacity>
        <Text style={s.title}>Τηλεϊατρική</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tab === 'now' && s.tabActive]} onPress={() => setTab('now')}>
          <Text style={[s.tabText, tab === 'now' && s.tabTextActive]}>
            ⚡ Τώρα {availableVets.length > 0 ? `(${availableVets.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'scheduled' && s.tabActive]} onPress={() => setTab('scheduled')}>
          <Text style={[s.tabText, tab === 'scheduled' && s.tabTextActive]}>📅 Προγραμματισμένη</Text>
        </TouchableOpacity>
      </View>

      <TextInput style={s.search} placeholder="Αναζήτηση κτηνιάτρου..." value={search} onChangeText={setSearch} />

      {isLoading ? (
        <ActivityIndicator color={ORANGE} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>🩺</Text>
          <Text style={s.emptyText}>{tab === 'now' ? 'Κανένας κτηνίατρος διαθέσιμος τώρα' : 'Δεν βρέθηκαν κτηνίατροι'}</Text>
          {tab === 'now' && <TouchableOpacity onPress={() => setTab('scheduled')}><Text style={s.link}>Κλείσε προγραμματισμένο →</Text></TouchableOpacity>}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {filtered.map((vet: any) => (
            <TouchableOpacity key={vet.id} style={s.card} onPress={() => {
              if (!isAuthenticated) { Alert.alert('Σύνδεση απαιτείται'); return }
              setSelected(vet)
            }}>
              <View style={s.vetAvatar}><Text style={s.vetAvatarText}>{vet.provider_name?.[0]}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.vetName}>{vet.provider_name}</Text>
                <Text style={s.vetSpec}>{vet.specializations?.[0] || 'Γενική Κτηνιατρική'}</Text>
                <Text style={s.vetRating}>⭐ {vet.rating || 0} ({vet.reviews_count || 0})</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {vet.is_available_now && <View style={s.onlineDot} />}
                <Text style={s.vetPrice}>€{vet.price}</Text>
                <Text style={s.bookBtn}>{tab === 'now' ? '⚡ Τώρα' : 'Κλείσε'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Booking Modal */}
      <Modal visible={!!selected} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>{selected?.provider_name}</Text>
            <Text style={s.modalSub}>{selected?.specializations?.[0] || 'Γενική Κτηνιατρική'}</Text>
            {tab === 'scheduled' && (
              <>
                <Text style={s.label}>Ημερομηνία (ΕΕΕΕ-ΜΜ-ΗΗ)</Text>
                <TextInput style={s.input} value={date} onChangeText={setDate} placeholder="2026-07-01" />
                <Text style={s.label}>Ώρα</Text>
                <TextInput style={s.input} value={time} onChangeText={setTime} placeholder="10:00" />
              </>
            )}
            {tab === 'now' && <Text style={s.nowInfo}>🔒 Πληρωμή μέσω Viva Wallet πριν την κλήση</Text>}
            <Text style={s.price}>Κόστος: €{selected?.price}</Text>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setSelected(null)}>
                <Text style={s.cancelText}>Άκυρο</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={() => book.mutate()} disabled={book.isPending}>
                <Text style={s.confirmText}>{book.isPending ? '...' : '💳 Πλήρωσε & Κλείσε'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 60 },
  backText: { color: ORANGE, fontSize: 17 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  tabs: { flexDirection: 'row', margin: 16, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  tabTextActive: { color: '#111827' },
  search: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 4 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#6B7280', marginBottom: 12 },
  link: { color: ORANGE, fontSize: 14, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  vetAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  vetAvatarText: { fontSize: 20, fontWeight: '700', color: '#1D4ED8' },
  vetName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  vetSpec: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  vetRating: { fontSize: 12, color: '#F59E0B', marginTop: 2 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginBottom: 4 },
  vetPrice: { fontSize: 15, fontWeight: '700', color: '#111827' },
  bookBtn: { fontSize: 12, color: ORANGE, fontWeight: '600', marginTop: 4 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  modalSub: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 12 },
  nowInfo: { fontSize: 13, color: '#2563EB', backgroundColor: '#EFF6FF', padding: 12, borderRadius: 12, marginBottom: 12 },
  price: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 16, textAlign: 'center' },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
  cancelText: { color: '#374151', fontWeight: '600' },
  confirmBtn: { flex: 1, padding: 14, borderRadius: 14, backgroundColor: ORANGE, alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: '700' },
})