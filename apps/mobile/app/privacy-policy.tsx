import LegalDocument from '@/components/LegalDocument'

/**
 * Πολιτική Απορρήτου — ίδιο κείμενο με το globipet.com/privacy.
 * (Η οθόνη app/privacy.tsx είναι κάτι άλλο: εξαγωγή και διαγραφή δεδομένων.)
 */
export default function PrivacyPolicyScreen() {
  return <LegalDocument kind="privacy" />
}
