import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PawPrint, ShieldCheck, MapPin, AlertTriangle, ChevronRight } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { Screen, Card, Badge, Button, EmptyState, SkeletonRows } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Καρτέλα κατοικιδίου.
 *
 * Η λίστα κατοικιδίων δεν άνοιγε τίποτα: ο χρήστης δεν έβλεπε μικροτσίπ,
 * ιστορικό ή θέση GPS, και δεν μπορούσε να δηλώσει το ζώο χαμένο — που
 * είναι η πιο επείγουσα ενέργεια ολόκληρης της εφαρμογής.
 */
export default function PetDetailScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { id } = useLocalSearchParams<{ id: string }>()

  const { data: pets = [], isLoading } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets').then(r => r.data?.data ?? r.data ?? []),
  })
  const pet = pets.find((p: any) => p.id === id)

  const { data: devices = [] } = useQuery({
    queryKey: ['tracker-devices'],
    queryFn: () => api.get('/tracker/devices').then(r => r.data?.data ?? []),
  })
  const device = devices.find((d: any) => d.pet_id === id)

  const toggleLost = useMutation({
    mutationFn: () => api.patch(`/pets/${id}`, { is_lost: !pet?.is_lost }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-pets'] }),
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  if (isLoading) return <Screen title={t('pets.title')} back><SkeletonRows count={3} /></Screen>
  if (!pet) return (
    <Screen title={t('pets.title')} back>
      <EmptyState icon={PawPrint} title={t('pets.none_yet')} />
    </Screen>
  )

  const LINKS = [
    { key: 'passport', Icon: ShieldCheck, labelKey: 'discover.medical_record', route: '/passport' },
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
                  <Text style={s.emoji}>{pet.species === 'cat' ? '🐈' : '🐕'}</Text>
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
          {([['pets.gender', pet.gender === 'female' ? t('passport.female') : t('passport.male')],
             ['pets.weight', pet.weight ? `${pet.weight} kg` : '—'],
             ['pets.color', pet.color || '—'],
             ['pets.microchip', pet.microchip_number || t('pets.no_chip')]] as const).map(([k, v]) => (
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

        {/* Η δήλωση απώλειας είναι η πιο επείγουσα ενέργεια: μένει τελευταία
            και ευδιάκριτη, ώστε να βρίσκεται αμέσως σε στιγμή πανικού. */}
        <Button
          label={pet.is_lost ? t('pets.mark_found') : t('pets.mark_lost')}
          variant={pet.is_lost ? 'secondary' : 'danger'}
          loading={toggleLost.isPending}
          onPress={() => toggleLost.mutate()}
          full style={{ marginTop: space.lg }} />
      </ScrollView>
    </Screen>
  )
}

const s = StyleSheet.create({
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
