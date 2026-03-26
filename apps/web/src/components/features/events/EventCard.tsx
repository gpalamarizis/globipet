import { Link } from 'react-router-dom'
import { Calendar, MapPin, Users, Ticket } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { Event } from '@/types'

export default function EventCard({ event }: { event: Event }) {
  const spotsLeft = event.capacity ? event.capacity - event.registered_count : null
  return (
    <Link to={`/events/${event.id}`} className="card overflow-hidden group hover:shadow-card-hover transition-all duration-200 block">
      <div className="aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden relative">
        {event.image_url ? <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/> : <div className="w-full h-full flex items-center justify-center text-3xl">🎉</div>}
        {event.is_featured && <div className="absolute top-2 left-2 badge bg-brand-900 text-white">⭐ Featured</div>}
        {event.is_international && <div className="absolute top-2 right-2 badge bg-blue-600 text-white">🌍</div>}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 mb-2">{event.title}</h3>
        <div className="space-y-1.5 text-xs text-gray-500">
          <div className="flex items-center gap-1.5"><Calendar size={12}/>{formatDate(event.date, { day:'numeric', month:'short', year:'numeric' })} · {event.time}</div>
          <div className="flex items-center gap-1.5"><MapPin size={12}/>{event.city}, {event.country}</div>
          {spotsLeft !== null && <div className="flex items-center gap-1.5"><Users size={12}/>{spotsLeft > 0 ? `${spotsLeft} θέσεις διαθέσιμες` : 'Εξαντλήθηκε'}</div>}
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <p className="font-bold text-brand-900 dark:text-brand-400">{event.price === 0 ? 'Δωρεάν' : formatCurrency(event.price, event.currency)}</p>
          <button className="btn-primary text-xs py-1.5 flex items-center gap-1"><Ticket size={13}/>Εισιτήρια</button>
        </div>
      </div>
    </Link>
  )
}
