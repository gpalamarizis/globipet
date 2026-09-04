import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const routes: FastifyPluginAsync = async (app) => {

  // GET nearby events + owners by city
  app.get('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const { city, event_type } = req.query as any

    const user = await prisma.user.findUnique({
      where: { email },
      select: { city: true },
    })
    const searchCity = city || user?.city || ''

    const [events, nearbyOwners] = await Promise.all([
      prisma.playdateEvent.findMany({
        where: {
          status: 'active',
          ...(searchCity ? { city: { contains: searchCity, mode: 'insensitive' } } : {}),
          ...(event_type ? { event_type } : {}),
        },
        include: {
          invitations: { where: { status: 'accepted' }, select: { invitee_name: true, invitee_photo: true, pet_name: true } }
        },
        orderBy: { date: 'asc' },
      }),
      prisma.user.findMany({
        where: {
          city: searchCity ? { contains: searchCity, mode: 'insensitive' } : undefined,
          email: { not: email },
        },
        // The email column is deliberately absent. This endpoint returned it
        // for every user in a city, which turned "who is nearby" into a
        // harvestable address list for anyone with an account.
        select: { id: true, full_name: true, city: true, profile_photo: true },
        take: 20,
      })
    ])

    return { events, nearbyOwners, userCity: user?.city }
  })

  // GET my events
  app.get('/my', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const events = await prisma.playdateEvent.findMany({
      where: { creator_email: email },
      include: { invitations: true },
      orderBy: { created_at: 'desc' },
    })
    const invitations = await prisma.playdateInvitation.findMany({
      where: { invitee_email: email },
      include: { event: true },
      orderBy: { created_at: 'desc' },
    })
    return { events, invitations }
  })

  // POST create event
  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return reply.code(404).send({ message: 'User not found' })

    const { title, description, event_type, date, time, duration_minutes, location, city, latitude, longitude, max_participants, pet_types, is_public } = req.body as any
    if (!title || !date || !time || !location || !city) return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })

    const event = await prisma.playdateEvent.create({
      data: {
        creator_email: email,
        creator_name: user.full_name,
        creator_photo: user.profile_photo,
        title, description, event_type: event_type || 'meetup',
        date, time,
        duration_minutes: duration_minutes || 60,
        location, city,
        latitude: latitude || null,
        longitude: longitude || null,
        max_participants: max_participants || 10,
        pet_types: pet_types || [],
        is_public: is_public !== false,
      }
    })
    return reply.code(201).send(event)
  })

  // POST invite user to event
  //
  // Accepts invitee_id (the id returned by the nearby list) or invitee_email.
  // The id path exists because the nearby list no longer hands out addresses;
  // an organiser who already knows someone's email can still use that.
  app.post('/:eventId/invite', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const { eventId } = req.params as any
    const { invitee_id, invitee_email, message } = req.body as any

    if (!invitee_id && !invitee_email) {
      return reply.code(400).send({ message: 'Λείπει ο παραλήπτης' })
    }

    const event = await prisma.playdateEvent.findUnique({ where: { id: eventId } })
    if (!event) return reply.code(404).send({ message: 'Event not found' })
    if (event.creator_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })

    const invitee = invitee_id
      ? await prisma.user.findUnique({ where: { id: String(invitee_id) } })
      : await prisma.user.findUnique({ where: { email: String(invitee_email).toLowerCase() } })
    if (!invitee) return reply.code(404).send({ message: 'Χρήστης δεν βρέθηκε' })

    if (invitee.email === email) {
      return reply.code(400).send({ message: 'Δεν μπορείς να προσκαλέσεις τον εαυτό σου' })
    }

    const pets = await prisma.pet.findMany({ where: { owner_email: invitee.email }, take: 1 })

    const inv = await prisma.playdateInvitation.upsert({
      where: { event_id_invitee_email: { event_id: eventId, invitee_email: invitee.email } },
      create: {
        event_id: eventId,
        invitee_email: invitee.email,
        invitee_name: invitee.full_name,
        invitee_photo: invitee.profile_photo,
        pet_name: pets[0]?.name || null,
        message: message ? String(message).slice(0, 500) : null,
      },
      update: { status: 'pending', message: message ? String(message).slice(0, 500) : null },
    })
    return inv
  })

  // PATCH respond to invitation
  app.patch('/invitation/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const { id } = req.params as any
    const { status } = req.body as any

    const inv = await prisma.playdateInvitation.findUnique({ where: { id } })
    if (!inv) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    if (inv.invitee_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    if (!['accepted', 'declined'].includes(status)) return reply.code(400).send({ message: 'Μη έγκυρο status' })

    const updated = await prisma.playdateInvitation.update({ where: { id }, data: { status } })
    return updated
  })

  // DELETE event
  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const event = await prisma.playdateEvent.findUnique({ where: { id: req.params.id } })
    if (!event) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    if (event.creator_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.playdateEvent.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })
}

export default routes
