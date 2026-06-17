import type { FastifyPluginAsync } from 'fastify'
import Stripe from 'stripe'
import prisma from '../lib/prisma.js'
import { broadcastToUser } from './notifications.js'

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
                await prisma.productSubscription.create({
                  data: {
                    user_id: meta.user_id,
                    product_id: meta.product_id,
                    discount_percent: parseFloat(meta.discount_percent || '0'),
                    monthly_price: parseFloat(meta.monthly_price || '0'),
                    status: 'active',
                    stripe_customer_id: session.customer as string,
                    stripe_subscription_id: subscription.id,
                    next_delivery_date: new Date(),
                    deliveries_completed: 0,
                  },
                })
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

              // Create the monthly delivery order
              await prisma.order.create({
                data: {
                  user_email: productSub.user.email,
                  user_name: productSub.user.full_name,
                  items: [{ product_id: productSub.product_id, name: productSub.product.name, price: productSub.monthly_price, quantity: 1 }],
                  total_amount: productSub.monthly_price,
                  status: 'processing',
                  shipping_address: {},
                  payment_method: 'stripe_subscription',
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
