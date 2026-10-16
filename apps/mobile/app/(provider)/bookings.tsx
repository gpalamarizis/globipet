import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, UserCog, X } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { Screen, Card, Badge, EmptyState, SkeletonRows, Button } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Οι κρατήσεις του παρόχου, με αλλαγή γιατρού.
 *
 * Η γραμματεία πρέπει να μπορεί να μεταφέρει ραντεβού σε άλλον γιατρό από
 * το κινητό — ασθένεια, άδεια, αλλαγή βάρδιας. Ίδια λειτουργία με το web:
 * ίδιο endpoint, ίδιοι κανόνες, ίδια ειδοποίηση στον πελάτη.
 */
export default function ProviderBookings() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const [editing, setEditing] = useState<any>(null)

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provider-bookings'] })
      setEditing(null)
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.error')),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await qc.invalidateQueries({ queryKey: ['provider-bookings'] }); setRefreshing(false)
  }, [qc])

  const tone = (st: string) => st === 'confirmed' ? 'success' : st === 'pending' ? 'warning' : st === 'cancelled' ? 'danger' : 'neutral'
  const label = (st: string) => t(`status.${st}`, st)

  const staffFor = (b: any) => staff.filter((m: any) => m.service_id === b.service_id && m.is_active)
  const canReassign = (b: any) => b.status !== 'cancelled' && b.status !== 'completed' && staffFor(b).length > 0

  return (
    <Screen title={t('providerTabs.bookings')} onRefresh={onRefresh} refreshing={refreshing}>
      {isLoading ? <SkeletonRows count={4} /> :
       bookings.length === 0 ? <EmptyState icon={CalendarDays} title={t('providerDash.noBookings')} /> :
       bookings.map((b: any) => (
        <Card key={b.id}>
          <View style={s.top}>
            <Text style={s.title} numberOfLines={1}>{b.service?.title || t('providerDash.booking')}</Text>
            <Badge label={label(b.status)} tone={tone(b.status) as any} />
          </View>
          <Text style={s.meta}>{b.customer_name} · {b.booking_date} {b.booking_time}</Text>
          {!!b.staff_name && <Text style={s.meta}>{t('serviceDetail.choosePractitioner')}: {b.staff_name}</Text>}
          <Text style={s.price}>€{Number(b.total_price ?? 0).toFixed(2)}{b.payment_status === 'paid' ? ' ✓' : ''}</Text>
          {canReassign(b) && (
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
              <TouchableOpacity
                style={[s.opt, !editing?.staff_id && s.optOn]}
                onPress={() => changeStaff.mutate({ id: editing.id, staff_id: '' })}>
                <Text style={[s.optTxt, !editing?.staff_id && s.optTxtOn]}>{t('providerDash.noPractitioner')}</Text>
              </TouchableOpacity>
              {editing && staffFor(editing).map((m: any) => (
                <TouchableOpacity key={m.id}
                  style={[s.opt, editing.staff_id === m.id && s.optOn]}
                  onPress={() => changeStaff.mutate({ id: editing.id, staff_id: m.id })}>
                  <Text style={[s.optTxt, editing.staff_id === m.id && s.optTxtOn]}>{m.full_name}</Text>
                  {!!m.role && <Text style={s.optSub}>{m.role}</Text>}
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
  price: { ...type.body, color: colors.text, fontWeight: weight.bold, marginTop: space.xs },
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
  optSub: { ...type.caption, color: colors.textLight },
})
