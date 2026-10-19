import { View, Text, StyleSheet, ScrollView, Image, Alert, Linking } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useRef, useState } from 'react'
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
  const { isAuthenticated, user } = useAuthStore()

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

  // ── Διοργανωτής/διαχειριστής: ακύρωση εκδήλωσης με επιστροφές (όπως στο web) ──
  const isOrganizer = isAuthenticated && !!event
    && (user?.email === event.organizer_email || user?.role === 'admin')
  const { data: cancelPreview, refetch: refetchCancelPreview } = useQuery({
    queryKey: ['event-cancel-preview', id],
    queryFn: () => api.get(`/events/${id}/cancel-preview`).then(r => r.data?.data ?? r.data),
    enabled: !!id && isOrganizer,
  })

  const cancelEvent = useMutation({
    mutationFn: () => api.post(`/events/${id}/cancel`, {}),
    onSuccess: (r: any) => {
      const report = r?.data?.data
      const amount = Number(report?.refunded_amount ?? 0).toFixed(2)
      // Η εκδήλωση δεν διαγράφεται πια: μένει σε αυτή την οθόνη με «Ακυρώθηκε» (όπως στο web).
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['event-cancel-preview', id] })
      qc.invalidateQueries({ queryKey: ['event-registration', id] })
      qc.invalidateQueries({ queryKey: ['event', id] })
      if (r?.data?.settled ?? r?.data?.deleted) {
        Alert.alert(t('events.cancelEvent'), t('events.cancelEventDone', { count: report?.refunded ?? 0, amount }))
        return
      }
      // 207: η εκδήλωση έμεινε ακυρωμένη, κάποιες επιστροφές απέτυχαν.
      const failed = (report?.failed?.length ?? 0) + (report?.in_progress?.length ?? 0)
      Alert.alert(t('common.error'), t('events.cancelEventPartial', { count: failed }))
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  // Κλείδωμα από το πάτημα μέχρι να κλείσει το Alert (ή να τελειώσει το POST):
  // όσο φορτώνει η προεπισκόπηση το κουμπί δεν έδειχνε τίποτα, και δεύτερο
  // πάτημα άνοιγε δεύτερο Alert → δεύτερο POST /cancel. Ref για τον άμεσο
  // έλεγχο, state για να φαίνεται στο κουμπί.
  const cancelEventLock = useRef(false)
  const [cancelEventBusy, setCancelEventBusy] = useState(false)
  const releaseCancelEvent = () => { cancelEventLock.current = false; setCancelEventBusy(false) }

  // Η επιβεβαίωση λέει πόσοι ειδοποιούνται και πόσα χρήματα επιστρέφονται —
  // με φρέσκα νούμερα τη στιγμή του πατήματος.
  const onCancelEvent = async () => {
    if (cancelEventLock.current || cancelEvent.isPending) return
    cancelEventLock.current = true
    setCancelEventBusy(true)
    let fresh: any
    try {
      fresh = (await refetchCancelPreview()).data ?? cancelPreview
    } catch {
      fresh = cancelPreview
    }
    const lines = [
      t('events.cancelEventParticipants', { count: fresh?.participants ?? 0 }),
      ...(fresh?.refunds
        ? [t('events.cancelEventRefunds', { count: fresh.refunds, amount: Number(fresh.refund_total ?? 0).toFixed(2) })]
        : []),
      t('events.cancelEventQuestion'),
    ]
    Alert.alert(t('events.cancelEvent'), lines.join('\n'), [
      { text: t('common.dismiss'), style: 'cancel', onPress: releaseCancelEvent },
      { text: t('events.cancelEvent'), style: 'destructive',
        onPress: () => cancelEvent.mutate(undefined, { onSettled: releaseCancelEvent }) },
    ], { cancelable: true, onDismiss: releaseCancelEvent })
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
  // Ο διοργανωτής ακύρωσε: καμία νέα δήλωση· τι έγινε με τα χρήματα.
  // Και από το ίδιο το GET /events/:id (`cancelled: true`), ώστε να το βλέπει
  // και όποιος δεν είχε δηλώσει ή δεν είναι συνδεδεμένος. Αν ο server δεν
  // στέλνει το πεδίο, μένει η συμπεριφορά του /registration.
  const eventCancelled = !!registration?.event_cancelled || event?.cancelled === true
  // Τα χρήματα του χρήστη σε ακυρωμένη εκδήλωση: από την κατάσταση της
  // εγγραφής (όχι από το audit, που καθαρίζεται στις 180 ημέρες) — όπως στο web.
  const myRefundDone = registration?.payment_status === 'refunded'
  // «Επιστράφηκαν λόγω ακύρωσης από τον διοργανωτή» μόνο όταν αυτός ήταν ο
  // λόγος (refund_reason του /registration)· αλλιώς ουδέτερο, όπως στο web.
  const myRefundByEventCancel = myRefundDone && registration?.refund_reason === 'event_cancelled'
  const myRefundInProgress = registration?.payment_status === 'refunding'
  const myRefundDelayed = registration?.payment_status === 'refund_failed'
  // Διοργανωτής: ξεκίνησε η εκδήλωση (μόνο admin ακυρώνει) / όλα τακτοποιημένα.
  const cancelBlocked = cancelPreview?.can_cancel === false
  const cancelSettled = !!cancelPreview?.already_cancelled && cancelPreview?.settled === true
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
          {eventCancelled && <Badge label={t('status.cancelled')} tone="danger" style={{ marginTop: space.xs }} />}
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

        {eventCancelled ? (
          <>
            <Text style={s.cancelledTxt}>
              {myRefundByEventCancel
                ? t('events.cancelledByOrganizerRefunded')
                : t('events.cancelledByOrganizer')}
            </Text>
            {myRefundDone && !myRefundByEventCancel && (
              <Text style={s.note}>{t('eventConfirm.refunded')}</Text>
            )}
            {(myRefundInProgress || myRefundDelayed) && (
              <Text style={s.note}>
                {myRefundInProgress ? t('eventConfirm.refundInProgressHint') : t('events.cancelledByOrganizerRefundDelayed')}
              </Text>
            )}
          </>
        ) : already ? (
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
        {isPaidEvent && !(already && !paidSeat) && !refundFailed && !eventCancelled && (
          <Text style={s.note}>{t('events.refundPolicy', { hours: refundHours })}</Text>
        )}

        {isOrganizer && (
          <Card>
            <Text style={s.cardTitle}>{t('events.manageEvent')}</Text>
            {cancelSettled ? (
              <Text style={[s.note, s.manageHint]}>{t('events.cancelEventSettled')}</Text>
            ) : cancelBlocked ? (
              <Text style={[s.note, s.manageHint]}>{t('events.cancelEventStarted')}</Text>
            ) : (
              <>
                <Text style={[s.note, s.manageHint]}>
                  {cancelPreview?.already_cancelled ? t('events.cancelEventPendingHint') : t('events.cancelEventHintKeep')}
                </Text>
                <Button variant="danger" full loading={cancelEvent.isPending || cancelEventBusy}
                  disabled={cancelEvent.isPending || cancelEventBusy} onPress={onCancelEvent}
                  label={cancelPreview?.already_cancelled ? t('events.completeRefunds') : t('events.cancelEvent')} />
              </>
            )}
          </Card>
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
  cancelledTxt: { ...type.body, color: colors.danger, fontWeight: weight.semibold, textAlign: 'center' },
  cardTitle: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  manageHint: { textAlign: 'left', marginTop: space.xs, marginBottom: space.md },
})
