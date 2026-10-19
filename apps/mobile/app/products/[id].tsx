import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, Modal, Share, Platform } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShoppingBag, Star, Heart, Minus, Plus, Truck, ShieldCheck, RotateCcw, Share2 } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { FREE_SHIPPING_OVER, SHIPPING_PRICES } from '../../src/lib/shipping'
import { useAuthStore } from '../../src/store/auth'
import { Screen, Card, Badge, Button, EmptyState, SkeletonRows, Input } from '@/components/ui'
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

  // Κριτική: ο server λέει αν ο χρήστης δικαιούται — αγόρασε και δεν έχει
  // ήδη αξιολογήσει. Χωρίς αυτό θα δείχναμε κουμπί που απορρίπτεται.
  const { data: canReview } = useQuery({
    queryKey: ['can-review', id],
    queryFn: () => api.get(`/reviews/can-review?product_id=${id}`).then(r => r.data?.data ?? r.data),
    enabled: isAuthenticated && !!id,
  })

  const [reviewing, setReviewing] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  const submitReview = useMutation({
    mutationFn: () => api.post('/reviews', {
      product_id: id, rating, comment: comment.trim() || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-reviews', id] })
      qc.invalidateQueries({ queryKey: ['can-review', id] })
      // Ο server ξαναϋπολογίζει βαθμολογία και πλήθος κριτικών του προϊόντος.
      qc.invalidateQueries({ queryKey: ['product', id] })
      setReviewing(false); setComment(''); setRating(5)
      Alert.alert(t('reviews.thanks'), t('reviews.thanksHint'))
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const toggleWish = useMutation({
    // action: ο server κάνει ό,τι ζητήθηκε, οπότε δεύτερο ίδιο αίτημα δεν αναιρεί το πρώτο.
    mutationFn: () => api.post('/wishlist', { product_id: id, action: wished ? 'remove' : 'add' }),
    onSuccess: (r: any) => {
      // Η καρδιά δείχνει αμέσως το αποτέλεσμα του server.
      qc.setQueriesData({ queryKey: ['wishlist'] }, (old: any) => {
        if (!Array.isArray(old)) return old
        const rest = old.filter((w: any) => (w.product_id ?? w.id) !== id)
        return r?.data?.added && r.data.data ? [r.data.data, ...rest] : rest
      })
      qc.invalidateQueries({ queryKey: ['wishlist'] })
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  // Κοινοποίηση με το σύστημα — ίδιος σύνδεσμος με το web (/marketplace/:id).
  const shareProduct = () => {
    const url = `https://globipet.com/marketplace/${id}`
    const text = String(product?.name ?? '')
    // iOS: το url πάει ξεχωριστά· Android: αγνοεί το url, οπότε μπαίνει στο μήνυμα.
    Share.share(Platform.OS === 'ios' ? { message: text, url } : { message: `${text}\n${url}` }).catch(() => {})
  }

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
              <TouchableOpacity onPress={() => toggleWish.mutate()} disabled={toggleWish.isPending} hitSlop={8}>
                <Heart size={icon.md} color={wished ? colors.danger : colors.textLight}
                  fill={wished ? colors.danger : 'transparent'} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={shareProduct} hitSlop={8} accessibilityLabel={t('social.share')}>
              <Share2 size={icon.md} color={colors.textLight} />
            </TouchableOpacity>
          </View>
          {!!product.brand && <Text style={s.brand}>{product.brand}</Text>}
          {/* Σήμα «Προτεινόμενο», όπως στο web. */}
          {!!product.is_featured && (
            <View style={s.badgeRow}><Badge label={`⭐ ${t('marketplace.featured')}`} tone="brand" /></View>
          )}

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
          {/* Το Product δεν έχει πεδίο βάρους. Στη θέση του δείχνουμε την
              κατηγορία, που υπάρχει πάντα και βοηθά τον αγοραστή. */}
          {!!product.category && (
            <Text style={s.meta}>
              {t(`marketplace.categories.${product.category}`, { defaultValue: product.category })}
            </Text>
          )}
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

        {/* Ίδιες πληροφορίες με την καρτέλα «Αποστολή & επιστροφές» του web. */}
        <Card>
          <Text style={s.sectionTitle}>{t('productInfo.title')}</Text>
          <View style={s.infoRow}>
            <Truck size={icon.sm} color={colors.brand} />
            <View style={s.infoText}>
              <Text style={s.infoTitle}>{t('productInfo.freeShipping', { amount: FREE_SHIPPING_OVER })}</Text>
              {SHIPPING_PRICES.map(m => (
                <Text key={m.id} style={s.infoDesc}>{t(m.labelKey)}: €{m.price.toFixed(2)}</Text>
              ))}
            </View>
          </View>
          <View style={s.infoRow}>
            <ShieldCheck size={icon.sm} color={colors.brand} />
            <View style={s.infoText}><Text style={s.infoTitle}>{t('productInfo.securePayment')}</Text></View>
          </View>
          <View style={s.infoRow}>
            <RotateCcw size={icon.sm} color={colors.brand} />
            <View style={s.infoText}>
              <Text style={s.infoTitle}>{t('productInfo.withdrawal14')}</Text>
              <Text style={s.infoDesc}>{t('productInfo.withdrawalText')}</Text>
            </View>
          </View>
        </Card>

        {/* Κριτικές — όπως η καρτέλα του web: όλες οι κριτικές, η απάντηση του
            πωλητή, μήνυμα όταν δεν υπάρχουν, και εξήγηση γιατί δεν μπορεί να
            γράψει όποιος δεν το αγόρασε. Το όνομα είναι στη στήλη
            customer_name· το user_name/user_email δεν υπάρχει στο Review. */}
        <Card>
          <View style={s.reviewHead}>
            <Text style={s.sectionTitle}>{t('productDetail.reviews')}</Text>
            {(canReview?.can_review ?? canReview?.allowed) && (
              <TouchableOpacity onPress={() => setReviewing(true)}>
                <Text style={s.writeReview}>{t('reviews.write')}</Text>
              </TouchableOpacity>
            )}
          </View>
          {isAuthenticated && canReview && !canReview.can_review && canReview.reason === 'not_purchased' && (
            <Text style={s.reviewHint}>{t('reviews.onlyBuyers')}</Text>
          )}
          {reviews.length === 0
            ? <Text style={s.reviewHint}>{t('reviews.none')}</Text>
            : reviews.map((r: any) => (
              <View key={r.id} style={s.review}>
                <View style={s.reviewTop}>
                  <Text style={s.reviewName}>{r.customer_name}</Text>
                  <View style={s.ratingRow}>
                    <Star size={12} color={colors.warning} fill={colors.warning} />
                    <Text style={s.rating}>{r.rating}</Text>
                  </View>
                </View>
                {!!r.comment && <Text style={s.reviewText}>{r.comment}</Text>}
                {!!r.response && (
                  <View style={s.reply}>
                    <Text style={s.replyTitle}>{t('reviews.sellerReply')}</Text>
                    <Text style={s.reviewText}>{r.response}</Text>
                  </View>
                )}
              </View>
            ))}
        </Card>

        {/* Συνδρομή: μόνο όπου το προϊόν τη δέχεται. Ο server έχει το
            is_subscribable· χωρίς αυτό το κουμπί θα οδηγούσε σε
            σφάλμα «δεν διαθέτει συνδρομή». */}
        {product.is_subscribable && (
          <Button label={t('subscribe.title')} variant="secondary"
            onPress={() => router.push(`/product-subscribe?id=${id}` as any)} full />
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
      <Modal visible={reviewing} transparent animationType="slide" onRequestClose={() => setReviewing(false)}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle} numberOfLines={1}>{product.name}</Text>
            <View style={s.stars}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity key={n} onPress={() => setRating(n)} hitSlop={6}>
                  <Star size={32} color={n <= rating ? colors.warning : colors.border}
                    fill={n <= rating ? colors.warning : 'transparent'} />
                </TouchableOpacity>
              ))}
            </View>
            <Input label={t('productDetail.reviews')} value={comment} onChangeText={setComment}
              placeholder={t('reviews.commentHint')} multiline />
            <View style={s.sheetActions}>
              <Button label={t('common.cancel')} variant="secondary"
                onPress={() => setReviewing(false)} style={{ flex: 1 }} />
              <Button label={t('reviews.submit')} loading={submitReview.isPending}
                onPress={() => submitReview.mutate()} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      </ScrollView>
    </Screen>
  )
}

const s = StyleSheet.create({
  reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  writeReview: { ...type.caption, color: colors.brand, fontWeight: weight.bold },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, padding: space.lg, gap: space.md, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl },
  sheetTitle: { ...type.section, color: colors.text },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
  sheetActions: { flexDirection: 'row', gap: space.sm },
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
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, marginTop: space.sm },
  infoText: { flex: 1, gap: 2 },
  infoTitle: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  infoDesc: { ...type.caption, color: colors.textMuted },
  review: { paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewName: { ...type.caption, color: colors.text, fontWeight: weight.semibold },
  reviewText: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  reviewHint: { ...type.caption, color: colors.textLight, paddingVertical: space.xs },
  reply: { marginTop: space.sm, paddingLeft: space.sm, borderLeftWidth: 2, borderLeftColor: colors.brandLight },
  replyTitle: { ...type.caption, color: colors.brand, fontWeight: weight.semibold },
  badgeRow: { flexDirection: 'row', marginTop: space.sm },
})
