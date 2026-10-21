import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
  ScrollView, RefreshControl, AppState,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { MailCheck, CheckCircle2 } from 'lucide-react-native'
import { useAuthStore, isEmailUnverified } from '../../src/store/auth'
import { colors, space, radius, type, weight, shadow, icon, touch } from '@/theme'

/**
 * Ε12 — «Επιβεβαίωσε το email σου».
 *
 * Ανοίγει μετά την εγγραφή με κωδικό (και από τη μπάρα EmailVerifyBanner).
 * Ο σύνδεσμος του email ανοίγει το web (globipet.com/verify-email)· εδώ
 * ξαναδιαβάζουμε το /auth/me όταν η εφαρμογή επανέρχεται στο προσκήνιο, με
 * pull-to-refresh και με το «Το επιβεβαίωσα». Δεν μπλοκάρει τίποτα: ο χρήστης
 * μπορεί να συνεχίσει στην εφαρμογή αμέσως.
 */
export default function VerifyEmailScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  // from=register: η οθόνη αντικατέστησε την εγγραφή — το «πίσω» θα γύριζε
  // στη σύνδεση (login → register), όχι στην εφαρμογή.
  const { from } = useLocalSearchParams<{ from?: string }>()
  const { user, refreshUser, resendVerification } = useAuthStore()
  const [sending, setSending] = useState(false)
  const [checking, setChecking] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const verified = !!user && !isEmailUnverified(user)

  // Επιστροφή από τον browser/το email → έλεγχος.
  useEffect(() => {
    const sub = AppState.addEventListener('change', st => { if (st === 'active') void refreshUser() })
    return () => sub.remove()
  }, [refreshUser])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refreshUser()
    setRefreshing(false)
  }, [refreshUser])

  // «Συνέχεια»: πίσω από όπου ήρθε (μπάρα EmailVerifyBanner, προφίλ)· αν η
  // οθόνη άνοιξε πρώτη (μετά την εγγραφή), στον σωστό χώρο — ο καθαρός
  // πάροχος στο (provider), όπως το _layout. Πριν πήγαινε πάντα στο (tabs)
  // και ο πάροχος «αναπηδούσε» μέσω του _layout.
  const goApp = () => {
    if (from !== 'register' && router.canGoBack()) router.back()
    else router.replace((user?.role === 'service_provider' ? '/(provider)' : '/(tabs)') as any)
  }

  const resend = async () => {
    setSending(true)
    try {
      const res = await resendVerification()
      Alert.alert(t('emailVerify.title'), res?.email_verified ? t('emailVerify.alreadyVerified') : t('emailVerify.sent'))
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.response?.data?.message || t('common.try_again'))
    } finally { setSending(false) }
  }

  const check = async () => {
    setChecking(true)
    await refreshUser()
    setChecking(false)
    if (isEmailUnverified(useAuthStore.getState().user)) {
      Alert.alert(t('emailVerify.title'), t('emailVerify.notYet'))
    }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.inner}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textOnDark} />}>
      <View style={s.card}>
        <View style={s.iconWrap}>
          {verified
            ? <CheckCircle2 size={icon.hero} color={colors.success} />
            : <MailCheck size={icon.hero} color={colors.brand} />}
        </View>
        <Text style={s.title}>{verified ? t('emailVerify.successTitle') : t('emailVerify.title')}</Text>
        <Text style={s.sub}>
          {verified ? t('emailVerify.successBody') : t('emailVerify.sentTo', { email: user?.email ?? '' })}
        </Text>

        <TouchableOpacity style={s.primaryBtn} activeOpacity={0.85} onPress={goApp}>
          <Text style={s.primaryBtnText}>{t('emailVerify.continue')}</Text>
        </TouchableOpacity>

        {!verified && (
          <>
            <TouchableOpacity style={[s.secondaryBtn, sending && { opacity: 0.5 }]}
              activeOpacity={0.85} disabled={sending} onPress={resend}>
              {sending
                ? <ActivityIndicator color={colors.brand} />
                : <Text style={s.secondaryBtnText}>{t('emailVerify.resend')}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.linkBtn} activeOpacity={0.7} disabled={checking} onPress={check}>
              {checking
                ? <ActivityIndicator color={colors.textMuted} />
                : <Text style={s.linkText}>{t('emailVerify.iVerified')}</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  inner: { flexGrow: 1, justifyContent: 'center', padding: space.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.xl,
    ...shadow.lg,
  },
  iconWrap: { alignItems: 'center', marginBottom: space.lg },
  title: { ...type.title, color: colors.text, fontWeight: weight.bold, textAlign: 'center' },
  sub: {
    ...type.body, color: colors.textMuted, textAlign: 'center',
    marginTop: space.sm, marginBottom: space.lg,
  },
  primaryBtn: {
    height: touch.comfortable + 4, borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center',
    marginTop: space.sm,
  },
  primaryBtnText: { ...type.emphasis, color: '#fff', fontWeight: weight.bold },
  secondaryBtn: {
    height: touch.comfortable + 4, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.brand,
    alignItems: 'center', justifyContent: 'center',
    marginTop: space.md,
  },
  secondaryBtnText: { ...type.emphasis, color: colors.brand, fontWeight: weight.bold },
  linkBtn: { minHeight: touch.min, alignItems: 'center', justifyContent: 'center', marginTop: space.sm },
  linkText: { ...type.body, color: colors.textMuted, fontWeight: weight.semibold, textDecorationLine: 'underline' },
})
