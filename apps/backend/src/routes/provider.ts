import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const providerRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', async (req: any, reply) => {
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
    const providerEmail = (req.user as any).email

    const [bookings, services, reviews] = await Promise.all([
      prisma.booking.count({ where: { provider_email: providerEmail } }),
      prisma.service.count({ where: { provider_email: providerEmail } }),
      prisma.review.findMany({ where: { provider_email: providerEmail }, select: { rating: true } }),
    ])

    const revenueData = await prisma.booking.aggregate({
      where: { provider_email: providerEmail, status: 'completed' },
      _sum: { total_price: true }
    })

    const avgRating = reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null

    const products = await prisma.product.count({ where: { provider_email: providerEmail } })

    return {
      bookings,
      services,
      revenue: revenueData._sum.total_price?.toFixed(2) ?? '0',
      rating: avgRating ? `${avgRating} ★` : '—',
      products,
    }
  })

  // Provider bookings
  app.get('/bookings', async (req: any) => {
    const providerEmail = (req.user as any).email
    const bookings = await prisma.booking.findMany({
      where: { provider_email: providerEmail },
      orderBy: { booking_date: 'asc' },
      include: { service: true },
    })
    return { data: bookings }
  })

  // Update booking status
  app.patch('/bookings/:id', async (req: any) => {
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status: req.body.status }
    })
    return booking
  })
}

export default providerRoutes
