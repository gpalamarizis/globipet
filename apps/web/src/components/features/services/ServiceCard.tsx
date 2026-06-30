import { Link } from 'react-router-dom'
import {
  Star, MapPin, CheckCircle, Home,
  Stethoscope, Scissors, GraduationCap, Footprints,
  Building2, Car, Camera, Pill, PawPrint, BadgeCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Service } from '@/types'

const typeColors: Record<string,string> = {
  veterinary:'bg-red-100 text-red-700',grooming:'bg-purple-100 text-purple-700',
  training:'bg-blue-100 text-blue-700',pet_sitting:'bg-green-100 text-green-700',
  walking:'bg-yellow-100 text-yellow-700',boarding:'bg-orange-100 text-orange-700',
  pet_taxi:'bg-teal-100 text-teal-700',photography:'bg-pink-100 text-pink-700',
  pharmacy:'bg-indigo-100 text-indigo-700',
}
const typeLabels: Record<string,string> = {
  veterinary:'Κτηνίατρος',grooming:'Περιποίηση',training:'Εκπαίδευση',
  pet_sitting:'Φιλοξενία · Ιδιώτης',walking:'Βόλτες',boarding:'Φιλοξενία · Ξενοδοχείο',
  pet_taxi:'Pet Taxi',photography:'Φωτογράφιση',pharmacy:'Φαρμακείο',
  adoption:'Υιοθεσία',shelter:'Καταφύγιο',other:'Άλλο',
}

// ── #3: illustration fallback per service type (instead of one generic emoji) ──
const typeIllustration: Record<string, { Icon: typeof Stethoscope, bg: string, fg: string }> = {
  veterinary:  { Icon: Stethoscope,   bg: 'bg-red-50 dark:bg-red-900/15',       fg: 'text-red-400 dark:text-red-500' },
  grooming:    { Icon: Scissors,      bg: 'bg-purple-50 dark:bg-purple-900/15', fg: 'text-purple-400 dark:text-purple-500' },
  training:    { Icon: GraduationCap, bg: 'bg-blue-50 dark:bg-blue-900/15',     fg: 'text-blue-400 dark:text-blue-500' },
  pet_sitting: { Icon: Home,          bg: 'bg-green-50 dark:bg-green-900/15',   fg: 'text-green-400 dark:text-green-500' },
  walking:     { Icon: Footprints,    bg: 'bg-yellow-50 dark:bg-yellow-900/15', fg: 'text-yellow-500 dark:text-yellow-500' },
  boarding:    { Icon: Building2,     bg: 'bg-orange-50 dark:bg-orange-900/15', fg: 'text-orange-400 dark:text-orange-500' },
  pet_taxi:    { Icon: Car,           bg: 'bg-teal-50 dark:bg-teal-900/15',     fg: 'text-teal-400 dark:text-teal-500' },
  photography: { Icon: Camera,        bg: 'bg-pink-50 dark:bg-pink-900/15',     fg: 'text-pink-400 dark:text-pink-500' },
  pharmacy:    { Icon: Pill,          bg: 'bg-indigo-50 dark:bg-indigo-900/15', fg: 'text-indigo-400 dark:text-indigo-500' },
}
const defaultIllustration = { Icon: PawPrint, bg: 'bg-gray-50 dark:bg-gray-800', fg: 'text-gray-300 dark:text-gray-600' }

export default function ServiceCard({ service }: { service: Service }) {
  const illustration = typeIllustration[service.service_type] || defaultIllustration
  const { Icon: TypeIcon, bg: illuBg, fg: illuFg } = illustration

  // ── #9: vet/provider credentials — years of experience + top specialization ──
  const topSpecialization = service.specializations?.[0]
  const hasCertifications = (service.certifications?.length || 0) > 0

  return (
    <Link to={`/services/${service.id}`} className="card overflow-hidden group hover:shadow-card-hover transition-all duration-200 block">
      <div className="aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden relative">
        {service.image_url
          ? <img src={service.image_url} alt={service.provider_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
          : <div className={cn('w-full h-full flex items-center justify-center', illuBg)}>
              <TypeIcon size={36} className={illuFg} strokeWidth={1.5} />
            </div>
        }
        {service.is_verified && <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"><CheckCircle size={14} className="text-white"/></div>}
        {service.emergency_available && <div className="absolute top-2 left-2 badge bg-red-500 text-white text-[10px]">🚨 Έκτακτα</div>}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1">{service.provider_name}</p>
          <span className={cn('badge text-[10px] shrink-0', typeColors[service.service_type] || 'bg-gray-100 text-gray-700')}>{typeLabels[service.service_type] || service.service_type}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
          <MapPin size={11}/><span className="truncate">{service.city}</span>
        </div>

        {/* #9: credentials row */}
        {(service.years_experience || topSpecialization || hasCertifications) && (
          <div className="flex flex-wrap gap-1 mb-2">
            {service.years_experience && (
              <span className="flex items-center gap-0.5 text-[10px] bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded-full">
                <BadgeCheck size={10} />{service.years_experience}χρ εμπειρία
              </span>
            )}
            {topSpecialization && (
              <span className="text-[10px] bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded-full truncate max-w-[110px]">
                {topSpecialization}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Star size={12} className="text-yellow-400 fill-yellow-400"/>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{service.rating}</span>
            <span className="text-xs text-gray-400">({service.reviews_count})</span>
          </div>
          <p className="font-bold text-sm text-brand-900 dark:text-brand-400">από {service.price}€</p>
        </div>
        <div className="flex gap-2 mt-2">
          {service.home_visits && <span className="flex items-center gap-0.5 text-[10px] text-green-600"><Home size={10}/>Κατ' οίκον</span>}
        </div>
      </div>
    </Link>
  )
}
