import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, UserCog, X } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { Screen, Card, Badge, EmptyState, SkeletonRows, Button } from '@/components/ui'
import { Chips } from '@/components/Chips'
import { colors, space, radius, type, weight, icon } from '@/theme'
import { fmtYmd } from '@/lib/dates'

/**
 * Οι κρατήσεις του παρόχου — ίδιες ενέργειες με το web: επιβεβαίωση,
 * ολοκλήρωση (μόνο πληρωμένες), «δεν προσήλθε», ακύρωση με πλήρη επιστροφή
 * στον πελάτη, αλλαγή γιατρού. Οι κανόνες και η επιστροφή μέσω Viva γίνονται
 * στον server (PATCH /provider/bookings/:id).
 */
type Filter = 'active' | 'done' | 'cancelled' | 'all'

export default function ProviderBookings() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [filter, setFilter] = useState<Filter>('active')

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['provider-bookings'],
    queryFn: () => api.get('/provider/bookings').then(r => r.data?.data ?? []),
  })
  const { data: staff = [] } = useQuery({
    queryKey: ['provider-staff-all'],
    queryFn: () => api.get('/staff/mine').then(r => r.data?.data ?? r.data ?? []),
  })

  const changeStaff = useMutation({
    mutationFn: ({ id, staff_id }: { id: string; staff_id: string }) =>
      api.patch(`/bookings/${id}/staff`, { staff_id: staff_id || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['provider-bookings'] }); setEditing(null) },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.error')),
  })

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/provider/bookings/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['provider-bookings'] }); Alert.alert(t('bookingPolicy.updated')) },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.error')),
  })

  const askCancel = (b: any) => Alert.alert(
    t('bookingPolicy.cancel'),
    b.payment_status === 'paid'
      ? t('bookingPolicy.providerCancelPaid', { amount: Number(b.total_price ?? 0).toFixed(2) })
      : t('bookingPolicy.providerCancel'),
    [{ text: t('common.no'), style: 'cancel' },
     { text: t('bookingPolicy.cancel'), style: 'destructive', onPress: () => setStatus.mutate({ id: b.id, status: 'cancelled' }) }])

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await qc.invalidateQueries({ queryKey: ['provider-bookings'] }); setRefreshing(false)
  }, [qc])

  const tone = (st: string) => st === 'confirmed' ? 'success' : st === 'pending' ? 'warning' : st === 'cancelled' ? 'danger' : 'neutral'
  const payTone = (p: string) => p === 'paid' ? 'success' : p === 'partially_refunded' ? 'warning' : p === 'refunded' ? 'neutral' : 'warning'
  const payLabel = (p: string) => p === 'paid' ? t('bookingPolicy.paid') : p === 'refunded' ? t('bookingPolicy.refunded')
    : p === 'partially_refunded' ? t('bookingPolicy.partiallyRefunded') : t('bookingPolicy.unpaidBadge')

  const staffFor = (b: any) => staff.filter((m: any) => m.service_id === b.service_id && m.is_active)
  const isOpen = (b: any) => b.status === 'pending' || b.status === 'confirmed'

  const shown = bookings.filter((b: any) =>
    filter === 'all' ? true
      : filter === 'active' ? isOpen(b)
      : filter === 'done' ? (b.status === 'completed' || b.status === 'no_show')
      : b.status === 'cancelled')

  return (
    <Screen title={t('providerTabs.bookings')} onRefresh={onRefresh} refreshing={refreshing}>
      <Chips<Filter> value={filter} onChange={setFilter} options={[
        { value: 'active', label: t('bookingPolicy.filterActive') },
        { value: 'done', label: t('bookingPolicy.filterDone') },
        { value: 'cancelled', label: t('bookingPolicy.filterCancelled') },
        { value: 'all', label: t('bookingPolicy.filterAll') },
      ]} />

      {isLoading ? <SkeletonRows count={4} /> :
       shown.length === 0 ? <EmptyState icon={CalendarDays} title={t('bookingPolicy.empty')} /> :
       shown.map((b: any) => (
        <Card key={b.id}>
          <View style={s.top}>
            <Text style={s.title} numberOfLines={1}>{b.service?.title || t('providerDash.booking')}</Text>
            <Badge label={t(`status.${b.status}`, { defaultValue: b.status })} tone={tone(b.status) as any} />
          </View>
          <Text style={s.meta}>{b.customer_name} · {fmtYmd(b.booking_date, i18n.language)} {b.booking_time}</Text>
          {!!b.staff_name && <Text style={s.meta}>{t('serviceDetail.choosePractitioner')}: {b.staff_name}</Text>}
          <View style={s.priceRow}>
            <Text style={s.price}>€{Number(b.total_price ?? 0).toFixed(2)}</Text>
            <Badge label={payLabel(b.payment_status)} tone={payTone(b.payment_status) as any} />
          </View>

          {isOpen(b) && (
            <View style={s.actions}>
              {b.status === 'pending' && (
                <Button label={t('bookingPolicy.confirm')} style={s.actionBtn} size="sm"
                  disabled={setStatus.isPending} onPress={() => setStatus.mutate({ id: b.id, status: 'confirmed' })} />
              )}
              {b.status === 'confirmed' && b.payment_status === 'paid' && (
                <Button label={t('bookingPolicy.complete')} style={s.actionBtn} size="sm"
                  disabled={setStatus.isPending} onPress={() => setStatus.mutate({ id: b.id, status: 'completed' })} />
              )}
              {b.status === 'confirmed' && (
                <Button label={t('bookingPolicy.noShow')} variant="secondary" style={s.actionBtn} size="sm"
                  disabled={setStatus.isPending} onPress={() => setStatus.mutate({ id: b.id, status: 'no_show' })} />
              )}
              <Button label={t('bookingPolicy.cancel')} variant="danger" style={s.actionBtn} size="sm"
                disabled={setStatus.isPending} onPress={() => askCancel(b)} />
            </View>
          )}

          {isOpen(b) && staffFor(b).length > 0 && (
            <TouchableOpacity style={s.reassign} onPress={() => setEditing(b)}>
              <UserCog size={icon.sm} color={colors.brand} />
              <Text style={s.reassignTxt}>{t('providerDash.changePractitioner')}</Text>
            </TouchableOpacity>
          )}
        </Card>
      ))}

      {/* Επιλογή γιατρού */}
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>{t('providerDash.changePractitioner')}</Text>
              <TouchableOpacity onPress={() => setEditing(null)}><X size={icon.md} color={colors.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ gap: space.sm }}>
              <TouchableOpacity style={[s.opt, !editing?.staff_id && s.optOn]}
                onPress={() => changeStaff.mutate({ id: editing.id, staff_id: '' })}>
                <Text style={[s.optTxt, !editing?.staff_id && s.optTxtOn]}>{t('providerDash.noPractitioner')}</Text>
              </TouchableOpacity>
              {editing && staffFor(editing).map((m: any) => (
                <TouchableOpacity key={m.id} style={[s.opt, editing.staff_id === m.id && s.optOn]}
                  onPress={() => changeStaff.mutate({ id: editing.id, staff_id: m.id })}>
                  <Text style={[s.optTxt, editing.staff_id === m.id && s.optTxtOn]}>{m.full_name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button label={t('common.cancel')} variant="secondary" onPress={() => setEditing(null)} full loading={changeStaff.isPending} />
          </View>
        </View>
      </Modal>
    </Screen>
  )
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, marginBottom: space.xs },
  title: { ...type.body, color: colors.text, fontWeight: weight.semibold, flex: 1 },
  meta: { ...type.caption, color: colors.textLight },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  price: { ...type.body, color: colors.text, fontWeight: weight.bold },
  // Ίσες στήλες για όσα κουμπιά υπάρχουν (2 ή 3).
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.borderLight },
  actionBtn: { flex: 1 },
  reassign: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  reassignTxt: { ...type.caption, color: colors.brand, fontWeight: weight.semibold },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: space.lg, gap: space.md, maxHeight: '75%' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { ...type.section, color: colors.text },
  opt: { padding: space.md, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border },
  optOn: { borderColor: colors.brand, backgroundColor: colors.brandTint },
  optTxt: { ...type.body, color: colors.text, fontWeight: weight.medium },
  optTxtOn: { color: colors.brand, fontWeight: weight.bold },
})
