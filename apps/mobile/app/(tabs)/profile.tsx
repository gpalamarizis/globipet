import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import {
  PawPrint, Calendar, Package, MapPin, Stethoscope, Globe,
  ShieldCheck, ChevronRight, LogOut, User as UserIcon,
} from 'lucide-react-native'
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
  { key: 'pets',       Icon: PawPrint,    label: 'Τα κατοικίδιά μου', route: '/(tabs)/pets' },
  { key: 'bookings',   Icon: Calendar,    label: 'Κρατήσεις',         route: '/bookings' },
  { key: 'orders',     Icon: Package,     label: 'Παραγγελίες',       route: '/orders' },
  { key: 'passport',   Icon: ShieldCheck, label: 'Ιατρικός φάκελος',  route: '/passport' },
  { key: 'tracker',    Icon: MapPin,      label: 'Εντοπισμός GPS',    route: '/tracker' },
  { key: 'telehealth', Icon: Stethoscope, label: 'Τηλεϊατρική',       route: '/telehealth' },
  { key: 'language',   Icon: Globe,       label: 'Γλώσσα',            route: '/language' },
]

export default function ProfileScreen() {
  const router = useRouter()
  const { user, isAuthenticated, logout } = useAuthStore()

  const confirmLogout = () => {
    Alert.alert('Αποσύνδεση', 'Θέλεις να αποσυνδεθείς;', [
      { text: 'Άκυρο', style: 'cancel' },
      { text: 'Αποσύνδεση', style: 'destructive', onPress: () => logout() },
    ])
  }

  if (!isAuthenticated) return (
    <View style={s.container}>
      <View style={s.header}><Text style={s.title}>Προφίλ</Text></View>
      <View style={s.empty}>
        <UserIcon size={icon.hero} color={colors.border} />
        <Text style={s.emptyTitle}>Δεν είσαι συνδεδεμένος</Text>
        <Text style={s.emptyText}>
          Συνδέσου για να δεις τα κατοικίδια, τις κρατήσεις και τις παραγγελίες σου.
        </Text>
        <TouchableOpacity style={s.primaryBtn} activeOpacity={0.85}
          onPress={() => router.push('/auth/login' as any)}>
          <Text style={s.primaryBtnText}>Σύνδεση</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/auth/register' as any)}>
          <Text style={s.linkText}>Δεν έχεις λογαριασμό; Εγγραφή</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  const initials = user?.full_name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}>

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
        {MENU.map(({ key, Icon, label, route }) => (
          <TouchableOpacity key={key} style={s.row} activeOpacity={0.7}
            onPress={() => router.push(route as any)}>
            <View style={s.rowIcon}>
              <Icon size={icon.md} color={colors.brand} />
            </View>
            <Text style={s.rowLabel}>{label}</Text>
            <ChevronRight size={icon.md} color={colors.textLight} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={s.logout} activeOpacity={0.7} onPress={confirmLogout}>
        <LogOut size={icon.md} color={colors.danger} />
        <Text style={s.logoutText}>Αποσύνδεση</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    backgroundColor: colors.navy,
    paddingTop: space.xxxl + space.lg,
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
