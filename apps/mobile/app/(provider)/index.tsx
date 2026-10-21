import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, TrendingUp, Scissors, Star, LogOut, Languages, ChevronRight, Video, Clock, BadgeCheck } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { useAuthStore, isEmailUnverified } from '../../src/store/auth'
import EmailVerifyBanner from '../../src/components/EmailVerifyBanner'
import { Screen, Card, EmptyState, Button } from '@/components/ui'
import { getTelehealthCallUrl } from '@/lib/telehealthCall'
import { confirmTelehealthCancel, postTelehealthCancel } from '@/lib/telehealthCancel'
import { colors, space, radius, type, weight, icon, font } from '@/theme'
import { fmtYmd } from '@/lib/dates'
import { ProviderReviews } from '@/components/ProviderReviews'

/**
 * Επισκόπηση παρόχου — ίδια με την καρτέλα «Επισκόπηση» του web.
 * Τέσσερις αριθμοί, οι επόμενες κρατήσεις, και έξοδος.
 */
export default function ProviderOverview() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { user, logout } = useAuthStore()
  const [refreshing, setRefreshing] = useState(false)

  const { data: stats } = useQuery({
    queryKey: ['provider-stats'],
    queryFn: () => api.get('/provider/stats').then(r => r.data),
  })
  const { data: bookings = [] } = useQuery({
    queryKey: ['provider-bookings'],
    queryFn: () => api.get('/provider/bookings').then(r => r.data?.data ?? []),
  })

  // Επαλήθευση: χωρίς αίτηση (ή με απορριφθείσα) δείχνουμε κάρτα — ίδια με
  // την κάρτα του ProviderLayout στο web. Ίδιο κλειδί με την οθόνη verification.
  const { data: verification, isSuccess: verificationLoaded } = useQuery({
    queryKey: ['my-verification'],
    queryFn: () => api.get('/provider/verification-request').then(r => r.data?.data ?? null),
    enabled: user?.role !== 'admin',
  })
  const needsVerification = user?.role !== 'admin' && verificationLoaded && (!verification || verification.status === 'rejected')

  // Τηλεϊατρική — ίδιο κουμπί με το web, μόνο για κτηνιάτρους.
  const { data: myServices = [] } = useQuery({
    queryKey: ['my-services-all'],
    queryFn: () => api.get('/services/my').then(r => r.data?.data ?? []),
  })
  const vetServices = myServices.filter((sv: any) => sv.service_type === 'veterinary')
  const isVet = vetServices.length > 0
  const isAvailableNow = vetServices.some((sv: any) => sv.is_available_now)
  const toggleAvailability = useMutation({
    mutationFn: (is_available: boolean) => api.patch('/telehealth/availability', { is_available }),
    onSuccess: (_r, is_available) => {
      qc.invalidateQueries({ queryKey: ['my-services-all'] })
      Alert.alert(is_available ? t('providerDash.teleOn') : t('providerDash.teleOffMsg'))
    },
    onError: () => Alert.alert(t('common.error'), t('providerDash.errAvailability')),
  })

  // Σημερινές πληρωμένες τηλεσυνεδρίες με είσοδο στην κλήση — ίδιο με την
  // Επισκόπηση του web. Ο server ειδοποιούσε τον πάροχο (incoming_call) αλλά
  // η εφαρμογή δεν του έδινε κανέναν τρόπο να μπει στην κλήση.
  // «Σήμερα»: τοπική ημερομηνία — η άμεση κλήση γράφει πλέον το
  // scheduled_date με τοπική ημερομηνία (όχι toISOString/UTC).
  const { data: teleSessions = [] } = useQuery({
    queryKey: ['telehealth-mine'],
    queryFn: () => api.get('/telehealth').then(r => r.data?.data ?? []),
    refetchInterval: 60_000,
  })
  const ymd = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const now = new Date()
  const todayKey = ymd(now.getFullYear(), now.getMonth(), now.getDate())
  const teleToday = (teleSessions as any[])
    .filter(c => c.provider_email === user?.email
      && c.payment_status === 'paid' && !!c.meeting_url
      && c.status !== 'cancelled' && c.status !== 'completed'
      && String(c.scheduled_date) === todayKey)
    .sort((a, b) => String(a.scheduled_time).localeCompare(String(b.scheduled_time)))
  // Επόμενες συνεδρίες: επιβεβαιωμένες, από αύριο και μετά, ώστε ο πάροχος
  // να μπορεί να τις ακυρώσει εγκαίρως — ίδιο με το web (ProviderTelehealthToday).
  const teleUpcoming = (teleSessions as any[])
    .filter(c => c.provider_email === user?.email && c.status === 'scheduled'
      && String(c.scheduled_date) > todayKey)
    .sort((a, b) => `${a.scheduled_date} ${a.scheduled_time}`.localeCompare(`${b.scheduled_date} ${b.scheduled_time}`))

  const [joiningId, setJoiningId] = useState<string | null>(null)
  const joinCall = async (id: string) => {
    if (joiningId) return
    setJoiningId(id)
    try {
      await Linking.openURL(await getTelehealthCallUrl(id))
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.response?.data?.message || t('teleConfirm.err_open_call'))
    } finally {
      setJoiningId(null)
    }
  }

  // Ακύρωση από τον πάροχο: πάντα πλήρης επιστροφή στον πελάτη — ίδιο με το web.
  const cancelSession = useMutation({
    mutationFn: (id: string) => postTelehealthCancel(id),
    onSuccess: (r: any, id: string) => {
      qc.invalidateQueries({ queryKey: ['telehealth-mine'] })
      qc.invalidateQueries({ queryKey: ['telehealth-session', id] })
      Alert.alert(t('teleCancel.cancelled'), r?.refund > 0
        ? t('teleCancel.providerRefunded', { amount: Number(r.refund).toFixed(2) }) : undefined)
    },
    onError: (e: any, id: string) => {
      qc.invalidateQueries({ queryKey: ['telehealth-mine'] })
      qc.invalidateQueries({ queryKey: ['telehealth-session', id] })
      Alert.alert(t('common.error'), e?.response?.data?.message || e?.message || t('common.something_wrong'))
    },
  })
  // Όσο φορτώνει το cancel-preview το κουμπί είναι ανενεργό (διπλό πάτημα → δύο ερωτήσεις).
  const [asking, setAsking] = useState(false)
  const askCancel = async (id: string) => {
    if (asking) return
    setAsking(true)
    try {
      await confirmTelehealthCancel(id, true, t, () => cancelSession.mutate(id),
        () => qc.invalidateQueries({ queryKey: ['telehealth-mine'] }))
    } finally {
      setAsking(false)
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['telehealth-mine'] })
    await qc.invalidateQueries({ queryKey: ['my-services-all'] })
    await qc.invalidateQueries({ queryKey: ['provider-stats'] })
    await qc.invalidateQueries({ queryKey: ['provider-bookings'] })
    await qc.invalidateQueries({ queryKey: ['my-verification'] })
    await qc.invalidateQueries({ queryKey: ['provider-reviews'] })
    setRefreshing(false)
  }, [qc])

  const upcoming = bookings
    .filter((b: any) => b.status !== 'cancelled' && b.status !== 'completed')
    .slice(0, 5)

  const STATS = [
    { Icon: CalendarDays, value: stats?.bookings ?? 0, labelKey: 'providerDash.totalBookings', tint: colors.info },
    { Icon: TrendingUp, value: `€${Number(stats?.revenue ?? 0).toFixed(0)}`, labelKey: 'providerDash.totalRevenue', tint: colors.success },
    { Icon: Scissors, value: stats?.services ?? 0, labelKey: 'providerTabs.services', tint: colors.brand },
    { Icon: Star, value: stats?.rating ? Number(stats.rating).toFixed(1) : '—', labelKey: 'providerDash.rating', tint: colors.warning },
  ]

  return (
    <Screen
      title={t('providerDash.title')}
      subtitle={user?.full_name || user?.email}
      onRefresh={onRefresh} refreshing={refreshing}>

      {/* Επιβεβαίωση email — ίδια μπάρα με την Αρχική και το web. */}
      {isEmailUnverified(user) && (
        <View style={{ marginBottom: space.md }}>
          <EmailVerifyBanner />
        </View>
      )}

      {isVet && (
        <TouchableOpacity activeOpacity={0.8} disabled={toggleAvailability.isPending}
          onPress={() => toggleAvailability.mutate(!isAvailableNow)}
          style={[s.tele, isAvailableNow && s.teleOn]}
          accessibilityRole="switch" accessibilityState={{ checked: isAvailableNow }}>
          <Video size={icon.md} color={isAvailableNow ? colors.textOnDark : colors.textMuted} />
          <View style={[s.dot, isAvailableNow && s.dotOn]} />
          <Text style={[s.teleTxt, isAvailableNow && s.teleTxtOn]}>
            {isAvailableNow ? t('providerDash.teleAvailable') : t('providerDash.teleOff')}
          </Text>
        </TouchableOpacity>
      )}

      {needsVerification && (
        <TouchableOpacity activeOpacity={0.8} style={s.verify}
          onPress={() => router.push('/verification' as any)} accessibilityRole="button">
          <BadgeCheck size={icon.lg} color={colors.brand} />
          <View style={{ flex: 1 }}>
            <Text style={s.verifyTitle}>
              {verification?.status === 'rejected' ? t('providerAccount.verifyRejectedTitle') : t('providerAccount.verifyTitle')}
            </Text>
            <Text style={s.verifyDesc}>{t('providerAccount.verifyDesc')}</Text>
          </View>
          <ChevronRight size={icon.sm} color={colors.brand} />
        </TouchableOpacity>
      )}

      <View style={s.grid}>
        {STATS.map(({ Icon, value, labelKey, tint }) => (
          <Card key={labelKey} style={s.stat}>
            <View style={[s.statIcon, { backgroundColor: tint + '22' }]}>
              <Icon size={icon.md} color={tint} />
            </View>
            <Text style={s.statValue}>{value}</Text>
            <Text style={s.statLabel}>{t(labelKey)}</Text>
          </Card>
        ))}
      </View>

      {teleToday.length > 0 && (
        <>
          <Text style={s.sectionTitle}>{t('providerTele.todayTitle')}</Text>
          {teleToday.map((c: any) => (
            <Card key={c.id} style={s.teleCard}>
              <View style={s.row}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.bookingTitle} numberOfLines={1}>
                    {c.client_name}{c.pet_name ? ` · ${c.pet_name}` : ''}
                  </Text>
                  <View style={s.teleMeta}>
                    <Clock size={icon.xs} color={colors.textLight} />
                    <Text style={s.bookingMeta} numberOfLines={1}>
                      {c.scheduled_time} · {t('providerTele.minutes', { count: c.duration })}
                    </Text>
                  </View>
                </View>
                {/* Ίδιο ύψος με το κουμπί κλήσης (Button sm) και ίδια όψη με το web (κόκκινο περίγραμμα). */}
                <TouchableOpacity style={[s.teleCancelBtn, (cancelSession.isPending || asking) && { opacity: 0.5 }]} activeOpacity={0.8}
                  disabled={cancelSession.isPending || asking}
                  onPress={() => askCancel(String(c.id))}>
                  <Text style={s.teleCancelText}>{t('bookingPolicy.cancel')}</Text>
                </TouchableOpacity>
                <Button label={t('providerTele.join')} size="sm"
                  icon={<Video size={icon.sm} color={colors.textOnDark} />}
                  loading={joiningId === c.id} disabled={!!joiningId}
                  onPress={() => joinCall(c.id)} />
              </View>
            </Card>
          ))}
          <View style={{ height: space.sm }} />
        </>
      )}

      {teleUpcoming.length > 0 && (
        <>
          <Text style={s.sectionTitle}>{t('providerTele.upcomingTitle')}</Text>
          {teleUpcoming.map((c: any) => (
            <Card key={c.id} style={s.teleCard}>
              <View style={s.row}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.bookingTitle} numberOfLines={1}>
                    {c.client_name}{c.pet_name ? ` · ${c.pet_name}` : ''}
                  </Text>
                  <View style={s.teleMeta}>
                    <Clock size={icon.xs} color={colors.textLight} />
                    <Text style={s.bookingMeta} numberOfLines={1}>
                      {fmtYmd(c.scheduled_date, i18n.language)} · {c.scheduled_time}{c.duration ? ` · ${t('providerTele.minutes', { count: c.duration })}` : ''}
                    </Text>
                  </View>
                </View>
                {c.payment_status === 'refunding' ? (
                  <Text style={s.teleRefunding}>{t('teleCancel.refunding')}</Text>
                ) : (
                  <TouchableOpacity style={[s.teleCancelBtn, (cancelSession.isPending || asking) && { opacity: 0.5 }]} activeOpacity={0.8}
                    disabled={cancelSession.isPending || asking}
                    onPress={() => askCancel(String(c.id))}>
                    <Text style={s.teleCancelText}>{t('bookingPolicy.cancel')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          ))}
          <View style={{ height: space.sm }} />
        </>
      )}

      <Text style={s.sectionTitle}>{t('providerDash.upcomingBookings')}</Text>
      {upcoming.length === 0 ? (
        <EmptyState icon={CalendarDays} title={t('providerDash.noBookings')} />
      ) : upcoming.map((b: any) => (
        <Card key={b.id} onPress={() => router.push('/(provider)/bookings' as any)}>
          <View style={s.row}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.bookingTitle} numberOfLines={1}>{b.service?.title || t('providerDash.booking')}</Text>
              <Text style={s.bookingMeta} numberOfLines={1}>
                {b.customer_name} · {fmtYmd(b.booking_date, i18n.language)} {b.booking_time}
                {b.staff_name ? ` · ${b.staff_name}` : ''}
              </Text>
            </View>
            <ChevronRight size={icon.sm} color={colors.textLight} />
          </View>
        </Card>
      ))}

      {/* Κριτικές με απάντηση — ίδιο με την καρτέλα «Κριτικές» του web. */}
      <ProviderReviews />

      <View style={s.footer}>
        <TouchableOpacity style={s.footerBtn} onPress={() => router.push('/language' as any)}>
          <Languages size={icon.sm} color={colors.textMuted} />
          <Text style={s.footerTxt}>{t('language.title')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.footerBtn} onPress={() => { logout(); router.replace('/auth/login' as any) }}>
          <LogOut size={icon.sm} color={colors.danger} />
          <Text style={[s.footerTxt, { color: colors.danger }]}>{t('auth.logout')}</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  )
}

const s = StyleSheet.create({
  verify: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    padding: space.md, marginBottom: space.md, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.brand, backgroundColor: colors.brandTint,
  },
  verifyTitle: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  verifyDesc: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  tele: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm,
    minHeight: 48, paddingHorizontal: space.lg, marginBottom: space.md, borderRadius: radius.lg,
    borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface,
  },
  teleOn: { backgroundColor: colors.success, borderColor: colors.success },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textLight },
  dotOn: { backgroundColor: colors.textOnDark },
  teleTxt: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  teleTxtOn: { color: colors.textOnDark },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg },
  stat: { width: '48%', alignItems: 'flex-start' },
  statIcon: { width: 40, height: 40, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  statValue: { ...type.title, color: colors.text, fontWeight: weight.black },
  statLabel: { ...type.caption, color: colors.textMuted },
  sectionTitle: { ...type.emphasis, color: colors.text, marginBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  bookingTitle: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  bookingMeta: { ...type.caption, color: colors.textLight },
  teleCard: { marginBottom: space.sm },
  teleMeta: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: 2 },
  teleRefunding: { ...type.caption, color: colors.warning, fontWeight: weight.semibold },
  // = Button sm (paddingVertical space.sm, radius.md, font.sm) με περίγραμμα 1px:
  // paddingVertical − 1 ώστε το ύψος να είναι ίδιο με το κουμπί κλήσης.
  teleCancelBtn: {
    paddingVertical: space.sm - 1, paddingHorizontal: space.md - 1,
    borderRadius: radius.md, borderWidth: 1, borderColor: '#FECACA', backgroundColor: colors.surface,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  teleCancelText: { fontSize: font.sm, color: '#DC2626', fontWeight: weight.semibold },
  footer: { flexDirection: 'row', gap: space.sm, marginTop: space.xl },
  footerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  footerTxt: { ...type.caption, color: colors.textMuted, fontWeight: weight.semibold },
})
