import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'

export default async function insuranceRoutes(app: FastifyInstance) {

  // GET /insurance/providers - λίστα ασφαλιστικών εταιρειών με τα πλάνα τους
  app.get('/insurance/providers', async (req, reply) => {
    const providers = await prisma.insuranceProvider.findMany({
      where: { is_active: true },
      include: {
        plans: {
          where: { is_active: true },
          orderBy: [{ display_order: 'asc' }, { price_monthly: 'asc' }],
        },
      },
      orderBy: { display_order: 'asc' },
    })
    return reply.send({ data: providers })
  })

  // GET /insurance/plans - όλα τα πλάνα με φίλτρα
  app.get('/insurance/plans', async (req: any, reply) => {
    const { pet_type, tier, max_price, covers_surgery, covers_dental } = req.query

    const plans = await prisma.insurancePlan.findMany({
      where: {
        is_active: true,
        ...(pet_type && { pet_types: { has: pet_type } }),
        ...(tier && { tier }),
        ...(max_price && { price_monthly: { lte: parseFloat(max_price) } }),
        ...(covers_surgery === 'true' && { covers_surgery: true }),
        ...(covers_dental === 'true' && { covers_dental: true }),
      },
      include: {
        provider: { select: { id: true, name: true, name_el: true, logo_url: true, website: true, phone: true } },
      },
      orderBy: [{ is_featured: 'desc' }, { display_order: 'asc' }, { price_monthly: 'asc' }],
    })
    return reply.send({ data: plans })
  })

  // GET /insurance/plans/:id
  app.get('/insurance/plans/:id', async (req: any, reply) => {
    const plan = await prisma.insurancePlan.findUnique({
      where: { id: req.params.id },
      include: { provider: true },
    })
    if (!plan) return reply.code(404).send({ message: 'Not found' })
    return reply.send({ data: plan })
  })

  // ============ ADMIN ROUTES ============

  // POST /admin/insurance/providers
  app.post('/admin/insurance/providers', { preHandler: [(app as any).authenticate, (app as any).requireAdmin] }, async (req: any, reply) => {
    const provider = await prisma.insuranceProvider.create({ data: req.body })
    return reply.code(201).send({ data: provider })
  })

  // PATCH /admin/insurance/providers/:id
  app.patch('/admin/insurance/providers/:id', { preHandler: [(app as any).authenticate, (app as any).requireAdmin] }, async (req: any, reply) => {
    const provider = await prisma.insuranceProvider.update({ where: { id: req.params.id }, data: req.body })
    return reply.send({ data: provider })
  })

  // DELETE /admin/insurance/providers/:id
  app.delete('/admin/insurance/providers/:id', { preHandler: [(app as any).authenticate, (app as any).requireAdmin] }, async (req: any, reply) => {
    await prisma.insuranceProvider.delete({ where: { id: req.params.id } })
    return reply.send({ success: true })
  })

  // POST /admin/insurance/plans
  app.post('/admin/insurance/plans', { preHandler: [(app as any).authenticate, (app as any).requireAdmin] }, async (req: any, reply) => {
    const plan = await prisma.insurancePlan.create({ data: req.body })
    return reply.code(201).send({ data: plan })
  })

  // PATCH /admin/insurance/plans/:id
  app.patch('/admin/insurance/plans/:id', { preHandler: [(app as any).authenticate, (app as any).requireAdmin] }, async (req: any, reply) => {
    const plan = await prisma.insurancePlan.update({ where: { id: req.params.id }, data: req.body })
    return reply.send({ data: plan })
  })

  // DELETE /admin/insurance/plans/:id
  app.delete('/admin/insurance/plans/:id', { preHandler: [(app as any).authenticate, (app as any).requireAdmin] }, async (req: any, reply) => {
    await prisma.insurancePlan.delete({ where: { id: req.params.id } })
    return reply.send({ success: true })
  })
}
