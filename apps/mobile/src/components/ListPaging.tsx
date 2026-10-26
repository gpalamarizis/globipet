import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui'
import { colors, space } from '@/theme'

/**
 * Κοινά κομμάτια για λίστες με σελιδοποίηση από τον server
 * ({ data, total, page, totalPages }).
 */

/** Τιμή που ακολουθεί την `value` με καθυστέρηση — ώστε η αναζήτηση να μη στέλνει αίτημα σε κάθε πλήκτρο. */
export function useDebounced<T>(value: T, ms = 350): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const h = setTimeout(() => setV(value), ms)
    return () => clearTimeout(h)
  }, [value, ms])
  return v
}

/** Επόμενη σελίδα από την απάντηση { page, totalPages }· undefined όταν τελείωσαν. */
export function nextPageOf(last: any): number | undefined {
  return last && Number(last.page) < Number(last.totalPages) ? Number(last.page) + 1 : undefined
}

/**
 * Όλες οι σελίδες σε μία λίστα, χωρίς διπλά κατά id: αν μπει νέα εγγραφή
 * ανάμεσα σε δύο σελίδες, το offset μετακινείται και η ίδια εγγραφή
 * ξαναέρχεται στην επόμενη (διπλό key).
 */
export function flattenPages(pages: any[] | undefined): any[] {
  const seen = new Set<string>()
  return (pages ?? []).flatMap((p: any) => p?.data ?? []).filter((x: any) => {
    if (x?.id == null) return true
    if (seen.has(x.id)) return false
    seen.add(x.id); return true
  })
}

/** «Περισσότερα» στο τέλος λίστας μέσα σε Screen (ScrollView, χωρίς onEndReached). */
export function LoadMore({ hasMore, loading, onPress }: { hasMore: boolean; loading: boolean; onPress: () => void }) {
  const { t } = useTranslation()
  if (loading) return <ActivityIndicator color={colors.brand} style={{ marginVertical: space.md }} />
  if (!hasMore) return null
  return (
    <View style={{ marginTop: space.sm }}>
      <Button label={t('paging.loadMore')} variant="secondary" onPress={onPress} full />
    </View>
  )
}
