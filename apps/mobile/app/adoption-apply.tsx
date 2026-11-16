import { useState } from 'react'
import { View, Text, StyleSheet, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, Input, Button, Loading } from '@/components/ui'
import { SwitchRow } from '@/components/SwitchRow'
import { ChipRow, GUIDE_COUNTRIES, adoptionStyles as a } from '@/components/adoption'
import { space } from '@/theme'

/** Ερωτηματολόγιο αίτησης υιοθεσίας — ίδια πεδία με το ApplyModal του web και το answersSchema του server. */
export default function AdoptionApplyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const { data: l } = useQuery<any>({ queryKey: ['adoption-listing', id], queryFn: () => api.get(`/adoption/listings/${id}`).then(r => r.data.data), enabled: !!id })

  const uc = String((user as any)?.country || '').toUpperCase()
  const [f, setF] = useState({
    country: /^[A-Z]{2}$/.test(uc) ? uc : '', city: String(user?.city || ''), housing: 'apartment', ownership: 'own', landlord_ok: true, has_garden: false,
    adults: '1', children: '0', children_ages: '', other_pets: '', experience: '', hours: '4', reason: '', home_visit: true, followup: true, message: '', phone: '',
  })
  const set = (k: keyof typeof f, v: any) => setF(s => ({ ...s, [k]: v }))
  const country = f.country || l?.country || 'GR'

  const send = useMutation({
    mutationFn: () => api.post(`/adoption/listings/${id}/applications`, {
      answers: {
        country, city: f.city, housing: f.housing, ownership: f.ownership, landlord_ok: f.ownership === 'rent' ? f.landlord_ok : null,
        has_garden: f.has_garden, household_adults: Math.max(1, parseInt(f.adults, 10) || 1), household_children: Math.max(0, parseInt(f.children, 10) || 0),
        children_ages: f.children_ages || null, other_pets: f.other_pets || null, experience: f.experience || null,
        hours_alone: Math.min(24, Math.max(0, parseInt(f.hours, 10) || 0)), reason: f.reason, agrees_home_visit: f.home_visit, agrees_followup: f.followup,
      },
      message: f.message || null, phone: f.phone || null,
    }).then(r => r.data),
    onSuccess: d => {
      qc.invalidateQueries({ queryKey: ['adoption-listing', id] })
      qc.invalidateQueries({ queryKey: ['adoption-my-applications'] })
      Alert.alert('✓', t('adoption.apply.sent'))
      router.replace(`/adoption-application/${d?.data?.id}` as any)
    },
    onError: (e: any) => Alert.alert(t('adoption.common.error'), e?.response?.data?.message || t('adoption.common.error')),
  })

  if (!l) return <Screen title={t('adoption.app.title')} back><Loading /></Screen>
  const valid = f.city.trim() && f.reason.trim().length >= 10 && !(f.ownership === 'rent' && !f.landlord_ok)
  const countryOpts = Array.from(new Set([...GUIDE_COUNTRIES, country])).map(c => ({ value: c, label: (GUIDE_COUNTRIES as readonly string[]).includes(c) ? t(`adoption.countries.${c}`) : c }))

  return (
    <Screen title={t('adoption.apply.title', { name: l.name })} back>
      <Text style={[a.muted, { marginBottom: space.lg }]}>{t('adoption.apply.intro')}</Text>

      <Text style={a.section}>{t('adoption.apply.sectionHome')}</Text>
      <Text style={a.label}>{t('adoption.apply.country')}</Text>
      <ChipRow value={country} onChange={v => set('country', v)} options={countryOpts} />
      <Input label={t('adoption.apply.city')} value={f.city} onChangeText={v => set('city', v)} maxLength={120} style={{ marginTop: space.lg }} />
      <Text style={a.label}>{t('adoption.apply.housing')}</Text>
      <ChipRow value={f.housing} onChange={v => set('housing', v)} options={[
        { value: 'house', label: t('adoption.apply.housingHouse') }, { value: 'apartment', label: t('adoption.apply.housingApartment') }, { value: 'other', label: t('adoption.apply.housingOther') }]} />
      <Text style={[a.label, { marginTop: space.lg }]}>{t('adoption.apply.ownership')}</Text>
      <ChipRow value={f.ownership} onChange={v => set('ownership', v)} options={[
        { value: 'own', label: t('adoption.apply.own') }, { value: 'rent', label: t('adoption.apply.rent') }, { value: 'family', label: t('adoption.apply.family') }]} />
      <View style={{ marginTop: space.lg }}>
        {f.ownership === 'rent' && <SwitchRow label={t('adoption.apply.landlordOk')} value={f.landlord_ok} onChange={v => set('landlord_ok', v)} />}
        <SwitchRow label={t('adoption.apply.garden')} value={f.has_garden} onChange={v => set('has_garden', v)} />
      </View>

      <Text style={a.section}>{t('adoption.apply.sectionFamily')}</Text>
      <View style={s.two}>
        <Input label={t('adoption.apply.adults')} value={f.adults} onChangeText={v => set('adults', v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={2} style={{ flex: 1 }} />
        <Input label={t('adoption.apply.children')} value={f.children} onChangeText={v => set('children', v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={2} style={{ flex: 1 }} />
      </View>
      {Number(f.children) > 0 && <Input label={t('adoption.apply.childrenAges')} value={f.children_ages} onChangeText={v => set('children_ages', v)} maxLength={120} />}
      <Input label={t('adoption.apply.otherPets')} placeholder={t('adoption.apply.otherPetsHint')} value={f.other_pets} onChangeText={v => set('other_pets', v)} maxLength={500} />

      <Text style={a.section}>{t('adoption.apply.sectionYou')}</Text>
      <Input label={t('adoption.apply.experience')} value={f.experience} onChangeText={v => set('experience', v)} maxLength={1500} multiline />
      <Input label={t('adoption.apply.hoursAlone')} value={f.hours} onChangeText={v => set('hours', v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={2} />
      <Input label={t('adoption.apply.reason')} value={f.reason} onChangeText={v => set('reason', v)} maxLength={2000} multiline />
      <SwitchRow label={t('adoption.apply.homeVisit')} value={f.home_visit} onChange={v => set('home_visit', v)} />
      <SwitchRow label={t('adoption.apply.followup')} value={f.followup} onChange={v => set('followup', v)} />
      <Input label={t('adoption.apply.message')} value={f.message} onChangeText={v => set('message', v)} maxLength={2000} multiline />
      <Input label={t('adoption.apply.phone')} hint={t('adoption.apply.phoneHint')} value={f.phone} onChangeText={v => set('phone', v)} keyboardType="phone-pad" maxLength={30} />

      <Button label={t('adoption.apply.submit')} onPress={() => send.mutate()} loading={send.isPending} disabled={!valid} full />
    </Screen>
  )
}

const s = StyleSheet.create({ two: { flexDirection: 'row', gap: space.md } })
