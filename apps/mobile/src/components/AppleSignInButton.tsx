import { useEffect, useState } from 'react'
import { Alert, View, ActivityIndicator, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import * as AppleAuthentication from 'expo-apple-authentication'
import { isAppleSignInAvailable } from '../lib/appleAuth'
import { useAuthStore } from '../store/auth'
import { colors, radius, touch } from '@/theme'

/**
 * «Συνέχεια με Apple» — μόνο iOS (App Store Guideline 4.8).
 *
 * Το επίσημο κουμπί της Apple (ίδιο ύψος/γωνίες με τα κουμπιά Google/Facebook,
 * κείμενο στη γλώσσα του iPhone). Στο Android και όπου δεν υποστηρίζεται δεν
 * αποδίδει τίποτα.
 */
export function AppleSignInButton({ disabled, onBusyChange, onSignedIn }: {
  disabled?: boolean
  onBusyChange?: (busy: boolean) => void
  onSignedIn: () => void
}) {
  const { t } = useTranslation()
  const loginWithApple = useAuthStore(s => s.loginWithApple)
  const [available, setAvailable] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => { isAppleSignInAvailable().then(setAvailable) }, [])
  if (!available) return null

  const press = async () => {
    if (disabled || busy) return
    setBusy(true); onBusyChange?.(true)
    try {
      const ok = await loginWithApple()
      if (ok) onSignedIn()
    } catch (err: any) {
      Alert.alert(t('auth.err_apple'), err?.message || err?.response?.data?.message || t('common.something_wrong'))
    } finally {
      setBusy(false); onBusyChange?.(false)
    }
  }

  return (
    <View style={[s.wrap, (disabled || busy) && s.dim]} pointerEvents={disabled || busy ? 'none' : 'auto'}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={radius.md}
        style={s.btn}
        onPress={press}
      />
      {busy && <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.surface} />}
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { width: '100%' },
  btn: { width: '100%', height: touch.comfortable + 4 },
  dim: { opacity: 0.5 },
})
