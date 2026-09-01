import { Tabs } from 'expo-router'
import { View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Home, Search, PawPrint, ShoppingBag, User } from 'lucide-react-native'
import { colors, radius, font, weight } from '@/theme'

/**
 * Κάτω πλοήγηση.
 *
 * ΤΟ ΥΨΟΣ ΔΕΝ ΕΙΝΑΙ ΣΤΑΘΕΡΟ
 *   Κάθε συσκευή έχει διαφορετική περιοχή χειρονομιών στο κάτω μέρος. Σε
 *   Samsung με γραμμή πλοήγησης είναι μεγάλη, σε άλλες μηδενική. Με
 *   σταθερό ύψος, το μενού κρύβεται πίσω από τη γραμμή του συστήματος.
 *
 *   Το useSafeAreaInsets διαβάζει την ΠΡΑΓΜΑΤΙΚΗ τιμή της συσκευής και
 *   την προσθέτει στο ύψος. Έτσι δουλεύει παντού, χωρίς έλεγχο μοντέλου.
 */

const TABS = [
  { name: 'index',       title: 'Αρχική',      Icon: Home },
  { name: 'discover',    title: 'Αναζήτηση',   Icon: Search },
  { name: 'pets',        title: 'Κατοικίδια',  Icon: PawPrint },
  { name: 'marketplace', title: 'Κατάστημα',   Icon: ShoppingBag },
  { name: 'profile',     title: 'Προφίλ',      Icon: User },
]

/** Οθόνες που υπάρχουν στον φάκελο αλλά δεν εμφανίζονται στη μπάρα. */
const HIDDEN = ['social', 'services', 'insurance', 'cart', 'community']

/** Το ύψος της ίδιας της μπάρας, χωρίς την περιοχή του συστήματος. */
const BAR_CONTENT = 58

function TabIcon({ Icon, focused, color }: any) {
  return (
    <View style={[s.iconWrap, focused && s.iconWrapActive]}>
      <Icon size={21} color={focused ? colors.brand : color} strokeWidth={focused ? 2.4 : 2} />
    </View>
  )
}

export default function TabLayout() {
  const insets = useSafeAreaInsets()

  // Ελάχιστο 8 ώστε να μην κολλάει στην άκρη σε συσκευές χωρίς inset.
  const bottom = Math.max(insets.bottom, 8)

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: [s.bar, {
          height: BAR_CONTENT + bottom,
          paddingBottom: bottom,
        }],
        tabBarLabelStyle: s.label,
        tabBarItemStyle: { paddingTop: 6 },
      }}>

      {TABS.map(({ name, title, Icon }) => (
        <Tabs.Screen key={name} name={name}
          options={{
            title,
            tabBarIcon: ({ color, focused }) =>
              <TabIcon Icon={Icon} focused={focused} color={color} />,
          }} />
      ))}

      {HIDDEN.map(name => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  )
}

const s = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    paddingTop: 4,
  },
  label: {
    fontSize: font.xs,
    fontWeight: weight.semibold,
    marginTop: 2,
  },
  iconWrap: {
    width: 44, height: 30,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.md,
  },
  iconWrapActive: {
    backgroundColor: colors.brandLight,
  },
})
