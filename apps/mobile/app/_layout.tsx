import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as SplashScreen from 'expo-splash-screen'

SplashScreen.preventAutoHideAsync()

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 1000 * 60 * 5 } }
})

export default function RootLayout() {
  useEffect(() => { SplashScreen.hideAsync() }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
