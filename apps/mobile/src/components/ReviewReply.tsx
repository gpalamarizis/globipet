import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Trash2 } from 'lucide-react-native'
import { api } from '@/lib/api'
import { Button } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Η απάντηση του παρόχου κάτω από μια κριτική — ίδιο με το web
 * (web/src/components/provider/ReviewReply.tsx).
 *
 * PATCH /reviews/:id/response { response }: μόνο ο πάροχος της κριτικής
 * (review.provider_email) ή ο διαχειριστής. Κενό = διαγραφή απάντησης.
 * Όριο 2000 χαρακτήρες, όπως ο server.
 */
export const REVIEW_REPLY_MAX = 2000

export function ReviewReply({
  review, canEdit, invalidate, label,
}: {
  review: { id: string; response?: string | null }
  canEdit: boolean
  invalidate: unknown[][]
  label?: string
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(review.response ?? '')

  const save = useMutation({
    mutationFn: (response: string) => api.patch(`/reviews/${review.id}/response`, { response }),
    onSuccess: (_r, response) => {
      for (const key of invalidate) qc.invalidateQueries({ queryKey: key })
      setEditing(false)
      Alert.alert(response.trim() ? t('reviewReply.saved') : t('reviewReply.removed'))
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const open = () => { setText(review.response ?? ''); setEditing(true) }
  const remove = () => Alert.alert(t('reviewReply.confirmRemove'), '', [
    { text: t('common.dismiss'), style: 'cancel' },
    { text: t('reviewReply.remove'), style: 'destructive', onPress: () => save.mutate('') },
  ])

  if (editing) {
    const unchanged = text.trim() === (review.response ?? '').trim()
    return (
      <View style={s.reply}>
        <Text style={s.replyTitle}>{t('reviewReply.yourReply')}</Text>
        <TextInput
          value={text}
          onChangeText={v => setText(v.slice(0, REVIEW_REPLY_MAX))}
          maxLength={REVIEW_REPLY_MAX}
          multiline
          placeholder={t('reviewReply.placeholder')}
          placeholderTextColor={colors.textLight}
          style={s.input}
          autoFocus />
        <Text style={s.hint}>{t('reviewReply.publicHint')} · {text.length}/{REVIEW_REPLY_MAX}</Text>
        <View style={s.actions}>
          <Button label={t('common.cancel')} variant="secondary" size="sm"
            disabled={save.isPending} onPress={() => setEditing(false)} />
          <Button label={t('common.save')} size="sm" loading={save.isPending}
            disabled={save.isPending || !text.trim() || unchanged} onPress={() => save.mutate(text)} />
        </View>
      </View>
    )
  }

  return (
    <>
      {!!review.response && (
        <View style={s.reply}>
          <Text style={s.replyTitle}>{label ?? t('reviewReply.providerReply')}</Text>
          <Text style={s.replyText}>{review.response}</Text>
        </View>
      )}
      {canEdit && (
        <View style={s.links}>
          <TouchableOpacity style={s.link} onPress={open} hitSlop={8}>
            <MessageSquare size={icon.xs} color={colors.brand} />
            <Text style={s.linkTxt}>{review.response ? t('reviewReply.edit') : t('reviewReply.reply')}</Text>
          </TouchableOpacity>
          {!!review.response && (
            <TouchableOpacity style={s.link} onPress={remove} disabled={save.isPending} hitSlop={8}>
              <Trash2 size={icon.xs} color={colors.danger} />
              <Text style={[s.linkTxt, { color: colors.danger }]}>{t('reviewReply.remove')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  )
}

const s = StyleSheet.create({
  // Ίδια όψη με την απάντηση πωλητή που ήδη έδειχνε το products/[id].
  reply: { marginTop: space.sm, paddingLeft: space.sm, borderLeftWidth: 2, borderLeftColor: colors.brandLight },
  replyTitle: { ...type.caption, color: colors.brand, fontWeight: weight.semibold, marginBottom: 2 },
  replyText: { ...type.caption, color: colors.textMuted },
  input: {
    minHeight: 88, textAlignVertical: 'top',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: space.md, paddingVertical: space.sm, ...type.body, color: colors.text,
  },
  hint: { ...type.caption, color: colors.textLight, marginTop: space.xs },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm, marginTop: space.sm },
  links: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginTop: space.sm },
  link: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  linkTxt: { ...type.caption, color: colors.brand, fontWeight: weight.semibold },
})
