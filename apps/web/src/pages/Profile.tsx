import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Camera, Edit3, Save, X, Star, Package, Calendar, Award, MapPin, Phone, Globe, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api, uploadFile } from '@/lib/api'
import { cn, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'
import ChangeMyPasswordCard from '@/components/ChangeMyPasswordCard'
import NotificationSettingsCard from '@/components/NotificationSettingsCard'
import MyDataCard from '@/components/MyDataCard'
import MySubscriptionsCard from '@/components/MySubscriptionsCard'
import StaffInvitationsCard from '@/components/StaffInvitationsCard'

const TIER_THRESHOLDS: Record<string, number> = { bronze: 0, silver: 1000, gold: 5000, platinum: 10000 }
const TIER_LABEL_KEYS: Record<string, string> = { bronze: 'loyalty.bronze', silver: 'loyalty.silver', gold: 'loyalty.gold', platinum: 'loyalty.platinum' }
const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum']
/** Ε13: μόνο αυτές οι ιστοσελίδες γίνονται σύνδεσμος (ίδιος κανόνας με το κινητό). */
const WEB_URL_RE = /^https?:\/\//i

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

  // Keep form in sync with the user object (initial load, refresh, tab-switch)
  useEffect(() => {
    if (!user) return
    setForm({
      full_name: user.full_name || '',
      bio:      (user as any).bio      || '',
      phone:    (user as any).phone    || '',
      city:     (user as any).city     || '',
      website:  (user as any).website  || '',
    })
  }, [user])

  // Λογαριασμός Google/Facebook χωρίς κωδικό: καμία αλλαγή κωδικού (ίδιος
  // κανόνας με το μενού του παρόχου, ProviderLayout, και με το κινητό).
  const hasGoogleAuth = !!(user as any)?.google_id || !!(user as any)?.facebook_id

  // Σύνδεσμοι από το μενού λογαριασμού του παρόχου (/profile#password κ.λπ.):
  // ο router δεν κυλά μόνος του στο #, οπότε το κάνουμε εδώ.
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash) return
    const id = setTimeout(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
    return () => clearTimeout(id)
  }, [hash])

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

  const { data: pets = [] } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets').then(r => r.data?.data ?? []),
    enabled: !!user,
  })

  const { data: reviews = [] } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: () => api.get('/reviews/my').then(r => r.data?.data ?? []).catch(() => []),
    enabled: !!user,
  })

  const { data: loyalty } = useQuery({
    queryKey: ['my-loyalty'],
    queryFn: () => api.get('/loyalty').then(r => r.data?.data),
    enabled: !!user,
  })

  const tier = loyalty?.tier || 'bronze'
  const totalPoints = loyalty?.total_points ?? 0
  const tierIdx = TIER_ORDER.indexOf(tier)
  const nextTier = TIER_ORDER[tierIdx + 1]
  const nextThreshold = nextTier ? TIER_THRESHOLDS[nextTier] : null
  // Το επίπεδο βγαίνει από τους πόντους όλων των εποχών (backend loyalty.ts), όχι από το
  // τρέχον υπόλοιπο που μειώνεται στις εξαργυρώσεις· η πρόοδος μετράει από το όριο του τρέχοντος επιπέδου.
  const lifetimePoints: number = loyalty?.lifetime_points ?? totalPoints
  const curThreshold = TIER_THRESHOLDS[tier] ?? 0
  const tierProgress = nextThreshold
    ? Math.max(0, Math.min(100, ((lifetimePoints - curThreshold) / (nextThreshold - curThreshold)) * 100))
    : 100

  const saveProfile = useMutation({
    mutationFn: () => api.patch('/users/me', form),
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
      // Setting Content-Type by hand drops the multipart boundary the
      // browser generates, and the server then cannot parse the body.
      // uploadFile leaves the header alone.
      const url = await uploadFile(file, 'profiles')
      await api.patch('/users/me', { profile_photo: url })
      updateUser({ ...user!, profile_photo: url })
      toast.success(t('pgProfile.photoUpdated'))
    } catch {
      toast.error(t('pgProfile.uploadError'))
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

  // Achievements computed from real user data, not hardcoded
  const achievements = [
    { icon: '🐾', title: t('pgProfile.ach.firstPetTitle'), desc: t('pgProfile.ach.firstPetDesc'), unlocked: pets.length >= 1 },
    { icon: '🛒', title: t('pgProfile.ach.firstOrderTitle'),       desc: t('pgProfile.ach.firstOrderDesc'), unlocked: orders.length >= 1 },
    { icon: '⭐', title: t('pgProfile.ach.reviewerTitle'),    desc: t('pgProfile.ach.reviewerDesc'),          unlocked: reviews.length >= 5 },
    { icon: '📅', title: t('pgProfile.ach.regularTitle'),          desc: t('pgProfile.ach.regularDesc'),      unlocked: bookings.length >= 10 },
    { icon: '🏆', title: t('pgProfile.ach.goldTitle'),      desc: t('pgProfile.ach.goldDesc'),        unlocked: tier === 'gold' || tier === 'platinum' },
    { icon: '❤️', title: t('pgProfile.ach.petLoverTitle'),         desc: t('pgProfile.ach.petLoverDesc'),     unlocked: pets.length >= 3 },
  ]

  if (!user) return (
    <div className="page-container py-16 text-center">
      <p className="text-2xl mb-3">🔒</p>
      <p className="font-semibold text-gray-900 dark:text-white mb-2">{t('authExtra.requiredTitle')}</p>
      <a href="/login" className="btn-primary inline-block">{t('auth.login')}</a>
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
              {user.role === 'service_provider' ? t('pgProfile.roleProvider') : user.role === 'admin' ? t('pgProfile.roleAdmin') : t('pgProfile.roleOwner')}
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
              <textarea className="input resize-none" rows={2} placeholder={t('pgProfile.bioPlaceholder')}
                value={form.bio} onChange={e => setForm(f => ({...f, bio: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('profile.phone')}</label>
              <input className="input" placeholder="+30 6900000000" value={form.phone}
                onChange={e => setForm(f => ({...f, phone: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('profile.city')}</label>
              <input className="input" placeholder={t('pgProfile.cityPlaceholder')} value={form.city}
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
            {/* Ε13: σύνδεσμος ΜΟΝΟ για http(s) — μια παλιά τιμή javascript:/data: δεν γίνεται εκτελέσιμη. */}
            {(user as any)?.website && (WEB_URL_RE.test(String((user as any).website).trim())
              ? <a href={String((user as any).website).trim()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-brand-900 hover:underline"><Globe size={12}/>{(user as any).website}</a>
              : <span className="flex items-center gap-1 text-xs text-gray-500"><Globe size={12}/>{(user as any).website}</span>)}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { icon: Package,  label: t('profile.stats.orders'),       value: orders.length },
          { icon: Calendar, label: t('profile.stats.bookings'),     value: bookings.length },
          { icon: Award,    label: t('profile.stats.achievements'), value: achievements.filter(a => a.unlocked).length },
          { icon: Star,     label: t('profile.stats.points'),       value: totalPoints },
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
          <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">{t('loyalty.tier')} — {TIER_LABEL_KEYS[tier] ? t(TIER_LABEL_KEYS[tier]) : tier}</h3>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-full h-3 mb-2">
            <div className="bg-orange-500 h-3 rounded-full"
              style={{ width: `${tierProgress}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{lifetimePoints} {t('loyalty.points')}</span>
            <span>{nextThreshold ? t('pgProfile.pointsForTier', { points: nextThreshold, tier: t(TIER_LABEL_KEYS[nextTier]) }) : t('pgProfile.maxTier')}</span>
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

      {/* Προσκλήσεις στο προσωπικό παρόχου — η κάρτα κρύβεται όταν δεν υπάρχει καμία. */}
      <div id="staff-invitations" className="mt-6 scroll-mt-20 empty:hidden">
        <StaffInvitationsCard />
      </div>

      {/* Συνδρομές τροφής — η κάρτα κρύβεται όταν δεν υπάρχει καμία. */}
      <div className="mt-6 empty:hidden">
        <MySubscriptionsCard />
      </div>

      {/* Ειδοποιήσεις — η κάρτα κρύβεται μόνη της σε browser που δεν τις
          υποστηρίζει, οπότε δεν χρειάζεται έλεγχος εδώ. */}
      <div id="notifications" className="mt-6 scroll-mt-20">
        <NotificationSettingsCard />
      </div>

      {/* Change Password — only for users with an actual password (not Google sign-in) */}
      {!hasGoogleAuth && (
        <div id="password" className="mt-6 scroll-mt-20">
          <ChangeMyPasswordCard />
        </div>
      )}

      {/* GDPR Άρθρα 17 και 20 — εξαγωγή και διαγραφή δεδομένων. ΕΚΤΟΣ του
          ελέγχου Google: το δικαίωμα ισχύει για κάθε λογαριασμό, όπως και
          στο κινητό. */}
      <div id="my-data" className="mt-6 scroll-mt-20">
        <MyDataCard />
      </div>

      {/* Logout */}
      <button onClick={logout} className="w-full mt-6 flex items-center justify-center gap-2 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
        <LogOut size={16} /> {t('nav.logout')}
      </button>
    </div>
  )
}
