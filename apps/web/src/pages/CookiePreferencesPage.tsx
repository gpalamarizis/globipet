import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Cookie, Check } from 'lucide-react'
import { api } from '@/lib/api'
import { getCookieTexts } from '@/lib/cookieTexts'
import toast from 'react-hot-toast'

/**
 * Προτιμήσεις cookies / συγκαταθέσεων.
 *
 * ΤΙ ΔΙΟΡΘΩΘΗΚΕ
 *   1. Η σελίδα δεν εμφανιζόταν ποτέ: το /cookies δηλωνόταν δύο φορές στο
 *      App.tsx και κέρδιζε η παλιά στατική LegalPage.
 *   2. Ζητούσε κλειδιά cookieBanner.* που δεν υπάρχουν στο i18n — θα έδειχνε
 *      «cookieBanner.categories.analytics.title». Τώρα παίρνει τα κείμενα από
 *      το lib/cookieTexts.ts, όπως το banner.
 *   3. Έστελνε terms_accepted: false σε κάθε αποθήκευση, «σβήνοντας» στο
 *      ιστορικό την αποδοχή όρων της εγγραφής. Τώρα δεν το στέλνει και ο
 *      server κρατά την προηγούμενη τιμή.
 *
 * Ίδιες κατηγορίες και ίδιο endpoint με την οθόνη «Συγκαταθέσεις» του κινητού.
 */

const STORAGE_KEY = 'globipet_consent_v1'
const COOKIE_ID_KEY = 'globipet_cookie_id'

type Prefs = { analytics: boolean; marketing: boolean; functional: boolean }

function loadStored(): Prefs | null {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null }
  catch { return null }
}

function ensureCookieId(): string {
  let id = localStorage.getItem(COOKIE_ID_KEY)
  if (!id) { id = crypto.randomUUID?.() || (Math.random().toString(36) + Date.now().toString(36)); localStorage.setItem(COOKIE_ID_KEY, id) }
  return id
}

export default function CookiePreferencesPage() {
  const { t, i18n } = useTranslation()
  const ct = getCookieTexts(i18n.language)
  const [prefs, setPrefs] = useState<Prefs>({ analytics: false, marketing: false, functional: false })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const stored = loadStored()
    if (stored) setPrefs({ analytics: !!stored.analytics, marketing: !!stored.marketing, functional: !!stored.functional })
    // Συνδεδεμένος χρήστης: η τελευταία επιλογή του λογαριασμού υπερισχύει —
    // μπορεί να την άλλαξε από το κινητό.
    api.get('/user-consents/current', { params: { cookie_id: localStorage.getItem(COOKIE_ID_KEY) || undefined } })
      .then(r => {
        const c = r.data?.data
        if (c) setPrefs({ analytics: !!c.analytics, marketing: !!c.marketing, functional: !!c.functional })
      })
      .catch(() => {})
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ necessary: true, ...prefs, timestamp: new Date().toISOString() }))
      await api.post('/user-consents', {
        cookie_id: ensureCookieId(),
        ...prefs,
        source: 'preferences_page',
      })
      toast.success(t('cookiePrefs.saved'))
    } catch {
      toast.error(t('cookiePrefs.errorSave'))
    } finally {
      setSaving(false)
    }
  }

  const Row = ({ id }: { id: 'necessary' | 'analytics' | 'marketing' | 'functional' }) => {
    const always = id === 'necessary'
    return (
      <div className="card p-5 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 dark:text-white mb-1">{ct.categories[id].title}</h3>
          <p className="text-sm text-gray-500">{ct.categories[id].desc}</p>
        </div>
        {always ? (
          <span className="text-xs font-medium text-gray-400 whitespace-nowrap">{ct.alwaysOn}</span>
        ) : (
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={(prefs as any)[id]}
              onChange={e => setPrefs({ ...prefs, [id]: e.target.checked })}
              className="sr-only peer"
              aria-label={ct.categories[id].title}
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
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
            <Cookie size={22} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-black text-gray-900 dark:text-white">{t('cookiePrefs.title')}</h1>
            <p className="text-sm text-gray-500">{t('cookiePrefs.subtitle')}</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <Row id="necessary" />
          <Row id="analytics" />
          <Row id="marketing" />
          <Row id="functional" />
        </div>

        <button onClick={save} disabled={saving}
          className="btn-primary w-full flex items-center justify-center gap-2">
          <Check size={16} /> {saving ? t('cookiePrefs.saving') : ct.saveChoices}
        </button>
      </div>
    </div>
  )
}
