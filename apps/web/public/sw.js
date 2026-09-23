/**
 * Service worker της GlobiPet — ΜΟΝΟ για ειδοποιήσεις push.
 *
 * ΓΙΑΤΙ ΔΕΝ ΚΑΝΕΙ CACHE
 *   Ένας service worker μπορεί να αποθηκεύει τη σελίδα για χρήση εκτός
 *   σύνδεσης. Δεν το κάνουμε εδώ επίτηδες: το caching σε εφαρμογή που
 *   δείχνει διαθεσιμότητα κτηνιάτρων και τιμές είναι επικίνδυνο, γιατί ο
 *   χρήστης βλέπει παλιά δεδομένα χωρίς να το ξέρει. Αν χρειαστεί offline
 *   λειτουργία, σχεδιάζεται χωριστά και με προσοχή.
 *
 * ΑΝΑΒΑΘΜΙΣΗ
 *   Το skipWaiting και το clients.claim κάνουν τη νέα έκδοση να αναλάβει
 *   αμέσως, χωρίς να περιμένει να κλείσουν όλες οι καρτέλες. Χωρίς αυτά,
 *   μια διόρθωση εδώ μπορεί να μην φτάσει ποτέ σε κάποιον που κρατάει την
 *   ίδια καρτέλα ανοιχτή για εβδομάδες.
 */

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

/**
 * Άφιξη ειδοποίησης.
 *
 * Το payload έρχεται από το backend ως JSON: { title, body, url, data }.
 * Αν για οποιονδήποτε λόγο δεν είναι έγκυρο JSON, δείχνουμε ένα ουδέτερο
 * μήνυμα αντί να μη δείξουμε τίποτα — μια σιωπηλή ειδοποίηση είναι χειρότερη
 * από μια γενική.
 */
self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { title: 'GlobiPet', body: event.data ? event.data.text() : '' }
  }

  const title = payload.title || 'GlobiPet'
  const options = {
    body: payload.body || '',
    icon: '/logo-clean.png',
    badge: '/logo-clean.png',
    // Η διαδρομή ταξιδεύει μαζί με την ειδοποίηση ώστε το notificationclick
    // παρακάτω να ξέρει πού να στείλει τον χρήστη.
    data: { url: payload.url || '/', ...(payload.data || {}) },
    // Ίδιο tag σημαίνει ότι μια νέα ειδοποίηση αντικαθιστά την προηγούμενη
    // αντί να στοιβάζονται δέκα ειδοποιήσεις για την ίδια κράτηση.
    tag: payload.tag || 'globipet',
    renotify: false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

/**
 * Πάτημα της ειδοποίησης.
 *
 * Αν υπάρχει ήδη ανοιχτή καρτέλα της GlobiPet, την εστιάζουμε και την
 * πλοηγούμε — δεν ανοίγουμε δέκατη καρτέλα. Μόνο αν δεν υπάρχει καμία,
 * ανοίγουμε νέα.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const target = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin)) {
          client.focus()
          if ('navigate' in client) client.navigate(target)
          return
        }
      }
      return self.clients.openWindow(target)
    })
  )
})
