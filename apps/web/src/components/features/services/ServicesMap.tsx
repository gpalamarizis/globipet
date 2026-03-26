import { MapPin } from 'lucide-react'
import type { Service } from '@/types'

interface Props {
  services: Service[]
}

export default function ServicesMap({ services }: Props) {
  return (
    <div className="w-full h-96 bg-gray-100 dark:bg-gray-800 rounded-2xl flex flex-col items-center justify-center gap-3 border border-gray-200 dark:border-gray-700">
      <MapPin size={40} className="text-gray-400" />
      <p className="text-gray-500 font-medium">Χάρτης Υπηρεσιών</p>
      <p className="text-sm text-gray-400 text-center max-w-xs">
        Βρέθηκαν {services.length} υπηρεσίες στην περιοχή σας
      </p>
      <p className="text-xs text-gray-400">
        Ενσωμάτωση Google Maps — απαιτεί API key
      </p>
    </div>
  )
}
