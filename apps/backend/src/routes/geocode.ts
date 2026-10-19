import type { FastifyPluginAsync } from 'fastify'
import { geocodeAddress, GeocodeBusyError } from '../lib/geocode.js'

/**
 * Γενική γεωκωδικοποίηση διεύθυνσης (π.χ. για την τοποθεσία υπηρεσίας στον
 * χάρτη υπηρεσιών). Ίδια πηγή με το /communities/geocode, που μένει ως έχει.
 *
 * GET /geocode?address=...&country=GR
 *   200 → { lat, lon, display_name }
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
}

export default geocodeRoutes
