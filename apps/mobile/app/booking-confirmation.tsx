import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, AppState } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock, XCircle, CalendarDays } from 'lucide-react-native'
import { api } from '@/lib/api'
import { Screen, Card, Badge, Button, SkeletonRows } from '@/components/ui'
import { colors, space, radius, type, weight } from '@/theme'
import { dateLocale } from '@/lib/dates'

/**
 * Επιβεβαίωση πληρωμής κράτησης υπηρεσίας μετά τη Viva.
 *
 * Ανοίγει (α) αμέσως μόλις η εφαρμογή στείλει τον χρήστη στη Viva (από την
 * υπηρεσία ή από «Πληρωμή» στις «Κρατήσεις μου»), ώστε επιστρέφοντας να
 * βλέπει το αποτέλεσμα, και (β) με deep link
 * globipet://booking-confirmation?id=<κράτηση>&transactionId=<t> από τη σελίδα
 * επιστροφής του web (/bookings/:id/confirmation). Ίδια λογική με εκείνη.
 *
 *   Με transactionId: μία επαλήθευση (ο server ξαναρωτά τη Viva).
 *   Πάντα: παρακολούθηση της κράτησης όσο είναι απλήρωτη — το webhook μπορεί
 *   να επιβεβαιώσει πρώτο ή αργότερα.
 */
export default function BookingConfirmationScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const params = useLocalSearchParams<{ id: string; transactionId?: string; t?: string }>()
  const id = params.id
  const transactionId = params.transactionId || params.t
  // Το verify απάντησε (οριστικά). Σε 503/δίκτυο (η Viva δεν απάντησε)
  // μένει false και ξαναδοκιμάζεται στο polling, όπως στο web.
  const verified = useRef(false)
  const verifying = useRef(false)
  const [timedOut, setTimedOut] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const { data: booking, isLoading, refetch } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => api.get(`/bookings/${id}`).then(r => r.data?.data ?? r.data),
    enabled: !!id,
  })

  const paymentStatus: string | undefined = booking?.payment_status
  const unpaid = paymentStatus === 'unpaid'
  const cancelled = booking?.status === 'cancelled'

  const runVerify = useCallback(() => {
    if (verified.current || verifying.current || !transactionId) return
    verifying.current = true
    api.post(`/bookings/${id}/viva/verify`, { transaction_id: transactionId })
      .then(r => { verified.current = true; setResult(r.data?.result ?? null) })
      .catch((err: any) => {
        const st = err?.response?.status
        // 4xx = οριστική απάντηση· όχι νέα απόπειρα (το webhook επιβεβαιώνει ανεξάρτητα).
        if (st && st >= 400 && st < 500) verified.current = true
        // 400 = μη έγκυρο transaction id: όπως το 'invalid', αποτέλεσμα αμέσως αντί για αναμονή 90" (όπως το web).
        if (st === 400) setResult('invalid')
      })
      .finally(() => { verifying.current = false; refetch() })
  }, [transactionId, id, refetch])

  useEffect(() => {
    if (verified.current || !booking || !transactionId) return
    if (booking.payment_ref === transactionId) { verified.current = true; return }
    runVerify()
  }, [booking, transactionId, runVerify])

  // Η Viva απάντησε ότι η συναλλαγή δεν πληρώνει την κράτηση: αμέσως
  // «Η πληρωμή δεν ολοκληρώθηκε», χωρίς αναμονή 90".
  const invalid = result === 'invalid' && unpaid && !cancelled

  // Όσο είναι απλήρωτη: παρακολούθηση για 90". Μετά λέμε «σε εκκρεμότητα» —
  // ΟΧΙ «απέτυχε»: ο χρήστης μπορεί να είναι ακόμη στη Viva.
  useEffect(() => {
    if (!unpaid || cancelled || invalid || timedOut) return
    let elapsed = 0
    const interval = setInterval(() => {
      elapsed += 3
      if (elapsed > 90) { clearInterval(interval); setTimedOut(true); return }
      if (!verified.current && transactionId) runVerify()
      else refetch()
    }, 3000)
    return () => clearInterval(interval)
  }, [unpaid, cancelled, invalid, timedOut, transactionId, refetch, runVerify])

  // Επιστροφή στο προσκήνιο (π.χ. από τη Viva ή μετά από ώρα): νέα ανάγνωση
  // αμέσως, και νέος κύκλος παρακολούθησης αν είχε λήξει ο προηγούμενος.
  useEffect(() => {
    const sub = AppState.addEventListener('change', st => {
      if (st !== 'active') return
      if (!verified.current && transactionId) runVerify()
      else refetch()
      setTimedOut(false)
    })
    return () => sub.remove()
  }, [transactionId, refetch, runVerify])

  // Μόλις κριθεί, ανανεώνονται η λίστα κρατήσεων και η κάρτα της Αρχικής.
  useEffect(() => {
    if (paymentStatus && paymentStatus !== 'unpaid') {
      qc.invalidateQueries({ queryKey: ['my-bookings'] })
      qc.invalidateQueries({ queryKey: ['my-next-booking'] })
    }
  }, [paymentStatus])

  if (isLoading) return <Screen title={t('profile.menu.bookings')}><SkeletonRows count={3} /></Screen>

  const paid = paymentStatus === 'paid'
  const waiting = !!booking && unpaid && !cancelled && !invalid && !timedOut
  const stillPending = !!booking && unpaid && !cancelled && !invalid && timedOut
  const bad = !paid && !waiting && !stillPending

  // booking_date (YYYY-MM-DD) ως τοπική ημερομηνία — όχι new Date('YYYY-MM-DD').
  const dateLabel = (() => {
    const [y, m, d] = String(booking?.booking_date ?? '').split('-').map(Number)
    if (!y || !m || !d) return booking?.booking_date ?? '—'
    return new Date(y, m - 1, d).toLocaleDateString(dateLocale(i18n.language), { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
  })()

  // «Οι κρατήσεις μου» → η λίστα κρατήσεων χωρίς να στοιβάζονται οθόνες:
  // το dismissTo γυρνά στη λίστα αν είναι ήδη στη στοίβα (άνοιξε από
  // «Πληρωμή»), αλλιώς αντικαθιστά αυτή την οθόνη με τη λίστα (άνοιξε από
  // την υπηρεσία ή από deep link). Πριν, από την υπηρεσία το back γύριζε στην
  // υπηρεσία. Και το «Δοκίμασε ξανά» πάει στη λίστα (όπως το web → /bookings):
  // η κράτηση υπάρχει ήδη και πληρώνεται με «Πληρωμή» εκεί — το back στην
  // υπηρεσία οδηγούσε σε ΔΕΥΤΕΡΗ κράτηση για το ίδιο ραντεβού.
  const backToBookings = () => {
    router.dismissTo('/bookings' as any)
  }

  return (
    <Screen title={t('profile.menu.bookings')} scroll={false}>
      <ScrollView contentContainerStyle={s.body}>
        <View style={s.hero}>
          <View style={[s.heroIcon, paid && s.heroOk, bad && s.heroBad]}>
            {paid ? <CheckCircle2 size={40} color={colors.success} />
             : bad ? <XCircle size={40} color={colors.danger} />
             : <Clock size={40} color={colors.warning} />}
          </View>
          <Text style={s.heroTitle}>
            {paid ? t('bookingConfirm.paid')
              : waiting || stillPending ? t('teleConfirm.pending')
              : cancelled ? t('bookingConfirm.cancelled')
              : t('teleConfirm.failed')}
          </Text>
          <Text style={s.heroTxt}>
            {paid ? t('bookingConfirm.paidHint')
              : waiting ? t('bookingConfirm.pendingHint')
              : stillPending ? t('bookingConfirm.pendingLateHint')
              : cancelled ? t('bookingConfirm.cancelledHint')
              : t('bookingConfirm.failedHint')}
          </Text>
          {paid && (result === 'refunded' || result === 'refund_failed') && (
            <Text style={[s.heroTxt, { color: colors.warning }]}>
              {result === 'refunded' ? t('bookingConfirm.duplicateRefunded') : t('bookingConfirm.duplicateRefundDelayed')}
            </Text>
          )}
        </View>

        {!!booking && (
          <Card>
            <Text style={s.title}>{booking.service?.title ?? booking.provider_name}</Text>
            <View style={s.kv}>
              <Text style={s.k}>{dateLabel}{booking.booking_time ? ` · ${booking.booking_time}` : ''}</Text>
              {paid && <Badge label={t('bookingPolicy.paid')} tone="success" />}
            </View>
            <View style={s.kv}>
              <Text style={s.k}>{t('common.total')}</Text>
              <Text style={s.v}>€{Number(booking.total_price ?? 0).toFixed(2)}</Text>
            </View>
          </Card>
        )}

        <Button label={invalid ? t('common.try_again') : t('profile.menu.bookings')}
          icon={<CalendarDays size={18} color={colors.textOnDark} />}
          onPress={backToBookings} full />
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
