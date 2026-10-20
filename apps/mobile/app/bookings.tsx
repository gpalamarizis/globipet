import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert, Platform, StatusBar, Modal, TextInput, Linking } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Calendar, Clock, MapPin, ArrowLeft, PawPrint, Star, X, Stethoscope, ChevronRight, CreditCard } from 'lucide-react-native'
import { api } from '../src/lib/api'
import { useAuthStore } from '../src/store/auth'
import { colors, space, radius, type, weight, shadow, icon, touch } from '@/theme'

/** Μπάρα κατάστασης συν αναπνοή· τα insets επιστρέφουν 0 στο Android
 *  όταν η εφαρμογή δεν είναι ρητά edge-to-edge. Κατώτατο 48. */
const HEADER_TOP = Math.max((Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0) + space.lg, 48)

/**
 * Οι κρατήσεις μου.
 *
 * ΤΙ ΑΛΛΑΞΕ
 *   Διαβαζόταν `b.service_name`. Δεν υπάρχει τέτοια στήλη — ο τίτλος έρχεται
 *   από τη σχέση `service`, και το `/bookings?tab=` δεν την κάνει include.
 *   Κάθε γραμμή έδειχνε κενό εκεί που έπρεπε να λέει τι έκλεισε ο χρήστης.
 *
 *   Το `/bookings/my` κάνει include, οπότε χρησιμοποιείται αυτό με τα
 *   φίλτρα upcoming/past.
 */

const STATUS: Record<string, { labelKey: string; bg: string; fg: string }> = {
  pending:   { labelKey: 'status.pending',  bg: colors.warningBg, fg: colors.warning },
  confirmed: { labelKey: 'status.confirmed', bg: colors.infoBg,  fg: colors.info },
  completed: { labelKey: 'status.completed', bg: colors.successBg, fg: colors.success },
  cancelled: { labelKey: 'status.cancelled',   bg: colors.dangerBg,  fg: colors.danger },
  no_show:   { labelKey: 'status.no_show', bg: colors.surfaceAlt, fg: colors.textMuted },
}

// Ίδιες τρεις καρτέλες και ίδιοι κανόνες με το web (MyBookings):
//   Επερχόμενες — ημερομηνία/ώρα ≥ τώρα και όχι ακυρωμένη
//   Ιστορικό    — ημερομηνία/ώρα < τώρα ή ολοκληρωμένη
//   Όλες
// Πριν το φίλτρο γινόταν στον server μόνο με την ημερομηνία (σε UTC), οπότε
// οι ακυρωμένες εμφανίζονταν στις επερχόμενες και δεν υπήρχε «Όλες».
const TABS = [
  { id: 'upcoming', labelKey: 'bookings.upcoming' },
  { id: 'past',     labelKey: 'bookings.history' },
  { id: 'all',      labelKey: 'bookingPolicy.filterAll' },
]

/** booking_date + booking_time ως ΤΟΠΙΚΗ ώρα (όχι new Date('YYYY-MM-DD') = UTC). */
const bookingDate = (b: any): Date | null => {
  const [y, m, d] = String(b?.booking_date ?? '').split('-').map(Number)
  if (!y || !m || !d) return null
  const [hh, mm] = String(b?.booking_time || '00:00').split(':').map(Number)
  const x = new Date(y, m - 1, d, hh || 0, mm || 0)
  return isNaN(x.getTime()) ? null : x
}

export default function BookingsScreen() {

  const { t, i18n } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()

  // Κριτική: μόνο σε ολοκληρωμένη κράτηση, όπως και στο web.
  const [reviewing, setReviewing] = useState<any>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  const submitReview = useMutation({
    mutationFn: () => api.post('/reviews', {
      service_id: reviewing.service_id,
      booking_id: reviewing.id,
      rating,
      comment: comment.trim() || undefined,
    }),
    onSuccess: () => {
      // Το query της λίστας είναι ['my-bookings'] — το ['bookings'] δεν ταίριαζε με τίποτα.
      qc.invalidateQueries({ queryKey: ['my-bookings'] })
      setReviewing(null); setComment(''); setRating(5)
      Alert.alert(t('reviews.thanks'), t('reviews.thanksHint'))
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })
  const { isAuthenticated } = useAuthStore()
  const [tab, setTab] = useState('upcoming')
  const [refreshing, setRefreshing] = useState(false)

  const { data: allBookings = [], isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => api.get('/bookings/my').then(r => r.data?.data ?? []),
    enabled: isAuthenticated,
  })
  const now = new Date()
  const bookings = (allBookings as any[]).filter(b => {
    const d = bookingDate(b)
    // Ολοκληρωμένη ή «δεν προσήλθε» δεν είναι επερχόμενη, ακόμα κι αν η ώρα της
    // δεν έχει περάσει — πηγαίνει στα προηγούμενα (όπως στο web).
    const closed = b.status === 'completed' || b.status === 'no_show'
    if (tab === 'upcoming') return !!d && d >= now && b.status !== 'cancelled' && !closed
    if (tab === 'past') return (!!d && d < now) || closed
    return true
  })

  const cancel = useMutation({
    mutationFn: (id: string) => api.patch(`/bookings/${id}`, { status: 'cancelled' }),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ['my-bookings'] })
      // Η κάρτα «Επόμενο ραντεβού» της Αρχικής έχει δικό της query.
      qc.invalidateQueries({ queryKey: ['my-next-booking'] })
      Alert.alert(t('bookingPolicy.cancelled'), r?.data?.refund > 0
        ? t('bookingPolicy.refundStarted', { refund: Number(r.data.refund).toFixed(2) }) : undefined)
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || e?.message || t('bookings.cancel_failed')),
  })

  /**
   * Πληρωμή απλήρωτης κράτησης — όπως στο web. Το ποσό το ορίζει ο server
   * από τη βάση (total_price, ήδη μετά την έκπτωση καμπάνιας). Μετά το
   * άνοιγμα της Viva, η οθόνη επιβεβαίωσης παρακολουθεί την κράτηση και
   * ανανεώνει τη λίστα μόλις πληρωθεί.
   */
  const pay = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post('/bookings/viva/checkout', { booking_id: id })
      return { id, url: data?.checkoutUrl as string | undefined }
    },
    onSuccess: async ({ id, url }) => {
      if (!url) return Alert.alert(t('common.error'), t('checkout.err_open_page'))
      const ok = await Linking.canOpenURL(url)
      if (!ok) return Alert.alert(t('common.error'), t('checkout.err_open_page'))
      await Linking.openURL(url)
      router.push({ pathname: '/booking-confirmation', params: { id } } as any)
    },
    onError: (e: any) => {
      // Π.χ. πληρώθηκε ή ακυρώθηκε στο μεταξύ: η λίστα να δείξει την αλήθεια.
      qc.invalidateQueries({ queryKey: ['my-bookings'] })
      Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong'))
    },
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['my-bookings'] })
    setRefreshing(false)
  }, [qc])

  /** Δείχνει τι θα επιστραφεί ΠΡΙΝ την ακύρωση (πολιτική 24 ωρών). */
  const confirmCancel = async (id: string) => {
    let msg = t('bookings.cancel_q')
    try {
      const c = (await api.get(`/bookings/${id}/cancellation`)).data?.data
      if (c && !c.allowed) {
        Alert.alert(t('bookings.cancel'), c.reason === 'already_started' ? t('bookingPolicy.started') : t('bookingPolicy.notAllowed'))
        return
      }
      if (c) msg = !c.paid ? t('bookingPolicy.unpaid')
        : c.late ? t('bookingPolicy.late', { refund: Number(c.refund).toFixed(2), fee: Number(c.fee).toFixed(2) })
        : t('bookingPolicy.free', { refund: Number(c.refund).toFixed(2) })
    } catch { /* χωρίς όρους, η γενική ερώτηση */ }
    Alert.alert(t('bookings.cancel'), msg, [
      { text: t('common.no'), style: 'cancel' },
      { text: t('bookings.cancel'), style: 'destructive', onPress: () => cancel.mutate(id) },
    ])
  }

  const fmtDate = (b: any) => {
    const x = bookingDate(b)
    return x ? x.toLocaleDateString(i18n.language, { weekday: 'short', day: '2-digit', month: 'short' })
      : (b?.booking_date || '—')
  }

  if (!isAuthenticated) return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={icon.lg} color={colors.textOnDark} />
        </TouchableOpacity>
        <Text style={s.title}>{t('profile.menu.bookings')}</Text>
      </View>
      <View style={s.empty}>
        <Calendar size={icon.hero} color={colors.border} />
        <Text style={s.emptyTitle}>{t('bookings.login_prompt')}</Text>
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
        <Text style={s.title}>{t('profile.menu.bookings')}</Text>
      </View>

      <View style={s.tabs}>
        {TABS.map(tb => (
          <TouchableOpacity key={tb.id} activeOpacity={0.7}
            style={[s.tab, tab === tb.id && s.tabActive]}
            onPress={() => setTab(tb.id)}>
            <Text style={[s.tabText, tab === tb.id && s.tabTextActive]}>{t(tb.labelKey)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={bookings}
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
                  <View style={[s.skeleton, { height: 16, width: '55%', borderRadius: radius.sm }]} />
                  <View style={[s.skeleton, { height: 12, width: '35%', borderRadius: radius.sm, marginTop: space.sm }]} />
                </View>
              ))}</View>
            : <View style={s.empty}>
                <Calendar size={icon.hero} color={colors.border} />
                <Text style={s.emptyTitle}>
                  {tab === 'upcoming' ? t('bookings.none_upcoming') : tab === 'past' ? t('bookings.none_history') : t('bookingPolicy.empty')}
                </Text>
                {tab === 'upcoming' && (
                  <>
                    <Text style={s.emptyText}>{t('bookings.find_hint')}</Text>
                    <TouchableOpacity style={s.primaryBtn} activeOpacity={0.85}
                      onPress={() => router.push('/(tabs)/services' as any)}>
                      <Text style={s.primaryBtnText}>{t('bookings.see_services')}</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
        }
        renderItem={({ item }) => {
          const st = STATUS[item.status] ?? STATUS.pending
          const canCancel = item.status === 'pending' || item.status === 'confirmed'
          return (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  {/* Ο τίτλος έρχεται από τη σχέση, όχι από ανύπαρκτη στήλη. */}
                  <Text style={s.service} numberOfLines={1}>
                    {item.service?.title || t('services.book')}
                  </Text>
                  <Text style={s.provider} numberOfLines={1}>{item.provider_name}</Text>
                </View>
                <View style={s.tags}>
                  <View style={[s.statusTag, { backgroundColor: st.bg }]}>
                    <Text style={[s.statusText, { color: st.fg }]}>{t(st.labelKey)}</Text>
                  </View>
                  {/* Απλήρωτη και πληρώσιμη — το κρίνει ο server (`payable`), όπως στο web. */}
                  {item.payable === true && (
                    <View style={[s.statusTag, { backgroundColor: colors.warningBg }]}>
                      <Text style={[s.statusText, { color: colors.warning }]}>{t('bookings.payment_pending')}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={s.metaRow}>
                <Calendar size={icon.xs} color={colors.textLight} />
                <Text style={s.meta}>{fmtDate(item)}</Text>
                <Clock size={icon.xs} color={colors.textLight} />
                <Text style={s.meta}>
                  {item.booking_time}{item.duration ? ` · ${item.duration} ${t('services.minutes')}` : ''}
                </Text>
              </View>

              {/* Γιατρός, κατοικίδιο, διεύθυνση (ή πόλη) — όπως στο web. */}
              {!!item.staff_name && (
                <View style={s.metaRow}>
                  <Stethoscope size={icon.xs} color={colors.textLight} />
                  <Text style={s.meta}>{item.staff_name}</Text>
                </View>
              )}
              {(item.pet_name || item.service?.location || item.service?.city) && (
                <View style={s.metaRow}>
                  {!!item.pet_name && (
                    <>
                      <PawPrint size={icon.xs} color={colors.textLight} />
                      <Text style={s.meta}>{item.pet_name}</Text>
                    </>
                  )}
                  {!!(item.service?.location || item.service?.city) && (
                    <>
                      <MapPin size={icon.xs} color={colors.textLight} />
                      <Text style={[s.meta, { flexShrink: 1 }]} numberOfLines={1}>{item.service.location || item.service.city}</Text>
                    </>
                  )}
                </View>
              )}

              {item.payable === true && (
                <Text style={s.payHint}>{t('bookings.payment_pending_hint')}</Text>
              )}

              <View style={s.cardFooter}>
                <Text style={s.price}>€{Number(item.total_price ?? 0).toFixed(2)}</Text>
                {/* Ενέργειες δεξιά, μαζί — με τρία παιδιά το space-between θα
                    έβαζε το μεσαίο κουμπί στο κέντρο. */}
                <View style={s.actions}>
                  {item.payable === true && (
                    <TouchableOpacity style={[s.payBtn, pay.isPending && { opacity: 0.6 }]} activeOpacity={0.85}
                      disabled={pay.isPending}
                      onPress={() => pay.mutate(item.id)}>
                      <CreditCard size={14} color={colors.textOnDark} />
                      <Text style={s.payText}>{t('bookings.pay_now', { amount: Number(item.total_price ?? 0).toFixed(2) })}</Text>
                    </TouchableOpacity>
                  )}
                  {canCancel && (
                    <TouchableOpacity style={s.cancelBtn} activeOpacity={0.7}
                      disabled={cancel.isPending}
                      onPress={() => confirmCancel(item.id)}>
                      <Text style={s.cancelText}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                  )}
                  {/* Κριτική μόνο σε ολοκληρωμένη και μόνο μία φορά: ο server
                      απορρίπτει τη δεύτερη, αλλά δεν έχει νόημα να τη ζητήσουμε. */}
                  {/* Η κράτηση κρατά τη βαθμολογία της μετά την κριτική (όπως στο web). */}
                  {item.status === 'completed' && item.rating == null && (
                    <TouchableOpacity style={s.reviewBtn} activeOpacity={0.7}
                      onPress={() => setReviewing(item)}>
                      <Star size={14} color={colors.warning} />
                      <Text style={s.reviewText}>{t('reviews.write')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {/* «Λεπτομέρειες» → η σελίδα της υπηρεσίας, όπως στο web. */}
              <TouchableOpacity style={s.details} activeOpacity={0.7}
                onPress={() => router.push(`/services/${item.service_id}` as any)}>
                <Text style={s.detailsText}>{t('parity.details')}</Text>
                <ChevronRight size={icon.xs} color={colors.brand} />
              </TouchableOpacity>
            </View>
          )
        }}
      />

      {/* Φύλλο κριτικής */}
      <Modal visible={!!reviewing} transparent animationType="slide"
        onRequestClose={() => setReviewing(null)}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle} numberOfLines={1}>
                {reviewing?.service?.title ?? t('reviews.write')}
              </Text>
              <TouchableOpacity onPress={() => setReviewing(null)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={s.stars}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity key={n} onPress={() => setRating(n)} hitSlop={6}>
                  <Star size={32}
                    color={n <= rating ? colors.warning : colors.border}
                    fill={n <= rating ? colors.warning : 'transparent'} />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={s.input}
              value={comment}
              onChangeText={setComment}
              placeholder={t('reviews.commentHint')}
              placeholderTextColor={colors.textLight}
              multiline
            />

            <TouchableOpacity
              style={[s.submitBtn, submitReview.isPending && { opacity: 0.6 }]}
              disabled={submitReview.isPending}
              onPress={() => submitReview.mutate()}>
              <Text style={s.submitText}>
                {submitReview.isPending ? t('providerCus.sending') : t('reviews.submit')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  reviewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: space.md, paddingVertical: space.sm,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.warning,
  },
  reviewText: { ...type.caption, color: colors.warning, fontWeight: weight.semibold },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface, padding: space.lg, gap: space.md,
    borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  sheetTitle: { ...type.section, color: colors.text, flex: 1 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: space.sm, paddingVertical: space.md },
  input: {
    ...type.body, color: colors.text, minHeight: 90, textAlignVertical: 'top',
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.md,
  },
  submitBtn: {
    backgroundColor: colors.brand, borderRadius: radius.lg,
    paddingVertical: space.md, alignItems: 'center',
  },
  submitText: { ...type.body, color: colors.textOnDark, fontWeight: weight.bold },
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

  tabs: {
    flexDirection: 'row', gap: space.sm,
    padding: space.lg, paddingBottom: 0,
  },
  tab: {
    flex: 1, height: touch.min,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  tabActive: { backgroundColor: colors.brandLight, borderColor: colors.brand },
  tabText: { ...type.body, color: colors.textMuted, fontWeight: weight.semibold },
  tabTextActive: { color: colors.brand, fontWeight: weight.bold },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.md,
    ...shadow.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  service: { ...type.emphasis, color: colors.text, fontWeight: weight.semibold },
  provider: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1 },
  tags: { alignItems: 'flex-end', gap: space.xs },
  payHint: { ...type.caption, color: colors.warning, marginTop: space.sm },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', gap: space.xs,
    paddingHorizontal: space.md, height: touch.min - 6,
    borderRadius: radius.sm, backgroundColor: colors.brand,
  },
  payText: { ...type.caption, color: colors.textOnDark, fontWeight: weight.bold },
  statusTag: { paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.sm },
  statusText: { ...type.caption, fontWeight: weight.bold },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.sm },
  meta: { ...type.caption, color: colors.textMuted, marginRight: space.sm },

  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: space.md, paddingTop: space.md,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  price: { ...type.emphasis, color: colors.brand, fontWeight: weight.bold },
  cancelBtn: {
    paddingHorizontal: space.lg, height: touch.min - 6,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerBg,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { ...type.caption, color: colors.danger, fontWeight: weight.bold },
  details: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2, marginTop: space.sm },
  detailsText: { ...type.caption, color: colors.brand, fontWeight: weight.semibold },

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
