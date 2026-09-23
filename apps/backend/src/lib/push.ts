import webpush from 'web-push'
import prisma from './prisma.js'

/**
 * Αποστολή ειδοποιήσεων push σε κινητά και browsers.
 *
 * ΔΥΟ ΤΕΧΝΟΛΟΓΙΕΣ, ΜΙΑ ΣΥΝΑΡΤΗΣΗ
 *   Το mobile περνάει από την υπηρεσία του Expo (ένα HTTPS αίτημα, χωρίς
 *   SDK της Google). Το web περνάει από το πρότυπο Web Push με κλειδιά
 *   VAPID. Ο υπόλοιπος κώδικας δεν χρειάζεται να ξέρει τη διαφορά: καλεί
 *   sendPushToUser και τελειώνει.
 *
 * ΤΙΠΟΤΑ ΔΕΝ ΠΕΤΑΕΙ ΣΦΑΛΜΑ
 *   Η ειδοποίηση είναι συνοδευτική μιας ενέργειας — μιας κράτησης, μιας
 *   παραγγελίας. Αν αποτύχει η αποστολή, η κράτηση ΔΕΝ πρέπει να αποτύχει
 *   μαζί της. Κάθε σφάλμα καταγράφεται και καταπίνεται.
 *
 * ΟΙ ΝΕΚΡΕΣ ΣΥΝΔΡΟΜΕΣ ΣΒΗΝΟΝΤΑΙ ΜΟΝΕΣ ΤΟΥΣ
 *   Όταν κάποιος απεγκαταστήσει την εφαρμογή ή καθαρίσει τον browser του, η
 *   υπηρεσία απαντά «η συσκευή δεν είναι εγγεγραμμένη». Χωρίς καθάρισμα, ο
 *   πίνακας γεμίζει νεκρές εγγραφές και κάθε αποστολή αργεί όλο και πιο πολύ.
 */

const EXPO_ENDPOINT = 'https://exp.host/--/api/v2/push/send'

/** Το Expo δέχεται το πολύ 100 μηνύματα ανά αίτημα. */
const EXPO_BATCH = 100

export interface PushPayload {
  title: string
  body: string
  /** Εσωτερική διαδρομή, π.χ. '/bookings'. Ανοίγει όταν πατηθεί η ειδοποίηση. */
  url?: string
  /** Ελεύθερα δεδομένα που φτάνουν στη συσκευή μαζί με το μήνυμα. */
  data?: Record<string, unknown>
}

let vapidReady: boolean | null = null

/**
 * Τα κλειδιά VAPID διαβάζονται μία φορά. Αν λείπουν, το web push
 * απενεργοποιείται σιωπηλά και το mobile συνεχίζει κανονικά — δεν θέλουμε
 * μια λειτουργία που λείπει να ρίχνει την άλλη.
 */
function ensureVapid(): boolean {
  if (vapidReady !== null) return vapidReady
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:info@globipet.com'
  if (!publicKey || !privateKey) {
    console.warn('[push] λείπουν τα κλειδιά VAPID — οι ειδοποιήσεις web είναι ανενεργές')
    vapidReady = false
    return false
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
  vapidReady = true
  return true
}

/** Σβήνει συνδρομές που η υπηρεσία δήλωσε ως άκυρες. */
async function dropSubscriptions(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  try {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: ids } } })
    console.log(`[push] καθαρίστηκαν ${ids.length} νεκρές συνδρομές`)
  } catch (err) {
    console.error('[push] αποτυχία καθαρισμού', err)
  }
}

/** Στέλνει στις συσκευές Expo. Επιστρέφει τα id που πρέπει να σβηστούν. */
async function sendExpo(
  rows: Array<{ id: string; expo_token: string | null }>,
  payload: PushPayload,
): Promise<string[]> {
  const valid = rows.filter(r => r.expo_token)
  if (valid.length === 0) return []

  const dead: string[] = []

  for (let i = 0; i < valid.length; i += EXPO_BATCH) {
    const chunk = valid.slice(i, i + EXPO_BATCH)
    const messages = chunk.map(r => ({
      to: r.expo_token,
      title: payload.title,
      body: payload.body,
      sound: 'default',
      channelId: 'default',
      data: { ...(payload.data ?? {}), ...(payload.url ? { url: payload.url } : {}) },
    }))

    try {
      const res = await fetch(EXPO_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages),
      })
      const json: any = await res.json()
      const tickets: any[] = Array.isArray(json?.data) ? json.data : []

      // Οι απαντήσεις έρχονται με την ΙΔΙΑ σειρά που στάλθηκαν τα μηνύματα.
      tickets.forEach((ticket, idx) => {
        const code = ticket?.details?.error
        if (ticket?.status === 'error' && code === 'DeviceNotRegistered') {
          dead.push(chunk[idx].id)
        } else if (ticket?.status === 'error') {
          console.error('[push] σφάλμα Expo:', code ?? ticket?.message)
        }
      })
    } catch (err) {
      console.error('[push] αποτυχία αιτήματος προς Expo', err)
    }
  }

  return dead
}

/** Στέλνει στους browsers. Επιστρέφει τα id που πρέπει να σβηστούν. */
async function sendWeb(
  rows: Array<{ id: string; endpoint: string | null; p256dh: string | null; auth: string | null }>,
  payload: PushPayload,
): Promise<string[]> {
  const valid = rows.filter(r => r.endpoint && r.p256dh && r.auth)
  if (valid.length === 0 || !ensureVapid()) return []

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/',
    data: payload.data ?? {},
  })

  const dead: string[] = []

  await Promise.all(valid.map(async row => {
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint!, keys: { p256dh: row.p256dh!, auth: row.auth! } },
        body,
      )
    } catch (err: any) {
      // 404 «δεν υπάρχει» και 410 «έφυγε» σημαίνουν ότι ο browser ακύρωσε τη
      // συνδρομή. Κάθε άλλο σφάλμα μπορεί να είναι προσωρινό — δεν σβήνουμε.
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        dead.push(row.id)
      } else {
        console.error('[push] σφάλμα web push:', err?.statusCode ?? err?.message)
      }
    }
  }))

  return dead
}

/**
 * Στέλνει ειδοποίηση σε ΟΛΕΣ τις συσκευές ενός χρήστη.
 *
 * Το κλειδί είναι το email, γιατί έτσι δουλεύει όλος ο υπόλοιπος κώδικας
 * ειδοποιήσεων (orders, bookings, telehealth, webhooks). Η αντιστοίχιση σε
 * user_id γίνεται εδώ, μέσω της σχέσης.
 */
export async function sendPushToUser(email: string, payload: PushPayload): Promise<void> {
  try {
    // Ο τύπος δηλώνεται ρητά ώστε τα filter παρακάτω να είναι τυποποιημένα
    // ακόμα και με strict mode.
    const rows: Array<{
      id: string; platform: string; expo_token: string | null
      endpoint: string | null; p256dh: string | null; auth: string | null
    }> = await prisma.pushSubscription.findMany({
      where: { user: { email } },
      select: { id: true, platform: true, expo_token: true, endpoint: true, p256dh: true, auth: true },
    })
    if (rows.length === 0) return

    const [expoDead, webDead] = await Promise.all([
      sendExpo(rows.filter(r => r.platform !== 'web'), payload),
      sendWeb(rows.filter(r => r.platform === 'web'), payload),
    ])

    await dropSubscriptions([...expoDead, ...webDead])
  } catch (err) {
    console.error('[push] αποτυχία αποστολής', err)
  }
}
