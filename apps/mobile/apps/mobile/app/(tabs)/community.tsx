import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { PawPrint, Building2, Heart, Users, Plus } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { useAuthStore } from '../../src/store/auth'

export default function CommunityScreen() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  const { data: playdates } = useQuery({
    queryKey: ['playdates-mobile'],
    queryFn: () => api.get('/playdates').then(r => r.data?.events?.slice(0, 3) ?? []),
    enabled: isAuthenticated,
  })

  const { data: communities } = useQuery({
    queryKey: ['communities-mobile'],
    queryFn: () => api.get('/communities').then(r => r.data?.communities?.slice(0, 3) ?? []),
    enabled: isAuthenticated,
  })

  const { data: posts } = useQuery({
    queryKey: ['social-mobile'],
    queryFn: () => api.get('/posts?limit=3').then(r => r.data?.data ?? []),
  })

  if (!isAuthenticated) return (
    <View style={s.center}>
      <Text style={s.bigEmoji}>🐾</Text>
      <Text style={s.emptyTitle}>Συνδεθείτε για πρόσβαση</Text>
      <TouchableOpacity style={s.primaryBtn} onPress={() => router.push('/auth/login' as any)}>
        <Text style={s.primaryBtnText}>Σύνδεση</Text>
      </TouchableOpacity>
    </View>
  )

  const eventTypeEmoji: Record<string, string> = { walk: '🚶', play: '🎾', meetup: '🐾', training: '🎓', other: '✨' }

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <Text style={s.title}>Κοινότητα</Text>
        <Text style={s.subtitle}>Playdates, Κοινότητες & Social</Text>
      </View>

      {/* Quick actions */}
      <View style={s.quickRow}>
        <TouchableOpacity style={s.quickBtn} onPress={() => router.push('/playdates' as any)}>
          <PawPrint size={20} color="#10B981" />
          <Text style={[s.quickLabel, { color: '#10B981' }]}>Playdates</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickBtn} onPress={() => router.push('/communities' as any)}>
          <Building2 size={20} color="#8B5CF6" />
          <Text style={[s.quickLabel, { color: '#8B5CF6' }]}>Κοινότητες</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickBtn} onPress={() => router.push('/social' as any)}>
          <Heart size={20} color="#EF4444" />
          <Text style={[s.quickLabel, { color: '#EF4444' }]}>Social</Text>
        </TouchableOpacity>
      </View>

      {/* Playdates */}
      <View style={s.section}>
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>📅 Playdates</Text>
          <TouchableOpacity onPress={() => router.push('/playdates' as any)}>
            <Text style={s.seeAll}>Όλα →</Text>
          </TouchableOpacity>
        </View>
        {playdates?.length === 0 && (
          <TouchableOpacity style={s.emptyCard} onPress={() => router.push('/playdates' as any)}>
            <Text style={s.emptyCardText}>+ Δημιούργησε το πρώτο playdate!</Text>
          </TouchableOpacity>
        )}
        {playdates?.map((ev: any) => (
          <TouchableOpacity key={ev.id} style={s.card} onPress={() => router.push('/playdates' as any)}>
            <Text style={s.cardEmoji}>{eventTypeEmoji[ev.event_type] || '🐾'}</Text>
            <View style={s.cardInfo}>
              <Text style={s.cardTitle}>{ev.title}</Text>
              <Text style={s.cardSub}>{ev.date} · {ev.location}</Text>
              <Text style={s.cardSub}>{ev.invitations?.length || 0} συμμετέχοντες</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Communities */}
      <View style={s.section}>
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>🏘️ Κοινότητες</Text>
          <TouchableOpacity onPress={() => router.push('/communities' as any)}>
            <Text style={s.seeAll}>Όλες →</Text>
          </TouchableOpacity>
        </View>
        {communities?.length === 0 && (
          <TouchableOpacity style={s.emptyCard} onPress={() => router.push('/communities' as any)}>
            <Text style={s.emptyCardText}>+ Δημιούργησε κοινότητα στη γειτονιά σου!</Text>
          </TouchableOpacity>
        )}
        {communities?.map((c: any) => (
          <TouchableOpacity key={c.id} style={s.card} onPress={() => router.push('/communities' as any)}>
            <Text style={s.cardEmoji}>🏘️</Text>
            <View style={s.cardInfo}>
              <Text style={s.cardTitle}>{c.name}</Text>
              <Text style={s.cardSub}>{c.city} · {c.member_count} μέλη</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Social posts */}
      <View style={s.section}>
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>❤️ Social Feed</Text>
          <TouchableOpacity onPress={() => router.push('/social' as any)}>
            <Text style={s.seeAll}>Όλα →</Text>
          </TouchableOpacity>
        </View>
        {posts?.map((post: any) => (
          <TouchableOpacity key={post.id} style={s.postCard} onPress={() => router.push('/social' as any)}>
            <View style={s.postAvatar}>
              <Text style={s.postAvatarText}>{post.author_name?.[0] || '?'}</Text>
            </View>
            <View style={s.postInfo}>
              <Text style={s.postAuthor}>{post.author_name}</Text>
              <Text style={s.postContent} numberOfLines={2}>{post.content}</Text>
              <Text style={s.postMeta}>❤️ {post.likes_count} · 💬 {post.comments_count}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  quickRow: { flexDirection: 'row', gap: 10, padding: 16, backgroundColor: '#fff', marginBottom: 8 },
  quickBtn: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14 },
  quickLabel: { fontSize: 11, fontWeight: '700' },
  section: { marginBottom: 8 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 16 },
  seeAll: { fontSize: 13, color: '#E65100', fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardEmoji: { fontSize: 28, marginRight: 12 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  cardSub: { fontSize: 12, color: '#6B7280' },
  emptyCard: { margin: 16, backgroundColor: '#F3F4F6', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  emptyCardText: { color: '#9CA3AF', fontSize: 13 },
  postCard: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  postAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  postAvatarText: { fontSize: 16, fontWeight: '700', color: '#E65100' },
  postInfo: { flex: 1 },
  postAuthor: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 2 },
  postContent: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  postMeta: { fontSize: 11, color: '#9CA3AF' },
  bigEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 16, color: '#374151', fontWeight: '600', marginBottom: 20 },
  primaryBtn: { backgroundColor: '#E65100', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
