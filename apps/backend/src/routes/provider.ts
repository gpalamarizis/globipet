import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { encryptField, decryptField } from '../lib/crypto.js'

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


  /**
   * Αίτηση επαλήθευσης παρόχου.
   *
   * Η οθόνη στο mobile έστελνε εδώ από την αρχή· το endpoint δεν υπήρχε και
   * κάθε αίτηση κατέληγε σε «Κάτι πήγε στραβά».
   */
  app.post('/verification-request', async (req: any, reply) => {
    const { email } = req.user as any
    const b = (req.body ?? {}) as any

    const full_name = String(b.full_name || '').trim()
    if (!full_name) return reply.code(400).send({ message: 'Το ονοματεπώνυμο είναι υποχρεωτικό' })

    // Μία εκκρεμής τη φορά — αλλιώς ο ίδιος γεμίζει την ουρά πατώντας ξανά.
    const pending = await prisma.providerVerificationRequest.findFirst({
      where: { user_email: email, status: 'pending' },
      select: { id: true, created_at: true },
    })
    if (pending) {
      return reply.code(409).send({
        message: 'Έχεις ήδη αίτηση σε εξέλιξη',
        submitted_at: pending.created_at,
      })
    }

    const years = parseInt(b.years_experience)
    const created = await prisma.providerVerificationRequest.create({
      data: {
        user_email: email,
        full_name,
        phone: b.phone ? String(b.phone).slice(0, 40) : null,
        city: b.city ? String(b.city).slice(0, 100) : null,
        business_name: b.business_name ? String(b.business_name).slice(0, 200) : null,
        // Το ΑΦΜ είναι φορολογικό στοιχείο· κρυπτογραφείται όπως τα τηλέφωνα.
        tax_number: b.tax_number ? (encryptField(String(b.tax_number).trim()) as string) : null,
        years_experience: Number.isFinite(years) && years >= 0 ? Math.min(years, 80) : null,
        specializations: typeof b.specializations === 'string'
          ? b.specializations.split(',').map((x: string) => x.trim()).filter(Boolean)
          : Array.isArray(b.specializations) ? b.specializations : [],
        bio: b.bio ? String(b.bio).slice(0, 4000) : null,
        website: b.website ? String(b.website).slice(0, 300) : null,
      },
      select: { id: true, status: true, created_at: true },
    })
    return reply.code(201).send({ data: created })
  })

  /** Η κατάσταση της δικής μου αίτησης. */
  app.get('/verification-request', async (req: any) => {
    const { email } = req.user as any
    const latest = await prisma.providerVerificationRequest.findFirst({
      where: { user_email: email },
      orderBy: { created_at: 'desc' },
      select: {
        id: true, status: true, review_notes: true,
        created_at: true, reviewed_at: true,
      },
    })
    return { data: latest }
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
