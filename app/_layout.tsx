import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as SplashScreen from 'expo-splash-screen'
import { View, ActivityIndicator } from 'react-native'
import { useAuthStore } from '../src/store/auth'
import { initI18n } from '../lib/i18n'

SplashScreen.preventAutoHideAsync()
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 2, staleTime: 300000 } } })

function AppContent() {
  const { loadToken } = useAuthStore()
  const [i18nReady, setI18nReady] = useState(false)

  useEffect(() => {
    Promise.all([loadToken(), initI18n()])
      .then(() => setI18nReady(true))
      .finally(() => SplashScreen.hideAsync())
  }, [])

  if (!i18nReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF7ED' }}>
        <ActivityIndicator size="large" color="#E65100" />
      </View>
    )
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth/login" options={{ presentation: 'modal' }} />
      <Stack.Screen name="auth/register" options={{ presentation: 'modal' }} />
      <Stack.Screen name="auth/forgot-password" options={{ presentation: 'modal' }} />
      <Stack.Screen name="language" options={{ presentation: 'modal' }} />
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
