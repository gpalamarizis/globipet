import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Brain, Camera, Image as ImageIcon, AlertTriangle, CheckCircle2, Clock } from 'lucide-react-native'
import { api } from '../src/lib/api'
import { useAuthStore } from '../src/store/auth'

type AnalysisType = 'skin' | 'eye'

export default function AiHealthScreen() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()

  const [imageUri, setImageUri] = useState<string | null>(null)
  const [analysisType, setAnalysisType] = useState<AnalysisType>('skin')
  const [result, setResult] = useState<any>(null)

  const { data: status } = useQuery({
    queryKey: ['ai-subscription-status'],
    queryFn: () => api.get('/ai-subscriptions/my-status').then(r => r.data?.data),
    enabled: isAuthenticated,
  })

  const startTrial = useMutation({
    mutationFn: () => api.post('/ai-subscriptions/start-trial'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-subscription-status'] }),
  })

  const canUseAi = status?.ai_subscription_status === 'trial' || status?.ai_subscription_status === 'active'

  const pickImage = async (fromCamera: boolean) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (!permission.granted) {
      Alert.alert('Άδεια απαιτείται', 'Χρειαζόμαστε πρόσβαση για να συνεχίσουμε.')
      return
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 })

    if (!result.canceled && result.assets?.[0]) {
      setImageUri(result.assets[0].uri)
      setResult(null)
    }
  }

  const analyze = useMutation({
    mutationFn: async () => {
      if (!imageUri) throw new Error('Δεν επιλέχθηκε εικόνα')

      // 1. Upload image to get a public URL
      const formData = new FormData()
      const filename = imageUri.split('/').pop() || 'photo.jpg'
      formData.append('file', { uri: imageUri, name: filename, type: 'image/jpeg' } as any)
      formData.append('folder', 'ai-health')

      const uploadRes = await api.post('/upload?folder=ai-health', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const imageUrl = uploadRes.data?.url

      // 2. Call AI analysis with the uploaded image URL
      const analysisRes = await api.post('/ai/pet-health', {
        image_url: imageUrl,
        analysis_type: analysisType,
      })
      return analysisRes.data
    },
    onSuccess: (data) => setResult(data),
    onError: (err: any) => Alert.alert('Σφάλμα', err?.response?.data?.message || 'Η ανάλυση απέτυχε. Δοκίμασε ξανά.'),
  })

  const severityColor = (sev: string) =>
    sev === 'high' ? '#DC2626' : sev === 'medium' ? '#D97706' : '#16A34A'

  // Gate: not authenticated
  if (!isAuthenticated) {
    return (
      <View style={s.center}>
        <Brain size={40} color="#E65100" />
        <Text style={s.gateTitle}>Σύνδεση απαιτείται</Text>
        <TouchableOpacity style={s.cta} onPress={() => router.push('/auth/login')}>
          <Text style={s.ctaText}>Σύνδεση</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // Gate: no active trial/subscription
  if (!canUseAi) {
    return (
      <View style={s.center}>
        <Brain size={40} color="#E65100" />
        <Text style={s.gateTitle}>
          {status?.ai_subscription_status === 'expired' ? 'Το trial σου έληξε' : 'Ξεκίνα το δωρεάν trial'}
        </Text>
        <Text style={s.gateSub}>
          {status?.ai_subscription_status === 'expired'
            ? 'Συνδρομήσε για να συνεχίσεις να χρησιμοποιείς το AI Health Check.'
            : '15 μέρες δωρεάν πρόσβαση σε όλα τα εργαλεία AI υγείας.'}
        </Text>
        {status?.ai_subscription_status === 'expired' ? (
          <TouchableOpacity style={s.cta} onPress={() => router.push('/medical-center')}>
            <Text style={s.ctaText}>Δες πλάνα συνδρομής</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.cta} onPress={() => startTrial.mutate()} disabled={startTrial.isPending}>
            {startTrial.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>Δοκίμασε δωρεάν</Text>}
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16, paddingTop: 60 }}>
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
        <Text style={s.backText}>← Πίσω</Text>
      </TouchableOpacity>

      <Text style={s.title}>AI Health Check</Text>
      <Text style={s.sub}>Ανέβασε φωτογραφία δέρματος ή ματιού για άμεση ανάλυση</Text>

      {/* Analysis type selector */}
      <View style={s.typeRow}>
        <TouchableOpacity
          style={[s.typeBtn, analysisType === 'skin' && s.typeBtnActive]}
          onPress={() => setAnalysisType('skin')}>
          <Text style={[s.typeBtnText, analysisType === 'skin' && s.typeBtnTextActive]}>🩹 Δέρμα</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.typeBtn, analysisType === 'eye' && s.typeBtnActive]}
          onPress={() => setAnalysisType('eye')}>
          <Text style={[s.typeBtnText, analysisType === 'eye' && s.typeBtnTextActive]}>👁️ Μάτι</Text>
        </TouchableOpacity>
      </View>

      {/* Image preview / picker */}
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={s.preview} />
      ) : (
        <View style={s.placeholder}>
          <ImageIcon size={32} color="#D1D5DB" />
          <Text style={s.placeholderText}>Δεν έχει επιλεγεί φωτογραφία</Text>
        </View>
      )}

      <View style={s.pickRow}>
        <TouchableOpacity style={s.pickBtn} onPress={() => pickImage(true)}>
          <Camera size={16} color="#E65100" />
          <Text style={s.pickBtnText}>Κάμερα</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.pickBtn} onPress={() => pickImage(false)}>
          <ImageIcon size={16} color="#E65100" />
          <Text style={s.pickBtnText}>Βιβλιοθήκη</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[s.analyzeBtn, (!imageUri || analyze.isPending) && { opacity: 0.5 }]}
        onPress={() => analyze.mutate()}
        disabled={!imageUri || analyze.isPending}
      >
        {analyze.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.analyzeBtnText}>Ανάλυση με AI</Text>}
      </TouchableOpacity>

      {/* Results */}
      {result && (
        <View style={s.resultCard}>
          <View style={s.resultHeader}>
            <View style={[s.severityDot, { backgroundColor: severityColor(result.severity) }]} />
            <Text style={s.resultSeverity}>Σοβαρότητα: {result.severity === 'high' ? 'Υψηλή' : result.severity === 'medium' ? 'Μέτρια' : 'Χαμηλή'}</Text>
          </View>

          {result.findings?.length > 0 && (
            <View style={s.resultSection}>
              <Text style={s.resultLabel}>Ευρήματα</Text>
              {result.findings.map((f: string, i: number) => <Text key={i} style={s.resultItem}>• {f}</Text>)}
            </View>
          )}

          {result.conditions?.length > 0 && (
            <View style={s.resultSection}>
              <Text style={s.resultLabel}>Πιθανές καταστάσεις</Text>
              {result.conditions.map((c: string, i: number) => <Text key={i} style={s.resultItem}>• {c}</Text>)}
            </View>
          )}

          {result.comparison_sources?.length > 0 && (
            <View style={s.resultSection}>
              <Text style={s.resultLabel}>Πηγές σύγκρισης</Text>
              {result.comparison_sources.map((src: string, i: number) => <Text key={i} style={s.resultItemMuted}>{src}</Text>)}
            </View>
          )}

          <View style={s.resultSection}>
            <Text style={s.resultLabel}>Σύσταση</Text>
            <Text style={s.resultText}>{result.recommendation}</Text>
          </View>

          {result.urgency && (
            <View style={s.urgencyBox}>
              <AlertTriangle size={14} color="#D97706" />
              <Text style={s.urgencyText}>{result.urgency}</Text>
            </View>
          )}

          <Text style={s.disclaimer}>{result.disclaimer}</Text>
        </View>
      )}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F9FAFB' },
  backText: { color: '#E65100', fontSize: 14, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 6 },
  sub: { fontSize: 13, color: '#6B7280', marginBottom: 18 },
  gateTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 14, marginBottom: 6, textAlign: 'center' },
  gateSub: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 18, lineHeight: 19 },
  cta: { backgroundColor: '#E65100', borderRadius: 12, paddingVertical: 13, paddingHorizontal: 24 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#E65100', borderColor: '#E65100' },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  typeBtnTextActive: { color: '#fff' },
  preview: { width: '100%', height: 220, borderRadius: 16, marginBottom: 14 },
  placeholder: { width: '100%', height: 180, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 14, gap: 8 },
  placeholderText: { fontSize: 12, color: '#9CA3AF' },
  pickRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  pickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 12, backgroundColor: '#FFF3E0' },
  pickBtnText: { fontSize: 13, fontWeight: '600', color: '#E65100' },
  analyzeBtn: { backgroundColor: '#111827', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 8 },
  analyzeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  resultCard: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginTop: 18, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  severityDot: { width: 10, height: 10, borderRadius: 5 },
  resultSeverity: { fontSize: 14, fontWeight: '700', color: '#111827' },
  resultSection: { marginBottom: 14 },
  resultLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  resultItem: { fontSize: 13, color: '#374151', marginBottom: 3, lineHeight: 18 },
  resultItemMuted: { fontSize: 11, color: '#9CA3AF', marginBottom: 3, lineHeight: 16 },
  resultText: { fontSize: 13, color: '#374151', lineHeight: 19 },
  urgencyBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10, marginBottom: 12 },
  urgencyText: { fontSize: 12, color: '#92400E', flex: 1, lineHeight: 17 },
  disclaimer: { fontSize: 11, color: '#9CA3AF', fontStyle: 'italic', lineHeight: 15 },
})
