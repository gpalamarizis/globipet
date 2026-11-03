import { View, Text, StyleSheet, ScrollView, Image, Linking } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Dog, Check, AlertTriangle } from 'lucide-react-native'
import { api } from '@/lib/api'
import { Screen, Card, Badge, EmptyState, SkeletonRows } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/** Λεπτομέρεια ράτσας. */
export default function BreedDetailScreen() {
  const { t, i18n } = useTranslation()
  const { id } = useLocalSearchParams<{ id: string }>()

  const { data: breed, isLoading } = useQuery({
    queryKey: ['breed', id],
    queryFn: () => api.get(`/breeds/${id}`).then(r => r.data?.data ?? r.data),
    enabled: !!id,
  })

  if (isLoading) return <Screen title={t('breeds.title')} back><SkeletonRows count={3} /></Screen>
  if (!breed) return (
    <Screen title={t('breeds.title')} back>
      <EmptyState icon={Dog} title={t('common.no_results')} />
    </Screen>
  )

  const name = (i18n.language === 'el' && breed.name_el) ? breed.name_el : breed.name

  // Μόνο ό,τι είναι γνωστό: οι ράτσες του καταλόγου χωρίς πλήρες προφίλ
  // έχουν κενά μέγεθος/ανάγκες. Το μέγεθος μεταφρασμένο (όχι «large»), οι
  // βαθμοί ως «4/5» (όχι σκέτο «4»).
  const lvl = (v: any) => typeof v === 'number' ? t('breeds.level', { n: v }) : null
  const FACTS: [string, any][] = [
    ['breeds.size', breed.size ? t(`breeds.size_${breed.size}`, { defaultValue: breed.size }) : null],
    ['breeds.origin', breed.origin],
    ['breeds.lifespan', (breed.lifespan_min && breed.lifespan_max)
      ? t('breeds.years', { min: breed.lifespan_min, max: breed.lifespan_max }) : null],
    ['breeds.exercise', lvl(breed.exercise_needs)],
    ['breeds.grooming', lvl(breed.grooming_needs)],
    ['breeds.recognition', [
      breed.fci_number && breed.fci_group ? t('breeds.fci_line', { n: breed.fci_number, g: breed.fci_group }) : null,
      ...((breed.recognized_by ?? []) as string[]).filter(o => o !== 'FCI'),
      breed.registry_codes?.length ? breed.registry_codes.join(' / ') : null,
    ].filter(Boolean).join(' · ') || null],
  ]
  const hasProfile = [breed.grooming_needs, breed.exercise_needs, breed.trainability].some(v => typeof v === 'number')
    || [breed.good_with_children, breed.good_with_pets, breed.apartment_friendly].some(v => typeof v === 'boolean')

  return (
    <Screen title={name} back scroll={false}>
      <ScrollView contentContainerStyle={s.body}>
        {!!breed.image_url && (
          <View>
            <Image source={{ uri: breed.image_url }} style={s.image} resizeMode="cover" />
            {/* Αναφορά δημιουργού/άδειας — υποχρεωτική για CC BY / CC BY-SA. */}
            {!!breed.image_credit && (
              <Text style={s.credit} numberOfLines={1}
                onPress={breed.image_source ? () => Linking.openURL(breed.image_source) : undefined}>
                {t('breeds.photo')}: {breed.image_credit}{breed.image_license ? ` · ${breed.image_license}` : ''} · Wikimedia Commons
              </Text>
            )}
          </View>
        )}

        <Card>
          <Text style={s.title}>{name}</Text>
          <View style={s.badges}>
            {breed.good_with_children && <Badge label={t('breeds.kidFriendly')} tone="success" />}
            {breed.good_with_pets && <Badge label={t('breeds.petFriendly')} tone="success" />}
            {breed.apartment_friendly && <Badge label={t('breeds.apartment')} tone="info" />}
          </View>
          {!!breed.description && <Text style={s.desc}>{breed.description}</Text>}
          {!hasProfile && <Text style={s.note}>{t('breeds.no_profile')}</Text>}
        </Card>

        {FACTS.some(([, v]) => v) && <Card>
          {FACTS.filter(([, v]) => v).map(([k, v]) => (
            <View key={k} style={s.kv}>
              <Text style={s.k}>{t(k)}</Text>
              <Text style={s.v}>{String(v)}</Text>
            </View>
          ))}
        </Card>}

        {!!breed.pros?.length && (
          <Card>
            <Text style={s.sectionTitle}>{t('breeds.pros')}</Text>
            {breed.pros.map((p: string, i: number) => (
              <View key={i} style={s.line}>
                <Check size={14} color={colors.success} />
                <Text style={s.lineTxt}>{p}</Text>
              </View>
            ))}
          </Card>
        )}

        {!!breed.cons?.length && (
          <Card>
            <Text style={s.sectionTitle}>{t('breeds.cons')}</Text>
            {breed.cons.map((c: string, i: number) => (
              <View key={i} style={s.line}>
                <AlertTriangle size={14} color={colors.warning} />
                <Text style={s.lineTxt}>{c}</Text>
              </View>
            ))}
          </Card>
        )}

        {!!breed.health_issues?.length && (
          <Card>
            <Text style={s.sectionTitle}>{t('breeds.health')}</Text>
            {breed.health_issues.map((h: string, i: number) => (
              <Text key={i} style={s.bullet}>• {h}</Text>
            ))}
          </Card>
        )}
      </ScrollView>
    </Screen>
  )
}

const s = StyleSheet.create({
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
  image: { width: '100%', height: 210, borderRadius: radius.xl, backgroundColor: colors.surfaceAlt },
  title: { ...type.section, color: colors.text },
  badges: { flexDirection: 'row', gap: space.xs, marginTop: space.sm, flexWrap: 'wrap' },
  desc: { ...type.body, color: colors.textMuted, marginTop: space.md },
  note: { ...type.caption, color: colors.textLight, marginTop: space.md },
  credit: { ...type.caption, fontSize: 10, color: colors.textLight, marginTop: space.xs, paddingHorizontal: space.xs },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.xs, gap: space.md },
  k: { ...type.caption, color: colors.textMuted },
  v: { ...type.caption, color: colors.text, fontWeight: weight.semibold, flexShrink: 1, textAlign: 'right' },
  sectionTitle: { ...type.emphasis, color: colors.text, marginBottom: space.sm },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs, marginTop: space.xs },
  lineTxt: { ...type.caption, color: colors.textMuted, flex: 1 },
  bullet: { ...type.caption, color: colors.textMuted, marginTop: space.xs },
})
