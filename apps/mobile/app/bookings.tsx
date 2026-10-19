import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert, Platform, StatusBar, Modal, TextInput } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Calendar, Clock, MapPin, ArrowLeft, PawPrint, Star, X } from 'lucide-react-native'
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

const TABS = [
  { id: 'upcoming', labelKey: 'bookings.upcoming' },
  { id: 'past',     labelKey: 'bookings.history' },
]

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
      qc.invalidateQueries({ queryKey: ['bookings'] })
      setReviewing(null); setComment(''); setRating(5)
      Alert.alert(t('reviews.thanks'), t('reviews.thanksHint'))
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })
  const { isAuthenticated } = useAuthStore()
  const [tab, setTab] = useState('upcoming')
  const [refreshing, setRefreshing] = useState(false)

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['my-bookings', tab],
    queryFn: () => api.get('/bookings/my', {
      params: tab === 'upcoming' ? { upcoming: 'true' } : { past: 'true' },
    }).then(r => r.data?.data ?? []),
    enabled: isAuthenticated,
  })

  const cancel = useMutation({
    mutationFn: (id: string) => api.patch(`/bookings/${id}`, { status: 'cancelled' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-bookings'] }),
    onError: (e: any) => Alert.alert(t('common.error'), e?.message || t('bookings.cancel_failed')),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['my-bookings'] })
    setRefreshing(false)
  }, [qc])

  const confirmCancel = (id: string) =>
    Alert.alert(t('bookings.cancel'), t('bookings.cancel_q'), [
      { text: t('common.no'), style: 'cancel' },
      { text: t('bookings.cancel'), style: 'destructive', onPress: () => cancel.mutate(id) },
    ])

  const fmtDate = (d?: string) => {
    if (!d) return '—'
    const x = new Date(d)
    return isNaN(x.getTime()) ? d
      : x.toLocaleDateString(i18n.language, { weekday: 'short', day: '2-digit', month: 'short' })
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
                  {tab === 'upcoming' ? t('bookings.none_upcoming') : t('bookings.none_history')}
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
                <View style={[s.statusTag, { backgroundColor: st.bg }]}>
                  <Text style={[s.statusText, { color: st.fg }]}>{t(st.labelKey)}</Text>
                </View>
              </View>

              <View style={s.metaRow}>
                <Calendar size={icon.xs} color={colors.textLight} />
                <Text style={s.meta}>{fmtDate(item.booking_date)}</Text>
                <Clock size={icon.xs} color={colors.textLight} />
                <Text style={s.meta}>{item.booking_time}</Text>
              </View>

              {(item.pet_name || item.service?.city) && (
                <View style={s.metaRow}>
                  {!!item.pet_name && (
                    <>
                      <PawPrint size={icon.xs} color={colors.textLight} />
                      <Text style={s.meta}>{item.pet_name}</Text>
                    </>
                  )}
                  {!!item.service?.city && (
                    <>
                      <MapPin size={icon.xs} color={colors.textLight} />
                      <Text style={s.meta}>{item.service.city}</Text>
                    </>
                  )}
                </View>
              )}

              <View style={s.cardFooter}>
                <Text style={s.price}>€{item.total_price}</Text>
                {canCancel && (
                  <TouchableOpacity style={s.cancelBtn} activeOpacity={0.7}
                    disabled={cancel.isPending}
                    onPress={() => confirmCancel(item.id)}>
                    <Text style={s.cancelText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                )}
                {/* Κριτική μόνο σε ολοκληρωμένη και μόνο μία φορά: ο server
                    απορρίπτει τη δεύτερη, αλλά δεν έχει νόημα να τη ζητήσουμε. */}
                {item.status === 'completed' && !item.has_review && (
                  <TouchableOpacity style={s.reviewBtn} activeOpacity={0.7}
                    onPress={() => setReviewing(item)}>
                    <Star size={14} color={colors.warning} />
                    <Text style={s.reviewText}>{t('reviews.write')}</Text>
                  </TouchableOpacity>
                )}
              </View>
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
