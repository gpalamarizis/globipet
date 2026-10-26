import { useMemo, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Star } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Card, Button } from '@/components/ui'
import { Chips } from '@/components/Chips'
import { ReviewReply } from '@/components/ReviewReply'
import { colors, space, type, weight } from '@/theme'
import { dateLocale } from '@/lib/dates'

/**
 * Κριτικές που έλαβε ο πάροχος, με απάντηση — ίδιο με την καρτέλα «Κριτικές»
 * του πίνακα στο web (ProviderReviewsPage).
 *
 * GET /reviews?provider_email=<εγώ> (υπηρεσίες ΚΑΙ προϊόντα). Ζει στην
 * Επισκόπηση παρόχου ώστε να μη χρειαστεί νέα καρτέλα στη μπάρα.
 * Δείχνει 5 και «Όλες» για τις υπόλοιπες.
 */
const PAGE = 5

export function ProviderReviews() {
  const { t, i18n } = useTranslation()
  const email = useAuthStore(st => st.user?.email)
  const [filter, setFilter] = useState<'all' | 'unanswered'>('all')
  const [showAll, setShowAll] = useState(false)

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['provider-reviews', email],
    queryFn: () => api.get('/reviews', { params: { provider_email: email } }).then(r => r.data?.data ?? []),
    enabled: !!email,
  })
  // Ονόματα υπηρεσιών/προϊόντων· ίδιο queryKey με την Επισκόπηση (my-services-all).
  const { data: services = [] } = useQuery({
    queryKey: ['my-services-all'],
    queryFn: () => api.get('/services/my').then(r => r.data?.data ?? []),
    enabled: !!email,
  })
  const { data: products = [] } = useQuery({
    queryKey: ['provider-products'],
    queryFn: () => api.get('/products/my').then(r => r.data?.data ?? r.data ?? []),
    enabled: !!email,
  })
  const names = useMemo(() => {
    const m = new Map<string, string>()
    for (const sv of services as any[]) m.set(sv.id, sv.title || sv.provider_name)
    for (const p of products as any[]) m.set(p.id, p.name)
    return m
  }, [services, products])

  const all = reviews as any[]
  const unanswered = all.filter(r => !r.response).length
  const rows = all.filter(r => filter === 'all' || !r.response)
  const visible = showAll ? rows : rows.slice(0, PAGE)

  return (
    <View style={s.wrap}>
      <Text style={s.sectionTitle}>{t('reviewReply.tab')}</Text>
      <Text style={s.summary}>
        {t('reviewReply.count', { count: all.length })}
        {unanswered > 0 ? ` · ${t('reviewReply.unansweredCount', { count: unanswered })}` : ''}
      </Text>
      {all.length > 0 && (
        <Chips<'all' | 'unanswered'> value={filter} onChange={v => { setFilter(v); setShowAll(false) }} options={[
          { value: 'all', label: t('common.all') },
          { value: 'unanswered', label: t('reviewReply.onlyUnanswered') },
        ]} />
      )}
      {isLoading ? null : rows.length === 0 ? (
        <Card><Text style={s.empty}>{filter === 'unanswered' ? t('reviewReply.allAnswered') : t('reviewReply.empty')}</Text></Card>
      ) : (
        <>
          {visible.map((r: any) => {
            const target = names.get(r.service_id || r.product_id)
            return (
              <Card key={r.id} style={s.card}>
                <View style={s.top}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.name} numberOfLines={1}>{r.customer_name}</Text>
                    <Text style={s.meta} numberOfLines={1}>
                      {r.product_id ? t('reviewReply.product') : t('reviewReply.service')}
                      {target ? `: ${target}` : ''}
                      {r.created_at ? ` · ${new Date(r.created_at).toLocaleDateString(dateLocale(i18n.language))}` : ''}
                    </Text>
                  </View>
                  <View style={s.rating}>
                    <Star size={12} color={colors.warning} fill={colors.warning} />
                    <Text style={s.ratingTxt}>{r.rating}</Text>
                  </View>
                </View>
                {r.comment
                  ? <Text style={s.comment}>{r.comment}</Text>
                  : <Text style={s.noComment}>{t('reviewReply.noComment')}</Text>}
                <ReviewReply review={r} canEdit
                  label={r.product_id ? t('reviews.sellerReply') : undefined}
                  invalidate={[['provider-reviews'], ['service-reviews'], ['product-reviews']]} />
              </Card>
            )
          })}
          {rows.length > PAGE && (
            <Button variant="ghost" size="sm"
              label={showAll ? t('reviewReply.showLess') : t('common.see_all_count', { count: rows.length })}
              onPress={() => setShowAll(v => !v)} />
          )}
        </>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { marginTop: space.lg },
  sectionTitle: { ...type.emphasis, color: colors.text, marginBottom: 2 },
  summary: { ...type.caption, color: colors.textMuted, marginBottom: space.sm },
  card: { marginBottom: space.sm },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, marginBottom: space.xs },
  name: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  meta: { ...type.caption, color: colors.textLight },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingTop: 3 },
  ratingTxt: { ...type.caption, color: colors.text, fontWeight: weight.semibold },
  comment: { ...type.caption, color: colors.textMuted },
  noComment: { ...type.caption, color: colors.textLight, fontStyle: 'italic' },
  empty: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
})
