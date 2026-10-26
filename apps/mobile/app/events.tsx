import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, Image } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useInfiniteQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { CalendarDays, MapPin, Users, Plus } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Chips } from '@/components/Chips'
import { Screen, Card, Badge, Button, Input, EmptyState, SkeletonRows } from '@/components/ui'
import { LoadMore, useDebounced, nextPageOf, flattenPages } from '@/components/ListPaging'
import { ErrorState } from '@/components/ErrorState'
import { colors, space, radius, type, weight, icon } from '@/theme'
import { fmtYmd } from '@/lib/dates'

/** Τύποι εκδήλωσης — ίδιες τιμές με το web (Events.tsx) και το event_type της φόρμας. */
const EVENT_TYPES = ['', 'meetup', 'show', 'adoption', 'training', 'charity', 'competition'] as const
const PAGE_SIZE = 20

/** Εκδηλώσεις για κατοικίδια. */
export default function EventsScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  // «Οι εκδηλώσεις μου» (GET /events?mine=true): όσες οργανώνω, ΜΑΖΙ με τις
  // ακυρωμένες — όπως στο web. Μόνο για συνδεδεμένους.
  const { isAuthenticated } = useAuthStore()
  const [filter, setFilter] = useState<'all' | 'mine'>('all')
  const mine = isAuthenticated && filter === 'mine'
  // Αναζήτηση, πόλη, τύπος, «μόνο επερχόμενες» και σελίδες — ίδιες παράμετροι
  // με το web (GET /events?q&city&event_type&upcoming&mine&page&limit). Πριν
  // ερχόταν μόνο η πρώτη σελίδα (20) χωρίς κανένα φίλτρο.
  const [search, setSearch] = useState('')
  const [cityInput, setCityInput] = useState('')
  const [eventType, setEventType] = useState<typeof EVENT_TYPES[number]>('')
  const [upcomingOnly, setUpcomingOnly] = useState(true)
  const q = useDebounced(search.trim())
  const city = useDebounced(cityInput.trim())
  const upcoming = upcomingOnly && !mine

  const eventsQuery = useInfiniteQuery({
    queryKey: ['events', { mine, q, city, eventType, upcoming }],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api.get('/events', {
      params: {
        q: q || undefined,
        city: city || undefined,
        event_type: eventType || undefined,
        // Στις δικές μου: όλες (και περασμένες ακυρωμένες με εκκρεμότητες).
        upcoming: upcoming ? 'true' : undefined,
        mine: mine ? 'true' : undefined,
        page: pageParam,
        limit: PAGE_SIZE,
      },
    }).then(r => r.data),
    getNextPageParam: nextPageOf,
    placeholderData: keepPreviousData,
  })
  const { isLoading, isError, refetch, isFetching } = eventsQuery
  const events = flattenPages(eventsQuery.data?.pages)
  const filtered = !!(q || city || eventType)

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await qc.invalidateQueries({ queryKey: ['events'] }); setRefreshing(false)
  }, [qc])

  // Νέα εκδήλωση (POST /events): κάθε συνδεδεμένος χρήστης, όπως στο web· οι υπόλοιποι πάνε στη σύνδεση.
  return (
    <Screen title={t('events.title')} back onRefresh={onRefresh} refreshing={refreshing}
      action={<Button size="sm" label={t('eventForm.newButton')} icon={<Plus size={icon.sm} color={colors.textOnDark} />}
        onPress={() => router.push((isAuthenticated ? '/event-form' : '/auth/login') as any)} />}>
      {isAuthenticated && (
        <Chips<'all' | 'mine'> value={filter} onChange={setFilter} options={[
          { value: 'all', label: t('common.all') },
          { value: 'mine', label: t('events.mine') },
        ]} />
      )}
      <Input value={search} onChangeText={setSearch} placeholder={t('events.searchPlaceholder')} style={{ marginBottom: space.sm }} />
      <Input value={cityInput} onChangeText={setCityInput} placeholder={t('parity.cityPlaceholder')} />
      <Chips<typeof EVENT_TYPES[number]> value={eventType} onChange={setEventType}
        options={EVENT_TYPES.map(v => ({ value: v, label: v ? t(`events.types.${v}`) : t('common.all') }))} />
      {!mine && (
        <Chips<'upcoming' | 'all'> value={upcomingOnly ? 'upcoming' : 'all'} onChange={v => setUpcomingOnly(v === 'upcoming')}
          options={[
            { value: 'upcoming', label: t('events.upcomingOnly') },
            { value: 'all', label: t('events.allDates') },
          ]} />
      )}
      {isLoading ? <SkeletonRows count={3} /> :
       isError && events.length === 0 ? <ErrorState onRetry={() => refetch()} retrying={isFetching} /> :
       events.length === 0 ? (mine && !filtered
         ? <EmptyState icon={CalendarDays} title={t('events.mineEmpty')} />
         : filtered
         ? <EmptyState icon={CalendarDays} title={t('common.no_results')} message={q ? t('common.try_another_search') : t('common.try_another_category')} />
         : <EmptyState icon={CalendarDays} title={t('events.empty')} message={t('events.emptyHint')} />) :
       events.map((e: any) => {
        const full = e.capacity != null && (e.registered_count ?? 0) >= e.capacity
        return (
          <Card key={e.id} onPress={() => router.push(`/events/${e.id}` as any)}>
            {!!e.image_url && <Image source={{ uri: e.image_url }} style={s.image} resizeMode="cover" />}
            <Text style={s.title} numberOfLines={2}>{e.title}</Text>
            <View style={s.metaRow}>
              <CalendarDays size={icon.xs} color={colors.textLight} />
              <Text style={s.meta}>{fmtYmd(e.date, i18n.language, { weekday: 'short', day: '2-digit', month: 'short' })}{e.time ? ` · ${e.time}` : ''}</Text>
            </View>
            {!!e.city && (
              <View style={s.metaRow}>
                <MapPin size={icon.xs} color={colors.textLight} />
                <Text style={s.meta} numberOfLines={1}>{e.location || e.city}</Text>
              </View>
            )}
            <View style={s.badges}>
              <Badge label={e.price > 0 ? `€${Number(e.price).toFixed(2)}` : t('discover.free')}
                tone={e.price > 0 ? 'neutral' : 'success'} />
              {e.capacity != null && (
                <View style={s.metaRow}>
                  <Users size={icon.xs} color={colors.textLight} />
                  <Text style={s.meta}>{e.registered_count ?? 0}/{e.capacity}</Text>
                </View>
              )}
              {/* Ακυρωμένη από τον διοργανωτή (πεδίο `cancelled` του GET /events), όπως στο web. */}
              {e.cancelled === true && <Badge label={t('status.cancelled')} tone="danger" />}
              {full && e.cancelled !== true && <Badge label={t('play.full')} tone="danger" />}
              {/* «Οι εκδηλώσεις μου»: επιστροφές που περιμένουν «Ολοκλήρωση επιστροφών». */}
              {Number(e.refunds_pending) > 0 && (
                <Badge label={t('events.refundsPending', { count: Number(e.refunds_pending) })} tone="warning" />
              )}
            </View>
          </Card>
        )
      })}
      {events.length > 0 && (
        <LoadMore hasMore={!!eventsQuery.hasNextPage} loading={eventsQuery.isFetchingNextPage}
          onPress={() => eventsQuery.fetchNextPage()} />
      )}
    </Screen>
  )
}

const s = StyleSheet.create({
  image: { width: '100%', height: 140, borderRadius: radius.lg, marginBottom: space.sm, backgroundColor: colors.surfaceAlt },
  title: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs },
  meta: { ...type.caption, color: colors.textLight },
  badges: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm, flexWrap: 'wrap' },
})
