import { useState } from 'react'
import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Alert, Platform, StatusBar, Modal, TextInput, Linking, ActivityIndicator } from 'react-native'
import { useTabSpace } from '@/hooks/useTabSpace'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { PawPrint, Calendar, Package, MapPin, Stethoscope, Globe, ShieldCheck, ChevronRight, LogOut, User as UserIcon, LayoutDashboard, Sparkles, Heart, Pencil, SlidersHorizontal, FileText, Lock, Bell, KeyRound, LifeBuoy, RotateCcw, Camera, Phone, Inbox } from 'lucide-react-native'
import { useAuthStore } from '../../src/store/auth'
import { pickAndUploadImage } from '@/lib/uploadImage'
import { colors, space, radius, type, weight, shadow, icon, touch } from '@/theme'

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
 * Προφίλ.
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
const TIER_THRESHOLDS: Record<string, number> = { bronze: 0, silver: 1000, gold: 5000, platinum: 10000 }
const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum']

const MENU = [
  { key: 'pets',       Icon: PawPrint,    labelKey: 'home.my_pets', route: '/(tabs)/pets' },
  { key: 'bookings',   Icon: Calendar,    labelKey: 'profile.menu.bookings',         route: '/bookings' },
  { key: 'orders',     Icon: Package,     labelKey: 'profile.menu.orders',       route: '/orders' },
  { key: 'subscriptions', Icon: RotateCcw, labelKey: 'mySubs.title',            route: '/subscriptions' },
  { key: 'passport',   Icon: ShieldCheck, labelKey: 'discover.medical_record',  route: '/passport' },
  { key: 'tracker',    Icon: MapPin,      labelKey: 'discover.gps_tracking',    route: '/tracker' },
  { key: 'telehealth', Icon: Stethoscope, labelKey: 'profile.menu.telehealth',       route: '/telehealth' },
  { key: 'wishlist',   Icon: Heart,       labelKey: 'wishlist.title',            route: '/wishlist' },
  { key: 'pricing',    Icon: Sparkles,    labelKey: 'pricing.title',             route: '/pricing' },
  { key: 'notifCenter', Icon: Bell,       labelKey: 'notifCenter.title',         route: '/notifications' },
  // Μηνύματα από παρόχους (ίδιο με το «Μηνύματα» στο μενού χρήστη του web).
  { key: 'inbox',      Icon: Inbox,       labelKey: 'inbox.title',               route: '/inbox' },
  { key: 'notifications', Icon: Bell,     labelKey: 'account.notifications',     route: '/notification-settings' },
  { key: 'password',   Icon: KeyRound,    labelKey: 'account.changePassword',    route: '/change-password' },
  { key: 'language',   Icon: Globe,       labelKey: 'language.title',            route: '/language' },
  { key: 'privacy',    Icon: ShieldCheck, labelKey: 'privacy.title',             route: '/privacy' },
  { key: 'consents',   Icon: SlidersHorizontal, labelKey: 'consents.title',      route: '/consents' },
  { key: 'terms',      Icon: FileText,    labelKey: 'legalDocs.terms',           route: '/terms' },
  { key: 'policy',     Icon: Lock,        labelKey: 'legalDocs.privacyPolicy',   route: '/privacy-policy' },
  { key: 'help',       Icon: LifeBuoy,    labelKey: 'account.menuHelp',          route: '/help' },
]

export default function ProfileScreen() {

  const tabSpace = useTabSpace()
  const { t } = useTranslation()
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
  const nextTier = TIER_ORDER[TIER_ORDER.indexOf(tier) + 1]
  const nextThreshold = nextTier ? TIER_THRESHOLDS[nextTier] : null
  // Το επίπεδο βγαίνει από τους πόντους όλων των εποχών (backend loyalty.ts), όχι από το
  // τρέχον υπόλοιπο που μειώνεται στις εξαργυρώσεις· η πρόοδος μετράει από το όριο του τρέχοντος επιπέδου.
  const lifetimePoints: number = loyalty?.lifetime_points ?? totalPoints
  const curThreshold = TIER_THRESHOLDS[tier] ?? 0
  const tierProgress = nextThreshold
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
        </View>
      </View>

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
            {profile.website ? (
              <TouchableOpacity style={s.infoItem} onPress={() => Linking.openURL(profile.website).catch(() => {})}>
                <Globe size={icon.xs} color={colors.brand} /><Text style={[s.infoTxt, { color: colors.brand }]} numberOfLines={1}>{profile.website}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={s.loyaltyWrap}>
        {/* Επίπεδο επιβράβευσης και πρόοδος — όπως στο web. */}
        <View style={s.tierCard}>
          <Text style={s.tierTitle}>{t('profile.tier')} — {tierLabel(tier)}</Text>
          <View style={s.track}>
            <View style={[s.fill, { width: `${tierProgress}%` }]} />
          </View>
          <View style={s.tierMeta}>
            <Text style={s.statLabel}>{lifetimePoints} {t('profile.points')}</Text>
            <Text style={s.statLabel}>
              {nextThreshold ? t('profile.pointsForTier', { points: nextThreshold, tier: tierLabel(nextTier) }) : t('profile.maxTier')}
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
      </View>

      <View style={s.menu}>
        {/* Ο «both» είναι και πάροχος: του δίνουμε την είσοδο στον χώρο
            παρόχου πάνω από τα υπόλοιπα, γιατί είναι η δουλειά του. Ο καθαρός
            πάροχος δεν φτάνει ποτέ εδώ — τον στέλνει κατευθείαν το _layout. */}
        {(user?.role === 'both' || user?.role === 'service_provider') && (
          <TouchableOpacity activeOpacity={0.7} style={[s.row, s.rowProvider]}
            onPress={() => router.push('/(provider)' as any)}>
            <View style={[s.rowIcon, { backgroundColor: colors.brandTint }]}>
              <LayoutDashboard size={icon.md} color={colors.brand} />
            </View>
            <Text style={[s.rowLabel, { color: colors.brand, fontWeight: weight.bold }]}>{t('providerDash.title')}</Text>
            <ChevronRight size={icon.sm} color={colors.brand} />
          </TouchableOpacity>
        )}

        {/* Σύνοψη δραστηριότητας: τέσσερις αριθμοί που ο χρήστης δεν
            έβλεπε πουθενά στο κινητό. */}
        <View style={s.statsGrid}>
          {STATS.map(st => (
            <View key={st.key} style={s.stat}>
              <Text style={s.statValue}>{st.value}</Text>
              <Text style={s.statLabel} numberOfLines={1}>{t(st.labelKey)}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity activeOpacity={0.7} style={s.row} onPress={openEdit}>
          <View style={s.rowIcon}><Pencil size={icon.md} color={colors.brand} /></View>
          <Text style={s.rowLabel}>{t('profile.editProfile')}</Text>
          <ChevronRight size={icon.sm} color={colors.textLight} />
        </TouchableOpacity>

        {/* Λογαριασμός Google/Facebook χωρίς κωδικό: καμία «Αλλαγή κωδικού» (ίδιο με το web). */}
        {MENU.filter(m => !(m.key === 'password' && (!!(user as any)?.google_id || !!(user as any)?.facebook_id))).map(({ key, Icon, labelKey, route }) => (
          <TouchableOpacity key={key} style={s.row} activeOpacity={0.7}
            onPress={() => router.push(route as any)}>
            <View style={s.rowIcon}>
              <Icon size={icon.md} color={colors.brand} />
            </View>
            <Text style={s.rowLabel}>{t(labelKey)}</Text>
            {key === 'inbox' && inboxUnread > 0 && (
              <View style={s.countPill}>
                <Text style={s.countPillText}>{inboxUnread > 99 ? '99+' : inboxUnread}</Text>
              </View>
            )}
            <ChevronRight size={icon.md} color={colors.textLight} />
          </TouchableOpacity>
        ))}
      </View>

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
  loyaltyWrap: { marginTop: space.xl, marginHorizontal: space.lg },
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
    marginTop: space.xl, marginHorizontal: space.lg,
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
  rowProvider: { borderWidth: 1.5, borderColor: colors.brand, marginBottom: space.sm },
  rowIcon: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.brandLight,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { flex: 1, ...type.body, color: colors.text, fontWeight: weight.medium },
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
