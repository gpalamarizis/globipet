import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { api } from '../../src/lib/api'
import { useAuthStore } from '../../src/store/auth'

const STEPS = [
  { key: 'personal', title: 'Προσωπικά Στοιχεία', emoji: '👤' },
  { key: 'business', title: 'Επαγγελματικά Στοιχεία', emoji: '🏢' },
  { key: 'documents', title: 'Έγγραφα', emoji: '📄' },
]

export default function VerificationScreen() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    city: user?.city || '',
    business_name: '',
    tax_number: '',
    years_experience: '',
    specializations: '',
    bio: '',
    website: '',
  })

  const submitMutation = useMutation({
    mutationFn: () => api.post('/provider/verification-request', form),
    onSuccess: () => {
      Alert.alert('Επιτυχία!', 'Η αίτηση επαλήθευσης υποβλήθηκε. Θα επικοινωνήσουμε μαζί σας σύντομα.', [
        { text: 'OK', onPress: () => router.back() }
      ])
    },
    onError: (e: any) => Alert.alert('Σφάλμα', e.response?.data?.message || 'Κάτι πήγε στραβά'),
  })

  if (!isAuthenticated) return (
    <View style={styles.centered}>
      <Text style={styles.lockEmoji}>🔒</Text>
      <Text style={styles.guestTitle}>Συνδεθείτε για να συνεχίσετε</Text>
      <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/auth/login')}>
        <Text style={styles.loginBtnText}>Σύνδεση</Text>
      </TouchableOpacity>
    </View>
  )

  if (user?.is_verified) return (
    <View style={styles.centered}>
      <Text style={{ fontSize: 64, marginBottom: 16 }}>✅</Text>
      <Text style={styles.verifiedTitle}>Είστε ήδη επαληθευμένος!</Text>
      <Text style={styles.verifiedSubtitle}>Ο λογαριασμός σας έχει επαληθευτεί και είστε ενεργός πάροχος υπηρεσιών.</Text>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Πίσω</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Επαλήθευση Παρόχου</Text>
        <Text style={styles.subtitle}>Γίνετε επαληθευμένος πάροχος υπηρεσιών</Text>
      </View>

      {/* Steps */}
      <View style={styles.stepsRow}>
        {STEPS.map((s, i) => (
          <View key={s.key} style={styles.stepItem}>
            <View style={[styles.stepCircle, i <= step && styles.stepCircleActive, i < step && styles.stepCircleDone]}>
              <Text style={styles.stepEmoji}>{i < step ? '✓' : s.emoji}</Text>
            </View>
            <Text style={[styles.stepLabel, i === step && styles.stepLabelActive]}>{s.title}</Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        {step === 0 && (
          <>
            <Text style={styles.sectionTitle}>Προσωπικά Στοιχεία</Text>
            {[['full_name', 'Ονοματεπώνυμο *', false], ['phone', 'Τηλέφωνο *', false], ['city', 'Πόλη *', false]].map(([key, label, secure]) => (
              <View key={key as string}>
                <Text style={styles.fieldLabel}>{label as string}</Text>
                <TextInput style={styles.input} value={(form as any)[key as string]} onChangeText={v => setForm({...form, [key as string]: v})}
                  secureTextEntry={secure as boolean} placeholder={label as string}/>
              </View>
            ))}
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.sectionTitle}>Επαγγελματικά Στοιχεία</Text>
            {[['business_name', 'Επωνυμία Επιχείρησης'], ['tax_number', 'ΑΦΜ'], ['years_experience', 'Χρόνια Εμπειρίας'], ['website', 'Website']].map(([key, label]) => (
              <View key={key}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput style={styles.input} value={(form as any)[key]} onChangeText={v => setForm({...form, [key]: v})} placeholder={label}
                  keyboardType={key === 'years_experience' ? 'number-pad' : 'default'}/>
              </View>
            ))}
            <Text style={styles.fieldLabel}>Ειδικότητες</Text>
            <TextInput style={styles.input} value={form.specializations} onChangeText={v => setForm({...form, specializations: v})}
              placeholder="π.χ. grooming, εκπαίδευση, κτηνίατρος"/>
            <Text style={styles.fieldLabel}>Βιογραφικό</Text>
            <TextInput style={[styles.input, styles.textarea]} value={form.bio} onChangeText={v => setForm({...form, bio: v})}
              placeholder="Περιγράψτε τις υπηρεσίες και την εμπειρία σας..." multiline numberOfLines={4}/>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.sectionTitle}>Απαιτούμενα Έγγραφα</Text>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>📋 Μετά την υποβολή, η ομάδα μας θα επικοινωνήσει μαζί σας για την αποστολή των παρακάτω εγγράφων:</Text>
            </View>
            {['Ταυτότητα ή Διαβατήριο', 'Βεβαίωση επαγγελματικής δραστηριότητας', 'Τυχόν επαγγελματικές άδειες', 'Φωτογραφία προφίλ'].map((doc, i) => (
              <View key={i} style={styles.docItem}>
                <Text style={styles.docEmoji}>📄</Text>
                <Text style={styles.docLabel}>{doc}</Text>
              </View>
            ))}
            <View style={styles.agreementBox}>
              <Text style={styles.agreementText}>
                Με την υποβολή αυτής της αίτησης, αποδέχεστε τους Όρους Χρήσης και την Πολιτική Απορρήτου του GlobiPet.
              </Text>
            </View>
          </>
        )}

        <View style={{ height: 40 }}/>
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity style={styles.prevBtn} onPress={() => setStep(step - 1)}>
            <Text style={styles.prevBtnText}>Πίσω</Text>
          </TouchableOpacity>
        )}
        {step < STEPS.length - 1 ? (
          <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(step + 1)}>
            <Text style={styles.nextBtnText}>Επόμενο →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.nextBtn, submitMutation.isPending && styles.btnDisabled]}
            onPress={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
            {submitMutation.isPending
              ? <ActivityIndicator color="#fff"/>
              : <Text style={styles.nextBtnText}>Υποβολή Αίτησης ✓</Text>
            }
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { marginBottom: 8 },
  backText: { fontSize: 14, color: '#E65100', fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#6B7280' },
  stepsRow: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  stepItem: { flex: 1, alignItems: 'center' },
  stepCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  stepCircleActive: { backgroundColor: '#FFF7ED', borderWidth: 2, borderColor: '#E65100' },
  stepCircleDone: { backgroundColor: '#E65100' },
  stepEmoji: { fontSize: 18 },
  stepLabel: { fontSize: 10, color: '#9CA3AF', textAlign: 'center' },
  stepLabelActive: { color: '#E65100', fontWeight: '700' },
  form: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 14, color: '#111827' },
  textarea: { height: 100, textAlignVertical: 'top' },
  infoBox: { backgroundColor: '#EFF6FF', borderRadius: 12, padding: 16, marginBottom: 16 },
  infoText: { fontSize: 13, color: '#1E40AF', lineHeight: 20 },
  docItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, gap: 12 },
  docEmoji: { fontSize: 20 },
  docLabel: { fontSize: 14, color: '#374151', fontWeight: '500' },
  agreementBox: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginTop: 16 },
  agreementText: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
  footer: { flexDirection: 'row', gap: 10, padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  prevBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
  prevBtnText: { color: '#6B7280', fontWeight: '600', fontSize: 15 },
  nextBtn: { flex: 2, padding: 14, borderRadius: 12, backgroundColor: '#E65100', alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  lockEmoji: { fontSize: 48, marginBottom: 16 },
  guestTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 24, textAlign: 'center' },
  loginBtn: { backgroundColor: '#E65100', borderRadius: 12, padding: 16, width: '100%', alignItems: 'center' },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  verifiedTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 12, textAlign: 'center' },
  verifiedSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
})
