import { Tabs } from 'expo-router'
import { View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Home, Search, PawPrint, ShoppingBag, User } from 'lucide-react-native'
import { colors, radius, type, weight, space } from '@/theme'

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
 *
 * ΓΙΑΤΙ ΕΦΥΓΕ ΤΟ allowFontScaling: false
 *   Οι ετικέτες ήταν στα 10.5px, με σχόλιο ότι το μέγεθος διαλέχτηκε για να
 *   χωρέσει η λέξη «Κατοικίδια» σε πλάτος 360dp — και με το font scaling
 *   απενεργοποιημένο ώστε να μη χαλάσει.
 *
 *   Αυτό σημαίνει ότι κάποιος που μεγάλωσε τα γράμματα στο τηλέφωνό του
 *   επειδή δεν βλέπει καλά, δεν τα έβλεπε μεγαλύτερα εδώ. Η ρύθμιση
 *   προσβασιμότητάς του αγνοούνταν για να χωρέσει μια λέξη.
 *
 *   Οι ετικέτες είναι πλέον σύντομες — «Ζώα», «Ψάξε», «Αγορά» — οπότε
 *   χωράνε άνετα στα 12px και ο έλεγχος επιστρέφει στον χρήστη.
 */

const TABS = [
  { name: 'index',       title: 'Αρχική',   Icon: Home },
  { name: 'discover',    title: 'Ψάξε',     Icon: Search },
  { name: 'pets',        title: 'Ζώα',      Icon: PawPrint },
  { name: 'marketplace', title: 'Αγορά',    Icon: ShoppingBag },
  { name: 'profile',     title: 'Προφίλ',   Icon: User },
]

/** Οθόνες που υπάρχουν στον φάκελο αλλά δεν εμφανίζονται στη μπάρα. */
const HIDDEN = ['social', 'services', 'insurance', 'cart', 'community']

/** Το ύψος της ίδιας της μπάρας, χωρίς την περιοχή του συστήματος. */
const BAR_CONTENT = 68

function TabIcon({ Icon, focused, color }: any) {
  return (
    <View style={[s.iconWrap, focused && s.iconWrapActive]}>
      <Icon size={22} color={focused ? colors.brand : color} strokeWidth={focused ? 2.4 : 2} />
    </View>
  )
}

export default function TabLayout() {
  const insets = useSafeAreaInsets()

  // Ελάχιστο 20 ώστε να μη στριμώχνει την ετικέτα πάνω στη γραμμή του
  // συστήματος σε συσκευές με φυσική μπάρα πλοήγησης (Samsung κ.ά.).
  const bottom = Math.max(insets.bottom, 20)

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
        tabBarItemStyle: { paddingTop: space.sm, paddingHorizontal: 2 },
        tabBarLabelPosition: 'below-icon',
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
    paddingTop: space.xs,
  },
  label: {
    ...type.caption,
    fontWeight: weight.semibold,
    marginTop: 3,
    includeFontPadding: false,
  },
  iconWrap: {
    width: 48, height: 32,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.md,
  },
  // Απαλό πορτοκαλί μόνο στο ενεργό — η μία θέση όπου το χρώμα σημαίνει
  // «εδώ βρίσκεσαι», όχι «πάτα εδώ».
  iconWrapActive: {
    backgroundColor: colors.brandLight,
  },
})
