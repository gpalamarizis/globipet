import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { identityOf } from '../lib/userName.js'
import { coordsFromBody } from '../lib/geocode.js'

/**
 * Χωρίς email τρίτων. Η λίστα έδινε σε κάθε συνδεδεμένο το creator_email κάθε
 * βόλτας και το invitee_email κάθε συμμετέχοντα. Η εφαρμογή χρειάζεται μόνο
 * «δική μου;» (is_mine) και «συμμετέχω;» (is_me ανά συμμετοχή).
 */
function publicInvitation<T extends { invitee_email?: string | null }>(i: T, viewer: string) {
  const { invitee_email, ...rest } = i
  return { ...rest, is_me: invitee_email === viewer }
}
function publicPlaydate<T extends { creator_email?: string | null; invitations?: any[] }>(e: T, viewer: string) {
  const { creator_email, invitations, ...rest } = e
  return {
    ...rest,
    is_mine: creator_email === viewer,
    ...(invitations ? { invitations: invitations.map(i => publicInvitation(i, viewer)) } : {}),
  }
}

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
          // Το invitee_email διαβάζεται μόνο για το is_me (αν ο χρήστης
          // συμμετέχει ήδη)· δεν επιστρέφεται (publicPlaydate).
          invitations: {
            where: { status: 'accepted' },
            select: { invitee_email: true, invitee_name: true, invitee_photo: true, pet_name: true },
          }
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

    return { events: events.map(e => publicPlaydate(e, email)), nearbyOwners, userCity: user?.city }
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
    // Δικές μου βόλτες: το creator_email είναι δικό μου, αλλά οι συμμετέχοντες
    // δεν δίνονται με email (όσοι δήλωσαν μόνοι τους δεν το έδωσαν σε μένα).
    // Οι προσκλήσεις μου: χωρίς το email του δημιουργού.
    return {
      events: events.map(({ invitations, ...e }) => ({
        ...e, is_mine: true, invitations: invitations.map(i => publicInvitation(i, email)),
      })),
      invitations: invitations.map(({ event, ...i }) => ({
        ...i, is_me: true, event: event ? publicPlaydate(event, email) : event,
      })),
    }
  })

  // POST create event
  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return reply.code(404).send({ message: 'User not found' })

    const { title, description, event_type, date, time, duration_minutes, location, city, max_participants, pet_types, is_public } = req.body as any
    if (!title || !date || !time || !location) return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })

    /**
     * Ε17 — Πόλη. Οι νέες φόρμες τη συμπληρώνουν αυτόματα από τη γεωκωδικοποίηση
     * του σημείου συνάντησης (/geocode → city). Αν δεν προέκυψε και ο χρήστης
     * δεν την έγραψε, χρησιμοποιείται η πόλη του προφίλ του: η λίστα «κοντά
     * σου» (GET / παραπάνω) φιλτράρει με την πόλη, οπότε δεν μένει ποτέ κενή.
     * Η εγκατεστημένη εφαρμογή στέλνει πάντα city — καμία αλλαγή γι' αυτήν.
     */
    const finalCity = (typeof city === 'string' ? city.trim() : '') || (user.city ?? '').trim()
    if (!finalCity) return reply.code(400).send({ message: 'Συμπλήρωσε την πόλη της βόλτας' })

    // Συντεταγμένες σημείου: ίδιος έλεγχος με τις υπηρεσίες (και τα δύο ή κανένα,
    // εντός ορίων). Πριν, ένα string εδώ έριχνε 500 από την Prisma.
    const coords = coordsFromBody(req.body)
    if ('error' in coords) return reply.code(400).send({ message: coords.error })
    const posInt = (v: any) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : undefined }

    const event = await prisma.playdateEvent.create({
      data: {
        creator_email: email,
        creator_name: user.full_name,
        creator_photo: user.profile_photo,
        title, description, event_type: event_type || 'meetup',
        date, time,
        duration_minutes: posInt(duration_minutes) ?? 60,
        location, city: finalCity,
        latitude: coords.data.latitude ?? null,
        longitude: coords.data.longitude ?? null,
        max_participants: posInt(max_participants) ?? 10,
        pet_types: pet_types || [],
        is_public: is_public !== false,
      }
    })
    return reply.code(201).send(event)
  })

  /**
   * Δήλωση συμμετοχής από τον ίδιο τον χρήστη.
   *
   * Το mobile καλούσε POST /:id/join από την αρχή. Τέτοιο endpoint δεν
   * υπήρξε ποτέ — οι βόλτες δούλευαν μόνο με πρόσκληση από τον δημιουργό,
   * οπότε το κουμπί «Συμμετοχή» δεν έκανε τίποτα.
   *
   * Δημιουργείται εγγραφή σε κατάσταση accepted: ο χρήστης δεν χρειάζεται
   * να αποδεχτεί πρόσκληση που έστειλε ο εαυτός του.
   */
  app.post('/:eventId/join', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const { eventId } = req.params as any

    const event = await prisma.playdateEvent.findUnique({ where: { id: eventId } })
    if (!event) return reply.code(404).send({ message: 'Η βόλτα δεν βρέθηκε' })
    if (event.status !== 'active') {
      return reply.code(400).send({ message: 'Η βόλτα δεν δέχεται πλέον συμμετοχές' })
    }
    if (event.creator_email === email) {
      return reply.code(400).send({ message: 'Είσαι ήδη ο διοργανωτής' })
    }

    const accepted = await prisma.playdateInvitation.count({
      where: { event_id: eventId, status: 'accepted' },
    })
    if (event.max_participants && accepted >= event.max_participants) {
      return reply.code(409).send({ message: 'Συμπληρώθηκε ο αριθμός συμμετεχόντων' })
    }

    const pets = await prisma.pet.findMany({ where: { owner_email: email }, take: 1 })
    // Το JWT δεν έχει όνομα/φωτογραφία: από τη βάση (lib/userName).
    const me = await identityOf(email)

    const inv = await prisma.playdateInvitation.upsert({
      where: { event_id_invitee_email: { event_id: eventId, invitee_email: email } },
      create: {
        event_id: eventId,
        invitee_email: email,
        invitee_name: me.name,
        invitee_photo: me.photo,
        pet_name: pets[0]?.name || null,
        status: 'accepted',
      },
      update: { status: 'accepted' },
    })
    return reply.code(201).send({ data: inv })
  })

  /** Αποχώρηση. */
  app.delete('/:eventId/join', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const deleted = await prisma.playdateInvitation.deleteMany({
      where: { event_id: req.params.eventId, invitee_email: email },
    })
    if (deleted.count === 0) return reply.code(404).send({ message: 'Δεν συμμετέχεις' })
    return reply.code(204).send()
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
    // Με email: ΙΔΙΑ απάντηση είτε υπάρχει λογαριασμός είτε όχι — αλλιώς το
    // endpoint έλεγε σε κάθε διοργανωτή ποια email είναι εγγεγραμμένα.
    // Αν δεν υπάρχει, απλώς δεν δημιουργείται πρόσκληση.
    // (Με invitee_id από τη λίστα «κοντά σου» δεν διαρρέει email, οπότε το 404 μένει.)
    const byEmail = !invitee_id
    if (!invitee) {
      if (byEmail) return { ok: true }
      return reply.code(404).send({ message: 'Χρήστης δεν βρέθηκε' })
    }

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
    if (byEmail) return { ok: true }
    // Πρόσκληση με invitee_id: η απάντηση δεν πρέπει να «μεταφράζει» το id
    // της λίστας «κοντά σου» σε email.
    return publicInvitation(inv, email)
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
