import { Alert } from 'react-native'
import { api } from './api'

type T = (key: string, opts?: Record<string, unknown>) => string

/** Ενεργή συνεδρία που μπορεί να ζητηθεί ακύρωση (ο server κρίνει τελικά). */
export const canAskTelehealthCancel = (c: any) =>
  (c?.status === 'pending_payment' || c?.status === 'scheduled') && c?.payment_status !== 'refunding'

/**
 * Επιβεβαίωση ακύρωσης συνεδρίας με τους όρους του server
 * (GET /telehealth/:id/cancel-preview, ίδια πολιτική με τις κρατήσεις) —
 * όπως η ακύρωση κράτησης στο app/bookings.tsx και στο web.
 */
export async function confirmTelehealthCancel(id: string, asProvider: boolean, t: T, onConfirm: () => void, onNotAllowed?: () => void) {
  let msg = t('teleCancel.confirm')
  try {
    const c = (await api.get(`/telehealth/${id}/cancel-preview`)).data?.data
    if (c && !c.allowed) {
      Alert.alert(t('bookingPolicy.cancel'), c.reason === 'already_started' ? t('teleCancel.started')
        : c.reason === 'in_progress' ? t('teleCancel.inProgress')
        : c.reason === 'contact_support' ? t('teleCancel.contactSupport')
        : t('teleCancel.notAllowed'))
      // Η λίστα είναι παλιά (π.χ. ακύρωση σε εξέλιξη): ανανεώνεται.
      onNotAllowed?.()
      return
    }
    if (c) msg = !c.paid ? t('teleCancel.unpaid')
      : asProvider ? t('teleCancel.providerPaid', { amount: Number(c.refund).toFixed(2) })
      : c.late ? t('teleCancel.late', { refund: Number(c.refund).toFixed(2), fee: Number(c.fee).toFixed(2) })
      : t('teleCancel.free', { refund: Number(c.refund).toFixed(2) })
  } catch { /* χωρίς όρους, η γενική ερώτηση */ }
  Alert.alert(t('bookingPolicy.cancel'), msg, [
    { text: t('common.no'), style: 'cancel' },
    { text: t('bookingPolicy.cancel'), style: 'destructive', onPress: onConfirm },
  ])
}

/** POST /telehealth/:id/cancel → { data, refund, fee } */
export const postTelehealthCancel = (id: string) =>
  api.post(`/telehealth/${id}/cancel`, {}).then(r => r.data)
