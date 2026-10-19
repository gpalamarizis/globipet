import { useEffect, useState } from 'react'
import { View, Text, Alert, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../src/lib/api'
import { Screen, Card, Button, Input, Loading } from '@/components/ui'
import { Chips } from '@/components/Chips'
import { SwitchRow } from '@/components/SwitchRow'
import { colors, space, type } from '@/theme'

/**
 * Νέα καμπάνια ή επεξεργασία — ίδια πεδία και ίδιοι έλεγχοι με το web
 * (τίτλος, περιγραφή, έκπτωση %/€ ή καμία, ελάχιστο ποσό, έναρξη/λήξη,
 * προτεραιότητα, ενεργή). Μετά τη δημιουργία ανοίγουν οι ρυθμίσεις.
 */
const day = (d: Date) => d.toISOString().slice(0, 10)
const validDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime())

export default function CampaignFormScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const isNew = !id

  const { data: existing, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => api.get(`/campaigns/${id}`).then(r => r.data?.data),
    enabled: !isNew,
  })

  const [form, setForm] = useState({
    title: '', description: '', discount_type: '' as '' | 'percent' | 'amount', discount_value: '',
    min_order: '', starts_at: day(new Date()), ends_at: day(new Date(Date.now() + 30 * 864e5)),
    boost: '0', is_active: true,
  })
  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!existing) return
    setForm({
      title: existing.title ?? '', description: existing.description ?? '',
      discount_type: existing.discount_type ?? '',
      discount_value: existing.discount_value != null ? String(existing.discount_value) : '',
      min_order: existing.min_order != null ? String(existing.min_order) : '',
      starts_at: String(existing.starts_at).slice(0, 10), ends_at: String(existing.ends_at).slice(0, 10),
      boost: String(existing.boost ?? 0), is_active: !!existing.is_active,
    })
  }, [existing?.id])

  const validate = (): string | null => {
    if (!form.title.trim()) return t('providerMkt.errTitleRequired')
    if (!validDay(form.starts_at) || !validDay(form.ends_at) || new Date(form.ends_at) <= new Date(form.starts_at)) {
      return t('providerMkt.errEndBeforeStart')
    }
    const hasType = !!form.discount_type, hasValue = form.discount_value.trim() !== ''
    if (hasType !== hasValue) return t('providerMkt.errDiscountPair')
    if (hasType) {
      const v = Number(form.discount_value.replace(',', '.'))
      if (!(v > 0)) return t('providerMkt.errDiscountPair')
      if (form.discount_type === 'percent' && v > 100) return t('providerMkt.errPercentMax')
    }
    return null
  }

  const body = () => ({
    title: form.title.trim(),
    description: form.description.trim() || null,
    discount_type: form.discount_type || null,
    discount_value: form.discount_type ? Number(form.discount_value.replace(',', '.')) : null,
    min_order: form.min_order.trim() ? Number(form.min_order.replace(',', '.')) : null,
    starts_at: form.starts_at, ends_at: form.ends_at,
    boost: parseInt(form.boost, 10) || 0, is_active: form.is_active,
  })

  const save = useMutation({
    mutationFn: () => isNew ? api.post('/campaigns', body()) : api.patch(`/campaigns/${id}`, body()),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ['my-campaigns'] })
      qc.invalidateQueries({ queryKey: ['campaign', id] })
      Alert.alert(isNew ? t('providerMkt.created') : t('providerMkt.saved'))
      const newId = r?.data?.data?.id
      if (isNew && newId) router.replace({ pathname: '/(provider)/campaign-settings', params: { id: newId } } as any)
      else router.back()
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('providerMkt.errSave')),
  })
  const remove = useMutation({
    mutationFn: () => api.delete(`/campaigns/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-campaigns'] }); Alert.alert(t('providerMkt.deleted')); router.back() },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('providerMkt.errDelete')),
  })

  const submit = () => {
    const err = validate()
    if (err) { Alert.alert(t('common.error'), err); return }
    save.mutate()
  }

  if (!isNew && (isLoading || !existing)) return (
    <Screen title={t('providerMkt.editCampaign')} back><Loading /></Screen>
  )

  return (
    <Screen title={isNew ? t('providerMkt.newCampaign') : t('providerMkt.editCampaign')} back>
      <Card>
        <Input label={t('providerMkt.fTitleReq')} value={form.title} onChangeText={v => set('title', v)}
          placeholder={t('providerMkt.phTitle')} />
        <Input label={t('providerMkt.fDescription')} value={form.description} onChangeText={v => set('description', v)} multiline />

        <Chips label={t('providerMkt.fDiscount')} value={form.discount_type} onChange={v => set('discount_type', v)}
          options={[
            { value: '' as const, label: t('providerMkt.none') },
            { value: 'percent' as const, label: t('providerMkt.fPercentPct') },
            { value: 'amount' as const, label: t('providerMkt.fAmountEur') },
          ]} />
        {/* Ποσό και ελάχιστη παραγγελία δίπλα-δίπλα, ίσου πλάτους. */}
        <View style={s.row}>
          <View style={s.col}>
            <Input label={form.discount_type === 'amount' ? t('providerMkt.fEuro') : t('providerMkt.fPercent')}
              value={form.discount_value} onChangeText={v => set('discount_value', v)}
              keyboardType="decimal-pad" editable={!!form.discount_type} />
          </View>
          <View style={s.col}>
            <Input label={t('providerMkt.fMinAmount')} value={form.min_order} onChangeText={v => set('min_order', v)}
              keyboardType="decimal-pad" placeholder="—" />
          </View>
        </View>
        <Text style={s.hint}>{t('providerMkt.noDiscountHint')}</Text>

        <View style={s.row}>
          <View style={s.col}>
            <Input label={t('providerMkt.fStart')} value={form.starts_at} onChangeText={v => set('starts_at', v)}
              placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
          </View>
          <View style={s.col}>
            <Input label={t('providerMkt.fEnd')} value={form.ends_at} onChangeText={v => set('ends_at', v)}
              placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
          </View>
        </View>

        <Input label={t('providerMkt.fPriority')} value={form.boost}
          onChangeText={v => set('boost', String(Math.min(100, Number(v.replace(/[^0-9]/g, '')) || 0)))} keyboardType="number-pad"
          hint={t('providerMkt.priorityHint')} />
        <SwitchRow label={t('providerMkt.active')} value={form.is_active} onChange={v => set('is_active', v)} />

        <Button full label={save.isPending ? t('providerMkt.saving') : (isNew ? t('providerMkt.create') : t('providerMkt.save'))}
          loading={save.isPending} disabled={save.isPending} onPress={submit} />
        {!isNew && (
          <Button full variant="danger" label={t('providerPkg.delete')} loading={remove.isPending} style={{ marginTop: space.sm }}
            onPress={() => Alert.alert(t('providerMkt.confirmDelete', { name: form.title }), '', [
              { text: t('providerMkt.cancel'), style: 'cancel' },
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
  hint: { ...type.caption, color: colors.textLight, marginTop: -space.sm, marginBottom: space.md },
})
