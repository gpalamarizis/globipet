import { Tabs } from 'expo-router'
import { Home, Search, PawPrint, Users, User } from 'lucide-react-native'

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#E65100',
      tabBarInactiveTintColor: '#9CA3AF',
      tabBarStyle: {
        backgroundColor: '#ffffff',
        borderTopColor: '#F3F4F6',
        borderTopWidth: 1,
        height: 64,
        paddingBottom: 10,
        paddingTop: 6,
      },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      headerShown: false,
    }}>
      <Tabs.Screen name="index"
        options={{ title: 'Αρχική', tabBarIcon: ({ color, size }) => <Home size={size} color={color} /> }} />
      <Tabs.Screen name="discover"
        options={{ title: 'Discover', tabBarIcon: ({ color, size }) => <Search size={size} color={color} /> }} />
      <Tabs.Screen name="pets"
        options={{ title: 'Κατοικίδια', tabBarIcon: ({ color, size }) => <PawPrint size={size} color={color} /> }} />
      <Tabs.Screen name="community"
        options={{ title: 'Κοινότητα', tabBarIcon: ({ color, size }) => <Users size={size} color={color} /> }} />
      <Tabs.Screen name="profile"
        options={{ title: 'Προφίλ', tabBarIcon: ({ color, size }) => <User size={size} color={color} /> }} />
      {/* Hidden tabs - accessible via stack navigation */}
      <Tabs.Screen name="social" options={{ href: null }} />
      <Tabs.Screen name="marketplace" options={{ href: null }} />
      <Tabs.Screen name="services" options={{ href: null }} />
      <Tabs.Screen name="insurance" options={{ href: null }} />
      <Tabs.Screen name="cart" options={{ href: null }} />
    </Tabs>
  )
}
