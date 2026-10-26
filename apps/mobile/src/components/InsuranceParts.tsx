import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Check, X } from 'lucide-react-native'
import { api } from '@/lib/api'
import { Chips } from '@/components/Chips'
import { SwitchRow } from '@/components/SwitchRow'
import { Input } from '@/components/ui'
import { colors, space, radius, type, weight } from '@/theme'

/**
 * Κομμάτια της οθόνης ασφάλισης (app/(tabs)/insurance.tsx — η παλιά
 * app/insurance.tsx αφαιρέθηκε) — ίδια λειτουργία με τη σελίδα /insurance του web.
 *
 * ΤΙ ΕΛΕΙΠΕ ΑΠΟ ΤΟ ΚΙΝΗΤΟ
 *   · Φίλτρα: το web φιλτράρει κατά είδος (σκύλος/γάτα/κουνέλι/πτηνό),
 *     κατηγορία πλάνου, μέγιστη μηνιαία τιμή, χειρουργείο, οδοντιατρείο
 *     (GET /insurance/plans: pet_type, tier, max_price, covers_surgery,
 *     covers_dental). Η μία οθόνη δεν είχε κανένα φίλτρο, η άλλη μόνο
 *     σκύλο/γάτα.
 *   · Τι καλύπτει το πλάνο: οι επτά σημαίες covers_* του InsurancePlan δεν
 *     εμφανίζονταν πουθενά — το βασικότερο στοιχείο για σύγκριση.
 */

export type InsuranceFilterState = {
  petType: string
  tier: string
  maxPrice: string
  surgery: boolean
  dental: boolean
}

export const EMPTY_INSURANCE_FILTERS: InsuranceFilterState = {
  petType: '', tier: '', maxPrice: '', surgery: false, dental: false,
}

export const hasInsuranceFilters = (f: InsuranceFilterState) =>
  !!(f.petType || f.tier || f.maxPrice || f.surgery || f.dental)

/** Ίδιες παράμετροι με το web· ό,τι είναι κενό δεν στέλνεται. */
export function useInsurancePlans(f: InsuranceFilterState) {
  // Δεκαδικά με κόμμα (ελληνικό πληκτρολόγιο) → τελεία, όπως τα δέχεται το parseFloat του server.
  const maxPrice = f.maxPrice.trim().replace(',', '.')
  return useQuery({
    queryKey: ['insurance-plans', f.petType, f.tier, maxPrice, f.surgery, f.dental],
    queryFn: () => api.get('/insurance/plans', {
      params: {
        pet_type: f.petType || undefined,
        tier: f.tier || undefined,
        max_price: maxPrice && Number.isFinite(Number(maxPrice)) ? maxPrice : undefined,
        covers_surgery: f.surgery || undefined,
        covers_dental: f.dental || undefined,
      },
    }).then(r => r.data?.data ?? []),
  })
}

const PET_TYPES = [
  { value: '',       labelKey: 'marketplace.categories.all', emoji: '🐾' },
  { value: 'dog',    labelKey: 'insurance.dogs',    emoji: '🐶' },
  { value: 'cat',    labelKey: 'insurance.cats',    emoji: '🐱' },
  { value: 'rabbit', labelKey: 'insurance.rabbits', emoji: '🐰' },
  { value: 'bird',   labelKey: 'insurance.birds',   emoji: '🦜' },
]

const TIER_OPTIONS = ['basic', 'standard', 'premium', 'comprehensive']

export function InsuranceFilters({ value, onChange }: {
  value: InsuranceFilterState
  onChange: (v: InsuranceFilterState) => void
}) {
  const { t } = useTranslation()
  const set = (patch: Partial<InsuranceFilterState>) => onChange({ ...value, ...patch })
  return (
    <View style={s.filters}>
      <Chips label={t('insurance.filter_pet')} value={value.petType}
        onChange={v => set({ petType: v })}
        options={PET_TYPES.map(p => ({ value: p.value, label: `${p.emoji} ${t(p.labelKey)}` }))} />
      <Chips label={t('insurance.filter_tier')} value={value.tier}
        onChange={v => set({ tier: v })}
        options={[{ value: '', label: t('insurance.all_tiers') },
          ...TIER_OPTIONS.map(k => ({ value: k, label: t(`insurance.${k}`) }))]} />
      <Input label={t('insurance.max_price')} value={value.maxPrice}
        onChangeText={v => set({ maxPrice: v })}
        placeholder={t('insurance.max_price_hint')} keyboardType="decimal-pad" />
      <SwitchRow label={t('insurance.covers_surgery')} value={value.surgery}
        onChange={v => set({ surgery: v })} />
      <SwitchRow label={t('insurance.covers_dental')} value={value.dental}
        onChange={v => set({ dental: v })} />
    </View>
  )
}

const COVERAGE = [
  { key: 'covers_accidents',  labelKey: 'insurance.cov_accidents' },
  { key: 'covers_illness',    labelKey: 'insurance.cov_illness' },
  { key: 'covers_surgery',    labelKey: 'insurance.cov_surgery' },
  { key: 'covers_dental',     labelKey: 'insurance.cov_dental' },
  { key: 'covers_preventive', labelKey: 'insurance.cov_preventive' },
  { key: 'covers_liability',  labelKey: 'insurance.cov_liability' },
  { key: 'covers_death',      labelKey: 'insurance.cov_death' },
]

/** Τι καλύπτει / δεν καλύπτει — ίδιες ετικέτες με το web. */
export function CoverageChips({ plan }: { plan: any }) {
  const { t } = useTranslation()
  return (
    <View style={s.coverage}>
      {COVERAGE.map(({ key, labelKey }) => {
        const on = !!plan?.[key]
        return (
          <View key={key} style={[s.cov, on ? s.covOn : s.covOff]}>
            {on ? <Check size={11} color={colors.success} /> : <X size={11} color={colors.textLight} />}
            <Text style={[s.covTxt, on ? s.covTxtOn : s.covTxtOff]}>{t(labelKey)}</Text>
          </View>
        )
      })}
    </View>
  )
}

const s = StyleSheet.create({
  filters: { marginBottom: space.md },
  coverage: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.md },
  cov: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.full,
  },
  covOn: { backgroundColor: colors.successBg },
  covOff: { backgroundColor: colors.surfaceAlt },
  covTxt: { ...type.caption, fontWeight: weight.medium },
  covTxtOn: { color: colors.success },
  covTxtOff: { color: colors.textLight, textDecorationLine: 'line-through' },
})
