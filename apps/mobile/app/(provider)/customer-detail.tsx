import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { StickyNote, PawPrint, Star, MessageSquare, X, Send, Tag } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { Screen, Card, Badge, Button, Input, Loading, EmptyState } from '@/components/ui'
import { Chips } from '@/components/Chips'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Καρτέλα πελάτη — ίδια με το web: σύνοψη, ιδιωτική σημείωση με ετικέτες,
 * τα ζώα του (μόνο όνομα/ράτσα — όχι ιατρικά), ιστορικό κρατήσεων και τα
 * μηνύματα που του έστειλε ο πάροχος (με ένδειξη ανάγνωσης).
 */
export default function CustomerDetailScreen() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { email } = useLocalSearchParams<{ email: string }>()
  const [note, setNote] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [composing, setComposing] = useState(false)
  const [msg, setMsg] = useState({ subject: '', body: '', campaign_id: '' })
  // Συνοδευτική προσφορά — το web την προσφέρει και από την καρτέλα πελάτη.
  const { data: campaigns = [] } = useQuery({
    queryKey: ['my-campaigns'],
    queryFn: () => api.get('/campaigns/mine').then(r => r.data?.data ?? []),
    enabled: composing,
  })
  const offers = (campaigns as any[]).filter(c => c.discount_type)

  const { data: detail, isLoading, isError } = useQuery({
    queryKey: ['customer', email],
    queryFn: () => api.get(`/customers/${encodeURIComponent(String(email))}`).then(r => r.data?.data),
    enabled: !!email,
  })
  // Η σύνοψη (κρατήσεις, έξοδα, βαθμολογία) έρχεται από τη λίστα, όπως στο web.
  const { data: summary } = useQuery({
    queryKey: ['customer-summary', email],
    queryFn: () => api.get(`/customers?q=${encodeURIComponent(String(email))}&limit=20`)
      .then(r => (r.data?.data ?? []).find((c: any) => c.email === String(email).toLowerCase()) ?? null),
    enabled: !!email,
  })

  useEffect(() => {
    if (!detail) return
    setNote(detail.note?.note ?? '')
    setTags(detail.note?.tags ?? [])
  }, [detail?.email])

  const saveNote = useMutation({
    mutationFn: () => api.put(`/customers/${encodeURIComponent(String(email))}/note`, { note, tags }),
    onSuccess: () => {
      Alert.alert(t('providerCus.noteSaved'))
      qc.invalidateQueries({ queryKey: ['customer', email] })
      qc.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('providerCus.error')),
  })
  const send = useMutation({
    mutationFn: () => api.post('/customers/message', {
      emails: [String(email)], subject: msg.subject.trim() || null, body: msg.body.trim(),
      campaign_id: msg.campaign_id || null,
    }),
    onSuccess: (r: any) => {
      Alert.alert(t('providerCus.sentTitle'), t('providerCus.sentTo', { count: r?.data?.sent ?? 1 }))
      setComposing(false); setMsg({ subject: '', body: '', campaign_id: '' })
      qc.invalidateQueries({ queryKey: ['customer', email] })
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('providerCus.errSend')),
  })

  const addTag = () => {
    const v = tagInput.trim()
    if (v && !tags.includes(v)) setTags([...tags, v])
    setTagInput('')
  }

  // Ο server απαντά 404 αν ο πελάτης δεν έχει κράτηση σε αυτόν τον πάροχο.
  if (isError) return (
    <Screen title={t('providerCusMobile.details')} back>
      <EmptyState icon={StickyNote} title={t('providerCus.noMatch')} />
    </Screen>
  )
  if (isLoading || !detail) return <Screen title={t('providerCusMobile.details')} back><Loading /></Screen>

  const name = summary?.name || detail.email
  const STATS = [
    [t('providerCus.bookings'), summary?.bookings ?? detail.bookings.length],
    [t('providerCus.completed'), summary?.completed ?? detail.bookings.filter((b: any) => b.status === 'completed').length],
    [t('providerCus.spend'), `${Math.round(Number(summary?.spent ?? 0))}€`],
    [t('providerCus.rating'), Number(summary?.avg_rating) > 0 ? Number(summary.avg_rating).toFixed(1) : '—'],
  ]
  const statusLabel = (st: string) => st === 'completed' ? t('providerCus.stCompleted')
    : st === 'cancelled' ? t('providerCus.stCancelled') : t('providerCus.stConfirmed')
  const statusTone = (st: string) => st === 'completed' ? 'success' : st === 'cancelled' ? 'danger' : 'info'

  return (
    <Screen title={name} subtitle={detail.email} back>
      <Button label={t('providerCus.message')} variant="secondary" full
        icon={<Send size={16} color={colors.brand} />} onPress={() => setComposing(true)}
        style={{ marginBottom: space.md }} />

      <View style={s.grid}>
        {STATS.map(([label, value]) => (
          <Card key={String(label)} style={s.stat}>
            <Text style={s.statValue}>{String(value)}</Text>
            <Text style={s.statLabel}>{String(label)}</Text>
          </Card>
        ))}
      </View>

      <Card>
        <View style={s.headRow}>
          <StickyNote size={icon.sm} color={colors.textMuted} />
          <Text style={s.head}>{t('providerCus.note')}</Text>
        </View>
        <Input value={note} onChangeText={setNote} placeholder={t('providerCus.phNote')} multiline />
        <View style={s.tagRow}>
          <View style={{ flex: 1 }}>
            <Input value={tagInput} onChangeText={setTagInput} placeholder={t('providerCus.tag')} />
          </View>
          <TouchableOpacity style={s.tagBtn} onPress={addTag} accessibilityLabel={t('providerCusMobile.addTag')}>
            <Tag size={icon.sm} color={colors.brand} />
          </TouchableOpacity>
        </View>
        {tags.length > 0 && (
          <View style={s.tags}>
            {tags.map(tag => (
              <View key={tag} style={s.tagChip}>
                <Text style={s.tagTxt}>{tag}</Text>
                <TouchableOpacity hitSlop={8} onPress={() => setTags(tags.filter(x => x !== tag))}>
                  <X size={12} color={colors.brand} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        <Button full label={t('providerCus.saveNote')} loading={saveNote.isPending} disabled={saveNote.isPending}
          onPress={() => saveNote.mutate()} />
      </Card>

      {detail.pets?.length > 0 && (
        <Card>
          <Text style={s.group}>{t('providerCus.theirPets')}</Text>
          <View style={s.tags}>
            {detail.pets.map((p: any, i: number) => (
              <View key={i} style={s.pet}>
                <PawPrint size={12} color={colors.textMuted} />
                <Text style={s.petTxt}>{p.name}{p.breed ? ` · ${p.breed}` : ''}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      <Card>
        <Text style={s.group}>{t('providerCus.bookingHistory')}</Text>
        {detail.bookings.map((b: any) => (
          <View key={b.id} style={s.booking}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.bDate}>{b.booking_date} · {b.booking_time}</Text>
              {!!b.staff_name && <Text style={s.meta}>{b.staff_name}</Text>}
            </View>
            {!!b.rating && (
              <View style={s.rating}><Star size={11} color={colors.warning} /><Text style={s.meta}>{b.rating}</Text></View>
            )}
            <Text style={s.price}>{Math.round(Number(b.total_price ?? 0))}€</Text>
            <Badge label={statusLabel(b.status)} tone={statusTone(b.status) as any} />
          </View>
        ))}
      </Card>

      {detail.messages?.length > 0 && (
        <Card>
          <View style={s.headRow}>
            <MessageSquare size={icon.sm} color={colors.textMuted} />
            <Text style={s.group}>{t('providerCus.sentMessages')}</Text>
          </View>
          {detail.messages.map((m: any) => (
            <View key={m.id} style={s.message}>
              <View style={s.msgHead}>
                {!!m.subject && <Text style={s.msgSubject} numberOfLines={1}>{m.subject}</Text>}
                <Text style={[s.meta, { marginLeft: 'auto', color: m.read_at ? colors.success : colors.textLight }]}>
                  {m.read_at ? t('providerCus.read') : t('providerCus.unread')}
                </Text>
              </View>
              <Text style={s.msgBody} numberOfLines={2}>{m.body}</Text>
            </View>
          ))}
        </Card>
      )}

      <Modal visible={composing} transparent animationType="slide" onRequestClose={() => setComposing(false)}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>{t('providerCus.message')}</Text>
              <TouchableOpacity onPress={() => setComposing(false)} hitSlop={8}><X size={icon.md} color={colors.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ gap: space.sm }} keyboardShouldPersistTaps="handled">
              <Text style={s.meta}>{t('providerCus.inAppNote')}</Text>
              <Input label={t('providerCus.subject')} value={msg.subject} onChangeText={v => setMsg(m => ({ ...m, subject: v }))}
                placeholder={t('providerCus.phSubject')} />
              <Input label={t('providerCus.messageReq')} value={msg.body} onChangeText={v => setMsg(m => ({ ...m, body: v }))} multiline />
              {offers.length > 0 && (
                <Chips label={t('providerCus.attachedOffer')} value={msg.campaign_id}
                  onChange={v => setMsg(m => ({ ...m, campaign_id: v }))}
                  options={[{ value: '', label: t('providerCus.none') },
                    ...offers.map((c: any) => ({
                      value: c.id,
                      label: `${c.title} (${c.discount_type === 'percent' ? `-${c.discount_value}%` : `-${c.discount_value}€`})`,
                    }))]} />
              )}
              {offers.length > 0 && <Text style={s.meta}>{t('providerCus.offerHint')}</Text>}
            </ScrollView>
            <Button full label={send.isPending ? t('providerCus.sending') : t('providerCus.send', { count: 1 })}
              disabled={!msg.body.trim() || send.isPending} loading={send.isPending} onPress={() => send.mutate()} />
          </View>
        </View>
      </Modal>
    </Screen>
  )
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.sm, marginBottom: space.md },
  stat: { width: '48.5%' },
  statValue: { ...type.title, color: colors.text, fontWeight: weight.black },
  statLabel: { ...type.caption, color: colors.textMuted },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: space.sm },
  head: { ...type.caption, color: colors.textMuted, fontWeight: weight.semibold },
  group: { ...type.caption, color: colors.textLight, fontWeight: weight.bold, marginBottom: space.sm },
  tagRow: { flexDirection: 'row', alignItems: 'stretch', gap: space.sm },
  tagBtn: {
    width: 48, marginBottom: space.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginBottom: space.md },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space.sm, paddingVertical: 4,
    borderRadius: radius.full, backgroundColor: colors.brandLight,
  },
  tagTxt: { ...type.caption, color: colors.brand, fontWeight: weight.semibold },
  pet: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space.sm, paddingVertical: 4,
    borderRadius: radius.full, backgroundColor: colors.surfaceAlt,
  },
  petTxt: { ...type.caption, color: colors.text },
  booking: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  bDate: { ...type.body, color: colors.text, fontWeight: weight.medium },
  meta: { ...type.caption, color: colors.textLight },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  price: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  message: { backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: space.md, marginBottom: space.sm },
  msgHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  msgSubject: { ...type.body, color: colors.text, fontWeight: weight.semibold, flexShrink: 1 },
  msgBody: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: space.lg, gap: space.md, maxHeight: '85%' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { ...type.section, color: colors.text },
})
