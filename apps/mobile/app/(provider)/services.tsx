import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, Switch, Alert, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Scissors, Plus, Pencil, Layers } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { Screen, Card, Badge, EmptyState, SkeletonRows, Button } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Οι υπηρεσίες του παρόχου — ίδιες δυνατότητες με το web:
 * ενεργοποίηση/απενεργοποίηση, επεξεργασία, διαγραφή (από την οθόνη
 * επεξεργασίας) και διαχείριση πακέτων.
 *
 * Η λίστα έρχεται από το /packages/my, που επιστρέφει τις υπηρεσίες ΜΑΖΙ με
 * τα πακέτα τους — έτσι φαίνεται ο αριθμός πακέτων και όσα δεν έχουν τιμή,
 * που δεν εμφανίζονται στους πελάτες.
 */
export default function ProviderServices() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['provider-packages'],
    queryFn: () => api.get('/packages/my').then(r => r.data?.data ?? []),
  })

  const toggle = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch(`/packages/services/${id}`, { is_active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provider-packages'] })
      qc.invalidateQueries({ queryKey: ['provider-services'] })
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('providerDash.errAvailability')),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await qc.invalidateQueries({ queryKey: ['provider-packages'] }); setRefreshing(false)
  }, [qc])

  return (
    <Screen title={t('providerTabs.services')} onRefresh={onRefresh} refreshing={refreshing}>
      <Button label={t('providerNew.title')} icon={<Plus size={18} color={colors.textOnDark} />}
        onPress={() => router.push('/(provider)/new-service' as any)} full style={{ marginBottom: space.md }} />

      {isLoading ? <SkeletonRows count={3} /> :
       services.length === 0 ? <EmptyState icon={Scissors} title={t('providerDash.noServices')} /> :
       services.map((sv: any) => {
        const pkgs: any[] = sv.packages ?? []
        const noPrice = pkgs.filter(p => !(p.price > 0)).length
        return (
          <Card key={sv.id}>
            <View style={s.row}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.title} numberOfLines={1}>{sv.title || sv.provider_name}</Text>
                <Text style={s.meta} numberOfLines={1}>
                  {String(t(`services.categories.${sv.service_type}`, { defaultValue: sv.service_type }))}{sv.city ? ` · ${sv.city}` : ''}
                </Text>
                <View style={s.badges}>
                  <Badge label={t('providerPkg.pkgCount', { count: pkgs.length })} tone="neutral" />
                  {noPrice > 0 && <Badge label={t('providerPkg.noPriceShort', { count: noPrice })} tone="warning" />}
                  {sv.is_verified && <Badge label={t('ver.approved')} tone="success" />}
                </View>
              </View>
              <Switch value={!!sv.is_active}
                onValueChange={v => toggle.mutate({ id: sv.id, is_active: v })}
                trackColor={{ true: colors.brand, false: colors.border }} thumbColor={colors.surface} />
            </View>

            {/* Δύο ενέργειες ίσου πλάτους κάτω από τα στοιχεία. */}
            <View style={s.actions}>
              <TouchableOpacity style={s.action} activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/(provider)/service-form', params: { id: sv.id } } as any)}>
                <Pencil size={icon.sm} color={colors.brand} />
                <Text style={s.actionTxt}>{t('providerPkg.edit')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.action} activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/(provider)/packages', params: { serviceId: sv.id } } as any)}>
                <Layers size={icon.sm} color={colors.brand} />
                <Text style={s.actionTxt}>{t('providerPkg.title')}</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )
      })}
    </Screen>
  )
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  meta: { ...type.caption, color: colors.textLight },
  badges: { flexDirection: 'row', gap: space.xs, marginTop: space.xs, flexWrap: 'wrap' },
  actions: {
    flexDirection: 'row', gap: space.sm, marginTop: space.md, paddingTop: space.md,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  action: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs,
    minHeight: 40, borderRadius: radius.md, backgroundColor: colors.brandLight,
  },
  actionTxt: { ...type.caption, color: colors.brand, fontWeight: weight.bold },
})
