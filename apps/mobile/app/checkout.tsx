import { useState, useMemo } from 'react'
import { View, Text, StyleSheet, Alert, Linking, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, Truck, CreditCard, Check, Tag } from 'lucide-react-native'
import { api } from '../src/lib/api'
import { useAuthStore } from '../src/store/auth'
import { FREE_SHIPPING_OVER as FREE_OVER } from '../src/lib/shipping'
import { Screen, Card, Button, EmptyState, Loading, Input, SectionHeader } from '@/components/ui'
import { colors, space, radius, type, weight, icon, touch } from '@/theme'

/**
 * Ολοκλήρωση αγοράς.
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ
 *   Το κινητό είχε καλάθι και κουμπί «Ολοκλήρωση αγοράς» που έδειχνε σε
 *   /checkout — διαδρομή που δεν υπήρχε. Ο χρήστης γέμιζε καλάθι και δεν
 *   μπορούσε να αγοράσει. Η μόνη διαδρομή αγοράς ήταν το web.
 *
 * ΠΟΙΟΣ ΥΠΟΛΟΓΙΖΕΙ ΤΙ
 *   Τίποτα εδώ δεν είναι δεσμευτικό. Ο server διαβάζει τιμές από τον
 *   πίνακα προϊόντων, υπολογίζει μόνος του τα μεταφορικά, και χρεώνει το
 *   δικό του σύνολο. Τα ποσά αυτής της οθόνης είναι προεπισκόπηση για τον
 *   χρήστη — γι' αυτό οι σταθερές παρακάτω πρέπει να μένουν συγχρονισμένες
 *   με το SHIPPING_METHODS του orders.ts, αλλιώς η προεπισκόπηση λέει άλλα
 *   από τη χρέωση.
 */

const SHIPPING = [
  { id: 'boxnow', label: 'BOX NOW', subKey: 'checkout.locker', price: 2.50 },
  { id: 'acs',    label: 'ACS',     subKey: 'checkout.home_1_3', price: 3.99 },
  { id: 'elta',   labelKey: 'checkout.elta',    subKey: 'checkout.home_3_5', price: 4.50 },
]

export default function CheckoutScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { user, isAuthenticated } = useAuthStore()

  const [method, setMethod] = useState('boxnow')
  const [addr, setAddr] = useState({
    full_name: user?.full_name || '',
    phone: (user as any)?.phone || '',
    street: '',
    city: '',
    postal_code: '',
    notes: '',
  })

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get('/cart').then(r => r.data),
    enabled: isAuthenticated,
  })

  const items = cart?.data ?? []
  const listSubtotal = cart?.total ?? 0

  // Έκπτωση καμπάνιας — ίδιος υπολογισμός με αυτόν που θα χρεώσει ο server.
  const quoteItems = items.map((i: any) => ({ type: 'product', id: i.product_id, qty: i.quantity }))
  const { data: quote } = useQuery({
    queryKey: ['quote-cart', quoteItems],
    queryFn: () => api.post('/campaigns/quote', { items: quoteItems }).then(r => r.data?.data),
    enabled: isAuthenticated && quoteItems.length > 0,
  })
  const subtotal = quote ? Number(quote.subtotal) : listSubtotal
  const discount = quote ? Number(quote.discount) : 0
  const afterDiscount = Math.round((subtotal - discount) * 100) / 100
  const discountLines = useMemo(() => {
    const rows: { title: string; amount: number }[] = []
    for (const it of quote?.items ?? []) {
      if (!it.campaign || !(it.discount > 0)) continue
      const row = rows.find(r => r.title === it.campaign.title)
      if (row) row.amount += it.discount
      else rows.push({ title: it.campaign.title, amount: it.discount })
    }
    return rows
  }, [quote])

  // Δωρεάν μεταφορικά όταν το ποσό ΜΕΤΑ την έκπτωση ξεπερνά το όριο —
  // όπως τα υπολογίζει ο server.
  const shipping = useMemo(
    () => afterDiscount > FREE_OVER ? 0 : (SHIPPING.find(m => m.id === method)?.price ?? 0),
    [afterDiscount, method],
  )
  const total = afterDiscount + shipping

  const complete = useMutation({
    mutationFn: async () => {
      // 1. Η παραγγελία δημιουργείται με τα είδη του καλαθιού. Ο server
      //    αγνοεί τις τιμές που στέλνουμε και διαβάζει τις δικές του.
      const { data: created } = await api.post('/orders', {
        items: items.map((i: any) => ({ product_id: i.product_id, quantity: i.quantity })),
        shipping_address: { ...addr, shipping_method: method },
        payment_method: 'viva',
      })
      const orderId = created?.data?.id ?? created?.id
      if (!orderId) throw new Error(t('checkout.err_no_order'))

      // 2. Η σελίδα πληρωμής χρεώνει το αποθηκευμένο σύνολο, όχι ποσό από εδώ.
      const { data: pay } = await api.post('/orders/viva/checkout', { order_id: orderId })
      return { orderId, url: pay?.checkoutUrl }
    },
    onSuccess: async ({ url }) => {
      qc.invalidateQueries({ queryKey: ['cart'] })
      qc.invalidateQueries({ queryKey: ['my-orders'] })
      if (!url) {
        Alert.alert(t('common.error'), t('checkout.err_no_page'))
        router.replace('/orders' as any)
        return
      }
      const ok = await Linking.canOpenURL(url)
      if (ok) {
        Linking.openURL(url)
        // Επιστροφή στις παραγγελίες, ώστε γυρίζοντας από το Viva να δει
        // την κατάστασή της αντί για άδειο καλάθι.
        router.replace('/orders' as any)
      } else {
        Alert.alert(t('common.error'), t('checkout.err_open_page'))
      }
    },
    // Μήνυμα του server πρώτα (π.χ. «Κάποια προϊόντα δεν είναι πλέον
    // διαθέσιμα»), όπως στο web· το e.message του axios είναι τεχνικό.
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || e?.message || t('checkout.err_order')),
  })

  const ready = addr.full_name.trim() && addr.phone.trim()
    && addr.street.trim() && addr.city.trim() && addr.postal_code.trim()

  if (!isAuthenticated) return (
    <Screen title={t('checkout.title')}>
      <EmptyState icon={CreditCard} title={t('checkout.login_prompt')}
        action={<Button label={t('auth.sign_in')} onPress={() => router.push('/auth/login' as any)} />} />
    </Screen>
  )

  if (isLoading) return <Screen title={t('checkout.title')}><Loading label={t('checkout.loading_cart')} /></Screen>

  if (items.length === 0) return (
    <Screen title={t('checkout.title')}>
      <EmptyState icon={Package} title={t('cart.empty')}
        action={<Button label={t('cart.go_to_shop')}
          onPress={() => router.replace('/(tabs)/marketplace' as any)} />} />
    </Screen>
  )

  return (
    <Screen title={t('checkout.title')} subtitle={t('checkout.item_count', { count: items.length })}>

      <SectionHeader title={t('checkout.delivery')} />
      <Input label={t('auth.full_name')} value={addr.full_name}
        onChangeText={v => setAddr(a => ({ ...a, full_name: v }))} />
      <Input label={t('common.phone')} value={addr.phone} keyboardType="phone-pad"
        onChangeText={v => setAddr(a => ({ ...a, phone: v }))} />
      <Input label={t('checkout.address')} value={addr.street}
        onChangeText={v => setAddr(a => ({ ...a, street: v }))}
        placeholder={t('checkout.street')} />
      <Input label={t('common.city')} value={addr.city}
        onChangeText={v => setAddr(a => ({ ...a, city: v }))} />
      <Input label={t('checkout.postcode')} value={addr.postal_code} keyboardType="number-pad"
        onChangeText={v => setAddr(a => ({ ...a, postal_code: v }))} />
      <Input label={t('checkout.notes')} value={addr.notes} multiline
        onChangeText={v => setAddr(a => ({ ...a, notes: v }))}
        placeholder={t('checkout.notes_hint')} />

      <SectionHeader title={t('checkout.shipping_method')} />
      <View style={{ gap: space.sm, marginBottom: space.lg }}>
        {SHIPPING.map(m => {
          const active = method === m.id
          const free = afterDiscount > FREE_OVER
          return (
            <TouchableOpacity key={m.id} activeOpacity={0.7} onPress={() => setMethod(m.id)}>
              <Card style={active ? s.active : undefined}>
                <View style={s.shipRow}>
                  <Truck size={icon.md} color={active ? colors.brand : colors.textLight} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[s.shipLabel, active && s.shipLabelActive]}>{m.label ?? t(m.labelKey ?? '')}</Text>
                    <Text style={s.shipSub}>{t(m.subKey)}</Text>
                  </View>
                  <Text style={[s.shipPrice, free && s.free]}>
                    {free ? t('discover.free') : `€${m.price.toFixed(2)}`}
                  </Text>
                  {active && <Check size={icon.sm} color={colors.brand} />}
                </View>
              </Card>
            </TouchableOpacity>
          )
        })}
      </View>

      <SectionHeader title={t('checkout.summary')} />
      <Card>
        {/* Τα είδη της παραγγελίας, όπως στη σύνοψη του web. Το ποσό κάθε
            γραμμής από το quote (ίδια σειρά με τα items που στείλαμε, τιμές
            της βάσης), ώστε οι γραμμές να αθροίζουν στο «Προϊόντα» από πάνω·
            αν δεν έχει έρθει ακόμη, η τιμή του καλαθιού. */}
        {items.map((i: any, idx: number) => {
          const q = quote?.items?.[idx]
          const line = q && q.id === i.product_id ? Number(q.line) : Number(i.product_price ?? 0) * i.quantity
          return (
            <View key={i.id} style={[s.line, s.itemLine]}>
              <Text style={s.itemName} numberOfLines={1}>{i.product_name}</Text>
              <Text style={s.itemQty}>×{i.quantity}</Text>
              <Text style={s.lineValue}>€{line.toFixed(2)}</Text>
            </View>
          )
        })}
        <View style={s.line}>
          <Text style={s.lineLabel}>{t('checkout.products')}</Text>
          <Text style={s.lineValue}>€{subtotal.toFixed(2)}</Text>
        </View>
        {discountLines.map(d => (
          <View key={d.title} style={[s.line, s.lineTop]}>
            <View style={s.discLabel}>
              <View style={s.discIcon}><Tag size={13} color={colors.success} /></View>
              <Text style={s.discText} numberOfLines={2}>{t('campaignDiscount.line', { title: d.title })}</Text>
            </View>
            <Text style={s.discValue}>−€{d.amount.toFixed(2)}</Text>
          </View>
        ))}
        <View style={s.line}>
          <Text style={s.lineLabel}>{t('checkout.shipping')}</Text>
          <Text style={[s.lineValue, shipping === 0 && s.free]}>
            {shipping === 0 ? t('discover.free') : `€${shipping.toFixed(2)}`}
          </Text>
        </View>
        {afterDiscount <= FREE_OVER && (
          // Λέγεται πριν την πληρωμή, όχι μετά — τότε δεν βοηθά κανέναν.
          <Text style={s.hint}>
            {t('checkout.free_over', { amount: FREE_OVER })}
          </Text>
        )}
        <View style={[s.line, s.totalLine]}>
          <Text style={s.totalLabel}>{t('common.total')}</Text>
          <Text style={s.total}>€{total.toFixed(2)}</Text>
        </View>
      </Card>

      <Text style={s.note}>
        {t('checkout.viva_note')}
      </Text>

      <Button
        label={complete.isPending ? t('checkout.creating_order') : t('checkout.pay_amount', { amount: total.toFixed(2) })}
        full
        loading={complete.isPending}
        disabled={!ready}
        icon={<CreditCard size={icon.sm} color={colors.textOnDark} />}
        onPress={() => complete.mutate()}
        style={{ marginTop: space.lg }}
      />
      {!ready && (
        <Text style={s.missing}>{t('checkout.fill_delivery')}</Text>
      )}
    </Screen>
  )
}

const s = StyleSheet.create({
  active: { borderColor: colors.brand, backgroundColor: colors.brandLight },
  shipRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  shipLabel: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  shipLabelActive: { color: colors.brand, fontWeight: weight.bold },
  shipSub: { ...type.caption, color: colors.textMuted, marginTop: 1 },
  shipPrice: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  free: { color: colors.success },

  line: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: space.sm,
  },
  lineLabel: { ...type.body, color: colors.textMuted },
  lineValue: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  lineTop: { alignItems: 'flex-start' },
  itemLine: { gap: space.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  itemName: { ...type.body, color: colors.text, flex: 1, minWidth: 0 },
  itemQty: { ...type.caption, color: colors.textMuted },
  discLabel: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs, flex: 1, minWidth: 0, marginRight: space.md },
  discIcon: { marginTop: 4 },
  discText: { ...type.body, color: '#047857', flexShrink: 1 },
  discValue: { ...type.body, color: '#047857', fontWeight: weight.semibold },
  hint: { ...type.caption, color: colors.textLight, paddingBottom: space.sm },
  totalLine: {
    marginTop: space.sm, paddingTop: space.md,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  totalLabel: { ...type.emphasis, color: colors.text, fontWeight: weight.semibold },
  total: { ...type.title, color: colors.brand, fontWeight: weight.bold },

  note: { ...type.caption, color: colors.textLight, marginTop: space.lg, lineHeight: 18 },
  missing: { ...type.caption, color: colors.textLight, textAlign: 'center', marginTop: space.sm },
})
