import { useState } from 'react'
import { View, Text, StyleSheet, Switch, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import { KeyRound } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, Card, Button, Input, EmptyState } from '@/components/ui'
import { colors, space, type, weight } from '@/theme'

/**
 * Αλλαγή κωδικού — ίδια ροή με την κάρτα του web (POST /users/me/password).
 *
 * Οι έλεγχοι εδώ αντιγράφουν τους ελέγχους του server (8+ χαρακτήρες,
 * διαφορετικός από τον τρέχοντα), ώστε ο χρήστης να μην το μαθαίνει μετά
 * την υποβολή. Λογαριασμός μόνο Google/Facebook δεν έχει κωδικό: ο server
 * το λέει με σαφές μήνυμα, που εμφανίζεται αυτούσιο.
 */
export default function ChangePasswordScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const isAuthenticated = useAuthStore(st => st.isAuthenticated)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)

  const change = useMutation({
    mutationFn: () => api.post('/users/me/password', { current_password: current, new_password: next }),
    onSuccess: () => {
      Alert.alert(t('account.passwordChanged'))
      router.back()
    },
    onError: (e: any) =>
      Alert.alert(t('common.error'), e?.response?.data?.message || t('account.passwordError')),
  })

  const submit = () => {
    if (next.length < 8) return Alert.alert(t('common.error'), t('account.passwordMin'))
    if (next !== confirm) return Alert.alert(t('common.error'), t('account.passwordMismatch'))
    if (current === next) return Alert.alert(t('common.error'), t('account.passwordSame'))
    change.mutate()
  }

  if (!isAuthenticated) return (
    <Screen title={t('account.changePassword')} back>
      <EmptyState icon={KeyRound} title={t('auth.login_to_continue')}
        action={<Button label={t('auth.login')} onPress={() => router.push('/auth/login' as any)} />} />
    </Screen>
  )

  return (
    <Screen title={t('account.changePassword')} back>
      <Text style={s.hint}>{t('account.socialHint')}</Text>
      <Card>
        <Input label={t('account.currentPassword')} value={current} onChangeText={setCurrent}
          secureTextEntry={!show} autoCapitalize="none" placeholder="••••••••" />
        <Input label={t('account.newPassword')} value={next} onChangeText={setNext}
          secureTextEntry={!show} autoCapitalize="none" placeholder="••••••••"
          hint={t('auth.password_8')} />
        <Input label={t('account.confirmPassword')} value={confirm} onChangeText={setConfirm}
          secureTextEntry={!show} autoCapitalize="none" placeholder="••••••••"
          error={confirm && next !== confirm ? t('account.passwordMismatch') : undefined} />

        <View style={s.showRow}>
          <Text style={s.showLabel}>{t('account.showPasswords')}</Text>
          <Switch value={show} onValueChange={setShow}
            trackColor={{ true: colors.brand, false: colors.border }} thumbColor={colors.surface} />
        </View>

        <Button full label={change.isPending ? t('account.changing') : t('account.changePassword')}
          loading={change.isPending}
          disabled={!current || !next || !confirm || change.isPending}
          onPress={submit} />
      </Card>
    </Screen>
  )
}

const s = StyleSheet.create({
  hint: { ...type.caption, color: colors.textLight, marginBottom: space.md },
  showRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: space.lg,
  },
  showLabel: { ...type.body, color: colors.text, fontWeight: weight.medium },
})
