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

/**
 * city (Ε17, προαιρετικό — νέο πεδίο, τα υπάρχοντα μένουν ίδια): πόλη →
 * κωμόπολη → χωριό από το address του Nominatim (addressdetails=1)· μόνο αν
 * λείπουν όλα, ο δήμος χωρίς το πρόθεμα «Δήμος »/«Δήμου ». Ζητείται στα
 * ελληνικά (accept-language=el). Λείπει όταν δεν προκύπτει.
 */
export interface GeocodeResult { lat: number; lon: number; display_name: string; city?: string }

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

/** Πόλη → κωμόπολη → χωριό· αλλιώς ο δήμος χωρίς «Δήμος »/«Δήμου » (βλ. city πιο πάνω). */
function cityOf(address: any): string {
  const ad = address ?? {}
  const settlement = String(ad.city || ad.town || ad.village || '').trim()
  return settlement || String(ad.municipality || '').trim().replace(/^Δήμο[ςυ]\s+/u, '').trim()
}

/** Αποθήκευση στο κοινό cache (null → μόνο NULL_TTL_MS). */
function remember(key: string, value: GeocodeResult | null) {
  // Τα null (δεν βρέθηκε ή σφάλμα δικτύου — δεν ξεχωρίζουν εδώ) κρατιούνται
  // μόνο 5 λεπτά, ώστε ένα προσωρινό σφάλμα να μη «κολλάει» για μια μέρα.
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string)
  cache.set(key, { until: Date.now() + (value ? CACHE_TTL_MS : NULL_TTL_MS), value })
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
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&addressdetails=1&accept-language=el`
        + (cc ? `&countrycodes=${cc}` : '')
      // Χρονικό όριο: ένα αίτημα που κρέμεται δεν πρέπει να μπλοκάρει την ουρά.
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(8000) })
      if (!res.ok) return null
      const data = await res.json() as any[]
      if (!Array.isArray(data) || data.length === 0) return null
      const lat = parseFloat(data[0].lat)
      const lon = parseFloat(data[0].lon)
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
      const city = cityOf(data[0].address)
      return { lat, lon, display_name: String(data[0].display_name ?? ''), ...(city ? { city } : {}) }
    } catch { return null }
  })

  remember(key, value)
  return value
}

/**
 * Ε18 — Αντίστροφη γεωκωδικοποίηση (συντεταγμένες → διεύθυνση), για τη
 * «Χρήση της τοποθεσίας μου» στη φόρμα βόλτας. ΙΔΙΑ ουρά (throttled: ≤ 1
 * αίτημα/δευτ. για όλη την εφαρμογή μαζί με το geocodeAddress), ίδιο cache,
 * ίδιο MAX_QUEUE / GeocodeBusyError, ίδια εξαγωγή πόλης.
 *
 * Nominatim /reverse (format=jsonv2, addressdetails=1, accept-language=el,
 * zoom=18 — επίπεδο κτιρίου). Οι συντεταγμένες στρογγυλεύονται σε 4 δεκαδικά
 * (~11 μ.) — αυτές ζητούνται, αυτές είναι το κλειδί του cache και αυτές
 * επιστρέφονται ως lat/lon (το σημείο του χρήστη, όχι το κέντρο του κτιρίου
 * που βρήκε το Nominatim).
 * Ο καλών έχει ήδη ελέγξει ότι είναι πεπερασμένοι αριθμοί εντός ορίων.
 */
export async function reverseGeocode(
  lat: number, lon: number, opts?: { throwIfBusy?: boolean },
): Promise<GeocodeResult | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  const la = Number(lat.toFixed(4))
  const lo = Number(lon.toFixed(4))
  const key = `rev|${la.toFixed(4)}|${lo.toFixed(4)}`

  const hit = cache.get(key)
  if (hit && Date.now() < hit.until) return hit.value

  if (pending >= MAX_QUEUE) {
    if (opts?.throwIfBusy) throw new GeocodeBusyError()
    return null
  }

  const value = await throttled(async (): Promise<GeocodeResult | null> => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${la.toFixed(4)}&lon=${lo.toFixed(4)}`
        + '&format=jsonv2&addressdetails=1&accept-language=el&zoom=18'
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(8000) })
      if (!res.ok) return null
      const data = await res.json() as any
      // Χωρίς αποτέλεσμα το Nominatim απαντά 200 με { error: 'Unable to geocode' }.
      if (!data || typeof data !== 'object' || data.error || !data.display_name) return null
      const city = cityOf(data.address)
      return { lat: la, lon: lo, display_name: String(data.display_name), ...(city ? { city } : {}) }
    } catch { return null }
  })

  remember(key, value)
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
