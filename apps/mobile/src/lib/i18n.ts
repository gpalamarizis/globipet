import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as Localization from 'expo-localization'

const el = {
  home: { title: 'GlobiPet', subtitle: 'Η #1 πλατφόρμα για κατοικίδια' },
  nav: { home: 'Αρχική', services: 'Υπηρεσίες', shop: 'Κατάστημα', social: 'Social', profile: 'Προφίλ' },
  auth: { login: 'Σύνδεση', register: 'Εγγραφή', email: 'Email', password: 'Κωδικός', logout: 'Αποσύνδεση' },
}

const en = {
  home: { title: 'GlobiPet', subtitle: 'The #1 pet platform' },
  nav: { home: 'Home', services: 'Services', shop: 'Shop', social: 'Social', profile: 'Profile' },
  auth: { login: 'Login', register: 'Register', email: 'Email', password: 'Password', logout: 'Logout' },
}

const locale = Localization.getLocales()[0]?.languageCode || 'el'

i18n.use(initReactI18next).init({
  resources: { el: { translation: el }, en: { translation: en } },
  lng: locale,
  fallbackLng: 'el',
  interpolation: { escapeValue: false },
})

export default i18n
