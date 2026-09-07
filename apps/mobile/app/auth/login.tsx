import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView, Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react-native'
import { useAuthStore } from '../../src/store/auth'
import { colors, space, radius, type, weight, shadow, icon, touch } from '@/theme'

/**
 * Σύνδεση.
 *
 * Η λογική OAuth και το store μένουν όπως ήταν — μόνο η εμφάνιση αλλάζει.
 *
 * ΤΑ ΜΗΝΥΜΑΤΑ ΣΦΑΛΜΑΤΟΣ
 *   Διάβαζαν `err.response?.data?.message`. Ο interceptor του api τα
 *   επίπεδο σε `err.message` — και τα δύο σχήματα καλύπτονται τώρα, ώστε
 *   ο χρήστης να βλέπει «Λανθασμένος κωδικός» αντί για γενικό μήνυμα.
 */
export default function LoginScreen() {
  const router = useRouter()
  const { login, loginWithGoogle, loginWithFacebook, isLoading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [facebookLoading, setFacebookLoading] = useState(false)

  const msg = (err: any, fallback: string) =>
    err?.message || err?.response?.data?.message || fallback

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Σφάλμα', 'Συμπλήρωσε email και κωδικό'); return
    }
    try {
      await login(email.trim(), password)
      router.replace('/(tabs)')
    } catch (err: any) {
      Alert.alert('Σφάλμα σύνδεσης', msg(err, 'Λανθασμένα στοιχεία'))
    }
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    try {
      const signedIn = await loginWithGoogle()
      if (signedIn) router.replace('/(tabs)')
    } catch (err: any) {
      Alert.alert('Σφάλμα σύνδεσης με Google', msg(err, 'Κάτι πήγε στραβά'))
    } finally { setGoogleLoading(false) }
  }

  const handleFacebookLogin = async () => {
    setFacebookLoading(true)
    try {
      const signedIn = await loginWithFacebook()
      if (signedIn) router.replace('/(tabs)')
    } catch (err: any) {
      Alert.alert('Σφάλμα σύνδεσης με Facebook', msg(err, 'Κάτι πήγε στραβά'))
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
          <Text style={s.title}>Καλώς ήρθες</Text>
          <Text style={s.subtitle}>Συνδέσου για να συνεχίσεις</Text>
        </View>

        <View style={s.form}>
          <View style={s.field}>
            <Mail size={icon.md} color={colors.textLight} />
            <TextInput
              style={s.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholderTextColor={colors.textLight}
            />
          </View>

          <View style={s.field}>
            <Lock size={icon.md} color={colors.textLight} />
            <TextInput
              style={s.input}
              placeholder="Κωδικός"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              placeholderTextColor={colors.textLight}
              onSubmitEditing={handleLogin}
              returnKeyType="go"
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={10}>
              {showPassword
                ? <EyeOff size={icon.md} color={colors.textLight} />
                : <Eye size={icon.md} color={colors.textLight} />}
            </TouchableOpacity>
          </View>

          <TouchableOpacity activeOpacity={0.7}
            onPress={() => router.push('/auth/forgot-password' as any)}>
            <Text style={s.forgot}>Ξέχασες τον κωδικό σου;</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.primaryBtn, busy && s.btnDisabled]}
            activeOpacity={0.85}
            disabled={busy}
            onPress={handleLogin}>
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.primaryBtnText}>Σύνδεση</Text>}
          </TouchableOpacity>

          <View style={s.divider}>
            <View style={s.line} />
            <Text style={s.dividerText}>ή</Text>
            <View style={s.line} />
          </View>

          <TouchableOpacity
            style={[s.socialBtn, busy && s.btnDisabled]}
            activeOpacity={0.85}
            disabled={busy}
            onPress={handleGoogleLogin}>
            {googleLoading
              ? <ActivityIndicator color={colors.text} />
              : <>
                  <Text style={s.googleG}>G</Text>
                  <Text style={s.socialText}>Συνέχεια με Google</Text>
                </>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.socialBtn, s.fbBtn, busy && s.btnDisabled]}
            activeOpacity={0.85}
            disabled={busy}
            onPress={handleFacebookLogin}>
            {facebookLoading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Text style={s.fbF}>f</Text>
                  <Text style={[s.socialText, { color: '#fff' }]}>Συνέχεια με Facebook</Text>
                </>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity activeOpacity={0.7} style={s.footer}
          onPress={() => router.push('/auth/register' as any)}>
          <Text style={s.footerText}>
            Δεν έχεις λογαριασμό; <Text style={s.footerLink}>Εγγραφή</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: space.xl },

  brand: { alignItems: 'center', marginBottom: space.xxxl },
  logo: { width: 72, height: 72, borderRadius: radius.xl, marginBottom: space.lg },
  title: { ...type.display, color: colors.textOnDark, fontWeight: weight.black },
  subtitle: { ...type.body, color: 'rgba(255,255,255,0.7)', marginTop: space.xs },

  form: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.xl,
    gap: space.md,
    ...shadow.lg,
  },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    height: touch.comfortable + 4,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
  },
  input: { flex: 1, ...type.body, color: colors.text, padding: 0 },

  forgot: {
    ...type.caption, color: colors.brand, fontWeight: weight.semibold,
    textAlign: 'right', marginTop: -space.xs,
  },

  primaryBtn: {
    height: touch.comfortable + 4,
    borderRadius: radius.md,
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
    height: touch.comfortable + 4,
    borderRadius: radius.md,
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
