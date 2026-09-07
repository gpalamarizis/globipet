import { useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image, RefreshControl,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Heart, MessageCircle, Users } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { useAuthStore } from '../../src/store/auth'
import { colors, space, radius, type, weight, shadow, icon } from '@/theme'

/**
 * Κοινωνική ροή.
 *
 * ΤΙ ΑΛΛΑΞΕ
 *   Η καρδιά διάβαζε `is_liked`. Ο server επιστρέφει `liked_by_me` — οπότε
 *   δεν γέμιζε ποτέ, όσες φορές κι αν πατούσε κανείς.
 *
 *   Και στελνόταν μόνο POST. Το endpoint είναι idempotent: δεύτερο πάτημα
 *   δεν κάνει τίποτα, άρα το un-like ήταν αδύνατο. Τώρα στέλνεται DELETE
 *   όταν η δημοσίευση είναι ήδη αγαπημένη.
 */
export default function SocialScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const [refreshing, setRefreshing] = useState(false)

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: () => api.get('/posts', { params: { limit: 20 } }).then(r => r.data?.data ?? []),
  })

  const toggleLike = useMutation({
    mutationFn: ({ id, liked }: { id: string; liked: boolean }) =>
      liked ? api.delete(`/posts/${id}/like`) : api.post(`/posts/${id}/like`),
    onMutate: async ({ id, liked }) => {
      await qc.cancelQueries({ queryKey: ['posts'] })
      qc.setQueryData(['posts'], (old: any) =>
        old?.map((p: any) => p.id === id
          ? { ...p, likes_count: Math.max(0, p.likes_count + (liked ? -1 : 1)), liked_by_me: !liked }
          : p))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['posts'] })
    setRefreshing(false)
  }, [qc])

  const initials = (n?: string) =>
    n?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '🐾'

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Κοινότητα</Text>
        <Text style={s.subtitle}>Τι μοιράζονται οι άλλοι ιδιοκτήτες</Text>
      </View>

      <FlatList
        data={posts}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: space.lg, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }
        ListEmptyComponent={
          isLoading
            ? <View>{[0, 1].map(i => (
                <View key={i} style={s.card}>
                  <View style={s.postHeader}>
                    <View style={[s.avatar, s.skeleton]} />
                    <View style={[s.skeleton, { height: 14, width: 120, borderRadius: radius.sm }]} />
                  </View>
                  <View style={[s.skeleton, { height: 44, borderRadius: radius.sm, marginTop: space.md }]} />
                </View>
              ))}</View>
            : <View style={s.empty}>
                <Users size={icon.hero} color={colors.border} />
                <Text style={s.emptyTitle}>Καμία δημοσίευση ακόμη</Text>
                <Text style={s.emptyText}>Γίνε ο πρώτος που θα μοιραστεί κάτι.</Text>
              </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.postHeader}>
              <View style={s.avatar}>
                {item.author_photo
                  ? <Image source={{ uri: item.author_photo }} style={s.avatarImg} />
                  : <Text style={s.initials}>{initials(item.author_name)}</Text>}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.author} numberOfLines={1}>{item.author_name}</Text>
                {!!item.pet_name && <Text style={s.petName}>με {item.pet_name}</Text>}
              </View>
            </View>

            <Text style={s.content}>{item.content}</Text>

            {!!item.image_url && (
              <Image source={{ uri: item.image_url }} style={s.postImage} resizeMode="cover" />
            )}

            <View style={s.actions}>
              <TouchableOpacity
                style={s.action}
                activeOpacity={0.7}
                disabled={!isAuthenticated}
                onPress={() => isAuthenticated
                  ? toggleLike.mutate({ id: item.id, liked: !!item.liked_by_me })
                  : router.push('/auth/login' as any)}>
                <Heart
                  size={icon.md}
                  color={item.liked_by_me ? colors.danger : colors.textMuted}
                  fill={item.liked_by_me ? colors.danger : 'transparent'}
                />
                <Text style={[s.actionText, item.liked_by_me && { color: colors.danger }]}>
                  {item.likes_count || 0}
                </Text>
              </TouchableOpacity>

              <View style={s.action}>
                <MessageCircle size={icon.md} color={colors.textMuted} />
                <Text style={s.actionText}>{item.comments_count || 0}</Text>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.navy,
    paddingTop: space.xxxl + space.lg,
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
  },
  title: { ...type.title, color: colors.textOnDark, fontWeight: weight.bold },
  subtitle: { ...type.body, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.md,
    ...shadow.sm,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: {
    width: 42, height: 42, borderRadius: radius.full,
    backgroundColor: colors.brandLight,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 42, height: 42 },
  initials: { ...type.caption, color: colors.brand, fontWeight: weight.bold },
  author: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  petName: { ...type.caption, color: colors.textMuted, marginTop: 1 },

  content: { ...type.body, color: colors.text, marginTop: space.md, lineHeight: 22 },
  postImage: {
    width: '100%', height: 220,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    marginTop: space.md,
  },

  actions: {
    flexDirection: 'row', gap: space.xxl,
    marginTop: space.md, paddingTop: space.md,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  actionText: { ...type.body, color: colors.textMuted, fontWeight: weight.semibold },

  skeleton: { backgroundColor: colors.surfaceAlt },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: space.xl, gap: space.sm },
  emptyTitle: { ...type.emphasis, color: colors.text, fontWeight: weight.semibold, marginTop: space.md },
  emptyText: { ...type.body, color: colors.textMuted, textAlign: 'center' },
})
