import { useEffect, useState } from 'react'
import { View, Text, Image, StyleSheet, Alert, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Target, MonitorPlay, Users, Plus, X, Check, Film } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { pickAndUploadMedia } from '../../src/lib/uploadMedia'
import { Screen, Card, Button, Input, Loading, EmptyState } from '@/components/ui'
import { Chips } from '@/components/Chips'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Ρυθμίσεις καμπάνιας — ίδιες τρεις ενότητες με το web:
 *   Τι αφορά   — όλες οι υπηρεσίες/προϊόντα ή συγκεκριμένα
 *   Πού        — σελίδα, θέση, εικόνα/βίντεο/κείμενο, τίτλοι, σύνδεσμος
 *   Σε ποιους  — όλοι ή επιλεγμένοι πελάτες
 * Κάθε ενότητα αποθηκεύεται χωριστά (PUT targets/placements/audience). Οι
 * κανόνες (διπλή θέση, βίντεο χωρίς αρχείο, ξένος σύνδεσμος) ελέγχονται στον
 * server και το μήνυμά του εμφανίζεται όπως είναι.
 */
type Tab = 'targets' | 'placements' | 'audience'

const PAGES = ['all', 'home', 'services', 'service_detail', 'marketplace', 'product_detail', 'social',
  'playdates', 'communities', 'events', 'forum', 'telehealth', 'insurance', 'pets'] as const
const PAGE_KEY: Record<string, string> = {
  all: 'pgAll', home: 'pgHome', services: 'pgServices', service_detail: 'pgServiceDetail',
  marketplace: 'pgMarketplace', product_detail: 'pgProductDetail', social: 'pgSocial',
  playdates: 'pgPlaydates', communities: 'pgCommunities', events: 'pgEvents', forum: 'pgForum',
  telehealth: 'pgTelehealth', insurance: 'pgInsurance', pets: 'pgMyPets',
}
const SLOTS = ['hero', 'banner', 'sidebar', 'inline', 'popup'] as const
const SLOT_KEY: Record<string, string> = { hero: 'slHero', banner: 'slBanner', sidebar: 'slSidebar', inline: 'slInline', popup: 'slPopup' }

/** Ίδιες προδιαγραφές με το CampaignMediaUpload του web. */
const IMAGE_SPEC: Record<string, { w: number; h: number; ratio: string; note?: string }> = {
  hero: { w: 1920, h: 640, ratio: '3:1', note: 'noteHero' }, banner: { w: 1200, h: 300, ratio: '4:1' },
  sidebar: { w: 400, h: 600, ratio: '2:3', note: 'noteSidebar' }, inline: { w: 800, h: 200, ratio: '4:1' },
  popup: { w: 600, h: 600, ratio: '1:1' },
}
const VIDEO_SPEC: Record<string, { w: number; h: number; ratio: string; note?: string }> = {
  hero: { w: 1920, h: 1080, ratio: '16:9' }, banner: { w: 1920, h: 1080, ratio: '16:9' },
  inline: { w: 1280, h: 720, ratio: '16:9' }, sidebar: { w: 1080, h: 1920, ratio: '9:16', note: 'notePhoneVideo' },
  popup: { w: 1080, h: 1080, ratio: '1:1', note: 'noteAnyScreen' },
}

/** Πολλαπλή επιλογή — ίδια εμφάνιση με τα Chips. */
function Toggles({ items, isOn, onToggle }: { items: { key: string; label: string }[]; isOn: (k: string) => boolean; onToggle: (k: string) => void }) {
  return (
    <View style={s.chips}>
      {items.map(it => {
        const on = isOn(it.key)
        return (
          <TouchableOpacity key={it.key} activeOpacity={0.7} style={[s.chip, on && s.chipOn]} onPress={() => onToggle(it.key)}>
            {on && <Check size={13} color={colors.brand} />}
            <Text style={[s.chipTxt, on && s.chipTxtOn]} numberOfLines={1}>{it.label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

export default function CampaignSettingsScreen() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [tab, setTab] = useState<Tab>('targets')
  const [T, setT] = useState<any[]>([])
  const [P, setP] = useState<any[]>([])
  const [A, setA] = useState<string[]>([])
  const [uploading, setUploading] = useState<number | null>(null)

  const { data: detail, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => api.get(`/campaigns/${id}`).then(r => r.data?.data),
    enabled: !!id,
  })
  const { data: services = [] } = useQuery({
    queryKey: ['my-services-all'],
    queryFn: () => api.get('/services/my').then(r => r.data?.data ?? []),
  })
  const { data: products = [] } = useQuery({
    queryKey: ['my-products'],
    queryFn: () => api.get('/products/my').then(r => r.data?.data ?? []).catch(() => []),
  })
  const { data: customers = [] } = useQuery({
    queryKey: ['my-customers'],
    queryFn: () => api.get('/customers').then(r => r.data?.data ?? []).catch(() => []),
  })

  // Αρχικές τιμές από τον server, μία φορά ανά καμπάνια.
  useEffect(() => {
    if (!detail) return
    setT((detail.targets ?? []).map((x: any) => ({ target_type: x.target_type, target_id: x.target_id ?? null })))
    setP((detail.placements ?? []).map((p: any) => ({
      page: p.page, slot: p.slot || 'banner', media_type: p.media_type || 'image', media_url: p.media_url ?? null,
      // Παλιές προβολές του web αποθήκευαν /products/:id — η σωστή διαδρομή είναι /marketplace/:id.
      link_url: String(p.link_url ?? '').replace(/^\/products\//, '/marketplace/'), headline: p.headline ?? '', subtext: p.subtext ?? '', cta_label: p.cta_label ?? '',
      is_active: p.is_active !== false,
    })))
    setA(detail.audience ?? [])
  }, [detail?.id])

  const done = (msgKey: string) => () => {
    Alert.alert(t(msgKey))
    qc.invalidateQueries({ queryKey: ['campaign', id] })
    qc.invalidateQueries({ queryKey: ['my-campaigns'] })
  }
  const fail = (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('providerMkt.error'))

  const saveTargets = useMutation({ mutationFn: () => api.put(`/campaigns/${id}/targets`, { targets: T }), onSuccess: done('providerMkt.savedTargets'), onError: fail })
  const savePlacements = useMutation({
    // Κενά πεδία → null, όπως τα αποθηκεύει και το web.
    mutationFn: () => api.put(`/campaigns/${id}/placements`, {
      placements: P.map(p => ({
        ...p,
        media_url: p.media_type === 'none' ? null : p.media_url,
        link_url: p.link_url || null, headline: p.headline || null, subtext: p.subtext || null, cta_label: p.cta_label || null,
      })),
    }),
    onSuccess: done('providerMkt.savedPlacements'), onError: fail,
  })
  const saveAudience = useMutation({ mutationFn: () => api.put(`/campaigns/${id}/audience`, { emails: A }), onSuccess: done('providerMkt.savedAudience'), onError: fail })
  const pending = saveTargets.isPending || savePlacements.isPending || saveAudience.isPending

  // ── Στόχοι ──────────────────────────────────────────────────────────
  const tKey = (type: string, tid?: string | null) => `${type}|${tid ?? ''}`
  const hasTarget = (k: string) => T.some(x => tKey(x.target_type, x.target_id) === k)
  const toggleTarget = (k: string) => {
    const [type, tid] = k.split('|')
    setT(hasTarget(k) ? T.filter(x => tKey(x.target_type, x.target_id) !== k) : [...T, { target_type: type, target_id: tid || null }])
  }

  // ── Προβολές ────────────────────────────────────────────────────────
  const upd = (i: number, patch: any) => setP(P.map((p, j) => j === i ? { ...p, ...patch } : p))
  const addPlacement = () => setP([...P, { page: 'home', slot: 'banner', media_type: 'image', media_url: null,
    link_url: '', headline: detail?.title ?? '', subtext: '', cta_label: '', is_active: true }])
  const upload = async (i: number) => {
    const p = P[i]
    setUploading(i)
    try {
      const url = await pickAndUploadMedia('campaigns', p.media_type === 'video' ? 'video' : 'image')
      if (url) { upd(i, { media_url: url }); Alert.alert(t('campaignUi.uploadedOk')) }
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.response?.data?.message || e?.message || t('campaignUi.errUpload'))
    } finally { setUploading(null) }
  }
  const linkOptions = [
    { value: '', label: t('providerMkt.noneAnywhere') },
    { value: '/services', label: t('providerMkt.allServices') },
    { value: '/marketplace', label: t('providerMkt.theShop') },
    ...services.map((sv: any) => ({ value: `/services/${sv.id}`, label: sv.title || sv.provider_name })),
    ...products.map((pr: any) => ({ value: `/marketplace/${pr.id}`, label: pr.name })),
  ]

  // ── Κοινό ───────────────────────────────────────────────────────────
  const toggleCustomer = (email: string) => setA(A.includes(email) ? A.filter(e => e !== email) : [...A, email])

  if (isLoading || !detail) return <Screen title={t('providerMkt.campaignSettings')} back><Loading /></Screen>

  return (
    <Screen title={detail.title} subtitle={t('providerMkt.campaignSettings')} back>
      <View style={s.tabs}>
        {([
          ['targets', t('providerMkt.whatItCovers'), Target],
          ['placements', t('providerMkt.whereShown'), MonitorPlay],
          ['audience', t('providerMkt.toWhom'), Users],
        ] as const).map(([k, label, Ico]) => (
          <TouchableOpacity key={k} activeOpacity={0.7} style={[s.tab, tab === k && s.tabOn]} onPress={() => setTab(k)}>
            <Ico size={icon.sm} color={tab === k ? colors.textOnDark : colors.textMuted} />
            <Text style={[s.tabTxt, tab === k && s.tabTxtOn]} numberOfLines={2}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'targets' && (
        <Card>
          {!detail.discount_type && <Text style={s.warn}>{t('providerMkt.noTargetHint')}</Text>}
          <Text style={s.group}>{t('providerMkt.total')}</Text>
          <Toggles isOn={hasTarget} onToggle={toggleTarget} items={[
            { key: tKey('all_services'), label: t('providerMkt.allMyServices') },
            { key: tKey('all_products'), label: t('providerMkt.allMyProducts') },
          ]} />
          {services.length > 0 && <>
            <Text style={s.group}>{t('providerMkt.specificServices')}</Text>
            <Toggles isOn={hasTarget} onToggle={toggleTarget}
              items={services.map((sv: any) => ({ key: tKey('service', sv.id), label: sv.title || sv.provider_name }))} />
          </>}
          {products.length > 0 && <>
            <Text style={s.group}>{t('providerMkt.specificProducts')}</Text>
            <Toggles isOn={hasTarget} onToggle={toggleTarget}
              items={products.map((pr: any) => ({ key: tKey('product', pr.id), label: pr.name }))} />
          </>}
          <Button full label={t('providerMkt.saveCount', { count: T.length })} loading={saveTargets.isPending}
            disabled={pending} onPress={() => saveTargets.mutate()} style={{ marginTop: space.md }} />
        </Card>
      )}

      {tab === 'placements' && (
        <>
          {P.length === 0 && <EmptyState icon={MonitorPlay} title={t('providerMkt.noPlacements')} />}
          {P.map((p, i) => {
            const spec = (p.media_type === 'video' ? VIDEO_SPEC : IMAGE_SPEC)[p.slot] ?? IMAGE_SPEC.banner
            return (
              <Card key={i}>
                <Chips label={t('providerMkt.fPage')} value={p.page} onChange={v => upd(i, { page: v })}
                  options={PAGES.map(v => ({ value: v, label: t(`providerMkt.${PAGE_KEY[v]}`) }))} />
                <Chips label={t('providerMkt.fSlot')} value={p.slot} onChange={v => upd(i, { slot: v })}
                  options={SLOTS.map(v => ({ value: v, label: t(`providerMkt.${SLOT_KEY[v]}`) }))} />
                <Chips label={t('providerMkt.fMedia')} value={p.media_type}
                  onChange={v => upd(i, { media_type: v, media_url: v === p.media_type ? p.media_url : null })}
                  options={[
                    { value: 'image', label: t('providerMkt.fImage') },
                    { value: 'video', label: t('providerMkt.fVideo') },
                    { value: 'none', label: t('providerMkt.fTextOnly') },
                  ]} />

                {p.media_type !== 'none' && (
                  <View style={s.mediaBox}>
                    <Text style={s.spec}>
                      {spec.w}×{spec.h} · {spec.ratio}{spec.note ? ` · ${t(`campaignUi.${spec.note}`)}` : ''}
                    </Text>
                    {p.media_url ? (
                      <View style={s.preview}>
                        {p.media_type === 'image'
                          ? <Image source={{ uri: p.media_url }} style={s.previewImg} resizeMode="contain" />
                          : <View style={[s.previewImg, s.previewVideo]}><Film size={32} color={colors.textOnDark} /></View>}
                        <TouchableOpacity style={s.previewX} onPress={() => upd(i, { media_url: null })} hitSlop={8}>
                          <X size={14} color={colors.textOnDark} />
                        </TouchableOpacity>
                        <View style={s.previewOk}>
                          <Check size={11} color={colors.textOnDark} />
                          <Text style={s.previewOkTxt}>{t('campaignUi.uploaded')}</Text>
                        </View>
                      </View>
                    ) : (
                      <Button variant="secondary" full loading={uploading === i} disabled={uploading !== null}
                        label={uploading === i ? t('campaignUi.uploading')
                          : p.media_type === 'video' ? t('campaignUi.pickVideo') : t('campaignUi.pickImage')}
                        onPress={() => upload(i)} />
                    )}
                    <Text style={s.spec}>{p.media_type === 'video' ? t('campaignUi.videoLimit') : t('campaignUi.imageLimit')}</Text>
                  </View>
                )}

                <Input label={t('providerMkt.fTitle')} value={p.headline} onChangeText={v => upd(i, { headline: v })} />
                <Input label={t('providerMkt.fButtonText')} value={p.cta_label} placeholder={t('providerMkt.defaultCta')}
                  onChangeText={v => upd(i, { cta_label: v })} />
                <Input label={t('providerMkt.fSubtitle')} value={p.subtext} onChangeText={v => upd(i, { subtext: v })} />
                <Chips label={t('providerMkt.fLinkTo')} value={p.link_url} onChange={v => upd(i, { link_url: v })} options={linkOptions} />

                <Button variant="ghost" size="sm" label={t('providerMkt.remove')}
                  onPress={() => setP(P.filter((_, j) => j !== i))} />
              </Card>
            )
          })}
          <View style={s.stack}>
            <Button variant="secondary" full label={t('providerMkt.addPlacement')}
              icon={<Plus size={16} color={colors.brand} />} onPress={addPlacement} />
            <Button full label={t('providerMkt.saveCount', { count: P.length })} loading={savePlacements.isPending}
              disabled={pending || uploading !== null} onPress={() => savePlacements.mutate()} />
          </View>
        </>
      )}

      {tab === 'audience' && (
        <Card>
          <Text style={s.hint}>
            {A.length === 0 ? t('providerMkt.audienceHint') : t('providerMkt.offerForCount', { count: A.length })}
          </Text>
          {customers.length === 0 ? (
            <Text style={[s.hint, { textAlign: 'center', paddingVertical: space.lg }]}>{t('providerMkt.noCustomers')}</Text>
          ) : customers.map((c: any) => {
            const on = A.includes(c.email)
            return (
              <TouchableOpacity key={c.email} activeOpacity={0.7} style={s.cust} onPress={() => toggleCustomer(c.email)}>
                <View style={[s.check, on && s.checkOn]}>{on && <Check size={14} color={colors.textOnDark} />}</View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.custName} numberOfLines={1}>{c.name || c.email}</Text>
                  <Text style={s.hint}>{t('providerMkt.custStats', { b: c.bookings, s: Math.round(Number(c.spent ?? 0)) })}</Text>
                </View>
              </TouchableOpacity>
            )
          })}
          <View style={[s.stack, { marginTop: space.md }]}>
            <Button full label={t('providerMkt.saveCount', { count: A.length })} loading={saveAudience.isPending}
              disabled={pending} onPress={() => saveAudience.mutate()} />
            <Button variant="ghost" full label={t('providerMkt.clearAll')} disabled={A.length === 0} onPress={() => setA([])} />
          </View>
        </Card>
      )}
    </Screen>
  )
}

const s = StyleSheet.create({
  // Εικονίδιο πάνω από το κείμενο: στα 390px τα τρία ονόματα δεν χωράνε
  // δίπλα στο εικονίδιο. stretch = ίσο ύψος και στις τρεις.
  tabs: { flexDirection: 'row', alignItems: 'stretch', gap: space.xs, marginBottom: space.md },
  tab: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4,
    minHeight: 56, paddingHorizontal: space.xs, paddingVertical: space.sm, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  tabOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabTxt: { ...type.caption, color: colors.textMuted, fontWeight: weight.semibold, textAlign: 'center' },
  tabTxtOn: { color: colors.textOnDark },
  warn: { ...type.caption, color: '#B45309', backgroundColor: colors.warningBg, borderRadius: radius.lg, padding: space.md, marginBottom: space.md },
  group: { ...type.caption, color: colors.textLight, fontWeight: weight.bold, marginBottom: space.sm, marginTop: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%',
    paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.lg,
    borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface,
  },
  chipOn: { borderColor: colors.brand, backgroundColor: colors.brandTint },
  chipTxt: { ...type.caption, color: colors.textMuted, fontWeight: weight.medium, flexShrink: 1 },
  chipTxtOn: { color: colors.brand, fontWeight: weight.bold },
  mediaBox: { gap: space.sm, marginBottom: space.lg },
  spec: { ...type.caption, color: colors.textLight },
  preview: { borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
  previewImg: { width: '100%', height: 140 },
  previewVideo: { backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  previewX: {
    position: 'absolute', top: space.sm, right: space.sm, width: 28, height: 28, borderRadius: radius.md,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  previewOk: {
    position: 'absolute', bottom: space.sm, left: space.sm, flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.sm, backgroundColor: 'rgba(0,0,0,0.6)',
  },
  previewOkTxt: { ...type.caption, color: colors.textOnDark },
  // Κουμπιά σε στήλη: δίπλα-δίπλα τα μεγάλα ονόματα σπάνε σε δύο γραμμές
  // και τα κουμπιά βγαίνουν άνισα.
  stack: { gap: space.sm, marginBottom: space.lg },
  hint: { ...type.caption, color: colors.textMuted },
  cust: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  check: { width: 22, height: 22, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  custName: { ...type.body, color: colors.text, fontWeight: weight.medium },
})
