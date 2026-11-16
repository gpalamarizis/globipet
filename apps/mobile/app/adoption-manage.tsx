import { useState } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, PawPrint, ChevronRight, AlertTriangle } from 'lucide-react-native'
import { api } from '@/lib/api'
import { fmtDateShort } from '@/lib/dates'
import { Screen, Card, Badge, Button, EmptyState, SkeletonRows } from '@/components/ui'
import { ChipRow, ageLabel, APP_TONE, LISTING_TONE, SPECIES_EMOJI, useLang, adoptionStyles as a } from '@/components/adoption'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Οι αγγελίες υιοθεσίας μου + οι αιτήσεις που έλαβα. ΚΟΙΝΗ οθόνη για ιδιώτες
 * και οργανισμούς (ανοίγει και από το «Περισσότερα» του παρόχου) — ίδια με
 * το AdoptionManager του web.
 */
export default function AdoptionManageScreen() {
  const { t } = useTranslation()
  const lang = useLang()
  const router = useRouter()
  const qc = useQueryClient()
  const [selected, setSelected] = useState('')
  const [status, setStatus] = useState('')

  const mine = useQuery<any[]>({ queryKey: ['adoption-mine'], queryFn: () => api.get('/adoption/listings/mine').then(r => r.data.data) })
  const received = useQuery<any[]>({
    queryKey: ['adoption-received', selected, status],
    queryFn: () => api.get('/adoption/applications/received', { params: { listing_id: selected || undefined, status: status || undefined } }).then(r => r.data.data),
  })
  const refresh = () => { qc.invalidateQueries({ queryKey: ['adoption-mine'] }); qc.invalidateQueries({ queryKey: ['adoption-received'] }); qc.invalidateQueries({ queryKey: ['adoption-listings'] }) }
  const act = async (fn: () => Promise<any>) => { try { await fn(); refresh() } catch (e: any) { Alert.alert(t('adoption.common.error'), e?.response?.data?.message || '') } }

  const menu = (l: any) => {
    const opts: any[] = [
      { text: t('adoption.manage.view'), onPress: () => router.push(`/adoption/${l.id}` as any) },
    ]
    if (l.status !== 'adopted') opts.push({ text: t('adoption.manage.edit'), onPress: () => router.push({ pathname: '/adoption-form', params: { id: l.id } } as any) })
    if (l.status === 'available' || l.status === 'reserved') opts.push({ text: t('adoption.manage.withdraw'), onPress: () => Alert.alert(t('adoption.manage.withdraw'), t('adoption.manage.confirmWithdraw'), [
      { text: t('adoption.common.cancel'), style: 'cancel' }, { text: t('adoption.manage.withdraw'), style: 'destructive', onPress: () => act(() => api.patch(`/adoption/listings/${l.id}`, { status: 'withdrawn' })) }]) })
    if (l.status === 'withdrawn') opts.push({ text: t('adoption.manage.restore'), onPress: () => act(() => api.patch(`/adoption/listings/${l.id}`, { status: 'available' })) })
    if (l.status !== 'adopted') opts.push({ text: t('adoption.manage.delete'), style: 'destructive', onPress: () => Alert.alert(t('adoption.manage.delete'), t('adoption.manage.confirmDelete'), [
      { text: t('adoption.common.cancel'), style: 'cancel' }, { text: t('adoption.manage.delete'), style: 'destructive', onPress: () => act(() => api.delete(`/adoption/listings/${l.id}`)) }]) })
    opts.push({ text: t('adoption.common.cancel'), style: 'cancel' })
    Alert.alert(l.name, undefined, opts)
  }

  const rows = mine.data ?? []
  return (
    <Screen title={t('adoption.manage.title')} back onRefresh={refresh} refreshing={mine.isRefetching}>
      <Text style={[a.muted, { marginBottom: space.lg }]}>{t('adoption.manage.subtitle')}</Text>
      <Button label={t('adoption.manage.newListing')} icon={<Plus size={icon.sm} color={colors.textOnDark} />} onPress={() => router.push('/adoption-form' as any)} full />

      <View style={{ height: space.lg }} />
      {mine.isLoading ? <SkeletonRows count={2} /> : rows.length === 0 ? (
        <EmptyState icon={PawPrint} title={t('adoption.manage.empty')} message={t('adoption.manage.emptyHint')} />
      ) : rows.map(l => (
        <Card key={l.id} onPress={() => menu(l)} style={selected === l.id ? { marginBottom: space.md, borderColor: colors.brand, borderWidth: 2 } : { marginBottom: space.md }}>
          <View style={a.row}>
            <View style={s.thumb}>{l.photos?.[0] ? <Image source={{ uri: l.photos[0] }} style={StyleSheet.absoluteFillObject} /> : <Text style={{ fontSize: 26 }}>{SPECIES_EMOJI[l.species]}</Text>}</View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={[a.row, { flexWrap: 'wrap' }]}>
                <Text style={s.name} numberOfLines={1}>{l.name}</Text>
                <Badge label={t(`adoption.status.${l.status}`)} tone={LISTING_TONE[l.status]} />
              </View>
              <Text style={a.muted} numberOfLines={1}>{t(`adoption.species.${l.species}`)} · {ageLabel(t, l.age_weeks)} · {l.city}</Text>
              {l.is_hidden && <View style={a.row}><AlertTriangle size={icon.xs} color={colors.danger} /><Text style={[a.muted, { color: colors.danger }]}>{t('adoption.manage.hiddenByAdmin', { reason: l.hidden_reason || '—' })}</Text></View>}
            </View>
          </View>
          <TouchableOpacity onPress={() => setSelected(x => x === l.id ? '' : l.id)} style={s.appsBtn}>
            <Text style={s.appsTxt}>{t('adoption.manage.applications', { count: l.applications_total })}</Text>
            {l.applications_new > 0 && <Badge tone="info" label={t('adoption.manage.newApps', { count: l.applications_new })} />}
          </TouchableOpacity>
        </Card>
      ))}

      <Text style={a.section}>{selected ? t('adoption.manage.applicationsFor', { name: rows.find(r => r.id === selected)?.name ?? '' }) : t('adoption.manage.received')}</Text>
      <ChipRow value={status} onChange={setStatus} options={[{ value: '', label: t('adoption.manage.all') }, ...['pending', 'reviewing', 'approved', 'completed', 'rejected'].map(x => ({ value: x, label: t(`adoption.appStatus.${x}`) }))]} />
      <View style={{ height: space.md }} />
      {(received.data ?? []).length === 0 ? <Text style={a.muted}>{t('adoption.manage.noApplications')}</Text> : (received.data ?? []).map(ap => (
        <Card key={ap.id} onPress={() => router.push(`/adoption-application/${ap.id}` as any)} style={{ marginBottom: space.sm }}>
          <View style={a.rowBetween}>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <View style={[a.row, { flexWrap: 'wrap' }]}>
                <Text style={s.name} numberOfLines={1}>{ap.applicant_name}</Text>
                <Badge label={t(`adoption.appStatus.${ap.status}`)} tone={APP_TONE[ap.status]} />
                {ap.unread_messages > 0 && <Badge tone="warning" label={t('adoption.apps.unread', { count: ap.unread_messages })} />}
              </View>
              <Text style={a.muted} numberOfLines={1}>{ap.listing?.name} · {t('adoption.apps.submitted', { date: fmtDateShort(ap.created_at, lang) })}</Text>
            </View>
            <ChevronRight size={icon.md} color={colors.textLight} />
          </View>
        </Card>
      ))}
    </Screen>
  )
}

const s = StyleSheet.create({
  thumb: { width: 56, height: 56, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  name: { ...type.body, fontWeight: weight.bold, color: colors.text, flexShrink: 1 },
  appsBtn: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md, minHeight: 40, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  appsTxt: { ...type.body, color: colors.brand, fontWeight: weight.semibold },
})
