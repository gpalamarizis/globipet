import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Stethoscope, FileText, Brain, Heart, Shield, MapPin, PawPrint, Users, Calendar, ChevronRight, FlaskConical } from 'lucide-react-native'
import { api } from '../../src/lib/api'
import { colors, space, radius, type, weight, shadow, icon } from '@/theme'

/**
 * Ανακάλυψη.
 *
 * ΤΙ ΑΛΛΑΞΕ
 *   Η λίστα περιείχε «Νομική Υποστήριξη» με προορισμό /legal. Τέτοια οθόνη
 *   δεν υπάρχει στο mobile — ο χρήστης πατούσε και δεν γινόταν τίποτα. Έφυγε
 *   μέχρι να υπάρξει.
 *
 *   Τα εννιά emoji έγιναν εικονίδια με χρώμα κατηγορίας: ένα emoji αλλάζει
 *   όψη ανά συσκευή και δεν χρωματίζεται.
 */

const SECTIONS = [
  { key: 'telehealth',  Icon: Stethoscope, titleKey: 'profile.menu.telehealth',      subKey: 'discover.book_online',   route: '/telehealth', tint: 'veterinary' },
  { key: 'passport',    Icon: FileText,    titleKey: 'discover.medical_record', subKey: 'discover.full_history',   route: '/passport',   tint: 'pharmacy' },
  { key: 'ai-health',   Icon: Brain,       titleKey: 'cat.ai_health',          subKey: 'discover.photo_analysis',      route: '/ai-health',  tint: 'training' },
  { key: 'ai-stool', Icon: FlaskConical, titleKey: 'stool.title', subKey: 'stool.subtitle', route: '/ai-stool-urine', tint: 'veterinary' },
  { key: 'ai-emotion',  Icon: Heart,       titleKey: 'discover.ai_emotion',        subKey: 'discover.how_pet_feels',     route: '/ai-emotion', tint: 'grooming' },
  { key: 'insurance',   Icon: Shield,      titleKey: 'cat.insurance',          subKey: 'discover.pet_protection',    route: '/insurance',  tint: 'hosting' },
  { key: 'tracker',     Icon: MapPin,      titleKey: 'discover.gps_tracking',    subKey: 'discover.find_your_pet',   route: '/tracker',    tint: 'pet_taxi' },
  { key: 'playdates',   Icon: PawPrint,    titleKey: 'discover.playdates',         subKey: 'discover.meet_other_pets',  route: '/playdates',  tint: 'walking' },
  { key: 'communities', Icon: Users,       titleKey: 'discover.communities',        subKey: 'discover.owner_groups',        route: '/communities',tint: 'photography' },
]

const tint = (k: string) => (colors.category as any)[k] ?? colors.category.default

export default function DiscoverScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  const { data: events = [] } = useQuery({
    queryKey: ['upcoming-events'],
    queryFn: () => api.get('/events', { params: { upcoming: 'true', limit: 3 } })
      .then(r => r.data?.data ?? []),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['upcoming-events'] })
    setRefreshing(false)
  }, [qc])

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
      }>

      <View style={s.header}>
        <Text style={s.title}>{t('discover.title')}</Text>
        <Text style={s.subtitle}>{t('discover.subtitle')}</Text>
      </View>

      <View style={s.section}>
        {SECTIONS.map(({ key, Icon, titleKey, subKey, route, tint: tn }) => {
          const c = tint(tn)
          return (
            <TouchableOpacity key={key} style={s.card} activeOpacity={0.8}
              onPress={() => router.push(route as any)}>
              <View style={[s.cardIcon, { backgroundColor: c.bg }]}>
                <Icon size={icon.lg} color={c.fg} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.cardTitle}>{t(titleKey)}</Text>
                <Text style={s.cardSub} numberOfLines={1}>{t(subKey)}</Text>
              </View>
              <ChevronRight size={icon.md} color={colors.textLight} />
            </TouchableOpacity>
          )
        })}
      </View>

      {events.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('discover.upcoming_events')}</Text>
          {events.map((e: any) => (
            <TouchableOpacity key={e.id} style={s.eventCard} activeOpacity={0.8}
              onPress={() => router.push(`/events/${e.id}` as any)}>
              <View style={s.eventIcon}>
                <Calendar size={icon.md} color={colors.brand} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.cardTitle} numberOfLines={1}>{e.title}</Text>
                <Text style={s.cardSub} numberOfLines={1}>
                  {e.date}{e.city ? ` · ${e.city}` : ''}
                </Text>
              </View>
              <Text style={s.eventPrice}>
                {e.price > 0 ? `€${e.price}` : t('discover.free')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
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
  sectionTitle: { ...type.section, color: colors.text, fontWeight: weight.bold, marginBottom: space.md },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.surface,
    padding: space.md,
    borderRadius: radius.lg,
    marginBottom: space.md,
    ...shadow.sm,
  },
  cardIcon: {
    width: 48, height: 48, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { ...type.emphasis, color: colors.text, fontWeight: weight.semibold },
  cardSub: { ...type.caption, color: colors.textMuted, marginTop: 2 },

  eventCard: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.surface,
    padding: space.md,
    borderRadius: radius.lg,
    marginBottom: space.md,
    ...shadow.sm,
  },
  eventIcon: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.brandLight,
    alignItems: 'center', justifyContent: 'center',
  },
  eventPrice: { ...type.body, color: colors.brand, fontWeight: weight.bold },
})
