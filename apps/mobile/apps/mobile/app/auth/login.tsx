import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../../src/store/auth'

export default function LoginScreen() {
  const router = useRouter()
  const { login, isLoading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Σφάλμα', 'Συμπληρώστε email και κωδικό'); return }
    try {
      await login(email, password)
      router.replace('/(tabs)')
    } catch (err: any) {
      Alert.alert('Σφάλμα σύνδεσης', err.response?.data?.message || 'Λανθασμένα στοιχεία')
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <Text style={styles.logo}>🐾</Text>
        <Text style={styles.title}>GlobiPet</Text>
        <Text style={styles.subtitle}>Σύνδεση στον λογαριασμό σας</Text>

        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#9CA3AF" />
          <TextInput style={styles.input} placeholder="Κωδικός" value={password} onChangeText={setPassword}
            secureTextEntry placeholderTextColor="#9CA3AF" />
          
          <TouchableOpacity onPress={() => router.push('/auth/forgot-password')}>
            <Text style={styles.forgotLink}>Ξέχασα τον κωδικό</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin} disabled={isLoading}>
            <Text style={styles.buttonText}>{isLoading ? 'Σύνδεση...' : 'Σύνδεση'}</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ή</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.socialButton}>
            <Text style={styles.socialButtonText}>🔵  Σύνδεση με Google</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Δεν έχετε λογαριασμό; </Text>
          <TouchableOpacity onPress={() => router.push('/auth/register')}>
            <Text style={styles.footerLink}>Εγγραφή</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED' },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logo: { fontSize: 56, marginBottom: 8 },
  title: { fontSize: 32, fontWeight: '800', color: '#E65100', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#6B7280', marginBottom: 32 },
  form: { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 12, color: '#111827' },
  forgotLink: { textAlign: 'right', color: '#E65100', fontSize: 13, marginBottom: 16 },
  button: { backgroundColor: '#E65100', borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 12, color: '#9CA3AF', fontSize: 13 },
  socialButton: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, alignItems: 'center' },
  socialButtonText: { color: '#374151', fontWeight: '500', fontSize: 14 },
  footer: { flexDirection: 'row', marginTop: 24 },
  footerText: { color: '#6B7280', fontSize: 14 },
  footerLink: { color: '#E65100', fontWeight: '700', fontSize: 14 },
})
