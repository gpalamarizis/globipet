import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessagesSquare, CheckCircle2, Pin, Check, Trash2, Pencil } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, Card, Badge, Button, Input, EmptyState, SkeletonRows } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Θέμα φόρουμ με απαντήσεις.
 *
 * Όπως το web (ForumTopic.tsx): ο δημιουργός του θέματος (ή admin) σημειώνει
 * την αποδεκτή απάντηση, και ο συντάκτης μιας απάντησης (ή admin) τη
 * διαγράφει. Ίδιοι έλεγχοι με τον server.
 * Ο συντάκτης (ή admin) επεξεργάζεται/διαγράφει και το θέμα του
 * (PATCH/DELETE /forum/:id) και επεξεργάζεται την απάντησή του
 * (PATCH /forum/replies/:replyId), όπως στο web.
 */
export default function ForumTopicScreen() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { isAuthenticated, user } = useAuthStore()
  const router = useRouter()
  const [reply, setReply] = useState('')
  const [editingTopic, setEditingTopic] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null)
  const [editReplyText, setEditReplyText] = useState('')

  const { data: topic, isLoading } = useQuery({
    queryKey: ['forum-topic', id],
    queryFn: () => api.get(`/forum/${id}`).then(r => r.data?.data ?? r.data),
    enabled: !!id,
  })

  const send = useMutation({
    mutationFn: () => api.post(`/forum/${id}/replies`, { content: reply.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forum-topic', id] })
      // Η λίστα δείχνει αριθμό απαντήσεων (όπως στο web).
      qc.invalidateQueries({ queryKey: ['forum'] })
      setReply('')
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const markAnswer = useMutation({
    mutationFn: (replyId: string) => api.post(`/forum/replies/${replyId}/answer`, {}),
    // Το θέμα γίνεται «λυμένο» και η λίστα το δείχνει.
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['forum-topic', id] }); qc.invalidateQueries({ queryKey: ['forum'] }) },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const deleteReply = useMutation({
    mutationFn: (replyId: string) => api.delete(`/forum/replies/${replyId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['forum-topic', id] }); qc.invalidateQueries({ queryKey: ['forum'] }) },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const confirmDelete = (replyId: string) =>
    Alert.alert(t('forum.confirmDelete'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteReply.mutate(replyId) },
    ])

  const onError = (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong'))

  const updateTopic = useMutation({
    mutationFn: () => api.patch(`/forum/${id}`, { title: editTitle.trim(), content: editContent.trim() }),
    onSuccess: () => {
      setEditingTopic(false)
      qc.invalidateQueries({ queryKey: ['forum-topic', id] })
      qc.invalidateQueries({ queryKey: ['forum'] })
    },
    onError,
  })

  const deleteTopic = useMutation({
    mutationFn: () => api.delete(`/forum/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forum'] })
      if (router.canGoBack()) router.back()
      else router.replace('/forum')
    },
    onError,
  })

  const confirmDeleteTopic = () =>
    Alert.alert(t('forum.confirmDeleteTopic'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteTopic.mutate() },
    ])

  const updateReply = useMutation({
    mutationFn: (replyId: string) => api.patch(`/forum/replies/${replyId}`, { content: editReplyText.trim() }),
    onSuccess: () => {
      setEditingReplyId(null)
      qc.invalidateQueries({ queryKey: ['forum-topic', id] })
    },
    onError,
  })

  if (isLoading) return <Screen title={t('forum.title')} back><SkeletonRows count={3} /></Screen>
  if (!topic) return (
    <Screen title={t('forum.title')} back>
      <EmptyState icon={MessagesSquare} title={t('forum.notFound')} />
    </Screen>
  )

  const replies = topic.replies ?? []
  const isAdmin = user?.role === 'admin'
  const isTopicAuthor = !!user?.email && user.email === topic.author_email

  return (
    <Screen title={t('forum.title')} back scroll={false}>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Card>
          <View style={s.topRow}>
            {topic.is_pinned && <Pin size={14} color={colors.brand} />}
            {topic.is_solved && <CheckCircle2 size={14} color={colors.success} />}
            {!editingTopic && <Text style={s.title}>{topic.title}</Text>}
          </View>
          <Text style={s.meta}>{topic.author_name ?? topic.author_email}</Text>
          {editingTopic ? (
            <View style={{ marginTop: space.sm }}>
              <Input label={t('forum.topicTitle')} value={editTitle} onChangeText={setEditTitle} />
              <Input label={t('forum.content')} value={editContent} onChangeText={setEditContent} multiline />
              <View style={s.editActions}>
                <Button label={t('common.cancel')} variant="secondary" size="sm"
                  onPress={() => setEditingTopic(false)} />
                <Button label={t('common.save')} size="sm" loading={updateTopic.isPending}
                  disabled={!editTitle.trim() || !editContent.trim() || updateTopic.isPending}
                  onPress={() => updateTopic.mutate()} />
              </View>
            </View>
          ) : (
            <Text style={s.content}>{topic.content}</Text>
          )}
          {(isTopicAuthor || isAdmin) && !editingTopic && (
            <View style={s.editActions}>
              <TouchableOpacity style={s.actionBtn} hitSlop={8}
                onPress={() => { setEditTitle(topic.title ?? ''); setEditContent(topic.content ?? ''); setEditingTopic(true) }}>
                <Pencil size={icon.sm} color={colors.textMuted} />
                <Text style={s.actionText}>{t('common.edit')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionBtn} hitSlop={8}
                disabled={deleteTopic.isPending} onPress={confirmDeleteTopic}>
                <Trash2 size={icon.sm} color={colors.danger} />
                <Text style={[s.actionText, { color: colors.danger }]}>{t('common.delete')}</Text>
              </TouchableOpacity>
            </View>
          )}
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
            {r.is_answer && <Text style={s.answerLabel}>{t('forum.acceptedAnswer')}</Text>}
            <View style={s.topRow}>
              {r.is_answer && <CheckCircle2 size={14} color={colors.success} />}
              <Text style={[s.author, { flex: 1 }]}>{r.author_name ?? r.author_email}</Text>
              {(isTopicAuthor || isAdmin) && !r.is_answer && (
                <TouchableOpacity hitSlop={10} accessibilityLabel={t('forum.markAnswer')}
                  disabled={markAnswer.isPending} onPress={() => markAnswer.mutate(r.id)}>
                  <Check size={icon.sm} color={colors.success} />
                </TouchableOpacity>
              )}
              {(isAdmin || (!!user?.email && r.author_email === user.email)) && editingReplyId !== r.id && (
                <TouchableOpacity hitSlop={10} accessibilityLabel={t('common.edit')}
                  onPress={() => { setEditReplyText(r.content ?? ''); setEditingReplyId(r.id) }}>
                  <Pencil size={icon.sm} color={colors.textMuted} />
                </TouchableOpacity>
              )}
              {(isAdmin || (!!user?.email && r.author_email === user.email)) && (
                <TouchableOpacity hitSlop={10} accessibilityLabel={t('common.delete')}
                  disabled={deleteReply.isPending} onPress={() => confirmDelete(r.id)}>
                  <Trash2 size={icon.sm} color={colors.danger} />
                </TouchableOpacity>
              )}
            </View>
            {editingReplyId === r.id ? (
              <View style={{ marginTop: space.sm }}>
                <Input value={editReplyText} onChangeText={setEditReplyText} multiline />
                <View style={s.editActions}>
                  <Button label={t('common.cancel')} variant="secondary" size="sm"
                    onPress={() => setEditingReplyId(null)} />
                  <Button label={t('common.save')} size="sm" loading={updateReply.isPending}
                    disabled={!editReplyText.trim() || updateReply.isPending}
                    onPress={() => updateReply.mutate(r.id)} />
                </View>
              </View>
            ) : (
              <Text style={s.content}>{r.content}</Text>
            )}
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
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingVertical: space.xs, paddingHorizontal: space.sm },
  actionText: { ...type.caption, color: colors.textMuted, fontWeight: weight.semibold },
  answerLabel: { ...type.caption, color: colors.success, fontWeight: weight.semibold, marginBottom: space.xs },
})
