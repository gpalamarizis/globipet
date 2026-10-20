import { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock, XCircle, Package } from 'lucide-react-native'
import { api } from '@/lib/api'
import { Screen, Card, Badge, Button, SkeletonRows } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Αποτυχημένη πληρωμή: `payment_status: 'failed'` ή `status: 'payment_failed'`.
 * Σημ.: ο σημερινός server δεν γράφει καμία από τις δύο σε παραγγελίες· ο
 * έλεγχος υπάρχει ώστε, αν γραφτεί, να μη μείνει ανανέωση/αμετάφραστο κείμενο.
 */
const paymentFailed = (o: any) => o?.payment_status === 'failed' || o?.status === 'payment_failed'

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
 */
export default function OrderConfirmationScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { id, transactionId } = useLocalSearchParams<{ id: string; transactionId?: string }>()
  const verified = useRef(false)
  const verifying = useRef(false)
  // Αποτέλεσμα του verify (orders.ts): 'refunded' / 'refund_failed' = η
  // πληρωμή επιστράφηκε (ή η επιστροφή καθυστερεί) — όπως στο booking-confirmation.
  const [result, setResult] = useState<string | null>(null)
  // Όπως στο web: αν ήρθαμε από την πληρωμή, ξαναρωτάμε κάθε 3″ για έως ένα
  // λεπτό, γιατί το webhook του Viva μπορεί να επιβεβαιώσει μετά την επιστροφή.
  const [pollUntil] = useState(() => transactionId ? Date.now() + 60_000 : 0)

  const { data: order, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}`).then(r => r.data?.data ?? r.data),
    enabled: !!id,
    // Σταματά και όταν η πληρωμή απέτυχε: τελική κατάσταση, δεν θα αλλάξει.
    refetchInterval: (q: any) =>
      q.state.data?.payment_status !== 'paid' && !paymentFailed(q.state.data) && Date.now() < pollUntil ? 3000 : false,
  })

  const verify = useMutation({
    mutationFn: () => {
      verifying.current = true
      return api.post('/orders/viva/verify', { order_id: id, transaction_id: transactionId })
    },
    onError: (err: any) => {
      const st = err?.response?.status
      // 4xx = οριστική απάντηση· όχι νέα απόπειρα (το webhook επιβεβαιώνει ανεξάρτητα).
      if (st && st >= 400 && st < 500) verified.current = true
    },
    onSettled: () => { verifying.current = false },
    onSuccess: (r: any) => {
      verified.current = true
      setResult(r?.data?.result ?? null)
      qc.invalidateQueries({ queryKey: ['order', id] })
      // Το κλειδί της λίστας είναι 'my-orders' (orders.tsx)· το 'orders' δεν
      // ανανέωνε τίποτα.
      qc.invalidateQueries({ queryKey: ['my-orders'] })
    },
  })

  // Στο άνοιγμα και σε κάθε ανανέωση (polling) όσο δεν έχει απαντήσει οριστικά.
  useEffect(() => {
    if (verified.current || verifying.current || !id || !transactionId) return
    if (order?.payment_status === 'paid') { verified.current = true; return }
    verifying.current = true
    verify.mutate()
  }, [id, transactionId, dataUpdatedAt])

  if (isLoading) return <Screen title={t('orderConfirm.title')}><SkeletonRows count={3} /></Screen>

  const paid = order?.payment_status === 'paid'
  const failed = paymentFailed(order)
  const refunded = result === 'refunded'
  const refundFailed = result === 'refund_failed'
  // Απλήρωτη αλλά η πληρωμή επιστράφηκε (π.χ. ακυρωμένη παραγγελία).
  const notCharged = !paid && (refunded || refundFailed)

  return (
    <Screen title={t('orderConfirm.title')} scroll={false}>
      <ScrollView contentContainerStyle={s.body}>
        <View style={s.hero}>
          <View style={[s.heroIcon, paid && s.heroOk, failed && s.heroBad]}>
            {paid ? <CheckCircle2 size={40} color={colors.success} />
             : failed ? <XCircle size={40} color={colors.danger} />
             : <Clock size={40} color={colors.warning} />}
          </View>
          <Text style={s.heroTitle}>
            {paid ? t('orderConfirm.paid') : failed ? t('orderConfirm.failed')
              : notCharged ? t('orderConfirm.notChargedTitle') : t('orderConfirm.pending')}
          </Text>
          <Text style={s.heroTxt}>
            {paid ? t('orderConfirm.paidHint') : failed ? t('orderConfirm.failedHint')
              : notCharged ? (refunded ? t('orderConfirm.lateRefunded') : t('orderConfirm.lateRefundDelayed'))
              : t('orderConfirm.pendingHint')}
          </Text>
          {paid && (refunded || refundFailed) && (
            <Text style={[s.heroTxt, { color: colors.warning }]}>
              {refunded ? t('orderConfirm.duplicateRefunded') : t('orderConfirm.duplicateRefundDelayed')}
            </Text>
          )}
        </View>

        {!!order && (
          <Card>
            <View style={s.kv}>
              <Text style={s.k}>{t('orderConfirm.orderNumber')}</Text>
              <Text style={s.v}>#{String(order.id).slice(0, 8)}</Text>
            </View>
            <View style={s.kv}>
              <Text style={s.k}>{t('common.total')}</Text>
              <Text style={s.v}>€{Number(order.total_amount ?? 0).toFixed(2)}</Text>
            </View>
            <View style={s.kv}>
              {/* Ετικέτα «Κατάσταση» (ήταν «Κράτηση»)· pending/cancelled έχουν
                  τα κείμενά τους στο status.*, όπως στη λίστα παραγγελιών. */}
              <Text style={s.k}>{t('orderConfirm.status')}</Text>
              <Badge label={order.status === 'payment_failed' ? t('mySubs.status_payment_failed')
                  : t(['pending', 'cancelled'].includes(order.status) ? `status.${order.status}` : `orders.${order.status}`, { defaultValue: order.status })}
                tone={paid ? 'success' : failed ? 'danger' : 'warning'} />
            </View>
          </Card>
        )}

        <Button label={t('profile.menu.orders')} icon={<Package size={18} color={colors.textOnDark} />}
          onPress={() => router.dismissTo('/orders' as any)} full />
        <Button label={t('cart.go_to_shop')} variant="secondary"
          onPress={() => router.replace('/(tabs)/marketplace' as any)} full />
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
