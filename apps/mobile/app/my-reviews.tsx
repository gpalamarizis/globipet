import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueries } from '@tanstack/react-query'
import { Star, MessageSquare, ChevronRight } from 'lucide-react-native'
import { api } from '@/lib/api'
import { fmtDateShort } from '@/lib/dates'
import { useAuthStore } from '@/store/auth'
import { Screen, EmptyState, SkeletonRows, Button } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Ε17 — Οι κριτικές μου (Λογαριασμός → Η δραστηριότητά μου).
 *
 * GET /reviews/my (backend/src/routes/reviews.ts) → { data, total }: οι
 * γραμμές του πίνακα reviews ΧΩΡΙΣ σχέσεις — service_id ή product_id,
 * rating, comment, response, response_date, created_at. Ίδιο query
 * (κλειδί ['my-reviews']) με τον μετρητή του Λογαριασμού.
 *
 * Ονόματα: ο server (Ε17) τα δίνει στο /reviews/my — service_title /
 * provider_name / product_name. Μόνο αν λείπουν (παλιός server) ζητάμε το
 * GET /services/:id, με το ίδιο κλειδί ['service', id] της σελίδας υπηρεσίας
 * (κοινή cache). Για προϊόντα ΔΕΝ ζητάμε το GET /products/:id, γιατί μετράει
 * προβολή (countView) — χωρίς product_name μόνο ετικέτα «Προϊόν» και σύνδεσμος.
 */
export default function MyReviewsScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  const { data: reviews = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: () => api.get('/reviews/my').then(r => r.data?.data ?? r.data ?? []),
    enabled: isAuthenticated,
  })

  const serviceIds = [...new Set((reviews as any[]).filter(r => r.service_id && !r.service_title && !r.provider_name).map(r => r.service_id))] as string[]
  const services = useQueries({
    queries: serviceIds.map(id => ({
      queryKey: ['service', id],
      queryFn: () => api.get(`/services/${id}`).then(r => r.data),
      retry: false,
      staleTime: 5 * 60_000,
    })),
  })
  const serviceById: Record<string, any> = {}
  serviceIds.forEach((id, i) => { if (services[i]?.data) serviceById[id] = services[i].data })

  if (!isAuthenticated) return (
    <Screen title={t('myReviews.title')} back>
      <EmptyState icon={Star} title={t('auth.login_to_continue')}
        action={<Button label={t('auth.sign_in')} onPress={() => router.push('/auth/login' as any)} />} />
    </Screen>
  )
  if (isLoading) return <Screen title={t('myReviews.title')} back><SkeletonRows count={3} height={120} /></Screen>

  return (
    <Screen title={t('myReviews.title')} back scroll={false}>
      <FlatList
        data={reviews as any[]}
        keyExtractor={r => r.id}
        contentContainerStyle={{ padding: space.lg, gap: space.md, flexGrow: 1 }}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListEmptyComponent={
          <EmptyState icon={Star} title={t('myReviews.empty')} message={t('myReviews.emptyHint')} />
        }
        renderItem={({ item: r }) => {
          const svc = r.service_id ? serviceById[r.service_id] : null
          const isProduct = !r.service_id && !!r.product_id
          const title = isProduct
            ? (r.product_name || t('reviewReply.product'))
            : (r.service_title || svc?.title || t('reviewReply.service'))
          const provider = r.provider_name || svc?.provider_name || ''
          const target = r.service_id ? `/services/${r.service_id}` : r.product_id ? `/products/${r.product_id}` : null
          const stars = Math.max(0, Math.min(5, Math.round(Number(r.rating) || 0)))
          return (
            <View style={s.card}>
              <View style={s.head}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.title} numberOfLines={1}>{title}</Text>
                  {!!provider && <Text style={s.provider} numberOfLines={1}>{provider}</Text>}
                </View>
                <Text style={s.date}>{fmtDateShort(r.created_at, i18n.language)}</Text>
              </View>

              <View style={s.stars} accessibilityLabel={`${stars}/5`}>
                {[1, 2, 3, 4, 5].map(n => (
                  <Star key={n} size={icon.sm}
                    color={n <= stars ? colors.warning : colors.border}
                    fill={n <= stars ? colors.warning : 'transparent'} />
                ))}
              </View>

              {r.comment
                ? <Text style={s.comment}>{r.comment}</Text>
                : <Text style={s.noComment}>{t('reviewReply.noComment')}</Text>}

              {!!r.response && (
                <View style={s.reply}>
                  <View style={s.replyHead}>
                    <MessageSquare size={icon.xs} color={colors.brand} />
                    <Text style={s.replyLabel}>{t('reviewReply.providerReply')}</Text>
                    {!!r.response_date && <Text style={s.replyDate}>{fmtDateShort(r.response_date, i18n.language)}</Text>}
                  </View>
                  <Text style={s.replyText}>{r.response}</Text>
                </View>
              )}

              {!!target && (
                <TouchableOpacity style={s.link} activeOpacity={0.7} hitSlop={6}
                  onPress={() => router.push(target as any)}>
                  <Text style={s.linkText}>{isProduct ? t('myReviews.openProduct') : t('myReviews.openService')}</Text>
                  <ChevronRight size={icon.sm} color={colors.brand} />
                </TouchableOpacity>
              )}
            </View>
          )
        }}
      />
    </Screen>
  )
}

const s = StyleSheet.create({
  card: {
    padding: space.lg, gap: space.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  title: { ...type.emphasis, color: colors.text, fontWeight: weight.semibold },
  provider: { ...type.caption, color: colors.textMuted, marginTop: 1 },
  date: { ...type.caption, color: colors.textLight, marginTop: 4 },
  stars: { flexDirection: 'row', gap: 2 },
  comment: { ...type.body, color: colors.text },
  noComment: { ...type.body, color: colors.textLight, fontStyle: 'italic' },
  reply: {
    padding: space.md, gap: space.xs,
    backgroundColor: colors.brandLight, borderRadius: radius.md,
  },
  replyHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  replyLabel: { flex: 1, ...type.caption, color: colors.brand, fontWeight: weight.semibold },
  replyDate: { ...type.caption, color: colors.textMuted },
  replyText: { ...type.body, color: colors.text },
  link: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 2, marginTop: space.xs },
  linkText: { ...type.body, color: colors.brand, fontWeight: weight.semibold },
})
