import { useState } from 'react'
import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Alert, Platform, StatusBar, Modal, TextInput, Linking, ActivityIndicator } from 'react-native'
import { useTabSpace } from '@/hooks/useTabSpace'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { PawPrint, Calendar, Package, MapPin, Globe, ShieldCheck, ChevronRight, LogOut, User as UserIcon, LayoutDashboard, Sparkles, Heart, Pencil, SlidersHorizontal, FileText, Lock, Bell, KeyRound, LifeBuoy, RotateCcw, Camera, Phone, MessageSquareText, Settings, Star, Trophy, Crown, Receipt, TriangleAlert } from 'lucide-react-native'
import { useAuthStore } from '../../src/store/auth'
import { pickAndUploadImage } from '@/lib/uploadImage'
import { colors, space, radius, type, weight, shadow, icon, touch } from '@/theme'
import { fmtDateShort } from '@/lib/dates'
import { fmtEur } from '@/lib/money'
import StaffInvitationsCard from '@/components/StaffInvitationsCard'
import NotificationBell from '@/components/NotificationBell'
import { useMembership } from '../membership'

/**
 * Ύψος μπάρας κατάστασης συν αναπνοή.
 *
 * StatusBar.currentHeight δίνει την πραγματική τιμή στο Android. Τα
 * useSafeAreaInsets επιστρέφουν 0 όταν η εφαρμογή δεν είναι ρητά
 * edge-to-edge, ενώ το σύστημα σχεδιάζει ούτως ή άλλως από κάτω — γι'
 * αυτό δεν τα εμπιστευόμαστε εδώ. Κάτω όριο 48, όσο ίσχυε πριν.
 */
const HEADER_TOP = Math.max((Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0) + space.lg, 48)

/**
 * Λογαριασμός (πρώην «Προφίλ» — το αρχείο μένει profile.tsx για τα deep links).
 *
 * Ε17 — ΔΟΜΗ (ιδιοκτήτης / Product Manager)
 *   Κεφαλίδα (avatar, όνομα, email, επεξεργασία) και ενότητες με επικεφαλίδα:
 *   Συνδρομές · Η δραστηριότητά μου · Τα κατοικίδιά μου · Επιβραβεύσεις ·
 *   Μηνύματα & ειδοποιήσεις · Λογαριασμός & ασφάλεια · Απόρρητο & δεδομένα ·
 *   Βοήθεια & όροι, και στο τέλος η αποσύνδεση. Οι συντομεύσεις λειτουργιών
 *   (ιατρικός φάκελος, GPS, τηλεϊατρική) έφυγαν — ζουν στις καρτέλες
 *   «Κατοικίδια» και «Εξερεύνησε».
 *
 * Ε18 — Κάρτα μέλους GlobiPet Plus ΣΤΗΝ ΚΟΡΥΦΗ (μόνο απλοί χρήστες· όχι
 *   πάροχοι/admin) → /membership, και «Πληρωμές και αποδεικτικά» → /payments
 *   στην ενότητα «Συνδρομές». Ίδια με το web (Profile).
 *
 * ΤΙ ΑΛΛΑΞΕ
 *   Το μενού έδειχνε σε τρεις διαδρομές που δεν υπάρχουν ως οθόνες στο
 *   κινητό: /wishlist, /settings, και /pets αντί για /(tabs)/pets. Ο
 *   χρήστης πατούσε και δεν γινόταν τίποτα — ούτε σφάλμα, ούτε πλοήγηση.
 *
 *   Η γλώσσα (language.tsx) υπήρχε ως οθόνη χωρίς κανένα σημείο εισόδου.
 *
 * ΙΣΟΤΙΜΙΑ ΜΕ ΤΟ WEB (19/10)
 *   - Επεξεργασία: και βιογραφικό και ιστοσελίδα (όπως το web)· τα κενά
 *     στέλνονται ως '' ώστε να μπορεί κανείς να σβήσει ένα πεδίο.
 *   - Αλλαγή φωτογραφίας προφίλ (πάτημα στο avatar).
 *   - Τα στοιχεία (ρόλος, βιογραφικό, πόλη, τηλέφωνο, ιστοσελίδα) φαίνονται
 *     στο προφίλ. Διαβάζονται από το /users/me, όχι μόνο από το αποθηκευμένο
 *     user της σύνδεσης, που μπορεί να είναι παλιό.
 *   - Πόντοι: ο server επιστρέφει `total_points` — το `points`/`balance`
 *     που διαβαζόταν δεν υπάρχει, οπότε έδειχνε πάντα 0. Προστέθηκαν
 *     επίπεδο, πρόοδος και επιτεύγματα, όπως στο web.
 */

// Ίδια όρια επιπέδων με το web (Profile.tsx).

type MenuItem = { key: string; Icon: any; labelKey?: string; label?: string; route?: string; onPress?: () => void; count?: number; sub?: string }

/** Ενεργή συνδρομή τροφής: ό,τι δεν έχει τερματιστεί (ίδιο με το can_cancel του server). */
const FOOD_SUB_LIVE = ['active', 'payment_failed', 'paused']

export default function ProfileScreen() {

  const tabSpace = useTabSpace()
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const { user, isAuthenticated, logout, updateUser } = useAuthStore()

  const qc = useQueryClient()

  /**
   * Σύνοψη δραστηριότητας και πόντοι.
   *
   * Το web τα δείχνει, το κινητό όχι — ο χρήστης δεν έβλεπε πουθενά πόσες
   * κρατήσεις έχει κάνει ούτε πόσους πόντους έχει μαζέψει.
   */
  const { data: pets = [] } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets').then(r => r.data?.data ?? r.data ?? []),
    enabled: isAuthenticated,
  })
  const { data: myBookings = [] } = useQuery({
    queryKey: ['my-bookings-count'],
    queryFn: () => api.get('/bookings/my').then(r => r.data?.data ?? r.data ?? []),
    enabled: isAuthenticated,
  })
  const { data: myOrders = [] } = useQuery({
    queryKey: ['my-orders-count'],
    queryFn: () => api.get('/orders/my').then(r => r.data?.data ?? r.data ?? []),
    enabled: isAuthenticated,
  })
  const { data: myReviews = [] } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: () => api.get('/reviews/my').then(r => r.data?.data ?? r.data ?? []),
    enabled: isAuthenticated,
  })
  const { data: loyalty } = useQuery({
    queryKey: ['loyalty'],
    queryFn: () => api.get('/loyalty').then(r => r.data?.data ?? r.data),
    enabled: isAuthenticated,
  })

  // Τρέχοντα στοιχεία από τον server — το αποθηκευμένο user της σύνδεσης
  // μπορεί να είναι παλιό (π.χ. αλλαγή από το web).
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/users/me').then(r => r.data),
    enabled: isAuthenticated,
  })
  const profile: any = { ...(user ?? {}), ...(me ?? {}) }

  // Αδιάβαστα μηνύματα παρόχων — ίδιο query (και cache) με την οθόνη inbox.
  const { data: inbox } = useQuery<{ unread: number }>({
    queryKey: ['inbox'],
    queryFn: () => api.get('/customers/inbox').then(r => r.data),
    enabled: isAuthenticated,
  })
  const inboxUnread = inbox?.unread ?? 0

  // Αδιάβαστες ειδοποιήσεις — ίδιο query με το καμπανάκι και την οθόνη
  // app/notifications.tsx (κλειδί ['notifications','center']).
  const { data: notif } = useQuery({
    queryKey: ['notifications', 'center'],
    queryFn: () => api.get('/notifications', { params: { limit: 50 } }).then(r => r.data),
    enabled: isAuthenticated,
  })
  const notifUnread: number = Number(notif?.unread_count ?? 0) || 0

  // Συνδρομή AI — ίδιο κλειδί και endpoint με pricing.tsx / Αρχική.
  // Ο server (GET /ai-subscriptions/my-status) δίνει κατάσταση, πλάνο,
  // trial_days_left και (Ε17) current_period_end — ημερομηνία ανανέωσης ενεργής συνδρομής.
  const { data: aiStatus } = useQuery({
    queryKey: ['ai-subscription-status'],
    queryFn: () => api.get('/ai-subscriptions/my-status').then(r => r.data?.data ?? null),
    enabled: isAuthenticated,
    staleTime: 60_000,
  })
  // Συνδρομές τροφής — ίδιο κλειδί και endpoint με app/subscriptions.tsx.
  const { data: foodSubs = [] } = useQuery({
    queryKey: ['my-food-subscriptions'],
    queryFn: () => api.get('/subscriptions/food/my').then(r => r.data?.data ?? []),
    enabled: isAuthenticated,
  })
  const foodLive = (foodSubs as any[]).filter(x => FOOD_SUB_LIVE.includes(x?.status)).length

  // Ε18 — GlobiPet Plus: κάρτα για ιδιοκτήτες κατοικιδίων — και για τον «both»,
  // που είναι και ιδιοκτήτης (ίδιος κανόνας με το web Profile)· όχι καθαροί πάροχοι/admin.
  const isPlainUser = !!user && !['admin', 'service_provider'].includes(user.role)
  const { data: membership } = useMembership(isAuthenticated && isPlainUser)
  const mPlan = membership?.plan ?? null
  const mName = mPlan?.name || t('membership.title')
  const mSt = membership?.me?.status ?? 'none'
  const mIsMember = mSt === 'member' || mSt === 'payment_failed'
  // Κανονική μηνιαία τιμή (χωρίς την έκπτωση επιπέδου, που ισχύει μόνο την 1η περίοδο) — όπως το web.
  const mMonthly = Number(mPlan?.price_monthly)
  const mPrice = mPlan && Number.isFinite(mMonthly) && mMonthly > 0 ? fmtEur(mMonthly, i18n.language) : ''
  const mRenews = mSt === 'member' && membership?.me?.current_period_end
    ? fmtDateShort(membership.me.current_period_end, i18n.language) : ''
  const showMemberCard = isPlainUser && !!membership && (mIsMember || (membership.available && !!mPlan))
  const mLabel = mSt === 'member'
    ? (mRenews ? t('membership.cardMember', { name: mName, date: mRenews }) : t('membership.cardMemberActive', { name: mName }))
    : mSt === 'payment_failed' ? mName
    : t('membership.cardJoin', { name: mName })

  // Επεξεργασία προφίλ
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})

  const saveProfile = useMutation({
    // Όπως το web: όλα τα πεδία ως κείμενο· το '' σβήνει την τιμή.
    mutationFn: () => api.patch('/users/me', {
      full_name: form.full_name?.trim(),
      bio: form.bio?.trim() ?? '',
      phone: form.phone?.trim() ?? '',
      city: form.city?.trim() ?? '',
      website: form.website?.trim() ?? '',
    }),
    onSuccess: async (r: any) => {
      const u = r?.data?.data ?? r?.data ?? {}
      await updateUser({
        full_name: u.full_name, phone: u.phone, city: u.city, bio: u.bio, website: u.website,
      })
      qc.invalidateQueries({ queryKey: ['me'] })
      setEditing(false)
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const openEdit = () => {
    setForm({
      full_name: profile.full_name ?? '',
      bio: profile.bio ?? '',
      phone: profile.phone ?? '',
      city: profile.city ?? '',
      website: profile.website ?? '',
    })
    setEditing(true)
  }

  // Φωτογραφία προφίλ — όπως το web: ανέβασμα στο «profiles» και PATCH.
  const [uploading, setUploading] = useState(false)
  const changePhoto = async () => {
    setUploading(true)
    try {
      const url = await pickAndUploadImage('profiles')
      if (!url) return
      await api.patch('/users/me', { profile_photo: url })
      await updateUser({ profile_photo: url })
      qc.invalidateQueries({ queryKey: ['me'] })
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message === 'permission'
        ? t('providerEdit.photoPermission')
        : e?.response?.data?.message || t('providerEdit.errUpload'))
    } finally { setUploading(false) }
  }

  // Επίπεδο και πρόοδος — ίδιος υπολογισμός με το web.
  const tier: string = loyalty?.tier || 'bronze'
  const totalPoints: number = loyalty?.total_points ?? 0
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
  const tierLabel = (k: string) => t(`profile.${k}`, { defaultValue: k })

  const ACHIEVEMENTS = [
    { icon: '🐾', key: 'firstPet',   unlocked: pets.length >= 1 },
    { icon: '🛒', key: 'firstOrder', unlocked: myOrders.length >= 1 },
    { icon: '⭐', key: 'reviewer',   unlocked: myReviews.length >= 5 },
    { icon: '📅', key: 'regular',    unlocked: myBookings.length >= 10 },
    { icon: '🏆', key: 'gold',       unlocked: tier === 'gold' || tier === 'platinum' },
    { icon: '❤️', key: 'petLover',   unlocked: pets.length >= 3 },
  ]

  const STATS = [
    { key: 'pets', value: pets.length, labelKey: 'home.my_pets' },
    { key: 'bookings', value: myBookings.length, labelKey: 'profile.menu.bookings' },
    { key: 'orders', value: myOrders.length, labelKey: 'profile.menu.orders' },
    { key: 'points', value: totalPoints, labelKey: 'profile.points' },
    { key: 'reviews', value: myReviews.length, labelKey: 'productDetail.reviews' },
  ]

  const aiSt: string = aiStatus?.ai_subscription_status ?? 'none'
  const aiPlan = aiStatus?.plan
  const aiPlanName = aiPlan ? ((i18n.language === 'el' && aiPlan.name_el) ? aiPlan.name_el : aiPlan.name) : null
  const aiText =
    aiSt === 'trial' ? t('accountHub.aiTrial', { count: Math.max(0, Number(aiStatus?.trial_days_left ?? 0)) })
    : aiSt === 'active' ? (aiPlanName ? t('accountHub.aiActive', { plan: aiPlanName }) : t('mySubs.status_active'))
    : aiSt === 'payment_failed' ? t('aiGate.paymentFailedShort')
    : aiSt === 'cancelled' ? t('mySubs.status_cancelled')
    : aiSt === 'expired' ? t('home.trialExpired')
    : t('accountHub.aiNone')
  const aiRenews = aiSt === 'active' && aiStatus?.current_period_end ? fmtDateShort(String(aiStatus.current_period_end), i18n.language) : ''
  const aiTone = aiSt === 'payment_failed' || aiSt === 'expired' ? colors.danger
    : aiSt === 'active' || aiSt === 'trial' ? colors.success : colors.textMuted

  const hasPassword = !((user as any)?.google_id || (user as any)?.facebook_id)

  const GROUPS: { key: string; titleKey: string; items: MenuItem[] }[] = [
    { key: 'activity', titleKey: 'accountHub.activity', items: [
      { key: 'bookings', Icon: Calendar, labelKey: 'profile.menu.bookings', route: '/bookings' },
      { key: 'orders',   Icon: Package,  labelKey: 'profile.menu.orders',   route: '/orders' },
      { key: 'wishlist', Icon: Heart,    labelKey: 'wishlist.title',        route: '/wishlist' },
      { key: 'reviews',  Icon: Star,     labelKey: 'myReviews.title',       route: '/my-reviews' },
    ] },
    { key: 'pets', titleKey: 'home.my_pets', items: [
      // Η επικεφαλίδα λέει ήδη «Τα κατοικίδιά μου»· η γραμμή δείχνει πόσα είναι.
      { key: 'pets', Icon: PawPrint, label: t('accountHub.petsCount', { count: pets.length }), route: '/(tabs)/pets' },
    ] },
  ]
  const GROUPS_AFTER: { key: string; titleKey: string; items: MenuItem[] }[] = [
    { key: 'messages', titleKey: 'accountHub.messages', items: [
      // Μηνύματα από παρόχους (ίδιο με το «Μηνύματα» στο μενού χρήστη του web).
      { key: 'inbox',       Icon: MessageSquareText, labelKey: 'inbox.title',          route: '/inbox', count: inboxUnread },
      { key: 'notifCenter', Icon: Bell,              labelKey: 'notifCenter.title',    route: '/notifications', count: notifUnread },
      { key: 'notifSettings', Icon: Settings,        labelKey: 'accountHub.notifSettings', route: '/notification-settings' },
    ] },
    { key: 'security', titleKey: 'accountHub.security', items: [
      { key: 'edit',     Icon: Pencil,   labelKey: 'profile.editProfile',    onPress: () => openEdit() },
      // Λογαριασμός Google/Facebook χωρίς κωδικό: καμία «Αλλαγή κωδικού» (ίδιο με το web).
      ...(hasPassword ? [{ key: 'password', Icon: KeyRound, labelKey: 'account.changePassword', route: '/change-password' }] : []),
      { key: 'language', Icon: Globe,    labelKey: 'language.title',         route: '/language' },
    ] },
    { key: 'privacy', titleKey: 'accountHub.privacy', items: [
      { key: 'privacy',  Icon: ShieldCheck,       labelKey: 'privacy.title',           route: '/privacy' },
      { key: 'consents', Icon: SlidersHorizontal, labelKey: 'consents.title',          route: '/consents' },
      { key: 'policy',   Icon: Lock,              labelKey: 'legalDocs.privacyPolicy', route: '/privacy-policy' },
    ] },
    { key: 'help', titleKey: 'accountHub.helpTerms', items: [
      { key: 'help',  Icon: LifeBuoy, labelKey: 'account.menuHelp', route: '/help' },
      { key: 'terms', Icon: FileText, labelKey: 'legalDocs.terms',  route: '/terms' },
    ] },
  ]

  const renderRow = (m: MenuItem, last: boolean) => (
    <TouchableOpacity key={m.key} style={[s.row, last && s.rowLast]} activeOpacity={0.7}
      onPress={() => m.onPress ? m.onPress() : router.push(m.route as any)}>
      <View style={s.rowIcon}>
        <m.Icon size={icon.md} color={colors.brand} />
      </View>
      <View style={s.rowBody}>
        <Text style={s.rowLabel} numberOfLines={1}>{m.label ?? (m.labelKey ? t(m.labelKey) : '')}</Text>
        {!!m.sub && <Text style={s.rowSub} numberOfLines={1}>{m.sub}</Text>}
      </View>
      {!!m.count && m.count > 0 && (
        <View style={s.countPill}>
          <Text style={s.countPillText}>{m.count > 99 ? '99+' : m.count}</Text>
        </View>
      )}
      <ChevronRight size={icon.md} color={colors.textLight} />
    </TouchableOpacity>
  )
  const renderGroup = (g: { key: string; titleKey: string; items: MenuItem[] }) => (
    <View key={g.key} style={s.group}>
      <Text style={s.groupTitle}>{t(g.titleKey)}</Text>
      <View style={s.menu}>
        {g.items.map((m, i) => renderRow(m, i === g.items.length - 1))}
      </View>
    </View>
  )

  const confirmLogout = () => {
    Alert.alert(t('profile.logout_title'), t('profile.logout_question'), [
      { text: t('common.dismiss'), style: 'cancel' },
      { text: t('profile.logout_title'), style: 'destructive', onPress: () => logout() },
    ])
  }

  if (!isAuthenticated) return (
    <View style={s.container}>
      <View style={s.header}><Text style={s.title}>{t('tabs.profile')}</Text></View>
      <View style={s.empty}>
        <UserIcon size={icon.hero} color={colors.border} />
        <Text style={s.emptyTitle}>{t('profile.not_logged_in')}</Text>
        <Text style={s.emptyText}>{t('profile.login_prompt')}</Text>
        <TouchableOpacity style={s.primaryBtn} activeOpacity={0.85}
          onPress={() => router.push('/auth/login' as any)}>
          <Text style={s.primaryBtnText}>{t('auth.sign_in')}</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/auth/register' as any)}>
          <Text style={s.linkText}>{t('profile.no_account')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  const initials = profile.full_name?.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: tabSpace.paddingBottom }}>

      <View style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity activeOpacity={0.8} onPress={changePhoto} disabled={uploading}>
            <View style={s.avatar}>
              {profile.profile_photo
                ? <Image source={{ uri: profile.profile_photo }} style={s.avatarImg} />
                : <Text style={s.initials}>{initials || '🐾'}</Text>}
            </View>
            <View style={s.avatarBadge}>
              {uploading
                ? <ActivityIndicator size="small" color={colors.textOnDark} />
                : <Camera size={icon.xs} color={colors.textOnDark} />}
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.name} numberOfLines={1}>{profile.full_name}</Text>
            <Text style={s.email} numberOfLines={1}>{profile.email}</Text>
            <Text style={s.role} numberOfLines={1}>
              {profile.role === 'admin' ? t('profile.admin')
                : profile.role === 'service_provider' ? t('profile.provider') : t('profile.owner')}
            </Text>
          </View>
          {/* Ε17: ίδιο καμπανάκι με τις άλλες καρτέλες, πάνω δεξιά. */}
          <View style={s.headerBell}><NotificationBell /></View>
        </View>
        <TouchableOpacity style={s.editPill} activeOpacity={0.8} onPress={openEdit}>
          <Pencil size={icon.xs} color={colors.textOnDark} />
          <Text style={s.editPillText} numberOfLines={1}>{t('profile.editProfile')}</Text>
        </TouchableOpacity>
      </View>

      {/* Ε18 — GlobiPet Plus στην κορυφή: μέλος → ανανέωση· όχι → «Γίνε μέλος» με τιμή. */}
      {showMemberCard && (
        <TouchableOpacity activeOpacity={0.7}
          style={[s.row, s.memberCard, mSt === 'payment_failed' && s.memberCardDanger]}
          onPress={() => router.push('/membership' as any)}>
          {/* Ίδια με το web: προειδοποίηση + κόκκινο μήνυμα στην αποτυχημένη πληρωμή, δεξιά μόνο το βέλος. */}
          <View style={[s.rowIcon, { backgroundColor: mSt === 'payment_failed' ? colors.dangerBg : colors.brandTint }]}>
            {mSt === 'payment_failed'
              ? <TriangleAlert size={icon.md} color={colors.danger} />
              : <Crown size={icon.md} color={colors.brand} />}
          </View>
          <View style={s.rowBody}>
            <Text style={[s.rowLabel, s.memberLabel]} numberOfLines={2}>{mLabel}</Text>
            {mSt === 'payment_failed' ? (
              <Text style={[s.rowSub, { color: colors.danger }]} numberOfLines={2}>{t('membership.cardPaymentFailed')}</Text>
            ) : !mIsMember && !!mPrice && (
              <Text style={s.rowSub} numberOfLines={1}>{t('membership.cardPrice', { price: mPrice })}</Text>
            )}
          </View>
          <ChevronRight size={icon.md} color={colors.textLight} />
        </TouchableOpacity>
      )}

      {/* Στοιχεία προφίλ — όπως στο web. */}
      {(profile.bio || profile.city || profile.phone || profile.website) ? (
        <View style={s.info}>
          {profile.bio ? <Text style={s.bio}>{profile.bio}</Text> : null}
          <View style={s.infoRow}>
            {profile.city ? (
              <View style={s.infoItem}><MapPin size={icon.xs} color={colors.textMuted} /><Text style={s.infoTxt}>{profile.city}</Text></View>
            ) : null}
            {profile.phone ? (
              <View style={s.infoItem}><Phone size={icon.xs} color={colors.textMuted} /><Text style={s.infoTxt}>{profile.phone}</Text></View>
            ) : null}
            {/* Ε13: ανοίγει ΜΟΝΟ http(s) — μια παλιά τιμή javascript:/tel:/intent: μένει απλό κείμενο. */}
            {profile.website && !/^https?:\/\//i.test(String(profile.website).trim()) ? (
              <View style={s.infoItem}><Globe size={icon.xs} color={colors.textMuted} /><Text style={s.infoTxt} numberOfLines={1}>{profile.website}</Text></View>
            ) : profile.website ? (
              <TouchableOpacity style={s.infoItem} onPress={() => Linking.openURL(String(profile.website).trim()).catch(() => {})}>
                <Globe size={icon.xs} color={colors.brand} /><Text style={[s.infoTxt, { color: colors.brand }]} numberOfLines={1}>{profile.website}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Ο «both» είναι και πάροχος: του δίνουμε την είσοδο στον χώρο
          παρόχου πάνω από τα υπόλοιπα, γιατί είναι η δουλειά του. Ο καθαρός
          πάροχος δεν φτάνει ποτέ εδώ — τον στέλνει κατευθείαν το _layout. */}
      {(user?.role === 'both' || user?.role === 'service_provider') && (
        <TouchableOpacity activeOpacity={0.7} style={[s.row, s.rowProvider]}
          onPress={() => router.push('/(provider)' as any)}>
          <View style={[s.rowIcon, { backgroundColor: colors.brandTint }]}>
            <LayoutDashboard size={icon.md} color={colors.brand} />
          </View>
          <Text style={[s.rowLabel, { flex: 1, color: colors.brand, fontWeight: weight.bold }]}>{t('providerDash.title')}</Text>
          <ChevronRight size={icon.sm} color={colors.brand} />
        </TouchableOpacity>
      )}

      {/* Προσκλήσεις στο προσωπικό παρόχου — ίδια κάρτα με το web· κρύβεται όταν δεν υπάρχει καμία. */}
      <StaffInvitationsCard style={s.invitations} />

      {/* Σύνοψη δραστηριότητας (συγκεντρωτικά στοιχεία). */}
      <View style={[s.statsGrid, s.statsWrap]}>
        {STATS.map(st => (
          <View key={st.key} style={s.stat}>
            <Text style={s.statValue}>{st.value}</Text>
            <Text style={s.statLabel} numberOfLines={1}>{t(st.labelKey)}</Text>
          </View>
        ))}
      </View>

      {/* (1) Συνδρομές: συνδρομή AI (κατάσταση / μέρες δοκιμής) και τροφής. */}
      <View style={s.group}>
        <Text style={s.groupTitle}>{t('accountHub.subscriptions')}</Text>
        <View style={s.menu}>
          <TouchableOpacity style={s.row} activeOpacity={0.7}
            onPress={() => router.push('/pricing' as any)}>
            <View style={s.rowIcon}><Sparkles size={icon.md} color={colors.brand} /></View>
            <View style={s.rowBody}>
              <Text style={s.rowLabel} numberOfLines={1}>{t('aiGate.subscriptionLabel')}</Text>
              <Text style={[s.rowSub, { color: aiTone }]} numberOfLines={1}>{aiText}</Text>
              {!!aiRenews && <Text style={s.rowSub} numberOfLines={1}>{t('accountHub.aiRenews', { date: aiRenews })}</Text>}
            </View>
            <Text style={s.rowAction} numberOfLines={1}>{t('accountHub.plans')}</Text>
            <ChevronRight size={icon.md} color={colors.textLight} />
          </TouchableOpacity>
          <TouchableOpacity style={s.row} activeOpacity={0.7}
            onPress={() => router.push('/subscriptions' as any)}>
            <View style={s.rowIcon}><RotateCcw size={icon.md} color={colors.brand} /></View>
            <View style={s.rowBody}>
              <Text style={s.rowLabel} numberOfLines={1}>{t('accountHub.foodSubs')}</Text>
              <Text style={s.rowSub} numberOfLines={1}>
                {foodLive > 0 ? t('accountHub.foodSubsCount', { count: foodLive }) : t('accountHub.foodSubsNone')}
              </Text>
            </View>
            <ChevronRight size={icon.md} color={colors.textLight} />
          </TouchableOpacity>
          {/* Ε18 — ιστορικό πληρωμών, αποδεικτικά και κάρτα (Stripe). */}
          {renderRow({ key: 'payments', Icon: Receipt, labelKey: 'payments.title', sub: t('payments.rowSub'), route: '/payments' }, true)}
        </View>
      </View>

      {/* (2) Η δραστηριότητά μου · (3) Τα κατοικίδιά μου */}
      {GROUPS.map(renderGroup)}

      {/* (4) Επιβραβεύσεις — επίπεδο, πρόοδος και επιτεύγματα (όπως στο web). */}
      <View style={s.group}>
        <Text style={s.groupTitle}>{t('accountHub.rewards')}</Text>
        <View style={s.tierCard}>
          <Text style={s.tierTitle}>{t('profile.tier')} — {tierLabel(tier)}</Text>
          <View style={s.track}>
            <View style={[s.fill, { width: `${tierProgress}%` }]} />
          </View>
          <View style={s.tierMeta}>
            <Text style={s.statLabel}>{lifetimePoints} {t('profile.points')}</Text>
            <Text style={s.statLabel}>
              {!loyalty ? '' : nextTier && nextThreshold !== null ? t('profile.pointsForTier', { points: nextThreshold, tier: tierLabel(nextTier) }) : t('profile.maxTier')}
            </Text>
          </View>
        </View>

        {/* Επιτεύγματα — ίδιοι κανόνες με το web. */}
        <Text style={s.achTitle}>{t('profile.achievements')}</Text>
        <View style={s.statsGrid}>
          {ACHIEVEMENTS.map(a => (
            <View key={a.key} style={[s.ach, !a.unlocked && { opacity: 0.4 }]}>
              <Text style={s.achIcon}>{a.icon}</Text>
              <Text style={s.achName} numberOfLines={1}>{t(`profile.ach_${a.key}Title`)}</Text>
              <Text style={[s.statLabel, { textAlign: 'center' }]} numberOfLines={2}>{t(`profile.ach_${a.key}Desc`)}</Text>
            </View>
          ))}
        </View>

        <View style={s.menu}>
          {renderRow({ key: 'loyalty', Icon: Trophy, labelKey: 'accountHub.tiersHow', route: '/loyalty' }, true)}
        </View>
      </View>

      {/* (5)–(8) */}
      {GROUPS_AFTER.map(renderGroup)}

      <TouchableOpacity style={s.logout} activeOpacity={0.7} onPress={confirmLogout}>
        <LogOut size={icon.md} color={colors.danger} />
        <Text style={s.logoutText}>{t('profile.logout_title')}</Text>
      </TouchableOpacity>
      <Modal visible={editing} transparent animationType="slide" onRequestClose={() => setEditing(false)}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{t('profile.editProfile')}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: space.md }}>
            {([
              ['full_name', 'auth.full_name'],
              ['bio', 'profile.bio'],
              ['phone', 'common.phone'],
              ['city', 'common.city'],
              ['website', 'profile.website'],
            ] as const).map(([key, labelKey]) => (
              <View key={key}>
                <Text style={s.inputLabel}>{t(labelKey)}</Text>
                <TextInput style={[s.input, key === 'bio' && { minHeight: 72, textAlignVertical: 'top' }]}
                  value={form[key] ?? ''}
                  onChangeText={v => setForm(f => ({ ...f, [key]: v }))}
                  multiline={key === 'bio'}
                  placeholder={key === 'bio' ? t('profile.bioPlaceholder') : key === 'website' ? 'https://...' : undefined}
                  placeholderTextColor={colors.textLight}
                  autoCapitalize={key === 'website' ? 'none' : 'sentences'}
                  keyboardType={key === 'phone' ? 'phone-pad' : key === 'website' ? 'url' : 'default'} />
              </View>
            ))}
            </ScrollView>
            <View style={s.sheetActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setEditing(false)}>
                <Text style={s.cancelTxt}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn}
                disabled={!form.full_name?.trim() || saveProfile.isPending}
                onPress={() => saveProfile.mutate()}>
                <Text style={s.saveTxt}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  )
}

const s = StyleSheet.create({
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md },
  stat: {
    width: '48%', alignItems: 'center', paddingVertical: space.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  statValue: { ...type.title, color: colors.brand, fontWeight: weight.black },
  statLabel: { ...type.caption, color: colors.textMuted },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface, padding: space.lg, gap: space.md,
    borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, maxHeight: '88%',
  },
  avatarBadge: {
    position: 'absolute', right: -2, bottom: -2,
    width: 26, height: 26, borderRadius: radius.full,
    backgroundColor: colors.brand, borderWidth: 2, borderColor: colors.navy,
    alignItems: 'center', justifyContent: 'center',
  },
  role: { ...type.caption, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  info: {
    marginTop: space.lg, marginHorizontal: space.lg, padding: space.lg, gap: space.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg, ...shadow.sm,
  },
  bio: { ...type.body, color: colors.text },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: space.xs, maxWidth: '100%' },
  infoTxt: { ...type.caption, color: colors.textMuted, flexShrink: 1 },
  statsWrap: { marginTop: space.xl, marginHorizontal: space.lg, marginBottom: 0 },
  // Ενότητα: επικεφαλίδα + κάρτα γραμμών. Ίδιο στυλ επικεφαλίδας με την «Εξερεύνησε».
  group: { marginTop: space.xl, marginHorizontal: space.lg },
  groupTitle: { ...type.section, color: colors.text, fontWeight: weight.bold, marginBottom: space.md },
  invitations: { marginTop: space.xl, marginHorizontal: space.lg },
  tierCard: {
    padding: space.md, marginBottom: space.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  tierTitle: { ...type.body, color: colors.text, fontWeight: weight.semibold, marginBottom: space.sm },
  track: { height: 10, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  fill: { height: 10, borderRadius: radius.full, backgroundColor: colors.brand },
  tierMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm, marginTop: space.xs },
  achTitle: { ...type.body, color: colors.text, fontWeight: weight.semibold, marginBottom: space.sm },
  ach: {
    width: '48%', alignItems: 'center', padding: space.md, gap: 2,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  achIcon: { fontSize: 28 },
  achName: { ...type.caption, color: colors.text, fontWeight: weight.semibold, textAlign: 'center' },
  sheetTitle: { ...type.section, color: colors.text },
  inputLabel: { ...type.caption, color: colors.textMuted, marginBottom: 4 },
  input: {
    ...type.body, color: colors.text,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
    paddingHorizontal: space.md, paddingVertical: space.sm,
  },
  sheetActions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  cancelBtn: {
    flex: 1, paddingVertical: space.md, alignItems: 'center',
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
  },
  cancelTxt: { ...type.body, color: colors.textMuted, fontWeight: weight.semibold },
  saveBtn: { flex: 1, paddingVertical: space.md, alignItems: 'center', borderRadius: radius.lg, backgroundColor: colors.brand },
  saveTxt: { ...type.body, color: colors.textOnDark, fontWeight: weight.bold },
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    // Σταθερό και ασφαλές: η κεφαλίδα μπορεί να αποδοθεί σε πολλά
    // σημεία της ίδιας οθόνης (συνδεδεμένος / αποσυνδεδεμένος χρήστης),
    // και inline παράκαμψη θα ίσχυε μόνο σε όποια θυμηθεί κανείς.
    paddingTop: HEADER_TOP,
    backgroundColor: colors.navy,
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
  },
  title: { ...type.title, color: colors.textOnDark, fontWeight: weight.bold },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  // Το καμπανάκι στοιχίζεται στην κορυφή της γραμμής (ίδιο ύψος με τις άλλες καρτέλες).
  headerBell: { alignSelf: 'flex-start' },
  editPill: {
    flexDirection: 'row', alignItems: 'center', gap: space.xs,
    alignSelf: 'flex-start',
    marginTop: space.md, marginLeft: 72 + space.lg,
    minHeight: 32, paddingHorizontal: space.md,
    borderRadius: radius.full,
    backgroundColor: colors.navySoft,
  },
  editPillText: { ...type.caption, color: colors.textOnDark, fontWeight: weight.semibold },
  avatar: {
    width: 72, height: 72, borderRadius: radius.full,
    backgroundColor: colors.navySoft,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 72, height: 72 },
  initials: { ...type.section, color: colors.textOnDark, fontWeight: weight.bold },
  name: { ...type.section, color: colors.textOnDark, fontWeight: weight.bold },
  email: { ...type.body, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  menu: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.sm,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    minHeight: touch.comfortable + space.sm,
    paddingHorizontal: space.lg,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  rowLast: { borderBottomWidth: 0 },
  rowBody: { flex: 1, minWidth: 0 },
  rowSub: { ...type.caption, color: colors.textMuted, marginTop: 1 },
  rowAction: { ...type.caption, color: colors.brand, fontWeight: weight.semibold, maxWidth: 110 },
  // Ε18 — κάρτα μέλους: ίδια γραμμή με το μενού, ως αυτόνομη κάρτα στην κορυφή.
  memberCard: {
    borderWidth: 1.5, borderColor: colors.brand, borderBottomWidth: 1.5, borderBottomColor: colors.brand,
    borderRadius: radius.lg, backgroundColor: colors.surface,
    marginTop: space.lg, marginHorizontal: space.lg, paddingVertical: space.sm,
  },
  memberCardDanger: { borderColor: colors.danger, borderBottomColor: colors.danger },
  memberLabel: { fontWeight: weight.semibold },
  rowProvider: {
    borderWidth: 1.5, borderColor: colors.brand, borderBottomWidth: 1.5, borderBottomColor: colors.brand,
    borderRadius: radius.lg, backgroundColor: colors.surface,
    marginTop: space.xl, marginHorizontal: space.lg,
  },
  rowIcon: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.brandLight,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { flexShrink: 1, ...type.body, color: colors.text, fontWeight: weight.medium },
  countPill: {
    minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11,
    backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center',
  },
  countPillText: { ...type.caption, color: colors.textOnDark, fontWeight: weight.bold },

  logout: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm,
    marginTop: space.xl, marginHorizontal: space.lg,
    height: touch.comfortable,
    borderRadius: radius.md,
    backgroundColor: colors.dangerBg,
  },
  logoutText: { ...type.body, color: colors.danger, fontWeight: weight.bold },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: space.xl, gap: space.sm },
  emptyTitle: { ...type.emphasis, color: colors.text, fontWeight: weight.semibold, marginTop: space.md },
  emptyText: { ...type.body, color: colors.textMuted, textAlign: 'center' },
  primaryBtn: {
    height: touch.comfortable, paddingHorizontal: space.xxxl,
    borderRadius: radius.md, backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center', marginTop: space.lg,
  },
  primaryBtnText: { ...type.emphasis, color: '#fff', fontWeight: weight.bold },
  linkText: { ...type.body, color: colors.brand, fontWeight: weight.semibold, marginTop: space.md },
})
