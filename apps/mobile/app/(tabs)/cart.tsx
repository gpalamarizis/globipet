import { useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image,
  RefreshControl, Alert,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Minus, Plus, Trash2, ShoppingCart, Package } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { useAuthStore } from '../../src/store/auth'
import { colors, space, radius, type, weight, shadow, icon, touch } from '@/theme'

/**
 * Καλάθι.
 *
 * ΤΑ ΜΕΤΑΦΟΡΙΚΑ
 *   Το σύνολο εδώ είναι το άθροισμα των προϊόντων. Το κόστος αποστολής
 *   προστίθεται στο checkout, όπου επιλέγεται η μέθοδος — και υπολογίζεται
 *   από τον server, όχι εδώ. Ένα «σύνολο» στο καλάθι που δεν το περιλαμβάνει
 *   πρέπει να λέει ότι δεν το περιλαμβάνει, αλλιώς ο πελάτης εκπλήσσεται
 *   στο τέλος.
 */
export default function CartScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const [refreshing, setRefreshing] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get('/cart').then(r => r.data),
    enabled: isAuthenticated,
  })

  const items = data?.data ?? []
  const subtotal = data?.total ?? 0
  const FREE_SHIPPING_OVER = 50

  const setQty = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      api.patch(`/cart/${id}`, { quantity }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
    onError: (e: any) => Alert.alert('Σφάλμα', e?.message || 'Δεν ενημερώθηκε'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/cart/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
    onError: (e: any) => Alert.alert('Σφάλμα', e?.message || 'Δεν αφαιρέθηκε'),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['cart'] })
    setRefreshing(false)
  }, [qc])

  if (!isAuthenticated) return (
    <View style={s.container}>
      <View style={s.header}><Text style={s.title}>Καλάθι</Text></View>
      <View style={s.empty}>
        <ShoppingCart size={icon.hero} color={colors.border} />
        <Text style={s.emptyTitle}>Συνδέσου για να δεις το καλάθι σου</Text>
        <TouchableOpacity style={s.primaryBtn} activeOpacity={0.85}
          onPress={() => router.push('/auth/login' as any)}>
          <Text style={s.primaryBtnText}>Σύνδεση</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Καλάθι</Text>
        {items.length > 0 && (
          <Text style={s.subtitle}>
            {items.length} {items.length === 1 ? 'προϊόν' : 'προϊόντα'}
          </Text>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: space.lg, paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }
        ListEmptyComponent={
          isLoading
            ? <View>{[0, 1].map(i => (
                <View key={i} style={s.card}>
                  <View style={[s.img, s.skeleton]} />
                  <View style={{ flex: 1, gap: space.sm }}>
                    <View style={[s.skeleton, { height: 14, width: '70%', borderRadius: radius.sm }]} />
                    <View style={[s.skeleton, { height: 14, width: '30%', borderRadius: radius.sm }]} />
                  </View>
                </View>
              ))}</View>
            : <View style={s.empty}>
                <ShoppingCart size={icon.hero} color={colors.border} />
                <Text style={s.emptyTitle}>Το καλάθι είναι άδειο</Text>
                <Text style={s.emptyText}>Βρες τροφές, παιχνίδια και ό,τι άλλο χρειάζεται.</Text>
                <TouchableOpacity style={s.primaryBtn} activeOpacity={0.85}
                  onPress={() => router.push('/(tabs)/marketplace' as any)}>
                  <Text style={s.primaryBtnText}>Στο κατάστημα</Text>
                </TouchableOpacity>
              </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <TouchableOpacity activeOpacity={0.8}
              onPress={() => router.push(`/products/${item.product_id}` as any)}>
              <View style={s.img}>
                {item.product_image
                  ? <Image source={{ uri: item.product_image }} style={s.imgSrc} />
                  : <Package size={icon.lg} color={colors.border} />}
              </View>
            </TouchableOpacity>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.name} numberOfLines={2}>{item.product_name}</Text>
              <Text style={s.price}>€{item.product_price}</Text>

              <View style={s.qtyRow}>
                {/* Στο 1, το μείον αφαιρεί — αλλιώς ο χρήστης πρέπει να
                    βρει το καλάθι σκουπιδιών για κάτι που ήδη προσπαθεί. */}
                <TouchableOpacity
                  style={s.qtyBtn} activeOpacity={0.7}
                  disabled={setQty.isPending || remove.isPending}
                  onPress={() => item.quantity <= 1
                    ? remove.mutate(item.id)
                    : setQty.mutate({ id: item.id, quantity: item.quantity - 1 })}>
                  {item.quantity <= 1
                    ? <Trash2 size={icon.sm} color={colors.danger} />
                    : <Minus size={icon.sm} color={colors.text} />}
                </TouchableOpacity>

                <Text style={s.qty}>{item.quantity}</Text>

                <TouchableOpacity
                  style={s.qtyBtn} activeOpacity={0.7}
                  disabled={setQty.isPending || item.quantity >= 99}
                  onPress={() => setQty.mutate({ id: item.id, quantity: item.quantity + 1 })}>
                  <Plus size={icon.sm} color={colors.text} />
                </TouchableOpacity>

                <Text style={s.lineTotal}>
                  €{(item.product_price * item.quantity).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        )}
      />

      {items.length > 0 && (
        <View style={s.footer}>
          <View style={s.totalRow}>
            <View>
              <Text style={s.totalLabel}>Σύνολο προϊόντων</Text>
              {/* Λέγεται ρητά, ώστε το ποσό στο checkout να μην ξαφνιάζει. */}
              <Text style={s.shippingNote}>
                {subtotal > FREE_SHIPPING_OVER
                  ? 'Δωρεάν αποστολή'
                  : 'Τα μεταφορικά υπολογίζονται στο επόμενο βήμα'}
              </Text>
            </View>
            <Text style={s.total}>€{subtotal.toFixed(2)}</Text>
          </View>

          <TouchableOpacity style={s.checkout} activeOpacity={0.85}
            onPress={() => router.push('/checkout' as any)}>
            <Text style={s.checkoutText}>Ολοκλήρωση αγοράς</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    backgroundColor: colors.navy,
    paddingTop: space.xxxl + space.lg,
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
  },
  title: { ...type.title, color: colors.textOnDark, fontWeight: weight.bold },
  subtitle: { ...type.body, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  card: {
    flexDirection: 'row', gap: space.md,
    backgroundColor: colors.surface,
    padding: space.md,
    borderRadius: radius.lg,
    marginBottom: space.md,
    ...shadow.sm,
  },
  img: {
    width: 80, height: 80, borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  imgSrc: { width: 80, height: 80 },

  name: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  price: { ...type.caption, color: colors.textMuted, marginTop: 2 },

  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  qtyBtn: {
    width: 34, height: 34, borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  qty: { ...type.body, color: colors.text, fontWeight: weight.bold, minWidth: 22, textAlign: 'center' },
  lineTotal: {
    ...type.body, color: colors.brand, fontWeight: weight.bold,
    marginLeft: 'auto',
  },

  skeleton: { backgroundColor: colors.surfaceAlt },

  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.surface,
    padding: space.lg,
    paddingBottom: space.xxxl,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    ...shadow.lg,
  },
  totalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: space.md,
  },
  totalLabel: { ...type.body, color: colors.textMuted },
  shippingNote: { ...type.caption, color: colors.textLight, marginTop: 2 },
  total: { ...type.title, color: colors.text, fontWeight: weight.bold },

  checkout: {
    height: touch.comfortable,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  checkoutText: { ...type.emphasis, color: '#fff', fontWeight: weight.bold },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: space.xl, gap: space.sm },
  emptyTitle: { ...type.emphasis, color: colors.text, fontWeight: weight.semibold, marginTop: space.md },
  emptyText: { ...type.body, color: colors.textMuted, textAlign: 'center' },
  primaryBtn: {
    height: touch.comfortable, paddingHorizontal: space.xxxl,
    borderRadius: radius.md, backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center', marginTop: space.lg,
  },
  primaryBtnText: { ...type.emphasis, color: '#fff', fontWeight: weight.bold },
})
