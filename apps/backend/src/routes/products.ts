import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { createHash } from 'node:crypto'
import { getRequestLang, translateRecord, translateRecords } from '../lib/i18n.js'
import { effectivePrice } from '../lib/price.js'

/**
 * Πεδία προϊόντος που ορίζει ο πάροχος.
 *
 * ΓΙΑΤΙ: όλο το σώμα πήγαινε στη βάση — rating, reviews_count, views_count,
 * is_featured ορίζονταν από τον ίδιο τον πωλητή. Και κάθε άγνωστο πεδίο
 * (π.χ. το is_active που έστελνε το κινητό) έριχνε την εγγραφή με σφάλμα
 * Prisma: η προσθήκη προϊόντος από το κινητό αποτύγχανε ΠΑΝΤΑ.
 */
const PRODUCT_EDITABLE = new Set([
  'name', 'description', 'price', 'category', 'brand', 'image_url', 'images', 'stock',
  'target_species', 'discount_percentage', 'sale_price', 'is_subscribable',
])
const PRODUCT_ADMIN = new Set([...PRODUCT_EDITABLE, 'is_featured', 'rating', 'reviews_count'])
function pickProduct(body: any, isAdmin: boolean) {
  const allow = isAdmin ? PRODUCT_ADMIN : PRODUCT_EDITABLE
  return Object.fromEntries(Object.entries(body ?? {}).filter(([k]) => allow.has(k)))
}

const productsRoutes: FastifyPluginAsync = async (app) => {

  /** Load a product and verify the caller can mutate it. */
  async function assertOwnsProduct(req: any, reply: any, id: string) {
    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) {
      reply.code(404).send({ message: 'Το προϊόν δεν βρέθηκε' })
      return null
    }
    const user = req.user as any
    // Admins bypass; otherwise only the product's provider can mutate it.
    if (user.role !== 'admin' && product.provider_email !== user.email) {
      reply.code(403).send({ message: 'Δεν έχεις δικαίωμα να τροποποιήσεις αυτό το προϊόν' })
      return null
    }
    return product
  }

  /** Only sellers may create products. */
  function assertCanSell(req: any, reply: any) {
    const role = (req.user as any)?.role
    if (role !== 'admin' && role !== 'service_provider' && role !== 'both') {
      reply.code(403).send({ message: 'Μόνο πάροχοι μπορούν να δημιουργούν προϊόντα' })
      return false
    }
    return true
  }

  // ─── Public listings ────────────────────────────────────────────────

  app.get('/', async (req: any) => {
    const lang = getRequestLang(req)
    const { q, category, featured, min_price, max_price, sort, page = 1 } = req.query
    // Ανώτατο όριο σελίδας: 100 (500 για διαχειριστή — AdminTranslationsPage
    // ζητά ?limit=500 για τον επιλογέα). Πριν, ?limit=1000000 περνούσε.
    let isAdmin = false
    if (req.headers?.authorization) {
      try { await req.jwtVerify(); isAdmin = (req.user as any)?.role === 'admin' } catch { isAdmin = false }
    }
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 20), isAdmin ? 500 : 100)
    const pageNo = Math.max(1, Number(page) || 1)
    const where: any = {}
    if (q) where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }]
    if (category) where.category = category
    if (featured === 'true') where.is_featured = true
    // Φίλτρο τιμής πάνω στην τιμή που ΧΡΕΩΝΕΤΑΙ (effectivePrice, lib/price):
    // sale_price όταν ισχύει (> 0 και < price), αλλιώς price. Πριν, το φίλτρο
    // κοίταζε μόνο την price — προϊόν 30€ σε έκπτωση 15€ έλειπε από το «έως 20€».
    // Σε AND, γιατί το where.OR το χρησιμοποιεί ήδη η αναζήτηση.
    const lo = min_price ? Number(min_price) : NaN
    const hi = max_price ? Number(max_price) : NaN
    if (Number.isFinite(lo) || Number.isFinite(hi)) {
      const range: any = {}
      if (Number.isFinite(lo)) range.gte = lo
      if (Number.isFinite(hi)) range.lte = hi
      const listPrice = prisma.product.fields.price
      where.AND = [{
        OR: [
          // Σε έκπτωση: μετρά η sale_price.
          { AND: [{ sale_price: { gt: 0 } }, { sale_price: { lt: listPrice } }, { sale_price: range }] },
          // Χωρίς (έγκυρη) έκπτωση: μετρά η price.
          {
            AND: [
              { OR: [{ sale_price: null }, { sale_price: { lte: 0 } }, { sale_price: { gte: listPrice } }] },
              { price: range },
            ],
          },
        ],
      }]
    }

    // Δεύτερο κριτήριο { id: 'asc' }: με ίσες τιμές (π.χ. πολλά προϊόντα με
    // rating 0 ή is_featured false) η σειρά της βάσης δεν είναι σταθερή, και η
    // σελιδοποίηση (skip/take) έδειχνε διπλά ή έχανε προϊόντα ανάμεσα σε σελίδες.
    const orderBy: any = sort === 'rating' ? [{ rating: 'desc' }, { id: 'asc' }]
      : sort === 'newest' ? [{ created_at: 'desc' }, { id: 'asc' }]
      : [{ is_featured: 'desc' }, { id: 'asc' }]  // 'featured' (default)

    const skip = (pageNo - 1) * limit
    let data: any[]
    let total: number
    if (sort === 'price_asc' || sort === 'price_desc') {
      // Ταξινόμηση κατά τιμή που χρεώνεται. Η Prisma δεν ταξινομεί κατά
      // υπολογισμένη τιμή, οπότε: ids + τιμές όλων όσων περνούν το ΙΔΙΟ where
      // (τρία πεδία), ταξινόμηση εδώ με τον ίδιο κανόνα, και μετά ανάγνωση
      // μόνο της σελίδας — η σελιδοποίηση και το total μένουν σωστά.
      const dir = sort === 'price_asc' ? 1 : -1
      const all = await prisma.product.findMany({ where, select: { id: true, price: true, sale_price: true } })
      all.sort((a, b) => (effectivePrice(a) - effectivePrice(b)) * dir || a.id.localeCompare(b.id))
      const pageIds = all.slice(skip, skip + limit).map(r => r.id)
      const rows = pageIds.length ? await prisma.product.findMany({ where: { id: { in: pageIds } } }) : []
      const byId = new Map(rows.map(r => [r.id, r]))
      data = pageIds.map(id => byId.get(id)).filter(Boolean) as any[]
      total = all.length
    } else {
      ;[data, total] = await Promise.all([
        prisma.product.findMany({ where, skip, take: limit, orderBy }),
        prisma.product.count({ where })
      ])
    }
    const translated = await translateRecords('product', data, lang)
    return { data: translated, total, page: pageNo, totalPages: Math.ceil(total / limit) }
  })

  // ─── Provider dashboard ────────────────────────────────────────────

  /**
   * GET /my — products owned by the caller.
   * Admins see all products; providers see only their own.
   * Returns raw (untranslated) data so the owner can edit source content.
   */
  /**
   * Μαζική εισαγωγή προϊόντων από Excel/CSV — για τον ίδιο τον πάροχο.
   * Η καρτέλα Import του web καλούσε /products/bulk, που δεν υπήρχε (404).
   */
  app.post('/bulk', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    if (!assertCanSell(req, reply)) return
    const { email } = req.user as any
    const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 500) : []
    if (items.length === 0) return reply.code(400).send({ message: 'Δεν υπάρχουν εγγραφές για εισαγωγή' })
    let created = 0
    const failed: { row: number; message: string }[] = []
    for (const [i, it] of items.entries()) {
      const name = String(it?.name ?? '').trim()
      const price = Number(it?.price)
      if (!name) { failed.push({ row: i + 2, message: 'Λείπει όνομα' }); continue }
      if (!Number.isFinite(price) || price <= 0) { failed.push({ row: i + 2, message: 'Μη έγκυρη τιμή' }); continue }
      try {
        await prisma.product.create({
          data: {
            provider_email: email,
            name,
            description: String(it?.description ?? '').trim() || name,
            price,
            category: String(it?.category || 'other'),
            stock: Math.max(0, parseInt(String(it?.stock ?? '0'), 10) || 0),
          },
        })
        created++
      } catch {
        failed.push({ row: i + 2, message: 'Μη έγκυρη εγγραφή' })
      }
    }
    return { count: created, failed }
  })

  app.get('/my', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const user = req.user as any
    const where = user.role === 'admin' ? {} : { provider_email: user.email }
    const data = await prisma.product.findMany({
      where,
      orderBy: { created_at: 'desc' },
    })
    return { data, total: data.length }
  })

  /**
   * Count a product view, once per visitor per day.
   *
   * The visitor is a hash of IP and user agent — enough to make a ranking
   * mean something without keeping an address on file. Without the dedup a
   * refresh loop would decide which products the insights page calls popular.
   */
  function visitorHash(req: any): string {
    // req.ip (trustProxy, index.ts): το πρώτο στοιχείο του X-Forwarded-For
    // το γράφει ο ίδιος ο client, οπότε άλλαζε «επισκέπτη» σε κάθε αίτημα.
    const ip = req.ip || 'unknown'
    const ua = (req.headers['user-agent'] || '').toString().slice(0, 200)
    return createHash('sha256')
      .update(`${ip}|${ua}|${process.env.JWT_SECRET || 'globipet'}`)
      .digest('hex').slice(0, 32)
  }

  async function countView(req: any, productId: string) {
    const day = new Date()
    day.setUTCHours(0, 0, 0, 0)
    try {
      await prisma.productImpression.create({
        data: { product_id: productId, visitor_hash: visitorHash(req), day },
      })
    } catch {
      return // already counted today, or the product vanished mid-request
    }
    await prisma.product.update({
      where: { id: productId },
      data: { views_count: { increment: 1 } },
    }).catch(() => {})
  }

  // Public detail — placed AFTER /my so the router doesn't match /my as :id
  app.get('/:id', async (req: any) => {
    const lang = getRequestLang(req)
    const product = await prisma.product.findUniqueOrThrow({ where: { id: req.params.id } })
    // Fire and forget: a view counter must never delay or fail the page.
    countView(req, product.id).catch(() => {})
    return translateRecord('product', product, lang)
  })

  // ─── Create / update / delete ──────────────────────────────────────

  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    if (!assertCanSell(req, reply)) return
    const { email, role } = req.user as any
    // Admins may override the owner via provider_email in body; others cannot.
    const provider_email = (role === 'admin' && req.body?.provider_email) || email
    // Strip caller-supplied provider_email from body so we own the value.
    const data: any = pickProduct(req.body, role === 'admin')
    return prisma.product.create({ data: { ...data, provider_email } })
  })

  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const product = await assertOwnsProduct(req, reply, req.params.id)
    if (!product) return
    // Never allow re-assigning ownership through PATCH — only admins can.
    const isAdmin = (req.user as any).role === 'admin'
    const body: any = pickProduct(req.body, isAdmin)
    const provider_email = req.body?.provider_email
    const data = (isAdmin && provider_email) ? { ...body, provider_email } : body
    return prisma.product.update({ where: { id: product.id }, data })
  })

  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const product = await assertOwnsProduct(req, reply, req.params.id)
    if (!product) return
    await prisma.product.delete({ where: { id: product.id } })
    return { success: true }
  })
}
export default productsRoutes
