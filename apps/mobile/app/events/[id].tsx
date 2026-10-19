import { View, Text, StyleSheet, ScrollView, Image, Alert, Linking } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, MapPin, Users, Euro } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, Card, Badge, Button, EmptyState, SkeletonRows } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Λεπτομέρεια εκδήλωσης με εγγραφή.
 *
 * Όταν η εκδήλωση έχει τιμή, ο server επιστρέφει διεύθυνση πληρωμής και ο
 * χρήστης φεύγει για το Viva — ίδια λογική με τις κρατήσεις: καμία
 * επιβεβαίωση πριν μπουν τα χρήματα.
 */
export default function EventDetailScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { isAuthenticated } = useAuthStore()

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then(r => r.data?.data ?? r.data),
    enabled: !!id,
  })

  const { data: registration } = useQuery({
    queryKey: ['event-registration', id],
    queryFn: () => api.get(`/events/${id}/registration`).then(r => r.data?.data ?? r.data),
    enabled: !!id && isAuthenticated,
  })

  const register = useMutation({
    mutationFn: () => api.post(`/events/${id}/register`, {}),
    onSuccess: async (r: any) => {
      qc.invalidateQueries({ queryKey: ['event-registration', id] })
      qc.invalidateQueries({ queryKey: ['event', id] })
      const url = r?.data?.checkoutUrl ?? r?.data?.data?.checkoutUrl
      if (url) {
        const ok = await Linking.canOpenURL(url)
        if (!ok) return Alert.alert(t('common.error'), t('checkout.err_open_page'))
        await Linking.openURL(url)
        // Όταν ο χρήστης γυρίσει από τη Viva βλέπει αμέσως το αποτέλεσμα —
        // η οθόνη επιβεβαίωσης παρακολουθεί την εγγραφή (webhook/verify).
        router.push({ pathname: '/event-confirmation', params: { id: String(id) } } as any)
        return
      }
      Alert.alert(t('events.registered'), event?.title ?? '')
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  // Ακύρωση συμμετοχής (DELETE /events/:id/register), όπως στο web.
  const cancel = useMutation({
    mutationFn: () => api.delete(`/events/${id}/register`),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ['event-registration', id] })
      qc.invalidateQueries({ queryKey: ['event', id] })
      Alert.alert(r?.data?.data?.status === 'refunded' ? t('events.cancelledRefunded') : t('events.cancelled'), event?.title ?? '')
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  // Πληρωμένη θέση: η επιβεβαίωση λέει ρητά ότι επιστρέφονται τα χρήματα (όπως στο web).
  const onCancel = () => {
    if (registration?.payment_status === 'paid') {
      const amount = Number(registration.amount_paid ?? 0).toFixed(2)
      Alert.alert(t('events.cancelAttendance'), t('events.confirmCancelRefund', { amount }), [
        { text: t('common.dismiss'), style: 'cancel' },
        { text: t('events.cancelAttendance'), style: 'destructive', onPress: () => cancel.mutate() },
      ])
      return
    }
    cancel.mutate()
  }

  if (isLoading) return <Screen title={t('events.title')} back><SkeletonRows count={3} /></Screen>
  if (!event) return (
    <Screen title={t('events.title')} back>
      <EmptyState icon={CalendarDays} title={t('events.notFound')} />
    </Screen>
  )

  const full = event.capacity != null && (event.registered_count ?? 0) >= event.capacity
  // Το /registration επιστρέφει { registered, registration, spots_left } — δεν
  // έχει `id`, οπότε το !!registration?.id ήταν πάντα false και ο εγγεγραμμένος
  // έβλεπε ξανά «Δήλωση συμμετοχής» (και έπαιρνε 409).
  const already = registration?.registered ?? registration?.registration?.status === 'registered'
  const isPaidEvent = Number(event.price) > 0
  const pending = registration?.payment_status === 'pending'
  // Γέμισε όσο πλήρωνε και η αυτόματη επιστροφή απέτυχε: τα χρήματά του είναι
  // ακόμη σε εκκρεμότητα. Καμία νέα δήλωση/πληρωμή — κατάσταση και υποστήριξη.
  const refundFailed = registration?.payment_status === 'refund_failed'
    || registration?.registration?.status === 'refund_failed'
  const paidSeat = !!already && registration?.payment_status === 'paid'
  const refundHours = registration?.refund_hours ?? 48
  const refundUntil = registration?.refund_deadline
    ? new Date(registration.refund_deadline).toLocaleString(i18n.language, { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <Screen title={event.title} back scroll={false}>
      <ScrollView contentContainerStyle={s.body}>
        {!!event.image_url && <Image source={{ uri: event.image_url }} style={s.image} resizeMode="cover" />}

        <Card>
          <Text style={s.title}>{event.title}</Text>
          {!!event.organizer && <Text style={s.meta}>{event.organizer}</Text>}

          <View style={s.kvRow}>
            <CalendarDays size={icon.sm} color={colors.brand} />
            <Text style={s.kv}>{event.date}{event.time ? ` · ${event.time}` : ''}</Text>
          </View>
          {!!(event.location || event.city) && (
            <View style={s.kvRow}>
              <MapPin size={icon.sm} color={colors.brand} />
              <Text style={s.kv}>{event.location || event.city}</Text>
            </View>
          )}
          <View style={s.kvRow}>
            <Euro size={icon.sm} color={colors.brand} />
            <Text style={s.kv}>
              {event.price > 0 ? `€${Number(event.price).toFixed(2)}` : t('discover.free')}
            </Text>
          </View>
          {event.capacity != null && (
            <View style={s.kvRow}>
              <Users size={icon.sm} color={colors.brand} />
              <Text style={s.kv}>{event.registered_count ?? 0}/{event.capacity}</Text>
            </View>
          )}
        </Card>

        {!!event.description && (
          <Card><Text style={s.desc}>{event.description}</Text></Card>
        )}

        {already ? (
          <>
            <Badge label={t('events.alreadyRegistered')} tone="success" />
            {paidSeat && !registration?.refundable ? (
              // Λιγότερο από 48 ώρες πριν: καμία ακύρωση — το λέμε αντί για κουμπί που αποτυγχάνει.
              <Text style={s.note}>{t('events.noRefundCancel', { hours: refundHours })}</Text>
            ) : (
              <Button label={t('events.cancelAttendance')} variant="secondary" full
                loading={cancel.isPending} onPress={onCancel} />
            )}
            {paidSeat && !!registration?.refundable && !!refundUntil && (
              <Text style={s.note}>{t('events.refundUntil', { date: refundUntil })}</Text>
            )}
          </>
        ) : !isAuthenticated ? (
          <Button label={t('auth.login')} onPress={() => router.push('/auth/login' as any)} full />
        ) : refundFailed ? (
          <>
            <Badge label={t('events.refundPending')} tone="warning" />
            <Text style={s.note}>{t('events.refundPendingHint')}</Text>
            <Button label={t('account.contactForm')} variant="secondary" full
              onPress={() => router.push('/contact' as any)} />
          </>
        ) : pending ? (
          <>
            <Badge label={t('events.pendingPayment')} tone="warning" />
            <Text style={s.note}>{t('events.pendingPaymentHint')}</Text>
            <Button label={t('events.continuePayment')} full
              disabled={full || register.isPending} loading={register.isPending}
              onPress={() => register.mutate()} />
            <Button label={t('events.cancelAttendance')} variant="secondary" full
              loading={cancel.isPending} onPress={onCancel} />
          </>
        ) : (
          <Button
            label={full ? t('play.full')
              : isPaidEvent ? t('events.payAndJoin', { amount: Number(event.price).toFixed(2) })
              : t('events.register')}
            disabled={full || register.isPending}
            loading={register.isPending}
            onPress={() => register.mutate()} full />
        )}
        {/* Πολιτική ακύρωσης κάτω από το κουμπί, για κάθε εκδήλωση με τιμή. */}
        {isPaidEvent && !(already && !paidSeat) && !refundFailed && (
          <Text style={s.note}>{t('events.refundPolicy', { hours: refundHours })}</Text>
        )}
      </ScrollView>
    </Screen>
  )
}

const s = StyleSheet.create({
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
  image: { width: '100%', height: 200, borderRadius: radius.xl, backgroundColor: colors.surfaceAlt },
  title: { ...type.section, color: colors.text },
  meta: { ...type.caption, color: colors.textLight, marginTop: 2 },
  kvRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  kv: { ...type.body, color: colors.textMuted },
  desc: { ...type.body, color: colors.textMuted },
  note: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
})
