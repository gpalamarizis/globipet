import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking, AppState } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Crown, Sparkles, Zap, Coins, Headset, TriangleAlert, Info } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, Card, Badge, Button, SkeletonRows, EmptyState } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'
import { fmtDateShort } from '@/lib/dates'
import { fmtEur } from '@/lib/money'
import { useBillingPortal } from './payments'

/**
 * Ε18 — GlobiPet Plus: συνδρομή μέλους με όλο το AI μέσα (ίδια λειτουργία με
 * το web /membership). Όλα τα στοιχεία (όνομα, τιμές, οφέλη, έκπτωση
 * επιπέδου, κατάσταση) έρχονται από το GET /membership — τίποτα σταθερό εδώ.
 *
 *   Αγορά: POST /membership/checkout → checkout_url, άνοιγμα όπως το checkout
 *   του AI στο pricing.tsx (canOpenURL/openURL). 409 → το μήνυμα του server.
 *   Ακύρωση: το υπάρχον POST /ai-subscriptions/cancel (όπως το pricing.tsx).
 *   Η κατάσταση ξαναδιαβάζεται όταν η εφαρμογή επιστρέφει στο προσκήνιο
 *   (μετά τη σελίδα πληρωμής του Stripe στον browser).
 */

export type MembershipStatus = 'none' | 'trial' | 'member' | 'payment_failed' | 'other_ai_plan'
export interface MembershipInfo {
  available: boolean
  plan: { id: string; name: string; price_monthly: number; price_annual: number | null; currency: 'EUR' } | null
  benefits: { points_multiplier: number; ai_daily_limit: number; ai_daily_limit_standard: number }
  tier_discount_percent: number
  me: null | {
    status: MembershipStatus
    current_period_end: string | null
    can_cancel: boolean
    other_plan_name: string | null
  }
}

/** Κοινό query για Plus, Λογαριασμό και Πλάνα AI — ανά χρήστη (ή ανώνυμο). */
export function useMembership(enabled = true) {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['membership', user?.id ?? 'anon'],
    queryFn: () => api.get('/membership').then(r => (r.data?.data ?? r.data) as MembershipInfo),
    enabled,
    staleTime: 60_000,
  })
}

export default function MembershipScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const [annual, setAnnual] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const portal = useBillingPortal()
  // Κλείδωμα διπλού πατήματος: το state του useMutation αργεί ένα render.
  const checkoutLock = useRef(false)

  const { data: info, isLoading, isError, refetch } = useMembership()
  // Η περίοδος που ΦΑΙΝΕΤΑΙ: ετήσια μόνο αν υπάρχει ετήσια τιμή (όπως το web).
  const hasAnnualPrice = info?.plan?.price_annual != null && Number(info.plan.price_annual) > 0
  const billing: 'monthly' | 'annual' = annual && hasAnnualPrice ? 'annual' : 'monthly'

  // Επιστροφή από τη σελίδα πληρωμής/διαχείρισης (browser) → νέα κατάσταση.
  useEffect(() => {
    const sub = AppState.addEventListener('change', st => {
      if (st !== 'active') return
      qc.invalidateQueries({ queryKey: ['membership'] })
      qc.invalidateQueries({ queryKey: ['ai-subscription-status'] })
    })
    return () => sub.remove()
  }, [qc])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['membership'] })
    setRefreshing(false)
  }, [qc])

  const checkout = useMutation({
    mutationFn: (b: 'monthly' | 'annual') => api.post('/membership/checkout', { billing: b }),
    onSettled: () => { checkoutLock.current = false },
    onSuccess: async (r: any) => {
      const url = r?.data?.data?.checkout_url ?? r?.data?.checkout_url
      if (!url) return Alert.alert(t('common.error'), t('checkout.err_no_page'))
      const ok = await Linking.canOpenURL(url)
      if (ok) Linking.openURL(url)
      else Alert.alert(t('common.error'), t('checkout.err_open_page'))
    },
    // 409 (ήδη μέλος / άλλο πλάνο AI / εκκρεμής πληρωμή): { message, code } από τον server.
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const cancel = useMutation({
    mutationFn: () => api.post('/ai-subscriptions/cancel', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['membership'] })
      qc.invalidateQueries({ queryKey: ['ai-subscription-status'] })
      Alert.alert(t('membership.cancelled'))
    },
    onError: (e: any) =>
      Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const startCheckout = () => {
    if (checkoutLock.current || checkout.isPending) return
    checkoutLock.current = true
    checkout.mutate(billing)
  }

  const confirmCancel = () => Alert.alert(
    t('mySubs.cancel'),
    t('membership.cancelConfirm'),
    [
      { text: t('mySubs.keep'), style: 'cancel' },
      { text: t('mySubs.confirmCancel'), style: 'destructive', onPress: () => cancel.mutate() },
    ],
  )

  const title = info?.plan?.name || t('membership.title')

  if (isLoading) {
    return <Screen title={title} back><SkeletonRows count={4} /></Screen>
  }
  if (isError || !info) {
    return (
      <Screen title={title} back>
        <EmptyState icon={Crown} title={t('membership.loadError')}
          action={<Button variant="secondary" label={t('common.try_again')} onPress={() => refetch()} />} />
      </Screen>
    )
  }

  const plan = info.plan
  const name = plan?.name || t('membership.title')
  const me = isAuthenticated ? info.me : null
  const st: MembershipStatus = me?.status ?? 'none'
  const isMember = st === 'member' || st === 'payment_failed'
  const hasAnnual = hasAnnualPrice
  const billAnnual = billing === 'annual'
  const tierPct = isAuthenticated ? Math.max(0, Math.min(100, Number(info.tier_discount_percent) || 0)) : 0
  /** Τιμή ΠΡΩΤΗΣ περιόδου μετά την έκπτωση επιπέδου, στο λεπτό (όπως το Stripe). */
  const discounted = (v: number) => Math.round(Number(v) * (100 - tierPct)) / 100
  const base = plan ? Number(billAnnual ? plan.price_annual : plan.price_monthly) : 0
  const lang = i18n.language
  const num = (n: number) => Number(n || 0).toLocaleString(lang)
  const renews = st === 'member' && me?.current_period_end ? fmtDateShort(me.current_period_end, lang) : ''

  const BENEFITS = [
    { key: 'ai',      Icon: Sparkles, text: t('membership.benefitAi') },
    { key: 'limit',   Icon: Zap,      text: t('membership.benefitLimit', { limit: num(info.benefits?.ai_daily_limit), standard: num(info.benefits?.ai_daily_limit_standard) }) },
    { key: 'points',  Icon: Coins,    text: t('membership.benefitPoints', { multiplier: num(info.benefits?.points_multiplier) }) },
    { key: 'support', Icon: Headset,  text: t('membership.benefitSupport') },
  ]

  return (
    <Screen title={title} subtitle={t('membership.subtitle')} back onRefresh={onRefresh} refreshing={refreshing}>
      <View style={s.body}>
        {/* Η κατάστασή μου */}
        {st === 'member' && (
          <Card style={s.memberCard}>
            <View style={s.headRow}>
              <View style={s.iconBox}><Crown size={icon.md} color={colors.brand} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.strong}>{t('membership.memberTitle', { name })}</Text>
                {!!renews && <Text style={s.caption}>{t('membership.renews', { date: renews })}</Text>}
              </View>
              <Badge label={t('membership.statusActive')} tone="success" />
            </View>
            {me?.can_cancel && (
              <Button label={t('mySubs.cancel')} variant="ghost" size="sm"
                loading={cancel.isPending} disabled={cancel.isPending}
                onPress={confirmCancel} style={s.ghostBtn} />
            )}
          </Card>
        )}

        {st === 'payment_failed' && (
          <Card style={s.dangerCard}>
            <View style={s.headRow}>
              <View style={[s.iconBox, { backgroundColor: colors.surface }]}><TriangleAlert size={icon.md} color={colors.danger} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.strong}>{t('membership.paymentFailedTitle')}</Text>
              </View>
              <Badge label={t('mySubs.status_payment_failed')} tone="danger" />
            </View>
            <Text style={[s.text, { marginTop: space.sm }]}>{t('membership.paymentFailedHint')}</Text>
            <Button full label={t('membership.manageCard')}
              loading={portal.opening} disabled={portal.opening}
              onPress={portal.open} style={{ marginTop: space.md }} />
            {me?.can_cancel && (
              <Button label={t('mySubs.cancel')} variant="ghost" size="sm"
                loading={cancel.isPending} disabled={cancel.isPending}
                onPress={confirmCancel} style={s.ghostBtn} />
            )}
          </Card>
        )}

        {st === 'other_ai_plan' && (
          <Card style={s.info}>
            <View style={s.noteRow}>
              <Info size={icon.sm} color={colors.info} style={s.infoIcon} />
              <Text style={[s.text, s.infoTxt]}>
                {me?.other_plan_name
                  ? t('membership.otherPlan', { plan: me.other_plan_name, name })
                  : t('membership.otherPlanNoName', { name })}
              </Text>
            </View>
            <Button full variant="secondary" label={t('membership.goToPlans')}
              onPress={() => router.push('/pricing' as any)} style={{ marginTop: space.md }} />
          </Card>
        )}

        {/* Οφέλη — πραγματικές τιμές από τον server· όπως το web: όταν το Plus
            διατίθεται, ή για μέλος (και αν ο admin το απενεργοποίησε). */}
        {(info.available || isMember) && <Card>
          <Text style={s.section}>{t('membership.benefitsTitle')}</Text>
          <View style={s.benefits}>
            {BENEFITS.map(({ key, Icon, text }) => (
              <View key={key} style={s.benefit}>
                <Icon size={icon.sm} color={colors.brand} />
                <Text style={s.benefitTxt}>{text}</Text>
              </View>
            ))}
          </View>
        </Card>}

        {/* Αγορά */}
        {!isMember && (!info.available || !plan ? (
          <Card>
            <View style={s.headRow}>
              <View style={s.iconBox}><Crown size={icon.md} color={colors.brand} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.strong}>{t('membership.comingSoon')}</Text>
                <Text style={s.caption}>{t('membership.comingSoonHint')}</Text>
              </View>
            </View>
          </Card>
        ) : (
          <Card style={s.buyCard}>
            {st === 'trial' && (
              <Text style={s.trialNote}>{t('membership.trialNote')}</Text>
            )}
            {hasAnnual && (
              <View style={s.toggle}>
                {([[false, 'pricing.monthly'], [true, 'pricing.annual']] as const).map(([v, k]) => (
                  <TouchableOpacity key={k} activeOpacity={0.7}
                    style={[s.toggleBtn, billAnnual === v && s.toggleOn]}
                    accessibilityState={{ selected: billAnnual === v }}
                    onPress={() => setAnnual(v)}>
                    <Text style={[s.toggleTxt, billAnnual === v && s.toggleTxtOn]}>{t(k)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {tierPct > 0 && (
              <View style={[s.wasRow, { marginTop: hasAnnual ? space.md : 0 }]}>
                <Text style={s.was}>{fmtEur(base, lang)}</Text>
                <Badge label={`−${tierPct}%`} tone="success" />
              </View>
            )}
            {/* Πρώτο στοιχείο της κάρτας χωρίς κενό από πάνω· μετά τον διακόπτη md, μετά τη διαγραμμένη τιμή xs. */}
            <View style={[s.priceRow, { marginTop: tierPct > 0 ? space.xs : hasAnnual ? space.md : 0 }]}>
              <Text style={s.price}>{fmtEur(discounted(base), lang)}</Text>
              <Text style={s.per}>{billAnnual ? t('membership.perYear') : t('pricing.perMonth')}</Text>
            </View>
            {/* Όπως το web: η ετήσια τιμή (πριν την έκπτωση επιπέδου) ανά μήνα. */}
            {billAnnual && (
              <Text style={[s.caption, { marginTop: space.xs }]}>
                {t('membership.annualPerMonth', { amount: fmtEur(Math.round(base / 12 * 100) / 100, lang) })}
              </Text>
            )}
            {tierPct > 0 && (
              <Text style={[s.caption, { marginTop: space.xs }]}>
                {t(billAnnual ? 'membership.tierDiscountYear' : 'membership.tierDiscountMonth', { percent: tierPct, price: fmtEur(base, lang) })}
              </Text>
            )}

            {!isAuthenticated ? (
              <>
                <Text style={[s.muted, { marginTop: space.md }]}>{t('membership.loginPrompt')}</Text>
                {/* Μετά τη σύνδεση το login επιστρέφει εδώ (param redirect) —
                    όπως το web /login?redirect=/membership. */}
                <Button label={t('auth.login')} variant="secondary"
                  onPress={() => router.push({ pathname: '/auth/login', params: { redirect: '/membership' } } as any)}
                  full style={{ marginTop: space.sm }} />
              </>
            ) : st !== 'other_ai_plan' && (
              <Button label={t('membership.join')}
                icon={<Crown size={icon.sm} color={colors.textOnDark} />}
                loading={checkout.isPending} disabled={checkout.isPending}
                onPress={startCheckout} full style={{ marginTop: space.md }} />
            )}
          </Card>
        ))}

        <Text style={s.note}>{t('membership.note')}</Text>
      </View>
    </Screen>
  )
}

const s = StyleSheet.create({
  body: { gap: space.md },
  section: { ...type.emphasis, color: colors.text, fontWeight: weight.bold },
  strong: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  text: { ...type.body, color: colors.text },
  muted: { ...type.body, color: colors.textMuted },
  caption: { ...type.caption, color: colors.textLight, marginTop: 2 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  iconBox: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.brandLight, alignItems: 'center', justifyContent: 'center',
  },
  memberCard: { borderColor: colors.brand, borderWidth: 2 },
  dangerCard: { backgroundColor: colors.dangerBg, borderColor: colors.dangerBg },
  ghostBtn: { alignSelf: 'flex-start', marginTop: space.md },
  info: { backgroundColor: colors.infoBg, borderColor: colors.infoBg },
  // Εικονίδιο 16 με γραμμή κειμένου 22: +3 ώστε να κάθεται στο κέντρο της 1ης γραμμής.
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  infoIcon: { marginTop: 3 },
  infoTxt: { color: '#1D4ED8', flex: 1 },
  benefits: { gap: space.sm, marginTop: space.md },
  benefit: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    paddingHorizontal: space.md, paddingVertical: space.sm + 2,
  },
  benefitTxt: { ...type.body, color: colors.text, flex: 1 },
  buyCard: { borderColor: colors.brand, borderWidth: 2 },
  // Ίδιο με το web: γκρι πλαίσιο με τη σημείωση δοκιμής στην κορυφή της κάρτας αγοράς.
  trialNote: {
    ...type.caption, color: colors.textMuted, backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.sm, overflow: 'hidden',
    marginBottom: space.md,
  },
  toggle: { flexDirection: 'row', gap: space.sm },
  toggleBtn: { flex: 1, paddingVertical: space.sm, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border, alignItems: 'center' },
  toggleOn: { borderColor: colors.brand, backgroundColor: colors.brandTint },
  toggleTxt: { ...type.caption, color: colors.textMuted, fontWeight: weight.medium },
  toggleTxtOn: { color: colors.brand, fontWeight: weight.bold },
  wasRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  was: { ...type.body, color: colors.textLight, textDecorationLine: 'line-through' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs },
  price: { ...type.display, color: colors.brand, fontWeight: weight.black },
  per: { ...type.caption, color: colors.textLight },
  note: { ...type.caption, color: colors.textLight, textAlign: 'center', marginTop: space.sm },
})
