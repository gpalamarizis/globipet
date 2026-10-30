import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ban } from 'lucide-react-native'
import { api } from '../lib/api'
import { Card } from './ui'
import { colors, space, type, weight, icon, touch } from '@/theme'

/**
 * Αποκλεισμένοι χρήστες — λίστα και άρση αποκλεισμού (App Store 1.2).
 * Μόνο όνομα· το email του αποκλεισμένου δεν φτάνει ποτέ στον client.
 * Ίδιο με το web (components/BlockedUsersCard.tsx).
 */
export function BlockedUsersCard() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data: rows = [] } = useQuery({
    queryKey: ['moderation-blocks'],
    queryFn: () => api.get('/moderation/blocks').then(r => (r.data?.data ?? []) as { id: string; blocked_name: string | null }[]),
  })
  const unblock = useMutation({
    mutationFn: (id: string) => api.delete(`/moderation/blocks/${id}`),
    onSuccess: () => qc.invalidateQueries(),
    onError: (e: any) => Alert.alert(t('common.error'), e?.message || t('common.something_wrong')),
  })

  return (
    <Card>
      <View style={s.head}>
        <Ban size={icon.md} color={colors.textMuted} />
        <Text style={s.title}>{t('moderation.blockedUsers')}</Text>
      </View>
      {rows.length === 0 ? (
        <Text style={s.txt}>{t('moderation.noBlocked')}</Text>
      ) : rows.map(r => (
        <View key={r.id} style={s.row}>
          <Text style={s.name} numberOfLines={1}>{r.blocked_name || t('moderation.unknownUser')}</Text>
          <TouchableOpacity hitSlop={8} disabled={unblock.isPending} onPress={() => unblock.mutate(r.id)}
            style={s.btn} accessibilityRole="button">
            <Text style={s.btnTxt}>{t('moderation.unblock')}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </Card>
  )
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xs },
  title: { ...type.emphasis, color: colors.text, flex: 1 },
  txt: { ...type.caption, color: colors.textMuted },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: touch.comfortable,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  name: { ...type.body, color: colors.text, flex: 1 },
  btn: { paddingHorizontal: space.sm, paddingVertical: space.xs },
  btnTxt: { ...type.caption, color: colors.brand, fontWeight: weight.semibold },
})
