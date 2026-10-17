import { useCallback, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BarChart3, TrendingUp, Eye } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { Screen, Card, EmptyState, SkeletonRows } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Στατιστικά αγοράς.
 *
 * Χωρίς γραφήματα επίτηδες: σε οθόνη κινητού μια μπάρα πλάτους 40 pixel δεν
 * λέει τίποτα. Αντ' αυτού κατάταξη με αριθμούς και ποσοστιαίες μπάρες, που
 * διαβάζονται με μια ματιά και δεν χρειάζονται βιβλιοθήκη.
 */
export default function ProviderInsights() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  const { data: popular = [], isLoading } = useQuery({
    queryKey: ['insights-popular'],
    queryFn: () => api.get('/insights/popular').then(r => r.data?.data ?? r.data ?? []),
  })
  const { data: categories = [] } = useQuery({
    queryKey: ['insights-categories'],
    queryFn: () => api.get('/insights/shop/categories').then(r => r.data?.data ?? r.data ?? []),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['insights-popular'] })
    await qc.invalidateQueries({ queryKey: ['insights-categories'] })
    setRefreshing(false)
  }, [qc])

  // Η μπάρα δείχνει αναλογία προς τον πρώτο, όχι απόλυτο μέγεθος: αλλιώς
  // με έναν κυρίαρχο όρο όλοι οι υπόλοιποι γίνονται αόρατοι.
  const maxPopular = Math.max(1, ...popular.map((p: any) => p.count ?? 0))
  const maxCat = Math.max(1, ...categories.map((c: any) => c.count ?? 0))

  const Row = ({ label, value, ratio, tint }: any) => (
    <View style={s.row}>
      <View style={s.rowTop}>
        <Text style={s.rowLabel} numberOfLines={1}>{label}</Text>
        <Text style={s.rowValue}>{value}</Text>
      </View>
      <View style={s.track}>
        <View style={[s.fill, { width: `${Math.max(4, ratio * 100)}%`, backgroundColor: tint }]} />
      </View>
    </View>
  )

  return (
    <Screen title={t('providerTabs.insights')} onRefresh={onRefresh} refreshing={refreshing}>
      {isLoading ? <SkeletonRows count={5} /> : (
        <>
          <Card>
            <View style={s.head}>
              <TrendingUp size={icon.sm} color={colors.brand} />
              <Text style={s.title}>{t('providerInsights.popularSearches')}</Text>
            </View>
            {popular.length === 0
              ? <Text style={s.empty}>{t('providerInsights.noData')}</Text>
              : popular.slice(0, 8).map((p: any, i: number) => (
                  <Row key={p.term ?? i} label={p.term} value={p.count}
                    ratio={(p.count ?? 0) / maxPopular} tint={colors.brand} />
                ))}
          </Card>

          <Card>
            <View style={s.head}>
              <Eye size={icon.sm} color={colors.info} />
              <Text style={s.title}>{t('providerInsights.shopCategories')}</Text>
            </View>
            {categories.length === 0
              ? <Text style={s.empty}>{t('providerInsights.noData')}</Text>
              : categories.slice(0, 8).map((c: any, i: number) => (
                  <Row key={c.category ?? i}
                    label={t(`marketplace.categories.${c.category}`, { defaultValue: c.category })}
                    value={c.count} ratio={(c.count ?? 0) / maxCat} tint={colors.info} />
                ))}
          </Card>

          {popular.length === 0 && categories.length === 0 && (
            <EmptyState icon={BarChart3} title={t('providerInsights.noData')}
              message={t('providerInsights.noDataHint')} />
          )}
        </>
      )}
    </Screen>
  )
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: space.md },
  title: { ...type.emphasis, color: colors.text },
  empty: { ...type.caption, color: colors.textLight },
  row: { marginBottom: space.md },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm, marginBottom: space.xs },
  rowLabel: { ...type.body, color: colors.text, flex: 1 },
  rowValue: { ...type.body, color: colors.textMuted, fontWeight: weight.bold },
  track: { height: 6, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  fill: { height: 6, borderRadius: radius.full },
})
