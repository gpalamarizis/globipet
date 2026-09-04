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

  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const event = await assertCanModify(req, reply, req.params.id)
    if (!event) return
    await prisma.event.delete({ where: { id: event.id } })
    return { success: true }
  })
}
export default eventsRoutes
