import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { getRequestLang, translateRecord, translateRecords } from '../lib/i18n.js'

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
    const { q, category, featured, min_price, max_price, sort, page = 1, limit = 20 } = req.query
    const where: any = {}
    if (q) where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }]
    if (category) where.category = category
    if (featured === 'true') where.is_featured = true
    if (min_price) where.price = { ...where.price, gte: Number(min_price) }
    if (max_price) where.price = { ...where.price, lte: Number(max_price) }

    const orderBy: any = sort === 'price_asc' ? { price: 'asc' }
      : sort === 'price_desc' ? { price: 'desc' }
      : sort === 'rating' ? { rating: 'desc' }
      : sort === 'newest' ? { created_at: 'desc' }
      : { is_featured: 'desc' }  // 'featured' (default)

    const skip = (Number(page) - 1) * Number(limit)
    const [data, total] = await Promise.all([
      prisma.product.findMany({ where, skip, take: Number(limit), orderBy }),
      prisma.product.count({ where })
    ])
    const translated = await translateRecords('product', data, lang)
    return { data: translated, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) }
  })

  // ─── Provider dashboard ────────────────────────────────────────────

  /**
   * GET /my — products owned by the caller.
   * Admins see all products; providers see only their own.
   * Returns raw (untranslated) data so the owner can edit source content.
   */
  app.get('/my', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const user = req.user as any
    const where = user.role === 'admin' ? {} : { provider_email: user.email }
    const data = await prisma.product.findMany({
      where,
      orderBy: { created_at: 'desc' },
    })
    return { data, total: data.length }
  })

  // Public detail — placed AFTER /my so the router doesn't match /my as :id
  app.get('/:id', async (req: any) => {
    const lang = getRequestLang(req)
    const product = await prisma.product.findUniqueOrThrow({ where: { id: req.params.id } })
    return translateRecord('product', product, lang)
  })

  // ─── Create / update / delete ──────────────────────────────────────

  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    if (!assertCanSell(req, reply)) return
    const { email, role } = req.user as any
    // Admins may override the owner via provider_email in body; others cannot.
    const provider_email = (role === 'admin' && req.body?.provider_email) || email
    // Strip caller-supplied provider_email from body so we own the value.
    const { provider_email: _ignored, ...body } = req.body ?? {}
    return prisma.product.create({ data: { ...body, provider_email } })
  })

  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const product = await assertOwnsProduct(req, reply, req.params.id)
    if (!product) return
    // Never allow re-assigning ownership through PATCH — only admins can.
    const { provider_email, ...body } = req.body ?? {}
    const data = ((req.user as any).role === 'admin' && provider_email)
      ? { ...body, provider_email }
      : body
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
