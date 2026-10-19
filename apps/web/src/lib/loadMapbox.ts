/**
 * Κοινή φόρτωση του Mapbox GL JS από το CDN του Mapbox (PetTracker, ServicesMap).
 *
 * Μία υπόσχεση σε επίπεδο module: όλοι οι χάρτες περιμένουν την ίδια φόρτωση.
 * Αν το script αποτύχει, αφαιρείται και η υπόσχεση μηδενίζεται, ώστε η επόμενη
 * κλήση να ξαναδοκιμάσει αντί να περιμένει για πάντα ένα script που δεν θα φορτώσει.
 */

export const MAPBOX_JS = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js'
export const MAPBOX_CSS = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css'

let pending: Promise<any> | null = null

export function loadMapbox(): Promise<any> {
  const w = window as any
  if (w.mapboxgl) return Promise.resolve(w.mapboxgl)
  if (pending) return pending

  if (!document.querySelector(`link[href="${MAPBOX_CSS}"]`)) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = MAPBOX_CSS
    document.head.appendChild(link)
  }

  pending = new Promise<any>((resolve, reject) => {
    // Ένα script που έμεινε από παλαιότερη (αποτυχημένη ή άγνωστης κατάστασης)
    // προσπάθεια δεν θα ξαναστείλει load/error — το αντικαθιστούμε.
    document.querySelectorAll(`script[src="${MAPBOX_JS}"]`).forEach(s => s.remove())

    const script = document.createElement('script')
    script.src = MAPBOX_JS
    script.async = true
    const fail = () => {
      script.remove()
      pending = null
      reject(new Error('mapbox'))
    }
    script.addEventListener('load', () => {
      if (w.mapboxgl) resolve(w.mapboxgl)
      else fail()
    })
    script.addEventListener('error', fail)
    document.head.appendChild(script)
  })
  return pending
}
