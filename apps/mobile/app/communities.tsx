import { useState } from 'react'
import { View, Text, FlatList, StyleSheet, Alert, RefreshControl, Modal, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Users, Lock, Bird, Cat, Dog, Rabbit, PawPrint, Check, Plus } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, Card, Button, Badge, EmptyState, SkeletonRows, Input } from '@/components/ui'
import theme, { colors, space, radius, weight, icon } from '@/theme'
import CampaignBanner from '@/components/CampaignBanner'

const typo = theme.type

/**
 * Κοινότητες κατοικιδίων.
 *
 * ΤΙ ΑΛΛΑΞΕ (07/09)
 *   Τα emoji τύπου έγιναν εικονίδια, ώστε το μέγεθος και το χρώμα να
 *   ελέγχονται από το θέμα αντί να τα ορίζει η γραμματοσειρά του
 *   συστήματος. Προστέθηκε τράβηγμα για ανανέωση και σκελετοί.
 *
 *   Η εγγραφή κρατά πλέον ποια κοινότητα φορτώνει. Πριν, το `isPending`
 *   ήταν κοινό: πατούσες σε μία και «φόρτωναν» όλες.
 */

const TYPES: Record<string, { Icon: any; labelKey: string }> = {
  dogs:    { Icon: Dog,      labelKey: 'insurance.dogs' },
  cats:    { Icon: Cat,      labelKey: 'insurance.cats' },
  birds:   { Icon: Bird,     labelKey: 'com.birds' },
  rabbits: { Icon: Rabbit,   labelKey: 'com.rabbits' },
  general: { Icon: PawPrint, labelKey: 'com.general' },
}

export default function CommunitiesScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  /**
   * Δημιουργία κοινότητας και αποχώρηση.
   *
   * Το κινητό μόνο έδειχνε λίστα και έκανε εγγραφή· δεν δημιουργούσε ούτε
   * αποχωρούσε. Ο χρήστης που έμπαινε σε λάθος κοινότητα έμενε εκεί.
   */
  const [creating, setCreating] = useState(false)
  const [cName, setCName] = useState('')
  const [cDesc, setCDesc] = useState('')
  const [cCity, setCCity] = useState('')

  const createCommunity = useMutation({
    mutationFn: () => api.post('/communities', {
      name: cName.trim(),
      description: cDesc.trim() || undefined,
      city: cCity.trim(),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['communities'] })
      setCreating(false); setCName(''); setCDesc(''); setCCity('')
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const leave = useMutation({
    mutationFn: (cid: string) => api.delete(`/communities/${cid}/leave`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['communities'] }),
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const { isAuthenticated } = useAuthStore()

  const { data = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['communities'],
    queryFn: () => api.get('/communities').then(r => r.data?.data ?? []),
  })

  const join = useMutation({
    mutationFn: (id: string) => api.post(`/communities/${id}/join`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['communities'] })
      Alert.alert(t('com.joined'), t('com.joined_msg'))
    },
    onError: (e: any) =>
      Alert.alert(t('com.join_failed'), e?.response?.data?.message || t('common.try_again_later')),
  })

  const renderItem = ({ item: c }: { item: any }) => {
    const kind = TYPES[c.type] || TYPES.general
    const pending = join.isPending && join.variables === c.id

    return (
      <Card onPress={() => router.push(`/communities/${c.id}` as any)}>
        <View style={s.top}>
          <View style={s.avatar}>
            <kind.Icon size={icon.lg} color={colors.navy} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={s.name}>{c.name}</Text>
            <View style={s.meta}>
              <Users size={icon.xs} color={colors.textMuted} />
              <Text style={s.metaText}>
                {c.members_count || 0} {c.members_count === 1 ? t('com.member_one') : t('com.members')}
              </Text>
              {c.is_private ? (
                <>
                  <Lock size={icon.xs} color={colors.textMuted} />
                  <Text style={s.metaText}>{t('com.closed')}</Text>
                </>
              ) : null}
            </View>
          </View>

          {c.is_member ? (
            <Badge label={t('com.member')} tone="success" />
          ) : null}
        </View>

        {c.description ? (
          <Text style={s.desc} numberOfLines={3}>{c.description}</Text>
        ) : null}

        {isAuthenticated && !c.is_member ? (
          <Button
            label={t('auth.register')}
            full
            loading={pending}
            icon={pending ? undefined : <Check size={icon.sm} color={colors.textOnDark} />}
            onPress={() => join.mutate(c.id)}
            style={{ marginTop: space.lg }} />
        ) : null}
      </Card>
    )
  }

  return (
    <Screen title={t('discover.communities')} subtitle={t('com.subtitle')} scroll={false}>
      <Button label={t('com.create')} icon={<Plus size={18} color={colors.textOnDark} />}
        onPress={() => setCreating(true)} full style={{ marginBottom: space.md }} />
      <CampaignBanner page="communities" slot="banner" />

      {isLoading ? (
        <View style={{ padding: space.lg }}>
          <SkeletonRows count={4} height={140} />
        </View>
      ) : data.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t('com.none')}
          message={t('com.none_hint')}
          action={!isAuthenticated
            ? <Button label={t('auth.sign_in')} onPress={() => router.push('/auth/login')} />
            : undefined} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(c: any) => String(c.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: space.xxxl }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />
          } />
      )}
      <Modal visible={creating} transparent animationType="slide" onRequestClose={() => setCreating(false)}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{t('com.create')}</Text>
            <Input label={t('com.nameLabel')} value={cName} onChangeText={setCName} />
            <Input label={t('providerNew.description')} value={cDesc} onChangeText={setCDesc} multiline />
            <Input label={t('common.city')} value={cCity} onChangeText={setCCity} />
            <View style={s.sheetActions}>
              <Button label={t('common.cancel')} variant="secondary"
                onPress={() => setCreating(false)} style={{ flex: 1 }} />
              <Button label={t('common.save')}
                disabled={!cName.trim() || !cCity.trim() || createCommunity.isPending}
                loading={createCommunity.isPending}
                onPress={() => createCommunity.mutate()} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

    </Screen>
  )
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, padding: space.lg, gap: space.md, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl },
  sheetTitle: { ...typo.section, color: colors.text },
  sheetActions: { flexDirection: 'row', gap: space.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: {
    width: 52, height: 52, borderRadius: radius.lg,
    backgroundColor: colors.navyTint,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { ...typo.emphasis, fontWeight: weight.bold, color: colors.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs },
  metaText: { ...typo.caption, color: colors.textMuted, marginRight: space.sm },
  desc: { ...typo.body, color: colors.textMuted, marginTop: space.md },
})
