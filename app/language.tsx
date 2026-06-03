import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, changeLanguage } from '../lib/i18n'

export default function LanguageScreen() {
  const router = useRouter()
  const { t, i18n } = useTranslation()
  const currentLang = i18n.language

  const handleSelect = async (code: string) => {
    await changeLanguage(code)
    router.back()
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={s.back}>← {t('common.back')}</Text>
        </Pressable>
        <Text style={s.title}>{t('language.title')}</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={s.subtitle}>{t('language.subtitle')}</Text>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <Pressable
            key={lang.code}
            onPress={() => handleSelect(lang.code)}
            style={[s.langCard, currentLang === lang.code && s.langCardActive]}
          >
            <Text style={s.flag}>{lang.flag}</Text>
            <Text style={[s.langName, currentLang === lang.code && s.langNameActive]}>{lang.name}</Text>
            {currentLang === lang.code && <Text style={s.check}>✓</Text>}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  back: { color: '#E65100', fontSize: 15, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  subtitle: { color: '#6B7280', fontSize: 14, marginBottom: 16 },
  langCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 2, borderColor: 'transparent' },
  langCardActive: { borderColor: '#E65100', backgroundColor: '#FFF7ED' },
  flag: { fontSize: 28, marginRight: 12 },
  langName: { flex: 1, fontSize: 16, fontWeight: '500', color: '#111827' },
  langNameActive: { color: '#E65100', fontWeight: '700' },
  check: { fontSize: 22, color: '#E65100', fontWeight: '700' },
})
