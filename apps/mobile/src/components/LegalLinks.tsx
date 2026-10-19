import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { Check } from 'lucide-react-native'
import { colors, space, radius, weight } from '@/theme'

/**
 * Αποδοχή όρων στην εγγραφή — ίδια διατύπωση με το web.
 *
 * Το κουτάκι είναι υποχρεωτικό και ΔΕΝ είναι προεπιλεγμένο: ο GDPR (άρθρο 7
 * και αιτ. σκ. 32) θέλει ενεργή πράξη αποδοχής. Ο server απορρίπτει εγγραφή
 * χωρίς `terms_accepted: true` και καταγράφει την αποδοχή στο ιστορικό
 * συγκαταθέσεων (user_consents, source = registration).
 */

const TEXT = { fontSize: 13, lineHeight: 20 } as const
const BOX = 20

function useLegalLinks() {
  const { t } = useTranslation()
  const router = useRouter()
  const Terms = (
    <Text style={s.link} onPress={() => router.push('/terms' as any)}>{t('legalConsent.terms')}</Text>
  )
  const Privacy = (
    <Text style={s.link} onPress={() => router.push('/privacy-policy' as any)}>{t('legalConsent.privacy')}</Text>
  )
  return { t, Terms, Privacy }
}

export function TermsCheckbox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  const { t, Terms, Privacy } = useLegalLinks()
  return (
    <TouchableOpacity activeOpacity={0.7} style={s.row} onPress={onToggle}
      accessibilityRole="checkbox" accessibilityState={{ checked }}>
      <View style={[s.box, checked && s.boxOn]}>
        {checked && <Check size={14} color={colors.textOnDark} strokeWidth={3} />}
      </View>
      <Text style={s.text}>
        {t('legalConsent.accept')} {Terms} {t('legalConsent.and')} {Privacy}.
      </Text>
    </TouchableOpacity>
  )
}

/** Σημείωση κάτω από τα κουμπιά Google / Facebook. */
export function SocialTermsNotice() {
  const { t, Terms, Privacy } = useLegalLinks()
  return (
    <Text style={s.notice}>
      {t('legalConsent.social')} {Terms} {t('legalConsent.and')} {Privacy}.
    </Text>
  )
}

const s = StyleSheet.create({
  // Κουτί ίσο με το ύψος γραμμής: στοιχίζεται ακριβώς με την πρώτη γραμμή
  // του κειμένου, όσες γραμμές κι αν πιάσει.
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  box: {
    width: BOX, height: BOX, borderRadius: radius.sm / 2 + 2,
    borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  text: { ...TEXT, flex: 1, color: colors.textMuted },
  link: { color: colors.brand, fontWeight: weight.semibold },
  notice: { ...TEXT, fontSize: 12, lineHeight: 18, color: colors.textLight, textAlign: 'center' },
})
