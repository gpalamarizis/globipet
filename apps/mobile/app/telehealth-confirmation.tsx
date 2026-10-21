import { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Linking, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock, XCircle, Stethoscope, Video } from 'lucide-react-native'
import { api } from '@/lib/api'
import { getTelehealthCallUrl } from '@/lib/telehealthCall'
import { Screen, Card, Badge, Button, SkeletonRows } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Επιβεβαίωση παραγγελίας μετά την πληρωμή.
 *
 * ΓΙΑΤΙ ΕΠΑΛΗΘΕΥΟΥΜΕ ΕΔΩ
 *   Το webhook του Viva είναι η αυθεντική πηγή, αλλά μπορεί να αργήσει.
 *   Η επαλήθευση κάνει την κατάσταση ορατή αμέσως — και είναι ασφαλής:
 *   ο server ελέγχει ξανά με το Viva, δεν εμπιστεύεται τον πελάτη.
 *
 *   Τρέχει ΜΙΑ φορά: ένας δείκτης εμποδίζει δεύτερη κλήση αν η οθόνη
 *   ξαναποδοθεί, ώστε να μην υπάρξουν διπλές επιβεβαιώσεις. Ο δείκτης
 *   τίθεται μόλις ο server απαντήσει οριστικά· σε 503/δίκτυο (η Viva δεν
 *   απάντησε) ξαναδοκιμάζεται σε κάθε ανανέωση, όπως στο booking-confirmation.
 *
 *   Όπως η σελίδα /telehealth/:id/confirmation του web: επαλήθευση και χωρίς
 *   transactionId (όταν ανοίγει αμέσως μετά το άνοιγμα της Viva ή από τη
 *   λίστα «Οι συνεδρίες μου»), και παρακολούθηση κάθε 3" όσο εκκρεμεί.
 *   Deep link: globipet://telehealth-confirmation?id=<συνεδρία>&transactionId=<t>
 */
const REFUND_STATES = ['refunded', 'partially_refunded', 'refunding']

export default function TelehealthConfirmationScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const params = useLocalSearchParams<{ id: string; transactionId?: string; t?: string }>()
  const id = params.id
  // Η Viva επιστρέφει το transaction ως ?t=· δεκτό και το transactionId.
  const transactionId = params.transactionId || params.t
  const verified = useRef(false)
  const verifying = useRef(false)
  const [joining, setJoining] = useState(false)

  const { data: session, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['telehealth-session', id],
    queryFn: () => api.get(`/telehealth/${id}`).then(r => r.data?.data ?? r.data),
    enabled: !!id,
    // Όσο δεν έχει κριθεί η πληρωμή, το webhook μπορεί να την επιβεβαιώσει
    // οποιαδήποτε στιγμή — όπως το web, ξαναδιαβάζουμε κάθε 3".
    // Ακυρωμένη ή με επιστροφή (σε εξέλιξη/ολοκληρωμένη): τελική κατάσταση,
    // όχι άλλο polling — όπως το web.
    refetchInterval: (q) => {
      const d = q.state.data as any
      const ps = d?.payment_status
      return ps === 'paid' || ps === 'failed' || d?.status === 'cancelled' || REFUND_STATES.includes(ps) ? false : 3000
    },
  })

  const verify = useMutation({
    mutationFn: () => {
      verifying.current = true
      return api.post(`/telehealth/${id}/viva/verify`, { transaction_id: transactionId })
    },
    onError: (err: any) => {
      const st = err?.response?.status
      // 4xx = οριστική απάντηση· χωρίς transactionId δεν υπάρχει τι να
      // ξαναεπαληθευτεί (το webhook επιβεβαιώνει ανεξάρτητα).
      if ((st && st >= 400 && st < 500) || !transactionId) verified.current = true
    },
    onSettled: () => { verifying.current = false },
    onSuccess: () => {
      verified.current = true
      qc.invalidateQueries({ queryKey: ['telehealth-session', id] })
      qc.invalidateQueries({ queryKey: ['telehealth'] })
      qc.invalidateQueries({ queryKey: ['telehealth-mine'] })
    },
  })

  // Στο άνοιγμα και σε κάθε ανανέωση (polling) όσο δεν έχει απαντήσει οριστικά.
  useEffect(() => {
    if (verified.current || verifying.current || !id) return
    if ((session as any)?.payment_status === 'paid') { verified.current = true; return }
    // Ακυρωμένη / με επιστροφή: τίποτα άλλο να επαληθευτεί.
    if ((session as any)?.status === 'cancelled' || REFUND_STATES.includes((session as any)?.payment_status)) {
      verified.current = true; return
    }
    verifying.current = true
    verify.mutate()
  }, [id, transactionId, dataUpdatedAt])

  if (isLoading) return <Screen title={t('teleConfirm.title')}><SkeletonRows count={3} /></Screen>

  const cancelled = session?.status === 'cancelled'
  const ended = cancelled || REFUND_STATES.includes(session?.payment_status)
  const paid = session?.payment_status === 'paid' && !cancelled
  const failed = session?.payment_status === 'failed' && !cancelled
  const ps = session?.payment_status
  const heroTitle = ended
    ? (cancelled ? t('teleCancel.cancelled') : ps === 'refunding' ? t('teleCancel.refunding') : t('teleConfirm.refundedTitle'))
    : paid ? t('teleConfirm.paid') : failed ? t('teleConfirm.failed') : t('teleConfirm.pending')
  const heroHint = ended
    ? (ps === 'refunding' ? t('teleConfirm.refundingHint')
      : ps === 'refunded' ? t('teleConfirm.refundedHint')
      : ps === 'partially_refunded' ? t('teleConfirm.partialRefundHint')
      : t('teleConfirm.cancelledUnpaidHint'))
    : paid ? t('teleConfirm.paidHint') : failed ? t('teleConfirm.failedHint') : t('teleConfirm.pendingHint')

  // Ίδιο δωμάτιο με το web, από GET /telehealth/:id/call (JaaS 8x8.vc με JWT,
  // ή meet.jit.si όταν το JaaS δεν είναι ρυθμισμένο). Ανοίγει στην εφαρμογή
  // Jitsi Meet αν είναι εγκατεστημένη, αλλιώς στον browser.
  const joinCall = async () => {
    if (!session?.meeting_url || joining) return
    setJoining(true)
    try {
      await Linking.openURL(await getTelehealthCallUrl(String(session.id)))
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.response?.data?.message || t('teleConfirm.err_open_call'))
    } finally {
      setJoining(false)
    }
  }

  // Ημερομηνία/ώρα συνεδρίας, όπως στο web· scheduled_date (YYYY-MM-DD) ως τοπική
  // ημερομηνία στη γλώσσα του χρήστη — όχι new Date('YYYY-MM-DD') (UTC).
  const dateLabel = (() => {
    const [y, m, d] = String(session?.scheduled_date ?? '').split('-').map(Number)
    if (!y || !m || !d) return session?.scheduled_date ?? '—'
    return new Date(y, m - 1, d).toLocaleDateString(i18n.language, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
  })()

  // Πίσω στην τηλεϊατρική χωρίς να στοιβάζονται οθόνες· αν δεν υπάρχει στο
  // ιστορικό (π.χ. deep link), αντικατάσταση.
  const backToTelehealth = () => router.dismissTo('/telehealth' as any)

  return (
    <Screen title={t('teleConfirm.title')} scroll={false}>
      <ScrollView contentContainerStyle={s.body}>
        <View style={s.hero}>
          <View style={[s.heroIcon, paid && s.heroOk, failed && s.heroBad]}>
            {ended ? <XCircle size={40} color={colors.textMuted} />
             : paid ? <CheckCircle2 size={40} color={colors.success} />
             : failed ? <XCircle size={40} color={colors.danger} />
             : <Clock size={40} color={colors.warning} />}
          </View>
          <Text style={s.heroTitle}>{heroTitle}</Text>
          <Text style={s.heroTxt}>{heroHint}</Text>
        </View>

        {!!session && (
          <Card>
            <View style={s.kv}>
              <Text style={s.k}>{t('teleConfirm.sessionNumber')}</Text>
              <Text style={s.v}>#{String(session.id).slice(0, 8)}</Text>
            </View>
            <View style={s.kv}>
              <Text style={s.k}>{t('serviceDetail.date')}</Text>
              <Text style={s.v}>{dateLabel}{session.scheduled_time ? ` · ${session.scheduled_time}` : ''}</Text>
            </View>
            <View style={s.kv}>
              <Text style={s.k}>{t('common.total')}</Text>
              <Text style={s.v}>€{Number(session.price ?? 0).toFixed(2)}</Text>
            </View>
            <View style={s.kv}>
              <Text style={s.k}>{t('providerDash.booking')}</Text>
              <Badge label={t(`status.${session.status}`, { defaultValue: session.status })}
                tone={paid ? 'success' : ended ? 'neutral' : 'warning'} />
            </View>
          </Card>
        )}

        {paid && !!session?.meeting_url && (
          <Button label={t('teleConfirm.join_call')} icon={<Video size={18} color={colors.textOnDark} />}
            onPress={joinCall} loading={joining} disabled={joining} full />
        )}
        <Button label={t('profile.menu.telehealth')} icon={<Stethoscope size={18} color={colors.textOnDark} />}
          onPress={backToTelehealth} full />
        <Button label={t('tele.title')} variant="secondary"
          onPress={() => router.replace('/(tabs)' as any)} full />
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
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.xs },
  k: { ...type.caption, color: colors.textMuted },
  v: { ...type.body, color: colors.text, fontWeight: weight.semibold },
})
