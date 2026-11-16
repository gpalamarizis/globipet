import { useState } from 'react'
import { View, Text, TouchableOpacity, Image, StyleSheet, Linking, TextInput, ActivityIndicator, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Heart, BadgeCheck, MapPin, BookOpen, Sparkles, ExternalLink, Send } from 'lucide-react-native'
import { api } from '@/lib/api'
import { Card } from '@/components/ui'
import { colors, space, radius, type, weight, icon, touch } from '@/theme'

/**
 * Υιοθεσία — κοινά κομμάτια του κινητού. Ίδια κλειδιά κειμένων (adoption.*)
 * και ίδια API με το web (components/features/adoption/shared.tsx).
 */

export const SPECIES = ['dog', 'cat', 'rabbit', 'ferret', 'bird', 'rodent', 'reptile', 'other'] as const
export const GUIDE_COUNTRIES = ['GR', 'ES', 'GB', 'FR', 'CN'] as const
export const SPECIES_EMOJI: Record<string, string> = { dog: '🐶', cat: '🐱', rabbit: '🐰', ferret: '🦦', bird: '🐦', rodent: '🐹', reptile: '🦎', other: '🐾' }

export function ageLabel(t: (k: string, o?: any) => string, weeks: number): string {
  if (weeks < 16) return t('adoption.age.weeks', { count: Math.max(weeks, 0) })
  if (weeks < 104) return t('adoption.age.months', { count: Math.floor(weeks / 4.345) })
  return t('adoption.age.years', { count: Math.floor(weeks / 52.18) })
}
export function money(amount: number, currency: string): string {
  const sym: Record<string, string> = { EUR: '€', GBP: '£', CNY: '¥' }
  return `${amount.toFixed(2)} ${sym[currency] ?? currency}`
}
export function countryName(t: (k: string) => string, code: string): string {
  return (GUIDE_COUNTRIES as readonly string[]).includes(code) ? t(`adoption.countries.${code}`) : code
}

export const APP_TONE: Record<string, 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'> = {
  pending: 'info', reviewing: 'warning', approved: 'success', rejected: 'neutral', withdrawn: 'neutral', completed: 'success',
}
export const LISTING_TONE: Record<string, 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'> = {
  available: 'success', reserved: 'warning', adopted: 'info', withdrawn: 'neutral',
}

export function useLang() {
  const { i18n } = useTranslation()
  return (i18n.resolvedLanguage || i18n.language || 'el').slice(0, 2)
}

export function useAdoptionRules(country: string) {
  const lang = useLang()
  return useQuery({
    queryKey: ['adoption-rules', country, lang],
    queryFn: () => api.get('/adoption/rules', { params: { country, lang } }).then(r => r.data),
    enabled: /^[A-Z]{2}$/.test(country),
    staleTime: 60 * 60 * 1000,
  })
}

// ─── Επιλογή (chips) ─────────────────────────────────────────────────
export function ChipRow<T extends string>({ options, value, onChange, scroll }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; scroll?: boolean }) {
  return (
    <View style={[s.chips, scroll && { flexWrap: 'nowrap' }]}>
      {options.map(o => {
        const on = o.value === value
        return (
          <TouchableOpacity key={o.value || '_'} activeOpacity={0.7} onPress={() => onChange(o.value)}
            accessibilityRole="button" accessibilityState={{ selected: on }}
            style={[s.chip, on && s.chipOn]}>
            <Text style={[s.chipTxt, on && s.chipTxtOn]}>{o.label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// ─── Κάρτα ζώου ───────────────────────────────────────────────────────
export function AdoptionCard({ l, onPress, onToggleFavorite }: { l: any; onPress: () => void; onToggleFavorite?: () => void }) {
  const { t } = useTranslation()
  return (
    <Card onPress={onPress} padded={false} style={{ marginBottom: space.md, overflow: 'hidden' }}>
      <View style={s.photoWrap}>
        {l.photos?.[0]
          ? <Image source={{ uri: l.photos[0] }} style={s.photo} resizeMode="cover" />
          : <View style={[s.photo, s.photoEmpty]}><Text style={{ fontSize: 48 }}>{SPECIES_EMOJI[l.species] ?? '🐾'}</Text></View>}
        {l.status !== 'available' && (
          <View style={[s.statusPill]}><Text style={s.statusTxt}>{t(`adoption.status.${l.status}`)}</Text></View>
        )}
        {onToggleFavorite && (
          <TouchableOpacity onPress={onToggleFavorite} style={s.favBtn} hitSlop={8} accessibilityLabel={t('adoption.card.favorite')}>
            <Heart size={icon.md} color={l.is_favorite ? '#F43F5E' : colors.textMuted} fill={l.is_favorite ? '#F43F5E' : 'transparent'} />
          </TouchableOpacity>
        )}
      </View>
      <View style={{ padding: space.lg, gap: space.xs }}>
        <View style={s.rowBetween}>
          <Text style={s.name} numberOfLines={1}>{l.name}</Text>
          <View style={[s.feePill, { backgroundColor: l.adoption_fee > 0 ? colors.warningBg : colors.successBg }]}>
            <Text style={[s.feeTxt, { color: l.adoption_fee > 0 ? '#B45309' : '#047857' }]}>
              {l.adoption_fee > 0 ? money(l.adoption_fee, l.fee_currency) : t('adoption.card.free')}
            </Text>
          </View>
        </View>
        <Text style={s.meta} numberOfLines={1}>
          {t(`adoption.species.${l.species}`)}{l.breed ? ` · ${l.breed}` : ''} · {t(`adoption.sex.${l.sex}`)} · {ageLabel(t, l.age_weeks)}
        </Text>
        <View style={s.rowBetween}>
          <View style={s.inline}><MapPin size={icon.xs} color={colors.textLight} /><Text style={s.small} numberOfLines={1}>{l.city}, {countryName(t, l.country)}</Text></View>
          <View style={s.inline}>
            {l.lister?.verified && <BadgeCheck size={icon.xs} color={colors.success} />}
            <Text style={s.small}>{t(`adoption.card.${l.lister?.type === 'organisation' ? 'organisation' : 'individual'}`)}</Text>
          </View>
        </View>
      </View>
    </Card>
  )
}

// ─── Νομικός οδηγός ──────────────────────────────────────────────────
export function LegalGuide({ country, onCountry }: { country: string; onCountry?: (c: string) => void }) {
  const { t } = useTranslation()
  const { data, isLoading } = useAdoptionRules(country)
  const g = data?.guide
  const section = (title: string, items: { ref: string | null; text: string }[] | undefined) => items?.length ? (
    <View style={{ marginTop: space.md }}>
      <Text style={s.secTitle}>{title}</Text>
      {items.map((i, k) => (
        <View key={k} style={s.bullet}>
          <Text style={s.dot}>•</Text>
          <Text style={s.body}>{i.ref ? <Text style={{ fontWeight: weight.semibold, color: colors.text }}>{i.ref}: </Text> : null}{i.text}</Text>
        </View>
      ))}
    </View>
  ) : null

  return (
    <Card style={{ marginBottom: space.lg }}>
      <View style={s.inline}><BookOpen size={icon.md} color="#4F46E5" /><Text style={s.cardTitle}>{t('adoption.guide.title')}</Text></View>
      {onCountry && (
        <View style={{ marginTop: space.md }}>
          <ChipRow value={country as any} onChange={onCountry} options={GUIDE_COUNTRIES.map(c => ({ value: c, label: t(`adoption.countries.${c}`) }))} />
        </View>
      )}
      {isLoading || !g ? <ActivityIndicator color={colors.brand} style={{ marginVertical: space.xl }} /> : (
        <>
          {section(t('adoption.guide.laws'), g.laws)}
          {section(t('adoption.guide.adopter'), g.adopter)}
          {section(t('adoption.guide.giver'), g.giver)}
          {section(t('adoption.guide.after'), g.after)}
          {g.links?.map((l: any) => (
            <TouchableOpacity key={l.url} onPress={() => Linking.openURL(l.url)} style={[s.inline, { marginTop: space.sm, minHeight: 32 }]}>
              <ExternalLink size={icon.xs} color="#4F46E5" /><Text style={s.link}>{l.label}</Text>
            </TouchableOpacity>
          ))}
          <Text style={[s.small, { marginTop: space.md }]}>{t('adoption.guide.updated', { date: g.updated_at })} · {t('adoption.guide.disclaimer')}</Text>
        </>
      )}
    </Card>
  )
}

// ─── AI βοηθός ───────────────────────────────────────────────────────
export function AiAssistant({ country, listingId }: { country: string; listingId?: string }) {
  const { t } = useTranslation()
  const lang = useLang()
  const [q, setQ] = useState('')
  const [role, setRole] = useState<'adopter' | 'giver'>('adopter')
  const [answer, setAnswer] = useState<any>(null)
  const ask = useMutation({
    mutationFn: (question: string) => api.post('/ai/adoption', { question, country, role, lang, listing_id: listingId }).then(r => r.data),
    onSuccess: d => { setAnswer(d); setQ('') },
    onError: (e: any) => Alert.alert(t('adoption.common.error'), e?.response?.data?.message || t('adoption.common.error')),
  })
  const go = (question: string) => { if (question.trim() && !ask.isPending) { setAnswer(null); ask.mutate(question.trim()) } }
  const box = (title: string, items: string[] | undefined, bg: string, fg: string) => items?.length ? (
    <View style={[s.aiBox, { backgroundColor: bg }]}>
      <Text style={[s.aiBoxTitle, { color: fg }]}>{title}</Text>
      {items.map((x, i) => <Text key={i} style={[s.small, { color: fg, marginTop: 2 }]}>{i + 1}. {x}</Text>)}
    </View>
  ) : null

  return (
    <Card style={{ marginBottom: space.lg }}>
      <View style={s.inline}><Sparkles size={icon.md} color="#4F46E5" /><Text style={s.cardTitle}>{t('adoption.ai.title')}</Text></View>
      <Text style={[s.body, { marginTop: space.xs }]}>{t('adoption.ai.subtitle')}</Text>
      <View style={{ marginTop: space.md }}>
        <ChipRow value={role} onChange={setRole} options={[{ value: 'adopter', label: t('adoption.ai.roleAdopter') }, { value: 'giver', label: t('adoption.ai.roleGiver') }]} />
      </View>
      <TextInput value={q} onChangeText={setQ} multiline maxLength={2000} placeholder={t('adoption.ai.placeholder')} placeholderTextColor={colors.textLight} style={s.aiInput} />
      <TouchableOpacity onPress={() => go(q)} disabled={!q.trim() || ask.isPending} style={[s.aiBtn, (!q.trim() || ask.isPending) && { opacity: 0.5 }]}>
        {ask.isPending ? <ActivityIndicator color="#fff" /> : <><Send size={icon.sm} color="#fff" /><Text style={s.aiBtnTxt}>{t('adoption.ai.ask')}</Text></>}
      </TouchableOpacity>
      {!answer && !ask.isPending && (
        <View style={{ marginTop: space.md, gap: space.sm }}>
          {(['q1', 'q2', 'q3', 'q4'] as const).map(k => (
            <TouchableOpacity key={k} onPress={() => go(t(`adoption.ai.${k}`))} style={s.sample}><Text style={s.small}>{t(`adoption.ai.${k}`)}</Text></TouchableOpacity>
          ))}
        </View>
      )}
      {ask.isPending && <Text style={[s.small, { marginTop: space.md }]}>{t('adoption.ai.thinking')}</Text>}
      {answer && (
        <View style={{ marginTop: space.md, gap: space.sm }}>
          <Text style={s.body}>{answer.answer}</Text>
          {answer.relevant_laws?.length ? <View style={[s.aiBox, { backgroundColor: '#EEF2FF' }]}><Text style={[s.aiBoxTitle, { color: '#4338CA' }]}>{t('adoption.ai.laws')}</Text><Text style={[s.small, { color: '#4338CA' }]}>{answer.relevant_laws.join(' · ')}</Text></View> : null}
          {box(t('adoption.ai.steps'), answer.practical_steps, colors.successBg, '#047857')}
          {box(t('adoption.ai.documents'), answer.documents, colors.warningBg, '#B45309')}
          {answer.recommend_lawyer && <Text style={[s.small, { color: colors.danger }]}>⚠️ {t('adoption.ai.lawyer')}</Text>}
          {answer.disclaimer ? <Text style={[s.small, { fontStyle: 'italic' }]}>{answer.disclaimer}</Text> : null}
        </View>
      )}
    </Card>
  )
}

export const adoptionStyles = StyleSheet.create({
  label: { ...type.caption, color: colors.textMuted, fontWeight: weight.semibold, marginBottom: space.sm },
  section: { ...type.emphasis, fontWeight: weight.bold, color: colors.text, marginBottom: space.md, marginTop: space.lg },
  muted: { ...type.caption, color: colors.textMuted },
  body: { ...type.body, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight, minHeight: touch.min },
})

const s = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, minHeight: 36, justifyContent: 'center' },
  chipOn: { borderColor: colors.brand, backgroundColor: colors.brandTint },
  chipTxt: { ...type.caption, color: colors.textMuted, fontWeight: weight.medium },
  chipTxtOn: { color: colors.brand, fontWeight: weight.bold },
  photoWrap: { position: 'relative' },
  photo: { width: '100%', aspectRatio: 4 / 3, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, backgroundColor: colors.surfaceAlt },
  photoEmpty: { alignItems: 'center', justifyContent: 'center' },
  statusPill: { position: 'absolute', top: space.md, left: space.md, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.full },
  statusTxt: { ...type.caption, fontWeight: weight.bold, color: colors.text },
  favBtn: { position: 'absolute', top: space.md, right: space.md, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.xs, flexShrink: 1 },
  name: { ...type.emphasis, fontWeight: weight.bold, color: colors.text, flex: 1 },
  feePill: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.full },
  feeTxt: { ...type.caption, fontWeight: weight.bold },
  meta: { ...type.caption, color: colors.textMuted },
  small: { ...type.caption, color: colors.textMuted, flexShrink: 1 },
  cardTitle: { ...type.emphasis, fontWeight: weight.bold, color: colors.text, marginLeft: space.xs },
  secTitle: { ...type.body, fontWeight: weight.bold, color: colors.text, marginBottom: space.xs },
  bullet: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  dot: { ...type.body, color: colors.brand },
  body: { ...type.body, color: colors.textMuted, flex: 1 },
  link: { ...type.caption, color: '#4F46E5', fontWeight: weight.semibold },
  aiInput: { ...type.body, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: space.md, minHeight: 88, textAlignVertical: 'top', marginTop: space.md, backgroundColor: colors.surface },
  aiBtn: { marginTop: space.md, backgroundColor: '#4F46E5', borderRadius: radius.md, minHeight: touch.min, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  aiBtnTxt: { ...type.body, color: '#fff', fontWeight: weight.bold },
  sample: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.sm, minHeight: 40, justifyContent: 'center' },
  aiBox: { borderRadius: radius.md, padding: space.md },
  aiBoxTitle: { ...type.caption, fontWeight: weight.bold, marginBottom: space.xs },
})
