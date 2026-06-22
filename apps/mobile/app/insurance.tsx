import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { api } from '../src/lib/api'

const ORANGE = '#E65100'

export default function InsuranceScreen() {
  const router = useRouter()
  const { data = [], isLoading } = useQuery({
    queryKey: ['insurance-products'],
    queryFn: () => api.get('/insurance').then(r => r.data?.data ?? []).catch(() => []),
  })

  const mockProducts = [
    { id: '1', name: 'Βασικό Πλάνο', price: 9.99, period: 'μήνα', covers: ['Κτηνίατρος', 'Επείγοντα', 'Φάρμακα'], color: '#3B82F6' },
    { id: '2', name: 'Premium Πλάνο', price: 19.99, period: 'μήνα', covers: ['Κτηνίατρος', 'Επείγοντα', 'Φάρμακα', 'Χειρουργεία', 'Οδοντιατρικά'], color: ORANGE },
    { id: '3', name: 'Ετήσιο Πλάνο', price: 149.99, period: 'χρόνο', covers: ['Όλα τα παραπάνω', 'Εξωτερικό', 'Τηλεϊατρική'], color: '#8B5CF6' },
  ]

  const products = data.length > 0 ? data : mockProducts

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.backText}>‹</Text></TouchableOpacity>
        <Text style={s.title}>Ασφάλιση</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={s.heroBanner}>
          <Text style={s.heroEmoji}>🛡️</Text>
          <Text style={s.heroTitle}>Προστατέψτε το κατοικίδιό σας</Text>
          <Text style={s.heroSub}>Επιλέξτε το πλάνο που ταιριάζει στις ανάγκες σας</Text>
        </View>

        {isLoading ? <ActivityIndicator color={ORANGE} /> :
          products.map((p: any) => (
            <View key={p.id} style={[s.card, { borderTopColor: p.color, borderTopWidth: 4 }]}>
              <Text style={s.planName}>{p.name}</Text>
              <View style={s.priceRow}>
                <Text style={[s.price, { color: p.color }]}>€{p.price}</Text>
                <Text style={s.period}>/{p.period}</Text>
              </View>
              {(p.covers || []).map((c: string) => (
                <Text key={c} style={s.cover}>✅ {c}</Text>
              ))}
              <TouchableOpacity style={[s.btn, { backgroundColor: p.color }]}
                onPress={() => Alert.alert('Σύντομα', 'Η αγορά ασφάλισης θα είναι διαθέσιμη σύντομα')}>
                <Text style={s.btnText}>Επιλογή Πλάνου</Text>
              </TouchableOpacity>
            </View>
          ))}

        <View style={s.infoBox}>
          <Text style={s.infoTitle}>ℹ️ Γιατί ασφάλιση κατοικιδίου;</Text>
          <Text style={s.infoText}>Οι κτηνιατρικές δαπάνες μπορεί να ξεπεράσουν τα €3.000 για σοβαρές παθήσεις. Με ασφάλιση GlobiPet καλύπτεστε έως 80%.</Text>
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
  heroBanner: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16 },
  heroEmoji: { fontSize: 48, marginBottom: 8 },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 4 },
  heroSub: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, overflow: 'hidden' },
  planName: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 },
  price: { fontSize: 32, fontWeight: '900' },
  period: { fontSize: 16, color: '#6B7280', marginLeft: 4 },
  cover: { fontSize: 14, color: '#374151', marginBottom: 6 },
  btn: { borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 16 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  infoBox: { backgroundColor: '#EFF6FF', borderRadius: 16, padding: 16, marginBottom: 24 },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#1D4ED8', marginBottom: 8 },
  infoText: { fontSize: 13, color: '#374151', lineHeight: 20 },
})