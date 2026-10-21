import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Cookie, Check } from 'lucide-react'
import { api } from '@/lib/api'
import { getCookieTexts } from '@/lib/cookieTexts'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'

/**
 * Cookies και συγκαταθέσεις (/cookies).
 *
 * ΤΙ ΔΙΟΡΘΩΘΗΚΕ
 *   1. Η σελίδα δεν εμφανιζόταν ποτέ: το /cookies δηλωνόταν δύο φορές στο
 *      App.tsx και κέρδιζε η παλιά στατική LegalPage.
 *   2. Ζητούσε κλειδιά cookieBanner.* που δεν υπάρχουν στο i18n. Τώρα παίρνει
 *      τα κείμενα από το lib/cookieTexts.ts.
 *   3. Έστελνε terms_accepted: false σε κάθε αποθήκευση, «σβήνοντας» στο
 *      ιστορικό την αποδοχή όρων της εγγραφής. Τώρα δεν το στέλνει και ο
 *      server κρατά την προηγούμενη τιμή.
 *
 * Ε13: χωρίς «Στατιστικά»/«Marketing» (απόφαση ιδιοκτήτη — βλ. cookieTexts.ts).
 * Τα απαραίτητα μόνο ως ενημέρωση. Ένας διακόπτης, «Ενημερωτικά email»
 * (`marketing` στο backend), για τον συνδεδεμένο χρήστη — εδώ οδηγεί και ο
 * σύνδεσμος απεγγραφής των μαζικών email (admin.ts). Ίδια λειτουργία με την
 * οθόνη «Συγκαταθέσεις» του κινητού.
 */

export default function CookiePreferencesPage() {
  const { t, i18n } = useTranslation()
  const ct = getCookieTexts(i18n.language)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const [newsletter, setNewsletter] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) return
    // Η τελευταία επιλογή του λογαριασμού — μπορεί να την άλλαξε από το κινητό.
    api.get('/user-consents/current')
      .then(r => { const c = r.data?.data; if (c) setNewsletter(!!c.marketing) })
      .catch(() => {})
  }, [isAuthenticated])

  const save = async () => {
    setSaving(true)
    try {
      await api.post('/user-consents', { marketing: newsletter, source: 'preferences_page' })
      toast.success(t('cookiePrefs.saved'))
    } catch {
      toast.error(t('cookiePrefs.errorSave'))
    } finally {
      setSaving(false)
    }
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
            <p className="text-sm text-gray-500">{ct.subtitle}</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="card p-5 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">{ct.categories.necessary.title}</h3>
              <p className="text-sm text-gray-500">{ct.categories.necessary.desc}</p>
            </div>
            <span className="text-xs font-medium text-gray-400 whitespace-nowrap">{ct.alwaysOn}</span>
          </div>

          <div className="card p-5 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">{ct.categories.newsletter.title}</h3>
              <p className="text-sm text-gray-500">{ct.categories.newsletter.desc}</p>
            </div>
            {isAuthenticated && (
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={newsletter}
                  onChange={e => setNewsletter(e.target.checked)}
                  className="sr-only peer"
                  aria-label={ct.categories.newsletter.title}
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-900"/>
              </label>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-6">{ct.noTracking}</p>

        {isAuthenticated ? (
          <button onClick={save} disabled={saving}
            className="btn-primary w-full flex items-center justify-center gap-2">
            <Check size={16} /> {saving ? t('cookiePrefs.saving') : ct.saveChoices}
          </button>
        ) : (
          <div className="card p-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="flex-1 min-w-0 text-sm text-gray-600 dark:text-gray-300">{ct.loginForNewsletter}</p>
            <Link to="/login" className="btn-primary text-sm px-4 py-2 text-center shrink-0">{ct.login}</Link>
          </div>
        )}
      </div>
    </div>
  )
}
