import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput, Modal, ScrollView, Vibration, Platform } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../src/store/auth'
import { useRouter } from 'expo-router'
import { api } from '../../src/lib/api'

const speciesEmoji: Record<string,string> = {
  dog:'🐶', cat:'🐱', bird:'🐦', rabbit:'🐰', fish:'🐟', reptile:'🦎', horse:'🐴', other:'🐾'
}
const defaultForm = { name:'', species:'dog', breed:'', age:'', weight:'', gender:'male', color:'', microchip_number:'' }

export default function PetsScreen() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [scanning, setScanning] = useState(false)

  const { data: pets = [] } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets/my').then(r => r.data?.data ?? []),
    enabled: isAuthenticated,
  })

  const addPet = useMutation({
    mutationFn: () => api.post('/pets', {
      ...form,
      age: form.age ? parseFloat(form.age) : null,
      weight: form.weight ? parseFloat(form.weight) : null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-pets'] })
      setShowAdd(false)
      setForm(defaultForm)
      Alert.alert('✅', 'Το κατοικίδιο προστέθηκε επιτυχώς!')
    },
    onError: (err: any) => Alert.alert('Σφάλμα', err.response?.data?.message || 'Δεν ήταν δυνατή η προσθήκη'),
  })

  const toggleLost = useMutation({
    mutationFn: ({ id, isLost }: any) => api.patch(`/pets/${id}`, { is_lost: isLost }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-pets'] }),
  })

  const scanNFC = async () => {
    try {
      const NfcManager = require('react-native-nfc-manager').default
      const isSupported = await NfcManager.isSupported()
      if (!isSupported) {
        Alert.alert('NFC μη διαθέσιμο', 'Η συσκευή δεν υποστηρίζει NFC. Πληκτρολογήστε τον αριθμό χειροκίνητα.')
        return
      }
      const isEnabled = await NfcManager.isEnabled()
      if (!isEnabled) {
        Alert.alert('NFC απενεργοποιημένο', 'Ενεργοποιήστε το NFC στις ρυθμίσεις.')
        return
      }
      setScanning(true)
      await NfcManager.start()
      if (Platform.OS === 'android') {
        Alert.alert('📡 Σάρωση Microchip', 'Πλησιάστε το microchip στο πίσω μέρος του τηλεφώνου...',
          [{ text: 'Ακύρωση', onPress: async () => { await NfcManager.cancelTechnologyRequest(); setScanning(false) }}])
      }
      await NfcManager.requestTechnology(['NfcA', 'NfcB', 'NfcF', 'NfcV', 'IsoDep'])
      const tag = await NfcManager.getTag()
      if (tag?.id) {
        const chipId = tag.id.replace(/:/g,'').toUpperCase()
        setForm(f => ({ ...f, microchip_number: chipId }))
        Vibration.vibrate(300)
        Alert.alert('✅ Microchip σαρώθηκε!', `Αριθμός: ${chipId}`)
      }
      await NfcManager.cancelTechnologyRequest()
    } catch (err: any) {
      if (err?.message !== 'cancelled') console.error('NFC Error:', err)
    } finally {
      setScanning(false)
    }
  }

  if (!isAuthenticated) return (
    <View style={styles.center}>
      <Text style={styles.bigEmoji}>🔒</Text>
      <Text style={styles.emptyText}>Απαιτείται σύνδεση</Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/auth/login')}>
        <Text style={styles.primaryBtnText}>Σύνδεση</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Τα κατοικίδιά μου</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtnText}>+ Προσθήκη</Text>
        </TouchableOpacity>
      </View>

      <FlatList data={pets} keyExtractor={i => i.id} contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }: any) => (
          <View style={styles.card}>
            <Text style={styles.petEmoji}>{speciesEmoji[item.species] || '🐾'}</Text>
            <View style={styles.petInfo}>
              <Text style={styles.petName}>{item.name}</Text>
              <Text style={styles.petDetail}>{item.breed || item.species}{item.age ? ` · ${item.age} ετών` : ''}</Text>
              {item.microchip_number ? (
                <Text style={styles.chipText}>📱 {item.microchip_number}</Text>
              ) : (
                <Text style={styles.noChipText}>Χωρίς microchip</Text>
              )}
            </View>
            {item.is_lost && <View style={styles.lostBadge}><Text style={styles.lostBadgeText}>ΧΑΜΕΝΟ</Text></View>}
            <TouchableOpacity onPress={() => toggleLost.mutate({ id: item.id, isLost: !item.is_lost })}
              style={[styles.statusBtn, item.is_lost ? styles.foundBtn : styles.lostBtn]}>
              <Text style={styles.statusBtnText}>{item.is_lost ? '✓ Βρέθηκε' : '! Χάθηκε'}</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.bigEmoji}>🐾</Text>
            <Text style={styles.emptyText}>Δεν έχετε κατοικίδια ακόμα</Text>
            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 16 }]} onPress={() => setShowAdd(true)}>
              <Text style={styles.primaryBtnText}>Προσθήκη κατοικίδιου</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modal} contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Νέο κατοικίδιο</Text>
            <TouchableOpacity onPress={() => setShowAdd(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Είδος</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {Object.entries(speciesEmoji).map(([key, emoji]) => (
              <TouchableOpacity key={key} onPress={() => setForm(f => ({ ...f, species: key }))}
                style={[styles.speciesChip, form.species === key && styles.speciesChipActive]}>
                <Text style={{ fontSize: 22 }}>{emoji}</Text>
                <Text style={[styles.speciesLabel, form.species === key && styles.speciesLabelActive]}>{key}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.fieldLabel}>Όνομα *</Text>
          <TextInput style={styles.input} placeholder="π.χ. Ρέξ" value={form.name}
            onChangeText={v => setForm(f => ({ ...f, name: v }))} />

          <Text style={styles.fieldLabel}>Ράτσα</Text>
          <TextInput style={styles.input} placeholder="π.χ. Labrador" value={form.breed}
            onChangeText={v => setForm(f => ({ ...f, breed: v }))} />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Ηλικία (έτη)</Text>
              <TextInput style={styles.input} placeholder="3" keyboardType="numeric"
                value={form.age} onChangeText={v => setForm(f => ({ ...f, age: v }))} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Βάρος (kg)</Text>
              <TextInput style={styles.input} placeholder="5.5" keyboardType="numeric"
                value={form.weight} onChangeText={v => setForm(f => ({ ...f, weight: v }))} />
            </View>
          </View>

          <Text style={styles.fieldLabel}>Φύλο</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            {[['male','♂ Αρσενικό'],['female','♀ Θηλυκό']].map(([val,label]) => (
              <TouchableOpacity key={val} onPress={() => setForm(f => ({ ...f, gender: val }))}
                style={[styles.genderBtn, form.gender === val && styles.genderBtnActive]}>
                <Text style={[styles.genderLabel, form.gender === val && styles.genderLabelActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Χρώμα</Text>
          <TextInput style={styles.input} placeholder="π.χ. Καφέ" value={form.color}
            onChangeText={v => setForm(f => ({ ...f, color: v }))} />

          <Text style={styles.fieldLabel}>Αριθμός Microchip</Text>
          <View style={styles.chipRow}>
            <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="15 ψηφία" keyboardType="numeric" maxLength={15}
              value={form.microchip_number}
              onChangeText={v => setForm(f => ({ ...f, microchip_number: v }))} />
            <TouchableOpacity onPress={scanNFC} disabled={scanning}
              style={[styles.nfcBtn, scanning && styles.nfcBtnActive]}>
              <Text style={styles.nfcBtnText}>{scanning ? '📡...' : '📲 NFC'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.chipHint}>Πατήστε NFC για αυτόματη σάρωση του microchip</Text>

          <TouchableOpacity onPress={() => addPet.mutate()}
            disabled={!form.name || addPet.isPending}
            style={[styles.primaryBtn, { marginTop: 20 }, (!form.name || addPet.isPending) && { opacity: 0.5 }]}>
            <Text style={styles.primaryBtnText}>{addPet.isPending ? 'Αποθήκευση...' : 'Αποθήκευση κατοικίδιου'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  addBtn: { backgroundColor: '#E65100', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  petEmoji: { fontSize: 36, marginRight: 12 },
  petInfo: { flex: 1 },
  petName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  petDetail: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  chipText: { fontSize: 11, color: '#6B7280', marginTop: 3, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  noChipText: { fontSize: 11, color: '#D1D5DB', marginTop: 3 },
  lostBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginRight: 8 },
  lostBadgeText: { fontSize: 10, color: '#DC2626', fontWeight: '700' },
  statusBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  lostBtn: { backgroundColor: '#FEF3C7' },
  foundBtn: { backgroundColor: '#D1FAE5' },
  statusBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  bigEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#6B7280', marginBottom: 8 },
  primaryBtn: { backgroundColor: '#E65100', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  closeBtn: { padding: 6 },
  closeBtnText: { fontSize: 18, color: '#9CA3AF' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 13, fontSize: 15, marginBottom: 14, color: '#111827' },
  speciesChip: { alignItems: 'center', padding: 10, marginRight: 8, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', minWidth: 68 },
  speciesChipActive: { borderColor: '#E65100', backgroundColor: '#FFF7ED' },
  speciesLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },
  speciesLabelActive: { color: '#E65100', fontWeight: '600' },
  genderBtn: { flex: 1, padding: 13, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
  genderBtnActive: { borderColor: '#E65100', backgroundColor: '#FFF7ED' },
  genderLabel: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  genderLabelActive: { color: '#E65100', fontWeight: '700' },
  chipRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  nfcBtn: { backgroundColor: '#E65100', borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center', minWidth: 90, alignItems: 'center' },
  nfcBtnActive: { backgroundColor: '#F59E0B' },
  nfcBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  chipHint: { fontSize: 11, color: '#9CA3AF', marginBottom: 4, fontStyle: 'italic' },
})
