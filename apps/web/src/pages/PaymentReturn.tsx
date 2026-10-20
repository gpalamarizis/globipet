import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Loader2, XCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { useTranslation } from 'react-i18next'

/**
 * Κοινή επιστροφή από τη Viva (Success/Failure URL της πηγής πληρωμής).
 *
 * Η Viva έχει ΜΙΑ διεύθυνση επιστροφής ανά πηγή πληρωμής, για όλα τα είδη
 * πληρωμής. Ρωτάμε τον server σε ποια σελίδα επιβεβαίωσης ανήκει η πληρωμή
 * (από το transaction id ή το order code) και μεταφερόμαστε εκεί κρατώντας
 * τις παραμέτρους της Viva (t, s, …) — η σελίδα επιβεβαίωσης κάνει την
 * επαλήθευση.
 */
export default function PaymentReturn() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const query = { t: params.get('t') || undefined, s: params.get('s') || undefined }
    const attempt = async (n: number): Promise<void> => {
      try {
        const r = await api.get('/payments/return', { params: query })
        const path = r.data?.path
        if (cancelled) return
        if (typeof path === 'string' && path.startsWith('/')) {
          navigate(path + window.location.search, { replace: true })
        } else setFailed(true)
      } catch (e: any) {
        if (cancelled) return
        // 503 = η Viva δεν απάντησε ακόμη: ξαναδοκιμάζουμε λίγες φορές.
        const status = e?.response?.status ?? e?.statusCode
        if (status === 503 || status == null) {
          if (n < 5) { setTimeout(() => { void attempt(n + 1) }, 3000); return }
        }
        setFailed(true)
      }
    }
    if (!query.t && !query.s) setFailed(true)
    else void attempt(0)
    return () => { cancelled = true }
  }, [params, navigate])

  if (failed) return (
    <div className="page-container py-16 max-w-md mx-auto text-center">
      <XCircle size={56} className="mx-auto text-gray-400 mb-4" />
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('pgPaymentReturn.notFoundTitle')}</h1>
      <p className="text-sm text-gray-500 mb-6">{t('pgPaymentReturn.notFoundDesc')}</p>
      <Link to="/" className="btn-primary w-full justify-center">{t('pgPaymentReturn.home')}</Link>
    </div>
  )
  return (
    <div className="page-container py-24 flex flex-col items-center gap-3 text-gray-500">
      <Loader2 size={32} className="animate-spin text-brand-900 dark:text-yellow-400" />
      <p className="text-sm">{t('pgPaymentReturn.checking')}</p>
    </div>
  )
}
