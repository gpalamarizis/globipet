import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'

const titles: Record<string, string> = {
  'telehealth': '🩺 Τηλεϊατρική',
  'tracker': '📍 GPS Tracker',
  'insurance': '🛡️ Ασφάλιση',
  'passport': '📗 Pet Passport',
  'ai-health': '🧠 AI Υγεία',
  'ai-emotion': '💜 AI Emotion',
  'playdates': '🐾 Playdates',
  'communities': '🏘️ Κοινότητες',
  'bookings': '📅 Κρατήσεις',
  'orders': '📦 Παραγγελίες',
}

export default function Screen() {
  const router = useRouter()
  const name = 'communities'

  return (
    <View style={s.container}>
      <TouchableOpacity style={s.back} onPress={() => router.back()}>
        <Text style={s.backText}>← Πίσω</Text>
      </TouchableOpacity>
      <Text style={s.title}>{titles[name] || name}</Text>
      <Text style={s.sub}>Σύντομα διαθέσιμο στο mobile</Text>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', padding: 24 },
  back: { position: 'absolute', top: 60, left: 20 },
  backText: { color: '#E65100', fontSize: 15, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 8 },
  sub: { fontSize: 14, color: '#6B7280' },
})
