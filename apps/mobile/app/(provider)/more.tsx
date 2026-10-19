import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { Package, Users, Megaphone, Languages, LogOut, ChevronRight, Globe, CalendarDays, BarChart3, Languages as Languages2, ShieldCheck, SlidersHorizontal, FileText, Lock } from 'lucide-react-native'
import { useAuthStore } from '../../src/store/auth'
import { Screen } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Τα υπόλοιπα του χώρου παρόχου.
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ
 *   Οι λειτουργίες του παρόχου είναι επτά, αλλά μια μπάρα κινητού χωράει
 *   πέντε: σε οθόνη 380 pixel η έκτη αφήνει 54 pixel ανά καρτέλα και οι
 *   ετικέτες κόβονται. Οι τέσσερις καθημερινές μένουν στη μπάρα, οι
 *   υπόλοιπες ζουν εδώ.
 */
const ITEMS = [
  { key: 'products',  Icon: Package,   labelKey: 'providerTabs.products',  route: '/(provider)/products' },
  { key: 'staff',     Icon: Users,     labelKey: 'providerTabs.staff',     route: '/(provider)/staff' },
  { key: 'campaigns', Icon: Megaphone, labelKey: 'providerTabs.campaigns', route: '/(provider)/campaigns' },
  { key: 'calendar',  Icon: CalendarDays, labelKey: 'providerTabs.calendar', route: '/(provider)/calendar' },
  { key: 'insights',  Icon: BarChart3,  labelKey: 'providerTabs.insights',  route: '/(provider)/insights' },
  { key: 'translations', Icon: Languages2, labelKey: 'providerTabs.translations', route: '/(provider)/translations' },
  { key: 'language',  Icon: Languages, labelKey: 'language.title',         route: '/language' },
  // Ο καθαρός πάροχος δεν βλέπει το καταναλωτικό προφίλ — χωρίς αυτά δεν
  // είχε πρόσβαση σε εξαγωγή/διαγραφή δεδομένων, συγκαταθέσεις και όρους.
  { key: 'privacy',   Icon: ShieldCheck, labelKey: 'privacy.title',         route: '/privacy' },
  { key: 'consents',  Icon: SlidersHorizontal, labelKey: 'consents.title',  route: '/consents' },
  { key: 'terms',     Icon: FileText,  labelKey: 'legalDocs.terms',         route: '/terms' },
  { key: 'policy',    Icon: Lock,      labelKey: 'legalDocs.privacyPolicy', route: '/privacy-policy' },
]

export default function ProviderMore() {
  const { t } = useTranslation()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  return (
    <Screen title={t('providerTabs.more')} subtitle={user?.email}>
      {ITEMS.map(({ key, Icon, labelKey, route }) => (
        <TouchableOpacity key={key} activeOpacity={0.7} style={s.row}
          onPress={() => router.push(route as any)}>
          <View style={s.rowIcon}><Icon size={icon.md} color={colors.brand} /></View>
          <Text style={s.rowLabel}>{t(labelKey)}</Text>
          <ChevronRight size={icon.sm} color={colors.textLight} />
        </TouchableOpacity>
      ))}

      {/* Ο πάροχος που είναι ΚΑΙ ιδιοκτήτης βλέπει και το καταναλωτικό
          μέρος. Ο καθαρός πάροχος δεν το χρειάζεται και δεν το δείχνουμε. */}
      {user?.role === 'both' && (
        <TouchableOpacity activeOpacity={0.7} style={s.row}
          onPress={() => router.push('/(tabs)' as any)}>
          <View style={s.rowIcon}><Globe size={icon.md} color={colors.brand} /></View>
          <Text style={s.rowLabel}>{t('providerMobile.consumerArea')}</Text>
          <ChevronRight size={icon.sm} color={colors.textLight} />
        </TouchableOpacity>
      )}

      <TouchableOpacity activeOpacity={0.7} style={[s.row, s.rowDanger]}
        onPress={() => { logout(); router.replace('/auth/login' as any) }}>
        <View style={[s.rowIcon, { backgroundColor: colors.dangerBg }]}>
          <LogOut size={icon.md} color={colors.danger} />
        </View>
        <Text style={[s.rowLabel, { color: colors.danger }]}>{t('auth.logout')}</Text>
      </TouchableOpacity>

      <Text style={s.hint}>{t('providerMobile.manageOnWeb')}</Text>
    </Screen>
  )
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    padding: space.md, marginBottom: space.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  rowDanger: { marginTop: space.lg },
  rowIcon: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.brandTint,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { ...type.body, color: colors.text, fontWeight: weight.medium, flex: 1 },
  hint: { ...type.caption, color: colors.textLight, textAlign: 'center', marginTop: space.lg },
})
