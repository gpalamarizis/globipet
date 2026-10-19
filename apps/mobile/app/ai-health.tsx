import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useMutation } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Camera, Images, AlertTriangle, X, FlaskConical, ChevronRight, Video } from 'lucide-react-native'
import { api } from '@/lib/api'
import AiGate from '@/components/AiGate'
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
 *   3. Το «Ιατρικό κέντρο» άνοιγε route που δεν υπήρχε. Υπάρχει πλέον ως
 *      οθόνη (app/medical-center.tsx) — το προσωρινό URL του web αφαιρέθηκε.
 *
 * Η πύλη (σύνδεση, συνδρομή/δοκιμή, admin, σφάλμα με επανάληψη) ζει πλέον
 * στο κοινό src/components/AiGate.tsx, ώστε να ισχύει ίδια και στις άλλες
 * δύο οθόνες AI — όπως το AiFeatureGuard του web.
 *
 * ΙΣΟΤΙΜΙΑ ΜΕ ΤΟ WEB (19/10)
 *   - Τρίτη επιλογή «Ανάλυση δείγματος» → /ai-stool-urine, όπως η κάρτα
 *     ούρων/περιττωμάτων του web.
 *   - Μετά το αποτέλεσμα, πρόταση για κτηνίατρο με βιντεοκλήση (/telehealth).
 *   - Ευρήματα/παθήσεις περνούν από itemText, όπως το renderItem του web:
 *     αν το μοντέλο επιστρέψει αντικείμενο ({name, probability}), το RN
 *     έριχνε σφάλμα «Objects are not valid as a React child».
 */

// Ίδιο με το renderItem του web (AiPetHealth.tsx).
function itemText(item: any): string {
  if (item == null) return ''
  if (typeof item === 'string' || typeof item === 'number') return String(item)
  if (typeof item === 'object') {
    if (item.name) return `${item.name}${item.probability ? ` (${item.probability})` : ''}`
    return Object.values(item).filter(v => typeof v === 'string' || typeof v === 'number').join(' — ')
  }
  return String(item)
}

type AnalysisType = 'skin' | 'eye'

const SEVERITY = {
  high:   { labelKey: 'ai.sev_high',  tone: 'danger'  as const },
  medium: { labelKey: 'ai.sev_medium', tone: 'warning' as const },
  low:    { labelKey: 'ai.sev_low', tone: 'success' as const },
}

export default function AiHealthScreen() {
  const { t, i18n } = useTranslation()

  const [imageUri, setImageUri] = useState<string | null>(null)
  const [analysisType, setAnalysisType] = useState<AnalysisType>('skin')
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
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 })

    if (!picked.canceled && picked.assets?.[0]) {
      setImageUri(picked.assets[0].uri)
      setResult(null)
    }
  }

  const analyze = useMutation({
    mutationFn: async () => {
      if (!imageUri) throw new Error(t('ai.no_photo'))

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
        lang: i18n.language,
      })
      return analysisRes.data
    },
    onSuccess: setResult,
    onError: (err: any) =>
      Alert.alert(t('ai.analysis_failed'), err?.response?.data?.message || t('common.try_again_later')),
  })

  const severity = result?.severity ? SEVERITY[result.severity as keyof typeof SEVERITY] : null

  return (
    <AiGate title={t('ai.health_title')}>
    <Screen title={t('ai.health_title')} subtitle={t('ai.photo_ai')}>

      {/* ── Τι εξετάζουμε ──────────────────────────────────────── */}
      <View style={s.typeRow}>
        {([['skin', t('ai.skin')], ['eye', t('ai.eye')]] as const).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            onPress={() => setAnalysisType(key)}
            activeOpacity={0.7}
            style={[s.type, analysisType === key && s.typeActive]}>
            <Text style={[s.typeLabel, analysisType === key && s.typeLabelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={s.sampleLink} activeOpacity={0.7} onPress={() => router.push('/ai-stool-urine' as any)}>
        <FlaskConical size={icon.md} color={colors.brand} />
        <View style={{ flex: 1 }}>
          <Text style={s.sampleTitle}>{t('stool.title')}</Text>
          <Text style={s.sampleSub}>{t('stool.subtitle')}</Text>
        </View>
        <ChevronRight size={icon.md} color={colors.textLight} />
      </TouchableOpacity>

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
              ? t('ai.photo_skin')
              : t('ai.photo_eye')}
          </Text>
          <Text style={s.dropText}>{t('ai.light_hint')}</Text>
          <View style={s.pickRow}>
            <TouchableOpacity style={s.pick} onPress={() => pick(true)} activeOpacity={0.7}>
              <Camera size={icon.md} color={colors.brand} />
              <Text style={s.pickLabel}>{t('ai.camera')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.pick} onPress={() => pick(false)} activeOpacity={0.7}>
              <Images size={icon.md} color={colors.brand} />
              <Text style={s.pickLabel}>{t('ai.photos')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {imageUri && !result ? (
        <Button label={t('ai.analyse')} full
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
            <Text style={s.label}>{t('ai.severity')}</Text>
            <Badge label={severity ? t(severity.labelKey) : t('ai.sev_unknown')} tone={severity?.tone || 'neutral'}
              style={{ marginTop: space.xs }} />
          </Card>

          {result.findings?.length > 0 ? (
            <Card>
              <Text style={s.label}>{t('ai.findings')}</Text>
              {result.findings.map((f: any, i: number) => (
                <View key={i} style={s.bullet}>
                  <View style={s.dot} />
                  <Text style={s.bulletText}>{itemText(f)}</Text>
                </View>
              ))}
            </Card>
          ) : null}

          {result.conditions?.length > 0 ? (
            <Card>
              <Text style={s.label}>{t('ai.possible')}</Text>
              {result.conditions.map((c: any, i: number) => (
                <View key={i} style={s.bullet}>
                  <View style={s.dot} />
                  <Text style={s.bulletText}>{itemText(c)}</Text>
                </View>
              ))}
            </Card>
          ) : null}

          {result.recommendation ? (
            <Card>
              <Text style={s.label}>{t('ai.recommendation')}</Text>
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
              <Text style={s.label}>{t('ai.sources')}</Text>
              {result.comparison_sources.map((src: any, i: number) => (
                <Text key={i} style={s.source}>{itemText(src)}</Text>
              ))}
            </Card>
          ) : null}

          {/* Πρόταση για κτηνίατρο — όπως το CTA τηλεϊατρικής του web. */}
          <Card>
            <Text style={s.label}>{t('ai.ctaTitle')}</Text>
            <Text style={[s.body, { marginBottom: space.md }]}>{t('ai.ctaDesc')}</Text>
            <Button label={t('tele.title')} full icon={<Video size={icon.sm} color={colors.textOnDark} />}
              onPress={() => router.push('/telehealth' as any)} />
          </Card>

          {result.disclaimer ? (
            <Text style={s.disclaimer}>{result.disclaimer}</Text>
          ) : null}

          <Button label={t('ai.new_photo')} variant="secondary" full
            onPress={() => { setImageUri(null); setResult(null) }} />
        </View>
      ) : null}
    </Screen>
    </AiGate>
  )
}

const s = StyleSheet.create({
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

  sampleLink: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    minHeight: touch.min, padding: space.md, marginBottom: space.lg,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  sampleTitle: { ...typo.body, fontWeight: weight.semibold, color: colors.text },
  sampleSub: { ...typo.caption, color: colors.textMuted },

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
