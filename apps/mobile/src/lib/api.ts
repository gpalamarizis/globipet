import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import i18n from 'i18next'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://globipetbackend-production.up.railway.app/api'

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

/**
 * ΤΟ ΤΟΚΕΝ ΔΕΝ ΜΠΑΙΝΕΙ ΠΙΑ ΣΤΑ api.defaults
 *
 *   Πριν, το Authorization γραφόταν στα defaults του axios μέσα στο
 *   loadToken(), και το loadToken() καλούνταν μόνο από την Αρχική. Κάθε
 *   άνοιγμα που ΔΕΝ περνούσε πρώτα από την Αρχική — deep link, ειδοποίηση,
 *   επαναφορά της εφαρμογής σε άλλο tab — έστελνε τα πρώτα αιτήματα χωρίς
 *   κεφαλίδα. Η απάντηση ήταν 401 και ο χρήστης έβλεπε άδεια εφαρμογή ενώ
 *   ήταν κανονικά συνδεδεμένος.
 *
 *   Τώρα το τοκεν ζει εδώ, και ο request interceptor το βάζει σε κάθε
 *   αίτημα. Αν δεν έχει διαβαστεί ακόμα από το SecureStore, το πρώτο
 *   αίτημα ΠΕΡΙΜΕΝΕΙ την ανάγνωση αντί να φύγει γυμνό. Έτσι η σειρά με
 *   την οποία ανοίγουν οι οθόνες παύει να έχει σημασία.
 */
let authToken: string | null = null

/** Η ανάγνωση από το SecureStore γίνεται μία φορά και μοιράζεται. */
let tokenRead: Promise<string | null> | null = null

function readStoredToken(): Promise<string | null> {
  if (!tokenRead) {
    tokenRead = SecureStore.getItemAsync('token')
      .then(t => { authToken = t; return t })
      .catch(() => null)
  }
  return tokenRead
}

/**
 * Ενημερώνει το τοκεν μετά από σύνδεση, εγγραφή ή αποσύνδεση.
 * Το `null` σημαίνει αποσύνδεση και σταματά κάθε επόμενη ανάγνωση δίσκου.
 */
export function setAuthToken(token: string | null) {
  authToken = token
  tokenRead = Promise.resolve(token)
  // Νέα συνεδρία (σύνδεση/ανακύκλωση): ένα επόμενο 401 ξαναχειρίζεται κανονικά.
  if (token) sessionExpiring = false
}

/**
 * Ε16 — ΛΗΞΗ ΣΥΝΕΔΡΙΑΣ (401) ΚΑΙ ΠΥΛΗ ΗΜΕΡΟΜΗΝΙΑΣ ΓΕΝΝΗΣΗΣ (403)
 *
 *   Πριν, ένα 401 (ληγμένο/ανακλημένο τοκεν, «αποσύνδεση από όλες τις
 *   συσκευές») δεν άλλαζε τίποτα: η εφαρμογή έμενε «συνδεδεμένη» και κάθε
 *   οθόνη έβγαζε σφάλμα. Τώρα, όπως στο web/src/lib/api.ts: αποσύνδεση και
 *   οθόνη σύνδεσης — ΜΙΑ φορά, όσα αιτήματα κι αν αποτύχουν μαζί.
 *
 *   Οι χειριστές δηλώνονται από το store/auth.ts (χωρίς import του store
 *   εδώ — κυκλική εξάρτηση).
 */
const PUBLIC_AUTH_ENDPOINTS = [
  '/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password',
  '/auth/verify-email', '/auth/google', '/auth/facebook',
]
let sessionExpiring = false
/** Όσο τρέχει μια αποσύνδεση (π.χ. κλειστός λογαριασμός), τα 401 της είναι αναμενόμενα. */
let loggingOut = false
export function setLoggingOut(on: boolean) { loggingOut = on }

let onSessionExpired: (() => void) | null = null
let onBirthDateRequired: (() => void) | null = null
export function setSessionHandlers(h: { expired: () => void; birthDateRequired: () => void }) {
  onSessionExpired = h.expired
  onBirthDateRequired = h.birthDateRequired
}

function handleAuthError(err: any) {
  const status = err?.response?.status
  if (status !== 401 && status !== 403) return
  const url: string = err?.config?.url || ''
  if (PUBLIC_AUTH_ENDPOINTS.some(p => url.includes(p))) return
  const sent = String((err?.config?.headers as any)?.Authorization || '')
  // Μόνο αιτήματα που έφυγαν με το ΤΡΕΧΟΝ τοκεν: ένα αργό αίτημα της
  // προηγούμενης συνεδρίας δεν αποσυνδέει αυτή που μόλις ξεκίνησε.
  if (!authToken || sent !== `Bearer ${authToken}`) return
  if (status === 401) {
    if (loggingOut || sessionExpiring) return
    sessionExpiring = true
    onSessionExpired?.()
    return
  }
  if ((err?.response?.data as any)?.code === 'birth_date_required') onBirthDateRequired?.()
}

api.interceptors.request.use(async config => {
  const token = authToken ?? await readStoredToken()
  if (token) (config.headers as any).Authorization = `Bearer ${token}`
  // Η γλώσσα της εφαρμογής, ώστε το backend να επιστρέφει μεταφρασμένα
  // δεδομένα σε αυτήν (getRequestLang: ?lang → preferred_language →
  // Accept-Language) — όπως το web/src/lib/api.ts.
  const lang = (i18n.resolvedLanguage || i18n.language || '').slice(0, 2).toLowerCase()
  if (/^[a-z]{2}$/.test(lang)) (config.headers as any)['Accept-Language'] = lang
  return config
})

/**
 * Ε12 — νέο τοκεν από τον server, όπως στο web/src/lib/api.ts.
 *
 * Η αλλαγή κωδικού (POST /users/me/password) ακυρώνει όλα τα παλιά τοκεν
 * (token_version+1) και επιστρέφει νέο για αυτή τη συσκευή. Το παίρνουμε
 * εδώ, σε μνήμη και SecureStore· το store/auth.ts ενημερώνεται μέσω του
 * χειριστή (χωρίς import του store εδώ — κυκλική εξάρτηση).
 */
const TOKEN_ROTATING_ENDPOINTS = ['/users/me/password']
let onTokenRotated: ((token: string) => void) | null = null
export function setTokenRotationHandler(fn: (token: string) => void) { onTokenRotated = fn }

api.interceptors.response.use(
  res => {
    const url: string = res.config?.url || ''
    const token = (res.data as any)?.token
    if (typeof token === 'string' && token && TOKEN_ROTATING_ENDPOINTS.some(p => url.includes(p))) {
      setAuthToken(token)
      SecureStore.setItemAsync('token', token).catch(() => {})
      onTokenRotated?.(token)
    }
    return res
  },
  err => {
    // Μόνο στην ανάπτυξη: σε production τα σφάλματα δικτύου του χρήστη δεν
    // έχουν λόγο να γράφονται στα logs της συσκευής του.
    if (__DEV__) console.error('API Error:', err.response?.status, err.response?.data)
    try { handleAuthError(err) } catch {}
    return Promise.reject(err)
  }
)
