import { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Dog } from 'lucide-react-native'
import { api } from '@/lib/api'
import { Screen, Card, Badge, EmptyState, SkeletonRows, Input } from '@/components/ui'
import { ErrorState } from '@/components/ErrorState'
import { colors, space, radius, type, weight } from '@/theme'

const PAGE_SIZE = 24
const Gap = () => <View style={{ height: space.sm }} />

/**
 * Εξερεύνηση ρατσών.
 *
 * Ε16: ο server επιστρέφει σελίδες (20 από προεπιλογή) — πριν το κινητό
 * ζητούσε μόνο την πρώτη και φιλτράριζε τοπικά, οπότε οι υπόλοιπες ράτσες
 * δεν εμφανίζονταν ποτέ και η αναζήτηση έψαχνε μόνο σε 20. Τώρα, όπως το web
 * (BreedExplorer): q/species/page/limit στον server, και φόρτωση της επόμενης
 * σελίδας στο τέλος της λίστας.
 */
export default function BreedsScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const insets = useSafeAreaInsets()
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [species, setSpecies] = useState('')
  // Ένα αίτημα όταν σταματήσει η πληκτρολόγηση, όχι ένα ανά γράμμα.
  const [q, setQ] = useState('')
  useEffect(() => {
    const h = setTimeout(() => setQ(search.trim()), 300)
    return () => clearTimeout(h)
  }, [search])

  const breedsQuery = useInfiniteQuery({
    queryKey: ['breeds', { q, species }],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api.get('/breeds', {
      params: {
        q: q || undefined,
        species: species || undefined,
        page: pageParam,
        limit: PAGE_SIZE,
      },
    }).then(r => r.data),
    getNextPageParam: (last: any) =>
      last && Number(last.page) < Number(last.totalPages) ? Number(last.page) + 1 : undefined,
  })
  const { isLoading, isError, refetch, isFetching } = breedsQuery

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await qc.invalidateQueries({ queryKey: ['breeds'] }); setRefreshing(false)
  }, [qc])

  // Το ελληνικό όνομα υπάρχει ως ξεχωριστό πεδίο· σε άλλες γλώσσες το αγγλικό.
  const name = (b: any) => (i18n.language === 'el' && b.name_el) ? b.name_el : b.name

  // Χωρίς διπλά κατά id (νέα ράτσα ανάμεσα σε δύο σελίδες μετακινεί το offset).
  const breeds: any[] = useMemo(() => {
    const seen = new Set<string>()
    return (breedsQuery.data?.pages.flatMap((p: any) => (Array.isArray(p) ? p : p?.data) ?? []) ?? [])
      .filter((b: any) => {
        if (b?.id == null) return true
        if (seen.has(b.id)) return false
        seen.add(b.id); return true
      })
  }, [breedsQuery.data])

  return (
    <Screen title={t('breeds.title')} back scroll={false}>
      <FlatList
        data={isLoading || (isError && breeds.length === 0) ? [] : breeds}
        keyExtractor={(b: any, i) => String(b?.id ?? i)}
        contentContainerStyle={{ padding: space.lg, paddingBottom: insets.bottom + space.xxxl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={Gap}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (breedsQuery.hasNextPage && !breedsQuery.isFetchingNextPage) void breedsQuery.fetchNextPage()
        }}
        ListHeaderComponent={<>
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
        </>}
        ListEmptyComponent={
          isLoading ? <SkeletonRows count={4} /> :
          isError ? <ErrorState onRetry={() => refetch()} retrying={isFetching} /> :
          <EmptyState icon={Dog} title={t('common.no_results')} />}
        ListFooterComponent={breedsQuery.isFetchingNextPage
          ? <ActivityIndicator color={colors.brand} style={{ marginTop: space.md }} />
          : null}
        renderItem={({ item: b }: { item: any }) => (
            <Card onPress={() => router.push(`/breeds/${b.id}` as any)}>
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
        )}
      />
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
