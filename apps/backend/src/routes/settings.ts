import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const SETTING_KEY = 'food_subscription_discount_percent'

const settingsRoutes: FastifyPluginAsync = async (app) => {

  const isAdmin = async (req: any, reply: any) => {
    if ((req.user as any)?.role !== 'admin') {
      return reply.code(403).send({ message: 'Forbidden' })
    }
  }

  // GET /settings/food-subscription-discount — public, used by storefront to show current discount
  app.get('/food-subscription-discount', async (req, reply) => {
    const setting = await prisma.appSetting.findUnique({ where: { key: SETTING_KEY } })
    return reply.send({ data: { discount_percent: setting ? parseFloat(setting.value) : 0 } })
  })

  // PATCH /admin/settings/food-subscription-discount — admin sets the global %
  app.patch('/admin/food-subscription-discount', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    const { discount_percent } = req.body as { discount_percent: number }
    if (discount_percent == null || discount_percent < 0 || discount_percent > 100) {
      return reply.code(400).send({ message: 'discount_percent πρέπει να είναι 0-100' })
    }
    const setting = await prisma.appSetting.upsert({
      where: { key: SETTING_KEY },
      update: { value: String(discount_percent) },
      create: { key: SETTING_KEY, value: String(discount_percent) },
    })
    return reply.send({ data: { discount_percent: parseFloat(setting.value) } })
  })
}

export default settingsRoutes
