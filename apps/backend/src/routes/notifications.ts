import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { audit } from '../lib/audit.js'

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

  /**
   * List notifications.
   *
   * `?unread=true` returns only unread rows. The header badge has been asking
   * for that all along, but the filter was never implemented — so the count
   * was simply "the last twenty notifications", read or not, and the red dot
   * never went away.
   */
  app.get('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { unread, limit } = req.query ?? {}
    const onlyUnread = unread === 'true' || unread === '1'
    const take = Math.min(Math.max(parseInt(limit) || 20, 1), 100)

    const where: any = { user_email: (req.user as any).email }
    if (onlyUnread) where.is_read = false

    const [notifications, unread_count] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take,
      }),
      prisma.notification.count({
        where: { user_email: (req.user as any).email, is_read: false },
      }),
    ])
    return { data: notifications, unread_count }
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

  // ═══════════════════════════════════════════════════════════════════
  //  Ειδοποιήσεις push — συσκευές εκτός εφαρμογής
  //
  //  Τα παραπάνω endpoints αφορούν ειδοποιήσεις ΜΕΣΑ στην εφαρμογή, μέσω
  //  WebSocket: φτάνουν μόνο όσο ο χρήστης έχει ανοιχτή καρτέλα. Τα παρακάτω
  //  αφορούν ειδοποιήσεις που φτάνουν όταν η εφαρμογή είναι ΚΛΕΙΣΤΗ.
  //
  //  Μία εγγραφή ανά συσκευή. Ο ίδιος άνθρωπος έχει κινητό, tablet και δύο
  //  browsers — και θέλει την ειδοποίηση σε όλα.
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Το δημόσιο κλειδί VAPID, που χρειάζεται ο browser για να δημιουργήσει
   * συνδρομή. Είναι δημόσιο εξ ορισμού — το ιδιωτικό μένει στον server και
   * δεν φεύγει ποτέ από εκεί.
   */
  app.get('/push/public-key', async (_req, reply) => {
    const key = process.env.VAPID_PUBLIC_KEY
    if (!key) {
      return reply.code(503).send({ message: 'Οι ειδοποιήσεις web δεν έχουν ρυθμιστεί' })
    }
    return { public_key: key }
  })

  /**
   * Δήλωση συσκευής.
   *
   *   mobile → { platform: 'ios' | 'android', token: 'ExponentPushToken[...]' }
   *   web    → { platform: 'web', endpoint, keys: { p256dh, auth } }
   *
   * Είναι idempotent: η ίδια συσκευή που ξαναδηλώνεται δεν δημιουργεί δεύτερη
   * εγγραφή, ανανεώνει την υπάρχουσα. Αν η συσκευή είχε δηλωθεί από άλλον
   * χρήστη — κοινό τηλέφωνο, κοινός υπολογιστής — η εγγραφή ΜΕΤΑΦΕΡΕΤΑΙ στον
   * νέο, ώστε να μη λαμβάνει τις ειδοποιήσεις του προηγούμενου.
   */
  app.post('/push/register', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { platform, token, endpoint, keys, device_name } = (req.body ?? {}) as any
    const user_id = (req.user as any).id

    if (!['ios', 'android', 'web'].includes(platform)) {
      return reply.code(400).send({ message: 'Άγνωστος τύπος συσκευής' })
    }

    const name = device_name ? String(device_name).slice(0, 120) : null
    const now = new Date()

    if (platform === 'web') {
      const p256dh = keys?.p256dh
      const auth = keys?.auth
      if (typeof endpoint !== 'string' || !endpoint.startsWith('https://') || !p256dh || !auth) {
        return reply.code(400).send({ message: 'Ελλιπή στοιχεία συνδρομής' })
      }
      const row = await prisma.pushSubscription.upsert({
        where: { endpoint },
        create: {
          user_id, platform, endpoint,
          p256dh: String(p256dh), auth: String(auth), device_name: name,
        },
        update: {
          user_id, p256dh: String(p256dh), auth: String(auth),
          device_name: name, last_seen_at: now,
        },
      })
      await audit(req, { action: 'push_subscribe', resource: 'push_subscription', resource_id: row.id, metadata: { platform } })
      return reply.code(201).send({ data: { id: row.id } })
    }

    // Τα τοκεν του Expo έχουν σταθερή μορφή. Ο έλεγχος κρατάει έξω σκουπίδια
    // που θα κατέληγαν σε αποτυχημένες αποστολές για πάντα.
    if (typeof token !== 'string' || !/^Expo(nent)?PushToken\[.+\]$/.test(token)) {
      return reply.code(400).send({ message: 'Μη έγκυρο token συσκευής' })
    }

    const row = await prisma.pushSubscription.upsert({
      where: { expo_token: token },
      create: { user_id, platform, expo_token: token, device_name: name },
      update: { user_id, platform, device_name: name, last_seen_at: now },
    })
    await audit(req, { action: 'push_subscribe', resource: 'push_subscription', resource_id: row.id, metadata: { platform } })
    return reply.code(201).send({ data: { id: row.id } })
  })

  /**
   * Διαγραφή συσκευής — τρέχει στην αποσύνδεση.
   *
   * Περιορίζεται στις εγγραφές του ίδιου του καλούντος. Αλλιώς οποιοσδήποτε
   * θα μπορούσε να σβήσει τη συνδρομή άλλου στέλνοντας το τοκεν του, και να
   * τον αποκόψει σιωπηλά από κάθε ειδοποίηση.
   */
  app.delete('/push/register', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { token, endpoint } = (req.body ?? {}) as any
    if (!token && !endpoint) {
      return reply.code(400).send({ message: 'Λείπει το token ή το endpoint' })
    }
    const deleted = await prisma.pushSubscription.deleteMany({
      where: {
        user_id: (req.user as any).id,
        ...(token ? { expo_token: String(token) } : { endpoint: String(endpoint) }),
      },
    })
    if (deleted.count === 0) {
      return reply.code(404).send({ message: 'Η συσκευή δεν βρέθηκε' })
    }
    await audit(req, { action: 'push_unsubscribe', resource: 'push_subscription', resource_id: (req.user as any).id, metadata: { count: deleted.count } })
    return reply.code(204).send()
  })

  /** Οι συσκευές μου — για οθόνη ρυθμίσεων «πού λαμβάνω ειδοποιήσεις». */
  app.get('/push/devices', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const devices = await prisma.pushSubscription.findMany({
      where: { user_id: (req.user as any).id },
      // Τα endpoint και τα κλειδιά ΔΕΝ επιστρέφονται: είναι διαπιστευτήρια
      // αποστολής, όχι πληροφορία που χρειάζεται η οθόνη.
      select: { id: true, platform: true, device_name: true, last_seen_at: true, created_at: true },
      orderBy: { last_seen_at: 'desc' },
    })
    return { data: devices }
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
