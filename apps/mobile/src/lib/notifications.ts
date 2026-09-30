import { Platform } from 'react-native'
import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { api } from './api'

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
    name: 'Ειδοποιήσεις GlobiPet',
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

/** Δηλώνει τη συσκευή στο backend. Καλείται μετά από κάθε σύνδεση. */
export async function registerPushToken(): Promise<void> {
  try {
    const token = await getPushToken()
    if (!token) return
    await api.post('/notifications/register', { token, platform: Platform.OS })
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
    await api.delete('/notifications/register', { data: { token: cachedToken } })
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
