import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../src/lib/api'
import { Screen, Button, Input } from '@/components/ui'
import { colors, space, radius, type, weight } from '@/theme'

/**
 * Προσθήκη μέλους προσωπικού, από κινητό.
 *
 * Τα ελάχιστα που απαιτεί ο server είναι υπηρεσία και ονοματεπώνυμο. Τα
 * υπόλοιπα είναι προαιρετικά: ο πάροχος που προσθέτει γιατρό στα γρήγορα
 * δεν πρέπει να μπλοκάρεται επειδή δεν ξέρει τον αριθμό άδειας απ' έξω.
 */
export default function NewStaffScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()

  const [serviceId, setServiceId] = useState('')
  const [fullName, setFullName] = useState('')
  const [title, setTitle] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [telehealth, setTelehealth] = useState(false)

  const { data: services = [] } = useQuery({
    queryKey: ['provider-services'],
    queryFn: () => api.get('/services/my').then(r => r.data?.data ?? r.data ?? []),
  })

  const create = useMutation({
    mutationFn: () => api.post('/staff', {
      service_id: serviceId,
      full_name: fullName.trim(),
      title: title.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      accepts_telehealth: telehealth,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provider-staff-all'] })
      router.replace('/(provider)/staff' as any)
    },
    onError: (e: any) =>
      Alert.alert(t('common.error'), e?.response?.data?.message || t('providerStaffNew.errCreate')),
  })

  const canSave = !!serviceId && fullName.trim().length > 1

  return (
    <Screen title={t('providerStaffNew.title')} back scroll={false}>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>{t('providerStaffNew.forService')}</Text>
        {services.length === 0 ? (
          <Text style={s.hint}>{t('providerStaffNew.noServices')}</Text>
        ) : services.map((sv: any) => {
          const on = serviceId === sv.id
          return (
            <TouchableOpacity key={sv.id} activeOpacity={0.7}
              style={[s.option, on && s.optionOn]}
              onPress={() => setServiceId(sv.id)}>
              <Text style={[s.optionTxt, on && s.optionTxtOn]} numberOfLines={1}>
                {sv.title || sv.provider_name}
              </Text>
            </TouchableOpacity>
          )
        })}

        <Input label={t('providerStaffNew.fullName')} value={fullName} onChangeText={setFullName}
          placeholder={t('providerStaffNew.fullNamePlaceholder')} />
        <Input label={t('providerStaffNew.role')} value={title} onChangeText={setTitle}
          placeholder={t('providerStaffNew.rolePlaceholder')} />
        <Input label={t('common.email')} value={email} onChangeText={setEmail}
          keyboardType="email-address" autoCapitalize="none" />
        <Input label={t('common.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <View style={s.switchRow}>
          <Text style={s.switchLabel}>{t('providerStaffNew.acceptsTelehealth')}</Text>
          <Switch value={telehealth} onValueChange={setTelehealth}
            trackColor={{ true: colors.brand, false: colors.border }} thumbColor={colors.surface} />
        </View>

        <Button
          label={create.isPending ? t('providerNew.creating') : t('providerStaffNew.save')}
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
  hint: { ...type.caption, color: colors.textLight },
  option: { padding: space.md, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface },
  optionOn: { borderColor: colors.brand, backgroundColor: colors.brandTint },
  optionTxt: { ...type.body, color: colors.text, fontWeight: weight.medium },
  optionTxtOn: { color: colors.brand, fontWeight: weight.bold },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space.sm },
  switchLabel: { ...type.body, color: colors.text, flex: 1 },
})
