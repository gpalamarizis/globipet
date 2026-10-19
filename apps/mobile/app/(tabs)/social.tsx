import { useState, useCallback } from 'react'
import { useTabSpace } from '@/hooks/useTabSpace'
import { useTranslation } from 'react-i18next'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, RefreshControl, Platform, StatusBar, Modal, TextInput, Alert, ScrollView } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Heart, MessageCircle, Users, PenLine, X, Trash2, Send } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { useAuthStore } from '../../src/store/auth'
import { colors, space, radius, type, weight, shadow, icon } from '@/theme'

/**
 * Ύψος μπάρας κατάστασης συν αναπνοή.
 *
 * StatusBar.currentHeight δίνει την πραγματική τιμή στο Android. Τα
 * useSafeAreaInsets επιστρέφουν 0 όταν η εφαρμογή δεν είναι ρητά
 * edge-to-edge, ενώ το σύστημα σχεδιάζει ούτως ή άλλως από κάτω — γι'
 * αυτό δεν τα εμπιστευόμαστε εδώ. Κάτω όριο 48, όσο ίσχυε πριν.
 */
const HEADER_TOP = Math.max((Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0) + space.lg, 48)

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
  const tabSpace = useTabSpace()
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  /**
   * Δημοσίευση και σχόλια.
   *
   * Το κινητό μόνο διάβαζε και έκανε like: ο χρήστης δεν μπορούσε να
   * δημοσιεύσει ούτε να σχολιάσει — τα δύο που κάνουν ένα social χρήσιμο.
   */
  const [composing, setComposing] = useState(false)
  const [postText, setPostText] = useState('')
  const [commentsFor, setCommentsFor] = useState<any>(null)
  const [commentText, setCommentText] = useState('')

  const createPost = useMutation({
    mutationFn: () => api.post('/posts', { content: postText.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts'] })
      setComposing(false); setPostText('')
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const { data: comments = [] } = useQuery({
    queryKey: ['post-comments', commentsFor?.id],
    queryFn: () => api.get(`/posts/${commentsFor.id}/comments`).then(r => r.data?.data ?? r.data ?? []),
    enabled: !!commentsFor?.id,
  })

  const addComment = useMutation({
    mutationFn: () => api.post(`/posts/${commentsFor.id}/comments`, { content: commentText.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['post-comments', commentsFor?.id] })
      qc.invalidateQueries({ queryKey: ['posts'] })
      setCommentText('')
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const deleteComment = useMutation({
    mutationFn: (cid: string) => api.delete(`/posts/comments/${cid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['post-comments', commentsFor?.id] }),
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const { isAuthenticated, user } = useAuthStore()
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
        <Text style={s.title}>{t('tabs.community')}</Text>
        <Text style={s.subtitle}>{t('social.what_others_share')}</Text>
      </View>

      <TouchableOpacity style={s.composeBtn} activeOpacity={0.8} onPress={() => setComposing(true)}>
        <PenLine size={16} color={colors.textOnDark} />
        <Text style={s.composeTxt}>{t('social.write')}</Text>
      </TouchableOpacity>

      <FlatList
        data={posts}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: space.lg, paddingBottom: tabSpace.paddingBottom }}
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
                <Text style={s.emptyTitle}>{t('community.no_posts_yet')}</Text>
                <Text style={s.emptyText}>{t('social.be_first')}</Text>
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
                {!!item.pet_name && <Text style={s.petName}>{t('social.with_pet', { name: item.pet_name })}</Text>}
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

              {/* Τα σχόλια ανοίγουν με πάτημα: ήταν στατικός αριθμός και
                  ο χρήστης δεν είχε τρόπο να τα δει ή να απαντήσει. */}
              <TouchableOpacity style={s.action} activeOpacity={0.7}
                onPress={() => setCommentsFor(item)}>
                <MessageCircle size={icon.md} color={colors.textMuted} />
                <Text style={s.actionText}>{item.comments_count || 0}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      {/* Νέα δημοσίευση */}
      <Modal visible={composing} transparent animationType="slide" onRequestClose={() => setComposing(false)}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{t('social.write')}</Text>
            <TextInput style={s.input} value={postText} onChangeText={setPostText}
              placeholder={t('social.writeHint')} placeholderTextColor={colors.textLight} multiline />
            <View style={s.sheetActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setComposing(false)}>
                <Text style={s.cancelTxt}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.sendBtn}
                disabled={!postText.trim() || createPost.isPending}
                onPress={() => createPost.mutate()}>
                <Text style={s.sendTxt}>{t('social.publish')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Σχόλια */}
      <Modal visible={!!commentsFor} transparent animationType="slide" onRequestClose={() => setCommentsFor(null)}>
        <View style={s.backdrop}>
          <View style={[s.sheet, { maxHeight: '80%' }]}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>{t('social.comments')}</Text>
              <TouchableOpacity onPress={() => setCommentsFor(null)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ gap: space.sm }}>
              {comments.length === 0 ? (
                <Text style={s.emptyTxt}>{t('social.noComments')}</Text>
              ) : comments.map((c: any) => (
                <View key={c.id} style={s.comment}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.commentAuthor}>{c.author_name ?? c.author_email}</Text>
                    <Text style={s.commentTxt}>{c.content}</Text>
                  </View>
                  {c.author_email === (user as any)?.email && (
                    <TouchableOpacity onPress={() => deleteComment.mutate(c.id)} hitSlop={8}>
                      <Trash2 size={14} color={colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
            <View style={s.commentRow}>
              <TextInput style={[s.input, { flex: 1, minHeight: 44 }]} value={commentText}
                onChangeText={setCommentText} placeholder={t('social.commentHint')}
                placeholderTextColor={colors.textLight} />
              <TouchableOpacity style={s.sendSmall}
                disabled={!commentText.trim() || addComment.isPending}
                onPress={() => addComment.mutate()}>
                <Send size={18} color={colors.textOnDark} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  )
}

const s = StyleSheet.create({
  composeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs,
    marginHorizontal: space.lg, marginTop: space.md,
    backgroundColor: colors.brand, borderRadius: radius.lg, paddingVertical: space.md,
  },
  composeTxt: { ...type.body, color: colors.textOnDark, fontWeight: weight.bold },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, padding: space.lg, gap: space.md, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { ...type.section, color: colors.text },
  input: {
    ...type.body, color: colors.text, minHeight: 90, textAlignVertical: 'top',
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.md,
  },
  sheetActions: { flexDirection: 'row', gap: space.sm },
  cancelBtn: { flex: 1, paddingVertical: space.md, alignItems: 'center', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  cancelTxt: { ...type.body, color: colors.textMuted, fontWeight: weight.semibold },
  sendBtn: { flex: 1, paddingVertical: space.md, alignItems: 'center', borderRadius: radius.lg, backgroundColor: colors.brand },
  sendTxt: { ...type.body, color: colors.textOnDark, fontWeight: weight.bold },
  comment: { flexDirection: 'row', gap: space.sm, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  commentAuthor: { ...type.caption, color: colors.text, fontWeight: weight.semibold },
  commentTxt: { ...type.caption, color: colors.textMuted },
  commentRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  sendSmall: { width: 44, height: 44, borderRadius: radius.lg, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  emptyTxt: { ...type.caption, color: colors.textLight, textAlign: 'center', paddingVertical: space.lg },
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    // Σταθερό και ασφαλές: η κεφαλίδα μπορεί να αποδοθεί σε πολλά
    // σημεία της ίδιας οθόνης (συνδεδεμένος / αποσυνδεδεμένος χρήστης),
    // και inline παράκαμψη θα ίσχυε μόνο σε όποια θυμηθεί κανείς.
    paddingTop: HEADER_TOP,
    backgroundColor: colors.navy,
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
