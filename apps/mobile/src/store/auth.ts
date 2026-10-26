import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import i18n from 'i18next'
import { api, setAuthToken, setTokenRotationHandler, setSessionHandlers, setLoggingOut } from '../lib/api'
import { registerPushToken, unregisterPushToken } from '../lib/notifications'
import { signInWithGoogle } from '../lib/googleAuth'
import { signInWithFacebook, signOutFacebook } from '../lib/facebookAuth'
import { queryClient } from '../lib/queryClient'
import { changeLanguage } from '../../lib/i18n'

const SUPPORTED_LANGS = ['el', 'en', 'es', 'fr', 'zh']

/**
 * Μετά τη σύνδεση: αν ο χρήστης έχει διαλέξει ρητά γλώσσα σε αυτή τη συσκευή
 * (globipet_language), αυτή κερδίζει και αποθηκεύεται στον λογαριασμό — οι
 * παλιές εκδόσεις άλλαζαν γλώσσα μόνο τοπικά, οπότε ο server μπορεί να έχει
 * ακόμα την προεπιλογή «el». Αλλιώς η εφαρμογή παίρνει τη γλώσσα του server.
 */
async function applyUserLanguage(user: User | null) {
  const lang = user?.preferred_language
  let saved: string | null = null
  try { saved = await SecureStore.getItemAsync('globipet_language') } catch {}
  if (saved && SUPPORTED_LANGS.includes(saved)) {
    if (saved !== lang) api.patch('/auth/me', { preferred_language: saved }).catch(() => {})
    return
  }
  if (lang && SUPPORTED_LANGS.includes(lang) && i18n.language !== lang) {
    void changeLanguage(lang)
  }
}

interface User {
  id: string
  email: string
  full_name: string
  role: string
  profile_photo?: string
  // Πεδία προφίλ που επιστρέφει ήδη ο server (/auth/login, /users/me) και
  // επεξεργάζεται το web: χωρίς αυτά το κινητό δεν μπορούσε να δείξει ή να
  // αλλάξει πόλη, τηλέφωνο, βιογραφικό και ιστοσελίδα.
  phone?: string | null
  city?: string | null
  bio?: string | null
  website?: string | null
  google_id?: string | null
  preferred_language?: string | null
  /** Ε12: false = το email δεν έχει επιβεβαιωθεί ακόμα (μπάρα/οθόνη «Επιβεβαίωσε το email σου»). */
  email_verified?: boolean
  /** Ε13/Ε16: true = λείπει η ημερομηνία γέννησης (πύλη auth/birth-date στο app/_layout.tsx). */
  needs_birth_date?: boolean
}

/**
 * Ε12: μόνο το ρητό `false` σημαίνει ανεπιβεβαίωτο. Ένας χρήστης
 * αποθηκευμένος από παλιότερη έκδοση (χωρίς το πεδίο) δεν θεωρείται.
 */
export function isEmailUnverified(user: { email_verified?: boolean } | null | undefined): boolean {
  return user?.email_verified === false
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<boolean>
  loginWithFacebook: () => Promise<boolean>
  register: (data: any) => Promise<void>
  logout: () => Promise<void>
  /**
   * Ε16: διαδρομή που θα ανοίξει το app/_layout.tsx μόλις υπάρχει navigator
   * (π.χ. '/auth/login' μετά από λήξη συνεδρίας). Την καθαρίζει το ίδιο.
   */
  pendingRedirect: string | null
  clearPendingRedirect: () => void
  loadToken: () => Promise<void>
  /** Συγχώνευση στοιχείων μετά από επεξεργασία προφίλ — και στη μνήμη και στο SecureStore, όπως το updateUser του web. */
  updateUser: (patch: Partial<User>) => Promise<void>
  /**
   * Αλλαγή γλώσσας από συνδεδεμένο χρήστη, όπως το updateLanguage του web:
   * αλλάζει αμέσως τοπικά και στον user, και αποθηκεύεται στον server
   * (PATCH /auth/me { preferred_language }). Αν ο server αποτύχει, η γλώσσα
   * μένει αλλαγμένη τοπικά.
   */
  updateLanguage: (lang: string) => Promise<void>
  /** Ε12: ξαναδιαβάζει τον χρήστη από το /auth/me (focus, pull-to-refresh). Σιωπηλό σε αποτυχία. */
  refreshUser: () => Promise<void>
  /** Ε12: νέο email επιβεβαίωσης (POST /auth/resend-verification). */
  resendVerification: () => Promise<{ message?: string; email_verified?: boolean }>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  pendingRedirect: null,
  clearPendingRedirect: () => set({ pendingRedirect: null }),

  /**
   * Καλείται μία φορά από το app/_layout.tsx, πριν εμφανιστεί οποιαδήποτε
   * οθόνη. Δεν βάζει πια κεφαλίδα στο axios — αυτό το κάνει ο interceptor
   * του api.ts, ώστε να δουλεύει ακόμα κι αν κάποιο αίτημα προλάβει.
   */
  loadToken: async () => {
    try {
      const token = await SecureStore.getItemAsync('token')
      const userStr = await SecureStore.getItemAsync('user')
      if (token && userStr) {
        const user = JSON.parse(userStr)
        set({ token, user, isAuthenticated: true })
        setAuthToken(token)
      }
    } catch {}
  },

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const { data } = await api.post('/auth/login', { email, password })
      await SecureStore.setItemAsync('token', data.token)
      await SecureStore.setItemAsync('user', JSON.stringify(data.user))
      setAuthToken(data.token)
      void registerPushToken()
      // Καμία cache από προηγούμενο χρήστη/επισκέπτη (βλ. lib/queryClient.ts).
      queryClient.clear()
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false })
      void applyUserLanguage(data.user)
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  // Returns true if signed in, false if user cancelled the Google flow
  loginWithGoogle: async () => {
    set({ isLoading: true })
    try {
      const googleResult = await signInWithGoogle()
      if (!googleResult) {
        set({ isLoading: false })
        return false // user cancelled
      }

      // Ε12: και το id_token — ο server ελέγχει σε αυτό το audience (aud)
      // απέναντι στα δικά μας client IDs. Το access_token μένει για συμβατότητα.
      const { data } = await api.post('/auth/google/mobile', {
        id_token: googleResult.idToken,
        access_token: googleResult.accessToken,
        user: {
          email: googleResult.user.email,
          full_name: googleResult.user.name,
          profile_photo: googleResult.user.photo,
        },
      })

      await SecureStore.setItemAsync('token', data.token)
      await SecureStore.setItemAsync('user', JSON.stringify(data.user))
      setAuthToken(data.token)
      void registerPushToken()
      // Καμία cache από προηγούμενο χρήστη/επισκέπτη (βλ. lib/queryClient.ts).
      queryClient.clear()
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false })
      void applyUserLanguage(data.user)
      return true
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  // Returns true if signed in, false if user cancelled the Facebook flow.
  // Unlike Google, we don't send user data from the client — the backend
  // fetches it fresh from Graph API using the access_token, so a stolen
  // token cannot be paired with a fake email.
  loginWithFacebook: async () => {
    set({ isLoading: true })
    try {
      const fbResult = await signInWithFacebook()
      if (!fbResult) {
        set({ isLoading: false })
        return false // user cancelled
      }

      const { data } = await api.post('/auth/facebook/mobile', {
        access_token: fbResult.accessToken,
      })

      await SecureStore.setItemAsync('token', data.token)
      await SecureStore.setItemAsync('user', JSON.stringify(data.user))
      setAuthToken(data.token)
      void registerPushToken()
      // Καμία cache από προηγούμενο χρήστη/επισκέπτη (βλ. lib/queryClient.ts).
      queryClient.clear()
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false })
      void applyUserLanguage(data.user)
      return true
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  register: async (data) => {
    set({ isLoading: true })
    try {
      // Όπως το web: η τρέχουσα γλώσσα γίνεται preferred_language του
      // λογαριασμού. Χωρίς αυτήν ο server έβαζε 'el' και τα email (π.χ.
      // επαναφορά κωδικού) έφταναν στα ελληνικά σε όποιον γράφτηκε αλλιώς.
      const lang = (i18n.language || 'el').slice(0, 2)
      const { data: res } = await api.post('/auth/register', {
        ...data,
        preferred_language: data?.preferred_language
          || (['el', 'en', 'es', 'fr', 'zh'].includes(lang) ? lang : 'el'),
      })
      await SecureStore.setItemAsync('token', res.token)
      await SecureStore.setItemAsync('user', JSON.stringify(res.user))
      setAuthToken(res.token)
      void registerPushToken()
      queryClient.clear()
      set({ user: res.user, token: res.token, isAuthenticated: true, isLoading: false })
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  updateUser: async (patch) => {
    const current = get().user
    if (!current) return
    const user = { ...current, ...patch }
    set({ user })
    try { await SecureStore.setItemAsync('user', JSON.stringify(user)) } catch {}
  },

  refreshUser: async () => {
    if (!get().token) return
    try {
      const { data } = await api.get('/auth/me')
      if (data && typeof data === 'object' && data.id) await get().updateUser(data)
    } catch { /* μένει ο αποθηκευμένος χρήστης */ }
  },

  resendVerification: async () => {
    const { data } = await api.post('/auth/resend-verification')
    if (data?.email_verified === true) await get().updateUser({ email_verified: true })
    return data
  },

  updateLanguage: async (lang) => {
    await changeLanguage(lang)
    if (!get().user) return
    await get().updateUser({ preferred_language: lang })
    try {
      await api.patch('/auth/me', { preferred_language: lang })
    } catch {
      /* η γλώσσα έχει ήδη αλλάξει τοπικά */
    }
  },

  logout: async () => {
    setLoggingOut(true)
    try {
      // ΠΡΩΤΑ η διαγραφή της συσκευής, όσο το τοκεν ισχύει ακόμα. Αντίστροφα,
      // το αίτημα φεύγει χωρίς ταυτοποίηση και η συσκευή μένει εγγεγραμμένη:
      // ο επόμενος που θα συνδεθεί εδώ θα έπαιρνε τις ειδοποιήσεις του
      // προηγούμενου.
      await unregisterPushToken()
      await SecureStore.deleteItemAsync('token')
      await SecureStore.deleteItemAsync('user')
      setAuthToken(null)
      // Τα δεδομένα του χρήστη φεύγουν μαζί του: αλλιώς ο επόμενος στην ίδια
      // συσκευή τα βλέπει από την cache (βλ. lib/queryClient.ts).
      queryClient.clear()
      set({ user: null, token: null, isAuthenticated: false })
      // Best-effort sign-out from Facebook so the next login prompts again
      signOutFacebook().catch(() => {})
    } finally {
      setLoggingOut(false)
    }
  },
}))

// Ε12: όταν ο server ανακυκλώνει το τοκεν (αλλαγή κωδικού), η συνεδρία το παίρνει αμέσως.
setTokenRotationHandler((token) => {
  useAuthStore.setState({ token })
})

/**
 * Ε16 — χειριστές του api.ts.
 *
 * Λήξη συνεδρίας (401): τοπική αποσύνδεση ΧΩΡΙΣ το DELETE της συσκευής push
 * (με άκυρο τοκεν θα έπαιρνε κι αυτό 401) και οθόνη σύνδεσης. Το api.ts
 * εξασφαλίζει ότι τρέχει μία φορά ανά συνεδρία.
 *
 * Λείπει η ημερομηνία γέννησης (403 birth_date_required): σημαδεύεται ο
 * χρήστης και η ΜΟΝΑΔΙΚΗ πύλη του app/_layout.tsx ανοίγει την auth/birth-date
 * — μία πλοήγηση, χωρίς κύκλο, όσα αιτήματα κι αν πάρουν 403.
 */
setSessionHandlers({
  expired: () => {
    void (async () => {
      setLoggingOut(true)
      try {
        setAuthToken(null)
        try { await SecureStore.deleteItemAsync('token') } catch {}
        try { await SecureStore.deleteItemAsync('user') } catch {}
        queryClient.clear()
        useAuthStore.setState({ user: null, token: null, isAuthenticated: false, pendingRedirect: '/auth/login' })
        signOutFacebook().catch(() => {})
      } finally {
        setLoggingOut(false)
      }
    })()
  },
  birthDateRequired: () => {
    const st = useAuthStore.getState()
    if (!st.isAuthenticated || st.user?.needs_birth_date === true) return
    void st.updateUser({ needs_birth_date: true })
  },
})
