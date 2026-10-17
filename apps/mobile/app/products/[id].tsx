import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShoppingBag, Star, Heart, Minus, Plus } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { useAuthStore } from '../../src/store/auth'
import { Screen, Card, Badge, Button, EmptyState, SkeletonRows } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Λεπτομέρεια προϊόντος.
 *
 * Το κατάστημα έδειχνε λίστα αλλά το πάτημα δεν άνοιγε τίποτα: ο χρήστης
 * δεν μπορούσε να δει περιγραφή, απόθεμα ή κριτικές — ούτε να διαλέξει
 * ποσότητα. Ίδια λειτουργία με το web.
 */
export default function ProductDetailScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { isAuthenticated } = useAuthStore()
  const [qty, setQty] = useState(1)

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get(`/products/${id}`).then(r => r.data?.data ?? r.data),
    enabled: !!id,
  })

  const { data: reviews = [] } = useQuery({
    queryKey: ['product-reviews', id],
    queryFn: () => api.get(`/reviews?product_id=${id}`).then(r => r.data?.data ?? []),
    enabled: !!id,
  })

  const { data: wishlist = [] } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get('/wishlist').then(r => r.data?.data ?? r.data ?? []),
    enabled: isAuthenticated,
  })
  const wished = wishlist.some((w: any) => (w.product_id ?? w.id) === id)

  const addToCart = useMutation({
    mutationFn: () => api.post('/cart', { product_id: id, quantity: qty }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] })
      Alert.alert(t('marketplace.added'), product?.name ?? '')
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const toggleWish = useMutation({
    mutationFn: () => api.post('/wishlist', { product_id: id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wishlist'] }),
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  if (isLoading) return <Screen title={t('marketplace.title')} back><SkeletonRows count={3} /></Screen>
  if (!product) return (
    <Screen title={t('marketplace.title')} back>
      <EmptyState icon={ShoppingBag} title={t('marketplace.no_products')} />
    </Screen>
  )

  // Η τιμή έκπτωσης υπερισχύει, όπως και στο web.
  const price = product.sale_price ?? product.price
  const hasSale = product.sale_price != null && product.sale_price < product.price
  const outOfStock = (product.stock ?? 0) <= 0

  return (
    <Screen title={product.name} back scroll={false}>
      <ScrollView contentContainerStyle={s.body}>
        {!!product.image_url && (
          <Image source={{ uri: product.image_url }} style={s.image} resizeMode="cover" />
        )}

        <Card>
          <View style={s.titleRow}>
            <Text style={s.name}>{product.name}</Text>
            {isAuthenticated && (
              <TouchableOpacity onPress={() => toggleWish.mutate()} hitSlop={8}>
                <Heart size={icon.md} color={wished ? colors.danger : colors.textLight}
                  fill={wished ? colors.danger : 'transparent'} />
              </TouchableOpacity>
            )}
          </View>
          {!!product.brand && <Text style={s.brand}>{product.brand}</Text>}

          <View style={s.priceRow}>
            <Text style={s.price}>€{Number(price).toFixed(2)}</Text>
            {hasSale && <Text style={s.was}>€{Number(product.price).toFixed(2)}</Text>}
            {outOfStock
              ? <Badge label={t('marketplace.out_of_stock')} tone="danger" />
              : <Badge label={`${t('providerDash.stock')}: ${product.stock}`} tone="success" />}
          </View>

          {product.reviews_count > 0 && (
            <View style={s.ratingRow}>
              <Star size={icon.xs} color={colors.warning} fill={colors.warning} />
              <Text style={s.rating}>
                {Number(product.rating ?? 0).toFixed(1)} · {t('home.reviews_count', { count: product.reviews_count })}
              </Text>
            </View>
          )}

          {!!product.description && <Text style={s.desc}>{product.description}</Text>}
          {!!product.weight && <Text style={s.meta}>{product.weight}</Text>}
        </Card>

        {!outOfStock && (
          <Card>
            <View style={s.qtyRow}>
              <Text style={s.qtyLabel}>{t('productDetail.quantity')}</Text>
              <View style={s.stepper}>
                <TouchableOpacity accessibilityLabel={t('common.remove')}
                  disabled={qty <= 1} onPress={() => setQty(q => Math.max(1, q - 1))}
                  style={[s.stepBtn, qty <= 1 && s.stepOff]}>
                  <Minus size={16} color={colors.textMuted} />
                </TouchableOpacity>
                <Text style={s.qty}>{qty}</Text>
                <TouchableOpacity accessibilityLabel={t('common.add')}
                  disabled={qty >= (product.stock ?? 1)}
                  onPress={() => setQty(q => Math.min(product.stock ?? 1, q + 1))}
                  style={[s.stepBtn, qty >= (product.stock ?? 1) && s.stepOff]}>
                  <Plus size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={s.total}>{t('serviceDetail.total')}: €{(Number(price) * qty).toFixed(2)}</Text>
          </Card>
        )}

        {reviews.length > 0 && (
          <Card>
            <Text style={s.sectionTitle}>{t('productDetail.reviews')}</Text>
            {reviews.slice(0, 5).map((r: any) => (
              <View key={r.id} style={s.review}>
                <View style={s.reviewTop}>
                  <Text style={s.reviewName}>{r.user_name ?? r.user_email}</Text>
                  <View style={s.ratingRow}>
                    <Star size={12} color={colors.warning} fill={colors.warning} />
                    <Text style={s.rating}>{r.rating}</Text>
                  </View>
                </View>
                {!!r.comment && <Text style={s.reviewText}>{r.comment}</Text>}
              </View>
            ))}
          </Card>
        )}

        {!isAuthenticated ? (
          <Button label={t('auth.login')} onPress={() => router.push('/auth/login' as any)} full />
        ) : (
          <Button
            label={outOfStock ? t('marketplace.out_of_stock') : t('productDetail.addToCart')}
            icon={<ShoppingBag size={18} color={colors.textOnDark} />}
            disabled={outOfStock || addToCart.isPending}
            loading={addToCart.isPending}
            onPress={() => addToCart.mutate()} full />
        )}
      </ScrollView>
    </Screen>
  )
}

const s = StyleSheet.create({
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
  image: { width: '100%', height: 220, borderRadius: radius.xl, backgroundColor: colors.surfaceAlt },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  name: { ...type.section, color: colors.text, flex: 1 },
  brand: { ...type.caption, color: colors.textLight, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md, flexWrap: 'wrap' },
  price: { ...type.title, color: colors.brand, fontWeight: weight.black },
  was: { ...type.body, color: colors.textLight, textDecorationLine: 'line-through' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rating: { ...type.caption, color: colors.textMuted, fontWeight: weight.semibold },
  desc: { ...type.body, color: colors.textMuted, marginTop: space.md },
  meta: { ...type.caption, color: colors.textLight, marginTop: space.xs },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qtyLabel: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepBtn: { width: 34, height: 34, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepOff: { opacity: 0.35 },
  qty: { ...type.body, color: colors.text, fontWeight: weight.bold, minWidth: 24, textAlign: 'center' },
  total: { ...type.body, color: colors.text, fontWeight: weight.bold, marginTop: space.md, textAlign: 'right' },
  sectionTitle: { ...type.emphasis, color: colors.text, marginBottom: space.sm },
  review: { paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewName: { ...type.caption, color: colors.text, fontWeight: weight.semibold },
  reviewText: { ...type.caption, color: colors.textMuted, marginTop: 2 },
})
