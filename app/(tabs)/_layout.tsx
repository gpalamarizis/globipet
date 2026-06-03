import { Tabs } from 'expo-router'
import { Home, Scissors, ShoppingBag, Heart, User, PawPrint } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

export default function TabLayout() {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#E65100',
      tabBarInactiveTintColor: '#9CA3AF',
      tabBarStyle: {
        backgroundColor: '#fff',
        borderTopColor: '#F3F4F6',
        height: 60 + insets.bottom,
        paddingBottom: 8 + insets.bottom,
        paddingTop: 8,
      },
      tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
      headerShown: false,
    }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: ({ color }) => <Home size={22} color={color} /> }} />
      <Tabs.Screen name="services" options={{ title: t('tabs.services'), tabBarIcon: ({ color }) => <Scissors size={22} color={color} /> }} />
      <Tabs.Screen name="marketplace" options={{ title: t('tabs.marketplace'), tabBarIcon: ({ color }) => <ShoppingBag size={22} color={color} /> }} />
      <Tabs.Screen name="pets" options={{ title: t('tabs.pets'), tabBarIcon: ({ color }) => <PawPrint size={22} color={color} /> }} />
      <Tabs.Screen name="social" options={{ title: t('tabs.social'), tabBarIcon: ({ color }) => <Heart size={22} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: ({ color }) => <User size={22} color={color} /> }} />
    </Tabs>
  )
}
