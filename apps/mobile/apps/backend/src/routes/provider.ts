import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const providerRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', async (req, reply) => {
    try {
      await (app as any).authenticate(req, reply)
      const user = req.user as any
      if (!['service_provider', 'both', 'admin'].includes(user?.role)) {
        return reply.code(403).send({ message: 'Απαγορευμένη πρόσβαση' })
      }
    } catch {
      return reply.code(401).send({ message: 'Μη εξουσιοδοτημένος' })
    }
  })

  // Provider stats
  app.get('/stats', async (req: any) => {
    const providerId = (req.user as any).id
    const [bookings, services, reviews] = await Promise.all([
      prisma.booking.count({ where: { provider_id: providerId } }),
      prisma.service.count({ where: { provider_id: providerId } }),
      prisma.review.findMany({ where: { provider_id: providerId }, select: { rating: true } }),
    ])
    const revenueData = await prisma.booking.aggregate({
      where: { provider_id: providerId, status: 'completed' },
      _sum: { total_price: true }
    })
    const avgRating = reviews.length > 0
      ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null

    return {
      bookings, services,
      revenue: revenueData._sum.total_price?.toFixed(2) ?? '0',
      rating: avgRating ? `${avgRating} ★` : '—',
      products: await prisma.product.count({ where: { provider_id: providerId } }),
    }
  })

  // Provider bookings
  app.get('/bookings', async (req: any) => {
    const bookings = await prisma.booking.findMany({
      where: { provider_id: (req.user as any).id },
      orderBy: { scheduled_at: 'asc' },
      include: { service: true, user: { select: { full_name: true, email: true, phone: true } } },
    })
    return { data: bookings }
  })

  // Update booking status
  app.patch('/bookings/:id', async (req: any) => {
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status: (req.body as any).status }
    })
    return booking
  })
}

export default providerRoutes
