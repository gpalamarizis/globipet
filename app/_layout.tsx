import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as SplashScreen from 'expo-splash-screen'
import { useAuthStore } from '../src/store/auth'

SplashScreen.preventAutoHideAsync()

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 5 * 60 * 1000 } }
})

function AppContent() {
  const { loadToken } = useAuthStore()

  useEffect(() => {
    loadToken().finally(() => SplashScreen.hideAsync())
  }, [])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth/login" options={{ presentation: 'modal' }} />
      <Stack.Screen name="auth/register" options={{ presentation: 'modal' }} />
      <Stack.Screen name="auth/forgot-password" options={{ presentation: 'modal' }} />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <AppContent />
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
