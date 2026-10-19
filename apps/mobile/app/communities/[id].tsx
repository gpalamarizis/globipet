import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Send, MapPin } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, Card, Badge, EmptyState, SkeletonRows } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Λεπτομέρεια κοινότητας με μηνύματα.
 *
 * Η λίστα κοινοτήτων οδηγούσε πουθενά: ο χρήστης έμπαινε σε μια κοινότητα
 * και δεν είχε τρόπο να δει ποιος είναι μέσα ούτε να μιλήσει. Μια
 * κοινότητα χωρίς συζήτηση είναι απλώς μια εγγραφή σε πίνακα.
 */
export default function CommunityDetailScreen() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { isAuthenticated, user } = useAuthStore()
  const [text, setText] = useState('')

  const { data: community, isLoading } = useQuery({
    queryKey: ['community', id],
    queryFn: () => api.get(`/communities/${id}`).then(r => r.data?.data ?? r.data),
    enabled: !!id,
  })

  const { data: messages = [] } = useQuery({
    queryKey: ['community-messages', id],
    queryFn: () => api.get(`/communities/${id}/messages`).then(r => r.data?.data ?? r.data ?? []),
    enabled: !!id && isAuthenticated,
  })

  const send = useMutation({
    mutationFn: () => api.post(`/communities/${id}/messages`, { content: text.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community-messages', id] })
      setText('')
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  if (isLoading) return <Screen title={t('com.title')} back><SkeletonRows count={3} /></Screen>
  if (!community) return (
    <Screen title={t('com.title')} back>
      <EmptyState icon={Users} title={t('com.none')} />
    </Screen>
  )

  return (
    <Screen title={community.name} back scroll={false}>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={s.name}>{community.name}</Text>
          {!!community.city && (
            <View style={s.metaRow}>
              <MapPin size={icon.xs} color={colors.textLight} />
              <Text style={s.meta}>{community.city}</Text>
            </View>
          )}
          {!!community.description && <Text style={s.desc}>{community.description}</Text>}
          <View style={s.badges}>
            <Badge label={t('com.members') + ': ' + (community.members_count ?? 0)} tone="neutral" />
            {community.is_member && <Badge label={t('com.member')} tone="success" />}
          </View>
        </Card>

        <Text style={s.sectionTitle}>{t('com.discussion')}</Text>
        {!isAuthenticated ? (
          <Text style={s.hint}>{t('auth.login_to_continue')}</Text>
        ) : messages.length === 0 ? (
          <Text style={s.hint}>{t('com.noMessages')}</Text>
        ) : messages.map((m: any) => {
          const mine = m.author_email === (user as any)?.email
          return (
            <View key={m.id} style={[s.msg, mine && s.msgMine]}>
              {!mine && <Text style={s.msgAuthor}>{m.author_name ?? m.author_email}</Text>}
              <Text style={[s.msgTxt, mine && s.msgTxtMine]}>{m.content}</Text>
            </View>
          )
        })}
      </ScrollView>

      {isAuthenticated && (
        <View style={s.composer}>
          <TextInput style={s.input} value={text} onChangeText={setText}
            placeholder={t('com.messageHint')} placeholderTextColor={colors.textLight} />
          <TouchableOpacity style={s.sendBtn}
            disabled={!text.trim() || send.isPending}
            onPress={() => send.mutate()}>
            <Send size={18} color={colors.textOnDark} />
          </TouchableOpacity>
        </View>
      )}
    </Screen>
  )
}

const s = StyleSheet.create({
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xl },
  name: { ...type.section, color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs },
  meta: { ...type.caption, color: colors.textLight },
  desc: { ...type.body, color: colors.textMuted, marginTop: space.sm },
  badges: { flexDirection: 'row', gap: space.xs, marginTop: space.sm, flexWrap: 'wrap' },
  sectionTitle: { ...type.emphasis, color: colors.text },
  hint: { ...type.caption, color: colors.textLight },
  msg: {
    alignSelf: 'flex-start', maxWidth: '85%',
    backgroundColor: colors.surface, padding: space.md, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  msgMine: { alignSelf: 'flex-end', backgroundColor: colors.brandTint, borderColor: colors.brand },
  msgAuthor: { ...type.caption, color: colors.textLight, marginBottom: 2 },
  msgTxt: { ...type.body, color: colors.text },
  msgTxtMine: { color: colors.brand },
  composer: {
    flexDirection: 'row', gap: space.sm, alignItems: 'center',
    padding: space.lg, borderTopWidth: 1, borderTopColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  input: {
    ...type.body, color: colors.text, flex: 1, minHeight: 44,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
    paddingHorizontal: space.md,
  },
  sendBtn: { width: 44, height: 44, borderRadius: radius.lg, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
})
