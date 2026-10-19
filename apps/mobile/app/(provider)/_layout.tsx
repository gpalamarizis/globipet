import { View, StyleSheet, Platform, Dimensions, useWindowDimensions } from 'react-native'
import { Tabs } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LayoutDashboard, CalendarDays, Scissors, UserCheck, MoreHorizontal } from 'lucide-react-native'
import { colors, space, radius, weight } from '@/theme'
import { bottomSystemSpace } from '../(tabs)/_layout'

/**
 * Η μπάρα του παρόχου.
 *
 * ΓΙΑΤΙ ΞΕΧΩΡΙΣΤΗ ΟΜΑΔΑ
 *   Ο καθαρός πάροχος δεν έχει λόγο να βλέπει καλάθι, κοινότητες ή tracker.
 *   Του δίνουμε δική του μπάρα με αυτά που κάνει κάθε μέρα: κρατήσεις,
 *   υπηρεσίες, προϊόντα, προσωπικό. Ίδια λειτουργία με τον πίνακα του web.
 *
 *   Ο «both» (και ιδιοκτήτης) μένει στην καταναλωτική μπάρα και μπαίνει
 *   εδώ από το προφίλ του.
 */
// ΠΕΝΤΕ καρτέλες, όχι περισσότερες.
//
// Σε οθόνη 380 pixel η έκτη καρτέλα αφήνει 54 pixel στην καθεμία και οι
// ετικέτες κόβονται. Στη μπάρα μένουν οι τέσσερις καθημερινές — επισκόπηση,
// κρατήσεις, υπηρεσίες, πελάτες — και τα υπόλοιπα ζουν στο «Περισσότερα».
const TABS = [
  { name: 'index',     titleKey: 'providerTabs.overview',  Icon: LayoutDashboard },
  { name: 'bookings',  titleKey: 'providerTabs.bookings',  Icon: CalendarDays },
  { name: 'services',  titleKey: 'providerTabs.services',  Icon: Scissors },
  { name: 'customers', titleKey: 'providerTabs.customers', Icon: UserCheck },
  { name: 'more',      titleKey: 'providerTabs.more',      Icon: MoreHorizontal },
]

const BAR_CONTENT = 68

function TabIcon({ Icon, focused, color }: any) {
  return (
    <View style={[s.iconWrap, focused && s.iconWrapActive]}>
      <Icon size={22} color={focused ? colors.brand : color} strokeWidth={focused ? 2.4 : 2} />
    </View>
  )
}

export default function ProviderTabLayout() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()
  const bottom = bottomSystemSpace(insets.bottom, windowHeight, Dimensions.get('screen').height)

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: [s.bar, { height: BAR_CONTENT + bottom, paddingBottom: bottom }],
        tabBarLabelStyle: s.label,
        tabBarItemStyle: { paddingTop: space.sm, paddingHorizontal: 2 },
        tabBarLabelPosition: 'below-icon',
      }}>
      {/* Οθόνες του χώρου παρόχου που ΔΕΝ είναι καρτέλες: ανοίγουν από
          μέσα και δεν πρέπει να εμφανίζονται στη μπάρα. */}
      <Tabs.Screen name="new-service" options={{ href: null }} />
      <Tabs.Screen name="staff-form" options={{ href: null }} />
      <Tabs.Screen name="product-form" options={{ href: null }} />
      <Tabs.Screen name="service-form" options={{ href: null }} />
      <Tabs.Screen name="packages" options={{ href: null }} />
      <Tabs.Screen name="package-form" options={{ href: null }} />
      <Tabs.Screen name="package-catalog" options={{ href: null }} />
      <Tabs.Screen name="new-campaign" options={{ href: null }} />
      <Tabs.Screen name="products" options={{ href: null }} />
      <Tabs.Screen name="staff" options={{ href: null }} />
      <Tabs.Screen name="campaigns" options={{ href: null }} />
      <Tabs.Screen name="insights" options={{ href: null }} />
      <Tabs.Screen name="translations" options={{ href: null }} />
      <Tabs.Screen name="calendar" options={{ href: null }} />

      {TABS.map(({ name, titleKey, Icon }) => (
        <Tabs.Screen key={name} name={name}
          options={{
            title: t(titleKey),
            tabBarIcon: ({ color, focused }) => <TabIcon Icon={Icon} focused={focused} color={color} />,
          }} />
      ))}
    </Tabs>
  )
}

const s = StyleSheet.create({
  bar: { backgroundColor: colors.surface, borderTopColor: colors.borderLight, borderTopWidth: 1, elevation: 0 },
  label: { fontSize: 11, fontWeight: weight.semibold, marginTop: 2 },
  iconWrap: { width: 44, height: 30, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: colors.brandTint },
})
