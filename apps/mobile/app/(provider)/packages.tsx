import { useCallback, useMemo, useState } from 'react'
import { View, Text, StyleSheet, Switch, Alert, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layers, Plus, BookOpen } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { Screen, Card, Badge, Button, EmptyState, Loading } from '@/components/ui'
import { GROUP_KEYS } from '@/components/packageOptions'
import { colors, space, type, weight } from '@/theme'

/**
 * Πακέτα μιας υπηρεσίας — αντίστοιχο της σελίδας /provider/packages του web.
 *
 * Ο πελάτης ΠΡΕΠΕΙ να διαλέξει πακέτο όπου υπάρχουν, άρα ο πάροχος πρέπει να
 * μπορεί να τα διαχειρίζεται από όπου κι αν είναι: νέο πακέτο, επεξεργασία,
 * διαγραφή, ενεργό/ανενεργό, και φόρτωση από τον κατάλογο. Πακέτα χωρίς τιμή
 * δεν εμφανίζονται στους πελάτες — επισημαίνονται.
 */
export default function PackagesScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>()
  const [refreshing, setRefreshing] = useState(false)

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['provider-packages'],
    queryFn: () => api.get('/packages/my').then(r => r.data?.data ?? []),
  })
  const service = services.find((s: any) => s.id === serviceId)
  const pkgs: any[] = service?.packages ?? []

  const groups = useMemo(() => {
    const by: Record<string, any[]> = {}
    for (const p of pkgs) (by[p.group || 'other'] ??= []).push(p)
    return Object.entries(by)
  }, [pkgs])

  const toggle = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => api.patch(`/packages/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['provider-packages'] }),
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('providerPkg.error')),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await qc.invalidateQueries({ queryKey: ['provider-packages'] }); setRefreshing(false)
  }, [qc])

  if (isLoading) return <Screen title={t('providerPkg.title')} back><Loading /></Screen>

  const noPrice = pkgs.filter(p => !(p.price > 0)).length
  const groupLabel = (g: string) => t(GROUP_KEYS[g] ?? GROUP_KEYS.other)

  return (
    <Screen title={t('providerPkg.title')} subtitle={service?.title} back onRefresh={onRefresh} refreshing={refreshing}>
      <View style={s.topActions}>
        <Button label={t('providerPkg.newPackage')} icon={<Plus size={16} color={colors.textOnDark} />}
          style={{ flex: 1 }}
          onPress={() => router.push({ pathname: '/(provider)/package-form', params: { serviceId } } as any)} />
        <Button variant="secondary" label={t('providerPkg.catalog')} icon={<BookOpen size={16} color={colors.text} />}
          style={{ flex: 1 }}
          onPress={() => router.push({ pathname: '/(provider)/package-catalog', params: { serviceId } } as any)} />
      </View>

      {noPrice > 0 && <Text style={s.warn}>{t('providerPkg.noPriceWarn', { count: noPrice })}</Text>}

      {pkgs.length === 0 ? <EmptyState icon={Layers} title={t('providerPkg.noPackages')} /> :
       groups.map(([group, items]) => (
        <View key={group}>
          <Text style={s.group}>{groupLabel(group)}</Text>
          {items.map(p => (
            <Card key={p.id} onPress={() => router.push({ pathname: '/(provider)/package-form', params: { serviceId, id: p.id } } as any)}>
              <View style={s.row}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.name} numberOfLines={2}>{p.name}</Text>
                  <View style={s.badges}>
                    {p.price > 0
                      ? <Badge label={`€${Number(p.price).toFixed(2)}`} tone="brand" />
                      : <Badge label={t('providerPkg.noPrice')} tone="warning" />}
                    <Badge label={`${p.duration_minutes ?? 60}′`} tone="neutral" />
                    {!!p.size && <Badge label={t(`providerPkg.sz${p.size === 'xlarge' ? 'XLarge' : p.size.charAt(0).toUpperCase() + p.size.slice(1)}`)} tone="neutral" />}
                    {!!p.pet_type && <Badge label={t(p.pet_type === 'cat' ? 'providerPkg.petCat' : 'providerPkg.petDog')} tone="neutral" />}
                    {p.is_addon && <Badge label="Add-on" tone="info" />}
                  </View>
                </View>
                <Switch value={!!p.is_active} onValueChange={v => toggle.mutate({ id: p.id, is_active: v })}
                  trackColor={{ true: colors.brand, false: colors.border }} thumbColor={colors.surface} />
              </View>
            </Card>
          ))}
        </View>
      ))}
    </Screen>
  )
}

const s = StyleSheet.create({
  topActions: { flexDirection: 'row', gap: space.sm, marginBottom: space.md },
  warn: { ...type.caption, color: colors.warning, fontWeight: weight.semibold, marginBottom: space.md },
  group: { ...type.caption, color: colors.textMuted, fontWeight: weight.bold, textTransform: 'uppercase', marginTop: space.sm, marginBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  name: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  badges: { flexDirection: 'row', gap: space.xs, marginTop: space.xs, flexWrap: 'wrap' },
})
