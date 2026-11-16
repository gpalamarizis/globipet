import { useState } from 'react'
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Linking, Alert, useWindowDimensions } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart, MapPin, Check, X, HelpCircle, Phone, Mail, BadgeCheck, Globe2 } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, Card, Badge, Button, Loading, EmptyState } from '@/components/ui'
import { ContentActions } from '@/components/ContentActions'
import { ageLabel, money, countryName, LegalGuide, AiAssistant, LISTING_TONE, SPECIES_EMOJI, adoptionStyles as a } from '@/components/adoption'
import { colors, space, radius, type, weight, icon } from '@/theme'

/** Σελίδα ζώου προς υιοθεσία — ίδιο περιεχόμενο με το /adoption/:id του web. */
export default function AdoptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { width } = useWindowDimensions()
  const { isAuthenticated } = useAuthStore()
  const [showAi, setShowAi] = useState(false)

  const { data: l, isLoading, isError } = useQuery<any>({
    queryKey: ['adoption-listing', id],
    queryFn: () => api.get(`/adoption/listings/${id}`).then(r => r.data.data),
    enabled: !!id, retry: false,
  })

  if (isLoading) return <Screen title={t('adoption.title')} back><Loading /></Screen>
  if (isError || !l) return <Screen title={t('adoption.title')} back><EmptyState title={t('adoption.detail.notFound')} /></Screen>

  const fav = async () => {
    if (!isAuthenticated) { router.push('/auth/login' as any); return }
    try {
      if (l.is_favorite) await api.delete(`/adoption/listings/${l.id}/favorite`)
      else await api.post(`/adoption/listings/${l.id}/favorite`, {})
      qc.invalidateQueries({ queryKey: ['adoption-listing', id] })
      qc.invalidateQueries({ queryKey: ['adoption-listings'] })
    } catch (e: any) { Alert.alert(t('adoption.common.error'), e?.response?.data?.message || '') }
  }
  const tri = (v: string) => v === 'yes' ? <Check size={icon.sm} color={colors.success} /> : v === 'no' ? <X size={icon.sm} color={colors.danger} /> : <HelpCircle size={icon.sm} color={colors.textLight} />
  const yn = (v: boolean) => v ? <Check size={icon.sm} color={colors.success} /> : <X size={icon.sm} color={colors.textLight} />
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={a.infoRow}><Text style={a.muted}>{label}</Text><View style={a.row}>{typeof children === 'string' ? <Text style={s.val}>{children}</Text> : children}</View></View>
  )
  const app = l.my_application
  const photoW = width - space.lg * 2

  const action = l.is_mine
    ? <Button label={t('adoption.detail.manage')} onPress={() => router.push('/adoption-manage' as any)} full />
    : app && app.status !== 'withdrawn'
      ? <><Text style={[a.muted, { marginBottom: space.sm }]}>{t('adoption.detail.applied', { status: t(`adoption.appStatus.${app.status}`) })}</Text>
          <Button label={t('adoption.detail.viewApplication')} onPress={() => router.push(`/adoption-application/${app.id}` as any)} full /></>
      : l.status !== 'available'
        ? <Text style={a.muted}>{t('adoption.detail.notAccepting')}</Text>
        : !isAuthenticated
          ? <Button label={t('adoption.detail.loginToApply')} onPress={() => router.push('/auth/login' as any)} full />
          : <Button label={t('adoption.detail.apply')} onPress={() => router.push({ pathname: '/adoption-apply', params: { id: l.id } } as any)} full />

  return (
    <Screen title={l.name} back action={
      <View style={a.row}>
        <TouchableOpacity onPress={fav} hitSlop={10} accessibilityLabel={t('adoption.card.favorite')}>
          <Heart size={icon.lg} color={l.is_favorite ? '#F43F5E' : colors.textMuted} fill={l.is_favorite ? '#F43F5E' : 'transparent'} />
        </TouchableOpacity>
        <ContentActions type="adoption_listing" id={l.id} isMine={l.is_mine} onBlocked={() => router.back()} />
      </View>
    }>
      {l.photos?.length ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ marginBottom: space.lg, borderRadius: radius.lg }}>
          {l.photos.map((p: string, i: number) => <Image key={p + i} source={{ uri: p }} style={{ width: photoW, height: photoW * 0.75, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt }} resizeMode="cover" />)}
        </ScrollView>
      ) : <View style={[s.noPhoto, { height: photoW * 0.6 }]}><Text style={{ fontSize: 64 }}>{SPECIES_EMOJI[l.species]}</Text></View>}

      <Card style={{ marginBottom: space.lg }}>
        <View style={a.rowBetween}>
          <View style={[a.row, { flexShrink: 1 }]}><MapPin size={icon.sm} color={colors.textLight} /><Text style={a.muted}>{l.city}, {countryName(t, l.country)}</Text></View>
          {l.status !== 'available' && <Badge label={t(`adoption.status.${l.status}`)} tone={LISTING_TONE[l.status]} />}
        </View>
        <View style={s.badges}>
          <Badge label={t(`adoption.species.${l.species}`)} />
          <Badge label={t(`adoption.sex.${l.sex}`)} />
          <Badge label={ageLabel(t, l.age_weeks)} />
          {l.size ? <Badge label={t(`adoption.size.${l.size}`)} /> : null}
          {l.special_needs ? <Badge tone="warning" label={t('adoption.detail.specialNeeds')} /> : null}
        </View>
        <Text style={a.section}>{t('adoption.detail.about')}</Text>
        <Text style={a.body}>{l.description}</Text>
      </Card>

      <Card style={{ marginBottom: space.lg }}>
        <Text style={s.price}>{l.adoption_fee > 0 ? t('adoption.detail.feeOrg', { amount: money(l.adoption_fee, l.fee_currency) }) : t('adoption.detail.feeFree')}</Text>
        {l.adoption_fee > 0 && <>{l.fee_breakdown ? <Text style={a.muted}>{l.fee_breakdown}</Text> : null}<Text style={[a.muted, { marginTop: space.xs }]}>{t('adoption.detail.paidDirect')}</Text></>}
        {l.allows_abroad && <View style={[a.row, { marginTop: space.sm }]}><Globe2 size={icon.xs} color="#4F46E5" /><Text style={[a.muted, { color: '#4F46E5' }]}>{t('adoption.detail.allowsAbroad')}</Text></View>}
        <View style={{ marginTop: space.lg, gap: space.sm }}>
          {action}
          <Button variant="secondary" label={t('adoption.detail.askAi')} onPress={() => setShowAi(v => !v)} full />
        </View>
      </Card>

      {showAi && <AiAssistant country={l.country} listingId={l.id} />}

      <Card style={{ marginBottom: space.lg }}>
        <Text style={[a.section, { marginTop: 0 }]}>{t('adoption.detail.health')}</Text>
        <Row label={t('adoption.detail.sterilized')}>{yn(l.is_sterilized)}</Row>
        <Row label={t('adoption.detail.vaccinated')}>{yn(l.is_vaccinated)}</Row>
        <Row label={t('adoption.detail.dewormed')}>{yn(l.is_dewormed)}</Row>
        <Row label={t('adoption.detail.microchip')}>{l.microchip_number ? l.microchip_number : l.has_microchip ? t('adoption.detail.microchipHidden') : yn(false)}</Row>
        {l.health_notes ? <Text style={[a.muted, { marginTop: space.sm }]}>{t('adoption.detail.healthNotes')}: {l.health_notes}</Text> : null}
        <Text style={a.section}>{t('adoption.detail.character')}</Text>
        <Row label={t('adoption.form.goodWithKids')}>{tri(l.good_with_kids)}</Row>
        <Row label={t('adoption.form.goodWithDogs')}>{tri(l.good_with_dogs)}</Row>
        <Row label={t('adoption.form.goodWithCats')}>{tri(l.good_with_cats)}</Row>
        {l.house_trained !== null && <Row label={t('adoption.detail.houseTrained')}>{yn(!!l.house_trained)}</Row>}
        {l.energy_level ? <Row label={t('adoption.detail.energy')}>{t(`adoption.energy.${l.energy_level}`)}</Row> : null}
        <Text style={a.section}>{t('adoption.detail.details')}</Text>
        <Row label={t('adoption.detail.breed')}>{`${l.breed || '—'}${l.is_mixed ? ` (${t('adoption.detail.mixed')})` : ''}`}</Row>
        <Row label={t('adoption.detail.color')}>{l.color || '—'}</Row>
        <Row label={t('adoption.detail.weight')}>{l.weight_kg ? t('adoption.detail.weightKg', { value: l.weight_kg }) : '—'}</Row>
        <Row label={t('adoption.form.source')}>{t(`adoption.source.${l.source}`)}</Row>
        {l.requirements ? <Text style={[a.body, { marginTop: space.md }]}><Text style={{ fontWeight: weight.bold }}>{t('adoption.detail.requirements')}: </Text>{l.requirements}</Text> : null}
      </Card>

      <Card style={{ marginBottom: space.lg }}>
        <Text style={a.muted}>{t('adoption.detail.listedBy')}</Text>
        <View style={[a.row, { marginTop: space.xs }]}>
          <Text style={s.lister}>{l.lister.name}</Text>
          {l.lister.verified && <BadgeCheck size={icon.sm} color={colors.success} />}
        </View>
        <View style={{ marginTop: space.sm, alignSelf: 'flex-start' }}>
          <Badge tone={l.lister.type === 'organisation' ? 'info' : 'neutral'} label={t(`adoption.card.${l.lister.type === 'organisation' ? 'organisation' : 'individual'}`)} />
        </View>
        <View style={[a.row, { marginTop: space.md, flexWrap: 'wrap' }]}>
          {l.lister.contact_phone ? <Button size="sm" variant="secondary" label={t('adoption.detail.call')} icon={<Phone size={icon.sm} color={colors.text} />} onPress={() => Linking.openURL(`tel:${l.lister.contact_phone}`)} /> : null}
          {l.lister.contact_email ? <Button size="sm" variant="secondary" label={t('adoption.detail.email')} icon={<Mail size={icon.sm} color={colors.text} />} onPress={() => Linking.openURL(`mailto:${l.lister.contact_email}`)} /> : null}
          {l.lister.service_id ? <Button size="sm" variant="ghost" label={t('adoption.detail.viewOrg')} onPress={() => router.push(`/services/${l.lister.service_id}` as any)} /> : null}
        </View>
        <Text style={[a.muted, { marginTop: space.sm }]}>{t('adoption.detail.views', { count: l.views_count })}</Text>
      </Card>

      <LegalGuide country={l.country} />
    </Screen>
  )
}

const s = StyleSheet.create({
  noPhoto: { borderRadius: radius.lg, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  val: { ...type.body, color: colors.text, fontWeight: weight.medium },
  price: { ...type.section, fontWeight: weight.bold, color: colors.text },
  lister: { ...type.emphasis, fontWeight: weight.bold, color: colors.text },
})
