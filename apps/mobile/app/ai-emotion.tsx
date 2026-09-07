import { useState } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Camera, Images, Sparkles, X } from 'lucide-react-native'
import { api } from '@/lib/api'
import { Screen, Card, Button, Skeleton } from '@/components/ui'
import theme, { colors, space, radius, weight, icon, touch } from '@/theme'

const typo = theme.type

/**
 * Ανάλυση συναισθήματος από φωτογραφία.
 *
 * ΤΙ ΔΙΟΡΘΩΘΗΚΕ (07/09)
 *   `ImagePicker.MediaTypeOptions` αφαιρέθηκε στο expo-image-picker 16.
 *   Είμαστε σε 17. Η παλιά γραμμή έριχνε TypeError μόλις πατούσε κανείς
 *   «Κάμερα» ή «Γκαλερί» — η οθόνη ήταν νεκρή σε παραγωγή. Σωστή μορφή
 *   πλέον: `mediaTypes: ['images']`.
 */

const EMOTIONS: Record<string, { emoji: string; label: string }> = {
  happy:    { emoji: '😊', label: 'Χαρούμενο' },
  sad:      { emoji: '😢', label: 'Λυπημένο' },
  anxious:  { emoji: '😰', label: 'Αγχωμένο' },
  angry:    { emoji: '😠', label: 'Θυμωμένο' },
  neutral:  { emoji: '😐', label: 'Ουδέτερο' },
  excited:  { emoji: '🎉', label: 'Ενθουσιασμένο' },
  tired:    { emoji: '😴', label: 'Κουρασμένο' },
  playful:  { emoji: '🎾', label: 'Παιχνιδιάρικο' },
}

export default function AiEmotionScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<any>(null)

  const pick = async (fromCamera: boolean) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (!permission.granted) {
      Alert.alert(
        'Χρειάζεται άδεια',
        fromCamera
          ? 'Δώσε πρόσβαση στην κάμερα για να τραβήξεις φωτογραφία.'
          : 'Δώσε πρόσβαση στις φωτογραφίες για να επιλέξεις εικόνα.')
      return
    }

    const picked = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 })

    if (!picked.canceled && picked.assets?.[0]) {
      setImageUri(picked.assets[0].uri)
      setResult(null)
    }
  }

  const analyze = async () => {
    if (!imageUri) return
    setAnalyzing(true)
    setResult(null)
    try {
      const formData = new FormData()
      const filename = imageUri.split('/').pop() || 'photo.jpg'
      formData.append('file', { uri: imageUri, type: 'image/jpeg', name: filename } as any)

      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const imageUrl = uploadRes.data?.url || uploadRes.data?.file_url

      const res = await api.post('/ai/emotion', { image_url: imageUrl })
      setResult(res.data)
    } catch (err: any) {
      Alert.alert('Δεν έγινε η ανάλυση', err?.response?.data?.message || 'Δοκίμασε ξανά σε λίγο.')
    } finally {
      setAnalyzing(false)
    }
  }

  const reset = () => { setImageUri(null); setResult(null) }

  const emotion = result?.primary_emotion ? EMOTIONS[result.primary_emotion] : null

  return (
    <Screen title="Συναίσθημα" subtitle="Ανάλυση από φωτογραφία">

      {/* ── Εικόνα ─────────────────────────────────────────────── */}
      {imageUri ? (
        <View style={s.frame}>
          <Image source={{ uri: imageUri }} style={s.image} resizeMode="cover" />
          <TouchableOpacity onPress={reset} style={s.remove} hitSlop={8}>
            <X size={icon.md} color={colors.textOnDark} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.dropzone}>
          <Text style={s.dropTitle}>Τι νιώθει το κατοικίδιό σου;</Text>
          <Text style={s.dropText}>
            Μια καθαρή φωτογραφία του προσώπου δίνει την πιο αξιόπιστη ανάλυση.
          </Text>
          <View style={s.pickRow}>
            <TouchableOpacity style={s.pick} onPress={() => pick(true)} activeOpacity={0.7}>
              <Camera size={icon.md} color={colors.brand} />
              <Text style={s.pickLabel}>Κάμερα</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.pick} onPress={() => pick(false)} activeOpacity={0.7}>
              <Images size={icon.md} color={colors.brand} />
              <Text style={s.pickLabel}>Φωτογραφίες</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Ενέργεια ───────────────────────────────────────────── */}
      {imageUri && !result ? (
        <Button
          label="Ανάλυση συναισθήματος"
          full
          loading={analyzing}
          icon={analyzing ? undefined : <Sparkles size={icon.sm} color={colors.textOnDark} />}
          onPress={analyze}
          style={{ marginTop: space.lg }} />
      ) : null}

      {/* ── Σκελετός όσο τρέχει η ανάλυση ──────────────────────── */}
      {analyzing ? (
        <View style={{ gap: space.md, marginTop: space.xl }}>
          <Skeleton height={72} round={radius.lg} />
          <Skeleton height={140} round={radius.lg} />
        </View>
      ) : null}

      {/* ── Αποτέλεσμα ─────────────────────────────────────────── */}
      {result && !analyzing ? (
        <View style={{ gap: space.md, marginTop: space.xl }}>
          <Card style={{ alignItems: 'center' }}>
            <Text style={s.emoji}>{emotion?.emoji || '🐾'}</Text>
            <Text style={s.emotion}>
              {result.primary_emotion_el || emotion?.label || result.primary_emotion}
            </Text>
            {typeof result.confidence === 'number' ? (
              <Text style={s.confidence}>
                Βεβαιότητα {Math.round(result.confidence * 100)} τοις εκατό
              </Text>
            ) : null}
          </Card>

          {result.description ? (
            <Card>
              <Text style={s.body}>{result.description}</Text>
            </Card>
          ) : null}

          {result.recommendations?.length > 0 ? (
            <Card>
              <Text style={s.cardTitle}>Τι μπορείς να κάνεις</Text>
              {result.recommendations.map((r: string, i: number) => (
                <View key={i} style={s.bullet}>
                  <View style={s.dot} />
                  <Text style={s.bulletText}>{r}</Text>
                </View>
              ))}
            </Card>
          ) : null}

          <Button label="Νέα φωτογραφία" variant="secondary" full onPress={reset} />
        </View>
      ) : null}
    </Screen>
  )
}

const s = StyleSheet.create({
  dropzone: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
    padding: space.xxl, alignItems: 'center',
  },
  dropTitle: {
    ...typo.section, fontWeight: weight.bold,
    color: colors.navy, textAlign: 'center',
  },
  dropText: {
    ...typo.body, color: colors.textMuted,
    textAlign: 'center', marginTop: space.sm,
  },
  pickRow: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
  pick: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: space.sm, minHeight: touch.min,
    paddingHorizontal: space.lg,
    backgroundColor: colors.brandLight, borderRadius: radius.md,
  },
  pickLabel: { ...typo.body, fontWeight: weight.semibold, color: colors.brand },

  frame: { position: 'relative' },
  image: { width: '100%', height: 260, borderRadius: radius.xl },
  remove: {
    position: 'absolute', top: space.md, right: space.md,
    width: touch.min, height: touch.min, borderRadius: radius.full,
    backgroundColor: colors.navy,
    alignItems: 'center', justifyContent: 'center',
  },

  emoji: { fontSize: 64, lineHeight: 76 },
  emotion: {
    ...typo.title, fontWeight: weight.black,
    color: colors.navy, textAlign: 'center', marginTop: space.xs,
  },
  confidence: { ...typo.caption, color: colors.textMuted, marginTop: space.xs },

  cardTitle: {
    ...typo.emphasis, fontWeight: weight.bold,
    color: colors.text, marginBottom: space.md,
  },
  body: { ...typo.body, color: colors.text },

  bullet: { flexDirection: 'row', gap: space.md, marginBottom: space.md },
  dot: {
    width: 6, height: 6, borderRadius: radius.full,
    backgroundColor: colors.brand, marginTop: 8,
  },
  bulletText: { ...typo.body, color: colors.text, flex: 1 },
})
