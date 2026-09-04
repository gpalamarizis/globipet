import axios from 'axios'
import toast from 'react-hot-toast'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// A production build that fell back to localhost talks to nothing. Say so in
// the console rather than letting every request fail with a network error.
if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.error('[api] VITE_API_URL is not set — falling back to localhost, which will not work in production.')
}

/**
 * Endpoints where a 401 is an expected answer rather than a dead session.
 * Signing out on these would wipe a perfectly good session because someone
 * mistyped a password.
 */
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/reset-password', '/auth/forgot-password']

// Request interceptor — attach token
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('globipet-auth')
    if (stored) {
      const { state } = JSON.parse(stored)
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`
      }
    }
  } catch {
    // Corrupted storage should not take every request down with it. The
    // request goes out unauthenticated and the 401 handler cleans up.
  }
  return config
})

// Response interceptor — handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const message = error.response?.data?.message || 'Κάτι πήγε στραβά'
    const url: string = error.config?.url || ''

    if (status === 401 && !AUTH_ENDPOINTS.some(p => url.includes(p))) {
      localStorage.removeItem('globipet-auth')
      // Only navigate if we are not already on the login page, so a failed
      // background request cannot trap the user in a redirect loop.
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    } else if (status === 429) {
      toast.error('Πάρα πολλά αιτήματα. Δοκιμάστε σε λίγο.')
    }
    // Don't show global toast for 500 errors - let components handle them

    /**
     * The rejection carries the message twice.
     *
     * `message` is the shape this file has always produced. But roughly
     * thirty-five components were written against plain axios and read
     * `err.response.data.message` — which this interceptor had already thrown
     * away, so every one of them fell through to its generic fallback text.
     * Users saw "Σφάλμα" instead of "Έχεις ήδη ενεργή συνδρομή".
     *
     * Carrying both shapes fixes all of those call sites at once and lets new
     * code use the flat `err.message`.
     */
    return Promise.reject({
      message,
      statusCode: status,
      errors: error.response?.data?.errors,
      response: { status, data: error.response?.data },
    })
  }
)

/**
 * Upload a file to Cloudflare R2 through the backend.
 *
 * The Content-Type header is deliberately NOT set. A multipart request needs
 * a boundary marker — `multipart/form-data; boundary=----WebKitFormBoundary…`
 * — and the browser generates it when it serialises the FormData. Setting the
 * header by hand replaces that with a boundary-less value, and the server
 * cannot split the body into parts.
 *
 * The instance default of application/json also has to be cleared, otherwise
 * axios sends that instead.
 */
export async function uploadFile(file: File, folder = 'general'): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post(`/upload?folder=${encodeURIComponent(folder)}`, formData, {
    headers: { 'Content-Type': undefined as any },
  })
  return data.url
}
