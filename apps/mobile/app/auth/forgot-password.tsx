import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { colors, space, radius, type, weight, shadow, icon, touch } from '@/theme'

/**
 * Ανάκτηση κωδικού.
 *
 * Η επιτυχία δεν επιβεβαιώνει ότι το email υπάρχει — αυτό θα έλεγε σε
 * οποιονδήποτε ποιες διευθύνσεις είναι εγγεγραμμένες. Το μήνυμα είναι το
 * ίδιο είτε ο λογαριασμός υπάρχει είτε όχι.
 */
export default function ForgotPasswordScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async () => {
    if (!email.trim()) { Alert.alert('Σφάλμα', 'Συμπλήρωσε το email σου'); return }
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: email.trim() })
      setSent(true)
    } catch (err: any) {
      Alert.alert('Σφάλμα', err?.message || 'Παρουσιάστηκε πρόβλημα. Δοκίμασε ξανά.')
    } finally { setLoading(false) }
  }

  return (
    <KeyboardAvoidingView style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      <TouchableOpacity style={s.back} activeOpacity={0.7} onPress={() => router.back()}>
        <ArrowLeft size={icon.lg} color={colors.textOnDark} />
      </TouchableOpacity>

      <View style={s.inner}>
        {sent ? (
          <View style={s.card}>
            <View style={s.successIcon}>
              <CheckCircle2 size={icon.hero} color={colors.success} />
            </View>
            <Text style={s.title}>Έλεγξε το email σου</Text>
            <Text style={s.sub}>
              Αν υπάρχει λογαριασμός με τη διεύθυνση {email.trim()}, θα λάβεις
              σύνδεσμο επαναφοράς μέσα σε λίγα λεπτά.
            </Text>
            <TouchableOpacity style={s.primaryBtn} activeOpacity={0.85}
              onPress={() => router.replace('/auth/login' as any)}>
              <Text style={s.primaryBtnText}>Επιστροφή στη σύνδεση</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.card}>
            <Text style={s.title}>Ξέχασες τον κωδικό;</Text>
            <Text style={s.sub}>
              Γράψε το email σου και θα σου στείλουμε σύνδεσμο επαναφοράς.
            </Text>

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
                onSubmitEditing={submit}
                returnKeyType="send"
              />
            </View>

            <TouchableOpacity
              style={[s.primaryBtn, loading && { opacity: 0.5 }]}
              activeOpacity={0.85} disabled={loading} onPress={submit}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.primaryBtnText}>Αποστολή συνδέσμου</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  back: { position: 'absolute', top: space.xxxl + space.lg, left: space.lg, zIndex: 1, padding: space.sm },
  inner: { flex: 1, justifyContent: 'center', padding: space.xl },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.xl,
    ...shadow.lg,
  },
  successIcon: { alignItems: 'center', marginBottom: space.lg },
  title: { ...type.title, color: colors.text, fontWeight: weight.bold, textAlign: 'center' },
  sub: {
    ...type.body, color: colors.textMuted, textAlign: 'center',
    marginTop: space.sm, marginBottom: space.xl, lineHeight: 22,
  },

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
    marginTop: space.lg,
  },
  primaryBtnText: { ...type.emphasis, color: '#fff', fontWeight: weight.bold },
})
