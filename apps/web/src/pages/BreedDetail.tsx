import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Ruler, Clock, MapPin, Scissors, Activity,
  GraduationCap, Baby, PawPrint, Home, ThumbsUp, ThumbsDown, HeartPulse,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

/** Ratings are stored 1-5; render them as filled dots rather than a number. */
function Rating({ icon: Icon, label, value }: { icon: any; label: string; value?: number | null }) {
  const v = Math.min(Math.max(value ?? 0, 0), 5)
  return (
    <div className="flex items-center gap-3">
      <Icon size={15} className="text-gray-400 shrink-0" />
      <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">{label}</span>
      <div className="flex gap-1 shrink-0">
        {[1, 2, 3, 4, 5].map(n => (
          <span key={n} className={cn('w-2 h-2 rounded-full',
            n <= v ? 'bg-brand-900 dark:bg-yellow-400' : 'bg-gray-200 dark:bg-gray-700')} />
        ))}
      </div>
    </div>
  )
}

export default function BreedDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const { data: breed, isLoading, isError } = useQuery({
    queryKey: ['breed', id],
    queryFn: () => api.get(`/breeds/${id}`).then(r => r.data),
    enabled: !!id,
  })

  if (isLoading) return (
    <div className="page-container py-24 flex justify-center"><LoadingSpinner /></div>
  )

  if (isError || !breed) return (
    <div className="page-container py-16 text-center">
      <p className="text-4xl mb-3">🐾</p>
      <p className="font-semibold text-gray-900 dark:text-white mb-3">
        {t('breeds.notFound', 'Η ράτσα δεν βρέθηκε')}
      </p>
      <Link to="/breeds" className="btn-primary">{t('nav.breeds', 'Ράτσες')}</Link>
    </div>
  )

  const weight = breed.weight_min && breed.weight_max
    ? `${breed.weight_min}–${breed.weight_max} kg`
    : breed.weight_max ? `έως ${breed.weight_max} kg` : null
  const lifespan = breed.lifespan_min && breed.lifespan_max
    ? `${breed.lifespan_min}–${breed.lifespan_max} ${t('breeds.years', 'χρόνια')}`
    : null

  return (
    <div className="page-container py-6 pb-24 lg:pb-8 max-w-3xl mx-auto">
      <button onClick={() => navigate('/breeds')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-900 mb-4">
        <ArrowLeft size={15} /> {t('nav.breeds', 'Ράτσες')}
      </button>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

        <div className="card overflow-hidden">
          <div className="aspect-[16/10] bg-gray-100 dark:bg-gray-800">
            {breed.image_url
              ? <img src={breed.image_url} alt={breed.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-6xl">
                  {breed.species === 'cat' ? '🐱' : '🐶'}
                </div>}
          </div>
          <div className="p-5">
            <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
              {breed.name_el || breed.name}
            </h1>
            {breed.name_el && breed.name !== breed.name_el && (
              <p className="text-sm text-gray-400">{breed.name}</p>
            )}

            <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-600 dark:text-gray-400">
              {breed.size && (
                <span className="flex items-center gap-1.5"><Ruler size={14} className="text-gray-400" />{breed.size}</span>
              )}
              {weight && <span className="flex items-center gap-1.5">⚖️ {weight}</span>}
              {lifespan && (
                <span className="flex items-center gap-1.5"><Clock size={14} className="text-gray-400" />{lifespan}</span>
              )}
              {breed.origin && (
                <span className="flex items-center gap-1.5"><MapPin size={14} className="text-gray-400" />{breed.origin}</span>
              )}
            </div>

            {breed.temperament?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {breed.temperament.map((tr: string) => (
                  <span key={tr} className="text-xs bg-brand-50 dark:bg-brand-900/20 text-brand-900 dark:text-yellow-400 px-2 py-0.5 rounded-full">
                    {tr}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {breed.description && (
          <div className="card p-5">
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
              {breed.description}
            </p>
          </div>
        )}

        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
            {t('breeds.needs', 'Απαιτήσεις')}
          </h2>
          <Rating icon={Scissors}       label={t('breeds.grooming', 'Περιποίηση')}  value={breed.grooming_needs} />
          <Rating icon={Activity}       label={t('breeds.exercise', 'Άσκηση')}      value={breed.exercise_needs} />
          <Rating icon={GraduationCap}  label={t('breeds.training', 'Εκπαίδευση')}  value={breed.trainability} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Baby,     label: t('breeds.children', 'Παιδιά'),      ok: breed.good_with_children },
            { icon: PawPrint, label: t('breeds.otherPets', 'Άλλα ζώα'),   ok: breed.good_with_pets },
            { icon: Home,     label: t('breeds.apartment', 'Διαμέρισμα'), ok: breed.apartment_friendly },
          ].map((c, i) => (
            <div key={i} className={cn('card p-3 text-center',
              c.ok ? '' : 'opacity-50')}>
              <c.icon size={16} className={cn('mx-auto mb-1.5', c.ok ? 'text-green-500' : 'text-gray-400')} />
              <p className="text-[11px] text-gray-500">{c.label}</p>
              <p className={cn('text-xs font-semibold', c.ok ? 'text-green-600' : 'text-gray-400')}>
                {c.ok ? t('common.yes', 'Ναι') : t('common.no', 'Όχι')}
              </p>
            </div>
          ))}
        </div>

        {(breed.pros?.length > 0 || breed.cons?.length > 0) && (
          <div className="grid sm:grid-cols-2 gap-4">
            {breed.pros?.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold text-sm text-green-700 dark:text-green-400 mb-2 flex items-center gap-1.5">
                  <ThumbsUp size={14} /> {t('breeds.pros', 'Υπέρ')}
                </h3>
                <ul className="space-y-1.5">
                  {breed.pros.map((p: string, i: number) => (
                    <li key={i} className="text-sm text-gray-600 dark:text-gray-400">· {p}</li>
                  ))}
                </ul>
              </div>
            )}
            {breed.cons?.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold text-sm text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                  <ThumbsDown size={14} /> {t('breeds.cons', 'Κατά')}
                </h3>
                <ul className="space-y-1.5">
                  {breed.cons.map((c: string, i: number) => (
                    <li key={i} className="text-sm text-gray-600 dark:text-gray-400">· {c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {breed.health_issues?.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
              <HeartPulse size={14} className="text-red-500" /> {t('breeds.health', 'Συχνά προβλήματα υγείας')}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {breed.health_issues.map((h: string, i: number) => (
                <span key={i} className="text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full">
                  {h}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-3">
              {t('breeds.healthNote', 'Ενδεικτικά, βάσει της ράτσας. Δεν αντικαθιστά κτηνιατρική γνωμάτευση.')}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
