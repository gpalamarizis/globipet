import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Heart, Syringe, FileText, Activity, MoreVertical, Edit, Trash2, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import AddPetModal from '@/components/features/pets/AddPetModal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import type { Pet } from '@/types'

const speciesEmoji: Record<string, string> = {
  dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰',
  fish: '🐟', reptile: '🦎', horse: '🐴', other: '🐾',
}

export default function MyPets() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const { data: pets, isLoading } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets').then(r => r.data),
  })

  const deletePet = useMutation({
    mutationFn: (id: string) => api.delete(`/pets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-pets'] })
    },
  })

  if (isLoading) return <div className="flex justify-center py-24"><LoadingSpinner /></div>

  return (
    <div className="page-container py-8 pb-24 lg:pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">Τα Κατοικίδιά μου</h1>
          <p className="text-gray-500 text-sm mt-0.5">{pets?.length ?? 0} κατοικίδια καταχωρημένα</p>
        </div>
        <button onClick={() => setAddModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Προσθήκη
        </button>
      </div>

      {pets?.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-24"
        >
          <p className="text-6xl mb-4">🐾</p>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Δεν έχετε καταχωρήσει κατοικίδια ακόμα</h2>
          <p className="text-gray-500 text-sm mb-6">Προσθέστε το πρώτο σας κατοικίδιο για να ξεκινήσετε</p>
          <button onClick={() => setAddModalOpen(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus size={18} /> Προσθήκη κατοικίδιου
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pets.map((pet: Pet, i: number) => (
            <motion.div
              key={pet.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="card hover:shadow-card-hover transition-all duration-200 overflow-hidden group">
                {/* Pet image */}
                <Link to={`/my-pets/${pet.id}`} className="block">
                  <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
                    {pet.image_url ? (
                      <img src={pet.image_url} alt={pet.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-6xl">{speciesEmoji[pet.species] || '🐾'}</span>
                      </div>
                    )}
                    {pet.is_lost && (
                      <div className="absolute top-2 left-2 badge-red flex items-center gap-1">
                        <MapPin size={11} /> Χαμένο
                      </div>
                    )}
                    {pet.vaccination_status === 'overdue' && (
                      <div className="absolute top-2 right-2 badge-red">
                        ⚠️ Εμβόλιο
                      </div>
                    )}
                  </div>
                </Link>

                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link to={`/my-pets/${pet.id}`}>
                        <h3 className="font-semibold text-gray-900 dark:text-white hover:text-brand-900 transition-colors">{pet.name}</h3>
                      </Link>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {pet.breed || pet.species} {pet.age ? `• ${pet.age} ετών` : ''}
                      </p>
                    </div>
                    <div className="relative">
                      <button
                        className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => setMenuOpen(menuOpen === pet.id ? null : pet.id)}
                      >
                        <MoreVertical size={16} className="text-gray-400" />
                      </button>
                      {menuOpen === pet.id && (
                        <div className="absolute right-0 top-full mt-1 w-40 card shadow-modal z-10 py-1">
                          <Link
                            to={`/my-pets/${pet.id}`}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <Edit size={14} /> Επεξεργασία
                          </Link>
                          <button
                            onClick={() => { deletePet.mutate(pet.id); setMenuOpen(null) }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full"
                          >
                            <Trash2 size={14} /> Διαγραφή
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="flex gap-2 mt-3">
                    <Link
                      to={`/medical-center?pet=${pet.id}`}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-medium hover:bg-blue-100 transition-colors"
                    >
                      <Syringe size={13} /> Υγεία
                    </Link>
                    <Link
                      to={`/tracker?pet=${pet.id}`}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium hover:bg-green-100 transition-colors"
                    >
                      <MapPin size={13} /> Tracker
                    </Link>
                    <Link
                      to={`/my-pets/${pet.id}`}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-xs font-medium hover:bg-orange-100 transition-colors"
                    >
                      <Activity size={13} /> Wellness
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AddPetModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </div>
  )
}
