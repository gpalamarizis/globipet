import { useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { PawPrint, Building2, MessageSquare, ChevronRight, MapPin, Users } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { colors, space, radius, type, weight, shadow, icon } from '@/theme'

/**
 * Κοινότητα — επισκόπηση.
 *
 * Τρία πράγματα σε μία οθόνη: βόλτες, γειτονιές, ροή. Καθένα δείχνει τα
 * τρία πρώτα και οδηγεί στη δική του οθόνη — μια οθόνη επισκόπησης που
 * δείχνει τα πάντα δεν είναι επισκόπηση.
 */
export default function CommunityScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  const { data: playdatesData } = useQuery({
    queryKey: ['playdates-preview'],
    queryFn: () => api.get('/playdates').then(r => r.data),
  })
  const { data: communities = [] } = useQuery({
    queryKey: ['communities-preview'],
    queryFn: () => api.get('/communities').then(r => r.data?.communities ?? []),
  })
  const { data: posts = [] } = useQuery({
    queryKey: ['posts-preview'],
    queryFn: () => api.get('/posts', { params: { limit: 3 } }).then(r => r.data?.data ?? []),
  })

  const playdates = playdatesData?.events ?? []

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['playdates-preview'] }),
      qc.invalidateQueries({ queryKey: ['communities-preview'] }),
      qc.invalidateQueries({ queryKey: ['posts-preview'] }),
    ])
    setRefreshing(false)
  }, [qc])

  const Section = ({ title, count, route, children }: any) => (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>{title}</Text>
        <TouchableOpacity style={s.seeAll} activeOpacity={0.7}
          onPress={() => router.push(route as any)}>
          <Text style={s.seeAllText}>Όλα{count ? ` (${count})` : ''}</Text>
          <ChevronRight size={icon.sm} color={colors.brand} />
        </TouchableOpacity>
      </View>
      {children}
    </View>
  )

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
      }>

      <View style={s.header}>
        <Text style={s.title}>Κοινότητα</Text>
        <Text style={s.subtitle}>Βόλτες, γειτονιές και ό,τι συμβαίνει γύρω σου</Text>
      </View>

      <Section title="Βόλτες & συναντήσεις" count={playdates.length} route="/playdates">
        {playdates.length === 0
          ? <Text style={s.emptyLine}>Καμία προγραμματισμένη βόλτα κοντά σου</Text>
          : playdates.slice(0, 3).map((p: any) => (
              <TouchableOpacity key={p.id} style={s.card} activeOpacity={0.8}
                onPress={() => router.push('/playdates' as any)}>
                <View style={[s.cardIcon, { backgroundColor: colors.category.walking.bg }]}>
                  <PawPrint size={icon.md} color={colors.category.walking.fg} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.cardTitle} numberOfLines={1}>{p.title}</Text>
                  <Text style={s.cardSub} numberOfLines={1}>
                    {[p.date, p.location].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <ChevronRight size={icon.md} color={colors.textLight} />
              </TouchableOpacity>
            ))}
      </Section>

      <Section title="Κοινότητες γειτονιάς" count={communities.length} route="/communities">
        {communities.length === 0
          ? <Text style={s.emptyLine}>Καμία κοινότητα κοντά σου ακόμη</Text>
          : communities.slice(0, 3).map((c: any) => (
              <TouchableOpacity key={c.id} style={s.card} activeOpacity={0.8}
                onPress={() => router.push('/communities' as any)}>
                <View style={[s.cardIcon, { backgroundColor: colors.category.photography.bg }]}>
                  <Building2 size={icon.md} color={colors.category.photography.fg} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.cardTitle} numberOfLines={1}>{c.name}</Text>
                  <View style={s.metaRow}>
                    <MapPin size={icon.xs} color={colors.textLight} />
                    <Text style={s.cardSub}>{c.city}</Text>
                    <Users size={icon.xs} color={colors.textLight} />
                    <Text style={s.cardSub}>{c.member_count}</Text>
                  </View>
                </View>
                <ChevronRight size={icon.md} color={colors.textLight} />
              </TouchableOpacity>
            ))}
      </Section>

      <Section title="Τελευταίες δημοσιεύσεις" route="/(tabs)/social">
        {posts.length === 0
          ? <Text style={s.emptyLine}>Καμία δημοσίευση ακόμη</Text>
          : posts.map((p: any) => (
              <TouchableOpacity key={p.id} style={s.card} activeOpacity={0.8}
                onPress={() => router.push('/(tabs)/social' as any)}>
                <View style={[s.cardIcon, { backgroundColor: colors.category.training.bg }]}>
                  <MessageSquare size={icon.md} color={colors.category.training.fg} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.cardTitle} numberOfLines={1}>{p.author_name}</Text>
                  <Text style={s.cardSub} numberOfLines={2}>{p.content}</Text>
                </View>
              </TouchableOpacity>
            ))}
      </Section>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.navy,
    paddingTop: space.xxxl + space.lg,
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
  },
  title: { ...type.title, color: colors.textOnDark, fontWeight: weight.bold },
  subtitle: { ...type.body, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  section: { paddingHorizontal: space.lg, paddingTop: space.xl },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: space.md,
  },
  sectionTitle: { ...type.section, color: colors.text, fontWeight: weight.bold },
  seeAll: { flexDirection: 'row', alignItems: 'center' },
  seeAllText: { ...type.body, color: colors.brand, fontWeight: weight.semibold },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.surface,
    padding: space.md,
    borderRadius: radius.lg,
    marginBottom: space.md,
    ...shadow.sm,
  },
  cardIcon: {
    width: 44, height: 44, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  cardSub: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs },

  emptyLine: {
    ...type.body, color: colors.textLight,
    paddingVertical: space.lg, textAlign: 'center',
  },
})
