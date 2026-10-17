import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock, XCircle, Package } from 'lucide-react-native'
import { api } from '@/lib/api'
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
 *   ξαναποδοθεί, ώστε να μην υπάρξουν διπλές επιβεβαιώσεις.
 */
export default function OrderConfirmationScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { id, transactionId } = useLocalSearchParams<{ id: string; transactionId?: string }>()
  const verified = useRef(false)

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}`).then(r => r.data?.data ?? r.data),
    enabled: !!id,
  })

  const verify = useMutation({
    mutationFn: () => api.post('/orders/viva/verify', { order_id: id, transaction_id: transactionId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] })
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  useEffect(() => {
    if (!verified.current && id && transactionId) {
      verified.current = true
      verify.mutate()
    }
  }, [id, transactionId])

  if (isLoading) return <Screen title={t('orderConfirm.title')}><SkeletonRows count={3} /></Screen>

  const paid = order?.payment_status === 'paid'
  const failed = order?.payment_status === 'failed'

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
            {paid ? t('orderConfirm.paid') : failed ? t('orderConfirm.failed') : t('orderConfirm.pending')}
          </Text>
          <Text style={s.heroTxt}>
            {paid ? t('orderConfirm.paidHint') : failed ? t('orderConfirm.failedHint') : t('orderConfirm.pendingHint')}
          </Text>
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
              <Text style={s.k}>{t('providerDash.booking')}</Text>
              <Badge label={t(`orders.${order.status}`, { defaultValue: order.status })}
                tone={paid ? 'success' : 'warning'} />
            </View>
          </Card>
        )}

        <Button label={t('profile.menu.orders')} icon={<Package size={18} color={colors.textOnDark} />}
          onPress={() => router.replace('/orders' as any)} full />
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
