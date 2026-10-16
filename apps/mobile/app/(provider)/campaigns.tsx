import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, Switch, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Megaphone, Plus } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { Screen, Card, Badge, EmptyState, SkeletonRows, Button } from '@/components/ui'
import { colors, space, type, weight } from '@/theme'

/**
 * Οι καμπάνιες του παρόχου.
 *
 * Από κινητό το χρήσιμο είναι να βλέπεις τι τρέχει και να το σταματάς ή να
 * το ξεκινάς. Η δημιουργία με στοχεύσεις, κοινό και θέσεις προβολής έχει
 * δεκάδες πεδία και μένει στο web — εδώ φτιάχνεται απλή καμπάνια έκπτωσης.
 */
export default function ProviderCampaigns() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['my-campaigns'],
    queryFn: () => api.get('/campaigns/mine').then(r => r.data?.data ?? r.data ?? []),
  })

  const toggle = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch(`/campaigns/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-campaigns'] }),
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('providerMkt.errSave')),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await qc.invalidateQueries({ queryKey: ['my-campaigns'] }); setRefreshing(false)
  }, [qc])

  // Η κατάσταση προκύπτει από τις ημερομηνίες, όχι μόνο από το is_active:
  // καμπάνια ενεργή αλλά ληγμένη δεν προβάλλεται πουθενά.
  const state = (c: any) => {
    const now = Date.now()
    if (!c.is_active) return { key: 'stPaused', tone: 'neutral' }
    if (new Date(c.ends_at).getTime() < now) return { key: 'stExpired', tone: 'neutral' }
    if (new Date(c.starts_at).getTime() > now) return { key: 'stScheduled', tone: 'info' }
    return { key: 'stActive', tone: 'success' }
  }

  const discount = (c: any) =>
    c.discount_type === 'percent' ? `−${c.discount_value}%`
    : c.discount_type === 'amount' ? `−€${Number(c.discount_value).toFixed(2)}`
    : t('providerMkt.noDiscount')

  return (
    <Screen title={t('providerTabs.campaigns')} onRefresh={onRefresh} refreshing={refreshing}>
      <Button
        label={t('providerCampaignNew.title')}
        icon={<Plus size={18} color={colors.textOnDark} />}
        onPress={() => router.push('/(provider)/new-campaign' as any)}
        full style={{ marginBottom: space.md }} />

      {isLoading ? <SkeletonRows count={3} /> :
       campaigns.length === 0 ? <EmptyState icon={Megaphone} title={t('providerMkt.empty')} message={t('providerMkt.emptyHint')} /> :
       campaigns.map((c: any) => {
        const st = state(c)
        return (
          <Card key={c.id}>
            <View style={s.top}>
              <Text style={s.title} numberOfLines={1}>{c.title}</Text>
              <Switch
                value={!!c.is_active}
                onValueChange={v => toggle.mutate({ id: c.id, is_active: v })}
                trackColor={{ true: colors.brand, false: colors.border }}
                thumbColor={colors.surface} />
            </View>
            <View style={s.badges}>
              <Badge label={t(`providerMkt.${st.key}`)} tone={st.tone as any} />
              <Badge label={discount(c)} tone="neutral" />
            </View>
            <Text style={s.meta}>{c.starts_at?.slice(0, 10)} → {c.ends_at?.slice(0, 10)}</Text>
            {(c.views > 0 || c.redemptions > 0) && (
              <Text style={s.meta}>
                {t('providerMkt.viewsRedemptions', { views: c.views ?? 0, redemptions: c.redemptions ?? 0 })}
              </Text>
            )}
          </Card>
        )
      })}
      {campaigns.length > 0 && <Text style={s.hint}>{t('providerMobile.manageOnWeb')}</Text>}
    </Screen>
  )
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  title: { ...type.body, color: colors.text, fontWeight: weight.semibold, flex: 1 },
  badges: { flexDirection: 'row', gap: space.xs, marginTop: space.xs, flexWrap: 'wrap' },
  meta: { ...type.caption, color: colors.textLight, marginTop: space.xs },
  hint: { ...type.caption, color: colors.textLight, textAlign: 'center', marginTop: space.md },
})
