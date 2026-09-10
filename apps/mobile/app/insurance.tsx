import { useState, useCallback } from 'react'
import { View, Text, StyleSheet, Linking, Modal, ScrollView, TouchableOpacity } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Shield, Check, Phone, Globe, X, Star } from 'lucide-react-native'
import { api } from '../src/lib/api'
import { Screen, Card, Button, Badge, EmptyState, SkeletonRows, SectionHeader } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Ασφάλιση κατοικιδίου.
 *
 * ΤΙ ΑΦΑΙΡΕΘΗΚΕ
 *   Υπήρχε πίνακας `mockProducts` με τρία επινοημένα πλάνα — «Βασικό
 *   9,99€», «Premium 19,99€», «Ετήσιο 149,99€» — και η γραμμή
 *   `data.length > 0 ? data : mockProducts`. Όταν η βάση δεν επέστρεφε
 *   τίποτα, ο πελάτης έβλεπε προϊόντα που δεν υπάρχουν, με τιμές που
 *   κανείς δεν έχει ορίσει.
 *
 *   Ένα άδειο κατάστημα είναι σωστή απάντηση. Ένα γεμάτο με φαντάσματα
 *   δεν είναι.
 *
 * Η αγορά γίνεται στον ασφαλιστή, οπότε το κύριο κουμπί λέει «Δες
 * λεπτομέρειες», όχι «Αγορά».
 */

const TIERS: Record<string, { label: string; tone: any }> = {
  basic:    { label: 'Βασικό',   tone: 'neutral' },
  standard: { label: 'Standard', tone: 'info' },
  premium:  { label: 'Premium',  tone: 'brand' },
}

export default function InsuranceScreen() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['insurance-plans'],
    // Το endpoint είναι /insurance/plans· το σκέτο /insurance δεν υπάρχει.
    queryFn: () => api.get('/insurance/plans').then(r => r.data?.data ?? []),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['insurance-plans'] })
    setRefreshing(false)
  }, [qc])

  return (
    <Screen title="Ασφάλιση" subtitle="Σύγκρινε πλάνα κάλυψης"
      onRefresh={onRefresh} refreshing={refreshing}>

      {isLoading ? (
        <SkeletonRows count={3} height={140} />
      ) : plans.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="Κανένα πλάνο διαθέσιμο"
          message="Δεν υπάρχουν ενεργά προγράμματα ασφάλισης αυτή τη στιγμή."
        />
      ) : (
        <View style={{ gap: space.md }}>
          {plans.map((plan: any) => {
            const tier = TIERS[plan.tier] ?? TIERS.basic
            return (
              <Card key={plan.id} onPress={() => setSelected(plan)}>
                {plan.is_featured && (
                  <View style={s.featured}>
                    <Star size={icon.xs} color={colors.brand} fill={colors.brand} />
                    <Text style={s.featuredText}>Προτεινόμενο</Text>
                  </View>
                )}

                <View style={s.top}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.provider} numberOfLines={1}>
                      {plan.provider?.name_el || plan.provider?.name}
                    </Text>
                    <Text style={s.name} numberOfLines={1}>
                      {plan.name_el || plan.name}
                    </Text>
                  </View>
                  <Badge label={tier.label} tone={tier.tone} />
                </View>

                <View style={s.priceRow}>
                  <Text style={s.price}>€{plan.price_monthly}</Text>
                  <Text style={s.unit}>/μήνα</Text>
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

                <Text style={s.more}>Δες λεπτομέρειες</Text>
              </Card>
            )
          })}
        </View>
      )}

      <Modal visible={!!selected} animationType="slide" transparent
        onRequestClose={() => setSelected(null)}>
        <View style={s.modalWrap}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.provider} numberOfLines={1}>
                  {selected?.provider?.name_el || selected?.provider?.name}
                </Text>
                <Text style={s.sheetTitle} numberOfLines={2}>
                  {selected?.name_el || selected?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelected(null)} hitSlop={12}>
                <X size={icon.lg} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: space.xl }}>
              <View style={s.priceRow}>
                <Text style={s.price}>€{selected?.price_monthly}</Text>
                <Text style={s.unit}>/μήνα</Text>
              </View>

              {!!selected?.description && (
                <Text style={s.description}>{selected.description}</Text>
              )}

              {Array.isArray(selected?.features) && selected.features.length > 0 && (
                <>
                  <SectionHeader title="Τι καλύπτει" />
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

              {/* Η αίτηση γίνεται στον ασφαλιστή — δεν προσποιούμαστε ότι
                  ολοκληρώνεται εδώ. */}
              {!!selected?.provider?.phone && (
                <Button
                  label={selected.provider.phone}
                  variant="secondary"
                  full
                  icon={<Phone size={icon.sm} color={colors.text} />}
                  onPress={() => Linking.openURL(`tel:${selected.provider.phone}`)}
                  style={{ marginTop: space.lg }}
                />
              )}
              {!!selected?.provider?.website && (
                <Button
                  label="Αίτηση στον ασφαλιστή"
                  full
                  icon={<Globe size={icon.sm} color={colors.textOnDark} />}
                  onPress={() => Linking.openURL(selected.provider.website)}
                  style={{ marginTop: space.md }}
                />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  )
}

const s = StyleSheet.create({
  featured: {
    flexDirection: 'row', alignItems: 'center', gap: space.xs,
    marginBottom: space.sm,
  },
  featuredText: { ...type.caption, color: colors.brand, fontWeight: weight.bold },

  top: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  provider: { ...type.caption, color: colors.textMuted, fontWeight: weight.semibold },
  name: { ...type.emphasis, color: colors.text, fontWeight: weight.bold, marginTop: 2 },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs, marginTop: space.md },
  price: { ...type.title, color: colors.brand, fontWeight: weight.bold },
  unit: { ...type.body, color: colors.textMuted },

  specs: {
    flexDirection: 'row', gap: space.lg,
    marginTop: space.md, paddingTop: space.md,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  spec: { flex: 1 },
  specLabel: { ...type.caption, color: colors.textLight },
  specValue: { ...type.body, color: colors.text, fontWeight: weight.bold, marginTop: 2 },

  more: { ...type.body, color: colors.brand, fontWeight: weight.semibold, marginTop: space.md },

  modalWrap: { flex: 1, backgroundColor: 'rgba(15,42,63,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl,
    padding: space.xl,
    maxHeight: '88%',
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  sheetTitle: { ...type.section, color: colors.text, fontWeight: weight.bold, marginTop: 2 },

  description: { ...type.body, color: colors.textMuted, marginTop: space.md, lineHeight: 22 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, marginBottom: space.sm },
  featureText: { flex: 1, ...type.body, color: colors.text },
  note: { ...type.caption, color: colors.textLight, marginTop: space.sm },
})
