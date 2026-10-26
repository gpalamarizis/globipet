import type { FastifyPluginAsync } from 'fastify'
import Stripe from 'stripe'
import prisma from '../lib/prisma.js'
import { audit } from '../lib/audit.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' })

const adminSubscriptionsRoutes: FastifyPluginAsync = async (app) => {

  app.addHook('preHandler', async (req, reply) => {
    try {
      await (app as any).authenticate(req, reply)
      if (reply.sent) return reply
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

  /**
   * Ε19 — POST /admin/subscriptions/ai/grant  { email, plan_id }
   * Ενεργοποίηση συνδρομής AI (ή GlobiPet Plus) σε ΟΠΟΙΟΝΔΗΠΟΤΕ λογαριασμό με
   * το email του — και σε όσους δεν φαίνονται στη λίστα (κατάσταση 'none').
   * Χωρίς Stripe: καμία χρέωση, καμία λήξη (η αυτόματη λήξη αφορά μόνο το
   * 'trial'), κανένας πόντος. Για επιδείξεις/ομάδα. Λογαριασμός με ΠΛΗΡΩΜΕΝΗ
   * συνδρομή (active/payment_failed) δεν αλλάζει από εδώ — η χρέωσή του στο
   * Stripe θα συνέχιζε· αλλάζει από τη λίστα (Επεξεργασία).
   */
  app.post('/ai/grant', async (req: any, reply) => {
    const b = req.body ?? {}
    const email = typeof b.email === 'string' ? b.email.trim() : ''
    const planId = typeof b.plan_id === 'string' ? b.plan_id.trim() : ''
    if (!email || !planId) return reply.code(400).send({ message: 'Συμπλήρωσε email και πλάνο' })
    const plan = await prisma.aiSubscriptionPlan.findUnique({ where: { id: planId }, select: { id: true } })
    if (!plan) return reply.code(404).send({ message: 'Το πλάνο δεν είναι διαθέσιμο' })
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, email: true, ai_subscription_status: true, ai_subscription_plan_id: true },
    })
    if (!user) return reply.code(404).send({ message: 'Δεν βρέθηκε λογαριασμός με αυτό το email' })
    if (user.ai_subscription_status === 'active' || user.ai_subscription_status === 'payment_failed') {
      // Ήδη ενεργή με το ίδιο πλάνο → τίποτα να γίνει (ιδεμποτικό).
      if (user.ai_subscription_status === 'active' && user.ai_subscription_plan_id === plan.id) {
        return reply.send({ data: { id: user.id, ai_subscription_status: 'active', ai_subscription_plan_id: plan.id } })
      }
      return reply.code(409).send({ message: 'Ο λογαριασμός έχει ήδη ενεργή συνδρομή — άλλαξέ την από τη λίστα' })
    }
    const res = await prisma.user.updateMany({
      where: { id: user.id, ai_subscription_status: { notIn: ['active', 'payment_failed'] } },
      data: { ai_subscription_status: 'active', ai_subscription_plan_id: plan.id },
    })
    if (res.count !== 1) return reply.code(409).send({ message: 'Ο λογαριασμός έχει ήδη ενεργή συνδρομή — άλλαξέ την από τη λίστα' })
    await audit(req, {
      action: 'ai_subscription_granted', resource: 'user', resource_id: user.id, subject_email: user.email,
      metadata: { plan_id: plan.id, previous_status: user.ai_subscription_status, complimentary: true },
    })
    return reply.send({ data: { id: user.id, ai_subscription_status: 'active', ai_subscription_plan_id: plan.id } })
  })

  // PATCH /admin/subscriptions/ai/:user_id — admin changes user's AI subscription status/plan
  app.patch('/ai/:user_id', async (req: any, reply) => {
    const b = req.body ?? {}
    const data: any = {}
    if ('ai_subscription_status' in b) {
      const valid = ['none','trial','active','expired','payment_failed','cancelled']
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

  /**
   * Παύση / επανενεργοποίηση συνδρομής τροφής από τον διαχειριστή.
   *
   * Πριν άλλαζε ΜΟΝΟ τη στήλη status: η «Παύση» έδειχνε «Σε παύση» αλλά το
   * Stripe συνέχιζε να χρεώνει κάθε μήνα (και το webhook την ξαναέκανε
   * active με νέα παράδοση). Τώρα:
   *   · Μόνο active → paused και paused → active (καμία άλλη κατάσταση —
   *     ακύρωση/ολοκλήρωση/αποτυχία πληρωμής δεν αλλάζουν από εδώ).
   *   · ΠΡΩΤΑ το Stripe (pause_collection: void = δεν εκδίδονται χρεώσεις
   *     όσο διαρκεί η παύση· '' = συνέχιση), ΜΕΤΑ η βάση. Αν το Stripe
   *     αποτύχει → 502 και καμία αλλαγή στη βάση.
   *   · Η βάση αλλάζει ατομικά, μόνο από την αναμενόμενη κατάσταση.
   */
  app.patch('/food/:id', async (req: any, reply) => {
    const { status } = (req.body ?? {}) as { status?: string }
    const FROM: Record<string, string> = { paused: 'active', active: 'paused' }
    if (typeof status !== 'string' || !FROM[status]) {
      return reply.code(400).send({ message: 'Μη έγκυρη κατάσταση' })
    }
    const sub = await prisma.productSubscription.findUnique({ where: { id: String(req.params.id) } })
    if (!sub) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    if (sub.status === status) return reply.send({ data: sub })
    if (sub.status !== FROM[status]) {
      return reply.code(409).send({ message: 'Μη έγκυρη αλλαγή κατάστασης' })
    }

    if (sub.stripe_subscription_id) {
      try {
        await stripe.subscriptions.update(sub.stripe_subscription_id, {
          pause_collection: status === 'paused' ? { behavior: 'void' } : '',
        })
      } catch (err: any) {
        console.error(`[stripe] admin ${status} of product subscription ${sub.id} failed:`, err?.message)
        return reply.code(502).send({ message: 'Η αλλαγή δεν ολοκληρώθηκε στον πάροχο πληρωμών. Δεν έγινε καμία αλλαγή — δοκίμασε ξανά σε λίγο.' })
      }
    }

    const r = await prisma.productSubscription.updateMany({
      where: { id: sub.id, status: FROM[status] },
      data: { status },
    })
    if (r.count === 0) {
      // Άλλαξε στο μεταξύ (π.χ. ακυρώθηκε από τον πελάτη ή έγινε
      // payment_failed): η αλλαγή στο Stripe αναιρείται, ώστε Stripe και βάση
      // να μη διαφωνούν (π.χ. χρεώσεις σε παύση ενώ η βάση δεν το ξέρει).
      // Best-effort· σε ακυρωμένη συνδρομή του Stripe απλώς αποτυγχάνει.
      if (sub.stripe_subscription_id) {
        await stripe.subscriptions.update(sub.stripe_subscription_id, {
          pause_collection: status === 'paused' ? '' : { behavior: 'void' },
        }).catch((err: any) => console.error(`[stripe] revert of admin ${status} for product subscription ${sub.id} failed — check in Stripe:`, err?.message))
      }
      return reply.code(409).send({ message: 'Μη έγκυρη αλλαγή κατάστασης' })
    }
    await audit(req, {
      action: status === 'paused' ? 'subscription_pause' : 'subscription_resume',
      resource: 'product_subscription', resource_id: sub.id,
      metadata: { stripe_subscription_id: sub.stripe_subscription_id },
    })
    const updated = await prisma.productSubscription.findUnique({ where: { id: sub.id } })
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
          // Ωμά πεδία (προσθετικά) για ονομασία στη γλώσσα του admin
          // (web: localName). Το plan_name μένει για συμβατότητα.
          plan_name_el: plan?.name_el ?? null,
          plan_name_en: plan?.name ?? null,
          status: u.ai_subscription_status,
          started_at: u.ai_trial_started_at,
        }
      }),
      ...foodSubs.map(s => ({
        type: 'food',
        user_name: s.user.full_name,
        user_email: s.user.email,
        plan_name: `Τροφή: ${s.product.name}`,
        // Ωμό όνομα προϊόντος: το web βάζει μεταφρασμένο πρόθεμα.
        product_name: s.product.name,
        status: s.status,
        started_at: s.start_date,
        price: s.monthly_price,
      })),
      ...insuranceSubs.map(s => ({
        type: 'insurance',
        user_name: s.user.full_name,
        user_email: s.user.email,
        plan_name: s.plan.name_el || s.plan.name,
        plan_name_el: s.plan.name_el ?? null,
        plan_name_en: s.plan.name,
        status: s.status,
        started_at: s.started_at,
      })),
    ].sort((a, b) => new Date(b.started_at as any).getTime() - new Date(a.started_at as any).getTime())

    return reply.send({ data: rows })
  })
}

export default adminSubscriptionsRoutes
