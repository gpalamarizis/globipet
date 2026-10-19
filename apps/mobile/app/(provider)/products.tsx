import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, Image } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Package, Plus, ChevronRight } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { Screen, Card, Badge, EmptyState, SkeletonRows, Button } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Τα προϊόντα του παρόχου. Πάτημα → επεξεργασία (τιμή, απόθεμα, φωτογραφία,
 * διαγραφή).
 *
 * Ο διακόπτης «ενεργό» αφαιρέθηκε: έστελνε is_active, πεδίο που ΔΕΝ υπάρχει
 * στο προϊόν, οπότε κάθε πάτημα αποτύγχανε. Η διαθεσιμότητα ενός προϊόντος
 * είναι το απόθεμά του — μηδενικό απόθεμα σημαίνει «εξαντλήθηκε».
 */
export default function ProviderProducts() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['provider-products'],
    queryFn: () => api.get('/products/my').then(r => r.data?.data ?? r.data ?? []),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await qc.invalidateQueries({ queryKey: ['provider-products'] }); setRefreshing(false)
  }, [qc])

  return (
    <Screen title={t('providerTabs.products')} onRefresh={onRefresh} refreshing={refreshing}>
      <Button label={t('providerDash.newProduct')} icon={<Plus size={18} color={colors.textOnDark} />}
        full style={{ marginBottom: space.md }} onPress={() => router.push('/(provider)/product-form' as any)} />

      {isLoading ? <SkeletonRows count={3} /> :
       products.length === 0 ? <EmptyState icon={Package} title={t('providerDash.noProducts')} /> :
       products.map((p: any) => {
        const img = p.image_url || p.images?.[0]
        return (
          <Card key={p.id} onPress={() => router.push({ pathname: '/(provider)/product-form', params: { id: p.id } } as any)}>
            <View style={s.row}>
              {img
                ? <Image source={{ uri: img }} style={s.thumb} />
                : <View style={[s.thumb, s.thumbEmpty]}><Package size={icon.md} color={colors.textLight} /></View>}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.title} numberOfLines={1}>{p.name}</Text>
                <Text style={s.meta} numberOfLines={1}>
                  {String(t(`marketplace.categories.${p.category}`, { defaultValue: p.category }))}
                </Text>
                <View style={s.badges}>
                  <Badge label={`€${Number(p.sale_price ?? p.price ?? 0).toFixed(2)}`} tone="neutral" />
                  <Badge label={`${t('providerDash.stock')}: ${p.stock ?? 0}`}
                    tone={(p.stock ?? 0) === 0 ? 'danger' : (p.stock ?? 0) <= 5 ? 'warning' : 'success'} />
                </View>
              </View>
              <ChevronRight size={icon.sm} color={colors.textLight} />
            </View>
          </Card>
        )
      })}
    </Screen>
  )
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  thumb: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  title: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  meta: { ...type.caption, color: colors.textLight },
  badges: { flexDirection: 'row', gap: space.xs, marginTop: space.xs, flexWrap: 'wrap' },
})
