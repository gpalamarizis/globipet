import { useState } from 'react'
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui'
import { colors, space, radius, type, weight } from '@/theme'

/**
 * Τιμές ανά επαγγελματία για κάθε πακέτο — ίδιο με το web
 * (web/src/components/provider/StaffPricesEditor.tsx).
 *
 * GET /staff/:id/prices · PUT /staff/:id/prices { prices: [...] } (μαζικά:
 * ό,τι λείπει ή έχει κενή τιμή επιστρέφει στη βασική του πακέτου — γι' αυτό
 * στέλνεται πάντα όλη η λίστα). Η διάρκεια στέλνεται ρητά (τρέχουσα ή
 * βασική): χωρίς αυτήν ο server βάζει 30 λεπτά.
 *
 * Αυτόνομο, με δικό του κουμπί αποθήκευσης: στη φόρμα μέλους μπαίνει μόνο
 * `{!!id && <StaffPricesEditor staffId={id} />}`.
 */
type PriceRow = {
  package_id: string
  name: string
  base_price: number
  base_duration: number | null
  price: number
  duration_minutes: number | null
  custom_price: boolean
}

const parsePrice = (v: string): number | null | 'bad' => {
  const s = v.trim().replace(',', '.')
  if (!s) return null
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return 'bad'
  return Number(s)
}

export function StaffPricesEditor({ staffId }: { staffId: string }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['staff-prices', staffId],
    queryFn: () => api.get(`/staff/${staffId}/prices`).then(r => (r.data?.data ?? []) as PriceRow[]),
  })
  const rows = data ?? []
  // Μόνο ΟΣΑ άλλαξε ο χρήστης· τα υπόλοιπα διαβάζονται από τα δεδομένα. Πριν
  // κάθε επαναφόρτωση (επιστροφή στην εφαρμογή, invalidate από αλλού)
  // ξαναγέμιζε όλα τα πεδία και έσβηνε τις μη αποθηκευμένες τιμές (ίδιο με το web).
  const [edits, setEdits] = useState<Record<string, string>>({})
  const serverValue = (r: PriceRow) => (r.custom_price ? String(r.price) : '')
  const valueOf = (r: PriceRow) => edits[r.package_id] ?? serverValue(r)

  const invalid = rows.some(r => parsePrice(valueOf(r)) === 'bad')
  const dirty = rows.some(r => valueOf(r) !== serverValue(r))

  const save = useMutation({
    mutationFn: () => api.put(`/staff/${staffId}/prices`, {
      prices: rows.map(r => {
        const p = parsePrice(valueOf(r))
        return {
          package_id: r.package_id,
          price: p === null || p === 'bad' ? null : p,
          duration_minutes: r.duration_minutes ?? r.base_duration ?? undefined,
        }
      }),
    }),
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['service-staff'] })
      Alert.alert(t('staffPrices.saved'))
      // Οι αλλαγές φεύγουν ΑΦΟΥ έρθουν τα νέα δεδομένα (αλλιώς για μια στιγμή
      // θα φαίνονταν οι παλιές τιμές).
      await qc.invalidateQueries({ queryKey: ['staff-prices', staffId] }).catch(() => {})
      setEdits({})
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  return (
    <View style={s.wrap}>
      <Text style={s.title}>{t('staffPrices.title')}</Text>
      <Text style={s.hint}>{t('staffPrices.hint')}</Text>

      {isLoading ? (
        <Text style={s.hint}>{t('common.loading')}</Text>
      ) : isError ? (
        <Text style={s.error}>{t('staffPrices.loadError')}</Text>
      ) : rows.length === 0 ? (
        <Text style={s.hint}>{t('staffPrices.noPackages')}</Text>
      ) : (
        <>
          {rows.map(r => {
            const bad = parsePrice(valueOf(r)) === 'bad'
            return (
              <View key={r.package_id} style={s.row}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.name} numberOfLines={2}>{r.name}</Text>
                  <Text style={s.base}>{t('staffPrices.base', { price: `€${Number(r.base_price).toFixed(2)}` })}</Text>
                </View>
                <View style={[s.inputWrap, bad && { borderColor: colors.danger }]}>
                  <Text style={s.euro}>€</Text>
                  <TextInput
                    value={valueOf(r)}
                    onChangeText={v => setEdits(x => ({ ...x, [r.package_id]: v }))}
                    placeholder={Number(r.base_price).toFixed(2)}
                    placeholderTextColor={colors.textLight}
                    keyboardType="decimal-pad"
                    accessibilityLabel={t('staffPrices.priceFor', { name: r.name })}
                    style={s.input} />
                </View>
              </View>
            )
          })}
          {invalid && <Text style={s.error}>{t('staffPrices.invalid')}</Text>}
          {dirty && !save.isPending && <Text style={s.unsaved} accessibilityLiveRegion="polite">{t('staffPrices.unsaved')}</Text>}
          <Button full variant="secondary" label={t('staffPrices.save')}
            loading={save.isPending} disabled={save.isPending || invalid || !dirty}
            onPress={() => save.mutate()} style={{ marginTop: space.sm }} />
        </>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: space.lg, marginTop: space.lg },
  title: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  hint: { ...type.caption, color: colors.textLight, marginTop: 2, marginBottom: space.md },
  error: { ...type.caption, color: colors.danger, marginTop: space.xs },
  // #B45309 (amber-700): το colors.warning δεν έχει αντίθεση σε λευκό· ίδιο με τα άλλα κείμενα αναμονής.
  unsaved: { ...type.caption, color: '#B45309', fontWeight: weight.medium, marginTop: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm },
  name: { ...type.body, color: colors.text },
  base: { ...type.caption, color: colors.textLight },
  inputWrap: {
    width: 112, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    backgroundColor: colors.surface, paddingHorizontal: space.md, minHeight: 44,
  },
  euro: { ...type.body, color: colors.textLight, marginRight: space.xs },
  input: { flex: 1, ...type.body, color: colors.text, textAlign: 'right', paddingVertical: space.sm },
})
