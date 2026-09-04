import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { getRequestLang, translateRecord, translateRecords } from '../lib/i18n.js'

const eventsRoutes: FastifyPluginAsync = async (app) => {

  /**
   * Load an event and verify the caller may change it.
   *
   * PATCH and DELETE previously had no check whatsoever — any logged-in user
   * could rewrite or delete any event on the platform knowing only its id,
   * including its price, its date and who organises it.
   */
  async function assertCanModify(req: any, reply: any, id: string) {
    const event = await prisma.event.findUnique({ where: { id } })
    if (!event) {
      reply.code(404).send({ message: 'Η εκδήλωση δεν βρέθηκε' })
      return null
    }
    const user = req.user as any
    if (event.organizer_email !== user.email && user.role !== 'admin') {
      reply.code(403).send({ message: 'Η εκδήλωση δεν σου ανήκει' })
      return null
    }
    return event
  }

  /** Fields an organiser may set. is_featured is a platform decision. */
  function pickEventFields(body: any, isAdmin: boolean) {
    const data: any = {}
    const plain = ['title', 'description', 'event_type', 'date', 'end_date', 'time',
                   'location', 'city', 'country', 'image_url', 'organizer']
    for (const f of plain) if (body[f] !== undefined) data[f] = body[f]

    if (body.latitude !== undefined) {
      const v = parseFloat(body.latitude)
      data.latitude = Number.isFinite(v) && v >= -90 && v <= 90 ? v : null
    }
    if (body.longitude !== undefined) {
      const v = parseFloat(body.longitude)
      data.longitude = Number.isFinite(v) && v >= -180 && v <= 180 ? v : null
    }
    if (body.capacity !== undefined) {
      const v = parseInt(body.capacity)
      data.capacity = Number.isFinite(v) && v > 0 ? v : null
    }
    if (body.price !== undefined) {
      const v = parseFloat(body.price)
      data.price = Number.isFinite(v) && v >= 0 ? v : 0
    }
    if (body.currency !== undefined) data.currency = body.currency || 'EUR'
    if (body.pet_types !== undefined) data.pet_types = Array.isArray(body.pet_types) ? body.pet_types : []
    if (body.ticket_types !== undefined) data.ticket_types = Array.isArray(body.ticket_types) ? body.ticket_types : []
    if (body.is_international !== undefined) data.is_international = !!body.is_international

    // Featuring an event puts it on the front page — moderation, not self-service.
    if (body.is_featured !== undefined && isAdmin) data.is_featured = !!body.is_featured

    return data
  }

  app.get('/', async (req: any) => {
    const lang = getRequestLang(req)
    const { q, city, country, event_type, upcoming, featured, page = 1, limit = 20 } = req.query
    const where: any = {}
    if (q) where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }]
    if (city) where.city = { contains: city, mode: 'insensitive' }
    if (country) where.country = country
    if (event_type) where.event_type = event_type
    if (featured === 'true') where.is_featured = true
    if (upcoming === 'true') {
      const today = new Date().toISOString().split('T')[0]
      where.date = { gte: today }
    }
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100)
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take
    const [data, total] = await Promise.all([
      prisma.event.findMany({ where, skip, take, orderBy: { date: 'asc' } }),
      prisma.event.count({ where })
    ])
    const translated = await translateRecords('event', data, lang)
    return { data: translated, total, page: Number(page), totalPages: Math.ceil(total / take) }
  })

  app.get('/:id', async (req: any) => {
    const lang = getRequestLang(req)
    const event = await prisma.event.findUniqueOrThrow({ where: { id: req.params.id } })
    return translateRecord('event', event, lang)
  })

  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email, full_name, role } = req.user as any
    const body = (req.body ?? {}) as any

    if (!body.title || !body.date || !body.time || !body.location || !body.city) {
      return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })
    }

    const data = pickEventFields(body, role === 'admin')
    return prisma.event.create({
      data: {
        ...data,
        // Ownership is taken from the session, never from the request.
        organizer_email: email,
        organizer: body.organizer || full_name || email.split('@')[0],
        description: data.description ?? '',
        country: data.country ?? 'GR',
        event_type: data.event_type ?? 'meetup',
      }
    })
  })

  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const event = await assertCanModify(req, reply, req.params.id)
    if (!event) return
    const isAdmin = (req.user as any).role === 'admin'
    const data = pickEventFields(req.body ?? {}, isAdmin)
    if (Object.keys(data).length === 0) {
      return reply.code(400).send({ message: 'Καμία έγκυρη αλλαγή' })
    }
    return prisma.event.update({ where: { id: event.id }, data })
  })

  // ─── Registrations ─────────────────────────────────────────────────
  //
  // events.registered_count existed with no table behind it, so every event
  // reported zero attendees and there was no way to sign up at all.

  /** Am I registered, and how many places are left? */
  app.get('/:id/registration', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      select: { id: true, capacity: true, registered_count: true },
    })
    if (!event) return reply.code(404).send({ message: 'Η εκδήλωση δεν βρέθηκε' })

    const mine = await prisma.eventRegistration.findUnique({
      where: { event_id_user_email: { event_id: event.id, user_email: email } },
    })
    return {
      data: {
        registered: mine?.status === 'registered',
        registration: mine ?? null,
        spots_left: event.capacity ? Math.max(0, event.capacity - event.registered_count) : null,
      },
    }
  })

  /** The organiser's attendee list. */
  app.get('/:id/registrations', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const user = req.user as any
    const event = await prisma.event.findUnique({ where: { id: req.params.id } })
    if (!event) return reply.code(404).send({ message: 'Η εκδήλωση δεν βρέθηκε' })
    if (event.organizer_email !== user.email && user.role !== 'admin') {
      return reply.code(403).send({ message: 'Δεν έχεις πρόσβαση στη λίστα συμμετεχόντων' })
    }
    const data = await prisma.eventRegistration.findMany({
      where: { event_id: event.id },
      orderBy: { created_at: 'asc' },
    })
    return { data }
  })

  app.post('/:id/register', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email, full_name } = req.user as any
    const { pet_id, pet_name, guests, notes } = (req.body ?? {}) as any

    const event = await prisma.event.findUnique({ where: { id: req.params.id } })
    if (!event) return reply.code(404).send({ message: 'Η εκδήλωση δεν βρέθηκε' })

    // A finished event cannot be joined.
    const today = new Date().toISOString().split('T')[0]
    if ((event.end_date || event.date) < today) {
      return reply.code(400).send({ message: 'Η εκδήλωση έχει ολοκληρωθεί' })
    }

    const existing = await prisma.eventRegistration.findUnique({
      where: { event_id_user_email: { event_id: event.id, user_email: email } },
    })
    if (existing?.status === 'registered') {
      return reply.code(409).send({ message: 'Έχεις ήδη δηλώσει συμμετοχή' })
    }

    // Capacity counts the people already in, and this booking's own party.
    const partySize = 1 + Math.min(Math.max(parseInt(guests) || 0, 0), 10)
    if (event.capacity && event.registered_count + partySize > event.capacity) {
      return reply.code(409).send({ message: 'Δεν υπάρχουν αρκετές διαθέσιμες θέσεις' })
    }

    // A pet may be brought along, but only one the caller owns.
    if (pet_id) {
      const pet = await prisma.pet.findUnique({ where: { id: pet_id }, select: { owner_email: true, name: true } })
      if (!pet || pet.owner_email !== email) {
        return reply.code(403).send({ message: 'Το κατοικίδιο δεν σου ανήκει' })
      }
    }

    const data = {
      user_name: full_name || email.split('@')[0],
      pet_id: pet_id || null,
      pet_name: pet_name || null,
      guests: partySize - 1,
      notes: notes ? String(notes).slice(0, 500) : null,
      status: 'registered',
    }

    const [registration] = await prisma.$transaction([
      // A previous cancellation reuses its row rather than colliding with the
      // unique index.
      prisma.eventRegistration.upsert({
        where: { event_id_user_email: { event_id: event.id, user_email: email } },
        create: { event_id: event.id, user_email: email, ...data },
        update: data,
      }),
      prisma.event.update({
        where: { id: event.id },
        data: { registered_count: { increment: partySize } },
      }),
    ])
    return reply.code(201).send({ data: registration })
  })

  app.delete('/:id/register', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const existing = await prisma.eventRegistration.findUnique({
      where: { event_id_user_email: { event_id: req.params.id, user_email: email } },
    })
    if (!existing || existing.status !== 'registered') {
      return reply.code(404).send({ message: 'Δεν βρέθηκε συμμετοχή' })
    }

    const partySize = 1 + (existing.guests ?? 0)
    await prisma.$transaction([
      // Kept, not deleted, so the organiser can see who dropped out.
      prisma.eventRegistration.update({
        where: { id: existing.id },
        data: { status: 'cancelled' },
      }),
      prisma.event.update({
        where: { id: req.params.id },
        data: { registered_count: { decrement: partySize } },
      }),
    ])
    await prisma.event.updateMany({
      where: { id: req.params.id, registered_count: { lt: 0 } },
      data: { registered_count: 0 },
    })
    return reply.code(204).send()
  })

  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const event = await assertCanModify(req, reply, req.params.id)
    if (!event) return
    await prisma.event.delete({ where: { id: event.id } })
    return { success: true }
  })
}
export default eventsRoutes
