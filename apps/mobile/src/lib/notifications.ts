import { Platform } from 'react-native'
import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'
import { api } from './api'
import i18n from 'i18next'

/**
 * Ειδοποιήσεις push.
 *
 * ΟΛΗ Η ΛΟΓΙΚΗ ΕΙΝΑΙ ΕΔΩ
 *   Οι οθόνες δεν ξέρουν τίποτα για άδειες, κανάλια ή τοκεν. Καλούν δύο
 *   συναρτήσεις — registerPushToken στη σύνδεση, unregisterPushToken στην
 *   αποσύνδεση — και τελειώνουν.
 *
 * ΤΙΠΟΤΑ ΔΕΝ ΠΕΤΑΕΙ ΣΦΑΛΜΑ ΠΡΟΣ ΤΑ ΕΞΩ
 *   Οι ειδοποιήσεις είναι βοηθητικές, όχι κρίσιμες. Αν ο χρήστης αρνηθεί
 *   την άδεια, αν δεν υπάρχει δίκτυο, αν λείπουν τα credentials του
 *   Firebase — η εφαρμογή συνεχίζει κανονικά. Καμία από αυτές τις
 *   συναρτήσεις δεν πρέπει ποτέ να εμποδίσει κάποιον να μπει.
 */

// Τι γίνεται όταν φτάνει ειδοποίηση ενώ η εφαρμογή είναι ΑΝΟΙΧΤΗ.
// Χωρίς αυτό, το μήνυμα φτάνει αλλά δεν εμφανίζεται πουθενά.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

/**
 * Το τοκεν μένει στη μνήμη ώστε η αποσύνδεση να μη χρειάζεται να ζητήσει
 * ξανά άδεια — θα ήταν παράλογο να εμφανίζεται διάλογος άδειας τη στιγμή
 * που κάποιος βγαίνει από τον λογαριασμό του.
 */
let cachedToken: string | null = null

/**
 * Στο Android κάθε ειδοποίηση πρέπει να ανήκει σε κανάλι, αλλιώς δεν
 * εμφανίζεται καθόλου από το Android 8 και μετά. Το κανάλι ορίζει ήχο,
 * δόνηση και προτεραιότητα, και ο χρήστης μπορεί να το ρυθμίσει μόνος του
 * από τις ρυθμίσεις του τηλεφώνου.
 */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync('default', {
    // Το όνομα του καναλιού φαίνεται στις ρυθμίσεις του Android· στη γλώσσα
    // της εφαρμογής (ενημερώνεται σε κάθε κλήση, π.χ. μετά από αλλαγή γλώσσας).
    // Πριν φορτώσει η γλώσσα (πολύ νωρίς στην εκκίνηση): απλώς «GlobiPet».
    name: i18n.isInitialized ? i18n.t('notifChannel.name') : 'GlobiPet',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#E65100',
  })
}

/**
 * Ζητά άδεια αν χρειάζεται και επιστρέφει το Expo push token.
 * Επιστρέφει null σε προσομοιωτή, σε άρνηση άδειας, ή αν λείπει το
 * projectId — και στις τρεις περιπτώσεις χωρίς σφάλμα.
 */
export async function getPushToken(): Promise<string | null> {
  if (cachedToken) return cachedToken
  // Οι προσομοιωτές δεν έχουν υπηρεσία push. Χωρίς αυτόν τον έλεγχο, η
  // κλήση πετάει σφάλμα σε κάθε δοκιμή σε emulator.
  if (!Device.isDevice) return null

  await ensureAndroidChannel()

  const current = await Notifications.getPermissionsAsync()
  let granted = current.granted
  if (!granted && current.canAskAgain) {
    const asked = await Notifications.requestPermissionsAsync()
    granted = asked.granted
  }
  if (!granted) return null

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId
  if (!projectId) return null

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId })
  cachedToken = data
  return data
}

/**
 * Δηλώνει τη συσκευή στο backend. Καλείται μετά από κάθε σύνδεση.
 *
 * Η ΔΙΑΔΡΟΜΗ ΗΤΑΝ ΛΑΘΟΣ
 *   Έστελνε σε /notifications/register· το backend ακούει στο
 *   /notifications/push/register. Το 404 καταπινόταν από το catch
 *   παρακάτω, οπότε το τοκεν δεν έφτανε ΠΟΤΕ και καμία ειδοποίηση δεν
 *   παραδιδόταν σε κινητό — χωρίς κανένα ορατό σημάδι.
 *
 *   Το device_name εμφανίζεται στη λίστα «πού λαμβάνω ειδοποιήσεις»:
 *   χωρίς αυτό ο χρήστης βλέπει ανώνυμες εγγραφές και δεν ξέρει ποια
 *   συσκευή να αποσυνδέσει.
 */
export async function registerPushToken(): Promise<void> {
  try {
    // Ο χρήστης τις απενεργοποίησε από την εφαρμογή: σεβόμαστε την επιλογή.
    if (await isPushOptedOut()) return
    const token = await getPushToken()
    if (!token) return
    await api.post('/notifications/push/register', {
      token,
      platform: Platform.OS,
      device_name: Device.deviceName || Device.modelName || undefined,
    })
  } catch {
    // σιωπηλά: δες το σχόλιο στην κορυφή
  }
}

/**
 * Διαγράφει τη συσκευή από το backend. ΠΡΕΠΕΙ να τρέξει ΠΡΙΝ σβηστεί το
 * τοκεν σύνδεσης, αλλιώς το αίτημα φεύγει χωρίς ταυτοποίηση.
 *
 * Χωρίς αυτό, ο επόμενος άνθρωπος που συνδέεται στην ίδια συσκευή παίρνει
 * τις ειδοποιήσεις του προηγούμενου.
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    if (!cachedToken) return
    await api.delete('/notifications/push/register', { data: { token: cachedToken } })
  } catch {
    // σιωπηλά
  }
}

/**
 * Από ποια διαδρομή θα ανοίξει η εφαρμογή όταν ο χρήστης πατήσει την
 * ειδοποίηση. Το backend στέλνει π.χ. { "url": "/bookings" }.
 *
 * ΑΣΦΑΛΕΙΑ: δεχόμαστε ΜΟΝΟ εσωτερικές διαδρομές που ξεκινούν με «/». Αν
 * δεχόμασταν οτιδήποτε, μια ειδοποίηση θα μπορούσε να ανοίξει εξωτερικό
 * σύνδεσμο μέσα στην εφαρμογή.
 */
export function routeFromNotification(
  response: Notifications.NotificationResponse | null,
): string | null {
  const data = response?.notification?.request?.content?.data as
    | Record<string, unknown>
    | undefined
  const target = data?.url ?? data?.route
  if (typeof target !== 'string') return null
  if (!target.startsWith('/') || target.startsWith('//')) return null
  // Αποτυχία χρέωσης συνδρομής: ο server στέλνει link '/profile' (σελίδα του
  // web). Στο κινητό οι συνδρομές έχουν δική τους οθόνη. Αναγνωρίζεται μόνο
  // από ρητό τύπο στα δεδομένα — το κείμενο είναι μεταφρασμένο, δεν ελέγχεται.
  if (data?.type === 'subscription_payment_failed') return '/subscriptions'
  // Οι σύνδεσμοι παρόχου του backend είναι του web (/provider, /provider/telehealth/:id).
  // Στο κινητό ο χώρος παρόχου είναι η ομάδα (provider): εκεί η Επισκόπηση
  // δείχνει τις σημερινές τηλεσυνεδρίες με κουμπί εισόδου στην κλήση.
  if (target === '/provider' || target.startsWith('/provider/')) return '/(provider)'
  return target
}

/**
 * Στέλνει τον χρήστη στη σωστή οθόνη όταν πατήσει ειδοποίηση.
 *
 * Καλύπτει ΔΥΟ διαφορετικές περιπτώσεις, και οι δύο χρειάζονται:
 *   − η εφαρμογή ήταν κλειστή και άνοιξε από την ειδοποίηση
 *     (getLastNotificationResponseAsync)
 *   − η εφαρμογή ήταν ήδη ανοιχτή ή στο παρασκήνιο
 *     (addNotificationResponseReceivedListener)
 *
 * Χωρίς το πρώτο, κάθε ειδοποίηση που ανοίγει την εφαρμογή από το μηδέν
 * καταλήγει στην Αρχική αντί για την κράτηση ή το μήνυμα που αφορούσε.
 */
export function usePushRouting(): void {
  const router = useRouter()

  useEffect(() => {
    let alive = true

    Notifications.getLastNotificationResponseAsync()
      .then(response => {
        if (!alive) return
        const path = routeFromNotification(response)
        if (path) router.push(path as never)
      })
      .catch(() => {})

    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const path = routeFromNotification(response)
      if (path) router.push(path as never)
    })

    return () => { alive = false; sub.remove() }
  }, [router])
}

// ═══════════════════════════════════════════════════════════════════════
//  Ρύθμιση από τον χρήστη — οθόνη «Ειδοποιήσεις» (αντίστοιχη της κάρτας web)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Ο χρήστης που απενεργοποίησε τις ειδοποιήσεις από την εφαρμογή ΔΕΝ πρέπει
 * να ξαναγραφτεί σιωπηλά στην επόμενη σύνδεση ή εκκίνηση. Η επιλογή του
 * κρατιέται στη συσκευή — είναι ρύθμιση ΑΥΤΗΣ της συσκευής, όπως και στο web.
 */
const OPT_OUT_KEY = 'globipet_push_optout'

export async function isPushOptedOut(): Promise<boolean> {
  try { return (await SecureStore.getItemAsync(OPT_OUT_KEY)) === '1' } catch { return false }
}

export type PushState = 'unsupported' | 'denied' | 'off' | 'on'

/** Κατάσταση χωρίς να εμφανιστεί ποτέ διάλογος άδειας. */
export async function getPushState(): Promise<PushState> {
  if (!Device.isDevice) return 'unsupported'
  try {
    const perm = await Notifications.getPermissionsAsync()
    if (!perm.granted && !perm.canAskAgain) return 'denied'
    if (!perm.granted || (await isPushOptedOut())) return 'off'
    return 'on'
  } catch {
    return 'unsupported'
  }
}

/** Ενεργοποίηση ή απενεργοποίηση για αυτή τη συσκευή. Επιστρέφει τη νέα κατάσταση. */
export async function setPushEnabled(on: boolean): Promise<PushState> {
  if (on) {
    try { await SecureStore.deleteItemAsync(OPT_OUT_KEY) } catch {}
    const token = await getPushToken().catch(() => null)
    if (!token) return getPushState()
    try {
      await api.post('/notifications/push/register', {
        token,
        platform: Platform.OS,
        device_name: Device.deviceName || Device.modelName || undefined,
      })
    } catch {
      return 'off'
    }
    return 'on'
  }
  // Για να σβηστεί η συσκευή στον server χρειάζεται το τοκεν· αν η άδεια
  // υπάρχει, το getPushToken το δίνει χωρίς διάλογο.
  const perm = await Notifications.getPermissionsAsync().catch(() => null)
  if (perm?.granted) await getPushToken().catch(() => null)
  await unregisterPushToken()
  try { await SecureStore.setItemAsync(OPT_OUT_KEY, '1') } catch {}
  return 'off'
}
