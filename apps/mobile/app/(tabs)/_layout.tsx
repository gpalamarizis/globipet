import { Tabs } from 'expo-router'
import { Home, Scissors, ShoppingBag, Heart, User } from 'lucide-react-native'

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#E65100',
      tabBarInactiveTintColor: '#9CA3AF',
      tabBarStyle: {
        backgroundColor: '#ffffff',
        borderTopColor: '#F3F4F6',
        height: 60,
        paddingBottom: 8,
        paddingTop: 4,
      },
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '500',
      },
      headerShown: false,
    }}>
      <Tabs.Screen name="index" options={{ title: 'Αρχική', tabBarIcon: ({ color }) => <Home size={22} color={color} /> }} />
      <Tabs.Screen name="services" options={{ title: 'Υπηρεσίες', tabBarIcon: ({ color }) => <Scissors size={22} color={color} /> }} />
      <Tabs.Screen name="marketplace" options={{ title: 'Κατάστημα', tabBarIcon: ({ color }) => <ShoppingBag size={22} color={color} /> }} />
      <Tabs.Screen name="social" options={{ title: 'Social', tabBarIcon: ({ color }) => <Heart size={22} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Προφίλ', tabBarIcon: ({ color }) => <User size={22} color={color} /> }} />
    </Tabs>
  )
}
