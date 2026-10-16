import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, Switch, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Users, Plus } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { Screen, Card, Badge, EmptyState, SkeletonRows, Button } from '@/components/ui'
import { colors, space, type, weight } from '@/theme'

/**
 * Το προσωπικό του παρόχου: ποιος είναι ενεργός σήμερα.
 *
 * Ο διακόπτης είναι το χρήσιμο εργαλείο από κινητό: γιατρός που αρρώστησε
 * βγαίνει εκτός με ένα άγγιγμα, και οι πελάτες δεν τον βλέπουν πια στην
 * επιλογή. Η προσθήκη νέου μέλους με πλήρη στοιχεία μένει στο web.
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

  const toggle = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch(`/staff/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['provider-staff-all'] }),
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.error')),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await qc.invalidateQueries({ queryKey: ['provider-staff-all'] }); setRefreshing(false)
  }, [qc])

  return (
    <Screen title={t('providerTabs.staff')} onRefresh={onRefresh} refreshing={refreshing}>
      <Button
        label={t('providerStaffNew.title')}
        icon={<Plus size={18} color={colors.textOnDark} />}
        onPress={() => router.push('/(provider)/new-staff' as any)}
        full
        style={{ marginBottom: space.md }}
      />
      {isLoading ? <SkeletonRows count={3} /> :
       staff.length === 0 ? <EmptyState icon={Users} title={t('providerStaff.empty')} message={t('providerMobile.manageOnWeb')} /> :
       staff.map((m: any) => (
        <Card key={m.id}>
          <View style={s.row}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.title} numberOfLines={1}>{m.full_name}</Text>
              {!!m.role && <Text style={s.meta} numberOfLines={1}>{m.role}</Text>}
              {!!m.service?.title && <Badge label={m.service.title} tone="neutral" />}
            </View>
            <Switch
              value={!!m.is_active}
              onValueChange={v => toggle.mutate({ id: m.id, is_active: v })}
              trackColor={{ true: colors.brand, false: colors.border }}
              thumbColor={colors.surface}
            />
          </View>
        </Card>
      ))}
      {staff.length > 0 && <Text style={s.hint}>{t('providerMobile.manageOnWeb')}</Text>}
    </Screen>
  )
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  meta: { ...type.caption, color: colors.textLight, marginBottom: space.xs },
  hint: { ...type.caption, color: colors.textLight, textAlign: 'center', marginTop: space.md },
})
