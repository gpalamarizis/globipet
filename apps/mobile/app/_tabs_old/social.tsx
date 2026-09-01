import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../src/lib/api'
import { useAuthStore } from '../../src/store/auth'

export default function SocialScreen() {
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: posts = [], isLoading, refetch } = useQuery({
    queryKey: ['posts'],
    queryFn: () => api.get('/posts?limit=20').then(r => r.data?.data ?? []),
  })

  const likePost = useMutation({
    mutationFn: (id: string) => api.post(`/posts/${id}/like`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  })

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Social Feed</Text>
      </View>
      <FlatList data={posts} keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }: any) => (
          <View style={styles.post}>
            <View style={styles.postHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.author_name?.[0] || 'U'}</Text>
              </View>
              <View>
                <Text style={styles.authorName}>{item.author_name}</Text>
                <Text style={styles.postTime}>{new Date(item.created_at).toLocaleDateString('el-GR')}</Text>
              </View>
            </View>
            <Text style={styles.content}>{item.content}</Text>
            {item.tags?.length > 0 && (
              <View style={styles.tags}>
                {item.tags.map((t: string) => <Text key={t} style={styles.tag}>#{t}</Text>)}
              </View>
            )}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.action} onPress={() => isAuthenticated && likePost.mutate(item.id)}>
                <Text>{item.is_liked ? '❤️' : '🤍'} {item.likes_count || 0}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.action}>
                <Text>💬 {item.comments_count || 0}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Δεν υπάρχουν δημοσιεύσεις ακόμα</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  post: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#E65100' },
  authorName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  postTime: { fontSize: 12, color: '#9CA3AF' },
  content: { fontSize: 14, color: '#374151', lineHeight: 21, marginBottom: 10 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  tag: { fontSize: 13, color: '#E65100' },
  actions: { flexDirection: 'row', gap: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
})
