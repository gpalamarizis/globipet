import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, Switch, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Scissors, Plus } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { Screen, Card, Badge, EmptyState, SkeletonRows, Button } from '@/components/ui'
import { colors, space, type, weight } from '@/theme'

/**
 * Οι υπηρεσίες του παρόχου: ενεργοποίηση/απενεργοποίηση με διακόπτη.
 *
 * Δεν υπάρχει διαγραφή εδώ, επίτηδες: υπηρεσία με κρατήσεις δεν σβήνεται,
 * και ο σωστός τρόπος να «σταματήσει» μια υπηρεσία είναι η απενεργοποίηση.
 * Η δημιουργία και η επεξεργασία με πακέτα μένει στο web — είναι δουλειά
 * γραφείου με πολλά πεδία, όχι κάτι που γίνεται σε οθόνη έξι ιντσών.
 */
export default function ProviderServices() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['provider-services'],
    queryFn: () => api.get('/services/my').then(r => r.data?.data ?? r.data ?? []),
  })

  const toggle = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch(`/services/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['provider-services'] }),
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('providerDash.errAvailability')),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await qc.invalidateQueries({ queryKey: ['provider-services'] }); setRefreshing(false)
  }, [qc])

  return (
    <Screen title={t('providerTabs.services')} onRefresh={onRefresh} refreshing={refreshing}>
      <Button
        label={t('providerNew.title')}
        icon={<Plus size={18} color={colors.textOnDark} />}
        onPress={() => router.push('/(provider)/new-service' as any)}
        full
        style={{ marginBottom: space.md }}
      />
      {isLoading ? <SkeletonRows count={3} /> :
       services.length === 0 ? <EmptyState icon={Scissors} title={t('providerDash.noServices')} message={t('providerMobile.manageOnWeb')} /> :
       services.map((sv: any) => (
        <Card key={sv.id}>
          <View style={s.row}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.title} numberOfLines={1}>{sv.title || sv.provider_name}</Text>
              <Text style={s.meta} numberOfLines={1}>
                {String(t(`services.categories.${sv.service_type}`, { defaultValue: sv.service_type }))}{sv.city ? ` · ${sv.city}` : ''}
              </Text>
              <View style={s.badges}>
                <Badge label={`€${Number(sv.price ?? 0).toFixed(2)}`} tone="neutral" />
                {sv.is_verified && <Badge label={t('ver.approved')} tone="success" />}
              </View>
            </View>
            <Switch
              value={!!sv.is_active}
              onValueChange={v => toggle.mutate({ id: sv.id, is_active: v })}
              trackColor={{ true: colors.brand, false: colors.border }}
              thumbColor={colors.surface}
            />
          </View>
        </Card>
      ))}
      {services.length > 0 && <Text style={s.hint}>{t('providerMobile.manageOnWeb')}</Text>}
    </Screen>
  )
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  meta: { ...type.caption, color: colors.textLight },
  badges: { flexDirection: 'row', gap: space.xs, marginTop: space.xs, flexWrap: 'wrap' },
  hint: { ...type.caption, color: colors.textLight, textAlign: 'center', marginTop: space.md },
})
