import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const aiSubscriptionsRoutes: FastifyPluginAsync = async (app) => {

  const isAdmin = async (req: any, reply: any) => {
    if ((req.user as any)?.role !== 'admin') {
      return reply.code(403).send({ message: 'Forbidden' })
    }
  }

  // GET /ai-subscriptions/plans
  app.get('/plans', async (req, reply) => {
    const plans = await prisma.aiSubscriptionPlan.findMany({
      where: { is_active: true },
      orderBy: [{ is_featured: 'desc' }, { display_order: 'asc' }, { price_monthly: 'asc' }],
    })
    return reply.send({ data: plans })
  })

  // GET /ai-subscriptions/my-status
  app.get('/my-status', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: (req.user as any).id },
      select: { ai_subscription_status: true, ai_trial_started_at: true, ai_subscription_plan_id: true },
    })
    if (!user) return reply.code(404).send({ message: 'Not found' })

    let daysLeft = null
    if (user.ai_subscription_status === 'trial' && user.ai_trial_started_at) {
      const elapsedMs = Date.now() - new Date(user.ai_trial_started_at).getTime()
      const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24)
      daysLeft = Math.max(0, Math.ceil(15 - elapsedDays))
    }
    return reply.send({ data: { ...user, trial_days_left: daysLeft } })
  })

  // POST /ai-subscriptions/start-trial
  app.post('/start-trial', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const userId = (req.user as any).id
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return reply.code(404).send({ message: 'Not found' })

    if (user.ai_subscription_status !== 'none') {
      return reply.code(400).send({ message: 'Έχετε ήδη χρησιμοποιήσει ή ενεργοποιήσει το δωρεάν trial' })
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { ai_subscription_status: 'trial', ai_trial_started_at: new Date() },
      select: { ai_subscription_status: true, ai_trial_started_at: true },
    })
    return reply.send({ data: updated })
  })

  // POST /admin/ai-subscriptions/plans
  app.post('/admin/plans', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    const plan = await prisma.aiSubscriptionPlan.create({ data: req.body })
    return reply.code(201).send({ data: plan })
  })

  // PATCH /admin/ai-subscriptions/plans/:id
  app.patch('/admin/plans/:id', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    const plan = await prisma.aiSubscriptionPlan.update({ where: { id: req.params.id }, data: req.body })
    return reply.send({ data: plan })
  })

  // DELETE /admin/ai-subscriptions/plans/:id
  app.delete('/admin/plans/:id', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    await prisma.aiSubscriptionPlan.delete({ where: { id: req.params.id } })
    return reply.send({ success: true })
  })
}

export default aiSubscriptionsRoutes
