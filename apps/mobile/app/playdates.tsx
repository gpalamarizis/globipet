import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { View, Text, StyleSheet, Image, Alert, Modal, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PawPrint, MapPin, Calendar, Clock, Users, Plus, Trash2, Check, X, UserPlus } from 'lucide-react-native'
import { api } from '../src/lib/api'
import { useAuthStore } from '../src/store/auth'
import { Screen, Card, Button, Badge, EmptyState, SkeletonRows, SectionHeader, Input } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'
import CampaignBanner from '@/components/CampaignBanner'

/**
 * Βόλτες και συναντήσεις.
 *
 * ΔΥΟ ΠΡΑΓΜΑΤΑ ΠΟΥ ΔΕΝ ΔΟΥΛΕΥΑΝ
 *   Η οθόνη διάβαζε `r.data?.data`. Το endpoint επιστρέφει
 *   `{ events, nearbyOwners }` — δηλαδή `data.data` ήταν πάντα undefined
 *   και η λίστα πάντα άδεια. Έδειχνε «Δεν υπάρχουν playdates» ακόμα κι
 *   όταν υπήρχαν δεκάδες.
 *
 *   Και το «Συμμετοχή» καλούσε POST /playdates/:id/join, που δεν υπήρχε —
 *   οι βόλτες δούλευαν μόνο με πρόσκληση από τον δημιουργό. Το endpoint
 *   προστέθηκε στο backend· εδώ ενεργοποιείται.
 *
 * Οι συμμετέχοντες μετριούνται από τις αποδεκτές προσκλήσεις που ήδη
 * επιστρέφει το endpoint, αντί για το `participants_count` που δεν υπάρχει
 * ως πεδίο και έδειχνε πάντα μηδέν.
 */

const TYPE_EMOJI: Record<string, string> = {
  walk: '🚶', play: '🎾', meetup: '🐾', training: '🎓', other: '✨',
}

const fmtDate = (d?: string) => {
  if (!d) return '—'
  const x = new Date(d)
  return isNaN(x.getTime()) ? d
    : x.toLocaleDateString('el-GR', { weekday: 'short', day: '2-digit', month: 'short' })
}

export default function PlaydatesScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  /**
   * Δημιουργία και διαγραφή βόλτας.
   *
   * Το κινητό μόνο συμμετείχε σε υπάρχουσες. Ο χρήστης που ήθελε να
   * οργανώσει βόλτα έπρεπε να ανοίξει υπολογιστή — για κάτι που γίνεται
   * με το τηλέφωνο στο χέρι, στο πάρκο.
   */
  const [creating, setCreating] = useState(false)
  const [pTitle, setPTitle] = useState('')
  const [pDate, setPDate] = useState(new Date(Date.now() + 864e5).toISOString().slice(0, 10))
  const [pTime, setPTime] = useState('18:00')
  const [pLocation, setPLocation] = useState('')
  const [pCity, setPCity] = useState('')
  const [pMax, setPMax] = useState('')

  const createPlaydate = useMutation({
    mutationFn: () => api.post('/playdates', {
      title: pTitle.trim(),
      date: pDate,
      time: pTime,
      location: pLocation.trim() || undefined,
      city: pCity.trim() || undefined,
      max_participants: pMax ? parseInt(pMax, 10) : undefined,
      is_public: true,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playdates'] })
      setCreating(false); setPTitle(''); setPLocation(''); setPMax('')
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const removePlaydate = useMutation({
    mutationFn: (pid: string) => api.delete(`/playdates/${pid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['playdates'] }),
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const { user, isAuthenticated } = useAuthStore()

  /**
   * Δικές μου βόλτες και προσκλήσεις.
   *
   * Το /playdates δείχνει τις δημόσιες κοντά· το /playdates/my δείχνει
   * όσες διοργανώνει ο χρήστης και τις προσκλήσεις που έλαβε. Χωρίς αυτό,
   * μια πρόσκληση δεν έφτανε ποτέ στον παραλήπτη.
   */
  const { data: mine } = useQuery({
    queryKey: ['playdates-mine'],
    queryFn: () => api.get('/playdates/my').then(r => r.data?.data ?? r.data),
    enabled: isAuthenticated,
  })
  const invitations: any[] = mine?.invitations ?? mine?.received ?? []

  const respondInvite = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/playdates/invitation/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playdates-mine'] })
      qc.invalidateQueries({ queryKey: ['playdates'] })
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const [invitingFor, setInvitingFor] = useState<any>(null)
  const [inviteEmail, setInviteEmail] = useState('')

  const sendInvite = useMutation({
    mutationFn: () => api.post(`/playdates/${invitingFor.id}/invite`, { email: inviteEmail.trim() }),
    onSuccess: () => {
      setInvitingFor(null); setInviteEmail('')
      Alert.alert(t('play.inviteSent'), t('play.inviteSentHint'))
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const [refreshing, setRefreshing] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['playdates'],
    // Το σχήμα είναι { events, nearbyOwners, userCity } — όχι { data }.
    queryFn: () => api.get('/playdates').then(r => r.data),
  })

  const events = data?.events ?? []
  const nearby = data?.nearbyOwners ?? []

  const join = useMutation({
    mutationFn: (id: string) => api.post(`/playdates/${id}/join`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['playdates'] }),
    onError: (e: any) => Alert.alert(t('common.error'), e?.message || t('play.join_failed')),
  })

  const leave = useMutation({
    mutationFn: (id: string) => api.delete(`/playdates/${id}/join`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['playdates'] }),
    onError: (e: any) => Alert.alert(t('common.error'), e?.message || t('play.leave_failed')),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['playdates'] })
    setRefreshing(false)
  }, [qc])

  /** Συμμετέχω αν το email μου είναι στις αποδεκτές προσκλήσεις. */
  const amIn = (ev: any) =>
    (ev.invitations ?? []).some((i: any) => i.invitee_email === user?.email)

  return (
    <Screen title={t('community.walks_meetups')}
      subtitle={data?.userCity ? t('play.near_city', { city: data.userCity }) : undefined}
      onRefresh={onRefresh} refreshing={refreshing}>
      <CampaignBanner page="playdates" slot="banner" />
      {invitations.length > 0 && (
        <Card style={{ marginBottom: space.md }}>
          <Text style={s.sectionTitle}>{t('play.invitations')}</Text>
          {invitations.map((inv: any) => (
            <View key={inv.id} style={s.inviteRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.inviteTitle} numberOfLines={1}>
                  {inv.event?.title ?? inv.title ?? t('play.invitation')}
                </Text>
                <Text style={s.inviteMeta} numberOfLines={1}>
                  {inv.event?.date ?? inv.date} {inv.event?.time ?? inv.time}
                </Text>
              </View>
              <TouchableOpacity style={s.accept}
                onPress={() => respondInvite.mutate({ id: inv.id, status: 'accepted' })}>
                <Check size={16} color={colors.success} />
              </TouchableOpacity>
              <TouchableOpacity style={s.decline}
                onPress={() => respondInvite.mutate({ id: inv.id, status: 'declined' })}>
                <X size={16} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </Card>
      )}

      <Button label={t('play.create')} icon={<Plus size={18} color={colors.textOnDark} />}
        onPress={() => setCreating(true)} full style={{ marginBottom: space.md }} />


      {isLoading ? (
        <SkeletonRows count={3} height={130} />
      ) : events.length === 0 ? (
        <EmptyState
          icon={PawPrint}
          title={t('play.none')}
          message={t('play.create_first')}
        />
      ) : (
        <View style={{ gap: space.md }}>
          {events.map((ev: any) => {
            const joined = amIn(ev)
            const accepted = (ev.invitations ?? []).length
            const full = ev.max_participants && accepted >= ev.max_participants
            const mine = ev.creator_email === user?.email
            return (
              <Card key={ev.id}>
                <View style={s.head}>
                  <View style={s.iconBox}>
                    <Text style={s.emoji}>{TYPE_EMOJI[ev.event_type] ?? '🐾'}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={s.titleRow}>
                      <Text style={s.title} numberOfLines={1}>{ev.title}</Text>
                      {mine && <Badge label={t('play.mine')} tone="brand" />}
                    </View>
                    <View style={s.metaRow}>
                      <MapPin size={icon.xs} color={colors.textLight} />
                      <Text style={s.meta} numberOfLines={1}>{ev.location}</Text>
                    </View>
                  </View>
                </View>

                <View style={s.metaRow}>
                  <Calendar size={icon.xs} color={colors.textLight} />
                  <Text style={s.meta}>{fmtDate(ev.date)}</Text>
                  {!!ev.time && (
                    <>
                      <Clock size={icon.xs} color={colors.textLight} />
                      <Text style={s.meta}>{ev.time}</Text>
                    </>
                  )}
                  <Users size={icon.xs} color={colors.textLight} />
                  <Text style={s.meta}>
                    {accepted}{ev.max_participants ? `/${ev.max_participants}` : ''}
                  </Text>
                </View>

                {!!ev.description && (
                  <Text style={s.desc} numberOfLines={3}>{ev.description}</Text>
                )}

                {/* Ποιοι έχουν δηλώσει ήδη — ένας αριθμός δεν λέει με ποιον
                    θα βρεθείς. */}
                {accepted > 0 && (
                  <Text style={s.who} numberOfLines={1}>
                    {(ev.invitations ?? [])
                      .map((i: any) => i.pet_name || i.invitee_name)
                      .filter(Boolean).slice(0, 4).join(' · ')}
                  </Text>
                )}

                {isAuthenticated && !mine && (
                  <Button
                    label={joined ? t('play.leave') : full ? t('play.full') : t('play.join')}
                    variant={joined ? 'secondary' : 'primary'}
                    size="sm"
                    full
                    disabled={!joined && !!full}
                    loading={join.isPending || leave.isPending}
                    onPress={() => joined ? leave.mutate(ev.id) : join.mutate(ev.id)}
                    style={{ marginTop: space.md }}
                  />
                )}
                {!isAuthenticated && (
                  <Button label={t('play.login_join')} variant="secondary" size="sm" full
                    onPress={() => router.push('/auth/login' as any)}
                    style={{ marginTop: space.md }} />
                )}
              </Card>
            )
          })}
        </View>
      )}

      {/* Ιδιοκτήτες κοντά — χωρίς email, το endpoint δεν το επιστρέφει πια. */}
      {nearby.length > 0 && (
        <>
          <SectionHeader title={t('play.near_you')} />
          <View style={s.ownerRow}>
            {nearby.slice(0, 8).map((o: any) => (
              <View key={o.id} style={s.owner}>
                <View style={s.ownerAvatar}>
                  {o.profile_photo
                    ? <Image source={{ uri: o.profile_photo }} style={s.ownerImg} />
                    : <Text style={s.ownerInitial}>
                        {o.full_name?.[0]?.toUpperCase() ?? '?'}
                      </Text>}
                </View>
                <Text style={s.ownerName} numberOfLines={1}>
                  {o.full_name?.split(' ')[0]}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
      <Modal visible={creating} transparent animationType="slide" onRequestClose={() => setCreating(false)}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{t('play.create')}</Text>
            <Input label={t('providerMkt.fTitleReq')} value={pTitle} onChangeText={setPTitle} />
            <View style={s.rowTwo}>
              <View style={{ flex: 1 }}>
                <Input label={t('serviceDetail.date')} value={pDate} onChangeText={setPDate} placeholder="YYYY-MM-DD" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label={t('serviceDetail.time')} value={pTime} onChangeText={setPTime} placeholder="18:00" />
              </View>
            </View>
            <Input label={t('play.location')} value={pLocation} onChangeText={setPLocation} />
            <Input label={t('common.city')} value={pCity} onChangeText={setPCity} />
            <Input label={t('play.maxParticipants')} value={pMax} onChangeText={setPMax} keyboardType="number-pad" />
            <View style={s.sheetActions}>
              <Button label={t('common.cancel')} variant="secondary"
                onPress={() => setCreating(false)} style={{ flex: 1 }} />
              <Button label={t('common.save')}
                disabled={pTitle.trim().length < 2 || !pDate || createPlaydate.isPending}
                loading={createPlaydate.isPending}
                onPress={() => createPlaydate.mutate()} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!invitingFor} transparent animationType="slide" onRequestClose={() => setInvitingFor(null)}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{t('play.invite')}</Text>
            <Text style={s.inviteMeta}>{invitingFor?.title}</Text>
            <Input label={t('common.email')} value={inviteEmail} onChangeText={setInviteEmail}
              keyboardType="email-address" autoCapitalize="none" />
            <View style={s.sheetActions}>
              <Button label={t('common.cancel')} variant="secondary"
                onPress={() => setInvitingFor(null)} style={{ flex: 1 }} />
              <Button label={t('play.send')}
                disabled={!inviteEmail.includes('@') || sendInvite.isPending}
                loading={sendInvite.isPending}
                onPress={() => sendInvite.mutate()} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

    </Screen>
  )
}

const s = StyleSheet.create({
  sectionTitle: { ...type.emphasis, color: colors.text, marginBottom: space.sm },
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  inviteTitle: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  inviteMeta: { ...type.caption, color: colors.textLight },
  accept: { width: 34, height: 34, borderRadius: radius.md, borderWidth: 1, borderColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  decline: { width: 34, height: 34, borderRadius: radius.md, borderWidth: 1, borderColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, padding: space.lg, gap: space.sm, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, maxHeight: '88%' },
  sheetTitle: { ...type.section, color: colors.text },
  sheetActions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  rowTwo: { flexDirection: 'row', gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm },
  iconBox: {
    width: 48, height: 48, borderRadius: radius.md,
    backgroundColor: colors.brandLight,
    alignItems: 'center', justifyContent: 'center',
  },
  emoji: { fontSize: 24 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { ...type.emphasis, color: colors.text, fontWeight: weight.semibold },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs },
  meta: { ...type.caption, color: colors.textMuted, marginRight: space.sm },

  desc: { ...type.body, color: colors.textMuted, marginTop: space.sm, lineHeight: 21 },
  who: { ...type.caption, color: colors.textLight, marginTop: space.sm },

  ownerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  owner: { alignItems: 'center', width: 68 },
  ownerAvatar: {
    width: 56, height: 56, borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', marginBottom: space.xs,
  },
  ownerImg: { width: 56, height: 56 },
  ownerInitial: { ...type.emphasis, color: colors.textMuted, fontWeight: weight.bold },
  ownerName: { ...type.caption, color: colors.text, textAlign: 'center' },
})
