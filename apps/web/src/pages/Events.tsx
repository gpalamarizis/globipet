import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Calendar, MapPin, Search, Users, Ticket, Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'

/**
 * Events listing.
 *
 * The footer of every page links here, and events.ts has served this data all
 * along — the route rendered a "page under development" placeholder instead.
 */

const EVENT_TYPES = [
  { value: '',           labelKey: 'events.types.all',        fallback: 'Όλα',        emoji: '🎪' },
  { value: 'meetup',     labelKey: 'events.types.meetup',     fallback: 'Συνάντηση',  emoji: '🐾' },
  { value: 'show',       labelKey: 'events.types.show',       fallback: 'Έκθεση',     emoji: '🏆' },
  { value: 'adoption',   labelKey: 'events.types.adoption',   fallback: 'Υιοθεσία',   emoji: '🏠' },
  { value: 'training',   labelKey: 'events.types.training',   fallback: 'Εκπαίδευση', emoji: '🎓' },
  { value: 'charity',    labelKey: 'events.types.charity',    fallback: 'Φιλανθρωπία',emoji: '❤️' },
  { value: 'competition',labelKey: 'events.types.competition',fallback: 'Αγώνας',     emoji: '🥇' },
]

export default function Events() {
  const { t, i18n } = useTranslation()
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('')
  const [eventType, setEventType] = useState('')
  const [upcomingOnly, setUpcomingOnly] = useState(true)

  const localeMap: Record<string, string> = { el: 'el-GR', en: 'en-US', es: 'es-ES', fr: 'fr-FR', zh: 'zh-CN' }
  const locale = localeMap[i18n.language] || 'el-GR'

  const { data, isLoading } = useQuery({
    queryKey: ['events', { search, city, eventType, upcomingOnly }],
    queryFn: () => api.get('/events', {
      params: {
        q: search || undefined,
        city: city || undefined,
        event_type: eventType || undefined,
        upcoming: upcomingOnly ? 'true' : undefined,
        limit: 30,
      },
    }).then(r => r.data),
  })

  const events = data?.data ?? []

  /** Dates are stored as "YYYY-MM-DD" strings, not timestamps. */
  const fmt = (value?: string | null) => {
    if (!value) return '—'
    const d = new Date(value)
    return isNaN(d.getTime())
      ? value
      : d.toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: 'short' })
  }

  const spotsLeft = (e: any) =>
    e.capacity ? Math.max(0, e.capacity - (e.registered_count ?? 0)) : null

  return (
    <div className="page-container py-8 pb-24 lg:pb-8">
      <div className="mb-6">
        <h1 className="section-title mb-1">{t('nav.events', 'Εκδηλώσεις')}</h1>
        <p className="text-gray-500 text-sm">
          {t('events.subtitle', 'Συναντήσεις, εκθέσεις και δράσεις για κατοικίδια')}
        </p>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input className="input pl-10 py-2.5"
            placeholder={t('events.searchPlaceholder', 'Αναζήτηση εκδήλωσης...')}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="relative">
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input className="input pl-10 py-2.5 w-36"
            placeholder={t('services.cityPlaceholder', 'Πόλη')}
            value={city} onChange={e => setCity(e.target.value)} />
        </div>
      </div>

      {/* Type filter */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {EVENT_TYPES.map(et => (
          <button key={et.value} onClick={() => setEventType(et.value)}
            className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all',
              eventType === et.value
                ? 'bg-brand-900 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-brand-300')}>
            <span>{et.emoji}</span>{t(et.labelKey, et.fallback)}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setUpcomingOnly(!upcomingOnly)}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
            upcomingOnly
              ? 'bg-green-600 text-white border-green-600'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400')}>
          <Calendar size={13} /> {t('events.upcomingOnly', 'Μόνο επερχόμενες')}
        </button>
      </div>

      {isLoading ? (
        <LoadingSkeleton variant="card" count={6} />
      ) : events.length === 0 ? (
        <div className="text-center py-24">
          <Calendar size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('events.noResults', 'Καμία εκδήλωση')}
          </p>
          <p className="text-gray-500 text-sm">
            {t('events.noResultsDesc', 'Δοκίμασε άλλη πόλη ή κατηγορία.')}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {data.total} {t('events.results', 'εκδηλώσεις')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((ev: any, i: number) => {
              const left = spotsLeft(ev)
              return (
                <motion.div key={ev.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}>
                  <Link to={`/events/${ev.id}`}
                    className="card overflow-hidden group hover:shadow-card-hover transition-all block h-full">
                    <div className="aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden relative">
                      {ev.image_url
                        ? <img src={ev.image_url} alt={ev.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        : <div className="w-full h-full flex items-center justify-center text-4xl">🎪</div>}
                      {ev.is_featured && (
                        <div className="absolute top-2 right-2 badge bg-brand-900 text-white text-[10px] flex items-center gap-1">
                          <Sparkles size={9} /> {t('events.featured', 'Προτεινόμενη')}
                        </div>
                      )}
                      {ev.price > 0 && (
                        <div className="absolute bottom-2 left-2 badge bg-white/95 text-gray-900 text-[10px] font-bold">
                          €{ev.price}
                        </div>
                      )}
                      {ev.price === 0 && (
                        <div className="absolute bottom-2 left-2 badge bg-green-500 text-white text-[10px] font-bold">
                          {t('events.free', 'Δωρεάν')}
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 mb-1">
                        {ev.title}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <Calendar size={11} />
                        <span>{fmt(ev.date)}{ev.time ? ` · ${ev.time}` : ''}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin size={11} />
                        <span className="truncate">{ev.location || ev.city}</span>
                      </div>

                      {left != null && (
                        <div className={cn('flex items-center gap-1 text-xs mt-2',
                          left === 0 ? 'text-red-500' : left <= 5 ? 'text-amber-600' : 'text-gray-500')}>
                          {left === 0
                            ? <><Ticket size={11} /> {t('events.soldOut', 'Εξαντλήθηκε')}</>
                            : <><Users size={11} /> {t('events.spotsLeft', { count: left, defaultValue: `${left} θέσεις` })}</>}
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
