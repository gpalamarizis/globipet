import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

// WebSocket clients map
const clients = new Map<string, any>()

const notificationsRoutes: FastifyPluginAsync = async (app) => {

  // WebSocket endpoint for real-time
  app.get('/ws', { websocket: true } as any, (socket: any, req: any) => {
    const userId = (req.query as any)?.userId
    if (userId) clients.set(userId, socket)

    socket.on('message', (raw: any) => {
      try {
        const msg = JSON.parse(raw.toString())
        if (msg.type === 'ping') socket.send(JSON.stringify({ type: 'pong' }))
        if (msg.type === 'location_update') {
          // Broadcast GPS update to relevant clients
          broadcastToUser(msg.userId, { type: 'location_update', ...msg })
        }
      } catch {}
    })

    socket.on('close', () => { if (userId) clients.delete(userId) })
    socket.send(JSON.stringify({ type: 'connected', userId }))
  })

  // Get notifications
  app.get('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const notifications = await prisma.notification.findMany({
      where: { user_id: (req.user as any).id },
      orderBy: { created_at: 'desc' },
      take: 20,
    })
    return { data: notifications }
  })

  // Mark as read
  app.patch('/:id/read', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    await prisma.notification.update({ where: { id: req.params.id }, data: { is_read: true } })
    return { success: true }
  })

  // Mark all as read
  app.patch('/read-all', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    await prisma.notification.updateMany({
      where: { user_id: (req.user as any).id, is_read: false },
      data: { is_read: true }
    })
    return { success: true }
  })

  // Send notification (internal)
  app.post('/send', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { user_id, title, message, type } = req.body as any
    const notification = await prisma.notification.create({
      data: { user_id, title, message, type: type || 'info' }
    })
    // Push to WebSocket if connected
    broadcastToUser(user_id, { type: 'notification', notification })
    return notification
  })
}

export function broadcastToUser(userId: string, data: any) {
  const socket = clients.get(userId)
  if (socket && socket.readyState === 1) {
    socket.send(JSON.stringify(data))
  }
}

export default notificationsRoutes
