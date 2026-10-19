import { useMemo, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Home, MapPin, Phone, Globe, Search, BadgeCheck } from 'lucide-react-native'
import { api } from '@/lib/api'
import { Screen, Card, Badge, EmptyState, SkeletonRows, Input } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Επίσημο Μητρώο Καταφυγίων.
 *
 * ΓΙΑΤΙ ΞΕΧΩΡΙΣΤΗ ΟΘΟΝΗ ΑΠΟ ΤΟΥΣ ΠΑΡΟΧΟΥΣ
 *   Τα καταφύγια του μητρώου δεν είναι πελάτες της πλατφόρμας: είναι
 *   δημόσια δεδομένα. Ανακατεμένα με τους παρόχους θα έμοιαζαν με
 *   επιχειρήσεις που δέχονται κρατήσεις, που δεν ισχύει.
 *
 *   Όταν ένα καταφύγιο εγγραφεί ως πάροχος, «διεκδικεί» την εγγραφή του και
 *   τότε δείχνουμε το σήμα επαλήθευσης.
 */
const CATEGORIES = [
  { value: '',                labelKey: 'common.all' },
  { value: 'municipality',    labelKey: 'shelters.catMunicipality' },
  { value: 'association',     labelKey: 'shelters.catAssociation' },
  { value: 'private',         labelKey: 'shelters.catPrivate' },
  { value: 'inter_municipal', labelKey: 'shelters.catInterMunicipal' },
]

export default function SheltersScreen() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  const { data: shelters = [], isLoading } = useQuery({
    queryKey: ['official-shelters'],
    queryFn: () => api.get('/registry/shelters').then(r => r.data?.data ?? []),
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return shelters.filter((s: any) =>
      (!category || s.category === category) &&
      (!q || s.name.toLowerCase().includes(q) || (s.municipality ?? '').toLowerCase().includes(q)))
  }, [shelters, search, category])

  const call = (phone: string) => Linking.openURL(`tel:${phone}`)
  const open = async (url: string) => {
    const u = url.startsWith('http') ? url : `https://${url}`
    const ok = await Linking.canOpenURL(u)
    if (ok) Linking.openURL(u)
    else Alert.alert(t('common.error'), t('checkout.err_open_page'))
  }

  return (
    <Screen title={t('shelters.title')} back>
      <Text style={s.intro}>{t('shelters.subtitle')}</Text>

      <Input value={search} onChangeText={setSearch} placeholder={t('shelters.search')} />

      <View style={s.chips}>
        {CATEGORIES.map(c => {
          const on = category === c.value
          return (
            <TouchableOpacity key={c.labelKey} activeOpacity={0.7}
              style={[s.chip, on && s.chipOn]} onPress={() => setCategory(c.value)}>
              <Text style={[s.chipTxt, on && s.chipTxtOn]}>{t(c.labelKey)}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {isLoading ? <SkeletonRows count={5} /> :
       filtered.length === 0 ? <EmptyState icon={Home} title={t('common.no_results')} /> : (
        <>
          <Text style={s.count}>{t('shelters.count', { count: filtered.length })}</Text>
          {filtered.map((sh: any) => (
            <Card key={sh.id}>
              <View style={s.head}>
                <Text style={s.name} numberOfLines={2}>{sh.name}</Text>
                {sh.is_claimed && <BadgeCheck size={16} color={colors.success} />}
              </View>

              <View style={s.metaRow}>
                <MapPin size={icon.xs} color={colors.textLight} />
                <Text style={s.meta} numberOfLines={1}>{sh.municipality}</Text>
              </View>

              {/* Ο διαχειριστής εμφανίζεται μόνο όταν είναι φορέας. Για
                  φυσικά πρόσωπα ο server επιστρέφει null επίτηδες. */}
              {!!sh.operator_name && (
                <Text style={s.operator} numberOfLines={1}>{sh.operator_name}</Text>
              )}

              <View style={s.badges}>
                <Badge label={t(`shelters.cat${sh.category.charAt(0).toUpperCase()}${sh.category.slice(1).replace(/_(.)/g, (_: string, c: string) => c.toUpperCase())}`, { defaultValue: sh.category })} tone="neutral" />
                {!!sh.official_code && <Badge label={sh.official_code} tone="info" />}
              </View>

              {(sh.phone || sh.website) && (
                <View style={s.actions}>
                  {!!sh.phone && (
                    <TouchableOpacity style={s.action} onPress={() => call(sh.phone)}>
                      <Phone size={14} color={colors.brand} />
                      <Text style={s.actionTxt}>{sh.phone}</Text>
                    </TouchableOpacity>
                  )}
                  {!!sh.website && (
                    <TouchableOpacity style={s.action} onPress={() => open(sh.website)}>
                      <Globe size={14} color={colors.brand} />
                      <Text style={s.actionTxt}>{t('shelters.website')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </Card>
          ))}
          <Text style={s.source}>{t('shelters.source')}</Text>
        </>
      )}
    </Screen>
  )
}

const s = StyleSheet.create({
  intro: { ...type.body, color: colors.textMuted, marginBottom: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md },
  chip: {
    paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.lg,
    borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface,
  },
  chipOn: { borderColor: colors.brand, backgroundColor: colors.brandTint },
  chipTxt: { ...type.caption, color: colors.textMuted, fontWeight: weight.medium },
  chipTxtOn: { color: colors.brand, fontWeight: weight.bold },
  count: { ...type.caption, color: colors.textLight, marginBottom: space.sm },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs },
  name: { ...type.body, color: colors.text, fontWeight: weight.semibold, flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs },
  meta: { ...type.caption, color: colors.textLight },
  operator: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  badges: { flexDirection: 'row', gap: space.xs, marginTop: space.sm, flexWrap: 'wrap' },
  actions: { flexDirection: 'row', gap: space.md, marginTop: space.sm, flexWrap: 'wrap' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionTxt: { ...type.caption, color: colors.brand, fontWeight: weight.semibold },
  source: { ...type.caption, color: colors.textLight, textAlign: 'center', marginTop: space.lg },
})
