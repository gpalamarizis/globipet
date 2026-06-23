import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert, Modal, TextInput } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { api } from '../../src/lib/api'
import { useAuthStore } from '../../src/store/auth'

const O = '#E65100'
const EM: Record<string,string> = { dog:'🐶', cat:'🐱', bird:'🐦', rabbit:'🐰', fish:'🐟', reptile:'🦎', horse:'🐴', other:'🐾' }

export default function PetsScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', species: 'dog', breed: '', birthday: '', gender: 'male' })

  const { data: pets = [], isLoading } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets/my').then(r => r.data?.data ?? []),
    enabled: isAuthenticated,
  })

  const addPet = useMutation({
    mutationFn: () => api.post('/pets', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-pets'] }); setShowAdd(false); setForm({ name: '', species: 'dog', breed: '', birthday: '', gender: 'male' }) },
    onError: () => Alert.alert('Σφάλμα', 'Δεν ήταν δυνατή η προσθήκη'),
  })

  if (!isAuthenticated) return (
    <View style={s.container}>
      <View style={s.header}><Text style={s.title}>Κατοικίδια</Text></View>
      <View style={s.empty}>
        <Text style={s.emptyEmoji}>🔒</Text>
        <Text style={s.emptyText}>Συνδεθείτε για πρόσβαση</Text>
        <TouchableOpacity style={s.loginBtn} onPress={() => router.push('/auth/login' as any)}>
          <Text style={s.loginBtnText}>Σύνδεση</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Κατοικίδια</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={s.addBtnText}>+ Νέο</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? <ActivityIndicator color={O} style={{ marginTop: 40 }} /> :
        pets.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🐾</Text>
            <Text style={s.emptyText}>Δεν έχετε κατοικίδια ακόμα</Text>
            <TouchableOpacity style={s.addFirstBtn} onPress={() => setShowAdd(true)}>
              <Text style={s.addFirstBtnText}>Προσθέστε το πρώτο σας!</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            {pets.map((pet: any) => (
              <TouchableOpacity key={pet.id} style={s.petCard} activeOpacity={0.7}
                onPress={() => router.push(`/passport` as any)}>
                <View style={s.petAvatar}>
                  {pet.profile_photo
                    ? <Image source={{ uri: pet.profile_photo }} style={s.petAvatarImg} />
                    : <Text style={s.petEmoji}>{EM[pet.species] || '🐾'}</Text>}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.petName}>{pet.name}</Text>
                  <Text style={s.petBreed}>{pet.breed || pet.species} · {pet.gender === 'male' ? '♂️' : '♀️'}</Text>
                  {pet.birthday && <Text style={s.petAge}>🎂 {pet.birthday}</Text>}
                  <View style={s.petTags}>
                    {pet.is_sterilized && <View style={s.tag}><Text style={s.tagText}>Στειρωμένο</Text></View>}
                    {(pet as any).microchip && <View style={s.tag}><Text style={s.tagText}>Τσίπ ✓</Text></View>}
                  </View>
                </View>
                <Text style={s.arrow}>›</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

      {/* Add Pet Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Νέο Κατοικίδιο</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}><Text style={s.closeBtn}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.label}>Όνομα *</Text>
              <TextInput style={s.input} value={form.name} onChangeText={v => setForm(f => ({...f, name: v}))} placeholder="π.χ. Ρεξ" />
              <Text style={s.label}>Είδος</Text>
              <View style={s.speciesGrid}>
                {Object.entries(EM).map(([key, emoji]) => (
                  <TouchableOpacity key={key} style={[s.speciesChip, form.species === key && s.speciesChipActive]}
                    onPress={() => setForm(f => ({...f, species: key}))}>
                    <Text style={s.speciesEmoji}>{emoji}</Text>
                    <Text style={[s.speciesLabel, form.species === key && s.speciesLabelActive]}>{key}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.label}>Ράτσα</Text>
              <TextInput style={s.input} value={form.breed} onChangeText={v => setForm(f => ({...f, breed: v}))} placeholder="π.χ. Labrador" />
              <Text style={s.label}>Ημ. Γέννησης (ΕΕΕΕ-ΜΜ-ΗΗ)</Text>
              <TextInput style={s.input} value={form.birthday} onChangeText={v => setForm(f => ({...f, birthday: v}))} placeholder="2022-01-15" />
              <Text style={s.label}>Φύλο</Text>
              <View style={s.genderRow}>
                <TouchableOpacity style={[s.genderBtn, form.gender === 'male' && s.genderBtnActive]} onPress={() => setForm(f => ({...f, gender: 'male'}))}>
                  <Text style={[s.genderText, form.gender === 'male' && s.genderTextActive]}>♂️ Αρσενικό</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.genderBtn, form.gender === 'female' && s.genderBtnActive]} onPress={() => setForm(f => ({...f, gender: 'female'}))}>
                  <Text style={[s.genderText, form.gender === 'female' && s.genderTextActive]}>♀️ Θηλυκό</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={[s.saveBtn, !form.name && s.saveBtnDisabled]} disabled={!form.name || addPet.isPending} onPress={() => addPet.mutate()}>
                <Text style={s.saveBtnText}>{addPet.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  addBtn: { backgroundColor: O, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 60, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#6B7280', marginBottom: 20, textAlign: 'center' },
  addFirstBtn: { backgroundColor: O, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  addFirstBtnText: { color: '#fff', fontWeight: '700' },
  loginBtn: { backgroundColor: O, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  loginBtnText: { color: '#fff', fontWeight: '700' },
  petCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, gap: 12 },
  petAvatar: { width: 60, height: 60, borderRadius: 18, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  petAvatarImg: { width: 60, height: 60 },
  petEmoji: { fontSize: 28 },
  petName: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 2 },
  petBreed: { fontSize: 13, color: '#6B7280', marginBottom: 3 },
  petAge: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
  petTags: { flexDirection: 'row', gap: 6 },
  tag: { backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  tagText: { fontSize: 10, color: '#16A34A', fontWeight: '600' },
  arrow: { fontSize: 24, color: '#D1D5DB', flexShrink: 0 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  closeBtn: { fontSize: 20, color: '#9CA3AF', padding: 4 },
  label: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827', marginBottom: 4 },
  speciesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  speciesChip: { alignItems: 'center', padding: 10, borderRadius: 12, backgroundColor: '#F3F4F6', width: '22%' },
  speciesChipActive: { backgroundColor: O },
  speciesEmoji: { fontSize: 22, marginBottom: 2 },
  speciesLabel: { fontSize: 9, color: '#374151', fontWeight: '600' },
  speciesLabelActive: { color: '#fff' },
  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  genderBtn: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
  genderBtnActive: { borderColor: O, backgroundColor: '#FFF7ED' },
  genderText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  genderTextActive: { color: O },
  saveBtn: { backgroundColor: O, borderRadius: 14, padding: 15, alignItems: 'center', marginTop: 16, marginBottom: 8 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})