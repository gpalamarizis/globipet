import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Calendar, Clock, MapPin, Users, Ticket,
  Mail, PawPrint, Check, UserPlus, CreditCard, Hourglass, Ban,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

/**
 * A single event.
 *
 * There is no registration endpoint — the Event row carries a
 * registered_count but nothing writes to it, and no attendance table exists.
 * So this page shows the details and hands the visitor over to the organiser
 * by email rather than offering a button that would do nothing.
 */
export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { isAuthenticated, user } = useAuthStore()
  const queryClient = useQueryClient()

  const localeMap: Record<string, string> = { el: 'el-GR', en: 'en-US', es: 'es-ES', fr: 'fr-FR', zh: 'zh-CN' }
  const locale = localeMap[i18n.language] || 'el-GR'

  const { data: event, isLoading, isError } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then(r => r.data),
    enabled: !!id,
  })

  /**
   * Registration state.
   *
   * events.registered_count was a column with no table behind it until
   * event_registrations existed, so there was no way to sign up at all and
   * this page could only hand the visitor an email address.
   */
  const { data: reg } = useQuery({
    queryKey: ['event-registration', id],
    queryFn: () => api.get(`/events/${id}/registration`).then(r => r.data?.data),
    enabled: !!id && isAuthenticated,
  })

  // Εκδήλωση με τιμή: ο server επιστρέφει checkoutUrl και ο χρήστης πάει
  // στη Viva. Η θέση επιβεβαιώνεται μόνο μετά την πληρωμή (σελίδα
  // /events/:id/confirmation). Ίδια ροή με το κινητό.
  const register = useMutation({
    mutationFn: () => api.post(`/events/${id}/register`, {}),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['event-registration', id] })
      queryClient.invalidateQueries({ queryKey: ['event', id] })
      const url = res?.data?.checkoutUrl
      if (url) { window.location.href = url; return }
      toast.success(t('events.registered'))
    },
    onError: (err: any) => toast.error(err?.message || t('common.error')),
  })

  const cancel = useMutation({
    mutationFn: () => api.delete(`/events/${id}/register`),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['event-registration', id] })
      queryClient.invalidateQueries({ queryKey: ['event', id] })
      toast.success(res?.data?.data?.status === 'refunded' ? t('events.cancelledRefunded') : t('events.cancelled'))
    },
    onError: (err: any) => toast.error(err?.message || t('common.error')),
  })

  // Πληρωμένη θέση: η επιβεβαίωση λέει ρητά ότι επιστρέφονται τα χρήματα.
  const onCancel = () => {
    if (reg?.payment_status === 'paid') {
      const amount = Number(reg.amount_paid ?? 0).toFixed(2)
      if (!confirm(t('events.confirmCancelRefund', { amount }))) return
    }
    cancel.mutate()
  }

  // ── Διοργανωτής/διαχειριστής: ακύρωση εκδήλωσης με επιστροφές ──
  const isOrganizer = isAuthenticated && !!event
    && (user?.email === event.organizer_email || user?.role === 'admin')
  const { data: cancelPreview, refetch: refetchCancelPreview } = useQuery({
    queryKey: ['event-cancel-preview', id],
    queryFn: () => api.get(`/events/${id}/cancel-preview`).then(r => r.data?.data),
    enabled: !!id && isOrganizer,
  })

  const cancelEvent = useMutation({
    mutationFn: () => api.post(`/events/${id}/cancel`, {}),
    onSuccess: (res: any) => {
      const report = res?.data?.data
      const amount = Number(report?.refunded_amount ?? 0).toFixed(2)
      if (res?.data?.deleted) {
        toast.success(t('events.cancelEventDone', { count: report?.refunded ?? 0, amount }))
        queryClient.invalidateQueries({ queryKey: ['events'] })
        navigate('/events')
        return
      }
      // 207: η εκδήλωση έμεινε ακυρωμένη, κάποιες επιστροφές απέτυχαν.
      const failed = (report?.failed?.length ?? 0) + (report?.in_progress?.length ?? 0)
      toast.error(t('events.cancelEventPartial', { count: failed }))
      queryClient.invalidateQueries({ queryKey: ['event-cancel-preview', id] })
      queryClient.invalidateQueries({ queryKey: ['event-registration', id] })
      queryClient.invalidateQueries({ queryKey: ['event', id] })
    },
    onError: (err: any) => toast.error(err?.message || t('common.error')),
  })

  // Η επιβεβαίωση λέει πόσοι ειδοποιούνται και πόσα χρήματα επιστρέφονται —
  // με φρέσκα νούμερα τη στιγμή του κλικ.
  const onCancelEvent = async () => {
    const fresh = (await refetchCancelPreview()).data ?? cancelPreview
    const lines = [
      t('events.cancelEventParticipants', { count: fresh?.participants ?? 0 }),
      ...(fresh?.refunds
        ? [t('events.cancelEventRefunds', { count: fresh.refunds, amount: Number(fresh.refund_total ?? 0).toFixed(2) })]
        : []),
      t('events.cancelEventQuestion'),
    ]
    if (!confirm(lines.join('\n'))) return
    cancelEvent.mutate()
  }

  const fmt = (value?: string | null) => {
    if (!value) return null
    // 'YYYY-MM-DD' ως τοπική ημερομηνία· το new Date('YYYY-MM-DD') είναι UTC
    // και σε ζώνες πίσω από το UTC έδειχνε την προηγούμενη μέρα.
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
    const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(value)
    return isNaN(d.getTime())
      ? value
      : d.toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  }

  if (isLoading) return (
    <div className="page-container py-24 flex justify-center"><LoadingSpinner /></div>
  )

  if (isError || !event) return (
    <div className="page-container py-16 text-center">
      <p className="text-4xl mb-3">🎪</p>
      <p className="font-semibold text-gray-900 dark:text-white mb-3">
        {t('events.notFound')}
      </p>
      <Link to="/events" className="btn-primary">{t('nav.events')}</Link>
    </div>
  )

  const spotsLeft = event.capacity
    ? Math.max(0, event.capacity - (event.registered_count ?? 0))
    : null
  const isPaidEvent = Number(event.price) > 0
  // Ακυρωμένη από τον διοργανωτή: το `cancelled` του GET /events/:id φτάνει
  // και σε μη συνδεδεμένους· το event_cancelled του /registration μόνο σε συνδεδεμένους.
  const eventCancelled = !!event.cancelled || !!reg?.event_cancelled
  // Ο διοργανωτής δεν ακυρώνει με επιστροφές εκδήλωση που ξεκίνησε (μόνο admin).
  const cancelBlocked = cancelPreview?.can_cancel === false
  const pending = reg?.payment_status === 'pending'
  const paidSeat = reg?.registered && reg?.payment_status === 'paid'
  const refundHours = reg?.refund_hours ?? 48
  const refundUntil = reg?.refund_deadline
    ? new Date(reg.refund_deadline).toLocaleString(locale, { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null
  const mapsUrl = event.latitude && event.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.location || ''} ${event.city || ''}`)}`

  return (
    <div className="page-container py-6 pb-24 lg:pb-8 max-w-3xl mx-auto">
      <button onClick={() => navigate('/events')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-900 mb-4">
        <ArrowLeft size={15} /> {t('nav.events')}
      </button>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="card overflow-hidden mb-5">
          <div className="aspect-video bg-gray-100 dark:bg-gray-800">
            {event.image_url
              ? <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-6xl">🎪</div>}
          </div>
          <div className="p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
                {event.title}
              </h1>
              <div className="flex items-center gap-2 shrink-0">
                {eventCancelled && (
                  <span className="badge text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1">
                    <Ban size={11} /> {t('bookings.status.cancelled')}
                  </span>
                )}
                <span className={cn('badge text-xs shrink-0',
                  event.price > 0 ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700')}>
                  {event.price > 0 ? `€${event.price}` : t('common.free')}
                </span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Calendar size={15} className="text-gray-400 mt-0.5 shrink-0" />
                <span>
                  {fmt(event.date)}
                  {event.end_date && event.end_date !== event.date && ` — ${fmt(event.end_date)}`}
                </span>
              </div>
              {event.time && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Clock size={15} className="text-gray-400 shrink-0" /> {event.time}
                </div>
              )}
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-2 text-sm text-brand-900 dark:text-yellow-400 hover:underline">
                <MapPin size={15} className="mt-0.5 shrink-0" />
                <span>{[event.location, event.city].filter(Boolean).join(', ')}</span>
              </a>
              {spotsLeft != null && (
                <div className={cn('flex items-center gap-2 text-sm',
                  spotsLeft === 0 ? 'text-red-500' : spotsLeft <= 5 ? 'text-amber-600' : 'text-gray-600 dark:text-gray-400')}>
                  {spotsLeft === 0
                    ? <><Ticket size={15} /> {t('events.soldOut')}</>
                    : <><Users size={15} className="text-gray-400" /> {t('events.spotsLeft', { count: spotsLeft })}</>}
                </div>
              )}
            </div>

            {event.pet_types?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {event.pet_types.map((p: string) => (
                  <span key={p} className="flex items-center gap-1 text-xs bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                    <PawPrint size={10} /> {p}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {event.description && (
          <div className="card p-5 mb-5">
            <h2 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
              {t('events.about')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
              {event.description}
            </p>
          </div>
        )}

        {/* Attend */}
        <div className="card p-5 mb-5">
          {!isAuthenticated ? (
            eventCancelled ? (
              // Ακυρωμένη: καμία πρόσκληση για δήλωση.
              <p className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 font-medium">
                <Ban size={16} className="shrink-0" /> {t('events.cancelledByOrganizer')}
              </p>
            ) : (
              <Link to="/login" className="btn-primary w-full justify-center text-sm">
                {t('events.loginToJoin')}
              </Link>
            )
          ) : eventCancelled ? (
            // Ο διοργανωτής ακύρωσε: καμία νέα δήλωση· τι έγινε με τα χρήματα.
            <>
              <p className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 font-medium">
                <Ban size={16} className="shrink-0" />
                {reg?.refund_reason === 'event_cancelled' && reg?.payment_status === 'refunded'
                  ? t('events.cancelledByOrganizerRefunded')
                  : t('events.cancelledByOrganizer')}
              </p>
              {reg?.refund_reason === 'event_cancelled' && reg?.payment_status !== 'refunded' && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {t('events.cancelledByOrganizerRefundDelayed')}
                </p>
              )}
            </>
          ) : reg?.registered ? (
            <>
              <p className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-medium mb-3">
                <Check size={16} /> {t('events.youAreGoing')}
              </p>
              {paidSeat && !reg?.refundable ? (
                // Λιγότερο από 48 ώρες πριν: καμία ακύρωση — το λέμε αντί για κουμπί που αποτυγχάνει.
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  {t('events.noRefundCancel', { hours: refundHours })}
                </p>
              ) : (
                <button onClick={onCancel} disabled={cancel.isPending}
                  className="btn-secondary w-full justify-center text-sm">
                  {cancel.isPending ? t('common.loading') : t('events.cancelAttendance')}
                </button>
              )}
              {paidSeat && reg?.refundable && refundUntil && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                  {t('events.refundUntil', { date: refundUntil })}
                </p>
              )}
            </>
          ) : pending ? (
            <>
              <p className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 font-medium mb-1">
                <Hourglass size={16} /> {t('events.pendingPayment')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {t('events.pendingPaymentHint')}
              </p>
              <button onClick={() => register.mutate()} disabled={register.isPending || spotsLeft === 0}
                className="btn-primary w-full justify-center text-sm flex items-center gap-2">
                <CreditCard size={15} />
                {register.isPending ? t('common.loading') : t('events.continuePayment')}
              </button>
              <button onClick={onCancel} disabled={cancel.isPending}
                className="btn-secondary w-full justify-center text-sm mt-2">
                {cancel.isPending ? t('common.loading') : t('events.cancelAttendance')}
              </button>
            </>
          ) : spotsLeft === 0 ? (
            <p className="text-sm text-red-500 text-center">
              {t('events.soldOut')}
            </p>
          ) : (
            <button onClick={() => register.mutate()} disabled={register.isPending}
              className="btn-primary w-full justify-center text-sm flex items-center gap-2">
              {isPaidEvent ? <CreditCard size={15} /> : <UserPlus size={15} />}
              {register.isPending
                ? t('common.loading')
                : isPaidEvent
                  ? t('events.payAndJoin', { amount: Number(event.price).toFixed(2) })
                  : t('events.join')}
            </button>
          )}
          {/* Πολιτική ακύρωσης κάτω από το κουμπί, για κάθε εκδήλωση με τιμή. */}
          {isPaidEvent && !(reg?.registered && !paidSeat) && !eventCancelled && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
              {t('events.refundPolicy', { hours: refundHours })}
            </p>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-sm text-gray-900 dark:text-white mb-3">
            {t('events.organizer')}
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{event.organizer}</p>
          <div className="flex gap-2 flex-wrap">
            {event.organizer_email && (
              <a href={`mailto:${event.organizer_email}?subject=${encodeURIComponent(event.title)}`}
                className="btn-primary text-sm inline-flex items-center gap-1.5">
                <Mail size={14} /> {t('events.contactOrganizer')}
              </a>
            )}
          </div>
        </div>

        {isOrganizer && (
          <div className="card p-5 mt-5">
            <h2 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
              {t('events.manageEvent')}
            </h2>
            {cancelBlocked ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('events.cancelEventStarted')}
              </p>
            ) : (
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  {cancelPreview?.already_cancelled ? t('events.cancelEventPendingHint') : t('events.cancelEventHint')}
                </p>
                <button onClick={onCancelEvent} disabled={cancelEvent.isPending}
                  className="btn-secondary w-full justify-center text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
                  <Ban size={15} />
                  {cancelEvent.isPending
                    ? t('common.loading')
                    : cancelPreview?.already_cancelled ? t('events.cancelEventRetry') : t('events.cancelEvent')}
                </button>
              </>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}
