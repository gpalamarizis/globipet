import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

/**
 * Admin CRUD για AI Subscription Plans.
 * Χειρίζεται individual features (μόνο 1 include=true) και bundles (2+ includes).
 *
 * Παραδείγματα plans που μπορούν να δημιουργηθούν:
 *   - "AI Health Only"       → includes_ai_health=true, rest=false
 *   - "Emotion Only"          → includes_emotion_ai=true
 *   - "Wellness Only"         → includes_wellness_tracker=true
 *   - "Health + Emotion"      → 2 booleans true (bundle)
 *   - "Full AI Pack"           → και τα 3 booleans true
 */
const adminAiPlansRoutes: FastifyPluginAsync = async (app) => {

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

  // GET /admin/ai-plans — list all plans (including inactive)
  app.get('/', async (req, reply) => {
    const plans = await prisma.aiSubscriptionPlan.findMany({
      orderBy: [{ display_order: 'asc' }, { price_monthly: 'asc' }],
    })

    // Enrich with subscriber count per plan
    const counts = await prisma.user.groupBy({
      by: ['ai_subscription_plan_id'],
      _count: { id: true },
      where: { ai_subscription_plan_id: { not: null } },
    })
    const countMap = new Map(counts.map(c => [c.ai_subscription_plan_id, c._count.id]))

    const enriched = plans.map(p => ({
      ...p,
      active_subscribers: countMap.get(p.id) ?? 0,
    }))
    return reply.send({ data: enriched })
  })

  // POST /admin/ai-plans — create new plan
  app.post('/', async (req: any, reply) => {
    const b = req.body ?? {}
    if (!b.name || typeof b.price_monthly !== 'number') {
      return reply.code(400).send({ message: 'name και price_monthly είναι υποχρεωτικά' })
    }
    // Ensure at least one include is true
    const includesAny = b.includes_ai_health || b.includes_emotion_ai || b.includes_wellness_tracker || b.includes_telehealth
    if (!includesAny) {
      return reply.code(400).send({ message: 'Το πλάνο πρέπει να περιλαμβάνει τουλάχιστον μία υπηρεσία' })
    }

    const plan = await prisma.aiSubscriptionPlan.create({
      data: {
        name: b.name,
        name_el: b.name_el ?? null,
        description: b.description ?? null,
        tier: b.tier ?? 'basic',
        price_monthly: b.price_monthly,
        price_annual: b.price_annual ?? null,
        currency: b.currency ?? 'EUR',
        includes_ai_health: !!b.includes_ai_health,
        includes_emotion_ai: !!b.includes_emotion_ai,
        includes_wellness_tracker: !!b.includes_wellness_tracker,
        includes_telehealth: !!b.includes_telehealth,
        telehealth_sessions_per_month: b.telehealth_sessions_per_month ?? null,
        max_pets: b.max_pets ?? null,
        features: b.features ?? [],
        is_active: b.is_active !== false,
        is_featured: !!b.is_featured,
        display_order: b.display_order ?? 0,
      },
    })
    return reply.code(201).send({ data: plan })
  })

  // PATCH /admin/ai-plans/:id — update plan
  app.patch('/:id', async (req: any, reply) => {
    const b = req.body ?? {}
    // Whitelist updatable fields
    const data: any = {}
    const fields = ['name','name_el','description','tier','price_monthly','price_annual','currency',
      'includes_ai_health','includes_emotion_ai','includes_wellness_tracker','includes_telehealth',
      'telehealth_sessions_per_month','max_pets','features','is_active','is_featured','display_order']
    for (const f of fields) if (f in b) data[f] = b[f]

    const plan = await prisma.aiSubscriptionPlan.update({
      where: { id: req.params.id },
      data,
    })
    return reply.send({ data: plan })
  })

  // DELETE /admin/ai-plans/:id — soft delete (is_active=false) or hard delete if unused
  app.delete('/:id', async (req: any, reply) => {
    const planId = req.params.id
    const subscriberCount = await prisma.user.count({
      where: { ai_subscription_plan_id: planId },
    })
    if (subscriberCount > 0) {
      // Soft delete: deactivate instead of removing (would break foreign keys)
      const plan = await prisma.aiSubscriptionPlan.update({
        where: { id: planId },
        data: { is_active: false },
      })
      return reply.send({ data: plan, softDelete: true, message: 'Απενεργοποιήθηκε (υπάρχουν συνδρομητές)' })
    }
    await prisma.aiSubscriptionPlan.delete({ where: { id: planId } })
    return reply.send({ deleted: true })
  })
}

export default adminAiPlansRoutes
