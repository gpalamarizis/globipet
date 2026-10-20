import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, AppState } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock, XCircle, CalendarDays } from 'lucide-react-native'
import { api } from '@/lib/api'
import { Screen, Card, Badge, Button, SkeletonRows } from '@/components/ui'
import { colors, space, radius, type, weight } from '@/theme'

/**
 * Επιβεβαίωση θέσης σε εκδήλωση μετά την πληρωμή στη Viva.
 *
 * Ανοίγει (α) αμέσως μόλις η οθόνη της εκδήλωσης στείλει τον χρήστη στη
 * Viva, ώστε επιστρέφοντας να βλέπει το αποτέλεσμα, και (β) με deep link
 * globipet://event-confirmation?id=<event>&transactionId=<t> από τη σελίδα
 * επιστροφής του web. Ίδια λογική με τη σελίδα /events/:id/confirmation.
 *
 *   Με transactionId: μία επαλήθευση (ο server ξαναρωτά τη Viva).
 *   Πάντα: παρακολούθηση της εγγραφής όσο εκκρεμεί — το webhook μπορεί να
 *   επιβεβαιώσει πρώτο ή αργότερα.
 */
// 'YYYY-MM-DD' ως τοπική ημερομηνία στη γλώσσα του χρήστη: το
// new Date('YYYY-MM-DD') είναι UTC και σε ζώνες πίσω από το UTC έδειχνε την
// προηγούμενη μέρα. Άγνωστη μορφή μένει ως έχει.
const fmtYmd = (d: string | undefined, lang: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d ?? '')
  if (!m) return d ?? ''
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString(lang, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function EventConfirmationScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { id, transactionId } = useLocalSearchParams<{ id: string; transactionId?: string }>()
  // Το verify απάντησε. Σε 503/δίκτυο (η Viva δεν απάντησε) μένει false και
  // ξαναδοκιμάζεται στο polling, όπως στο web.
  const verified = useRef(false)
  const verifying = useRef(false)
  const [timedOut, setTimedOut] = useState(false)

  const { data: event } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then(r => r.data?.data ?? r.data),
    enabled: !!id,
  })

  const { data: reg, isLoading, refetch, error: regError } = useQuery({
    queryKey: ['event-registration', id],
    queryFn: () => api.get(`/events/${id}/registration`).then(r => r.data?.data ?? r.data),
    enabled: !!id,
    // 404 = η εκδήλωση δεν υπάρχει πια· οριστική απάντηση, χωρίς νέα απόπειρα (όπως το web).
    retry: (n, e: any) => e?.response?.status !== 404 && n < 2,
  })
  const gone = (regError as any)?.response?.status === 404

  const status: string | undefined = reg?.registration?.status
  const regId: string | undefined = reg?.registration?.id

  const runVerify = useCallback(() => {
    if (verified.current || verifying.current || !regId || !transactionId) return
    verifying.current = true
    api.post(`/events/registrations/${regId}/viva/verify`, { transaction_id: transactionId })
      .then(() => { verified.current = true })
      .catch((err: any) => {
        const st = err?.response?.status
        // 4xx = οριστική απάντηση· σε 503/δίκτυο νέα απόπειρα στο polling.
        if (st && st >= 400 && st < 500) verified.current = true
      })
      .finally(() => {
        verifying.current = false
        refetch()
        qc.invalidateQueries({ queryKey: ['event', id] })
      })
  }, [regId, transactionId, refetch, qc, id])

  useEffect(() => {
    if (verified.current || !regId || !transactionId || status !== 'pending_payment') return
    runVerify()
  }, [regId, transactionId, status, runVerify])

  // Όσο εκκρεμεί: παρακολούθηση για 90". Μετά λέμε «σε εκκρεμότητα» — ΟΧΙ
  // «απέτυχε»: ο χρήστης μπορεί να είναι ακόμη στη Viva και το webhook
  // επιβεβαιώνει ανεξάρτητα (η κατάσταση φαίνεται στην εκδήλωση).
  // Και σε `refunding` (επιστροφή σε εξέλιξη), όπως στο web: νέα ανάγνωση
  // μέχρι να γίνει `refunded` / `refund_failed`.
  useEffect(() => {
    if ((status !== 'pending_payment' && status !== 'refunding') || timedOut) return
    let elapsed = 0
    const interval = setInterval(() => {
      elapsed += 3
      if (elapsed > 90) { clearInterval(interval); setTimedOut(true); return }
      if (!verified.current && transactionId && status === 'pending_payment') runVerify()
      else refetch()
    }, 3000)
    return () => clearInterval(interval)
  }, [status, timedOut, transactionId, refetch, runVerify])

  // Επιστροφή στο προσκήνιο (π.χ. από τη Viva ή μετά από ώρα): νέα ανάγνωση
  // αμέσως, και νέος κύκλος παρακολούθησης αν είχε λήξει ο προηγούμενος.
  useEffect(() => {
    const sub = AppState.addEventListener('change', st => {
      if (st !== 'active') return
      if (!verified.current && transactionId && status === 'pending_payment') runVerify()
      else refetch()
      setTimedOut(false)
    })
    return () => sub.remove()
  }, [transactionId, status, refetch, runVerify])

  // Μόλις κριθεί, ενημερώνεται και η οθόνη της εκδήλωσης.
  useEffect(() => {
    if (status && status !== 'pending_payment') qc.invalidateQueries({ queryKey: ['event', id] })
  }, [status])

  if (isLoading) return <Screen title={t('events.title')}><SkeletonRows count={3} /></Screen>

  const confirmed = status === 'registered'
  const refunded = status === 'refunded'
  const refundFailed = status === 'refund_failed'
  const stillPending = status === 'pending_payment' && timedOut
  // Το 'refunded' σημαίνει είτε «γέμισε, αυτόματη επιστροφή» είτε «ακύρωσες
  // με επιστροφή». Αν ο server δίνει τον λόγο το λέμε, αλλιώς ουδέτερο κείμενο.
  const refundReason: string | undefined = reg?.refund_reason ?? reg?.registration?.refund_reason
  const fullRefund = refundReason === 'full'
  const cancelRefund = refundReason === 'cancelled'
  // Ο διοργανωτής ακύρωσε την εκδήλωση (επιστροφή έγινε ή εκκρεμεί).
  // Το `event_cancelled` του /registration καλύπτει και τις καταστάσεις που
  // αφήνει η ακύρωση χωρίς refund_reason: `cancelled` (δωρεάν/εκκρεμής
  // πληρωμή) και `refunding` (επιστροφή σε εξέλιξη). Χωρίς αυτό έπεφταν στο
  // «Η πληρωμή απέτυχε».
  // Και από το `cancelled` του GET /events/:id (στήλη cancelled_at), όπως στο web.
  const refunding = status === 'refunding'
  const cancelledFlag = !!reg?.event_cancelled || event?.cancelled === true
  const eventCancelled = (refundReason === 'event_cancelled' && (refunded || refundFailed))
    || (cancelledFlag && (status === 'cancelled' || refunding
      || ((refunded || refundFailed) && refundReason !== 'cancelled' && refundReason !== 'full')))
  const neutralRefund = refunded && !fullRefund
  // `refunding` χωρίς λόγο (ή «full») και χωρίς ακύρωση εκδήλωσης = η αυτόματη επιστροφή
  // (γέμισε) τρέχει: «σε εξέλιξη» όσο διαρκεί η παρακολούθηση και μετά
  // «η επιστροφή καθυστερεί», όπως στο web — όχι «Η πληρωμή απέτυχε».
  const refundingFull = refunding && (!refundReason || refundReason === 'full') && !cancelledFlag
  const waiting = (status === 'pending_payment' || refundingFull) && !timedOut
  // Επιστροφή σε εξέλιξη μετά από δική σου ακύρωση: όχι κόκκινο (ρολόι, όπως στο web).
  const bad = !confirmed && !waiting && !stillPending && !neutralRefund && !(cancelRefund && refunding) && !refundingFull
  // Σύνολο μόνο για επιβεβαιωμένη πληρωμή — όχι για εκκρεμή/επιστραμμένη.
  const paidConfirmed = reg?.payment_status === 'paid' || (confirmed && reg?.payment_status == null)

  // Πίσω στην εκδήλωση χωρίς να στοιβάζονται οθόνες· από deep link (χωρίς
  // προηγούμενη οθόνη) αντικατάσταση με την εκδήλωση.
  const backToEvent = () => {
    // Η εκδήλωση δεν υπάρχει πια: στη λίστα εκδηλώσεων, όχι σε σελίδα που δεν βρίσκεται.
    if (gone) router.replace('/events' as any)
    else if (router.canGoBack()) router.back()
    else router.replace({ pathname: '/events/[id]', params: { id: String(id) } } as any)
  }

  return (
    <Screen title={t('events.title')} scroll={false}>
      <ScrollView contentContainerStyle={s.body}>
        <View style={s.hero}>
          <View style={[s.heroIcon, confirmed && s.heroOk, bad && s.heroBad]}>
            {confirmed ? <CheckCircle2 size={40} color={colors.success} />
             : neutralRefund ? <CheckCircle2 size={40} color={colors.textMuted} />
             : bad ? <XCircle size={40} color={colors.danger} />
             : <Clock size={40} color={colors.warning} />}
          </View>
          <Text style={s.heroTitle}>
            {gone ? t('eventConfirm.gone')
              : confirmed ? t('eventConfirm.confirmed')
              : refundingFull ? t('eventConfirm.full')
              : waiting || stillPending ? t('teleConfirm.pending')
              // «…τα χρήματα επιστράφηκαν» μόνο αν ο λόγος ήταν η ακύρωση της εκδήλωσης (όπως στο web).
              : eventCancelled ? (refunded && refundReason === 'event_cancelled' ? t('events.cancelledByOrganizerRefunded') : t('events.cancelledByOrganizer'))
              : cancelRefund ? t('events.cancelled')
              : neutralRefund ? t('eventConfirm.refunded')
              : refunded || refundFailed ? t('eventConfirm.full')
              : t('teleConfirm.failed')}
          </Text>
          <Text style={s.heroTxt}>
            {gone ? t('eventConfirm.goneHint')
              : confirmed ? t('eventConfirm.confirmedHint')
              : refundingFull ? t(waiting ? 'eventConfirm.refundInProgressHint' : 'eventConfirm.fullRefundDelayedHint')
              : waiting ? t('eventConfirm.pendingHint')
              : stillPending ? t('eventConfirm.pendingLateHint')
              : eventCancelled ? (refunded ? t('eventConfirm.refundedHint')
                : refunding ? t('eventConfirm.refundInProgressHint')
                : status === 'cancelled' ? t('eventConfirm.eventCancelledHint')
                : t('events.cancelledByOrganizerRefundDelayed'))
              // Ο χρήστης ακύρωσε ο ίδιος — όχι «γέμισε» (όπως το web).
              : cancelRefund && refunding ? t('eventConfirm.refundInProgressHint')
              : cancelRefund && refundFailed ? t('eventConfirm.cancelledRefundDelayedHint')
              : neutralRefund ? t('eventConfirm.refundedHint')
              : refunded ? t('eventConfirm.fullRefundedHint')
              : refundFailed ? t('eventConfirm.fullRefundDelayedHint')
              : t('eventConfirm.failedHint')}
          </Text>
        </View>

        {!!event && (
          <Card>
            <Text style={s.title}>{event.title}</Text>
            <View style={s.kv}>
              <Text style={s.k}>{fmtYmd(event.date, i18n.language)}{event.time ? ` · ${event.time}` : ''}</Text>
              {confirmed && <Badge label={t('events.alreadyRegistered')} tone="success" />}
            </View>
            {paidConfirmed && reg?.amount_paid != null && (
              <View style={s.kv}>
                <Text style={s.k}>{t('common.total')}</Text>
                <Text style={s.v}>€{Number(reg.amount_paid).toFixed(2)}</Text>
              </View>
            )}
          </Card>
        )}

        <Button label={gone ? t('events.title') : event?.title ?? t('events.title')} icon={<CalendarDays size={18} color={colors.textOnDark} />}
          onPress={backToEvent} full />
      </ScrollView>
    </Screen>
  )
}

const s = StyleSheet.create({
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
  hero: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
  heroIcon: { width: 86, height: 86, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  heroOk: { backgroundColor: colors.successBg },
  heroBad: { backgroundColor: colors.dangerBg },
  heroTitle: { ...type.section, color: colors.text, textAlign: 'center' },
  heroTxt: { ...type.body, color: colors.textMuted, textAlign: 'center' },
  title: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.xs },
  k: { ...type.caption, color: colors.textMuted },
  v: { ...type.body, color: colors.text, fontWeight: weight.semibold },
})
