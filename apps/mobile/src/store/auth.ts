import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { api, setAuthToken } from '../lib/api'
import { signInWithGoogle } from '../lib/googleAuth'
import { signInWithFacebook, signOutFacebook } from '../lib/facebookAuth'

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
  loginWithGoogle: () => Promise<boolean>
  loginWithFacebook: () => Promise<boolean>
  register: (data: any) => Promise<void>
  logout: () => Promise<void>
  loadToken: () => Promise<void>
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
      const { data: res } = await api.post('/auth/register', data)
      await SecureStore.setItemAsync('token', res.token)
      await SecureStore.setItemAsync('user', JSON.stringify(res.user))
      setAuthToken(res.token)
      set({ user: res.user, token: res.token, isAuthenticated: true, isLoading: false })
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('token')
    await SecureStore.deleteItemAsync('user')
    setAuthToken(null)
    set({ user: null, token: null, isAuthenticated: false })
    // Best-effort sign-out from Facebook so the next login prompts again
    signOutFacebook().catch(() => {})
  },
}))
