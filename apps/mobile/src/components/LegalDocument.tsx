import { View, Text, StyleSheet, Linking } from 'react-native'
import { useTranslation } from 'react-i18next'
import { getLegalDoc, LEGAL_UPDATED } from '@/lib/legal'
import { Screen, Card } from '@/components/ui'
import { colors, space, type, weight } from '@/theme'

/**
 * Νομικό κείμενο — Όροι Χρήσης ή Πολιτική Απορρήτου.
 *
 * Το ΙΔΙΟ κείμενο με το web (src/lib/legal.ts, αντίγραφο του
 * apps/web/src/lib/legal.ts). Το Google Play και το App Store απαιτούν η
 * πολιτική απορρήτου να είναι προσβάσιμη μέσα από την εφαρμογή, και ο
 * χρήστης πρέπει να μπορεί να διαβάσει ό,τι αποδέχεται στην εγγραφή.
 *
 * Ελληνικά και αγγλικά· οι άλλες γλώσσες πέφτουν στα αγγλικά, όπως στο web
 * (νομικό κείμενο δεν μεταφράζεται μηχανικά).
 */
export default function LegalDocument({ kind }: { kind: 'terms' | 'privacy' }) {
  const { t, i18n } = useTranslation()
  const doc = getLegalDoc(kind, i18n.language)
  const updated = new Date(LEGAL_UPDATED).toLocaleDateString(i18n.language || 'el')

  return (
    <Screen title={doc.title} back>
      <Text style={s.updated}>{t('legalDocs.lastUpdated')}: {updated}</Text>

      <Card>
        <Text style={s.intro}>{doc.intro}</Text>
      </Card>

      {doc.sections.map((sec, i) => (
        <Card key={i}>
          <Text style={s.heading}>{sec.title}</Text>
          <Text style={s.body}>{sec.body}</Text>
        </Card>
      ))}

      <View style={s.contactRow}>
        <Text style={s.contact}>{t('legalDocs.contact')} </Text>
        <Text style={s.mail} onPress={() => Linking.openURL('mailto:legal@globipet.com')}>
          legal@globipet.com
        </Text>
      </View>
    </Screen>
  )
}

const s = StyleSheet.create({
  updated: { ...type.caption, color: colors.textLight, marginBottom: space.md },
  intro: { ...type.body, color: colors.textMuted },
  heading: { ...type.emphasis, color: colors.text, fontWeight: weight.bold, marginBottom: space.sm },
  body: { ...type.body, color: colors.textMuted },
  contactRow: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'baseline',
    marginTop: space.md, marginBottom: space.lg,
  },
  contact: { ...type.caption, color: colors.textLight },
  mail: { ...type.caption, color: colors.brand, fontWeight: weight.semibold },
})
