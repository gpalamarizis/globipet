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

const fmtDate = (d: string | undefined, lang: string) => {
  if (!d) return '—'
  // 'YYYY-MM-DD' ως τοπική ημερομηνία: το new Date('YYYY-MM-DD') είναι UTC
  // και σε ζώνες πίσω από το UTC έδειχνε την προηγούμενη μέρα.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d)
  const x = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(d)
  return isNaN(x.getTime()) ? d
    : x.toLocaleDateString(lang, { weekday: 'short', day: '2-digit', month: 'short' })
}

export default function PlaydatesScreen() {
  const { t, i18n } = useTranslation()
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
  // Αύριο, από τοπικά έτος/μήνα/ημέρα (το toISOString είναι UTC).
  const [pDate, setPDate] = useState(() => {
    const d = new Date(Date.now() + 864e5)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [pTime, setPTime] = useState('18:00')
  const [pLocation, setPLocation] = useState('')
  const [pCity, setPCity] = useState('')
  const [pMax, setPMax] = useState('')

  const createPlaydate = useMutation({
    mutationFn: () => api.post('/playdates', {
      title: pTitle.trim(),
      date: pDate,
      time: pTime,
      // Ο server θέλει υποχρεωτικά title, date, time, location, city (400
      // αλλιώς) — το κουμπί αποθήκευσης ελέγχει τα ίδια, όπως το web.
      location: pLocation.trim(),
      city: pCity.trim(),
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
  // Μόνο όσες περιμένουν απάντηση: το /playdates/my επιστρέφει και τις ήδη
  // αποδεκτές/απορριφθείσες, και τις συμμετοχές του ίδιου (accepted), που
  // εμφανίζονταν ξανά με κουμπιά αποδοχής/απόρριψης.
  const invitations: any[] = (mine?.invitations ?? mine?.received ?? [])
    .filter((i: any) => !i.status || i.status === 'pending')

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
  // Προαιρετικό μήνυμα πρόσκλησης — το backend το δέχεται (έως 500
  // χαρακτήρες) και το web το στέλνει.
  const [inviteMsg, setInviteMsg] = useState('')
  // Ιδιοκτήτης από τη λίστα «κοντά σου»: στέλνεται με invitee_id, αφού το
  // endpoint δεν επιστρέφει πια email.
  const [inviteOwner, setInviteOwner] = useState<any>(null)
  const closeInvite = () => { setInvitingFor(null); setInviteOwner(null) }

  const sendInvite = useMutation({
    // Το backend δέχεται invitee_id ή invitee_email — όχι `email`, που
    // γύριζε πάντα 400 «Λείπει ο παραλήπτης».
    mutationFn: () => api.post(`/playdates/${invitingFor.id}/invite`,
      inviteOwner
        ? { invitee_id: inviteOwner.id, message: inviteMsg.trim() || undefined }
        : { invitee_email: inviteEmail.trim(), message: inviteMsg.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playdates-mine'] })
      closeInvite(); setInviteEmail(''); setInviteMsg('')
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
    // Ο interceptor απορρίπτει με το σφάλμα του axios: το e.message είναι
    // «Request failed with status code…». Το μήνυμα του server είναι στο response.
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('play.join_failed')),
  })

  const leave = useMutation({
    mutationFn: (id: string) => api.delete(`/playdates/${id}/join`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['playdates'] }),
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('play.leave_failed')),
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
                {!!inv.message && (
                  <Text style={s.inviteMsg} numberOfLines={3}>“{inv.message}”</Text>
                )}
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
                  <Text style={s.meta}>{fmtDate(ev.date, i18n.language)}</Text>
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
                    loading={(join.isPending && join.variables === ev.id) || (leave.isPending && leave.variables === ev.id)}
                    onPress={() => joined ? leave.mutate(ev.id) : join.mutate(ev.id)}
                    style={{ marginTop: space.md }}
                  />
                )}
                {/* Ο διοργανωτής: πρόσκληση και διαγραφή, όπως στο web. Πριν, το
                    παράθυρο πρόσκλησης δεν άνοιγε από πουθενά. */}
                {isAuthenticated && mine && (
                  <View style={[s.sheetActions, { marginTop: space.md }]}>
                    <Button label={t('play.invitation')} size="sm" variant="secondary"
                      icon={<UserPlus size={icon.sm} color={colors.text} />}
                      onPress={() => { setInviteOwner(null); setInvitingFor(ev) }} style={{ flex: 1 }} />
                    <Button label={t('common.delete')} size="sm" variant="secondary"
                      icon={<Trash2 size={icon.sm} color={colors.danger} />}
                      loading={removePlaydate.isPending && removePlaydate.variables === ev.id}
                      onPress={() => Alert.alert(t('common.delete'), t('play.deleteQ', { title: ev.title }), [
                        { text: t('common.cancel'), style: 'cancel' },
                        { text: t('common.delete'), style: 'destructive', onPress: () => removePlaydate.mutate(ev.id) },
                      ])} style={{ flex: 1 }} />
                  </View>
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
              <TouchableOpacity key={o.id} style={s.owner} disabled={!isAuthenticated}
                onPress={() => {
                  const own = events.filter((e: any) => e.creator_email === user?.email)
                  if (!own.length) { Alert.alert(t('play.invite'), t('play.createEventFirst')); return }
                  setInviteOwner(o); setInvitingFor(own[0])
                }}>
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
              </TouchableOpacity>
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
                disabled={pTitle.trim().length < 2 || !pDate || !pTime.trim()
                  || !pLocation.trim() || !pCity.trim() || createPlaydate.isPending}
                loading={createPlaydate.isPending}
                onPress={() => createPlaydate.mutate()} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!invitingFor} transparent animationType="slide" onRequestClose={closeInvite}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{t('play.invite')}</Text>
            <Text style={s.inviteMeta}>{invitingFor?.title}</Text>
            {inviteOwner ? (
              <Text style={s.inviteTitle}>{t('play.inviteTo', { name: inviteOwner.full_name })}</Text>
            ) : (
              <Input label={t('common.email')} value={inviteEmail} onChangeText={setInviteEmail}
                keyboardType="email-address" autoCapitalize="none" />
            )}
            <Input label={t('play.messageOptional')} value={inviteMsg} onChangeText={setInviteMsg}
              placeholder={t('play.messagePlaceholder')} multiline />
            <View style={s.sheetActions}>
              <Button label={t('common.cancel')} variant="secondary"
                onPress={closeInvite} style={{ flex: 1 }} />
              <Button label={t('play.send')}
                disabled={(!inviteOwner && !inviteEmail.includes('@')) || sendInvite.isPending}
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
  inviteMsg: { ...type.caption, color: colors.textMuted, fontStyle: 'italic', marginTop: 2 },
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
