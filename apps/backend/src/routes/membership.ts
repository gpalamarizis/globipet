import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { serverError } from '../lib/errors.js'
import { getRequestLang, translateRecord } from '../lib/i18n.js'
import { audit } from '../lib/audit.js'
import { aiDiscountForEmail } from '../lib/loyalty.js'
import { createAiCheckoutSession, aiRenewalDate } from '../lib/stripeSubscriptions.js'
import {
  MEMBERSHIP_TIER, MEMBERSHIP_CONFIG_KEY, MEMBERSHIP_CONFIG_ACTION,
  getMembershipConfig, setMembershipConfig, validateMembershipConfig,
  findMembershipPlan, membershipPlanIds, isMembershipPlanId, standardAiDailyLimit, strictNumber,
} from '../lib/membership.js'
import { needsBirthDate } from './users.js'

/**
 * Ε18 — GlobiPet Plus (συνδρομή μέλους). Κοινό συμβόλαιο API:
 *   GET  /membership            — δημόσιο· με έγκυρο τοκεν γεμίζει το `me`
 *   POST /membership/checkout   — σύνδεση· Stripe Checkout (ίδια ροή με τη συνδρομή AI)
 *   GET  /membership/admin      — διαχειριστής
 *   PUT  /membership/admin      — διαχειριστής (πλάνο + ρυθμίσεις)
 * Ακύρωση: το ΥΠΑΡΧΟΝ POST /ai-subscriptions/cancel. Ενεργοποίηση: το ΥΠΑΡΧΟΝ
 * webhook της συνδρομής AI (metadata user_id / ai_plan_id / billing).
 */

const TRIAL_DAYS = 30 // ίδιο με routes/ai-subscriptions.ts / routes/ai.ts
const FRONTEND = () => process.env.FRONTEND_URL || 'https://globipet.com'

const MSG_NOT_AVAILABLE = 'Το GlobiPet Plus δεν είναι διαθέσιμο αυτή τη στιγμή'
const MSG_BAD_BILLING = 'Μη έγκυρη περίοδος χρέωσης'
const MSG_ALREADY_MEMBER = 'Είσαι ήδη μέλος του GlobiPet Plus'
const MSG_OTHER_PLAN = 'Έχεις ήδη ενεργή συνδρομή AI — ακύρωσέ την πρώτα για να γίνεις μέλος του GlobiPet Plus'
const MSG_PLUS_PAYMENT_PENDING = 'Η συνδρομή σου στο GlobiPet Plus έχει εκκρεμή πληρωμή — ακύρωσέ τη πριν ξεκινήσεις νέα'
// Υπάρχοντα μηνύματα της συνδρομής AI (ήδη μεταφρασμένα στο lib/apiMessages).
const MSG_AI_PAYMENT_PENDING = 'Η συνδρομή AI σου έχει εκκρεμή πληρωμή — ακύρωσέ τη πριν ξεκινήσεις νέα'
const MSG_CHECKOUT_BUSY = 'Υπάρχει ήδη ανοιχτή πληρωμή για άλλο πλάνο AI. Ολοκλήρωσέ την ή δοκίμασε ξανά σε λίγα λεπτά.'
const MSG_BAD_NAME = 'Μη έγκυρο όνομα (2 έως 60 χαρακτήρες)'
const MSG_BAD_PRICE_MONTHLY = 'Μη έγκυρη μηνιαία τιμή (0,50 έως 999 €, έως 2 δεκαδικά)'
const MSG_BAD_PRICE_ANNUAL = 'Μη έγκυρη ετήσια τιμή (κενό ή 0,50 έως 9999 €, έως 2 δεκαδικά)'
const MSG_BAD_ACTIVE = 'Μη έγκυρη τιμή διαθεσιμότητας'

const twoDecimals = (n: number) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6

const membershipRoutes: FastifyPluginAsync = async (app) => {

  const isAdmin = async (req: any, reply: any) => {
    if ((req.user as any)?.role !== 'admin') {
      return reply.code(403).send({ message: 'Απαιτούνται δικαιώματα διαχειριστή' })
    }
  }

  /** Όνομα πλάνου στη γλώσσα του αιτήματος (πίνακας μεταφράσεων ai_plan· ελληνικά: name_el ή name). */
  async function planName(plan: { id: string; name: string; name_el: string | null }, lang: string): Promise<string> {
    if (lang === 'el') return plan.name_el || plan.name
    const tr = await translateRecord('ai_plan', { id: plan.id, name: plan.name }, lang)
    return tr?.name ?? plan.name
  }

  // ─── GET /membership ─────────────────────────────────────────────
  app.get('/', async (req: any, reply) => {
    const [plan, config, standard] = await Promise.all([findMembershipPlan(), getMembershipConfig(), standardAiDailyLimit()])
    const available = !!plan && plan.is_active

    // Προαιρετική ταυτοποίηση (ίδιο μοτίβο με posts/forum/events): το jwtVerify
    // περνά από το `trusted` του index.ts (token_version, διαγραμμένος
    // λογαριασμός). Άκυρο τοκεν → ανώνυμη απάντηση, όχι 401.
    let userId: string | null = null
    if (req.headers?.authorization) {
      try { await req.jwtVerify(); userId = (req.user as any)?.id ?? null } catch { userId = null }
    }
    const lang = getRequestLang(req)

    let me: any = null
    let tier_discount_percent = 0
    if (userId) {
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, email: true, role: true, birth_date: true,
          ai_subscription_status: true, ai_trial_started_at: true, ai_subscription_plan_id: true,
        },
      })
      // Πύλη ημερομηνίας γέννησης (index.ts authenticate): όσο λείπει, καμία
      // προσωπική πληροφορία εδώ — η απάντηση είναι η ανώνυμη. Η αγορά
      // (POST /checkout, με authenticate) απαντά 403 birth_date_required.
      if (u && !(await needsBirthDate(u))) {
        const st = u.ai_subscription_status
        const userPlan = u.ai_subscription_plan_id
          ? await prisma.aiSubscriptionPlan.findUnique({
              where: { id: u.ai_subscription_plan_id }, select: { id: true, name: true, name_el: true, tier: true },
            })
          : null
        const onPlus = userPlan?.tier === MEMBERSHIP_TIER
        let status: 'none' | 'trial' | 'member' | 'payment_failed' | 'other_ai_plan' = 'none'
        let other_plan_name: string | null = null
        if (st === 'active' || st === 'payment_failed') {
          if (onPlus) status = st === 'active' ? 'member' : 'payment_failed'
          else {
            status = 'other_ai_plan'
            other_plan_name = userPlan ? await planName(userPlan, lang) : null
          }
        } else if (st === 'trial' && u.ai_trial_started_at
          && (Date.now() - new Date(u.ai_trial_started_at).getTime()) / 86_400_000 < TRIAL_DAYS) {
          status = 'trial'
        }
        me = {
          status,
          current_period_end: status === 'member' ? await aiRenewalDate(u.id) : null,
          can_cancel: status === 'member' || status === 'payment_failed',
          other_plan_name,
        }
        try {
          tier_discount_percent = (await aiDiscountForEmail(u.email)).percent
        } catch (err: any) {
          console.error('[membership] tier discount read failed:', err?.message ?? err)
          tier_discount_percent = 0
        }
      }
    }

    return reply.send({
      data: {
        available,
        plan: available && plan ? {
          id: plan.id,
          name: await planName(plan, lang),
          price_monthly: Number(plan.price_monthly),
          price_annual: plan.price_annual === null || plan.price_annual === undefined ? null : Number(plan.price_annual),
          currency: 'EUR',
        } : null,
        benefits: {
          points_multiplier: config.points_multiplier,
          ai_daily_limit: config.ai_daily_limit,
          ai_daily_limit_standard: standard,
        },
        tier_discount_percent,
        me,
      },
    })
  })

  // ─── POST /membership/checkout ───────────────────────────────────
  // Body: { billing: 'monthly' | 'annual' } (χωρίς → μηνιαία). Ίδιοι έλεγχοι
  // και ίδια ροή Stripe με το POST /ai-subscriptions/create-checkout
  // (lib/stripeSubscriptions createAiCheckoutSession).
  app.post('/checkout', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const userId = String((req.user as any).id)
    const userEmail = (req.user as any).email
    const raw = (req.body ?? {}) as any
    const billing = raw.billing === undefined || raw.billing === null ? 'monthly' : raw.billing
    if (billing !== 'monthly' && billing !== 'annual') return reply.code(400).send({ message: MSG_BAD_BILLING })

    const plan = await findMembershipPlan()
    if (!plan || !plan.is_active) return reply.code(404).send({ message: MSG_NOT_AVAILABLE })

    // Μία πληρωμένη συνδρομή AI ανά χρήστη (το Plus είναι συνδρομή AI).
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { ai_subscription_status: true, ai_subscription_plan_id: true } })
    const onPlus = await isMembershipPlanId(me?.ai_subscription_plan_id)
    if (me?.ai_subscription_status === 'active') {
      return onPlus
        ? reply.code(409).send({ message: MSG_ALREADY_MEMBER, code: 'already_member' })
        : reply.code(409).send({ message: MSG_OTHER_PLAN, code: 'other_ai_plan' })
    }
    if (me?.ai_subscription_status === 'payment_failed') {
      return reply.code(409).send({ message: onPlus ? MSG_PLUS_PAYMENT_PENDING : MSG_AI_PAYMENT_PENDING, code: 'payment_pending' })
    }

    try {
      const r = await createAiCheckoutSession({
        userId, userEmail, plan, billing,
        productName: 'GlobiPet Plus',
        successUrl: `${FRONTEND()}/membership?checkout=success`,
        cancelUrl: `${FRONTEND()}/membership?checkout=cancelled`,
      })
      if (r.busy) return reply.code(409).send({ message: MSG_CHECKOUT_BUSY, code: 'checkout_busy' })
      return reply.send({ data: { checkout_url: r.checkout_url } })
    } catch (err: any) {
      console.error('Stripe membership checkout error:', err)
      return serverError(reply, err, 'membership-checkout', 'Η συνδρομή δεν δημιουργήθηκε.')
    }
  })

  // ─── Διαχειριστής ────────────────────────────────────────────────

  async function adminView() {
    const [plan, config, ids] = await Promise.all([findMembershipPlan(), getMembershipConfig(), membershipPlanIds()])
    const [members, payment_failed] = ids.length
      ? await Promise.all([
          prisma.user.count({ where: { ai_subscription_status: 'active', ai_subscription_plan_id: { in: ids } } }),
          prisma.user.count({ where: { ai_subscription_status: 'payment_failed', ai_subscription_plan_id: { in: ids } } }),
        ])
      : [0, 0]
    return {
      plan: plan ? {
        id: plan.id,
        name: plan.name,
        price_monthly: Number(plan.price_monthly),
        price_annual: plan.price_annual === null || plan.price_annual === undefined ? null : Number(plan.price_annual),
        is_active: plan.is_active,
      } : null,
      config,
      counts: { members, payment_failed },
    }
  }

  app.get('/admin', { preHandler: [(app as any).authenticate, isAdmin] }, async () => ({ data: await adminView() }))

  /**
   * Πλάνο + ρυθμίσεις. Η τιμή ισχύει για ΝΕΕΣ συνδρομές (το checkout στέλνει
   * την τιμή κάθε φορά στο Stripe· οι υπάρχουσες συνδρομές κρατούν τη δική τους).
   * Χωρίς πλάνο → δημιουργείται (tier 'membership', AI υγείας/συναισθήματος/
   * ευεξίας, όχι τηλεϊατρική). Καταγραφή στο audit με παλιές/νέες τιμές.
   */
  app.put('/admin', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    const b = (req.body ?? {}) as any

    const name = typeof b.name === 'string' ? b.name.trim() : ''
    if (name.length < 2 || name.length > 60) return reply.code(400).send({ message: MSG_BAD_NAME })

    const pm = strictNumber(b.price_monthly)
    if (!Number.isFinite(pm) || pm < 0.5 || pm > 999 || !twoDecimals(pm)) return reply.code(400).send({ message: MSG_BAD_PRICE_MONTHLY })

    let pa: number | null = null
    if (b.price_annual !== null && b.price_annual !== undefined && b.price_annual !== '') {
      pa = strictNumber(b.price_annual)
      if (!Number.isFinite(pa) || pa < 0.5 || pa > 9999 || !twoDecimals(pa)) return reply.code(400).send({ message: MSG_BAD_PRICE_ANNUAL })
    }

    if (typeof b.is_active !== 'boolean') return reply.code(400).send({ message: MSG_BAD_ACTIVE })

    const v = validateMembershipConfig(b)
    if (!v.ok) return reply.code(400).send({ message: v.message })

    const before = await adminView()
    const existing = await findMembershipPlan()
    const planData = {
      name, name_el: name,
      price_monthly: pm, price_annual: pa,
      is_active: b.is_active,
      // Το Plus περιλαμβάνει πάντα τις λειτουργίες AI.
      includes_ai_health: true, includes_emotion_ai: true, includes_wellness_tracker: true,
    }
    if (existing) {
      await prisma.aiSubscriptionPlan.update({ where: { id: existing.id }, data: planData })
      // Νέο όνομα → σβήνονται οι μεταφράσεις του ονόματος (πίνακας translations,
      // entity 'ai_plan', field 'name' — lib/i18n TRANSLATABLE), αλλιώς οι άλλες
      // γλώσσες θα έδειχναν το παλιό. Όλες οι γλώσσες δείχνουν πλέον το νέο.
      if (existing.name !== name) {
        await prisma.$executeRaw`
          DELETE FROM translations
           WHERE entity = 'ai_plan' AND entity_id = ${existing.id} AND field = 'name'`
      }
    } else {
      await prisma.aiSubscriptionPlan.create({
        data: {
          ...planData,
          tier: MEMBERSHIP_TIER,
          currency: 'EUR',
          includes_telehealth: false,
          features: [],
          is_featured: false,
          display_order: 0,
        },
      })
    }
    await setMembershipConfig(v.config)
    const after = await adminView()
    await audit(req, {
      action: MEMBERSHIP_CONFIG_ACTION, resource: 'app_setting', resource_id: MEMBERSHIP_CONFIG_KEY,
      metadata: { before: { plan: before.plan, config: before.config }, after: { plan: after.plan, config: after.config } },
    })
    return reply.send({ data: after })
  })
}

export default membershipRoutes
