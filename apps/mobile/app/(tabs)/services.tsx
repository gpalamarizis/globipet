import { useState, useCallback, useEffect } from 'react'
import { useTabSpace } from '@/hooks/useTabSpace'
import { useTranslation } from 'react-i18next'
import { View, Text, TouchableOpacity, TextInput, StyleSheet, FlatList, Image, ScrollView, RefreshControl, Platform, StatusBar, ActivityIndicator } from 'react-native'
import { useInfiniteQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Search, X, Star, MapPin, CheckCircle } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { colors, space, radius, type, weight, shadow, icon, touch } from '@/theme'
import CampaignBanner from '@/components/CampaignBanner'
import { ErrorState } from '@/components/ErrorState'
import { useDebounced, nextPageOf, flattenPages } from '@/components/ListPaging'

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
  { id: 'all',         labelKey: 'services.types.all',        emoji: '🐾', tint: 'default' },
  { id: 'veterinary',  labelKey: 'services.categories.veterinary',  emoji: '🩺', tint: 'veterinary' },
  { id: 'grooming',    labelKey: 'cat.grooming',  emoji: '✂️', tint: 'grooming' },
  { id: 'walking',     labelKey: 'services.categories.walking',      emoji: '🚶', tint: 'walking' },
  { id: 'hosting',     labelKey: 'cat.boarding',   emoji: '🏠', tint: 'hosting' },
  { id: 'training',    labelKey: 'services.categories.training',  emoji: '🎓', tint: 'training' },
  { id: 'pet_taxi',    labelKey: 'services.categories.pet_taxi', emoji: '🚗', tint: 'pet_taxi' },
  { id: 'photography', labelKey: 'cat.photography', emoji: '📸', tint: 'photography' },
  { id: 'pharmacy',    labelKey: 'cat.pharmacy',   emoji: '💊', tint: 'pharmacy' },
]

// «Φιλοξενία» δεν είναι τύπος της βάσης: όπως στο web ανοίγει δύο
// υποεπιλογές (ιδιώτης / ξενοδοχείο). Πριν το κινητό έστελνε
// service_type=hosting και δεν έβρισκε ποτέ τίποτα.
const HOSTING = ['pet_sitting', 'boarding']
const HOSTING_SUB = [
  { id: 'pet_sitting', labelKey: 'services.types.pet_sitting', emoji: '🏡' },
  { id: 'boarding',    labelKey: 'services.types.boarding',    emoji: '🏨' },
]

const PAGE_SIZE = 30

const tint = (k: string) => (colors.category as any)[k] ?? colors.category.default

export default function ServicesScreen() {
  const tabSpace = useTabSpace()
  const { t } = useTranslation()
  const router = useRouter()
  const queryClient = useQueryClient()
  // Η αρχική περνά τον τύπο εδώ· χωρίς αυτό το πλακίδιο δεν φιλτράριζε.
  const { type: initialType } = useLocalSearchParams<{ type?: string }>()

  const [search, setSearch] = useState('')
  const [serviceType, setServiceType] = useState(initialType === 'hosting' ? 'pet_sitting' : (initialType || 'all'))
  // Το useState διαβάζει το `?type=` μόνο στο πρώτο mount. Η καρτέλα μένει
  // ανοιχτή στο παρασκήνιο, οπότε ένα δεύτερο πλακίδιο της Αρχικής άλλαζε
  // την παράμετρο χωρίς να αλλάξει το φίλτρο.
  useEffect(() => {
    if (initialType) setServiceType(initialType === 'hosting' ? 'pet_sitting' : initialType)
  }, [initialType])
  const [refreshing, setRefreshing] = useState(false)
  // Ίδια φίλτρα με το web: πόλη, επαληθευμένοι, έκτακτα, ελάχιστη βαθμολογία.
  const [city, setCity] = useState('')
  const [onlyVerified, setOnlyVerified] = useState(false)
  const [onlyEmergency, setOnlyEmergency] = useState(false)
  const [minRating, setMinRating] = useState(0)

  // Κείμενα με καθυστέρηση: όχι ένα αίτημα ανά πλήκτρο.
  const q = useDebounced(search.trim())
  const cityQ = useDebounced(city.trim())

  // Σελιδοποίηση (GET /services?page&limit → { data, page, totalPages }):
  // πριν ερχόταν μόνο η πρώτη σελίδα των 30 και οι υπόλοιποι πάροχοι δεν
  // εμφανίζονταν ποτέ στο κινητό. Νέα σελίδα στο τέλος της κύλισης.
  const servicesQuery = useInfiniteQuery({
    queryKey: ['services', serviceType, q, cityQ, onlyVerified, onlyEmergency, minRating],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api.get('/services', {
      params: {
        ...(serviceType !== 'all' ? { service_type: serviceType } : {}),
        ...(q ? { q } : {}),
        ...(cityQ ? { city: cityQ } : {}),
        ...(onlyVerified ? { verified: true } : {}),
        ...(onlyEmergency ? { emergency: true } : {}),
        ...(minRating > 0 ? { min_rating: minRating } : {}),
        page: pageParam,
        limit: PAGE_SIZE,
      },
    }).then(r => r.data),
    getNextPageParam: nextPageOf,
    placeholderData: keepPreviousData,
  })
  const { isLoading, isError, refetch, isFetching } = servicesQuery
  const services = flattenPages(servicesQuery.data?.pages)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['services'] })
    setRefreshing(false)
  }, [queryClient])

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{t('services.title')}</Text>
        <View style={s.searchRow}>
          <Search size={icon.md} color={colors.textLight} />
          <TextInput
            style={s.search}
            placeholder={t('services.search_provider')}
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
        <View style={[s.searchRow, { marginTop: space.sm }]}>
          <MapPin size={icon.md} color={colors.textLight} />
          <TextInput
            style={s.search}
            placeholder={t('parity.cityPlaceholder')}
            value={city}
            onChangeText={setCity}
            placeholderTextColor={colors.textLight}
            returnKeyType="search"
          />
          {city.length > 0 && (
            <TouchableOpacity onPress={() => setCity('')} hitSlop={8}>
              <X size={icon.sm} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Πλέγμα που αναδιπλώνεται: όλα τα φίλτρα ορατά με μια ματιά.
          Η οριζόντια κύλιση έκρυβε τα μισά — ο χρήστης δεν καταλαβαίνει
          ότι υπάρχει κι άλλο δεξιά. */}
      <View style={{ paddingHorizontal: space.lg, gap: space.sm, flexDirection: 'row', flexWrap: 'wrap' }}>
        {SERVICE_TYPES.map(sv => {
          const isHosting = sv.id === 'hosting'
          const active = isHosting ? HOSTING.includes(serviceType) : serviceType === sv.id
          const c = tint(sv.tint)
          return (
            <TouchableOpacity
              key={sv.id}
              activeOpacity={0.7}
              style={[s.chip, active && { backgroundColor: c.bg, borderColor: c.fg }]}
              onPress={() => setServiceType(isHosting ? (HOSTING.includes(serviceType) ? serviceType : 'pet_sitting') : sv.id)}>
              <Text style={s.chipEmoji}>{sv.emoji}</Text>
              <Text style={[s.chipText, active && { color: c.fg, fontWeight: weight.bold }]}>
                {t(sv.labelKey)}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Υποεπιλογές φιλοξενίας: ιδιώτης ή ξενοδοχείο — όπως στο web. */}
      {HOSTING.includes(serviceType) && (
        <View style={s.filterWrap}>
          {HOSTING_SUB.map(sub => {
            const on = serviceType === sub.id
            return (
              <TouchableOpacity key={sub.id} activeOpacity={0.7}
                style={[s.miniChip, on && s.miniChipOn]} onPress={() => setServiceType(sub.id)}>
                <Text style={s.chipEmoji}>{sub.emoji}</Text>
                <Text style={[s.miniTxt, on && s.miniTxtOn]}>{t(sub.labelKey)}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      {/* Γρήγορα φίλτρα — ίδια με το web. */}
      <View style={s.filterWrap}>
        <TouchableOpacity activeOpacity={0.7} style={[s.miniChip, onlyVerified && s.miniChipOn]}
          onPress={() => setOnlyVerified(v => !v)}>
          <CheckCircle size={icon.xs} color={onlyVerified ? colors.brand : colors.textMuted} />
          <Text style={[s.miniTxt, onlyVerified && s.miniTxtOn]}>{t('parity.verified')}</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} style={[s.miniChip, onlyEmergency && s.miniChipOn]}
          onPress={() => setOnlyEmergency(v => !v)}>
          <Text style={s.chipEmoji}>🚨</Text>
          <Text style={[s.miniTxt, onlyEmergency && s.miniTxtOn]}>{t('parity.emergency')}</Text>
        </TouchableOpacity>
        {[4, 4.5].map(r => {
          const on = minRating === r
          return (
            <TouchableOpacity key={r} activeOpacity={0.7} style={[s.miniChip, on && s.miniChipOn]}
              onPress={() => setMinRating(on ? 0 : r)}>
              <Star size={icon.xs} color={on ? colors.brand : colors.accent} fill={on ? colors.brand : colors.accent} />
              <Text style={[s.miniTxt, on && s.miniTxtOn]}>{r}+</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <FlatList
        data={services}
        ListHeaderComponent={<CampaignBanner page="services" slot="banner" />}
        keyExtractor={i => i.id}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (servicesQuery.hasNextPage && !servicesQuery.isFetchingNextPage) servicesQuery.fetchNextPage()
        }}
        ListFooterComponent={servicesQuery.isFetchingNextPage
          ? <ActivityIndicator color={colors.brand} style={{ marginVertical: space.md }} />
          : null}
        contentContainerStyle={{ padding: space.lg, paddingBottom: tabSpace.paddingBottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }
        ListEmptyComponent={
          // Σφάλμα δικτύου ≠ «καμία υπηρεσία»: επανάληψη.
          isError
            ? <ErrorState onRetry={() => refetch()} retrying={isFetching} />
            : isLoading
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
                <Text style={s.emptyTitle}>{t('services.no_services')}</Text>
                <Text style={s.emptyText}>
                  {search ? t('common.try_another_search') : t('common.try_another_category')}
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
              <Text style={s.price}>€{Number(item.price ?? 0).toFixed(2)}</Text>
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
  filterWrap: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.sm, flexDirection: 'row', flexWrap: 'wrap' },
  miniChip: {
    flexDirection: 'row', alignItems: 'center', gap: space.xs,
    paddingHorizontal: space.md, height: 32, borderRadius: radius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  miniChipOn: { backgroundColor: colors.brandTint, borderColor: colors.brand },
  miniTxt: { ...type.caption, color: colors.textMuted, fontWeight: weight.semibold },
  miniTxtOn: { color: colors.brand, fontWeight: weight.bold },
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
