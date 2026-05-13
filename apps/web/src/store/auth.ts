import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'
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
  updateLanguage: (lang: string) => Promise<void>
}

interface RegisterData {
  full_name: string
  email: string
  password: string
  role?: 'user' | 'service_provider' | 'both'
  preferred_language?: string
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
