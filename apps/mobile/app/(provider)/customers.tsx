import { useCallback, useMemo, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Send, Check, X } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { Screen, Card, Badge, EmptyState, SkeletonRows, Button, Input } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Οι πελάτες του παρόχου, με μαζική αποστολή μηνύματος.
 *
 * Ο server δέχεται μέχρι 500 παραλήπτες και στέλνει ΜΟΝΟ σε δικούς του
 * πελάτες — όποιον κι αν βάλει ο πάροχος στη λίστα. Το ίδιο εμφανίζουμε
 * και εδώ, ώστε να μην εκπλαγεί αν κάποιοι απορριφθούν.
 */
export default function ProviderCustomers() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [composing, setComposing] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['provider-customers'],
    queryFn: () => api.get('/customers').then(r => r.data?.data ?? r.data ?? []),
  })

  const send = useMutation({
    mutationFn: () => api.post('/customers/message', {
      emails: [...picked],
      subject: subject.trim() || undefined,
      body: body.trim(),
    }),
    onSuccess: (r: any) => {
      const sent = r?.data?.sent ?? picked.size
      Alert.alert(t('providerCus.sentTitle'), t('providerCus.sentTo', { count: sent }))
      setComposing(false); setPicked(new Set()); setSubject(''); setBody('')
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('providerCus.errSend')),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await qc.invalidateQueries({ queryKey: ['provider-customers'] }); setRefreshing(false)
  }, [qc])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c: any) =>
      (c.name ?? '').toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q))
  }, [customers, search])

  const toggle = (email: string) => setPicked(p => {
    const n = new Set(p)
    n.has(email) ? n.delete(email) : n.add(email)
    return n
  })

  return (
    <Screen title={t('providerTabs.customers')} onRefresh={onRefresh} refreshing={refreshing}>
      {picked.size > 0 && (
        <Button
          label={t('providerCus.msgTo', { count: picked.size })}
          icon={<Send size={18} color={colors.textOnDark} />}
          onPress={() => setComposing(true)}
          full style={{ marginBottom: space.md }} />
      )}

      <Input value={search} onChangeText={setSearch}
        placeholder={t('providerCus.search')} />

      {isLoading ? <SkeletonRows count={4} /> :
       filtered.length === 0 ? <EmptyState icon={Users} title={t('providerCus.empty')} message={t('providerCus.emptyHint')} /> :
       filtered.map((c: any) => {
        const on = picked.has(c.email)
        return (
          <Card key={c.email} onPress={() => toggle(c.email)} style={on ? s.cardOn : undefined}>
            <View style={s.row}>
              <View style={[s.check, on && s.checkOn]}>
                {on && <Check size={14} color={colors.textOnDark} />}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.name} numberOfLines={1}>{c.name || c.email}</Text>
                <Text style={s.meta} numberOfLines={1}>
                  {t('providerCus.bookingCount', { count: c.bookings ?? 0 })} · €{Number(c.spent ?? 0).toFixed(0)}
                </Text>
                {!!c.tags?.length && (
                  <View style={s.tags}>
                    {c.tags.slice(0, 3).map((tag: string) => (
                      <Badge key={tag} label={tag} tone="neutral" />
                    ))}
                  </View>
                )}
              </View>
            </View>
          </Card>
        )
      })}

      {/* Σύνθεση μηνύματος */}
      <Modal visible={composing} transparent animationType="slide" onRequestClose={() => setComposing(false)}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>{t('providerCus.msgTo', { count: picked.size })}</Text>
              <TouchableOpacity onPress={() => setComposing(false)}>
                <X size={icon.md} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ gap: space.md }} keyboardShouldPersistTaps="handled">
              <Input label={t('providerCus.subject')} value={subject} onChangeText={setSubject}
                placeholder={t('providerCus.phSubject')} />
              <Input label={t('providerCus.messageReq')} value={body} onChangeText={setBody} multiline />
              <Text style={s.note}>{t('providerCus.inAppNote')}</Text>
            </ScrollView>
            <Button
              label={send.isPending ? t('providerCus.sending') : t('providerCus.send', { count: picked.size })}
              disabled={!body.trim() || send.isPending}
              loading={send.isPending}
              onPress={() => send.mutate()} full />
          </View>
        </View>
      </Modal>
    </Screen>
  )
}

const s = StyleSheet.create({
  cardOn: { borderColor: colors.brand, borderWidth: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  check: {
    width: 22, height: 22, borderRadius: radius.sm,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  name: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  meta: { ...type.caption, color: colors.textLight },
  tags: { flexDirection: 'row', gap: space.xs, marginTop: space.xs, flexWrap: 'wrap' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: space.lg, gap: space.md, maxHeight: '85%' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { ...type.section, color: colors.text },
  note: { ...type.caption, color: colors.textLight },
})
