import { useState, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet, FlatList, Image,
  ScrollView, RefreshControl,
} from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Search, X, Star, MapPin } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { colors, space, radius, type, weight, shadow, icon, touch } from '@/theme'

/**
 * Υπηρεσίες.
 *
 * ΤΙ ΑΛΛΑΞΕ
 *   Τα δέκα φίλτρα ήταν σε wrap που έπιανε τρεις σειρές και έσπρωχνε τα
 *   αποτελέσματα εκτός οθόνης — έβλεπες τα φίλτρα και κάτω από αυτά ένα
 *   αποτέλεσμα. Τώρα κυλάνε οριζόντια σε μία σειρά.
 *
 *   Η αρχική στέλνει `?type=` όταν πατηθεί ένα πλακίδιο υπηρεσίας. Δεν
 *   διαβαζόταν, οπότε ο χρήστης πατούσε «Κτηνίατρος» και έβλεπε όλες τις
 *   υπηρεσίες αδιακρίτως.
 */

const SERVICE_TYPES = [
  { id: 'all',         label: 'Όλες',        emoji: '🐾', tint: 'default' },
  { id: 'veterinary',  label: 'Κτηνίατρος',  emoji: '🩺', tint: 'veterinary' },
  { id: 'grooming',    label: 'Περιποίηση',  emoji: '✂️', tint: 'grooming' },
  { id: 'walking',     label: 'Βόλτες',      emoji: '🚶', tint: 'walking' },
  { id: 'hosting',     label: 'Φιλοξενία',   emoji: '🏠', tint: 'hosting' },
  { id: 'training',    label: 'Εκπαίδευση',  emoji: '🎓', tint: 'training' },
  { id: 'pet_taxi',    label: 'Pet Taxi',    emoji: '🚗', tint: 'pet_taxi' },
  { id: 'photography', label: 'Φωτογράφιση', emoji: '📸', tint: 'photography' },
  { id: 'pharmacy',    label: 'Φαρμακείο',   emoji: '💊', tint: 'pharmacy' },
]

const tint = (k: string) => (colors.category as any)[k] ?? colors.category.default

export default function ServicesScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  // Η αρχική περνά τον τύπο εδώ· χωρίς αυτό το πλακίδιο δεν φιλτράριζε.
  const { type: initialType } = useLocalSearchParams<{ type?: string }>()

  const [search, setSearch] = useState('')
  const [serviceType, setServiceType] = useState(initialType || 'all')
  const [refreshing, setRefreshing] = useState(false)

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services', serviceType, search],
    queryFn: () => api.get('/services', {
      params: {
        ...(serviceType !== 'all' ? { service_type: serviceType } : {}),
        ...(search ? { q: search } : {}),
        limit: 30,
      },
    }).then(r => r.data?.data ?? []),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['services'] })
    setRefreshing(false)
  }, [queryClient])

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Υπηρεσίες</Text>
        <View style={s.searchRow}>
          <Search size={icon.md} color={colors.textLight} />
          <TextInput
            style={s.search}
            placeholder="Αναζήτηση παρόχου ή πόλης"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.textLight}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <X size={icon.sm} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Μία σειρά που κυλάει, αντί για τρεις σειρές που τρώνε την οθόνη. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterRow}
        contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm }}>
        {SERVICE_TYPES.map(t => {
          const active = serviceType === t.id
          const c = tint(t.tint)
          return (
            <TouchableOpacity
              key={t.id}
              activeOpacity={0.7}
              style={[s.chip, active && { backgroundColor: c.bg, borderColor: c.fg }]}
              onPress={() => setServiceType(t.id)}>
              <Text style={s.chipEmoji}>{t.emoji}</Text>
              <Text style={[s.chipText, active && { color: c.fg, fontWeight: weight.bold }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <FlatList
        data={services}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: space.lg, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }
        ListEmptyComponent={
          isLoading
            ? <View>{[0, 1, 2, 3].map(i => (
                <View key={i} style={s.card}>
                  <View style={[s.avatar, s.skeleton]} />
                  <View style={{ flex: 1, gap: space.sm }}>
                    <View style={[s.skeleton, { height: 15, width: '60%', borderRadius: radius.sm }]} />
                    <View style={[s.skeleton, { height: 12, width: '40%', borderRadius: radius.sm }]} />
                  </View>
                </View>
              ))}</View>
            : <View style={s.empty}>
                <Search size={icon.hero} color={colors.border} />
                <Text style={s.emptyTitle}>Δεν βρέθηκαν υπηρεσίες</Text>
                <Text style={s.emptyText}>
                  {search ? 'Δοκίμασε άλλη αναζήτηση' : 'Δοκίμασε άλλη κατηγορία'}
                </Text>
              </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            activeOpacity={0.8}
            onPress={() => router.push(`/services/${item.id}` as any)}>
            <View style={s.avatar}>
              {item.image_url
                ? <Image source={{ uri: item.image_url }} style={s.avatarImg} />
                : <Text style={s.avatarEmoji}>🐾</Text>}
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.name} numberOfLines={1}>{item.provider_name}</Text>
              {!!item.title && <Text style={s.sub} numberOfLines={1}>{item.title}</Text>}
              <View style={s.metaRow}>
                <MapPin size={icon.xs} color={colors.textLight} />
                <Text style={s.meta} numberOfLines={1}>{item.city}</Text>
                {item.reviews_count > 0 && (
                  <>
                    <Star size={icon.xs} color={colors.accent} fill={colors.accent} />
                    <Text style={s.meta}>
                      {item.rating?.toFixed(1)} ({item.reviews_count})
                    </Text>
                  </>
                )}
              </View>
            </View>

            <View style={s.priceBox}>
              <Text style={s.price}>€{item.price}</Text>
              {item.is_verified && <Text style={s.verified}>✓</Text>}
            </View>
          </TouchableOpacity>
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
  title: { ...type.title, color: colors.textOnDark, fontWeight: weight.bold, marginBottom: space.md },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    backgroundColor: colors.surface,
    height: touch.comfortable,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
  },
  search: { flex: 1, ...type.body, color: colors.text, padding: 0 },

  filterRow: { paddingVertical: space.lg, maxHeight: 68, flexGrow: 0 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: space.xs,
    paddingHorizontal: space.lg,
    height: touch.min,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  chipEmoji: { fontSize: 16 },
  chipText: { ...type.body, color: colors.textMuted, fontWeight: weight.semibold },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.surface,
    padding: space.md,
    borderRadius: radius.lg,
    marginBottom: space.md,
    ...shadow.sm,
  },
  avatar: {
    width: 60, height: 60, borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 60, height: 60 },
  avatarEmoji: { fontSize: 26 },

  name: { ...type.emphasis, color: colors.text, fontWeight: weight.semibold },
  sub: { ...type.caption, color: colors.textMuted, marginTop: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs },
  meta: { ...type.caption, color: colors.textMuted },

  priceBox: { alignItems: 'flex-end', gap: 2 },
  price: { ...type.emphasis, color: colors.brand, fontWeight: weight.bold },
  verified: { ...type.caption, color: colors.success, fontWeight: weight.bold },

  skeleton: { backgroundColor: colors.surfaceAlt },

  empty: { alignItems: 'center', paddingTop: 80, gap: space.sm },
  emptyTitle: { ...type.emphasis, color: colors.text, fontWeight: weight.semibold, marginTop: space.md },
  emptyText: { ...type.body, color: colors.textMuted },
})
