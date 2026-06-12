import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../../src/store/auth'

export default function RegisterScreen() {
  const router = useRouter()
  const { register, isLoading } = useAuthStore()
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'user' })

  const handleRegister = async () => {
    if (!form.full_name || !form.email || !form.password) {
      Alert.alert('Σφάλμα', 'Συμπληρώστε όλα τα πεδία'); return
    }
    try {
      await register(form)
      router.replace('/(tabs)')
    } catch (err: any) {
      Alert.alert('Σφάλμα', err.response?.data?.message || 'Σφάλμα εγγραφής')
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
        <Text style={styles.logo}>🐾</Text>
        <Text style={styles.title}>Εγγραφή</Text>
        <Text style={styles.subtitle}>Γίνετε μέλος της κοινότητάς μας</Text>

        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Ονοματεπώνυμο" value={form.full_name}
            onChangeText={v => setForm(f => ({...f, full_name: v}))} placeholderTextColor="#9CA3AF" />
          <TextInput style={styles.input} placeholder="Email" value={form.email}
            onChangeText={v => setForm(f => ({...f, email: v}))} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#9CA3AF" />
          <TextInput style={styles.input} placeholder="Κωδικός (τουλάχιστον 8 χαρακτήρες)" value={form.password}
            onChangeText={v => setForm(f => ({...f, password: v}))} secureTextEntry placeholderTextColor="#9CA3AF" />

          <Text style={styles.roleLabel}>Τύπος λογαριασμού</Text>
          <View style={styles.roleRow}>
            {[{ value: 'user', label: '🐾 Ιδιοκτήτης' }, { value: 'service_provider', label: '🩺 Πάροχος' }].map(r => (
              <TouchableOpacity key={r.value} style={[styles.roleBtn, form.role === r.value && styles.roleBtnActive]}
                onPress={() => setForm(f => ({...f, role: r.value}))}>
                <Text style={[styles.roleBtnText, form.role === r.value && styles.roleBtnTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleRegister} disabled={isLoading}>
            <Text style={styles.buttonText}>{isLoading ? 'Εγγραφή...' : 'Δημιουργία λογαριασμού'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Έχετε ήδη λογαριασμό; </Text>
          <TouchableOpacity onPress={() => router.push('/auth/login')}>
            <Text style={styles.footerLink}>Σύνδεση</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED' },
  inner: { alignItems: 'center', justifyContent: 'center', padding: 24, paddingTop: 60 },
  logo: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#E65100', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 28 },
  form: { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 12, color: '#111827' },
  roleLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  roleBtn: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
  roleBtnActive: { borderColor: '#E65100', backgroundColor: '#FFF7ED' },
  roleBtnText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  roleBtnTextActive: { color: '#E65100', fontWeight: '700' },
  button: { backgroundColor: '#E65100', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  footer: { flexDirection: 'row', marginTop: 24 },
  footerText: { color: '#6B7280', fontSize: 14 },
  footerLink: { color: '#E65100', fontWeight: '700', fontSize: 14 },
})
