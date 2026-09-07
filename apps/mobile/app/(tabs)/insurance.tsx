import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal,
  Linking, RefreshControl,
} from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Shield, X, Check, Phone, Globe, Star } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { colors, space, radius, type, weight, shadow, icon, touch } from '@/theme'

/**
 * Ασφάλιση κατοικιδίου.
 *
 * Τα πλάνα δεν αγοράζονται μέσα από την εφαρμογή — ο χρήστης οδηγείται
 * στον ασφαλιστή. Οπότε η δουλειά αυτής της οθόνης είναι σύγκριση, και το
 * κύριο κουμπί λέει «Δες λεπτομέρειες», όχι «Αγορά».
 */

const PET_TYPES = [
  { id: '',    label: 'Όλα',    emoji: '🐾' },
  { id: 'dog', label: 'Σκύλοι', emoji: '🐶' },
  { id: 'cat', label: 'Γάτες',  emoji: '🐱' },
]

const TIERS: Record<string, { label: string; bg: string; fg: string }> = {
  basic:    { label: 'Βασικό',  bg: colors.surfaceAlt, fg: colors.textMuted },
  standard: { label: 'Standard', bg: colors.infoBg,    fg: colors.info },
  premium:  { label: 'Premium',  bg: colors.brandLight, fg: colors.brand },
}

export default function InsuranceScreen() {
  const qc = useQueryClient()
  const [petType, setPetType] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['insurance-plans', petType],
    queryFn: () => api.get('/insurance/plans', {
      params: { pet_type: petType || undefined },
    }).then(r => r.data?.data ?? []),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['insurance-plans'] })
    setRefreshing(false)
  }, [qc])

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Ασφάλιση</Text>
        <Text style={s.subtitle}>Σύγκρινε πλάνα κάλυψης για το κατοικίδιό σου</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={s.filterRow}
        contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm }}>
        {PET_TYPES.map(t => {
          const active = petType === t.id
          return (
            <TouchableOpacity key={t.id || 'all'} activeOpacity={0.7}
              style={[s.chip, active && s.chipActive]}
              onPress={() => setPetType(t.id)}>
              <Text style={s.chipEmoji}>{t.emoji}</Text>
              <Text style={[s.chipText, active && s.chipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: space.lg, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }>
        {isLoading
          ? [0, 1, 2].map(i => (
              <View key={i} style={s.card}>
                <View style={[s.skeleton, { height: 16, width: '50%', borderRadius: radius.sm }]} />
                <View style={[s.skeleton, { height: 28, width: '30%', borderRadius: radius.sm, marginTop: space.md }]} />
              </View>
            ))
          : plans.length === 0
            ? <View style={s.empty}>
                <Shield size={icon.hero} color={colors.border} />
                <Text style={s.emptyTitle}>Κανένα πλάνο</Text>
                <Text style={s.emptyText}>Δοκίμασε άλλο είδος κατοικιδίου.</Text>
              </View>
            : plans.map((plan: any) => {
                const tier = TIERS[plan.tier] ?? TIERS.basic
                return (
                  <TouchableOpacity key={plan.id} activeOpacity={0.85}
                    style={[s.card, plan.is_featured && s.cardFeatured]}
                    onPress={() => setSelected(plan)}>
                    {plan.is_featured && (
                      <View style={s.featuredTag}>
                        <Star size={icon.xs} color="#fff" fill="#fff" />
                        <Text style={s.featuredText}>Προτεινόμενο</Text>
                      </View>
                    )}

                    <View style={s.cardTop}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.provider} numberOfLines={1}>
                          {plan.provider?.name_el || plan.provider?.name}
                        </Text>
                        <Text style={s.planName} numberOfLines={1}>
                          {plan.name_el || plan.name}
                        </Text>
                      </View>
                      <View style={[s.tierTag, { backgroundColor: tier.bg }]}>
                        <Text style={[s.tierText, { color: tier.fg }]}>{tier.label}</Text>
                      </View>
                    </View>

                    <View style={s.priceRow}>
                      <Text style={s.price}>€{plan.price_monthly}</Text>
                      <Text style={s.priceUnit}>/μήνα</Text>
                    </View>

                    <View style={s.specs}>
                      {plan.annual_limit != null && (
                        <View style={s.spec}>
                          <Text style={s.specLabel}>Ετήσιο όριο</Text>
                          <Text style={s.specValue}>€{plan.annual_limit}</Text>
                        </View>
                      )}
                      {plan.reimbursement_percent != null && (
                        <View style={s.spec}>
                          <Text style={s.specLabel}>Αποζημίωση</Text>
                          <Text style={s.specValue}>{plan.reimbursement_percent}%</Text>
                        </View>
                      )}
                      {plan.deductible != null && (
                        <View style={s.spec}>
                          <Text style={s.specLabel}>Απαλλαγή</Text>
                          <Text style={s.specValue}>€{plan.deductible}</Text>
                        </View>
                      )}
                    </View>

                    <Text style={s.moreLink}>Δες λεπτομέρειες</Text>
                  </TouchableOpacity>
                )
              })}
      </ScrollView>

      {/* Λεπτομέρειες */}
      <Modal visible={!!selected} animationType="slide" transparent
        onRequestClose={() => setSelected(null)}>
        <View style={s.modalWrap}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.sheetProvider} numberOfLines={1}>
                  {selected?.provider?.name_el || selected?.provider?.name}
                </Text>
                <Text style={s.sheetTitle} numberOfLines={2}>
                  {selected?.name_el || selected?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelected(null)} hitSlop={10}>
                <X size={icon.lg} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: space.xl }}>
              <View style={s.priceRow}>
                <Text style={s.price}>€{selected?.price_monthly}</Text>
                <Text style={s.priceUnit}>/μήνα</Text>
              </View>

              {!!selected?.description && (
                <Text style={s.description}>{selected.description}</Text>
              )}

              {Array.isArray(selected?.features) && selected.features.length > 0 && (
                <>
                  <Text style={s.label}>Τι καλύπτει</Text>
                  {selected.features.map((f: string, i: number) => (
                    <View key={i} style={s.featureRow}>
                      <Check size={icon.sm} color={colors.success} />
                      <Text style={s.featureText}>{f}</Text>
                    </View>
                  ))}
                </>
              )}

              {selected?.waiting_period_days != null && (
                <Text style={s.note}>
                  Περίοδος αναμονής: {selected.waiting_period_days} ημέρες
                </Text>
              )}
              {selected?.max_age_years != null && (
                <Text style={s.note}>
                  Μέγιστη ηλικία εγγραφής: {selected.max_age_years} έτη
                </Text>
              )}

              {/* Η αγορά γίνεται στον ασφαλιστή — δεν προσποιούμαστε ότι
                  ολοκληρώνεται εδώ. */}
              {!!selected?.provider?.phone && (
                <TouchableOpacity style={s.secondaryBtn} activeOpacity={0.85}
                  onPress={() => Linking.openURL(`tel:${selected.provider.phone}`)}>
                  <Phone size={icon.sm} color={colors.brand} />
                  <Text style={s.secondaryBtnText}>{selected.provider.phone}</Text>
                </TouchableOpacity>
              )}
              {!!selected?.provider?.website && (
                <TouchableOpacity style={s.primaryBtn} activeOpacity={0.85}
                  onPress={() => Linking.openURL(selected.provider.website)}>
                  <Globe size={icon.sm} color="#fff" />
                  <Text style={s.primaryBtnText}>Αίτηση στον ασφαλιστή</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.navy,
    paddingTop: space.xxxl + space.lg,
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
  },
  title: { ...type.title, color: colors.textOnDark, fontWeight: weight.bold },
  subtitle: { ...type.body, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  filterRow: { paddingVertical: space.lg, maxHeight: 68, flexGrow: 0 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: space.xs,
    paddingHorizontal: space.lg, height: touch.min,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.brandLight, borderColor: colors.brand },
  chipEmoji: { fontSize: 16 },
  chipText: { ...type.body, color: colors.textMuted, fontWeight: weight.semibold },
  chipTextActive: { color: colors.brand, fontWeight: weight.bold },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.md,
    ...shadow.sm,
  },
  cardFeatured: { borderWidth: 2, borderColor: colors.brand },
  featuredTag: {
    position: 'absolute', top: -1, right: space.lg,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.brand,
    paddingHorizontal: space.sm, paddingVertical: 3,
    borderBottomLeftRadius: radius.sm, borderBottomRightRadius: radius.sm,
  },
  featuredText: { ...type.caption, color: '#fff', fontWeight: weight.bold },

  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  provider: { ...type.caption, color: colors.textMuted, fontWeight: weight.semibold },
  planName: { ...type.emphasis, color: colors.text, fontWeight: weight.bold, marginTop: 2 },
  tierTag: { paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.sm },
  tierText: { ...type.caption, fontWeight: weight.bold },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs, marginTop: space.md },
  price: { ...type.title, color: colors.brand, fontWeight: weight.bold },
  priceUnit: { ...type.body, color: colors.textMuted },

  specs: {
    flexDirection: 'row', gap: space.lg,
    marginTop: space.md, paddingTop: space.md,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  spec: { flex: 1 },
  specLabel: { ...type.caption, color: colors.textLight },
  specValue: { ...type.body, color: colors.text, fontWeight: weight.bold, marginTop: 2 },

  moreLink: { ...type.body, color: colors.brand, fontWeight: weight.semibold, marginTop: space.md },

  skeleton: { backgroundColor: colors.surfaceAlt },
  empty: { alignItems: 'center', paddingTop: 60, gap: space.sm },
  emptyTitle: { ...type.emphasis, color: colors.text, fontWeight: weight.semibold, marginTop: space.md },
  emptyText: { ...type.body, color: colors.textMuted },

  modalWrap: { flex: 1, backgroundColor: 'rgba(15,42,63,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl,
    padding: space.xl,
    maxHeight: '88%',
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  sheetProvider: { ...type.caption, color: colors.textMuted, fontWeight: weight.semibold },
  sheetTitle: { ...type.section, color: colors.text, fontWeight: weight.bold, marginTop: 2 },

  description: { ...type.body, color: colors.textMuted, marginTop: space.md, lineHeight: 22 },
  label: {
    ...type.caption, color: colors.textMuted, fontWeight: weight.semibold,
    marginTop: space.xl, marginBottom: space.sm,
  },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, marginBottom: space.sm },
  featureText: { flex: 1, ...type.body, color: colors.text },
  note: { ...type.caption, color: colors.textLight, marginTop: space.sm },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm,
    height: touch.comfortable, borderRadius: radius.md,
    backgroundColor: colors.brand, marginTop: space.md,
  },
  primaryBtnText: { ...type.emphasis, color: '#fff', fontWeight: weight.bold },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm,
    height: touch.comfortable, borderRadius: radius.md,
    backgroundColor: colors.brandLight, marginTop: space.xl,
  },
  secondaryBtnText: { ...type.emphasis, color: colors.brand, fontWeight: weight.bold },
})
