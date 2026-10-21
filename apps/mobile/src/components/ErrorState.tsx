import { useTranslation } from 'react-i18next'
import { AlertTriangle, SearchX } from 'lucide-react-native'
import { EmptyState, Button } from '@/components/ui'

/**
 * Σφάλμα φόρτωσης με «Δοκίμασε ξανά».
 *
 * ΓΙΑΤΙ
 *   Οθόνες έδειχναν σπινάρισμα για πάντα όταν αποτύγχανε το αίτημα, ή
 *   «δεν υπάρχουν / δεν βρέθηκε» σε σφάλμα δικτύου — ο χρήστης νόμιζε ότι
 *   τα δεδομένα του χάθηκαν. Ένα κοινό component ώστε όλες να λένε το ίδιο.
 */
export function ErrorState({
  onRetry, retrying = false, message,
}: { onRetry: () => void; retrying?: boolean; message?: string }) {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon={AlertTriangle}
      title={t('common.error')}
      message={message ?? t('common.problem_try_again')}
      action={<Button label={t('common.try_again')} loading={retrying} onPress={onRetry} />}
    />
  )
}

/** Το στοιχείο φόρτωσε κανονικά αλλά δεν υπάρχει (σβήστηκε, λάθος σύνδεσμος). */
export function NotFoundState({ title }: { title?: string }) {
  const { t } = useTranslation()
  return <EmptyState icon={SearchX} title={title ?? t('loadState.notFound')} />
}
