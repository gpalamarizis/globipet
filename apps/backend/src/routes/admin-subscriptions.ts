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

  // ══════════════════════════════════════════════════════
  // AI SUBSCRIPTIONS
  // ══════════════════════════════════════════════════════

  // GET /admin/subscriptions/ai — list all users with AI subscription, with plan info
  app.get('/ai', async (req, reply) => {
    const users = await prisma.user.findMany({
      where: { ai_subscription_status: { not: 'none' } },
      select: {
        id: true, full_name: true, email: true,
        ai_subscription_status: true, ai_trial_started_at: true, ai_subscription_plan_id: true,
      },
      orderBy: { ai_trial_started_at: 'desc' },
    })

    // Join plan data manually (no relation defined on User → AiSubscriptionPlan)
    const planIds = users.map(u => u.ai_subscription_plan_id).filter(Boolean) as string[]
    const plans = planIds.length
      ? await prisma.aiSubscriptionPlan.findMany({
          where: { id: { in: planIds } },
          select: { id: true, name: true, name_el: true, price_monthly: true,
            includes_ai_health: true, includes_emotion_ai: true,
            includes_wellness_tracker: true, includes_telehealth: true },
        })
      : []
    const planMap = new Map(plans.map(p => [p.id, p]))

    const enriched = users.map(u => {
      const plan = u.ai_subscription_plan_id ? planMap.get(u.ai_subscription_plan_id) : null
      // Calculate trial_days_left if in trial
      let trial_days_left: number | null = null
      if (u.ai_subscription_status === 'trial' && u.ai_trial_started_at) {
        const elapsed = (Date.now() - new Date(u.ai_trial_started_at).getTime()) / (1000 * 60 * 60 * 24)
        trial_days_left = Math.max(0, Math.ceil(30 - elapsed))
      }
      return { ...u, plan, trial_days_left }
    })

    return reply.send({ data: enriched })
  })

  // PATCH /admin/subscriptions/ai/:user_id — admin changes user's AI subscription status/plan
  app.patch('/ai/:user_id', async (req: any, reply) => {
    const b = req.body ?? {}
    const data: any = {}
    if ('ai_subscription_status' in b) {
      const valid = ['none','trial','active','expired']
      if (!valid.includes(b.ai_subscription_status)) {
        return reply.code(400).send({ message: 'Μη έγκυρη κατάσταση' })
      }
      data.ai_subscription_status = b.ai_subscription_status
      // If moving to 'trial', reset the trial start date
      if (b.ai_subscription_status === 'trial') data.ai_trial_started_at = new Date()
    }
    if ('ai_subscription_plan_id' in b) {
      data.ai_subscription_plan_id = b.ai_subscription_plan_id || null
    }
    if (Object.keys(data).length === 0) {
      return reply.code(400).send({ message: 'Καμία αλλαγή' })
    }
    const updated = await prisma.user.update({
      where: { id: req.params.user_id },
      data,
      select: { id: true, ai_subscription_status: true, ai_trial_started_at: true, ai_subscription_plan_id: true },
    })
    return reply.send({ data: updated })
  })

  // ══════════════════════════════════════════════════════
  // FOOD SUBSCRIPTIONS
  // ══════════════════════════════════════════════════════

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

  app.patch('/food/:id', async (req: any, reply) => {
    const { status } = req.body as { status: string }
    const updated = await prisma.productSubscription.update({
      where: { id: req.params.id },
      data: { status },
    })
    return reply.send({ data: updated })
  })

  // ══════════════════════════════════════════════════════
  // INSURANCE SUBSCRIPTIONS
  // ══════════════════════════════════════════════════════

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

  app.post('/insurance', async (req: any, reply) => {
    const { user_id, plan_id, pet_id } = req.body as any
    if (!user_id || !plan_id) return reply.code(400).send({ message: 'user_id και plan_id απαιτούνται' })
    const sub = await prisma.userInsuranceSubscription.create({
      data: { user_id, plan_id, pet_id, status: 'active' },
    })
    return reply.code(201).send({ data: sub })
  })

  app.patch('/insurance/:id', async (req: any, reply) => {
    const { status } = req.body as { status: string }
    const updated = await prisma.userInsuranceSubscription.update({
      where: { id: req.params.id },
      data: { status },
    })
    return reply.send({ data: updated })
  })

  // ══════════════════════════════════════════════════════
  // OVERVIEW (unified across all subscription types)
  // ══════════════════════════════════════════════════════

  app.get('/overview', async (req, reply) => {
    const [aiUsers, foodSubs, insuranceSubs] = await Promise.all([
      prisma.user.findMany({
        where: { ai_subscription_status: { not: 'none' } },
        select: { id: true, full_name: true, email: true, ai_subscription_status: true, ai_trial_started_at: true, ai_subscription_plan_id: true },
      }),
      prisma.productSubscription.findMany({
        include: { user: { select: { full_name: true, email: true } }, product: { select: { name: true } } },
      }),
      prisma.userInsuranceSubscription.findMany({
        include: { user: { select: { full_name: true, email: true } }, plan: { select: { name_el: true, name: true } } },
      }),
    ])

    // Enrich AI users with plan names
    const planIds = aiUsers.map(u => u.ai_subscription_plan_id).filter(Boolean) as string[]
    const plans = planIds.length
      ? await prisma.aiSubscriptionPlan.findMany({
          where: { id: { in: planIds } },
          select: { id: true, name: true, name_el: true },
        })
      : []
    const planMap = new Map(plans.map(p => [p.id, p]))

    const rows = [
      ...aiUsers.map(u => {
        const plan = u.ai_subscription_plan_id ? planMap.get(u.ai_subscription_plan_id) : null
        return {
          type: 'ai',
          user_name: u.full_name,
          user_email: u.email,
          plan_name: plan?.name_el || plan?.name || 'AI Health',
          status: u.ai_subscription_status,
          started_at: u.ai_trial_started_at,
        }
      }),
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
