import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Video, Clock } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import JitsiCall from './JitsiCall'

/**
 * Οι πληρωμένες συνεδρίες τηλεϊατρικής του παρόχου για σήμερα, με είσοδο
 * στην κλήση.
 *
 * ΓΙΑΤΙ
 *   Ο server ειδοποιεί τον πάροχο (incoming_call, σύνδεσμος /provider/…),
 *   αλλά πουθενά στην εφαρμογή δεν υπήρχε τρόπος να μπει στην κλήση: ο
 *   πελάτης περίμενε σε άδειο δωμάτιο. Η είσοδος χρησιμοποιεί το ίδιο
 *   GET /telehealth/:id/call με τον πελάτη, που δίνει στον πάροχο ρόλο
 *   moderator όταν είναι ρυθμισμένο το JaaS.
 *
 * «ΣΗΜΕΡΑ»
 *   Το scheduled_date είναι YYYY-MM-DD. Η άμεση κλήση το γράφει από
 *   toISOString (UTC), οπότε μετά τα μεσάνυχτα τοπικής ώρας μπορεί να έχει
 *   την προηγούμενη μέρα· δεχόμαστε και την τοπική και την UTC ημερομηνία.
 */
const ymd = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

export default function ProviderTelehealthToday() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [active, setActive] = useState<any>(null)

  const { data: sessions = [] } = useQuery({
    queryKey: ['telehealth-mine'],
    queryFn: () => api.get('/telehealth').then(r => r.data?.data ?? []),
    enabled: !!user,
    refetchInterval: 60_000,
  })

  const now = new Date()
  const days = new Set([
    ymd(now.getFullYear(), now.getMonth(), now.getDate()),
    ymd(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ])
  const today = (sessions as any[])
    .filter(c => c.provider_email === user?.email
      && c.payment_status === 'paid' && !!c.meeting_url
      && c.status !== 'cancelled' && c.status !== 'completed'
      && days.has(String(c.scheduled_date)))
    .sort((a, b) => String(a.scheduled_time).localeCompare(String(b.scheduled_time)))

  if (active) {
    return <JitsiCall consultationId={active.id} vetName={active.client_name} onEnd={() => setActive(null)} />
  }
  if (today.length === 0) return null

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Video size={16} className="text-brand-900 dark:text-brand-400" />
        {t('providerTele.todayTitle')}
      </h3>
      <div className="space-y-2">
        {today.map(c => (
          <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                {c.client_name}{c.pet_name ? ` · ${c.pet_name}` : ''}
              </p>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <Clock size={12} /> {c.scheduled_time}{c.duration ? ` · ${t('providerTele.minutes', { count: c.duration })}` : ''}
              </p>
            </div>
            <button onClick={() => setActive(c)} className="btn-primary px-3 py-2 text-sm flex items-center gap-1.5 shrink-0">
              <Video size={14} /> {t('pgTeleConfirm.joinCall')}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
