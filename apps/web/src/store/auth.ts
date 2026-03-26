import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  updateUser: (data: Partial<User>) => void
  refreshToken: () => Promise<void>
}

interface RegisterData {
  full_name: string
  email: string
  password: string
  role?: 'user' | 'service_provider' | 'both'
  phone?: string
  city?: string
  country?: string
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const { data } = await api.post('/auth/login', { email, password })
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
          })
          api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      loginWithGoogle: async () => {
        window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`
      },

      register: async (data) => {
        set({ isLoading: true })
        try {
          const { data: res } = await api.post('/auth/register', data)
          set({
            user: res.user,
            token: res.token,
            isAuthenticated: true,
            isLoading: false,
          })
          api.defaults.headers.common['Authorization'] = `Bearer ${res.token}`
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
    }
  )
)
