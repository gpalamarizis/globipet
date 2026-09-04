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

  // Update booking status.
  //
  // The previous version updated by id alone with whatever string arrived in
  // the body. Any provider could rewrite any other provider's bookings — and
  // set the status to arbitrary text that no other code path understood.
  app.patch('/bookings/:id', async (req: any, reply) => {
    const user = req.user as any
    const existing = await prisma.booking.findUnique({ where: { id: req.params.id } })
    if (!existing) return reply.code(404).send({ message: 'Η κράτηση δεν βρέθηκε' })

    if (existing.provider_email !== user.email && user.role !== 'admin') {
      return reply.code(403).send({ message: 'Η κράτηση δεν σου ανήκει' })
    }

    const status = (req.body as any)?.status
    const ALLOWED = ['confirmed', 'cancelled', 'completed', 'no_show']
    if (!ALLOWED.includes(status)) {
      return reply.code(400).send({ message: 'Μη έγκυρη κατάσταση', allowed: ALLOWED })
    }
    // Completing a booking implies it was paid for.
    if (status === 'completed' && existing.payment_status !== 'paid') {
      return reply.code(400).send({ message: 'Η κράτηση δεν έχει πληρωθεί' })
    }

    return prisma.booking.update({
      where: { id: existing.id },
      data: { status },
    })
  })
}

export default providerRoutes
