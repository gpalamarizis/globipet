import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Users, ChevronDown, ChevronUp, PawPrint, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Λίστα συμμετεχόντων για τον διοργανωτή (GET /events/:id/registrations —
 * ο server επιτρέπει μόνο στον διοργανωτή ή στον διαχειριστή).
 *
 * Άτομα ανά εγγραφή = 1 + guests (όπως μετρά ο server το registered_count).
 * Κατάσταση πληρωμής από status / viva_transaction_id / amount_paid της γραμμής.
 * Ίδια λίστα με το κινητό (events/[id].tsx).
 */

/** Η κατάσταση μιας εγγραφής ως κλειδί κειμένου και χρώμα. */
export function attendeeStatus(r: any): { key: string; tone: 'ok' | 'warn' | 'muted' | 'bad' } {
  if (r.status === 'registered') {
    return r.viva_transaction_id && Number(r.amount_paid ?? 0) > 0
      ? { key: 'eventAttendees.statusPaid', tone: 'ok' }
      : { key: 'eventAttendees.statusFree', tone: 'ok' }
  }
  if (r.status === 'pending_payment') return { key: 'eventAttendees.statusPending', tone: 'warn' }
  if (r.status === 'refunding') return { key: 'eventAttendees.statusRefunding', tone: 'warn' }
  if (r.status === 'refund_failed') return { key: 'eventAttendees.statusRefundFailed', tone: 'bad' }
  if (r.status === 'refunded') return { key: 'eventAttendees.statusRefunded', tone: 'muted' }
  return { key: 'eventAttendees.statusCancelled', tone: 'muted' }
}

/** Πληρωμένες ή σε επιστροφή: ημερομηνία/ώρα/τιμή δεν αλλάζουν (κανόνας του PATCH /events/:id). */
export function hasMoneyAtStake(regs: any[]): boolean {
  return regs.some(r => (r.status === 'registered' && !!r.viva_transaction_id) || r.status === 'refunding')
}

const TONE: Record<string, string> = {
  ok: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warn: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  bad: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  muted: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

export default function EventAttendees({ registrations, isLoading, isError }: {
  registrations: any[]; isLoading?: boolean; isError?: boolean
}) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const active = registrations.filter(r => r.status === 'registered')
  const people = active.reduce((n, r) => n + 1 + Number(r.guests ?? 0), 0)

  return (
    <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 text-sm font-semibold text-gray-900 dark:text-white">
        <span className="flex items-center gap-2">
          <Users size={15} className="text-gray-400" />
          {t('eventAttendees.title')}
          <span className="text-xs font-normal text-gray-500">
            {t('eventAttendees.summary', { count: active.length, people })}
          </span>
        </span>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {open && (
        isLoading ? (
          <p className="text-xs text-gray-400 mt-3">{t('common.loading')}</p>
        ) : isError ? (
          <p className="text-xs text-red-500 mt-3">{t('eventAttendees.loadError')}</p>
        ) : registrations.length === 0 ? (
          <p className="text-xs text-gray-500 mt-3">{t('eventAttendees.empty')}</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
            {registrations.map((r: any) => {
              const st = attendeeStatus(r)
              return (
                <li key={r.id} className="py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.user_name}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-x-2 gap-y-0.5 flex-wrap">
                        <span>{t('eventAttendees.people', { count: 1 + Number(r.guests ?? 0) })}</span>
                        {r.pet_name && <span className="inline-flex items-center gap-1"><PawPrint size={10} /> {r.pet_name}</span>}
                        {r.created_at && <span>{new Date(r.created_at).toLocaleDateString(i18n.language)}</span>}
                      </p>
                      {r.user_email && (
                        <a href={`mailto:${r.user_email}`}
                          className="text-xs text-brand-900 dark:text-yellow-400 hover:underline inline-flex items-center gap-1 mt-0.5 break-all">
                          <Mail size={10} /> {r.user_email}
                        </a>
                      )}
                      {r.notes && <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-line">{r.notes}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <span className={cn('badge text-[11px]', TONE[st.tone])}>{t(st.key)}</span>
                      {Number(r.amount_paid ?? 0) > 0 && (
                        <p className="text-xs text-gray-500 mt-1">€{Number(r.amount_paid).toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )
      )}
    </div>
  )
}
