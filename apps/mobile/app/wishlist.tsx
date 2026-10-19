import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, ShoppingBag } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, Card, Button, EmptyState, SkeletonRows } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'
import { effectivePrice } from '@/lib/price'

/**
 * Λίστα επιθυμιών.
 *
 * Η καρδιά στη λεπτομέρεια προϊόντος πρόσθετε εδώ — αλλά δεν υπήρχε οθόνη
 * να δει κανείς τι πρόσθεσε. Το endpoint /wishlist δέχεται POST για
 * προσθήκη και αφαίρεση (εναλλαγή), όπως και στο web.
 */
export default function WishlistScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const [refreshing, setRefreshing] = useState(false)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get('/wishlist').then(r => r.data?.data ?? r.data ?? []),
    enabled: isAuthenticated,
  })

  const remove = useMutation({
    // DELETE με το id της γραμμής: δεν εναλλάσσει όπως το POST, οπότε δεύτερο
    // πάτημα δεν ξαναπροσθέτει το προϊόν.
    mutationFn: (rowId: string) => api.delete(`/wishlist/${rowId}`),
    onSuccess: (_r, rowId) => {
      qc.setQueriesData({ queryKey: ['wishlist'] }, (old: any) =>
        Array.isArray(old) ? old.filter((w: any) => w.id !== rowId) : old)
      qc.invalidateQueries({ queryKey: ['wishlist'] })
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const addToCart = useMutation({
    mutationFn: (product_id: string) => api.post('/cart', { product_id, quantity: 1 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] })
      Alert.alert(t('marketplace.added'), '')
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await qc.invalidateQueries({ queryKey: ['wishlist'] }); setRefreshing(false)
  }, [qc])

  if (!isAuthenticated) return (
    <Screen title={t('wishlist.title')} back>
      <EmptyState icon={Heart} title={t('wishlist.loginPrompt')}
        action={<Button label={t('auth.login')} onPress={() => router.push('/auth/login' as any)} />} />
    </Screen>
  )

  return (
    // Πλήθος αποθηκευμένων, όπως στην κεφαλίδα του web.
    <Screen title={t('wishlist.title')} back onRefresh={onRefresh} refreshing={refreshing}
      subtitle={isLoading ? undefined : t('wishlist.savedCount', { count: items.length })}>
      {isLoading ? <SkeletonRows count={3} /> :
       items.length === 0 ? (
        <EmptyState icon={Heart} title={t('wishlist.empty')} message={t('wishlist.emptyHint')}
          action={<Button label={t('cart.go_to_shop')} onPress={() => router.push('/(tabs)/marketplace' as any)} />} />
      ) : items.map((w: any) => {
        const p = w.product ?? w
        const id = w.product_id ?? p.id
        // Η γραμμή wishlist έχει product_name / product_price / product_image
        // (schema.prisma)· name / price / image_url δεν υπάρχουν σε αυτήν.
        const name = w.product_name ?? p.name
        const image = w.product_image ?? p.image_url
        const price = w.product_price ?? effectivePrice(p)
        return (
          <Card key={id} onPress={() => router.push(`/products/${id}` as any)}>
            <View style={s.row}>
              {image
                ? <Image source={{ uri: image }} style={s.thumb} />
                : <View style={[s.thumb, s.thumbEmpty]}><ShoppingBag size={icon.md} color={colors.textLight} /></View>}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.name} numberOfLines={2}>{name}</Text>
                <Text style={s.price}>€{Number(price ?? 0).toFixed(2)}</Text>
              </View>
              <View style={s.actions}>
                <TouchableOpacity onPress={() => remove.mutate(w.id)} disabled={remove.isPending} hitSlop={8} style={s.iconBtn}>
                  <Heart size={icon.sm} color={colors.danger} fill={colors.danger} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => addToCart.mutate(id)} disabled={addToCart.isPending} hitSlop={8} style={s.iconBtn}>
                  <ShoppingBag size={icon.sm} color={colors.brand} />
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        )
      })}
    </Screen>
  )
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  thumb: { width: 60, height: 60, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  name: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  price: { ...type.body, color: colors.brand, fontWeight: weight.bold, marginTop: 2 },
  actions: { gap: space.sm },
  iconBtn: { width: 36, height: 36, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
})
