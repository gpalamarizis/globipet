import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Camera, Edit3, Save, X, Star, Package, Calendar, Award, MapPin, Phone, Globe, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { cn, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function Profile() {
  const { t } = useTranslation()
  const { user, updateUser, logout } = useAuthStore()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    bio: (user as any)?.bio || '',
    phone: (user as any)?.phone || '',
    city: (user as any)?.city || '',
    website: (user as any)?.website || '',
  })

  const { data: orders = [] } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => api.get('/orders/my').then(r => r.data?.data ?? []),
    enabled: !!user,
  })

  const { data: bookings = [] } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => api.get('/bookings/my').then(r => r.data?.data ?? []),
    enabled: !!user,
  })

  const saveProfile = useMutation({
    mutationFn: () => api.put(`/users/${user?.id}`, form),
    onSuccess: (res) => {
      updateUser(res.data)
      setEditing(false)
      toast.success(t('profile.saved'))
    },
    onError: () => toast.error(t('common.error')),
  })

  const uploadPhoto = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'profiles')
      const { data } = await api.post('/upload?folder=profiles', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      await api.put(`/users/${user?.id}`, { profile_photo: data.url })
      updateUser({ ...user!, profile_photo: data.url })
      toast.success('Φωτογραφία ενημερώθηκε!')
    } catch {
      toast.error('Σφάλμα κατά το upload')
    } finally {
      setUploading(false)
    }
  }

  const tabs = [
    { id: 'overview',      label: t('profile.tabs.overview') },
    { id: 'achievements',  label: t('profile.tabs.achievements') },
    { id: 'orders',        label: t('profile.tabs.orders') },
    { id: 'bookings',      label: t('profile.tabs.bookings') },
  ]

  const achievements = [
    { icon: '🐾', title: 'Πρώτο Κατοικίδιο', desc: 'Προσθέσατε το πρώτο σας κατοικίδιο', unlocked: true },
    { icon: '🛒', title: 'Πρώτη Αγορά', desc: 'Ολοκληρώσατε την πρώτη σας παραγγελία', unlocked: false },
    { icon: '⭐', title: 'Super Reviewer', desc: 'Γράψατε 5 κριτικές', unlocked: false },
    { icon: '📅', title: 'Τακτικός', desc: '10 κρατήσεις υπηρεσιών', unlocked: false },
    { icon: '🏆', title: 'Loyalty Gold', desc: 'Φτάσατε Gold επίπεδο', unlocked: false },
    { icon: '❤️', title: 'Pet Lover', desc: 'Προσθέσατε 3 κατοικίδια', unlocked: false },
  ]

  if (!user) return (
    <div className="page-container py-16 text-center">
      <p className="text-2xl mb-3">🔒</p>
      <p className="font-semibold text-gray-900 dark:text-white mb-2">Απαιτείται σύνδεση</p>
      <a href="/login" className="btn-primary inline-block">Σύνδεση</a>
    </div>
  )

  return (
    <div className="page-container py-8 pb-24 lg:pb-8 max-w-3xl mx-auto">
      {/* Profile card */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-4">
          {/* Avatar with upload */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-brand-100 overflow-hidden flex items-center justify-center text-brand-900 font-bold text-xl">
              {user.profile_photo
                ? <img src={user.profile_photo} alt="" className="w-full h-full object-cover" />
                : <span>{getInitials(user.full_name || 'U')}</span>
              }
            </div>
            <button onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-brand-900 text-white rounded-full flex items-center justify-center shadow-md hover:bg-brand-800 transition-colors">
              {uploading ? <span className="animate-spin text-[10px]">⟳</span> : <Camera size={13} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if(f) uploadPhoto(f) }} />
          </div>

          <div className="flex-1 min-w-0">
            {editing ? (
              <input className="input text-lg font-bold mb-2" value={form.full_name}
                onChange={e => setForm(f => ({...f, full_name: e.target.value}))} />
            ) : (
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{user.full_name}</h1>
            )}
            <p className="text-sm text-gray-500">{user.email}</p>
            <span className="inline-block mt-1 text-xs bg-brand-50 dark:bg-brand-900/20 text-brand-900 dark:text-brand-400 px-2 py-0.5 rounded-full font-medium">
              {user.role === 'service_provider' ? '🩺 Πάροχος' : user.role === 'admin' ? '⚡ Admin' : '🐾 Ιδιοκτήτης'}
            </span>
          </div>

          <div className="flex gap-2 shrink-0">
            {editing ? (
              <>
                <button onClick={() => setEditing(false)} className="btn-ghost p-2"><X size={16}/></button>
                <button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}
                  className="btn-primary px-3 py-2 text-sm flex items-center gap-1.5">
                  <Save size={14}/>{saveProfile.isPending ? t('profile.saving') : t('profile.save')}
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="btn-secondary px-3 py-2 text-sm flex items-center gap-1.5">
                <Edit3 size={14}/>{t('profile.edit')}
              </button>
            )}
          </div>
        </div>

        {/* Edit form */}
        {editing && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('profile.bio')}</label>
              <textarea className="input resize-none" rows={2} placeholder="Λίγα λόγια για εσάς..."
                value={form.bio} onChange={e => setForm(f => ({...f, bio: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('profile.phone')}</label>
              <input className="input" placeholder="+30 6900000000" value={form.phone}
                onChange={e => setForm(f => ({...f, phone: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('profile.city')}</label>
              <input className="input" placeholder="Αθήνα" value={form.city}
                onChange={e => setForm(f => ({...f, city: e.target.value}))} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('profile.website')}</label>
              <input className="input" placeholder="https://..." value={form.website}
                onChange={e => setForm(f => ({...f, website: e.target.value}))} />
            </div>
          </motion.div>
        )}

        {/* Info display */}
        {!editing && (
          <div className="mt-4 flex flex-wrap gap-3">
            {(user as any)?.bio && <p className="text-sm text-gray-600 dark:text-gray-400 w-full">{(user as any).bio}</p>}
            {(user as any)?.city && <span className="flex items-center gap-1 text-xs text-gray-500"><MapPin size={12}/>{(user as any).city}</span>}
            {(user as any)?.phone && <span className="flex items-center gap-1 text-xs text-gray-500"><Phone size={12}/>{(user as any).phone}</span>}
            {(user as any)?.website && <a href={(user as any).website} target="_blank" className="flex items-center gap-1 text-xs text-brand-900 hover:underline"><Globe size={12}/>{(user as any).website}</a>}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { icon: Package,  label: t('profile.stats.orders'),       value: orders.length },
          { icon: Calendar, label: t('profile.stats.bookings'),     value: bookings.length },
          { icon: Award,    label: t('profile.stats.achievements'), value: achievements.filter(a => a.unlocked).length },
          { icon: Star,     label: t('profile.stats.points'),       value: '0' },
        ].map((s, i) => (
          <div key={i} className="card p-3 text-center">
            <s.icon size={16} className="mx-auto mb-1.5 text-gray-400" />
            <p className="text-lg font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-[11px] text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn('flex-1 text-xs font-medium py-2 rounded-lg transition-all',
              activeTab === tab.id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500')}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="card p-5">
          <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">{t('loyalty.tier')} — Bronze</h3>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-full h-3 mb-2">
            <div className="bg-orange-500 h-3 rounded-full" style={{ width: '15%' }} />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>0 {t('loyalty.points')}</span>
            <span>500 για Silver</span>
          </div>
        </div>
      )}

      {activeTab === 'achievements' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {achievements.map((a, i) => (
            <div key={i} className={cn('card p-4 text-center', !a.unlocked && 'opacity-40')}>
              <span className="text-3xl block mb-2">{a.icon}</span>
              <p className="font-semibold text-sm text-gray-900 dark:text-white">{a.title}</p>
              <p className="text-xs text-gray-500 mt-1">{a.desc}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="card p-5">
          {orders.length === 0
            ? <p className="text-center text-gray-500 py-8">{t('profile.noOrders')}</p>
            : orders.map((o: any) => <div key={o.id} className="py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 text-sm">{o.id}</div>)
          }
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="card p-5">
          {bookings.length === 0
            ? <p className="text-center text-gray-500 py-8">{t('profile.noBookings')}</p>
            : bookings.map((b: any) => <div key={b.id} className="py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 text-sm">{b.id}</div>)
          }
        </div>
      )}

      {/* Logout */}
      <button onClick={logout} className="w-full mt-6 flex items-center justify-center gap-2 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
        <LogOut size={16} /> {t('nav.logout')}
      </button>
    </div>
  )
}
