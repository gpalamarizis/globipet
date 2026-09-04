import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

/**
 * Reviews for services and for products.
 *
 * One table serves both. A row points at exactly one target — the database
 * enforces that with the reviews_one_target check constraint — so the
 * listings, the averages and the "have I already reviewed this" rule all work
 * the same way for either kind.
 */
const routes: FastifyPluginAsync = async (app) => {

  /**
   * Recompute a service's average rating and review count from scratch.
   *
   * Called after every create and delete. Earlier code only recalculated on
   * create, so deleting a review left the old average in place — a one-star
   * review could be removed and the service kept the damaged score.
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

  /** Same for a product. */
  async function recalcProductRating(productId: string) {
    const agg = await prisma.review.aggregate({
      where: { product_id: productId },
      _avg: { rating: true },
      _count: { _all: true },
    })
    await prisma.product.update({
      where: { id: productId },
      data: {
        rating: agg._avg.rating ?? 0,
        reviews_count: agg._count._all,
      },
    })
  }

  /**
   * Did this customer buy this product?
   *
   * Order lines live in a Json[] column, so this is an array scan rather than
   * a join. Only paid orders count — an unpaid basket is not a purchase.
   */
  async function findPaidOrderFor(email: string, productId: string): Promise<string | null> {
    const orders = await prisma.order.findMany({
      where: { user_email: email, payment_status: 'paid' },
      select: { id: true, items: true },
      orderBy: { created_at: 'desc' },
      take: 200,
    })
    for (const order of orders) {
      const items = (order.items ?? []) as any[]
      if (items.some(i => i?.product_id === productId)) return order.id
    }
    return null
  }

  /**
   * GET /reviews?service_id=… or ?product_id=…
   * Also accepts provider_email to list everything a provider has received.
   */
  app.get('/', async (req: any) => {
    const { service_id, product_id, provider_email } = req.query
    if (!service_id && !product_id && !provider_email) {
      return { data: [] }
    }
    const data = await prisma.review.findMany({
      where: {
        ...(service_id && { service_id }),
        ...(product_id && { product_id }),
        ...(provider_email && { provider_email }),
      },
      orderBy: { created_at: 'desc' },
      take: 200,
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
   * GET /reviews/can-review?product_id=… or ?service_id=…
   *
   * Lets the UI decide whether to show a write-a-review form instead of
   * offering one and failing on submit.
   */
  app.get('/can-review', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const { service_id, product_id } = req.query

    if (!service_id && !product_id) {
      return reply.code(400).send({ message: 'Λείπει service_id ή product_id' })
    }

    const already = await prisma.review.findFirst({
      where: {
        customer_email: email,
        ...(service_id ? { service_id } : { product_id }),
      },
      select: { id: true },
    })
    if (already) return { data: { can_review: false, reason: 'already_reviewed' } }

    if (product_id) {
      const orderId = await findPaidOrderFor(email, String(product_id))
      return { data: { can_review: !!orderId, reason: orderId ? null : 'not_purchased' } }
    }

    const booking = await prisma.booking.findFirst({
      where: {
        service_id: String(service_id),
        customer_email: email,
        OR: [{ status: 'completed' }, { payment_status: 'paid' }],
      },
      select: { id: true },
    })
    return { data: { can_review: !!booking, reason: booking ? null : 'not_purchased' } }
  })

  /**
   * Create a review for a service or a product.
   *
   * The rules are the same either way: a valid 1-5 rating, one review per
   * customer per target, and the reviewer must actually have used or bought
   * the thing. Without the last rule the ratings are decoration.
   */
  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email, full_name } = req.user as any
    const { service_id, product_id, rating, comment } = req.body as any

    if (!service_id && !product_id) {
      return reply.code(400).send({ message: 'Λείπει service_id ή product_id' })
    }
    if (service_id && product_id) {
      return reply.code(400).send({ message: 'Μια κριτική αφορά είτε υπηρεσία είτε προϊόν' })
    }

    const parsedRating = parseInt(rating)
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return reply.code(400).send({ message: 'Η βαθμολογία πρέπει να είναι από 1 έως 5' })
    }

    // One review per customer per target.
    const already = await prisma.review.findFirst({
      where: {
        customer_email: email,
        ...(service_id ? { service_id } : { product_id }),
      },
      select: { id: true },
    })
    if (already) {
      return reply.code(409).send({ message: 'Έχεις ήδη αξιολογήσει' })
    }

    const trimmedComment = comment ? String(comment).trim().slice(0, 2000) : null

    // ── Product review ───────────────────────────────────────────────
    if (product_id) {
      const product = await prisma.product.findUnique({ where: { id: product_id } })
      if (!product) return reply.code(404).send({ message: 'Το προϊόν δεν βρέθηκε' })

      if (product.provider_email && product.provider_email === email) {
        return reply.code(400).send({ message: 'Δεν μπορείς να αξιολογήσεις το δικό σου προϊόν' })
      }

      const orderId = await findPaidOrderFor(email, product_id)
      if (!orderId) {
        return reply.code(403).send({
          message: 'Μπορείς να αξιολογήσεις μόνο προϊόντα που έχεις αγοράσει',
        })
      }

      const review = await prisma.review.create({
        data: {
          product_id,
          provider_email: product.provider_email ?? null,
          customer_email: email,
          customer_name: full_name || email.split('@')[0],
          rating: parsedRating,
          comment: trimmedComment,
          order_id: orderId,
        },
      })
      await recalcProductRating(product_id)
      return reply.code(201).send({ data: review })
    }

    // ── Service review ───────────────────────────────────────────────
    const service = await prisma.service.findUnique({ where: { id: service_id } })
    if (!service) return reply.code(404).send({ message: 'Η υπηρεσία δεν βρέθηκε' })

    if (service.provider_email === email) {
      return reply.code(400).send({ message: 'Δεν μπορείς να αξιολογήσεις τη δική σου υπηρεσία' })
    }

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
        // Taken from the service, not the request — a body value could point
        // the review at an unrelated provider's profile.
        provider_email: service.provider_email,
        customer_email: email,
        customer_name: full_name || email.split('@')[0],
        rating: parsedRating,
        comment: trimmedComment,
        booking_id: booking.id,
      },
    })
    await recalcServiceRating(service_id)
    return reply.code(201).send({ data: review })
  })

  /**
   * The provider may reply to a review on their own service or product. This
   * is the `response` column that had no endpoint writing to it.
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
        response: response ? String(response).trim().slice(0, 2000) : null,
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
    // Keep the average honest after the row is gone.
    if (existing.service_id) await recalcServiceRating(existing.service_id)
    if (existing.product_id) await recalcProductRating(existing.product_id)
    return reply.code(204).send()
  })
}

export default routes
