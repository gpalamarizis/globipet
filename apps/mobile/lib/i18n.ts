import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as Localization from 'expo-localization'
import * as SecureStore from 'expo-secure-store'

import el from '../locales/el.json'
import en from '../locales/en.json'
import es from '../locales/es.json'
import fr from '../locales/fr.json'
import zh from '../locales/zh.json'

const LANGUAGE_KEY = 'globipet_language'

/**
 * Οι γλώσσες που εμφανίζονται στην οθόνη επιλογής.
 *
 * ΠΡΕΠΕΙ να συμφωνούν με τα resources παρακάτω ΚΑΙ με τη λίστα ελέγχου
 * στην initI18n: αν λείπει κάποια από τα τρία, η επιλογή εμφανίζεται
 * αλλά δεν εφαρμόζεται. Πέντε γλώσσες, όπως και στο web.
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
]

export async function initI18n() {
  let savedLang: string | null = null
  try {
    savedLang = await SecureStore.getItemAsync(LANGUAGE_KEY)
  } catch {}

  if (!savedLang) {
    const deviceLang = Localization.getLocales()[0]?.languageCode || 'el'
    savedLang = SUPPORTED_LANGUAGES.some(l => l.code === deviceLang) ? deviceLang : 'el'
  }

  await i18n.use(initReactI18next).init({
    resources: {
      el: { translation: el }, en: { translation: en }, es: { translation: es },
      fr: { translation: fr }, zh: { translation: zh },
    },
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
