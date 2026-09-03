import type { FastifyPluginAsync } from 'fastify'
import Stripe from 'stripe'
import prisma from '../lib/prisma.js'
import { sendAiTrialStartedEmail } from '../lib/email.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' })
const TRIAL_DAYS = 30

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
    let user = await prisma.user.findUnique({
      where: { id: (req.user as any).id },
      select: { id: true, ai_subscription_status: true, ai_trial_started_at: true, ai_subscription_plan_id: true },
    })
    if (!user) return reply.code(404).send({ message: 'Not found' })

    let daysLeft: number | null = null
    if (user.ai_subscription_status === 'trial' && user.ai_trial_started_at) {
      const elapsedMs = Date.now() - new Date(user.ai_trial_started_at).getTime()
      const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24)
      daysLeft = Math.max(0, Math.ceil(TRIAL_DAYS - elapsedDays))

      // Auto-transition trial → expired the moment we notice it ran out.
      // Without this, the feature gate would keep letting the user in past
      // the trial window because the status column still says 'trial'.
      if (daysLeft === 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: { ai_subscription_status: 'expired' },
        })
        user = { ...user, ai_subscription_status: 'expired' }
      }
    }

    // Also fetch plan if user has one
    let plan = null
    if (user.ai_subscription_plan_id) {
      plan = await prisma.aiSubscriptionPlan.findUnique({
        where: { id: user.ai_subscription_plan_id },
        select: {
          id: true, name: true, name_el: true, price_monthly: true, price_annual: true,
          includes_ai_health: true, includes_emotion_ai: true,
          includes_wellness_tracker: true, includes_telehealth: true,
        },
      })
    }
    return reply.send({ data: { ...user, trial_days_left: daysLeft, plan } })
  })

  // POST /ai-subscriptions/start-trial
  // Body: { plan_id?: string }  — optional; if omitted, defaults to featured plan (or first)
  app.post('/start-trial', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const userId = (req.user as any).id
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return reply.code(404).send({ message: 'Not found' })

    if (user.ai_subscription_status !== 'none') {
      return reply.code(400).send({ message: 'Έχετε ήδη χρησιμοποιήσει ή ενεργοποιήσει το δωρεάν trial' })
    }

    // Resolve plan
    let planId: string | null = (req.body as any)?.plan_id ?? null
    if (planId) {
      const requested = await prisma.aiSubscriptionPlan.findUnique({ where: { id: planId } })
      if (!requested || !requested.is_active) {
        return reply.code(400).send({ message: 'Το επιλεγμένο πλάνο δεν είναι διαθέσιμο' })
      }
    } else {
      // Fallback to first featured (or first available) plan
      const fallback = await prisma.aiSubscriptionPlan.findFirst({
        where: { is_active: true },
        orderBy: [{ is_featured: 'desc' }, { display_order: 'asc' }, { price_monthly: 'asc' }],
        select: { id: true },
      })
      planId = fallback?.id ?? null
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ai_subscription_status: 'trial',
        ai_trial_started_at: new Date(),
        ai_subscription_plan_id: planId,
      },
      select: { ai_subscription_status: true, ai_trial_started_at: true, ai_subscription_plan_id: true, email: true, full_name: true },
    })
    sendAiTrialStartedEmail(updated.email, { customerName: updated.full_name }).catch(() => {})
    return reply.send({ data: updated })
  })

  // POST /ai-subscriptions/create-checkout
  // Body: { plan_id: string, billing: 'monthly' | 'annual' }
  // Returns: { checkout_url: string }
  app.post('/create-checkout', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const userId = (req.user as any).id
    const userEmail = (req.user as any).email
    const { plan_id, billing = 'monthly' } = req.body as any
    if (!plan_id) return reply.code(400).send({ message: 'plan_id απαιτείται' })

    const plan = await prisma.aiSubscriptionPlan.findUnique({ where: { id: plan_id } })
    if (!plan || !plan.is_active) return reply.code(404).send({ message: 'Το πλάνο δεν είναι διαθέσιμο' })

    const isAnnual = billing === 'annual'
    const unitAmount = isAnnual
      ? Math.round((plan.price_annual ?? plan.price_monthly * 12) * 100)
      : Math.round(plan.price_monthly * 100)
    const interval: 'month' | 'year' = isAnnual ? 'year' : 'month'
    const planName = plan.name_el || plan.name

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: userEmail,
        line_items: [{
          price_data: {
            currency: 'eur',
            unit_amount: unitAmount,
            recurring: { interval },
            product_data: { name: `GlobiPet AI: ${planName}` },
          },
          quantity: 1,
        }],
        subscription_data: {
          metadata: {
            user_id: userId,
            ai_plan_id: plan.id,
            billing,
          },
        },
        success_url: `${process.env.FRONTEND_URL || 'https://globipet.com'}/pricing?checkout=success`,
        cancel_url: `${process.env.FRONTEND_URL || 'https://globipet.com'}/pricing?checkout=cancelled`,
      })
      return reply.send({ data: { checkout_url: session.url } })
    } catch (err: any) {
      console.error('Stripe AI checkout error:', err)
      return reply.code(500).send({ message: 'Σφάλμα δημιουργίας συνδρομής: ' + err.message })
    }
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
