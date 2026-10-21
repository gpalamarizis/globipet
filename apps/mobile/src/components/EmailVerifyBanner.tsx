import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, AppState } from 'react-native'
import { useRouter } from 'expo-router'
import { MailWarning } from 'lucide-react-native'
import { useAuthStore, isEmailUnverified } from '../store/auth'
import { colors, space, radius, type, weight, icon, touch } from '@/theme'

/**
 * Ε12 — μπάρα «Επιβεβαίωσε το email σου — Ξαναστείλε» (ισοτιμία με το web,
 * web/src/pages/auth/EmailVerifyBanner.tsx).
 *
 * Τοποθετείται πάνω από το περιεχόμενο μιας οθόνης (π.χ. Αρχική). Εμφανίζεται
 * μόνο όσο ο server λέει `email_verified: false`· στην επιστροφή της εφαρμογής
 * στο προσκήνιο ξαναδιαβάζει το /auth/me. Πάτημα στο κείμενο → οθόνη
 * /auth/verify-email.
 */
export default function EmailVerifyBanner() {
  const { t } = useTranslation()
  const router = useRouter()
  const { user, isAuthenticated, refreshUser, resendVerification } = useAuthStore()
  const [sending, setSending] = useState(false)
  const show = isAuthenticated && isEmailUnverified(user)

  useEffect(() => {
    if (!show) return
    const sub = AppState.addEventListener('change', st => { if (st === 'active') void refreshUser() })
    return () => sub.remove()
  }, [show, refreshUser])

  if (!show) return null

  const resend = async () => {
    setSending(true)
    try {
      const res = await resendVerification()
      Alert.alert(t('emailVerify.title'), res?.email_verified ? t('emailVerify.alreadyVerified') : t('emailVerify.sent'))
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.response?.data?.message || t('common.try_again'))
    } finally { setSending(false) }
  }

  return (
    <View style={s.bar} accessibilityRole="alert">
      <TouchableOpacity style={s.textWrap} activeOpacity={0.7} onPress={() => router.push('/auth/verify-email' as any)}>
        <MailWarning size={icon.sm} color={colors.text} />
        <Text style={s.text} numberOfLines={2}>{t('emailVerify.bannerText')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btn} activeOpacity={0.7} disabled={sending} onPress={resend}>
        {sending
          ? <ActivityIndicator size="small" color={colors.brand} />
          : <Text style={s.btnText}>{t('emailVerify.resend')}</Text>}
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    backgroundColor: colors.warningBg,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    minHeight: touch.min,
  },
  textWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  text: { flex: 1, ...type.caption, color: colors.text, fontWeight: weight.medium },
  btn: { minHeight: touch.min, minWidth: touch.min, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xs },
  btnText: { ...type.caption, color: colors.brand, fontWeight: weight.bold },
})
