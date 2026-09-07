import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  FlatList, Image, Modal, Alert, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Plus, X, AlertTriangle, ChevronRight, PawPrint } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { useAuthStore } from '../../src/store/auth'
import { colors, space, radius, type, weight, shadow, icon, touch } from '@/theme'

/**
 * Τα κατοικίδιά μου.
 *
 * ΤΙ ΑΛΛΑΞΕ
 *   Η φόρμα έστελνε `birthday`. Δεν υπάρχει τέτοια στήλη στο Pet — ο
 *   server κρατά `age` — και το whitelist του /pets την πετούσε σιωπηλά.
 *   Ο χρήστης συμπλήρωνε ημερομηνία γέννησης, πατούσε αποθήκευση, και το
 *   πεδίο εξαφανιζόταν χωρίς κανένα μήνυμα.
 *
 *   Προστέθηκε και η στείρωση ως τρεις επιλογές. Ένα checkbox θα κατέγραφε
 *   κάθε αναπάντητη περίπτωση ως «όχι στειρωμένο» — ψευδής ιατρική δήλωση
 *   σε ένα διαβατήριο που μπορεί να διαβάσει κτηνίατρος.
 */

const SPECIES = [
  { id: 'dog',     label: 'Σκύλος',  emoji: '🐶' },
  { id: 'cat',     label: 'Γάτα',    emoji: '🐱' },
  { id: 'bird',    label: 'Πουλί',   emoji: '🦜' },
  { id: 'rabbit',  label: 'Κουνέλι', emoji: '🐰' },
  { id: 'fish',    label: 'Ψάρι',    emoji: '🐠' },
  { id: 'reptile', label: 'Ερπετό',  emoji: '🦎' },
]

const emojiFor = (s: string) => SPECIES.find(x => x.id === s)?.emoji ?? '🐾'

const EMPTY_FORM = {
  name: '', species: 'dog', breed: '', age: '',
  gender: 'male', is_sterilized: '' as '' | 'yes' | 'no',
}

export default function PetsScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const [showAdd, setShowAdd] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: pets = [], isLoading } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets/my').then(r => r.data?.data ?? []),
    enabled: isAuthenticated,
  })

  const addPet = useMutation({
    mutationFn: () => api.post('/pets', {
      name: form.name.trim(),
      species: form.species,
      breed: form.breed.trim() || undefined,
      // `age` είναι η πραγματική στήλη· το `birthday` που στελνόταν πριν
      // δεν υπάρχει και απορριπτόταν χωρίς να το μάθει κανείς.
      age: form.age ? parseFloat(form.age) : undefined,
      gender: form.gender,
      is_sterilized: form.is_sterilized === 'yes' ? true
        : form.is_sterilized === 'no' ? false : null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-pets'] })
      setShowAdd(false)
      setForm(EMPTY_FORM)
    },
    onError: (e: any) =>
      Alert.alert('Σφάλμα', e?.message || 'Δεν ήταν δυνατή η προσθήκη'),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['my-pets'] })
    setRefreshing(false)
  }, [qc])

  if (!isAuthenticated) return (
    <View style={s.container}>
      <View style={s.header}><Text style={s.title}>Κατοικίδια</Text></View>
      <View style={s.empty}>
        <PawPrint size={icon.hero} color={colors.border} />
        <Text style={s.emptyTitle}>Συνδέσου για πρόσβαση</Text>
        <Text style={s.emptyText}>Τα κατοικίδιά σου και ο φάκελός τους σε ένα μέρος.</Text>
        <TouchableOpacity style={s.primaryBtn} activeOpacity={0.85}
          onPress={() => router.push('/auth/login' as any)}>
          <Text style={s.primaryBtnText}>Σύνδεση</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.title}>Κατοικίδια</Text>
          <TouchableOpacity style={s.addBtn} activeOpacity={0.8} onPress={() => setShowAdd(true)}>
            <Plus size={icon.md} color={colors.textOnDark} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={pets}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: space.lg, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }
        ListEmptyComponent={
          isLoading
            ? <View>{[0, 1].map(i => (
                <View key={i} style={s.card}>
                  <View style={[s.avatar, s.skeleton]} />
                  <View style={{ flex: 1, gap: space.sm }}>
                    <View style={[s.skeleton, { height: 16, width: '45%', borderRadius: radius.sm }]} />
                    <View style={[s.skeleton, { height: 12, width: '65%', borderRadius: radius.sm }]} />
                  </View>
                </View>
              ))}</View>
            : <View style={s.empty}>
                <PawPrint size={icon.hero} color={colors.border} />
                <Text style={s.emptyTitle}>Κανένα κατοικίδιο ακόμη</Text>
                <Text style={s.emptyText}>
                  Πρόσθεσε το πρώτο σου για να κρατάς εμβόλια, ιστορικό και ραντεβού.
                </Text>
                <TouchableOpacity style={s.primaryBtn} activeOpacity={0.85}
                  onPress={() => setShowAdd(true)}>
                  <Text style={s.primaryBtnText}>Προσθήκη κατοικιδίου</Text>
                </TouchableOpacity>
              </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} activeOpacity={0.85}
            onPress={() => router.push(`/passport?pet=${item.id}` as any)}>
            <View style={s.avatar}>
              {item.image_url
                ? <Image source={{ uri: item.image_url }} style={s.avatarImg} />
                : <Text style={s.avatarEmoji}>{emojiFor(item.species)}</Text>}
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={s.nameRow}>
                <Text style={s.name} numberOfLines={1}>{item.name}</Text>
                {item.is_lost && (
                  <View style={s.lostTag}>
                    <AlertTriangle size={icon.xs} color={colors.danger} />
                    <Text style={s.lostText}>Χαμένο</Text>
                  </View>
                )}
              </View>
              <Text style={s.sub} numberOfLines={1}>
                {[item.breed || item.species, item.age && `${item.age} ετών`]
                  .filter(Boolean).join(' · ')}
              </Text>
              <Text style={s.link}>Ιατρικός φάκελος</Text>
            </View>

            <ChevronRight size={icon.md} color={colors.textLight} />
          </TouchableOpacity>
        )}
      />

      {/* ── Προσθήκη ─────────────────────────────────────────────── */}
      <Modal visible={showAdd} animationType="slide" transparent
        onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.modalWrap}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Νέο κατοικίδιο</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)} hitSlop={10}>
                <X size={icon.lg} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: space.xl }}>

              <Text style={s.label}>Όνομα</Text>
              <TextInput style={s.input} value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
                placeholder="π.χ. Ρέξ" placeholderTextColor={colors.textLight} />

              <Text style={s.label}>Είδος</Text>
              <View style={s.optionGrid}>
                {SPECIES.map(sp => {
                  const active = form.species === sp.id
                  return (
                    <TouchableOpacity key={sp.id} activeOpacity={0.7}
                      style={[s.option, active && s.optionActive]}
                      onPress={() => setForm(f => ({ ...f, species: sp.id }))}>
                      <Text style={s.optionEmoji}>{sp.emoji}</Text>
                      <Text style={[s.optionText, active && s.optionTextActive]}>{sp.label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <Text style={s.label}>Ράτσα</Text>
              <TextInput style={s.input} value={form.breed}
                onChangeText={v => setForm(f => ({ ...f, breed: v }))}
                placeholder="Προαιρετικό" placeholderTextColor={colors.textLight} />

              <Text style={s.label}>Ηλικία (έτη)</Text>
              <TextInput style={s.input} value={form.age} keyboardType="decimal-pad"
                onChangeText={v => setForm(f => ({ ...f, age: v.replace(',', '.') }))}
                placeholder="π.χ. 3" placeholderTextColor={colors.textLight} />

              <Text style={s.label}>Φύλο</Text>
              <View style={s.row}>
                {[{ id: 'male', l: '♂ Αρσενικό' }, { id: 'female', l: '♀ Θηλυκό' }].map(g => (
                  <TouchableOpacity key={g.id} activeOpacity={0.7}
                    style={[s.pill, form.gender === g.id && s.pillActive]}
                    onPress={() => setForm(f => ({ ...f, gender: g.id }))}>
                    <Text style={[s.pillText, form.gender === g.id && s.pillTextActive]}>{g.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Τρεις επιλογές, όχι checkbox: «δεν γνωρίζω» είναι πραγματική
                  απάντηση, και το κενό δεν πρέπει να καταγράφεται ως «όχι». */}
              <Text style={s.label}>Στειρωμένο</Text>
              <View style={s.row}>
                {[{ v: 'yes', l: 'Ναι' }, { v: 'no', l: 'Όχι' }, { v: '', l: 'Δεν γνωρίζω' }].map(o => (
                  <TouchableOpacity key={o.v || 'unknown'} activeOpacity={0.7}
                    style={[s.pill, form.is_sterilized === o.v && s.pillActive]}
                    onPress={() => setForm(f => ({ ...f, is_sterilized: o.v as any }))}>
                    <Text style={[s.pillText, form.is_sterilized === o.v && s.pillTextActive]}>
                      {o.l}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[s.primaryBtn, { marginTop: space.xl },
                  (!form.name.trim() || addPet.isPending) && s.btnDisabled]}
                activeOpacity={0.85}
                disabled={!form.name.trim() || addPet.isPending}
                onPress={() => addPet.mutate()}>
                <Text style={s.primaryBtnText}>
                  {addPet.isPending ? 'Αποθήκευση…' : 'Αποθήκευση'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    backgroundColor: colors.navy,
    paddingTop: space.xxxl + space.lg,
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...type.title, color: colors.textOnDark, fontWeight: weight.bold },
  addBtn: {
    width: touch.min, height: touch.min, borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center',
  },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.surface,
    padding: space.md,
    borderRadius: radius.lg,
    marginBottom: space.md,
    ...shadow.sm,
  },
  avatar: {
    width: 64, height: 64, borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 64, height: 64 },
  avatarEmoji: { fontSize: 30 },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { ...type.emphasis, color: colors.text, fontWeight: weight.semibold },
  lostTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.dangerBg,
    paddingHorizontal: space.sm, paddingVertical: 2,
    borderRadius: radius.full,
  },
  lostText: { ...type.caption, color: colors.danger, fontWeight: weight.bold },
  sub: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  link: { ...type.caption, color: colors.brand, fontWeight: weight.semibold, marginTop: space.xs },

  skeleton: { backgroundColor: colors.surfaceAlt },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: space.xl, gap: space.sm },
  emptyTitle: { ...type.emphasis, color: colors.text, fontWeight: weight.semibold, marginTop: space.md },
  emptyText: { ...type.body, color: colors.textMuted, textAlign: 'center' },

  primaryBtn: {
    height: touch.comfortable, paddingHorizontal: space.xxl,
    borderRadius: radius.md, backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center',
    marginTop: space.lg,
  },
  primaryBtnText: { ...type.emphasis, color: '#fff', fontWeight: weight.bold },
  btnDisabled: { opacity: 0.4 },

  // Φύλλο προσθήκης
  modalWrap: { flex: 1, backgroundColor: 'rgba(15,42,63,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl,
    padding: space.xl,
    maxHeight: '88%',
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: space.lg,
  },
  sheetTitle: { ...type.section, color: colors.text, fontWeight: weight.bold },

  label: {
    ...type.caption, color: colors.textMuted, fontWeight: weight.semibold,
    marginTop: space.lg, marginBottom: space.sm,
  },
  input: {
    height: touch.comfortable,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    ...type.body, color: colors.text,
  },

  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: space.xs,
    paddingHorizontal: space.lg, height: touch.min,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: 'transparent',
  },
  optionActive: { backgroundColor: colors.brandLight, borderColor: colors.brand },
  optionEmoji: { fontSize: 16 },
  optionText: { ...type.body, color: colors.textMuted, fontWeight: weight.semibold },
  optionTextActive: { color: colors.brand, fontWeight: weight.bold },

  row: { flexDirection: 'row', gap: space.sm },
  pill: {
    flex: 1, height: touch.min,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
  },
  pillActive: { backgroundColor: colors.brandLight, borderColor: colors.brand },
  pillText: { ...type.body, color: colors.textMuted, fontWeight: weight.semibold },
  pillTextActive: { color: colors.brand, fontWeight: weight.bold },
})
