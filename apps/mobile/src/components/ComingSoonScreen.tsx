import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'

const META: Record<string, { emoji: string; title: string; color: string; bg: string }> = {
  telehealth:   { emoji: '🩺', title: 'Τηλεϊατρική',  color: '#10B981', bg: '#ECFDF5' },
  tracker:      { emoji: '📍', title: 'GPS Tracker',  color: '#EF4444', bg: '#FEF2F2' },
  insurance:    { emoji: '🛡️', title: 'Ασφάλιση',     color: '#8B5CF6', bg: '#F5F3FF' },
  passport:     { emoji: '📗', title: 'Pet Passport', color: '#6366F1', bg: '#EEF2FF' },
  'ai-emotion': { emoji: '💜', title: 'AI Emotion',   color: '#F59E0B', bg: '#FFFBEB' },
  playdates:    { emoji: '🐾', title: 'Playdates',    color: '#10B981', bg: '#ECFDF5' },
  communities:  { emoji: '🏘️', title: 'Κοινότητες',   color: '#8B5CF6', bg: '#F5F3FF' },
  bookings:     { emoji: '📅', title: 'Κρατήσεις',    color: '#E65100', bg: '#FFF7ED' },
  orders:       { emoji: '📦', title: 'Παραγγελίες',  color: '#E65100', bg: '#FFF7ED' },
}

export default function ComingSoonScreen({ name }: { name: string }) {
  const router = useRouter()
  const meta = META[name] || { emoji: '✨', title: name, color: '#E65100', bg: '#FFF7ED' }

  return (
    <View style={s.container}>
      <TouchableOpacity style={s.back} onPress={() => router.back()}>
        <Text style={s.backText}>← Πίσω</Text>
      </TouchableOpacity>

      <View style={[s.badge, { backgroundColor: meta.bg }]}>
        <Text style={s.emoji}>{meta.emoji}</Text>
      </View>

      <Text style={[s.title, { color: meta.color }]}>{meta.title}</Text>
      <Text style={s.sub}>Διαθέσιμο ήδη στο globipet.com</Text>
      <Text style={s.sub2}>Η εφαρμογή κινητού έρχεται πολύ σύντομα</Text>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', padding: 24 },
  back: { position: 'absolute', top: 60, left: 20 },
  backText: { color: '#E65100', fontSize: 15, fontWeight: '600' },
  badge: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emoji: { fontSize: 34 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  sub: { fontSize: 14, color: '#374151', fontWeight: '600', textAlign: 'center' },
  sub2: { fontSize: 13, color: '#9CA3AF', marginTop: 3, textAlign: 'center' },
})