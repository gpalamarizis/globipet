import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Users, ChevronDown, ChevronUp } from 'lucide-react-native'
import { Badge } from '@/components/ui'
import { colors, space, type, weight, icon } from '@/theme'

/**
 * Λίστα συμμετεχόντων για τον διοργανωτή — ίδια με το web
 * (web/src/components/features/events/EventAttendees.tsx).
 *
 * GET /events/:id/registrations (μόνο διοργανωτής/διαχειριστής). Άτομα ανά
 * εγγραφή = 1 + guests, όπως μετρά ο server. Κατάσταση πληρωμής από
 * status / viva_transaction_id / amount_paid.
 */
export function attendeeStatus(r: any): { key: string; tone: 'success' | 'warning' | 'neutral' | 'danger' } {
  if (r.status === 'registered') {
    return r.viva_transaction_id && Number(r.amount_paid ?? 0) > 0
      ? { key: 'eventAttendees.statusPaid', tone: 'success' }
      : { key: 'eventAttendees.statusFree', tone: 'success' }
  }
  if (r.status === 'pending_payment') return { key: 'eventAttendees.statusPending', tone: 'warning' }
  if (r.status === 'refunding') return { key: 'eventAttendees.statusRefunding', tone: 'warning' }
  if (r.status === 'refund_failed') return { key: 'eventAttendees.statusRefundFailed', tone: 'danger' }
  if (r.status === 'refunded') return { key: 'eventAttendees.statusRefunded', tone: 'neutral' }
  return { key: 'eventAttendees.statusCancelled', tone: 'neutral' }
}

/** Πληρωμένες ή σε επιστροφή: ημερομηνία/ώρα/τιμή δεν αλλάζουν (κανόνας του PATCH /events/:id). */
export function hasMoneyAtStake(regs: any[]): boolean {
  return regs.some(r => (r.status === 'registered' && !!r.viva_transaction_id) || r.status === 'refunding')
}

export function EventAttendees({ registrations, isLoading, isError }: {
  registrations: any[]; isLoading?: boolean; isError?: boolean
}) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const active = registrations.filter(r => r.status === 'registered')
  const people = active.reduce((n, r) => n + 1 + Number(r.guests ?? 0), 0)

  return (
    <View style={s.wrap}>
      <TouchableOpacity style={s.head} onPress={() => setOpen(o => !o)} activeOpacity={0.7}>
        <Users size={icon.sm} color={colors.textMuted} />
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{t('eventAttendees.title')}</Text>
          <Text style={s.meta}>{t('eventAttendees.summary', { count: active.length, people })}</Text>
        </View>
        {open ? <ChevronUp size={icon.sm} color={colors.textLight} /> : <ChevronDown size={icon.sm} color={colors.textLight} />}
      </TouchableOpacity>

      {open && (isLoading ? (
        <Text style={s.meta}>{t('common.loading')}</Text>
      ) : isError ? (
        <Text style={[s.meta, { color: colors.danger }]}>{t('eventAttendees.loadError')}</Text>
      ) : registrations.length === 0 ? (
        <Text style={s.meta}>{t('eventAttendees.empty')}</Text>
      ) : registrations.map((r: any) => {
        const st = attendeeStatus(r)
        return (
          <View key={r.id} style={s.row}>
            <View style={s.rowTop}>
              <Text style={s.name} numberOfLines={1}>{r.user_name}</Text>
              <Badge label={t(st.key)} tone={st.tone} />
            </View>
            <Text style={s.meta}>
              {t('eventAttendees.people', { count: 1 + Number(r.guests ?? 0) })}
              {r.pet_name ? ` · ${r.pet_name}` : ''}
              {Number(r.amount_paid ?? 0) > 0 ? ` · €${Number(r.amount_paid).toFixed(2)}` : ''}
              {r.created_at ? ` · ${new Date(r.created_at).toLocaleDateString(i18n.language)}` : ''}
            </Text>
            {!!r.user_email && (
              <Text style={s.email} onPress={() => Linking.openURL(`mailto:${r.user_email}`).catch(() => {})}>
                {r.user_email}
              </Text>
            )}
            {!!r.notes && <Text style={s.meta}>{r.notes}</Text>}
          </View>
        )
      }))}
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { marginTop: space.md, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xs },
  title: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  meta: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  row: { paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  name: { ...type.body, color: colors.text, fontWeight: weight.semibold, flex: 1 },
  email: { ...type.caption, color: colors.brand, marginTop: 2 },
})
