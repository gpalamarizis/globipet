import { useState, useCallback } from 'react'
import { View, Text, StyleSheet, Image, Modal, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Stethoscope, Star, X, Video } from 'lucide-react-native'
import { api } from '../src/lib/api'
import { useAuthStore } from '../src/store/auth'
import { Screen, Card, Button, Badge, EmptyState, SkeletonRows, Input } from '@/components/ui'
import { colors, space, radius, type, weight, icon, touch } from '@/theme'

/**
 * Τηλεϊατρική.
 *
 * ΤΟ ΣΟΒΑΡΟ ΠΟΥ ΔΙΟΡΘΩΘΗΚΕ
 *   Η κράτηση δημιουργούσε κανονικά παραγγελία πληρωμής στο Viva και ο
 *   server επέστρεφε `checkoutUrl`. Η οθόνη το αγνοούσε και εμφάνιζε
 *   «Σύντομα — Άνοιγμα browser για πληρωμή». Ο χρήστης έκλεινε συνεδρία,
 *   χρεωνόταν θέση στο ημερολόγιο του κτηνιάτρου, και δεν μπορούσε να
 *   πληρώσει ποτέ. Τώρα ανοίγει το checkout.
 *
 *   Έφυγε και το `price` από το αίτημα: ο server διαβάζει την τιμή από την
 *   υπηρεσία και αγνοεί ό,τι στείλει ο client — μια τιμή που δεν
 *   χρησιμοποιείται είναι παραπλανητική για όποιον διαβάσει τον κώδικα.
 */
export default function TelehealthScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const [tab, setTab] = useState<'now' | 'scheduled'>('now')
  const [selected, setSelected] = useState<any>(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('10:00')
  const [refreshing, setRefreshing] = useState(false)

  const { data: availableVets = [], isLoading: loadingNow } = useQuery({
    queryKey: ['vets-now'],
    queryFn: () => api.get('/telehealth/available-now').then(r => r.data?.data ?? []),
    refetchInterval: 30_000,
  })

  const { data: allVets = [], isLoading: loadingAll } = useQuery({
    queryKey: ['vets-all'],
    queryFn: () => api.get('/services', {
      params: { service_type: 'veterinary', limit: 24 },
    }).then(r => r.data?.data ?? []),
  })

  const book = useMutation({
    mutationFn: () => api.post('/telehealth', {
      provider_email: selected.provider_email,
      service_id: selected.id,
      scheduled_date: tab === 'now' ? new Date().toISOString().split('T')[0] : date,
      scheduled_time: tab === 'now' ? new Date().toTimeString().slice(0, 5) : time,
      duration: 30,
    }),
    onSuccess: async (res) => {
      const url = res.data?.checkoutUrl
      setSelected(null)
      if (!url) {
        Alert.alert('Σφάλμα', 'Δεν δημιουργήθηκε σελίδα πληρωμής. Δοκίμασε ξανά.')
        return
      }
      // Άνοιγμα του πραγματικού checkout αντί για μήνυμα «σύντομα».
      const ok = await Linking.canOpenURL(url)
      if (ok) Linking.openURL(url)
      else Alert.alert('Σφάλμα', 'Δεν ήταν δυνατό το άνοιγμα της σελίδας πληρωμής.')
    },
    onError: (e: any) =>
      Alert.alert('Σφάλμα', e?.message || 'Δεν ήταν δυνατή η κράτηση'),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['vets-now'] }),
      qc.invalidateQueries({ queryKey: ['vets-all'] }),
    ])
    setRefreshing(false)
  }, [qc])

  const vets = tab === 'now' ? availableVets : allVets
  const loading = tab === 'now' ? loadingNow : loadingAll

  const openBooking = (vet: any) => {
    if (!isAuthenticated) { router.push('/auth/login' as any); return }
    setSelected(vet)
    if (!date) setDate(new Date().toISOString().split('T')[0])
  }

  return (
    <Screen title="Τηλεϊατρική" subtitle="Κτηνίατρος με βιντεοκλήση"
      onRefresh={onRefresh} refreshing={refreshing}>

      <View style={s.tabs}>
        {[
          { id: 'now', label: 'Διαθέσιμοι τώρα' },
          { id: 'scheduled', label: 'Προγραμματισμένο' },
        ].map(t => (
          <TouchableOpacity key={t.id} activeOpacity={0.7}
            style={[s.tab, tab === t.id && s.tabActive]}
            onPress={() => setTab(t.id as any)}>
            <Text style={[s.tabText, tab === t.id && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <SkeletonRows count={4} height={100} />
      ) : vets.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title={tab === 'now' ? 'Κανένας διαθέσιμος αυτή τη στιγμή' : 'Κανένας κτηνίατρος'}
          message={tab === 'now'
            ? 'Δοκίμασε προγραμματισμένο ραντεβού για αργότερα.'
            : 'Δεν υπάρχουν εγγεγραμμένοι κτηνίατροι.'}
          action={tab === 'now'
            ? <Button label="Προγραμματισμένο" variant="secondary"
                onPress={() => setTab('scheduled')} />
            : undefined}
        />
      ) : (
        <View style={{ gap: space.md }}>
          {vets.map((vet: any) => (
            <Card key={vet.id} onPress={() => openBooking(vet)}>
              <View style={s.row}>
                <View style={s.avatar}>
                  {vet.image_url
                    ? <Image source={{ uri: vet.image_url }} style={s.avatarImg} />
                    : <Stethoscope size={icon.lg} color={colors.textLight} />}
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={s.nameRow}>
                    <Text style={s.name} numberOfLines={1}>{vet.provider_name}</Text>
                    {tab === 'now' && <Badge label="Online" tone="success" />}
                  </View>
                  <Text style={s.sub} numberOfLines={1}>{vet.city}</Text>
                  {vet.reviews_count > 0 && (
                    <View style={s.ratingRow}>
                      <Star size={icon.xs} color={colors.accent} fill={colors.accent} />
                      <Text style={s.rating}>
                        {vet.rating?.toFixed(1)} ({vet.reviews_count})
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={s.price}>€{vet.price}</Text>
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Κράτηση */}
      <Modal visible={!!selected} animationType="slide" transparent
        onRequestClose={() => setSelected(null)}>
        <View style={s.modalWrap}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.sheetTitle} numberOfLines={1}>{selected?.provider_name}</Text>
                <Text style={s.sub}>
                  {tab === 'now' ? 'Άμεση συνεδρία · 30 λεπτά' : 'Προγραμματισμένη · 30 λεπτά'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelected(null)} hitSlop={12}>
                <X size={icon.lg} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {tab === 'scheduled' && (
                <>
                  <Input label="Ημερομηνία" value={date} onChangeText={setDate}
                    placeholder="2026-09-15" />
                  <Input label="Ώρα" value={time} onChangeText={setTime}
                    placeholder="10:00" keyboardType="numbers-and-punctuation" />
                </>
              )}

              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Κόστος συνεδρίας</Text>
                <Text style={s.total}>€{selected?.price}</Text>
              </View>

              {/* Ο χρήστης πρέπει να ξέρει ότι φεύγει από την εφαρμογή. */}
              <Text style={s.note}>
                Θα μεταφερθείς στη σελίδα πληρωμής του Viva. Ο σύνδεσμος της
                βιντεοκλήσης ενεργοποιείται μόλις ολοκληρωθεί η πληρωμή.
              </Text>

              <Button
                label={book.isPending ? 'Δημιουργία…' : 'Κράτηση και πληρωμή'}
                full
                loading={book.isPending}
                disabled={tab === 'scheduled' && (!date || !time)}
                icon={<Video size={icon.sm} color={colors.textOnDark} />}
                onPress={() => book.mutate()}
                style={{ marginTop: space.lg }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  )
}

const s = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: space.sm, marginBottom: space.lg },
  tab: {
    flex: 1, height: touch.min,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  tabActive: { backgroundColor: colors.brandLight, borderColor: colors.brand },
  tabText: { ...type.body, color: colors.textMuted, fontWeight: weight.semibold },
  tabTextActive: { color: colors.brand, fontWeight: weight.bold },

  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: {
    width: 56, height: 56, borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 56, height: 56 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { ...type.emphasis, color: colors.text, fontWeight: weight.semibold },
  sub: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs },
  rating: { ...type.caption, color: colors.textMuted },
  price: { ...type.emphasis, color: colors.brand, fontWeight: weight.bold },

  modalWrap: { flex: 1, backgroundColor: 'rgba(15,42,63,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl,
    padding: space.xl,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: space.md,
    marginBottom: space.lg,
  },
  sheetTitle: { ...type.section, color: colors.text, fontWeight: weight.bold },

  totalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  totalLabel: { ...type.body, color: colors.textMuted },
  total: { ...type.title, color: colors.brand, fontWeight: weight.bold },

  note: { ...type.caption, color: colors.textLight, marginTop: space.md, lineHeight: 18 },
})
