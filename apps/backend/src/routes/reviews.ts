import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const routes: FastifyPluginAsync = async (app) => {

  /**
   * Recompute a service's average rating and review count from scratch.
   *
   * Called after every create and delete. The previous code only recalculated
   * on create, so deleting a review left the old average in place — a 1-star
   * review could be removed and the service kept the damaged score, or vice
   * versa.
   */
  async function recalcServiceRating(serviceId: string) {
    const agg = await prisma.review.aggregate({
      where: { service_id: serviceId },
      _avg: { rating: true },
      _count: { _all: true },
    })
    await prisma.service.update({
      where: { id: serviceId },
      data: {
        rating: agg._avg.rating ?? 0,
        reviews_count: agg._count._all,
      },
    })
  }

  app.get('/', async (req: any) => {
    const { service_id, provider_email } = req.query
    const data = await prisma.review.findMany({
      where: { ...(service_id && { service_id }), ...(provider_email && { provider_email }) },
      orderBy: { created_at: 'desc' },
    })
    return { data }
  })

  /**
   * GET /reviews/my — all reviews written by the current user.
   * Used by the profile page.
   */
  app.get('/my', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const data = await prisma.review.findMany({
      where: { customer_email: email },
      orderBy: { created_at: 'desc' },
      take: 50,
    })
    return { data, total: data.length }
  })

  /**
   * Create a review.
   *
   * Four things the previous version did not do:
   *   - validate the rating (an unbounded parseInt could set 1000000 and
   *     wreck the service average)
   *   - check the reviewer actually used the service
   *   - stop the same person reviewing the same service repeatedly
   *   - take provider_email from the service rather than the request body
   */
  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email, full_name } = req.user as any
    const { service_id, rating, comment, booking_id } = req.body as any

    if (!service_id || rating === undefined || rating === null) {
      return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })
    }

    const parsedRating = parseInt(rating)
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return reply.code(400).send({ message: 'Η βαθμολογία πρέπει να είναι από 1 έως 5' })
    }

    const service = await prisma.service.findUnique({ where: { id: service_id } })
    if (!service) return reply.code(404).send({ message: 'Η υπηρεσία δεν βρέθηκε' })

    // Reviewing your own service is self-dealing.
    if (service.provider_email === email) {
      return reply.code(400).send({ message: 'Δεν μπορείς να αξιολογήσεις τη δική σου υπηρεσία' })
    }

    // One review per customer per service.
    const already = await prisma.review.findFirst({
      where: { service_id, customer_email: email },
      select: { id: true },
    })
    if (already) {
      return reply.code(409).send({ message: 'Έχεις ήδη αξιολογήσει αυτή την υπηρεσία' })
    }

    // Verified purchase: the reviewer must have a completed or paid booking
    // for this service. Without it, anyone could farm five-star reviews.
    const booking = await prisma.booking.findFirst({
      where: {
        service_id,
        customer_email: email,
        OR: [{ status: 'completed' }, { payment_status: 'paid' }],
      },
      select: { id: true },
    })
    if (!booking) {
      return reply.code(403).send({
        message: 'Μπορείς να αξιολογήσεις μόνο υπηρεσίες που έχεις χρησιμοποιήσει',
      })
    }

    const review = await prisma.review.create({
      data: {
        service_id,
        // Taken from the service, not the request — the body value could point
        // the review at an unrelated provider's profile.
        provider_email: service.provider_email,
        customer_email: email,
        customer_name: full_name || email.split('@')[0],
        rating: parsedRating,
        comment: comment ? String(comment).trim() : null,
        // Tie the review to a real booking of this customer, ignoring any
        // booking_id the client may have supplied.
        booking_id: booking_id && booking_id === booking.id ? booking_id : booking.id,
      }
    })

    await recalcServiceRating(service_id)
    return reply.code(201).send({ data: review })
  })

  /**
   * The provider may reply to a review on their own service. This is the
   * `response` column that had no endpoint writing to it.
   */
  app.patch('/:id/response', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const user = req.user as any
    const existing = await prisma.review.findUnique({ where: { id: req.params.id } })
    if (!existing) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    if (existing.provider_email !== user.email && user.role !== 'admin') {
      return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    }
    const { response } = req.body as any
    const updated = await prisma.review.update({
      where: { id: existing.id },
      data: {
        response: response ? String(response).trim() : null,
        response_date: response ? new Date() : null,
      },
    })
    return { data: updated }
  })

  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const user = req.user as any
    const existing = await prisma.review.findUnique({ where: { id: req.params.id } })
    if (!existing) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    // Author deletes their own; admin deletes any, for moderation.
    if (existing.customer_email !== user.email && user.role !== 'admin') {
      return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    }
    await prisma.review.delete({ where: { id: existing.id } })
    // Keep the service average honest after the row is gone.
    await recalcServiceRating(existing.service_id)
    return reply.code(204).send()
  })
}

export default routes
