import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { calculateCommission } from '../lib/commission.js'
import { sendBookingConfirmedEmail, sendProviderNewBookingEmail } from '../lib/email.js'
import { broadcastToUser } from './notifications.js'

const bookingsRoutes: FastifyPluginAsync = async (app) => {
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