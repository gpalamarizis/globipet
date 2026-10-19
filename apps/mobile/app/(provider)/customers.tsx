import { useCallback, useMemo, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Send, Check, X, SlidersHorizontal, StickyNote, ChevronRight } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { Screen, Card, Badge, EmptyState, SkeletonRows, Button, Input } from '@/components/ui'
import { Chips } from '@/components/Chips'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Οι πελάτες του παρόχου — ίδιες δυνατότητες με το web: αναζήτηση,
 * ταξινόμηση, φίλτρα (ελάχιστες κρατήσεις/έξοδα), επιλογή όλων, μαζικό
 * μήνυμα με προαιρετική συνοδευτική προσφορά, και καρτέλα πελάτη.
 *
 * Τα φίλτρα εφαρμόζονται στον server (ίδιο GET /customers με το web), ώστε
 * η αναζήτηση να βρίσκει «Νίκο» γράφοντας «νικ» (unaccent).
 */
type Sort = 'last' | 'spent' | 'bookings' | 'name'

export default function ProviderCustomers() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<Sort>('last')
  const [minBookings, setMinBookings] = useState('')
  const [minSpent, setMinSpent] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [composing, setComposing] = useState(false)
  const [msg, setMsg] = useState({ subject: '', body: '', campaign_id: '' })

  const params = useMemo(() => {
    const p: string[] = []
    if (q.trim()) p.push(`q=${encodeURIComponent(q.trim())}`)
    p.push(`sort=${sort}`)
    if (minBookings) p.push(`min_bookings=${encodeURIComponent(minBookings)}`)
    if (minSpent) p.push(`min_spent=${encodeURIComponent(minSpent)}`)
    return p.join('&')
  }, [q, sort, minBookings, minSpent])

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => api.get(`/customers?${params}`).then(r => r.data?.data ?? []),
  })
  const { data: campaigns = [] } = useQuery({
    queryKey: ['my-campaigns'],
    queryFn: () => api.get('/campaigns/mine').then(r => r.data?.data ?? []),
    enabled: composing,
  })

  const send = useMutation({
    mutationFn: () => api.post('/customers/message', {
      emails: [...picked],
      subject: msg.subject.trim() || null,
      body: msg.body.trim(),
      campaign_id: msg.campaign_id || null,
    }),
    onSuccess: (r: any) => {
      const { sent = 0, rejected } = r?.data ?? {}
      const lines = [t('providerCus.sentTo', { count: sent })]
      if (rejected?.length) lines.push(t('providerCus.rejectedNote', { count: rejected.length }))
      Alert.alert(t('providerCus.sentTitle'), lines.join('\n'))
      setComposing(false); setPicked(new Set()); setMsg({ subject: '', body: '', campaign_id: '' })
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('providerCus.errSend')),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await qc.invalidateQueries({ queryKey: ['customers'] }); setRefreshing(false)
  }, [qc])

  const toggle = (email: string) => setPicked(p => {
    const n = new Set(p)
    n.has(email) ? n.delete(email) : n.add(email)
    return n
  })
  const allSelected = customers.length > 0 && customers.every((c: any) => picked.has(c.email))
  const toggleAll = () => setPicked(allSelected ? new Set() : new Set(customers.map((c: any) => c.email)))
  const hasFilters = !!(q || minBookings || minSpent)
  const clearFilters = () => { setQ(''); setMinBookings(''); setMinSpent(''); setSort('last') }
  const num = (v: string) => v.replace(/[^0-9]/g, '')

  const offers = campaigns.filter((c: any) => c.discount_type)

  return (
    <Screen title={t('providerCus.title')} subtitle={t('providerCus.subtitle')} onRefresh={onRefresh} refreshing={refreshing}>
      {picked.size > 0 && (
        <Button label={t('providerCus.msgTo', { count: picked.size })}
          icon={<Send size={18} color={colors.textOnDark} />}
          onPress={() => setComposing(true)} full style={{ marginBottom: space.md }} />
      )}

      <View style={s.searchRow}>
        <View style={{ flex: 1 }}>
          <Input value={q} onChangeText={setQ} placeholder={t('providerCus.search')} />
        </View>
        <TouchableOpacity style={[s.filterBtn, (showFilters || hasFilters) && s.filterBtnOn]}
          onPress={() => setShowFilters(v => !v)} accessibilityLabel={t('providerCus.filters')}>
          <SlidersHorizontal size={icon.md} color={showFilters || hasFilters ? colors.brand : colors.textMuted} />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <Card>
          <Chips<Sort> label={t('providerCusMobile.sort')} value={sort} onChange={setSort} options={[
            { value: 'last', label: t('providerCus.sortRecent') },
            { value: 'spent', label: t('providerCus.sortSpent') },
            { value: 'bookings', label: t('providerCus.sortBookings') },
            { value: 'name', label: t('providerCus.sortName') },
          ]} />
          <View style={s.row2}>
            <View style={s.col}>
              <Input label={t('providerCus.minBookings')} value={minBookings} onChangeText={v => setMinBookings(num(v))} keyboardType="number-pad" />
            </View>
            <View style={s.col}>
              <Input label={t('providerCus.minSpend')} value={minSpent} onChangeText={v => setMinSpent(num(v))} keyboardType="number-pad" />
            </View>
          </View>
          <Button variant="ghost" size="sm" label={t('providerCus.clear')} disabled={!hasFilters} onPress={clearFilters} />
        </Card>
      )}

      {!isLoading && customers.length > 0 && (
        <View style={s.selectRow}>
          <TouchableOpacity onPress={toggleAll} hitSlop={8}>
            <Text style={s.selectTxt}>
              {allSelected ? t('providerCus.deselectAll') : t('providerCus.selectAll', { count: customers.length })}
            </Text>
          </TouchableOpacity>
          {picked.size > 0 && <Text style={s.selectedTxt}>{t('providerCus.selectedCount', { count: picked.size })}</Text>}
        </View>
      )}

      {isLoading ? <SkeletonRows count={4} /> :
       customers.length === 0 ? (
        <EmptyState icon={Users}
          title={hasFilters ? t('providerCus.noMatch') : t('providerCus.empty')}
          message={hasFilters ? t('providerCus.relaxFilters') : t('providerCus.emptyHint')} />
       ) : customers.map((c: any) => {
        const on = picked.has(c.email)
        return (
          <Card key={c.email} style={on ? s.cardOn : undefined}>
            <View style={s.row}>
              {/* Το τετράγωνο επιλέγει· το υπόλοιπο ανοίγει την καρτέλα. */}
              <TouchableOpacity onPress={() => toggle(c.email)} hitSlop={10}
                style={[s.check, on && s.checkOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                {on && <Check size={14} color={colors.textOnDark} />}
              </TouchableOpacity>
              <TouchableOpacity style={s.main} activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/(provider)/customer-detail', params: { email: c.email } } as any)}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={s.nameRow}>
                    <Text style={s.name} numberOfLines={1}>{c.name || c.email}</Text>
                    {!!c.note && <StickyNote size={12} color={colors.warning} />}
                  </View>
                  <Text style={s.meta} numberOfLines={1}>
                    {t('providerCus.bookingCount', { count: c.bookings ?? 0 })} · {Math.round(Number(c.spent ?? 0))}€
                    {c.cancelled > 0 ? ` · ${t('providerCus.cancelCount', { count: c.cancelled })}` : ''}
                  </Text>
                  {!!c.tags?.length && (
                    <View style={s.tags}>
                      {c.tags.slice(0, 3).map((tag: string) => <Badge key={tag} label={tag} tone="brand" />)}
                    </View>
                  )}
                </View>
                <ChevronRight size={icon.sm} color={colors.textLight} />
              </TouchableOpacity>
            </View>
          </Card>
        )
      })}

      <Modal visible={composing} transparent animationType="slide" onRequestClose={() => setComposing(false)}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>{t('providerCus.msgTo', { count: picked.size })}</Text>
              <TouchableOpacity onPress={() => setComposing(false)} hitSlop={8}>
                <X size={icon.md} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ gap: space.sm }} keyboardShouldPersistTaps="handled">
              <Text style={s.note}>{t('providerCus.inAppNote')}</Text>
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
              {offers.length > 0 && <Text style={s.note}>{t('providerCus.offerHint')}</Text>}
            </ScrollView>
            <Button
              label={send.isPending ? t('providerCus.sending') : t('providerCus.send', { count: picked.size })}
              disabled={!msg.body.trim() || send.isPending} loading={send.isPending}
              onPress={() => send.mutate()} full />
          </View>
        </View>
      </Modal>
    </Screen>
  )
}

const s = StyleSheet.create({
  // Το κουμπί φίλτρων τεντώνεται στο ύψος του πεδίου αναζήτησης: η γραμμή
  // παίρνει το ύψος του Input (+ το marginBottom του), και το ίδιο margin
  // εδώ αφήνει ακριβώς το ύψος του πεδίου — χωρίς σταθερό νούμερο.
  searchRow: { flexDirection: 'row', alignItems: 'stretch', gap: space.sm },
  filterBtn: {
    width: 48, marginBottom: space.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  filterBtnOn: { borderColor: colors.brand, backgroundColor: colors.brandLight },
  row2: { flexDirection: 'row', gap: space.md },
  col: { flex: 1 },
  selectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm },
  selectTxt: { ...type.caption, color: colors.brand, fontWeight: weight.semibold },
  selectedTxt: { ...type.caption, color: colors.brand, fontWeight: weight.bold },
  cardOn: { borderColor: colors.brand, borderWidth: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, minWidth: 0 },
  check: {
    width: 24, height: 24, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  name: { ...type.body, color: colors.text, fontWeight: weight.semibold, flexShrink: 1 },
  meta: { ...type.caption, color: colors.textLight },
  tags: { flexDirection: 'row', gap: space.xs, marginTop: space.xs, flexWrap: 'wrap' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: space.lg, gap: space.md, maxHeight: '85%' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { ...type.section, color: colors.text },
  note: { ...type.caption, color: colors.textLight },
})
