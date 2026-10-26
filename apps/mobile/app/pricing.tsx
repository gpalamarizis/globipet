import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles, Check, Star, Award } from 'lucide-react-native'
import { api } from '../src/lib/api'
import { useAuthStore } from '../src/store/auth'
import { Screen, Card, Badge, Button, EmptyState, SkeletonRows } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Πλάνα συνδρομής AI και δωρεάν δοκιμή.
 *
 * ΓΙΑΤΙ ΧΡΕΙΑΖΕΤΑΙ
 *   Ο χρήστης του κινητού δεν μπορούσε να αγοράσει συνδρομή καθόλου: τα
 *   εργαλεία AI τον έστελναν σε τοίχο χωρίς διέξοδο. Είναι το μοντέλο
 *   εσόδων της εφαρμογής.
 *
 * ΜΗΝΙΑΙΑ Ή ΕΤΗΣΙΑ
 *   Ο διακόπτης αλλάζει μόνο τι στέλνουμε ως billing — τις τιμές τις δίνει
 *   ο server. Η ετήσια εμφανίζεται ανά μήνα, ώστε η σύγκριση να είναι
 *   τίμια και να φαίνεται το όφελος.
 */
/**
 * Πληρωμένη συνδρομή AI (Stripe): κατάσταση και «Ακύρωση συνδρομής» με
 * επιβεβαίωση — ίδιο μοτίβο με τη συνδρομή τροφής (subscriptions.tsx) και
 * με το web (PricingPage → AiSubscriptionManage). Χρησιμοποιείται εδώ και
 * στο Κέντρο υγείας. Τίποτα, αν δεν υπάρχει πληρωμένη/ακυρωμένη συνδρομή.
 */
export function AiSubscriptionManage() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()

  const { data: status } = useQuery({
    queryKey: ['ai-subscription-status'],
    queryFn: () => api.get('/ai-subscriptions/my-status').then(r => r.data?.data),
    enabled: isAuthenticated,
  })

  const cancel = useMutation({
    mutationFn: () => api.post('/ai-subscriptions/cancel', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-subscription-status'] })
      Alert.alert(t('mySubs.cancelledToast'))
    },
    onError: (e: any) =>
      Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const st = status?.ai_subscription_status
  if (!isAuthenticated || (st !== 'active' && st !== 'payment_failed' && st !== 'cancelled')) return null
  const canCancel = status?.can_cancel ?? (st === 'active' || st === 'payment_failed')
  const plan = status?.plan
  const planName = plan ? ((i18n.language === 'el' && plan.name_el) ? plan.name_el : plan.name) : null

  const confirmCancel = () => Alert.alert(
    t('mySubs.cancel'),
    t('aiSub.confirmText'),
    [
      { text: t('mySubs.keep'), style: 'cancel' },
      { text: t('mySubs.confirmCancel'), style: 'destructive', onPress: () => cancel.mutate() },
    ],
  )

  return (
    <Card>
      <View style={s.subHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.subTitle}>{st === 'cancelled' ? t('aiSub.cancelledTitle') : t('aiSub.activeTitle')}</Text>
          {!!planName && <Text style={s.subMeta}>{t('aiSub.plan', { plan: planName })}</Text>}
        </View>
        <Badge label={t(`mySubs.status_${st}`)}
          tone={st === 'active' ? 'success' : st === 'payment_failed' ? 'danger' : 'neutral'} />
      </View>
      {st === 'payment_failed' && <Text style={s.subWarn}>{t('aiSub.paymentFailedHint')}</Text>}
      {canCancel && (
        <Button label={t('mySubs.cancel')} variant="ghost" size="sm"
          loading={cancel.isPending} disabled={cancel.isPending}
          onPress={confirmCancel} style={s.subCancel} />
      )}
    </Card>
  )
}

export default function PricingScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  const [annual, setAnnual] = useState(false)
  const qc = useQueryClient()

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['ai-plans'],
    queryFn: () => api.get('/ai-subscriptions/plans').then(r => r.data?.data ?? []),
  })

  // Ίδιο key και ίδια πεδία με web/ai-health: `ai_subscription_status`
  // ('none'|'trial'|'active'|'expired'). Τα is_subscribed/trial_used δεν
  // υπάρχουν στην απάντηση, οπότε η κάρτα δοκιμής δεν έβγαινε ποτέ.
  const { data: status } = useQuery({
    queryKey: ['ai-subscription-status'],
    queryFn: () => api.get('/ai-subscriptions/my-status').then(r => r.data?.data),
    enabled: isAuthenticated,
  })

  // Έκπτωση επιπέδου επιβράβευσης (Ε17) — ίδιο ποσοστό με το κουπόνι του
  // Stripe που βάζει ο server στο checkout· ίδια εμφάνιση με το web.
  const { data: loyalty } = useQuery({
    queryKey: ['loyalty'],
    queryFn: () => api.get('/loyalty').then(r => r.data?.data ?? r.data),
    enabled: isAuthenticated,
  })
  const tierPct: number = isAuthenticated ? Math.max(0, Math.min(50, Number(loyalty?.ai_discount_percent) || 0)) : 0
  /** Τιμή μετά την έκπτωση, στρογγυλεμένη στο λεπτό (όπως το Stripe). */
  const discounted = (v: number) => Math.round(Number(v) * (100 - tierPct)) / 100

  const startTrial = useMutation({
    mutationFn: () => api.post('/ai-subscriptions/start-trial', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-subscription-status'] })
      Alert.alert(t('ai.try_free'), t('ai.trial_desc'))
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('ai.trial_failed')),
  })

  const checkout = useMutation({
    mutationFn: (plan_id: string) =>
      api.post('/ai-subscriptions/create-checkout', { plan_id, billing: annual ? 'annual' : 'monthly' }),
    onSuccess: async (r: any) => {
      const url = r?.data?.checkout_url ?? r?.data?.data?.checkout_url
      if (!url) return Alert.alert(t('common.error'), t('checkout.err_no_page'))
      const ok = await Linking.canOpenURL(url)
      if (ok) Linking.openURL(url)
      else Alert.alert(t('common.error'), t('checkout.err_open_page'))
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  // Το όνομα ακολουθεί τη γλώσσα: ο server κρατά ξεχωριστό ελληνικό πεδίο.
  const planName = (p: any) => (i18n.language === 'el' && p.name_el) ? p.name_el : p.name

  const monthly = (p: any) =>
    annual && p.price_annual ? p.price_annual / 12 : p.price_monthly
  // Μετά την έκπτωση: η χρέωση (μηνιαία ή ετήσια) μειώνεται κατά tierPct.
  const monthlyDiscounted = (p: any) =>
    annual && p.price_annual ? discounted(p.price_annual) / 12 : discounted(p.price_monthly)

  // Ο server ξεκινά δοκιμή μόνο από 'none' (αλλιώς 400).
  const canTrial = isAuthenticated && status?.ai_subscription_status === 'none'

  return (
    <Screen title={t('pricing.title')} back scroll={false}>
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.intro}>{t('pricing.subtitle')}</Text>

        {/* Έκπτωση του επιπέδου μου (όπως στο web). */}
        {tierPct > 0 && (
          <Card onPress={() => router.push('/loyalty' as any)}>
            <View style={s.tierRow}>
              <Award size={icon.md} color={colors.brand} />
              <Text style={s.tierTxt}>
                {t('pricing.tierDiscountBanner', { tier: t(`profile.${loyalty?.tier ?? 'bronze'}`), percent: tierPct })}
              </Text>
            </View>
            <Text style={s.tierMore}>{t('pricing.tierDiscountMore')}</Text>
          </Card>
        )}

        {/* Πληρωμένη συνδρομή AI: κατάσταση και ακύρωση (όπως στο web). */}
        <AiSubscriptionManage />

        {canTrial && (
          <Card style={s.trial}>
            <View style={s.trialHead}>
              <Sparkles size={icon.md} color={colors.brand} />
              <Text style={s.trialTitle}>{t('ai.try_free')}</Text>
            </View>
            <Text style={s.trialTxt}>{t('ai.trial_desc')}</Text>
            {/* Η δοκιμή ξεκινά με την επιβεβαίωση του email (server 403) —
                μήνυμα αντί για κουμπί, όπως medical-center και web. */}
            {(user as any)?.email_verified === false ? (
              <Text style={[s.trialTxt, { marginTop: space.md, fontWeight: weight.semibold }]}>{t('trialVerify.confirmEmail')}</Text>
            ) : (
              <Button label={t('ai.start_trial')} loading={startTrial.isPending}
                onPress={() => startTrial.mutate()} full style={{ marginTop: space.md }} />
            )}
          </Card>
        )}

        {/* Μηνιαία / ετήσια */}
        <View style={s.toggle}>
          {([[false, 'pricing.monthly'], [true, 'pricing.annual']] as const).map(([v, k]) => (
            <TouchableOpacity key={k} activeOpacity={0.7}
              style={[s.toggleBtn, annual === v && s.toggleOn]}
              onPress={() => setAnnual(v)}>
              <Text style={[s.toggleTxt, annual === v && s.toggleTxtOn]}>{t(k)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? <SkeletonRows count={3} /> :
         plans.length === 0 ? <EmptyState icon={Sparkles} title={t('pricing.noPlans')} /> :
         plans.map((p: any) => (
          <Card key={p.id} style={p.is_featured ? s.featured : undefined}>
            {p.is_featured && (
              <View style={s.featuredTag}>
                <Star size={12} color={colors.textOnDark} fill={colors.textOnDark} />
                <Text style={s.featuredTxt}>{t('pricing.recommended')}</Text>
              </View>
            )}
            <Text style={s.planName}>{planName(p)}</Text>
            {!!p.description && <Text style={s.planDesc}>{p.description}</Text>}

            {tierPct > 0 && (
              <View style={s.wasRow}>
                <Text style={s.was}>€{monthly(p).toFixed(2)}</Text>
                <Badge label={`−${tierPct}%`} tone="success" />
              </View>
            )}
            <View style={[s.priceRow, tierPct > 0 && { marginTop: space.xs }]}>
              <Text style={s.price}>€{monthlyDiscounted(p).toFixed(2)}</Text>
              <Text style={s.per}>{t('pricing.perMonth')}</Text>
            </View>
            {annual && p.price_annual && (
              <Badge label={t('pricing.billedAnnually', { amount: discounted(p.price_annual).toFixed(2) })} tone="success" />
            )}

            {!!p.features?.length && (
              <View style={s.features}>
                {p.features.map((f: string, i: number) => (
                  <View key={i} style={s.feature}>
                    <Check size={14} color={colors.success} />
                    <Text style={s.featureTxt}>{f}</Text>
                  </View>
                ))}
              </View>
            )}

            {!isAuthenticated ? (
              <Button label={t('auth.login')} variant="secondary"
                onPress={() => router.push('/auth/login' as any)} full style={{ marginTop: space.md }} />
            ) : (
              <Button
                label={t('pricing.choose')}
                loading={checkout.isPending}
                disabled={checkout.isPending || (annual && !p.price_annual)}
                onPress={() => checkout.mutate(p.id)}
                full style={{ marginTop: space.md }} />
            )}
          </Card>
        ))}

        <Text style={s.note}>{t('pricing.vivaNote')}</Text>
      </ScrollView>
    </Screen>
  )
}

const s = StyleSheet.create({
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
  intro: { ...type.body, color: colors.textMuted },
  trial: { borderColor: colors.brand, borderWidth: 2, backgroundColor: colors.brandTint },
  trialHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  trialTitle: { ...type.emphasis, color: colors.brand, fontWeight: weight.bold },
  trialTxt: { ...type.caption, color: colors.textMuted, marginTop: space.xs },
  toggle: { flexDirection: 'row', gap: space.sm },
  toggleBtn: { flex: 1, paddingVertical: space.sm, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border, alignItems: 'center' },
  toggleOn: { borderColor: colors.brand, backgroundColor: colors.brandTint },
  toggleTxt: { ...type.caption, color: colors.textMuted, fontWeight: weight.medium },
  toggleTxtOn: { color: colors.brand, fontWeight: weight.bold },
  featured: { borderColor: colors.brand, borderWidth: 2 },
  featuredTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: colors.brand, paddingHorizontal: space.sm, paddingVertical: 3,
    borderRadius: radius.full, marginBottom: space.sm,
  },
  featuredTxt: { ...type.caption, color: colors.textOnDark, fontWeight: weight.bold, fontSize: 11 },
  planName: { ...type.section, color: colors.text },
  planDesc: { ...type.caption, color: colors.textLight, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs, marginTop: space.md },
  price: { ...type.display, color: colors.brand, fontWeight: weight.black },
  per: { ...type.caption, color: colors.textLight },
  wasRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md },
  was: { ...type.body, color: colors.textLight, textDecorationLine: 'line-through' },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tierTxt: { ...type.body, color: colors.text, flex: 1 },
  tierMore: { ...type.caption, color: colors.brand, fontWeight: weight.semibold, marginTop: space.xs, marginLeft: icon.md + space.sm },
  features: { gap: space.xs, marginTop: space.md },
  feature: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  featureTxt: { ...type.caption, color: colors.textMuted, flex: 1 },
  note: { ...type.caption, color: colors.textLight, textAlign: 'center', marginTop: space.md },
  subHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  subTitle: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  subMeta: { ...type.caption, color: colors.textLight, marginTop: 2 },
  subWarn: { ...type.caption, color: colors.danger, marginTop: space.sm },
  subCancel: { alignSelf: 'flex-start', marginTop: space.md },
})
