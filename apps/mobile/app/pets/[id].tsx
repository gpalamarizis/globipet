import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, Modal, Linking } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PawPrint, ShieldCheck, MapPin, AlertTriangle, ChevronRight, Pencil, Trash2, X, Navigation } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { Screen, Card, Badge, Button, EmptyState, SkeletonRows } from '@/components/ui'
import { PetFormFields, EMPTY_PET_FORM, petToForm, petPayload, petEmoji, type PetFormState } from '@/components/PetForm'
import { colors, space, radius, type, weight, icon } from '@/theme'
import { ErrorState, NotFoundState } from '@/components/ErrorState'

/** Χρονοσφραγίδα θέσης (ISO) στη γλώσσα του χρήστη, π.χ. «23 Οκτ, 14:05». */
function fmtStamp(v: string | null | undefined, lang: string): string {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d.getTime())) return String(v)
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
  try { return d.toLocaleString(lang, opts) } catch { return d.toLocaleString(undefined, opts) }
}

/**
 * Καρτέλα κατοικιδίου.
 *
 * Η λίστα κατοικιδίων δεν άνοιγε τίποτα: ο χρήστης δεν έβλεπε μικροτσίπ,
 * ιστορικό ή θέση GPS, και δεν μπορούσε να δηλώσει το ζώο χαμένο — που
 * είναι η πιο επείγουσα ενέργεια ολόκληρης της εφαρμογής.
 */
export default function PetDetailScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { id } = useLocalSearchParams<{ id: string }>()

  const { data: pets = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets').then(r => r.data?.data ?? r.data ?? []),
  })
  const pet = pets.find((p: any) => p.id === id)

  const { data: devices = [] } = useQuery({
    queryKey: ['tracker-devices'],
    queryFn: () => api.get('/tracker/devices').then(r => r.data?.data ?? []),
  })
  const device = devices.find((d: any) => d.pet_id === id)

  // Ιστορικό θέσεων του κατοικιδίου, νεότερη πρώτη — όπως η καρτέλα
  // «Τοποθεσία» του web (GET /tracker?pet_id=…&limit=25).
  const { data: locations = [] } = useQuery({
    queryKey: ['pet-locations', id],
    queryFn: () => api.get('/tracker', { params: { pet_id: id, limit: 25 } }).then(r => r.data?.data ?? []),
    enabled: !!id,
  })

  // Επεξεργασία: ίδια πεδία με την προσθήκη και με το web (AddPetModal,
  // που επιτρέπει και αλλαγή είδους για διόρθωση λάθους καταχώρισης).
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<PetFormState>(EMPTY_PET_FORM)

  const save = useMutation({
    mutationFn: () => api.patch(`/pets/${id}`, petPayload(form)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-pets'] })
      setEditing(false)
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const remove = useMutation({
    mutationFn: () => api.delete(`/pets/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-pets'] })
      router.replace('/(tabs)/pets' as any)
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('pets.deleteFailed')),
  })

  const confirmDelete = () =>
    Alert.alert(t('pets.deleteTitle'), t('pets.deleteQ', { name: pet?.name ?? '' }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => remove.mutate() },
    ])

  const openEdit = () => {
    setForm(petToForm(pet))
    setEditing(true)
  }

  const toggleLost = useMutation({
    mutationFn: () => api.patch(`/pets/${id}`, { is_lost: !pet?.is_lost }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-pets'] }),
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  if (isLoading) return <Screen title={t('pets.title')} back><SkeletonRows count={3} /></Screen>
  // Σφάλμα δικτύου ≠ «δεν βρέθηκε»: επανάληψη.
  if (isError && !pet) return (
    <Screen title={t('pets.title')} back>
      <ErrorState onRetry={() => refetch()} retrying={isFetching} />
    </Screen>
  )
  if (!pet) return (
    <Screen title={t('pets.title')} back>
      <NotFoundState />
    </Screen>
  )

  const LINKS = [
    { key: 'passport', Icon: ShieldCheck, labelKey: 'discover.medical_record', route: `/passport?petId=${encodeURIComponent(pet.id)}` },
    { key: 'tracker',  Icon: MapPin,      labelKey: 'discover.gps_tracking',   route: '/tracker' },
  ]

  return (
    <Screen title={pet.name} back scroll={false}>
      <ScrollView contentContainerStyle={s.body}>
        {pet.is_lost && (
          <Card style={s.lostCard}>
            <View style={s.lostRow}>
              <AlertTriangle size={icon.md} color={colors.danger} />
              <Text style={s.lostTxt}>{t('petDetail.lostNotice')}</Text>
            </View>
          </Card>
        )}

        <Card>
          <View style={s.head}>
            {pet.image_url
              ? <Image source={{ uri: pet.image_url }} style={s.avatar} />
              : <View style={[s.avatar, s.avatarEmpty]}>
                  <Text style={s.emoji}>{petEmoji(pet.species)}</Text>
                </View>}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.name}>{pet.name}</Text>
              <Text style={s.meta}>
                {t(`pets.kind_${pet.species}`, { defaultValue: pet.species })}
                {pet.breed ? ` · ${pet.breed}` : ''}
              </Text>
              <View style={s.badges}>
                {pet.age != null && <Badge label={t('pets.age_years', { count: pet.age })} tone="neutral" />}
                {pet.is_sterilized && <Badge label={t('pets.neutered')} tone="success" />}
              </View>
            </View>
          </View>
        </Card>

        <Card>
          <Text style={s.sectionTitle}>{t('passport.identity')}</Text>
          {([['pets.gender', pet.gender === 'female' ? t('passport.female') : pet.gender === 'male' ? t('passport.male') : '—'],
             ['pets.weight', pet.weight ? `${pet.weight} kg` : '—'],
             ['pets.color', pet.color || '—'],
             ['pets.microchip', pet.microchip_number || t('pets.no_chip')],
             // Όπως το web: ναι / όχι / άγνωστο (—).
             ['pets.neutered', pet.is_sterilized === true ? t('common.yes')
               : pet.is_sterilized === false ? t('common.no') : '—']] as const).map(([k, v]) => (
            <View key={k} style={s.kv}>
              <Text style={s.k}>{t(k)}</Text>
              <Text style={s.v}>{v}</Text>
            </View>
          ))}
        </Card>

        {LINKS.map(({ key, Icon, labelKey, route }) => (
          <TouchableOpacity key={key} activeOpacity={0.7} style={s.link}
            onPress={() => router.push(route as any)}>
            <View style={s.linkIcon}><Icon size={icon.md} color={colors.brand} /></View>
            <Text style={s.linkLabel}>{t(labelKey)}</Text>
            <ChevronRight size={icon.sm} color={colors.textLight} />
          </TouchableOpacity>
        ))}

        {!!device && (
          <Card>
            <Text style={s.sectionTitle}>{t('discover.gps_tracking')}</Text>
            <Text style={s.meta}>{device.device_name ?? device.device_id}</Text>
          </Card>
        )}

        <Card>
          <Text style={s.sectionTitle}>{t('petDetail.locationHistory')}</Text>
          {locations.length === 0
            ? <Text style={s.meta}>{t('petDetail.noLocations')}</Text>
            : locations.map((loc: any) => {
                const lost = loc.status === 'lost'
                return (
                  <View key={loc.id} style={s.locRow}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.v} numberOfLines={1}>
                        {Number(loc.latitude).toFixed(5)}, {Number(loc.longitude).toFixed(5)}
                      </Text>
                      <Text style={s.k}>{fmtStamp(loc.created_at, i18n.language)}</Text>
                    </View>
                    <Badge label={lost ? t('petDetail.statusLost') : t('petDetail.statusSafe')}
                      tone={lost ? 'danger' : 'success'} />
                  </View>
                )
              })}
          {locations.length > 0 && (
            <Button label={t('tracker.directions')} variant="secondary" size="sm" full
              icon={<Navigation size={icon.sm} color={colors.text} />}
              onPress={() => Linking.openURL(
                `https://www.google.com/maps/dir/?api=1&destination=${locations[0].latitude},${locations[0].longitude}`
              )}
              style={{ marginTop: space.md }} />
          )}
        </Card>

        {/* Η δήλωση απώλειας είναι η πιο επείγουσα ενέργεια: μένει τελευταία
            και ευδιάκριτη, ώστε να βρίσκεται αμέσως σε στιγμή πανικού. */}
        <View style={s.actions}>
          <Button label={t('common.edit')} variant="secondary"
            icon={<Pencil size={18} color={colors.text} />}
            onPress={openEdit} style={{ flex: 1 }} />
          <Button label={t('common.delete')} variant="danger"
            icon={<Trash2 size={18} color={colors.textOnDark} />}
            loading={remove.isPending}
            onPress={confirmDelete} style={{ flex: 1 }} />
        </View>

        <Button
          label={pet.is_lost ? t('pets.mark_found') : t('pets.mark_lost')}
          variant={pet.is_lost ? 'secondary' : 'danger'}
          loading={toggleLost.isPending}
          onPress={() => toggleLost.mutate()}
          full style={{ marginTop: space.lg }} />
      </ScrollView>

      {/* Φύλλο επεξεργασίας */}
      <Modal visible={editing} transparent animationType="slide" onRequestClose={() => setEditing(false)}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>{t('pets.editTitle')}</Text>
              <TouchableOpacity onPress={() => setEditing(false)}>
                <X size={icon.md} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <PetFormFields form={form} onChange={setForm} />
            </ScrollView>
            <Button label={t('common.save')}
              disabled={!form.name.trim() || save.isPending}
              loading={save.isPending}
              onPress={() => save.mutate()} full />
          </View>
        </View>
      </Modal>
    </Screen>
  )
}

const s = StyleSheet.create({
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface, padding: space.lg, gap: space.md,
    borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, maxHeight: '85%',
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { ...type.section, color: colors.text },
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
  lostCard: { backgroundColor: colors.dangerBg, borderColor: colors.danger, borderWidth: 1 },
  lostRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  lostTxt: { ...type.body, color: colors.danger, fontWeight: weight.semibold, flex: 1 },
  head: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  avatar: { width: 72, height: 72, borderRadius: radius.full, backgroundColor: colors.surfaceAlt },
  avatarEmpty: { alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 32 },
  name: { ...type.section, color: colors.text },
  meta: { ...type.caption, color: colors.textLight },
  badges: { flexDirection: 'row', gap: space.xs, marginTop: space.xs, flexWrap: 'wrap' },
  sectionTitle: { ...type.emphasis, color: colors.text, marginBottom: space.sm },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.xs },
  locRow: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight,
  },
  k: { ...type.caption, color: colors.textMuted },
  v: { ...type.caption, color: colors.text, fontWeight: weight.semibold },
  link: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    padding: space.md, backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight,
  },
  linkIcon: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' },
  linkLabel: { ...type.body, color: colors.text, fontWeight: weight.medium, flex: 1 },
})
