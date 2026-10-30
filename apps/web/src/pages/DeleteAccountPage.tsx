import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Trash2, Smartphone, Globe, Mail, Clock, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

/**
 * Δημόσια σελίδα διαγραφής λογαριασμού — globipet.com/delete-account
 *
 * ΓΙΑΤΙ: το Google Play απαιτεί σύνδεσμο web (στη φόρμα Data safety) όπου
 * ο χρήστης μπορεί να ζητήσει διαγραφή λογαριασμού και δεδομένων ΧΩΡΙΣ να
 * εγκαταστήσει την εφαρμογή. Η Apple δέχεται τον ίδιο σύνδεσμο.
 *
 *   Συνδεδεμένος → κουμπί προς Προφίλ → Απόρρητο (το ίδιο αίτημα με την
 *                  εφαρμογή: user-rights/delete-request, 30 ημέρες χάρη).
 *   Χωρίς σύνδεση → φόρμα· στέλνεται στο inbox επικοινωνίας του admin
 *                  (POST /contact) με θέμα «Αίτημα διαγραφής λογαριασμού».
 * Τα κείμενα ακολουθούν την Πολιτική Απορρήτου (ενότητες 8 και 9).
 */
export default function DeleteAccountPage() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuthStore()
  const [form, setForm] = useState({ name: user?.full_name ?? '', email: user?.email ?? '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) { toast.error(t('deleteAccount.fillRequired')); return }
    setSending(true)
    try {
      await api.post('/contact', {
        name: form.name.trim(),
        email: form.email.trim(),
        subject: 'Αίτημα διαγραφής λογαριασμού / Account deletion request',
        message: `${t('deleteAccount.formMessagePrefix')}\n\n${form.message.trim() || '—'}`,
      })
      setSent(true)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('common.error'))
    } finally { setSending(false) }
  }

  const Step = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={18} className="text-brand-900 dark:text-yellow-400 shrink-0" />
        <h2 className="font-bold text-gray-900 dark:text-white">{title}</h2>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">{children}</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
            <Trash2 size={22} className="text-red-600" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-black text-gray-900 dark:text-white">{t('deleteAccount.title')}</h1>
            <p className="text-sm text-gray-500">{t('deleteAccount.subtitle')}</p>
          </div>
        </div>

        <Step icon={Smartphone} title={t('deleteAccount.inAppTitle')}>
          <p>{t('deleteAccount.inAppSteps')}</p>
        </Step>

        <Step icon={Globe} title={t('deleteAccount.webTitle')}>
          <p>{t('deleteAccount.webSteps')}</p>
          {isAuthenticated ? (
            <Link to="/profile#my-data" className="btn-primary inline-flex mt-2">{t('deleteAccount.goToSettings')}</Link>
          ) : (
            <Link to="/login?redirect=/profile%23my-data" className="btn-secondary inline-flex mt-2">{t('auth.login')}</Link>
          )}
        </Step>

        <Step icon={Clock} title={t('deleteAccount.whatTitle')}>
          <p>{t('deleteAccount.whatDeleted')}</p>
          <p>{t('deleteAccount.whatKept')}</p>
          <p>
            {t('deleteAccount.moreInPolicy')}{' '}
            <Link to="/privacy" className="text-brand-900 dark:text-yellow-400 underline">{t('footer.privacy')}</Link>
          </p>
        </Step>

        <Step icon={Mail} title={t('deleteAccount.formTitle')}>
          {sent ? (
            <p className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 size={16} className="shrink-0" /> {t('deleteAccount.sent')}
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <p>{t('deleteAccount.formHint')}</p>
              <input className="input w-full" placeholder={t('deleteAccount.name')} autoComplete="name"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} maxLength={120} required />
              <input className="input w-full" type="email" placeholder={t('deleteAccount.email')} autoComplete="email"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} maxLength={200} required />
              <textarea className="input w-full min-h-[96px]" placeholder={t('deleteAccount.note')}
                value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} maxLength={2000} />
              <button type="submit" disabled={sending} className="btn-primary disabled:opacity-50">
                {sending ? t('common.loading') : t('deleteAccount.submit')}
              </button>
            </form>
          )}
        </Step>
      </div>
    </div>
  )
}
