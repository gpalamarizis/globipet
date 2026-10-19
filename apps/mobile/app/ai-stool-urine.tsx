import { useState } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useQuery, useMutation } from '@tanstack/react-query'
import { FlaskConical, Camera, Images, AlertTriangle } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
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
 */
const SAMPLES = [
  { id: 'stool', labelKey: 'stool.stool' },
  { id: 'urine', labelKey: 'stool.urine' },
]

export default function AiStoolUrineScreen() {
  const { t } = useTranslation()
  const router = useRouter()
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
      })
      return res.data?.data ?? res.data
    },
    onSuccess: setResult,
    onError: (e: any) =>
      Alert.alert(t('ai.analysis_failed'), e?.response?.data?.message || t('common.try_again_later')),
  })

  if (!isAuthenticated) return (
    <Screen title={t('stool.title')} back>
      <Card>
        <Text style={s.gateTitle}>{t('ai.need_login')}</Text>
        <Text style={s.gateText}>{t('ai.login_reason')}</Text>
        <Button label={t('auth.sign_in')} full onPress={() => router.push('/auth/login' as any)}
          style={{ marginTop: space.lg }} />
      </Card>
    </Screen>
  )

  const canAnalyze = !!imageUri && !!petId && !analyze.isPending

  return (
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
          <Card>
            <View style={s.resultHead}>
              <FlaskConical size={icon.md} color={colors.brand} />
              <Text style={s.resultTitle}>{t('ai.findings')}</Text>
              {!!result.severity && (
                <Badge
                  label={t(`ai.sev_${result.severity}`, { defaultValue: result.severity })}
                  tone={result.severity === 'high' ? 'danger' : result.severity === 'medium' ? 'warning' : 'success'} />
              )}
            </View>
            {!!result.summary && <Text style={s.resultTxt}>{result.summary}</Text>}
            {!!result.findings?.length && result.findings.map((f: string, i: number) => (
              <Text key={i} style={s.bullet}>• {f}</Text>
            ))}
            {!!result.recommendation && (
              <>
                <Text style={s.sub}>{t('ai.recommendation')}</Text>
                <Text style={s.resultTxt}>{result.recommendation}</Text>
              </>
            )}
            <View style={s.warn}>
              <AlertTriangle size={14} color={colors.warning} />
              <Text style={s.warnTxt}>{t('stool.disclaimer')}</Text>
            </View>
          </Card>
        )}
      </ScrollView>
    </Screen>
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
  sub: { ...type.caption, color: colors.textMuted, fontWeight: weight.semibold, marginTop: space.md },
  warn: { flexDirection: 'row', gap: space.xs, marginTop: space.md, alignItems: 'flex-start' },
  warnTxt: { ...type.caption, color: colors.textLight, flex: 1 },
  gateTitle: { ...type.section, color: colors.text },
  gateText: { ...type.body, color: colors.textMuted, marginTop: space.xs },
})
