import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Check, ChevronLeft, ChevronRight } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { Screen, Card, Badge, SkeletonRows } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Σύνδεση ημερολογίου Google ή Outlook.
 *
 * Η σύνδεση γίνεται με OAuth, που σημαίνει άνοιγμα του browser: ο πάροχος
 * φεύγει από την εφαρμογή, δίνει άδεια, και επιστρέφει. Δεν προσπαθούμε να
 * το κάνουμε μέσα στην εφαρμογή — θα ήταν και χειρότερο και ανασφαλές.
 */
const PROVIDERS = [
  { id: 'google',  labelKey: 'providerDash.connectGoogle' },
  { id: 'outlook', labelKey: 'providerDash.connectMicrosoft' },
]

const DAY_KEYS = ['dSun', 'dMon', 'dTue', 'dWed', 'dThu', 'dFri', 'dSat']

export default function ProviderCalendar() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  // Μηνιαίο ημερολόγιο κρατήσεων, όπως στο web (‹ › αλλάζουν μήνα). Το
  // /provider/bookings φέρνει όλες τις κρατήσεις· το φιλτράρισμα είναι τοπικό.
  const [view, setView] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const shiftMonth = (delta: number) => setView(v => { const d = new Date(v.y, v.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() } })

  const { data: bookings = [] } = useQuery({
    queryKey: ['provider-bookings'],
    queryFn: () => api.get('/provider/bookings').then(r => r.data?.data ?? []),
  })

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['calendar-connections'],
    queryFn: () => api.get('/calendar/connections').then(r => r.data?.data ?? r.data ?? []),
  })

  const connected = (id: string) =>
    connections.some((c: any) => (c.provider ?? c.id) === id && (c.is_active ?? true))

  const disconnect = useMutation({
    mutationFn: (provider: string) => api.delete(`/calendar/${provider}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-connections'] })
      Alert.alert(t('providerDash.connectionRemoved'))
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('providerDash.errConnect')),
  })

  const connect = async (provider: string) => {
    try {
      const { data } = await api.get(`/calendar/${provider}/connect`)
      // Ο server απαντά { data: { url } } (όπως διαβάζει και το web). Με
      // data?.url η σύνδεση έβγαζε πάντα «δεν δόθηκε σύνδεσμος».
      const url = data?.data?.url ?? data?.url ?? data?.authUrl
      if (!url) return Alert.alert(t('common.error'), t('providerDash.errNoAuthUrl'))
      const ok = await Linking.canOpenURL(url)
      if (ok) Linking.openURL(url)
      else Alert.alert(t('common.error'), t('checkout.err_open_page'))
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.response?.data?.message || t('providerDash.errConnect'))
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['calendar-connections'] }),
      qc.invalidateQueries({ queryKey: ['provider-bookings'] }),
    ])
    setRefreshing(false)
  }, [qc])

  return (
    <Screen title={t('providerTabs.calendar')} onRefresh={onRefresh} refreshing={refreshing}>
      <Text style={s.intro}>{t('providerDash.calendarSyncHint')}</Text>

      {isLoading ? <SkeletonRows count={2} /> : PROVIDERS.map(p => {
        const on = connected(p.id)
        return (
          <Card key={p.id}>
            <View style={s.row}>
              <View style={[s.icon, on && s.iconOn]}>
                {on ? <Check size={icon.md} color={colors.success} />
                    : <CalendarDays size={icon.md} color={colors.textMuted} />}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.name}>{t(p.labelKey)}</Text>
                {on && <Badge label={t('providerCal.connected')} tone="success" />}
              </View>
              <TouchableOpacity activeOpacity={0.7}
                style={[s.btn, on && s.btnOff]}
                onPress={() => on ? disconnect.mutate(p.id) : connect(p.id)}>
                <Text style={[s.btnTxt, on && s.btnTxtOff]}>
                  {on ? t('providerCal.disconnect') : t('providerCal.connect')}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        )
      })}

      <Text style={s.note}>{t('providerCal.browserNote')}</Text>

      {/* Ημερολόγιο μήνα: τελεία στις μέρες με κράτηση (booking_date 'YYYY-MM-DD',
          σύγκριση ως κείμενο — χωρίς new Date('YYYY-MM-DD'), που είναι UTC). */}
      <Card style={{ marginTop: space.lg }}>
        <View style={s.calHead}>
          <Text style={s.name}>{new Date(view.y, view.m, 1).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}</Text>
          <View style={s.row}>
            <TouchableOpacity onPress={() => shiftMonth(-1)} hitSlop={8}>
              <ChevronLeft size={icon.md} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => shiftMonth(1)} hitSlop={8}>
              <ChevronRight size={icon.md} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={s.grid}>
          {DAY_KEYS.map(k => (
            <View key={k} style={s.cell}><Text style={s.dow}>{t(`providerDash.${k}`)}</Text></View>
          ))}
          {Array.from({ length: new Date(view.y, view.m, 1).getDay() }, (_, i) => <View key={`e${i}`} style={s.cell} />)}
          {Array.from({ length: new Date(view.y, view.m + 1, 0).getDate() }, (_, i) => i + 1).map(day => {
            const now = new Date()
            const isToday = view.y === now.getFullYear() && view.m === now.getMonth() && day === now.getDate()
            const ymd = `${view.y}-${String(view.m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const has = bookings.some((b: any) => !!b.booking_date && String(b.booking_date).slice(0, 10) === ymd)
            return (
              <View key={day} style={s.cell}>
                <View style={[s.day, isToday && s.dayToday]}>
                  <Text style={[s.dayTxt, isToday && s.dayTxtToday]}>{day}</Text>
                  {has && <View style={s.dot} />}
                </View>
              </View>
            )
          })}
        </View>
      </Card>
    </Screen>
  )
}

const s = StyleSheet.create({
  intro: { ...type.caption, color: colors.textMuted, marginBottom: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 42, height: 42, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  iconOn: { backgroundColor: colors.successBg },
  name: { ...type.body, color: colors.text, fontWeight: weight.semibold, marginBottom: space.xs },
  btn: { paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.lg, backgroundColor: colors.brand },
  btnOff: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  btnTxt: { ...type.caption, color: colors.textOnDark, fontWeight: weight.bold },
  btnTxtOff: { color: colors.textMuted },
  note: { ...type.caption, color: colors.textLight, textAlign: 'center', marginTop: space.lg },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dow: { ...type.caption, color: colors.textLight, fontWeight: weight.medium },
  day: { width: '86%', height: '86%', borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  dayToday: { backgroundColor: colors.brand },
  dayTxt: { ...type.caption, color: colors.text },
  dayTxtToday: { color: colors.textOnDark, fontWeight: weight.bold },
  dot: { position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.warning },
})
