import { useCallback, useMemo, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessagesSquare, Plus, Pin, CheckCircle2, X, Eye } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, Card, Badge, Button, Input, EmptyState, SkeletonRows } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Φόρουμ — λίστα θεμάτων και δημιουργία νέου.
 *
 * Οι κατηγορίες κρατούνται ως ΚΛΕΙΔΙ: η τιμή που αποθηκεύεται στη βάση δεν
 * πρέπει να εξαρτάται από τη γλώσσα του χρήστη τη στιγμή που γράφει.
 */
const CATEGORIES = [
  { value: '',          labelKey: 'common.all' },
  { value: 'health',    labelKey: 'forum.catHealth' },
  { value: 'nutrition', labelKey: 'forum.catNutrition' },
  { value: 'behaviour', labelKey: 'forum.catBehaviour' },
  { value: 'general',   labelKey: 'forum.catGeneral' },
]

export default function ForumScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()

  const [refreshing, setRefreshing] = useState(false)
  const [category, setCategory] = useState('')
  const [composing, setComposing] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [newCategory, setNewCategory] = useState('general')

  const { data: topics = [], isLoading } = useQuery({
    queryKey: ['forum'],
    queryFn: () => api.get('/forum').then(r => r.data?.data ?? r.data ?? []),
  })

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

  const filtered = useMemo(
    () => category ? topics.filter((x: any) => x.category === category) : topics,
    [topics, category])

  return (
    <Screen title={t('forum.title')} back onRefresh={onRefresh} refreshing={refreshing}>
      {isAuthenticated && (
        <Button label={t('forum.newTopic')} icon={<Plus size={18} color={colors.textOnDark} />}
          onPress={() => setComposing(true)} full style={{ marginBottom: space.md }} />
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {CATEGORIES.map(c => {
          const on = category === c.value
          return (
            <TouchableOpacity key={c.labelKey} activeOpacity={0.7}
              style={[s.chip, on && s.chipOn]} onPress={() => setCategory(c.value)}>
              <Text style={[s.chipTxt, on && s.chipTxtOn]}>{t(c.labelKey)}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {isLoading ? <SkeletonRows count={4} /> :
       filtered.length === 0 ? <EmptyState icon={MessagesSquare} title={t('forum.empty')} message={t('forum.emptyHint')} /> :
       filtered.map((x: any) => (
        <Card key={x.id} onPress={() => router.push(`/forum/${x.id}` as any)}>
          <View style={s.topRow}>
            {x.is_pinned && <Pin size={13} color={colors.brand} />}
            {x.is_solved && <CheckCircle2 size={13} color={colors.success} />}
            <Text style={s.title} numberOfLines={2}>{x.title}</Text>
          </View>
          <Text style={s.meta} numberOfLines={1}>
            {x.author_name ?? x.author_email} · {t('forum.replies', { count: x.replies_count ?? 0 })}
          </Text>
          <View style={s.badges}>
            {!!x.category && <Badge label={t(`forum.cat${x.category.charAt(0).toUpperCase()}${x.category.slice(1)}`, { defaultValue: x.category })} tone="neutral" />}
            {x.views_count > 0 && (
              <View style={s.views}>
                <Eye size={12} color={colors.textLight} />
                <Text style={s.viewsTxt}>{x.views_count}</Text>
              </View>
            )}
          </View>
        </Card>
      ))}

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
