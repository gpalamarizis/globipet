import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as SplashScreen from 'expo-splash-screen'
import { useAppFonts } from '@/fonts'
import { useAuthStore } from '../src/store/auth'

SplashScreen.preventAutoHideAsync()

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 1000 * 60 * 5 } }
})

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
  'insurance',
  'language',
  'orders',
  'passport',
  'playdates',
  'telehealth',
  'tracker',
  'verification',
] as const

const MODAL_ROUTES = [
  'auth/forgot-password',
  'auth/login',
  'auth/register',
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

  useEffect(() => {
    useAuthStore.getState().loadToken().finally(() => setAuthReady(true))
  }, [])

  useEffect(() => {
    // Το splash κρύβεται όταν είναι έτοιμες ΚΑΙ οι γραμματοσειρές ΚΑΙ η
    // σύνδεση, ώστε ο χρήστης να μη δει ούτε το κείμενο να αλλάζει ούτε
    // την εφαρμογή να τον θεωρεί για μια στιγμή επισκέπτη.
    if (fontsReady && authReady) SplashScreen.hideAsync().catch(() => {})
  }, [fontsReady, authReady])

  // Το return έρχεται ΜΕΤΑ από όλα τα hooks.
  if (!fontsReady || !authReady) return null

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

          {MODAL_ROUTES.map(name => (
            <Stack.Screen key={name} name={name} options={{ presentation: 'modal' }} />
          ))}

          {CARD_ROUTES.map(name => (
            <Stack.Screen key={name} name={name} options={{ presentation: 'card' }} />
          ))}
        </Stack>
      </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
