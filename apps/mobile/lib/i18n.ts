import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as Localization from 'expo-localization'
import * as SecureStore from 'expo-secure-store'

import el from '../locales/el.json'
import en from '../locales/en.json'
import es from '../locales/es.json'

const LANGUAGE_KEY = 'globipet_language'

export const SUPPORTED_LANGUAGES = [
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
]

export async function initI18n() {
  let savedLang: string | null = null
  try {
    savedLang = await SecureStore.getItemAsync(LANGUAGE_KEY)
  } catch {}

  if (!savedLang) {
    const deviceLang = Localization.getLocales()[0]?.languageCode || 'el'
    savedLang = ['el', 'en', 'es'].includes(deviceLang) ? deviceLang : 'el'
  }

  await i18n.use(initReactI18next).init({
    resources: { el: { translation: el }, en: { translation: en }, es: { translation: es } },
    lng: savedLang,
    fallbackLng: 'el',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  })
  return i18n
}

export async function changeLanguage(lang: string) {
  try {
    await SecureStore.setItemAsync(LANGUAGE_KEY, lang)
  } catch {}
  await i18n.changeLanguage(lang)
}

export default i18n
