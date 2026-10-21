import axios from 'axios'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import i18n from './i18n'

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
  // Η γλώσσα της εφαρμογής, ώστε το backend να επιστρέφει μεταφρασμένα
  // δεδομένα σε αυτήν (getRequestLang: ?lang → preferred_language → Accept-Language).
  const lang = (i18n.resolvedLanguage || i18n.language || '').slice(0, 2).toLowerCase()
  if (/^[a-z]{2}$/.test(lang)) config.headers['Accept-Language'] = lang
  return config
})

/**
 * Ε12 — νέο τοκεν από τον server.
 *
 * Η αλλαγή κωδικού (POST /users/me/password) ακυρώνει ΟΛΑ τα τοκεν που
 * υπήρχαν (token_version+1) και επιστρέφει νέο για αυτή τη συσκευή. Ο
 * χειριστής (store/auth.ts) το βάζει στη συνεδρία· χωρίς αυτό, το επόμενο
 * αίτημα θα έφευγε με το παλιό τοκεν και ο χρήστης θα αποσυνδεόταν.
 */
const TOKEN_ROTATING_ENDPOINTS = ['/users/me/password']
let onTokenRotated: ((token: string) => void) | null = null
export function setTokenRotationHandler(fn: (token: string) => void) { onTokenRotated = fn }

// Response interceptor — handle errors
api.interceptors.response.use(
  (response) => {
    const url: string = response.config?.url || ''
    const token = (response.data as any)?.token
    if (typeof token === 'string' && token && TOKEN_ROTATING_ENDPOINTS.some(p => url.includes(p))) {
      onTokenRotated?.(token)
    }
    return response
  },
  async (error) => {
    const status = error.response?.status
    const message = error.response?.data?.message || i18n.t('apiMsg.generic')
    const url: string = error.config?.url || ''

    if (status === 401 && !AUTH_ENDPOINTS.some(p => url.includes(p))) {
      localStorage.removeItem('globipet-auth')
      // Only navigate if we are not already on the login page, so a failed
      // background request cannot trap the user in a redirect loop.
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    } else if (status === 429 && !error.response?.data?.message) {
      // Γενικό μήνυμα ΜΟΝΟ όταν ο server δεν έστειλε δικό του: αλλιώς η
      // σελίδα δείχνει το μήνυμα του server (π.χ. ημερήσιο όριο AI) και ο
      // χρήστης έβλεπε δύο toasts.
      toast.error(i18n.t('apiMsg.tooMany'))
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
  // Ιδιωτικό αρχείο: ο server δίνει ήδη προσωρινό σύνδεσμο προεπισκόπησης.
  if (data?.private && data.preview_url && data.preview_expires_at) {
    privateCache.set(data.url, { url: data.preview_url, exp: Date.parse(data.preview_expires_at) })
  }
  return data.url
}

/**
 * Ιδιωτικά αρχεία (ιατρικά, εικόνες AI).
 *
 * Το upload στους φακέλους medical / ai-health / stool-urine επιστρέφει
 * αναφορά `r2priv://…` αντί για δημόσιο URL. Για εμφάνιση ζητάμε από το
 * GET /upload/private-url σύνδεσμο που λήγει σε 10 λεπτά και τον κρατάμε
 * μέχρι 30" πριν τη λήξη. Στα endpoints AI η αναφορά στέλνεται ΟΠΩΣ ΕΙΝΑΙ —
 * τη λύνει ο server.
 *
 * `petId`: όταν το αρχείο το βλέπει κτηνίατρος μέσα από το διαβατήριο του ζώου.
 */
const privateCache = new Map<string, { url: string; exp: number }>()
const privatePending = new Map<string, Promise<string | null>>()

export const isPrivateRef = (v: unknown): v is string => typeof v === 'string' && v.startsWith('r2priv://')

export async function getPrivateUrl(ref: string, petId?: string | null): Promise<string | null> {
  if (!isPrivateRef(ref)) return ref || null
  const hit = privateCache.get(ref)
  if (hit && hit.exp - 30_000 > Date.now()) return hit.url
  const k = ref + '|' + (petId || '')
  let p = privatePending.get(k)
  if (!p) {
    p = api.get('/upload/private-url', { params: { ref, ...(petId ? { pet_id: petId } : {}) } })
      .then(({ data }) => {
        if (!data?.url) return null
        privateCache.set(ref, { url: data.url, exp: Date.parse(data.expires_at) || Date.now() + 300_000 })
        return data.url as string
      })
      .catch(() => null)
      .finally(() => { privatePending.delete(k) })
    privatePending.set(k, p)
  }
  return p
}

/** Hook: URL για `<img src>` / `<a href>`. Δημόσιο URL → το ίδιο· `r2priv://` → προσωρινό (ανανεώνεται πριν λήξει). */
export function usePrivateUrl(ref: string | null | undefined, petId?: string | null): string | null {
  const direct = ref && !isPrivateRef(ref) ? ref : null
  const [url, setUrl] = useState<string | null>(() => {
    if (!isPrivateRef(ref)) return null
    const hit = privateCache.get(ref)
    return hit && hit.exp - 30_000 > Date.now() ? hit.url : null
  })
  useEffect(() => {
    if (!isPrivateRef(ref)) { setUrl(null); return }
    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const load = () => getPrivateUrl(ref, petId).then(u => {
      if (!alive) return
      setUrl(u)
      const exp = privateCache.get(ref)?.exp
      if (u && exp) timer = setTimeout(load, Math.max(exp - 30_000 - Date.now(), 5_000))
    })
    load()
    return () => { alive = false; if (timer) clearTimeout(timer) }
  }, [ref, petId])
  return direct ?? url
}
