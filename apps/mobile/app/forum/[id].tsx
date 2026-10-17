import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessagesSquare, CheckCircle2, Pin } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, Card, Badge, Button, Input, EmptyState, SkeletonRows } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/** Θέμα φόρουμ με απαντήσεις. */
export default function ForumTopicScreen() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { isAuthenticated } = useAuthStore()
  const [reply, setReply] = useState('')

  const { data: topic, isLoading } = useQuery({
    queryKey: ['forum-topic', id],
    queryFn: () => api.get(`/forum/${id}`).then(r => r.data?.data ?? r.data),
    enabled: !!id,
  })

  const send = useMutation({
    mutationFn: () => api.post(`/forum/${id}/replies`, { content: reply.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forum-topic', id] })
      setReply('')
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  if (isLoading) return <Screen title={t('forum.title')} back><SkeletonRows count={3} /></Screen>
  if (!topic) return (
    <Screen title={t('forum.title')} back>
      <EmptyState icon={MessagesSquare} title={t('forum.notFound')} />
    </Screen>
  )

  const replies = topic.replies ?? []

  return (
    <Screen title={t('forum.title')} back scroll={false}>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Card>
          <View style={s.topRow}>
            {topic.is_pinned && <Pin size={14} color={colors.brand} />}
            {topic.is_solved && <CheckCircle2 size={14} color={colors.success} />}
            <Text style={s.title}>{topic.title}</Text>
          </View>
          <Text style={s.meta}>{topic.author_name ?? topic.author_email}</Text>
          <Text style={s.content}>{topic.content}</Text>
          {!!topic.category && (
            <View style={s.badges}>
              <Badge label={t(`forum.cat${topic.category.charAt(0).toUpperCase()}${topic.category.slice(1)}`, { defaultValue: topic.category })} tone="neutral" />
            </View>
          )}
        </Card>

        <Text style={s.sectionTitle}>{t('forum.replies', { count: replies.length })}</Text>
        {replies.length === 0 ? (
          <Text style={s.hint}>{t('forum.noReplies')}</Text>
        ) : replies.map((r: any) => (
          <Card key={r.id} style={r.is_answer ? s.answer : undefined}>
            <View style={s.topRow}>
              {r.is_answer && <CheckCircle2 size={14} color={colors.success} />}
              <Text style={s.author}>{r.author_name ?? r.author_email}</Text>
            </View>
            <Text style={s.content}>{r.content}</Text>
          </Card>
        ))}

        {isAuthenticated && (
          <>
            <Input label={t('forum.yourReply')} value={reply} onChangeText={setReply} multiline />
            <Button label={t('forum.sendReply')}
              disabled={!reply.trim() || send.isPending} loading={send.isPending}
              onPress={() => send.mutate()} full />
          </>
        )}
      </ScrollView>
    </Screen>
  )
}

const s = StyleSheet.create({
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  title: { ...type.section, color: colors.text, flex: 1 },
  author: { ...type.caption, color: colors.text, fontWeight: weight.semibold },
  meta: { ...type.caption, color: colors.textLight, marginTop: 2 },
  content: { ...type.body, color: colors.textMuted, marginTop: space.sm },
  badges: { flexDirection: 'row', gap: space.xs, marginTop: space.sm },
  sectionTitle: { ...type.emphasis, color: colors.text },
  hint: { ...type.caption, color: colors.textLight },
  answer: { borderColor: colors.success, borderWidth: 2 },
})
