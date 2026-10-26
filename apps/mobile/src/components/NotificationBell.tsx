import { useCallback, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { colors, radius, weight, icon, touch } from '@/theme'

/**
 * Ε17 — Καμπανάκι ειδοποιήσεων στην κεφαλίδα των καρτελών.
 *
 * Ίδιο query (κλειδί ['notifications','center'], ίδιο GET /notifications
 * με limit 50) με την οθόνη app/notifications.tsx: όταν εκεί σημειώνεται
 * κάτι ως αναγνωσμένο, το invalidate του ['notifications'] ενημερώνει και
 * το σήμα εδώ, χωρίς δεύτερο αίτημα.
 *
 * Ο server επιστρέφει { data, unread_count } (backend/src/routes/
 * notifications.ts, GET /). Ανανέωση κάθε 60″ ΜΟΝΟ όσο η οθόνη είναι σε
 * εστίαση (όχι αιτήματα από καρτέλες στο παρασκήνιο)· στην εστίαση νέο
 * αίτημα μόνο αν τα δεδομένα είναι παλιότερα από 30″. Κρυφό για επισκέπτες.
 *
 * Ίδιες διαστάσεις (touch.min, radius.md) με τα κουμπιά της κεφαλίδας
 * (καλάθι, προσθήκη κατοικιδίου), ώστε να στοιχίζονται ακριβώς.
 */
export default function NotificationBell() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  // Εστίαση της οθόνης που φιλοξενεί το καμπανάκι (useFocusEffect του
  // expo-router — ισοδύναμο του useIsFocused, χωρίς νέα εξάρτηση).
  const [focused, setFocused] = useState(false)

  const { data, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['notifications', 'center'],
    queryFn: () => api.get('/notifications', { params: { limit: 50 } }).then(r => r.data),
    enabled: isAuthenticated,
    refetchInterval: focused ? 60_000 : false,
    staleTime: 30_000,
  })
  // Σε ref: η ηλικία των δεδομένων διαβάζεται στην εστίαση χωρίς να
  // ξανατρέχει το effect σε κάθε ανανέωση.
  const updatedAt = useRef(0)
  updatedAt.current = dataUpdatedAt

  useFocusEffect(useCallback(() => {
    setFocused(true)
    // Χωρίς δεδομένα ακόμη (0): το πρώτο αίτημα το κάνει ήδη το useQuery.
    if (isAuthenticated && updatedAt.current > 0 && Date.now() - updatedAt.current > 30_000) refetch()
    return () => setFocused(false)
  }, [isAuthenticated, refetch]))

  if (!isAuthenticated) return null

  const items: any[] = data?.data ?? []
  const unread: number = Number(data?.unread_count ?? items.filter(n => !n.is_read).length) || 0
  const label = unread > 9 ? '9+' : String(unread)

  return (
    <TouchableOpacity style={s.btn} activeOpacity={0.8} hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? t('bell.unread', { count: unread }) : t('notifCenter.title')}
      onPress={() => router.push('/notifications' as any)}>
      <Bell size={icon.md} color={colors.textOnDark} />
      {unread > 0 && (
        <View style={s.badge}>
          <Text style={s.badgeText} maxFontSizeMultiplier={1.2}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  btn: {
    width: touch.min, height: touch.min, borderRadius: radius.md,
    backgroundColor: colors.navySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: 4, right: 4,
    minWidth: 18, height: 18, paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.danger,
    borderWidth: 1.5, borderColor: colors.navy,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 12, color: '#fff', fontWeight: weight.bold, includeFontPadding: false },
})
