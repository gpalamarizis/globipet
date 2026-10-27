import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
  ScrollView, BackHandler, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter, useNavigation } from 'expo-router'
import { Calendar, CalendarHeart } from 'lucide-react-native'
import { api } from '@/lib/api'
import { queryClient } from '../../src/lib/queryClient'
import { useAuthStore } from '../../src/store/auth'
import { unregisterPushToken } from '../../src/lib/notifications'
import { colors, space, radius, type, weight, shadow, icon, touch } from '@/theme'

/**
 * Ε13 — «Συμπλήρωσε την ημερομηνία γέννησής σου».
 *
 * Οι εγγραφές με Google/Facebook (και παλιοί λογαριασμοί) δεν έχουν
 * ημερομηνία γέννησης· η εγγραφή με κωδικό απαιτεί 15+. Όσο ο server λέει
 * `needs_birth_date: true`, το app/_layout.tsx ανοίγει αυτή την οθόνη μετά το
 * login/OAuth και στο άνοιγμα της εφαρμογής. Ίδια λειτουργία με την πύλη του
 * web (components/BirthDateGate.tsx).
 *
 * Τρία αριθμητικά πεδία όπως στην εγγραφή (χωρίς νέα native εξάρτηση) και
 * ίδιος έλεγχος. Κάτω των 15: ζητάμε επιβεβαίωση (ένα λάθος έτος κλείνει τον
 * λογαριασμό), ο server κλείνει τον λογαριασμό (403, account_closed) και
 * εδώ γίνεται αποσύνδεση. Δεν κλείνει με «πίσω» ούτε με σύρσιμο.
 */
export default function BirthDateScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const navigation = useNavigation()
  const { user, updateUser, refreshUser, logout } = useAuthStore()
  const [dob, setDob] = useState({ d: '', m: '', y: '' })
  const [saving, setSaving] = useState(false)

  // Android «πίσω»: η οθόνη δεν παρακάμπτεται (το _layout θα την ξανάνοιγε).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true)
    return () => sub.remove()
  }, [])

  const setD = (k: 'd' | 'm' | 'y', v: string) =>
    setDob(o => ({ ...o, [k]: v.replace(/[^0-9]/g, '') }))

  /**
   * Ε20: η οθόνη ανοίγει (push, modal) ΠΑΝΩ από τη σελίδα όπου βρισκόταν ο
   * χρήστης — π.χ. το /membership όπου τον έστειλε η σύνδεση με redirect. Μετά
   * την αποθήκευση επιστρέφει εκεί (back) αντί για την Αρχική. Πάροχος, ή
   * χωρίς σελίδα από κάτω, ή αν από κάτω είναι οθόνη σύνδεσης/εγγραφής
   * (auth/*) → όπως πριν.
   */
  const goApp = () => {
    const role = useAuthStore.getState().user?.role ?? user?.role
    let below: string | undefined
    try {
      const st: any = navigation.getState()
      below = st?.routes?.[(st?.index ?? 0) - 1]?.name
    } catch { below = undefined }
    if (role !== 'service_provider' && below && !below.startsWith('auth') && router.canGoBack()) {
      // Η σελίδα από κάτω μπορεί να φόρτωσε πριν την πύλη και να πήρε 403
      // birth_date_required — ξαναφόρτωση των ερωτημάτων με σφάλμα.
      void queryClient.refetchQueries({ predicate: q => q.state.status === 'error' })
      router.back()
      return
    }
    router.replace((role === 'service_provider' ? '/(provider)' : '/(tabs)') as any)
  }

  /** Ίδιος έλεγχος με το app/auth/register.tsx — εκτός από το όριο, που κρίνεται στο submit. */
  const parse = (): { iso: string; age: number } | { error: string } => {
    const d = parseInt(dob.d, 10), m = parseInt(dob.m, 10), y = parseInt(dob.y, 10)
    if (!d || !m || !y || dob.y.length !== 4) return { error: t('auth.dobRequired') }
    const date = new Date(y, m - 1, d)
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
      return { error: t('auth.dobInvalid') }
    }
    const now = new Date()
    if (date > now) return { error: t('auth.dobFuture') }
    let age = now.getFullYear() - date.getFullYear()
    const monthDiff = now.getMonth() - date.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) age--
    const pad = (n: number) => String(n).padStart(2, '0')
    return { iso: `${y}-${pad(m)}-${pad(d)}`, age }
  }

  const send = async (iso: string, under: boolean) => {
    setSaving(true)
    try {
      // Το τοκεν ακυρώνεται από τον server στο 403 — η συσκευή διαγράφεται από
      // τις ειδοποιήσεις push ΠΡΙΝ, όσο ισχύει ακόμα.
      if (under) await unregisterPushToken()
      const { data } = await api.patch('/auth/me/birth-date', { birth_date: iso })
      if (data && typeof data === 'object' && data.id) await updateUser(data)
      goApp()
    } catch (err: any) {
      const status = err?.response?.status
      const body = err?.response?.data
      if (status === 403 && body?.account_closed) {
        await logout()
        Alert.alert(t('birthGate.closedTitle'), body?.message || t('birthGate.closedLogin'))
        router.replace('/(tabs)' as any)
      } else if (status === 409) {
        await refreshUser() // είχε ήδη οριστεί (π.χ. από το web)
        goApp()
      } else {
        Alert.alert(t('common.error'), body?.message || err?.message || t('common.try_again'))
      }
    } finally {
      setSaving(false)
    }
  }

  const submit = () => {
    const r = parse()
    if ('error' in r) { Alert.alert(t('common.error'), r.error); return }
    if (r.age < 15) {
      Alert.alert(t('birthGate.title'), t('birthGate.underConfirm'), [
        { text: t('birthGate.changeDate'), style: 'cancel' },
        { text: t('birthGate.confirmUnder'), style: 'destructive', onPress: () => { void send(r.iso, true) } },
      ])
      return
    }
    void send(r.iso, false)
  }

  const signOut = async () => {
    await logout()
    router.replace('/(tabs)' as any)
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          <View style={s.iconWrap}>
            <CalendarHeart size={icon.hero} color={colors.brand} />
          </View>
          <Text style={s.title}>{t('birthGate.title')}</Text>
          <Text style={s.sub}>{t('birthGate.body')}</Text>

          <View style={s.field}>
            <Calendar size={icon.md} color={colors.textLight} />
            <TextInput style={[s.input, s.dobPart]} placeholder={t('auth.dobDay')}
              value={dob.d} onChangeText={v => setD('d', v)}
              keyboardType="number-pad" maxLength={2}
              placeholderTextColor={colors.textLight} />
            <Text style={s.dobSep}>/</Text>
            <TextInput style={[s.input, s.dobPart]} placeholder={t('auth.dobMonth')}
              value={dob.m} onChangeText={v => setD('m', v)}
              keyboardType="number-pad" maxLength={2}
              placeholderTextColor={colors.textLight} />
            <Text style={s.dobSep}>/</Text>
            <TextInput style={[s.input, s.dobYear]} placeholder={t('auth.dobYear')}
              value={dob.y} onChangeText={v => setD('y', v)}
              keyboardType="number-pad" maxLength={4}
              placeholderTextColor={colors.textLight}
              onSubmitEditing={submit} returnKeyType="done" />
          </View>
          <Text style={s.hint}>{t('auth.dobHint')}</Text>

          <TouchableOpacity style={[s.primaryBtn, saving && { opacity: 0.5 }]} activeOpacity={0.85}
            disabled={saving} onPress={submit}>
            {saving
              ? <ActivityIndicator color={colors.textOnDark} />
              : <Text style={s.primaryBtnText}>{t('birthGate.submit')}</Text>}
          </TouchableOpacity>

          <View style={s.links}>
            <TouchableOpacity style={s.linkBtn} onPress={() => router.push('/terms' as any)}>
              <Text style={s.linkText}>{t('birthGate.terms')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.linkBtn} onPress={() => router.push('/privacy-policy' as any)}>
              <Text style={s.linkText}>{t('birthGate.privacy')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.linkBtn} disabled={saving} onPress={signOut}>
              <Text style={s.linkText}>{t('auth.logout')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  // Ίδιο πεδίο με την εγγραφή (app/auth/register.tsx).
  field: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    height: touch.comfortable + 4,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
  },
  input: { flex: 1, ...type.body, color: colors.text, padding: 0 },
  dobPart: { flex: 0, width: 46, textAlign: 'center' as const },
  dobYear: { flex: 0, width: 68, textAlign: 'center' as const },
  dobSep:  { ...type.body, color: colors.textLight, marginHorizontal: 2 },
  hint: { ...type.caption, color: colors.textLight, marginTop: space.xs, marginLeft: space.xs },
  primaryBtn: {
    height: touch.comfortable + 4, borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center',
    marginTop: space.lg,
  },
  primaryBtnText: { ...type.emphasis, color: '#fff', fontWeight: weight.bold },
  links: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center',
    columnGap: space.lg, marginTop: space.md,
  },
  linkBtn: { minHeight: touch.min, alignItems: 'center', justifyContent: 'center' },
  linkText: { ...type.body, color: colors.textMuted, fontWeight: weight.semibold, textDecorationLine: 'underline' },
})
