import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { getRequestLang, translateRecord, translateRecords } from '../lib/i18n.js'

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

  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email, full_name } = req.user as any
    return prisma.service.create({ data: { ...req.body, provider_email: email, provider_name: req.body.provider_name || full_name } })
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
    const data = { ...req.body }
    delete data.provider_email        // δεν αλλάζει ιδιοκτήτη
    delete data.id
    return prisma.service.update({ where: { id: req.params.id }, data })
  })

  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply: any) => {
    if (!(await assertOwner(req, reply))) return
    await prisma.service.delete({ where: { id: req.params.id } }); return { success: true }
  })
}
export default servicesRoutes
