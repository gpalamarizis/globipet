import { useState } from 'react'
import { View, Text, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Clock, CheckCircle2, XCircle } from 'lucide-react-native'
import { api } from '../src/lib/api'
import { useAuthStore } from '../src/store/auth'
import { Screen, Card, Button, Badge, EmptyState, Input, SectionHeader } from '@/components/ui'
import { colors, space, type, weight, icon } from '@/theme'

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
  pending:  { label: 'Σε εξέταση', tone: 'warning' as const, Icon: Clock,
              text: 'Η αίτησή σου εξετάζεται. Θα ενημερωθείς με ειδοποίηση.' },
  approved: { label: 'Εγκρίθηκε',  tone: 'success' as const, Icon: CheckCircle2,
              text: 'Οι υπηρεσίες σου εμφανίζονται με σήμα επαλήθευσης.' },
  rejected: { label: 'Απορρίφθηκε', tone: 'danger' as const, Icon: XCircle,
              text: 'Μπορείς να υποβάλεις νέα αίτηση αφού διορθώσεις τα παρακάτω.' },
}

export default function VerificationScreen() {
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

  const { data: request, isLoading } = useQuery({
    queryKey: ['my-verification'],
    queryFn: () => api.get('/provider/verification-request').then(r => r.data?.data),
    enabled: isAuthenticated,
  })

  const submit = useMutation({
    mutationFn: () => api.post('/provider/verification-request', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-verification'] })
      Alert.alert('Η αίτηση υποβλήθηκε',
        'Θα την εξετάσουμε και θα σε ενημερώσουμε με ειδοποίηση.',
        [{ text: 'Εντάξει', onPress: () => router.back() }])
    },
    onError: (e: any) => Alert.alert('Σφάλμα', e?.message || 'Κάτι πήγε στραβά'),
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  if (!isAuthenticated) return (
    <Screen title="Επαλήθευση">
      <EmptyState
        icon={BadgeCheck}
        title="Συνδέσου για να συνεχίσεις"
        action={<Button label="Σύνδεση" onPress={() => router.push('/auth/login' as any)} />}
      />
    </Screen>
  )

  // Εκκρεμής ή εγκεκριμένη αίτηση: δεν έχει νόημα να ξαναδεί τη φόρμα.
  if (!isLoading && request && request.status !== 'rejected') {
    const st = (STATUS as any)[request.status] ?? STATUS.pending
    return (
      <Screen title="Επαλήθευση">
        <Card>
          <View style={s.statusHead}>
            <st.Icon size={icon.xl} color={
              request.status === 'approved' ? colors.success : colors.warning} />
            <Badge label={st.label} tone={st.tone} />
          </View>
          <Text style={s.statusText}>{st.text}</Text>
          <Text style={s.statusDate}>
            Υποβλήθηκε {new Date(request.created_at).toLocaleDateString('el-GR', {
              day: '2-digit', month: 'long', year: 'numeric',
            })}
          </Text>
        </Card>
      </Screen>
    )
  }

  return (
    <Screen title="Επαλήθευση παρόχου"
      subtitle="Το σήμα επαλήθευσης αυξάνει την εμπιστοσύνη">

      {request?.status === 'rejected' && (
        <Card style={{ marginBottom: space.lg, borderColor: colors.danger }}>
          <View style={s.statusHead}>
            <XCircle size={icon.lg} color={colors.danger} />
            <Badge label="Προηγούμενη αίτηση απορρίφθηκε" tone="danger" />
          </View>
          {/* Ο λόγος που έδωσε ο διαχειριστής — χωρίς αυτόν ο πάροχος
              ξαναϋποβάλλει το ίδιο λάθος. */}
          {!!request.review_notes && (
            <Text style={s.rejectNote}>{request.review_notes}</Text>
          )}
        </Card>
      )}

      <SectionHeader title="Στοιχεία επικοινωνίας" />
      <Input label="Ονοματεπώνυμο" value={form.full_name}
        onChangeText={v => set('full_name', v)} />
      <Input label="Τηλέφωνο" value={form.phone}
        onChangeText={v => set('phone', v)} keyboardType="phone-pad" />
      <Input label="Πόλη" value={form.city}
        onChangeText={v => set('city', v)} />

      <SectionHeader title="Επιχείρηση" />
      <Input label="Επωνυμία" value={form.business_name}
        onChangeText={v => set('business_name', v)}
        placeholder="Προαιρετικό" />
      <Input label="ΑΦΜ" value={form.tax_number}
        onChangeText={v => set('tax_number', v)}
        keyboardType="number-pad"
        hint="Αποθηκεύεται κρυπτογραφημένο και το βλέπει μόνο ο έλεγχος." />
      <Input label="Ιστοσελίδα" value={form.website}
        onChangeText={v => set('website', v)}
        placeholder="https://" autoCapitalize="none" />

      <SectionHeader title="Εμπειρία" />
      <Input label="Χρόνια εμπειρίας" value={form.years_experience}
        onChangeText={v => set('years_experience', v.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad" />
      <Input label="Ειδικότητες" value={form.specializations}
        onChangeText={v => set('specializations', v)}
        hint="Χωρισμένες με κόμμα, π.χ. Χειρουργική, Δερματολογία" />
      <Input label="Λίγα λόγια" value={form.bio}
        onChangeText={v => set('bio', v)} multiline
        placeholder="Τι προσφέρεις και σε ποιους" />

      <Button
        label={submit.isPending ? 'Υποβολή…' : 'Υποβολή αίτησης'}
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
