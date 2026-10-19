import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { getRequestLang, translateRecord, translateRecords } from '../lib/i18n.js'

/**
 * Πεδία που ορίζει ο ίδιος ο πάροχος.
 *
 * ΓΙΑΤΙ: το POST/PATCH περνούσαν ΟΛΟ το σώμα στη βάση. Ένας πάροχος μπορούσε
 * να στείλει is_verified: true, rating: 5, reviews_count: 900 και να
 * εμφανιστεί ως επαληθευμένος με τέλεια βαθμολογία. Τα πεδία αυτά τα ορίζει
 * η πλατφόρμα (έλεγχος, κριτικές), όχι ο πάροχος. Ο admin εξαιρείται.
 */
const SERVICE_EDITABLE = new Set([
  'title', 'description', 'city', 'location', 'latitude', 'longitude', 'home_visits',
  'emergency_available', 'years_experience', 'specializations', 'pet_types', 'languages',
  'is_active', 'available_days', 'available_since', 'contact_email', 'contact_phone',
  'image_url', 'cover_image', 'is_available_now', 'price', 'provider_name', 'service_type',
  'category', 'country',
])
function pickService(body: any, isAdmin: boolean) {
  const src = body ?? {}
  if (isAdmin) { const { id: _i, created_at: _c, updated_at: _u, ...rest } = src; return rest }
  return Object.fromEntries(Object.entries(src).filter(([k]) => SERVICE_EDITABLE.has(k)))
}

const servicesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (req: any) => {
    const lang = getRequestLang(req)
    const { q, city, service_type, verified, emergency, min_rating, page = 1, limit = 20 } = req.query
    const where: any = {}
    if (q) where.OR = [{ provider_name: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }]
    if (city) where.city = { contains: city, mode: 'insensitive' }
    if (service_type) where.service_type = service_type
    if (verified === 'true') where.is_verified = true
    if (emergency === 'true') where.emergency_available = true
    if (min_rating) where.rating = { gte: Number(min_rating) }
    const skip = (Number(page) - 1) * Number(limit)
    const [data, total] = await Promise.all([
      prisma.service.findMany({ where, skip, take: Number(limit), orderBy: { rating: 'desc' } }),
      prisma.service.count({ where })
    ])
    const translated = await translateRecords('service', data, lang)
    return { data: translated, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) }
  })

  // Οι υπηρεσίες του συνδεδεμένου παρόχου.
  // ΠΡΟΣΟΧΗ: πρέπει να δηλώνεται ΠΡΙΝ από το '/:id', αλλιώς το parametric
  // route πιάνει το "my" ως αναγνωριστικό υπηρεσίας.
  /**
   * Μαζική εισαγωγή υπηρεσιών από Excel/CSV — για τον ΙΔΙΟ τον πάροχο.
   *
   * Η καρτέλα Import του web καλούσε /services/bulk, που δεν υπήρχε (404):
   * η εισαγωγή δεν δούλεψε ποτέ. Το /admin/bulk-import είναι μόνο για admin.
   */
  app.post('/bulk', { preHandler: [(app as any).authenticate] }, async (req: any, reply: any) => {
    const { email, full_name, role } = req.user as any
    if (role !== 'admin' && role !== 'service_provider' && role !== 'both') {
      return reply.code(403).send({ message: 'Μόνο πάροχοι μπορούν να δημιουργούν υπηρεσίες' })
    }
    const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 500) : []
    if (items.length === 0) return reply.code(400).send({ message: 'Δεν υπάρχουν εγγραφές για εισαγωγή' })
    const first = await prisma.service.findFirst({ where: { provider_email: email }, orderBy: { created_at: 'asc' } })
    let created = 0
    const failed: { row: number; message: string }[] = []
    for (const [i, it] of items.entries()) {
      const title = String(it?.name ?? '').trim()
      const price = Number(it?.price)
      if (!title) { failed.push({ row: i + 2, message: 'Λείπει όνομα' }); continue }
      try {
        await prisma.service.create({
          data: {
            provider_email: email,
            provider_name: first?.provider_name || full_name,
            title,
            description: String(it?.description ?? '').trim() || title,
            price: Number.isFinite(price) && price >= 0 ? price : 0,
            service_type: String(it?.type || it?.category || first?.service_type || 'other'),
            category: String(it?.type || it?.category || first?.category || first?.service_type || 'other'),
            city: String(it?.city || first?.city || ''),
            is_active: true,
          },
        })
        created++
      } catch (err: any) {
        failed.push({ row: i + 2, message: 'Μη έγκυρη εγγραφή' })
      }
    }
    return { count: created, failed }
  })

  app.get('/my', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const email = (req.user as any).email
    const data = await prisma.service.findMany({
      where: { provider_email: email },
      orderBy: { created_at: 'desc' },
    })
    return { data, total: data.length }
  })

  app.get('/:id', async (req: any) => {
    const lang = getRequestLang(req)
    const service = await prisma.service.findUniqueOrThrow({ where: { id: req.params.id } })
    return translateRecord('service', service, lang)
  })

  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply: any) => {
    const { email, full_name, role } = req.user as any
    // Only providers/admins may create services.
    if (role !== 'admin' && role !== 'service_provider' && role !== 'both') {
      return reply.code(403).send({ message: 'Μόνο πάροχοι μπορούν να δημιουργούν υπηρεσίες' })
    }
    // Callers cannot spoof provider_email; only admins can set it explicitly.
    const { provider_email: bodyOwner, ...body } = req.body ?? {}
    const provider_email = (role === 'admin' && bodyOwner) || email
    const clean: any = pickService(body, role === 'admin')
    return prisma.service.create({ data: { ...clean, provider_email, provider_name: clean.provider_name || full_name } })
  })

  // Επιβεβαιώνει ότι η υπηρεσία ανήκει στον συνδεδεμένο χρήστη.
  // Χωρίς αυτό, οποιοσδήποτε συνδεδεμένος μπορούσε να αλλάξει ή να
  // διαγράψει υπηρεσία άλλου παρόχου.
  async function assertOwner(req: any, reply: any) {
    const user = req.user as any
    const svc = await prisma.service.findUnique({
      where: { id: req.params.id },
      select: { id: true, provider_email: true },
    })
    if (!svc) { reply.code(404).send({ message: 'Η υπηρεσία δεν βρέθηκε' }); return null }
    if (svc.provider_email !== user.email && user.role !== 'admin') {
      reply.code(403).send({ message: 'Η υπηρεσία δεν σου ανήκει' }); return null
    }
    return svc
  }

  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply: any) => {
    if (!(await assertOwner(req, reply))) return
    const data: any = pickService(req.body, (req.user as any).role === 'admin')
    delete data.provider_email        // δεν αλλάζει ιδιοκτήτη
    return prisma.service.update({ where: { id: req.params.id }, data })
  })

  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply: any) => {
    if (!(await assertOwner(req, reply))) return

    // Υπηρεσία με κρατήσεις ΔΕΝ διαγράφεται: το foreign key είναι RESTRICT,
    // και σωστά — μια ιστορική κράτηση πρέπει να ξέρει τι κλείστηκε.
    //
    // Χωρίς αυτόν τον έλεγχο, η Postgres πετά σφάλμα 23503 και ο πάροχος
    // έβλεπε ωμό μήνυμα βάσης. Τώρα παίρνει εξήγηση και τη σωστή εναλλακτική:
    // απενεργοποίηση, που κρύβει την υπηρεσία χωρίς να χαλά το ιστορικό.
    const bookings = await prisma.booking.count({ where: { service_id: req.params.id } })
    if (bookings > 0) {
      return reply.code(409).send({
        message: 'Η υπηρεσία έχει κρατήσεις και δεν διαγράφεται. Απενεργοποίησέ την αντί να τη σβήσεις.',
        code: 'SERVICE_HAS_BOOKINGS',
        bookings,
      })
    }

    await prisma.service.delete({ where: { id: req.params.id } }); return { success: true }
  })
}
export default servicesRoutes
