import { useEffect, useState } from 'react'
import { Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../src/lib/api'
import { Screen, Card, Button, Input, Loading } from '@/components/ui'
import { SwitchRow } from '@/components/SwitchRow'
import { ServiceLocationField } from '@/components/ServiceLocationField'
import { space } from '@/theme'

/**
 * Επεξεργασία υπηρεσίας — ίδια πεδία και ίδιο endpoint με το web
 * (PATCH /packages/services/:id, που δέχεται ΜΟΝΟ τα πεδία της φόρμας).
 *
 * Διαγραφή: ο server αρνείται (409) όταν η υπηρεσία έχει κρατήσεις και
 * εξηγεί ότι πρέπει να απενεργοποιηθεί — το μήνυμά του εμφανίζεται αυτούσιο.
 */
export default function ServiceFormScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { id } = useLocalSearchParams<{ id: string }>()

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['provider-packages'],
    queryFn: () => api.get('/packages/my').then(r => r.data?.data ?? []),
  })
  const service = services.find((s: any) => s.id === id)

  const [form, setForm] = useState({
    title: '', description: '', city: '', location: '', years_experience: '',
    latitude: null as number | null, longitude: null as number | null,
    specializations: '', home_visits: false, emergency_available: false, is_active: true,
  })
  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!service) return
    setForm({
      title: service.title ?? '', description: service.description ?? '',
      city: service.city ?? '', location: service.location ?? '',
      latitude: service.latitude ?? null, longitude: service.longitude ?? null,
      years_experience: service.years_experience ? String(service.years_experience) : '',
      specializations: (service.specializations ?? []).join(', '),
      home_visits: !!service.home_visits, emergency_available: !!service.emergency_available,
      is_active: !!service.is_active,
    })
  }, [service?.id])

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['provider-packages'] })
    qc.invalidateQueries({ queryKey: ['provider-services'] })
  }

  const save = useMutation({
    mutationFn: () => api.patch(`/packages/services/${id}`, {
      ...form,
      title: form.title.trim(),
      years_experience: parseInt(form.years_experience, 10) || 0,
    }),
    onSuccess: () => { refresh(); Alert.alert(t('providerPkg.serviceUpdated')); router.back() },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('providerPkg.error')),
  })

  const remove = useMutation({
    mutationFn: () => api.delete(`/services/${id}`),
    onSuccess: () => { refresh(); Alert.alert(t('providerPkg.serviceDeleted')); router.back() },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('providerDash.errDeleteService')),
  })

  const confirmDelete = () => Alert.alert(
    t('providerPkg.confirmDeleteService', { name: form.title }), '',
    [{ text: t('providerPkg.cancel'), style: 'cancel' },
     { text: t('providerPkg.delete'), style: 'destructive', onPress: () => remove.mutate() }])

  if (isLoading || !service) return (
    <Screen title={t('providerPkg.editService')} back><Loading /></Screen>
  )

  return (
    <Screen title={t('providerPkg.editService')} back>
      <Card>
        <Input label={t('providerPkg.fName')} value={form.title} onChangeText={v => set('title', v)} />
        <Input label={t('providerPkg.fDescription')} value={form.description} onChangeText={v => set('description', v)} multiline />
        <Input label={t('providerPkg.fCity')} value={form.city} onChangeText={v => set('city', v)} />
        <Input label={t('providerPkg.fAddress')} value={form.location} onChangeText={v => set('location', v)} />
        <ServiceLocationField address={form.location} city={form.city} country={service.country ?? undefined}
          latitude={form.latitude} longitude={form.longitude}
          onChange={c => setForm(f => ({ ...f, ...c }))} />
        <Input label={t('providerPkg.fYearsExp')} value={form.years_experience}
          onChangeText={v => set('years_experience', v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
        <Input label={t('providerPkg.fSpecializations')} value={form.specializations}
          onChangeText={v => set('specializations', v)} />
        <SwitchRow label={t('providerPkg.fHomeVisits')} value={form.home_visits} onChange={v => set('home_visits', v)} />
        <SwitchRow label={t('providerPkg.gEmergency')} value={form.emergency_available} onChange={v => set('emergency_available', v)} />
        <SwitchRow label={t('providerPkg.fActive')} value={form.is_active} onChange={v => set('is_active', v)} />

        <Button full label={save.isPending ? t('providerPkg.saving') : t('providerPkg.save')}
          loading={save.isPending} disabled={!form.title.trim() || save.isPending}
          onPress={() => save.mutate()} />
        <Button full variant="danger" label={t('providerPkg.delete')} loading={remove.isPending}
          onPress={confirmDelete} style={{ marginTop: space.sm }} />
      </Card>
    </Screen>
  )
}
