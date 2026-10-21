import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { MailWarning } from 'lucide-react'
import { useAuthStore, isEmailUnverified } from '@/store/auth'

/** Διαδρομές χωρίς μπάρα: σελίδες σύνδεσης/εγγραφής και η ίδια η επαλήθευση. */
const HIDDEN_ON = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/auth/complete']

/**
 * Ε12 — «Επιβεβαίωσε το email σου — Ξαναστείλε».
 *
 * Εμφανίζεται πάνω από κάθε layout (App.tsx) όσο ο server λέει
 * `email_verified: false`. Δεν μπλοκάρει τίποτα. Στην επιστροφή στην καρτέλα
 * (focus) ξαναδιαβάζεται το /auth/me, ώστε η μπάρα να φύγει μόλις ο χρήστης
 * πατήσει τον σύνδεσμο σε άλλη καρτέλα ή στο κινητό.
 */
export default function EmailVerifyBanner() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { user, isAuthenticated, refreshUser, resendVerification } = useAuthStore()
  const [sending, setSending] = useState(false)
  const show = isAuthenticated && isEmailUnverified(user) && !HIDDEN_ON.some(p => pathname.startsWith(p))

  useEffect(() => {
    if (!show) return
    const onFocus = () => { void refreshUser() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [show, refreshUser])

  if (!show) return null

  const resend = async () => {
    setSending(true)
    try {
      const res = await resendVerification()
      toast.success(res?.email_verified ? t('emailVerify.alreadyVerified') : t('emailVerify.sent'))
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || t('common.error'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div role="status" className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-3 text-sm text-amber-900 dark:text-amber-100">
        <MailWarning size={16} className="shrink-0" aria-hidden="true" />
        <span className="min-w-0">{t('emailVerify.bannerText')}</span>
        <button type="button" onClick={resend} disabled={sending}
          className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline disabled:opacity-60">
          {sending ? t('emailVerify.sending') : t('emailVerify.resend')}
        </button>
      </div>
    </div>
  )
}
