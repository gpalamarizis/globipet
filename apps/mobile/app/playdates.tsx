import { useState, useCallback } from 'react'
import { View, Text, StyleSheet, Image, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PawPrint, MapPin, Calendar, Clock, Users } from 'lucide-react-native'
import { api } from '../src/lib/api'
import { useAuthStore } from '../src/store/auth'
import { Screen, Card, Button, Badge, EmptyState, SkeletonRows, SectionHeader } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

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
  const router = useRouter()
  const qc = useQueryClient()
  const { user, isAuthenticated } = useAuthStore()
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
    onError: (e: any) => Alert.alert('Σφάλμα', e?.message || 'Δεν ήταν δυνατή η συμμετοχή'),
  })

  const leave = useMutation({
    mutationFn: (id: string) => api.delete(`/playdates/${id}/join`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['playdates'] }),
    onError: (e: any) => Alert.alert('Σφάλμα', e?.message || 'Δεν ήταν δυνατή η αποχώρηση'),
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
    <Screen title="Βόλτες & συναντήσεις"
      subtitle={data?.userCity ? `Κοντά στην ${data.userCity}` : undefined}
      onRefresh={onRefresh} refreshing={refreshing}>

      {isLoading ? (
        <SkeletonRows count={3} height={130} />
      ) : events.length === 0 ? (
        <EmptyState
          icon={PawPrint}
          title="Καμία βόλτα κοντά σου"
          message="Δημιούργησε την πρώτη και κάλεσε άλλους ιδιοκτήτες."
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
                      {mine && <Badge label="Δική σου" tone="brand" />}
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
                    label={joined ? 'Αποχώρηση' : full ? 'Συμπληρώθηκε' : 'Συμμετοχή'}
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
                  <Button label="Συνδέσου για συμμετοχή" variant="secondary" size="sm" full
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
          <SectionHeader title="Ιδιοκτήτες κοντά σου" />
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
    </Screen>
  )
}

const s = StyleSheet.create({
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
