import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../src/lib/api'

const O = '#E65100'

const SECTIONS = [
  { emoji: '💻', title: 'Τηλεϊατρική',       sub: 'Κλείσε online ραντεβού', route: '/telehealth' },
  { emoji: '📋', title: 'Ιατρικός Φάκελος',  sub: 'Πλήρες ιστορικό υγείας', route: '/passport' },
  { emoji: '🧠', title: 'AI Υγεία',           sub: 'Ανάλυση φωτογραφίας', route: '/ai-health' },
  { emoji: '💜', title: 'AI Emotion',          sub: 'Τι νιώθει το ζώο σου', route: '/ai-emotion' },
  { emoji: '⚖️', title: 'Νομική Υποστήριξη', sub: 'Ελληνική νομοθεσία', route: '/legal' },
  { emoji: '🛡️', title: 'Ασφάλιση',          sub: 'Προστασία κατοικιδίου', route: '/insurance' },
  { emoji: '🗺️', title: 'GPS Tracker',        sub: 'Βρες το κατοικίδιό σου', route: '/tracker' },
  { emoji: '🐾', title: 'Playdates',           sub: 'Βγες με άλλα κατοικίδια', route: '/playdates' },
  { emoji: '🏘️', title: 'Κοινότητες',         sub: 'Ομάδες ιδιοκτητών', route: '/communities' },
]

export default function DiscoverScreen() {
  const router = useRouter()

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.get('/events?upcoming=true&limit=3').then(r => r.data?.data ?? []).catch(() => []),
  })

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={s.header}>
        <Text style={s.title}>Εξερεύνηση</Text>
        <Text style={s.sub}>Ανακάλυψε όλες τις λειτουργίες</Text>
      </View>

      {/* Feature grid */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Λειτουργίες</Text>
        <View style={s.grid}>
          {SECTIONS.map(item => (
            <TouchableOpacity key={item.route} style={s.card} onPress={() => router.push(item.route as any)} activeOpacity={0.7}>
              <Text style={s.cardEmoji}>{item.emoji}</Text>
              <Text style={s.cardTitle}>{item.title}</Text>
              <Text style={s.cardSub} numberOfLines={1}>{item.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Events */}
      {events.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Επερχόμενα Events</Text>
          {events.map((e: any) => (
            <View key={e.id} style={s.eventCard}>
              <View style={s.eventLeft}>
                <Text style={s.eventEmoji}>📅</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.eventTitle} numberOfLines={1}>{e.title}</Text>
                <Text style={s.eventDate}>{e.date} {e.time ? `· ${e.time}` : ''}</Text>
                {e.location && <Text style={s.eventLoc} numberOfLines={1}>📍 {e.location}</Text>}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  sub: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '31%', backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
  cardEmoji: { fontSize: 28, marginBottom: 6 },
  cardTitle: { fontSize: 11, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 2 },
  cardSub: { fontSize: 10, color: '#9CA3AF', textAlign: 'center' },
  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, gap: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3 },
  eventLeft: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  eventEmoji: { fontSize: 20 },
  eventTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  eventDate: { fontSize: 12, color: O, fontWeight: '600', marginBottom: 2 },
  eventLoc: { fontSize: 12, color: '#6B7280' },
})