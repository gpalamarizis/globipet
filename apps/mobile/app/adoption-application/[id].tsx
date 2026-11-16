import { useState } from 'react'
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, Alert, Linking, Modal, ScrollView, Share } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Send, Phone, FileSignature, PawPrint, X, Share2 } from 'lucide-react-native'
import { api } from '@/lib/api'
import { fmtDateShort } from '@/lib/dates'
import { Screen, Card, Badge, Button, Loading, EmptyState } from '@/components/ui'
import { SwitchRow } from '@/components/SwitchRow'
import { DateField } from '@/components/DateField'
import { APP_TONE, SPECIES_EMOJI, countryName, useAdoptionRules, useLang, adoptionStyles as a } from '@/components/adoption'
import { colors, space, radius, type, weight, icon, touch } from '@/theme'

/**
 * Μία αίτηση υιοθεσίας — κοινή οθόνη για τις δύο πλευρές (my_role), όπως η
 * σελίδα /adoption/applications/:id του web: μηνύματα, έγκριση/απόρριψη,
 * ολοκλήρωση με τα βήματα του νόμου, συμφωνητικό, «στα κατοικίδιά μου».
 */
export default function AdoptionApplicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const lang = useLang()
  const router = useRouter()
  const qc = useQueryClient()
  const [msg, setMsg] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [acks, setAcks] = useState<string[]>([])
  const [cec, setCec] = useState('')
  const [contractOpen, setContractOpen] = useState(false)

  const { data: ap, isLoading, isError, refetch, isRefetching } = useQuery<any>({
    queryKey: ['adoption-application', id],
    queryFn: () => api.get(`/adoption/applications/${id}`).then(r => r.data.data),
    enabled: !!id, retry: false, refetchInterval: 15000,
  })
  const { data: rules } = useAdoptionRules(ap?.listing?.country ?? '')
  const { data: contract } = useQuery<any>({
    queryKey: ['adoption-contract', id, lang],
    queryFn: () => api.get(`/adoption/applications/${id}/contract`, { params: { lang } }).then(r => r.data.data),
    enabled: contractOpen && !!ap?.contract_available,
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['adoption-application', id] }); qc.invalidateQueries({ queryKey: ['adoption-received'] })
    qc.invalidateQueries({ queryKey: ['adoption-mine'] }); qc.invalidateQueries({ queryKey: ['adoption-my-applications'] })
  }
  const onError = (e: any) => Alert.alert(t('adoption.common.error'), e?.response?.data?.message || t('adoption.common.error'))
  const send = useMutation({ mutationFn: () => api.post(`/adoption/applications/${id}/messages`, { body: msg }), onSuccess: () => { setMsg(''); refresh() }, onError })
  const patch = useMutation({ mutationFn: (body: any) => api.patch(`/adoption/applications/${id}`, body), onSuccess: refresh, onError })
  const withdraw = useMutation({ mutationFn: () => api.post(`/adoption/applications/${id}/withdraw`, {}), onSuccess: refresh, onError })
  const complete = useMutation({ mutationFn: () => api.post(`/adoption/applications/${id}/complete`, { acks, cec_date: cec || null }), onSuccess: () => { Alert.alert(t('adoption.app.completed')); refresh() }, onError })
  const addPet = useMutation({ mutationFn: () => api.post(`/adoption/applications/${id}/add-pet`, {}).then(r => r.data.data), onSuccess: () => { Alert.alert('✓', t('adoption.app.addedToPets')); refresh() }, onError })

  if (isLoading) return <Screen title={t('adoption.app.title')} back><Loading /></Screen>
  if (isError || !ap) return <Screen title={t('adoption.app.title')} back><EmptyState title={t('adoption.common.error')} /></Screen>

  const lister = ap.my_role === 'lister'
  const l = ap.listing
  const open = ['pending', 'reviewing', 'approved'].includes(ap.status)
  const chatOpen = !(ap.status === 'withdrawn' || (ap.status === 'rejected' && !lister))
  const allAcks = ap.completion.acks.every((k: any) => acks.includes(k.key)) && (!ap.completion.cec_required || !!cec || !!ap.cec_date)
  const confirm = (title: string, body: string, fn: () => void) => Alert.alert(title, body, [{ text: t('adoption.common.cancel'), style: 'cancel' }, { text: title, onPress: fn }])
  const answerVal = (k: string, v: any) => {
    if (typeof v === 'boolean') return v ? t('adoption.tristate.yes') : t('adoption.tristate.no')
    if (k === 'country') return countryName(t, String(v))
    if (k === 'housing') return t(`adoption.apply.housing${String(v).charAt(0).toUpperCase()}${String(v).slice(1)}`)
    if (k === 'ownership') return t(`adoption.apply.${v}`)
    return v === null || v === '' ? '—' : String(v)
  }
  const shareContract = () => {
    if (!contract) return
    const text = [contract.title, '', ...contract.sections.flatMap((s: any) => [s.heading, ...s.body, '']), `${contract.place_date_label}: ____________ / ${contract.date}`, '',
      ...contract.signatures.map((x: string) => `${x}: ____________________`)].join('\n')
    Share.share({ title: contract.title, message: text }).catch(() => {})
  }

  return (
    <Screen title={l.name} subtitle={t('adoption.app.title')} back onRefresh={refetch} refreshing={isRefetching}>
      <Card style={{ marginBottom: space.lg }}>
        <View style={a.row}>
          <View style={s.thumb}>{l.photos?.[0] ? <Image source={{ uri: l.photos[0] }} style={StyleSheet.absoluteFillObject} /> : <Text style={{ fontSize: 26 }}>{SPECIES_EMOJI[l.species]}</Text>}</View>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={s.name} numberOfLines={1}>{lister ? `${t('adoption.app.applicant')}: ${ap.applicant_name}` : `${t('adoption.detail.listedBy')}: ${l.lister?.name ?? ''}`}</Text>
            <View style={{ alignSelf: 'flex-start' }}><Badge label={t(`adoption.appStatus.${ap.status}`)} tone={APP_TONE[ap.status]} /></View>
          </View>
        </View>
        <Button size="sm" variant="ghost" label={t('adoption.manage.view')} onPress={() => router.push(`/adoption/${l.id}` as any)} style={{ alignSelf: 'flex-start', marginTop: space.sm }} />
      </Card>

      {!lister && ap.status === 'approved' && <Card style={{ marginBottom: space.lg, backgroundColor: colors.successBg }}><Text style={[a.body, { color: '#047857' }]}>{t('adoption.app.approvedApplicant')}</Text></Card>}
      {ap.status === 'rejected' && ap.decision_reason === 'listing_adopted' && <Card style={{ marginBottom: space.lg }}><Text style={a.muted}>{t('adoption.app.closedAdopted')}</Text></Card>}
      {ap.status === 'rejected' && ap.decision_reason === 'listing_withdrawn' && <Card style={{ marginBottom: space.lg }}><Text style={a.muted}>{t('adoption.app.closedWithdrawn')}</Text></Card>}

      {lister && (
        <Card style={{ marginBottom: space.lg }}>
          <Text style={[a.section, { marginTop: 0 }]}>{t('adoption.app.answers')}</Text>
          {Object.entries(ap.answers ?? {}).map(([k, v]) => (
            <View key={k} style={a.infoRow}><Text style={a.muted}>{t(`adoption.app.labels.${k}`, { defaultValue: k })}</Text><Text style={[s.val, { flexShrink: 1, textAlign: 'right' }]}>{answerVal(k, v)}</Text></View>
          ))}
          {ap.message ? <View style={s.msgBox}><Text style={a.muted}>{t('adoption.app.message')}</Text><Text style={a.body}>{ap.message}</Text></View> : null}
          {ap.applicant_phone ? <Button size="sm" variant="secondary" label={ap.applicant_phone} icon={<Phone size={icon.sm} color={colors.text} />} onPress={() => Linking.openURL(`tel:${ap.applicant_phone}`)} style={{ alignSelf: 'flex-start', marginTop: space.md }} /> : null}
        </Card>
      )}

      {lister && open && (
        <View style={[a.row, { flexWrap: 'wrap', marginBottom: space.lg }]}>
          {ap.status === 'pending' && <Button size="sm" variant="secondary" label={t('adoption.app.markReviewing')} onPress={() => patch.mutate({ status: 'reviewing' })} />}
          {ap.status !== 'approved' && <Button size="sm" label={t('adoption.app.approve')} onPress={() => confirm(t('adoption.app.approve'), t('adoption.app.confirmApprove'), () => patch.mutate({ status: 'approved' }))} />}
          <Button size="sm" variant="danger" label={t('adoption.app.reject')} onPress={() => confirm(t('adoption.app.reject'), t('adoption.app.confirmReject'), () => patch.mutate({ status: 'rejected' }))} />
        </View>
      )}

      {lister && ap.status === 'approved' && (
        <Card style={{ marginBottom: space.lg }}>
          <Text style={[a.section, { marginTop: 0 }]}>{t('adoption.app.completeTitle')}</Text>
          <Text style={[a.muted, { marginBottom: space.md }]}>{t('adoption.app.completeIntro')}</Text>
          {ap.completion.acks.map((k: any) => (
            <SwitchRow key={k.key} label={k.label} value={acks.includes(k.key)} onChange={v => setAcks(x => v ? [...x, k.key] : x.filter(y => y !== k.key))} />
          ))}
          {ap.completion.cec_required && (
            <DateField label={t('adoption.app.cecDate')} hint={t('adoption.app.cecHint')} value={cec || (ap.cec_date ? String(ap.cec_date).slice(0, 10) : '')} onChange={setCec} maximumDate={new Date()} />
          )}
          <Button label={t('adoption.app.complete')} onPress={() => complete.mutate()} loading={complete.isPending} disabled={!allAcks} full />
        </Card>
      )}

      {!lister && ap.status === 'completed' && (
        <Card style={{ marginBottom: space.lg }}>
          <Text style={[a.section, { marginTop: 0 }]}>{t('adoption.app.completed')}</Text>
          {ap.pet_created_id
            ? <Button label={t('adoption.app.viewPet')} onPress={() => router.push(`/pets/${ap.pet_created_id}` as any)} full />
            : <Button label={t('adoption.app.addToPets')} icon={<PawPrint size={icon.sm} color={colors.textOnDark} />} onPress={() => addPet.mutate()} loading={addPet.isPending} full />}
        </Card>
      )}

      {ap.contract_available && (
        <Card style={{ marginBottom: space.lg }}>
          <View style={a.row}><FileSignature size={icon.md} color="#4F46E5" /><Text style={s.name}>{t('adoption.app.contract')}</Text></View>
          <Text style={[a.muted, { marginVertical: space.sm }]}>{t('adoption.app.contractHint')}</Text>
          <Button variant="secondary" label={t('adoption.app.showContract')} onPress={() => setContractOpen(true)} full />
        </Card>
      )}

      {/* Μηνύματα */}
      <Card style={{ marginBottom: space.lg }}>
        <Text style={[a.section, { marginTop: 0 }]}>{t('adoption.app.chat')}</Text>
        {ap.messages.length === 0 && <Text style={[a.muted, { textAlign: 'center', marginVertical: space.lg }]}>{t('adoption.app.chatEmpty')}</Text>}
        {ap.messages.map((m: any) => (
          <View key={m.id} style={[s.bubble, m.is_mine ? s.mine : s.theirs]}>
            <Text style={[a.body, m.is_mine && { color: colors.textOnDark }]}>{m.body}</Text>
            <Text style={[s.time, m.is_mine && { color: 'rgba(255,255,255,0.75)' }]}>{new Date(m.created_at).toLocaleString(lang, { dateStyle: 'short', timeStyle: 'short' })}</Text>
          </View>
        ))}
        {chatOpen ? (
          <View style={s.composer}>
            <TextInput value={msg} onChangeText={setMsg} placeholder={t('adoption.app.chatPlaceholder')} placeholderTextColor={colors.textLight} maxLength={2000} multiline style={s.input} />
            <TouchableOpacity onPress={() => msg.trim() && send.mutate()} disabled={!msg.trim() || send.isPending} style={[s.sendBtn, (!msg.trim() || send.isPending) && { opacity: 0.5 }]} accessibilityLabel={t('adoption.app.send')}>
              <Send size={icon.md} color={colors.textOnDark} />
            </TouchableOpacity>
          </View>
        ) : <Text style={[a.muted, { marginTop: space.md }]}>{t('adoption.app.chatClosed')}</Text>}
      </Card>

      {lister && (
        <Card style={{ marginBottom: space.lg }}>
          <Text style={[a.section, { marginTop: 0 }]}>{t('adoption.app.note')}</Text>
          <TextInput value={note ?? ap.lister_note ?? ''} onChangeText={setNote} placeholder={t('adoption.app.notePlaceholder')} placeholderTextColor={colors.textLight} multiline maxLength={2000} style={[s.input, { minHeight: 80, marginBottom: space.md }]} />
          <Button size="sm" variant="secondary" label={t('adoption.app.saveNote')} disabled={note === null} onPress={() => patch.mutate({ lister_note: note ?? '' }, { onSuccess: () => Alert.alert('✓', t('adoption.app.noteSaved')) })} style={{ alignSelf: 'flex-start' }} />
        </Card>
      )}

      {(ap.status === 'approved' || ap.status === 'completed') && rules?.guide?.after?.length > 0 && (
        <Card style={{ marginBottom: space.lg }}>
          <Text style={[a.section, { marginTop: 0 }]}>{t('adoption.app.nextSteps')}</Text>
          {rules.guide.after.map((i: any, k: number) => <Text key={k} style={[a.body, { marginBottom: space.xs }]}>• {i.text}</Text>)}
        </Card>
      )}

      {!lister && open && <Button variant="ghost" label={t('adoption.app.withdraw')} onPress={() => confirm(t('adoption.app.withdraw'), t('adoption.app.confirmWithdraw'), () => withdraw.mutate())} full />}
      <Text style={[a.muted, { textAlign: 'center', marginTop: space.md }]}>{t('adoption.apps.submitted', { date: fmtDateShort(ap.created_at, lang) })}</Text>

      <Modal visible={contractOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setContractOpen(false)}>
        <View style={s.sheet}>
          <View style={a.rowBetween}>
            <Text style={s.sheetTitle} numberOfLines={2}>{contract?.title ?? t('adoption.app.contract')}</Text>
            <TouchableOpacity onPress={() => setContractOpen(false)} hitSlop={12} accessibilityLabel={t('adoption.common.close')}><X size={icon.lg} color={colors.text} /></TouchableOpacity>
          </View>
          {!contract ? <Loading /> : (
            <ScrollView style={{ flex: 1, marginTop: space.lg }} contentContainerStyle={{ paddingBottom: space.xxxl }}>
              {contract.sections.map((sec: any) => (
                <View key={sec.heading} style={{ marginBottom: space.lg }}>
                  <Text style={s.name}>{sec.heading}</Text>
                  {sec.body.map((b: string, i: number) => <Text key={i} style={[a.body, { marginTop: 2 }]}>{b}</Text>)}
                </View>
              ))}
              <Button label={t('adoption.app.printContract')} icon={<Share2 size={icon.sm} color={colors.textOnDark} />} onPress={shareContract} full />
            </ScrollView>
          )}
        </View>
      </Modal>
    </Screen>
  )
}

const s = StyleSheet.create({
  thumb: { width: 56, height: 56, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  name: { ...type.body, fontWeight: weight.bold, color: colors.text, flexShrink: 1 },
  val: { ...type.body, color: colors.text, fontWeight: weight.medium },
  msgBox: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: space.md, marginTop: space.md, gap: space.xs },
  bubble: { maxWidth: '82%', borderRadius: radius.lg, paddingHorizontal: space.md, paddingVertical: space.sm, marginBottom: space.sm },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.brand, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surfaceAlt, borderBottomLeftRadius: 4 },
  time: { ...type.caption, fontSize: 11, color: colors.textLight, marginTop: 2 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, marginTop: space.md },
  input: { ...type.body, flex: 1, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.sm, minHeight: touch.min, maxHeight: 120, backgroundColor: colors.surface, textAlignVertical: 'top' },
  sendBtn: { width: touch.min, height: touch.min, borderRadius: radius.md, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  sheet: { flex: 1, backgroundColor: colors.bg, padding: space.lg, paddingTop: space.xxl },
  sheetTitle: { ...type.section, fontWeight: weight.bold, color: colors.text, flex: 1 },
})
