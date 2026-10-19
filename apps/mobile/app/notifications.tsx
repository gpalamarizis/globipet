import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, Trash2 } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, EmptyState, Loading } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Κέντρο ειδοποιήσεων — οι ειδοποιήσεις εντός εφαρμογής (GET /notifications).
 *
 * Το web τις δείχνει στο καμπανάκι της κεφαλίδας· το κινητό είχε μόνο τα
 * push, οπότε μια ειδοποίηση που χάθηκε από το σύστημα δεν βρισκόταν πουθενά.
 * Ίδιες ενέργειες με το web: ανάγνωση με πάτημα, όλες αναγνωσμένες, διαγραφή.
 */
export default function NotificationsScreen() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications', 'center'],
    queryFn: () => api.get('/notifications', { params: { limit: 50 } }).then(r => r.data),
    enabled: isAuthenticated,
  })
  const items: any[] = data?.data ?? []
  const unread: number = data?.unread_count ?? items.filter(n => !n.is_read).length

  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] })
  const onError = (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong'))

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: refresh, onError,
  })
  const markAll = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: refresh, onError,
  })
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: refresh, onError,
  })

  const when = (iso: string) => {
    const d = new Date(iso)
    const h = Math.round((Date.now() - d.getTime()) / 36e5)
    if (h < 1) return t('common.just_now')
    if (h < 24) return h === 1 ? t('inbox.hour_ago_one') : t('inbox.hours_ago', { count: h })
    const days = Math.round(h / 24)
    if (days < 7) return days === 1 ? t('inbox.day_ago_one') : t('inbox.days_ago', { count: days })
    return d.toLocaleDateString(i18n.language)
  }

  if (!isAuthenticated) return (
    <Screen title={t('notifCenter.title')} back>
      <EmptyState icon={Bell} title={t('auth.login_to_continue')} />
    </Screen>
  )
  if (isLoading) return <Screen title={t('notifCenter.title')} back><Loading /></Screen>

  return (
    <Screen title={t('notifCenter.title')} back scroll={false}
      action={unread > 0 ? (
        <TouchableOpacity hitSlop={10} onPress={() => markAll.mutate()} disabled={markAll.isPending}
          accessibilityLabel={t('notifCenter.markAll')}>
          <CheckCheck size={icon.md} color={colors.brand} />
        </TouchableOpacity>
      ) : undefined}>
      <FlatList
        data={items}
        keyExtractor={n => n.id}
        contentContainerStyle={{ padding: space.lg, gap: space.sm, flexGrow: 1 }}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListEmptyComponent={<EmptyState icon={Bell} title={t('notifCenter.empty')} />}
        renderItem={({ item: n }) => (
          <TouchableOpacity activeOpacity={0.7} style={[s.row, !n.is_read && s.rowNew]}
            onPress={() => { if (!n.is_read) markRead.mutate(n.id) }}>
            {!n.is_read ? <View style={s.dot} /> : <View style={s.dotSpace} />}
            <View style={{ flex: 1, minWidth: 0 }}>
              {!!n.title && <Text style={s.title}>{n.title}</Text>}
              <Text style={s.msg}>{n.message}</Text>
              <Text style={s.time}>{when(n.created_at)}</Text>
            </View>
            <TouchableOpacity hitSlop={10} onPress={() => remove.mutate(n.id)}
              accessibilityLabel={t('common.delete')}>
              <Trash2 size={icon.sm} color={colors.textLight} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </Screen>
  )
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: space.md,
    padding: space.md, backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  rowNew: { backgroundColor: colors.brandTint, borderColor: colors.brand },
  dot: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.brand, marginTop: 6 },
  dotSpace: { width: 8 },
  title: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  msg: { ...type.body, color: colors.textMuted },
  time: { ...type.caption, color: colors.textLight, marginTop: 2 },
})
