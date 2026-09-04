import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

/** Tier thresholds, applied to lifetime points. */
function tierFor(lifetimePoints: number): string {
  if (lifetimePoints >= 10000) return 'platinum'
  if (lifetimePoints >= 5000)  return 'gold'
  if (lifetimePoints >= 1000)  return 'silver'
  return 'bronze'
}

/**
 * Award points to a user. Call this from server-side flows that have already
 * verified something happened worth rewarding — a paid order, a completed
 * booking, a first review.
 *
 * Exported so those flows never need an HTTP endpoint to do it, which is what
 * made the old open `/add` route necessary in the first place.
 */
export async function awardPoints(userEmail: string, points: number, _reason?: string) {
  const delta = Math.trunc(points)
  if (!Number.isFinite(delta) || delta === 0) return null

  const existing = await prisma.loyaltyPoints.findUnique({ where: { user_email: userEmail } })
  if (!existing) {
    const initial = Math.max(0, delta)
    return prisma.loyaltyPoints.create({
      data: {
        user_email: userEmail,
        total_points: initial,
        lifetime_points: initial,
        tier: tierFor(initial),
      },
    })
  }

  // Spending points reduces the balance but never the lifetime total, so a
  // customer does not lose their tier by redeeming a reward.
  const newTotal = Math.max(0, existing.total_points + delta)
  const newLifetime = delta > 0 ? existing.lifetime_points + delta : existing.lifetime_points

  return prisma.loyaltyPoints.update({
    where: { user_email: userEmail },
    data: {
      total_points: newTotal,
      lifetime_points: newLifetime,
      tier: tierFor(newLifetime),
    },
  })
}

const routes: FastifyPluginAsync = async (app) => {

  app.get('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    let points = await prisma.loyaltyPoints.findUnique({ where: { user_email: email } })
    if (!points) {
      points = await prisma.loyaltyPoints.create({
        data: { user_email: email, total_points: 0, tier: 'bronze', lifetime_points: 0 },
      })
    }
    return { data: points }
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
    return { data: updated }
  })
}

export default routes
