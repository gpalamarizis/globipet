import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, TrendingUp, Scissors, Star, LogOut, Languages, ChevronRight, Video, Clock } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { useAuthStore } from '../../src/store/auth'
import { Screen, Card, EmptyState, Button } from '@/components/ui'
import { getTelehealthCallUrl } from '@/lib/telehealthCall'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Επισκόπηση παρόχου — ίδια με την καρτέλα «Επισκόπηση» του web.
 * Τέσσερις αριθμοί, οι επόμενες κρατήσεις, και έξοδος.
 */
export default function ProviderOverview() {
  const { t } = useTranslation()
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['telehealth-mine'] })
    await qc.invalidateQueries({ queryKey: ['my-services-all'] })
    await qc.invalidateQueries({ queryKey: ['provider-stats'] })
    await qc.invalidateQueries({ queryKey: ['provider-bookings'] })
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

      <Text style={s.sectionTitle}>{t('providerDash.upcomingBookings')}</Text>
      {upcoming.length === 0 ? (
        <EmptyState icon={CalendarDays} title={t('providerDash.noBookings')} />
      ) : upcoming.map((b: any) => (
        <Card key={b.id} onPress={() => router.push('/(provider)/bookings' as any)}>
          <View style={s.row}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.bookingTitle} numberOfLines={1}>{b.service?.title || t('providerDash.booking')}</Text>
              <Text style={s.bookingMeta} numberOfLines={1}>
                {b.customer_name} · {b.booking_date} {b.booking_time}
                {b.staff_name ? ` · ${b.staff_name}` : ''}
              </Text>
            </View>
            <ChevronRight size={icon.sm} color={colors.textLight} />
          </View>
        </Card>
      ))}

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
  footer: { flexDirection: 'row', gap: space.sm, marginTop: space.xl },
  footerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  footerTxt: { ...type.caption, color: colors.textMuted, fontWeight: weight.semibold },
})
