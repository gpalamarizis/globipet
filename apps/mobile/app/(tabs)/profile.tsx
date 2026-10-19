import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native'
import { useTabSpace } from '@/hooks/useTabSpace'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { PawPrint, Calendar, Package, MapPin, Stethoscope, Globe, ShieldCheck, ChevronRight, LogOut, User as UserIcon, LayoutDashboard, Sparkles, Heart } from 'lucide-react-native'
import { useAuthStore } from '../../src/store/auth'
import { colors, space, radius, type, weight, shadow, icon, touch } from '@/theme'

/**
 * Προφίλ.
 *
 * ΤΙ ΑΛΛΑΞΕ
 *   Το μενού έδειχνε σε τρεις διαδρομές που δεν υπάρχουν ως οθόνες στο
 *   κινητό: /wishlist, /settings, και /pets αντί για /(tabs)/pets. Ο
 *   χρήστης πατούσε και δεν γινόταν τίποτα — ούτε σφάλμα, ούτε πλοήγηση.
 *
 *   Η γλώσσα (language.tsx) υπήρχε ως οθόνη χωρίς κανένα σημείο εισόδου.
 */

const MENU = [
  { key: 'pets',       Icon: PawPrint,    labelKey: 'home.my_pets', route: '/(tabs)/pets' },
  { key: 'bookings',   Icon: Calendar,    labelKey: 'profile.menu.bookings',         route: '/bookings' },
  { key: 'orders',     Icon: Package,     labelKey: 'profile.menu.orders',       route: '/orders' },
  { key: 'passport',   Icon: ShieldCheck, labelKey: 'discover.medical_record',  route: '/passport' },
  { key: 'tracker',    Icon: MapPin,      labelKey: 'discover.gps_tracking',    route: '/tracker' },
  { key: 'telehealth', Icon: Stethoscope, labelKey: 'profile.menu.telehealth',       route: '/telehealth' },
  { key: 'wishlist',   Icon: Heart,       labelKey: 'wishlist.title',            route: '/wishlist' },
  { key: 'pricing',    Icon: Sparkles,    labelKey: 'pricing.title',             route: '/pricing' },
  { key: 'language',   Icon: Globe,       labelKey: 'language.title',            route: '/language' },
  { key: 'privacy',    Icon: ShieldCheck, labelKey: 'privacy.title',             route: '/privacy' },
]

export default function ProfileScreen() {
  const tabSpace = useTabSpace()
  const { t } = useTranslation()
  const router = useRouter()
  const { user, isAuthenticated, logout } = useAuthStore()

  const confirmLogout = () => {
    Alert.alert(t('profile.logout_title'), t('profile.logout_question'), [
      { text: t('common.dismiss'), style: 'cancel' },
      { text: t('profile.logout_title'), style: 'destructive', onPress: () => logout() },
    ])
  }

  if (!isAuthenticated) return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: tabSpace.insetTop + space.lg }]}><Text style={s.title}>{t('tabs.profile')}</Text></View>
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

  const initials = user?.full_name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: tabSpace.paddingBottom }}>

      <View style={s.header}>
        <View style={s.headerRow}>
          <View style={s.avatar}>
            {user?.profile_photo
              ? <Image source={{ uri: user.profile_photo }} style={s.avatarImg} />
              : <Text style={s.initials}>{initials || '🐾'}</Text>}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.name} numberOfLines={1}>{user?.full_name}</Text>
            <Text style={s.email} numberOfLines={1}>{user?.email}</Text>
          </View>
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

        {MENU.map(({ key, Icon, labelKey, route }) => (
          <TouchableOpacity key={key} style={s.row} activeOpacity={0.7}
            onPress={() => router.push(route as any)}>
            <View style={s.rowIcon}>
              <Icon size={icon.md} color={colors.brand} />
            </View>
            <Text style={s.rowLabel}>{t(labelKey)}</Text>
            <ChevronRight size={icon.md} color={colors.textLight} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={s.logout} activeOpacity={0.7} onPress={confirmLogout}>
        <LogOut size={icon.md} color={colors.danger} />
        <Text style={s.logoutText}>{t('profile.logout_title')}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
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
