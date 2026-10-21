import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, setTokenRotationHandler } from '@/lib/api'
import i18n from '@/lib/i18n'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  updateUser: (data: Partial<User>) => void
  setAuth: (user: User, token: string) => void
  refreshToken: () => Promise<void>
  refreshUser: () => Promise<void>
  updateLanguage: (lang: string) => Promise<void>
  /** Ε12: νέο email επιβεβαίωσης (POST /auth/resend-verification). */
  resendVerification: () => Promise<{ message?: string; email_verified?: boolean }>
}

/**
 * Ε12: `email_verified` έρχεται από τον server (login, register, /auth/me).
 * Μόνο το ρητό `false` σημαίνει ανεπιβεβαίωτο: ένας χρήστης αποθηκευμένος από
 * παλιότερη έκδοση (χωρίς το πεδίο) δεν βλέπει μπάρα μέχρι το επόμενο /auth/me.
 */
export function isEmailUnverified(user: User | null | undefined): boolean {
  return (user as any)?.email_verified === false
}

interface RegisterData {
  full_name: string
  email: string
  password: string
  role?: 'user' | 'service_provider' | 'both'
  preferred_language?: string
  /**
   * Ημερομηνία γέννησης σε μορφή YYYY-MM-DD.
   *
   * Υποχρεωτική στην πράξη: ο διακομιστής απορρίπτει την εγγραφή χωρίς αυτήν
   * και για κάθε ηλικία κάτω των 15, που είναι το όριο συγκατάθεσης ανηλίκου
   * στην Ελλάδα. Δηλώνεται προαιρετική εδώ ώστε να μη σπάσουν τυχόν άλλοι
   * καλούντες — ο έλεγχος είναι ούτως ή άλλως στο backend.
   */
  birth_date?: string
  /** Ρητή αποδοχή Όρων και Πολιτικής Απορρήτου — ο server την απαιτεί. */
  terms_accepted?: boolean
}

// Sync user's preferred language with i18n
function applyUserLanguage(user: User | null) {
  if (user?.preferred_language) {
    const supported = ['el', 'en', 'es', 'fr', 'zh']
    if (supported.includes(user.preferred_language) && i18n.language !== user.preferred_language) {
      i18n.changeLanguage(user.preferred_language)
      localStorage.setItem('globipet_language', user.preferred_language)
    }
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (user, token) => {
        set({ user, token, isAuthenticated: true })
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        applyUserLanguage(user)
      },

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const { data } = await api.post('/auth/login', { email, password })
          set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false })
          api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
          applyUserLanguage(data.user)
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      register: async (data) => {
        set({ isLoading: true })
        try {
          // Send current language as preferred_language on registration
          const currentLang = i18n.language || localStorage.getItem('globipet_language') || 'el'
          const { data: res } = await api.post('/auth/register', {
            ...data,
            preferred_language: data.preferred_language || currentLang,
          })
          set({ user: res.user, token: res.token, isAuthenticated: true, isLoading: false })
          api.defaults.headers.common['Authorization'] = `Bearer ${res.token}`
          applyUserLanguage(res.user)
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false })
        delete api.defaults.headers.common['Authorization']
        window.location.href = '/'
      },

      updateUser: (data) => {
        const current = get().user
        if (current) set({ user: { ...current, ...data } })
      },

      updateLanguage: async (lang) => {
        const current = get().user
        if (!current) return
        // Optimistic update locally
        set({ user: { ...current, preferred_language: lang } })
        i18n.changeLanguage(lang)
        localStorage.setItem('globipet_language', lang)
        // Persist on backend
        try {
          await api.patch('/auth/me', { preferred_language: lang })
        } catch (err) {
          console.error('Failed to save language preference:', err)
        }
      },

      refreshToken: async () => {
        try {
          const { data } = await api.post('/auth/refresh')
          set({ token: data.token })
          api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
        } catch {
          get().logout()
        }
      },

      resendVerification: async () => {
        const { data } = await api.post('/auth/resend-verification')
        if (data?.email_verified === true) {
          const current = get().user
          if (current) set({ user: { ...current, email_verified: true } as User })
        }
        return data
      },

      /**
       * Pull the latest user record from the backend and replace the cached
       * one. Used at app boot / MainLayout mount so users who logged in before
       * a backfill (e.g. profile_photo from Google OAuth added later) see the
       * fresh data without needing to log out and back in.
       *
       * Silent on failure — the cached user stays as-is.
       */
      refreshUser: async () => {
        const { token } = get()
        if (!token) return
        try {
          const { data } = await api.get('/auth/me')
          if (data) {
            set({ user: data })
            applyUserLanguage(data)
          }
        } catch {
          /* keep cached user */
        }
      },
    }),
    {
      name: 'globipet-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
        }
        if (state?.user) {
          applyUserLanguage(state.user)
        }
      },
    }
  )
)

// Ε12: όταν ο server ανακυκλώνει το τοκεν (αλλαγή κωδικού), η συνεδρία το παίρνει αμέσως.
setTokenRotationHandler((token) => {
  useAuthStore.setState({ token })
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`
})
