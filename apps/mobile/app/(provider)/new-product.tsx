import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../src/lib/api'
import { Screen, Button, Input } from '@/components/ui'
import { colors, space, radius, type, weight } from '@/theme'

/**
 * Προσθήκη προϊόντος, από κινητό.
 *
 * Οι κατηγορίες είναι οι ίδιες με το κατάστημα — κρατάμε ΚΛΕΙΔΙ και όχι
 * μεταφρασμένο κείμενο, ώστε η τιμή που αποθηκεύεται στη βάση να μην
 * εξαρτάται από τη γλώσσα του παρόχου τη στιγμή της καταχώρησης.
 */
const CATEGORIES = [
  { value: 'food',        labelKey: 'marketplace.categories.food' },
  { value: 'toys',        labelKey: 'marketplace.categories.toys' },
  { value: 'accessories', labelKey: 'marketplace.categories.accessories' },
  { value: 'health',      labelKey: 'marketplace.categories.health' },
  { value: 'grooming',    labelKey: 'marketplace.categories.grooming' },
]

export default function NewProductScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')

  const create = useMutation({
    mutationFn: () => api.post('/products', {
      name: name.trim(),
      description: description.trim() || name.trim(),
      category,
      price: parseFloat(price.replace(',', '.')) || 0,
      stock: parseInt(stock, 10) || 0,
      is_active: true,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provider-products'] })
      router.replace('/(provider)/products' as any)
    },
    onError: (e: any) =>
      Alert.alert(t('common.error'), e?.response?.data?.message || t('providerProductNew.errCreate')),
  })

  const canSave = name.trim().length > 1 && !!category && parseFloat(price.replace(',', '.')) > 0

  return (
    <Screen title={t('providerProductNew.title')} back scroll={false}>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Input label={t('providerProductNew.name')} value={name} onChangeText={setName}
          placeholder={t('providerProductNew.namePlaceholder')} />
        <Input label={t('providerNew.description')} value={description} onChangeText={setDescription} multiline />

        <Text style={s.label}>{t('providerDash.category')}</Text>
        <View style={s.chips}>
          {CATEGORIES.map(c => {
            const on = category === c.value
            return (
              <TouchableOpacity key={c.value} activeOpacity={0.7}
                style={[s.chip, on && s.chipOn]}
                onPress={() => setCategory(c.value)}>
                <Text style={[s.chipTxt, on && s.chipTxtOn]}>{t(c.labelKey)}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Input label={t('providerDash.priceEur')} value={price} onChangeText={setPrice}
              keyboardType="decimal-pad" placeholder="0.00" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label={t('providerDash.stock')} value={stock} onChangeText={setStock}
              keyboardType="number-pad" placeholder="0" />
          </View>
        </View>

        <Button
          label={create.isPending ? t('providerNew.creating') : t('providerProductNew.save')}
          disabled={!canSave || create.isPending}
          loading={create.isPending}
          onPress={() => create.mutate()}
          full style={{ marginTop: space.lg }} />
      </ScrollView>
    </Screen>
  )
}

const s = StyleSheet.create({
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
  label: { ...type.caption, color: colors.textMuted, fontWeight: weight.semibold },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface },
  chipOn: { borderColor: colors.brand, backgroundColor: colors.brandTint },
  chipTxt: { ...type.caption, color: colors.textMuted, fontWeight: weight.medium },
  chipTxtOn: { color: colors.brand, fontWeight: weight.bold },
  row: { flexDirection: 'row', gap: space.md },
})
