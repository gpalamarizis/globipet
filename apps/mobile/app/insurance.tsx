import { useState, useCallback } from 'react'
import { View, Text, StyleSheet, Linking, Modal, ScrollView, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Shield, Check, Phone, Globe, X, Star } from 'lucide-react-native'
import { Screen, Card, Button, Badge, EmptyState, SkeletonRows, SectionHeader } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'
import {
  InsuranceFilters, CoverageChips, useInsurancePlans, hasInsuranceFilters,
  EMPTY_INSURANCE_FILTERS, type InsuranceFilterState,
} from '@/components/InsuranceParts'

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

const TIERS: Record<string, { labelKey: string; tone: any }> = {
  basic:    { labelKey: 'insurance.basic',   tone: 'neutral' },
  standard: { labelKey: 'insurance.standard', tone: 'info' },
  premium:  { labelKey: 'insurance.premium',  tone: 'brand' },
  // Υπήρχε στο web αλλά όχι εδώ: τέτοια πλάνα έδειχναν «Βασικό».
  comprehensive: { labelKey: 'insurance.comprehensive', tone: 'success' },
}

export default function InsuranceScreen() {
  const { t, i18n } = useTranslation()
  // Το `name_el` είναι μόνο ελληνικά· στις άλλες γλώσσες το `name`.
  const nm = (r: any) => (i18n.language === 'el' && r?.name_el) ? r.name_el : (r?.name || r?.name_el)
  const qc = useQueryClient()
  const [selected, setSelected] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [filters, setFilters] = useState<InsuranceFilterState>(EMPTY_INSURANCE_FILTERS)

  // Το endpoint είναι /insurance/plans· ίδια φίλτρα με το web.
  const { data: plans = [], isLoading } = useInsurancePlans(filters)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['insurance-plans'] })
    setRefreshing(false)
  }, [qc])

  return (
    <Screen title={t('cat.insurance')} subtitle={t('ins.compare')}
      onRefresh={onRefresh} refreshing={refreshing}>

      <InsuranceFilters value={filters} onChange={setFilters} />

      {isLoading ? (
        <SkeletonRows count={3} height={140} />
      ) : plans.length === 0 ? (
        <EmptyState
          icon={Shield}
          title={t('ins.no_plans')}
          message={hasInsuranceFilters(filters) ? t('insurance.try_other_filters') : t('ins.none_active')}
        />
      ) : (
        <View style={{ gap: space.md }}>
          <Text style={s.count}>{t('insurance.plans_count', { count: plans.length })}</Text>
          {plans.map((plan: any) => {
            const tier = TIERS[plan.tier] ?? TIERS.basic
            return (
              <Card key={plan.id} onPress={() => setSelected(plan)}>
                {plan.is_featured && (
                  <View style={s.featured}>
                    <Star size={icon.xs} color={colors.brand} fill={colors.brand} />
                    <Text style={s.featuredText}>{t('insurance.recommended')}</Text>
                  </View>
                )}

                <View style={s.top}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.provider} numberOfLines={1}>
                      {nm(plan.provider)}
                    </Text>
                    <Text style={s.name} numberOfLines={1}>
                      {nm(plan)}
                    </Text>
                  </View>
                  <Badge label={t(tier.labelKey)} tone={tier.tone} />
                </View>

                <View style={s.priceRow}>
                  <Text style={s.price}>€{Number(plan.price_monthly ?? 0).toFixed(2)}</Text>
                  <Text style={s.unit}>{t('insurance.per_month')}</Text>
                  {plan.price_annual != null && (
                    <Text style={s.annual}>· €{Number(plan.price_annual ?? 0).toFixed(2)}{t('insurance.per_year')}</Text>
                  )}
                </View>

                <CoverageChips plan={plan} />

                <View style={s.specs}>
                  {plan.annual_limit != null && (
                    <View style={s.spec}>
                      <Text style={s.specLabel}>{t('insurance.annual_limit')}</Text>
                      <Text style={s.specValue}>€{Number(plan.annual_limit ?? 0).toFixed(2)}</Text>
                    </View>
                  )}
                  {plan.reimbursement_percent != null && (
                    <View style={s.spec}>
                      <Text style={s.specLabel}>{t('insurance.reimbursement')}</Text>
                      <Text style={s.specValue}>{plan.reimbursement_percent}%</Text>
                    </View>
                  )}
                  {plan.deductible != null && (
                    <View style={s.spec}>
                      <Text style={s.specLabel}>{t('insurance.deductible')}</Text>
                      <Text style={s.specValue}>€{Number(plan.deductible ?? 0).toFixed(2)}</Text>
                    </View>
                  )}
                </View>

                <Text style={s.more}>{t('insurance.see_details')}</Text>
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
                  {nm(selected?.provider)}
                </Text>
                <Text style={s.sheetTitle} numberOfLines={2}>
                  {nm(selected)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelected(null)} hitSlop={12}>
                <X size={icon.lg} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: space.xl }}>
              <View style={s.priceRow}>
                <Text style={s.price}>€{Number(selected?.price_monthly ?? 0).toFixed(2)}</Text>
                <Text style={s.unit}>{t('insurance.per_month')}</Text>
              </View>

              {!!selected?.description && (
                <Text style={s.description}>{selected.description}</Text>
              )}

              {Array.isArray(selected?.features) && selected.features.length > 0 && (
                <>
                  <SectionHeader title={t('insurance.what_covered')} />
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
                  {t('ins.waiting_days', { count: selected.waiting_period_days })}
                </Text>
              )}
              {selected?.max_age_years != null && (
                <Text style={s.note}>
                  {t('ins.max_age_years', { count: selected.max_age_years })}
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
              {/* Μόνο http(s) — όχι javascript:/intent:/άλλο σχήμα (όπως στο web). */}
              {!!selected?.provider?.website && /^https?:\/\//i.test(String(selected.provider.website).trim()) && (
                <Button
                  label={t('insurance.apply')}
                  full
                  icon={<Globe size={icon.sm} color={colors.textOnDark} />}
                  onPress={() => Linking.openURL(String(selected.provider.website).trim()).catch(() => {})}
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
  annual: { ...type.caption, color: colors.textMuted },
  count: { ...type.caption, color: colors.textMuted },

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
