import { useMemo, useState } from 'react'
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { Screen, Card, Button, EmptyState, SkeletonRows } from '@/components/ui'
import { GROUP_KEYS } from '@/components/packageOptions'
import { colors, space, radius, type, weight } from '@/theme'

/**
 * Φόρτωση πακέτων από τον κατάλογο — αντίστοιχο του «Φόρτωση από κατάλογο»
 * του web. Ο πάροχος βάζει τιμή σε όσα θέλει· ό,τι έχει τιμή εισάγεται με
 * ΜΙΑ κλήση (POST /packages/bulk). Ό,τι υπάρχει ήδη με το ίδιο όνομα
 * κρύβεται, ώστε να μη δημιουργούνται διπλά.
 */
export default function PackageCatalogScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>()
  const [prices, setPrices] = useState<Record<string, string>>({})

  const { data: services = [] } = useQuery({
    queryKey: ['provider-packages'],
    queryFn: () => api.get('/packages/my').then(r => r.data?.data ?? []),
  })
  const service = services.find((s: any) => s.id === serviceId)
  const category = service?.category || service?.service_type

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['catalog-preset', category],
    queryFn: () => api.get(`/catalog/preset/${category}`).then(r => r.data?.data ?? []),
    enabled: !!category,
  })

  const groups = useMemo(() => {
    const have = new Set((service?.packages ?? []).map((p: any) => String(p.name).toLowerCase()))
    const by: Record<string, any[]> = {}
    for (const tpl of templates) {
      if (have.has(String(tpl.name).toLowerCase())) continue
      ;(by[tpl.group || 'other'] ??= []).push(tpl)
    }
    return Object.entries(by)
  }, [templates, service])

  const chosen = Object.entries(prices)
    .map(([template_id, v]) => ({ template_id, price: parseFloat(v.replace(',', '.')) }))
    .filter(c => Number.isFinite(c.price) && c.price > 0)

  const importMut = useMutation({
    mutationFn: () => api.post('/packages/bulk', { service_id: serviceId, packages_with_prices: chosen }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['provider-packages'] })
      Alert.alert(t('providerPkg.pkgsAdded', { count: r.data?.count ?? chosen.length }))
      router.back()
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('providerPkg.errImport')),
  })

  return (
    <Screen title={t('providerPkg.loadFromCatalog')} subtitle={service?.title} back>
      <Text style={s.intro}>{t('providerPkg.selectServices')}</Text>

      {isLoading ? <SkeletonRows count={4} /> :
       groups.length === 0 ? <EmptyState icon={BookOpen} title={t('providerPkg.noServicesFound')} /> :
       groups.map(([group, items]) => (
        <View key={group}>
          <Text style={s.group}>{t(GROUP_KEYS[group] ?? GROUP_KEYS.other)}</Text>
          {items.map(tpl => (
            <Card key={tpl.id}>
              {/* Όνομα αριστερά, πεδίο τιμής δεξιά με σταθερό πλάτος —
                  όλα τα πεδία στοιχίζονται στην ίδια στήλη. */}
              <View style={s.row}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.name} numberOfLines={2}>{tpl.name}</Text>
                  <Text style={s.meta}>{tpl.duration_minutes ?? 60}′{tpl.is_addon ? ' · Add-on' : ''}</Text>
                </View>
                <View style={s.priceBox}>
                  <Text style={s.euro}>€</Text>
                  <TextInput style={s.priceInput} value={prices[tpl.id] ?? ''}
                    onChangeText={v => setPrices(p => ({ ...p, [tpl.id]: v }))}
                    keyboardType="decimal-pad" placeholder="—" placeholderTextColor={colors.textLight} />
                </View>
              </View>
            </Card>
          ))}
        </View>
      ))}

      {groups.length > 0 && (
        <Button full style={{ marginTop: space.md }}
          label={importMut.isPending ? t('providerPkg.importing') : t('providerPkg.importCount', { count: chosen.length })}
          loading={importMut.isPending} disabled={chosen.length === 0 || importMut.isPending}
          onPress={() => importMut.mutate()} />
      )}
    </Screen>
  )
}

const s = StyleSheet.create({
  intro: { ...type.body, color: colors.textMuted, marginBottom: space.md },
  group: { ...type.caption, color: colors.textMuted, fontWeight: weight.bold, textTransform: 'uppercase', marginTop: space.sm, marginBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  name: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  meta: { ...type.caption, color: colors.textLight },
  priceBox: {
    width: 96, height: 44, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space.sm,
    backgroundColor: colors.surface,
  },
  euro: { ...type.body, color: colors.textMuted, marginRight: 4 },
  priceInput: { flex: 1, ...type.body, color: colors.text, padding: 0, textAlign: 'right' },
})
