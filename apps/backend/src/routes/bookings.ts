import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const bookingsRoutes: FastifyPluginAsync = async (app) => {

  // List my bookings
  app.get('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const { tab = 'upcoming' } = req.query
    const now = new Date()

    const where: any = { user_email: email }
    if (tab === 'upcoming') where.scheduled_at = { gte: now }
    else if (tab === 'past')     where.scheduled_at = { lt: now }

    const data = await prisma.booking.findMany({
      where,
      orderBy: { scheduled_at: 'asc' },
      include: {
        service: { select: { id: true, title: true, category: true, city: true, cover_image: true } },
        packages: true,
      }
    })
    return { data, total: data.length }
  })

  // Single booking detail
  app.get('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        service: true,
        packages: true,
      }
    })
    if (!booking) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    if (booking.user_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    return booking
  })

  // Create booking (with optional packages)
  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const {
      service_id,
      pet_id,
      scheduled_at,
      notes,
      total_price,
      payment_method,
      packages,
      // legacy fields (back-compat)
      date,
      time,
      provider_id,
    } = req.body as any

    if (!service_id) {
      return reply.code(400).send({ message: 'Λείπει service_id' })
    }

    // Resolve scheduled_at — support both new and legacy fields
    let scheduledAt: Date
    if (scheduled_at) {
      scheduledAt = new Date(scheduled_at)
    } else if (date && time) {
      scheduledAt = new Date(`${date}T${time}:00`)
    } else {
      return reply.code(400).send({ message: 'Λείπει ημερομηνία/ώρα' })
    }

    if (isNaN(scheduledAt.getTime())) {
      return reply.code(400).send({ message: 'Μη έγκυρη ημερομηνία' })
    }

    // Calculate total if not provided — try summing packages, else fallback to service price
    let calculatedTotal = parseFloat(String(total_price || 0))
    if (!calculatedTotal && Array.isArray(packages) && packages.length > 0) {
      calculatedTotal = packages.reduce((s: number, p: any) =>
        s + (parseFloat(p.price_snapshot) || 0) * (parseInt(p.quantity) || 1), 0)
    }
    if (!calculatedTotal) {
      const service = await prisma.service.findUnique({
        where: { id: service_id },
        select: { id: true }
      })
      // services may not have a base price column anymore — leave 0 if missing
      calculatedTotal = 0
    }

    // Create booking and packages in a transaction
    const booking = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.create({
        data: {
          service_id,
          user_email: email,
          pet_id: pet_id || null,
          scheduled_at: scheduledAt,
          notes: notes || null,
          total_price: calculatedTotal,
          payment_method: payment_method || null,
          status: 'pending',
        }
      })

      // Insert package line items if provided
      if (Array.isArray(packages) && packages.length > 0) {
        await tx.bookingPackage.createMany({
          data: packages.map((p: any) => ({
            booking_id: b.id,
            package_id: p.package_id,
            quantity: parseInt(p.quantity) || 1,
            price_snapshot: parseFloat(p.price_snapshot) || 0,
            name_snapshot: p.name_snapshot || '',
          }))
        })
      }

      return tx.booking.findUnique({
        where: { id: b.id },
        include: { service: true, packages: true }
      })
    })

    return booking
  })

  // Update booking (status, notes, etc.)
  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const existing = await prisma.booking.findUnique({ where: { id: req.params.id } })
    if (!existing) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    if (existing.user_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })

    const { status, notes, scheduled_at } = req.body as any
    const data: any = {}
    if (status) data.status = status
    if (notes !== undefined) data.notes = notes
    if (scheduled_at) data.scheduled_at = new Date(scheduled_at)

    return prisma.booking.update({
      where: { id: req.params.id },
      data,
      include: { service: true, packages: true }
    })
  })

  // Cancel booking
  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const existing = await prisma.booking.findUnique({ where: { id: req.params.id } })
    if (!existing) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    if (existing.user_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.booking.update({ where: { id: req.params.id }, data: { status: 'cancelled' } })
    return reply.code(204).send()
  })
}

export default bookingsRoutes
