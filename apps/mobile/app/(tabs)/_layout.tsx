import { Tabs } from 'expo-router'

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: '#E65100',
      tabBarInactiveTintColor: '#9CA3AF',
      tabBarStyle: { borderTopColor: '#F3F4F6', height: 60 },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Αρχική' }} />
      <Tabs.Screen name="marketplace" options={{ title: 'Κατάστημα' }} />
      <Tabs.Screen name="services" options={{ title: 'Υπηρεσίες' }} />
      <Tabs.Screen name="social" options={{ title: 'Social' }} />
      <Tabs.Screen name="profile" options={{ title: 'Προφίλ' }} />
    </Tabs>
  )
}
