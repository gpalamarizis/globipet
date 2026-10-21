import { useState } from 'react'
import { View, Text, StyleSheet, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Clock, CheckCircle2, XCircle } from 'lucide-react-native'
import { api } from '../src/lib/api'
import { useAuthStore } from '../src/store/auth'
import { Screen, Card, Button, Badge, EmptyState, Input, SectionHeader } from '@/components/ui'
import { colors, space, type, weight, icon } from '@/theme'
import { ErrorState } from '@/components/ErrorState'

/**
 * Αίτηση επαλήθευσης παρόχου.
 *
 * ΤΙ ΔΙΟΡΘΩΘΗΚΕ
 *   Η φόρμα έστελνε POST /provider/verification-request. Τέτοιο endpoint
 *   δεν υπήρχε — κάθε πάροχος που συμπλήρωσε ΑΦΜ, ειδικότητες και
 *   βιογραφικό έβλεπε «Κάτι πήγε στραβά» και η αίτηση χανόταν. Καμία δεν
 *   έφτασε ποτέ. Το endpoint υπάρχει τώρα, με σελίδα ελέγχου στο admin.
 *
 *   Προστέθηκε και η κατάσταση της αίτησης: ο πάροχος έβλεπε τη φόρμα ξανά
 *   και ξανά χωρίς να ξέρει αν είχε ήδη υποβάλει.
 */

const STATUS = {
  pending:  { labelKey: 'ver.under_review', tone: 'warning' as const, Icon: Clock,
              textKey: 'ver.under_review_note' },
  approved: { labelKey: 'ver.approved',  tone: 'success' as const, Icon: CheckCircle2,
              textKey: 'ver.verified_services' },
  rejected: { labelKey: 'ver.rejected', tone: 'danger' as const, Icon: XCircle,
              textKey: 'ver.resubmit' },
}

export default function VerificationScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const qc = useQueryClient()
  const { user, isAuthenticated } = useAuthStore()
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    phone: (user as any)?.phone || '',
    city: (user as any)?.city || '',
    business_name: '',
    tax_number: '',
    years_experience: '',
    specializations: '',
    bio: '',
    website: '',
  })

  const { data: request, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['my-verification'],
    queryFn: () => api.get('/provider/verification-request').then(r => r.data?.data),
    enabled: isAuthenticated,
  })

  const submit = useMutation({
    mutationFn: () => api.post('/provider/verification-request', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-verification'] })
      Alert.alert(t('ver.submitted'),
        t('ver.submitted_note'),
        [{ text: t('common.ok'), onPress: () => router.back() }])
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.message || t('common.something_wrong')),
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  if (!isAuthenticated) return (
    <Screen title={t('ver.verification')}>
      <EmptyState
        icon={BadgeCheck}
        title={t('auth.login_to_continue')}
        action={<Button label={t('auth.sign_in')} onPress={() => router.push('/auth/login' as any)} />}
      />
    </Screen>
  )

  // Χωρίς την κατάσταση δεν ξέρουμε αν υπάρχει ήδη αίτηση — όχι φόρμα (όπως web).
  if (isError && !request) return (
    <Screen title={t('ver.verification')}>
      <ErrorState onRetry={() => refetch()} retrying={isFetching} />
    </Screen>
  )

  // Εκκρεμής ή εγκεκριμένη αίτηση: δεν έχει νόημα να ξαναδεί τη φόρμα.
  if (!isLoading && request && request.status !== 'rejected') {
    const st = (STATUS as any)[request.status] ?? STATUS.pending
    return (
      <Screen title={t('ver.verification')}>
        <Card>
          <View style={s.statusHead}>
            <st.Icon size={icon.xl} color={
              request.status === 'approved' ? colors.success : colors.warning} />
            <Badge label={t(st.labelKey)} tone={st.tone} />
          </View>
          <Text style={s.statusText}>{t(st.textKey)}</Text>
          <Text style={s.statusDate}>
            {/* Η μορφή ημερομηνίας ακολουθεί τη γλώσσα της εφαρμογής, όχι
                σταθερά τα ελληνικά: αλλιώς ο Άγγλος πάροχος βλέπει
                «15 Οκτωβρίου» μέσα σε αγγλικό κείμενο. */}
            {t('ver.submitted_on', {
              date: new Date(request.created_at).toLocaleDateString(i18n.language, {
                day: '2-digit', month: 'long', year: 'numeric',
              }),
            })}
          </Text>
        </Card>
      </Screen>
    )
  }

  return (
    <Screen title={t('ver.title')}
      subtitle={t('ver.badge_trust')}>

      {request?.status === 'rejected' && (
        <Card style={{ marginBottom: space.lg, borderColor: colors.danger }}>
          <View style={s.statusHead}>
            <XCircle size={icon.lg} color={colors.danger} />
            <Badge label={t('ver.rejected_before')} tone="danger" />
          </View>
          {/* Ο λόγος που έδωσε ο διαχειριστής — χωρίς αυτόν ο πάροχος
              ξαναϋποβάλλει το ίδιο λάθος. */}
          {!!request.review_notes && (
            <Text style={s.rejectNote}>{request.review_notes}</Text>
          )}
        </Card>
      )}

      <SectionHeader title={t('ver.contact')} />
      <Input label={t('auth.full_name')} value={form.full_name}
        onChangeText={v => set('full_name', v)} />
      <Input label={t('common.phone')} value={form.phone}
        onChangeText={v => set('phone', v)} keyboardType="phone-pad" />
      <Input label={t('common.city')} value={form.city}
        onChangeText={v => set('city', v)} />

      <SectionHeader title={t('ver.business')} />
      <Input label={t('ver.legal_name')} value={form.business_name}
        onChangeText={v => set('business_name', v)}
        placeholder={t('pets.optional')} />
      <Input label={t('ver.vat')} value={form.tax_number}
        onChangeText={v => set('tax_number', v)}
        keyboardType="number-pad"
        hint={t('ver.vat_note')} />
      <Input label={t('ver.website')} value={form.website}
        onChangeText={v => set('website', v)}
        placeholder="https://" autoCapitalize="none" />

      <SectionHeader title={t('ver.experience')} />
      <Input label={t('ver.years')} value={form.years_experience}
        onChangeText={v => set('years_experience', v.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad" />
      <Input label={t('ver.specialties')} value={form.specializations}
        onChangeText={v => set('specializations', v)}
        hint={t('ver.specialties_hint')} />
      <Input label={t('ver.about')} value={form.bio}
        onChangeText={v => set('bio', v)} multiline
        placeholder={t('ver.what_you_offer')} />

      <Button
        label={submit.isPending ? t('ver.submitting') : t('ver.submit')}
        full
        loading={submit.isPending}
        disabled={!form.full_name.trim()}
        onPress={() => submit.mutate()}
      />
    </Screen>
  )
}

const s = StyleSheet.create({
  statusHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.md },
  statusText: { ...type.body, color: colors.text, lineHeight: 22 },
  statusDate: { ...type.caption, color: colors.textLight, marginTop: space.sm },
  rejectNote: { ...type.body, color: colors.text, lineHeight: 22 },
})
