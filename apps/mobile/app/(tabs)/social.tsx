import { useState, useCallback } from 'react'
import { useTabSpace } from '@/hooks/useTabSpace'
import { useTranslation } from 'react-i18next'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, RefreshControl, Platform, StatusBar, Modal, TextInput, Alert, ScrollView, Share } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Heart, MessageCircle, Users, PenLine, X, Trash2, Send, Share2, ImagePlus } from 'lucide-react-native'
import { pickAndUploadImage } from '@/lib/uploadImage'
import { api } from '../../src/lib/api'
import { useAuthStore } from '../../src/store/auth'
import { colors, space, radius, type, weight, shadow, icon } from '@/theme'
import CampaignBanner from '@/components/CampaignBanner'
import { ContentActions } from '@/components/ContentActions'

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
 *
 * ΙΣΟΤΙΜΙΑ ΜΕ ΤΟ WEB (19/10)
 *   - Φίλτρο «Όλα / Trending» (?filter=), όπως στο web.
 *   - Η νέα δημοσίευση δέχεται φωτογραφία (φάκελος «posts») και hashtags·
 *     τα hashtags φαίνονται κάτω από κάθε δημοσίευση.
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
  const [postImage, setPostImage] = useState<string | null>(null)
  const [uploadingImg, setUploadingImg] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [filter, setFilter] = useState<'all' | 'trending'>('all')

  const closeCompose = () => {
    setComposing(false); setPostText(''); setPostImage(null); setTags([]); setTagInput('')
  }
  const addTag = () => {
    const tag = tagInput.trim().replace(/^#+/, '')
    if (tag && !tags.includes(tag)) setTags(p => [...p, tag])
    setTagInput('')
  }
  const pickPostImage = async () => {
    setUploadingImg(true)
    try {
      const url = await pickAndUploadImage('posts')
      if (url) setPostImage(url)
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message === 'permission'
        ? t('providerEdit.photoPermission')
        : e?.response?.data?.message || t('providerEdit.errUpload'))
    } finally { setUploadingImg(false) }
  }
  const [commentsFor, setCommentsFor] = useState<any>(null)
  const [commentText, setCommentText] = useState('')

  const createPost = useMutation({
    mutationFn: () => api.post('/posts', { content: postText.trim(), image_url: postImage, tags }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts'] })
      closeCompose()
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['post-comments', commentsFor?.id] })
      qc.invalidateQueries({ queryKey: ['posts'] })
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const { isAuthenticated, user } = useAuthStore()
  const [refreshing, setRefreshing] = useState(false)

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts', filter],
    queryFn: () => api.get('/posts', { params: { limit: 20, filter } }).then(r => r.data?.data ?? []),
  })

  const toggleLike = useMutation({
    mutationFn: ({ id, liked }: { id: string; liked: boolean }) =>
      liked ? api.delete(`/posts/${id}/like`) : api.post(`/posts/${id}/like`),
    onMutate: async ({ id, liked }) => {
      await qc.cancelQueries({ queryKey: ['posts', filter] })
      qc.setQueryData(['posts', filter], (old: any) =>
        old?.map((p: any) => p.id === id
          ? { ...p, likes_count: Math.max(0, p.likes_count + (liked ? -1 : 1)), liked_by_me: !liked }
          : p))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  })

  // Διαγραφή δημοσίευσης (συντάκτης ή admin), όπως στο web.
  const deletePost = useMutation({
    mutationFn: (pid: string) => api.delete(`/posts/${pid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })
  const confirmDeletePost = (pid: string) =>
    Alert.alert(t('common.delete'), t('social.deleteQ'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deletePost.mutate(pid) },
    ])

  // Κοινοποίηση με το σύστημα. Δεν υπάρχει σελίδα ανά δημοσίευση — ο
  // σύνδεσμος είναι η ροή στο web (ίδια συμπεριφορά με το web).
  const sharePost = (p: any) => {
    const url = 'https://globipet.com/social'
    const text = String(p.content || '').slice(0, 200)
    // iOS: το url πάει ξεχωριστά (αλλιώς εμφανίζεται δύο φορές).
    // Android: αγνοεί το url, οπότε μπαίνει μέσα στο μήνυμα.
    Share.share(Platform.OS === 'ios'
      ? { message: text, url }
      : { message: `${text}\n${url}` }).catch(() => {})
  }

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

      <TouchableOpacity style={s.composeBtn} activeOpacity={0.8} onPress={() => isAuthenticated ? setComposing(true) : router.push('/auth/login' as any)}>
        <PenLine size={16} color={colors.textOnDark} />
        <Text style={s.composeTxt}>{t('social.write')}</Text>
      </TouchableOpacity>

      <FlatList
        data={posts}
        ListHeaderComponent={
          <>
            <CampaignBanner page="social" slot="sidebar" />
            <View style={s.filters}>
              {([['all', t('common.all')], ['trending', t('social.trending')]] as const).map(([v, label]) => (
                <TouchableOpacity key={v} activeOpacity={0.7} onPress={() => setFilter(v)}
                  style={[s.filter, filter === v && s.filterOn]}>
                  <Text style={[s.filterTxt, filter === v && s.filterTxtOn]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
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
              {/* App Store 1.2: αναφορά / αποκλεισμός (όχι στα δικά μου). */}
              <ContentActions type="post" id={item.id} isMine={item.is_mine === true} />
            </View>

            <Text style={s.content}>{item.content}</Text>

            {!!item.image_url && (
              <Image source={{ uri: item.image_url }} style={s.postImage} resizeMode="cover" />
            )}

            {Array.isArray(item.tags) && item.tags.length > 0 && (
              <View style={s.tags}>
                {item.tags.map((tag: string) => <Text key={tag} style={s.tag}>#{tag}</Text>)}
              </View>
            )}

            <View style={s.actions}>
              <TouchableOpacity
                style={s.action}
                activeOpacity={0.7}
                // Χωρίς `disabled`: με αυτό το πάτημα του επισκέπτη δεν έφτανε
                // ποτέ στο router.push προς τη σύνδεση.
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

              <TouchableOpacity style={[s.action, { marginLeft: 'auto' }]} activeOpacity={0.7}
                accessibilityLabel={t('social.share')} onPress={() => sharePost(item)}>
                <Share2 size={icon.md} color={colors.textMuted} />
              </TouchableOpacity>
              {isAuthenticated && (item.is_mine === true || (user as any)?.role === 'admin') && (
                <TouchableOpacity style={s.action} activeOpacity={0.7}
                  accessibilityLabel={t('common.delete')} onPress={() => confirmDeletePost(item.id)}>
                  <Trash2 size={icon.md} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
      {/* Νέα δημοσίευση */}
      <Modal visible={composing} transparent animationType="slide" onRequestClose={closeCompose}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{t('social.write')}</Text>
            <TextInput style={s.input} value={postText} onChangeText={setPostText}
              placeholder={t('social.writeHint')} placeholderTextColor={colors.textLight} multiline />

            {postImage ? (
              <View style={s.previewWrap}>
                <Image source={{ uri: postImage }} style={s.preview} />
                <TouchableOpacity style={s.previewRemove} hitSlop={8} onPress={() => setPostImage(null)}>
                  <X size={14} color={colors.textOnDark} />
                </TouchableOpacity>
              </View>
            ) : null}

            {tags.length > 0 && (
              <View style={s.tags}>
                {tags.map(tag => (
                  <TouchableOpacity key={tag} style={s.tagChip} onPress={() => setTags(p => p.filter(x => x !== tag))}>
                    <Text style={s.tag}>#{tag}</Text>
                    <X size={12} color={colors.brand} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={s.commentRow}>
              <TextInput style={[s.input, { flex: 1, minHeight: 44 }]} value={tagInput} onChangeText={setTagInput}
                placeholder={t('social.hashtagHint')} placeholderTextColor={colors.textLight}
                autoCapitalize="none" returnKeyType="done" onSubmitEditing={addTag} blurOnSubmit={false} />
              <TouchableOpacity style={s.imgBtn} disabled={uploadingImg} onPress={pickPostImage}
                accessibilityLabel={t('providerEdit.addPhoto')}>
                <ImagePlus size={18} color={uploadingImg ? colors.textLight : colors.brand} />
              </TouchableOpacity>
            </View>

            <View style={s.sheetActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={closeCompose}>
                <Text style={s.cancelTxt}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.sendBtn}
                disabled={!postText.trim() || createPost.isPending || uploadingImg}
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
                    <Text style={s.commentAuthor}>{c.author_name}</Text>
                    <Text style={s.commentTxt}>{c.content}</Text>
                  </View>
                  {/* Ίδιοι κανόνες με το backend/web: ο συντάκτης του σχολίου ή της δημοσίευσης. */}
                  {/* is_mine από τον server: τα author_email δεν επιστρέφονται πια δημόσια. */}
                  {isAuthenticated && (c.is_mine === true || commentsFor?.is_mine === true) && (
                    <TouchableOpacity onPress={() => deleteComment.mutate(c.id)} hitSlop={8}>
                      <Trash2 size={14} color={colors.danger} />
                    </TouchableOpacity>
                  )}
                  <ContentActions type="comment" id={c.id} isMine={c.is_mine === true} size={icon.sm} />
                </View>
              ))}
            </ScrollView>
            {isAuthenticated && <View style={s.commentRow}>
              <TextInput style={[s.input, { flex: 1, minHeight: 44 }]} value={commentText}
                onChangeText={setCommentText} placeholder={t('social.commentHint')}
                placeholderTextColor={colors.textLight} />
              <TouchableOpacity style={s.sendSmall}
                disabled={!commentText.trim() || addComment.isPending}
                onPress={() => addComment.mutate()}>
                <Send size={18} color={colors.textOnDark} />
              </TouchableOpacity>
            </View>}
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
  filters: { flexDirection: 'row', gap: space.sm, marginBottom: space.md },
  filter: {
    paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  filterOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  filterTxt: { ...type.caption, color: colors.textMuted, fontWeight: weight.semibold },
  filterTxtOn: { color: colors.textOnDark },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  tag: { ...type.caption, color: colors.brand, fontWeight: weight.semibold },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: radius.full, backgroundColor: colors.brandLight,
  },
  imgBtn: {
    width: 44, height: 44, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  previewWrap: { alignSelf: 'flex-start' },
  preview: { width: 128, height: 128, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
  previewRemove: {
    position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: radius.full,
    backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center',
  },
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
