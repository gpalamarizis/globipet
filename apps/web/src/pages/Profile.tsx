import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Camera, Edit3, Save, X, Star, Package, Calendar, Award, MapPin, Phone, Globe, LogOut, ChevronRight, Sparkles, RotateCcw, Heart, PawPrint, Inbox, Languages, Cookie, ShieldCheck, HelpCircle, MessageSquare, Mail, FileText, Crown, Receipt, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api, uploadFile } from '@/lib/api'
import { cn, getInitials, speciesEmoji } from '@/lib/utils'
import { fmtDateShort, dateLocale } from '@/lib/dates'
import { localName } from '@/lib/localName'
import LanguageSelector from '@/components/ui/LanguageSelector'
import toast from 'react-hot-toast'
import ChangeMyPasswordCard from '@/components/ChangeMyPasswordCard'
import NotificationSettingsCard from '@/components/NotificationSettingsCard'
import MyDataCard from '@/components/MyDataCard'
import BlockedUsersCard from '@/components/BlockedUsersCard'
import MySubscriptionsCard from '@/components/MySubscriptionsCard'
import StaffInvitationsCard from '@/components/StaffInvitationsCard'

const TIER_LABEL_KEYS: Record<string, string> = { bronze: 'loyalty.bronze', silver: 'loyalty.silver', gold: 'loyalty.gold', platinum: 'loyalty.platinum' }
/** Ε13: μόνο αυτές οι ιστοσελίδες γίνονται σύνδεσμος (ίδιος κανόνας με το κινητό). */
const WEB_URL_RE = /^https?:\/\//i

/**
 * Ε17 — η σελίδα «Λογαριασμός» σε ενότητες, όπως στο κινητό: Συνδρομές, Η
 * δραστηριότητά μου, Τα κατοικίδιά μου, Επιβραβεύσεις, Μηνύματα &
 * ειδοποιήσεις, Λογαριασμός & ασφάλεια, Απόρρητο & δεδομένα, Βοήθεια & όροι.
 */
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-8 scroll-mt-20" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{title}</h2>
      {children}
    </section>
  )
}

function RowCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('card divide-y divide-gray-100 dark:divide-gray-800', className)}>{children}</div>
}

/** Γραμμή λίστας: σύνδεσμος (to) ή ενέργεια (onClick)· προαιρετικά πλήθος ή σήμα αδιάβαστων. */
function Row({ to, onClick, icon: Icon, label, hint, value, badge }: {
  to?: string; onClick?: () => void; icon: any; label: string; hint?: string; value?: number; badge?: number
}) {
  const cls = 'w-full flex items-center gap-3 px-4 py-3 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors first:rounded-t-2xl last:rounded-b-2xl'
  const body = (
    <>
      <Icon size={18} className="text-gray-400 shrink-0" aria-hidden="true" />
      <span className="flex-1 min-w-0">
        <span className="block truncate">{label}</span>
        {hint && <span className="block text-xs text-gray-500 mt-0.5">{hint}</span>}
      </span>
      {value !== undefined && <span className="text-xs text-gray-500 shrink-0">{value}</span>}
      {!!badge && badge > 0 && (
        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-brand-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      <ChevronRight size={16} className="text-gray-400 shrink-0" aria-hidden="true" />
    </>
  )
  return to
    ? <Link to={to} className={cls}>{body}</Link>
    : <button type="button" onClick={onClick} className={cls}>{body}</button>
}

export default function Profile() {
  const { t, i18n } = useTranslation()
  const { user, updateUser, logout } = useAuthStore()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
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
  // Καθαρός πάροχος: χωρίς τις ενότητες πελάτη (βλ. παρακάτω) — ούτε τα αντίστοιχα αιτήματα.
  const providerOnly = user?.role === 'service_provider'
  // Ε18 — κάρτα GlobiPet Plus μόνο για πελάτες: όχι πάροχοι, όχι διαχειριστές.
  const showMembership = !!user && user.role !== 'service_provider' && user.role !== 'admin'

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
    enabled: !!user && !providerOnly,
  })

  const { data: bookings = [] } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => api.get('/bookings/my').then(r => r.data?.data ?? []),
    enabled: !!user && !providerOnly,
  })

  const { data: pets = [] } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets').then(r => r.data?.data ?? []),
    enabled: !!user && !providerOnly,
  })

  const { data: reviews = [] } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: () => api.get('/reviews/my').then(r => r.data?.data ?? []).catch(() => []),
    enabled: !!user && !providerOnly,
  })

  const { data: loyalty } = useQuery({
    queryKey: ['my-loyalty'],
    queryFn: () => api.get('/loyalty').then(r => r.data?.data),
    enabled: !!user && !providerOnly,
  })

  // Συνδρομή AI — ίδιο query (και κλειδί) με Αρχική/Τιμές. Το my-status δεν
  // επιστρέφει ημερομηνία ανανέωσης· για τη δοκιμή δίνει trial_days_left.
  const { data: aiStatus } = useQuery({
    queryKey: ['ai-subscription-status'],
    queryFn: () => api.get('/ai-subscriptions/my-status').then(r => r.data?.data),
    enabled: !!user && !providerOnly,
  })
  // Συνδρομές τροφής — ίδιο query (και κλειδί) με το MySubscriptionsCard.
  const { data: foodSubs = [] } = useQuery<any[]>({
    queryKey: ['my-food-subscriptions'],
    queryFn: () => api.get('/subscriptions/food/my').then(r => r.data?.data ?? []),
    enabled: !!user && !providerOnly,
  })
  // Αδιάβαστα μηνύματα — ίδιο query (και κλειδί) με την κεφαλίδα και το /inbox.
  const { data: inbox } = useQuery<{ unread: number }>({
    queryKey: ['inbox'],
    queryFn: () => api.get('/customers/inbox').then(r => r.data),
    enabled: !!user,
  })
  const inboxUnread = inbox?.unread ?? 0
  // Ε18 — GlobiPet Plus (ίδιο query και κλειδί με τη σελίδα /membership).
  const { data: membership } = useQuery<any>({
    queryKey: ['membership', user?.id ?? 'anon'],
    queryFn: () => api.get('/membership').then(r => r.data?.data),
    enabled: showMembership,
  })
  const mbStatus: string = membership?.me?.status ?? 'none'
  const mbName: string = membership?.plan?.name || t('membership.defaultName')
  const mbRenews = mbStatus === 'member' && membership?.me?.current_period_end
    ? fmtDateShort(String(membership.me.current_period_end), i18n.language) : ''
  // Κανονική μηνιαία τιμή (η έκπτωση επιπέδου ισχύει μόνο την 1η περίοδο) — ίδια με το κινητό.
  const mbPrice = (() => {
    const v = Number(membership?.plan?.price_monthly)
    if (!Number.isFinite(v) || v <= 0) return ''
    try { return new Intl.NumberFormat(dateLocale(i18n.language), { style: 'currency', currency: 'EUR' }).format(v) } catch { return `€${v.toFixed(2)}` }
  })()
  // Μέλος / αποτυχημένη πληρωμή: πάντα (και αν ο admin απενεργοποίησε το πλάνο)·
  // αλλιώς μόνο όταν το Plus διατίθεται.
  const showMbCard = showMembership && !!membership
    && (mbStatus === 'member' || mbStatus === 'payment_failed' || (membership.available && !!membership.plan))

  const aiSt: string = aiStatus?.ai_subscription_status ?? (user as any)?.ai_subscription_status ?? 'none'
  const aiPlanName = aiStatus?.plan ? localName(aiStatus.plan, i18n.language) : ''
  const aiTitle = aiSt === 'active' ? t('aiSub.activeTitle')
    : aiSt === 'cancelled' ? t('aiSub.cancelledTitle')
    : aiSt === 'payment_failed' ? t('aiGate.paymentFailedShort')
    : aiSt === 'trial' ? t('accountHub.aiTrial')
    : aiSt === 'expired' ? t('accountHub.aiExpired')
    : t('accountHub.aiNone')
  // Λήξη δοκιμής: σήμερα + trial_days_left (ο server μετράει με το TRIAL_DAYS του).
  const aiTrialEnd = aiSt === 'trial' && aiStatus?.trial_days_left != null
    ? (() => { const d = new Date(); d.setDate(d.getDate() + Math.max(0, Number(aiStatus.trial_days_left))); return fmtDateShort(d.toISOString(), i18n.language) })()
    : ''
  // Ίδιος κανόνας με το κουμπί της Αρχικής: δοκιμή μόνο από 'none'.
  // Ε17: ημερομηνία ανανέωσης (my-status current_period_end — μόνο για ενεργή συνδρομή).
  const aiRenews = aiSt === 'active' && aiStatus?.current_period_end ? fmtDateShort(String(aiStatus.current_period_end), i18n.language) : ''
  const aiCta = aiSt === 'active' || aiSt === 'payment_failed' || aiSt === 'trial'
    ? { to: '/pricing', label: t('accountHub.aiManage') }
    : aiSt === 'none'
      ? { to: '/pricing', label: t('home.hero.tryFree') }
      : { to: '/pricing', label: t('aiGate.choosePlan') }

  const tier = loyalty?.tier || 'bronze'
  const totalPoints = loyalty?.total_points ?? 0
  // Όρια επιπέδων από το GET /loyalty (τρέχουσες ρυθμίσεις διαχειριστή), όχι σταθερές εδώ.
  const nextTier: string | null = loyalty?.next_tier ?? null
  const nextThreshold: number | null = typeof loyalty?.next_threshold === 'number' ? loyalty.next_threshold : null
  // Το επίπεδο βγαίνει από τους πόντους όλων των εποχών (backend loyalty.ts), όχι από το
  // τρέχον υπόλοιπο που μειώνεται στις εξαργυρώσεις· η πρόοδος μετράει από το όριο του τρέχοντος επιπέδου.
  const lifetimePoints: number = loyalty?.lifetime_points ?? totalPoints
  const curThreshold: number = typeof loyalty?.current_threshold === 'number' ? loyalty.current_threshold : 0
  const tierProgress = nextThreshold !== null && nextThreshold > curThreshold
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
      <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-6">{t('profile.title')}</h1>

      {/* Ε18 — GlobiPet Plus: κάρτα μέλους στην κορυφή (μόνο πελάτες). */}
      {showMbCard && (
        <Link to="/membership"
          className={cn('card p-4 mb-6 flex items-center gap-3 hover:shadow-md transition-shadow',
            mbStatus === 'payment_failed' ? 'border-red-200 dark:border-red-900/40' : 'border-amber-200 dark:border-amber-900/40')}>
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            mbStatus === 'payment_failed' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-amber-50 dark:bg-amber-900/20')}>
            {mbStatus === 'payment_failed'
              ? <AlertTriangle size={18} className="text-red-600" aria-hidden="true" />
              : <Crown size={18} className="text-amber-600" aria-hidden="true" />}
          </div>
          <div className="flex-1 min-w-0">
            {mbStatus === 'member' ? (
              <p className="font-semibold text-sm text-gray-900 dark:text-white break-words">
                {mbRenews ? t('membership.cardMemberRenews', { name: mbName, date: mbRenews }) : t('membership.cardMemberActive', { name: mbName })}
              </p>
            ) : mbStatus === 'payment_failed' ? (
              <>
                <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{mbName}</p>
                <p className="text-xs text-red-600 mt-0.5">{t('membership.cardPaymentFailed')}</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{t('membership.cardJoin', { name: mbName })}</p>
                {!!mbPrice && <p className="text-xs text-gray-500 mt-0.5">{t('membership.cardFrom', { price: mbPrice })}</p>}
              </>
            )}
          </div>
          <ChevronRight size={16} className="text-gray-400 shrink-0" aria-hidden="true" />
        </Link>
      )}

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
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white break-words">{user.full_name}</h2>
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
              <button onClick={() => setEditing(true)} aria-label={t('profile.edit')}
                className="btn-secondary px-3 py-2 text-sm flex items-center gap-1.5">
                {/* Σε στενή οθόνη μόνο το εικονίδιο — αλλιώς το όνομα στρίμωχνε σε ~60px. */}
                <Edit3 size={14}/><span className="hidden sm:inline">{t('profile.edit')}</span>
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

      {/* Stats — όχι για καθαρό πάροχο (παραγγελίες/κρατήσεις/πόντοι πελάτη) */}
      {!providerOnly && (
      <div className="grid grid-cols-4 gap-3">
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
      )}

      {/* Προσκλήσεις στο προσωπικό παρόχου — η κάρτα κρύβεται όταν δεν υπάρχει καμία. */}
      <div id="staff-invitations" className="mt-6 scroll-mt-20 empty:hidden">
        <StaffInvitationsCard />
      </div>

      {/* Καθαρός πάροχος (service_provider): μόνο μηνύματα, λογαριασμός, απόρρητο και βοήθεια —
          οι ενότητες πελάτη οδηγούν σε σελίδες που τον στέλνουν στο /provider (MainLayout). */}
      {!providerOnly && (<>
      {/* ── Συνδρομές ─────────────────────────────────────────── */}
      <Section id="subscriptions" title={t('accountHub.subscriptions')}>
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-brand-900" />
            <h3 className="font-bold text-gray-900 dark:text-white">{t('aiGate.subscriptionLabel')}</h3>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900 dark:text-white">{aiTitle}</p>
              {!!aiPlanName && <p className="text-xs text-gray-500 mt-0.5">{t('aiSub.plan', { plan: aiPlanName })}</p>}
              {aiTrialEnd && <p className="text-xs text-gray-500 mt-0.5">{t('accountHub.aiTrialEnds', { date: aiTrialEnd })}</p>}
              {!!aiRenews && <p className="text-xs text-gray-500 mt-0.5">{t('accountHub.aiRenews', { date: aiRenews })}</p>}
            </div>
            <Link to={aiCta.to} className="btn-secondary shrink-0 px-3 py-2 text-sm">{aiCta.label}</Link>
          </div>
        </div>
        {/* Συνδρομές τροφής — η κάρτα κρύβεται όταν δεν υπάρχει καμία· τότε
            ένας σύνδεσμος στο κατάστημα (εκεί ξεκινά μια συνδρομή). */}
        {foodSubs.length > 0 ? (
          <div className="mt-3"><MySubscriptionsCard /></div>
        ) : (
          <RowCard className="mt-3">
            <Row to="/marketplace" icon={RotateCcw} label={t('accountHub.foodSubs')} hint={t('accountHub.foodSubsEmpty')} />
          </RowCard>
        )}
        {/* Ε18 — ιστορικό πληρωμών, αποδεικτικά, κάρτα συνδρομών. */}
        <RowCard className="mt-3">
          <Row to="/account/payments" icon={Receipt} label={t('payments.rowLabel')} hint={t('payments.rowHint')} />
        </RowCard>
      </Section>

      {/* ── Η δραστηριότητά μου ──────────────────────────────── */}
      <Section id="activity" title={t('accountHub.activity')}>
        <RowCard>
          <Row to="/bookings"   icon={Calendar}    label={t('nav.myBookings')}      value={bookings.length} />
          <Row to="/orders"     icon={Package}     label={t('nav.orders')}          value={orders.length} />
          <Row to="/wishlist"   icon={Heart}       label={t('nav.wishlist')} />
          <Row to="/my-reviews" icon={Star}        label={t('accountHub.myReviews')} value={reviews.length} />
        </RowCard>

        {/* Πρόσφατες παραγγελίες — αναγνώσιμη περίληψη αντί για σκέτο id. */}
        {orders.length > 0 && (
          <div className="card mt-3">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{t('accountHub.recentOrders')}</h3>
              <Link to="/orders" className="text-xs text-brand-900 dark:text-brand-400 font-medium hover:underline">{t('common.viewAll')}</Link>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {orders.slice(0, 3).map((o: any) => {
                const lines: any[] = Array.isArray(o.items) ? o.items : []
                const first = lines[0]?.name || lines[0]?.product_name
                const summary = first
                  ? (lines.length > 1 ? `${first} ${t('orders.andMore', { count: lines.length - 1 })}` : first)
                  : `${t('orders.orderNumber')} #${String(o.id ?? '').slice(0, 8).toUpperCase()}`
                return (
                  <Link key={o.id} to={`/orders/${o.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors last:rounded-b-2xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{summary}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{fmtDateShort(o.created_at, i18n.language)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">€{Number(o.total_amount ?? 0).toFixed(2)}</p>
                      <span className="inline-block mt-0.5 text-[11px] px-2 py-0.5 rounded-full font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        {String(t(`orders.status.${o.status}`, o.status))}
                      </span>
                    </div>
                    <ChevronRight size={16} className="text-gray-400 shrink-0" aria-hidden="true" />
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Πρόσφατες κρατήσεις — υπηρεσία, πάροχος, ημερομηνία, ποσό, κατάσταση. */}
        {bookings.length > 0 && (
          <div className="card mt-3">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{t('accountHub.recentBookings')}</h3>
              <Link to="/bookings" className="text-xs text-brand-900 dark:text-brand-400 font-medium hover:underline">{t('common.viewAll')}</Link>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {bookings.slice(0, 3).map((b: any) => (
                <Link key={b.id} to="/bookings"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors last:rounded-b-2xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{b.service?.title || t('bookingsExtra.service')}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {[b.provider_name, fmtDateShort(b.booking_date, i18n.language), b.booking_time].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">€{Number(b.total_price ?? 0).toFixed(2)}</p>
                    <span className="inline-block mt-0.5 text-[11px] px-2 py-0.5 rounded-full font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      {String(t(`bookings.status.${b.status}`, { defaultValue: b.status }))}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 shrink-0" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* ── Τα κατοικίδιά μου ────────────────────────────────── */}
      <Section id="pets" title={t('accountHub.myPets')}>
        <RowCard>
          {pets.slice(0, 5).map((pet: any) => (
            <Link key={pet.id} to={`/my-pets/${pet.id}`}
              className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors first:rounded-t-2xl last:rounded-b-2xl">
              <div className="w-8 h-8 rounded-full bg-brand-100 overflow-hidden flex items-center justify-center shrink-0">
                {pet.image_url
                  ? <img src={pet.image_url} alt="" className="w-full h-full object-cover" />
                  : <span className="text-base">{speciesEmoji[pet.species] || '🐾'}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">{pet.name}</p>
                {pet.breed && <p className="text-xs text-gray-500 truncate">{pet.breed}</p>}
              </div>
              <ChevronRight size={16} className="text-gray-400 shrink-0" aria-hidden="true" />
            </Link>
          ))}
          <Row to="/my-pets" icon={PawPrint} label={pets.length > 0 ? t('nav.myPets') : t('home.cards.noPets')} value={pets.length > 0 ? pets.length : undefined} />
        </RowCard>
      </Section>

      {/* ── Επιβραβεύσεις ────────────────────────────────────── */}
      <Section id="rewards" title={t('accountHub.rewards')}>
        <div className="card p-5">
          <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">{t('loyalty.tier')} — {TIER_LABEL_KEYS[tier] ? t(TIER_LABEL_KEYS[tier]) : tier}</h3>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-full h-3 mb-2">
            <div className="bg-orange-500 h-3 rounded-full"
              style={{ width: `${tierProgress}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{lifetimePoints} {t('loyalty.points')}</span>
            <span>{!loyalty ? '' : nextTier && nextThreshold !== null ? t('pgProfile.pointsForTier', { points: nextThreshold, tier: TIER_LABEL_KEYS[nextTier] ? t(TIER_LABEL_KEYS[nextTier]) : nextTier }) : t('pgProfile.maxTier')}</span>
          </div>
          <Link to="/loyalty" className="inline-flex items-center gap-1 mt-4 text-sm text-brand-900 dark:text-brand-400 font-medium hover:underline">
            {t('accountHub.howTiersWork')} <ChevronRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white mt-4 mb-3">{t('profile.tabs.achievements')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {achievements.map((a, i) => (
            <div key={i} className={cn('card p-4 text-center', !a.unlocked && 'opacity-40')}>
              <span className="text-3xl block mb-2">{a.icon}</span>
              <p className="font-semibold text-sm text-gray-900 dark:text-white">{a.title}</p>
              <p className="text-xs text-gray-500 mt-1">{a.desc}</p>
            </div>
          ))}
        </div>
      </Section>
      </>)}

      {/* ── Μηνύματα & ειδοποιήσεις ──────────────────────────── */}
      <Section id="messages" title={t('accountHub.messages')}>
        <RowCard>
          <Row to="/inbox" icon={Inbox} label={t('pgInbox.title')} badge={inboxUnread} />
        </RowCard>
        {/* Ειδοποιήσεις — η κάρτα κρύβεται μόνη της σε browser που δεν τις
            υποστηρίζει, οπότε δεν χρειάζεται έλεγχος εδώ. */}
        <div id="notifications" className="mt-3 scroll-mt-20">
          <NotificationSettingsCard />
        </div>
      </Section>

      {/* ── Λογαριασμός & ασφάλεια ───────────────────────────── */}
      <Section id="security" title={t('accountHub.security')}>
        {/* Χωρίς overflow-hidden: το μενού γλώσσας ανοίγει έξω από την κάρτα. */}
        <RowCard>
          <Row icon={Edit3} label={t('accountHub.editProfile')}
            onClick={() => { setEditing(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
          {/* pl-4/pr-1: το κουμπί γλώσσας έχει δικό του px-3, έτσι το βελάκι του
              στοιχίζεται με τα βελάκια των άλλων γραμμών (16px από τη δεξιά άκρη). */}
          <div className="flex items-center gap-3 pl-4 pr-1 py-0.5 text-sm text-gray-700 dark:text-gray-300">
            <Languages size={18} className="text-gray-400 shrink-0" aria-hidden="true" />
            <span className="flex-1 min-w-0">{t('accountHub.language')}</span>
            <LanguageSelector />
          </div>
        </RowCard>
        {/* Αλλαγή κωδικού — μόνο με πραγματικό κωδικό (όχι μόνο Google/Facebook). */}
        {!hasGoogleAuth && (
          <div id="password" className="mt-3 scroll-mt-20">
            <ChangeMyPasswordCard />
          </div>
        )}
      </Section>

      {/* ── Απόρρητο & δεδομένα ──────────────────────────────── */}
      <Section id="privacy" title={t('accountHub.privacy')}>
        {/* GDPR Άρθρα 17 και 20 — εξαγωγή και διαγραφή δεδομένων. ΕΚΤΟΣ του
            ελέγχου Google: το δικαίωμα ισχύει για κάθε λογαριασμό, όπως και
            στο κινητό. */}
        <div id="my-data" className="scroll-mt-20">
          <MyDataCard />
        </div>
        {/* App Store 1.2 — αποκλεισμένοι χρήστες (όπως στην εφαρμογή). */}
        <div className="mt-3"><BlockedUsersCard /></div>
        <RowCard className="mt-3">
          <Row to="/cookies" icon={Cookie}      label={t('accountHub.consents')} />
          <Row to="/privacy" icon={ShieldCheck} label={t('accountHub.privacyPolicy')} />
        </RowCard>
      </Section>

      {/* ── Βοήθεια & όροι ───────────────────────────────────── */}
      <Section id="help" title={t('accountHub.help')}>
        <RowCard>
          <Row to="/help"    icon={HelpCircle}    label={t('footer.help')} />
          <Row to="/faq"     icon={MessageSquare} label={t('footer.faq')} />
          <Row to="/contact" icon={Mail}          label={t('footer.contact')} />
          <Row to="/terms"   icon={FileText}      label={t('footer.terms')} />
        </RowCard>
      </Section>

      {/* Logout */}
      <button onClick={logout} className="w-full mt-6 flex items-center justify-center gap-2 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
        <LogOut size={16} /> {t('nav.logout')}
      </button>
    </div>
  )
}
