import { useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { HeartHandshake, Plus, FileText, LayoutList, SlidersHorizontal, PawPrint } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, Input, Button, EmptyState, SkeletonRows } from '@/components/ui'
import { AdoptionCard, ChipRow, LegalGuide, AiAssistant, SPECIES, GUIDE_COUNTRIES } from '@/components/adoption'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Υιοθεσία — κατάλογος, ιστορίες επιτυχίας, νομικός οδηγός & AI.
 * Ίδιες καρτέλες και φίλτρα με τη σελίδα /adoption του web.
 */
type Tab = 'animals' | 'stories' | 'guide'

export default function AdoptionScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { user, isAuthenticated } = useAuthStore()
  const [tab, setTab] = useState<Tab>('animals')
  const userCountry = String((user as any)?.country || '').toUpperCase()
  const [guideCountry, setGuideCountry] = useState((GUIDE_COUNTRIES as readonly string[]).includes(userCountry) ? userCountry : 'GR')

  const [q, setQ] = useState('')
  const [species, setSpecies] = useState('')
  const [more, setMore] = useState(false)
  const [age, setAge] = useState('')
  const [sex, setSex] = useState('')
  const [size, setSize] = useState('')
  const [country, setCountry] = useState('')
  const [listerType, setListerType] = useState('')
  const [kids, setKids] = useState(false)
  const [sort, setSort] = useState('newest')

  const params = useMemo(() => ({
    q: q.trim() || undefined, species: species || undefined, age: age || undefined, sex: sex || undefined, size: size || undefined,
    country: country || undefined, lister_type: listerType || undefined, good_with_kids: kids ? 'yes' : undefined,
    sort: sort === 'newest' ? undefined : sort, status: tab === 'stories' ? 'adopted' : undefined,
  }), [q, species, age, sex, size, country, listerType, kids, sort, tab])

  const list = useInfiniteQuery({
    queryKey: ['adoption-listings', params],
    queryFn: ({ pageParam }) => api.get('/adoption/listings', { params: { ...params, page: pageParam, limit: 20 } }).then(r => r.data),
    initialPageParam: 1,
    getNextPageParam: (last: any) => (last.page < last.totalPages ? last.page + 1 : undefined),
    enabled: tab !== 'guide',
  })
  const rows: any[] = list.data?.pages.flatMap((p: any) => p.data) ?? []
  const total: number = list.data?.pages[0]?.total ?? 0

  const fav = async (l: any) => {
    if (!isAuthenticated) { router.push('/auth/login' as any); return }
    try {
      if (l.is_favorite) await api.delete(`/adoption/listings/${l.id}/favorite`)
      else await api.post(`/adoption/listings/${l.id}/favorite`, {})
      qc.invalidateQueries({ queryKey: ['adoption-listings'] })
    } catch (e: any) { Alert.alert(t('adoption.common.error'), e?.response?.data?.message || '') }
  }

  const all = t('adoption.filters.all')
  return (
    <Screen title={t('adoption.title')} back onRefresh={() => list.refetch()} refreshing={list.isRefetching}>
      <View style={s.hero}>
        <View style={s.heroIcon}><HeartHandshake size={icon.lg} color="#F43F5E" /></View>
        <Text style={s.heroTxt}>{t('adoption.subtitle')}</Text>
      </View>

      <Button label={t('adoption.cta.give')} icon={<Plus size={icon.sm} color={colors.textOnDark} />}
        onPress={() => router.push((isAuthenticated ? '/adoption-form' : '/auth/login') as any)} full />
      {isAuthenticated && (
        <View style={s.twoBtns}>
          <Button variant="secondary" size="sm" style={{ flex: 1 }} label={t('adoption.cta.myApplications')} icon={<FileText size={icon.sm} color={colors.text} />} onPress={() => router.push('/adoption-applications' as any)} />
          <Button variant="secondary" size="sm" style={{ flex: 1 }} label={t('adoption.cta.manage')} icon={<LayoutList size={icon.sm} color={colors.text} />} onPress={() => router.push('/adoption-manage' as any)} />
        </View>
      )}

      <View style={s.tabs}>
        {(['animals', 'stories', 'guide'] as Tab[]).map(k => (
          <TouchableOpacity key={k} onPress={() => setTab(k)} style={[s.tab, tab === k && s.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === k }}>
            <Text style={[s.tabTxt, tab === k && s.tabTxtOn]} numberOfLines={1}>{t(`adoption.tabs.${k}`)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'guide' ? (
        <>
          <LegalGuide country={guideCountry} onCountry={setGuideCountry} />
          <AiAssistant country={guideCountry} />
        </>
      ) : (
        <>
          {tab === 'animals' && (
            <>
              <Input value={q} onChangeText={setQ} placeholder={t('adoption.filters.search')} style={{ marginBottom: space.md }} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: space.md }}>
                <ChipRow scroll value={species} onChange={setSpecies}
                  options={[{ value: '', label: all }, ...SPECIES.map(sp => ({ value: sp, label: t(`adoption.species.${sp}`) }))]} />
              </ScrollView>
              <TouchableOpacity onPress={() => setMore(m => !m)} style={s.moreBtn} accessibilityState={{ expanded: more }}>
                <SlidersHorizontal size={icon.sm} color={colors.text} /><Text style={s.moreTxt}>{t('adoption.filters.more')}</Text>
              </TouchableOpacity>
              {more && (
                <View style={s.moreBox}>
                  <Text style={s.lbl}>{t('adoption.filters.sort')}</Text>
                  <ChipRow value={sort} onChange={setSort} options={[
                    { value: 'newest', label: t('adoption.filters.sortNewest') },
                    { value: 'youngest_animal', label: t('adoption.filters.sortYoungest') },
                    { value: 'oldest_animal', label: t('adoption.filters.sortOldest') }]} />
                  <Text style={s.lbl}>{t('adoption.filters.age')}</Text>
                  <ChipRow value={age} onChange={setAge} options={[{ value: '', label: all }, ...['baby', 'young', 'adult', 'senior'].map(a => ({ value: a, label: t(`adoption.age.${a}`) }))]} />
                  <Text style={s.lbl}>{t('adoption.filters.sex')}</Text>
                  <ChipRow value={sex} onChange={setSex} options={[{ value: '', label: all }, { value: 'male', label: t('adoption.sex.male') }, { value: 'female', label: t('adoption.sex.female') }]} />
                  <Text style={s.lbl}>{t('adoption.filters.size')}</Text>
                  <ChipRow value={size} onChange={setSize} options={[{ value: '', label: all }, ...['small', 'medium', 'large', 'xlarge'].map(z => ({ value: z, label: t(`adoption.size.${z}`) }))]} />
                  <Text style={s.lbl}>{t('adoption.filters.country')}</Text>
                  <ChipRow value={country} onChange={setCountry} options={[{ value: '', label: all }, ...GUIDE_COUNTRIES.map(c => ({ value: c, label: t(`adoption.countries.${c}`) }))]} />
                  <Text style={s.lbl}>{t('adoption.filters.listerType')}</Text>
                  <ChipRow value={listerType} onChange={setListerType} options={[{ value: '', label: all }, { value: 'organisation', label: t('adoption.filters.organisations') }, { value: 'individual', label: t('adoption.filters.individuals') }]} />
                  <Text style={s.lbl}>{t('adoption.filters.goodWithKids')}</Text>
                  <ChipRow value={kids ? 'yes' : ''} onChange={v => setKids(v === 'yes')} options={[{ value: '', label: all }, { value: 'yes', label: t('adoption.tristate.yes') }]} />
                </View>
              )}
            </>
          )}

          {list.isLoading ? <SkeletonRows count={3} height={260} /> : rows.length === 0 ? (
            <EmptyState icon={PawPrint} title={tab === 'stories' ? t('adoption.stories.empty') : t('adoption.manage.emptyHint')} />
          ) : (
            <>
              <Text style={s.count}>{t('adoption.filters.results', { count: total })}</Text>
              {rows.map(l => (
                <AdoptionCard key={l.id} l={l} onPress={() => router.push(`/adoption/${l.id}` as any)} onToggleFavorite={tab === 'animals' ? () => fav(l) : undefined} />
              ))}
              {list.hasNextPage && <Button variant="secondary" label={t('adoption.common.loadMore')} loading={list.isFetchingNextPage} onPress={() => list.fetchNextPage()} full />}
            </>
          )}
        </>
      )}
    </Screen>
  )
}

const s = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg },
  heroIcon: { width: 48, height: 48, borderRadius: radius.lg, backgroundColor: '#FFF1F2', alignItems: 'center', justifyContent: 'center' },
  heroTxt: { ...type.body, color: colors.textMuted, flex: 1 },
  twoBtns: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  tabs: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: space.xs, marginVertical: space.lg },
  tab: { flex: 1, minHeight: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xs },
  tabOn: { backgroundColor: colors.surface },
  tabTxt: { ...type.caption, color: colors.textMuted, fontWeight: weight.medium },
  tabTxtOn: { color: colors.text, fontWeight: weight.bold },
  moreBtn: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 40, marginBottom: space.md },
  moreTxt: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  moreBox: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, marginBottom: space.lg, borderWidth: 1, borderColor: colors.borderLight },
  lbl: { ...type.caption, color: colors.textMuted, fontWeight: weight.semibold, marginTop: space.md, marginBottom: space.sm },
  count: { ...type.caption, color: colors.textMuted, marginBottom: space.md },
})
