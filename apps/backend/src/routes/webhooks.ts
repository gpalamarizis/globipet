import type { FastifyPluginAsync } from 'fastify'
import Stripe from 'stripe'
import { langOfUser, notifyTitle, notifyMsg } from '../lib/notifyText.js'
import prisma from '../lib/prisma.js'
import { broadcastToUser } from './notifications.js'
import { calculateCommission } from '../lib/commission.js'
import { sendSubscriptionStartedEmail, sendSubscriptionRenewedEmail, sendSubscriptionFailedEmail } from '../lib/email.js'
import { sendPushToUser } from '../lib/push.js'
import { serverError } from '../lib/errors.js'
import { auditSystem } from '../lib/audit.js'
import { AI_SUB_ACTIVATED_ACTION, currentAiStripeSubscriptionId, otherLiveAiSubscriptions, cancelStripeSubscription } from '../lib/stripeSubscriptions.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' })

/**
 * Γραμμή product_subscriptions για μια συνδρομή του Stripe, από τα metadata
 * που βάζει το POST /subscriptions/checkout (product_id, user_id, τιμή).
 * Ιδεμποτική: αν υπάρχει ήδη (ή τη δημιουργεί ταυτόχρονα άλλο γεγονός —
 * unique stripe_subscription_id, P2002), δεν δημιουργείται δεύτερη.
 *
 *   null              — δεν είναι συνδρομή τροφής (π.χ. χωρίς metadata)
 *   { created: true } — δημιουργήθηκε τώρα (και στάλθηκε το email έναρξης)
 *   { created: false} — υπήρχε ήδη
 *
 * Το Stripe ΔΕΝ εγγυάται σειρά γεγονότων: το invoice.payment_succeeded της
 * 1ης πληρωμής μπορεί να φτάσει πριν το checkout.session.completed. Γι' αυτό
 * το καλούν και τα δύο.
 */
async function ensureProductSubscription(
  subscription: Stripe.Subscription, customerId: string | null,
): Promise<{ created: boolean } | null> {
  const meta = subscription.metadata
  if (!meta?.product_id || !meta?.user_id) return null
  const existing = await prisma.productSubscription.findUnique({
    where: { stripe_subscription_id: subscription.id },
    select: { id: true },
  })
  if (existing) return { created: false }
  const product = await prisma.product.findUnique({ where: { id: meta.product_id } })
  const { rate } = await calculateCommission(parseFloat(meta.monthly_price || '0'), product?.category || 'food')
  let created
  try {
    created = await prisma.productSubscription.create({
      data: {
        user_id: meta.user_id,
        product_id: meta.product_id,
        discount_percent: parseFloat(meta.discount_percent || '0'),
        monthly_price: parseFloat(meta.monthly_price || '0'),
        commission_rate: rate,
        // Το Stripe δεν εγγυάται σειρά: αν η συνδρομή έχει ήδη ακυρωθεί εκεί
        // (customer.subscription.deleted ήρθε πρώτο και δεν βρήκε γραμμή),
        // δεν γράφεται «active» — αλλιώς θα έβγαζε παραδόσεις.
        status: subscription.status === 'canceled' ? 'cancelled' : 'active',
        ...(subscription.status === 'canceled' ? { end_date: new Date() } : {}),
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        next_delivery_date: new Date(),
        deliveries_completed: 0,
      },
      include: { user: true, product: true },
    })
  } catch (err: any) {
    if (err?.code === 'P2002') return { created: false }
    // Ο χρήστης ή το προϊόν δεν υπάρχει πια: μόνιμο σφάλμα — καταγραφή και
    // 200, αλλιώς το Stripe θα ξανάστελνε για μέρες.
    if (err?.code === 'P2003') {
      console.error(`[stripe] subscription ${subscription.id}: user/product missing — not created`)
      return null
    }
    throw err
  }
  if (created.status === 'active') {
    sendSubscriptionStartedEmail(created.user.email, {
      customerName: created.user.full_name,
      productName: created.product.name,
      monthlyPrice: created.monthly_price,
    }).catch(() => {})
  }
  return { created: true }
}

const idOf = (v: string | { id: string } | null | undefined): string | null =>
  typeof v === 'string' ? v : v?.id ?? null

/**
 * ΣΥΝΔΡΟΜΗ AI (Stripe)
 *
 * Το POST /ai-subscriptions/create-checkout βάζει στη συνδρομή του Stripe
 * metadata { user_id, ai_plan_id, billing }. Εδώ χειριζόταν μόνο το
 * `product_id` (τροφή): ο χρήστης χρεωνόταν κάθε μήνα και η συνδρομή AI δεν
 * ενεργοποιούνταν ποτέ.
 *
 * Ο χρήστης δεν έχει στήλη για το id της συνδρομής του Stripe (το σχήμα δεν
 * αλλάζει). Η ενεργή συνδρομή κάθε χρήστη είναι η τελευταία καταγραφή audit
 * `ai_subscription_activated` (metadata.stripe_subscription_id). Έτσι ένα
 * καθυστερημένο γεγονός μιας ΠΑΛΙΑΣ συνδρομής (π.χ. deleted της
 * προηγούμενης) δεν αγγίζει τη νέα.
 */
// Κοινά με το /ai-subscriptions/cancel και τη διαγραφή λογαριασμού.
export { AI_SUB_ACTIVATED_ACTION, currentAiStripeSubscriptionId }

const isAiSubscription = (s: Stripe.Subscription | null | undefined) =>
  !!s?.metadata?.ai_plan_id && !!s?.metadata?.user_id

/**
 * Ενεργοποίηση/ανανέωση: μόνο αν η συνδρομή είναι ζωντανή ΣΤΟ STRIPE (η
 * κατάσταση διαβάζεται από το Stripe, όχι από το γεγονός — το Stripe δεν
 * εγγυάται σειρά, και μια ήδη ακυρωμένη δεν ξαναγίνεται «ενεργή»).
 * Ιδεμποτική: ίδια συνδρομή, ήδη ενεργή, ίδιο πλάνο → τίποτα.
 */
async function activateAiSubscription(subscription: Stripe.Subscription): Promise<void> {
  const userId = String(subscription.metadata.user_id)
  const planId = String(subscription.metadata.ai_plan_id)
  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    console.warn(`[stripe] AI subscription ${subscription.id} is ${subscription.status} — not activated`)
    return
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, ai_subscription_status: true, ai_subscription_plan_id: true },
  })
  if (!user) {
    console.error(`[stripe] AI subscription ${subscription.id}: user ${userId} missing — not activated`)
    return
  }
  const current = await currentAiStripeSubscriptionId(userId)
  if (current === subscription.id && user.ai_subscription_status === 'active' && user.ai_subscription_plan_id === planId) return

  // Διπλή συνδρομή (δύο checkout που ολοκληρώθηκαν, ή νέα ενώ ζούσε η
  // παλιά): μία συνδρομή AI ανά χρήστη, κρατιέται η ΝΕΟΤΕΡΗ (created στο
  // Stripe). Οι άλλες ακυρώνονται αμέσως, χωρίς επιστροφή — όπως η ακύρωση
  // από τον πελάτη. Αν ΑΥΤΗ είναι η παλιότερη (π.χ. ανανέωση της παλιάς
  // μετά την αγορά νέας), ακυρώνεται αυτή και δεν ενεργοποιείται.
  // Σφάλμα του Stripe εδώ δεν μπλοκάρει την ενεργοποίηση (η πληρωμή έγινε).
  let older: string[] = []
  try {
    const others = await otherLiveAiSubscriptions(userId, subscription.id)
    // «Νεότερη» μετρά μόνο αν πληρώνεται (active/trialing/past_due) — μια
    // ημιτελής (incomplete) δεν εκτοπίζει πληρωμένη.
    const newer = others.filter(o => o.created > subscription.created && ['active', 'trialing', 'past_due'].includes(o.status))
    if (newer.length) {
      const ok = await cancelStripeSubscription(subscription.id)
      await auditSystem({
        action: 'ai_subscription_duplicate_cancelled', resource: 'user', resource_id: userId, subject_email: user.email,
        outcome: ok ? 'success' : 'error',
        metadata: { kept: newer.sort((x, y) => y.created - x.created)[0].id, cancelled: ok ? [subscription.id] : [], failed: ok ? [] : [subscription.id] },
      })
      return
    }
    older = others.map(o => o.id)
  } catch (err: any) {
    console.error(`[stripe] AI duplicate check for ${userId} failed:`, err?.message)
  }

  await prisma.user.update({
    where: { id: userId },
    data: { ai_subscription_status: 'active', ai_subscription_plan_id: planId },
  })
  if (current !== subscription.id) {
    await auditSystem({
      action: AI_SUB_ACTIVATED_ACTION, resource: 'user', resource_id: userId, subject_email: user.email,
      metadata: {
        stripe_subscription_id: subscription.id,
        stripe_customer_id: idOf(subscription.customer as any),
        plan_id: planId,
        billing: subscription.metadata.billing ?? null,
        current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
        current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
      },
    })
  }
  // Οι παλιότερες ακυρώνονται ΜΕΤΑ την καταγραφή ενεργοποίησης της νέας, ώστε
  // το customer.subscription.deleted τους να μη βρει «τρέχουσα» τη δική τους
  // και να μη σημειώσει τον χρήστη ακυρωμένο.
  if (older.length) {
    const cancelled: string[] = [], failed: string[] = []
    for (const id of older) ((await cancelStripeSubscription(id)) ? cancelled : failed).push(id)
    await auditSystem({
      action: 'ai_subscription_duplicate_cancelled', resource: 'user', resource_id: userId, subject_email: user.email,
      outcome: failed.length ? 'error' : 'success',
      metadata: { kept: subscription.id, cancelled, failed },
    })
  }
}

/**
 * Αλλαγή κατάστασης (payment_failed / cancelled) ΜΟΝΟ για την τρέχουσα
 * συνδρομή του χρήστη και μόνο από τις καταστάσεις `from` (ατομικά).
 */
async function setAiSubscriptionStatus(
  subscriptionId: string, userId: string, to: 'payment_failed' | 'cancelled', from: string[],
  /** Πλάνο από τα metadata του Stripe: fallback όταν δεν υπάρχει καμία καταγραφή ενεργοποίησης. */
  fallbackPlanId?: string,
): Promise<void> {
  const current = await currentAiStripeSubscriptionId(userId)
  if (current === null && fallbackPlanId) {
    // Καμία καταγραφή ενεργοποίησης (π.χ. συνδρομή πριν διορθωθεί το
    // webhook): δεκτό μόνο αν ο χρήστης έχει ΑΚΟΜΑ αυτό το πλάνο — αλλιώς
    // μια παλιά συνδρομή θα ακύρωνε άλλη. Η ατομική συνθήκη το επιβάλλει.
    const r = await prisma.user.updateMany({
      where: { id: userId, ai_subscription_status: { in: from }, ai_subscription_plan_id: fallbackPlanId },
      data: { ai_subscription_status: to },
    })
    if (r.count > 0) {
      await auditSystem({
        action: `ai_subscription_${to}`, resource: 'user', resource_id: userId,
        metadata: { stripe_subscription_id: subscriptionId, matched_by: 'metadata' },
      })
    }
    return
  }
  if (current !== subscriptionId) {
    console.warn(`[stripe] AI subscription ${subscriptionId} is not the current one of user ${userId} — ${to} ignored`)
    return
  }
  const r = await prisma.user.updateMany({
    where: { id: userId, ai_subscription_status: { in: from } },
    data: { ai_subscription_status: to },
  })
  if (r.count > 0) {
    await auditSystem({
      action: `ai_subscription_${to}`, resource: 'user', resource_id: userId,
      metadata: { stripe_subscription_id: subscriptionId },
    })
  }
}

/** Κλείδωμα βάσης ανά συνδρομή Stripe (σειριακή επεξεργασία πληρωμών της). */
const SUB_LOCK_SPACE = 'globipet:stripe-subscription'

const webhooksRoutes: FastifyPluginAsync = async (app) => {

  // Capture raw body ONLY within this plugin's scope (encapsulated — doesn't affect other routes)
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    done(null, body)
  })

  app.post('/stripe', async (req: any, reply) => {
    const sig = req.headers['stripe-signature']
    let event: Stripe.Event

    // Χωρίς μυστικό δεν επαληθεύεται τίποτα: 503 (το Stripe ξαναστέλνει
    // όταν ρυθμιστεί), ποτέ επεξεργασία ανυπόγραφου γεγονότος.
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('Stripe webhook rejected: STRIPE_WEBHOOK_SECRET is not set')
      return reply.code(503).send({ received: false })
    }

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
    } catch (err: any) {
      console.error('Stripe webhook signature error:', err.message)
      return reply.code(400).send(`Webhook Error: ${err.message}`)
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session
          if (session.mode === 'subscription' && session.subscription) {
            const subscription = await stripe.subscriptions.retrieve(idOf(session.subscription as any) as string)
            if (isAiSubscription(subscription)) await activateAiSubscription(subscription)
            else await ensureProductSubscription(subscription, idOf(session.customer as any))
          }
          break
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice
          const subId = idOf(invoice.subscription as any)
          if (subId) {
            let exists = await prisma.productSubscription.findUnique({
              where: { stripe_subscription_id: subId }, select: { id: true },
            })
            if (!exists) {
              // Η 1η πληρωμή έφτασε πριν το checkout.session.completed: η
              // γραμμή δημιουργείται εδώ από τα metadata του Stripe (όπως
              // εκεί). Πριν, η παράδοση #1 χανόταν σιωπηλά. Σε σφάλμα του
              // Stripe/βάσης → 500 και το Stripe ξαναστέλνει.
              const subscription = await stripe.subscriptions.retrieve(subId)
              // Συνδρομή AI: ενεργοποίηση/ανανέωση (και επαναφορά μετά από
              // αποτυχημένη πληρωμή) — καμία παραγγελία παράδοσης.
              if (isAiSubscription(subscription)) {
                await activateAiSubscription(subscription)
                break
              }
              await ensureProductSubscription(subscription, idOf(subscription.customer as any) ?? idOf(invoice.customer as any))
              exists = await prisma.productSubscription.findUnique({
                where: { stripe_subscription_id: subId }, select: { id: true },
              })
            }
            // Όχι συνδρομή τροφής (π.χ. άλλο προϊόν του ίδιου λογαριασμού): τίποτα.
            if (!exists) break

            // ΜΙΑ παραγγελία παράδοσης ανά τιμολόγιο (invoice.id στο
            // payment_intent της παραγγελίας — πεδίο που δεν χρησιμοποιείται
            // αλλού· το payment_ref μένει για τη Viva). Έλεγχος + καταχώριση σε
            // μία συναλλαγή υπό κλείδωμα ανά συνδρομή: επανάληψη του ίδιου
            // γεγονότος (το Stripe ξαναστέλνει σε 5xx/timeout) ή δύο
            // ταυτόχρονες παραδόσεις του δεν φτιάχνουν δεύτερη παραγγελία ούτε
            // μετρούν δεύτερη παράδοση.
            const result = await prisma.$transaction(async (tx) => {
              await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${SUB_LOCK_SPACE}), hashtext(${subId}))::text AS ok`
              const already = await tx.order.findFirst({
                where: { payment_method: 'stripe_subscription', payment_intent: invoice.id },
                select: { id: true },
              })
              if (already) return { kind: 'duplicate' as const }

              const productSub = await tx.productSubscription.findUnique({
                where: { stripe_subscription_id: subId },
                include: { product: true, user: true },
              })
              if (!productSub) return { kind: 'skip' as const }
              if (productSub.status === 'cancelled' || productSub.status === 'completed' || productSub.status === 'paused') {
                return { kind: 'inactive' as const, productSub }
              }

              const nextDelivery = new Date()
              nextDelivery.setMonth(nextDelivery.getMonth() + 1)

              const deliveryNumber = productSub.deliveries_completed + 1
              // The plan is sold as twelve monthly deliveries. Without this
              // check Stripe kept charging past the twelfth month, because
              // nothing ever cancelled the subscription.
              const isFinalDelivery = deliveryNumber >= 12

              await tx.productSubscription.update({
                where: { id: productSub.id },
                data: {
                  deliveries_completed: { increment: 1 },
                  next_delivery_date: isFinalDelivery ? null : nextDelivery,
                  status: isFinalDelivery ? 'completed' : 'active',
                  ...(isFinalDelivery ? { end_date: new Date() } : {}),
                },
              })

              const rate = productSub.commission_rate ?? 10
              const platformFee = Math.round(productSub.monthly_price * (rate / 100) * 100) / 100
              const providerPayout = Math.round((productSub.monthly_price - platformFee) * 100) / 100
              const providerEmail = (productSub.product as any).provider_email || null

              // Create the monthly delivery order
              await tx.order.create({
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
                  payment_intent: invoice.id,
                  platform_fee_amount: providerEmail ? platformFee : null,
                  provider_payout_amount: providerEmail ? providerPayout : null,
                  notes: `Αυτόματη μηνιαία παράδοση συνδρομής (παράδοση #${deliveryNumber}/12)`,
                },
              })
              return { kind: 'delivered' as const, productSub, deliveryNumber, isFinalDelivery, providerEmail, providerPayout }
            })

            if (result.kind === 'duplicate') {
              console.warn(`[stripe] invoice ${invoice.id} already delivered — duplicate event ignored`)
              break
            }
            if (result.kind === 'skip') break
            if (result.kind === 'inactive') {
              const productSub = result.productSub
              // Τελειωμένη ή σε παύση (από τον διαχειριστή) συνδρομή: δεν
              // ξαναγίνεται active ούτε βγάζει παραγγελία παράδοσης, ό,τι κι αν
              // στείλει το Stripe. Πληρωμή σε παύση (τιμολόγιο που είχε ήδη
              // εκδοθεί πριν την παύση) καταγράφεται για τον διαχειριστή.
              console.warn(`[stripe] invoice.payment_succeeded for ${productSub.status} product subscription ${productSub.id} (${subId}) — skipped`)
              if (productSub.status === 'paused') {
                await auditSystem({
                  action: 'subscription_paid_while_paused', resource: 'product_subscription', resource_id: productSub.id,
                  subject_email: productSub.user.email, outcome: 'failure',
                  error_message: 'Invoice paid while the subscription is paused — no delivery created; review/refund in Stripe',
                  metadata: { stripe_subscription_id: subId, invoice_id: invoice.id, amount_paid: (invoice.amount_paid ?? 0) / 100 },
                })
              }
              break
            }

            const { productSub, deliveryNumber, isFinalDelivery, providerEmail, providerPayout } = result

            if (isFinalDelivery && productSub.stripe_subscription_id) {
              // Stop future charges. The delivery just paid for still ships.
              stripe.subscriptions.cancel(productSub.stripe_subscription_id)
                .catch((e: any) => console.error('Stripe cancel at term end failed:', e?.message))
            }

            // Ειδοποιήσεις ΜΕΤΑ την καταχώριση — ποτέ δεν κάνουν το γεγονός
            // να αποτύχει (η παράδοση έχει ήδη γραφτεί, μια επανάληψη θα
            // ήταν πλέον «διπλή» και θα αγνοούνταν).
            try {
              const nLang = await langOfUser(productSub.user.email)
              const notification = await prisma.notification.create({
                data: {
                  user_email: productSub.user.email,
                  title: notifyTitle('subscription_delivery', nLang),
                  message: notifyMsg.subscriptionDelivery(nLang, productSub.product.name),
                  type: 'subscription_delivery',
                  link: '/orders',
                },
              })
              // Live push is keyed by email, like every other broadcast call.
              // This previously passed user_id, so subscription notifications
              // were written to the database but never reached the browser.
              broadcastToUser(productSub.user.email, { type: 'notification', notification })
              void sendPushToUser(productSub.user.email, {
                title: notification.title, body: notification.message, url: notification.link ?? '/',
              })
            } catch (e: any) {
              console.error('[stripe] delivery notification failed:', e?.message)
            }

            sendSubscriptionRenewedEmail(productSub.user.email, {
              customerName: productSub.user.full_name,
              productName: productSub.product.name,
              deliveryNumber,
            }).catch(() => {})

            if (providerEmail) {
              const nLang = await langOfUser(providerEmail).catch(() => 'el' as const)
              prisma.notification.create({
                data: {
                  user_email: providerEmail,
                  title: notifyTitle('subscription_new_order', nLang),
                  message: notifyMsg.subscriptionOrderLine(nLang, productSub.product.name, providerPayout.toFixed(2)),
                  type: 'new_order',
                  link: '/provider',
                },
              }).then(n => {
                broadcastToUser(providerEmail, { type: 'notification', notification: n })
                void sendPushToUser(providerEmail, {
                  title: n.title, body: n.message, url: n.link ?? '/',
                })
              }).catch(() => {})
            }
          }
          break
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice
          const subId = idOf(invoice.subscription as any)
          // Συνδρομή AI: ο χρήστης βρίσκεται από την καταγραφή ενεργοποίησης
          // (πρώτη πληρωμή που αποτυγχάνει δεν ενεργοποίησε ποτέ τίποτα).
          if (subId) {
            const act = await prisma.auditLog.findFirst({
              where: { action: AI_SUB_ACTIVATED_ACTION, resource: 'user', metadata: { path: ['stripe_subscription_id'], equals: subId } },
              orderBy: { created_at: 'desc' },
              select: { resource_id: true },
            })
            if (act?.resource_id) {
              await setAiSubscriptionStatus(subId, act.resource_id, 'payment_failed', ['active'])
              break
            }
          }
          if (subId) {
            const productSub = await prisma.productSubscription.findUnique({
              where: { stripe_subscription_id: subId },
              include: { user: true, product: true },
            })
            // Ατομικά και υπό συνθήκη: συνδρομή σε παύση (από τον διαχειριστή),
            // ακυρωμένη ή ολοκληρωμένη δεν ξαναγίνεται 'payment_failed' — αλλιώς
            // η παύση χανόταν και ο έλεγχος «ήδη συνδρομή» άλλαζε νόημα. Χωρίς
            // αλλαγή, ούτε ειδοποίηση (τίποτα δεν περιμένει πληρωμή).
            const marked = productSub
              ? await prisma.productSubscription.updateMany({
                  where: { id: productSub.id, status: { notIn: ['paused', 'cancelled', 'completed'] } },
                  data: { status: 'payment_failed' },
                })
              : { count: 0 }
            if (productSub && marked.count === 0) {
              console.warn(`[stripe] invoice.payment_failed for ${productSub.status} product subscription ${productSub.id} (${subId}) — status kept`)
            }
            if (productSub && marked.count > 0) {
              const nLang = await langOfUser(productSub.user.email)
              const notification = await prisma.notification.create({
                data: {
                  user_email: productSub.user.email,
                  title: notifyTitle('subscription_payment_failed', nLang),
                  message: notifyMsg.subscriptionFailed(nLang, productSub.product.name),
                  type: 'subscription_payment_failed',
                  link: '/profile',
                },
              })
              // Live push is keyed by email, like every other broadcast call.
              // This previously passed user_id, so subscription notifications
              // were written to the database but never reached the browser.
              broadcastToUser(productSub.user.email, { type: 'notification', notification })
              void sendPushToUser(productSub.user.email, {
                title: notification.title, body: notification.message, url: notification.link ?? '/',
              })

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
          if (isAiSubscription(subscription)) {
            await setAiSubscriptionStatus(subscription.id, String(subscription.metadata.user_id), 'cancelled', ['active', 'payment_failed'],
              String(subscription.metadata.ai_plan_id))
            break
          }
          // Όχι πάνω σε 'completed': μετά τη 12η παράδοση ακυρώνουμε εμείς τη
          // συνδρομή στο Stripe, και το γεγονός αυτό την έγραφε «ακυρωμένη».
          await prisma.productSubscription.updateMany({
            where: { stripe_subscription_id: subscription.id, status: { notIn: ['completed', 'cancelled'] } },
            data: { status: 'cancelled', end_date: new Date() },
          })
          break
        }
      }

      return reply.send({ received: true })
    } catch (err: any) {
      console.error('Stripe webhook handler error:', err)
      return serverError(reply, err, 'webhook')
    }
  })
}

export default webhooksRoutes