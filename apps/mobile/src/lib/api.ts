import axios from 'axios'

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api',
  timeout: 15000,
})

api.interceptors.request.use(async (config) => {
  try {
    const SecureStore = require('expo-secure-store')
    const token = await SecureStore.getItemAsync('globipet_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {}
  return config
})
