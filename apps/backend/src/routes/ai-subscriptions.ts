import type { FastifyPluginAsync } from 'fastify'
import Stripe from 'stripe'
import prisma from '../lib/prisma.js'
import { sendAiTrialStartedEmail } from '../lib/email.js'
import { serverError } from '../lib/errors.js'
import { getRequestLang, translateRecords, translateRecord } from '../lib/i18n.js'
import { audit } from '../lib/audit.js'
import { liveAiStripeSubscriptionIds, cancelStripeSubscription, openAiCheckoutSessionUrl, AI_CHECKOUT_BUSY, aiTierCheckoutDiscount, AI_SUB_ACTIVATED_ACTION } from '../lib/stripeSubscriptions.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' })
const TRIAL_DAYS = 30

/**
 * Ε17 — Ημερομηνία ανανέωσης (τέλος τρέχουσας περιόδου) της ενεργής συνδρομής AI.
 * Πρώτα η καταγραφή ενεργοποίησης (routes/webhooks — metadata.current_period_end):
 * αν είναι ακόμη στο μέλλον, είναι η τρέχουσα περίοδος. Αλλιώς (έχει γίνει
 * ανανέωση) μία ανάγνωση της συνδρομής από το Stripe, με όριο χρόνου και
 * cache στη μνήμη της διεργασίας (stripePeriodEnd). Το webhook
 * invoice.payment_succeeded ανανεώνει το current_period_end της καταγραφής,
 * οπότε η ανάγνωση από το Stripe είναι σπάνια. Ποτέ δεν πετάει: σε
 * σφάλμα/έλλειψη επιστρέφει null. Συνδρομή που έχει οριστεί να λήξει στο
 * τέλος της περιόδου δεν «ανανεώνεται» → null.
 */
const PERIOD_HIT_MAX_MS = 6 * 60 * 60 * 1000
const PERIOD_MISS_TTL_MS = 10 * 60 * 1000
const PERIOD_CACHE_MAX = 1000
const periodEndCache = new Map<string, { until: number; value: string | null }>()

/**
 * current_period_end μιας συνδρομής από το Stripe, με cache ανά id συνδρομής:
 * τιμή → έως το τέλος της περιόδου (το πολύ 6 ώρες, ώστε ακύρωση/αλλαγή να
 * φαίνεται)· null/σφάλμα → 10 λεπτά (όχι κλήση στο Stripe σε κάθε άνοιγμα).
 */
async function stripePeriodEnd(subId: string): Promise<string | null> {
  const hit = periodEndCache.get(subId)
  if (hit && hit.until > Date.now()) return hit.value
  let value: string | null = null
  try {
    const sub = await stripe.subscriptions.retrieve(subId, {}, { timeout: 4000, maxNetworkRetries: 0 })
    if (!sub.cancel_at_period_end && sub.status !== 'canceled' && sub.current_period_end) {
      value = new Date(sub.current_period_end * 1000).toISOString()
    }
  } catch (err: any) {
    console.error('[ai-subscriptions] renewal date (Stripe) error:', err?.message ?? err)
    value = null
  }
  const ttl = value
    ? Math.max(0, Math.min(new Date(value).getTime() - Date.now(), PERIOD_HIT_MAX_MS))
    : PERIOD_MISS_TTL_MS
  if (periodEndCache.size >= PERIOD_CACHE_MAX) periodEndCache.delete(periodEndCache.keys().next().value as string)
  periodEndCache.set(subId, { until: Date.now() + ttl, value })
  return value
}

async function aiRenewalDate(userId: string): Promise<string | null> {
  try {
    const row = await prisma.auditLog.findFirst({
      where: { action: AI_SUB_ACTIVATED_ACTION, resource: 'user', resource_id: userId },
      orderBy: { created_at: 'desc' },
      select: { metadata: true },
    })
    const meta = (row?.metadata ?? {}) as any
    const stored = typeof meta.current_period_end === 'string' ? new Date(meta.current_period_end) : null
    if (stored && !isNaN(stored.getTime()) && stored.getTime() > Date.now()) return stored.toISOString()
    const subId = typeof meta.stripe_subscription_id === 'string' ? meta.stripe_subscription_id : null
    if (!subId || !process.env.STRIPE_SECRET_KEY) return null
    return await stripePeriodEnd(subId)
  } catch (err: any) {
    console.error('[ai-subscriptions] renewal date error:', err?.message ?? err)
    return null
  }
}

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
  app.get('/plans', async (req, reply) => {
    const plans = await prisma.aiSubscriptionPlan.findMany({
      where: { is_active: true },
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

    const isAnnual = billing === 'annual'
    const unitAmount = isAnnual
      ? Math.round((plan.price_annual ?? plan.price_monthly * 12) * 100)
      : Math.round(plan.price_monthly * 100)
    const interval: 'month' | 'year' = isAnnual ? 'year' : 'month'
    const planName = plan.name_el || plan.name

    // Ανοιχτό checkout του ίδιου χρήστη για το ίδιο πλάνο τα τελευταία 30'
    // (διπλό πάτημα, δεύτερη συσκευή): επιστρέφεται το ίδιο URL αντί για
    // δεύτερο session — δύο ολοκληρωμένα sessions θα έφτιαχναν δύο συνδρομές.
    const reuse = await openAiCheckoutSessionUrl(String(userId), plan.id, String(billing))
    // Ανοιχτό checkout ΑΛΛΟΥ πλάνου που δεν έληξε (π.χ. πληρώνεται τώρα): όχι
    // δεύτερο session και όχι το URL του άλλου πλάνου.
    if (reuse === AI_CHECKOUT_BUSY) {
      return reply.code(409).send({ message: 'Υπάρχει ήδη ανοιχτή πληρωμή για άλλο πλάνο AI. Ολοκλήρωσέ την ή δοκίμασε ξανά σε λίγα λεπτά.' })
    }
    if (reuse) return reply.send({ data: { checkout_url: reuse } })

    // Έκπτωση επιπέδου επιβράβευσης (lib/stripeSubscriptions — σε αποτυχία καμία έκπτωση).
    // Κουπόνι μίας περιόδου χρέωσης: 12 μήνες για ετήσια, 1 για μηνιαία.
    const tierDiscount = await aiTierCheckoutDiscount(String(userEmail), interval)
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: userEmail,
        // Στο ίδιο το session (όχι μόνο στη συνδρομή), για τον έλεγχο ανοιχτού checkout.
        metadata: { user_id: String(userId), ai_plan_id: plan.id, billing: String(billing) },
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
        ...(tierDiscount.discounts ? { discounts: tierDiscount.discounts } : {}),
        success_url: `${process.env.FRONTEND_URL || 'https://globipet.com'}/pricing?checkout=success`,
        cancel_url: `${process.env.FRONTEND_URL || 'https://globipet.com'}/pricing?checkout=cancelled`,
      })
      return reply.send({ data: { checkout_url: session.url } })
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
