import { useEffect, useState } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, X, ShieldCheck, Info } from 'lucide-react-native'
import { api } from '@/lib/api'
import { pickAndUploadImage } from '@/lib/uploadImage'
import { useAuthStore } from '@/store/auth'
import { Screen, Input, Button, Loading } from '@/components/ui'
import { SwitchRow } from '@/components/SwitchRow'
import { DateField } from '@/components/DateField'
import { ChipRow, SPECIES, GUIDE_COUNTRIES, useAdoptionRules, countryName, adoptionStyles as a } from '@/components/adoption'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Νέα αγγελία / επεξεργασία (param `id`). Ίδια λογική με το ListingFormModal
 * του web: οι κανόνες της χώρας έρχονται από τον server και αλλάζουν τη
 * φόρμα· η τελική απόφαση είναι του server.
 */
const PET_TO_ADOPTION: Record<string, string> = { dog: 'dog', cat: 'cat', bird: 'bird', rabbit: 'rabbit', reptile: 'reptile' }
const currencyFor = (c: string) => (c === 'GB' ? 'GBP' : c === 'CN' ? 'CNY' : 'EUR')
const toYmd = (d: Date) => d.toISOString().slice(0, 10)

export default function AdoptionFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const editing = !!id
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [uploading, setUploading] = useState(false)

  const { data: ctx } = useQuery<any>({ queryKey: ['adoption-context'], queryFn: () => api.get('/adoption/me/context').then(r => r.data) })
  const { data: listing, isLoading } = useQuery<any>({ queryKey: ['adoption-listing', id], queryFn: () => api.get(`/adoption/listings/${id}`).then(r => r.data.data), enabled: editing })
  const { data: myPets = [] } = useQuery<any[]>({ queryKey: ['my-pets'], queryFn: () => api.get('/pets/my').then(r => r.data?.data ?? []), enabled: !editing })

  const uc = String((user as any)?.country || '').toUpperCase()
  const [f, setF] = useState<any>({
    name: '', species: 'dog', breed: '', is_mixed: false, sex: 'female', birth_date_est: '', size: '', color: '', weight_kg: '', microchip_number: '',
    is_sterilized: false, is_vaccinated: false, is_dewormed: false, health_notes: '', special_needs: false,
    good_with_kids: 'unknown', good_with_dogs: 'unknown', good_with_cats: 'unknown', house_trained: null, energy_level: '',
    description: '', photos: [] as string[], country: /^[A-Z]{2}$/.test(uc) ? uc : 'GR', city: String(user?.city || ''),
    adoption_fee: '', fee_currency: currencyFor(uc), fee_breakdown: '', requirements: '', allows_abroad: false, bred_by_lister: false,
    source: '', pet_id: '', legal_ack: false,
  })
  const set = (k: string, v: any) => setF((s: any) => ({ ...s, [k]: v }))

  useEffect(() => {
    if (!listing) return
    setF((s: any) => ({
      ...s, ...listing, breed: listing.breed ?? '', size: listing.size ?? '', color: listing.color ?? '', microchip_number: listing.microchip_number ?? '',
      weight_kg: listing.weight_kg != null ? String(listing.weight_kg) : '', health_notes: listing.health_notes ?? '', energy_level: listing.energy_level ?? '',
      birth_date_est: String(listing.birth_date_est).slice(0, 10), adoption_fee: listing.adoption_fee ? String(listing.adoption_fee) : '',
      fee_breakdown: listing.fee_breakdown ?? '', requirements: listing.requirements ?? '', pet_id: '', legal_ack: true,
    }))
  }, [listing])
  useEffect(() => {
    if (!ctx || editing) return
    setF((s: any) => ({ ...s, source: s.source || (ctx.lister_type === 'organisation' ? 'shelter' : 'own_pet'), city: s.city || ctx.city || '' }))
  }, [ctx, editing])

  const isOrg = (listing?.lister_type ?? ctx?.lister_type) === 'organisation'
  const { data: rd } = useAdoptionRules(f.country)
  const rules = rd?.rules
  const chipRequired = !!rules?.microchip_species?.includes(f.species)
  const weeks = f.birth_date_est ? Math.floor((Date.now() - new Date(f.birth_date_est).getTime()) / (7 * 86400000)) : null
  const showBred = !!rules?.under_6m_bred_by_lister && !isOrg && (f.species === 'dog' || f.species === 'cat') && weeks !== null && weeks < 26

  const fillFromPet = (petId: string) => {
    const p = myPets.find((x: any) => x.id === petId)
    if (!p) { set('pet_id', ''); return }
    setF((s: any) => ({
      ...s, pet_id: p.id, name: p.name || s.name, species: PET_TO_ADOPTION[p.species] ?? 'other', breed: p.breed || '',
      sex: p.gender === 'male' || p.gender === 'female' ? p.gender : 'unknown', color: p.color || '', weight_kg: p.weight ? String(p.weight) : '',
      microchip_number: p.microchip_number || '', is_sterilized: !!p.is_sterilized,
      birth_date_est: Number(p.age) > 0 ? toYmd(new Date(Date.now() - Number(p.age) * 365.25 * 86400000)) : s.birth_date_est,
      photos: p.image_url && /^https:/.test(p.image_url) ? [p.image_url] : s.photos,
    }))
  }

  const addPhoto = async () => {
    if (f.photos.length >= 8) return
    setUploading(true)
    try {
      const url = await pickAndUploadImage('pets')
      if (url) set('photos', [...f.photos, url].slice(0, 8))
    } catch (e: any) {
      Alert.alert(t('adoption.common.error'), e?.message === 'permission' ? t('adoption.common.error') : (e?.response?.data?.message || e?.message || ''))
    } finally { setUploading(false) }
  }

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: f.name, species: f.species, breed: f.breed || null, is_mixed: f.is_mixed, sex: f.sex, birth_date_est: f.birth_date_est,
        size: f.size || null, color: f.color || null, weight_kg: f.weight_kg ? Number(String(f.weight_kg).replace(',', '.')) : null,
        microchip_number: f.microchip_number || null, is_sterilized: f.is_sterilized, is_vaccinated: f.is_vaccinated, is_dewormed: f.is_dewormed,
        health_notes: f.health_notes || null, special_needs: f.special_needs, good_with_kids: f.good_with_kids, good_with_dogs: f.good_with_dogs,
        good_with_cats: f.good_with_cats, house_trained: f.house_trained, energy_level: f.energy_level || null, description: f.description,
        photos: f.photos, country: f.country, city: f.city, adoption_fee: isOrg && f.adoption_fee ? Number(String(f.adoption_fee).replace(',', '.')) : 0,
        fee_currency: f.fee_currency, fee_breakdown: f.fee_breakdown || null, requirements: f.requirements || null, allows_abroad: f.allows_abroad,
        bred_by_lister: showBred ? f.bred_by_lister : false, source: f.source, pet_id: f.pet_id || null, legal_ack: f.legal_ack,
      }
      return editing ? api.patch(`/adoption/listings/${id}`, body) : api.post('/adoption/listings', body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adoption-mine'] }); qc.invalidateQueries({ queryKey: ['adoption-listings'] }); qc.invalidateQueries({ queryKey: ['adoption-listing', id] })
      Alert.alert('✓', editing ? t('adoption.form.saved') : t('adoption.form.created'))
      router.replace('/adoption-manage' as any)
    },
    onError: (e: any) => Alert.alert(t('adoption.common.error'), e?.response?.data?.message || t('adoption.common.error')),
  })

  if (editing && isLoading) return <Screen title={t('adoption.form.titleEdit')} back><Loading /></Screen>
  if (ctx && !ctx.is_adult) return <Screen title={t('adoption.form.titleNew')} back><Text style={a.body}>{t('adoption.form.adultOnly')}</Text></Screen>

  const valid = f.name.trim() && f.birth_date_est && f.description.trim().length >= 20 && f.photos.length > 0 && f.city.trim()
    && f.legal_ack && f.source && (!chipRequired || f.microchip_number.trim()) && (!showBred || f.bred_by_lister)
  const tri = [{ value: 'yes', label: t('adoption.tristate.yes') }, { value: 'no', label: t('adoption.tristate.no') }, { value: 'unknown', label: t('adoption.tristate.unknown') }]
  const countryOpts = Array.from(new Set([...GUIDE_COUNTRIES, f.country])).map(c => ({ value: c, label: countryName(t, c) }))

  return (
    <Screen title={editing ? t('adoption.form.titleEdit') : t('adoption.form.titleNew')} back>
      {ctx && (
        <View style={[s.note, isOrg && { backgroundColor: colors.infoBg }]}>
          {isOrg ? <ShieldCheck size={icon.sm} color="#1D4ED8" /> : <Info size={icon.sm} color={colors.textMuted} />}
          <Text style={[a.muted, { flex: 1, color: isOrg ? '#1D4ED8' : colors.textMuted }]}>
            {isOrg ? t('adoption.form.orgBadge', { name: ctx.organisation?.name ?? listing?.lister?.name }) : t('adoption.form.individualNote')}
          </Text>
        </View>
      )}

      {!editing && !isOrg && myPets.length > 0 && (
        <>
          <Text style={a.label}>{t('adoption.form.fromMyPet')}</Text>
          <ChipRow value={f.pet_id} onChange={fillFromPet} options={[{ value: '', label: '—' }, ...myPets.map((p: any) => ({ value: p.id, label: p.name }))]} />
        </>
      )}

      <Text style={a.section}>{t('adoption.form.sectionAnimal')}</Text>
      <Input label={`${t('adoption.form.name')} *`} value={f.name} onChangeText={v => set('name', v)} maxLength={80} />
      <Text style={a.label}>{t('adoption.form.species')} *</Text>
      <ChipRow value={f.species} onChange={v => set('species', v)} options={SPECIES.map(sp => ({ value: sp, label: t(`adoption.species.${sp}`) }))} />
      <Input label={t('adoption.form.breed')} value={f.breed} onChangeText={v => set('breed', v)} maxLength={120} style={{ marginTop: space.lg }} />
      <SwitchRow label={t('adoption.form.mixed')} value={f.is_mixed} onChange={v => set('is_mixed', v)} />
      <Text style={a.label}>{t('adoption.form.sex')} *</Text>
      <ChipRow value={f.sex} onChange={v => set('sex', v)} options={['female', 'male', 'unknown'].map(x => ({ value: x, label: t(`adoption.sex.${x}`) }))} />
      <View style={{ marginTop: space.lg }}>
        <DateField label={`${t('adoption.form.birth')} *`} hint={t('adoption.form.birthHint')} value={f.birth_date_est} onChange={v => set('birth_date_est', v)} maximumDate={new Date()} />
      </View>
      <Text style={a.label}>{t('adoption.form.size')}</Text>
      <ChipRow value={f.size} onChange={v => set('size', v)} options={[{ value: '', label: '—' }, ...['small', 'medium', 'large', 'xlarge'].map(x => ({ value: x, label: t(`adoption.size.${x}`) }))]} />
      <View style={[s.two, { marginTop: space.lg }]}>
        <Input label={t('adoption.form.color')} value={f.color} onChangeText={v => set('color', v)} maxLength={80} style={{ flex: 1 }} />
        <Input label={t('adoption.form.weight')} value={f.weight_kg} onChangeText={v => set('weight_kg', v)} keyboardType="decimal-pad" maxLength={6} style={{ flex: 1 }} />
      </View>

      <Text style={a.section}>{t('adoption.form.sectionHealth')}</Text>
      <Input label={`${t('adoption.form.microchip')}${chipRequired ? ' *' : ''}`} value={f.microchip_number} onChangeText={v => set('microchip_number', v)} keyboardType="number-pad" maxLength={20}
        hint={`${chipRequired ? `${t('adoption.form.microchipRequired')} · ` : ''}${rules?.show_microchip_publicly ? t('adoption.form.microchipPublic') : t('adoption.form.microchipPrivate')}`} />
      <SwitchRow label={t('adoption.form.sterilized')} value={f.is_sterilized} onChange={v => set('is_sterilized', v)} />
      <SwitchRow label={t('adoption.form.vaccinated')} value={f.is_vaccinated} onChange={v => set('is_vaccinated', v)} />
      <SwitchRow label={t('adoption.form.dewormed')} value={f.is_dewormed} onChange={v => set('is_dewormed', v)} />
      <SwitchRow label={t('adoption.form.specialNeeds')} value={f.special_needs} onChange={v => set('special_needs', v)} />
      <Input label={t('adoption.form.healthNotes')} value={f.health_notes} onChangeText={v => set('health_notes', v)} maxLength={2000} multiline />

      <Text style={a.section}>{t('adoption.form.sectionCharacter')}</Text>
      <Text style={a.label}>{t('adoption.form.goodWithKids')}</Text>
      <ChipRow value={f.good_with_kids} onChange={v => set('good_with_kids', v)} options={tri} />
      <Text style={[a.label, { marginTop: space.md }]}>{t('adoption.form.goodWithDogs')}</Text>
      <ChipRow value={f.good_with_dogs} onChange={v => set('good_with_dogs', v)} options={tri} />
      <Text style={[a.label, { marginTop: space.md }]}>{t('adoption.form.goodWithCats')}</Text>
      <ChipRow value={f.good_with_cats} onChange={v => set('good_with_cats', v)} options={tri} />
      <Text style={[a.label, { marginTop: space.md }]}>{t('adoption.form.houseTrained')}</Text>
      <ChipRow value={f.house_trained === null ? 'unknown' : f.house_trained ? 'yes' : 'no'} onChange={v => set('house_trained', v === 'unknown' ? null : v === 'yes')} options={tri} />
      <Text style={[a.label, { marginTop: space.md }]}>{t('adoption.form.energy')}</Text>
      <ChipRow value={f.energy_level} onChange={v => set('energy_level', v)} options={[{ value: '', label: '—' }, ...['low', 'medium', 'high'].map(x => ({ value: x, label: t(`adoption.energy.${x}`) }))]} />

      <Text style={a.section}>{t('adoption.form.sectionStory')}</Text>
      <Input label={`${t('adoption.form.description')} *`} hint={t('adoption.form.descriptionHint')} value={f.description} onChangeText={v => set('description', v)} maxLength={5000} multiline />
      <Text style={a.label}>{t('adoption.form.photos')} *</Text>
      <View style={s.photos}>
        {f.photos.map((p: string, i: number) => (
          <View key={p + i} style={s.photo}>
            <Image source={{ uri: p }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            <TouchableOpacity onPress={() => set('photos', f.photos.filter((_: any, j: number) => j !== i))} style={s.remove} hitSlop={8} accessibilityLabel={t('adoption.form.removePhoto')}>
              <X size={icon.xs} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}
        {f.photos.length < 8 && (
          <TouchableOpacity onPress={addPhoto} disabled={uploading} style={[s.photo, s.add]} accessibilityLabel={t('adoption.form.addPhoto')}>
            {uploading ? <ActivityIndicator color={colors.brand} /> : <ImagePlus size={icon.lg} color={colors.textMuted} />}
          </TouchableOpacity>
        )}
      </View>
      <Text style={[a.muted, { marginBottom: space.lg }]}>{t('adoption.form.photosHint')}</Text>

      <Text style={a.section}>{t('adoption.form.sectionLocation')}</Text>
      <Text style={a.label}>{t('adoption.form.country')} *</Text>
      <ChipRow value={f.country} onChange={v => { set('country', v); set('fee_currency', currencyFor(v)) }} options={countryOpts} />
      <Input label={`${t('adoption.form.city')} *`} value={f.city} onChangeText={v => set('city', v)} maxLength={120} style={{ marginTop: space.lg }} />
      <Text style={a.label}>{t('adoption.form.source')} *</Text>
      <ChipRow value={f.source} onChange={v => set('source', v)} options={(isOrg ? ['shelter', 'foster', 'found'] : ['own_pet', 'foster', 'found']).map(x => ({ value: x, label: t(`adoption.source.${x}`) }))} />

      <Text style={a.section}>{t('adoption.form.sectionTerms')}</Text>
      {isOrg && (
        <>
          <Input label={`${t('adoption.form.fee')} (${f.fee_currency})`} hint={t('adoption.form.feeHint')} value={f.adoption_fee} onChangeText={v => set('adoption_fee', v)} keyboardType="decimal-pad" maxLength={7} />
          {Number(String(f.adoption_fee).replace(',', '.')) > 0 && (
            <Input label={`${t('adoption.form.feeBreakdown')}${rules?.org_fee_breakdown_required ? ' *' : ''}`} placeholder={t('adoption.form.feeBreakdownHint')} value={f.fee_breakdown} onChangeText={v => set('fee_breakdown', v)} maxLength={1000} />
          )}
        </>
      )}
      <Input label={t('adoption.form.requirements')} placeholder={t('adoption.form.requirementsHint')} value={f.requirements} onChangeText={v => set('requirements', v)} maxLength={2000} multiline />
      <SwitchRow label={t('adoption.form.allowsAbroad')} value={f.allows_abroad} onChange={v => set('allows_abroad', v)} />
      {showBred && (
        <>
          <SwitchRow label={`${t('adoption.form.bredByLister')} *`} value={f.bred_by_lister} onChange={v => set('bred_by_lister', v)} />
          <Text style={[a.muted, { marginBottom: space.md }]}>{t('adoption.form.bredByListerHint')}</Text>
        </>
      )}

      {rules && (
        <View style={s.rules}>
          <Text style={s.rulesTitle}>{t('adoption.form.rulesTitle', { country: countryName(t, f.country) })}</Text>
          {[
            t('adoption.form.ruleMinAge'),
            !isOrg && t('adoption.form.ruleFree'),
            rules.microchip_species?.length > 0 && t('adoption.form.ruleMicrochip', { species: rules.microchip_species.map((x: string) => t(`adoption.species.${x}`)).join(', ') }),
            isOrg && rules.org_fee_breakdown_required && t('adoption.form.ruleBreakdown'),
            rules.cec_required_species?.length > 0 && t('adoption.form.ruleCec'),
            rules.dog_rabies_required && t('adoption.form.ruleRabies'),
            rules.banned_breeds_note && t('adoption.form.ruleBanned'),
            rules.adopter_residence_required && t('adoption.form.ruleResidence'),
          ].filter(Boolean).map((r, i) => <Text key={i} style={s.rule}>• {r}</Text>)}
        </View>
      )}
      <SwitchRow label={t('adoption.form.legalAck', { country: countryName(t, f.country) })} value={f.legal_ack} onChange={v => set('legal_ack', v)} />

      <Button label={editing ? t('adoption.form.save') : t('adoption.form.create')} onPress={() => valid ? save.mutate() : Alert.alert(t('adoption.form.required'))}
        loading={save.isPending} disabled={uploading} full style={{ marginTop: space.md }} />
    </Screen>
  )
}

const s = StyleSheet.create({
  note: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, marginBottom: space.lg },
  two: { flexDirection: 'row', gap: space.md },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.sm },
  photo: { width: 88, height: 88, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  add: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border },
  remove: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  rules: { backgroundColor: colors.warningBg, borderRadius: radius.md, padding: space.md, marginVertical: space.md },
  rulesTitle: { ...type.caption, fontWeight: weight.bold, color: '#92400E', marginBottom: space.xs },
  rule: { ...type.caption, color: '#92400E', marginTop: 2 },
})
