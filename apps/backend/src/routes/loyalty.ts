import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { audit } from '../lib/audit.js'
import {
  adjustPoints, getLoyaltyConfig, setLoyaltyConfig, validateLoyaltyConfig, tierProgress,
  LOYALTY_CONFIG_ACTION,
} from '../lib/loyalty.js'

/**
 * Award points to a user. Call this from server-side flows that have already
 * verified something happened worth rewarding.
 *
 * Οι πληρωμές αποδίδουν πόντους αυτόματα (lib/loyalty awardForPayment, μία
 * φορά ανά πληρωμή)· αυτή μένει για χειροκίνητες μεταβολές του διαχειριστή,
 * με επίπεδο από τα όρια των ρυθμίσεων και καθρέφτη στο users.
 */
export async function awardPoints(userEmail: string, points: number, _reason?: string) {
  return adjustPoints(userEmail, points)
}

const routes: FastifyPluginAsync = async (app) => {

  const isAdmin = async (req: any, reply: any) => {
    if ((req.user as any)?.role !== 'admin') {
      return reply.code(403).send({ message: 'Απαιτούνται δικαιώματα διαχειριστή' })
    }
  }

  /**
   * Πόντοι και επίπεδο του χρήστη. Τα πεδία της γραμμής loyalty_points
   * (total_points, lifetime_points, tier, …) μένουν ως είχαν για τις
   * εγκατεστημένες εφαρμογές· προστίθενται (Ε17):
   *   points, next_tier, next_threshold, current_threshold, points_to_next,
   *   ai_discount_percent (του τρέχοντος επιπέδου) και config (για την
   *   οθόνη «Πώς λειτουργεί»). Το `tier` υπολογίζεται από τα ΤΡΕΧΟΝΤΑ όρια.
   */
  app.get('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    let points = await prisma.loyaltyPoints.findUnique({ where: { user_email: email } })
    if (!points) {
      // upsert με κενό update: αν απόδοση πόντων δημιούργησε τη γραμμή στο
      // μεταξύ, δεν πετάει P2002 και δεν την πειράζει.
      points = await prisma.loyaltyPoints.upsert({
        where: { user_email: email },
        update: {},
        create: { user_email: email, total_points: 0, tier: 'bronze', lifetime_points: 0 },
      })
    }
    const config = await getLoyaltyConfig()
    const progress = tierProgress(points.lifetime_points ?? 0, config)
    return {
      data: {
        ...points,
        tier: progress.tier,
        points: points.total_points,
        current_threshold: progress.current_threshold,
        next_tier: progress.next_tier,
        next_threshold: progress.next_threshold,
        points_to_next: progress.points_to_next,
        ai_discount_percent: config.ai_discount_percent[progress.tier] ?? 0,
        config,
      },
    }
  })

  /** Δημόσιο: οι κανόνες του προγράμματος (σελίδα «Πώς λειτουργεί» και τιμές χωρίς σύνδεση). */
  app.get('/config', async () => ({ data: await getLoyaltyConfig() }))

  /** Ρυθμίσεις — διαχειριστής. */
  app.get('/admin/config', { preHandler: [(app as any).authenticate, isAdmin] }, async () => (
    { data: await getLoyaltyConfig() }
  ))

  /**
   * Αποθήκευση ρυθμίσεων — διαχειριστής. Έλεγχος: πόντοι/€ 0…1000, όρια
   * ακέραια και αυξανόμενα (το πρώτο 0), έκπτωση AI ακέραια 0…50%.
   * Καταγραφή στο audit με την παλιά και τη νέα τιμή. Ισχύει για τις ΝΕΕΣ
   * πληρωμές· οι πόντοι που ήδη δόθηκαν δεν ξαναϋπολογίζονται.
   */
  app.put('/admin/config', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    const v = validateLoyaltyConfig(req.body ?? {})
    if (!v.ok) return reply.code(400).send({ message: v.message })
    const before = await getLoyaltyConfig()
    const saved = await setLoyaltyConfig(v.config)
    await audit(req, {
      action: LOYALTY_CONFIG_ACTION, resource: 'app_setting', resource_id: 'loyalty_config',
      metadata: { before, after: saved },
    })
    return { data: saved }
  })

  /**
   * Grant points — administrators only.
   *
   * This route previously took a points value from the request body and added
   * it to the caller's own balance. Anyone could post { points: 999999 } and
   * jump straight to platinum, which is a direct route to whatever discounts
   * and rewards the tiers unlock.
   *
   * It is kept for manual support adjustments, now behind an admin check and
   * with an explicit recipient.
   */
  app.post('/add', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    if ((req.user as any).role !== 'admin') {
      return reply.code(403).send({ message: 'Απαιτούνται δικαιώματα διαχειριστή' })
    }
    const { user_email, points } = req.body as any
    if (!user_email) {
      return reply.code(400).send({ message: 'Λείπει το user_email' })
    }
    const delta = parseInt(points)
    if (!Number.isFinite(delta) || delta === 0) {
      return reply.code(400).send({ message: 'Μη έγκυρος αριθμός πόντων' })
    }
    // A single manual adjustment beyond this is almost certainly a typo.
    if (Math.abs(delta) > 100000) {
      return reply.code(400).send({ message: 'Υπερβολικά μεγάλη μεταβολή πόντων' })
    }

    const target = await prisma.user.findUnique({ where: { email: user_email }, select: { email: true } })
    if (!target) return reply.code(404).send({ message: 'Ο χρήστης δεν βρέθηκε' })

    const updated = await awardPoints(user_email, delta)
    await audit(req, {
      action: 'loyalty_manual_adjust', resource: 'loyalty', resource_id: user_email,
      subject_email: user_email, metadata: { points: delta },
    })
    return { data: updated }
  })
}

export default routes
