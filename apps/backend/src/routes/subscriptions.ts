import type { FastifyPluginAsync } from 'fastify'
import Stripe from 'stripe'
import prisma from '../lib/prisma.js'
import { serverError } from '../lib/errors.js'
import { effectivePrice } from '../lib/price.js'
import { openFoodCheckoutSessionUrl } from '../lib/stripeSubscriptions.js'

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

    // One live subscription per product per user. Without this the checkout
    // could be opened twice and the customer charged monthly on two parallel
    // Stripe subscriptions for the same food plan.
    // Κάθε μη-τερματική κατάσταση (active, payment_failed, paused): μια
    // συνδρομή σε παύση συνεχίζει με επαναφορά, άρα δεύτερη θα χρέωνε διπλά.
    const active = await prisma.productSubscription.findFirst({
      where: {
        user_id: user.id,
        product_id: product.id,
        status: { notIn: ['cancelled', 'completed'] },
      },
      select: { id: true, status: true },
    })
    if (active) {
      if (active.status === 'paused') {
        return reply.code(409).send({ message: 'Έχεις ήδη συνδρομή σε παύση για αυτό το προϊόν' })
      }
      return reply.code(409).send({ message: 'Έχεις ήδη ενεργή συνδρομή για αυτό το προϊόν' })
    }

    // Ανοιχτό checkout του ίδιου χρήστη για το ίδιο προϊόν (διπλό πάτημα,
    // δεύτερη συσκευή/καρτέλα): το ίδιο URL αντί για δεύτερο session — δύο
    // ολοκληρωμένα sessions έφτιαχναν δύο συνδρομές με διπλή μηνιαία χρέωση
    // (ο έλεγχος παραπάνω βλέπει μόνο συνδρομές που ήδη ολοκληρώθηκαν). Ό,τι
    // ξεφύγει, το ακυρώνει και το επιστρέφει το webhook (ensureProductSubscription).
    const reuse = await openFoodCheckoutSessionUrl(String(user.id), product.id)
    if (reuse) return reply.send({ data: { checkout_url: reuse } })

    const setting = await prisma.appSetting.findUnique({ where: { key: SETTING_KEY } })
    const discountPercent = setting ? parseFloat(setting.value) : 0
    // Βάση = τιμή έκπτωσης αν ισχύει (lib/price.ts), μείον την έκπτωση
    // συνδρομής. Το ποσό κλειδώνει εδώ (price_data του Stripe + metadata
    // monthly_price): υπάρχουσες συνδρομές ΔΕΝ αλλάζουν όταν αλλάξει η τιμή.
    const monthlyPrice = Math.round(effectivePrice(product) * (1 - discountPercent / 100) * 100) / 100

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: user.email,
        // Στο ίδιο το session (όχι μόνο στη συνδρομή), για τον έλεγχο ανοιχτού checkout.
        metadata: { user_id: String(user.id), product_id: product.id },
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
      return serverError(reply, err, 'subscription-create', 'Η συνδρομή δεν δημιουργήθηκε.')
    }
  })

  // GET /subscriptions/food/my
  app.get('/food/my', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const subs = await prisma.productSubscription.findMany({
      where: { user_id: (req.user as any).id },
      include: { product: { select: { id: true, name: true, image_url: true, price: true } } },
      orderBy: { created_at: 'desc' },
    })
    // deliveries_total: το πλάνο είναι πάντα 12 παραδόσεις (webhooks.ts).
    // can_cancel: ό,τι δεν έχει ήδη τερματιστεί (active, payment_failed, paused).
    return reply.send({
      data: subs.map(s => ({
        ...s,
        deliveries_total: 12,
        can_cancel: s.status !== 'cancelled' && s.status !== 'completed',
      })),
    })
  })

  // POST /subscriptions/food/:id/cancel
  app.post('/food/:id/cancel', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const sub = await prisma.productSubscription.findUnique({ where: { id: req.params.id } })
    if (!sub || sub.user_id !== (req.user as any).id) return reply.code(404).send({ message: 'Δεν βρέθηκε' })

    // Ήδη τερματισμένη: τίποτα να γίνει. Χωρίς αυτό μια ολοκληρωμένη (12/12)
    // συνδρομή γραφόταν «ακυρωμένη» και άλλαζε το end_date.
    if (sub.status === 'cancelled' || sub.status === 'completed') {
      return reply.send({ data: sub })
    }

    // Η ακύρωση στο Stripe είναι ΑΜΕΣΗ (όχι στο τέλος της περιόδου) και χωρίς
    // επιστροφή: δεν γίνεται καμία νέα χρέωση· η παράδοση του μήνα που έχει
    // ήδη πληρωθεί έχει γίνει παραγγελία (webhook) και αποστέλλεται κανονικά.
    //
    // Αν το Stripe αποτύχει, ΔΕΝ σημειώνουμε την ακύρωση: πριν, το σφάλμα
    // αγνοούνταν, η εφαρμογή έδειχνε «ακυρώθηκε» και η κάρτα συνέχιζε να
    // χρεώνεται κάθε μήνα. Εξαίρεση: συνδρομή που το Stripe έχει ήδη
    // τερματίσει (resource_missing / ήδη canceled).
    if (sub.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(sub.stripe_subscription_id)
      } catch (err: any) {
        let gone = err?.code === 'resource_missing'
        if (!gone) {
          try {
            const live = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
            gone = live.status === 'canceled'
          } catch (e2: any) {
            gone = e2?.code === 'resource_missing'
          }
        }
        if (!gone) {
          console.error('Stripe cancel error:', err)
          return reply.code(502).send({
            message: 'Η ακύρωση δεν ολοκληρώθηκε στον πάροχο πληρωμών. Δεν έγινε καμία αλλαγή — δοκίμασε ξανά σε λίγο.',
          })
        }
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
