import { useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  StyleSheet, ScrollView,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import {
  Inbox as InboxIcon, Mail, MailOpen, X, Clock, Sparkles, ArrowRight,
} from 'lucide-react-native'
import { api } from '@/lib/api'
import { Screen, Card, Button, Badge, EmptyState, Loading } from '@/components/ui'
import { colors, space, radius, font, weight, icon, shadow } from '@/theme'

/**
 * Μηνύματα από παρόχους.
 *
 * Αντίστοιχη της σελίδας /inbox του web. Καμία αποστολή email — η
 * επικοινωνία γίνεται εντός εφαρμογής.
 *
 * Όταν το μήνυμα συνοδεύεται από προσφορά, εμφανίζεται και η έκπτωση με
 * τον χρόνο που απομένει· αλλιώς ο χρήστης δεν ξέρει τι κερδίζει.
 */

type Message = {
  id: string
  provider_email: string
  provider_name: string | null
  subject: string | null
  body: string
  campaign_id: string | null
  campaign_title: string | null
  discount_type: 'percent' | 'amount' | null
  discount_value: number | null
  ends_at: string | null
  read_at: string | null
  created_at: string
}

export default function InboxScreen() {
  const qc = useQueryClient()
  const [open, setOpen] = useState<Message | null>(null)

  const { data, isLoading, refetch, isRefetching } = useQuery<{ data: Message[]; unread: number }>({
    queryKey: ['inbox'],
    queryFn: () => api.get('/customers/inbox').then(r => r.data),
  })

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/customers/inbox/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inbox'] }),
  })

  const messages = data?.data ?? []
  const unread = data?.unread ?? 0

  const openMessage = (m: Message) => {
    setOpen(m)
    if (!m.read_at) markRead.mutate(m.id)
  }

  const discount = (m: Message) =>
    !m.discount_type ? null
      : m.discount_type === 'percent' ? `−${m.discount_value}%` : `−${m.discount_value}€`

  const daysLeft = (iso?: string | null) =>
    iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5) : null

  const when = (iso: string) => {
    const d = new Date(iso)
    const h = Math.round((Date.now() - d.getTime()) / 36e5)
    if (h < 1) return 'μόλις τώρα'
    if (h < 24) return `πριν ${h}${h === 1 ? ' ώρα' : ' ώρες'}`
    const days = Math.round(h / 24)
    if (days < 7) return `πριν ${days}${days === 1 ? ' μέρα' : ' μέρες'}`
    return d.toLocaleDateString('el-GR')
  }

  const renderItem = ({ item: m }: { item: Message }) => {
    const off = discount(m)
    const isNew = !m.read_at
    return (
      <TouchableOpacity onPress={() => openMessage(m)} activeOpacity={0.7}
        style={[s.row, isNew && s.rowNew]}>

        <View style={[s.avatar, isNew && s.avatarNew]}>
          {isNew
            ? <Mail size={icon.md} color={colors.brand} />
            : <MailOpen size={icon.md} color={colors.textLight} />}
        </View>

        <View style={{ flex: 1 }}>
          <View style={s.rowTop}>
            <Text style={[s.provider, isNew && s.providerNew]} numberOfLines={1}>
              {m.provider_name || m.provider_email}
            </Text>
            {off ? <Badge label={off} tone="brand" /> : null}
          </View>

          {m.subject ? (
            <Text style={[s.subject, isNew && s.subjectNew]} numberOfLines={1}>
              {m.subject}
            </Text>
          ) : null}

          <Text style={s.preview} numberOfLines={2}>{m.body}</Text>
          <Text style={s.time}>{when(m.created_at)}</Text>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <Screen
      title="Μηνύματα"
      subtitle={unread > 0 ? `${unread} νέα` : 'Από τους παρόχους σου'}
      scroll={false}>

      {isLoading ? (
        <Loading label="Φόρτωση μηνυμάτων..." />
      ) : messages.length === 0 ? (
        <EmptyState
          icon={InboxIcon}
          title="Κανένα μήνυμα"
          message="Εδώ θα βλέπεις προσφορές και ενημερώσεις από τους παρόχους που έχεις χρησιμοποιήσει." />
      ) : (
        <FlatList
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderItem}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={{ padding: space.lg, gap: space.sm }}
          showsVerticalScrollIndicator={false} />
      )}

      {/* ── Ανάγνωση ─────────────────────────────────────────── */}
      <Modal visible={!!open} animationType="slide" transparent
        onRequestClose={() => setOpen(null)}>
        <View style={s.backdrop}>
          <View style={s.sheet}>

            <View style={s.sheetHandle} />

            <View style={s.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetFrom}>
                  {open?.provider_name || open?.provider_email}
                </Text>
                {open?.subject ? (
                  <Text style={s.sheetSubject}>{open.subject}</Text>
                ) : null}
                <Text style={s.time}>{open ? when(open.created_at) : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => setOpen(null)} hitSlop={12} style={s.closeBtn}>
                <X size={icon.md} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              <Text style={s.body}>{open?.body}</Text>

              {open?.campaign_id && open.discount_type ? (
                <View style={s.offer}>
                  <View style={s.offerTop}>
                    <Sparkles size={icon.sm} color={colors.brand} />
                    <Text style={s.offerTitle}>
                      {open.campaign_title || 'Ειδική προσφορά'}
                    </Text>
                  </View>

                  <Text style={s.offerValue}>{discount(open)}</Text>

                  {(() => {
                    const left = daysLeft(open.ends_at)
                    if (left == null) return null
                    return left > 0 ? (
                      <View style={s.offerTime}>
                        <Clock size={icon.xs} color={colors.textMuted} />
                        <Text style={s.offerTimeText}>
                          Ισχύει για {left} {left === 1 ? 'ακόμα μέρα' : 'ακόμα μέρες'}
                        </Text>
                      </View>
                    ) : (
                      <Text style={s.offerExpired}>Η προσφορά έληξε</Text>
                    )
                  })()}

                  <Button
                    label="Δες τις υπηρεσίες"
                    full
                    icon={<ArrowRight size={icon.sm} color={colors.textOnDark} />}
                    onPress={() => { setOpen(null); router.push('/(tabs)/services') }}
                    style={{ marginTop: space.md }} />
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  )
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', gap: space.md, padding: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  rowNew: {
    backgroundColor: colors.brandLight,
    borderColor: colors.brandTint,
  },
  avatar: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarNew: { backgroundColor: colors.brandTint },

  rowTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  provider:    { flex: 1, fontSize: font.sm, color: colors.textMuted },
  providerNew: { fontWeight: weight.bold, color: colors.text },
  subject:     { fontSize: font.base, color: colors.textMuted, marginTop: 2 },
  subjectNew:  { fontWeight: weight.semibold, color: colors.text },
  preview:     { fontSize: font.sm, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
  time:        { fontSize: font.xs, color: colors.textLight, marginTop: 4 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl,
    padding: space.lg, paddingBottom: space.xxxl,
    ...shadow.lg,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: radius.full,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: space.lg,
  },
  sheetHeader: { flexDirection: 'row', gap: space.md, marginBottom: space.lg },
  sheetFrom:    { fontSize: font.sm, color: colors.textMuted },
  sheetSubject: { fontSize: font.xl, fontWeight: weight.bold, color: colors.text, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },

  body: { fontSize: font.base, color: colors.text, lineHeight: 23 },

  offer: {
    marginTop: space.xl,
    backgroundColor: colors.brandLight,
    borderWidth: 2, borderColor: colors.brandTint,
    borderRadius: radius.xl, padding: space.lg,
  },
  offerTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  offerTitle: { fontSize: font.sm, fontWeight: weight.semibold, color: colors.text },
  offerValue: { fontSize: font.xxxl, fontWeight: weight.black, color: colors.brand, marginTop: space.xs },
  offerTime: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs },
  offerTimeText: { fontSize: font.xs, color: colors.textMuted },
  offerExpired: { fontSize: font.xs, color: colors.danger, marginTop: space.xs },
})
