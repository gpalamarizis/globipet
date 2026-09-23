import { api } from './api'

/**
 * Ειδοποιήσεις push στον browser.
 *
 * ΔΙΑΦΟΡΕΤΙΚΟΣ ΜΗΧΑΝΙΣΜΟΣ ΑΠΟ ΤΟ MOBILE
 *   Το κινητό περνάει από την υπηρεσία του Expo. Ο browser χρησιμοποιεί το
 *   πρότυπο Web Push: service worker, κλειδιά VAPID, και μια συνδρομή τριών
 *   πεδίων. Το backend δέχεται και τα δύο στο ίδιο endpoint.
 *
 * ΤΙ ΔΕΝ ΔΟΥΛΕΥΕΙ ΠΟΥΘΕΝΑ
 *   Στο iOS οι ειδοποιήσεις υπάρχουν ΜΟΝΟ αν ο χρήστης έχει προσθέσει τον
 *   ιστότοπο στην αρχική οθόνη. Σε Safari desktop και σε κάθε browser χωρίς
 *   PushManager, το isPushSupported επιστρέφει false και το κουμπί δεν
 *   εμφανίζεται καθόλου — καλύτερα να λείπει παρά να απογοητεύει.
 */

/** Υποστηρίζει αυτός ο browser ειδοποιήσεις push; */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** 'granted' | 'denied' | 'default' — ή null αν δεν υποστηρίζεται. */
export function getPermissionState(): NotificationPermission | null {
  return isPushSupported() ? Notification.permission : null
}

/**
 * Δείχνει αν τρέχουμε ως εγκατεστημένη εφαρμογή. Στο iOS αυτό είναι
 * προϋπόθεση: χωρίς εγκατάσταση στην αρχική οθόνη, καμία ειδοποίηση.
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  )
}

/**
 * Το δημόσιο κλειδί VAPID φτάνει ως κείμενο base64url και ο PushManager το
 * θέλει ως bytes. Η μετατροπή δεν είναι διακοσμητική: με λάθος bytes η
 * εγγραφή αποτυγχάνει με σφάλμα που δεν εξηγεί τίποτα.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

/** Καταχωρεί τον service worker. Επιστρέφει null αν αποτύχει. */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    // Περιμένουμε να είναι ΕΝΕΡΓΟΣ. Εγγραφή σε service worker που ακόμα
    // εγκαθίσταται αποτυγχάνει σιωπηλά.
    await navigator.serviceWorker.ready
    return registration
  } catch (err) {
    console.error('[push] αποτυχία καταχώρησης service worker', err)
    return null
  }
}

export interface SubscribeResult {
  ok: boolean
  /** Γιατί απέτυχε — για να δείξει η οθόνη το σωστό μήνυμα. */
  reason?: 'unsupported' | 'denied' | 'ios-needs-install' | 'error'
}

/**
 * Ζητά άδεια και δηλώνει τον browser στο backend.
 *
 * ΚΑΛΕΙΤΑΙ ΜΟΝΟ ΑΠΟ ΠΑΤΗΜΑ ΚΟΥΜΠΙΟΥ. Αν ζητηθεί άδεια αυτόματα με το που
 * φορτώνει η σελίδα, ο Chrome μπλοκάρει μόνιμα τον ιστότοπο και δεν
 * ξαναρωτάει ποτέ κανέναν χρήστη.
 */
export async function subscribeToPush(): Promise<SubscribeResult> {
  if (!isPushSupported()) {
    // Σε iPhone ο λόγος είναι συνήθως ότι δεν έχει εγκατασταθεί στην αρχική
    // οθόνη — και αυτό το μήνυμα είναι χρήσιμο, σε αντίθεση με ένα σκέτο
    // «δεν υποστηρίζεται».
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    return { ok: false, reason: isIOS && !isStandalone() ? 'ios-needs-install' : 'unsupported' }
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return { ok: false, reason: 'denied' }

    const registration = await registerServiceWorker()
    if (!registration) return { ok: false, reason: 'error' }

    const { data } = await api.get('/notifications/push/public-key')
    const publicKey: string = data.public_key

    // Αν υπάρχει ήδη συνδρομή, την ξαναχρησιμοποιούμε αντί να φτιάξουμε
    // δεύτερη — αλλιώς ο πίνακας γεμίζει διπλοεγγραφές του ίδιου browser.
    const existing = await registration.pushManager.getSubscription()
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      }))

    const json = subscription.toJSON()
    await api.post('/notifications/push/register', {
      platform: 'web',
      endpoint: json.endpoint,
      keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
      device_name: navigator.userAgent.slice(0, 120),
    })

    return { ok: true }
  } catch (err) {
    console.error('[push] αποτυχία εγγραφής', err)
    return { ok: false, reason: 'error' }
  }
}

/**
 * Διαγράφει τη συνδρομή — και από τον browser και από το backend.
 *
 * Η σειρά έχει σημασία: πρώτα ενημερώνουμε το backend όσο ο χρήστης είναι
 * ακόμα συνδεδεμένος, μετά ακυρώνουμε τοπικά. Αντίστροφα, θα χάναμε το
 * endpoint και η εγγραφή θα έμενε ορφανή στη βάση για πάντα.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false
  try {
    const registration = await navigator.serviceWorker.getRegistration('/')
    const subscription = await registration?.pushManager.getSubscription()
    if (!subscription) return true

    await api.delete('/notifications/push/register', {
      data: { endpoint: subscription.endpoint },
    })
    await subscription.unsubscribe()
    return true
  } catch (err) {
    console.error('[push] αποτυχία διαγραφής', err)
    return false
  }
}
