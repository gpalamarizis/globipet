import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const routes: FastifyPluginAsync = async (app) => {

  /**
   * Verify the caller owns the pet a location is being recorded against.
   *
   * Without this, `owner_email` came from the token but `pet_id` came from the
   * body unchecked, so anyone could write GPS points onto a stranger's pet.
   * Location history is among the most sensitive data here — it maps where a
   * household is over time.
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

  app.get('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const { pet_id } = req.query
    const data = await prisma.petLocation.findMany({
      where: { owner_email: email, ...(pet_id && { pet_id }) },
      orderBy: { created_at: 'desc' },
      take: 50,
    })
    return { data }
  })

  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const { pet_id, latitude, longitude, status } = req.body as any
    if (!pet_id || latitude === undefined || longitude === undefined) {
      return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })
    }

    const lat = parseFloat(latitude)
    const lng = parseFloat(longitude)
    // Reject impossible coordinates rather than storing them and drawing a
    // marker in the middle of nowhere.
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 ||
        !Number.isFinite(lng) || lng < -180 || lng > 180) {
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

  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
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

    if (Object.keys(data).length === 0) {
      return reply.code(400).send({ message: 'Καμία έγκυρη αλλαγή' })
    }
    return prisma.petLocation.update({ where: { id: existing.id }, data })
  })

  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const existing = await prisma.petLocation.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.petLocation.delete({ where: { id: existing.id } })
    return reply.code(204).send()
  })
}

export default routes
