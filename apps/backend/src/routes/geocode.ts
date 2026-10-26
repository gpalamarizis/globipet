import type { FastifyPluginAsync } from 'fastify'
import { geocodeAddress, reverseGeocode, GeocodeBusyError } from '../lib/geocode.js'

/**
 * Γενική γεωκωδικοποίηση διεύθυνσης (π.χ. για την τοποθεσία υπηρεσίας στον
 * χάρτη υπηρεσιών). Ίδια πηγή με το /communities/geocode, που μένει ως έχει.
 *
 * GET /geocode?address=...&country=GR
 *   200 → { lat, lon, display_name, city? }   (city: προαιρετικό, Ε17)
 *   400 → διεύθυνση < 3 χαρακτήρες
 *   404 → δεν βρέθηκε
 *   503 → η ουρά προς το Nominatim είναι γεμάτη
 *
 * Μόνο για συνδεδεμένους: κάθε κλήση καταναλώνει το κοινό όριο 1 αίτημα/δευτ.
 * του Nominatim, οπότε δεν ανοίγει σε ανώνυμους.
 */
const geocodeRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { address, country } = (req.query ?? {}) as any
    if (!address || String(address).trim().length < 3) {
      return reply.code(400).send({ message: 'Δώσε διεύθυνση' })
    }
    let result
    try {
      result = await geocodeAddress(String(address), country ? String(country) : undefined, { throwIfBusy: true })
    } catch (err) {
      if (err instanceof GeocodeBusyError) {
        return reply.code(503).send({ message: 'Η υπηρεσία χαρτών είναι απασχολημένη — δοκίμασε σε λίγο' })
      }
      throw err
    }
    if (!result) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    return result
  })

  /**
   * Ε18 — Αντίστροφη γεωκωδικοποίηση («Χρήση της τοποθεσίας μου» στη φόρμα βόλτας).
   *
   * GET /geocode/reverse?lat=..&lon=..
   *   200 → { lat, lon, display_name, city? }  (lat/lon στρογγυλεμένα σε 4 δεκαδικά)
   *   400 → άκυρες συντεταγμένες · 404 → δεν βρέθηκε · 503 → γεμάτη ουρά
   * Ίδια ουρά/όριο Nominatim με το GET /geocode (lib/geocode) — μόνο για
   * συνδεδεμένους, και ίδιο όριο αιτημάτων (20/λεπτό ανά IP: το STRICT_LIMITS
   * του index.ts καλύπτει μόνο τα '/api/geocode' και '/api/geocode/').
   */
  app.get('/reverse', {
    preHandler: [(app as any).authenticate],
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (req: any, reply) => {
    const { lat: rawLat, lon: rawLon } = (req.query ?? {}) as any
    const toNum = (v: unknown) => typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
    const lat = toNum(rawLat)
    const lon = toNum(rawLon)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return reply.code(400).send({ message: 'Μη έγκυρες συντεταγμένες' })
    if (lat < -90 || lat > 90) return reply.code(400).send({ message: 'Το γεωγραφικό πλάτος πρέπει να είναι από -90 έως 90' })
    if (lon < -180 || lon > 180) return reply.code(400).send({ message: 'Το γεωγραφικό μήκος πρέπει να είναι από -180 έως 180' })
    let result
    try {
      result = await reverseGeocode(lat, lon, { throwIfBusy: true })
    } catch (err) {
      if (err instanceof GeocodeBusyError) {
        return reply.code(503).send({ message: 'Η υπηρεσία χαρτών είναι απασχολημένη — δοκίμασε σε λίγο' })
      }
      throw err
    }
    if (!result) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    return result
  })
}

export default geocodeRoutes
