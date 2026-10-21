import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { CalendarHeart, ShieldAlert } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

/**
 * Ε13 — «Συμπλήρωσε την ημερομηνία γέννησής σου».
 *
 * Οι εγγραφές με Google/Facebook (και παλιοί λογαριασμοί) δεν έχουν
 * ημερομηνία γέννησης, ενώ η εγγραφή με κωδικό απαιτεί 15+. Όσο ο server λέει
 * `needs_birth_date: true` (login, OAuth, /auth/me), ο συνδεδεμένος χρήστης
 * βλέπει ΜΟΝΟ αυτή την οθόνη — εκτός από τις νομικές σελίδες και την
 * αποσύνδεση. Ίδια λειτουργία με το app/auth/birth-date.tsx του κινητού.
 *
 * Κάτω των 15: ο server κλείνει τον λογαριασμό (403, account_closed) — εδώ
 * καθαρίζει η τοπική συνεδρία και φαίνεται το μήνυμα.
 */

/** Νομικές σελίδες: ανοίγουν χωρίς την πύλη (ο χρήστης πρέπει να μπορεί να τις διαβάσει). */
const EXEMPT = ['/privacy', '/terms', '/cookies', '/auth/complete']

const pad = (n: number) => String(n).padStart(2, '0')

/** Σημερινή τοπική ημερομηνία ως YYYY-MM-DD (όριο του πεδίου — όχι μελλοντική). */
function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Ηλικία από YYYY-MM-DD χωρίς new Date('YYYY-MM-DD') (UTC) — ίδιος κανόνας με τον server. */
function ageFromIso(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return -1
  const y = +m[1], mo = +m[2], d = +m[3]
  const now = new Date()
  let age = now.getFullYear() - y
  const md = (now.getMonth() + 1) - mo
  if (md < 0 || (md === 0 && now.getDate() < d)) age--
  return age
}

export default function BirthDateGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { user, isAuthenticated, refreshUser, logout, updateUser } = useAuthStore()
  const [birthDate, setBirthDate] = useState('')
  const [confirmUnder, setConfirmUnder] = useState(false)
  const [saving, setSaving] = useState(false)
  const [closedMsg, setClosedMsg] = useState<string | null>(null)

  const flag = (user as any)?.needs_birth_date as boolean | undefined
  // Χρήστης αποθηκευμένος από προηγούμενη έκδοση (χωρίς το πεδίο): μία
  // ανάγνωση του /auth/me για να μάθουμε αν χρειάζεται.
  useEffect(() => {
    if (isAuthenticated && flag === undefined) void refreshUser()
  }, [isAuthenticated, flag, refreshUser])

  if (closedMsg) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-12">
        <div className="card w-full max-w-md p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <ShieldAlert size={22} className="text-red-600" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('birthGate.closedTitle')}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{closedMsg}</p>
          <button type="button" className="btn-primary w-full" onClick={() => { window.location.href = '/' }}>
            {t('birthGate.home')}
          </button>
        </div>
      </div>
    )
  }

  const exempt = EXEMPT.some(p => pathname === p || pathname.startsWith(p + '/'))
  if (!isAuthenticated || flag !== true || exempt) return <>{children}</>

  const send = async () => {
    setSaving(true)
    try {
      const { data } = await api.patch('/auth/me/birth-date', { birth_date: birthDate })
      if (data && typeof data === 'object') updateUser(data)
    } catch (err: any) {
      const status = err?.statusCode ?? err?.response?.status
      const body = err?.response?.data
      if (status === 403 && body?.account_closed) {
        // Ο server ακύρωσε ήδη όλες τις συνεδρίες· καθαρίζει και η τοπική.
        useAuthStore.setState({ user: null, token: null, isAuthenticated: false })
        delete api.defaults.headers.common['Authorization']
        setClosedMsg(body?.message || t('birthGate.closedLogin'))
      } else if (status === 409) {
        await refreshUser() // είχε ήδη οριστεί (π.χ. από άλλη καρτέλα)
      } else {
        toast.error(err?.message || t('common.error'))
      }
    } finally {
      setSaving(false)
      setConfirmUnder(false)
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!birthDate) return
    // Λάθος πληκτρολόγησης έτους κλείνει τον λογαριασμό — ζητάμε επιβεβαίωση.
    if (ageFromIso(birthDate) < 15 && !confirmUnder) { setConfirmUnder(true); return }
    void send()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-12">
      <form onSubmit={onSubmit} className="card w-full max-w-md p-6">
        <div className="w-12 h-12 mb-4 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
          <CalendarHeart size={22} className="text-brand-900 dark:text-brand-400" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('birthGate.title')}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">{t('birthGate.body')}</p>

        <label htmlFor="gate-birth-date" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
          {t('pgRegister.birthDate')}
        </label>
        <input id="gate-birth-date" type="date" className="input" value={birthDate} max={todayIso()} required
          onChange={e => { setBirthDate(e.target.value); setConfirmUnder(false) }} />
        <p className="text-xs text-gray-400 mt-1">{t('registerExtra.minAgeHint')}</p>

        {confirmUnder && (
          <div role="alert" className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-800 dark:text-red-200">
            {t('birthGate.underConfirm')}
          </div>
        )}

        <button type="submit" disabled={saving || !birthDate} className="btn-primary w-full mt-5">
          {saving ? t('birthGate.saving') : confirmUnder ? t('birthGate.confirmUnder') : t('birthGate.submit')}
        </button>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
          <Link to="/terms" className="text-gray-500 hover:underline">{t('birthGate.terms')}</Link>
          <Link to="/privacy" className="text-gray-500 hover:underline">{t('birthGate.privacy')}</Link>
          <button type="button" onClick={logout} className="text-gray-500 hover:underline">{t('nav.logout')}</button>
        </div>
      </form>
    </div>
  )
}
