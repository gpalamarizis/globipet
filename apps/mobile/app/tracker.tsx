import { useState, useCallback } from 'react'
import { View, Text, StyleSheet, Image, Linking } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MapPin, Battery, Clock, Navigation, AlertTriangle, Wifi } from 'lucide-react-native'
import { api } from '../src/lib/api'
import { useAuthStore } from '../src/store/auth'
import { Screen, Card, Button, Badge, EmptyState, SkeletonRows } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Εντοπισμός GPS.
 *
 * ΤΙ ΑΛΛΑΞΕ
 *   Υπήρχε ένα γκρι πλαίσιο με «🗺️ Χάρτης GPS — Η ζωντανή τοποθεσία
 *   εμφανίζεται εδώ». Δεν εμφανιζόταν ποτέ τίποτα: δεν υπήρχε χάρτης και
 *   η οθόνη δεν ζητούσε καν θέσεις από τον server. Έδειχνε τα κατοικίδια
 *   και τίποτα άλλο.
 *
 *   Τώρα διαβάζει το /tracker/latest, που επιστρέφει για κάθε ζώο την
 *   τελευταία θέση και τη συνδεδεμένη συσκευή. Χωρίς ενσωματωμένο χάρτη —
 *   ο σύνδεσμος ανοίγει τους Χάρτες Google με τις πραγματικές συντεταγμένες,
 *   που είναι ό,τι χρειάζεται κάποιος που ψάχνει το ζώο του.
 *
 *   Μπαταρία και σήμα δείχνουν παύλα όταν η συσκευή δεν έχει στείλει
 *   ακόμα. Άγνωστο δεν είναι το ίδιο με γεμάτο.
 */

const SPECIES: Record<string, string> = {
  dog: '🐶', cat: '🐱', bird: '🦜', rabbit: '🐰', fish: '🐠', reptile: '🦎',
}
const emojiFor = (s?: string) => SPECIES[String(s).toLowerCase()] ?? '🐾'

const since = (iso?: string | null) => {
  if (!iso) return '—'
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'μόλις τώρα'
  if (m < 60) return `${m} λεπτά πριν`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ώρες πριν`
  return `${Math.floor(h / 24)} μέρες πριν`
}

export default function TrackerScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const [refreshing, setRefreshing] = useState(false)

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['tracker-latest'],
    queryFn: () => api.get('/tracker/latest').then(r => r.data?.data ?? []),
    enabled: isAuthenticated,
    // Το κολάρο στέλνει με δικό του ρυθμό· η οθόνη ανανεώνεται μόνη της
    // ώστε να μη χρειάζεται ο χρήστης να τραβάει συνεχώς.
    refetchInterval: 60_000,
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['tracker-latest'] })
    setRefreshing(false)
  }, [qc])

  const battery = (b: number | null | undefined) =>
    b == null ? colors.textLight : b > 50 ? colors.success : b > 20 ? colors.warning : colors.danger

  if (!isAuthenticated) return (
    <Screen title="Εντοπισμός GPS">
      <EmptyState
        icon={MapPin}
        title="Συνδέσου για πρόσβαση"
        message="Δες πού βρίσκονται τα κατοικίδιά σου."
        action={<Button label="Σύνδεση" onPress={() => router.push('/auth/login' as any)} />}
      />
    </Screen>
  )

  return (
    <Screen title="Εντοπισμός GPS" onRefresh={onRefresh} refreshing={refreshing}>
      {isLoading ? (
        <SkeletonRows count={3} height={120} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Κανένα κατοικίδιο"
          message="Πρόσθεσε πρώτα ένα κατοικίδιο και μετά σύνδεσε τη συσκευή GPS του."
          action={<Button label="Τα κατοικίδιά μου" onPress={() => router.push('/(tabs)/pets' as any)} />}
        />
      ) : (
        <View style={{ gap: space.md }}>
          {rows.map(({ pet, location, tracker }: any) => {
            const lost = pet.is_lost || location?.status === 'lost'
            return (
              <Card key={pet.id}>
                <View style={s.head}>
                  <View style={s.avatar}>
                    {pet.image_url
                      ? <Image source={{ uri: pet.image_url }} style={s.avatarImg} />
                      : <Text style={s.avatarEmoji}>{emojiFor(pet.species)}</Text>}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={s.nameRow}>
                      <Text style={s.name} numberOfLines={1}>{pet.name}</Text>
                      {lost && <Badge label="Χαμένο" tone="danger" />}
                    </View>
                    <Text style={s.sub} numberOfLines={1}>
                      {tracker ? (tracker.name || tracker.device_id) : 'Χωρίς συνδεδεμένη συσκευή'}
                    </Text>
                  </View>
                  {lost && <AlertTriangle size={icon.md} color={colors.danger} />}
                </View>

                <View style={s.stats}>
                  <View style={s.stat}>
                    <Battery size={icon.xs} color={battery(tracker?.battery_percent)} />
                    <Text style={[s.statText, { color: battery(tracker?.battery_percent) }]}>
                      {tracker?.battery_percent != null ? `${tracker.battery_percent}%` : '—'}
                    </Text>
                  </View>
                  <View style={s.stat}>
                    <Wifi size={icon.xs} color={colors.textLight} />
                    <Text style={s.statText}>
                      {tracker?.signal_strength === 'good' ? 'Καλό'
                        : tracker?.signal_strength === 'weak' ? 'Ασθενές'
                        : tracker?.signal_strength === 'none' ? 'Χωρίς σήμα' : '—'}
                    </Text>
                  </View>
                  <View style={s.stat}>
                    <Clock size={icon.xs} color={colors.textLight} />
                    <Text style={s.statText}>{since(location?.created_at)}</Text>
                  </View>
                </View>

                {location ? (
                  <>
                    <Text style={s.coords}>
                      {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                    </Text>
                    <Button
                      label="Οδηγίες στον χάρτη"
                      variant="secondary"
                      full
                      size="sm"
                      icon={<Navigation size={icon.sm} color={colors.text} />}
                      onPress={() => Linking.openURL(
                        `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`
                      )}
                      style={{ marginTop: space.md }}
                    />
                  </>
                ) : (
                  <Text style={s.noSignal}>
                    {tracker
                      ? 'Η συσκευή δεν έχει στείλει θέση ακόμη'
                      : 'Σύνδεσε συσκευή GPS για ζωντανό εντοπισμό'}
                  </Text>
                )}
              </Card>
            )
          })}
        </View>
      )}
    </Screen>
  )
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: {
    width: 56, height: 56, borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 56, height: 56 },
  avatarEmoji: { fontSize: 26 },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { ...type.emphasis, color: colors.text, fontWeight: weight.semibold },
  sub: { ...type.caption, color: colors.textMuted, marginTop: 2 },

  stats: {
    flexDirection: 'row', gap: space.lg,
    marginTop: space.md, paddingTop: space.md,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  statText: { ...type.caption, color: colors.textMuted },

  coords: { ...type.caption, color: colors.textLight, marginTop: space.md },
  noSignal: { ...type.caption, color: colors.textLight, marginTop: space.md },
})
