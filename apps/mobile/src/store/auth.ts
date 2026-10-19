import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import i18n from 'i18next'
import { api, setAuthToken } from '../lib/api'
import { registerPushToken, unregisterPushToken } from '../lib/notifications'
import { signInWithGoogle } from '../lib/googleAuth'
import { signInWithFacebook, signOutFacebook } from '../lib/facebookAuth'
import { queryClient } from '../lib/queryClient'

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
  loadToken: () => Promise<void>
  /** Συγχώνευση στοιχείων μετά από επεξεργασία προφίλ — και στη μνήμη και στο SecureStore, όπως το updateUser του web. */
  updateUser: (patch: Partial<User>) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,

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

      const { data } = await api.post('/auth/google/mobile', {
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

  logout: async () => {
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
  },
}))
