import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, Switch, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { Screen, Card, Badge, EmptyState, SkeletonRows } from '@/components/ui'
import { colors, space, type, weight } from '@/theme'

/** Τα προϊόντα του παρόχου: διαθεσιμότητα με διακόπτη, απόθεμα με μια ματιά. */
export default function ProviderProducts() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['provider-products'],
    queryFn: () => api.get('/products/my').then(r => r.data?.data ?? r.data ?? []),
  })

  const toggle = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch(`/products/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['provider-products'] }),
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('providerDash.errAvailability')),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await qc.invalidateQueries({ queryKey: ['provider-products'] }); setRefreshing(false)
  }, [qc])

  return (
    <Screen title={t('providerTabs.products')} onRefresh={onRefresh} refreshing={refreshing}>
      {isLoading ? <SkeletonRows count={3} /> :
       products.length === 0 ? <EmptyState icon={Package} title={t('providerDash.noProducts')} message={t('providerMobile.manageOnWeb')} /> :
       products.map((p: any) => (
        <Card key={p.id}>
          <View style={s.row}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.title} numberOfLines={1}>{p.name}</Text>
              <Text style={s.meta} numberOfLines={1}>{p.category}</Text>
              <View style={s.badges}>
                <Badge label={`€${Number(p.price ?? 0).toFixed(2)}`} tone="neutral" />
                <Badge
                  label={`${t('providerDash.stock')}: ${p.stock ?? '—'}`}
                  tone={(p.stock ?? 0) > 0 ? 'success' : 'danger'} />
              </View>
            </View>
            <Switch
              value={!!p.is_active}
              onValueChange={v => toggle.mutate({ id: p.id, is_active: v })}
              trackColor={{ true: colors.brand, false: colors.border }}
              thumbColor={colors.surface}
            />
          </View>
        </Card>
      ))}
      {products.length > 0 && <Text style={s.hint}>{t('providerMobile.manageOnWeb')}</Text>}
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
