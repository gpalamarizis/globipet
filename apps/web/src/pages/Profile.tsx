import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Edit, Camera, Star, Award, ShoppingBag, Calendar, Heart, Settings, MapPin, Phone, Globe, Mail } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { cn, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

const tierColors = { bronze: 'from-amber-600 to-amber-800', silver: 'from-gray-400 to-gray-600', gold: 'from-yellow-400 to-yellow-600', platinum: 'from-purple-400 to-purple-700' }
const tierEmoji = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎' }

export default function Profile() {
  const { user, updateUser } = useAuthStore()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [form, setForm] = useState({ full_name: user?.full_name || '', bio: user?.bio || '', phone: user?.phone || '', city: user?.city || '', website: user?.website || '' })

  const { data: loyalty } = useQuery({ queryKey: ['loyalty'], queryFn: () => api.get('/loyalty').then(r => r.data) })
  const { data: achievements = [] } = useQuery({ queryKey: ['achievements'], queryFn: () => api.get('/achievements').then(r => r.data) })
  const { data: orders = [] } = useQuery({ queryKey: ['my-orders'], queryFn: () => api.get('/orders?limit=5').then(r => r.data?.data ?? []) })
  const { data: bookings = [] } = useQuery({ queryKey: ['my-bookings'], queryFn: () => api.get('/bookings?limit=5').then(r => r.data?.data ?? []) })

  const saveProfile = useMutation({
    mutationFn: () => api.put('/users/me', form),
    onSuccess: (res) => { updateUser(res.data); setEditing(false); toast.success('Το προφίλ αποθηκεύτηκε!') }
  })

  const tier = loyalty?.tier || user?.loyalty_tier || 'bronze'
  const points = loyalty?.total_points || user?.total_points || 0
  const tabs = [{ id: 'overview', label: 'Επισκόπηση' }, { id: 'achievements', label: 'Επιτεύγματα' }, { id: 'orders', label: 'Παραγγελίες' }, { id: 'bookings', label: 'Κρατήσεις' }]

  return (
    <div className="page-container py-8 pb-24 lg:pb-8">
      <div className="max-w-3xl mx-auto">
        {/* Profile Header */}
        <div className="card overflow-hidden mb-6">
          <div className={`h-32 bg-gradient-to-r ${tierColors[tier]}`} />
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-12 mb-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl border-4 border-white dark:border-gray-900 bg-brand-100 overflow-hidden flex items-center justify-center text-brand-900 text-2xl font-bold shadow-card">
                  {user?.profile_photo ? <img src={user.profile_photo} className="w-full h-full object-cover" alt="" /> : user?.full_name?.charAt(0)}
                </div>
                <button className="absolute bottom-0 right-0 w-7 h-7 bg-brand-900 text-white rounded-full flex items-center justify-center shadow"><Camera size={13} /></button>
              </div>
              <button onClick={() => setEditing(!editing)} className="btn-secondary flex items-center gap-2 text-sm">
                <Edit size={15} /> {editing ? 'Ακύρωση' : 'Επεξεργασία'}
              </button>
            </div>

            {editing ? (
              <div className="space-y-3">
                <input className="input" placeholder="Ονοματεπώνυμο" value={form.full_name} onChange={e => setForm(f => ({...f, full_name: e.target.value}))} />
                <textarea className="input resize-none" rows={3} placeholder="Bio..." value={form.bio} onChange={e => setForm(f => ({...f, bio: e.target.value}))} />
                <div className="grid grid-cols-2 gap-3">
                  <input className="input" placeholder="Τηλέφωνο" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} />
                  <input className="input" placeholder="Πόλη" value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} />
                  <input className="input col-span-2" placeholder="Website" value={form.website} onChange={e => setForm(f => ({...f, website: e.target.value}))} />
                </div>
                <button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending} className="btn-primary w-full">{saveProfile.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}</button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-xl font-display font-bold text-gray-900 dark:text-white">{user?.full_name}</h1>
                  <span className={`badge bg-gradient-to-r ${tierColors[tier]} text-white`}>{tierEmoji[tier]} {tier.charAt(0).toUpperCase() + tier.slice(1)}</span>
                </div>
                {user?.bio && <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{user.bio}</p>}
                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                  {user?.email && <span className="flex items-center gap-1"><Mail size={12}/>{user.email}</span>}
                  {user?.phone && <span className="flex items-center gap-1"><Phone size={12}/>{user.phone}</span>}
                  {user?.city && <span className="flex items-center gap-1"><MapPin size={12}/>{user.city}</span>}
                  {user?.website && <a href={user.website} className="flex items-center gap-1 text-brand-600 hover:underline"><Globe size={12}/>{user.website}</a>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Loyalty Points */}
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Star size={18} className="text-yellow-500"/> Loyalty Program</h2>
            <span className="badge-orange">{points.toLocaleString()} πόντοι</span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {(['bronze','silver','gold','platinum'] as const).map(t => (
              <div key={t} className={cn('text-center p-3 rounded-xl transition-all', tier === t ? `bg-gradient-to-br ${tierColors[t]} text-white shadow-sm` : 'bg-gray-50 dark:bg-gray-800 opacity-60')}>
                <p className="text-xl mb-1">{tierEmoji[t]}</p>
                <p className="text-xs font-semibold capitalize">{t}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn('flex-1 py-2 text-sm font-medium rounded-lg transition-all', activeTab === tab.id ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700')}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[{icon:ShoppingBag, label:'Παραγγελίες', value: orders.length},{icon:Calendar, label:'Κρατήσεις', value: bookings.length},{icon:Award, label:'Επιτεύγματα', value: achievements.filter((a:any)=>a.is_unlocked).length},{icon:Heart, label:'Πόντοι', value: points.toLocaleString()}].map((stat,i) => (
              <div key={i} className="card p-4 text-center">
                <stat.icon size={22} className="text-brand-600 mx-auto mb-2"/>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {achievements.map((a:any) => (
              <div key={a.id} className={cn('card p-4 text-center', !a.is_unlocked && 'opacity-50 grayscale')}>
                <p className="text-3xl mb-2">{a.icon || '🏆'}</p>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">{a.name_el || a.name}</p>
                <p className="text-xs text-gray-500 mt-1">{a.points} πόντοι</p>
                {a.is_unlocked && a.unlocked_date && <p className="text-xs text-green-600 mt-1">{formatDate(a.unlocked_date)}</p>}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-3">
            {orders.length === 0 ? <div className="text-center py-12 text-gray-500">Δεν υπάρχουν παραγγελίες</div> :
              orders.map((order:any) => (
                <div key={order.id} className="card p-4 flex items-center justify-between">
                  <div><p className="font-medium text-sm text-gray-900 dark:text-white">#{order.id?.slice(-6)}</p><p className="text-xs text-gray-500">{formatDate(order.created_at)}</p></div>
                  <div className="text-right"><p className="font-bold text-brand-900">{order.total_amount}€</p><span className="badge-gray text-xs">{order.status}</span></div>
                </div>
              ))
            }
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="space-y-3">
            {bookings.length === 0 ? <div className="text-center py-12 text-gray-500">Δεν υπάρχουν κρατήσεις</div> :
              bookings.map((booking:any) => (
                <div key={booking.id} className="card p-4 flex items-center justify-between">
                  <div><p className="font-medium text-sm text-gray-900 dark:text-white">{booking.provider_name}</p><p className="text-xs text-gray-500">{booking.booking_date} {booking.booking_time}</p></div>
                  <div className="text-right"><p className="font-bold text-brand-900">{booking.total_price}€</p><span className={cn('badge', booking.status==='confirmed'?'badge-green':booking.status==='pending'?'badge-orange':'badge-gray')}>{booking.status}</span></div>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}
