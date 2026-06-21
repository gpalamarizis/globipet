import type { FastifyPluginAsync } from 'fastify'
import Stripe from 'stripe'
import prisma from '../lib/prisma.js'
import { broadcastToUser } from './notifications.js'
import { calculateCommission } from '../lib/commission.js'
import { sendSubscriptionStartedEmail, sendSubscriptionRenewedEmail, sendSubscriptionFailedEmail } from '../lib/email.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' })

const webhooksRoutes: FastifyPluginAsync = async (app) => {

  // Capture raw body ONLY within this plugin's scope (encapsulated — doesn't affect other routes)
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    done(null, body)
  })

  app.post('/stripe', async (req: any, reply) => {
    const sig = req.headers['stripe-signature']
    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '')
    } catch (err: any) {
      console.error('Stripe webhook signature error:', err.message)
      return reply.code(400).send(`Webhook Error: ${err.message}`)
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session
          if (session.mode === 'subscription' && session.subscription) {
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
            const meta = subscription.metadata
            if (meta?.product_id && meta?.user_id) {
              const existing = await prisma.productSubscription.findUnique({
                where: { stripe_subscription_id: subscription.id },
              })
              if (!existing) {
                const product = await prisma.product.findUnique({ where: { id: meta.product_id } })
                const { rate } = await calculateCommission(parseFloat(meta.monthly_price || '0'), product?.category || 'food')
                const created = await prisma.productSubscription.create({
                  data: {
                    user_id: meta.user_id,
                    product_id: meta.product_id,
                    discount_percent: parseFloat(meta.discount_percent || '0'),
                    monthly_price: parseFloat(meta.monthly_price || '0'),
                    commission_rate: rate,
                    status: 'active',
                    stripe_customer_id: session.customer as string,
                    stripe_subscription_id: subscription.id,
                    next_delivery_date: new Date(),
                    deliveries_completed: 0,
                  },
                  include: { user: true, product: true },
                })
                sendSubscriptionStartedEmail(created.user.email, {
                  customerName: created.user.full_name,
                  productName: created.product.name,
                  monthlyPrice: created.monthly_price,
                }).catch(() => {})
              }
            }
          }
          break
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice
          const subId = invoice.subscription as string
          if (subId) {
            const productSub = await prisma.productSubscription.findUnique({
              where: { stripe_subscription_id: subId },
              include: { product: true, user: true },
            })
            if (productSub) {
              const nextDelivery = new Date()
              nextDelivery.setMonth(nextDelivery.getMonth() + 1)

              await prisma.productSubscription.update({
                where: { id: productSub.id },
                data: {
                  deliveries_completed: { increment: 1 },
                  next_delivery_date: nextDelivery,
                  status: 'active',
                },
              })

              const rate = productSub.commission_rate ?? 10
              const platformFee = Math.round(productSub.monthly_price * (rate / 100) * 100) / 100
              const providerPayout = Math.round((productSub.monthly_price - platformFee) * 100) / 100
              const providerEmail = (productSub.product as any).provider_email || null

              // Create the monthly delivery order
              await prisma.order.create({
                data: {
                  user_email: productSub.user.email,
                  user_name: productSub.user.full_name,
                  items: [{
                    product_id: productSub.product_id, name: productSub.product.name, price: productSub.monthly_price, quantity: 1,
                    category: productSub.product.category, provider_email: providerEmail,
                    commission_rate: providerEmail ? rate : null,
                    platform_fee: providerEmail ? platformFee : null,
                    provider_payout: providerEmail ? providerPayout : null,
                  }],
                  total_amount: productSub.monthly_price,
                  status: 'processing',
                  payment_status: 'paid',
                  shipping_address: {},
                  payment_method: 'stripe_subscription',
                  platform_fee_amount: providerEmail ? platformFee : null,
                  provider_payout_amount: providerEmail ? providerPayout : null,
                  notes: `Αυτόματη μηνιαία παράδοση συνδρομής (παράδοση #${productSub.deliveries_completed + 1}/12)`,
                },
              })

              const notification = await prisma.notification.create({
                data: {
                  user_email: productSub.user.email,
                  title: 'Η μηνιαία παράδοση τροφής προγραμματίστηκε',
                  message: `Η πληρωμή της συνδρομής σου για "${productSub.product.name}" έγινε επιτυχώς. Η παράδοση ετοιμάζεται.`,
                  type: 'subscription_delivery',
                  link: '/orders',
                },
              })
              broadcastToUser(productSub.user_id, { type: 'notification', notification })

              sendSubscriptionRenewedEmail(productSub.user.email, {
                customerName: productSub.user.full_name,
                productName: productSub.product.name,
                deliveryNumber: productSub.deliveries_completed + 1,
              }).catch(() => {})

              if (providerEmail) {
                prisma.notification.create({
                  data: {
                    user_email: providerEmail,
                    title: 'Νέα παράδοση συνδρομής',
                    message: `${productSub.product.name} ×1 — αμοιβή ${providerPayout.toFixed(2)}€`,
                    type: 'new_order',
                    link: '/provider',
                  },
                }).then(n => broadcastToUser(providerEmail, { type: 'notification', notification: n })).catch(() => {})
              }
            }
          }
          break
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice
          const subId = invoice.subscription as string
          if (subId) {
            const productSub = await prisma.productSubscription.findUnique({
              where: { stripe_subscription_id: subId },
              include: { user: true, product: true },
            })
            if (productSub) {
              await prisma.productSubscription.update({
                where: { id: productSub.id },
                data: { status: 'payment_failed' },
              })
              const notification = await prisma.notification.create({
                data: {
                  user_email: productSub.user.email,
                  title: 'Αποτυχία πληρωμής συνδρομής',
                  message: `Η χρέωση για τη συνδρομή "${productSub.product.name}" απέτυχε. Ενημέρωσε τα στοιχεία πληρωμής σου.`,
                  type: 'subscription_payment_failed',
                  link: '/profile',
                },
              })
              broadcastToUser(productSub.user_id, { type: 'notification', notification })

              sendSubscriptionFailedEmail(productSub.user.email, {
                customerName: productSub.user.full_name,
                productName: productSub.product.name,
              }).catch(() => {})
            }
          }
          break
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription
          await prisma.productSubscription.updateMany({
            where: { stripe_subscription_id: subscription.id },
            data: { status: 'cancelled', end_date: new Date() },
          })
          break
        }
      }

      return reply.send({ received: true })
    } catch (err: any) {
      console.error('Stripe webhook handler error:', err)
      return reply.code(500).send({ message: err.message })
    }
  })
}

export default webhooksRoutes