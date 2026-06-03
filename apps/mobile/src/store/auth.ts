import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { api } from '../lib/api'

interface User {
  id: string
  email: string
  full_name: string
  role: string
  profile_photo?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: any) => Promise<void>
  logout: () => Promise<void>
  loadToken: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,

  loadToken: async () => {
    try {
      const token = await SecureStore.getItemAsync('token')
      const userStr = await SecureStore.getItemAsync('user')
      if (token && userStr) {
        const user = JSON.parse(userStr)
        set({ token, user, isAuthenticated: true })
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      }
    } catch {}
  },

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const { data } = await api.post('/auth/login', { email, password })
      await SecureStore.setItemAsync('token', data.token)
      await SecureStore.setItemAsync('user', JSON.stringify(data.user))
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false })
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  register: async (data) => {
    set({ isLoading: true })
    try {
      const { data: res } = await api.post('/auth/register', data)
      await SecureStore.setItemAsync('token', res.token)
      await SecureStore.setItemAsync('user', JSON.stringify(res.user))
      api.defaults.headers.common['Authorization'] = `Bearer ${res.token}`
      set({ user: res.user, token: res.token, isAuthenticated: true, isLoading: false })
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('token')
    await SecureStore.deleteItemAsync('user')
    delete api.defaults.headers.common['Authorization']
    set({ user: null, token: null, isAuthenticated: false })
  },
}))
