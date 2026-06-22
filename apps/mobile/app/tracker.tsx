import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '../src/lib/api'

const ORANGE = '#E65100'

export default function TrackerScreen() {
  const router = useRouter()

  const { data: pets = [] } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets/my').then(r => r.data?.data ?? []).catch(() => []),
  })

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.backText}>‹</Text></TouchableOpacity>
        <Text style={s.title}>GPS Tracker</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={s.mapPlaceholder}>
          <Text style={s.mapEmoji}>🗺️</Text>
          <Text style={s.mapTitle}>Χάρτης GPS</Text>
          <Text style={s.mapSub}>Η ζωντανή τοποθεσία εμφανίζεται εδώ</Text>
        </View>

        <Text style={s.sectionTitle}>Κατοικίδια</Text>
        {pets.length === 0 ? (
          <Text style={s.noData}>Δεν έχετε καταχωρημένα κατοικίδια</Text>
        ) : (
          pets.map((pet: any) => (
            <View key={pet.id} style={s.petCard}>
              <View style={s.petInfo}>
                <Text style={s.petEmoji}>{pet.species === 'cat' ? '🐱' : '🐶'}</Text>
                <View>
                  <Text style={s.petName}>{pet.name}</Text>
                  <Text style={s.petBreed}>{pet.breed || pet.species}</Text>
                </View>
              </View>
              <View style={s.statusRow}>
                <View style={[s.statusDot, { backgroundColor: pet.last_location ? '#10B981' : '#D1D5DB' }]} />
                <Text style={s.statusText}>{pet.last_location ? 'Διαθέσιμο' : 'Χωρίς tracker'}</Text>
              </View>
              <TouchableOpacity style={s.trackBtn}
                onPress={() => Alert.alert('Σύντομα', 'Η σύνδεση GPS tracker θα είναι διαθέσιμη σύντομα. Χρησιμοποιήστε το web app για πλήρη λειτουργία.')}>
                <Text style={s.trackBtnText}>📍 Εντοπισμός</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={s.infoBox}>
          <Text style={s.infoTitle}>📡 Πώς λειτουργεί</Text>
          <Text style={s.infoText}>Συνδέστε ένα GPS tracker (Tractive, Weenect κλπ) στο κολάρο του κατοικιδίου σας και παρακολουθείτε την τοποθεσία του σε πραγματικό χρόνο.</Text>
        </View>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backText: { color: ORANGE, fontSize: 24, width: 32 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  mapPlaceholder: { backgroundColor: '#1E293B', borderRadius: 20, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  mapEmoji: { fontSize: 48, marginBottom: 8 },
  mapTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  mapSub: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  noData: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginTop: 20 },
  petCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
  petInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  petEmoji: { fontSize: 32 },
  petName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  petBreed: { fontSize: 13, color: '#6B7280' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, color: '#6B7280' },
  trackBtn: { backgroundColor: '#1E293B', borderRadius: 12, padding: 12, alignItems: 'center' },
  trackBtnText: { color: '#fff', fontWeight: '700' },
  infoBox: { backgroundColor: '#F0FDF4', borderRadius: 16, padding: 16, marginTop: 8 },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#166534', marginBottom: 8 },
  infoText: { fontSize: 13, color: '#374151', lineHeight: 20 },
})