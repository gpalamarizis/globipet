import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { CalendarHeart, ShieldAlert } from 'lucide-react'
import { api, setBirthDateRequiredHandler } from '@/lib/api'
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
  const queryClient = useQueryClient()

  /**
   * Τα αιτήματα που πήραν 403 birth_date_required μένουν σε αναμονή για
   * πάντα (lib/api.ts). Μόλις η ημερομηνία οριστεί (ή ο server πει ότι δεν
   * χρειάζεται), τα queries ακυρώνονται και ξαναφορτώνονται — αλλιώς όσα δεν
   * είχαν δεδομένα έμεναν «φορτώνει…» για πάντα.
   */
  const releaseHeld = useCallback(() => {
    void queryClient.cancelQueries().then(() => queryClient.resetQueries()).catch(() => {})
  }, [queryClient])
  // Όριο για τον κλάδο «το /auth/me λέει false ενώ ο server απάντησε 403»:
  // το πολύ μία ανανέωση ανά 10'', ώστε μια ασυμφωνία του server να μη δώσει
  // βρόχο 403 → reset → 403 (και τρεμόπαιγμα της πύλης).
  const lastAutoRelease = useRef(0)

  const flag = (user as any)?.needs_birth_date as boolean | undefined
  // Χρήστης αποθηκευμένος από προηγούμενη έκδοση (χωρίς το πεδίο): μία
  // ανάγνωση του /auth/me για να μάθουμε αν χρειάζεται.
  useEffect(() => {
    if (isAuthenticated && flag === undefined) void refreshUser()
  }, [isAuthenticated, flag, refreshUser])

  // Ε16: ο server απάντησε 403 birth_date_required (lib/api.ts) — π.χ. ο
  // αποθηκευμένος χρήστης έλεγε needs_birth_date false, ή πάροχος που έγινε
  // μόνος του. Η πύλη ανοίγει αμέσως· το /auth/me επιβεβαιώνει την τιμή.
  useEffect(() => {
    let refreshing = false
    setBirthDateRequiredHandler(() => {
      const st = useAuthStore.getState()
      if (!st.isAuthenticated || !st.user) return false
      if ((st.user as any).needs_birth_date !== true) st.updateUser({ needs_birth_date: true } as any)
      if (!refreshing) {
        refreshing = true
        void st.refreshUser().finally(() => {
          refreshing = false
          const now = useAuthStore.getState()
          if (!now.isAuthenticated || !now.user) return
          // Αποτυχία του /auth/me → ο χρήστης μένει όπως ήταν (σημαία true, πύλη).
          if ((now.user as any).needs_birth_date !== true) {
            // Ο server (/auth/me) λέει ότι δεν χρειάζεται: η σημαία του
            // interceptor έχει ήδη καθαρίσει (refreshUser) — τα κρατημένα
            // αιτήματα ξαναστέλνονται, μία φορά ανά 10''.
            if (Date.now() - lastAutoRelease.current > 10_000) {
              lastAutoRelease.current = Date.now()
              releaseHeld()
            }
          }
        })
      }
      return true
    })
    return () => setBirthDateRequiredHandler(null)
  }, [releaseHeld])

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
      releaseHeld()
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
        releaseHeld()
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
