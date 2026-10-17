import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, Image } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, MapPin, Users } from 'lucide-react-native'
import { api } from '@/lib/api'
import { Screen, Card, Badge, EmptyState, SkeletonRows } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/** Εκδηλώσεις για κατοικίδια. */
export default function EventsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.get('/events').then(r => r.data?.data ?? r.data ?? []),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await qc.invalidateQueries({ queryKey: ['events'] }); setRefreshing(false)
  }, [qc])

  return (
    <Screen title={t('events.title')} back onRefresh={onRefresh} refreshing={refreshing}>
      {isLoading ? <SkeletonRows count={3} /> :
       events.length === 0 ? <EmptyState icon={CalendarDays} title={t('events.empty')} message={t('events.emptyHint')} /> :
       events.map((e: any) => {
        const full = e.capacity != null && (e.registered_count ?? 0) >= e.capacity
        return (
          <Card key={e.id} onPress={() => router.push(`/events/${e.id}` as any)}>
            {!!e.image_url && <Image source={{ uri: e.image_url }} style={s.image} resizeMode="cover" />}
            <Text style={s.title} numberOfLines={2}>{e.title}</Text>
            <View style={s.metaRow}>
              <CalendarDays size={icon.xs} color={colors.textLight} />
              <Text style={s.meta}>{e.date}{e.time ? ` · ${e.time}` : ''}</Text>
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
              {full && <Badge label={t('play.full')} tone="danger" />}
            </View>
          </Card>
        )
      })}
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
