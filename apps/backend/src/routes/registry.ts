import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

/**
 * Τα δύο επίσημα μητρώα: καταφύγια και φιλοζωικές οργανώσεις.
 *
 * ΔΗΜΟΣΙΑ ΕΠΙΤΗΔΕΣ
 *   Είναι δημόσια στοιχεία και χρήσιμα σε όποιον ψάχνει πού να απευθυνθεί
 *   για ένα αδέσποτο. Δεν απαιτούν λογαριασμό.
 *
 * ΤΙ ΔΕΝ ΕΠΙΣΤΡΕΦΕΤΑΙ ΠΟΤΕ
 *   Το operator_name των καταφυγίων όταν ο δικαιούχος είναι φυσικό πρόσωπο.
 *   Είναι προσωπικό δεδομένο: έξι από τις 84 εγγραφές είναι ιδιώτες, και το
 *   όνομά τους δεν έχει λόγο να φύγει από τη βάση. Για τους ίδιους δεν
 *   επιστρέφονται ούτε διεύθυνση, τηλέφωνο και email.
 */
export default async function registryRoutes(app: FastifyInstance) {

  // ── ΚΑΤΑΦΥΓΙΑ ───────────────────────────────────────────────────
  app.get('/shelters', async (req: any) => {
    const { municipality, category, q, limit } = (req.query ?? {}) as any
    const take = Math.min(parseInt(limit, 10) || 200, 500)

    const where: any = { is_active: true }
    if (municipality) where.municipality = { contains: String(municipality), mode: 'insensitive' }
    if (category) where.category = String(category)
    if (q) where.name = { contains: String(q), mode: 'insensitive' }

    const rows = await prisma.officialShelter.findMany({
      where, take, orderBy: [{ municipality: 'asc' }, { name: 'asc' }],
    })

    return {
      data: rows.map(s => ({
        id: s.id,
        official_code: s.official_code,
        name: s.name,
        category: s.category,
        municipality: s.municipality,
        // Το όνομα φυσικού προσώπου ΔΕΝ βγαίνει ποτέ — ούτε η διεύθυνση, το
        // τηλέφωνο και το email του, που το ταυτοποιούν εξίσου.
        operator_name: s.operator_is_person ? null : s.operator_name,
        address: s.operator_is_person ? null : s.address,
        latitude: s.latitude,
        longitude: s.longitude,
        phone: s.operator_is_person ? null : s.phone,
        email: s.operator_is_person ? null : s.email,
        website: s.website,
        is_claimed: !!s.claimed_service_id,
        claimed_service_id: s.claimed_service_id,
      })),
    }
  })

  app.get('/shelters/municipalities', async () => {
    const rows = await prisma.officialShelter.groupBy({
      by: ['municipality'], where: { is_active: true },
      _count: { _all: true }, orderBy: { municipality: 'asc' },
    })
    return { data: rows.map(r => ({ municipality: r.municipality, count: r._count._all })) }
  })

  // ── ΦΙΛΟΖΩΙΚΕΣ ΟΡΓΑΝΩΣΕΙΣ ───────────────────────────────────────
  app.get('/welfare-organisations', async (req: any) => {
    const { municipality, kind, country, q, limit } = (req.query ?? {}) as any
    const take = Math.min(parseInt(limit, 10) || 400, 1000)

    const where: any = { is_active: true }
    if (municipality) where.municipality = { contains: String(municipality), mode: 'insensitive' }
    if (kind) where.kind = String(kind)
    if (country) where.country = String(country)
    if (q) where.name = { contains: String(q), mode: 'insensitive' }

    const rows = await prisma.welfareOrganisation.findMany({
      where, take, orderBy: [{ name: 'asc' }],
    })

    return {
      data: rows.map(o => ({
        id: o.id,
        name: o.name,
        kind: o.kind,
        country: o.country,
        municipality: o.municipality,
        address: o.address,
        latitude: o.latitude,
        longitude: o.longitude,
        phone: o.phone,
        email: o.email,
        website: o.website,
        is_claimed: !!o.claimed_service_id,
        claimed_service_id: o.claimed_service_id,
      })),
    }
  })

  app.get('/welfare-organisations/municipalities', async () => {
    const rows = await prisma.welfareOrganisation.groupBy({
      by: ['municipality'], where: { is_active: true, municipality: { not: null } },
      _count: { _all: true }, orderBy: { municipality: 'asc' },
    })
    return { data: rows.map(r => ({ municipality: r.municipality, count: r._count._all })) }
  })
}
