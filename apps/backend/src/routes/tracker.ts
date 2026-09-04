import type { FastifyPluginAsync } from 'fastify'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import prisma from '../lib/prisma.js'

/**
 * Pet tracking — position history plus the registry of physical GPS collars.
 *
 *   OWNER (authenticated)
 *     GET    /tracker                      position history
 *     POST   /tracker                      record a position manually
 *     PATCH  /tracker/:id                  correct a position
 *     DELETE /tracker/:id
 *     GET    /tracker/devices              my registered collars
 *     POST   /tracker/devices              register a collar to a pet
 *     PATCH  /tracker/devices/:id          rename / activate / deactivate
 *     DELETE /tracker/devices/:id          unregister
 *     POST   /tracker/devices/:id/token    issue a new device token
 *
 *   DEVICE (no session — authenticates with device_id + token)
 *     POST   /tracker/ingest               report a position
 */

/** Devices report a rough signal quality; anything else is stored as unknown. */
const SIGNAL_VALUES = ['good', 'weak', 'none']

function newToken() {
  return randomBytes(24).toString('hex')
}

/**
 * Compare two secrets without leaking their contents through response timing.
 * A plain `===` returns as soon as it hits a differing byte, which over many
 * attempts reveals how much of a guess was correct.
 */
function tokensMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(String(a))
  const bufB = Buffer.from(String(b))
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

function validCoords(lat: number, lng: number) {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
         Number.isFinite(lng) && lng >= -180 && lng <= 180
}

const routes: FastifyPluginAsync = async (app) => {

  /**
   * Verify the caller owns the pet a location or device is being attached to.
   *
   * Without this, owner_email came from the token but pet_id came from the
   * body unchecked, so anyone could write GPS points onto a stranger's pet.
   * Location history maps where a household is over time.
   */
  async function assertOwnsPet(req: any, reply: any, petId: string) {
    const user = req.user as any
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      select: { owner_email: true },
    })
    if (!pet) {
      reply.code(404).send({ message: 'Το κατοικίδιο δεν βρέθηκε' })
      return false
    }
    if (pet.owner_email !== user.email) {
      reply.code(403).send({ message: 'Το κατοικίδιο δεν σου ανήκει' })
      return false
    }
    return true
  }

  // ═══ DEVICE INGESTION — no session ═══════════════════════════════
  //
  // Declared before the authenticated routes because a collar has no JWT. It
  // proves itself with the device_id printed on it plus the token the owner
  // configured when registering it.
  app.post('/ingest', async (req: any, reply) => {
    const { device_id, token, latitude, longitude, battery, signal, status } = (req.body ?? {}) as any

    if (!device_id || !token) {
      return reply.code(400).send({ message: 'device_id and token are required' })
    }

    const lat = parseFloat(latitude)
    const lng = parseFloat(longitude)
    if (!validCoords(lat, lng)) {
      return reply.code(400).send({ message: 'invalid coordinates' })
    }

    const tracker = await prisma.petTracker.findUnique({
      where: { device_id: String(device_id) },
    })
    // Same response whether the device is unknown or the token is wrong, so
    // the endpoint cannot be used to enumerate which serials are registered.
    if (!tracker || !tokensMatch(tracker.device_token, String(token))) {
      return reply.code(401).send({ message: 'unauthorized device' })
    }
    if (!tracker.is_active) {
      return reply.code(403).send({ message: 'device is deactivated' })
    }

    const batteryPercent = battery == null ? null
      : Math.min(Math.max(parseInt(battery), 0), 100)

    const [location] = await prisma.$transaction([
      prisma.petLocation.create({
        data: {
          pet_id: tracker.pet_id,
          owner_email: tracker.owner_email,
          tracker_id: tracker.id,
          latitude: lat,
          longitude: lng,
          status: status === 'lost' ? 'lost' : 'safe',
        },
      }),
      prisma.petTracker.update({
        where: { id: tracker.id },
        data: {
          battery_percent: Number.isFinite(batteryPercent as number) ? batteryPercent : tracker.battery_percent,
          signal_strength: SIGNAL_VALUES.includes(signal) ? signal : tracker.signal_strength,
          last_seen_at: new Date(),
        },
      }),
    ])

    return { ok: true, location_id: location.id }
  })

  // ═══ OWNER ROUTES ════════════════════════════════════════════════
  app.register(async (secured) => {
    secured.addHook('preHandler', async (req: any, reply: any) => {
      try { await (app as any).authenticate(req, reply) }
      catch { return reply.code(401).send({ message: 'Μη εξουσιοδοτημένος' }) }
    })

    // ─── Registered devices ────────────────────────────────────────

    secured.get('/devices', async (req: any) => {
      const { email } = req.user as any
      const devices = await prisma.petTracker.findMany({
        where: { owner_email: email },
        orderBy: { created_at: 'desc' },
        // device_token is deliberately absent: it is shown once at
        // registration and never listed again.
        select: {
          id: true, pet_id: true, device_id: true, name: true, brand: true,
          model: true, battery_percent: true, signal_strength: true,
          last_seen_at: true, is_active: true, created_at: true,
          pet: { select: { id: true, name: true, species: true, image_url: true, is_lost: true } },
        },
      })
      return { data: devices }
    })

    secured.post('/devices', async (req: any, reply) => {
      const { email } = req.user as any
      const { pet_id, device_id, name, brand, model } = (req.body ?? {}) as any

      if (!pet_id || !device_id) {
        return reply.code(400).send({ message: 'Λείπει το κατοικίδιο ή το αναγνωριστικό συσκευής' })
      }
      if (!(await assertOwnsPet(req, reply, pet_id))) return

      const deviceId = String(device_id).trim()
      if (deviceId.length < 4 || deviceId.length > 128) {
        return reply.code(400).send({ message: 'Μη έγκυρο αναγνωριστικό συσκευής' })
      }

      const taken = await prisma.petTracker.findUnique({ where: { device_id: deviceId } })
      if (taken) {
        return reply.code(409).send({ message: 'Η συσκευή είναι ήδη καταχωρημένη' })
      }

      const device_token = newToken()
      const tracker = await prisma.petTracker.create({
        data: {
          pet_id,
          owner_email: email,
          device_id: deviceId,
          device_token,
          name: name ? String(name).slice(0, 100) : null,
          brand: brand ? String(brand).slice(0, 60) : null,
          model: model ? String(model).slice(0, 60) : null,
        },
      })

      // The token is returned exactly once, here. Losing it means issuing a
      // new one rather than reading the old one back.
      return reply.code(201).send({
        data: { ...tracker, device_token },
        setup: {
          ingest_url: `${process.env.PUBLIC_API_URL || 'https://globipetbackend-production.up.railway.app/api'}/tracker/ingest`,
          note: 'Κράτησε το device_token — εμφανίζεται μόνο τώρα.',
        },
      })
    })

    secured.patch('/devices/:id', async (req: any, reply) => {
      const { email } = req.user as any
      const existing = await prisma.petTracker.findUnique({ where: { id: req.params.id } })
      if (!existing || existing.owner_email !== email) {
        return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
      }

      const body = (req.body ?? {}) as any
      const data: any = {}
      if (body.name !== undefined) data.name = body.name ? String(body.name).slice(0, 100) : null
      if (body.brand !== undefined) data.brand = body.brand ? String(body.brand).slice(0, 60) : null
      if (body.model !== undefined) data.model = body.model ? String(body.model).slice(0, 60) : null
      if (body.is_active !== undefined) data.is_active = !!body.is_active

      // Moving a collar to another pet is allowed, but only to one you own.
      if (body.pet_id !== undefined && body.pet_id !== existing.pet_id) {
        if (!(await assertOwnsPet(req, reply, body.pet_id))) return
        data.pet_id = body.pet_id
      }

      if (Object.keys(data).length === 0) {
        return reply.code(400).send({ message: 'Καμία έγκυρη αλλαγή' })
      }
      const updated = await prisma.petTracker.update({
        where: { id: existing.id },
        data,
        select: {
          id: true, pet_id: true, device_id: true, name: true, brand: true,
          model: true, battery_percent: true, signal_strength: true,
          last_seen_at: true, is_active: true,
        },
      })
      return { data: updated }
    })

    secured.post('/devices/:id/token', async (req: any, reply) => {
      const { email } = req.user as any
      const existing = await prisma.petTracker.findUnique({ where: { id: req.params.id } })
      if (!existing || existing.owner_email !== email) {
        return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
      }
      const device_token = newToken()
      await prisma.petTracker.update({
        where: { id: existing.id },
        data: { device_token },
      })
      // The old token stops working immediately, so the collar must be
      // reconfigured with this value.
      return { data: { device_token } }
    })

    secured.delete('/devices/:id', async (req: any, reply) => {
      const { email } = req.user as any
      const existing = await prisma.petTracker.findUnique({ where: { id: req.params.id } })
      if (!existing || existing.owner_email !== email) {
        return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
      }
      // Position history survives; the rows simply lose their tracker link.
      await prisma.petTracker.delete({ where: { id: existing.id } })
      return reply.code(204).send()
    })

    // ─── Position history ──────────────────────────────────────────

    secured.get('/', async (req: any) => {
      const { email } = req.user as any
      const { pet_id, limit } = req.query
      const take = Math.min(Math.max(parseInt(limit) || 50, 1), 200)
      const data = await prisma.petLocation.findMany({
        where: { owner_email: email, ...(pet_id && { pet_id }) },
        orderBy: { created_at: 'desc' },
        take,
      })
      return { data }
    })

    /**
     * Latest known position per pet, with the collar that reported it.
     * The tracker screen needs one row per pet, not a flat history it has to
     * de-duplicate on the client.
     */
    secured.get('/latest', async (req: any) => {
      const { email } = req.user as any
      const pets = await prisma.pet.findMany({
        where: { owner_email: email },
        orderBy: { created_at: 'asc' },
        select: {
          id: true, name: true, species: true, breed: true,
          image_url: true, is_lost: true, last_seen_location: true,
        },
      })
      if (pets.length === 0) return { data: [] }

      const petIds = pets.map(p => p.id)

      const [locations, trackers] = await Promise.all([
        prisma.petLocation.findMany({
          where: { pet_id: { in: petIds } },
          orderBy: { created_at: 'desc' },
          take: 500,
        }),
        prisma.petTracker.findMany({
          where: { pet_id: { in: petIds }, owner_email: email },
          select: {
            id: true, pet_id: true, device_id: true, name: true,
            battery_percent: true, signal_strength: true,
            last_seen_at: true, is_active: true,
          },
        }),
      ])

      // Rows arrive newest-first, so the first one seen for a pet is its latest.
      const latestByPet = new Map<string, any>()
      for (const loc of locations) {
        if (!latestByPet.has(loc.pet_id)) latestByPet.set(loc.pet_id, loc)
      }
      const trackerByPet = new Map<string, any>()
      for (const tr of trackers) {
        if (!trackerByPet.has(tr.pet_id)) trackerByPet.set(tr.pet_id, tr)
      }

      return {
        data: pets.map(pet => ({
          pet,
          location: latestByPet.get(pet.id) ?? null,
          tracker: trackerByPet.get(pet.id) ?? null,
        })),
      }
    })

    secured.post('/', async (req: any, reply) => {
      const { email } = req.user as any
      const { pet_id, latitude, longitude, status } = req.body as any
      if (!pet_id || latitude === undefined || longitude === undefined) {
        return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })
      }

      const lat = parseFloat(latitude)
      const lng = parseFloat(longitude)
      if (!validCoords(lat, lng)) {
        return reply.code(400).send({ message: 'Μη έγκυρες συντεταγμένες' })
      }
      if (!(await assertOwnsPet(req, reply, pet_id))) return

      const location = await prisma.petLocation.create({
        data: {
          pet_id,
          owner_email: email,
          latitude: lat,
          longitude: lng,
          status: status || 'safe',
        }
      })
      return reply.code(201).send({ data: location })
    })

    secured.patch('/:id', async (req: any, reply) => {
      const { email } = req.user as any
      const existing = await prisma.petLocation.findUnique({ where: { id: req.params.id } })
      if (!existing || existing.owner_email !== email) {
        return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
      }

      // Whitelist: passing req.body straight through allowed rewriting
      // owner_email and pet_id, i.e. moving a location point onto someone
      // else's pet.
      const body = (req.body ?? {}) as any
      const data: any = {}
      if (body.latitude !== undefined) {
        const lat = parseFloat(body.latitude)
        if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
          return reply.code(400).send({ message: 'Μη έγκυρο latitude' })
        }
        data.latitude = lat
      }
      if (body.longitude !== undefined) {
        const lng = parseFloat(body.longitude)
        if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
          return reply.code(400).send({ message: 'Μη έγκυρο longitude' })
        }
        data.longitude = lng
      }
      if (body.status !== undefined) data.status = body.status
      if (body.is_resolved !== undefined) data.is_resolved = !!body.is_resolved

      if (Object.keys(data).length === 0) {
        return reply.code(400).send({ message: 'Καμία έγκυρη αλλαγή' })
      }
      return prisma.petLocation.update({ where: { id: existing.id }, data })
    })

    secured.delete('/:id', async (req: any, reply) => {
      const { email } = req.user as any
      const existing = await prisma.petLocation.findUnique({ where: { id: req.params.id } })
      if (!existing || existing.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
      await prisma.petLocation.delete({ where: { id: existing.id } })
      return reply.code(204).send()
    })
  })
}

export default routes
