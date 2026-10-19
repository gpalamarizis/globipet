import { useState } from 'react'
import { View, Text, StyleSheet, Image, Linking, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  Stethoscope, Brain, Shield, Globe, Scale, ShoppingBag, MapPin, Heart, Users, Linkedin,
} from 'lucide-react-native'
import { Screen, Card } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Ποιοι είμαστε — ίδιο περιεχόμενο με το globipet.com/about (ίδια κλειδιά
 * about.* σε 5 γλώσσες, ίδιες φωτογραφίες από το web).
 *
 * Η ενότητα «σε αριθμούς» του web ΔΕΝ μεταφέρθηκε: δείχνει 50K χρήστες,
 * 2K παρόχους και 4.9★ ενώ η πλατφόρμα δεν έχει ακόμη ανοίξει.
 */
const WEB = 'https://globipet.com'

const FOUNDERS = [
  { name: 'George Palamarizis', roleKey: 'about.founders.roles.ceo', bioKey: 'about.founders.bios.palamarizis', linkedin: 'https://www.linkedin.com/in/gpalamarizis/', photo: `${WEB}/founders/palamarizis.jpg` },
  { name: 'Meropi Topalidou', roleKey: 'about.founders.roles.pm', bioKey: 'about.founders.bios.topalidou', linkedin: 'https://www.linkedin.com/in/meropi-topalidou/', photo: `${WEB}/founders/topalidou.jpg` },
  { name: 'Vasilis Rallis', roleKey: 'about.founders.roles.cfo', bioKey: 'about.founders.bios.rallis', linkedin: 'https://www.linkedin.com/in/vasilis-rallis/', photo: `${WEB}/founders/rallis.jpg` },
]

const SERVICES = [
  { Icon: Stethoscope, key: 'telehealth', tint: 'training' },
  { Icon: Brain, key: 'aiHealth', tint: 'grooming' },
  { Icon: Shield, key: 'medicalFile', tint: 'hosting' },
  { Icon: Globe, key: 'services', tint: 'hosting' },
  { Icon: Scale, key: 'legal', tint: 'pharmacy' },
  { Icon: ShoppingBag, key: 'marketplace', tint: 'photography' },
  { Icon: MapPin, key: 'tracker', tint: 'veterinary' },
  { Icon: Heart, key: 'insurance', tint: 'pet_taxi' },
  { Icon: Users, key: 'community', tint: 'walking' },
]

const MISSION = ['pets', 'owners', 'providers']

const tintOf = (k: string) => (colors.category as any)[k] ?? colors.category.default

function Founder({ f }: { f: typeof FOUNDERS[number] }) {
  const { t } = useTranslation()
  const [err, setErr] = useState(false)
  return (
    <Card>
      <View style={s.founderRow}>
        {!err
          ? <Image source={{ uri: f.photo }} style={s.photo} onError={() => setErr(true)} />
          : <View style={[s.photo, s.photoFallback]}><Text style={s.initial}>{f.name[0]}</Text></View>}
        <View style={s.founderText}>
          <Text style={s.founderName}>{f.name}</Text>
          <Text style={s.founderRole}>{t(f.roleKey)}</Text>
          <TouchableOpacity style={s.linkedinRow} hitSlop={8} onPress={() => Linking.openURL(f.linkedin)}>
            <Linkedin size={12} color={colors.info} />
            <Text style={s.linkedin}>LinkedIn</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={s.bio}>{t(f.bioKey)}</Text>
    </Card>
  )
}

export default function AboutScreen() {
  const { t } = useTranslation()
  return (
    <Screen title={t('about.title')} back>
      <View style={s.hero}>
        <Text style={s.heroText}>{t('about.hero')}</Text>
      </View>

      <Text style={s.section}>{t('about.mission.title')}</Text>
      {MISSION.map(k => (
        <Card key={k}>
          <Text style={s.cardTitle}>{t(`about.mission.${k}.title`)}</Text>
          <Text style={s.cardText}>{t(`about.mission.${k}.text`)}</Text>
        </Card>
      ))}

      <Text style={s.section}>{t('about.founders.title')}</Text>
      <Text style={s.sectionSub}>{t('about.founders.subtitle')}</Text>
      {FOUNDERS.map(f => <Founder key={f.name} f={f} />)}

      <Text style={s.section}>{t('about.services.title')}</Text>
      <Text style={s.sectionSub}>{t('about.services.subtitle')}</Text>
      {SERVICES.map(({ Icon, key, tint }) => {
        const c = tintOf(tint)
        return (
          <Card key={key}>
            <View style={s.serviceRow}>
              <View style={[s.serviceIcon, { backgroundColor: c.bg }]}>
                <Icon size={icon.md} color={c.fg} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.cardTitle}>{t(`about.services.items.${key}.title`)}</Text>
                <Text style={s.cardText}>{t(`about.services.items.${key}.desc`)}</Text>
              </View>
            </View>
          </Card>
        )
      })}
    </Screen>
  )
}

const s = StyleSheet.create({
  hero: { backgroundColor: colors.navy, borderRadius: radius.lg, padding: space.xl, marginBottom: space.lg },
  heroText: { ...type.body, color: colors.textOnDark, textAlign: 'center' },
  section: { ...type.section, color: colors.text, fontWeight: weight.bold, marginTop: space.lg, marginBottom: space.xs },
  sectionSub: { ...type.caption, color: colors.textMuted, marginBottom: space.md },
  cardTitle: { ...type.body, color: colors.text, fontWeight: weight.bold },
  cardText: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  founderRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm },
  photo: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceAlt },
  photoFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandLight },
  initial: { ...type.title, color: colors.brand, fontWeight: weight.bold },
  founderText: { flex: 1, minWidth: 0 },
  founderName: { ...type.emphasis, color: colors.text, fontWeight: weight.bold },
  founderRole: { ...type.caption, color: colors.brand, fontWeight: weight.semibold },
  linkedinRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, alignSelf: 'flex-start' },
  linkedin: { ...type.caption, color: colors.info, fontWeight: weight.semibold },
  bio: { ...type.caption, color: colors.textMuted },
  serviceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  serviceIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
})
