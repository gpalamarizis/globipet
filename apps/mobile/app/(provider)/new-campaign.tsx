import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../src/lib/api'
import { Screen, Button, Input } from '@/components/ui'
import { colors, space, radius, type, weight } from '@/theme'

/**
 * Απλή καμπάνια έκπτωσης, από κινητό.
 *
 * Τα απολύτως απαραίτητα: τίτλος, διάστημα, έκπτωση. Χωρίς στοχεύσεις και
 * θέσεις προβολής — ισχύει για όλα και για όλους, που είναι και το πιο
 * συνηθισμένο. Οι σύνθετες καμπάνιες μένουν στο web.
 */
export default function NewCampaignScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()

  const today = new Date().toISOString().slice(0, 10)
  const inAMonth = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState(today)
  const [endsAt, setEndsAt] = useState(inAMonth)
  const [discountType, setDiscountType] = useState<'percent' | 'amount' | ''>('percent')
  const [discountValue, setDiscountValue] = useState('')

  const create = useMutation({
    mutationFn: () => api.post('/campaigns', {
      title: title.trim(),
      description: description.trim() || undefined,
      starts_at: startsAt,
      ends_at: endsAt,
      discount_type: discountType || undefined,
      discount_value: discountType ? parseFloat(discountValue.replace(',', '.')) : undefined,
      is_active: true,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-campaigns'] })
      router.replace('/(provider)/campaigns' as any)
    },
    onError: (e: any) =>
      Alert.alert(t('common.error'), e?.response?.data?.message || t('providerMkt.errSave')),
  })

  const value = parseFloat(discountValue.replace(',', '.'))
  const valueOk = !discountType || (Number.isFinite(value) && value > 0 && (discountType !== 'percent' || value <= 100))
  const datesOk = endsAt > startsAt
  const canSave = title.trim().length > 1 && datesOk && valueOk

  return (
    <Screen title={t('providerCampaignNew.title')} back scroll={false}>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Input label={t('providerMkt.fTitleReq')} value={title} onChangeText={setTitle}
          placeholder={t('providerMkt.phTitle')} />
        <Input label={t('providerMkt.fDescription')} value={description} onChangeText={setDescription} multiline />

        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Input label={t('providerMkt.fStart')} value={startsAt} onChangeText={setStartsAt} placeholder="YYYY-MM-DD" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label={t('providerMkt.fEnd')} value={endsAt} onChangeText={setEndsAt} placeholder="YYYY-MM-DD" />
          </View>
        </View>
        {!datesOk && <Text style={s.error}>{t('providerMkt.errEndBeforeStart')}</Text>}

        <Text style={s.label}>{t('providerMkt.fDiscount')}</Text>
        <View style={s.chips}>
          {([['percent', 'providerMkt.fPercent'], ['amount', 'providerMkt.fEuro'], ['', 'providerMkt.none']] as const).map(([v, k]) => {
            const on = discountType === v
            return (
              <TouchableOpacity key={k} activeOpacity={0.7}
                style={[s.chip, on && s.chipOn]}
                onPress={() => setDiscountType(v as any)}>
                <Text style={[s.chipTxt, on && s.chipTxtOn]}>{t(k)}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {!!discountType && (
          <>
            <Input
              label={discountType === 'percent' ? t('providerMkt.fPercentPct') : t('providerMkt.fAmountEur')}
              value={discountValue} onChangeText={setDiscountValue}
              keyboardType="decimal-pad" placeholder="0" />
            {!valueOk && <Text style={s.error}>{t('providerMkt.errPercentMax')}</Text>}
          </>
        )}

        {!discountType && <Text style={s.hint}>{t('providerMkt.noDiscountHint')}</Text>}

        <Button
          label={create.isPending ? t('providerNew.creating') : t('providerMkt.create')}
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
  row: { flexDirection: 'row', gap: space.md },
  label: { ...type.caption, color: colors.textMuted, fontWeight: weight.semibold },
  hint: { ...type.caption, color: colors.textLight },
  error: { ...type.caption, color: colors.danger },
  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  chip: { paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface },
  chipOn: { borderColor: colors.brand, backgroundColor: colors.brandTint },
  chipTxt: { ...type.caption, color: colors.textMuted, fontWeight: weight.medium },
  chipTxtOn: { color: colors.brand, fontWeight: weight.bold },
})
