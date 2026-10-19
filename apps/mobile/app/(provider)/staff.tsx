import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, Switch, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Users, Plus } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { Screen, Card, Badge, EmptyState, SkeletonRows, Button } from '@/components/ui'
import { STAFF_TITLE_KEYS } from '@/components/staffOptions'
import { colors, space, type, weight } from '@/theme'

/**
 * Το προσωπικό του παρόχου — ίδιες δυνατότητες με το web: προσθήκη,
 * επεξεργασία, διαγραφή, ενεργός/ανενεργός.
 *
 * Διορθώθηκε: η κάρτα διάβαζε `role` και `service.title`, πεδία που ο server
 * δεν επιστρέφει — ο τίτλος και η υπηρεσία δεν φαίνονταν ποτέ.
 */
export default function ProviderStaff() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['provider-staff-all'],
    queryFn: () => api.get('/staff/mine').then(r => r.data?.data ?? r.data ?? []),
  })
  const { data: services = [] } = useQuery({
    queryKey: ['provider-services'],
    queryFn: () => api.get('/services/my').then(r => r.data?.data ?? r.data ?? []),
  })
  const serviceName = (id: string) => {
    const sv = services.find((x: any) => x.id === id)
    return sv ? (sv.title || sv.provider_name) : null
  }

  const toggle = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => api.patch(`/staff/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['provider-staff-all'] }),
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.error')),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await qc.invalidateQueries({ queryKey: ['provider-staff-all'] }); setRefreshing(false)
  }, [qc])

  return (
    <Screen title={t('providerTabs.staff')} onRefresh={onRefresh} refreshing={refreshing}>
      <Button label={t('providerStaff.addTitle')} icon={<Plus size={18} color={colors.textOnDark} />}
        onPress={() => router.push('/(provider)/staff-form' as any)} full style={{ marginBottom: space.md }} />

      {isLoading ? <SkeletonRows count={3} /> :
       staff.length === 0 ? <EmptyState icon={Users} title={t('providerStaff.empty')} /> :
       staff.map((m: any) => (
        <Card key={m.id} onPress={() => router.push({ pathname: '/(provider)/staff-form', params: { id: m.id } } as any)}>
          <View style={s.row}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.title} numberOfLines={1}>
                {m.title && STAFF_TITLE_KEYS[m.title] ? `${t(STAFF_TITLE_KEYS[m.title])} ` : ''}{m.full_name}
              </Text>
              {!!m.email && <Text style={s.meta} numberOfLines={1}>{m.email}</Text>}
              <View style={s.badges}>
                {!!serviceName(m.service_id) && <Badge label={serviceName(m.service_id)!} tone="neutral" />}
                <Badge label={m.has_account ? t('providerStaff.linked') : t('providerStaff.pending')}
                  tone={m.has_account ? 'success' : 'warning'} />
                {m.bookings_count > 0 && <Badge label={`${t('providerStaff.bookings')}: ${m.bookings_count}`} tone="info" />}
              </View>
            </View>
            <Switch value={!!m.is_active} onValueChange={v => toggle.mutate({ id: m.id, is_active: v })}
              trackColor={{ true: colors.brand, false: colors.border }} thumbColor={colors.surface} />
          </View>
        </Card>
      ))}
    </Screen>
  )
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  meta: { ...type.caption, color: colors.textLight },
  badges: { flexDirection: 'row', gap: space.xs, marginTop: space.xs, flexWrap: 'wrap' },
})
