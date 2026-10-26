import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Image, Platform, StatusBar, Alert, Linking, ActivityIndicator } from 'react-native'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Package, ArrowLeft, Truck } from 'lucide-react-native'
import { api } from '../src/lib/api'
import { useAuthStore } from '../src/store/auth'
import { colors, space, radius, type, weight, shadow, icon, touch } from '@/theme'
import { ErrorState } from '@/components/ErrorState'
import { dateLocale } from '@/lib/dates'

/** Μπάρα κατάστασης συν αναπνοή· τα insets επιστρέφουν 0 στο Android
 *  όταν η εφαρμογή δεν είναι ρητά edge-to-edge. Κατώτατο 48. */
const HEADER_TOP = Math.max((Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0) + space.lg, 48)

/**
 * Οι παραγγελίες μου.
 *
 * Το `processing` προστέθηκε στις καταστάσεις: το webhook συνδρομών
 * δημιουργεί τις μηνιαίες παραδόσεις με αυτή, και χωρίς εγγραφή εδώ
 * εμφανίζονταν γκρι με ακατέργαστο κείμενο.
 */

const STATUS: Record<string, { labelKey: string; bg: string; fg: string }> = {
  pending:    { labelKey: 'status.pending',   bg: colors.warningBg,  fg: colors.warning },
  confirmed:  { labelKey: 'orders.confirmed', bg: colors.infoBg,    fg: colors.info },
  processing: { labelKey: 'orders.processing', bg: colors.infoBg,   fg: colors.info },
  shipped:    { labelKey: 'orders.shipped',     bg: colors.category.photography.bg, fg: colors.category.photography.fg },
  delivered:  { labelKey: 'orders.delivered',   bg: colors.successBg,  fg: colors.success },
  cancelled:  { labelKey: 'status.cancelled',    bg: colors.dangerBg,   fg: colors.danger },
}

export default function OrdersScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const [refreshing, setRefreshing] = useState(false)

  const { data: orders = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => api.get('/orders/my').then(r => r.data?.data ?? []),
    enabled: isAuthenticated,
  })

  // Απλήρωτη παραγγελία: «Πληρωμή» ξανανοίγει τη Viva για την ΙΔΙΑ
  // παραγγελία (POST /orders/viva/checkout) και «Ακύρωση» την ακυρώνει
  // (POST /orders/:id/cancel, μόνο απλήρωτη) — όπως στο web.
  const pay = useMutation({
    mutationFn: (orderId: string) => api.post('/orders/viva/checkout', { order_id: orderId }).then(r => ({ orderId, url: r.data?.checkoutUrl })),
    onSuccess: async ({ orderId, url }) => {
      if (!url) { Alert.alert(t('common.error'), t('checkout.err_no_page')); return }
      const ok = await Linking.canOpenURL(url)
      if (!ok) { Alert.alert(t('common.error'), t('checkout.err_open_page')); return }
      Linking.openURL(url)
      // Επιστρέφοντας από τη Viva: επιβεβαίωση πληρωμής (ίδια ροή με το checkout).
      router.push(`/order-confirmation?id=${encodeURIComponent(orderId)}` as any)
    },
    onError: (e: any) => {
      Alert.alert(t('common.error'), e?.response?.data?.message || t('checkout.err_order'))
      qc.invalidateQueries({ queryKey: ['my-orders'] })
    },
  })
  const cancel = useMutation({
    mutationFn: (orderId: string) => api.post(`/orders/${orderId}/cancel`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-orders'] })
      Alert.alert(t('ordersPay.cancelled'))
    },
    onError: (e: any) => {
      Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong'))
      qc.invalidateQueries({ queryKey: ['my-orders'] })
    },
  })
  const busy = pay.isPending || cancel.isPending
  const askCancel = (orderId: string) => Alert.alert(
    t('ordersPay.cancel'), t('ordersPay.confirmCancel'),
    [
      { text: t('mySubs.keep'), style: 'cancel' },
      { text: t('ordersPay.cancel'), style: 'destructive', onPress: () => cancel.mutate(orderId) },
    ],
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['my-orders'] })
    setRefreshing(false)
  }, [qc])

  const fmtDate = (d?: string) => {
    if (!d) return ''
    const x = new Date(d)
    return isNaN(x.getTime()) ? ''
      : x.toLocaleDateString(dateLocale(i18n.language), { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (!isAuthenticated) return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={icon.lg} color={colors.textOnDark} />
        </TouchableOpacity>
        <Text style={s.title}>{t('profile.menu.orders')}</Text>
      </View>
      <View style={s.empty}>
        <Package size={icon.hero} color={colors.border} />
        <Text style={s.emptyTitle}>{t('orders.login_prompt')}</Text>
        <TouchableOpacity style={s.primaryBtn} activeOpacity={0.85}
          onPress={() => router.push('/auth/login' as any)}>
          <Text style={s.primaryBtnText}>{t('auth.sign_in')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={icon.lg} color={colors.textOnDark} />
        </TouchableOpacity>
        <Text style={s.title}>{t('profile.menu.orders')}</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: space.lg, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }
        ListEmptyComponent={
          // Σφάλμα δικτύου ≠ «καμία παραγγελία»: επανάληψη.
          isError
            ? <ErrorState onRetry={() => refetch()} retrying={isFetching} />
            : isLoading
            ? <View>{[0, 1].map(i => (
                <View key={i} style={s.card}>
                  <View style={[s.skeleton, { height: 14, width: '40%', borderRadius: radius.sm }]} />
                  <View style={[s.skeleton, { height: 12, width: '60%', borderRadius: radius.sm, marginTop: space.sm }]} />
                </View>
              ))}</View>
            : <View style={s.empty}>
                <Package size={icon.hero} color={colors.border} />
                <Text style={s.emptyTitle}>{t('orders.none')}</Text>
                <Text style={s.emptyText}>{t('orders.none_hint')}</Text>
                <TouchableOpacity style={s.primaryBtn} activeOpacity={0.85}
                  onPress={() => router.push('/(tabs)/marketplace' as any)}>
                  <Text style={s.primaryBtnText}>{t('cart.go_to_shop')}</Text>
                </TouchableOpacity>
              </View>
        }
        renderItem={({ item }) => {
          const st = STATUS[item.status] ?? STATUS.pending
          const items = Array.isArray(item.items) ? item.items : []
          const payable = item.payment_status === 'unpaid' && item.status !== 'cancelled'
          return (
            // Η κάρτα ανοίγει τη λεπτομέρεια, όπως στο web (/orders/:id).
            <TouchableOpacity style={s.card} activeOpacity={0.85}
              onPress={() => router.push(`/order-confirmation?id=${item.id}` as any)}>
              <View style={s.cardTop}>
                <View>
                  <Text style={s.orderId}>#{item.id?.slice(0, 8).toUpperCase()}</Text>
                  <Text style={s.date}>{fmtDate(item.created_at)}</Text>
                </View>
                <View style={[s.statusTag, { backgroundColor: st.bg }]}>
                  <Text style={[s.statusText, { color: st.fg }]}>{t(st.labelKey)}</Text>
                </View>
              </View>

              <View style={s.items}>
                {items.slice(0, 3).map((it: any, i: number) => (
                  <View key={i} style={s.itemRow}>
                    <View style={s.itemImg}>
                      {it.image
                        ? <Image source={{ uri: it.image }} style={s.itemImgSrc} />
                        : <Package size={icon.sm} color={colors.border} />}
                    </View>
                    <Text style={s.itemName} numberOfLines={1}>
                      {it.name || it.product_name}
                    </Text>
                    <Text style={s.itemQty}>×{it.quantity}</Text>
                  </View>
                ))}
                {items.length > 3 && (
                  <Text style={s.more}>{t('orders.and_more', { count: items.length - 3 })}</Text>
                )}
              </View>

              {!!item.tracking_number && (
                <View style={s.tracking}>
                  <Truck size={icon.sm} color={colors.info} />
                  <Text style={s.trackingText}>{t('orders.tracking', { code: item.tracking_number })}</Text>
                </View>
              )}

              <View style={s.cardFooter}>
                <Text style={s.totalLabel}>{t('common.total')}</Text>
                <Text style={s.total}>€{item.total_amount?.toFixed(2)}</Text>
              </View>

              {payable && (
                <View style={s.payBox}>
                  <Text style={s.payHint}>{t('ordersPay.unpaidHint')}</Text>
                  <View style={s.payRow}>
                    <TouchableOpacity style={[s.payBtn, s.cancelBtn]} activeOpacity={0.85} disabled={busy}
                      onPress={() => askCancel(item.id)}>
                      <Text style={s.cancelBtnText}>{t('ordersPay.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.payBtn, s.payBtnPrimary, busy && { opacity: 0.6 }]} activeOpacity={0.85} disabled={busy}
                      onPress={() => pay.mutate(item.id)}>
                      {pay.isPending && pay.variables === item.id
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={s.payBtnText}>{t('ordersPay.pay')}</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: space.lg,
    backgroundColor: colors.navy,
    paddingTop: HEADER_TOP,
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
  },
  title: { ...type.title, color: colors.textOnDark, fontWeight: weight.bold },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.md,
    ...shadow.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  orderId: { ...type.emphasis, color: colors.text, fontWeight: weight.bold },
  date: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  statusTag: { paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.sm },
  statusText: { ...type.caption, fontWeight: weight.bold },

  items: {
    marginTop: space.md, paddingTop: space.md,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
    gap: space.sm,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  itemImg: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  itemImgSrc: { width: 36, height: 36 },
  itemName: { flex: 1, ...type.caption, color: colors.text },
  itemQty: { ...type.caption, color: colors.textMuted, fontWeight: weight.semibold },
  more: { ...type.caption, color: colors.textLight, marginLeft: 48 },

  tracking: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    backgroundColor: colors.infoBg,
    padding: space.md, borderRadius: radius.md,
    marginTop: space.md,
  },
  trackingText: { ...type.caption, color: colors.info, fontWeight: weight.semibold },

  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: space.md, paddingTop: space.md,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  totalLabel: { ...type.body, color: colors.textMuted },
  total: { ...type.emphasis, color: colors.brand, fontWeight: weight.bold },

  payBox: {
    marginTop: space.md, paddingTop: space.md,
    borderTopWidth: 1, borderTopColor: colors.borderLight, gap: space.sm,
  },
  payHint: { ...type.caption, color: colors.warning },
  payRow: { flexDirection: 'row', gap: space.sm },
  payBtn: {
    flex: 1, height: touch.min, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  payBtnPrimary: { backgroundColor: colors.brand },
  payBtnText: { ...type.body, color: '#fff', fontWeight: weight.bold },
  cancelBtn: { borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.surface },
  cancelBtnText: { ...type.body, color: colors.danger, fontWeight: weight.semibold },

  skeleton: { backgroundColor: colors.surfaceAlt },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: space.xl, gap: space.sm },
  emptyTitle: { ...type.emphasis, color: colors.text, fontWeight: weight.semibold, marginTop: space.md },
  emptyText: { ...type.body, color: colors.textMuted, textAlign: 'center' },
  primaryBtn: {
    height: touch.comfortable, paddingHorizontal: space.xxxl,
    borderRadius: radius.md, backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center', marginTop: space.lg,
  },
  primaryBtnText: { ...type.emphasis, color: '#fff', fontWeight: weight.bold },
})
