import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react-native'
import { SUPPORTED_LANGUAGES, changeLanguage } from '../lib/i18n'
import { Screen, Card } from '@/components/ui'
import { colors, space, type, weight, icon } from '@/theme'

/**
 * Επιλογή γλώσσας.
 *
 * Η επιλογή εφαρμόζεται αμέσως και η οθόνη κλείνει — δεν υπάρχει κουμπί
 * αποθήκευσης, γιατί δεν υπάρχει τίποτα να επιβεβαιωθεί: το αποτέλεσμα
 * φαίνεται στην ίδια την οθόνη που επιστρέφει.
 */
export default function LanguageScreen() {
  const router = useRouter()
  const { t, i18n } = useTranslation()
  const current = i18n.language

  const select = async (code: string) => {
    await changeLanguage(code)
    router.back()
  }

  return (
    <Screen title={t('language.title')} subtitle={t('language.subtitle')}>
      <View style={{ gap: space.sm }}>
        {SUPPORTED_LANGUAGES.map((lang: any) => {
          const active = current === lang.code
          return (
            <Card key={lang.code} onPress={() => select(lang.code)}
              style={active ? s.active : undefined}>
              <View style={s.row}>
                <Text style={s.flag}>{lang.flag}</Text>
                <Text style={[s.name, active && s.nameActive]}>{lang.name}</Text>
                {active && <Check size={icon.md} color={colors.brand} />}
              </View>
            </Card>
          )
        })}
      </View>
    </Screen>
  )
}

const s = StyleSheet.create({
  active: { borderColor: colors.brand, backgroundColor: colors.brandLight },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flag: { fontSize: 28 },
  name: { flex: 1, ...type.emphasis, color: colors.text, fontWeight: weight.medium },
  nameActive: { color: colors.brand, fontWeight: weight.bold },
})
