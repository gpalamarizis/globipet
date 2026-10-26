import { useEffect, useRef, useState } from 'react'
import { Stack, useSegments, useRouter, useRootNavigationState } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClientProvider } from '@tanstack/react-query'
import * as SplashScreen from 'expo-splash-screen'
import { useAppFonts } from '@/fonts'
import { useAuthStore } from '../src/store/auth'
import { registerPushToken, usePushRouting } from '../src/lib/notifications'
import { initI18n } from '../lib/i18n'
// Σε δικό του module ώστε να τον καθαρίζει και το store σε αποσύνδεση/αλλαγή χρήστη.
import { queryClient } from '../src/lib/queryClient'

SplashScreen.preventAutoHideAsync()

/**
 * Οι οθόνες που ανοίγουν πάνω από τα tabs, αλφαβητικά.
 *
 * ΠΡΟΣΟΧΗ: κάθε όνομα εδώ πρέπει να αντιστοιχεί σε υπαρκτό αρχείο μέσα
 * στο `app/`. Δήλωση για route που δεν υπάρχει ρίχνει «No route named
 * ... exists in nested children».
 *
 * ΤΙ ΑΛΛΑΞΕ (07/09)
 *   − `social`: είναι tab (`app/(tabs)/social.tsx`), όχι οθόνη ρίζας. Η
 *     δήλωση εδώ έδειχνε σε ανύπαρκτο route.
 *   + `language`, `verification`: τα αρχεία υπήρχαν αλλά δεν δηλώνονταν,
 *     οπότε άνοιγαν χωρίς τις επιλογές των υπολοίπων.
 *
 * Το `checkout` προστέθηκε (10/09) μαζί με το app/checkout.tsx.
 */
const CARD_ROUTES = [
  'ai-emotion',
  'ai-health',
  'bookings',
  // Προστέθηκε μαζί με το app/checkout.tsx, όπως έλεγε το σχόλιο.
  'checkout',
  'communities',
  'inbox',
  // Ε16: χωρίς 'insurance' — η οθόνη είναι η app/(tabs)/insurance.tsx (κρυφό tab,
  // εκεί οδηγούν Αρχική/Ανακάλυψη)· η διπλή app/insurance.tsx αφαιρέθηκε.
  'language',
  'notifications',
  'orders',
  'passport',
  'playdates',
  'subscriptions',
  'telehealth',
  'tracker',
  'verification',
] as const

/**
 * Οθόνες κοινές για κάθε λογαριασμό, άρα και για τον καθαρό πάροχο:
 * λογαριασμός, νομικά, συγκαταθέσεις, βοήθεια, επαλήθευση, μηνύματα.
 * Χωρίς αυτή τη λίστα το παρακάτω effect τον έστελνε αμέσως πίσω στο
 * (provider) και οι σύνδεσμοι του «Περισσότερα» δεν άνοιγαν ποτέ.
 * Ίδια λίστα με το PROVIDER_SHARED_PATHS του web (MainLayout.tsx).
 */
const PROVIDER_SHARED = new Set([
  'about',
  'change-password',
  'consents',
  'contact',
  'faq',
  'help',
  'inbox',
  'language',
  'notification-settings',
  'notifications',
  'privacy',
  'privacy-policy',
  'reset-password',
  'terms',
  'verification',
])

/**
 * Ε13: όσο λείπει η ημερομηνία γέννησης (`needs_birth_date`), αυτές είναι οι
 * μόνες οθόνες που ανοίγουν χωρίς την auth/birth-date — τα νομικά κείμενα,
 * όπως οι εξαιρέσεις της πύλης του web (BirthDateGate.tsx).
 */
const BIRTH_DATE_EXEMPT = new Set(['terms', 'privacy-policy', 'consents'])

const MODAL_ROUTES = [
  'auth/forgot-password',
  'auth/login',
  'auth/register',
  'auth/verify-email',
] as const

export default function RootLayout() {
  // ΚΑΝΟΝΑΣ ΤΩΝ HOOKS: όλα τα hooks πρέπει να καλούνται σε ΚΑΘΕ render,
  // με την ίδια σειρά. Ένα `return` ανάμεσά τους σημαίνει ότι στο πρώτο
  // render εκτελούνται λιγότερα από ό,τι στο δεύτερο, και η React ρίχνει
  // «Rendered more hooks than during the previous render».
  //
  // Γι' αυτό ΟΛΑ τα hooks μπαίνουν εδώ, πριν από οποιοδήποτε return.
  const fontsReady = useAppFonts()

  /**
   * ΓΙΑΤΙ ΦΟΡΤΩΝΕΙ ΕΔΩ ΤΟ ΤΟΚΕΝ
   *   Πριν, το loadToken() καλούνταν μέσα στην Αρχική. Όποιο άνοιγμα δεν
   *   περνούσε από εκεί — deep link, ειδοποίηση, επιστροφή σε άλλο tab —
   *   έβρισκε τον χρήστη αποσυνδεδεμένο για όσο κρατούσε η ανάγνωση.
   *
   *   Εδώ τρέχει μία φορά, πριν από κάθε οθόνη, και μαζί με τον interceptor
   *   του api.ts κλείνει και τις δύο πλευρές: η κατάσταση είναι έτοιμη πριν
   *   δει κανείς κάτι, και τα αιτήματα έχουν κεφαλίδα ακόμα κι αν προλάβουν.
   */
  const [authReady, setAuthReady] = useState(false)

  /**
   * ΓΙΑΤΙ ΑΡΧΙΚΟΠΟΙΕΙΤΑΙ ΕΔΩ Η ΓΛΩΣΣΑ
   *   Η initI18n() δεν καλούνταν ΠΟΥΘΕΝΑ. Το i18next έμενε χωρίς πόρους,
   *   οπότε η οθόνη /language καλούσε changeLanguage() σε κάτι που δεν είχε
   *   ξεκινήσει ποτέ: ο χρήστης διάλεγε γλώσσα και δεν άλλαζε τίποτα.
   *
   *   Είναι ασύγχρονη επειδή διαβάζει την αποθηκευμένη επιλογή από το
   *   SecureStore. Περιμένουμε πριν δείξουμε οθόνη, όπως και με τις
   *   γραμματοσειρές — αλλιώς η πρώτη απόδοση γίνεται στα ελληνικά και
   *   μετά αναβοσβήνει στη σωστή γλώσσα.
   */
  const [i18nReady, setI18nReady] = useState(false)

  useEffect(() => {
    initI18n().finally(() => setI18nReady(true))
  }, [])

  useEffect(() => {
    useAuthStore.getState().loadToken().finally(() => {
      setAuthReady(true)
      // Η δήλωση της συσκευής γίνεται ΜΕΤΑ τη φόρτωση του τοκεν, αλλιώς το
      // αίτημα φεύγει χωρίς ταυτοποίηση. Δεν περιμένουμε το αποτέλεσμα: αν
      // ο χρήστης αρνηθεί την άδεια ή πέσει το δίκτυο, η εφαρμογή ανοίγει
      // κανονικά.
      if (useAuthStore.getState().isAuthenticated) {
        void registerPushToken()
        // Ε13: ο αποθηκευμένος χρήστης μπορεί να είναι από προηγούμενη έκδοση
        // (χωρίς needs_birth_date) — μία ανάγνωση του /auth/me στο άνοιγμα.
        void useAuthStore.getState().refreshUser()
      }
    })
  }, [])

  /**
   * Ε16: ο navigator υπάρχει μόνο αφού αποδοθεί το Stack (ίδια συνθήκη με το
   * `return null` πιο κάτω) ΚΑΙ η ρίζα της πλοήγησης έχει κατάσταση. Πριν από
   * αυτό κάθε router.push/replace χάνεται ή πετάει σφάλμα.
   */
  const rootNavKey = useRootNavigationState()?.key
  const navReady = fontsReady && authReady && i18nReady && !!rootNavKey

  // Στέλνει τον χρήστη στη σωστή οθόνη όταν πατήσει ειδοποίηση — και όταν η
  // εφαρμογή ήταν κλειστή και όταν ήταν ήδη ανοιχτή. Περιμένει τον navigator.
  usePushRouting(navReady)

  useEffect(() => {
    // Το splash κρύβεται όταν είναι έτοιμες ΚΑΙ οι γραμματοσειρές ΚΑΙ η
    // σύνδεση, ώστε ο χρήστης να μη δει ούτε το κείμενο να αλλάζει ούτε
    // την εφαρμογή να τον θεωρεί για μια στιγμή επισκέπτη.
    if (fontsReady && authReady && i18nReady) SplashScreen.hideAsync().catch(() => {})
  }, [fontsReady, authReady, i18nReady])

  /**
   * Ο καθαρός πάροχος ανοίγει στον δικό του χώρο.
   *
   * Καλάθι, κοινότητες, tracker δεν τον αφορούν. Ο «both» —και ιδιοκτήτης—
   * μένει στην καταναλωτική μπάρα και μπαίνει στον χώρο παρόχου από το
   * προφίλ του. Ίδια λογική με το web.
   */
  const role = useAuthStore(st => st.user?.role)
  const isAuthenticated = useAuthStore(st => st.isAuthenticated)
  const needsBirthDate = useAuthStore(st => st.user?.needs_birth_date === true)
  // Ε16: π.χ. '/auth/login' μετά από λήξη συνεδρίας (401) — βλ. store/auth.ts.
  const pendingRedirect = useAuthStore(st => st.pendingRedirect)
  const segments = useSegments()
  const router = useRouter()
  // Ε13: ένα push της auth/birth-date τη φορά — μέχρι να φανεί στα segments.
  const gatePushed = useRef<string | null>(null)
  useEffect(() => {
    // Πριν αποδοθεί το Stack (γραμματοσειρές + μεταφράσεις + σύνδεση, ίδια
    // συνθήκη με το `return null` πιο κάτω) δεν υπάρχει navigator: ένα push
    // τότε χάνεται ή πετάει σφάλμα και η πύλη ημερομηνίας δεν ανοίγει.
    if (!navReady) return
    // Ε16: λήξη συνεδρίας → οθόνη σύνδεσης, μία φορά (καθαρίζεται πριν την πλοήγηση).
    if (pendingRedirect) {
      useAuthStore.getState().clearPendingRedirect()
      if (!(segments[0] === 'auth' && (segments as string[])[1] === 'login')) {
        // Πρώτα η αρχική στη βάση της στοίβας, μετά η σύνδεση από πάνω: το
        // «πίσω» από τη σύνδεση πηγαίνει στην αρχική αντί να κλείνει η εφαρμογή.
        router.replace('/(tabs)' as any)
        router.push(pendingRedirect as any)
      }
      return
    }
    // Ως string επίτηδες: οι παραγόμενοι τύποι διαδρομών του expo-router
    // ανανεώνονται μόνο στο επόμενο «expo start», οπότε μια νέα ομάδα
    // οθονών θα έσπαγε τη μεταγλώττιση μέχρι τότε.
    const first = segments[0] as string | undefined
    /**
     * Ε13: λείπει η ημερομηνία γέννησης (Google/Facebook) → auth/birth-date,
     * μετά το login/OAuth και στο άνοιγμα. Χωρίς loop: μόνο αν ΔΕΝ είμαστε
     * ήδη εκεί (ή σε νομικό κείμενο)· όταν οριστεί, το needsBirthDate γίνεται
     * false και η οθόνη πηγαίνει μόνη της στην εφαρμογή.
     */
    const onGate = first === 'auth' && (segments as string[])[1] === 'birth-date'
    const path = segments.join('/')
    if (onGate || !needsBirthDate) gatePushed.current = null
    if (isAuthenticated && needsBirthDate) {
      // Δεύτερο push μόνο αν άλλαξε η διαδρομή (π.χ. το login έκανε replace
      // πάνω από την οθόνη) — όχι ξανά από την ίδια, πριν φανεί η πρώτη.
      if (!onGate && gatePushed.current !== path && !(first && BIRTH_DATE_EXEMPT.has(first))) {
        gatePushed.current = path
        router.push('/auth/birth-date' as any)
      }
      return
    }
    const inProvider = first === '(provider)'
    const inAuth = first === 'auth'
    const shared = !!first && PROVIDER_SHARED.has(first)
    if (isAuthenticated && role === 'service_provider' && !inProvider && !inAuth && !shared) {
      router.replace('/(provider)' as any)
    }
    if ((!isAuthenticated || role !== 'service_provider') && inProvider && role !== 'both') {
      router.replace('/(tabs)' as any)
    }
  }, [navReady, pendingRedirect, isAuthenticated, needsBirthDate, role, segments, router])

  // Το return έρχεται ΜΕΤΑ από όλα τα hooks.
  if (!fontsReady || !authReady || !i18nReady) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* ΑΠΑΡΑΙΤΗΤΟ: χωρίς αυτό, το useSafeAreaInsets επιστρέφει μηδενικά
          και η κάτω μπάρα κρύβεται πίσω από τη γραμμή πλοήγησης του
          συστήματος — σε Samsung είναι ιδιαίτερα εμφανές. */}
      <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(provider)" />

          {MODAL_ROUTES.map(name => (
            <Stack.Screen key={name} name={name} options={{ presentation: 'modal' }} />
          ))}
          {/* Ε13: δεν κλείνει με σύρσιμο — η ημερομηνία γέννησης είναι υποχρεωτική. */}
          <Stack.Screen name="auth/birth-date" options={{ presentation: 'modal', gestureEnabled: false }} />

          {CARD_ROUTES.map(name => (
            <Stack.Screen key={name} name={name} options={{ presentation: 'card' }} />
          ))}
        </Stack>
      </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
