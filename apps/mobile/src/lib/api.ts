import axios from 'axios'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://globipetbackend-production.up.railway.app/api'

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  res => res,
  err => {
    console.error('API Error:', err.response?.status, err.response?.data)
    return Promise.reject(err)
  }
)
