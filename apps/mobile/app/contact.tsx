import { useState } from 'react'
import { View, Text, StyleSheet, Alert, Linking } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { Mail, MapPin, Send } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Screen, Card, Button, Input } from '@/components/ui'
import { colors, space, radius, type, weight, icon } from '@/theme'

/**
 * Επικοινωνία — ίδια φόρμα με το globipet.com/contact (POST /contact,
 * αποθηκεύεται στη βάση ΚΑΙ στέλνεται με email).
 *
 * Όνομα και email προσυμπληρώνονται για συνδεδεμένο χρήστη.
 * Το τηλέφωνο του web (+30 210 000 0000) είναι placeholder και δεν
 * μεταφέρθηκε — μπαίνει μόλις υπάρξει πραγματικός αριθμός.
 */
export default function ContactScreen() {
  const { t } = useTranslation()
  const user = useAuthStore(st => st.user) as any
  const [name, setName] = useState(user?.full_name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  const send = useMutation({
    mutationFn: () => api.post('/contact', { name, email, subject, message, website: '' }),
    onSuccess: () => {
      Alert.alert(t('contact.success'))
      setSubject(''); setMessage('')
    },
    onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('contact.error')),
  })

  const canSend = name.trim() && email.trim() && message.trim() && !send.isPending

  return (
    <Screen title={t('contact.title')} back>
      <Text style={s.intro}>{t('contact.subtitle')}</Text>

      <View style={s.infoRow}>
        <Card style={s.infoCard} onPress={() => Linking.openURL('mailto:info@globipet.com')}>
          <View style={[s.infoIcon, { backgroundColor: colors.brandLight }]}>
            <Mail size={icon.md} color={colors.brand} />
          </View>
          <Text style={s.infoTitle}>{t('contact.email')}</Text>
          <Text style={s.infoValue} numberOfLines={1}>info@globipet.com</Text>
        </Card>
        <Card style={s.infoCard}>
          <View style={[s.infoIcon, { backgroundColor: colors.warningBg }]}>
            <MapPin size={icon.md} color={colors.warning} />
          </View>
          <Text style={s.infoTitle}>{t('contact.address')}</Text>
          <Text style={s.infoValue} numberOfLines={1}>{t('contact.addressValue')}</Text>
        </Card>
      </View>

      <Card>
        <Text style={s.formTitle}>{t('contact.formTitle')}</Text>
        <Input label={t('contact.name')} value={name} onChangeText={setName}
          placeholder={t('contact.namePlaceholder')} autoCapitalize="words" />
        <Input label={t('contact.emailLabel')} value={email} onChangeText={setEmail}
          placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
        <Input label={t('contact.subject')} value={subject} onChangeText={setSubject}
          placeholder={t('contact.subjectPlaceholder')} />
        <Input label={t('contact.message')} value={message} onChangeText={setMessage}
          placeholder={t('contact.messagePlaceholder')} multiline />
        <Button full loading={send.isPending} disabled={!canSend}
          icon={<Send size={16} color={colors.textOnDark} />}
          label={send.isPending ? t('contact.sending') : t('contact.send')}
          onPress={() => send.mutate()} />
      </Card>
    </Screen>
  )
}

const s = StyleSheet.create({
  intro: { ...type.body, color: colors.textMuted, marginBottom: space.md },
  // Δύο κάρτες ίσου πλάτους και ύψους.
  infoRow: { flexDirection: 'row', gap: space.md, alignItems: 'stretch' },
  infoCard: { flex: 1 },
  infoIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', marginBottom: space.sm,
  },
  infoTitle: { ...type.body, color: colors.text, fontWeight: weight.bold },
  infoValue: { ...type.caption, color: colors.brand, marginTop: 2 },
  formTitle: { ...type.emphasis, color: colors.text, fontWeight: weight.bold, marginBottom: space.md },
})
