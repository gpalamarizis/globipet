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
          <Stack.Screen name="auth/login" options={{ presentation: 'modal' }} />
          <Stack.Screen name="auth/register" options={{ presentation: 'modal' }} />
          <Stack.Screen name="auth/forgot-password" options={{ presentation: 'modal' }} />
          <Stack.Screen name="telehealth" options={{ presentation: 'card' }} />
          <Stack.Screen name="tracker" options={{ presentation: 'card' }} />
          <Stack.Screen name="insurance" options={{ presentation: 'card' }} />
          <Stack.Screen name="passport" options={{ presentation: 'card' }} />
          <Stack.Screen name="ai-health" options={{ presentation: 'card' }} />
          <Stack.Screen name="ai-emotion" options={{ presentation: 'card' }} />
          <Stack.Screen name="playdates" options={{ presentation: 'card' }} />
          <Stack.Screen name="communities" options={{ presentation: 'card' }} />
          <Stack.Screen name="social" options={{ presentation: 'card' }} />
          <Stack.Screen name="bookings" options={{ presentation: 'card' }} />
          <Stack.Screen name="orders" options={{ presentation: 'card' }} />
          <Stack.Screen name="inbox" options={{ presentation: 'card' }} />
        </Stack>
      </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
