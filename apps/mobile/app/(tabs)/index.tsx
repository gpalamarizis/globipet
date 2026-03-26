import { ScrollView, View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../src/lib/api'

export default function HomeScreen() {
  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => api.get('/users/me').then(r => r.data).catch(() => null) })

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.logo}>🐾 GlobiPet</Text>
        <Text style={styles.tagline}>Best care for the best human's friends</Text>
      </View>
      <View style={styles.searchBar}>
        <Text style={styles.searchPlaceholder}>🔍 Αναζήτηση υπηρεσίας...</Text>
      </View>
      <View style={styles.grid}>
        {[
          { emoji: '🩺', label: 'Κτηνίατρος' },
          { emoji: '✂️', label: 'Grooming' },
          { emoji: '🚶', label: 'Βόλτες' },
          { emoji: '🏠', label: 'Pet Sitting' },
          { emoji: '🎓', label: 'Εκπαίδευση' },
          { emoji: '🚕', label: 'Pet Taxi' },
          { emoji: '📸', label: 'Φωτογράφιση' },
          { emoji: '💊', label: 'Φαρμακείο' },
        ].map(cat => (
          <TouchableOpacity key={cat.label} style={styles.categoryCard}>
            <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
            <Text style={styles.categoryLabel}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F4' },
  content: { padding: 16 },
  header: { paddingVertical: 24, alignItems: 'center' },
  logo: { fontSize: 28, fontWeight: '700', color: '#E65100' },
  tagline: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  searchBar: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  searchPlaceholder: { color: '#9CA3AF', fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryCard: { width: '23%', aspectRatio: 1, backgroundColor: '#fff', borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  categoryEmoji: { fontSize: 24, marginBottom: 4 },
  categoryLabel: { fontSize: 10, fontWeight: '600', color: '#374151', textAlign: 'center' },
})
