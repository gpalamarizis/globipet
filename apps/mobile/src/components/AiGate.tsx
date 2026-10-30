import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { View, Text, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Brain, AlertTriangle } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, Button, Skeleton } from '@/components/ui'
import theme, { colors, space, radius, weight, icon, touch } from '@/theme'
import { DIGITAL_PURCHASES_IN_APP } from '../lib/storePolicy'

const typo = theme.type

/**
 * Πύλη για τα εργαλεία AI — το αντίστοιχο του AiFeatureGuard του web.
 *
 * Ήταν γραμμένη μόνο μέσα στο ai-health· η ανάλυση συναισθήματος και η
 * ανάλυση δείγματος άνοιγαν χωρίς έλεγχο και ο χρήστης χωρίς πλάνο έπεφτε
 * σε 403 του server μόνο αφού ανέβαζε φωτογραφία. Οι κανόνες, με τη σειρά:
 *   1. Χωρίς σύνδεση → σύνδεση.
 *   2. Admin → περνά χωρίς συνδρομή (όπως web και backend), χωρίς αίτημα.
 *   3. Όσο φορτώνει η κατάσταση → σκελετός (όχι πύλη που αναβοσβήνει).
 *   4. Αποτυχία ελέγχου χωρίς καμία γνωστή κατάσταση → σφάλμα με επανάληψη.
 *   5. 'trial' ή 'active' → η οθόνη.
 *   6. Αλλιώς → έναρξη δοκιμής (μόνο από 'none', όπως ο server) ή πλάνα
 *      (ληγμένη δοκιμή, ακυρωμένη, αποτυχημένη πληρωμή — όπως το web).
 */
export default function AiGate({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useTranslation()
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const queryClient = useQueryClient()

  const {
    data: status, isLoading: statusLoading,
    isError: statusError, refetch: refetchStatus, isFetching: statusFetching,
  } = useQuery({
    queryKey: ['ai-subscription-status'],
    queryFn: () => api.get('/ai-subscriptions/my-status').then(r => r.data?.data),
    enabled: isAuthenticated && !isAdmin,
  })

  const startTrial = useMutation({
    mutationFn: () => api.post('/ai-subscriptions/start-trial'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-subscription-status'] }),
    onError: (e: any) =>
      Alert.alert(t('ai.trial_failed'), e?.response?.data?.message || t('common.try_again_later')),
  })

  const canUseAi = isAdmin ||
    status?.ai_subscription_status === 'trial' || status?.ai_subscription_status === 'active'

  // ── Πύλη: χωρίς σύνδεση ──────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <Screen title={title}>
        <View style={s.gate}>
          <View style={s.gateIcon}><Brain size={icon.xl} color={colors.brand} /></View>
          <Text style={s.gateTitle}>{t('ai.need_login')}</Text>
          <Text style={s.gateText}>{t('ai.login_reason')}</Text>
          <Button label={t('auth.sign_in')} full onPress={() => router.push('/auth/login')}
            style={{ marginTop: space.xl }} />
        </View>
      </Screen>
    )
  }

  // ── Όσο φορτώνει η κατάσταση συνδρομής ───────────────────────────
  if (statusLoading) {
    return (
      <Screen title={title}>
        <View style={{ gap: space.md }}>
          <Skeleton height={56} round={radius.md} />
          <Skeleton height={200} round={radius.xl} />
          <Skeleton height={touch.min} round={radius.md} />
        </View>
      </Screen>
    )
  }

  // ── Αποτυχία ελέγχου συνδρομής (δίκτυο/500) ──────────────────────
  // Δεν ξέρουμε αν έχει πλάνο· «Ξεκίνα τη δοκιμή» θα ήταν λάθος (και σε
  // συνδρομητή). Σφάλμα με επανάληψη, όπως στο web.
  if (statusError && !status && !isAdmin) {
    return (
      <Screen title={title}>
        <View style={s.gate}>
          <View style={s.gateIcon}><AlertTriangle size={icon.xl} color={colors.danger} /></View>
          <Text style={s.gateTitle}>{t('common.error')}</Text>
          <Text style={s.gateText}>{t('common.problem_try_again')}</Text>
          <Button label={t('common.try_again')} full
            loading={statusFetching}
            onPress={() => refetchStatus()}
            style={{ marginTop: space.xl }} />
        </View>
      </Screen>
    )
  }

  // ── Πύλη: χωρίς ενεργή δοκιμή ή συνδρομή ─────────────────────────
  if (!canUseAi) {
    const st = status?.ai_subscription_status
    // Ο server δίνει δοκιμή μόνο από 'none'· κάθε άλλη μη ενεργή → πλάνα.
    const expired = !!st && st !== 'none'
    return (
      <Screen title={title}>
        <View style={s.gate}>
          <View style={s.gateIcon}><Brain size={icon.xl} color={colors.brand} /></View>
          <Text style={s.gateTitle}>
            {st === 'payment_failed' ? t('aiGate.paymentFailedTitle')
              : st === 'cancelled' ? t('aiSub.cancelledTitle')
              : st === 'expired' ? t('ai.trial_over')
              : expired ? t('aiGate.required') : t('ai.try_free')}
          </Text>
          <Text style={s.gateText}>
            {st === 'payment_failed' ? t('aiSub.paymentFailedHint')
              : st === 'expired' ? t('ai.trial_sub')
              : expired ? t('aiGate.cancelledText')
              : t('ai.trial_desc')}
          </Text>
          {expired ? (
            DIGITAL_PURCHASES_IN_APP ? (
              <Button label={t('ai.see_plans')} full
                onPress={() => router.push('/pricing' as any)}
                style={{ marginTop: space.xl }} />
            ) : null
          ) : (user as any)?.email_verified === false ? (
            // Η δοκιμή ξεκινά με την επιβεβαίωση του email — όχι κουμπί (όπως web).
            <Text style={[s.gateText, { marginTop: space.xl, fontWeight: weight.semibold }]}>{t('trialVerify.confirmEmail')}</Text>
          ) : (
            <Button label={t('ai.start_trial')} full
              loading={startTrial.isPending}
              onPress={() => startTrial.mutate()}
              style={{ marginTop: space.xl }} />
          )}
        </View>
      </Screen>
    )
  }

  return <>{children}</>
}

const s = StyleSheet.create({
  gate: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: space.lg },
  gateIcon: {
    width: 88, height: 88, borderRadius: radius.full,
    backgroundColor: colors.brandLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: space.lg,
  },
  gateTitle: {
    ...typo.section, fontWeight: weight.bold,
    color: colors.navy, textAlign: 'center',
  },
  gateText: {
    ...typo.body, color: colors.textMuted,
    textAlign: 'center', marginTop: space.sm,
  },
})
