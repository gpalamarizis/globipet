import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const servicesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (req: any) => {
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
    return { data, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) }
  })

  app.get('/:id', async (req: any) => prisma.service.findUniqueOrThrow({ where: { id: req.params.id } }))

  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email, full_name } = req.user as any
    return prisma.service.create({ data: { ...req.body, provider_email: email, provider_name: req.body.provider_name || full_name } })
  })

  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    return prisma.service.update({ where: { id: req.params.id }, data: req.body })
  })

  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    await prisma.service.delete({ where: { id: req.params.id } }); return { success: true }
  })
}
export default servicesRoutes
