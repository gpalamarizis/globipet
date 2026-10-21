import { useCallback, useMemo, useState } from 'react'
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Dog } from 'lucide-react-native'
import { api } from '@/lib/api'
import { Screen, Card, Badge, EmptyState, SkeletonRows, Input } from '@/components/ui'
import { ErrorState } from '@/components/ErrorState'
import { colors, space, radius, type, weight } from '@/theme'

/** Εξερεύνηση ρατσών. */
export default function BreedsScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [species, setSpecies] = useState('')

  const { data: breeds = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['breeds'],
    queryFn: () => api.get('/breeds').then(r => r.data?.data ?? r.data ?? []),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await qc.invalidateQueries({ queryKey: ['breeds'] }); setRefreshing(false)
  }, [qc])

  // Το ελληνικό όνομα υπάρχει ως ξεχωριστό πεδίο· σε άλλες γλώσσες το αγγλικό.
  const name = (b: any) => (i18n.language === 'el' && b.name_el) ? b.name_el : b.name

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return breeds.filter((b: any) =>
      (!species || b.species === species) &&
      (!q || name(b).toLowerCase().includes(q)))
  }, [breeds, search, species, i18n.language])

  return (
    <Screen title={t('breeds.title')} back onRefresh={onRefresh} refreshing={refreshing}>
      <Input value={search} onChangeText={setSearch} placeholder={t('breeds.search')} />

      <View style={s.chips}>
        {([['', 'common.all'], ['dog', 'pets.kind_dog'], ['cat', 'pets.kind_cat']] as const).map(([v, k]) => {
          const on = species === v
          return (
            <TouchableOpacity key={k} activeOpacity={0.7}
              style={[s.chip, on && s.chipOn]} onPress={() => setSpecies(v)}>
              <Text style={[s.chipTxt, on && s.chipTxtOn]}>{t(k)}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {isLoading ? <SkeletonRows count={4} /> :
       isError && breeds.length === 0 ? <ErrorState onRetry={() => refetch()} retrying={isFetching} /> :
       filtered.length === 0 ? <EmptyState icon={Dog} title={t('common.no_results')} /> :
       filtered.map((b: any) => (
        <Card key={b.id} onPress={() => router.push(`/breeds/${b.id}` as any)}>
          <View style={s.row}>
            {b.image_url
              ? <Image source={{ uri: b.image_url }} style={s.thumb} />
              : <View style={[s.thumb, s.thumbEmpty]}>
                  <Text style={s.emoji}>{b.species === 'cat' ? '🐈' : '🐕'}</Text>
                </View>}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.name} numberOfLines={1}>{name(b)}</Text>
              {(b.weight_min != null && b.weight_max != null) && (
                <Text style={s.meta}>{b.weight_min}–{b.weight_max} kg</Text>
              )}
              <View style={s.badges}>
                {b.good_with_children && <Badge label={t('breeds.kidFriendly')} tone="success" />}
                {b.apartment_friendly && <Badge label={t('breeds.apartment')} tone="info" />}
              </View>
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  )
}

const s = StyleSheet.create({
  chips: { flexDirection: 'row', gap: space.sm, marginBottom: space.md },
  chip: { paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface },
  chipOn: { borderColor: colors.brand, backgroundColor: colors.brandTint },
  chipTxt: { ...type.caption, color: colors.textMuted, fontWeight: weight.medium },
  chipTxtOn: { color: colors.brand, fontWeight: weight.bold },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  thumb: { width: 62, height: 62, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 26 },
  name: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  meta: { ...type.caption, color: colors.textLight },
  badges: { flexDirection: 'row', gap: space.xs, marginTop: space.xs, flexWrap: 'wrap' },
})
