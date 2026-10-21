import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Scale, Send, AlertTriangle, Phone } from 'lucide-react-native'
import { api } from '@/lib/api'
import { Screen, Card, Badge, Button, Input, SkeletonRows } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Νομικός σύμβουλος AI για θέματα κατοικιδίων.
 *
 * Κρατάμε ιστορικό ερωταπαντήσεων στη μνήμη της οθόνης: η συζήτηση έχει
 * νόημα ως σύνολο, και ο χρήστης θέλει να ξαναδιαβάσει τι ρώτησε.
 *
 * Κάτω από τις απαντήσεις εμφανίζονται πραγματικοί δικηγόροι: το AI δίνει
 * κατεύθυνση, όχι νομική συμβουλή, και αυτό πρέπει να είναι ορατό.
 */
const SUGGESTIONS = [
  'legal.q1', 'legal.q2', 'legal.q3', 'legal.q4',
]

export default function PetLegalScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const [question, setQuestion] = useState('')
  const [history, setHistory] = useState<Array<{ q: string; a: any }>>([])

  const { data: lawyers = [] } = useQuery({
    queryKey: ['legal-lawyers'],
    queryFn: () => api.get('/services?service_type=legal&limit=6').then(r => r.data?.data ?? []),
  })

  const ask = useMutation({
    mutationFn: (q: string) => api.post('/ai/legal', { question: q }).then(r => r.data?.data ?? r.data),
    onSuccess: (data, q) => {
      setHistory(prev => [...prev, { q, a: data }])
      setQuestion('')
    },
    onError: (e: any) =>
      Alert.alert(t('common.error'), e?.response?.data?.message || t('legal.errAsk')),
  })

  const send = (q: string) => {
    if (!q.trim()) return
    ask.mutate(q.trim())
  }

  const tone = (u: string) =>
    u === 'high' ? 'danger' : u === 'medium' ? 'warning' : 'success'

  return (
    <Screen title={t('legal.title')} back scroll={false}>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Text style={s.intro}>{t('legal.subtitle')}</Text>

        {history.length === 0 && (
          <Card>
            <Text style={s.sectionTitle}>{t('legal.examples')}</Text>
            {SUGGESTIONS.map(k => (
              <TouchableOpacity key={k} activeOpacity={0.7} style={s.suggestion}
                onPress={() => send(t(k))}>
                <Text style={s.suggestionTxt}>{t(k)}</Text>
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {history.map((h, i) => (
          <View key={i} style={s.exchange}>
            <View style={s.question}>
              <Text style={s.questionTxt}>{h.q}</Text>
            </View>
            <Card>
              <View style={s.answerHead}>
                <Scale size={icon.sm} color={colors.brand} />
                <Text style={s.answerTitle}>{t('legal.answer')}</Text>
                {!!h.a?.urgency && (
                  <Badge label={t(`legal.urgency_${h.a.urgency}`, { defaultValue: h.a.urgency })}
                    tone={tone(h.a.urgency) as any} />
                )}
              </View>
              {!!h.a?.answer && <Text style={s.answerTxt}>{h.a.answer}</Text>}
              {!!h.a?.steps?.length && (
                <>
                  <Text style={s.sub}>{t('legal.steps')}</Text>
                  {h.a.steps.map((st: string, j: number) => (
                    <Text key={j} style={s.bullet}>{j + 1}. {st}</Text>
                  ))}
                </>
              )}
              {!!h.a?.references?.length && (
                <>
                  <Text style={s.sub}>{t('legal.references')}</Text>
                  {h.a.references.map((r: string, j: number) => (
                    <Text key={j} style={s.bullet}>• {r}</Text>
                  ))}
                </>
              )}
            </Card>
          </View>
        ))}

        {ask.isPending && <SkeletonRows count={2} />}

        <Input value={question} onChangeText={setQuestion}
          placeholder={t('legal.placeholder')} multiline maxLength={2000} />
        <Button label={t('legal.ask')} icon={<Send size={18} color={colors.textOnDark} />}
          disabled={!question.trim() || ask.isPending} loading={ask.isPending}
          onPress={() => send(question)} full />

        <View style={s.warn}>
          <AlertTriangle size={14} color={colors.warning} />
          <Text style={s.warnTxt}>{t('legal.disclaimer')}</Text>
        </View>

        {lawyers.length > 0 && (
          <Card>
            <Text style={s.sectionTitle}>{t('legal.lawyers')}</Text>
            {lawyers.map((l: any) => (
              <TouchableOpacity key={l.id} activeOpacity={0.7} style={s.lawyer}
                onPress={() => router.push(`/services/${l.id}` as any)}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.lawyerName} numberOfLines={1}>{l.title || l.provider_name}</Text>
                  {!!l.city && <Text style={s.lawyerMeta}>{l.city}</Text>}
                </View>
                <Phone size={icon.sm} color={colors.brand} />
              </TouchableOpacity>
            ))}
          </Card>
        )}
      </ScrollView>
    </Screen>
  )
}

const s = StyleSheet.create({
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
  intro: { ...type.body, color: colors.textMuted },
  sectionTitle: { ...type.emphasis, color: colors.text, marginBottom: space.sm },
  suggestion: { paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  suggestionTxt: { ...type.caption, color: colors.brand },
  exchange: { gap: space.sm },
  question: { alignSelf: 'flex-end', maxWidth: '88%', backgroundColor: colors.brandTint, padding: space.md, borderRadius: radius.lg },
  questionTxt: { ...type.body, color: colors.brand, fontWeight: weight.medium },
  answerHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: space.sm, flexWrap: 'wrap' },
  answerTitle: { ...type.emphasis, color: colors.text, flex: 1 },
  answerTxt: { ...type.body, color: colors.textMuted },
  sub: { ...type.caption, color: colors.textMuted, fontWeight: weight.semibold, marginTop: space.md },
  bullet: { ...type.caption, color: colors.textMuted, marginTop: space.xs },
  warn: { flexDirection: 'row', gap: space.xs, alignItems: 'flex-start' },
  warnTxt: { ...type.caption, color: colors.textLight, flex: 1 },
  lawyer: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  lawyerName: { ...type.body, color: colors.text, fontWeight: weight.medium },
  lawyerMeta: { ...type.caption, color: colors.textLight },
})
