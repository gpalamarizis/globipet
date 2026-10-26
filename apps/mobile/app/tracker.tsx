import { useState, useCallback } from 'react'
import { View, Text, StyleSheet, Image, Linking, Modal, Alert, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { MapPin, Battery, Clock, Navigation, AlertTriangle, Wifi, Plus, Trash2, KeyRound } from 'lucide-react-native'
import { api } from '../src/lib/api'
import { useAuthStore } from '../src/store/auth'
import { Screen, Card, Button, Badge, EmptyState, SkeletonRows, Input } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Εντοπισμός GPS.
 *
 * ΤΙ ΑΛΛΑΞΕ
 *   Υπήρχε ένα γκρι πλαίσιο με «🗺️ Χάρτης GPS — Η ζωντανή τοποθεσία
 *   εμφανίζεται εδώ». Δεν εμφανιζόταν ποτέ τίποτα: δεν υπήρχε χάρτης και
 *   η οθόνη δεν ζητούσε καν θέσεις από τον server. Έδειχνε τα κατοικίδια
 *   και τίποτα άλλο.
 *
 *   Τώρα διαβάζει το /tracker/latest, που επιστρέφει για κάθε ζώο την
 *   τελευταία θέση και τη συνδεδεμένη συσκευή. Χωρίς ενσωματωμένο χάρτη —
 *   ο σύνδεσμος ανοίγει τους Χάρτες Google με τις πραγματικές συντεταγμένες,
 *   που είναι ό,τι χρειάζεται κάποιος που ψάχνει το ζώο του.
 *
 *   Μπαταρία και σήμα δείχνουν παύλα όταν η συσκευή δεν έχει στείλει
 *   ακόμα. Άγνωστο δεν είναι το ίδιο με γεμάτο.
 */

const SPECIES: Record<string, string> = {
  dog: '🐶', cat: '🐱', bird: '🦜', rabbit: '🐰', fish: '🐠', reptile: '🦎',
}
const emojiFor = (s?: string) => SPECIES[String(s).toLowerCase()] ?? '🐾'

/**
 * Σχετικός χρόνος. Το t περνιέται ως παράμετρος επειδή η συνάρτηση ζει
 * εκτός component: εκεί δεν υπάρχει hook, και σταθερό κείμενο θα κλείδωνε
 * στη γλώσσα της πρώτης φόρτωσης.
 */
const since = (iso: string | null | undefined, t: (k: string, o?: any) => string) => {
  if (!iso) return '—'
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return t('common.just_now')
  if (m < 60) return t('tracker.mins_ago', { count: m })
  const h = Math.floor(m / 60)
  if (h < 24) return t('tracker.hours_ago', { count: h })
  return t('tracker.days_ago', { count: Math.floor(h / 24) })
}

export default function TrackerScreen() {
  const qc = useQueryClient()
  // Πριν από τα queries: χωρίς σύνδεση δεν ζητάμε ζώα/συσκευές (θα έπαιρναν 401).
  const { isAuthenticated } = useAuthStore()

  /**
   * Διαχείριση συσκευών GPS.
   *
   * Το web συνδέει και αποσυνδέει συσκευές· το κινητό μόνο έδειχνε θέση.
   * Ο ιδιοκτήτης που αγοράζει κολάρο δεν μπορούσε να το συνδέσει από το
   * τηλέφωνο — εκεί που θα το έκανε φυσιολογικά.
   */
  const [adding, setAdding] = useState(false)
  const [devPet, setDevPet] = useState('')
  const [devId, setDevId] = useState('')
  const [devName, setDevName] = useState('')
  // Το κλειδί εμφανίζεται μία φορά (καταχώρηση ή ανανέωση), μαζί με το URL
  // αποστολής θέσης — ίδια συμπεριφορά με το web.
  const [issued, setIssued] = useState<{ token: string; ingestUrl: string } | null>(null)

  // Τα κατοικίδια, για να επιλεγεί σε ποιο ανήκει η συσκευή.
  const { data: pets = [] } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets').then(r => r.data?.data ?? r.data ?? []),
    enabled: isAuthenticated,
  })

  const { data: devices = [] } = useQuery({
    queryKey: ['tracker-devices'],
    queryFn: () => api.get('/tracker/devices').then(r => r.data?.data ?? r.data ?? []),
    enabled: isAuthenticated,
  })

  const addDevice = useMutation({
    mutationFn: () => api.post('/tracker/devices', {
      pet_id: devPet,
      device_id: devId.trim(),
      name: devName.trim() || undefined,
    }),
    onSuccess: (r: any) => {
      setIssued({ token: r?.data?.data?.device_token ?? '', ingestUrl: r?.data?.setup?.ingest_url ?? '' })
      qc.invalidateQueries({ queryKey: ['tracker-devices'] })
      // Η λίστα θέσεων έχει key ['tracker-latest'] — το ['tracker'] δεν ταίριαζε σε τίποτα.
      qc.invalidateQueries({ queryKey: ['tracker-latest'] })
      setAdding(false); setDevId(''); setDevName('')
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const removeDevice = useMutation({
    mutationFn: (deviceId: string) => api.delete(`/tracker/devices/${deviceId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracker-devices'] })
      qc.invalidateQueries({ queryKey: ['tracker-latest'] })
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  /**
   * Ανανέωση κλειδιού συσκευής.
   *
   * Το κλειδί είναι ό,τι επιτρέπει στη συσκευή να στέλνει θέση. Αν
   * διαρρεύσει — μεταπωλημένο κολάρο, χαμένη συσκευή — ο ιδιοκτήτης
   * πρέπει να μπορεί να το αλλάξει χωρίς να ξαναστήσει τα πάντα.
   */
  const rotateToken = useMutation({
    mutationFn: (deviceId: string) => api.post(`/tracker/devices/${deviceId}/token`, {}),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ['tracker-devices'] })
      // Ο server επιστρέφει data.device_token (όχι token) και setup.ingest_url.
      const token = r?.data?.data?.device_token ?? ''
      setIssued({ token, ingestUrl: r?.data?.setup?.ingest_url ?? '' })
      Alert.alert(t('tracker.tokenRotated'), t('tracker.tokenHint'))
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  // Νέο κλειδί: το παλιό παύει αμέσως (routes/tracker.ts) και η συσκευή δεν
  // στέλνει θέση ώσπου να ρυθμιστεί ξανά — επιβεβαίωση πριν, όπως στο web.
  const confirmRotate = (d: any) =>
    Alert.alert(t('tracker.rotateTitle'), t('tracker.rotateQ'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('tracker.newToken'), style: 'destructive', onPress: () => rotateToken.mutate(d.id) },
    ])

  const confirmRemove = (d: any) =>
    Alert.alert(t('tracker.removeTitle'), t('tracker.removeQ'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => removeDevice.mutate(d.id) },
    ])

  const { t } = useTranslation()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['tracker-latest'],
    queryFn: () => api.get('/tracker/latest').then(r => r.data?.data ?? []),
    enabled: isAuthenticated,
    // Το κολάρο στέλνει με δικό του ρυθμό· η οθόνη ανανεώνεται μόνη της
    // ώστε να μη χρειάζεται ο χρήστης να τραβάει συνεχώς. 30″ όπως στο web.
    refetchInterval: 30_000,
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['tracker-latest'] })
    setRefreshing(false)
  }, [qc])

  const battery = (b: number | null | undefined) =>
    b == null ? colors.textLight : b > 50 ? colors.success : b > 20 ? colors.warning : colors.danger

  if (!isAuthenticated) return (
    <Screen title={t('discover.gps_tracking')}>
      <EmptyState
        icon={MapPin}
        title={t('pets.login_required')}
        message={t('tracker.subtitle')}
        action={<Button label={t('auth.sign_in')} onPress={() => router.push('/auth/login' as any)} />}
      />
    </Screen>
  )

  return (
    <Screen title={t('discover.gps_tracking')} onRefresh={onRefresh} refreshing={refreshing}>
      {/* Διαχείριση συσκευών: ήταν μέσα στον κλάδο «μη συνδεδεμένος»,
          οπότε ο συνδεδεμένος χρήστης δεν την έβλεπε ποτέ. */}
      <Button label={t('tracker.addDevice')}
        icon={<Plus size={18} color={colors.textOnDark} />}
        onPress={() => setAdding(true)} full style={{ marginBottom: space.md }} />

      {/* Το κλειδί εμφανίζεται μία φορά — επιλέξιμο κείμενο για αντιγραφή. */}
      {!!issued?.token && (
        <Card style={{ marginBottom: space.md, backgroundColor: colors.warningBg }}>
          <Text style={s.label}>{t('tracker.tokenOnce')}</Text>
          <Text selectable style={s.token}>{issued.token}</Text>
          {!!issued.ingestUrl && (
            <>
              <Text style={[s.label, { marginTop: space.sm }]}>{t('tracker.ingestUrl')}</Text>
              <Text selectable style={s.token}>{issued.ingestUrl}</Text>
            </>
          )}
        </Card>
      )}

      {/* Συνδεδεμένες συσκευές, με δυνατότητα αποσύνδεσης */}
      {devices.length > 0 && (
        <Card style={{ marginBottom: space.md }}>
          <Text style={s.label}>{t('tracker.devices')}</Text>
          {devices.map((d: any) => (
            <View key={d.id} style={s.deviceRow}>
              <Text style={s.deviceTxt} numberOfLines={1}>
                {d.name || d.device_id}
              </Text>
              <TouchableOpacity onPress={() => confirmRotate(d)} disabled={rotateToken.isPending} hitSlop={8}>
                <KeyRound size={16} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmRemove(d)} hitSlop={8}>
                <Trash2 size={16} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </Card>
      )}

      {isLoading ? (
        <SkeletonRows count={3} height={120} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={t('tracker.no_pet')}
          message={t('tracker.add_pet_first')}
          action={<Button label={t('home.my_pets')} onPress={() => router.push('/(tabs)/pets' as any)} />}
        />
      ) : (
        <View style={{ gap: space.md }}>
          {rows.map(({ pet, location, tracker }: any) => {
            const lost = pet.is_lost || location?.status === 'lost'
            return (
              <Card key={pet.id}>
                <View style={s.head}>
                  <View style={s.avatar}>
                    {pet.image_url
                      ? <Image source={{ uri: pet.image_url }} style={s.avatarImg} />
                      : <Text style={s.avatarEmoji}>{emojiFor(pet.species)}</Text>}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={s.nameRow}>
                      <Text style={s.name} numberOfLines={1}>{pet.name}</Text>
                      {lost && <Badge label={t('pets.lost')} tone="danger" />}
                    </View>
                    <Text style={s.sub} numberOfLines={1}>
                      {tracker ? (tracker.name || tracker.device_id) : t('tracker.no_device')}
                    </Text>
                  </View>
                  {lost && <AlertTriangle size={icon.md} color={colors.danger} />}
                </View>

                <View style={s.stats}>
                  <View style={s.stat}>
                    <Battery size={icon.xs} color={battery(tracker?.battery_percent)} />
                    <Text style={[s.statText, { color: battery(tracker?.battery_percent) }]}>
                      {tracker?.battery_percent != null ? `${tracker.battery_percent}%` : '—'}
                    </Text>
                  </View>
                  <View style={s.stat}>
                    <Wifi size={icon.xs} color={colors.textLight} />
                    <Text style={s.statText}>
                      {tracker?.signal_strength === 'good' ? t('tracker.signal_ok')
                        : tracker?.signal_strength === 'weak' ? t('tracker.signal_weak')
                        : tracker?.signal_strength === 'none' ? t('tracker.signal_none') : '—'}
                    </Text>
                  </View>
                  <View style={s.stat}>
                    <Clock size={icon.xs} color={colors.textLight} />
                    <Text style={s.statText}>{since(location?.created_at, t)}</Text>
                  </View>
                </View>

                {location ? (
                  <>
                    <Text style={s.coords}>
                      {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                    </Text>
                    <Button
                      label={t('tracker.directions')}
                      variant="secondary"
                      full
                      size="sm"
                      icon={<Navigation size={icon.sm} color={colors.text} />}
                      onPress={() => Linking.openURL(
                        `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`
                      )}
                      style={{ marginTop: space.md }}
                    />
                  </>
                ) : (
                  <Text style={s.noSignal}>
                    {tracker
                      ? t('tracker.no_position')
                      : t('tracker.connect_device')}
                  </Text>
                )}
              </Card>
            )
          })}
        </View>
      )}
      <Modal visible={adding} transparent animationType="slide" onRequestClose={() => setAdding(false)}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{t('tracker.addDevice')}</Text>
            <Text style={s.sheetHint}>{t('tracker.addHint')}</Text>

            <Text style={s.label}>{t('serviceDetail.forPet')}</Text>
            <View style={s.chips}>
              {pets.map((p: any) => {
                const on = devPet === p.id
                return (
                  <TouchableOpacity key={p.id} activeOpacity={0.7}
                    style={[s.chip, on && s.chipOn]} onPress={() => setDevPet(p.id)}>
                    <Text style={[s.chipTxt, on && s.chipTxtOn]}>{p.name}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <Input label={t('tracker.deviceId')} value={devId} onChangeText={setDevId}
              placeholder={t('tracker.deviceIdHint')} autoCapitalize="none" />
            <Input label={t('tracker.deviceName')} value={devName} onChangeText={setDevName} />

            <View style={s.sheetActions}>
              <Button label={t('common.cancel')} variant="secondary"
                onPress={() => setAdding(false)} style={{ flex: 1 }} />
              <Button label={t('common.save')}
                disabled={!devPet || devId.trim().length < 4 || addDevice.isPending}
                loading={addDevice.isPending}
                onPress={() => addDevice.mutate()} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

    </Screen>
  )
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface, padding: space.lg, gap: space.md,
    borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl,
  },
  sheetTitle: { ...type.section, color: colors.text },
  sheetHint: { ...type.caption, color: colors.textLight },
  label: { ...type.caption, color: colors.textMuted, fontWeight: weight.semibold },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.lg,
    borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface,
  },
  chipOn: { borderColor: colors.brand, backgroundColor: colors.brandTint },
  chipTxt: { ...type.caption, color: colors.textMuted, fontWeight: weight.medium },
  chipTxtOn: { color: colors.brand, fontWeight: weight.bold },
  sheetActions: { flexDirection: 'row', gap: space.sm },
  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  deviceTxt: { ...type.caption, color: colors.textMuted, flex: 1 },
  token: { ...type.caption, color: colors.text, fontWeight: weight.semibold, marginTop: space.xs },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: {
    width: 56, height: 56, borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 56, height: 56 },
  avatarEmoji: { fontSize: 26 },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { ...type.emphasis, color: colors.text, fontWeight: weight.semibold },
  sub: { ...type.caption, color: colors.textMuted, marginTop: 2 },

  stats: {
    flexDirection: 'row', gap: space.lg,
    marginTop: space.md, paddingTop: space.md,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  statText: { ...type.caption, color: colors.textMuted },

  coords: { ...type.caption, color: colors.textLight, marginTop: space.md },
  noSignal: { ...type.caption, color: colors.textLight, marginTop: space.md },
})
