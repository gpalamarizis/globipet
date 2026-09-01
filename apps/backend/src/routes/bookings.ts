import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { calculateCommission } from '../lib/commission.js'
import { sendBookingConfirmedEmail, sendProviderNewBookingEmail } from '../lib/email.js'
import { broadcastToUser } from './notifications.js'

const bookingsRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Όλες οι κρατήσεις — μόνο διαχειριστής.
   *
   * Το GET / παραπάνω επιστρέφει μόνο τις δικές του. Ο admin χρειάζεται
   * συνολική εικόνα: ποιος έκλεισε ποιον, πότε, πόσα, σε τι κατάσταση.
   *
   * Φίλτρα: q (πελάτης/πάροχος), status, from, to
   * Σελιδοποίηση: limit έως 200, offset
   */
  app.get('/all', { preHandler: [(app as any).authenticate] }, async (req: any, reply: any) => {
    const user = req.user as any
    if (user.role !== 'admin') {
      return reply.code(403).send({ message: 'Απαιτούνται δικαιώματα διαχειριστή' })
    }
  
    const { q, status, from, to } = req.query || {}
    const limit = Math.min(200, Math.max(1, parseInt(req.query?.limit) || 50))
    const offset = Math.max(0, parseInt(req.query?.offset) || 0)
  
    const where: any = {}
    if (status) where.status = status
    if (from || to) {
      where.booking_date = {}
      if (from) where.booking_date.gte = from
      if (to) where.booking_date.lte = to
    }
    if (q) {
      where.OR = [
        { customer_name:  { contains: q, mode: 'insensitive' } },
        { customer_email: { contains: q, mode: 'insensitive' } },
        { provider_name:  { contains: q, mode: 'insensitive' } },
        { provider_email: { contains: q, mode: 'insensitive' } },
      ]
    }
  
    const [data, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: [{ booking_date: 'desc' }, { booking_time: 'desc' }],
        take: limit, skip: offset,
      }),
      prisma.booking.count({ where }),
    ])
  
    // Σύνοψη για την κεφαλίδα της σελίδας
    const grouped = await prisma.booking.groupBy({
      by: ['status'], _count: { _all: true }, where,
    })
    const revenue = await prisma.booking.aggregate({
      _sum: { total_price: true },
      where: { ...where, payment_status: 'paid' },
    })
  
    return {
      data, total, limit, offset,
      summary: {
        byStatus: grouped.map((g: any) => ({ status: g.status, count: g._count._all })),
        revenue: revenue._sum.total_price ?? 0,
      },
    }
  })
  
  app.get('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const { tab = 'upcoming' } = req.query
    const now = new Date().toISOString().split('T')[0]
    const where: any = { customer_email: email }
    if (tab === 'upcoming') where.booking_date = { gte: now }
    else if (tab === 'past') where.booking_date = { lt: now }
    const data = await prisma.booking.findMany({ where, orderBy: { booking_date: 'asc' } })
    return { data, total: data.length }
  })

  /**
   * GET /bookings/my — all bookings for the current user, most-recent first.
   * Used by the profile page. Simpler than the tabbed GET / above.
   */
  app.get('/my', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const data = await prisma.booking.findMany({
      where: { customer_email: email },
      orderBy: { created_at: 'desc' },
      take: 50,
    })
    return { data, total: data.length }
  })

  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email, full_name } = req.user as any
    const body = req.body as any

    // Authoritative lookup of the service for provider_email + category (don't trust client for commission routing)
    const service = body.service_id ? await prisma.service.findUnique({ where: { id: body.service_id } }) : null
    const providerEmail = service?.provider_email || body.provider_email
    const providerName = service?.provider_name || body.provider_name
    const totalPrice = parseFloat(body.total_price) || 0
    const category = service?.service_type || null

    const { rate, platformFee, providerPayout } = await calculateCommission(totalPrice, category)

    const booking = await prisma.booking.create({
      data: {
        ...body,
        customer_email: email,
        customer_name: full_name,
        provider_email: providerEmail,
        provider_name: providerName,
        total_price: totalPrice,
        status: body.status || 'confirmed',
        commission_rate: rate,
        platform_fee_amount: platformFee,
        provider_payout_amount: providerPayout,
      }
    })

    // Side effects — never block the booking response on email/notification failures
    sendBookingConfirmedEmail(email, {
      customerName: full_name || email.split('@')[0],
      providerName: providerName || 'τον πάροχο',
      date: booking.booking_date,
      time: booking.booking_time,
      price: totalPrice,
    }).catch(() => {})

    if (providerEmail) {
      sendProviderNewBookingEmail(providerEmail, {
        providerName: providerName || providerEmail.split('@')[0],
        customerName: full_name || email.split('@')[0],
        date: booking.booking_date,
        time: booking.booking_time,
        payoutAmount: providerPayout,
      }).catch(() => {})

      prisma.notification.create({
        data: {
          user_email: providerEmail,
          title: 'Νέα κράτηση',
          message: `${full_name || email.split('@')[0]} · ${booking.booking_date} ${booking.booking_time} · αμοιβή ${providerPayout.toFixed(2)}€`,
          type: 'new_booking',
          link: '/provider',
        },
      }).then(notification => broadcastToUser(providerEmail, { type: 'notification', notification })).catch(() => {})
    }

    return reply.code(201).send(booking)
  })

  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    return prisma.booking.update({ where: { id: req.params.id }, data: req.body })
  })
}
export default bookingsRoutes