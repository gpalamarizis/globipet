import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as VideoThumbnails from 'expo-video-thumbnails'
import { Camera, Images, Sparkles, X, Video, Play, AlertTriangle } from 'lucide-react-native'
import { api } from '@/lib/api'
import AiGate from '@/components/AiGate'
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
 *
 * ΤΙ ΔΙΟΡΘΩΘΗΚΕ (19/10)
 *   1. Βίντεο: η οθόνη έστελνε `video_url` στο /ai/emotion/video, που δέχεται
 *      μόνο `frames` (base64 καρέ) → πάντα 400. Το κινητό δεν έχει τρόπο να
 *      βγάλει καρέ από βίντεο χωρίς νέα native βιβλιοθήκη (π.χ.
 *      expo-video-thumbnails + νέο build), οπότε η επιλογή περιορίζεται σε
 *      φωτογραφίες μέχρι να προστεθεί. → Προστέθηκε: βλ. «ΒΙΝΤΕΟ» παρακάτω.
 *   2. Το αποτέλεσμα διάβαζε πεδία που το backend δεν επιστρέφει
 *      (primary_emotion, description, recommendations): έβγαινε μόνο 🐾.
 *      Τώρα: emotion, confidence, energy_level, welfare_score,
 *      observations, advice — όπως το web.
 *   3. Το συναίσθημα μεταφράζεται από τον κωδικό· το `emotion_el` (μόνο
 *      ελληνικά) μένει εφεδρεία στα ελληνικά. Το `lang` ζητά από το AI
 *      τα ελεύθερα κείμενα στη γλώσσα του χρήστη.
 *   4. Περνά από την ίδια πύλη συνδρομής με το ai-health (AiGate), όπως
 *      στο web όπου και οι τρεις οθόνες AI είναι μέσα στο AiFeatureGuard.
 *
 * ΒΙΝΤΕΟ (19/10, με expo-video-thumbnails)
 *   Ίδια λογική με το web (AiEmotion.tsx → analyzeUploadedVideo): έως τα
 *   πρώτα 30 δευτ., 1 καρέ ανά δευτερόλεπτο και το πολύ 5, ομοιόμορφα
 *   κατανεμημένα (βίντεο < 1 δευτ. → 1 καρέ). Τα καρέ φεύγουν ως σκέτο
 *   base64 JPEG (χωρίς πρόθεμα data:) στο `frames` του /ai/emotion/video,
 *   όπως τα στέλνει το web. Το base64 βγαίνει με fetch → Blob → FileReader,
 *   χωρίς άλλη βιβλιοθήκη.
 *   Όριο μεγέθους: ο server (Fastify) δέχεται σώμα έως 1MB. Το web στέλνει
 *   καρέ 640×480· εδώ τα καρέ έχουν την ανάλυση του βίντεο, οπότε η ποιότητα
 *   πέφτει σταδιακά και, αν χρειαστεί, λιγοστεύουν τα καρέ ώστε το σύνολο να
 *   χωρά στο όριο.
 */

/** Ίδια όρια με το web: πρώτα 30 δευτ., έως 5 καρέ. */
const VIDEO_MAX_SECONDS = 30
const VIDEO_MAX_FRAMES = 5
/** Όριο σώματος του server 1MB (Fastify) — περιθώριο για το υπόλοιπο JSON. */
const FRAMES_MAX_CHARS = 900_000
const FRAME_QUALITIES = [0.5, 0.3, 0.15]

/** Αρχείο τοπικό → σκέτο base64 (χωρίς «data:...;base64,»). */
async function fileToBase64(uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? '').split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** Χρόνοι καρέ σε ms, όπως το web: (διάρκεια / πλήθος) × i. */
function frameTimes(durationMs: number | null | undefined): { times: number[]; seconds: number } {
  const seconds = Math.min(Math.max((durationMs ?? 0) / 1000, 0), VIDEO_MAX_SECONDS)
  const count = Math.max(1, Math.min(VIDEO_MAX_FRAMES, Math.floor(seconds)))
  return { times: Array.from({ length: count }, (_, i) => Math.round((seconds / count) * i * 1000)), seconds }
}

/** Ομοιόμορφο υποσύνολο k στοιχείων. */
const spread = <T,>(arr: T[], k: number) =>
  Array.from({ length: k }, (_, i) => arr[Math.floor((i * arr.length) / k)])

const total = (frames: string[]) => frames.reduce((n, f) => n + f.length, 0)

/** Εξάγει τα καρέ και τα χωράει στο όριο μεγέθους. null → ούτε ένα καρέ δεν χωρά. */
async function extractFrames(uri: string, times: number[]): Promise<string[] | null> {
  let frames: string[] = []
  for (const quality of FRAME_QUALITIES) {
    frames = []
    for (const time of times) {
      const thumb = await VideoThumbnails.getThumbnailAsync(uri, { time, quality })
      frames.push(await fileToBase64(thumb.uri))
    }
    if (total(frames) <= FRAMES_MAX_CHARS) return frames
  }
  for (let k = frames.length - 1; k >= 1; k--) {
    const subset = spread(frames, k)
    if (total(subset) <= FRAMES_MAX_CHARS) return subset
  }
  return null
}

// Κωδικοί του backend: happy|calm|anxious|fearful|excited|playful|tired|stressed|neutral
const EMOTIONS: Record<string, { emoji: string; labelKey: string }> = {
  happy:    { emoji: '😊', labelKey: 'emo.happy' },
  calm:     { emoji: '😌', labelKey: 'emo.calm' },
  fearful:  { emoji: '😨', labelKey: 'emo.fearful' },
  stressed: { emoji: '😫', labelKey: 'emo.stressed' },
  sad:      { emoji: '😢', labelKey: 'emo.sad' },
  anxious:  { emoji: '😰', labelKey: 'emo.anxious' },
  angry:    { emoji: '😠', labelKey: 'emo.angry' },
  neutral:  { emoji: '😐', labelKey: 'emo.neutral' },
  excited:  { emoji: '🎉', labelKey: 'emo.excited' },
  tired:    { emoji: '😴', labelKey: 'emo.tired' },
  playful:  { emoji: '🎾', labelKey: 'emo.playful' },
}

export default function AiEmotionScreen() {
  const { t, i18n } = useTranslation()
  const [imageUri, setImageUri] = useState<string | null>(null)
  // Βίντεο: imageUri κρατά το καρέ προεπισκόπησης, video το ίδιο το αρχείο.
  const [video, setVideo] = useState<{ uri: string; durationMs: number | null } | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<any>(null)

  const pick = async (fromCamera: boolean) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (!permission.granted) {
      Alert.alert(
        t('ai.need_permission'),
        fromCamera
          ? t('ai.perm_camera')
          : t('ai.perm_photos'))
      return
    }

    const picked = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 })

    if (!picked.canceled && picked.assets?.[0]) {
      setImageUri(picked.assets[0].uri)
      setVideo(null)
      setResult(null)
    }
  }

  const pickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert(t('ai.need_permission'), t('ai.perm_photos'))
      return
    }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] })
    const asset = picked.canceled ? null : picked.assets?.[0]
    if (!asset) return
    try {
      const preview = await VideoThumbnails.getThumbnailAsync(asset.uri, { time: 0, quality: 0.5 })
      setImageUri(preview.uri)
      setVideo({ uri: asset.uri, durationMs: asset.duration ?? null })
      setResult(null)
    } catch {
      Alert.alert(t('common.error'), t('campaignUi.errReadVideo'))
    }
  }

  /** Ανάλυση βίντεο: καρέ → /ai/emotion/video, όπως το web. */
  const analyzeVideo = async (v: { uri: string; durationMs: number | null }) => {
    setAnalyzing(true)
    setResult(null)
    try {
      const { times, seconds } = frameTimes(v.durationMs)
      let frames: string[] | null
      try {
        frames = await extractFrames(v.uri, times)
      } catch {
        Alert.alert(t('common.error'), t('campaignUi.errReadVideo'))
        return
      }
      if (!frames || frames.length === 0) {
        Alert.alert(t('ai.analysis_failed'), t('emo.video_too_large'))
        return
      }
      const res = await api.post('/ai/emotion/video', {
        frames,
        duration_seconds: seconds > 0 ? Math.round(seconds) : undefined,
        lang: i18n.language,
      }, { timeout: 120000 })
      setResult(res.data)
    } catch (err: any) {
      Alert.alert(t('ai.analysis_failed'), err?.response?.data?.message || t('common.try_again_later'))
    } finally {
      setAnalyzing(false)
    }
  }

  /** Ανάλυση από φωτογραφία. */
  const analyze = async () => {
    if (video) return analyzeVideo(video)
    if (!imageUri) return
    setAnalyzing(true)
    setResult(null)
    try {
      const formData = new FormData()
      const filename = imageUri.split('/').pop() || 'photo.jpg'
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: filename,
      } as any)

      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const mediaUrl = uploadRes.data?.url || uploadRes.data?.file_url

      const res = await api.post('/ai/emotion', { image_url: mediaUrl, lang: i18n.language })
      setResult(res.data)
    } catch (err: any) {
      Alert.alert(t('ai.analysis_failed'), err?.response?.data?.message || t('common.try_again_later'))
    } finally {
      setAnalyzing(false)
    }
  }

  const reset = () => { setImageUri(null); setVideo(null); setResult(null) }

  // Βίντεο: overall_emotion / overall_emotion_el / key_observations — ίδια
  // σειρά προτίμησης με το web.
  const emotionCode = result?.overall_emotion || result?.emotion
  const emotionEl = result?.overall_emotion ? result?.overall_emotion_el : result?.emotion_el
  const emotion = emotionCode ? EMOTIONS[emotionCode] : null
  const emotionLabel = emotion
    ? t(emotion.labelKey)
    : (i18n.language === 'el' && emotionEl) || emotionCode || ''
  const obsSource = result?.observations || result?.key_observations
  const observations: string[] = Array.isArray(obsSource) ? obsSource : []

  return (
    <AiGate title={t('emo.emotion')}>
    <Screen title={t('emo.emotion')} subtitle={t('emo.from_photo_video')}>

      {/* ── Εικόνα ─────────────────────────────────────────────── */}
      {imageUri ? (
        <View style={s.frame}>
          <Image source={{ uri: imageUri }} style={s.image} resizeMode="cover" />
          {video ? (
            <View style={s.playBadge} pointerEvents="none">
              <Play size={icon.lg} color={colors.textOnDark} />
            </View>
          ) : null}
          {/* Όσο τρέχει η ανάλυση η επιλογή δεν αφαιρείται: το αποτέλεσμα θα αφορούσε εικόνα που δεν φαίνεται πια. */}
          <TouchableOpacity onPress={reset} style={[s.remove, analyzing && { opacity: 0.4 }]} hitSlop={8}
            disabled={analyzing} accessibilityState={{ disabled: analyzing }}>
            <X size={icon.md} color={colors.textOnDark} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.dropzone}>
          <Text style={s.dropTitle}>{t('emo.subtitle')}</Text>
          <Text style={s.dropText}>{t('emo.face_hint')}</Text>
          <View style={s.pickRow}>
            <TouchableOpacity style={s.pick} onPress={() => pick(true)} activeOpacity={0.7}>
              <Camera size={icon.md} color={colors.brand} />
              <Text style={s.pickLabel}>{t('ai.camera')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.pick} onPress={() => pick(false)} activeOpacity={0.7}>
              <Images size={icon.md} color={colors.brand} />
              <Text style={s.pickLabel}>{t('ai.photos')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.pick} onPress={pickVideo} activeOpacity={0.7}>
              <Video size={icon.md} color={colors.brand} />
              <Text style={s.pickLabel}>{t('emo.video')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.dropText}>{t('emo.video_hint')}</Text>
        </View>
      )}

      {/* ── Ενέργεια ───────────────────────────────────────────── */}
      {imageUri && !result ? (
        <Button
          label={t('emo.title')}
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
            <Text style={s.emotion}>{emotionLabel}</Text>
            {typeof result.confidence === 'number' ? (
              <Text style={s.confidence}>
                {t('emo.confidence', { pct: Math.round(result.confidence * 100) })}
              </Text>
            ) : null}
            {typeof result.energy_level === 'number' ? (
              <Text style={s.confidence}>{t('emo.energy', { n: result.energy_level })}</Text>
            ) : null}
            {typeof result.welfare_score === 'number' ? (
              <Text style={s.confidence}>{t('emo.welfare', { n: result.welfare_score })}</Text>
            ) : null}
          </Card>

          {result.body_language_summary ? (
            <Card>
              <Text style={s.cardTitle}>{t('emo.body_language')}</Text>
              <Text style={s.body}>{result.body_language_summary}</Text>
            </Card>
          ) : null}

          {observations.length > 0 ? (
            <Card>
              <Text style={s.cardTitle}>{t('emo.observations')}</Text>
              {observations.map((o: string, i: number) => (
                <View key={i} style={s.bullet}>
                  <View style={s.dot} />
                  <Text style={s.bulletText}>{o}</Text>
                </View>
              ))}
            </Card>
          ) : null}

          {result.needs_attention ? (
            <Card style={s.attention}>
              <AlertTriangle size={icon.md} color={colors.danger} />
              <View style={{ flex: 1 }}>
                <Text style={s.attentionTitle}>{t('emo.needs_attention')}</Text>
                {result.attention_reason ? <Text style={s.body}>{result.attention_reason}</Text> : null}
              </View>
            </Card>
          ) : null}

          {result.advice ? (
            <Card>
              <Text style={s.cardTitle}>{t('emo.what_to_do')}</Text>
              <Text style={s.body}>{result.advice}</Text>
            </Card>
          ) : null}

          <Button label={video ? t('emo.new_video') : t('ai.new_photo')} variant="secondary" full onPress={reset} />
        </View>
      ) : null}
    </Screen>
    </AiGate>
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
  pickRow: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: space.md, marginTop: space.xl,
  },
  pick: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: space.sm, minHeight: touch.min,
    paddingHorizontal: space.lg,
    backgroundColor: colors.brandLight, borderRadius: radius.md,
  },
  pickLabel: { ...typo.body, fontWeight: weight.semibold, color: colors.brand },

  frame: { position: 'relative' },
  image: { width: '100%', height: 260, borderRadius: radius.xl },
  playBadge: {
    position: 'absolute', top: '50%', left: '50%',
    width: 56, height: 56, marginTop: -28, marginLeft: -28,
    borderRadius: radius.full, backgroundColor: colors.navy, opacity: 0.85,
    alignItems: 'center', justifyContent: 'center',
  },
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
  attention: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, borderWidth: 1, borderColor: colors.danger },
  attentionTitle: { ...typo.emphasis, fontWeight: weight.bold, color: colors.danger, marginBottom: space.xs },

  bullet: { flexDirection: 'row', gap: space.md, marginBottom: space.md },
  dot: {
    width: 6, height: 6, borderRadius: radius.full,
    backgroundColor: colors.brand, marginTop: 8,
  },
  bulletText: { ...typo.body, color: colors.text, flex: 1 },
})
