import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Plus, Heart, Activity, MapPin, MoreHorizontal, Edit, Trash2, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import AddPetModal from '@/components/features/pets/AddPetModal'
import toast from 'react-hot-toast'

const speciesEmoji: Record<string, string> = {
  dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰', fish: '🐟', reptile: '🦎', horse: '🐴', other: '🐾'
}

export default function MyPets() {
  const { t } = useTranslation()
  const { user, isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [selectedPet, setSelectedPet] = useState<any>(null)

  const { data: pets = [], isLoading } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets/my').then(r => r.data?.data ?? []),
    enabled: isAuthenticated,
  })

  const deletePet = useMutation({
    mutationFn: (id: string) => api.delete(`/pets/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-pets'] }); toast.success('Το κατοικίδιο διαγράφηκε') },
  })

  const toggleLost = useMutation({
    mutationFn: ({ id, isLost }: any) => api.patch(`/pets/${id}`, { is_lost: isLost }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-pets'] }),
  })

  if (!isAuthenticated) return (
    <div className="page-container py-16 text-center">
      <p className="text-4xl mb-3">🔒</p>
      <p className="font-semibold text-gray-900 dark:text-white mb-2">Απαιτείται σύνδεση</p>
      <a href="/login" className="btn-primary inline-block">Σύνδεση</a>
    </div>
  )

  return (
    <div className="page-container py-8 pb-24 lg:pb-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('pets.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{pets.length} {t('pets.subtitle')}</p>
        </div>
        <button onClick={() => setAddOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> {t('pets.addPet')}
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="card p-5 space-y-3"><div className="skeleton h-24 w-full rounded-xl"/><div className="skeleton h-4 w-3/4"/><div className="skeleton h-3 w-1/2"/></div>)}
        </div>
      ) : pets.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-6xl mb-4">🐾</p>
          <h3 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2">{t('pets.noPets')}</h3>
          <p className="text-gray-500 mb-6">{t('pets.noPetsDesc')}</p>
          <button onClick={() => setAddOpen(true)} className="btn-primary">{t('pets.addFirst')}</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pets.map((pet: any, i: number) => (
            <motion.div key={pet.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="card overflow-hidden hover:shadow-md transition-shadow">
              {/* Pet photo/emoji header */}
              <div className="h-32 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center relative">
                {pet.photo_url
                  ? <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
                  : <span className="text-6xl">{speciesEmoji[pet.species] || '🐾'}</span>
                }
                {pet.is_lost && (
                  <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                    <AlertTriangle size={10} /> ΧΑΜΕΝΟ
                  </div>
                )}
                <button className="absolute top-2 right-2 w-8 h-8 bg-white/80 dark:bg-gray-900/80 rounded-full flex items-center justify-center hover:bg-white transition-colors">
                  <MoreHorizontal size={15} className="text-gray-600" />
                </button>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{pet.name}</h3>
                    <p className="text-xs text-gray-500">{pet.breed || pet.species}</p>
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', pet.gender === 'male' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700')}>
                    {pet.gender === 'male' ? '♂' : '♀'}
                  </span>
                </div>

                <div className="flex gap-2 mb-3 text-xs text-gray-500">
                  {pet.age && <span>🎂 {pet.age} {t('pets.years')}</span>}
                  {pet.weight && <span>⚖️ {pet.weight}kg</span>}
                  {pet.color && <span>🎨 {pet.color}</span>}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setSelectedPet(pet)} className="flex-1 btn-secondary text-xs py-2 flex items-center justify-center gap-1.5">
                    <Activity size={12} /> {t('pets.health')}
                  </button>
                  <button onClick={() => toggleLost.mutate({ id: pet.id, isLost: !pet.is_lost })}
                    className={cn('flex-1 text-xs py-2 rounded-xl font-medium transition-all flex items-center justify-center gap-1.5', pet.is_lost ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600')}>
                    <MapPin size={12} /> {pet.is_lost ? t('pets.markAsFound') : t('pets.markAsLost')}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Add new card */}
          <motion.button onClick={() => setAddOpen(true)} whileHover={{ scale: 1.01 }}
            className="card p-5 border-dashed flex flex-col items-center justify-center gap-3 text-gray-400 hover:text-brand-900 hover:border-brand-300 transition-colors min-h-[240px]">
            <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-current flex items-center justify-center">
              <Plus size={22} />
            </div>
            <span className="text-sm font-medium">{t('pets.addPet')}</span>
          </motion.button>
        </div>
      )}

      <AddPetModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
