import type { FastifyPluginAsync } from 'fastify'
import { langOf, notifyTitle, notifyMsg } from '../lib/notifyText.js'
import prisma from '../lib/prisma.js'
import { blockedEmailsFor, withoutBlocked } from '../lib/blocks.js'
import { isAllowedImageUrl } from '../lib/storage.js'
import { sendPushToUser } from '../lib/push.js'
import { geocodeAddress } from '../lib/geocode.js'

// Haversine formula για απόσταση σε km
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

/**
 * Rough bounding box around a point, used to narrow a query before the exact
 * Haversine filter runs. One degree of latitude is ~111 km everywhere;
 * longitude degrees shrink with latitude, hence the cosine.
 *
 * This exists so we can ask the database for candidates instead of loading
 * every row and filtering in JavaScript.
 */
function boundingBox(lat: number, lng: number, radiusKm: number) {
  const latDelta = radiusKm / 111
  const lngDelta = radiusKm / (111 * Math.max(Math.cos(lat * Math.PI / 180), 0.01))
  return {
    minLat: lat - latDelta, maxLat: lat + latDelta,
    minLng: lng - lngDelta, maxLng: lng + lngDelta,
  }
}

// Geocoding με Nominatim — κοινή συνάρτηση (ουρά 1 αίτημα/δευτ., cache) στο lib/geocode.
// Οι κοινότητες μένουν, όπως πριν, περιορισμένες στην Ελλάδα.
const geocode = (address: string) => geocodeAddress(address, 'gr')

/**
 * Μηνύματα χωρίς email συντάκτη. Κάθε μέλος έβλεπε το author_email όλων των
 * άλλων· το μόνο που χρειάζεται η εφαρμογή είναι «δικό μου;» (στοίχιση
 * φούσκας), που υπολογίζεται εδώ ως is_mine.
 */
function publicMessage<T extends { author_email: string }>(m: T, viewer: string) {
  const { author_email, ...rest } = m
  return { ...rest, is_mine: author_email === viewer }
}

const routes: FastifyPluginAsync = async (app) => {

  // GET nearby communities by lat/lng or user's location
  app.get('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const { lat, lng, radius } = req.query as any

    const user = await prisma.user.findUnique({
      where: { email },
      select: { latitude: true, longitude: true },
    })
    const userLat = lat ? parseFloat(lat) : user?.latitude
    const userLng = lng ? parseFloat(lng) : user?.longitude
    const searchRadius = Math.min(Math.max(parseFloat(radius) || 5, 0.1), 100)

    // Member lists are not needed to render the browse view — only the count,
    // which the row already carries. Loading every member of every community
    // meant handing out the email address of everyone on the platform.
    const baseSelect = {
      id: true, name: true, description: true, city: true, address: true,
      latitude: true, longitude: true, radius_km: true, image_url: true,
      member_count: true, creator_name: true, created_at: true,
      _count: { select: { messages: true } },
      // Μόνο η δική μου εγγραφή μέλους (0 ή 1 γραμμή), για το isMember.
      // Χωρίς αυτό η λίστα δεν ήξερε αν ο χρήστης είναι ήδη μέλος και το
      // κουμπί έλεγε πάντα «Συμμετοχή». Δεν επιστρέφεται ως έχει.
      members: { where: { user_email: email }, select: { role: true }, take: 1 },
    }
    // Προσθετικό πεδίο: isMember (και myRole). Τα υπόλοιπα πεδία μένουν ίδια.
    const withMembership = <T extends { members: { role: string }[] }>({ members, ...c }: T) =>
      ({ ...c, isMember: members.length > 0, myRole: members[0]?.role ?? null })

    if (Number.isFinite(userLat) && Number.isFinite(userLng)) {
      const box = boundingBox(userLat!, userLng!, searchRadius)
      const candidates = await prisma.community.findMany({
        where: {
          latitude:  { gte: box.minLat, lte: box.maxLat },
          longitude: { gte: box.minLng, lte: box.maxLng },
        },
        select: baseSelect,
        take: 500,
      })
      const nearby = candidates
        .map(withMembership)
        .map(c => ({ ...c, distance: getDistance(userLat!, userLng!, c.latitude, c.longitude) }))
        .filter(c => c.distance <= searchRadius)
        .sort((a, b) => a.distance - b.distance)
      return { communities: nearby, userLat, userLng }
    }

    // No location known — return a recent page rather than the whole table.
    const all = await prisma.community.findMany({
      select: baseSelect,
      orderBy: { created_at: 'desc' },
      take: 100,
    })
    return { communities: all.map(withMembership), userLat: null, userLng: null }
  })

  // Geocode helper. Declared before /:id for readability; Fastify matches
  // static segments ahead of parametric ones regardless of order.
  app.get('/geocode', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { address } = req.query as any
    if (!address || String(address).trim().length < 3) {
      return reply.code(400).send({ message: 'Δώσε διεύθυνση' })
    }
    const result = await geocode(String(address).slice(0, 200))
    return result || { error: 'Δεν βρέθηκε' }
  })

  /**
   * Single community.
   *
   * The previous version fetched the message history and returned it to
   * anyone who asked, alongside an `isMember` flag the client was trusted to
   * respect. The conversation of every neighbourhood group was readable by
   * any logged-in user who knew the id. Messages are now only included for
   * actual members.
   */
  app.get('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any

    const community = await prisma.community.findUnique({
      where: { id: req.params.id },
      include: {
        members: { select: { id: true, user_email: true, user_name: true, user_photo: true, role: true } },
      }
    })
    if (!community) return reply.code(404).send({ message: 'Δεν βρέθηκε' })

    const isMember = community.members.some(m => m.user_email === email)

    // Κανένα email προς κανέναν: ούτε του δημιουργού (το έβλεπαν και μη μέλη)
    // ούτε των μελών (κάθε μέλος έβλεπε το email όλων). Αντί για αυτά:
    // is_me ανά μέλος και is_creator για την κοινότητα.
    const { members, creator_email, ...publicFields } = community
    const roster = members.map(m => ({
      id: m.id, user_name: m.user_name, user_photo: m.user_photo, role: m.role, is_me: m.user_email === email,
    }))

    if (!isMember) {
      // Non-members see the community exists and who runs it, but not the
      // roster's email addresses and not the conversation.
      return {
        ...publicFields,
        is_creator: creator_email === email,
        members: roster,
        messages: [],
        isMember: false,
      }
    }

    const messages = await prisma.communityMessage.findMany({
      where: { community_id: community.id },
      orderBy: { created_at: 'asc' },
      take: 100,
    })
    return {
      ...publicFields,
      is_creator: creator_email === email,
      members: roster,
      messages: withoutBlocked(messages, await blockedEmailsFor(email)).map(m => publicMessage(m, email)),
      isMember: true,
    }
  })

  // POST create community
  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return reply.code(404).send({ message: 'User not found' })

    const { name, description, address, city, latitude, longitude, radius_km, image_url } = req.body as any
    if (!name || !city) return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })
    // Εικόνα μόνο από το δικό μας R2 (lib/storage.ts isAllowedImageUrl).
    if (!isAllowedImageUrl(image_url)) return reply.code(400).send({ message: 'Μη έγκυρη διεύθυνση φωτογραφίας' })

    const radius = Math.min(Math.max(parseFloat(radius_km) || 1.0, 0.1), 50)

    let lat = latitude != null ? parseFloat(latitude) : null
    let lng = longitude != null ? parseFloat(longitude) : null

    // Geocode αν δεν έχουμε coordinates
    if (!Number.isFinite(lat!) || !Number.isFinite(lng!)) {
      const geo = await geocode(address || city)
      if (geo) { lat = geo.lat; lng = geo.lon }
      else return reply.code(400).send({ message: 'Δεν βρέθηκαν συντεταγμένες για αυτή τη διεύθυνση' })
    }

    const community = await prisma.community.create({
      data: {
        creator_email: email,
        creator_name: user.full_name,
        name, description, address, city,
        latitude: lat!, longitude: lng!,
        radius_km: radius,
        image_url: image_url || null,
        member_count: 1,
        members: {
          create: { user_email: email, user_name: user.full_name, user_photo: user.profile_photo, role: 'admin' }
        }
      },
      include: { members: true }
    })

    /**
     * Notify nearby users.
     *
     * This previously ran `user.findMany({ where: { email: { not: email } } })`
     * — every row of the users table, every column, loaded into memory so the
     * distance could be computed in JavaScript. On top of the memory cost that
     * pulled password hashes and encrypted contact details into the process
     * for a notification feature.
     *
     * The bounding box narrows it in the database and only two columns come
     * back.
     */
    const box = boundingBox(lat!, lng!, radius)
    const candidates = await prisma.user.findMany({
      where: {
        email: { not: email },
        latitude:  { gte: box.minLat, lte: box.maxLat },
        longitude: { gte: box.minLng, lte: box.maxLng },
      },
      select: { email: true, latitude: true, longitude: true, preferred_language: true },
      take: 1000,
    })

    const toInvite = candidates.filter(u =>
      u.latitude != null && u.longitude != null &&
      getDistance(lat!, lng!, u.latitude, u.longitude) <= radius
    )

    if (toInvite.length > 0) {
      // Κάθε παραλήπτης στη ΔΙΚΗ ΤΟΥ γλώσσα. Η γλώσσα έρχεται από το ίδιο
      // ερώτημα παραπάνω, οπότε δεν υπάρχει επιπλέον κόστος ανά χρήστη.
      await prisma.notification.createMany({
        data: toInvite.map(u => ({
          user_email: u.email,
          title: notifyTitle('community', langOf(u.preferred_language)),
          message: notifyMsg.communityCreated(langOf(u.preferred_language), name),
          type: 'community',
          link: `/communities/${community.id}`,
        }))
      })
      // Το createMany δεν επιστρέφει εγγραφές, οπότε η αποστολή γίνεται με
      // βρόχο. Δεν περιμένουμε καμία: ο χρήστης που δημιουργεί την κοινότητα
      // δεν έχει λόγο να περιμένει τις ειδοποιήσεις των άλλων.
      for (const u of toInvite) {
        void sendPushToUser(u.email, {
          title: 'Νέα κοινότητα κοντά σου!',
          body: `Η κοινότητα "${name}" δημιουργήθηκε κοντά σου. Γίνε μέλος!`,
          url: `/communities/${community.id}`,
        })
      }
    }

    // Χωρίς nearbyInvited: ο αριθμός έδειχνε σε όποιον φτιάχνει κοινότητα πόσοι
    // χρήστες μένουν σε κάθε ακτίνα — με μικρή ακτίνα, αν μένει κάποιος σε ένα σπίτι.
    // Το web το διαβάζει προαιρετικά (απουσία = χωρίς επιπλέον κείμενο).
    return reply.code(201).send(community)
  })

  /**
   * Join. member_count is recomputed from the membership rows rather than
   * incremented, because the previous version bumped the counter on every
   * call — including when the upsert changed nothing because the caller was
   * already a member.
   */
  app.post('/:id/join', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return reply.code(404).send({ message: 'User not found' })

    const community = await prisma.community.findUnique({ where: { id: req.params.id } })
    if (!community) return reply.code(404).send({ message: 'Δεν βρέθηκε' })

    await prisma.communityMember.upsert({
      where: { community_id_user_email: { community_id: req.params.id, user_email: email } },
      create: { community_id: req.params.id, user_email: email, user_name: user.full_name, user_photo: user.profile_photo },
      update: {},
    })

    const member_count = await prisma.communityMember.count({ where: { community_id: req.params.id } })
    await prisma.community.update({ where: { id: req.params.id }, data: { member_count } })

    return { success: true, member_count }
  })

  // Leave. Same recount, so the counter cannot drift below zero.
  app.delete('/:id/leave', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    await prisma.communityMember.deleteMany({
      where: { community_id: req.params.id, user_email: email }
    })
    const member_count = await prisma.communityMember.count({ where: { community_id: req.params.id } })
    await prisma.community.update({ where: { id: req.params.id }, data: { member_count } })
    return reply.code(204).send()
  })

  // POST send message
  app.post('/:id/messages', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return reply.code(404).send({ message: 'User not found' })

    const member = await prisma.communityMember.findUnique({
      where: { community_id_user_email: { community_id: req.params.id, user_email: email } }
    })
    if (!member) return reply.code(403).send({ message: 'Δεν είστε μέλος' })

    const { content, image_url } = req.body as any
    if (!content && !image_url) return reply.code(400).send({ message: 'Κενό μήνυμα' })
    if (!isAllowedImageUrl(image_url)) return reply.code(400).send({ message: 'Μη έγκυρη διεύθυνση φωτογραφίας' })

    const message = await prisma.communityMessage.create({
      data: {
        community_id: req.params.id,
        author_email: email,
        author_name: user.full_name,
        author_photo: user.profile_photo,
        content: content ? String(content).slice(0, 4000) : content,
        image_url: image_url || null,
      }
    })
    return reply.code(201).send({ ...message, is_mine: true })
  })

  // GET messages
  app.get('/:id/messages', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const { before, limit } = req.query as any

    const member = await prisma.communityMember.findUnique({
      where: { community_id_user_email: { community_id: req.params.id, user_email: email } }
    })
    if (!member) return reply.code(403).send({ message: 'Δεν είστε μέλος' })

    const take = Math.min(Math.max(parseInt(limit) || 50, 1), 100)
    const messages = await prisma.communityMessage.findMany({
      where: {
        community_id: req.params.id,
        ...(before ? { created_at: { lt: new Date(before) } } : {}),
      },
      orderBy: { created_at: 'desc' },
      take,
    })
    return { messages: withoutBlocked(messages.reverse(), await blockedEmailsFor(email)).map(m => publicMessage(m, email)) }
  })
}

export default routes
