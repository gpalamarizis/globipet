import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Switch, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, Card, Button, Badge, SkeletonRows } from '@/components/ui'
import { colors, space, type, weight } from '@/theme'

/**
 * Συγκαταθέσεις — αντίστοιχο της σελίδας /cookies του web.
 *
 * Ε13 (απόφαση ιδιοκτήτη): χωρίς «Στατιστικά» και «Marketing» (διαφήμιση) —
 * δεν χρησιμοποιούμε τέτοια εργαλεία. Ούτε «Λειτουργικά» ως διακόπτη: γλώσσα
 * και θέμα αποθηκεύονται πάντα (τα ζητά ο χρήστης) και η πολιτική απορρήτου
 * §11 τα κατατάσσει στα απαραίτητα. Τα κλειδιά consents.analytics/marketing/
 * functional μένουν στα locales αλλά δεν χρησιμοποιούνται.
 *
 * Μένει ένας διακόπτης, «Ενημερωτικά email» = `marketing` στο backend: το
 * διαβάζει η μαζική αποστολή email του admin (admin.ts). Ίδιο endpoint
 * (/user-consents), κάθε αλλαγή ΝΕΑ εγγραφή (GDPR άρθρο 7§3).
 *
 * Δεν στέλνουμε terms_accepted / privacy_accepted: ο server τα κρατά από την
 * προηγούμενη εγγραφή, ώστε μια αλλαγή προτιμήσεων να μη «σβήνει» την
 * αποδοχή όρων της εγγραφής.
 */
export default function ConsentsScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const isAuthenticated = useAuthStore(st => st.isAuthenticated)
  const [newsletter, setNewsletter] = useState(false)

  const { data: current, isLoading } = useQuery({
    queryKey: ['consents-current'],
    queryFn: () => api.get('/user-consents/current').then(r => r.data?.data ?? null),
    enabled: isAuthenticated,
  })

  useEffect(() => {
    if (current) setNewsletter(!!current.marketing)
  }, [current])

  const save = useMutation({
    mutationFn: () => api.post('/user-consents', { marketing: newsletter, source: 'mobile_preferences' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consents-current'] })
      Alert.alert(t('consents.saved'))
    },
    onError: () => Alert.alert(t('common.error'), t('consents.errorSave')),
  })

  return (
    <Screen title={t('consents.title')} back>
      <Text style={s.intro}>{t('consents.subtitleInfo')}</Text>

      {isAuthenticated && isLoading ? <SkeletonRows count={2} /> : (
        <>
          <Card>
            <View style={s.row}>
              <View style={s.textCol}>
                <Text style={s.title}>{t('consents.necessary.title')}</Text>
                <Text style={s.desc}>{t('consents.necessary.desc')}</Text>
              </View>
              <Badge label={t('consents.alwaysOn')} tone="neutral" />
            </View>
          </Card>

          <Card>
            <View style={s.row}>
              <View style={s.textCol}>
                <Text style={s.title}>{t('consents.newsletter.title')}</Text>
                <Text style={s.desc}>{t('consents.newsletter.desc')}</Text>
              </View>
              {isAuthenticated ? (
                <Switch value={newsletter}
                  onValueChange={setNewsletter}
                  accessibilityLabel={t('consents.newsletter.title')}
                  trackColor={{ true: colors.brand, false: colors.border }} thumbColor={colors.surface} />
              ) : null}
            </View>
          </Card>

          <Text style={s.note}>{t('consents.noTracking')}</Text>

          {isAuthenticated ? (
            <>
              <Text style={s.note}>{t('consents.scopeNote')}</Text>
              <Button full label={t('consents.save')} loading={save.isPending}
                onPress={() => save.mutate()} />
              {!!current?.created_at && (
                <Text style={s.last}>
                  {t('consents.lastChanged')}: {new Date(current.created_at).toLocaleString(i18n.language)}
                </Text>
              )}
            </>
          ) : (
            <>
              <Text style={s.note}>{t('consents.loginForNewsletter')}</Text>
              <Button full label={t('auth.login')} onPress={() => router.push('/auth/login' as any)} />
            </>
          )}
        </>
      )}
    </Screen>
  )
}

const s = StyleSheet.create({
  intro: { ...type.body, color: colors.textMuted, marginBottom: space.md },
  // Διακόπτης και σήμα κεντραρισμένα κάθετα με το μπλοκ κειμένου.
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  textCol: { flex: 1, minWidth: 0 },
  title: { ...type.body, color: colors.text, fontWeight: weight.bold },
  desc: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  note: { ...type.caption, color: colors.textLight, marginVertical: space.md, textAlign: 'center' },
  last: { ...type.caption, color: colors.textLight, textAlign: 'center', marginTop: space.md },
})
