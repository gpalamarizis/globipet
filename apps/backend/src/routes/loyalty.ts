import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const routes: FastifyPluginAsync = async (app) => {

  app.get('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    let points = await prisma.loyaltyPoints.findUnique({ where: { user_email: email } })
    if (!points) {
      points = await prisma.loyaltyPoints.create({ data: { user_email: email, total_points: 0, tier: 'bronze', lifetime_points: 0 } })
    }
    return { data: points }
  })

  app.post('/add', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const { points } = req.body as any
    const existing = await prisma.loyaltyPoints.findUnique({ where: { user_email: email } })
    if (existing) {
      const newTotal = existing.total_points + parseInt(points)
      const newLifetime = existing.lifetime_points + parseInt(points)
      const tier = newLifetime >= 10000 ? 'platinum' : newLifetime >= 5000 ? 'gold' : newLifetime >= 1000 ? 'silver' : 'bronze'
      return prisma.loyaltyPoints.update({ where: { user_email: email }, data: { total_points: newTotal, lifetime_points: newLifetime, tier } })
    }
    return prisma.loyaltyPoints.create({ data: { user_email: email, total_points: parseInt(points), lifetime_points: parseInt(points), tier: 'bronze' } })
  })
}

export default routes
