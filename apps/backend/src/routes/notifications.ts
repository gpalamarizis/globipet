import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

/**
 * Connected WebSocket clients, keyed by the authenticated user's EMAIL.
 *
 * Email is the key because every notification row is keyed by user_email and
 * every caller across the codebase (orders, bookings, telehealth, webhooks)
 * passes an email to broadcastToUser.
 *
 * A user may have several tabs or devices open, so each email maps to a set
 * of sockets rather than a single one. The previous single-socket map meant
 * opening a second tab silently killed delivery to the first.
 */
const clients = new Map<string, Set<any>>()

function addClient(email: string, socket: any) {
  let set = clients.get(email)
  if (!set) { set = new Set(); clients.set(email, set) }
  set.add(socket)
}

function removeClient(email: string, socket: any) {
  const set = clients.get(email)
  if (!set) return
  set.delete(socket)
  if (set.size === 0) clients.delete(email)
}

const notificationsRoutes: FastifyPluginAsync = async (app) => {

  /**
   * WebSocket endpoint for real-time notifications.
   *
   * AUTHENTICATION
   *   The previous version read the identity straight from `?userId=` with no
   *   verification, so connecting as `?userId=victim@example.com` streamed
   *   that person's notifications to anyone who asked. The identity now comes
   *   from a verified JWT and the query parameter is ignored entirely.
   *
   *   Browsers cannot set headers on a WebSocket handshake, so the token is
   *   passed as `?token=<jwt>`.
   */
  app.get('/ws', { websocket: true } as any, (socket: any, req: any) => {
    let email: string | null = null
    try {
      const token = (req.query as any)?.token
      if (!token) throw new Error('missing token')
      const payload = (app as any).jwt.verify(token) as any
      email = payload?.email ?? null
      if (!email) throw new Error('token has no email')
    } catch {
      socket.send(JSON.stringify({ type: 'error', message: 'unauthorized' }))
      socket.close(1008, 'unauthorized')
      return
    }

    addClient(email, socket)

    socket.on('message', (raw: any) => {
      try {
        const msg = JSON.parse(raw.toString())
        if (msg.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }))
          return
        }
        if (msg.type === 'location_update') {
          // Echo the update back to this user's own sessions only.
          // Previously the target came from msg.userId, which let any connected
          // client push arbitrary payloads into any other user's socket.
          broadcastToUser(email!, {
            type: 'location_update',
            pet_id: msg.pet_id,
            latitude: msg.latitude,
            longitude: msg.longitude,
          })
        }
      } catch {}
    })

    socket.on('close', () => removeClient(email!, socket))
    socket.on('error', () => removeClient(email!, socket))
    socket.send(JSON.stringify({ type: 'connected' }))
  })

  // Get notifications
  app.get('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const notifications = await prisma.notification.findMany({
      where: { user_email: (req.user as any).email },
      orderBy: { created_at: 'desc' },
      take: 20,
    })
    return { data: notifications }
  })

  // Mark as read — scoped to the caller's own rows.
  // The previous version updated by id alone, so anyone could mark anyone
  // else's notifications as read.
  app.patch('/:id/read', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const updated = await prisma.notification.updateMany({
      where: { id: req.params.id, user_email: (req.user as any).email },
      data: { is_read: true },
    })
    if (updated.count === 0) {
      return reply.code(404).send({ message: 'Η ειδοποίηση δεν βρέθηκε' })
    }
    return { success: true }
  })

  // Mark all as read
  app.patch('/read-all', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    await prisma.notification.updateMany({
      where: { user_email: (req.user as any).email, is_read: false },
      data: { is_read: true }
    })
    return { success: true }
  })

  // Delete one of my notifications
  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const deleted = await prisma.notification.deleteMany({
      where: { id: req.params.id, user_email: (req.user as any).email },
    })
    if (deleted.count === 0) {
      return reply.code(404).send({ message: 'Η ειδοποίηση δεν βρέθηκε' })
    }
    return reply.code(204).send()
  })

  /**
   * Send a notification — administrators only.
   *
   * This was open to every logged-in user with a free-text title, message and
   * arbitrary recipient. That is a ready-made phishing channel: a notification
   * that looks like it came from GlobiPet, delivered inside the product, to
   * any address the sender chose. Server-side flows create notifications
   * directly through Prisma and never needed this endpoint.
   */
  app.post('/send', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    if ((req.user as any).role !== 'admin') {
      return reply.code(403).send({ message: 'Απαιτούνται δικαιώματα διαχειριστή' })
    }
    const { user_email, title, message, type, link } = req.body as any
    if (!user_email || !title || !message) {
      return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })
    }
    const notification = await prisma.notification.create({
      data: {
        user_email,
        title: String(title).slice(0, 200),
        message: String(message).slice(0, 1000),
        type: type || 'info',
        link: link || null,
      }
    })
    broadcastToUser(user_email, { type: 'notification', notification })
    return notification
  })
}

/**
 * Push a payload to a user's open sessions.
 * @param email the recipient's email, or '__all__' to reach every client.
 */
export function broadcastToUser(email: string, data: any) {
  const send = (socket: any) => {
    if (socket.readyState === 1) {
      try { socket.send(JSON.stringify(data)) } catch {}
    }
  }
  if (email === '__all__') {
    // Used for vet availability changes, which are public information.
    for (const set of clients.values()) set.forEach(send)
    return
  }
  clients.get(email)?.forEach(send)
}

export default notificationsRoutes
