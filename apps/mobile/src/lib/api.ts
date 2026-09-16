import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

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
}

api.interceptors.request.use(async config => {
  const token = authToken ?? await readStoredToken()
  if (token) (config.headers as any).Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    // Μόνο στην ανάπτυξη: σε production τα σφάλματα δικτύου του χρήστη δεν
    // έχουν λόγο να γράφονται στα logs της συσκευής του.
    if (__DEV__) console.error('API Error:', err.response?.status, err.response?.data)
    return Promise.reject(err)
  }
)
