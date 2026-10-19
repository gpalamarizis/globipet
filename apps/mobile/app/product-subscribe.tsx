import { View, Text, StyleSheet, ScrollView, Image, Alert, Linking } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { RotateCcw, Truck, ShieldCheck, ShoppingBag } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, Card, Badge, Button, EmptyState, SkeletonRows } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'
import { effectivePrice } from '@/lib/price'

/**
 * Μηνιαία συνδρομή τροφής.
 *
 * ΤΙ ΚΑΝΕΙ Ο SERVER (subscriptions.ts, webhooks.ts)
 *   Χρέωση κάρτας κάθε μήνα, μία παράδοση τον μήνα, 12 παραδόσεις και μετά
 *   η συνδρομή λήγει μόνη της. Τιμή = τιμή έκπτωσης αν ισχύει, αλλιώς
 *   product.price (lib/price.ts), μείον την έκπτωση των ρυθμίσεων. Η τιμή
 *   κλειδώνει στην έναρξη. Παύση ή αλλαγή δεν υπάρχει — μόνο ακύρωση.
 *   Η οθόνη έλεγε «παγώνεις όποτε θες» και «πληρωμή μέσω Viva»· τίποτα από
 *   τα δύο δεν ισχύει, και δεν ανέφερε ότι η διάρκεια είναι 12 μήνες.
 *
 * Η έκπτωση δεν είναι σταθερή στον κώδικα: έρχεται από τις ρυθμίσεις, ώστε
 * να αλλάζει χωρίς νέα έκδοση της εφαρμογής.
 *
 * Το σφάλμα του server εμφανίζεται αυτούσιο: το «έχεις ήδη ενεργή συνδρομή
 * για αυτό το προϊόν» είναι χρήσιμη πληροφορία, όχι γενικό «κάτι πήγε
 * στραβά».
 */
export default function ProductSubscribeScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { isAuthenticated } = useAuthStore()

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get(`/products/${id}`).then(r => r.data?.data ?? r.data),
    enabled: !!id,
  })

  const { data: discountData } = useQuery({
    queryKey: ['food-subscription-discount'],
    queryFn: () => api.get('/settings/food-subscription-discount').then(r => r.data?.data ?? r.data),
  })

  const checkout = useMutation({
    mutationFn: () => api.post(`/subscriptions/food/${id}/checkout`, {}),
    onSuccess: async (r: any) => {
      const url = r?.data?.data?.checkout_url ?? r?.data?.checkout_url
      if (!url) return Alert.alert(t('common.error'), t('checkout.err_no_page'))
      const ok = await Linking.canOpenURL(url)
      if (ok) Linking.openURL(url)
      else Alert.alert(t('common.error'), t('checkout.err_open_page'))
    },
    // Ο interceptor του api (src/lib/api.ts) απορρίπτει με το ίδιο το σφάλμα
    // του axios: το μήνυμα του server είναι στο response.data, ενώ το
    // e.message είναι το τεχνικό «Request failed with status code…».
    onError: (e: any) =>
      Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  if (isLoading) return <Screen title={t('subscribe.title')} back><SkeletonRows count={3} /></Screen>
  if (!product) return (
    <Screen title={t('subscribe.title')} back>
      <EmptyState icon={ShoppingBag} title={t('marketplace.no_products')} />
    </Screen>
  )

  // Ίδιο με το web: χωρίς is_subscribable ο server απαντά 400.
  if (!product.is_subscribable) return (
    <Screen title={t('subscribe.title')} back>
      <EmptyState icon={ShoppingBag} title={t('subscribe.notSubscribable')} />
    </Screen>
  )

  const pct = Number(discountData?.discount_percent ?? discountData?.percent ?? 0)
  // Ο server χρεώνει με βάση την τιμή έκπτωσης (αν ισχύει), όπως το web.
  const base = effectivePrice(product)
  // Στρογγυλοποίηση σε λεπτά όπως ο server (routes/subscriptions.ts), ώστε
  // το ποσό που βλέπει να είναι αυτό που χρεώνεται.
  const monthly = Math.round(base * (1 - pct / 100) * 100) / 100
  const saving = base - monthly

  const BENEFITS = [
    { Icon: Truck,       key: 'subscribe.benefitDelivery12' },
    { Icon: ShieldCheck, key: 'subscribe.benefitSecure' },
    { Icon: RotateCcw,   key: 'subscribe.benefitCancelWhere' },
  ]

  return (
    <Screen title={t('subscribe.title')} back scroll={false}>
      <ScrollView contentContainerStyle={s.body}>
        <Card>
          <View style={s.row}>
            {product.image_url
              ? <Image source={{ uri: product.image_url }} style={s.thumb} />
              : <View style={[s.thumb, s.thumbEmpty]}><ShoppingBag size={icon.md} color={colors.textLight} /></View>}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.name} numberOfLines={2}>{product.name}</Text>
              {!!product.brand && <Text style={s.meta}>{product.brand}</Text>}
              <Text style={s.meta}>{t('subscribe.duration')}</Text>
            </View>
          </View>
        </Card>

        <Card>
          <Text style={s.sectionTitle}>{t('subscribe.monthlyPrice')}</Text>
          <View style={s.priceRow}>
            <Text style={s.price}>€{monthly.toFixed(2)}</Text>
            {pct > 0 && <Text style={s.was}>€{base.toFixed(2)}</Text>}
            {pct > 0 && <Badge label={`−${pct}%`} tone="success" />}
          </View>
          {saving > 0 && (
            <Text style={s.saving}>{t('subscribe.youSave', { amount: saving.toFixed(2) })}</Text>
          )}
        </Card>

        <Card>
          {BENEFITS.map(({ Icon, key }) => (
            <View key={key} style={s.benefit}>
              <View style={s.benefitIcon}><Icon size={icon.sm} color={colors.brand} /></View>
              <Text style={s.benefitTxt}>{t(key)}</Text>
            </View>
          ))}
        </Card>

        {!isAuthenticated ? (
          <Button label={t('auth.login')} onPress={() => router.push('/auth/login' as any)} full />
        ) : (
          <Button
            label={t('subscribe.start')}
            loading={checkout.isPending}
            disabled={checkout.isPending}
            onPress={() => checkout.mutate()} full />
        )}

        <Text style={s.note}>{t('subscribe.paymentNote')}</Text>
      </ScrollView>
    </Screen>
  )
}

const s = StyleSheet.create({
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  thumb: { width: 64, height: 64, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  name: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  meta: { ...type.caption, color: colors.textLight },
  sectionTitle: { ...type.caption, color: colors.textMuted, fontWeight: weight.semibold },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs, flexWrap: 'wrap' },
  price: { ...type.display, color: colors.brand, fontWeight: weight.black },
  was: { ...type.body, color: colors.textLight, textDecorationLine: 'line-through' },
  saving: { ...type.caption, color: colors.success, fontWeight: weight.semibold, marginTop: space.xs },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  benefitIcon: { width: 34, height: 34, borderRadius: radius.md, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' },
  benefitTxt: { ...type.caption, color: colors.textMuted, flex: 1 },
  note: { ...type.caption, color: colors.textLight, textAlign: 'center' },
})
