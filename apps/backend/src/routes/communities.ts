import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

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

// Geocoding με Nominatim
async function geocode(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=gr`
    const res = await fetch(url, { headers: { 'User-Agent': 'GlobiPet/1.0 (gpal@oban.gr)' } })
    const data = await res.json() as any[]
    if (data.length === 0) return null
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
  } catch { return null }
}

const routes: FastifyPluginAsync = async (app) => {

  // GET nearby communities by lat/lng or user's location
  app.get('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const { lat, lng, radius } = req.query as any

    const user = await prisma.user.findUnique({ where: { email } })
    const userLat = lat ? parseFloat(lat) : (user as any)?.latitude
    const userLng = lng ? parseFloat(lng) : (user as any)?.longitude
    const searchRadius = radius ? parseFloat(radius) : 5

    const all = await prisma.community.findMany({
      include: {
        members: { select: { user_email: true, user_name: true, user_photo: true, role: true } },
        _count: { select: { messages: true } }
      },
      orderBy: { created_at: 'desc' },
    })

    if (userLat && userLng) {
      const nearby = all
        .map(c => ({ ...c, distance: getDistance(userLat, userLng, c.latitude, c.longitude) }))
        .filter(c => c.distance <= searchRadius)
        .sort((a, b) => a.distance - b.distance)
      return { communities: nearby, userLat, userLng }
    }

    return { communities: all, userLat: null, userLng: null }
  })

  // GET single community with messages
  app.get('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const community = await prisma.community.findUnique({
      where: { id: req.params.id },
      include: {
        members: { select: { user_email: true, user_name: true, user_photo: true, role: true } },
        messages: { orderBy: { created_at: 'asc' }, take: 100 }
      }
    })
    if (!community) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    const isMember = community.members.some(m => m.user_email === email)
    return { ...community, isMember }
  })

  // POST create community
  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return reply.code(404).send({ message: 'User not found' })

    const { name, description, address, city, latitude, longitude, radius_km, image_url } = req.body as any
    if (!name || !city) return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })

    let lat = latitude
    let lng = longitude

    // Geocode αν δεν έχουμε coordinates
    if (!lat || !lng) {
      const geo = await geocode(address || city)
      if (geo) { lat = geo.lat; lng = geo.lon }
      else return reply.code(400).send({ message: 'Δεν βρέθηκαν συντεταγμένες για αυτή τη διεύθυνση' })
    }

    const community = await prisma.community.create({
      data: {
        creator_email: email,
        creator_name: user.full_name,
        name, description, address, city,
        latitude: lat, longitude: lng,
        radius_km: radius_km || 1.0,
        image_url,
        member_count: 1,
        members: {
          create: { user_email: email, user_name: user.full_name, user_photo: user.profile_photo, role: 'admin' }
        }
      },
      include: { members: true }
    })

    // Auto-invite nearby users
    const nearbyUsers = await prisma.user.findMany({
      where: { email: { not: email } },
    })

    const toInvite = nearbyUsers.filter((u: any) =>
      u.latitude && u.longitude &&
      getDistance(lat, lng, u.latitude, u.longitude) <= (radius_km || 1.0)
    )

    // Create notifications for nearby users
    if (toInvite.length > 0) {
      await prisma.notification.createMany({
        data: toInvite.map((u: any) => ({
          user_email: u.email,
          title: 'Νέα κοινότητα κοντά σου!',
          message: `Η κοινότητα "${name}" δημιουργήθηκε κοντά σου. Γίνε μέλος!`,
          type: 'community',
          link: `/communities/${community.id}`,
        }))
      })
    }

    return reply.code(201).send({ ...community, nearbyInvited: toInvite.length })
  })

  // POST join community
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

    await prisma.community.update({
      where: { id: req.params.id },
      data: { member_count: { increment: 1 } }
    })

    return { success: true }
  })

  // POST leave community
  app.delete('/:id/leave', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    await prisma.communityMember.deleteMany({
      where: { community_id: req.params.id, user_email: email }
    })
    await prisma.community.update({
      where: { id: req.params.id },
      data: { member_count: { decrement: 1 } }
    })
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

    const message = await prisma.communityMessage.create({
      data: {
        community_id: req.params.id,
        author_email: email,
        author_name: user.full_name,
        author_photo: user.profile_photo,
        content, image_url,
      }
    })
    return reply.code(201).send(message)
  })

  // GET messages
  app.get('/:id/messages', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const { before, limit } = req.query as any

    const member = await prisma.communityMember.findUnique({
      where: { community_id_user_email: { community_id: req.params.id, user_email: email } }
    })
    if (!member) return reply.code(403).send({ message: 'Δεν είστε μέλος' })

    const messages = await prisma.communityMessage.findMany({
      where: {
        community_id: req.params.id,
        ...(before ? { created_at: { lt: new Date(before) } } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: limit ? parseInt(limit) : 50,
    })
    return { messages: messages.reverse() }
  })

  // Geocode endpoint
  app.get('/geocode', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { address } = req.query as any
    const result = await geocode(address)
    return result || { error: 'Δεν βρέθηκε' }
  })
}

export default routes
