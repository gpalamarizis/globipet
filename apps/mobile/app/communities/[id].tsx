import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Image } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Send, MapPin, ImagePlus } from 'lucide-react-native'
import { pickAndUploadImage } from '@/lib/uploadImage'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, Card, Badge, Button, EmptyState, SkeletonRows } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'
import { ContentActions } from '@/components/ContentActions'

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

  // Το backend επιστρέφει isMember και member_count (όχι is_member / members_count).
  const isMember = !!(community?.isMember ?? community?.is_member)

  const { data: messages = [] } = useQuery({
    queryKey: ['community-messages', id],
    // Σχήμα: { messages: [...] }. Το παλιό `r.data?.data ?? r.data` έδινε το
    // αντικείμενο αντί για πίνακα. Μόνο για μέλη — στους άλλους το endpoint γυρίζει 403.
    queryFn: () => api.get(`/communities/${id}/messages`).then(r => r.data?.messages ?? r.data?.data ?? []),
    enabled: !!id && isAuthenticated && isMember,
  })

  const refreshMembership = () => {
    qc.invalidateQueries({ queryKey: ['community', id] })
    qc.invalidateQueries({ queryKey: ['communities'] })
    qc.invalidateQueries({ queryKey: ['community-messages', id] })
  }
  const join = useMutation({
    mutationFn: () => api.post(`/communities/${id}/join`),
    onSuccess: refreshMembership,
    onError: (e: any) => Alert.alert(t('com.join_failed'), e?.response?.data?.message || t('common.try_again_later')),
  })
  const leave = useMutation({
    mutationFn: () => api.delete(`/communities/${id}/leave`),
    // Μετά την αποχώρηση τα μηνύματα δεν είναι πια προσβάσιμα: invalidate θα
    // τα ξαναζητούσε και θα έπαιρνε 403 (με επαναλήψεις). Τα αφαιρούμε.
    // Το await κρατά τη μετάλλαξη σε εκκρεμότητα ώσπου το isMember να γίνει
    // false, ώστε κανένα ενδιάμεσο render να μην ξαναζητήσει τα μηνύματα.
    onSuccess: async () => {
      qc.removeQueries({ queryKey: ['community-messages', id] })
      qc.invalidateQueries({ queryKey: ['communities'] })
      await qc.invalidateQueries({ queryKey: ['community', id] })
    },
    onError: (e: any) => Alert.alert(t('play.leave_failed'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const send = useMutation({
    mutationFn: () => api.post(`/communities/${id}/messages`, { content: text.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community-messages', id] })
      setText('')
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  // Φωτογραφία στη συζήτηση — όπως το web (φάκελος «communities»).
  const [uploadingImg, setUploadingImg] = useState(false)
  const sendImage = async () => {
    setUploadingImg(true)
    try {
      const url = await pickAndUploadImage('communities')
      if (!url) return
      await api.post(`/communities/${id}/messages`, { image_url: url })
      qc.invalidateQueries({ queryKey: ['community-messages', id] })
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message === 'permission'
        ? t('providerEdit.photoPermission')
        : e?.response?.data?.message || t('providerEdit.errUpload'))
    } finally { setUploadingImg(false) }
  }

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
            <Badge label={t('com.members') + ': ' + (community.member_count ?? community.members_count ?? 0)} tone="neutral" />
            {isMember && <Badge label={t('com.member')} tone="success" />}
          </View>
          {isAuthenticated && (
            <Button label={isMember ? t('play.leave') : t('play.join')}
              variant={isMember ? 'secondary' : 'primary'} size="sm" full
              loading={join.isPending || leave.isPending}
              onPress={() => isMember ? leave.mutate() : join.mutate()}
              style={{ marginTop: space.md }} />
          )}
        </Card>

        <Text style={s.sectionTitle}>{t('com.discussion')}</Text>
        {!isAuthenticated ? (
          <Text style={s.hint}>{t('auth.login_to_continue')}</Text>
        ) : !isMember ? (
          <Text style={s.hint}>{t('com.membersOnly')}</Text>
        ) : messages.length === 0 ? (
          <Text style={s.hint}>{t('com.noMessages')}</Text>
        ) : messages.map((m: any) => {
          // is_mine από τον server: τα author_email των μελών δεν επιστρέφονται πια.
          const mine = m.is_mine === true
          return (
            <View key={m.id} style={[s.msg, mine && s.msgMine]}>
              {!mine && (
                <View style={s.msgHead}>
                  <Text style={[s.msgAuthor, { flexShrink: 1, marginBottom: 0 }]}>{m.author_name}</Text>
                  {/* App Store 1.2: αναφορά / αποκλεισμός. */}
                  <ContentActions type="community_message" id={String(m.id)} isMine={mine} size={icon.sm} />
                </View>
              )}
              {!!m.content && <Text style={[s.msgTxt, mine && s.msgTxtMine]}>{m.content}</Text>}
              {/* Μηνύματα με φωτογραφία (από web ή κινητό) — πριν δεν φαίνονταν καθόλου. */}
              {!!m.image_url && <Image source={{ uri: m.image_url }} style={s.msgImg} resizeMode="cover" />}
            </View>
          )
        })}
      </ScrollView>

      {isAuthenticated && isMember && (
        <View style={s.composer}>
          <TouchableOpacity style={s.imgBtn} disabled={uploadingImg} onPress={sendImage}
            accessibilityLabel={t('providerEdit.addPhoto')}>
            <ImagePlus size={18} color={uploadingImg ? colors.textLight : colors.brand} />
          </TouchableOpacity>
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
  msgHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: 2 },
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
  msgImg: { width: 200, height: 150, borderRadius: radius.md, marginTop: space.xs, backgroundColor: colors.surfaceAlt },
  imgBtn: {
    width: 44, height: 44, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtn: { width: 44, height: 44, borderRadius: radius.lg, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
})
