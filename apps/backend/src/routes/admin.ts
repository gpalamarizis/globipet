import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const adminRoutes: FastifyPluginAsync = async (app) => {
  // Middleware: only admins
  app.addHook('preHandler', async (req, reply) => {
    try {
      await (app as any).authenticate(req, reply)
      if ((req.user as any)?.role !== 'admin') {
        return reply.code(403).send({ message: 'Απαγορευμένη πρόσβαση' })
      }
    } catch {
      return reply.code(401).send({ message: 'Μη εξουσιοδοτημένος' })
    }
  })

  // Stats
  app.get('/stats', async () => {
    const [users, pets, orders, providers, products, bookings] = await Promise.all([
      prisma.user.count(),
      prisma.pet.count(),
      prisma.order.count(),
      prisma.user.count({ where: { role: 'service_provider' } }),
      prisma.product.count(),
      prisma.booking.count(),
    ])
    const revenueData = await prisma.order.aggregate({ _sum: { total_amount: true }, where: { status: 'delivered' } })
    return {
      users, pets, orders, providers, products, bookings,
      revenue: revenueData._sum.total_amount?.toFixed(2) ?? '0',
      total_records: users + pets + orders + products + bookings,
    }
  })

  // Get all users
  app.get('/users', async (req: any) => {
    const role = req.query.role
    const users = await prisma.user.findMany({
      where: role ? { role } : undefined,
      orderBy: { created_at: 'desc' },
      select: {
        id: true, full_name: true, email: true, role: true,
        profile_photo: true, is_active: true, is_verified: true,
        created_at: true,
      },
    })
    return { data: users }
  })

  // Update user
  app.patch('/users/:id', async (req: any) => {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: req.body,
    })
    return user
  })

  // Delete user
  app.delete('/users/:id', async (req: any, reply) => {
    await prisma.user.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })

  // Raw SQL query (admin only)
  app.post('/query', async (req: any, reply) => {
    const { sql } = req.body
    if (!sql) return reply.code(400).send({ message: 'Δεν δόθηκε SQL query' })

    // Basic safety check
    const dangerous = /\b(DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE)\b/i.test(sql)
    if (dangerous) return reply.code(400).send({ message: 'Επικίνδυνη εντολή SQL δεν επιτρέπεται' })

    const start = Date.now()
    try {
      const rows = await prisma.$queryRawUnsafe(sql)
      const duration = Date.now() - start
      return { rows: Array.isArray(rows) ? rows : [rows], rowCount: Array.isArray(rows) ? rows.length : 1, duration }
    } catch (err: any) {
      return reply.code(400).send({ message: err.message })
    }
  })
}

export default adminRoutes
