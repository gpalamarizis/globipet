import { useState } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import * as ImagePicker from 'expo-image-picker'
import { useQuery, useMutation } from '@tanstack/react-query'
import { FlaskConical, Camera, Images, AlertTriangle } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import AiGate from '@/components/AiGate'
import { Screen, Card, Button, Badge } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Ανάλυση δείγματος — κόπρανα ή ούρα.
 *
 * Το τρίτο εργαλείο AI, που υπήρχε μόνο στο web. Ακολουθεί την ίδια ροή με
 * την ανάλυση υγείας: ανέβασμα εικόνας, μετά ανάλυση — δύο κλήσεις, γιατί
 * ο server θέλει πρώτα διεύθυνση εικόνας.
 *
 * Το είδος ζώου ΔΕΝ μαντεύεται: ο ίδιος σχηματισμός σημαίνει διαφορετικά
 * πράγματα σε σκύλο και σε γάτα, και ο server το απαιτεί.
 *
 * ΑΠΟΤΕΛΕΣΜΑ (19/10) — ίδια πεδία και σειρά με το web (AiStoolUrine.tsx):
 *   σοβαρότητα + σύσταση, επείγον + χρώμα + σύσταση δείγματος, ευρήματα,
 *   πιθανές αιτίες, επίδραση ιστορικού, φροντίδα στο σπίτι, σημάδια για
 *   άμεση επίσκεψη, πηγές, αποποίηση. Πριν: έδειχνε `summary` (δεν
 *   υπάρχει), αντιστοίχιζε σοβαρότητα low/medium/high ενώ ο server δίνει
 *   normal/mild/moderate/severe, και δεν έδειχνε καθόλου το `vet_urgency`.
 *   Οι ετικέτες βγαίνουν από τους κωδικούς (όχι από το `vet_urgency_el`).
 *   Περνά από την κοινή πύλη συνδρομής AiGate, όπως στο web.
 */
const SAMPLES = [
  { id: 'stool', labelKey: 'stool.stool' },
  { id: 'urine', labelKey: 'stool.urine' },
]

type Tone = 'success' | 'warning' | 'danger'
const SEVERITY: Record<string, { labelKey: string; tone: Tone }> = {
  normal:   { labelKey: 'stool.sev_normal',   tone: 'success' },
  mild:     { labelKey: 'stool.sev_mild',     tone: 'warning' },
  moderate: { labelKey: 'stool.sev_moderate', tone: 'warning' },
  severe:   { labelKey: 'stool.sev_severe',   tone: 'danger' },
}
const URGENCY: Record<string, { labelKey: string; tone: Tone }> = {
  routine:    { labelKey: 'stool.urg_routine',    tone: 'success' },
  within_48h: { labelKey: 'stool.urg_within_48h', tone: 'warning' },
  today:      { labelKey: 'stool.urg_today',      tone: 'warning' },
  emergency:  { labelKey: 'stool.urg_emergency',  tone: 'danger' },
}

// Ίδιο με το web: τα στοιχεία λίστας είναι κείμενα, αλλά το μοντέλο
// μπορεί να επιστρέψει και αντικείμενα.
function itemText(item: any): string {
  if (item == null) return ''
  if (typeof item === 'string') return item
  if (typeof item === 'object') return Object.values(item).filter(v => typeof v === 'string').join(' — ')
  return String(item)
}

export default function AiStoolUrineScreen() {
  const { t, i18n } = useTranslation()
  const { isAuthenticated } = useAuthStore()

  const [imageUri, setImageUri] = useState<string | null>(null)
  const [sampleType, setSampleType] = useState('stool')
  const [petId, setPetId] = useState('')
  const [result, setResult] = useState<any>(null)

  const { data: pets = [] } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets').then(r => r.data?.data ?? r.data ?? []),
    enabled: isAuthenticated,
  })
  const pet = pets.find((p: any) => p.id === petId)

  const pick = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      return Alert.alert(t('ai.need_permission'),
        fromCamera ? t('ai.perm_camera') : t('ai.perm_photos'))
    }
    const picked = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 })
    if (!picked.canceled && picked.assets?.[0]) {
      setImageUri(picked.assets[0].uri)
      setResult(null)
    }
  }

  const analyze = useMutation({
    mutationFn: async () => {
      if (!imageUri) throw new Error(t('ai.no_photo'))
      const form = new FormData()
      const filename = imageUri.split('/').pop() || 'sample.jpg'
      form.append('file', { uri: imageUri, name: filename, type: 'image/jpeg' } as any)
      const up = await api.post('/upload?folder=ai-sample', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const res = await api.post('/ai/stool-urine', {
        image_url: up.data?.url,
        sample_type: sampleType,
        species: pet?.species ?? 'dog',
        pet_id: petId || undefined,
        lang: i18n.language,
      })
      return res.data?.data ?? res.data
    },
    onSuccess: setResult,
    onError: (e: any) =>
      Alert.alert(t('ai.analysis_failed'), e?.response?.data?.message || t('common.try_again_later')),
  })

  const canAnalyze = !!imageUri && !!petId && !analyze.isPending
  const sev = result?.severity ? SEVERITY[result.severity] : null
  const urg = result?.vet_urgency ? URGENCY[result.vet_urgency] : null

  const list = (titleKey: string, items: any, bullet = '•', danger = false) =>
    Array.isArray(items) && items.length > 0 ? (
      <Card>
        <Text style={[s.listTitle, danger && { color: colors.danger }]}>{t(titleKey)}</Text>
        {items.map((it: any, i: number) => (
          <Text key={i} style={[s.bullet, danger && { color: colors.danger }]}>{bullet} {itemText(it)}</Text>
        ))}
      </Card>
    ) : null

  return (
    <AiGate title={t('stool.title')}>
    <Screen title={t('stool.title')} back scroll={false}>
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.intro}>{t('stool.subtitle')}</Text>

        <View style={s.chips}>
          {SAMPLES.map(sm => {
            const on = sampleType === sm.id
            return (
              <TouchableOpacity key={sm.id} activeOpacity={0.7}
                style={[s.chip, on && s.chipOn]} onPress={() => { setSampleType(sm.id); setResult(null) }}>
                <Text style={[s.chipTxt, on && s.chipTxtOn]}>{t(sm.labelKey)}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Το ζώο είναι υποχρεωτικό: ο ίδιος σχηματισμός σημαίνει άλλα
            πράγματα σε σκύλο και σε γάτα. */}
        <Text style={s.label}>{t('serviceDetail.forPet')}</Text>
        {pets.length === 0 ? (
          <Text style={s.hint}>{t('pets.none_yet')}</Text>
        ) : (
          <View style={[s.chips, { flexWrap: 'wrap' }]}>
            {pets.map((p: any) => {
              const on = petId === p.id
              return (
                <TouchableOpacity key={p.id} activeOpacity={0.7}
                  style={[s.chip, on && s.chipOn]} onPress={() => setPetId(p.id)}>
                  <Text style={s.emoji}>{p.species === 'cat' ? '🐈' : '🐕'}</Text>
                  <Text style={[s.chipTxt, on && s.chipTxtOn]}>{p.name}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {imageUri ? (
          <Image source={{ uri: imageUri }} style={s.preview} resizeMode="cover" />
        ) : (
          <Card>
            <Text style={s.hint}>{t('stool.photoHint')}</Text>
          </Card>
        )}

        <View style={s.row}>
          <Button label={t('ai.camera')} icon={<Camera size={18} color={colors.textOnDark} />}
            onPress={() => pick(true)} style={{ flex: 1 }} />
          <Button label={t('ai.photos')} variant="secondary"
            icon={<Images size={18} color={colors.text} />}
            onPress={() => pick(false)} style={{ flex: 1 }} />
        </View>

        <Button
          label={analyze.isPending ? t('ai.analysing') : t('ai.analyse')}
          disabled={!canAnalyze} loading={analyze.isPending}
          onPress={() => analyze.mutate()} full />

        {result && (
          <>
            {/* Σοβαρότητα + σύσταση */}
            <Card>
              <View style={s.resultHead}>
                <FlaskConical size={icon.md} color={colors.brand} />
                <Text style={s.resultTitle}>{t('ai.severity')}</Text>
                <Badge
                  label={sev ? t(sev.labelKey) : (result.severity || t('ai.sev_unknown'))}
                  tone={sev?.tone ?? 'neutral'} />
              </View>
              {!!result.recommendation && <Text style={s.resultTxt}>{result.recommendation}</Text>}
            </Card>

            {/* Επείγον + χρώμα + σύσταση δείγματος */}
            <Card>
              <View style={[s.kv, s.kvFirst]}>
                <Text style={s.k}>{t('stool.urgency')}</Text>
                <Badge
                  label={urg ? t(urg.labelKey) : (result.vet_urgency || t('ai.sev_unknown'))}
                  tone={urg?.tone ?? 'neutral'} />
              </View>
              {!!result.color && (
                <View style={s.kv}>
                  <Text style={s.k}>{t('stool.color')}</Text>
                  <Text style={s.v}>{result.color}</Text>
                </View>
              )}
              {!!result.consistency && (
                <View style={s.kv}>
                  <Text style={s.k}>{t('stool.consistency')}</Text>
                  <Text style={s.v}>{result.consistency}</Text>
                </View>
              )}
            </Card>

            {list('ai.findings', result.findings)}
            {list('stool.likelyCauses', result.likely_causes)}
            {list('stool.contextFactors', result.context_factors)}
            {list('stool.homeCare', result.home_care, '✓')}
            {list('stool.warningSigns', result.warning_signs, '•', true)}
            {list('ai.sources', result.comparison_sources)}

            <View style={s.warn}>
              <AlertTriangle size={14} color={colors.warning} />
              <Text style={s.warnTxt}>{result.disclaimer || t('stool.disclaimer')}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
    </AiGate>
  )
}

const s = StyleSheet.create({
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
  intro: { ...type.body, color: colors.textMuted },
  label: { ...type.caption, color: colors.textMuted, fontWeight: weight.semibold },
  hint: { ...type.caption, color: colors.textLight },
  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: space.xs,
    paddingHorizontal: space.md, paddingVertical: space.sm,
    borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface,
  },
  chipOn: { borderColor: colors.brand, backgroundColor: colors.brandTint },
  chipTxt: { ...type.caption, color: colors.textMuted, fontWeight: weight.medium },
  chipTxtOn: { color: colors.brand, fontWeight: weight.bold },
  emoji: { fontSize: 15 },
  preview: { width: '100%', height: 220, borderRadius: radius.xl, backgroundColor: colors.surfaceAlt },
  row: { flexDirection: 'row', gap: space.sm },
  resultHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: space.sm, flexWrap: 'wrap' },
  resultTitle: { ...type.emphasis, color: colors.text, flex: 1 },
  resultTxt: { ...type.body, color: colors.textMuted },
  bullet: { ...type.caption, color: colors.textMuted, marginTop: space.xs },
  listTitle: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  kv: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md,
    paddingVertical: space.xs, marginTop: space.xs,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  kvFirst: { borderTopWidth: 0, marginTop: 0 },
  k: { ...type.caption, color: colors.textMuted, flexShrink: 0, maxWidth: '42%' },
  v: { ...type.caption, color: colors.text, fontWeight: weight.semibold, flex: 1, textAlign: 'right' },
  warn: { flexDirection: 'row', gap: space.xs, alignItems: 'flex-start' },
  warnTxt: { ...type.caption, color: colors.textLight, flex: 1 },
})
