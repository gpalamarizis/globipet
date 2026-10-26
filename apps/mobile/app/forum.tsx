import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useInfiniteQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { MessagesSquare, Plus, Pin, CheckCircle2, X, Eye } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, Card, Badge, Button, Input, EmptyState, SkeletonRows } from '@/components/ui'
import { ErrorState } from '@/components/ErrorState'
import { LoadMore, useDebounced, nextPageOf, flattenPages } from '@/components/ListPaging'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Φόρουμ — λίστα θεμάτων και δημιουργία νέου.
 *
 * Οι κατηγορίες κρατούνται ως ΚΛΕΙΔΙ: η τιμή που αποθηκεύεται στη βάση δεν
 * πρέπει να εξαρτάται από τη γλώσσα του χρήστη τη στιγμή που γράφει.
 *
 * Ίδιες τιμές με το web (Forum.tsx): το κινητό αποθήκευε «behaviour» ενώ το
 * web «behavior», και έλειπαν training/adoption — το φίλτρο της μίας
 * πλατφόρμας δεν έβρισκε τα θέματα της άλλης.
 */
const CATEGORIES = [
  { value: '',          labelKey: 'common.all' },
  { value: 'health',    labelKey: 'forum.catHealth' },
  { value: 'nutrition', labelKey: 'forum.catNutrition' },
  { value: 'training',  labelKey: 'forum.catTraining' },
  { value: 'behavior',  labelKey: 'forum.catBehaviour' },
  { value: 'adoption',  labelKey: 'forum.catAdoption' },
  { value: 'general',   labelKey: 'forum.catGeneral' },
]
// Παλιά θέματα από το κινητό έχουν «behaviour»: ίδια ετικέτα.
const catLabelKey = (v: string) => v === 'behaviour' ? 'forum.catBehaviour' : CATEGORIES.find(c => c.value === v)?.labelKey
const PAGE_SIZE = 20

export default function ForumScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()

  const [refreshing, setRefreshing] = useState(false)
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const q = useDebounced(search.trim())
  const [composing, setComposing] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [newCategory, setNewCategory] = useState('general')

  // Αναζήτηση, κατηγορία και σελίδες στον server (GET /forum?q&category&page&limit),
  // όπως στο web — πριν ερχόταν μόνο η πρώτη σελίδα (20) και η κατηγορία
  // φιλτραριζόταν μόνο μέσα σε αυτήν.
  const topicsQuery = useInfiniteQuery({
    queryKey: ['forum', { q, category }],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api.get('/forum', {
      params: { q: q || undefined, category: category || undefined, page: pageParam, limit: PAGE_SIZE },
    }).then(r => r.data),
    getNextPageParam: nextPageOf,
    placeholderData: keepPreviousData,
  })
  const { isLoading, isError, refetch, isFetching } = topicsQuery
  const topics = flattenPages(topicsQuery.data?.pages)

  const create = useMutation({
    mutationFn: () => api.post('/forum', {
      title: title.trim(),
      content: content.trim(),
      category: newCategory,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forum'] })
      setComposing(false); setTitle(''); setContent('')
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await qc.invalidateQueries({ queryKey: ['forum'] }); setRefreshing(false)
  }, [qc])

  return (
    <Screen title={t('forum.title')} back onRefresh={onRefresh} refreshing={refreshing}>
      {isAuthenticated && (
        <Button label={t('forum.newTopic')} icon={<Plus size={18} color={colors.textOnDark} />}
          onPress={() => setComposing(true)} full style={{ marginBottom: space.md }} />
      )}

      <Input value={search} onChangeText={setSearch} placeholder={t('forum.searchPlaceholder')} />

      <View style={[s.chips, { flexWrap: 'wrap' }]}>
        {CATEGORIES.map(c => {
          const on = category === c.value
          return (
            <TouchableOpacity key={c.labelKey} activeOpacity={0.7}
              style={[s.chip, on && s.chipOn]} onPress={() => setCategory(c.value)}>
              <Text style={[s.chipTxt, on && s.chipTxtOn]}>{t(c.labelKey)}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {isLoading ? <SkeletonRows count={4} /> :
       isError && topics.length === 0 ? <ErrorState onRetry={() => refetch()} retrying={isFetching} /> :
       topics.length === 0 ? (q || category
         ? <EmptyState icon={MessagesSquare} title={t('common.no_results')} message={q ? t('common.try_another_search') : t('common.try_another_category')} />
         : <EmptyState icon={MessagesSquare} title={t('forum.empty')} message={t('forum.emptyHint')} />) :
       topics.map((x: any) => (
        <Card key={x.id} onPress={() => router.push(`/forum/${x.id}` as any)}>
          <View style={s.topRow}>
            {x.is_pinned && <Pin size={13} color={colors.brand} />}
            {x.is_solved && <CheckCircle2 size={13} color={colors.success} />}
            <Text style={s.title} numberOfLines={2}>{x.title}</Text>
          </View>
          <Text style={s.meta} numberOfLines={1}>
            {x.author_name} · {t('forum.replies', { count: x.replies_count ?? 0 })}
          </Text>
          <View style={s.badges}>
            {!!x.category && <Badge label={catLabelKey(x.category) ? t(catLabelKey(x.category)!) : x.category} tone="neutral" />}
            {x.views_count > 0 && (
              <View style={s.views}>
                <Eye size={12} color={colors.textLight} />
                <Text style={s.viewsTxt}>{x.views_count}</Text>
              </View>
            )}
          </View>
        </Card>
      ))}

      {topics.length > 0 && (
        <LoadMore hasMore={!!topicsQuery.hasNextPage} loading={topicsQuery.isFetchingNextPage}
          onPress={() => topicsQuery.fetchNextPage()} />
      )}

      <Modal visible={composing} transparent animationType="slide" onRequestClose={() => setComposing(false)}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>{t('forum.newTopic')}</Text>
              <TouchableOpacity onPress={() => setComposing(false)}>
                <X size={icon.md} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ gap: space.md }} keyboardShouldPersistTaps="handled">
              <Input label={t('forum.topicTitle')} value={title} onChangeText={setTitle} />
              <Input label={t('forum.content')} value={content} onChangeText={setContent} multiline />
              <Text style={s.label}>{t('providerDash.category')}</Text>
              <View style={s.chips}>
                {CATEGORIES.filter(c => c.value).map(c => {
                  const on = newCategory === c.value
                  return (
                    <TouchableOpacity key={c.value} activeOpacity={0.7}
                      style={[s.chip, on && s.chipOn]} onPress={() => setNewCategory(c.value)}>
                      <Text style={[s.chipTxt, on && s.chipTxtOn]}>{t(c.labelKey)}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </ScrollView>
            <Button label={t('forum.publish')}
              disabled={title.trim().length < 3 || !content.trim() || create.isPending}
              loading={create.isPending}
              onPress={() => create.mutate()} full />
          </View>
        </View>
      </Modal>
    </Screen>
  )
}

const s = StyleSheet.create({
  chips: { flexDirection: 'row', gap: space.sm, paddingRight: space.lg, marginBottom: space.md, flexWrap: 'wrap' },
  chip: { paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface },
  chipOn: { borderColor: colors.brand, backgroundColor: colors.brandTint },
  chipTxt: { ...type.caption, color: colors.textMuted, fontWeight: weight.medium },
  chipTxtOn: { color: colors.brand, fontWeight: weight.bold },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  title: { ...type.body, color: colors.text, fontWeight: weight.semibold, flex: 1 },
  meta: { ...type.caption, color: colors.textLight, marginTop: space.xs },
  badges: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  views: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  viewsTxt: { ...type.caption, color: colors.textLight },
  label: { ...type.caption, color: colors.textMuted, fontWeight: weight.semibold },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: space.lg, gap: space.md, maxHeight: '85%' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { ...type.section, color: colors.text },
})
