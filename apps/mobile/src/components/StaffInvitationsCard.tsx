import { View, Text, StyleSheet, Alert, ViewStyle } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Check, X } from 'lucide-react-native'
import { api } from '@/lib/api'
import { Card, Button } from '@/components/ui'
import { colors, space, type, weight, icon, radius } from '@/theme'

/**
 * Προσκλήσεις στο προσωπικό ενός παρόχου (GET /staff/invitations) — ίδια
 * λειτουργία με το web (web/src/components/StaffInvitationsCard.tsx).
 *
 * Η σύνδεση με το προσωπικό γίνεται ΜΟΝΟ όταν ο χρήστης αποδεχθεί
 * (POST /staff/:id/accept)· η απόρριψη (POST /staff/:id/decline) αφαιρεί το
 * email από το μέλος. Χωρίς προσκλήσεις η κάρτα δεν εμφανίζεται.
 */
type Invitation = {
  id: string
  full_name: string
  title: string | null
  business_name: string | null
  service_type: string | null
  city: string | null
}

export default function StaffInvitationsCard({ style }: { style?: ViewStyle }) {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['staff-invitations'],
    queryFn: () => api.get('/staff/invitations').then(r => (r.data?.data ?? []) as Invitation[]),
  })
  const rows = data ?? []

  const answer = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      api.post(`/staff/${id}/${accept ? 'accept' : 'decline'}`, {}).then(r => r.data),
    onSuccess: (_res, v) => {
      qc.invalidateQueries({ queryKey: ['staff-invitations'] })
      qc.invalidateQueries({ queryKey: ['staff-me'] })
      Alert.alert(v.accept ? t('staffInvite.accepted') : t('staffInvite.declined'))
    },
    onError: (e: any) => {
      qc.invalidateQueries({ queryKey: ['staff-invitations'] })
      Alert.alert(t('common.error'), e?.response?.data?.message || t('common.error'))
    },
  })

  if (rows.length === 0) return null

  const typeLabel = (st: string | null) =>
    st ? String(t(`services.categories.${st}`, { defaultValue: st })) : null

  return (
    <Card style={style}>
      <View style={s.head}>
        <UserPlus size={icon.md} color={colors.brand} />
        <Text style={s.title}>{t('staffInvite.title')}</Text>
      </View>
      <Text style={s.subtitle}>{t('staffInvite.subtitle')}</Text>
      {rows.map(inv => (
        <View key={inv.id} style={s.item}>
          <Text style={s.business} numberOfLines={1}>{inv.business_name || t('staffInvite.unknownBusiness')}</Text>
          <Text style={s.meta} numberOfLines={2}>
            {t('staffInvite.asMember', { name: inv.full_name })}{inv.title ? ` · ${inv.title}` : ''}
          </Text>
          {!!(inv.service_type || inv.city) && (
            <Text style={s.small} numberOfLines={1}>
              {[typeLabel(inv.service_type), inv.city].filter(Boolean).join(' · ')}
            </Text>
          )}
          <View style={s.actions}>
            <Button size="sm" variant="secondary" label={t('staffInvite.decline')} style={s.btn}
              icon={<X size={icon.xs} color={colors.text} />}
              disabled={answer.isPending} onPress={() => answer.mutate({ id: inv.id, accept: false })} />
            <Button size="sm" label={t('staffInvite.accept')} style={s.btn}
              icon={<Check size={icon.xs} color={colors.textOnDark} />}
              disabled={answer.isPending} onPress={() => answer.mutate({ id: inv.id, accept: true })} />
          </View>
        </View>
      ))}
    </Card>
  )
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { ...type.body, color: colors.text, fontWeight: weight.bold },
  subtitle: { ...type.caption, color: colors.textMuted, marginTop: space.xs },
  item: {
    marginTop: space.md, padding: space.md, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  business: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  meta: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  small: { ...type.caption, color: colors.textLight, marginTop: 2 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm, marginTop: space.md },
  btn: { flex: 1 },
})
