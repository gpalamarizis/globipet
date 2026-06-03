import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../../src/store/auth'
import { api } from '../../src/lib/api'

const speciesEmoji: Record<string,string> = { dog:'🐶', cat:'🐱', bird:'🐦', rabbit:'🐰', fish:'🐟', reptile:'🦎', horse:'🐴', other:'🐾' }

export default function PetsScreen() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: pets = [], isLoading } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets/my').then(r => r.data?.data ?? []),
    enabled: isAuthenticated,
  })

  const toggleLost = useMutation({
    mutationFn: ({ id, isLost }: any) => api.patch(`/pets/${id}`, { is_lost: isLost }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-pets'] }),
  })

  if (!isAuthenticated) return (
    <View style={styles.center}>
      <Text style={styles.emoji}>🔒</Text>
      <Text style={styles.title}>Απαιτείται σύνδεση</Text>
      <TouchableOpacity style={styles.btn} onPress={() => router.push('/auth/login')}>
        <Text style={styles.btnText}>Σύνδεση</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Τα κατοικίδιά μου</Text>
        <TouchableOpacity style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Προσθήκη</Text>
        </TouchableOpacity>
      </View>
      <FlatList data={pets} keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }: any) => (
          <View style={styles.card}>
            <Text style={styles.petEmoji}>{speciesEmoji[item.species] || '🐾'}</Text>
            <View style={styles.petInfo}>
              <Text style={styles.petName}>{item.name}</Text>
              <Text style={styles.petDetail}>{item.breed || item.species} · {item.age} ετών</Text>
            </View>
            {item.is_lost && <View style={styles.lostBadge}><Text style={styles.lostText}>ΧΑΜΕΝΟ</Text></View>}
            <TouchableOpacity onPress={() => toggleLost.mutate({ id: item.id, isLost: !item.is_lost })}
              style={[styles.lostBtn, item.is_lost && styles.foundBtn]}>
              <Text style={styles.lostBtnText}>{item.is_lost ? '✓ Βρέθηκε' : '! Χάθηκε'}</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🐾</Text>
            <Text style={styles.emptyText}>Δεν έχετε κατοικίδια ακόμα</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  addBtn: { backgroundColor: '#E65100', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  petEmoji: { fontSize: 36, marginRight: 12 },
  petInfo: { flex: 1 },
  petName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  petDetail: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  lostBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginRight: 8 },
  lostText: { fontSize: 10, color: '#DC2626', fontWeight: '700' },
  lostBtn: { backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  foundBtn: { backgroundColor: '#D1FAE5' },
  lostBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#6B7280' },
  emoji: { fontSize: 48, marginBottom: 16 },
  btn: { backgroundColor: '#E65100', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 16 },
  btnText: { color: '#fff', fontWeight: '700' },
})
