import { useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Calendar, Clock, MapPin, ArrowLeft, PawPrint } from 'lucide-react-native'
import { api } from '../src/lib/api'
import { useAuthStore } from '../src/store/auth'
import { colors, space, radius, type, weight, shadow, icon, touch } from '@/theme'

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

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  pending:   { label: 'Σε αναμονή',  bg: colors.warningBg, fg: colors.warning },
  confirmed: { label: 'Επιβεβαιωμένη', bg: colors.infoBg,  fg: colors.info },
  completed: { label: 'Ολοκληρώθηκε', bg: colors.successBg, fg: colors.success },
  cancelled: { label: 'Ακυρώθηκε',   bg: colors.dangerBg,  fg: colors.danger },
  no_show:   { label: 'Δεν προσήλθε', bg: colors.surfaceAlt, fg: colors.textMuted },
}

const TABS = [
  { id: 'upcoming', label: 'Επερχόμενες' },
  { id: 'past',     label: 'Ιστορικό' },
]

export default function BookingsScreen() {
  const router = useRouter()
  const qc = useQueryClient()
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
    onError: (e: any) => Alert.alert('Σφάλμα', e?.message || 'Δεν ακυρώθηκε'),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['my-bookings'] })
    setRefreshing(false)
  }, [qc])

  const confirmCancel = (id: string) =>
    Alert.alert('Ακύρωση κράτησης', 'Θέλεις να ακυρώσεις αυτή την κράτηση;', [
      { text: 'Όχι', style: 'cancel' },
      { text: 'Ακύρωση κράτησης', style: 'destructive', onPress: () => cancel.mutate(id) },
    ])

  const fmtDate = (d?: string) => {
    if (!d) return '—'
    const x = new Date(d)
    return isNaN(x.getTime()) ? d
      : x.toLocaleDateString('el-GR', { weekday: 'short', day: '2-digit', month: 'short' })
  }

  if (!isAuthenticated) return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={icon.lg} color={colors.textOnDark} />
        </TouchableOpacity>
        <Text style={s.title}>Κρατήσεις</Text>
      </View>
      <View style={s.empty}>
        <Calendar size={icon.hero} color={colors.border} />
        <Text style={s.emptyTitle}>Συνδέσου για να δεις τις κρατήσεις σου</Text>
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
        <Text style={s.title}>Κρατήσεις</Text>
      </View>

      <View style={s.tabs}>
        {TABS.map(t => (
          <TouchableOpacity key={t.id} activeOpacity={0.7}
            style={[s.tab, tab === t.id && s.tabActive]}
            onPress={() => setTab(t.id)}>
            <Text style={[s.tabText, tab === t.id && s.tabTextActive]}>{t.label}</Text>
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
                  {tab === 'upcoming' ? 'Καμία επερχόμενη κράτηση' : 'Κανένα ιστορικό'}
                </Text>
                {tab === 'upcoming' && (
                  <>
                    <Text style={s.emptyText}>Βρες κτηνίατρο, κομμωτήριο ή βόλτα.</Text>
                    <TouchableOpacity style={s.primaryBtn} activeOpacity={0.85}
                      onPress={() => router.push('/(tabs)/services' as any)}>
                      <Text style={s.primaryBtnText}>Δες υπηρεσίες</Text>
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
                    {item.service?.title || 'Κράτηση'}
                  </Text>
                  <Text style={s.provider} numberOfLines={1}>{item.provider_name}</Text>
                </View>
                <View style={[s.statusTag, { backgroundColor: st.bg }]}>
                  <Text style={[s.statusText, { color: st.fg }]}>{st.label}</Text>
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
                    <Text style={s.cancelText}>Ακύρωση</Text>
                  </TouchableOpacity>
                )}
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
