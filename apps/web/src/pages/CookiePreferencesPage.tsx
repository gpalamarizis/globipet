import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Cookie, Check } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

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
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null }
  catch { return null }
}

function ensureCookieId(): string {
  let id = localStorage.getItem(COOKIE_ID_KEY)
  if (!id) { id = crypto.randomUUID?.() || (Math.random().toString(36) + Date.now().toString(36)); localStorage.setItem(COOKIE_ID_KEY, id) }
  return id
}

export default function CookiePreferencesPage() {
  const { t } = useTranslation()
  const [prefs, setPrefs] = useState({ analytics: false, marketing: false, functional: false })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const stored = loadStored()
    if (stored) setPrefs({ analytics: stored.analytics, marketing: stored.marketing, functional: stored.functional })
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const record = { necessary: true, ...prefs, timestamp: new Date().toISOString() }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
      await api.post('/user-consents', {
        cookie_id: ensureCookieId(),
        analytics: prefs.analytics,
        marketing: prefs.marketing,
        functional: prefs.functional,
        terms_accepted: false,
        privacy_accepted: true,
        source: 'preferences_page',
      })
      toast.success(t('cookiePrefs.saved'))
    } catch {
      toast.error(t('cookiePrefs.errorSave'))
    } finally {
      setSaving(false)
    }
  }

  const Row = ({ id, always = false }: { id: 'necessary' | 'analytics' | 'marketing' | 'functional'; always?: boolean }) => {
    const checked = id === 'necessary' ? true : (prefs as any)[id]
    return (
      <div className="card p-5 flex items-start gap-4">
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 dark:text-white mb-1">{t(`cookieBanner.categories.${id}.title`)}</h3>
          <p className="text-sm text-gray-500">{t(`cookieBanner.categories.${id}.desc`)}</p>
        </div>
        {always ? (
          <span className="text-xs font-medium text-gray-400 whitespace-nowrap">{t('cookieBanner.alwaysOn')}</span>
        ) : (
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setPrefs({ ...prefs, [id]: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-900"/>
          </label>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
            <Cookie size={22} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-black text-gray-900 dark:text-white">{t('cookiePrefs.title')}</h1>
            <p className="text-sm text-gray-500">{t('cookiePrefs.subtitle')}</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <Row id="necessary" always />
          <Row id="analytics" />
          <Row id="marketing" />
          <Row id="functional" />
        </div>

        <button onClick={save} disabled={saving}
          className="btn-primary w-full flex items-center justify-center gap-2">
          <Check size={16} /> {saving ? t('cookiePrefs.saving') : t('cookiePrefs.saveChoices')}
        </button>
      </div>
    </div>
  )
}
