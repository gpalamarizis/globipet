import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { sendAiTrialStartedEmail } from '../lib/email.js'
import { serverError } from '../lib/errors.js'
import { getRequestLang, translateRecords, translateRecord } from '../lib/i18n.js'
import { audit } from '../lib/audit.js'
import { liveAiStripeSubscriptionIds, cancelStripeSubscription, createAiCheckoutSession, aiRenewalDate } from '../lib/stripeSubscriptions.js'
import { MEMBERSHIP_TIER } from '../lib/membership.js'

const TRIAL_DAYS = 30

const aiSubscriptionsRoutes: FastifyPluginAsync = async (app) => {

  const isAdmin = async (req: any, reply: any) => {
    if ((req.user as any)?.role !== 'admin') {
      return reply.code(403).send({ message: 'Forbidden' })
    }
  }

  // GET /ai-subscriptions/plans
  // Τα `name`/`description` περνούν από τον πίνακα μεταφράσεων (ai_plan),
  // όπως ράτσες και ασφάλειες. Χωρίς μετάφραση επιστρέφεται το πρωτότυπο,
  // οπότε η απάντηση για όσους δεν έχουν μετάφραση μένει ίδια.
  // Ε18: χωρίς το GlobiPet Plus (tier 'membership') — έχει δική του σελίδα
  // (GET /membership) και δική του ροή αγοράς (POST /membership/checkout).
  app.get('/plans', async (req, reply) => {
    const plans = await prisma.aiSubscriptionPlan.findMany({
      where: { is_active: true, tier: { not: MEMBERSHIP_TIER } },
      orderBy: [{ is_featured: 'desc' }, { display_order: 'asc' }, { price_monthly: 'asc' }],
    })
    return reply.send({ data: await translateRecords('ai_plan', plans, getRequestLang(req)) })
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
    if (plan) plan = await translateRecord('ai_plan', plan, getRequestLang(req))
    // Προσθετικό `can_cancel`: πληρωμένη συνδρομή (Stripe) που τρέχει ακόμη
    // — κουμπί «Ακύρωση συνδρομής» σε web και κινητό.
    const can_cancel = user.ai_subscription_status === 'active' || user.ai_subscription_status === 'payment_failed'
    // Ε17 (προσθετικό): ημερομηνία ανανέωσης — μόνο για ενεργή συνδρομή, αλλιώς null.
    const current_period_end = user.ai_subscription_status === 'active' ? await aiRenewalDate(user.id) : null
    return reply.send({ data: { ...user, trial_days_left: daysLeft, plan, can_cancel, current_period_end } })
  })

  // POST /ai-subscriptions/start-trial
  // Body: { plan_id?: string }  — optional; if omitted, defaults to featured plan (or first)
  app.post('/start-trial', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const userId = (req.user as any).id
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return reply.code(404).send({ message: 'Not found' })
    // Δωρεάν δοκιμή μόνο με επιβεβαιωμένο email (όχι πολλαπλά trials με ψεύτικα email).
    if (!(user as any).email_verified_at) return reply.code(403).send({ message: 'Επιβεβαίωσε πρώτα το email σου', email_unverified: true })

    if (user.ai_subscription_status !== 'none') {
      return reply.code(400).send({ message: 'Έχετε ήδη χρησιμοποιήσει ή ενεργοποιήσει το δωρεάν trial' })
    }

    // Resolve plan
    let planId: string | null = (req.body as any)?.plan_id ?? null
    if (planId) {
      const requested = await prisma.aiSubscriptionPlan.findUnique({ where: { id: planId } })
      // Ε18: το GlobiPet Plus δεν έχει δωρεάν δοκιμή (αγοράζεται από τη σελίδα του).
      if (!requested || !requested.is_active || requested.tier === MEMBERSHIP_TIER) {
        return reply.code(400).send({ message: 'Το επιλεγμένο πλάνο δεν είναι διαθέσιμο' })
      }
    } else {
      // Fallback to first featured (or first available) plan
      const fallback = await prisma.aiSubscriptionPlan.findFirst({
        where: { is_active: true, tier: { not: MEMBERSHIP_TIER } },
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
    // Ε18: το GlobiPet Plus αγοράζεται μόνο από τη σελίδα του (POST /membership/checkout,
    // με τους δικούς του ελέγχους) — όχι από εδώ.
    if (!plan || !plan.is_active || plan.tier === MEMBERSHIP_TIER) return reply.code(404).send({ message: 'Το πλάνο δεν είναι διαθέσιμο' })

    // Μία πληρωμένη συνδρομή AI ανά χρήστη — αλλιώς δεύτερο checkout θα
    // χρέωνε δύο παράλληλες μηνιαίες συνδρομές (ίδιο με τη συνδρομή τροφής).
    // Με αποτυχημένη πληρωμή η συνδρομή του Stripe ζει ακόμη (ξαναδοκιμάζει).
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { ai_subscription_status: true } })
    if (me?.ai_subscription_status === 'active') {
      return reply.code(409).send({ message: 'Έχεις ήδη ενεργή συνδρομή AI' })
    }
    if (me?.ai_subscription_status === 'payment_failed') {
      return reply.code(409).send({ message: 'Η συνδρομή AI σου έχει εκκρεμή πληρωμή — ακύρωσέ τη πριν ξεκινήσεις νέα' })
    }

    const planName = plan.name_el || plan.name

    // Κοινό με το POST /membership/checkout (lib/stripeSubscriptions
    // createAiCheckoutSession): ανοιχτό checkout ίδιου πλάνου → ίδιο URL,
    // άλλου πλάνου που δεν λήγει → 409, έκπτωση επιπέδου, metadata για το webhook.
    try {
      const r = await createAiCheckoutSession({
        userId, userEmail, plan, billing,
        productName: `GlobiPet AI: ${planName}`,
        successUrl: `${process.env.FRONTEND_URL || 'https://globipet.com'}/pricing?checkout=success`,
        cancelUrl: `${process.env.FRONTEND_URL || 'https://globipet.com'}/pricing?checkout=cancelled`,
      })
      if (r.busy) {
        return reply.code(409).send({ message: 'Υπάρχει ήδη ανοιχτή πληρωμή για άλλο πλάνο AI. Ολοκλήρωσέ την ή δοκίμασε ξανά σε λίγα λεπτά.' })
      }
      return reply.send({ data: { checkout_url: r.checkout_url } })
    } catch (err: any) {
      console.error('Stripe AI checkout error:', err)
      return serverError(reply, err, 'ai-subscription-create', 'Η συνδρομή δεν δημιουργήθηκε.')
    }
  })

  // POST /ai-subscriptions/cancel
  //
  // Ίδιο μοτίβο με την ακύρωση συνδρομής τροφής (subscriptions.ts): ΑΜΕΣΗ
  // ακύρωση στο Stripe, χωρίς επιστροφή — καμία νέα χρέωση. Αν το Stripe
  // αποτύχει, ΔΕΝ σημειώνεται ακύρωση (αλλιώς η εφαρμογή θα έλεγε
  // «ακυρώθηκε» και η κάρτα θα συνέχιζε να χρεώνεται).
  //
  // Ποιες συνδρομές: η τρέχουσα (καταγραφή ενεργοποίησης του webhook) ΚΑΙ
  // όσες βρει η αναζήτηση του Stripe με metadata user_id + ai_plan_id — ώστε
  // να ακυρώνονται και όσες πληρώθηκαν πριν διορθωθεί το webhook.
  app.post('/cancel', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const userId = String((req.user as any).id)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, ai_subscription_status: true, ai_trial_started_at: true, ai_subscription_plan_id: true },
    })
    if (!user) return reply.code(404).send({ message: 'Not found' })
    if (user.ai_subscription_status === 'cancelled') return reply.send({ data: user })
    if (user.ai_subscription_status !== 'active' && user.ai_subscription_status !== 'payment_failed') {
      return reply.code(400).send({ message: 'Δεν υπάρχει ενεργή συνδρομή AI για ακύρωση' })
    }

    // Κοινή αναζήτηση με τη διαγραφή λογαριασμού (lib/stripeSubscriptions).
    let ids: Set<string>, searched: boolean
    try {
      ;({ ids, searched } = await liveAiStripeSubscriptionIds(userId))
    } catch (err) {
      return serverError(reply, err, 'ai-subscription-cancel')
    }
    // Ούτε καταγραφή ούτε αναζήτηση: δεν ξέρουμε τι χρεώνεται — καμία αλλαγή.
    if (!ids.size && !searched) {
      return reply.code(502).send({
        message: 'Η ακύρωση δεν ολοκληρώθηκε στον πάροχο πληρωμών. Δεν έγινε καμία αλλαγή — δοκίμασε ξανά σε λίγο.',
      })
    }

    for (const id of ids) {
      if (!(await cancelStripeSubscription(id))) {
        return reply.code(502).send({
          message: 'Η ακύρωση δεν ολοκληρώθηκε στον πάροχο πληρωμών. Δεν έγινε καμία αλλαγή — δοκίμασε ξανά σε λίγο.',
        })
      }
    }

    await prisma.user.updateMany({
      where: { id: userId, ai_subscription_status: { in: ['active', 'payment_failed'] } },
      data: { ai_subscription_status: 'cancelled' },
    })
    await audit(req, {
      action: 'ai_subscription_cancelled', resource: 'user', resource_id: userId, subject_email: user.email,
      metadata: { stripe_subscription_ids: [...ids], by: 'customer' },
    })
    const fresh = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, ai_subscription_status: true, ai_trial_started_at: true, ai_subscription_plan_id: true },
    })
    return reply.send({ data: fresh })
  })

  // Ε18: το GlobiPet Plus (tier 'membership') αλλάζει ΜΟΝΟ από το PUT /membership/admin
  // (έλεγχοι τιμής/ονόματος, ρυθμίσεις, audit). Εδώ: ούτε αλλαγή/διαγραφή του,
  // ούτε δημιουργία/μετατροπή άλλου πλάνου σε 'membership'.
  const PLUS_ADMIN_ONLY = 'Το GlobiPet Plus διαχειρίζεται από τη σελίδα GlobiPet Plus'
  const isPlusPlan = async (id: unknown): Promise<boolean> => {
    if (typeof id !== 'string' || !id) return false
    const p = await prisma.aiSubscriptionPlan.findUnique({ where: { id }, select: { tier: true } })
    return p?.tier === MEMBERSHIP_TIER
  }

  // POST /admin/ai-subscriptions/plans
  app.post('/admin/plans', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    if ((req.body as any)?.tier === MEMBERSHIP_TIER) return reply.code(400).send({ message: PLUS_ADMIN_ONLY })
    const plan = await prisma.aiSubscriptionPlan.create({ data: req.body })
    return reply.code(201).send({ data: plan })
  })

  // PATCH /admin/ai-subscriptions/plans/:id
  app.patch('/admin/plans/:id', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    if ((req.body as any)?.tier === MEMBERSHIP_TIER || await isPlusPlan(req.params.id)) {
      return reply.code(400).send({ message: PLUS_ADMIN_ONLY })
    }
    const plan = await prisma.aiSubscriptionPlan.update({ where: { id: req.params.id }, data: req.body })
    return reply.send({ data: plan })
  })

  // DELETE /admin/ai-subscriptions/plans/:id
  app.delete('/admin/plans/:id', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    if (await isPlusPlan(req.params.id)) return reply.code(400).send({ message: PLUS_ADMIN_ONLY })
    await prisma.aiSubscriptionPlan.delete({ where: { id: req.params.id } })
    return reply.send({ success: true })
  })
}

export default aiSubscriptionsRoutes
