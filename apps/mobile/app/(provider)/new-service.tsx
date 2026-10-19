import { useMemo, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronRight } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { useAuthStore } from '../../src/store/auth'
import { Screen, Card, Button, Input, SkeletonRows } from '@/components/ui'
import { ServiceLocationField, type Coords } from '@/components/ServiceLocationField'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Δημιουργία υπηρεσίας με πακέτα, από κινητό.
 *
 * ΓΙΑΤΙ ΧΡΕΙΑΖΕΤΑΙ
 *   Μέχρι τώρα ο πάροχος μπορούσε να στήσει υπηρεσία μόνο από υπολογιστή.
 *   Όποιος εγγραφόταν από κινητό έμενε με άδειο λογαριασμό και καμία
 *   διέξοδο — και η ομάδα πεδίου εγγράφει παρόχους επί τόπου, με το
 *   τηλέφωνο στο χέρι.
 *
 * ΤΡΙΑ ΒΗΜΑΤΑ
 *   Κατηγορία, στοιχεία, πακέτα με τιμές. Ο κατάλογος προτύπων έρχεται από
 *   τον server ανά κατηγορία, και ο πάροχος βάζει τη ΔΙΚΗ ΤΟΥ τιμή σε κάθε
 *   πακέτο — οι προτεινόμενες είναι μηδέν επίτηδες.
 *
 *   Η υπηρεσία και τα πακέτα δημιουργούνται με ΜΙΑ κλήση (/packages/setup),
 *   ώστε να μην υπάρξει υπηρεσία χωρίς πακέτα αν κοπεί το δίκτυο στη μέση.
 */
export default function NewServiceScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { user } = useAuthStore()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [city, setCity] = useState((user as any)?.city ?? '')
  // Διεύθυνση και προαιρετική τοποθεσία στον χάρτη — ίδια πεδία με το web.
  const [location, setLocation] = useState('')
  const [coords, setCoords] = useState<Coords>({ latitude: null, longitude: null })
  const [basePrice, setBasePrice] = useState('')
  // template_id -> τιμή σε κείμενο, ώστε το πεδίο να δέχεται κενό και κόμμα
  const [prices, setPrices] = useState<Record<string, string>>({})

  const { data: categories = [] } = useQuery({
    queryKey: ['catalog-categories'],
    queryFn: () => api.get('/catalog/categories').then(r => r.data?.data ?? []),
  })

  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ['catalog-preset', category],
    queryFn: () => api.get(`/catalog/preset/${category}`).then(r => r.data?.data ?? []),
    enabled: !!category && step === 3,
  })

  // Ομαδοποίηση προτύπων, όπως τα επιστρέφει ο server.
  const groups = useMemo(() => {
    const byGroup: Record<string, any[]> = {}
    for (const tpl of templates) (byGroup[tpl.group ?? 'other'] ??= []).push(tpl)
    return Object.entries(byGroup)
  }, [templates])

  const chosen = Object.entries(prices)
    .map(([template_id, v]) => ({ template_id, price: parseFloat(v.replace(',', '.')) }))
    .filter(p => Number.isFinite(p.price) && p.price > 0)

  const create = useMutation({
    mutationFn: () => api.post('/packages/setup', {
      category,
      title: title.trim(),
      description: description.trim() || title.trim(),
      city: city.trim(),
      location: location.trim(),
      latitude: coords.latitude, longitude: coords.longitude,
      packages_with_prices: chosen,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provider-services'] })
      qc.invalidateQueries({ queryKey: ['provider-stats'] })
      router.replace('/(provider)/services' as any)
    },
    onError: (e: any) =>
      Alert.alert(t('common.error'), e?.response?.data?.message || t('providerNew.errCreate')),
  })

  const canNext = step === 1 ? !!category : step === 2 ? title.trim().length > 1 : chosen.length > 0

  return (
    <Screen title={t('providerNew.title')} back scroll={false}>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">

        {/* Δείκτης βημάτων */}
        <View style={s.steps}>
          {[1, 2, 3].map(n => (
            <View key={n} style={[s.stepDot, step >= n && s.stepDotOn]}>
              {step > n
                ? <Check size={14} color={colors.textOnDark} />
                : <Text style={[s.stepNum, step >= n && s.stepNumOn]}>{n}</Text>}
            </View>
          ))}
        </View>

        {step === 1 && (
          <>
            <Text style={s.heading}>{t('providerNew.chooseCategory')}</Text>
            {categories.map((c: any) => {
              const on = category === c.key
              return (
                <TouchableOpacity key={c.key} activeOpacity={0.7}
                  style={[s.option, on && s.optionOn]}
                  onPress={() => setCategory(c.key)}>
                  <Text style={[s.optionTxt, on && s.optionTxtOn]}>
                    {t(`services.categories.${c.key}`, { defaultValue: c.key })}
                  </Text>
                  <Text style={s.optionCount}>{c.count}</Text>
                </TouchableOpacity>
              )
            })}
          </>
        )}

        {step === 2 && (
          <>
            <Text style={s.heading}>{t('providerNew.details')}</Text>
            <Input label={t('providerNew.name')} value={title} onChangeText={setTitle}
              placeholder={t('providerNew.namePlaceholder')} />
            <Input label={t('providerNew.description')} value={description} onChangeText={setDescription}
              placeholder={t('providerNew.descriptionPlaceholder')} multiline />
            <Input label={t('common.city')} value={city} onChangeText={setCity} />
            <Input label={t('providerPkg.fAddress')} value={location} onChangeText={setLocation} />
            {/* Το /packages/setup αποθηκεύει country 'GR' όταν δεν δίνεται — ίδια χώρα στην αναζήτηση. */}
            <ServiceLocationField address={location} city={city} country="GR"
              latitude={coords.latitude} longitude={coords.longitude} onChange={setCoords} />
            <Input label={t('providerNew.basePrice')} value={basePrice} onChangeText={setBasePrice}
              keyboardType="decimal-pad" placeholder="0.00" />
            <Text style={s.hint}>{t('providerNew.basePriceHint')}</Text>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={s.heading}>{t('providerNew.setPrices')}</Text>
            <Text style={s.hint}>{t('providerNew.setPricesHint')}</Text>
            {loadingTemplates ? <SkeletonRows count={4} /> : groups.map(([group, items]) => (
              <View key={group} style={s.group}>
                <Text style={s.groupTitle}>
                  {t(`providerPkg.g${group.charAt(0).toUpperCase()}${group.slice(1)}`, { defaultValue: group })}
                </Text>
                {items.map((tpl: any) => (
                  <Card key={tpl.id} style={s.tpl}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.tplName} numberOfLines={1}>{tpl.name}</Text>
                      {!!tpl.duration_minutes && (
                        <Text style={s.tplMeta}>{tpl.duration_minutes} {t('services.minutes')}</Text>
                      )}
                    </View>
                    <View style={s.priceBox}>
                      <Text style={s.euro}>€</Text>
                      <Input
                        value={prices[tpl.id] ?? ''}
                        onChangeText={v => setPrices(p => ({ ...p, [tpl.id]: v }))}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        style={s.priceInput}
                      />
                    </View>
                  </Card>
                ))}
              </View>
            ))}
            {chosen.length > 0 && (
              <Text style={s.selected}>
                {t('providerNew.selectedCount', { count: chosen.length })}
              </Text>
            )}
          </>
        )}

        <View style={s.nav}>
          {step > 1 && (
            <Button label={t('common.back')} variant="secondary"
              onPress={() => setStep((step - 1) as 1 | 2)} style={{ flex: 1 }} />
          )}
          {step < 3 ? (
            <Button label={t('providerNew.next')} disabled={!canNext}
              onPress={() => setStep((step + 1) as 2 | 3)} style={{ flex: 1 }} />
          ) : (
            <Button
              label={create.isPending ? t('providerNew.creating') : t('providerNew.create')}
              disabled={!canNext || create.isPending}
              loading={create.isPending}
              onPress={() => create.mutate()}
              style={{ flex: 1 }} />
          )}
        </View>
      </ScrollView>
    </Screen>
  )
}

const s = StyleSheet.create({
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
  steps: { flexDirection: 'row', justifyContent: 'center', gap: space.md, marginBottom: space.sm },
  stepDot: {
    width: 30, height: 30, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceAlt, borderWidth: 2, borderColor: colors.border,
  },
  stepDotOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  stepNum: { ...type.caption, color: colors.textLight, fontWeight: weight.bold },
  stepNumOn: { color: colors.textOnDark },

  heading: { ...type.section, color: colors.text },
  hint: { ...type.caption, color: colors.textLight },

  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: space.md, borderRadius: radius.lg,
    borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface,
  },
  optionOn: { borderColor: colors.brand, backgroundColor: colors.brandTint },
  optionTxt: { ...type.body, color: colors.text, fontWeight: weight.medium },
  optionTxtOn: { color: colors.brand, fontWeight: weight.bold },
  optionCount: { ...type.caption, color: colors.textLight },

  group: { gap: space.sm },
  groupTitle: { ...type.emphasis, color: colors.textMuted, marginTop: space.sm },
  tpl: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tplName: { ...type.body, color: colors.text, fontWeight: weight.medium },
  tplMeta: { ...type.caption, color: colors.textLight },
  priceBox: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 92 },
  euro: { ...type.body, color: colors.textMuted, fontWeight: weight.semibold },
  priceInput: { flex: 1, textAlign: 'right' },
  selected: { ...type.caption, color: colors.brand, fontWeight: weight.semibold, textAlign: 'center' },

  nav: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
})
