import { useState, useMemo } from 'react'
import { View, Text, StyleSheet, Alert, Linking, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, Truck, CreditCard, Check } from 'lucide-react-native'
import { api } from '../src/lib/api'
import { useAuthStore } from '../src/store/auth'
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
  { id: 'boxnow', label: 'BOX NOW', sub: 'Θυρίδα, 1-2 εργάσιμες', price: 2.50 },
  { id: 'acs',    label: 'ACS',     sub: 'Στο σπίτι, 1-3 εργάσιμες', price: 3.99 },
  { id: 'elta',   label: 'ΕΛΤΑ',    sub: 'Στο σπίτι, 3-5 εργάσιμες', price: 4.50 },
]
const FREE_OVER = 50

export default function CheckoutScreen() {
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
  const subtotal = cart?.total ?? 0

  const shipping = useMemo(
    () => subtotal > FREE_OVER ? 0 : (SHIPPING.find(m => m.id === method)?.price ?? 0),
    [subtotal, method],
  )
  const total = subtotal + shipping

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
      if (!orderId) throw new Error('Δεν δημιουργήθηκε παραγγελία')

      // 2. Η σελίδα πληρωμής χρεώνει το αποθηκευμένο σύνολο, όχι ποσό από εδώ.
      const { data: pay } = await api.post('/orders/viva/checkout', { order_id: orderId })
      return { orderId, url: pay?.checkoutUrl }
    },
    onSuccess: async ({ url }) => {
      qc.invalidateQueries({ queryKey: ['cart'] })
      qc.invalidateQueries({ queryKey: ['my-orders'] })
      if (!url) {
        Alert.alert('Σφάλμα', 'Δεν δημιουργήθηκε σελίδα πληρωμής. Δες τις παραγγελίες σου.')
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
        Alert.alert('Σφάλμα', 'Δεν ήταν δυνατό το άνοιγμα της σελίδας πληρωμής.')
      }
    },
    onError: (e: any) => Alert.alert('Σφάλμα', e?.message || 'Η παραγγελία δεν ολοκληρώθηκε'),
  })

  const ready = addr.full_name.trim() && addr.phone.trim()
    && addr.street.trim() && addr.city.trim() && addr.postal_code.trim()

  if (!isAuthenticated) return (
    <Screen title="Ολοκλήρωση">
      <EmptyState icon={CreditCard} title="Συνδέσου για να ολοκληρώσεις"
        action={<Button label="Σύνδεση" onPress={() => router.push('/auth/login' as any)} />} />
    </Screen>
  )

  if (isLoading) return <Screen title="Ολοκλήρωση"><Loading label="Φόρτωση καλαθιού…" /></Screen>

  if (items.length === 0) return (
    <Screen title="Ολοκλήρωση">
      <EmptyState icon={Package} title="Το καλάθι είναι άδειο"
        action={<Button label="Στο κατάστημα"
          onPress={() => router.replace('/(tabs)/marketplace' as any)} />} />
    </Screen>
  )

  return (
    <Screen title="Ολοκλήρωση" subtitle={`${items.length} προϊόντα`}>

      <SectionHeader title="Παράδοση" />
      <Input label="Ονοματεπώνυμο" value={addr.full_name}
        onChangeText={v => setAddr(a => ({ ...a, full_name: v }))} />
      <Input label="Τηλέφωνο" value={addr.phone} keyboardType="phone-pad"
        onChangeText={v => setAddr(a => ({ ...a, phone: v }))} />
      <Input label="Διεύθυνση" value={addr.street}
        onChangeText={v => setAddr(a => ({ ...a, street: v }))}
        placeholder="Οδός και αριθμός" />
      <Input label="Πόλη" value={addr.city}
        onChangeText={v => setAddr(a => ({ ...a, city: v }))} />
      <Input label="Ταχυδρομικός κώδικας" value={addr.postal_code} keyboardType="number-pad"
        onChangeText={v => setAddr(a => ({ ...a, postal_code: v }))} />
      <Input label="Σχόλια" value={addr.notes} multiline
        onChangeText={v => setAddr(a => ({ ...a, notes: v }))}
        placeholder="Προαιρετικό — όροφος, κουδούνι, ώρες" />

      <SectionHeader title="Τρόπος αποστολής" />
      <View style={{ gap: space.sm, marginBottom: space.lg }}>
        {SHIPPING.map(m => {
          const active = method === m.id
          const free = subtotal > FREE_OVER
          return (
            <TouchableOpacity key={m.id} activeOpacity={0.7} onPress={() => setMethod(m.id)}>
              <Card style={active ? s.active : undefined}>
                <View style={s.shipRow}>
                  <Truck size={icon.md} color={active ? colors.brand : colors.textLight} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[s.shipLabel, active && s.shipLabelActive]}>{m.label}</Text>
                    <Text style={s.shipSub}>{m.sub}</Text>
                  </View>
                  <Text style={[s.shipPrice, free && s.free]}>
                    {free ? 'Δωρεάν' : `€${m.price.toFixed(2)}`}
                  </Text>
                  {active && <Check size={icon.sm} color={colors.brand} />}
                </View>
              </Card>
            </TouchableOpacity>
          )
        })}
      </View>

      <SectionHeader title="Σύνοψη" />
      <Card>
        <View style={s.line}>
          <Text style={s.lineLabel}>Προϊόντα</Text>
          <Text style={s.lineValue}>€{subtotal.toFixed(2)}</Text>
        </View>
        <View style={s.line}>
          <Text style={s.lineLabel}>Μεταφορικά</Text>
          <Text style={[s.lineValue, shipping === 0 && s.free]}>
            {shipping === 0 ? 'Δωρεάν' : `€${shipping.toFixed(2)}`}
          </Text>
        </View>
        {subtotal <= FREE_OVER && (
          // Λέγεται πριν την πληρωμή, όχι μετά — τότε δεν βοηθά κανέναν.
          <Text style={s.hint}>
            Δωρεάν αποστολή για παραγγελίες άνω των €{FREE_OVER}
          </Text>
        )}
        <View style={[s.line, s.totalLine]}>
          <Text style={s.totalLabel}>Σύνολο</Text>
          <Text style={s.total}>€{total.toFixed(2)}</Text>
        </View>
      </Card>

      <Text style={s.note}>
        Θα μεταφερθείς στη σελίδα πληρωμής του Viva. Η παραγγελία
        επιβεβαιώνεται μόλις ολοκληρωθεί η χρέωση.
      </Text>

      <Button
        label={complete.isPending ? 'Δημιουργία παραγγελίας…' : `Πληρωμή €${total.toFixed(2)}`}
        full
        loading={complete.isPending}
        disabled={!ready}
        icon={<CreditCard size={icon.sm} color={colors.textOnDark} />}
        onPress={() => complete.mutate()}
        style={{ marginTop: space.lg }}
      />
      {!ready && (
        <Text style={s.missing}>Συμπλήρωσε τα στοιχεία παράδοσης για να συνεχίσεις</Text>
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
