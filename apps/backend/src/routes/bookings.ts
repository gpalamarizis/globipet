import type { FastifyPluginAsync } from 'fastify'
import { langOfUser, notifyTitle, notifyMsg } from '../lib/notifyText.js'
import { broadcastToUser } from './notifications.js'
import { sendPushToUser } from '../lib/push.js'
import prisma from '../lib/prisma.js'
import { fullNameOf } from '../lib/userName.js'
import { calculateCommission } from '../lib/commission.js'
import { bestDiscount } from '../lib/campaignDiscount.js'
import { createVivaPaymentOrder } from '../lib/viva.js'
import { cancelBooking, cancellationTerms, CancelError, rescheduleBlock } from '../lib/cancellation.js'
import { serverError } from '../lib/errors.js'
import { isBookingPayable, confirmBookingPayment } from '../lib/bookingPayment.js'
import { reviewableBookingIds } from './reviews.js'

/** Μορφή του transaction id της Viva (GUID). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
    const { upcoming, past, limit, exclude_cancelled } = req.query
    // «Σήμερα» στην Ελλάδα, όχι σε UTC (00:00–03:00 ώρα Ελλάδας η UTC
    // ημερομηνία είναι ακόμη η χθεσινή).
    const now = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date())
    const where: any = { customer_email: email }
    const isUpcoming = upcoming === 'true' || upcoming === '1'
    if (isUpcoming) where.booking_date = { gte: now }
    else if (past === 'true' || past === '1')     where.booking_date = { lt: now }
    // Προσθετική παράμετρος (π.χ. «Επόμενο ραντεβού» της αρχικής): χωρίς
    // ακυρωμένες. Χωρίς αυτήν η απάντηση μένει όπως πριν για τους παλιούς πελάτες.
    const excludeCancelled = exclude_cancelled === 'true' || exclude_cancelled === '1'
    if (excludeCancelled) where.status = { not: 'cancelled' }
    const take = Math.min(parseInt(limit) || 50, 100)
    const data = await prisma.booking.findMany({
      where,
      orderBy: isUpcoming
        // Με τη νέα παράμετρο, και η ώρα: δύο ραντεβού την ίδια μέρα → το νωρίτερο πρώτο.
        ? (excludeCancelled ? [{ booking_date: 'asc' }, { booking_time: 'asc' }] : { booking_date: 'asc' })
        : { created_at: 'desc' },
      take,
      // The list needs to say what was booked. Without this the UI has only a
      // service_id and falls back to a generic label on every row.
      include: {
        service: { select: { id: true, title: true, service_type: true, city: true, location: true } },
        packages: { select: { name_snapshot: true, quantity: true, price_snapshot: true } },
      },
    })
    // Προσθετικό πεδίο `payable`: ο server αποφασίζει αν η κράτηση είναι
    // απλήρωτη ΚΑΙ πληρώσιμη (κουμπί «Πληρωμή» σε web και κινητό).
    // Προσθετικό `can_review`: ο ΙΔΙΟΣ κανόνας με το POST /reviews
    // (routes/reviews.ts → reviewableBookingIds), ώστε το «Γράψε κριτική» να
    // μην οδηγεί σε 409 (π.χ. παλιές κριτικές χωρίς booking_id).
    const reviewable = await reviewableBookingIds(email, data.map(b => b.service_id))
    return {
      data: data.map(b => ({ ...b, payable: isBookingPayable(b), can_review: reviewable.has(b.id) })),
      total: data.length,
    }
  })

  /**
   * Μία κράτηση — για τη σελίδα/οθόνη επιβεβαίωσης πληρωμής (polling όσο
   * εκκρεμεί). Μόνο ο πελάτης, ο πάροχος ή διαχειριστής.
   */
  app.get('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const user = req.user as any
    const b = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        service: { select: { id: true, title: true, service_type: true, city: true, location: true } },
        packages: { select: { name_snapshot: true, quantity: true, price_snapshot: true } },
      },
    })
    if (!b) return reply.code(404).send({ message: 'Η κράτηση δεν βρέθηκε' })
    if (b.customer_email !== user.email && b.provider_email !== user.email && user.role !== 'admin') {
      return reply.code(404).send({ message: 'Η κράτηση δεν βρέθηκε' })
    }
    return { data: { ...b, payable: isBookingPayable(b) } }
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
    const { email } = req.user as any
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
    // Αν ο πάροχος έχει ορίσει πακέτα, η επιλογή είναι ΥΠΟΧΡΕΩΤΙΚΗ.
    //
    // Αλλιώς ο πελάτης θα χρεωνόταν τη βασική τιμή της υπηρεσίας για κάτι
    // που ο πάροχος τιμολογεί ανά πακέτο — και ο πάροχος θα έβλεπε κράτηση
    // χωρίς να ξέρει τι ακριβώς ζητήθηκε.
    if (packageRows.length === 0) {
      const available = await prisma.servicePackage.count({
        where: { service_id: service.id, is_active: true },
      })
      if (available > 0) {
        return reply.code(400).send({
          message: 'Επίλεξε τουλάχιστον ένα πακέτο για αυτή την υπηρεσία',
          code: 'PACKAGE_REQUIRED',
        })
      }
    }

    const basePrice = Math.round((packageRows.length ? packagesTotal : service.price) * 100) / 100
    // Έκπτωση καμπάνιας στην υπηρεσία (στόχος «η υπηρεσία» ή «όλες οι
    // υπηρεσίες μου») — ίδιος υπολογισμός με την προεπισκόπηση της σελίδας.
    const disc = await bestDiscount(email, 'service', service.id, basePrice, 1)
    const totalPrice = disc.final
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
        // Το JWT δεν έχει full_name: το όνομα από τη βάση (lib/userName).
        customer_name: await fullNameOf(email),
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
        discount_amount: disc.discount > 0 ? disc.discount : null,
        campaign_id: disc.campaign?.id ?? null,
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

    // ΚΑΜΙΑ ειδοποίηση πριν την πληρωμή.
    //
    // Η κράτηση γεννιέται pending/unpaid και ο πελάτης οδηγείται αμέσως στο
    // Viva. Μέχρι να μπουν τα χρήματα δεν έχει συμβεί τίποτα: το email «η
    // κράτησή σου επιβεβαιώθηκε» ήταν ψέμα, και η ειδοποίηση στον πάροχο τον
    // έβαζε να κρατά ώρα στο ημερολόγιο για κάτι που μπορεί να μην πληρωθεί.
    //
    // Και τα δύο στέλνονται πλέον από το markBookingPaid, μόλις το Viva
    // επιβεβαιώσει τη χρέωση.

    return reply.code(201).send(booking)
  })

  /**
   * Αλλαγή του μέλους προσωπικού σε υπάρχουσα κράτηση.
   *
   * ΓΙΑΤΙ ΧΡΕΙΑΖΕΤΑΙ
   *   Ο πελάτης διαλέγει γιατρό τη στιγμή της κράτησης. Μέχρι το ραντεβού
   *   μπορεί να μεσολαβήσει ασθένεια, άδεια ή αλλαγή βάρδιας — και τότε η
   *   γραμματεία πρέπει να μεταφέρει το ραντεβού σε άλλον, χωρίς να ακυρωθεί
   *   και να ξαναπληρωθεί.
   *
   * ΠΟΙΟΣ ΜΠΟΡΕΙ
   *   Μόνο ο πάροχος της κράτησης, ή διαχειριστής. Ο πελάτης όχι: δεν του
   *   ανήκει η στελέχωση της κλινικής.
   *
   * ΕΛΕΓΧΟΙ
   *   · Το νέο μέλος ανήκει στην ΙΔΙΑ υπηρεσία και είναι ενεργό.
   *   · Ακυρωμένη ή ολοκληρωμένη κράτηση δεν αλλάζει.
   *   · Η τιμή ΔΕΝ ξαναϋπολογίζεται: ο πελάτης πλήρωσε ήδη, και μια αλλαγή
   *     που επιβάλλει ο πάροχος δεν τον επιβαρύνει.
   */
  app.patch('/:id/staff', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const user = req.user as any
    const { staff_id } = (req.body ?? {}) as any

    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } })
    if (!booking) return reply.code(404).send({ message: 'Η κράτηση δεν βρέθηκε' })

    if (booking.provider_email !== user.email && user.role !== 'admin') {
      return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    }
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return reply.code(400).send({ message: 'Η κράτηση δεν μπορεί να αλλάξει' })
    }

    // Κενό staff_id σημαίνει «χωρίς συγκεκριμένο μέλος» — επιτρεπτό.
    let staffId: string | null = null
    let staffName: string | null = null
    if (staff_id) {
      const staff = await (prisma as any).providerStaff.findUnique({ where: { id: staff_id } })
      if (!staff || staff.service_id !== booking.service_id || !staff.is_active) {
        return reply.code(400).send({ message: 'Το επιλεγμένο μέλος προσωπικού δεν είναι διαθέσιμο' })
      }
      staffId = staff.id
      staffName = staff.full_name
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { staff_id: staffId, staff_name: staffName },
    })

    // Ο πελάτης πρέπει να μάθει ποιος θα τον δει τελικά.
    const nLang = await langOfUser(booking.customer_email)
    prisma.notification.create({
      data: {
        user_email: booking.customer_email,
        title: notifyTitle('staff_changed', nLang),
        message: notifyMsg.staffChanged(nLang, staffName, booking.booking_date, booking.booking_time),
        type: 'booking_staff_changed',
        link: '/bookings',
      },
    }).then(notification => {
      broadcastToUser(booking.customer_email, { type: 'notification', notification })
      void sendPushToUser(booking.customer_email, {
        title: notification.title, body: notification.message, url: notification.link ?? '/',
      })
    }).catch(() => {})

    return updated
  })

  /**
   * Πληρωμή κράτησης μέσω Viva Smart Checkout.
   *
   * ΓΙΑΤΙ ΔΕΝ ΥΠΗΡΧΕ
   *   Οι παραγγελίες προϊόντων και η τηλεϊατρική είχαν ροή πληρωμής· οι
   *   κρατήσεις υπηρεσιών όχι. Η προμήθεια υπολογιζόταν και αποθηκευόταν σε
   *   κάθε κράτηση, αλλά χρήμα δεν περνούσε ποτέ από την πλατφόρμα — άρα
   *   δεν εισπραττόταν ποτέ. Κάθε αναφορά εσόδων που φιλτράρει
   *   `payment_status: 'paid'` έδειχνε μόνιμα μηδέν για τις υπηρεσίες.
   *
   * ΤΙ ΠΡΟΣΤΑΤΕΥΕΙ
   *   · Μόνο ο πελάτης της κράτησης μπορεί να την πληρώσει.
   *   · Το ποσό διαβάζεται από τη ΒΑΣΗ, ποτέ από το αίτημα — αλλιώς
   *     επιστρέφουμε στην ευπάθεια των 0,01 € που είχε ήδη διορθωθεί.
   *   · Ήδη πληρωμένη κράτηση δεν χρεώνεται δεύτερη φορά.
   *
   * ΕΠΑΝΑΠΛΗΡΩΜΗ (κουμπί «Πληρωμή» στις «Κρατήσεις μου»)
   *   Κάθε κλήση φτιάχνει ΝΕΑ παραγγελία Viva για την ίδια κράτηση. Αν
   *   πληρωθούν δύο, η πρώτη πληρώνει την κράτηση και η δεύτερη επιστρέφεται
   *   αυτόματα (lib/bookingPayment). Η επιστροφή γίνεται στη σελίδα
   *   επιβεβαίωσης ΚΡΑΤΗΣΗΣ — όχι στη σελίδα των παραγγελιών.
   */
  app.post('/viva/checkout', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { booking_id } = (req.body ?? {}) as any
    const user = req.user as any

    if (!booking_id || typeof booking_id !== 'string') {
      return reply.code(400).send({ message: 'Λείπει το αναγνωριστικό κράτησης' })
    }

    try {
      const booking = await prisma.booking.findUnique({ where: { id: booking_id } })
      if (!booking || booking.customer_email !== user.email) {
        return reply.code(404).send({ message: 'Η κράτηση δεν βρέθηκε' })
      }
      if (booking.payment_status === 'paid') {
        return reply.code(400).send({ message: 'Η κράτηση έχει ήδη πληρωθεί' })
      }
      if (booking.status === 'cancelled') {
        return reply.code(400).send({ message: 'Η κράτηση έχει ακυρωθεί' })
      }
      if (!Number.isFinite(booking.total_price) || booking.total_price <= 0) {
        return reply.code(400).send({ message: 'Το ποσό της κράτησης δεν είναι έγκυρο' })
      }
      // Επιστραμμένη, ολοκληρωμένη ή παρελθούσα κράτηση δεν πληρώνεται — μια
      // πληρωμή εκεί θα επέστρεφε αμέσως (διπλή κίνηση στην κάρτα για το τίποτα).
      if (!isBookingPayable(booking)) {
        return reply.code(400).send({ message: 'Η κράτηση δεν μπορεί πλέον να πληρωθεί' })
      }
      const frontendUrl = process.env.FRONTEND_URL || 'https://globipet.com'

      const { orderCode, checkoutUrl } = await createVivaPaymentOrder({
        // Το ποσό της βάσης, ποτέ του πελάτη.
        amount: booking.total_price,
        customerEmail: user.email,
        // Το JWT δεν έχει full_name (lib/userName).
        customerName: await fullNameOf(user.email),
        orderId: booking_id,
        description: `GlobiPet κράτηση #${booking_id.slice(0, 8)}`,
        successUrl: `${frontendUrl}/bookings/${booking_id}/confirmation`,
        failureUrl: `${frontendUrl}/bookings/${booking_id}/confirmation`,
      })

      // Μόνο όσο είναι ακόμη απλήρωτη: αν πληρώθηκε στο μεταξύ, το
      // payment_ref είναι πια η συναλλαγή και δεν πρέπει να χαθεί.
      await prisma.booking.updateMany({
        where: { id: booking_id, payment_status: 'unpaid' },
        data: { payment_ref: String(orderCode) },
      })

      return { checkoutUrl, orderCode }
    } catch (err: any) {
      console.error('Viva booking checkout error:', err)
      return serverError(reply, err, 'booking-checkout', 'Η πληρωμή δεν ξεκίνησε.')
    }
  })

  /**
   * Επιβεβαίωση πληρωμής μετά την επιστροφή από τη Viva (σελίδα επιβεβαίωσης
   * web/κινητού, με το ?t= της Viva). Το webhook του orders.ts κάνει το ίδιο
   * ως εφεδρεία. Ο server ξαναρωτά τη Viva — το transaction id δεν αρκεί.
   */
  app.post('/:id/viva/verify', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const { id } = req.params
    const { transaction_id } = (req.body ?? {}) as any
    try {
      const b = await prisma.booking.findUnique({ where: { id } })
      if (!b || b.customer_email !== email) return reply.code(404).send({ message: 'Η κράτηση δεν βρέθηκε' })

      // Το transaction id της Viva είναι UUID· οτιδήποτε άλλο δεν φτάνει στη Viva.
      if (transaction_id != null && transaction_id !== ''
        && (typeof transaction_id !== 'string' || !UUID_RE.test(transaction_id))) {
        return reply.code(400).send({ message: 'Μη έγκυρο αναγνωριστικό συναλλαγής' })
      }

      let result: string | null = null
      if (transaction_id && typeof transaction_id === 'string' && b.payment_ref !== transaction_id) {
        result = await confirmBookingPayment(id, transaction_id)
        // Η Viva δεν απάντησε (5xx/δίκτυο): 503, ο πελάτης ξαναδοκιμάζει.
        if (result === 'error') {
          return reply.code(503).send({ message: 'Η επαλήθευση της πληρωμής δεν ολοκληρώθηκε. Δοκίμασε ξανά σε λίγο.', retry: true })
        }
      }
      const fresh = await prisma.booking.findUnique({ where: { id } })
      return {
        paid: fresh?.payment_status === 'paid',
        // 'paid' | 'already' | 'refunded' | 'refund_failed' | 'invalid' | null
        result,
        data: fresh ? { ...fresh, payable: isBookingPayable(fresh) } : null,
      }
    } catch (err: any) {
      console.error('Booking verify error:', err)
      return serverError(reply, err, 'booking-verify')
    }
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
  /**
   * Τι θα γίνει αν ακυρωθεί τώρα: επιστροφή, κράτημα, αν επιτρέπεται.
   * Το web και το κινητό το δείχνουν στον χρήστη ΠΡΙΝ επιβεβαιώσει.
   */
  app.get('/:id/cancellation', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const user = req.user as any
    const b = await prisma.booking.findUnique({ where: { id: req.params.id } })
    if (!b) return reply.code(404).send({ message: 'Η κράτηση δεν βρέθηκε' })
    const isCustomer = b.customer_email === user.email
    const isProvider = b.provider_email === user.email
    if (!isCustomer && !isProvider && user.role !== 'admin') {
      return reply.code(403).send({ message: 'Δεν έχεις πρόσβαση σε αυτή την κράτηση' })
    }
    const by = user.role === 'admin' ? 'admin' : isCustomer ? 'customer' : 'provider'
    return { data: cancellationTerms(b, by) }
  })

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

    // Ακύρωση: πολιτική 24 ωρών και επιστροφή μέσω Viva (lib/cancellation).
    if (body.status === 'cancelled') {
      const by = isAdmin ? 'admin' : isCustomer ? 'customer' : 'provider'
      try {
        const r = await cancelBooking(req, existing.id, by)
        return { ...r.booking, refund: r.terms.refund, fee: r.terms.fee }
      } catch (err: any) {
        if (err instanceof CancelError) return reply.code(err.code).send({ message: err.message })
        throw err
      }
    }

    const data: any = {}

    // Rescheduling and notes are open to both sides.
    if (body.booking_date !== undefined) data.booking_date = String(body.booking_date)
    if (body.booking_time !== undefined) data.booking_time = String(body.booking_time)
    // Μετάθεση πληρωμένης κράτησης από τον πελάτη: πολιτική ακύρωσης
    // (lib/cancellation rescheduleBlock). Ο πάροχος/admin (και η αλλαγή
    // επαγγελματία) δεν επηρεάζονται — εκτός από ακύρωση σε εξέλιξη.
    if ((data.booking_date !== undefined && data.booking_date !== existing.booking_date)
      || (data.booking_time !== undefined && data.booking_time !== existing.booking_time)) {
      const block = rescheduleBlock(existing.payment_status, isCustomer && !isAdmin && !isProvider,
        { date: existing.booking_date, time: existing.booking_time },
        { date: data.booking_date ?? existing.booking_date, time: data.booking_time ?? existing.booking_time })
      if (block) return reply.code(block.code).send({ message: block.message })
    }
    if (body.notes !== undefined) data.notes = body.notes || null

    // Status transitions. Cancelling is available to both parties; marking a
    // booking completed is the provider's call and only once it is paid.
    if (body.status !== undefined) {
      // Ακυρωμένη κράτηση δεν «ξανανοίγει» (π.χ. σε confirmed): η επιστροφή
      // χρημάτων έχει ήδη γίνει και η θέση έχει ελευθερωθεί.
      if (existing.status === 'cancelled') {
        return reply.code(409).send({ message: 'Η κράτηση έχει ακυρωθεί' })
      }
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
