import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Switch, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SlidersHorizontal } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, Card, Button, Badge, EmptyState, SkeletonRows } from '@/components/ui'
import { colors, space, type, weight } from '@/theme'

/**
 * Συγκαταθέσεις — αντίστοιχο της σελίδας /cookies του web.
 *
 * Ίδιες τέσσερις κατηγορίες, ίδιο endpoint (/user-consents). Κάθε αλλαγή
 * γράφεται ως ΝΕΑ εγγραφή — το ιστορικό δεν αλλοιώνεται, ώστε να φαίνεται
 * πότε δόθηκε και πότε ανακλήθηκε κάθε συγκατάθεση (GDPR άρθρο 7§3: η
 * ανάκληση πρέπει να είναι τόσο εύκολη όσο η παροχή).
 *
 * Δεν στέλνουμε terms_accepted / privacy_accepted: ο server τα κρατά από την
 * προηγούμενη εγγραφή, ώστε μια αλλαγή προτιμήσεων να μη «σβήνει» την
 * αποδοχή όρων της εγγραφής.
 */
type Key = 'analytics' | 'marketing' | 'functional'
const KEYS: Key[] = ['analytics', 'marketing', 'functional']

export default function ConsentsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const isAuthenticated = useAuthStore(st => st.isAuthenticated)
  const [prefs, setPrefs] = useState<Record<Key, boolean>>({ analytics: false, marketing: false, functional: false })

  const { data: current, isLoading } = useQuery({
    queryKey: ['consents-current'],
    queryFn: () => api.get('/user-consents/current').then(r => r.data?.data ?? null),
    enabled: isAuthenticated,
  })

  useEffect(() => {
    if (current) setPrefs({
      analytics: !!current.analytics, marketing: !!current.marketing, functional: !!current.functional,
    })
  }, [current])

  const save = useMutation({
    mutationFn: () => api.post('/user-consents', { ...prefs, source: 'mobile_preferences' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consents-current'] })
      Alert.alert(t('consents.saved'))
    },
    onError: () => Alert.alert(t('common.error'), t('consents.errorSave')),
  })

  if (!isAuthenticated) return (
    <Screen title={t('consents.title')} back>
      <EmptyState icon={SlidersHorizontal} title={t('consents.loginPrompt')}
        action={<Button label={t('auth.login')} onPress={() => router.push('/auth/login' as any)} />} />
    </Screen>
  )

  return (
    <Screen title={t('consents.title')} back>
      <Text style={s.intro}>{t('consents.subtitle')}</Text>

      {isLoading ? <SkeletonRows count={4} /> : (
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

          {KEYS.map(k => (
            <Card key={k}>
              <View style={s.row}>
                <View style={s.textCol}>
                  <Text style={s.title}>{t(`consents.${k}.title`)}</Text>
                  <Text style={s.desc}>{t(`consents.${k}.desc`)}</Text>
                </View>
                <Switch value={prefs[k]}
                  onValueChange={v => setPrefs(p => ({ ...p, [k]: v }))}
                  trackColor={{ true: colors.brand, false: colors.border }} thumbColor={colors.surface} />
              </View>
            </Card>
          ))}

          <Text style={s.note}>{t('consents.scopeNote')}</Text>

          <Button full label={t('consents.save')} loading={save.isPending}
            onPress={() => save.mutate()} />

          {!!current?.created_at && (
            <Text style={s.last}>
              {t('consents.lastChanged')}: {new Date(current.created_at).toLocaleString()}
            </Text>
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
