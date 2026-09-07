import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as SplashScreen from 'expo-splash-screen'
import { useAppFonts } from '@/fonts'

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
 * Το `checkout` προστίθεται εδώ μαζί με το αρχείο του, όχι πριν.
 */
const CARD_ROUTES = [
  'ai-emotion',
  'ai-health',
  'bookings',
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

  useEffect(() => {
    // Το splash κρύβεται μόνο όταν οι γραμματοσειρές είναι έτοιμες,
    // ώστε ο χρήστης να μη δει το κείμενο να αλλάζει μπροστά του.
    if (fontsReady) SplashScreen.hideAsync().catch(() => {})
  }, [fontsReady])

  // Το return έρχεται ΜΕΤΑ από όλα τα hooks.
  if (!fontsReady) return null

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
