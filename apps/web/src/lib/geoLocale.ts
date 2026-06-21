/**
 * Geo-IP based language auto-detection.
 *
 * Uses Cloudflare's free, zero-setup `/cdn-cgi/trace` endpoint — since globipet.com
 * is already proxied through Cloudflare, every request automatically gets this
 * endpoint with the visitor's real country (from their IP), no Worker/Function needed.
 *
 * This replaces browser-language (navigator.language) detection, which only reflects
 * OS/browser settings and is unreliable (e.g. a Greek visitor with an English-locale
 * OS would incorrectly see English nav).
 *
 * A manually-chosen language (saved by LanguageSelector to localStorage) always wins —
 * this only runs for first-time visitors with no stored preference yet.
 */

const COUNTRY_TO_LANG: Record<string, string> = {
  // Greek
  GR: 'el', CY: 'el',
  // Spanish
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es',
  EC: 'es', GT: 'es', CU: 'es', BO: 'es', DO: 'es', HN: 'es', PY: 'es',
  SV: 'es', NI: 'es', CR: 'es', PA: 'es', UY: 'es', PR: 'es',
  // French
  FR: 'fr', BE: 'fr', LU: 'fr', MC: 'fr', CH: 'fr',
  // Chinese
  CN: 'zh', TW: 'zh', HK: 'zh', MO: 'zh',
}

const STORAGE_KEY = 'i18nextLng'

export async function detectAndApplyGeoLanguage(i18nInstance: { changeLanguage: (lng: string) => void }) {
  // Respect any previously saved choice (manual pick or earlier geo-detection) — never override it
  if (typeof window === 'undefined') return
  if (localStorage.getItem(STORAGE_KEY)) return

  try {
    const res = await fetch('/cdn-cgi/trace')
    if (!res.ok) return
    const text = await res.text()
    const match = text.match(/loc=([A-Z]{2})/)
    const country = match?.[1]
    if (!country) return

    const lang = COUNTRY_TO_LANG[country] || 'en'
    i18nInstance.changeLanguage(lang)
  } catch {
    // Network error, local dev (no Cloudflare), etc — silently keep the fallback language
  }
}