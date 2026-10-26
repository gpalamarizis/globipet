import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, Image, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RotateCcw, Package, AlertTriangle } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, Card, Badge, Button, EmptyState, SkeletonRows } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'
import { dateLocale } from '@/lib/dates'

/**
 * Οι συνδρομές τροφής μου — ίδιο με την κάρτα «Οι συνδρομές μου» του
 * Προφίλ στο web.
 *
 * Η σελίδα συνδρομής έλεγε «Ακύρωση οποιαδήποτε στιγμή», αλλά καμία οθόνη
 * δεν καλούσε το POST /subscriptions/food/:id/cancel.
 *
 * ΤΙ ΚΑΝΕΙ Η ΑΚΥΡΩΣΗ (backend routes/subscriptions.ts)
 *   Άμεση ακύρωση στο Stripe: καμία νέα χρέωση, καμία επιστροφή. Η παράδοση
 *   που έχει ήδη πληρωθεί είναι ήδη παραγγελία και αποστέλλεται κανονικά.
 */

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'
const STATUS_TONE: Record<string, Tone> = {
  active: 'success',
  payment_failed: 'danger',
  paused: 'warning',
  cancelled: 'neutral',
  completed: 'info',
}

export default function SubscriptionsScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const [refreshing, setRefreshing] = useState(false)

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ['my-food-subscriptions'],
    queryFn: () => api.get('/subscriptions/food/my').then(r => r.data?.data ?? []),
    enabled: isAuthenticated,
  })

  const cancel = useMutation({
    mutationFn: (id: string) => api.post(`/subscriptions/food/${id}/cancel`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-food-subscriptions'] })
      Alert.alert(t('mySubs.cancelledToast'))
    },
    onError: (e: any) =>
      Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['my-food-subscriptions'] })
    setRefreshing(false)
  }, [qc])

  const fmtDate = (d?: string | null) => {
    if (!d) return ''
    const x = new Date(d)
    return isNaN(x.getTime()) ? '' : x.toLocaleDateString(dateLocale(i18n.language), { day: '2-digit', month: 'long', year: 'numeric' })
  }

  const confirmCancel = (sub: any, total: number) => {
    Alert.alert(
      t('mySubs.cancel'),
      t('mySubs.confirmText', { done: sub.deliveries_completed ?? 0, total }),
      [
        { text: t('mySubs.keep'), style: 'cancel' },
        { text: t('mySubs.confirmCancel'), style: 'destructive', onPress: () => cancel.mutate(sub.id) },
      ],
    )
  }

  if (!isAuthenticated) return (
    <Screen title={t('mySubs.title')} back>
      <EmptyState icon={RotateCcw} title={t('profile.not_logged_in')}
        action={<Button label={t('auth.sign_in')} onPress={() => router.push('/auth/login' as any)} />} />
    </Screen>
  )

  return (
    <Screen title={t('mySubs.title')} back onRefresh={onRefresh} refreshing={refreshing}>
      {isLoading ? <SkeletonRows count={2} /> : subs.length === 0 ? (
        <EmptyState icon={RotateCcw} title={t('mySubs.none')} message={t('mySubs.noneHint')}
          action={<Button label={t('cart.go_to_shop')} onPress={() => router.push('/(tabs)/marketplace' as any)} />} />
      ) : (
        <View style={s.list}>
          {subs.map((sub: any) => {
            const total = sub.deliveries_total ?? 12
            const canCancel = sub.can_cancel ?? (sub.status !== 'cancelled' && sub.status !== 'completed')
            return (
              <Card key={sub.id}>
                <View style={s.row}>
                  {sub.product?.image_url
                    ? <Image source={{ uri: sub.product.image_url }} style={s.thumb} />
                    : <View style={[s.thumb, s.thumbEmpty]}><Package size={icon.md} color={colors.textLight} /></View>}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    {/* Το όνομα ανοίγει το προϊόν, όπως ο σύνδεσμος στο web. */}
                    <Text style={s.name} numberOfLines={2}
                      onPress={sub.product?.id ? () => router.push(`/products/${sub.product.id}` as any) : undefined}>
                      {sub.product?.name}
                    </Text>
                    <Text style={s.meta}>
                      €{Number(sub.monthly_price ?? 0).toFixed(2)}{t('pricing.perMonth')} · {t('mySubs.deliveries', { done: sub.deliveries_completed ?? 0, total })}
                    </Text>
                    {sub.status === 'active' && !!sub.next_delivery_date && (
                      <Text style={s.hint}>{t('mySubs.nextCharge', { date: fmtDate(sub.next_delivery_date) })}</Text>
                    )}
                    {!canCancel && !!sub.end_date && (
                      <Text style={s.hint}>{t('mySubs.endedOn', { date: fmtDate(sub.end_date) })}</Text>
                    )}
                  </View>
                  <Badge label={t(`mySubs.status_${sub.status}`, { defaultValue: sub.status })}
                    tone={STATUS_TONE[sub.status] ?? 'neutral'} />
                </View>

                {sub.status === 'payment_failed' && (
                  <View style={s.warn}>
                    <AlertTriangle size={icon.xs} color={colors.danger} />
                    <Text style={s.warnTxt}>{t('mySubs.paymentFailedHint')}</Text>
                  </View>
                )}

                {canCancel && (
                  <Button label={t('mySubs.cancel')} variant="ghost" size="sm"
                    loading={cancel.isPending && cancel.variables === sub.id}
                    disabled={cancel.isPending}
                    onPress={() => confirmCancel(sub, total)}
                    style={s.cancelBtn} />
                )}
              </Card>
            )
          })}
        </View>
      )}
    </Screen>
  )
}

const s = StyleSheet.create({
  list: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  thumb: { width: 52, height: 52, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  name: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  meta: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  hint: { ...type.caption, color: colors.textLight, marginTop: 2 },
  warn: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs, marginTop: space.md },
  warnTxt: { ...type.caption, color: colors.danger, flex: 1 },
  cancelBtn: { alignSelf: 'flex-start', marginTop: space.md },
})
