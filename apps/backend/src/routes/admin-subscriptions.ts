import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const adminSubscriptionsRoutes: FastifyPluginAsync = async (app) => {

  app.addHook('preHandler', async (req, reply) => {
    try {
      await (app as any).authenticate(req, reply)
      if ((req.user as any)?.role !== 'admin') {
        return reply.code(403).send({ message: 'Απαγορευμένη πρόσβαση' })
      }
    } catch {
      return reply.code(401).send({ message: 'Μη εξουσιοδοτημένος' })
    }
  })

  // GET /admin/subscriptions/ai
  app.get('/ai', async (req, reply) => {
    const users = await prisma.user.findMany({
      where: { ai_subscription_status: { not: 'none' } },
      select: { id: true, full_name: true, email: true, ai_subscription_status: true, ai_trial_started_at: true, ai_subscription_plan_id: true },
      orderBy: { ai_trial_started_at: 'desc' },
    })
    return reply.send({ data: users })
  })

  // GET /admin/subscriptions/food
  app.get('/food', async (req, reply) => {
    const subs = await prisma.productSubscription.findMany({
      include: {
        user: { select: { id: true, full_name: true, email: true } },
        product: { select: { id: true, name: true, image_url: true } },
      },
      orderBy: { created_at: 'desc' },
    })
    return reply.send({ data: subs })
  })

  // PATCH /admin/subscriptions/food/:id — admin can pause/cancel/reactivate
  app.patch('/food/:id', async (req: any, reply) => {
    const { status } = req.body as { status: string }
    const updated = await prisma.productSubscription.update({
      where: { id: req.params.id },
      data: { status },
    })
    return reply.send({ data: updated })
  })

  // GET /admin/subscriptions/insurance
  app.get('/insurance', async (req, reply) => {
    const subs = await prisma.userInsuranceSubscription.findMany({
      include: {
        user: { select: { id: true, full_name: true, email: true } },
        plan: { select: { id: true, name: true, name_el: true, tier: true, price_monthly: true, provider: { select: { name: true } } } },
      },
      orderBy: { created_at: 'desc' },
    })
    return reply.send({ data: subs })
  })

  // POST /admin/subscriptions/insurance — admin manually registers a user's insurance plan
  app.post('/insurance', async (req: any, reply) => {
    const { user_id, plan_id, pet_id } = req.body as any
    if (!user_id || !plan_id) return reply.code(400).send({ message: 'user_id και plan_id απαιτούνται' })
    const sub = await prisma.userInsuranceSubscription.create({
      data: { user_id, plan_id, pet_id, status: 'active' },
    })
    return reply.code(201).send({ data: sub })
  })

  // PATCH /admin/subscriptions/insurance/:id
  app.patch('/insurance/:id', async (req: any, reply) => {
    const { status } = req.body as { status: string }
    const updated = await prisma.userInsuranceSubscription.update({
      where: { id: req.params.id },
      data: { status },
    })
    return reply.send({ data: updated })
  })

  // GET /admin/subscriptions/overview — unified table across all subscription types
  app.get('/overview', async (req, reply) => {
    const [aiUsers, foodSubs, insuranceSubs] = await Promise.all([
      prisma.user.findMany({
        where: { ai_subscription_status: { not: 'none' } },
        select: { id: true, full_name: true, email: true, ai_subscription_status: true, ai_trial_started_at: true },
      }),
      prisma.productSubscription.findMany({
        include: { user: { select: { full_name: true, email: true } }, product: { select: { name: true } } },
      }),
      prisma.userInsuranceSubscription.findMany({
        include: { user: { select: { full_name: true, email: true } }, plan: { select: { name_el: true, name: true } } },
      }),
    ])

    const rows = [
      ...aiUsers.map(u => ({
        type: 'ai',
        user_name: u.full_name,
        user_email: u.email,
        plan_name: 'AI Health',
        status: u.ai_subscription_status,
        started_at: u.ai_trial_started_at,
      })),
      ...foodSubs.map(s => ({
        type: 'food',
        user_name: s.user.full_name,
        user_email: s.user.email,
        plan_name: `Τροφή: ${s.product.name}`,
        status: s.status,
        started_at: s.start_date,
        price: s.monthly_price,
      })),
      ...insuranceSubs.map(s => ({
        type: 'insurance',
        user_name: s.user.full_name,
        user_email: s.user.email,
        plan_name: s.plan.name_el || s.plan.name,
        status: s.status,
        started_at: s.started_at,
      })),
    ].sort((a, b) => new Date(b.started_at as any).getTime() - new Date(a.started_at as any).getTime())

    return reply.send({ data: rows })
  })
}

export default adminSubscriptionsRoutes
