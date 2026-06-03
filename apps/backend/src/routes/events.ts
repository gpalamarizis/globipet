import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { getRequestLang, translateRecord, translateRecords } from '../lib/i18n.js'

const eventsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (req: any) => {
    const lang = getRequestLang(req)
    const { q, city, country, event_type, upcoming, featured, page = 1, limit = 20 } = req.query
    const where: any = {}
    if (q) where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }]
    if (city) where.city = { contains: city, mode: 'insensitive' }
    if (country) where.country = country
    if (event_type) where.event_type = event_type
    if (featured === 'true') where.is_featured = true
    if (upcoming === 'true') {
      const today = new Date().toISOString().split('T')[0]
      where.date = { gte: today }
    }
    const skip = (Number(page) - 1) * Number(limit)
    const [data, total] = await Promise.all([
      prisma.event.findMany({ where, skip, take: Number(limit), orderBy: { date: 'asc' } }),
      prisma.event.count({ where })
    ])
    const translated = translateRecords(data, lang, ['title', 'description'])
    return { data: translated, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) }
  })

  app.get('/:id', async (req: any) => {
    const lang = getRequestLang(req)
    const event = await prisma.event.findUniqueOrThrow({ where: { id: req.params.id } })
    return translateRecord(event, lang, ['title', 'description'])
  })

  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email, full_name } = req.user as any
    return prisma.event.create({ data: { ...req.body, organizer_email: email, organizer: req.body.organizer || full_name } })
  })

  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    return prisma.event.update({ where: { id: req.params.id }, data: req.body })
  })

  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    await prisma.event.delete({ where: { id: req.params.id } }); return { success: true }
  })
}
export default eventsRoutes
