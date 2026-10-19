import { useEffect, useState } from 'react'
import { Text, StyleSheet, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../src/lib/api'
import { Screen, Card, Button, Input, Loading } from '@/components/ui'
import { Chips } from '@/components/Chips'
import { SwitchRow } from '@/components/SwitchRow'
import { STAFF_TITLE_OPTIONS } from '@/components/staffOptions'
import { colors, space, type } from '@/theme'

/**
 * Νέο μέλος ή επεξεργασία — ίδια πεδία με τη φόρμα του web (υπηρεσία,
 * ονοματεπώνυμο, email, τίτλος, αρ. αδείας, τηλέφωνο, ειδικότητες, ενεργός)
 * συν την τηλεσυμβουλευτική που είχε ήδη το κινητό.
 *
 * Το email συνδέει αυτόματα τον υπάλληλο με την ομάδα μόλις εγγραφεί.
 * Διαγραφή: οι κρατήσεις μένουν, χάνουν μόνο τη σύνδεση με το μέλος.
 */
export default function StaffFormScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const isNew = !id

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['provider-staff-all'],
    queryFn: () => api.get('/staff/mine').then(r => r.data?.data ?? r.data ?? []),
    enabled: !isNew,
  })
  const { data: services = [] } = useQuery({
    queryKey: ['provider-services'],
    queryFn: () => api.get('/services/my').then(r => r.data?.data ?? r.data ?? []),
  })
  const existing = staff.find((m: any) => m.id === id)

  const [form, setForm] = useState({
    service_id: '', full_name: '', email: '', title: '', license_number: '', phone: '',
    specialties: '', accepts_telehealth: false, is_active: true,
  })
  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (isNew && !form.service_id && services[0]) set('service_id', services[0].id)
  }, [services.length])

  useEffect(() => {
    if (!existing) return
    setForm({
      service_id: existing.service_id, full_name: existing.full_name ?? '', email: existing.email ?? '',
      title: existing.title ?? '', license_number: existing.license_number ?? '', phone: existing.phone ?? '',
      specialties: (existing.specialties ?? []).join(', '),
      accepts_telehealth: !!existing.accepts_telehealth, is_active: existing.is_active !== false,
    })
  }, [existing?.id])

  const payload = () => {
    const p: any = {
      full_name: form.full_name.trim(),
      email: form.email.trim() || undefined,
      title: form.title || undefined,
      license_number: form.license_number.trim() || undefined,
      phone: form.phone.trim() || undefined,
      specialties: form.specialties.split(',').map(s => s.trim()).filter(Boolean),
      accepts_telehealth: form.accepts_telehealth,
      is_active: form.is_active,
    }
    if (isNew) p.service_id = form.service_id
    return p
  }

  const done = (msgKey: string) => {
    qc.invalidateQueries({ queryKey: ['provider-staff-all'] })
    Alert.alert(t(msgKey))
    router.back()
  }

  const save = useMutation({
    mutationFn: () => isNew ? api.post('/staff', payload()) : api.patch(`/staff/${id}`, payload()),
    onSuccess: () => done(isNew ? 'providerEdit.staffAdded' : 'providerEdit.staffUpdated'),
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('providerEdit.errSave')),
  })
  const remove = useMutation({
    mutationFn: () => api.delete(`/staff/${id}`),
    onSuccess: () => done('providerEdit.staffDeleted'),
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('providerEdit.errSave')),
  })

  if (!isNew && (isLoading || !existing)) return (
    <Screen title={t('providerStaff.editTitle')} back><Loading /></Screen>
  )

  return (
    <Screen title={isNew ? t('providerStaff.addTitle') : t('providerStaff.editTitle')} back>
      <Card>
        {isNew && (services.length === 0
          ? <Text style={s.warn}>{t('providerStaff.noServices')}</Text>
          : <Chips label={t('providerStaff.service')} value={form.service_id} onChange={v => set('service_id', v)}
              options={services.map((sv: any) => ({ value: sv.id, label: sv.title || sv.provider_name }))} />)}

        <Input label={t('providerStaff.nameLabel')} value={form.full_name} onChangeText={v => set('full_name', v)} autoCapitalize="words" />
        <Input label={t('providerStaff.emailLabel')} value={form.email} onChangeText={v => set('email', v)}
          keyboardType="email-address" autoCapitalize="none" hint={t('providerStaff.emailHint')} />
        <Chips label={t('providerStaff.titleLabel')} value={form.title} onChange={v => set('title', v)}
          options={STAFF_TITLE_OPTIONS.map(o => ({ value: o.value, label: t(o.key) }))} />
        <Input label={t('providerStaff.licenseLabel')} value={form.license_number} onChangeText={v => set('license_number', v)} />
        <Input label={t('providerStaff.phoneLabel')} value={form.phone} onChangeText={v => set('phone', v)} keyboardType="phone-pad" />
        <Input label={t('providerStaff.specialtiesLabel')} value={form.specialties} onChangeText={v => set('specialties', v)}
          hint={t('providerStaff.specialtiesHint')} />
        <SwitchRow label={t('providerEdit.acceptsTelehealth')} value={form.accepts_telehealth} onChange={v => set('accepts_telehealth', v)} />
        <SwitchRow label={t('providerStaff.isActive')} value={form.is_active} onChange={v => set('is_active', v)} />

        <Button full label={save.isPending ? t('providerDash.saving') : t('providerDash.save')}
          loading={save.isPending}
          disabled={save.isPending || !form.full_name.trim() || (isNew && !form.service_id)}
          onPress={() => save.mutate()} />
        {!isNew && (
          <Button full variant="danger" label={t('providerPkg.delete')} loading={remove.isPending}
            style={{ marginTop: space.sm }}
            onPress={() => Alert.alert(t('providerStaff.confirmDelete', { name: form.full_name }), '', [
              { text: t('providerDash.cancel'), style: 'cancel' },
              { text: t('providerPkg.delete'), style: 'destructive', onPress: () => remove.mutate() },
            ])} />
        )}
      </Card>
    </Screen>
  )
}

const s = StyleSheet.create({
  warn: { ...type.caption, color: colors.warning, marginBottom: space.md },
})
