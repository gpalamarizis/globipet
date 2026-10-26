import { useCallback, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Award, ShoppingBag, Calendar, Video, Ticket, Brain, RotateCcw, Info } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, Card, Badge, Button, SkeletonRows, EmptyState } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Πρόγραμμα επιβράβευσης — «Πώς λειτουργεί» (Ε17). Ίδιο περιεχόμενο με το
 * web (/loyalty, LoyaltyPage). Οι κανόνες έρχονται από τον server
 * (GET /loyalty → config, ή GET /loyalty/config χωρίς σύνδεση).
 */
type Tier = 'bronze' | 'silver' | 'gold' | 'platinum'
const TIERS: Tier[] = ['bronze', 'silver', 'gold', 'platinum']

/** Χρώματα επιπέδων — ίδια παλέτα με το web. */
const TIER_COLORS: Record<Tier, { bg: string; fg: string }> = {
  bronze:   { bg: '#FFEDD5', fg: '#9A3412' },
  silver:   { bg: '#E5E7EB', fg: '#374151' },
  gold:     { bg: '#FEF9C3', fg: '#854D0E' },
  platinum: { bg: '#E0E7FF', fg: '#3730A3' },
}

const EARN_SOURCES = [
  { key: 'orders',        Icon: ShoppingBag },
  { key: 'bookings',      Icon: Calendar },
  { key: 'telehealth',    Icon: Video },
  { key: 'events',        Icon: Ticket },
  { key: 'subscriptions', Icon: Brain },
] as const

function TierPill({ tier, label }: { tier: Tier; label: string }) {
  return (
    <View style={[s.pill, { backgroundColor: TIER_COLORS[tier].bg }]}>
      <Text style={[s.pillTxt, { color: TIER_COLORS[tier].fg }]}>{label}</Text>
    </View>
  )
}

export default function LoyaltyScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const [refreshing, setRefreshing] = useState(false)

  // Ίδιο key με το Προφίλ (app/(tabs)/profile.tsx): μία ανάγνωση για τις δύο οθόνες.
  const { data: mine, isLoading: loadingMine, isError: errMine } = useQuery({
    queryKey: ['loyalty'],
    queryFn: () => api.get('/loyalty').then(r => r.data?.data ?? r.data),
    enabled: isAuthenticated,
  })
  const { data: publicConfig, isLoading: loadingConfig, isError: errConfig } = useQuery({
    queryKey: ['loyalty-config'],
    queryFn: () => api.get('/loyalty/config').then(r => r.data?.data ?? r.data),
    enabled: !isAuthenticated,
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: isAuthenticated ? ['loyalty'] : ['loyalty-config'] })
    setRefreshing(false)
  }, [qc, isAuthenticated])

  const config = mine?.config ?? publicConfig
  const loading = isAuthenticated ? loadingMine : loadingConfig
  const failed = isAuthenticated ? errMine : errConfig

  const num = (n: number) => Number(n || 0).toLocaleString(i18n.language)
  const tierName = (k: Tier) => t(`profile.${k}`, { defaultValue: k })

  if (loading) {
    return <Screen title={t('loyaltyPage.title')} back><SkeletonRows count={4} /></Screen>
  }
  if (failed || !config) {
    return (
      <Screen title={t('loyaltyPage.title')} back>
        <EmptyState icon={Award} title={t('common.error')} />
      </Screen>
    )
  }

  const tier: Tier = TIERS.includes(mine?.tier) ? mine.tier : 'bronze'
  const lifetime: number = mine?.lifetime_points ?? mine?.total_points ?? 0
  const nextTier: Tier | null = mine?.next_tier ?? null
  const curThreshold: number = config.thresholds?.[tier] ?? 0
  const nextThreshold: number | null = nextTier ? config.thresholds?.[nextTier] ?? null : null
  const progress = nextThreshold
    ? Math.max(0, Math.min(100, ((lifetime - curThreshold) / (nextThreshold - curThreshold)) * 100))
    : 100
  const myPct: number = config.ai_discount_percent?.[tier] ?? 0

  return (
    <Screen title={t('loyaltyPage.title')} subtitle={t('loyaltyPage.subtitle')} back
      onRefresh={onRefresh} refreshing={refreshing}>
      <View style={s.body}>
        {/* Η κατάστασή μου */}
        {isAuthenticated && mine ? (
          <Card>
            <View style={s.rowBetween}>
              <View style={s.row}>
                <Text style={s.muted}>{t('loyaltyPage.yourTier')}</Text>
                <TierPill tier={tier} label={tierName(tier)} />
              </View>
              <Text style={s.strong}>{t('loyaltyPage.pointsValue', { points: num(lifetime) })}</Text>
            </View>
            <View style={s.track}>
              <View style={[s.fill, { width: `${progress}%` }]} />
            </View>
            <View style={s.rowBetween}>
              <Text style={s.caption}>{tierName(tier)}</Text>
              <Text style={[s.caption, s.right]}>
                {nextTier
                  ? t('loyaltyPage.toNext', { points: num(mine?.points_to_next ?? Math.max(0, (nextThreshold ?? 0) - lifetime)), tier: tierName(nextTier) })
                  : t('loyaltyPage.maxTier')}
              </Text>
            </View>
            <Text style={[s.text, { marginTop: space.md }]}>
              {myPct > 0 ? t('loyaltyPage.yourDiscount', { percent: myPct }) : t('loyaltyPage.noDiscountYet')}
            </Text>
          </Card>
        ) : (
          <Card>
            <Text style={s.text}>{t('loyaltyPage.loginPrompt')}</Text>
            <Button label={t('loyaltyPage.login')} onPress={() => router.push('/auth/login' as any)}
              full style={{ marginTop: space.md }} />
          </Card>
        )}

        {/* Πώς κερδίζω πόντους */}
        <Card>
          <Text style={s.section}>{t('loyaltyPage.earnTitle')}</Text>
          <Text style={[s.mutedBody, { marginTop: space.xs }]}>
            {t('loyaltyPage.earnRate', { points: num(config.points_per_euro) })}
          </Text>
          <View style={s.sources}>
            {EARN_SOURCES.map(({ key, Icon }) => (
              <View key={key} style={s.source}>
                <Icon size={icon.sm} color={colors.brand} />
                <Text style={s.sourceTxt}>{t(`loyaltyPage.source_${key}`)}</Text>
              </View>
            ))}
          </View>
          <View style={[s.row, s.noteRow]}>
            <RotateCcw size={icon.xs} color={colors.textLight} style={{ marginTop: 1 }} />
            <Text style={[s.caption, { flex: 1 }]}>{t('loyaltyPage.refundNote')}</Text>
          </View>
        </Card>

        {/* Επίπεδα και οφέλη */}
        <Text style={[s.section, { marginTop: space.sm }]}>{t('loyaltyPage.tiersTitle')}</Text>
        {TIERS.map(k => {
          const pct = config.ai_discount_percent?.[k] ?? 0
          const current = isAuthenticated && !!mine && k === tier
          return (
            <Card key={k} style={current ? { borderColor: TIER_COLORS[k].fg, borderWidth: 2 } : undefined}>
              <View style={s.rowBetween}>
                <TierPill tier={k} label={tierName(k)} />
                {current && <Badge label={t('loyaltyPage.current')} tone="brand" />}
              </View>
              <Text style={[s.caption, { marginTop: space.sm }]}>
                {(config.thresholds?.[k] ?? 0) > 0 ? t('loyaltyPage.fromPoints', { points: num(config.thresholds[k]) }) : t('loyaltyPage.startTier')}
              </Text>
              <Text style={[s.strong, { marginTop: space.xs }]}>
                {pct > 0 ? t('loyaltyPage.aiDiscount', { percent: pct }) : t('loyaltyPage.noDiscount')}
              </Text>
            </Card>
          )
        })}

        <Card onPress={() => router.push('/pricing' as any)} style={s.info}>
          <View style={[s.row, { alignItems: 'flex-start' }]}>
            <Info size={icon.sm} color={colors.info} />
            <Text style={[s.caption, s.infoTxt]}>{t('loyaltyPage.discountNote')}</Text>
          </View>
          <Text style={s.infoLink}>{t('loyaltyPage.seePlans')}</Text>
        </Card>
      </View>
    </Screen>
  )
}

const s = StyleSheet.create({
  body: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  right: { textAlign: 'right', flexShrink: 1 },
  muted: { ...type.caption, color: colors.textMuted },
  mutedBody: { ...type.body, color: colors.textMuted },
  caption: { ...type.caption, color: colors.textLight },
  text: { ...type.body, color: colors.text },
  strong: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  section: { ...type.emphasis, color: colors.text, fontWeight: weight.bold },
  pill: { paddingHorizontal: space.sm + 2, paddingVertical: 3, borderRadius: radius.full },
  pillTxt: { ...type.caption, fontWeight: weight.bold },
  track: { height: 12, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, marginTop: space.md, marginBottom: space.sm, overflow: 'hidden' },
  fill: { height: 12, borderRadius: radius.full, backgroundColor: colors.brand },
  sources: { gap: space.sm, marginTop: space.md },
  source: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    paddingHorizontal: space.md, paddingVertical: space.sm + 2,
  },
  sourceTxt: { ...type.body, color: colors.textMuted, flex: 1 },
  noteRow: { alignItems: 'flex-start', marginTop: space.md },
  info: { backgroundColor: colors.infoBg, borderColor: colors.infoBg },
  infoTxt: { color: '#1D4ED8', flex: 1 },
  infoLink: { ...type.caption, color: '#1D4ED8', fontWeight: weight.semibold, marginTop: space.xs, marginLeft: icon.sm + space.sm },
})
