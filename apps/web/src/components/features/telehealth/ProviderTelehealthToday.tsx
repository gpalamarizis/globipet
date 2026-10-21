import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Video, Clock, CalendarDays } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import JitsiCall from './JitsiCall'
import { telehealthCancelQuestion, postTelehealthCancel } from './telehealthCancel'
import { fmtYmd } from '@/lib/dates'

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
 *
 * «ΕΠΟΜΕΝΕΣ ΣΥΝΕΔΡΙΕΣ»
 *   Οι επιβεβαιωμένες (scheduled) από αύριο και μετά, ώστε ο πάροχος να
 *   μπορεί να τις ακυρώσει εγκαίρως — όχι μόνο την ίδια μέρα. Ίδια ροή και
 *   κείμενα ακύρωσης (telehealthCancel.ts). Ίδιο με το κινητό
 *   (app/(provider)/index.tsx).
 */
const ymd = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

export default function ProviderTelehealthToday() {
  const { t, i18n } = useTranslation()
  const { user } = useAuthStore()
  const [active, setActive] = useState<any>(null)
  const queryClient = useQueryClient()

  // Ακύρωση από τον πάροχο: πάντα πλήρης επιστροφή στον πελάτη (ίδια
  // πολιτική με τις κρατήσεις· τους όρους τους δίνει το cancel-preview).
  const cancelSession = useMutation({
    mutationFn: (id: string) => postTelehealthCancel(id),
    onSuccess: (r: any, id: string) => {
      queryClient.invalidateQueries({ queryKey: ['telehealth-mine'] })
      queryClient.invalidateQueries({ queryKey: ['telehealth', id] })
      toast.success(t('teleCancel.cancelled'))
      if (r?.refund > 0) toast.success(t('teleCancel.providerRefunded', { amount: Number(r.refund).toFixed(2) }))
    },
    onError: (err: any, id: string) => {
      queryClient.invalidateQueries({ queryKey: ['telehealth-mine'] })
      queryClient.invalidateQueries({ queryKey: ['telehealth', id] })
      toast.error(err?.response?.data?.message || err?.message || t('common.error'))
    },
  })
  // Όσο φορτώνει το cancel-preview το κουμπί είναι ανενεργό (διπλό πάτημα → δύο ερωτήσεις).
  const [asking, setAsking] = useState(false)
  const askCancel = async (c: any) => {
    if (asking) return
    setAsking(true)
    let msg: string | null = null
    try {
      msg = await telehealthCancelQuestion(String(c.id), true, t,
        () => queryClient.invalidateQueries({ queryKey: ['telehealth-mine'] }))
    } finally {
      setAsking(false)
    }
    if (msg && confirm(msg)) cancelSession.mutate(String(c.id))
  }

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

  // Από αύριο και μετά (τοπική ημερομηνία), επιβεβαιωμένες, με τη σειρά τους.
  const localToday = ymd(now.getFullYear(), now.getMonth(), now.getDate())
  const upcoming = (sessions as any[])
    .filter(c => c.provider_email === user?.email && c.status === 'scheduled'
      && String(c.scheduled_date) > localToday && !days.has(String(c.scheduled_date)))
    .sort((a, b) => `${a.scheduled_date} ${a.scheduled_time}`.localeCompare(`${b.scheduled_date} ${b.scheduled_time}`))

  if (active) {
    return <JitsiCall consultationId={active.id} vetName={active.client_name} onEnd={() => setActive(null)} />
  }
  if (today.length === 0 && upcoming.length === 0) return null

  return (
    <div className="space-y-6">
      {today.length > 0 && (
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
                <button onClick={() => askCancel(c)} disabled={cancelSession.isPending || asking}
                  className="btn-secondary px-3 py-2 text-sm text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900/50 shrink-0 disabled:opacity-60">
                  {t('bookingPolicy.cancel')}
                </button>
                <button onClick={() => setActive(c)} className="btn-primary px-3 py-2 text-sm flex items-center gap-1.5 shrink-0">
                  <Video size={14} /> {t('pgTeleConfirm.joinCall')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {upcoming.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CalendarDays size={16} className="text-brand-900 dark:text-brand-400" />
            {t('providerTele.upcomingTitle')}
          </h3>
          <div className="space-y-2">
            {upcoming.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                    {c.client_name}{c.pet_name ? ` · ${c.pet_name}` : ''}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Clock size={12} /> {fmtYmd(c.scheduled_date, i18n.language)} · {c.scheduled_time}{c.duration ? ` · ${t('providerTele.minutes', { count: c.duration })}` : ''}
                  </p>
                </div>
                {c.payment_status === 'refunding' ? (
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400 shrink-0">{t('teleCancel.refunding')}</span>
                ) : (
                  <button onClick={() => askCancel(c)} disabled={cancelSession.isPending || asking}
                    className="btn-secondary px-3 py-2 text-sm text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900/50 shrink-0 disabled:opacity-60">
                    {t('bookingPolicy.cancel')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
