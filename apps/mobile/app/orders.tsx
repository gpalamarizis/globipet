import { useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Image,
} from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Package, ArrowLeft, Truck } from 'lucide-react-native'
import { api } from '../src/lib/api'
import { useAuthStore } from '../src/store/auth'
import { colors, space, radius, type, weight, shadow, icon, touch } from '@/theme'

/**
 * Οι παραγγελίες μου.
 *
 * Το `processing` προστέθηκε στις καταστάσεις: το webhook συνδρομών
 * δημιουργεί τις μηνιαίες παραδόσεις με αυτή, και χωρίς εγγραφή εδώ
 * εμφανίζονταν γκρι με ακατέργαστο κείμενο.
 */

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  pending:    { label: 'Σε αναμονή',   bg: colors.warningBg,  fg: colors.warning },
  confirmed:  { label: 'Επιβεβαιώθηκε', bg: colors.infoBg,    fg: colors.info },
  processing: { label: 'Σε επεξεργασία', bg: colors.infoBg,   fg: colors.info },
  shipped:    { label: 'Απεστάλη',     bg: colors.category.photography.bg, fg: colors.category.photography.fg },
  delivered:  { label: 'Παραδόθηκε',   bg: colors.successBg,  fg: colors.success },
  cancelled:  { label: 'Ακυρώθηκε',    bg: colors.dangerBg,   fg: colors.danger },
}

export default function OrdersScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const [refreshing, setRefreshing] = useState(false)

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => api.get('/orders/my').then(r => r.data?.data ?? []),
    enabled: isAuthenticated,
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['my-orders'] })
    setRefreshing(false)
  }, [qc])

  const fmtDate = (d?: string) => {
    if (!d) return ''
    const x = new Date(d)
    return isNaN(x.getTime()) ? ''
      : x.toLocaleDateString('el-GR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (!isAuthenticated) return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={icon.lg} color={colors.textOnDark} />
        </TouchableOpacity>
        <Text style={s.title}>Παραγγελίες</Text>
      </View>
      <View style={s.empty}>
        <Package size={icon.hero} color={colors.border} />
        <Text style={s.emptyTitle}>Συνδέσου για να δεις τις παραγγελίες σου</Text>
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
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={icon.lg} color={colors.textOnDark} />
        </TouchableOpacity>
        <Text style={s.title}>Παραγγελίες</Text>
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
          isLoading
            ? <View>{[0, 1].map(i => (
                <View key={i} style={s.card}>
                  <View style={[s.skeleton, { height: 14, width: '40%', borderRadius: radius.sm }]} />
                  <View style={[s.skeleton, { height: 12, width: '60%', borderRadius: radius.sm, marginTop: space.sm }]} />
                </View>
              ))}</View>
            : <View style={s.empty}>
                <Package size={icon.hero} color={colors.border} />
                <Text style={s.emptyTitle}>Καμία παραγγελία ακόμη</Text>
                <Text style={s.emptyText}>Ό,τι παραγγείλεις θα εμφανίζεται εδώ.</Text>
                <TouchableOpacity style={s.primaryBtn} activeOpacity={0.85}
                  onPress={() => router.push('/(tabs)/marketplace' as any)}>
                  <Text style={s.primaryBtnText}>Στο κατάστημα</Text>
                </TouchableOpacity>
              </View>
        }
        renderItem={({ item }) => {
          const st = STATUS[item.status] ?? STATUS.pending
          const items = Array.isArray(item.items) ? item.items : []
          return (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View>
                  <Text style={s.orderId}>#{item.id?.slice(0, 8)}</Text>
                  <Text style={s.date}>{fmtDate(item.created_at)}</Text>
                </View>
                <View style={[s.statusTag, { backgroundColor: st.bg }]}>
                  <Text style={[s.statusText, { color: st.fg }]}>{st.label}</Text>
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
                  <Text style={s.more}>και {items.length - 3} ακόμη</Text>
                )}
              </View>

              {!!item.tracking_number && (
                <View style={s.tracking}>
                  <Truck size={icon.sm} color={colors.info} />
                  <Text style={s.trackingText}>Παρακολούθηση: {item.tracking_number}</Text>
                </View>
              )}

              <View style={s.cardFooter}>
                <Text style={s.totalLabel}>Σύνολο</Text>
                <Text style={s.total}>€{item.total_amount?.toFixed(2)}</Text>
              </View>
            </View>
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
    paddingTop: space.xxxl + space.lg,
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
