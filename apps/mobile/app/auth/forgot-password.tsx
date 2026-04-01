import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { api } from '../../src/lib/api'

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async () => {
    if (!email) { Alert.alert('Σφάλμα', 'Εισάγετε το email σας'); return }
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch {
      Alert.alert('Σφάλμα', 'Παρουσιάστηκε πρόβλημα. Δοκιμάστε ξανά.')
    } finally { setLoading(false) }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <Text style={styles.logo}>🔐</Text>
        <Text style={styles.title}>Επαναφορά κωδικού</Text>
        {sent ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>✅ Το email εστάλη! Ελέγξτε το inbox σας.</Text>
            <TouchableOpacity style={styles.btn} onPress={() => router.push('/auth/login')}>
              <Text style={styles.btnText}>Πίσω στη σύνδεση</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.desc}>Εισάγετε το email σας και θα σας στείλουμε οδηγίες επαναφοράς.</Text>
            <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail}
              keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#9CA3AF" />
            <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading}>
              <Text style={styles.btnText}>{loading ? 'Αποστολή...' : 'Αποστολή'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={{ color: '#E65100' }}>← Πίσω</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED' },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logo: { fontSize: 56, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 20 },
  form: { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  desc: { fontSize: 14, color: '#6B7280', marginBottom: 16, lineHeight: 22 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 16, color: '#111827' },
  btn: { backgroundColor: '#E65100', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  successBox: { width: '100%', alignItems: 'center', gap: 20 },
  successText: { fontSize: 16, color: '#111827', textAlign: 'center', lineHeight: 24 },
})
