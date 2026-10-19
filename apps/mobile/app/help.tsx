import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { Mail, MessageSquare, BookOpen, ChevronRight, Info } from 'lucide-react-native'
import { Screen, Card } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Βοήθεια — αντίστοιχη του globipet.com/help.
 *
 * Κανάλια: email υποστήριξης, φόρμα επικοινωνίας, συχνές ερωτήσεις, «ποιοι
 * είμαστε». Το «Live Chat» του web οδηγούσε στο «#» (δεν υπάρχει υπηρεσία)
 * και το τηλέφωνο είναι placeholder — δεν μεταφέρθηκαν.
 */
const TOPICS = [
  { title: 'help.topicAccount', items: ['help.topicAccount1', 'help.topicAccount2', 'help.topicAccount3'] },
  { title: 'help.topicBookings', items: ['help.topicBookings1', 'help.topicBookings2', 'help.topicBookings3'] },
  { title: 'help.topicPayments', items: ['help.topicPayments1', 'help.topicPayments2', 'help.topicPayments3'] },
  { title: 'help.topicProviders', items: ['help.topicProviders1', 'help.topicProviders2', 'help.topicProviders3'] },
]

export default function HelpScreen() {
  const { t } = useTranslation()
  const router = useRouter()

  const channels = [
    { key: 'email', Icon: Mail, title: t('help.email'), desc: 'support@globipet.com', onPress: () => Linking.openURL('mailto:support@globipet.com') },
    { key: 'form', Icon: MessageSquare, title: t('account.contactForm'), desc: t('account.contactFormDesc'), onPress: () => router.push('/contact' as any) },
    { key: 'faq', Icon: BookOpen, title: t('help.faq'), desc: t('help.faqDesc'), onPress: () => router.push('/faq' as any) },
    { key: 'about', Icon: Info, title: t('about.title'), desc: 'globipet.com', onPress: () => router.push('/about' as any) },
  ]

  return (
    <Screen title={t('account.menuHelp')} back>
      <Text style={s.intro}>{t('help.subtitle')}</Text>

      <Text style={s.section}>{t('help.contactChannels')}</Text>
      {channels.map(({ key, Icon, title, desc, onPress }) => (
        <TouchableOpacity key={key} activeOpacity={0.7} style={s.row} onPress={onPress}>
          <View style={s.rowIcon}><Icon size={icon.md} color={colors.brand} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.rowTitle}>{title}</Text>
            <Text style={s.rowDesc} numberOfLines={1}>{desc}</Text>
          </View>
          <ChevronRight size={icon.sm} color={colors.textLight} />
        </TouchableOpacity>
      ))}

      <Text style={s.section}>{t('help.popularTopics')}</Text>
      {TOPICS.map(topic => (
        <Card key={topic.title}>
          <Text style={s.topicTitle}>{t(topic.title)}</Text>
          {topic.items.map(k => (
            <TouchableOpacity key={k} style={s.topicItem} onPress={() => router.push('/faq' as any)}>
              <ChevronRight size={12} color={colors.brand} />
              <Text style={s.topicText}>{t(k)}</Text>
            </TouchableOpacity>
          ))}
        </Card>
      ))}
    </Screen>
  )
}

const s = StyleSheet.create({
  intro: { ...type.body, color: colors.textMuted, marginBottom: space.md },
  section: { ...type.emphasis, color: colors.text, fontWeight: weight.bold, marginTop: space.md, marginBottom: space.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    padding: space.md, marginBottom: space.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  rowIcon: {
    width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.brandTint,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  rowDesc: { ...type.caption, color: colors.textMuted },
  topicTitle: { ...type.body, color: colors.text, fontWeight: weight.bold, marginBottom: space.sm },
  topicItem: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 36 },
  topicText: { ...type.body, color: colors.textMuted, flex: 1 },
})
