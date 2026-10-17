import { View, Text, StyleSheet, ScrollView, Image, Alert, Linking } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, MapPin, Users, Euro } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, Card, Badge, Button, EmptyState, SkeletonRows } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Λεπτομέρεια εκδήλωσης με εγγραφή.
 *
 * Όταν η εκδήλωση έχει τιμή, ο server επιστρέφει διεύθυνση πληρωμής και ο
 * χρήστης φεύγει για το Viva — ίδια λογική με τις κρατήσεις: καμία
 * επιβεβαίωση πριν μπουν τα χρήματα.
 */
export default function EventDetailScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { isAuthenticated } = useAuthStore()

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then(r => r.data?.data ?? r.data),
    enabled: !!id,
  })

  const { data: registration } = useQuery({
    queryKey: ['event-registration', id],
    queryFn: () => api.get(`/events/${id}/registration`).then(r => r.data?.data ?? r.data),
    enabled: !!id && isAuthenticated,
  })

  const register = useMutation({
    mutationFn: () => api.post(`/events/${id}/register`, {}),
    onSuccess: async (r: any) => {
      qc.invalidateQueries({ queryKey: ['event-registration', id] })
      qc.invalidateQueries({ queryKey: ['event', id] })
      const url = r?.data?.checkoutUrl ?? r?.data?.data?.checkoutUrl
      if (url) {
        const ok = await Linking.canOpenURL(url)
        if (ok) return Linking.openURL(url)
      }
      Alert.alert(t('events.registered'), event?.title ?? '')
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  if (isLoading) return <Screen title={t('events.title')} back><SkeletonRows count={3} /></Screen>
  if (!event) return (
    <Screen title={t('events.title')} back>
      <EmptyState icon={CalendarDays} title={t('events.notFound')} />
    </Screen>
  )

  const full = event.capacity != null && (event.registered_count ?? 0) >= event.capacity
  const already = !!registration?.id

  return (
    <Screen title={event.title} back scroll={false}>
      <ScrollView contentContainerStyle={s.body}>
        {!!event.image_url && <Image source={{ uri: event.image_url }} style={s.image} resizeMode="cover" />}

        <Card>
          <Text style={s.title}>{event.title}</Text>
          {!!event.organizer && <Text style={s.meta}>{event.organizer}</Text>}

          <View style={s.kvRow}>
            <CalendarDays size={icon.sm} color={colors.brand} />
            <Text style={s.kv}>{event.date}{event.time ? ` · ${event.time}` : ''}</Text>
          </View>
          {!!(event.location || event.city) && (
            <View style={s.kvRow}>
              <MapPin size={icon.sm} color={colors.brand} />
              <Text style={s.kv}>{event.location || event.city}</Text>
            </View>
          )}
          <View style={s.kvRow}>
            <Euro size={icon.sm} color={colors.brand} />
            <Text style={s.kv}>
              {event.price > 0 ? `€${Number(event.price).toFixed(2)}` : t('discover.free')}
            </Text>
          </View>
          {event.capacity != null && (
            <View style={s.kvRow}>
              <Users size={icon.sm} color={colors.brand} />
              <Text style={s.kv}>{event.registered_count ?? 0}/{event.capacity}</Text>
            </View>
          )}
        </Card>

        {!!event.description && (
          <Card><Text style={s.desc}>{event.description}</Text></Card>
        )}

        {already ? (
          <Badge label={t('events.alreadyRegistered')} tone="success" />
        ) : !isAuthenticated ? (
          <Button label={t('auth.login')} onPress={() => router.push('/auth/login' as any)} full />
        ) : (
          <Button
            label={full ? t('play.full') : t('events.register')}
            disabled={full || register.isPending}
            loading={register.isPending}
            onPress={() => register.mutate()} full />
        )}
      </ScrollView>
    </Screen>
  )
}

const s = StyleSheet.create({
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
  image: { width: '100%', height: 200, borderRadius: radius.xl, backgroundColor: colors.surfaceAlt },
  title: { ...type.section, color: colors.text },
  meta: { ...type.caption, color: colors.textLight, marginTop: 2 },
  kvRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  kv: { ...type.body, color: colors.textMuted },
  desc: { ...type.body, color: colors.textMuted },
})
