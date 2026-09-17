import { Tabs } from 'expo-router'
import { View, StyleSheet, Platform, Dimensions, useWindowDimensions } from 'react-native'
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
 * ΓΙΑΤΙ ΔΕΝ ΑΡΚΕΙ ΤΟ useSafeAreaInsets ΜΟΝΟ ΤΟΥ
 *   Επιστρέφει μηδέν όταν το SafeAreaProvider λείπει, όταν δεν έχει
 *   προλάβει να μετρήσει, ή σε ορισμένες εκδόσεις του Android. Δύο φορές
 *   βασιστήκαμε σε αυτό και δύο φορές το μενού βγήκε κάτω από τη γραμμή
 *   της Samsung — επειδή το `Math.max(insets.bottom, 20)` δίνει 20 όταν
 *   το inset είναι μηδέν, ενώ η γραμμή θέλει 48.
 *
 *   Τώρα το μηδέν δεν το εμπιστευόμαστε: το ξεχωρίζουμε με μέτρηση.
 *   Δες το bottomSystemSpace παρακάτω.
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

/** Η γραμμή τριών κουμπιών του Android είναι 48dp κατά προδιαγραφή. */
const ANDROID_NAV_BAR = 48

/**
 * Πόσος χώρος χρειάζεται κάτω από τις ετικέτες ώστε να μην τις σκεπάσει
 * η γραμμή του συστήματος.
 *
 * Καθαρή συνάρτηση επίτηδες: δέχεται μετρήσεις, δεν τις παίρνει μόνη της,
 * ώστε να ελέγχεται χωρίς συσκευή.
 *
 *   1. Αν το inset δίνει τιμή, είναι η ακριβής τιμή της συσκευής. Τέλος.
 *
 *   2. Αν δίνει μηδέν, υπάρχουν δύο εντελώς διαφορετικές καταστάσεις που
 *      μοιάζουν ίδιες από τον κώδικα, και ξεχωρίζουν μόνο με μέτρηση:
 *
 *      α) Το παράθυρο της εφαρμογής σταματά ήδη ΠΑΝΩ από τη γραμμή του
 *         συστήματος. Τότε το μηδέν είναι σωστό — δεν χρειάζεται τίποτα,
 *         και κάθε επιπλέον padding είναι κενό λευκό.
 *
 *      β) Το παράθυρο απλώνεται ΚΑΤΩ από τη γραμμή (edge-to-edge, που στο
 *         Android 15+ είναι υποχρεωτικό). Τότε το μηδέν είναι λάθος και το
 *         μενού κρύβεται. Αυτό μας συνέβη.
 *
 *      Η διαφορά φαίνεται στα ύψη: στο (α) η οθόνη είναι αισθητά ψηλότερη
 *      από το παράθυρο, στο (β) είναι ίδια.
 */
export function bottomSystemSpace(
  insetBottom: number,
  windowHeight: number,
  screenHeight: number,
  os: string = Platform.OS,
): number {
  if (insetBottom > 0) return insetBottom
  if (os !== 'android') return 0
  const windowCoversWholeScreen = screenHeight - windowHeight < 24
  return windowCoversWholeScreen ? ANDROID_NAV_BAR : 0
}

function TabIcon({ Icon, focused, color }: any) {
  return (
    <View style={[s.iconWrap, focused && s.iconWrapActive]}>
      <Icon size={22} color={focused ? colors.brand : color} strokeWidth={focused ? 2.4 : 2} />
    </View>
  )
}

export default function TabLayout() {
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()

  const bottom = bottomSystemSpace(
    insets.bottom,
    windowHeight,
    Dimensions.get('screen').height,
  )

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
