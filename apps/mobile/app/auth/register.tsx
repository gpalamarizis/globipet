import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView, Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Eye, EyeOff, Mail, Lock, User, Sparkles } from 'lucide-react-native'
import { useAuthStore } from '../../src/store/auth'
import { colors, space, radius, type, weight, shadow, icon, touch } from '@/theme'

/**
 * Εγγραφή.
 *
 * ΤΙ ΠΡΟΣΤΕΘΗΚΕ
 *   Η δωρεάν δοκιμή AI ξεκινά αυτόματα με την εγγραφή. Δεν λεγόταν πουθενά,
 *   οπότε το πιο δυνατό επιχείρημα για να πατήσει κάποιος «Εγγραφή» ήταν
 *   αόρατο.
 *
 *   Επίσης έλεγχος μήκους κωδικού πριν το αίτημα — ο server τον απορρίπτει
 *   κάτω από 8 χαρακτήρες και ο χρήστης το μάθαινε μετά την υποβολή.
 */

const ROLES = [
  { id: 'user',             label: 'Ιδιοκτήτης', sub: 'Ψάχνω υπηρεσίες' },
  { id: 'service_provider', label: 'Πάροχος',    sub: 'Προσφέρω υπηρεσίες' },
]

export default function RegisterScreen() {
  const router = useRouter()
  const { register, loginWithGoogle, loginWithFacebook, isLoading } = useAuthStore()
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'user' })
  const [showPassword, setShowPassword] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [facebookLoading, setFacebookLoading] = useState(false)

  const msg = (err: any, fallback: string) =>
    err?.message || err?.response?.data?.message || fallback

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleRegister = async () => {
    if (!form.full_name.trim() || !form.email.trim() || !form.password) {
      Alert.alert('Σφάλμα', 'Συμπλήρωσε όλα τα πεδία'); return
    }
    // Ο server απορρίπτει κάτω από 8 — καλύτερα να το πει η φόρμα.
    if (form.password.length < 8) {
      Alert.alert('Σφάλμα', 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες'); return
    }
    try {
      await register({ ...form, full_name: form.full_name.trim(), email: form.email.trim() })
      router.replace('/(tabs)')
    } catch (err: any) {
      Alert.alert('Σφάλμα εγγραφής', msg(err, 'Δοκίμασε ξανά'))
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    try {
      const ok = await loginWithGoogle()
      if (ok) router.replace('/(tabs)')
    } catch (err: any) {
      Alert.alert('Σφάλμα με Google', msg(err, 'Κάτι πήγε στραβά'))
    } finally { setGoogleLoading(false) }
  }

  const handleFacebook = async () => {
    setFacebookLoading(true)
    try {
      const ok = await loginWithFacebook()
      if (ok) router.replace('/(tabs)')
    } catch (err: any) {
      Alert.alert('Σφάλμα με Facebook', msg(err, 'Κάτι πήγε στραβά'))
    } finally { setFacebookLoading(false) }
  }

  const busy = isLoading || googleLoading || facebookLoading

  return (
    <KeyboardAvoidingView style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <View style={s.brand}>
          <Image source={require('../../assets/icon.png')} style={s.logo} />
          <Text style={s.title}>Δημιουργία λογαριασμού</Text>
        </View>

        {/* Ο λόγος να πατήσει κανείς εγγραφή, γραμμένος. */}
        <View style={s.trialBanner}>
          <Sparkles size={icon.md} color={colors.accent} />
          <Text style={s.trialText}>
            30 μέρες δωρεάν όλες οι AI λειτουργίες
          </Text>
        </View>

        <View style={s.form}>
          <View style={s.roleRow}>
            {ROLES.map(r => {
              const active = form.role === r.id
              return (
                <TouchableOpacity key={r.id} activeOpacity={0.7}
                  style={[s.role, active && s.roleActive]}
                  onPress={() => set('role', r.id)}>
                  <Text style={[s.roleLabel, active && s.roleLabelActive]}>{r.label}</Text>
                  <Text style={s.roleSub}>{r.sub}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <View style={s.field}>
            <User size={icon.md} color={colors.textLight} />
            <TextInput style={s.input} placeholder="Ονοματεπώνυμο"
              value={form.full_name} onChangeText={v => set('full_name', v)}
              autoComplete="name" placeholderTextColor={colors.textLight} />
          </View>

          <View style={s.field}>
            <Mail size={icon.md} color={colors.textLight} />
            <TextInput style={s.input} placeholder="Email"
              value={form.email} onChangeText={v => set('email', v)}
              keyboardType="email-address" autoCapitalize="none" autoComplete="email"
              placeholderTextColor={colors.textLight} />
          </View>

          <View style={s.field}>
            <Lock size={icon.md} color={colors.textLight} />
            <TextInput style={s.input} placeholder="Κωδικός (8+ χαρακτήρες)"
              value={form.password} onChangeText={v => set('password', v)}
              secureTextEntry={!showPassword} autoCapitalize="none"
              placeholderTextColor={colors.textLight}
              onSubmitEditing={handleRegister} returnKeyType="go" />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={10}>
              {showPassword
                ? <EyeOff size={icon.md} color={colors.textLight} />
                : <Eye size={icon.md} color={colors.textLight} />}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[s.primaryBtn, busy && s.btnDisabled]}
            activeOpacity={0.85} disabled={busy} onPress={handleRegister}>
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.primaryBtnText}>Εγγραφή</Text>}
          </TouchableOpacity>

          <View style={s.divider}>
            <View style={s.line} /><Text style={s.dividerText}>ή</Text><View style={s.line} />
          </View>

          <TouchableOpacity style={[s.socialBtn, busy && s.btnDisabled]}
            activeOpacity={0.85} disabled={busy} onPress={handleGoogle}>
            {googleLoading
              ? <ActivityIndicator color={colors.text} />
              : <><Text style={s.googleG}>G</Text>
                  <Text style={s.socialText}>Συνέχεια με Google</Text></>}
          </TouchableOpacity>

          <TouchableOpacity style={[s.socialBtn, s.fbBtn, busy && s.btnDisabled]}
            activeOpacity={0.85} disabled={busy} onPress={handleFacebook}>
            {facebookLoading
              ? <ActivityIndicator color="#fff" />
              : <><Text style={s.fbF}>f</Text>
                  <Text style={[s.socialText, { color: '#fff' }]}>Συνέχεια με Facebook</Text></>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity activeOpacity={0.7} style={s.footer}
          onPress={() => router.push('/auth/login' as any)}>
          <Text style={s.footerText}>
            Έχεις ήδη λογαριασμό; <Text style={s.footerLink}>Σύνδεση</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: space.xl },

  brand: { alignItems: 'center', marginBottom: space.lg },
  logo: { width: 60, height: 60, borderRadius: radius.lg, marginBottom: space.md },
  title: { ...type.title, color: colors.textOnDark, fontWeight: weight.bold },

  trialBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm,
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.35)',
    borderRadius: radius.md,
    paddingVertical: space.md,
    marginBottom: space.lg,
  },
  trialText: { ...type.body, color: colors.accent, fontWeight: weight.semibold },

  form: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.xl,
    gap: space.md,
    ...shadow.lg,
  },
  roleRow: { flexDirection: 'row', gap: space.sm },
  role: {
    flex: 1, padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: 'transparent',
  },
  roleActive: { backgroundColor: colors.brandLight, borderColor: colors.brand },
  roleLabel: { ...type.body, color: colors.text, fontWeight: weight.bold },
  roleLabelActive: { color: colors.brand },
  roleSub: { ...type.caption, color: colors.textMuted, marginTop: 2 },

  field: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    height: touch.comfortable + 4,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
  },
  input: { flex: 1, ...type.body, color: colors.text, padding: 0 },

  primaryBtn: {
    height: touch.comfortable + 4, borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center',
    marginTop: space.sm,
  },
  primaryBtnText: { ...type.emphasis, color: '#fff', fontWeight: weight.bold },
  btnDisabled: { opacity: 0.5 },

  divider: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginVertical: space.sm },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { ...type.caption, color: colors.textLight },

  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md,
    height: touch.comfortable + 4, borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  fbBtn: { backgroundColor: '#1877F2', borderColor: '#1877F2' },
  socialText: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  googleG: { ...type.emphasis, color: '#4285F4', fontWeight: weight.black },
  fbF: { ...type.emphasis, color: '#fff', fontWeight: weight.black },

  footer: { alignItems: 'center', marginTop: space.xxl },
  footerText: { ...type.body, color: 'rgba(255,255,255,0.75)' },
  footerLink: { color: colors.accent, fontWeight: weight.bold },
})
