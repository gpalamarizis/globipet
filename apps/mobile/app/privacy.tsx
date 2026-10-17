import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert, Share } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, Trash2, ShieldCheck, Undo2, AlertTriangle } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, Card, Badge, Button, Input } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Δικαιώματα δεδομένων — GDPR Άρθρα 17 και 20.
 *
 * ΓΙΑΤΙ ΧΡΕΙΑΖΕΤΑΙ
 *   Τα endpoints υπήρχαν στον server από την αρχή, αλλά καμία οθόνη δεν τα
 *   καλούσε: ο χρήστης δεν μπορούσε ούτε να εξάγει τα δεδομένα του ούτε να
 *   ζητήσει διαγραφή. Το δικαίωμα υπάρχει μόνο αν μπορεί να ασκηθεί.
 *
 * Η διαγραφή δεν είναι ακαριαία: ο server καταχωρεί αίτημα με 30 ημέρες
 * αναμονή και ο χρήστης μπορεί να το ακυρώσει. Αυτό προστατεύει από
 * λανθασμένο πάτημα και από λογαριασμό που παραβιάστηκε.
 */
export default function PrivacyScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { logout } = useAuthStore()
  const [reason, setReason] = useState('')
  const [confirming, setConfirming] = useState(false)

  const { data: status } = useQuery({
    queryKey: ['delete-status'],
    queryFn: () => api.get('/user-rights/delete-status').then(r => r.data?.data ?? r.data),
  })

  const exportData = useMutation({
    mutationFn: () => api.get('/user-rights/export').then(r => r.data),
    onSuccess: async (data) => {
      // Χωρίς σύστημα αρχείων: μοιραζόμαστε το JSON, ώστε ο χρήστης να το
      // στείλει στον εαυτό του ή να το αποθηκεύσει όπου θέλει.
      try {
        await Share.share({ message: JSON.stringify(data, null, 2).slice(0, 500000) })
      } catch {
        Alert.alert(t('privacy.exportDone'), t('privacy.exportHint'))
      }
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const requestDelete = useMutation({
    mutationFn: () => api.post('/user-rights/delete-request', { reason: reason.trim() || undefined }),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ['delete-status'] })
      setConfirming(false); setReason('')
      Alert.alert(t('privacy.deleteRequested'), r?.data?.message || t('privacy.deleteRequestedHint'))
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const cancelDelete = useMutation({
    mutationFn: () => api.post('/user-rights/cancel-delete', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delete-status'] })
      Alert.alert(t('privacy.cancelled'), t('privacy.cancelledHint'))
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('common.something_wrong')),
  })

  const pending = !!status?.pending || status?.status === 'pending'
  const scheduled = status?.scheduled_for ?? status?.delete_after

  return (
    <Screen title={t('privacy.title')} back scroll={false}>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Text style={s.intro}>{t('privacy.subtitle')}</Text>

        {/* Εκκρεμές αίτημα διαγραφής — πάνω πάνω, γιατί είναι το πιο επείγον */}
        {pending && (
          <Card style={s.warnCard}>
            <View style={s.warnHead}>
              <AlertTriangle size={icon.md} color={colors.danger} />
              <Text style={s.warnTitle}>{t('privacy.pendingTitle')}</Text>
            </View>
            <Text style={s.warnTxt}>
              {scheduled
                ? t('privacy.pendingOn', { date: String(scheduled).slice(0, 10) })
                : t('privacy.pendingHint')}
            </Text>
            <Button label={t('privacy.cancelDelete')}
              icon={<Undo2 size={18} color={colors.textOnDark} />}
              loading={cancelDelete.isPending}
              onPress={() => cancelDelete.mutate()} full style={{ marginTop: space.md }} />
          </Card>
        )}

        {/* Άρθρο 20 — φορητότητα */}
        <Card>
          <View style={s.head}>
            <Download size={icon.md} color={colors.brand} />
            <Text style={s.cardTitle}>{t('privacy.exportTitle')}</Text>
          </View>
          <Text style={s.cardTxt}>{t('privacy.exportDesc')}</Text>
          <Button label={t('privacy.exportAction')} variant="secondary"
            loading={exportData.isPending}
            onPress={() => exportData.mutate()} full style={{ marginTop: space.md }} />
        </Card>

        {/* Άρθρο 17 — διαγραφή */}
        {!pending && (
          <Card>
            <View style={s.head}>
              <Trash2 size={icon.md} color={colors.danger} />
              <Text style={s.cardTitle}>{t('privacy.deleteTitle')}</Text>
            </View>
            <Text style={s.cardTxt}>{t('privacy.deleteDesc')}</Text>

            {confirming ? (
              <>
                <Input label={t('privacy.reason')} value={reason} onChangeText={setReason}
                  placeholder={t('privacy.reasonHint')} multiline />
                <View style={s.row}>
                  <Button label={t('common.cancel')} variant="secondary"
                    onPress={() => { setConfirming(false); setReason('') }} style={{ flex: 1 }} />
                  <Button label={t('privacy.confirmDelete')} variant="danger"
                    loading={requestDelete.isPending}
                    onPress={() => requestDelete.mutate()} style={{ flex: 1 }} />
                </View>
              </>
            ) : (
              <Button label={t('privacy.deleteAction')} variant="danger"
                onPress={() => setConfirming(true)} full style={{ marginTop: space.md }} />
            )}
          </Card>
        )}

        <View style={s.note}>
          <ShieldCheck size={14} color={colors.textLight} />
          <Text style={s.noteTxt}>{t('privacy.legalNote')}</Text>
        </View>
      </ScrollView>
    </Screen>
  )
}

const s = StyleSheet.create({
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
  intro: { ...type.body, color: colors.textMuted },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xs },
  cardTitle: { ...type.emphasis, color: colors.text, flex: 1 },
  cardTxt: { ...type.caption, color: colors.textMuted },
  warnCard: { backgroundColor: colors.dangerBg, borderColor: colors.danger, borderWidth: 1 },
  warnHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  warnTitle: { ...type.emphasis, color: colors.danger, flex: 1 },
  warnTxt: { ...type.caption, color: colors.text, marginTop: space.xs },
  row: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  note: { flexDirection: 'row', gap: space.xs, alignItems: 'flex-start', marginTop: space.md },
  noteTxt: { ...type.caption, color: colors.textLight, flex: 1 },
})
