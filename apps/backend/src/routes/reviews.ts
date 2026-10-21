import type { FastifyPluginAsync } from 'fastify'
import type { Prisma } from '@prisma/client'
import prisma from '../lib/prisma.js'

/** Ο κοινός client ή ο client μιας συναλλαγής ($transaction). */
type Db = Prisma.TransactionClient | typeof prisma

/** «Επιλέξιμες» κρατήσεις του πελάτη για αυτές τις υπηρεσίες (βλ. pickServiceBooking). */
const ELIGIBLE_BOOKING = { OR: [{ status: 'completed' }, { payment_status: 'paid' }] }
const ELIGIBLE_ORDER = [{ booking_date: 'asc' as const }, { booking_time: 'asc' as const }, { created_at: 'asc' as const }]

/**
 * Ο κανόνας για ΜΙΑ υπηρεσία: ελεύθερες κρατήσεις (με τη σειρά τους) και
 * πόσες «κατανάλωσαν» οι παλιές κριτικές χωρίς booking_id (L).
 */
function freeBookings(
  eligible: Array<{ id: string; rating: number | null }>,
  reviews: Array<{ booking_id: string | null }>,
) {
  const reviewed = new Set(reviews.map(r => r.booking_id).filter(Boolean) as string[])
  const legacy = reviews.filter(r => !r.booking_id).length
  const free = eligible.filter(b => b.rating == null && !reviewed.has(b.id))
  return { free, legacy }
}

/**
 * Κριτικές ΥΠΗΡΕΣΙΩΝ: μία ανά ΚΡΑΤΗΣΗ (όχι ανά υπηρεσία).
 *
 * Κανόνας:
 * - «Επιλέξιμη» κράτηση = του πελάτη, της υπηρεσίας, με status 'completed'
 *   ή payment_status 'paid' (το ίδιο κριτήριο που ίσχυε ήδη).
 * - «Ελεύθερη» = επιλέξιμη, με booking.rating == null και χωρίς καμία
 *   κριτική που να έχει αυτό το booking_id.
 * - Οι παλιές κριτικές του πελάτη για την υπηρεσία ΧΩΡΙΣ booking_id (πριν
 *   δεθούν με κράτηση) δεν ξέρουμε σε ποια κράτηση αντιστοιχούν· θεωρείται
 *   ότι κάλυψαν τόσες ελεύθερες κρατήσεις όσες είναι (L). Άρα νέα κριτική
 *   επιτρέπεται μόνο αν οι ελεύθερες είναι > L — ποτέ περισσότερες κριτικές
 *   από κρατήσεις.
 * - Με booking_id: η κράτηση πρέπει να είναι ελεύθερη και να ισχύει το > L.
 * - Χωρίς booking_id (παλιά εφαρμογή): επιλέγεται αυτόματα η παλαιότερη
 *   ελεύθερη μετά τις L παλαιότερες (αυτές θεωρούνται «καταναλωμένες» από
 *   τις παλιές κριτικές).
 *
 * Επιστρέφει: 'not_purchased' (καμία επιλέξιμη / η κράτηση δεν είναι
 * επιλέξιμη), 'already_reviewed' (δεν μένει ελεύθερη), ή το id της κράτησης.
 * `db`: μέσα σε συναλλαγή (POST), ο client της ώστε ο έλεγχος να γίνεται υπό
 * το κλείδωμα (pg_advisory_xact_lock) της συναλλαγής.
 */
export async function pickServiceBooking(
  email: string,
  serviceId: string,
  bookingId?: string | null,
  db: Db = prisma,
): Promise<{ bookingId: string } | { reason: 'not_purchased' | 'already_reviewed' }> {
  const eligible = await db.booking.findMany({
    where: { service_id: serviceId, customer_email: email, ...ELIGIBLE_BOOKING },
    select: { id: true, rating: true },
    orderBy: ELIGIBLE_ORDER,
  })
  if (bookingId && !eligible.some(b => b.id === bookingId)) return { reason: 'not_purchased' }
  if (eligible.length === 0) return { reason: 'not_purchased' }

  const reviews = await db.review.findMany({
    where: { customer_email: email, service_id: serviceId },
    select: { booking_id: true },
  })
  const { free, legacy } = freeBookings(eligible, reviews)

  if (free.length <= legacy) return { reason: 'already_reviewed' }
  if (bookingId) {
    return free.some(b => b.id === bookingId) ? { bookingId } : { reason: 'already_reviewed' }
  }
  return { bookingId: free[legacy].id }
}

/**
 * Ποιες κρατήσεις του πελάτη μπορούν να πάρουν κριτική τώρα — ο ΙΔΙΟΣ κανόνας
 * με το POST /reviews με booking_id (pickServiceBooking): επιλέξιμη, ελεύθερη
 * και ελεύθερες > L για την υπηρεσία. Για το `can_review` του GET /bookings/my.
 */
export async function reviewableBookingIds(email: string, serviceIds: string[], db: Db = prisma): Promise<Set<string>> {
  const out = new Set<string>()
  const ids = [...new Set(serviceIds.filter(Boolean))]
  if (ids.length === 0) return out
  const [eligible, reviews] = await Promise.all([
    db.booking.findMany({
      where: { service_id: { in: ids }, customer_email: email, ...ELIGIBLE_BOOKING },
      select: { id: true, rating: true, service_id: true },
      orderBy: ELIGIBLE_ORDER,
    }),
    db.review.findMany({
      where: { customer_email: email, service_id: { in: ids } },
      select: { booking_id: true, service_id: true },
    }),
  ])
  for (const sid of ids) {
    const { free, legacy } = freeBookings(
      eligible.filter(b => b.service_id === sid),
      reviews.filter(r => r.service_id === sid),
    )
    if (free.length > legacy) for (const b of free) out.add(b.id)
  }
  return out
}

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
    // Δημόσιο endpoint: το email του πελάτη δεν επιστρέφεται (το όνομα αρκεί
    // για την εμφάνιση· καμία οθόνη δεν το χρησιμοποιεί).
    return { data: data.map(({ customer_email: _omit, ...r }) => r) }
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
    const { service_id, product_id, booking_id } = req.query

    if (!service_id && !product_id) {
      return reply.code(400).send({ message: 'Λείπει service_id ή product_id' })
    }

    // Υπηρεσία: μία κριτική ανά κράτηση (βλ. pickServiceBooking). Προαιρετικό
    // booking_id για ερώτηση για συγκεκριμένη κράτηση. Το booking_id στην
    // απάντηση (προσθετικό) είναι η κράτηση που θα πάρει την κριτική.
    if (service_id) {
      const pick = await pickServiceBooking(email, String(service_id), booking_id ? String(booking_id) : null)
      return 'bookingId' in pick
        ? { data: { can_review: true, reason: null, booking_id: pick.bookingId } }
        : { data: { can_review: false, reason: pick.reason } }
    }

    // Προϊόν: αμετάβλητο — μία κριτική ανά προϊόν.
    const already = await prisma.review.findFirst({
      where: { customer_email: email, product_id },
      select: { id: true },
    })
    if (already) return { data: { can_review: false, reason: 'already_reviewed' } }

    const orderId = await findPaidOrderFor(email, String(product_id))
    return { data: { can_review: !!orderId, reason: orderId ? null : 'not_purchased' } }
  })

  /**
   * Create a review for a service or a product.
   *
   * The rules: a valid 1-5 rating, one review per customer per product / one
   * review per BOOKING for a service (pickServiceBooking), and the reviewer
   * must actually have used or bought the thing. Without the last rule the
   * ratings are decoration.
   */
  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const { service_id, product_id, booking_id, rating, comment } = req.body as any

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

    // Προϊόν: μία κριτική ανά πελάτη ανά προϊόν. Υπηρεσία: μία ανά κράτηση
    // (ελέγχεται πιο κάτω, βλ. pickServiceBooking).
    if (product_id) {
      const already = await prisma.review.findFirst({
        where: { customer_email: email, product_id },
        select: { id: true },
      })
      if (already) {
        return reply.code(409).send({ message: 'Έχεις ήδη αξιολογήσει' })
      }
    }

    const trimmedComment = comment ? String(comment).trim().slice(0, 2000) : null

    // Το JWT έχει μόνο id/email/role — όχι full_name. Χωρίς αυτό κάθε κριτική
    // έπαιρνε ως όνομα το πρώτο μέρος του email.
    const author = await prisma.user.findUnique({ where: { email }, select: { full_name: true } })
    const customerName = author?.full_name?.trim() || email.split('@')[0]

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
          customer_name: customerName,
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

    // Μία κριτική ανά κράτηση. Προαιρετικό booking_id (το στέλνουν web/κινητό
    // από «Οι κρατήσεις μου»)· χωρίς αυτό (παλιά εφαρμογή) επιλέγεται αυτόματα
    // η παλαιότερη ελεύθερη κράτηση. Κανόνας: pickServiceBooking.
    //
    // ΟΛΑ μέσα σε μία συναλλαγή, υπό κλείδωμα (πελάτης, υπηρεσία): δύο
    // ταυτόχρονα POST για ΔΙΑΦΟΡΕΤΙΚΕΣ κρατήσεις με παλιές κριτικές (L > 0)
    // περνούσαν και τα δύο τον έλεγχο «ελεύθερες > L» πριν γραφτεί κάποιο.
    // Με το pg_advisory_xact_lock το δεύτερο περιμένει το commit του πρώτου
    // και βλέπει την κριτική του. Το κλείδωμα λύνεται μόνο του στο τέλος.
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtext('review'), hashtext(${email + '|' + String(service_id)}))::text AS ok`
      const pick = await pickServiceBooking(email, String(service_id), booking_id ? String(booking_id) : null, tx)
      if (!('bookingId' in pick)) return { reason: pick.reason }
      const bookingIdToUse = pick.bookingId

      // Ατομική διεκδίκηση της κράτησης ΠΡΙΝ τη δημιουργία: δύο ταυτόχρονα POST
      // για την ίδια κράτηση — μόνο το ένα βρίσκει rating == null (count 1)· το
      // άλλο παίρνει 409 και δεν γράφεται δεύτερη κριτική. Η κράτηση κρατά τη
      // δική της βαθμολογία/σχόλιο: με αυτό web/κινητό κρύβουν το «Γράψε
      // κριτική» (booking.rating != null).
      const claimed = await tx.booking.updateMany({
        where: { id: bookingIdToUse, rating: null },
        data: { rating: parsedRating, review: trimmedComment },
      })
      if (claimed.count !== 1) return { reason: 'already_reviewed' as const }
      const review = await tx.review.create({
        data: {
          service_id,
          // Taken from the service, not the request — a body value could point
          // the review at an unrelated provider's profile.
          provider_email: service.provider_email,
          customer_email: email,
          customer_name: customerName,
          rating: parsedRating,
          comment: trimmedComment,
          booking_id: bookingIdToUse,
        },
      })
      return { review }
    })
    if (!('review' in result)) {
      if (result.reason === 'not_purchased') {
        return reply.code(403).send({
          message: 'Μπορείς να αξιολογήσεις μόνο υπηρεσίες που έχεις χρησιμοποιήσει',
        })
      }
      return reply.code(409).send({ message: 'Έχεις ήδη αξιολογήσει' })
    }
    const review = result.review
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
    // Η κράτηση της κριτικής (ΜΟΝΟ αυτή, από το booking_id της) ξαναγίνεται
    // αξιολογήσιμη (βλ. διεκδίκηση στο POST). Μαζί, ώστε να μη μείνει κράτηση
    // με rating χωρίς κριτική ή ανάποδα. Παλιά κριτική χωρίς booking_id δεν
    // αγγίζει καμία κράτηση.
    await prisma.$transaction(async (tx) => {
      await tx.review.delete({ where: { id: existing.id } })
      if (existing.booking_id) {
        await tx.booking.updateMany({
          where: { id: existing.booking_id },
          data: { rating: null, review: null },
        })
      }
    })
    // Keep the average honest after the row is gone.
    if (existing.service_id) await recalcServiceRating(existing.service_id)
    if (existing.product_id) await recalcProductRating(existing.product_id)
    return reply.code(204).send()
  })
}

export default routes
