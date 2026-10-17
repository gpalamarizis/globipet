import { View, Text, StyleSheet, ScrollView, Image } from 'react-native'
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

  const FACTS: [string, any][] = [
    ['breeds.size', breed.size],
    ['breeds.origin', breed.origin],
    ['breeds.lifespan', (breed.lifespan_min && breed.lifespan_max)
      ? t('breeds.years', { min: breed.lifespan_min, max: breed.lifespan_max }) : null],
    ['breeds.exercise', breed.exercise_needs],
    ['breeds.grooming', breed.grooming_needs],
  ]

  return (
    <Screen title={name} back scroll={false}>
      <ScrollView contentContainerStyle={s.body}>
        {!!breed.image_url && <Image source={{ uri: breed.image_url }} style={s.image} resizeMode="cover" />}

        <Card>
          <Text style={s.title}>{name}</Text>
          <View style={s.badges}>
            {breed.good_with_children && <Badge label={t('breeds.kidFriendly')} tone="success" />}
            {breed.good_with_pets && <Badge label={t('breeds.petFriendly')} tone="success" />}
            {breed.apartment_friendly && <Badge label={t('breeds.apartment')} tone="info" />}
          </View>
          {!!breed.description && <Text style={s.desc}>{breed.description}</Text>}
        </Card>

        <Card>
          {FACTS.filter(([, v]) => v).map(([k, v]) => (
            <View key={k} style={s.kv}>
              <Text style={s.k}>{t(k)}</Text>
              <Text style={s.v}>{String(v)}</Text>
            </View>
          ))}
        </Card>

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
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.xs, gap: space.md },
  k: { ...type.caption, color: colors.textMuted },
  v: { ...type.caption, color: colors.text, fontWeight: weight.semibold, flexShrink: 1, textAlign: 'right' },
  sectionTitle: { ...type.emphasis, color: colors.text, marginBottom: space.sm },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs, marginTop: space.xs },
  lineTxt: { ...type.caption, color: colors.textMuted, flex: 1 },
  bullet: { ...type.caption, color: colors.textMuted, marginTop: space.xs },
})
