import type { FastifyPluginAsync } from 'fastify'
import Stripe from 'stripe'
import prisma from '../lib/prisma.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' })
const SETTING_KEY = 'food_subscription_discount_percent'

const subscriptionsRoutes: FastifyPluginAsync = async (app) => {

  // POST /subscriptions/food/:productId/checkout
  // Creates a Stripe Checkout Session in subscription mode for a 12-month food plan
  app.post('/food/:productId/checkout', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { productId } = req.params
    const user = req.user as any

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) return reply.code(404).send({ message: 'Το προϊόν δεν βρέθηκε' })
    if (!product.is_subscribable) return reply.code(400).send({ message: 'Αυτό το προϊόν δεν διαθέτει συνδρομή' })

    const setting = await prisma.appSetting.findUnique({ where: { key: SETTING_KEY } })
    const discountPercent = setting ? parseFloat(setting.value) : 0
    const monthlyPrice = Math.round(product.price * (1 - discountPercent / 100) * 100) / 100

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: user.email,
        line_items: [{
          price_data: {
            currency: 'eur',
            unit_amount: Math.round(monthlyPrice * 100),
            recurring: { interval: 'month' },
            product_data: { name: `Συνδρομή τροφής: ${product.name} (12 μήνες)` },
          },
          quantity: 1,
        }],
        subscription_data: {
          metadata: {
            user_id: user.id,
            product_id: product.id,
            discount_percent: String(discountPercent),
            monthly_price: String(monthlyPrice),
            plan_duration_months: '12',
          },
        },
        success_url: `${process.env.FRONTEND_URL || 'https://globipet.com'}/marketplace/${product.id}?subscription=success`,
        cancel_url: `${process.env.FRONTEND_URL || 'https://globipet.com'}/marketplace/${product.id}?subscription=cancelled`,
      })
      return reply.send({ data: { checkout_url: session.url } })
    } catch (err: any) {
      console.error('Stripe checkout error:', err)
      return reply.code(500).send({ message: 'Σφάλμα δημιουργίας συνδρομής: ' + err.message })
    }
  })

  // GET /subscriptions/food/my
  app.get('/food/my', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const subs = await prisma.productSubscription.findMany({
      where: { user_id: (req.user as any).id },
      include: { product: { select: { id: true, name: true, image_url: true, price: true } } },
      orderBy: { created_at: 'desc' },
    })
    return reply.send({ data: subs })
  })

  // POST /subscriptions/food/:id/cancel
  app.post('/food/:id/cancel', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const sub = await prisma.productSubscription.findUnique({ where: { id: req.params.id } })
    if (!sub || sub.user_id !== (req.user as any).id) return reply.code(404).send({ message: 'Δεν βρέθηκε' })

    if (sub.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(sub.stripe_subscription_id)
      } catch (err: any) {
        console.error('Stripe cancel error:', err)
      }
    }
    const updated = await prisma.productSubscription.update({
      where: { id: sub.id },
      data: { status: 'cancelled', end_date: new Date() },
    })
    return reply.send({ data: updated })
  })
}

export default subscriptionsRoutes
