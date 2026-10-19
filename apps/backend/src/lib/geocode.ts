/**
 * Γεωκωδικοποίηση διεύθυνσης με Nominatim (OpenStreetMap) — κοινή για
 * κοινότητες (/communities/geocode) και υπηρεσίες (/geocode).
 *
 * ΟΡΟΙ ΧΡΗΣΗΣ NOMINATIM (https://operations.osmfoundation.org/policies/nominatim/)
 *   - Αναγνωριστικό User-Agent με στοιχεία επικοινωνίας.
 *   - Το πολύ 1 αίτημα το δευτερόλεπτο από ολόκληρη την εφαρμογή: τα αιτήματα
 *     μπαίνουν σε ουρά και φεύγουν με απόσταση ≥ 1 δευτ. μεταξύ τους.
 *   - Αποθήκευση αποτελεσμάτων: η ίδια διεύθυνση δεν ξαναζητείται για 24 ώρες.
 *
 * Σε οποιοδήποτε σφάλμα (δίκτυο, όριο, άκυρη απάντηση) επιστρέφει null —
 * ο καλών απαντά «Δεν βρέθηκε» αντί για 500.
 *
 * ΜΕΓΙΣΤΗ ΟΥΡΑ
 *   Με 1 αίτημα/δευτ., 10 σε αναμονή σημαίνει ήδη ~10 δευτ. καθυστέρηση. Πάνω
 *   από MAX_QUEUE το αίτημα δεν μπαίνει στην ουρά: με { throwIfBusy: true }
 *   πετά GeocodeBusyError (το /geocode απαντά 503), αλλιώς επιστρέφει null.
 */

export interface GeocodeResult { lat: number; lon: number; display_name: string }

const USER_AGENT = 'GlobiPet/1.0 (info@globipet.com)'
const MIN_INTERVAL_MS = 1100
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const NULL_TTL_MS = 5 * 60 * 1000
const CACHE_MAX = 500
const MAX_QUEUE = 10

/** Η ουρά προς το Nominatim είναι γεμάτη — δοκίμασε σε λίγο. */
export class GeocodeBusyError extends Error {
  constructor() { super('geocode queue full') }
}

const cache = new Map<string, { until: number; value: GeocodeResult | null }>()
let queue: Promise<unknown> = Promise.resolve()
let lastCall = 0
let pending = 0

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/** Εκτελεί τις κλήσεις μία-μία, με ελάχιστη απόσταση MIN_INTERVAL_MS. */
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  pending++
  const run = queue.then(async () => {
    const wait = lastCall + MIN_INTERVAL_MS - Date.now()
    if (wait > 0) await sleep(wait)
    lastCall = Date.now()
    return fn()
  }).finally(() => { pending-- })
  queue = run.catch(() => undefined)
  return run
}

/**
 * @param address ελεύθερο κείμενο (κόβεται στους 200 χαρακτήρες)
 * @param country προαιρετικός κωδικός χώρας ISO 3166-1 alpha-2 (π.χ. 'gr')
 */
export async function geocodeAddress(
  address: string, country?: string, opts?: { throwIfBusy?: boolean },
): Promise<GeocodeResult | null> {
  const q = String(address ?? '').trim().slice(0, 200)
  if (!q) return null
  const cc = country && /^[a-z]{2}$/i.test(country) ? country.toLowerCase() : ''
  const key = `${cc}|${q.toLowerCase()}`

  const hit = cache.get(key)
  if (hit && Date.now() < hit.until) return hit.value

  // Γεμάτη ουρά: όχι αναμονή, όχι cache (δεν είναι «δεν βρέθηκε»).
  if (pending >= MAX_QUEUE) {
    if (opts?.throwIfBusy) throw new GeocodeBusyError()
    return null
  }

  const value = await throttled(async (): Promise<GeocodeResult | null> => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`
        + (cc ? `&countrycodes=${cc}` : '')
      // Χρονικό όριο: ένα αίτημα που κρέμεται δεν πρέπει να μπλοκάρει την ουρά.
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(8000) })
      if (!res.ok) return null
      const data = await res.json() as any[]
      if (!Array.isArray(data) || data.length === 0) return null
      const lat = parseFloat(data[0].lat)
      const lon = parseFloat(data[0].lon)
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
      return { lat, lon, display_name: String(data[0].display_name ?? '') }
    } catch { return null }
  })

  // Τα null (δεν βρέθηκε ή σφάλμα δικτύου — δεν ξεχωρίζουν εδώ) κρατιούνται
  // μόνο 5 λεπτά, ώστε ένα προσωρινό σφάλμα να μη «κολλάει» για μια μέρα.
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string)
  cache.set(key, { until: Date.now() + (value ? CACHE_TTL_MS : NULL_TTL_MS), value })
  return value
}

/**
 * Επικύρωση latitude/longitude από σώμα αιτήματος.
 *
 * - Κανένα από τα δύο στο σώμα → { data: {} } (δεν αλλάζει τίποτα).
 * - null ή '' σε οποιοδήποτε → διαγραφή τοποθεσίας (και τα δύο null).
 * - Αλλιώς ΚΑΙ τα δύο αριθμοί, -90..90 και -180..180.
 */
export function coordsFromBody(body: any):
  { data: { latitude?: number | null; longitude?: number | null } } | { error: string } {
  const has = (k: string) => body != null && Object.prototype.hasOwnProperty.call(body, k) && body[k] !== undefined
  if (!has('latitude') && !has('longitude')) return { data: {} }
  const empty = (v: any) => v === null || v === ''
  if (empty(body.latitude) || empty(body.longitude)) return { data: { latitude: null, longitude: null } }
  const lat = typeof body.latitude === 'number' ? body.latitude : typeof body.latitude === 'string' ? Number(body.latitude) : NaN
  const lng = typeof body.longitude === 'number' ? body.longitude : typeof body.longitude === 'string' ? Number(body.longitude) : NaN
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { error: 'Μη έγκυρες συντεταγμένες' }
  if (lat < -90 || lat > 90) return { error: 'Το γεωγραφικό πλάτος πρέπει να είναι από -90 έως 90' }
  if (lng < -180 || lng > 180) return { error: 'Το γεωγραφικό μήκος πρέπει να είναι από -180 έως 180' }
  return { data: { latitude: lat, longitude: lng } }
}
