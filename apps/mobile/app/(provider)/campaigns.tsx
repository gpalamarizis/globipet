import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, Switch, Alert, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Megaphone, Plus, Pencil, Settings2, Trash2, Eye, MousePointerClick, CheckCircle2 } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { Screen, Card, Badge, EmptyState, SkeletonRows, Button } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Οι καμπάνιες του παρόχου — ίδιες δυνατότητες με το web: δημιουργία,
 * επεξεργασία, παύση/ενεργοποίηση, διαγραφή και ρυθμίσεις (τι αφορά, πού
 * προβάλλεται με εικόνα ή βίντεο, σε ποιους).
 */
export default function ProviderCampaigns() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['my-campaigns'],
    queryFn: () => api.get('/campaigns/mine').then(r => r.data?.data ?? []),
  })

  const toggle = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => api.patch(`/campaigns/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-campaigns'] }),
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('providerMkt.errSave')),
  })
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/campaigns/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-campaigns'] }); Alert.alert(t('providerMkt.deleted')) },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('providerMkt.errDelete')),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await qc.invalidateQueries({ queryKey: ['my-campaigns'] }); setRefreshing(false)
  }, [qc])

  // Ίδια λογική με το web: «live» από τον server, αλλιώς προγραμματισμένη ή έληξε.
  const state = (c: any) => {
    if (!c.is_active) return { label: t('providerMkt.stPaused'), tone: 'neutral' }
    if (c.live) return { label: t('providerMkt.stActive'), tone: 'success' }
    if (new Date(c.starts_at) > new Date()) return { label: t('providerMkt.stScheduled'), tone: 'info' }
    return { label: t('providerMkt.stExpired'), tone: 'neutral' }
  }
  const discount = (c: any) =>
    !c.discount_type ? t('providerMkt.stDisplayOnly')
      : c.discount_type === 'percent' ? `−${c.discount_value}%` : `−${c.discount_value}€`
  const daysLeft = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5)

  const askDelete = (c: any) => Alert.alert(t('providerMkt.confirmDelete', { name: c.title }), '', [
    { text: t('providerMkt.cancel'), style: 'cancel' },
    { text: t('providerPkg.delete'), style: 'destructive', onPress: () => remove.mutate(c.id) },
  ])

  return (
    <Screen title={t('providerMkt.title')} subtitle={t('providerMkt.subtitle')} onRefresh={onRefresh} refreshing={refreshing}>
      <Button label={t('providerMkt.newCampaign')} icon={<Plus size={18} color={colors.textOnDark} />}
        onPress={() => router.push('/(provider)/campaign-form' as any)} full style={{ marginBottom: space.md }} />

      {isLoading ? <SkeletonRows count={3} /> :
       campaigns.length === 0 ? <EmptyState icon={Megaphone} title={t('providerMkt.empty')} message={t('providerMkt.emptyHint')} /> :
       campaigns.map((c: any) => {
        const st = state(c)
        const left = daysLeft(c.ends_at)
        return (
          <Card key={c.id} style={!c.is_active ? s.inactive : undefined}>
            <View style={s.top}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.title} numberOfLines={1}>{c.title}</Text>
                {!!c.description && <Text style={s.desc} numberOfLines={2}>{c.description}</Text>}
              </View>
              <Switch value={!!c.is_active} onValueChange={v => toggle.mutate({ id: c.id, is_active: v })}
                trackColor={{ true: colors.brand, false: colors.border }} thumbColor={colors.surface} />
            </View>

            <View style={s.badges}>
              <Badge label={st.label} tone={st.tone as any} />
              <Badge label={discount(c)} tone={c.discount_type ? 'brand' : 'neutral'} />
            </View>
            <View style={s.badges}>
              <Badge label={c.targets ? t('providerMkt.targetCount', { count: c.targets }) : t('providerMkt.noTarget')}
                tone={c.targets ? 'neutral' : 'warning'} />
              <Badge label={c.placements ? t('providerMkt.placementCount', { count: c.placements }) : t('providerMkt.noBanner')} tone="neutral" />
              <Badge label={c.audience ? t('providerMkt.audienceCount', { count: c.audience }) : t('providerMkt.toEveryone')} tone="neutral" />
            </View>

            <View style={s.stats}>
              <View style={s.stat}><Eye size={13} color={colors.textLight} /><Text style={s.meta}>{c.views ?? 0}</Text></View>
              <View style={s.stat}><MousePointerClick size={13} color={colors.textLight} /><Text style={s.meta}>{c.clicks ?? 0}</Text></View>
              <View style={s.stat}><CheckCircle2 size={13} color={colors.textLight} /><Text style={s.meta}>{c.redemptions ?? 0}</Text></View>
              <Text style={[s.meta, { marginLeft: 'auto' }]}>
                {left > 0 ? t('providerMkt.daysLeft', { count: left }) : t('providerMkt.stExpired')}
              </Text>
            </View>

            <View style={s.actions}>
              <TouchableOpacity style={s.action} activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/(provider)/campaign-settings', params: { id: c.id } } as any)}>
                <Settings2 size={icon.sm} color={colors.brand} />
                <Text style={s.actionTxt}>{t('providerMkt.settings')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.action} activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/(provider)/campaign-form', params: { id: c.id } } as any)}>
                <Pencil size={icon.sm} color={colors.brand} />
                <Text style={s.actionTxt}>{t('providerMkt.edit')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.del} activeOpacity={0.7} onPress={() => askDelete(c)}
                accessibilityLabel={t('providerPkg.delete')}>
                <Trash2 size={icon.sm} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </Card>
        )
      })}
    </Screen>
  )
}

const s = StyleSheet.create({
  inactive: { opacity: 0.7 },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.sm },
  title: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  desc: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  badges: { flexDirection: 'row', gap: space.xs, marginTop: space.sm, flexWrap: 'wrap' },
  stats: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { ...type.caption, color: colors.textLight },
  actions: {
    flexDirection: 'row', gap: space.sm, marginTop: space.md, paddingTop: space.md,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  action: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs,
    minHeight: 40, borderRadius: radius.md, backgroundColor: colors.brandLight,
  },
  actionTxt: { ...type.caption, color: colors.brand, fontWeight: weight.bold },
  del: {
    width: 44, minHeight: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.dangerBg,
  },
})
