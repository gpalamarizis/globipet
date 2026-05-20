import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { getRequestLang, translateRecord, translateRecords } from '../lib/i18n.js'

const productsRoutes: FastifyPluginAsync = async (app) => {
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
    const translated = translateRecords(data, lang, ['name', 'description'])
    return { data: translated, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) }
  })

  app.get('/:id', async (req: any) => {
    const lang = getRequestLang(req)
    const product = await prisma.product.findUniqueOrThrow({ where: { id: req.params.id } })
    return translateRecord(product, lang, ['name', 'description'])
  })

  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    return prisma.product.create({ data: { ...req.body, provider_email: req.body.provider_email || email } })
  })

  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    return prisma.product.update({ where: { id: req.params.id }, data: req.body })
  })

  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    await prisma.product.delete({ where: { id: req.params.id } }); return { success: true }
  })
}
export default productsRoutes
