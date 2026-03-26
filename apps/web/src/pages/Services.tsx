import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, MapPin, Filter, Map, List, Star, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { api } from '@/lib/api'
import ServiceCard from '@/components/features/services/ServiceCard'
import ServicesMap from '@/components/features/services/ServicesMap'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import type { Service, ServiceType } from '@/types'

const serviceTypes: { value: ServiceType | 'all'; label: string; emoji: string }[] = [
  { value: 'all',          label: 'Όλες',         emoji: '🔍' },
  { value: 'veterinary',   label: 'Κτηνίατρος',  emoji: '🩺' },
  { value: 'grooming',     label: 'Grooming',     emoji: '✂️' },
  { value: 'training',     label: 'Εκπαίδευση',  emoji: '🎓' },
  { value: 'pet_sitting',  label: 'Pet Sitting',  emoji: '🏠' },
  { value: 'walking',      label: 'Βόλτες',       emoji: '🚶' },
  { value: 'boarding',     label: 'Boarding',     emoji: '🛏️' },
  { value: 'pet_taxi',     label: 'Pet Taxi',     emoji: '🚕' },
  { value: 'photography',  label: 'Φωτογράφιση', emoji: '📸' },
  { value: 'pharmacy',     label: 'Φαρμακείο',   emoji: '💊' },
]

export default function Services() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [city, setCity] = useState(searchParams.get('city') || '')
  const [type, setType] = useState<string>(searchParams.get('type') || 'all')
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [onlyVerified, setOnlyVerified] = useState(false)
  const [onlyEmergency, setOnlyEmergency] = useState(false)
  const [minRating, setMinRating] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['services', { search, city, type, onlyVerified, onlyEmergency, minRating }],
    queryFn: () => api.get('/services', {
      params: {
        q: search || undefined,
        city: city || undefined,
        service_type: type !== 'all' ? type : undefined,
        verified: onlyVerified || undefined,
        emergency: onlyEmergency || undefined,
        min_rating: minRating > 0 ? minRating : undefined,
      }
    }).then(r => r.data),
  })

  return (
    <div className="page-container py-8 pb-24 lg:pb-8">
      <div className="mb-6">
        <h1 className="section-title mb-1">Υπηρεσίες</h1>
        <p className="text-gray-500 text-sm">Βρείτε τον κατάλληλο πάροχο για το κατοικίδιό σας</p>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            className="input pl-10 py-2.5"
            placeholder="Αναζήτηση..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            className="input pl-10 py-2.5 w-36"
            placeholder="Πόλη..."
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
        <div className="flex border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 text-sm transition-colors ${viewMode === 'list' ? 'bg-brand-900 text-white' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          ><List size={16} /></button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-2 text-sm transition-colors ${viewMode === 'map' ? 'bg-brand-900 text-white' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          ><Map size={16} /></button>
        </div>
      </div>

      {/* Type filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {serviceTypes.map((st) => (
          <button
            key={st.value}
            onClick={() => setType(st.value)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              type === st.value
                ? 'bg-brand-900 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-brand-300'
            }`}
          >
            <span>{st.emoji}</span>{st.label}
          </button>
        ))}
      </div>

      {/* Quick filters */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setOnlyVerified(!onlyVerified)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            onlyVerified ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          <CheckCircle size={13} /> Επαληθευμένοι
        </button>
        <button
          onClick={() => setOnlyEmergency(!onlyEmergency)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            onlyEmergency ? 'bg-red-600 text-white border-red-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          🚨 Έκτακτα
        </button>
        {[4, 4.5].map((r) => (
          <button
            key={r}
            onClick={() => setMinRating(minRating === r ? 0 : r)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              minRating === r ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            <Star size={12} fill="currentColor" /> {r}+
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24"><LoadingSpinner /></div>
      ) : viewMode === 'map' ? (
        <ServicesMap services={data?.data ?? []} />
      ) : (
        <>
          {data?.data?.length > 0 && (
            <p className="text-sm text-gray-500 mb-4">{data.total} αποτελέσματα</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data?.data?.map((service: Service, i: number) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <ServiceCard service={service} />
              </motion.div>
            ))}
          </div>
          {data?.data?.length === 0 && (
            <div className="text-center py-24">
              <p className="text-4xl mb-4">🔍</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Δεν βρέθηκαν υπηρεσίες</p>
              <p className="text-gray-500 text-sm">Δοκιμάστε διαφορετικά φίλτρα</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
