import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Cookie, X, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '@/lib/api'
import { getCookieTexts } from '@/lib/cookieTexts'

/**
 * GDPR-compliant cookie consent banner with granular categories.
 * Persists the user's decision in LocalStorage (STORAGE_KEY) and also
 * records the consent event on the backend via /user-consents.
 */

const STORAGE_KEY = 'globipet_consent_v1'
const COOKIE_ID_KEY = 'globipet_cookie_id'

interface ConsentState {
  necessary: true
  analytics: boolean
  marketing: boolean
  functional: boolean
  timestamp: string
}

function loadStored(): ConsentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function ensureCookieId(): string {
  let id = localStorage.getItem(COOKIE_ID_KEY)
  if (!id) {
    id = crypto.randomUUID?.() || (Math.random().toString(36) + Date.now().toString(36))
    localStorage.setItem(COOKIE_ID_KEY, id)
  }
  return id
}

async function recordConsent(state: Omit<ConsentState, 'timestamp'>, source = 'cookie_banner') {
  const cookie_id = ensureCookieId()
  const record = { ...state, timestamp: new Date().toISOString() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  // Fire-and-forget backend recording; failures shouldn't block UX
  api.post('/user-consents', {
    cookie_id,
    analytics: state.analytics,
    marketing: state.marketing,
    functional: state.functional,
    terms_accepted: false,
    privacy_accepted: true, // banner acknowledgement implies privacy notice acknowledgement
    source,
  }).catch(() => {})
}

export default function CookieBanner() {
  const { i18n } = useTranslation()
  // Τα κείμενα των cookies ζουν στο lib/cookieTexts.ts, όχι στο i18n.
  const ct = getCookieTexts(i18n.language)
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [prefs, setPrefs] = useState({ analytics: false, marketing: false, functional: false })

  useEffect(() => {
    // Only show if no decision has been recorded yet
    if (!loadStored()) setVisible(true)
  }, [])

  const acceptAll = async () => {
    await recordConsent({ necessary: true, analytics: true, marketing: true, functional: true })
    setVisible(false)
  }
  const rejectAll = async () => {
    await recordConsent({ necessary: true, analytics: false, marketing: false, functional: false })
    setVisible(false)
  }
  const savePrefs = async () => {
    await recordConsent({ necessary: true, ...prefs })
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-3 md:p-4"
          role="dialog"
          aria-labelledby="cookie-banner-title"
        >
          <div className="max-w-5xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-4 md:p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <Cookie size={20} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 id="cookie-banner-title" className="font-bold text-gray-900 dark:text-white mb-1">
                    {ct.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {ct.description} <a href="/privacy" className="text-brand-900 dark:text-brand-400 underline">{ct.learnMore}</a>
                  </p>

                  {/* Granular controls (expanded) */}
                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-sm text-gray-900 dark:text-white">{ct.categories.necessary.title}</span>
                              <span className="text-xs text-gray-400 font-medium">{ct.alwaysOn}</span>
                            </div>
                            <p className="text-xs text-gray-500">{ct.categories.necessary.desc}</p>
                          </div>

                          <label className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-sm text-gray-900 dark:text-white">{ct.categories.analytics.title}</span>
                              <input type="checkbox" checked={prefs.analytics} onChange={e => setPrefs({ ...prefs, analytics: e.target.checked })} className="rounded" />
                            </div>
                            <p className="text-xs text-gray-500">{ct.categories.analytics.desc}</p>
                          </label>

                          <label className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-sm text-gray-900 dark:text-white">{ct.categories.marketing.title}</span>
                              <input type="checkbox" checked={prefs.marketing} onChange={e => setPrefs({ ...prefs, marketing: e.target.checked })} className="rounded" />
                            </div>
                            <p className="text-xs text-gray-500">{ct.categories.marketing.desc}</p>
                          </label>

                          <label className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-sm text-gray-900 dark:text-white">{ct.categories.functional.title}</span>
                              <input type="checkbox" checked={prefs.functional} onChange={e => setPrefs({ ...prefs, functional: e.target.checked })} className="rounded" />
                            </div>
                            <p className="text-xs text-gray-500">{ct.categories.functional.desc}</p>
                          </label>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button onClick={rejectAll} className="text-gray-400 hover:text-gray-600 p-1 shrink-0" aria-label={ct.rejectAll}>
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <button onClick={() => setExpanded(!expanded)}
                  className="text-xs font-medium text-brand-900 dark:text-brand-400 flex items-center gap-1 hover:underline">
                  {expanded ? <><ChevronUp size={12} /> {ct.hidePrefs}</> : <><ChevronDown size={12} /> {ct.managePrefs}</>}
                </button>
                <div className="flex-1" />
                <button onClick={rejectAll} className="btn-secondary text-sm px-4 py-2">
                  {ct.rejectAll}
                </button>
                {expanded && (
                  <button onClick={savePrefs} className="btn-secondary text-sm px-4 py-2">
                    {ct.saveChoices}
                  </button>
                )}
                <button onClick={acceptAll} className="btn-primary text-sm px-4 py-2">
                  {ct.acceptAll}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
