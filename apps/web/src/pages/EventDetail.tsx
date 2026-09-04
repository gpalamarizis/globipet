import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Calendar, Clock, MapPin, Users, Ticket,
  Mail, PawPrint,
} from 'lucide-react'
import { api } from '@/lib/api'
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

  const localeMap: Record<string, string> = { el: 'el-GR', en: 'en-US', es: 'es-ES', fr: 'fr-FR', zh: 'zh-CN' }
  const locale = localeMap[i18n.language] || 'el-GR'

  const { data: event, isLoading, isError } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then(r => r.data),
    enabled: !!id,
  })

  const fmt = (value?: string | null) => {
    if (!value) return null
    const d = new Date(value)
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
        {t('events.notFound', 'Η εκδήλωση δεν βρέθηκε')}
      </p>
      <Link to="/events" className="btn-primary">{t('nav.events', 'Εκδηλώσεις')}</Link>
    </div>
  )

  const spotsLeft = event.capacity
    ? Math.max(0, event.capacity - (event.registered_count ?? 0))
    : null
  const mapsUrl = event.latitude && event.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.location || ''} ${event.city || ''}`)}`

  return (
    <div className="page-container py-6 pb-24 lg:pb-8 max-w-3xl mx-auto">
      <button onClick={() => navigate('/events')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-900 mb-4">
        <ArrowLeft size={15} /> {t('nav.events', 'Εκδηλώσεις')}
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
              <span className={cn('badge text-xs shrink-0',
                event.price > 0 ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700')}>
                {event.price > 0 ? `€${event.price}` : t('events.free', 'Δωρεάν')}
              </span>
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
                    ? <><Ticket size={15} /> {t('events.soldOut', 'Εξαντλήθηκε')}</>
                    : <><Users size={15} className="text-gray-400" /> {t('events.spotsLeft', { count: spotsLeft, defaultValue: `${spotsLeft} θέσεις` })}</>}
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
              {t('events.about', 'Περιγραφή')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
              {event.description}
            </p>
          </div>
        )}

        <div className="card p-5">
          <h2 className="font-semibold text-sm text-gray-900 dark:text-white mb-3">
            {t('events.organizer', 'Διοργανωτής')}
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{event.organizer}</p>
          <div className="flex gap-2 flex-wrap">
            {event.organizer_email && (
              <a href={`mailto:${event.organizer_email}?subject=${encodeURIComponent(event.title)}`}
                className="btn-primary text-sm inline-flex items-center gap-1.5">
                <Mail size={14} /> {t('events.contactOrganizer', 'Επικοινωνία')}
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
