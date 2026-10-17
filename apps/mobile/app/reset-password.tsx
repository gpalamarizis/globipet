import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import { KeyRound, CheckCircle2 } from 'lucide-react-native'
import { api } from '@/lib/api'
import { Screen, Card, Button, Input } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Επαναφορά κωδικού από σύνδεσμο email.
 *
 * Ο σύνδεσμος του email ανοίγει globipet://reset-password?token=…
 * Το σχήμα είναι ήδη δηλωμένο στο app.json, οπότε η οθόνη είναι
 * προσβάσιμη χωρίς άλλη ρύθμιση.
 *
 * Ο έλεγχος μήκους γίνεται ΚΑΙ εδώ: ο server απορρίπτει κάτω από οκτώ
 * χαρακτήρες και χωρίς αυτό ο χρήστης θα το μάθαινε μετά την υποβολή.
 */
export default function ResetPasswordScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { token } = useLocalSearchParams<{ token?: string }>()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)

  const reset = useMutation({
    mutationFn: () => api.post('/auth/reset-password', { token, password }),
    onSuccess: () => setDone(true),
    onError: (e: any) => setError(e?.response?.data?.message || e?.message || t('common.something_wrong')),
  })
  const [error, setError] = useState('')

  const tooShort = password.length > 0 && password.length < 8
  const mismatch = confirm.length > 0 && password !== confirm
  const canSubmit = password.length >= 8 && password === confirm && !!token && !reset.isPending

  if (done) return (
    <Screen title={t('auth.reset_password')}>
      <Card>
        <View style={s.doneHead}>
          <CheckCircle2 size={icon.xl} color={colors.success} />
          <Text style={s.doneTitle}>{t('reset.done')}</Text>
        </View>
        <Text style={s.doneTxt}>{t('reset.doneHint')}</Text>
        <Button label={t('auth.sign_in')} onPress={() => router.replace('/auth/login' as any)}
          full style={{ marginTop: space.lg }} />
      </Card>
    </Screen>
  )

  return (
    <Screen title={t('auth.reset_password')} back scroll={false}>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <View style={s.icon}><KeyRound size={icon.xl} color={colors.brand} /></View>

        {!token ? (
          <Card>
            <Text style={s.title}>{t('reset.noToken')}</Text>
            <Text style={s.hint}>{t('reset.noTokenHint')}</Text>
            <Button label={t('auth.forgot_password')} variant="secondary"
              onPress={() => router.replace('/auth/forgot-password' as any)}
              full style={{ marginTop: space.lg }} />
          </Card>
        ) : (
          <>
            <Text style={s.hint}>{t('reset.subtitle')}</Text>
            <Input label={t('auth.password_8')} value={password} onChangeText={setPassword}
              secureTextEntry error={tooShort ? t('auth.password_min_error') : undefined} />
            <Input label={t('reset.confirm')} value={confirm} onChangeText={setConfirm}
              secureTextEntry error={mismatch ? t('reset.mismatch') : undefined} />
            {!!error && <Text style={s.error}>{error}</Text>}
            <Button label={t('reset.submit')} disabled={!canSubmit} loading={reset.isPending}
              onPress={() => { setError(''); reset.mutate() }} full />
          </>
        )}
      </ScrollView>
    </Screen>
  )
}

const s = StyleSheet.create({
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
  icon: { alignSelf: 'center', width: 72, height: 72, borderRadius: radius.full, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
  title: { ...type.section, color: colors.text },
  hint: { ...type.body, color: colors.textMuted },
  error: { ...type.caption, color: colors.danger },
  doneHead: { alignItems: 'center', gap: space.sm },
  doneTitle: { ...type.section, color: colors.text },
  doneTxt: { ...type.body, color: colors.textMuted, textAlign: 'center', marginTop: space.sm },
})
