import { useState, useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, Clock, PawPrint, Package, Stethoscope, MapPin, Star } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { useAuthStore } from '../../src/store/auth'
import { Screen, Card, Button, EmptyState, SkeletonRows, Input } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Λεπτομέρεια υπηρεσίας και κράτηση.
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ
 *   Η λίστα υπηρεσιών έκανε router.push('/services/{id}') σε οθόνη που δεν
 *   υπήρχε: το πάτημα σε υπηρεσία δεν έκανε τίποτα. Το κινητό δεν μπορούσε
 *   να κλείσει ραντεβού καθόλου, ενώ το web μπορούσε.
 *
 * ΙΔΙΑ ΛΕΙΤΟΥΡΓΙΑ ΜΕ ΤΟ WEB
 *   Κατοικίδιο, πακέτα με τιμές, γιατρός, ημερομηνία, ώρα, σημείωση,
 *   ζωντανό σύνολο — και κατευθείαν στο Viva. Καμία ασυνέπεια ανάμεσα στις
 *   δύο πλατφόρμες.
 *
 * ΠΛΗΡΩΜΗ ΠΡΩΤΑ
 *   Η κράτηση γεννιέται pending/unpaid και ο χρήστης φεύγει αμέσως για το
 *   checkout. Κανένα email «επιβεβαιώθηκε» δεν φεύγει πριν μπουν τα χρήματα.
 */
export default function ServiceDetailScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { isAuthenticated } = useAuthStore()

  const [petId, setPetId] = useState('')
  const [staffId, setStaffId] = useState('')
  // id πακέτου -> ποσότητα. Ο πελάτης μπορεί να θέλει το ίδιο δύο φορές.
  const [qty, setQty] = useState<Record<string, number>>({})
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [note, setNote] = useState('')

  const { data: service, isLoading } = useQuery({
    queryKey: ['service', id],
    queryFn: () => api.get(`/services/${id}`).then(r => r.data),
    enabled: !!id,
  })

  const { data: pets = [] } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets').then(r => r.data?.data ?? r.data ?? []),
    enabled: isAuthenticated,
  })

  const { data: packages = [] } = useQuery({
    queryKey: ['service-packages', id],
    queryFn: () => api.get(`/packages/service/${id}`).then(r => r.data?.data ?? []),
    enabled: !!id,
  })

  // Κριτικές άλλων πελατών: το web τις δείχνει, το κινητό όχι — και είναι
  // ό,τι κοιτά πρώτο κανείς πριν κλείσει ραντεβού.
  const { data: reviews = [] } = useQuery({
    queryKey: ['service-reviews', id],
    queryFn: () => api.get(`/reviews?service_id=${id}`).then(r => r.data?.data ?? []),
    enabled: !!id,
  })

  const { data: staff = [] } = useQuery({
    queryKey: ['service-staff', id],
    queryFn: () => api.get(`/staff/by-service/${id}`).then(r => r.data?.data ?? r.data ?? []),
    enabled: !!id,
  })

  // Οι επόμενες 14 μέρες, από αύριο.
  const dates = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i + 1)
    return d.toISOString().split('T')[0]
  }), [])

  const times = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']

  const chosen = packages.filter((p: any) => (qty[p.id] ?? 0) > 0)
  const packagesTotal = chosen.reduce((s: number, p: any) => s + p.price * (qty[p.id] ?? 0), 0)
  // Μόνο για εμφάνιση: η χρέωση γίνεται πάντα με τις τιμές της βάσης.
  const total = chosen.length ? packagesTotal : (service?.price ?? 0)

  // Όπου ο πάροχος έχει πακέτα, η επιλογή είναι υποχρεωτική — το ίδιο
  // επιβάλλει και ο server, οπότε δεν αρκεί ο έλεγχος εδώ.
  const packagesOk = packages.length === 0 || chosen.length > 0
  const canBook = isAuthenticated && !!date && !!time && packagesOk

  const book = useMutation({
    mutationFn: async () => {
      const { data: booking } = await api.post('/bookings', {
        service_id: id,
        booking_date: date,
        booking_time: time,
        notes: note || undefined,
        pet_id: petId || undefined,
        staff_id: staffId || undefined,
        packages: chosen.map((p: any) => ({ package_id: p.id, quantity: qty[p.id] ?? 1 })),
      })
      const { data: pay } = await api.post('/bookings/viva/checkout', { booking_id: booking.id })
      return pay?.checkoutUrl as string | undefined
    },
    onSuccess: async (url) => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      if (!url) {
        // Η κράτηση υπάρχει αλλά είναι απλήρωτη. Το λέμε, και τον στέλνουμε
        // στη λίστα όπου υπάρχει κουμπί πληρωμής — δεν χάνεται.
        Alert.alert(t('common.error'), t('booking.noPaymentPage'))
        router.replace('/bookings' as any)
        return
      }
      const ok = await Linking.canOpenURL(url)
      if (ok) Linking.openURL(url)
      else Alert.alert(t('common.error'), t('checkout.err_open_page'))
    },
    onError: (e: any) =>
      Alert.alert(t('common.error'), e?.response?.data?.message || e?.message || t('booking.err_book')),
  })

  if (isLoading) return <Screen title={t('services.title')} back><SkeletonRows count={3} /></Screen>

  if (!service) return (
    <Screen title={t('services.title')} back>
      <EmptyState icon={Stethoscope} title={t('services.no_services')} />
    </Screen>
  )

  return (
    <Screen title={service.provider_name || t('services.title')} back scroll={false}>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">

        {/* Κεφαλίδα υπηρεσίας */}
        <Card>
          <Text style={s.title}>{service.title || service.provider_name}</Text>
          <View style={s.metaRow}>
            {!!service.city && (
              <>
                <MapPin size={icon.xs} color={colors.textLight} />
                <Text style={s.meta}>{service.city}</Text>
              </>
            )}
            {service.reviews_count > 0 && (
              <>
                <Star size={icon.xs} color={colors.warning} fill={colors.warning} />
                <Text style={s.meta}>
                  {Number(service.rating ?? 0).toFixed(1)} ({service.reviews_count})
                </Text>
              </>
            )}
          </View>
          {!!service.description && <Text style={s.desc}>{service.description}</Text>}
        </Card>

        {!isAuthenticated ? (
          <Card>
            <Text style={s.loginPrompt}>{t('auth.login_to_continue')}</Text>
            <Button label={t('auth.login')} onPress={() => router.push('/auth/login' as any)} full />
          </Card>
        ) : (
          <>
            {/* Κατοικίδιο */}
            {pets.length > 0 && (
              <View style={s.section}>
                <View style={s.label}>
                  <PawPrint size={icon.xs} color={colors.textMuted} />
                  <Text style={s.labelText}>{t('serviceDetail.forPet')}</Text>
                </View>
                <View style={[s.chipRow, { flexWrap: 'wrap' }]}>
                  {pets.map((p: any) => {
                    const on = petId === p.id
                    return (
                      <TouchableOpacity key={p.id} activeOpacity={0.7}
                        style={[s.chip, on && s.chipOn]}
                        onPress={() => setPetId(on ? '' : p.id)}>
                        <Text style={s.chipEmoji}>{p.species === 'cat' ? '🐈' : '🐕'}</Text>
                        <Text style={[s.chipText, on && s.chipTextOn]}>{p.name}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            )}

            {/* Πακέτα */}
            {packages.length > 0 && (
              <View style={s.section}>
                <View style={s.label}>
                  <Package size={icon.xs} color={colors.textMuted} />
                  <Text style={s.labelText}>{t('serviceDetail.choosePackages')}</Text>
                  <Text style={s.required}>*</Text>
                </View>
                {packages.map((p: any) => {
                  const n = qty[p.id] ?? 0
                  return (
                    <View key={p.id} style={[s.pkg, n > 0 && s.pkgOn]}>
                      <View style={s.pkgInfo}>
                        <Text style={s.pkgName} numberOfLines={1}>{p.name}</Text>
                        {!!p.description && (
                          <Text style={s.pkgDesc} numberOfLines={1}>{p.description}</Text>
                        )}
                      </View>
                      <Text style={s.pkgPrice}>€{Number(p.price).toFixed(2)}</Text>
                      <View style={s.stepper}>
                        <TouchableOpacity
                          accessibilityLabel={t('common.remove')}
                          disabled={n === 0}
                          onPress={() => setQty(q => ({ ...q, [p.id]: Math.max(0, (q[p.id] ?? 0) - 1) }))}
                          style={[s.stepBtn, n === 0 && s.stepBtnOff]}>
                          <Text style={s.stepTxt}>−</Text>
                        </TouchableOpacity>
                        <Text style={s.qty}>{n}</Text>
                        <TouchableOpacity
                          accessibilityLabel={t('common.add')}
                          onPress={() => setQty(q => ({ ...q, [p.id]: (q[p.id] ?? 0) + 1 }))}
                          style={s.stepBtn}>
                          <Text style={s.stepTxt}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )
                })}
                {!packagesOk && <Text style={s.error}>{t('serviceDetail.packageRequired')}</Text>}
              </View>
            )}

            {/* Γιατρός */}
            {staff.length > 0 && (
              <View style={s.section}>
                <View style={s.label}>
                  <Stethoscope size={icon.xs} color={colors.textMuted} />
                  <Text style={s.labelText}>{t('serviceDetail.choosePractitioner')}</Text>
                </View>
                <View style={[s.chipRow, { flexWrap: 'wrap' }]}>
                  <TouchableOpacity activeOpacity={0.7}
                    style={[s.chip, staffId === '' && s.chipOn]}
                    onPress={() => setStaffId('')}>
                    <Text style={[s.chipText, staffId === '' && s.chipTextOn]}>
                      {t('serviceDetail.anyPractitioner')}
                    </Text>
                  </TouchableOpacity>
                  {staff.map((m: any) => {
                    const on = staffId === m.id
                    return (
                      <TouchableOpacity key={m.id} activeOpacity={0.7}
                        style={[s.chip, on && s.chipOn]}
                        onPress={() => setStaffId(m.id)}>
                        <Text style={[s.chipText, on && s.chipTextOn]}>{m.full_name}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            )}

            {/* Ημερομηνία */}
            <View style={s.section}>
              <View style={s.label}>
                <Calendar size={icon.xs} color={colors.textMuted} />
                <Text style={s.labelText}>{t('serviceDetail.date')}</Text>
              </View>
              <View style={[s.chipRow, { flexWrap: 'wrap' }]}>
                {dates.map(d => {
                  const dt = new Date(d)
                  const on = date === d
                  return (
                    <TouchableOpacity key={d} activeOpacity={0.7}
                      style={[s.day, on && s.dayOn]}
                      onPress={() => setDate(d)}>
                      <Text style={[s.dayName, on && s.chipTextOn]}>
                        {dt.toLocaleDateString(undefined, { weekday: 'short' })}
                      </Text>
                      <Text style={[s.dayNum, on && s.chipTextOn]}>{dt.getDate()}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            {/* Ώρα */}
            {!!date && (
              <View style={s.section}>
                <View style={s.label}>
                  <Clock size={icon.xs} color={colors.textMuted} />
                  <Text style={s.labelText}>{t('serviceDetail.time')}</Text>
                </View>
                <View style={s.timeGrid}>
                  {times.map(tm => {
                    const on = time === tm
                    return (
                      <TouchableOpacity key={tm} activeOpacity={0.7}
                        style={[s.time, on && s.chipOn]}
                        onPress={() => setTime(tm)}>
                        <Text style={[s.chipText, on && s.chipTextOn]}>{tm}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            )}

            {/* Σημείωση */}
            <View style={s.section}>
              <Input
                label={t('serviceDetail.note')}
                value={note}
                onChangeText={setNote}
                placeholder={t('serviceDetail.notePlaceholder')}
                multiline
              />
            </View>

            {/* Κριτικές */}
            {reviews.length > 0 && (
              <Card>
                <Text style={s.sectionTitle}>{t('productDetail.reviews')}</Text>
                {reviews.slice(0, 5).map((r: any) => (
                  <View key={r.id} style={s.review}>
                    <View style={s.reviewTop}>
                      <Text style={s.reviewName} numberOfLines={1}>
                        {r.user_name ?? r.user_email}
                      </Text>
                      <View style={s.ratingRow}>
                        <Star size={12} color={colors.warning} fill={colors.warning} />
                        <Text style={s.ratingTxt}>{r.rating}</Text>
                      </View>
                    </View>
                    {!!r.comment && <Text style={s.reviewTxt}>{r.comment}</Text>}
                  </View>
                ))}
              </Card>
            )}

            {/* Σύνολο και κράτηση */}
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>{t('serviceDetail.total')}</Text>
              <Text style={s.totalValue}>€{Number(total).toFixed(2)}</Text>
            </View>

            <Button
              label={book.isPending ? t('serviceDetail.booking') : t('serviceDetail.bookAndPay')}
              onPress={() => book.mutate()}
              disabled={!canBook || book.isPending}
              loading={book.isPending}
              full
            />
            <Text style={s.payNote}>{t('serviceDetail.vivaNote')}</Text>
            <Text style={s.payNote}>{t('bookingPolicy.note')}</Text>
          </>
        )}
      </ScrollView>
    </Screen>
  )
}

const s = StyleSheet.create({
  sectionTitle: { ...type.emphasis, color: colors.text, marginBottom: space.sm },
  review: { paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  reviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  reviewName: { ...type.caption, color: colors.text, fontWeight: weight.semibold, flex: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingTxt: { ...type.caption, color: colors.textMuted, fontWeight: weight.semibold },
  reviewTxt: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  body: { padding: space.lg, gap: space.lg, paddingBottom: space.xxxl },

  title: { ...type.section, color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs, flexWrap: 'wrap' },
  meta: { ...type.caption, color: colors.textLight, marginRight: space.sm },
  desc: { ...type.body, color: colors.textMuted, marginTop: space.sm },
  loginPrompt: { ...type.body, color: colors.textMuted, marginBottom: space.md, textAlign: 'center' },

  section: { gap: space.sm },
  label: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  labelText: { ...type.caption, color: colors.textMuted, fontWeight: weight.semibold },
  required: { ...type.caption, color: colors.danger },
  error: { ...type.caption, color: colors.danger, marginTop: space.xs },

  // flexDirection απαραίτητο: ήταν contentContainerStyle οριζόντιου
  // ScrollView, που το υπονοούσε. Ως πλέγμα πρέπει να δηλωθεί.
  chipRow: { flexDirection: 'row', gap: space.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: space.xs,
    paddingHorizontal: space.md, paddingVertical: space.sm,
    borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface,
  },
  chipOn: { borderColor: colors.brand, backgroundColor: colors.brandTint },
  chipEmoji: { fontSize: 16 },
  chipText: { ...type.caption, color: colors.textMuted, fontWeight: weight.medium },
  chipTextOn: { color: colors.brand, fontWeight: weight.bold },

  pkg: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    padding: space.md, borderRadius: radius.lg,
    borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface,
  },
  pkgOn: { borderColor: colors.brand, backgroundColor: colors.brandTint },
  pkgInfo: { flex: 1, minWidth: 0 },
  pkgName: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  pkgDesc: { ...type.caption, color: colors.textLight },
  pkgPrice: { ...type.body, color: colors.text, fontWeight: weight.bold },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  stepBtn: {
    width: 30, height: 30, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnOff: { opacity: 0.35 },
  stepTxt: { ...type.body, color: colors.textMuted, fontWeight: weight.bold, lineHeight: 20 },
  qty: { ...type.body, color: colors.text, fontWeight: weight.bold, minWidth: 20, textAlign: 'center' },

  day: {
    alignItems: 'center', justifyContent: 'center',
    minWidth: 58, paddingVertical: space.sm, paddingHorizontal: space.sm,
    borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface,
  },
  dayOn: { borderColor: colors.brand, backgroundColor: colors.brandTint },
  dayName: { ...type.caption, color: colors.textMuted, fontWeight: weight.medium },
  dayNum: { ...type.section, color: colors.text, fontWeight: weight.bold },

  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  time: {
    paddingHorizontal: space.md, paddingVertical: space.sm,
    borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface,
  },

  totalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  totalLabel: { ...type.body, color: colors.textMuted, fontWeight: weight.semibold },
  totalValue: { ...type.section, color: colors.brand, fontWeight: weight.black },
  payNote: { ...type.caption, color: colors.textLight, textAlign: 'center' },
})
