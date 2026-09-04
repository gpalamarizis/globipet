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
   * GET /bookings/my — bookings for the current user.
   * Optional filters:
   *   ?upcoming=true — only future bookings (booking_date >= today)
   *   ?past=true     — only past bookings (booking_date < today)
   *   ?limit=N       — cap results (default 50, max 100)
   *
   * Default ordering: most-recent first. When ?upcoming=true, ascending by booking_date
   * (so the very next booking is first).
   */
  app.get('/my', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const { upcoming, past, limit } = req.query
    const now = new Date().toISOString().split('T')[0]
    const where: any = { customer_email: email }
    if (upcoming === 'true' || upcoming === '1') where.booking_date = { gte: now }
    else if (past === 'true' || past === '1')     where.booking_date = { lt: now }
    const take = Math.min(parseInt(limit) || 50, 100)
    const data = await prisma.booking.findMany({
      where,
      orderBy: (upcoming === 'true' || upcoming === '1') ? { booking_date: 'asc' } : { created_at: 'desc' },
      take,
      // The list needs to say what was booked. Without this the UI has only a
      // service_id and falls back to a generic label on every row.
      include: {
        service: { select: { id: true, title: true, service_type: true, city: true, location: true } },
        packages: { select: { name_snapshot: true, quantity: true, price_snapshot: true } },
      },
    })
    return { data, total: data.length }
  })

  /**
   * Create a booking.
   *
   * PRICING AND STATE ARE SERVER-OWNED
   *   The previous version spread `...body` straight into the create and read
   *   `total_price` from the request. That let a client post
   *   { total_price: 0.01, payment_status: 'paid', status: 'confirmed' }
   *   and walk away with a paid booking for a cent, with the commission split
   *   computed off the fake number.
   *
   *   Now: the price comes from the service (plus any packages, priced from
   *   service_packages), payment_status always starts 'unpaid', and status
   *   always starts 'pending'. Only the payment flow moves those forward.
   */
  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email, full_name } = req.user as any
    const body = (req.body ?? {}) as any

    if (!body.service_id || !body.booking_date || !body.booking_time) {
      return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })
    }

    const service = await prisma.service.findUnique({ where: { id: body.service_id } })
    if (!service) return reply.code(404).send({ message: 'Η υπηρεσία δεν βρέθηκε' })
    if (!service.is_active) return reply.code(400).send({ message: 'Η υπηρεσία δεν είναι διαθέσιμη' })

    // Booking your own service would route a commission on money moving
    // between the same two hands.
    if (service.provider_email === email) {
      return reply.code(400).send({ message: 'Δεν μπορείς να κλείσεις τη δική σου υπηρεσία' })
    }

    // A booking may reference a pet, but only one the caller owns.
    if (body.pet_id) {
      const pet = await prisma.pet.findUnique({ where: { id: body.pet_id }, select: { owner_email: true } })
      if (!pet || pet.owner_email !== email) {
        return reply.code(403).send({ message: 'Το κατοικίδιο δεν σου ανήκει' })
      }
    }

    // Price the selected packages from the database. Body shape:
    //   packages: [{ package_id: string, quantity?: number }]
    const requested: Array<{ package_id: string; quantity?: number }> =
      Array.isArray(body.packages) ? body.packages : []

    let packageRows: Array<{ package_id: string; quantity: number; price_snapshot: number; name_snapshot: string }> = []
    let packagesTotal = 0

    if (requested.length) {
      const ids = requested.map(p => p.package_id).filter(Boolean)
      const found = await prisma.servicePackage.findMany({ where: { id: { in: ids } } })
      const byId = new Map(found.map(p => [p.id, p]))

      const missing = ids.filter(id => !byId.has(id))
      if (missing.length) {
        return reply.code(400).send({ message: 'Κάποια πακέτα δεν βρέθηκαν', missing })
      }
      // Every package must belong to the service being booked, otherwise a
      // caller could attach a €1 package from an unrelated cheap service.
      const foreign = found.filter(p => p.service_id !== service.id).map(p => p.id)
      if (foreign.length) {
        return reply.code(400).send({ message: 'Κάποια πακέτα δεν ανήκουν σε αυτή την υπηρεσία', foreign })
      }

      packageRows = requested.map(r => {
        const pkg = byId.get(r.package_id)!
        const quantity = Math.min(Math.max(parseInt(String(r.quantity)) || 1, 1), 20)
        packagesTotal += pkg.price * quantity
        return {
          package_id: pkg.id,
          quantity,
          price_snapshot: pkg.price,
          name_snapshot: pkg.name,
        }
      })
    }

    // Base service price applies when no packages were chosen; with packages
    // the package prices are the whole charge.
    const totalPrice = Math.round((packageRows.length ? packagesTotal : service.price) * 100) / 100
    const category = service.service_type || null
    const { rate, platformFee, providerPayout } = await calculateCommission(totalPrice, category)

    // Staff must belong to this service if one was requested.
    let staffId: string | null = null
    let staffName: string | null = null
    if (body.staff_id) {
      const staff = await (prisma as any).providerStaff.findUnique({ where: { id: body.staff_id } })
      if (!staff || staff.service_id !== service.id || !staff.is_active) {
        return reply.code(400).send({ message: 'Το επιλεγμένο μέλος προσωπικού δεν είναι διαθέσιμο' })
      }
      staffId = staff.id
      staffName = staff.full_name
    }

    const booking = await prisma.booking.create({
      data: {
        service_id: service.id,
        customer_email: email,
        customer_name: full_name || email.split('@')[0],
        provider_email: service.provider_email,
        provider_name: service.provider_name,
        booking_date: String(body.booking_date),
        booking_time: String(body.booking_time),
        duration: body.duration ? parseInt(body.duration) : null,
        pet_id: body.pet_id || null,
        pet_name: body.pet_name || null,
        notes: body.notes || null,
        staff_id: staffId,
        staff_name: staffName,
        total_price: totalPrice,
        // Server-owned state — never taken from the request.
        status: 'pending',
        payment_status: 'unpaid',
        commission_rate: rate,
        platform_fee_amount: platformFee,
        provider_payout_amount: providerPayout,
        ...(packageRows.length ? { packages: { create: packageRows } } : {}),
      },
      include: { packages: true },
    })

    // Side effects — never block the booking response on email/notification failures
    sendBookingConfirmedEmail(email, {
      customerName: full_name || email.split('@')[0],
      providerName: service.provider_name || 'τον πάροχο',
      date: booking.booking_date,
      time: booking.booking_time,
      price: totalPrice,
    }).catch(() => {})

    sendProviderNewBookingEmail(service.provider_email, {
      providerName: service.provider_name || service.provider_email.split('@')[0],
      customerName: full_name || email.split('@')[0],
      date: booking.booking_date,
      time: booking.booking_time,
      payoutAmount: providerPayout,
    }).catch(() => {})

    prisma.notification.create({
      data: {
        user_email: service.provider_email,
        title: 'Νέα κράτηση',
        message: `${full_name || email.split('@')[0]} · ${booking.booking_date} ${booking.booking_time} · αμοιβή ${providerPayout.toFixed(2)}€`,
        type: 'new_booking',
        link: '/provider',
      },
    }).then(notification => broadcastToUser(service.provider_email, { type: 'notification', notification })).catch(() => {})

    return reply.code(201).send(booking)
  })

  /**
   * Update a booking.
   *
   * The previous version passed `req.body` straight into the update with no
   * ownership check at all — any logged-in user could rewrite any booking by
   * id, including its price, its payment status and whose booking it was.
   *
   * Now: only the customer, the provider, or an admin may touch it, and only
   * a small set of fields is writable. Money and payment state are excluded.
   */
  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const user = req.user as any
    const existing = await prisma.booking.findUnique({ where: { id: req.params.id } })
    if (!existing) return reply.code(404).send({ message: 'Η κράτηση δεν βρέθηκε' })

    const isCustomer = existing.customer_email === user.email
    const isProvider = existing.provider_email === user.email
    const isAdmin = user.role === 'admin'
    if (!isCustomer && !isProvider && !isAdmin) {
      return reply.code(403).send({ message: 'Δεν έχεις πρόσβαση σε αυτή την κράτηση' })
    }

    const body = (req.body ?? {}) as any
    const data: any = {}

    // Rescheduling and notes are open to both sides.
    if (body.booking_date !== undefined) data.booking_date = String(body.booking_date)
    if (body.booking_time !== undefined) data.booking_time = String(body.booking_time)
    if (body.notes !== undefined) data.notes = body.notes || null

    // Status transitions. Cancelling is available to both parties; marking a
    // booking completed is the provider's call and only once it is paid.
    if (body.status !== undefined) {
      if (body.status === 'cancelled') {
        data.status = 'cancelled'
      } else if (body.status === 'confirmed' && (isProvider || isAdmin)) {
        data.status = 'confirmed'
      } else if (body.status === 'completed' && (isProvider || isAdmin) && existing.payment_status === 'paid') {
        data.status = 'completed'
      } else {
        return reply.code(400).send({ message: 'Μη έγκυρη αλλαγή κατάστασης' })
      }
    }

    // The provider may reassign which staff member handles the booking.
    if (body.staff_id !== undefined && (isProvider || isAdmin)) {
      if (body.staff_id === null) {
        data.staff_id = null
        data.staff_name = null
      } else {
        const staff = await (prisma as any).providerStaff.findUnique({ where: { id: body.staff_id } })
        if (!staff || staff.service_id !== existing.service_id) {
          return reply.code(400).send({ message: 'Το μέλος προσωπικού δεν ανήκει σε αυτή την υπηρεσία' })
        }
        data.staff_id = staff.id
        data.staff_name = staff.full_name
      }
    }

    if (Object.keys(data).length === 0) {
      return reply.code(400).send({ message: 'Καμία έγκυρη αλλαγή' })
    }

    return prisma.booking.update({ where: { id: existing.id }, data })
  })
}
export default bookingsRoutes
