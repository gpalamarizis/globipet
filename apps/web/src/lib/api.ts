import axios from 'axios'
import toast from 'react-hot-toast'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor — attach token
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('globipet-auth')
  if (stored) {
    const { state } = JSON.parse(stored)
    if (state?.token) {
      config.headers.Authorization = `Bearer ${state.token}`
    }
  }
  return config
})

// Response interceptor — handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const message = error.response?.data?.message || 'Κάτι πήγε στραβά'

    if (status === 401) {
      localStorage.removeItem('globipet-auth')
      window.location.href = '/login'
    } else if (status === 429) {
      toast.error('Πάρα πολλά αιτήματα. Δοκιμάστε σε λίγο.')
    }
    // Don't show global toast for 500 errors - let components handle them

    return Promise.reject({ message, statusCode: status, errors: error.response?.data?.errors })
  }
)

// Upload helper for files → Cloudflare R2
export async function uploadFile(file: File, folder = 'general'): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', folder)
  const { data } = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.url
}
