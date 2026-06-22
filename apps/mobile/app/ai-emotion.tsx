import { useState, useRef } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { api } from '../src/lib/api'

const ORANGE = '#E65100'

export default function AiEmotionScreen() {
  const router = useRouter()
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<any>(null)

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') { Alert.alert('Απαιτείται πρόσβαση στη φωτογραφική'); return }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
    if (!r.canceled && r.assets[0]) setImageUri(r.assets[0].uri)
  }

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') { Alert.alert('Απαιτείται πρόσβαση στην κάμερα'); return }
    const r = await ImagePicker.launchCameraAsync({ quality: 0.8 })
    if (!r.canceled && r.assets[0]) setImageUri(r.assets[0].uri)
  }

  const analyze = async () => {
    if (!imageUri) return
    setAnalyzing(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', { uri: imageUri, type: 'image/jpeg', name: 'photo.jpg' } as any)
      const uploadRes = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      const imageUrl = uploadRes.data?.url || uploadRes.data?.file_url
      const res = await api.post('/ai/emotion', { image_url: imageUrl })
      setResult(res.data)
    } catch (err: any) {
      Alert.alert('Σφάλμα', err?.response?.data?.message || 'Σφάλμα ανάλυσης')
    } finally {
      setAnalyzing(false)
    }
  }

  const emotionEmoji: Record<string, string> = { happy: '😊', sad: '😢', anxious: '😰', angry: '😠', neutral: '😐', excited: '🎉', tired: '😴', playful: '🎾' }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.backText}>‹</Text></TouchableOpacity>
        <Text style={s.title}>AI Emotion</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={s.heroBanner}>
          <Text style={s.heroEmoji}>💜</Text>
          <Text style={s.heroTitle}>Τι νιώθει το κατοικίδιό σας;</Text>
          <Text style={s.heroSub}>Ανεβάστε φωτογραφία και το AI θα αναλύσει τα συναισθήματα</Text>
        </View>

        {imageUri ? (
          <View style={s.imageContainer}>
            <Image source={{ uri: imageUri }} style={s.image} resizeMode="cover" />
            <TouchableOpacity style={s.removeBtn} onPress={() => { setImageUri(null); setResult(null) }}>
              <Text style={s.removeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.uploadArea}>
            <Text style={s.uploadEmoji}>📸</Text>
            <Text style={s.uploadText}>Επιλέξτε ή τραβήξτε φωτογραφία</Text>
            <View style={s.uploadBtns}>
              <TouchableOpacity style={s.uploadBtn} onPress={takePhoto}>
                <Text style={s.uploadBtnText}>📷 Κάμερα</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.uploadBtn} onPress={pickImage}>
                <Text style={s.uploadBtnText}>🖼️ Γκαλερί</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {imageUri && !analyzing && !result && (
          <TouchableOpacity style={s.analyzeBtn} onPress={analyze}>
            <Text style={s.analyzeBtnText}>💜 Ανάλυση Συναισθήματος</Text>
          </TouchableOpacity>
        )}

        {analyzing && (
          <View style={s.analyzing}>
            <ActivityIndicator color="#8B5CF6" size="large" />
            <Text style={s.analyzingText}>Ανάλυση σε εξέλιξη...</Text>
          </View>
        )}

        {result && (
          <View style={s.resultCard}>
            <Text style={s.resultEmoji}>{emotionEmoji[result.primary_emotion] || '🐾'}</Text>
            <Text style={s.resultEmotion}>{result.primary_emotion_el || result.primary_emotion}</Text>
            {result.confidence && <Text style={s.confidence}>Βεβαιότητα: {Math.round(result.confidence * 100)}%</Text>}
            {result.description && <Text style={s.description}>{result.description}</Text>}
            {result.recommendations?.length > 0 && (
              <View style={s.recommendations}>
                <Text style={s.recTitle}>💡 Τι μπορείτε να κάνετε</Text>
                {result.recommendations.map((r: string, i: number) => (
                  <Text key={i} style={s.recItem}>• {r}</Text>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backText: { color: ORANGE, fontSize: 24, width: 32 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  heroBanner: { backgroundColor: '#F5F3FF', borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 16 },
  heroEmoji: { fontSize: 48, marginBottom: 8 },
  heroTitle: { fontSize: 17, fontWeight: '800', color: '#4C1D95', textAlign: 'center', marginBottom: 4 },
  heroSub: { fontSize: 13, color: '#7C3AED', textAlign: 'center' },
  imageContainer: { position: 'relative', marginBottom: 16 },
  image: { width: '100%', height: 240, borderRadius: 16 },
  removeBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 16, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { color: '#fff', fontWeight: '700' },
  uploadArea: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 2, borderColor: '#E9D5FF', borderStyle: 'dashed', marginBottom: 16 },
  uploadEmoji: { fontSize: 40, marginBottom: 8 },
  uploadText: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  uploadBtns: { flexDirection: 'row', gap: 12 },
  uploadBtn: { backgroundColor: '#F5F3FF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  uploadBtnText: { color: '#7C3AED', fontWeight: '600' },
  analyzeBtn: { backgroundColor: '#7C3AED', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 16 },
  analyzeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  analyzing: { alignItems: 'center', padding: 24 },
  analyzingText: { color: '#7C3AED', marginTop: 12, fontSize: 14 },
  resultCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center' },
  resultEmoji: { fontSize: 64, marginBottom: 8 },
  resultEmotion: { fontSize: 24, fontWeight: '900', color: '#4C1D95', marginBottom: 4 },
  confidence: { fontSize: 13, color: '#9CA3AF', marginBottom: 12 },
  description: { fontSize: 14, color: '#374151', textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  recommendations: { width: '100%', backgroundColor: '#F5F3FF', borderRadius: 14, padding: 14 },
  recTitle: { fontSize: 14, fontWeight: '700', color: '#4C1D95', marginBottom: 8 },
  recItem: { fontSize: 13, color: '#374151', marginBottom: 6, lineHeight: 20 },
})