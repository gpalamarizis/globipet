import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Brain, Heart, FlaskConical, Stethoscope, ShieldCheck, ChevronRight, Sparkles } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, Card, Badge, Button } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'
import { AiSubscriptionManage } from './pricing'

/**
 * Κέντρο υγείας — κόμβος για όλα τα εργαλεία.
 *
 * Τα τρία AI εργαλεία και η τηλεϊατρική ήταν διάσπαρτα στην Ανακάλυψη. Εδώ
 * μαζεύονται σε ένα σημείο, με την κατάσταση της συνδρομής από πάνω: ο
 * χρήστης βλέπει τι μπορεί να χρησιμοποιήσει πριν πατήσει.
 *
 * Η κατάσταση διαβάζεται όπως στο web (PetMedicalCenter/AiFeatureGuard):
 * το /ai-subscriptions/my-status δίνει `ai_subscription_status`
 * ('none'|'trial'|'active'|'expired') και `trial_days_left` — όχι
 * is_subscribed/trial_active/trial_used, που δεν υπάρχουν και έκαναν την
 * κάρτα να λέει πάντα «χρειάζεται πλάνο». Ίδιο query key με τις άλλες
 * οθόνες, ώστε η έναρξη δοκιμής να ενημερώνει παντού.
 */
const TOOLS = [
  { key: 'health',   Icon: Brain,         titleKey: 'ai.health_title',       subKey: 'discover.photo_analysis', route: '/ai-health',      ai: true },
  { key: 'emotion',  Icon: Heart,         titleKey: 'emo.title',             subKey: 'discover.how_pet_feels',  route: '/ai-emotion',     ai: true },
  { key: 'sample',   Icon: FlaskConical,  titleKey: 'stool.title',           subKey: 'stool.subtitle',          route: '/ai-stool-urine', ai: true },
  { key: 'tele',     Icon: Stethoscope,   titleKey: 'tele.title',            subKey: 'discover.book_online',    route: '/telehealth',     ai: false },
  { key: 'passport', Icon: ShieldCheck,   titleKey: 'discover.medical_record', subKey: 'discover.full_history', route: '/passport',      ai: false },
]

export default function MedicalCenterScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { isAuthenticated, user } = useAuthStore()
  // Ο διαχειριστής έχει πάντα πρόσβαση στα AI (backend ai.ts, όπως AiGate).
  const isAdmin = user?.role === 'admin'

  const { data: status } = useQuery({
    queryKey: ['ai-subscription-status'],
    queryFn: () => api.get('/ai-subscriptions/my-status').then(r => r.data?.data),
    enabled: isAuthenticated,
  })

  const startTrial = useMutation({
    mutationFn: () => api.post('/ai-subscriptions/start-trial', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-subscription-status'] }),
    onError: (e: any) =>
      Alert.alert(t('ai.trial_failed'), e?.response?.data?.message || t('common.try_again_later')),
  })

  const st = status?.ai_subscription_status
  const active = isAdmin || st === 'active' || st === 'trial'
  const expired = st === 'expired'
  // Ο server ξεκινά δοκιμή μόνο από 'none' (αλλιώς 400). Η δοκιμή δίνεται
  // με την επιβεβαίωση του email: ανεπιβεβαίωτος → μήνυμα, όχι κουμπί (όπως web).
  const emailUnverified = (user as any)?.email_verified === false
  const canTrial = isAuthenticated && !isAdmin && st === 'none' && !emailUnverified
  // Πληρωμένη/ακυρωμένη συνδρομή: ΜΙΑ κάρτα — η πληρέστερη (AiSubscriptionManage:
  // πλάνο, κατάσταση, ακύρωση), όπως στο web PetMedicalCenter. Πριν έβγαιναν
  // δύο κάρτες κατάστασης η μία κάτω από την άλλη.
  const showManage = isAuthenticated && !isAdmin && (st === 'active' || st === 'payment_failed' || st === 'cancelled')

  return (
    <Screen title={t('medical.title')} back>
      <Text style={s.intro}>{t('medical.subtitle')}</Text>

      {/* Κατάσταση συνδρομής από πάνω: ο χρήστης ξέρει τι θα βρει. */}
      {isAuthenticated && !showManage && (
        <Card style={StyleSheet.flatten([s.statusCard, active && s.statusOk])}>
          <View style={s.statusRow}>
            <Sparkles size={icon.md} color={active ? colors.success : colors.textMuted} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.statusTitle}>
                {active ? t('medical.aiActive') : expired ? t('ai.trial_over') : t('medical.aiInactive')}
              </Text>
              {st === 'trial' && status?.trial_days_left != null && (
                <Text style={s.statusMeta}>
                  {t('medical.trialDaysLeft', { count: status.trial_days_left })}
                </Text>
              )}
            </View>
            {active && <Badge label={t('providerCal.connected')} tone="success" />}
          </View>
          {canTrial && (
            <Button label={t('ai.start_trial')} loading={startTrial.isPending}
              onPress={() => startTrial.mutate()} full style={{ marginTop: space.md }} />
          )}
          {!active && !expired && !isAdmin && st === 'none' && emailUnverified && (
            <Text style={[s.statusMeta, { marginTop: space.md }]}>{t('trialVerify.confirmEmail')}</Text>
          )}
          {!active && !canTrial && (
            <Button label={t('ai.see_plans')} variant="secondary"
              onPress={() => router.push('/pricing' as any)} full style={{ marginTop: space.md }} />
          )}
        </Card>
      )}
      {/* Πληρωμένη συνδρομή AI: κατάσταση και ακύρωση (όπως στο web). */}
      {showManage && (
        <View style={{ marginBottom: space.md }}>
          <AiSubscriptionManage />
          {/* Ακυρωμένη / αποτυχημένη πληρωμή: επιλογή πλάνου (web: «Επίλεξε πλάνο»). */}
          {st !== 'active' && (
            <Button label={t('ai.see_plans')} variant="secondary"
              onPress={() => router.push('/pricing' as any)} full style={{ marginTop: space.md }} />
          )}
        </View>
      )}
      {/* Όπως το web: χωρίς σύνδεση, πρόσκληση σύνδεσης για τη δωρεάν δοκιμή. */}
      {!isAuthenticated && (
        <Button label={t('medical.loginForTrial')} onPress={() => router.push('/auth/login' as any)}
          full style={{ marginBottom: space.md }} />
      )}

      {TOOLS.map(({ key, Icon, titleKey, subKey, route, ai }) => (
        <TouchableOpacity key={key} activeOpacity={0.7} style={s.tool}
          onPress={() => router.push(route as any)}>
          <View style={s.toolIcon}><Icon size={icon.md} color={colors.brand} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={s.toolTop}>
              <Text style={s.toolTitle} numberOfLines={1}>{t(titleKey)}</Text>
              {ai && !active && <Badge label={t('medical.needsPlan')} tone="warning" />}
            </View>
            <Text style={s.toolSub} numberOfLines={1}>{t(subKey)}</Text>
          </View>
          <ChevronRight size={icon.sm} color={colors.textLight} />
        </TouchableOpacity>
      ))}
    </Screen>
  )
}

const s = StyleSheet.create({
  intro: { ...type.body, color: colors.textMuted, marginBottom: space.md },
  // Ίδιο κενό με την κάρτα συνδρομής πάνω από τη λίστα εργαλείων.
  statusCard: { marginBottom: space.md },
  statusOk: { borderColor: colors.success, borderWidth: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  statusTitle: { ...type.body, color: colors.text, fontWeight: weight.semibold },
  statusMeta: { ...type.caption, color: colors.textLight },
  tool: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    padding: space.md, marginBottom: space.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  toolIcon: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' },
  toolTop: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  toolTitle: { ...type.body, color: colors.text, fontWeight: weight.semibold, flexShrink: 1 },
  toolSub: { ...type.caption, color: colors.textLight },
})
