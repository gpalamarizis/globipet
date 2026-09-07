import { useState } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Brain, Camera, Images, AlertTriangle, X } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, Card, Button, Badge, Skeleton } from '@/components/ui'
import theme, { colors, space, radius, weight, icon, touch } from '@/theme'

const typo = theme.type

/**
 * Ανάλυση δέρματος και ματιού με AI.
 *
 * ΤΙ ΔΙΟΡΘΩΘΗΚΕ (07/09)
 *   1. `ImagePicker.MediaTypeOptions` — αφαιρέθηκε στο expo-image-picker
 *      16, είμαστε σε 17. Έριχνε TypeError στο πάτημα της κάμερας.
 *   2. Η πύλη συνδρομής εμφανιζόταν για ένα κλάσμα δευτερολέπτου σε κάθε
 *      άνοιγμα, γιατί το `canUseAi` είναι false όσο φορτώνει το status.
 *      Ένας συνδρομητής έβλεπε «Ξεκίνα το δωρεάν trial» και μετά την
 *      οθόνη. Τώρα δείχνει σκελετό μέχρι να απαντήσει το backend.
 *   3. `router.push('/medical-center')` — δεν υπάρχει τέτοιο route στο
 *      mobile. Το κουμπί έριχνε σφάλμα πλοήγησης σε όποιον έληγε το
 *      trial. Προσωρινά ανοίγει το web.
 *
 * ΕΠΙΒΕΒΑΙΩΣΕ: το URL παρακάτω. Αν το web route λέγεται αλλιώς, άλλαξέ το
 * εδώ — ή, καλύτερα, φτιάξε `app/medical-center.tsx` και γύρνα σε push.
 */
const MEDICAL_CENTER_URL = 'https://globipet.com/medical-center'

type AnalysisType = 'skin' | 'eye'

const SEVERITY = {
  high:   { label: 'Υψηλή',  tone: 'danger'  as const },
  medium: { label: 'Μέτρια', tone: 'warning' as const },
  low:    { label: 'Χαμηλή', tone: 'success' as const },
}

export default function AiHealthScreen() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()

  const [imageUri, setImageUri] = useState<string | null>(null)
  const [analysisType, setAnalysisType] = useState<AnalysisType>('skin')
  const [result, setResult] = useState<any>(null)

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['ai-subscription-status'],
    queryFn: () => api.get('/ai-subscriptions/my-status').then(r => r.data?.data),
    enabled: isAuthenticated,
  })

  const startTrial = useMutation({
    mutationFn: () => api.post('/ai-subscriptions/start-trial'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-subscription-status'] }),
    onError: (e: any) =>
      Alert.alert('Δεν ξεκίνησε η δοκιμή', e?.response?.data?.message || 'Δοκίμασε ξανά σε λίγο.'),
  })

  const canUseAi =
    status?.ai_subscription_status === 'trial' || status?.ai_subscription_status === 'active'

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
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 })

    if (!picked.canceled && picked.assets?.[0]) {
      setImageUri(picked.assets[0].uri)
      setResult(null)
    }
  }

  const analyze = useMutation({
    mutationFn: async () => {
      if (!imageUri) throw new Error('Δεν επιλέχθηκε φωτογραφία')

      const formData = new FormData()
      const filename = imageUri.split('/').pop() || 'photo.jpg'
      formData.append('file', { uri: imageUri, name: filename, type: 'image/jpeg' } as any)
      formData.append('folder', 'ai-health')

      const uploadRes = await api.post('/upload?folder=ai-health', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const analysisRes = await api.post('/ai/pet-health', {
        image_url: uploadRes.data?.url,
        analysis_type: analysisType,
      })
      return analysisRes.data
    },
    onSuccess: setResult,
    onError: (err: any) =>
      Alert.alert('Δεν έγινε η ανάλυση', err?.response?.data?.message || 'Δοκίμασε ξανά σε λίγο.'),
  })

  // ── Πύλη: χωρίς σύνδεση ──────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <Screen title="Έλεγχος υγείας">
        <View style={s.gate}>
          <View style={s.gateIcon}><Brain size={icon.xl} color={colors.brand} /></View>
          <Text style={s.gateTitle}>Χρειάζεται σύνδεση</Text>
          <Text style={s.gateText}>
            Ο έλεγχος υγείας συνδέεται με τα κατοικίδιά σου, οπότε χρειάζεται λογαριασμό.
          </Text>
          <Button label="Σύνδεση" full onPress={() => router.push('/auth/login')}
            style={{ marginTop: space.xl }} />
        </View>
      </Screen>
    )
  }

  // ── Όσο φορτώνει η κατάσταση συνδρομής ───────────────────────────
  if (statusLoading) {
    return (
      <Screen title="Έλεγχος υγείας">
        <View style={{ gap: space.md }}>
          <Skeleton height={56} round={radius.md} />
          <Skeleton height={200} round={radius.xl} />
          <Skeleton height={touch.min} round={radius.md} />
        </View>
      </Screen>
    )
  }

  // ── Πύλη: χωρίς ενεργή δοκιμή ή συνδρομή ─────────────────────────
  if (!canUseAi) {
    const expired = status?.ai_subscription_status === 'expired'
    return (
      <Screen title="Έλεγχος υγείας">
        <View style={s.gate}>
          <View style={s.gateIcon}><Brain size={icon.xl} color={colors.brand} /></View>
          <Text style={s.gateTitle}>
            {expired ? 'Η δοκιμή σου έληξε' : 'Δοκίμασέ το δωρεάν'}
          </Text>
          <Text style={s.gateText}>
            {expired
              ? 'Με συνδρομή συνεχίζεις να χρησιμοποιείς όλα τα εργαλεία υγείας με AI.'
              : 'Τριάντα ημέρες πρόσβαση σε όλα τα εργαλεία υγείας με AI, χωρίς χρέωση.'}
          </Text>
          {expired ? (
            <Button label="Δες τα πλάνα συνδρομής" full
              onPress={() => Linking.openURL(MEDICAL_CENTER_URL)}
              style={{ marginTop: space.xl }} />
          ) : (
            <Button label="Ξεκίνα τη δοκιμή" full
              loading={startTrial.isPending}
              onPress={() => startTrial.mutate()}
              style={{ marginTop: space.xl }} />
          )}
        </View>
      </Screen>
    )
  }

  const severity = result?.severity ? SEVERITY[result.severity as keyof typeof SEVERITY] : null

  return (
    <Screen title="Έλεγχος υγείας" subtitle="Ανάλυση φωτογραφίας με AI">

      {/* ── Τι εξετάζουμε ──────────────────────────────────────── */}
      <View style={s.typeRow}>
        {([['skin', 'Δέρμα'], ['eye', 'Μάτι']] as const).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            onPress={() => setAnalysisType(key)}
            activeOpacity={0.7}
            style={[s.type, analysisType === key && s.typeActive]}>
            <Text style={[s.typeLabel, analysisType === key && s.typeLabelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Εικόνα ─────────────────────────────────────────────── */}
      {imageUri ? (
        <View style={s.frame}>
          <Image source={{ uri: imageUri }} style={s.image} resizeMode="cover" />
          <TouchableOpacity onPress={() => { setImageUri(null); setResult(null) }}
            style={s.remove} hitSlop={8}>
            <X size={icon.md} color={colors.textOnDark} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.dropzone}>
          <Text style={s.dropTitle}>
            {analysisType === 'skin'
              ? 'Φωτογράφισε το σημείο του δέρματος'
              : 'Φωτογράφισε το μάτι από κοντά'}
          </Text>
          <Text style={s.dropText}>Καλός φωτισμός και σταθερό χέρι βοηθούν την ανάλυση.</Text>
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

      {imageUri && !result ? (
        <Button label="Ανάλυση με AI" full
          loading={analyze.isPending}
          onPress={() => analyze.mutate()}
          style={{ marginTop: space.lg }} />
      ) : null}

      {analyze.isPending ? (
        <View style={{ gap: space.md, marginTop: space.xl }}>
          <Skeleton height={64} round={radius.lg} />
          <Skeleton height={120} round={radius.lg} />
          <Skeleton height={96} round={radius.lg} />
        </View>
      ) : null}

      {/* ── Αποτέλεσμα ─────────────────────────────────────────── */}
      {result && !analyze.isPending ? (
        <View style={{ gap: space.md, marginTop: space.xl }}>

          <Card>
            <Text style={s.label}>Σοβαρότητα</Text>
            <Badge label={severity?.label || 'Άγνωστη'} tone={severity?.tone || 'neutral'}
              style={{ marginTop: space.xs }} />
          </Card>

          {result.findings?.length > 0 ? (
            <Card>
              <Text style={s.label}>Ευρήματα</Text>
              {result.findings.map((f: string, i: number) => (
                <View key={i} style={s.bullet}>
                  <View style={s.dot} />
                  <Text style={s.bulletText}>{f}</Text>
                </View>
              ))}
            </Card>
          ) : null}

          {result.conditions?.length > 0 ? (
            <Card>
              <Text style={s.label}>Πιθανές καταστάσεις</Text>
              {result.conditions.map((c: string, i: number) => (
                <View key={i} style={s.bullet}>
                  <View style={s.dot} />
                  <Text style={s.bulletText}>{c}</Text>
                </View>
              ))}
            </Card>
          ) : null}

          {result.recommendation ? (
            <Card>
              <Text style={s.label}>Σύσταση</Text>
              <Text style={s.body}>{result.recommendation}</Text>
            </Card>
          ) : null}

          {result.urgency ? (
            <View style={s.urgency}>
              <AlertTriangle size={icon.md} color={colors.warning} />
              <Text style={s.urgencyText}>{result.urgency}</Text>
            </View>
          ) : null}

          {result.comparison_sources?.length > 0 ? (
            <Card>
              <Text style={s.label}>Πηγές σύγκρισης</Text>
              {result.comparison_sources.map((src: string, i: number) => (
                <Text key={i} style={s.source}>{src}</Text>
              ))}
            </Card>
          ) : null}

          {result.disclaimer ? (
            <Text style={s.disclaimer}>{result.disclaimer}</Text>
          ) : null}

          <Button label="Νέα φωτογραφία" variant="secondary" full
            onPress={() => { setImageUri(null); setResult(null) }} />
        </View>
      ) : null}
    </Screen>
  )
}

const s = StyleSheet.create({
  gate: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: space.lg },
  gateIcon: {
    width: 88, height: 88, borderRadius: radius.full,
    backgroundColor: colors.brandLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: space.lg,
  },
  gateTitle: {
    ...typo.section, fontWeight: weight.bold,
    color: colors.navy, textAlign: 'center',
  },
  gateText: {
    ...typo.body, color: colors.textMuted,
    textAlign: 'center', marginTop: space.sm,
  },

  typeRow: { flexDirection: 'row', gap: space.md, marginBottom: space.lg },
  type: {
    flex: 1, minHeight: touch.min,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  typeActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  typeLabel: { ...typo.body, fontWeight: weight.semibold, color: colors.textMuted },
  typeLabelActive: { color: colors.textOnDark },

  dropzone: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
    padding: space.xxl, alignItems: 'center',
  },
  dropTitle: {
    ...typo.emphasis, fontWeight: weight.bold,
    color: colors.navy, textAlign: 'center',
  },
  dropText: {
    ...typo.body, color: colors.textMuted,
    textAlign: 'center', marginTop: space.sm,
  },
  pickRow: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
  pick: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: space.sm, minHeight: touch.min, paddingHorizontal: space.lg,
    backgroundColor: colors.brandLight, borderRadius: radius.md,
  },
  pickLabel: { ...typo.body, fontWeight: weight.semibold, color: colors.brand },

  frame: { position: 'relative' },
  image: { width: '100%', height: 240, borderRadius: radius.xl },
  remove: {
    position: 'absolute', top: space.md, right: space.md,
    width: touch.min, height: touch.min, borderRadius: radius.full,
    backgroundColor: colors.navy,
    alignItems: 'center', justifyContent: 'center',
  },

  label: {
    ...typo.caption, fontWeight: weight.bold,
    color: colors.textMuted, marginBottom: space.sm,
  },
  body: { ...typo.body, color: colors.text },
  bullet: { flexDirection: 'row', gap: space.md, marginBottom: space.sm },
  dot: {
    width: 6, height: 6, borderRadius: radius.full,
    backgroundColor: colors.brand, marginTop: 8,
  },
  bulletText: { ...typo.body, color: colors.text, flex: 1 },
  source: { ...typo.caption, color: colors.textLight, marginBottom: space.xs },

  urgency: {
    flexDirection: 'row', gap: space.md, alignItems: 'flex-start',
    backgroundColor: colors.warningBg, borderRadius: radius.lg, padding: space.lg,
  },
  urgencyText: { ...typo.body, color: colors.text, flex: 1 },

  disclaimer: { ...typo.caption, color: colors.textLight, paddingHorizontal: space.xs },
})
