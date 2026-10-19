import { useState, useCallback } from 'react'
import { useTabSpace } from '@/hooks/useTabSpace'
import { useTranslation } from 'react-i18next'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList, Image, Modal, Alert, RefreshControl, KeyboardAvoidingView, Platform, StatusBar } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Plus, X, AlertTriangle, ChevronRight, PawPrint } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { useAuthStore } from '../../src/store/auth'
import { colors, space, radius, type, weight, shadow, icon, touch } from '@/theme'
import { PetFormFields, EMPTY_PET_FORM, petPayload, petEmoji } from '@/components/PetForm'

/**
 * Ύψος μπάρας κατάστασης συν αναπνοή.
 *
 * StatusBar.currentHeight δίνει την πραγματική τιμή στο Android. Τα
 * useSafeAreaInsets επιστρέφουν 0 όταν η εφαρμογή δεν είναι ρητά
 * edge-to-edge, ενώ το σύστημα σχεδιάζει ούτως ή άλλως από κάτω — γι'
 * αυτό δεν τα εμπιστευόμαστε εδώ. Κάτω όριο 48, όσο ίσχυε πριν.
 */
const HEADER_TOP = Math.max((Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0) + space.lg, 48)

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

// Είδη, πεδία και σώμα αιτήματος: κοινά με την επεξεργασία, στο
// src/components/PetForm.tsx — ίδια με τη φόρμα του web (AddPetModal).
const emojiFor = petEmoji
const EMPTY_FORM = EMPTY_PET_FORM

export default function PetsScreen() {
  const tabSpace = useTabSpace()
  const { t } = useTranslation()
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
    // `age` είναι η πραγματική στήλη· το `birthday` που στελνόταν πριν
    // δεν υπάρχει και απορριπτόταν χωρίς να το μάθει κανείς.
    mutationFn: () => api.post('/pets', petPayload(form)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-pets'] })
      setShowAdd(false)
      setForm(EMPTY_FORM)
    },
    onError: (e: any) =>
      Alert.alert(t('common.error'), e?.message || t('pets.add_failed')),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['my-pets'] })
    setRefreshing(false)
  }, [qc])

  if (!isAuthenticated) return (
    <View style={s.container}>
      <View style={s.header}><Text style={s.title}>{t('tabs.pets')}</Text></View>
      <View style={s.empty}>
        <PawPrint size={icon.hero} color={colors.border} />
        <Text style={s.emptyTitle}>{t('pets.login_required')}</Text>
        <Text style={s.emptyText}>{t('pets.subtitle')}</Text>
        <TouchableOpacity style={s.primaryBtn} activeOpacity={0.85}
          onPress={() => router.push('/auth/login' as any)}>
          <Text style={s.primaryBtnText}>{t('auth.sign_in')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.title}>{t('tabs.pets')}</Text>
          <TouchableOpacity style={s.addBtn} activeOpacity={0.8} onPress={() => setShowAdd(true)}>
            <Plus size={icon.md} color={colors.textOnDark} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={pets}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: space.lg, paddingBottom: tabSpace.paddingBottom }}
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
                <Text style={s.emptyTitle}>{t('pets.none_yet')}</Text>
                <Text style={s.emptyText}>{t('pets.add_first')}</Text>
                <TouchableOpacity style={s.primaryBtn} activeOpacity={0.85}
                  onPress={() => setShowAdd(true)}>
                  <Text style={s.primaryBtnText}>{t('pets.add_button')}</Text>
                </TouchableOpacity>
              </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} activeOpacity={0.85}
            onPress={() => router.push(`/pets/${item.id}` as any)}>
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
                    <Text style={s.lostText}>{t('pets.lost')}</Text>
                  </View>
                )}
              </View>
              <Text style={s.sub} numberOfLines={1}>
                {[item.breed || item.species, item.age && t('pets.age_years', { count: item.age })]
                  .filter(Boolean).join(' · ')}
              </Text>
              <Text style={s.link}>{t('discover.medical_record')}</Text>
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
              <Text style={s.sheetTitle}>{t('pets.new_pet')}</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)} hitSlop={10}>
                <X size={icon.lg} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: space.xl }}>

              <PetFormFields form={form} onChange={setForm} />

              <TouchableOpacity
                style={[s.primaryBtn, { marginTop: space.xl },
                  (!form.name.trim() || addPet.isPending) && s.btnDisabled]}
                activeOpacity={0.85}
                disabled={!form.name.trim() || addPet.isPending}
                onPress={() => addPet.mutate()}>
                <Text style={s.primaryBtnText}>
                  {addPet.isPending ? t('pets.saving_short') : t('common.save')}
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
    // Σταθερό και ασφαλές: η κεφαλίδα μπορεί να αποδοθεί σε πολλά
    // σημεία της ίδιας οθόνης (συνδεδεμένος / αποσυνδεδεμένος χρήστης),
    // και inline παράκαμψη θα ίσχυε μόνο σε όποια θυμηθεί κανείς.
    paddingTop: HEADER_TOP,
    backgroundColor: colors.navy,
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
})
