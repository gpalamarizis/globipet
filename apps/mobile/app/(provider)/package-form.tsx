import { useEffect, useState } from 'react'
import { View, Alert, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../src/lib/api'
import { Screen, Card, Button, Input, Loading } from '@/components/ui'
import { Chips } from '@/components/Chips'
import { SwitchRow } from '@/components/SwitchRow'
import { GROUP_KEYS, SIZE_OPTIONS, PET_OPTIONS, MODALITY_OPTIONS } from '@/components/packageOptions'
import { space } from '@/theme'

/**
 * Νέο ή υπάρχον πακέτο — ίδια πεδία με το «Νέο πακέτο» του web
 * (POST /packages, PATCH/DELETE /packages/:id).
 */
export default function PackageFormScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { serviceId, id } = useLocalSearchParams<{ serviceId: string; id?: string }>()
  const isNew = !id

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['provider-packages'],
    queryFn: () => api.get('/packages/my').then(r => r.data?.data ?? []),
  })
  const existing = services.find((s: any) => s.id === serviceId)?.packages?.find((p: any) => p.id === id)

  const [form, setForm] = useState({
    group: 'service', name: '', description: '', size: '', pet_type: '', modality: '',
    price: '', duration_minutes: '60', is_addon: false, is_active: true,
  })
  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!existing) return
    setForm({
      group: existing.group || 'other', name: existing.name ?? '', description: existing.description ?? '',
      size: existing.size ?? '', pet_type: existing.pet_type ?? '', modality: existing.modality ?? '',
      price: existing.price != null ? String(existing.price) : '',
      duration_minutes: String(existing.duration_minutes ?? 60),
      is_addon: !!existing.is_addon, is_active: existing.is_active !== false,
    })
  }, [existing?.id])

  const price = parseFloat(form.price.replace(',', '.'))
  const valid = form.name.trim().length > 0 && Number.isFinite(price) && price >= 0

  const payload = () => ({
    service_id: serviceId,
    group: form.group, name: form.name.trim(), description: form.description.trim() || null,
    size: form.size || null, pet_type: form.pet_type || null, modality: form.modality || null,
    price, duration_minutes: parseInt(form.duration_minutes, 10) || 60,
    is_addon: form.is_addon, is_active: form.is_active,
  })

  const done = (msgKey: string) => {
    qc.invalidateQueries({ queryKey: ['provider-packages'] })
    Alert.alert(t(msgKey))
    router.back()
  }

  const save = useMutation({
    mutationFn: () => isNew ? api.post('/packages', payload()) : api.patch(`/packages/${id}`, payload()),
    onSuccess: () => done(isNew ? 'providerPkg.pkgAdded' : 'providerPkg.pkgUpdated'),
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('providerPkg.error')),
  })
  const remove = useMutation({
    mutationFn: () => api.delete(`/packages/${id}`),
    onSuccess: () => done('providerPkg.pkgDeleted'),
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('providerPkg.error')),
  })

  if (!isNew && (isLoading || !existing)) return (
    <Screen title={t('providerPkg.editPackage')} back><Loading /></Screen>
  )

  const opts = (list: { value: string; key: string }[]) => list.map(o => ({ value: o.value, label: t(o.key) }))

  return (
    <Screen title={isNew ? t('providerPkg.newPackage') : t('providerPkg.editPackage')} back>
      <Card>
        <Chips label={t('providerPkg.fCategory')} value={form.group} onChange={v => set('group', v)}
          options={Object.entries(GROUP_KEYS).map(([value, key]) => ({ value, label: t(key) }))} />
        <Input label={t('providerPkg.fName')} value={form.name} onChangeText={v => set('name', v)} />
        <Input label={t('providerPkg.fDescription')} value={form.description} onChangeText={v => set('description', v)} multiline />

        {/* Τιμή και διάρκεια δίπλα-δίπλα, ίσου πλάτους. */}
        <View style={s.row}>
          <View style={s.col}>
            <Input label={t('providerPkg.fPrice')} value={form.price} onChangeText={v => set('price', v)}
              keyboardType="decimal-pad" placeholder="0.00" />
          </View>
          <View style={s.col}>
            <Input label={t('providerPkg.fDuration')} value={form.duration_minutes}
              onChangeText={v => set('duration_minutes', v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
          </View>
        </View>

        <Chips label={t('providerPkg.fSize')} value={form.size} onChange={v => set('size', v)} options={opts(SIZE_OPTIONS)} />
        <Chips label={t('providerPkg.fPetType')} value={form.pet_type} onChange={v => set('pet_type', v)} options={opts(PET_OPTIONS)} />
        <Chips label={t('providerPkg.fModality')} value={form.modality} onChange={v => set('modality', v)} options={opts(MODALITY_OPTIONS)} />

        <SwitchRow label="Add-on" value={form.is_addon} onChange={v => set('is_addon', v)} />
        <SwitchRow label={t('providerPkg.fActiveN')} value={form.is_active} onChange={v => set('is_active', v)} />

        <Button full label={save.isPending ? t('providerPkg.saving') : (isNew ? t('providerPkg.add') : t('providerPkg.update'))}
          loading={save.isPending} disabled={!valid || save.isPending} onPress={() => save.mutate()} />
        {!isNew && (
          <Button full variant="danger" label={t('providerPkg.delete')} loading={remove.isPending}
            style={{ marginTop: space.sm }}
            onPress={() => Alert.alert(t('providerPkg.confirmDeletePkg', { name: form.name }), '', [
              { text: t('providerPkg.cancel'), style: 'cancel' },
              { text: t('providerPkg.delete'), style: 'destructive', onPress: () => remove.mutate() },
            ])} />
        )}
      </Card>
    </Screen>
  )
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md },
  col: { flex: 1 },
})
