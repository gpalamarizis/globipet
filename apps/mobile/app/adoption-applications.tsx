import { View, Text, Image, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, FileText } from 'lucide-react-native'
import { api } from '@/lib/api'
import { fmtDateShort } from '@/lib/dates'
import { Screen, Card, Badge, Button, EmptyState, SkeletonRows } from '@/components/ui'
import { APP_TONE, SPECIES_EMOJI, useLang, adoptionStyles as a } from '@/components/adoption'
import { colors, space, radius, type, weight, icon } from '@/theme'

/** Οι αιτήσεις υιοθεσίας μου — ίδια λίστα με το /adoption/applications του web. */
export default function AdoptionApplicationsScreen() {
  const { t } = useTranslation()
  const lang = useLang()
  const router = useRouter()
  const { data = [], isLoading, refetch, isRefetching } = useQuery<any[]>({ queryKey: ['adoption-my-applications'], queryFn: () => api.get('/adoption/applications/mine').then(r => r.data.data) })

  return (
    <Screen title={t('adoption.apps.title')} back onRefresh={refetch} refreshing={isRefetching}>
      {isLoading ? <SkeletonRows count={3} /> : data.length === 0 ? (
        <EmptyState icon={FileText} title={t('adoption.apps.empty')} action={<Button label={t('adoption.apps.browse')} onPress={() => router.push('/adoption' as any)} />} />
      ) : data.map(ap => (
        <Card key={ap.id} onPress={() => router.push(`/adoption-application/${ap.id}` as any)} style={{ marginBottom: space.md }}>
          <View style={a.row}>
            <View style={s.thumb}>{ap.listing?.photos?.[0] ? <Image source={{ uri: ap.listing.photos[0] }} style={StyleSheet.absoluteFillObject} /> : <Text style={{ fontSize: 24 }}>{SPECIES_EMOJI[ap.listing?.species] ?? '🐾'}</Text>}</View>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <View style={[a.row, { flexWrap: 'wrap' }]}>
                <Text style={s.name} numberOfLines={1}>{ap.listing?.name}</Text>
                <Badge label={t(`adoption.appStatus.${ap.status}`)} tone={APP_TONE[ap.status]} />
                {ap.unread_messages > 0 && <Badge tone="warning" label={t('adoption.apps.unread', { count: ap.unread_messages })} />}
              </View>
              <Text style={a.muted} numberOfLines={1}>{ap.listing?.lister_name} · {t('adoption.apps.submitted', { date: fmtDateShort(ap.created_at, lang) })}</Text>
            </View>
            <ChevronRight size={icon.md} color={colors.textLight} />
          </View>
        </Card>
      ))}
    </Screen>
  )
}

const s = StyleSheet.create({
  thumb: { width: 52, height: 52, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  name: { ...type.body, fontWeight: weight.bold, color: colors.text, flexShrink: 1 },
})
