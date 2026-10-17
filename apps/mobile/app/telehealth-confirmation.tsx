import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock, XCircle, Stethoscope } from 'lucide-react-native'
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
export default function TelehealthConfirmationScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { id, transactionId } = useLocalSearchParams<{ id: string; transactionId?: string }>()
  const verified = useRef(false)

  const { data: session, isLoading } = useQuery({
    queryKey: ['telehealth-session', id],
    queryFn: () => api.get(`/telehealth/${id}`).then(r => r.data?.data ?? r.data),
    enabled: !!id,
  })

  const verify = useMutation({
    mutationFn: () => api.post(`/telehealth/${id}/viva/verify`, { transaction_id: transactionId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['telehealth-session', id] })
      qc.invalidateQueries({ queryKey: ['telehealth'] })
    },
  })

  useEffect(() => {
    if (!verified.current && id && transactionId) {
      verified.current = true
      verify.mutate()
    }
  }, [id, transactionId])

  if (isLoading) return <Screen title={t('teleConfirm.title')}><SkeletonRows count={3} /></Screen>

  const paid = session?.payment_status === 'paid'
  const failed = session?.payment_status === 'failed'

  return (
    <Screen title={t('teleConfirm.title')} scroll={false}>
      <ScrollView contentContainerStyle={s.body}>
        <View style={s.hero}>
          <View style={[s.heroIcon, paid && s.heroOk, failed && s.heroBad]}>
            {paid ? <CheckCircle2 size={40} color={colors.success} />
             : failed ? <XCircle size={40} color={colors.danger} />
             : <Clock size={40} color={colors.warning} />}
          </View>
          <Text style={s.heroTitle}>
            {paid ? t('teleConfirm.paid') : failed ? t('teleConfirm.failed') : t('teleConfirm.pending')}
          </Text>
          <Text style={s.heroTxt}>
            {paid ? t('teleConfirm.paidHint') : failed ? t('teleConfirm.failedHint') : t('teleConfirm.pendingHint')}
          </Text>
        </View>

        {!!session && (
          <Card>
            <View style={s.kv}>
              <Text style={s.k}>{t('teleConfirm.sessionNumber')}</Text>
              <Text style={s.v}>#{String(session.id).slice(0, 8)}</Text>
            </View>
            <View style={s.kv}>
              <Text style={s.k}>{t('common.total')}</Text>
              <Text style={s.v}>€{Number(session.price ?? 0).toFixed(2)}</Text>
            </View>
            <View style={s.kv}>
              <Text style={s.k}>{t('providerDash.booking')}</Text>
              <Badge label={t(`status.${session.status}`, { defaultValue: session.status })}
                tone={paid ? 'success' : 'warning'} />
            </View>
          </Card>
        )}

        <Button label={t('profile.menu.telehealth')} icon={<Stethoscope size={18} color={colors.textOnDark} />}
          onPress={() => router.replace('/telehealth' as any)} full />
        <Button label={t('tele.title')} variant="secondary"
          onPress={() => router.replace('/(tabs)/index' as any)} full />
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
