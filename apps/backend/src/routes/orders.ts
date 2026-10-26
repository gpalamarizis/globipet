import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { langOfUser, notifyTitle, notifyMsg } from '../lib/notifyText.js'
import { encryptField, decryptField } from '../lib/crypto.js'
import { createVivaPaymentOrder, getVivaTransaction, isVivaDefinitiveRejection, isVivaNotFoundYet, vivaForeignTransaction } from '../lib/viva.js'
import { calculateCommission } from '../lib/commission.js'
import { bestDiscount, countRedemptions } from '../lib/campaignDiscount.js'
import { effectivePrice } from '../lib/price.js'
import { sendOrderConfirmedEmail, sendProviderNewOrderEmail, sendBookingConfirmedEmail, sendProviderNewBookingEmail } from '../lib/email.js'
import { broadcastToUser } from './notifications.js'
import { markTelehealthPaid, verifyConsultationPayment } from './telehealth.js'
import { awardForRecord } from '../lib/loyalty.js'
import { confirmEventRegistrationPayment, handleEventPaymentWebhook, refundLegacyOrphanEventPayment } from './events.js'
import { handleBookingPaymentWebhook } from '../lib/bookingPayment.js'
import { refundExtraVivaPayment, extraPaymentRefunded } from '../lib/extraPaymentRefund.js'
import { sendPushToUser } from '../lib/push.js'
import { serverError } from '../lib/errors.js'
import { fullNameOf } from '../lib/userName.js'
import { audit, auditSystem } from '../lib/audit.js'
import { handleVivaTransactionReversal, isRecentWebhook } from '../lib/externalRefund.js'

/**
 * Shipping options, priced on the server.
 *
 * The checkout page has the same table and adds the cost to the total it
 * posts. That total is no longer trusted — prices come from the products
 * table — so shipping has to be recomputed here too, otherwise the charge
 * would silently drop the delivery fee and the platform would absorb it.
 *
 * Keep in sync with SHIPPING_METHODS in apps/web/src/pages/Checkout.tsx.
 */
const SHIPPING_METHODS: Record<string, number> = {
  boxnow: 2.50,
  acs:    3.99,
  elta:   4.50,
}
const FREE_SHIPPING_THRESHOLD = 50

/** Μέγιστος αριθμός γραμμών ανά παραγγελία. */
const MAX_ORDER_LINES = 50
const MSG_OUT_OF_STOCK = 'Δεν υπάρχει αρκετό απόθεμα για κάποια προϊόντα'

/** Συνολική ποσότητα ανά προϊόν (το ίδιο προϊόν μπορεί να είναι σε πολλές γραμμές). */
function qtyByProduct(items: any[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const i of Array.isArray(items) ? items : []) {
    const pid = i?.product_id
    const q = Number(i?.quantity) || 0
    if (!pid || q <= 0) continue
    m.set(String(pid), (m.get(String(pid)) ?? 0) + q)
  }
  return m
}

/** Καταγραφή της δέσμευσης αποθέματος κατά την πληρωμή (claimOrderPayment· admin.ts /refund). */
export const ORDER_STOCK_RESERVED_ACTION = 'order_stock_reserved'

/** Το απόθεμα δεν έφτασε τη στιγμή της πληρωμής (ακυρώνει τη συναλλαγή βάσης). */
class OutOfStockError extends Error {
  constructor(public productId: string) { super(`out of stock: ${productId}`) }
}

function shippingCostFor(method: string | undefined, subtotal: number): number {
  if (subtotal > FREE_SHIPPING_THRESHOLD) return 0
  const price = SHIPPING_METHODS[String(method || '').toLowerCase()]
  // Unknown method falls back to the cheapest option rather than free
  // delivery, so a typo cannot be used to skip the fee.
  return price ?? Math.min(...Object.values(SHIPPING_METHODS))
}


/**
 * Η διεύθυνση παράδοσης είναι προσωπικά δεδομένα.
 *
 * Το User.phone και το User.address κρυπτογραφούνται από την αρχή. Η ίδια
 * ακριβώς πληροφορία όμως — όνομα, τηλέφωνο, οδός, πόλη, ΤΚ — αποθηκευόταν
 * σε καθαρό κείμενο σε κάθε παραγγελία. Ένα αντίγραφο της βάσης ήταν
 * κατάλογος διευθύνσεων κατοικίας με τηλέφωνα.
 *
 * Κρυπτογραφούνται μόνο τα πεδία του ανθρώπου. Το shipping_method και το
 * shipping_cost μένουν αναγνώσιμα: χρησιμοποιούνται σε υπολογισμούς και σε
 * αναφορές εσόδων, και δεν λένε τίποτα για το ποιος είναι ο πελάτης.
 */
const ADDRESS_PII = ['full_name', 'phone', 'street', 'address', 'city', 'postal_code', 'notes'] as const

function encryptAddress(addr: any): any {
  if (!addr || typeof addr !== 'object') return addr
  const out: any = { ...addr }
  for (const k of ADDRESS_PII) {
    if (out[k]) out[k] = encryptField(String(out[k]))
  }
  return out
}

/**
 * Το decryptField επιστρέφει ακρυπτογράφητο κείμενο αμετάβλητο, οπότε οι
 * παραγγελίες που γράφτηκαν πριν από αυτή την αλλαγή διαβάζονται κανονικά
 * χωρίς migration.
 */
function decryptAddress(addr: any): any {
  if (!addr || typeof addr !== 'object') return addr
  const out: any = { ...addr }
  for (const k of ADDRESS_PII) {
    if (out[k]) out[k] = decryptField(String(out[k]))
  }
  return out
}

/** Εφαρμόζεται σε μία παραγγελία ή σε λίστα πριν φύγει προς τον client. */
function withAddress<T extends { shipping_address?: any }>(order: T): T
function withAddress<T extends { shipping_address?: any }>(orders: T[]): T[]
function withAddress(x: any): any {
  if (Array.isArray(x)) return x.map(o => ({ ...o, shipping_address: decryptAddress(o.shipping_address) }))
  if (!x) return x
  return { ...x, shipping_address: decryptAddress(x.shipping_address) }
}

const ordersRoutes: FastifyPluginAsync = async (app) => {

  // Get my orders
  app.get('/my', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const orders = await prisma.order.findMany({
      where: { user_email: email },
      orderBy: { created_at: 'desc' },
    })
    return { data: withAddress(orders) }
  })

  // Get order by ID — only the buyer, a provider with a line in it, or an admin
  app.get('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const user = req.user as any
    const order = await prisma.order.findUnique({ where: { id: req.params.id } })
    if (!order) return reply.code(404).send({ message: 'Η παραγγελία δεν βρέθηκε' })

    const isBuyer = order.user_email === user.email
    const isAdmin = user.role === 'admin'
    const isSeller = Array.isArray(order.items)
      && (order.items as any[]).some(i => i?.provider_email === user.email)

    if (!isBuyer && !isAdmin && !isSeller) {
      return reply.code(403).send({ message: 'Δεν έχεις πρόσβαση σε αυτή την παραγγελία' })
    }
    return withAddress(order)
  })

  // Create order
  //
  // SECURITY: prices and the order total are computed from the products table,
  // never taken from the request body. Previously a client could post
  // { items: [{ product_id: X, product_price: 0.01 }], total_amount: 0.01 }
  // and the order was created at that price.
  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email, full_name } = req.user as any
    const { items, shipping_address, payment_method } = req.body as any

    if (!Array.isArray(items) || items.length === 0) {
      return reply.code(400).send({ message: 'Το καλάθι είναι κενό' })
    }
    // Όριο γραμμών: κάθε γραμμή κάνει ερωτήματα (έκπτωση, προμήθεια).
    if (items.length > MAX_ORDER_LINES) {
      return reply.code(400).send({ message: 'Πάρα πολλά είδη στην παραγγελία (έως 50)' })
    }

    // Look up products for authoritative price, name, image, category, owner
    const productIds = items.map((i: any) => i.product_id || i.id).filter(Boolean)
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } })
    const productMap = new Map(products.map(p => [p.id, p]))

    // Every line must reference a product that actually exists
    const missing = productIds.filter((id: string) => !productMap.has(id))
    if (missing.length) {
      return reply.code(400).send({ message: 'Κάποια προϊόντα δεν είναι πλέον διαθέσιμα', missing })
    }

    let totalPlatformFee = 0
    let totalProviderPayout = 0
    let computedTotal = 0
    let totalDiscount = 0

    const enrichedItems = await Promise.all(items.map(async (item: any) => {
      const productId = item.product_id || item.id
      const product = productMap.get(productId)!
      // Authoritative price from the database — the client value is ignored.
      // Τιμή έκπτωσης αν ισχύει (lib/price.ts) — αυτή δείχνουν λίστα και
      // σελίδα προϊόντος· η έκπτωση καμπάνιας εφαρμόζεται πάνω της.
      const price = effectivePrice(product)
      const quantity = Math.min(Math.max(parseInt(item.quantity) || 1, 1), 99)
      const lineTotal = price * quantity
      // Έκπτωση καμπάνιας — υπολογίζεται εδώ, από τιμές της βάσης. Η
      // προμήθεια και το ποσό του παρόχου βγαίνουν από το ποσό ΜΕΤΑ την έκπτωση.
      const disc = await bestDiscount(email, 'product', productId, lineTotal, quantity)
      const lineFinal = disc.final
      computedTotal += lineFinal
      totalDiscount += disc.discount
      const category = product.category || null
      const providerEmail = product.provider_email || null

      let commission_rate: number | null = null
      let platform_fee: number | null = null
      let provider_payout: number | null = null

      if (providerEmail) {
        const c = await calculateCommission(lineFinal, category)
        commission_rate = c.rate
        platform_fee = c.platformFee
        provider_payout = c.providerPayout
        totalPlatformFee += c.platformFee
        totalProviderPayout += c.providerPayout
      }

      return {
        product_id: productId,
        // Name and image also come from the database, so the stored order
        // reflects the real product rather than whatever the client sent.
        name: product.name,
        price,
        quantity,
        discount: disc.discount,
        campaign_id: disc.campaign?.id ?? null,
        image: product.image_url ?? null,
        category,
        provider_email: providerEmail,
        commission_rate,
        platform_fee,
        provider_payout,
      }
    }))

    // Απόθεμα: η ζητούμενη ποσότητα (άθροισμα, αν το ίδιο προϊόν είναι σε
    // πολλές γραμμές) δεν ξεπερνά το stock. Η πραγματική δέσμευση γίνεται
    // ατομικά τη στιγμή της πληρωμής (claimOrderPayment).
    const outOfStock = [...qtyByProduct(enrichedItems)]
      .filter(([pid, qty]) => (productMap.get(pid)?.stock ?? 0) < qty)
      .map(([pid]) => ({ product_id: pid, available: Math.max(0, productMap.get(pid)?.stock ?? 0) }))
    if (outOfStock.length) {
      return reply.code(400).send({ message: MSG_OUT_OF_STOCK, out_of_stock: outOfStock })
    }

    // The delivery fee is priced here, from the method the customer chose.
    const shippingMethod = (shipping_address as any)?.shipping_method
    const shippingCost = shippingCostFor(shippingMethod, computedTotal)

    const order = await prisma.order.create({
      data: {
        user_email: email,
        // Το JWT δεν έχει full_name: το όνομα από τη βάση (lib/userName).
        user_name: full_name || await fullNameOf(email),
        items: enrichedItems,
        // Computed from database prices plus server-priced shipping, not from
        // the request body.
        total_amount: Math.round((computedTotal + shippingCost) * 100) / 100,
        status: 'pending',
        shipping_address: encryptAddress({
          ...(shipping_address ?? {}),
          // Overwrite whatever the client claimed the delivery cost was.
          shipping_method: shippingMethod,
          shipping_cost: shippingCost,
        }),
        payment_method,
        discount_amount: totalDiscount > 0 ? Math.round(totalDiscount * 100) / 100 : null,
        platform_fee_amount: totalPlatformFee > 0 ? Math.round(totalPlatformFee * 100) / 100 : null,
        provider_payout_amount: totalProviderPayout > 0 ? Math.round(totalProviderPayout * 100) / 100 : null,
      }
    })
    // Το καλάθι ΔΕΝ αδειάζει εδώ: αν ο πελάτης εγκατέλειπε την πληρωμή, έχανε
    // καλάθι χωρίς να έχει αγοράσει τίποτα. Τα είδη της παραγγελίας φεύγουν
    // από το καλάθι μόλις επιβεβαιωθεί η πληρωμή (claimOrderPayment).
    return withAddress(order)
  })

  // Ακύρωση ΑΠΛΗΡΩΤΗΣ παραγγελίας από τον πελάτη (web «Οι παραγγελίες μου»,
  // κινητό orders). Ατομικά: μόνο unpaid → cancelled. Πληρωμή που φτάνει
  // μετά την ακύρωση επιστρέφεται αυτόματα (claimOrderPayment). Το απόθεμα
  // δεσμεύεται μόνο στην πληρωμή, άρα εδώ δεν επιστρέφεται τίποτα.
  app.post('/:id/cancel', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const id = String(req.params.id)
    const order = await prisma.order.findUnique({ where: { id } })
    if (!order || order.user_email !== email) {
      return reply.code(404).send({ message: 'Η παραγγελία δεν βρέθηκε' })
    }
    if (order.status === 'cancelled') return { data: withAddress(order) }
    if (order.payment_status !== 'unpaid') {
      return reply.code(409).send({ message: 'Η παραγγελία έχει πληρωθεί — για ακύρωση επικοινώνησε με την υποστήριξη' })
    }
    const r = await prisma.order.updateMany({
      where: { id, user_email: email, payment_status: 'unpaid', status: { not: 'cancelled' } },
      data: { status: 'cancelled' },
    })
    if (r.count === 0) {
      return reply.code(409).send({ message: 'Η παραγγελία άλλαξε στο μεταξύ — ανανέωσε τη σελίδα' })
    }
    await audit(req, { action: 'order_cancel', resource: 'order', resource_id: id, subject_email: email, metadata: { by: 'customer' } })
    const fresh = await prisma.order.findUnique({ where: { id } })
    return { data: fresh ? withAddress(fresh) : null }
  })

  // ─── VIVA.COM SMART CHECKOUT ─────────────────────────────────────
  app.post('/viva/checkout', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { order_id } = req.body as any
    const user = req.user as any

    try {
      const order = await prisma.order.findUnique({ where: { id: order_id } })
      if (!order || order.user_email !== user.email) {
        return reply.code(404).send({ message: 'Η παραγγελία δεν βρέθηκε' })
      }
      // Already-paid orders must not be chargeable a second time.
      if (order.payment_status === 'paid') {
        return reply.code(400).send({ message: 'Η παραγγελία έχει ήδη πληρωθεί' })
      }
      // Μόνο απλήρωτη, μη ακυρωμένη παραγγελία χρεώνεται. Επιστραμμένη ή
      // ακυρωμένη: η πληρωμή θα επέστρεφε αμέσως (διπλή κίνηση στην κάρτα).
      if (order.status === 'cancelled') {
        return reply.code(409).send({ message: 'Η παραγγελία έχει ακυρωθεί' })
      }
      if (order.payment_status !== 'unpaid') {
        return reply.code(409).send({ message: 'Η παραγγελία δεν μπορεί πλέον να πληρωθεί' })
      }
      // Πληρωμή υπάρχουσας (παλιότερης) παραγγελίας: αν το απόθεμα δεν φτάνει
      // πια, όχι χρέωση που θα επέστρεφε αμέσως.
      const lines = qtyByProduct(order.items as any[])
      if (lines.size) {
        const stock = await prisma.product.findMany({ where: { id: { in: [...lines.keys()] } }, select: { id: true, stock: true } })
        const byId = new Map(stock.map(p => [p.id, p.stock]))
        const short = [...lines].filter(([pid, qty]) => (byId.get(pid) ?? 0) < qty)
          .map(([pid]) => ({ product_id: pid, available: Math.max(0, byId.get(pid) ?? 0) }))
        if (short.length) return reply.code(409).send({ message: MSG_OUT_OF_STOCK, out_of_stock: short })
      }

      const { orderCode, checkoutUrl } = await createVivaPaymentOrder({
        // Charge the stored order total — never an amount supplied by the client.
        amount: order.total_amount,
        customerEmail: user.email,
        // Το JWT δεν έχει full_name (lib/userName).
        customerName: await fullNameOf(user.email),
        orderId: order_id,
        description: `GlobiPet παραγγελία #${order_id.slice(0, 8)}`,
      })

      // Μόνο όσο είναι ακόμη απλήρωτη: αν πληρώθηκε στο μεταξύ, το
      // payment_ref είναι πια η συναλλαγή και δεν πρέπει να χαθεί (αλλιώς
      // ένα νέο verify της ίδιας συναλλαγής θα την έβλεπε ως διπλή).
      await prisma.order.updateMany({
        where: { id: order_id, payment_status: 'unpaid' },
        data: { payment_ref: String(orderCode), payment_method: 'viva' },
      })

      return { checkoutUrl, orderCode }
    } catch (err: any) {
      console.error('Viva checkout error:', err)
      return serverError(reply, err, 'order-checkout', 'Η πληρωμή δεν ξεκίνησε.')
    }
  })

  // Μετά την πληρωμή: αφαιρούνται από το καλάθι ΜΟΝΟ τα προϊόντα της
  // παραγγελίας (ό,τι πρόσθεσε ο πελάτης στο μεταξύ μένει). Ποτέ δεν κάνει
  // την καταχώριση της πληρωμής να αποτύχει.
  async function clearOrderedCartItems(orderId: string) {
    try {
      const o = await prisma.order.findUnique({ where: { id: orderId }, select: { user_email: true, items: true } })
      if (!o) return
      const ids = [...qtyByProduct(o.items as any[]).keys()]
      if (!ids.length) return
      await prisma.cartItem.deleteMany({ where: { user_email: o.user_email, product_id: { in: ids } } })
    } catch (err: any) {
      console.error('clearOrderedCartItems error:', err?.message)
    }
  }

  // Fires once when an order transitions to paid: buyer confirmation email +
  // provider new-order email/in-app notification (per distinct provider in items).
  async function firePaidSideEffects(orderId: string) {
    try {
      const order = await prisma.order.findUnique({ where: { id: orderId } })
      if (!order) return

      const items = order.items as any[]

      // Μία εξαργύρωση ανά καμπάνια — εδώ φτάνουμε μόνο τη στιγμή που η
      // παραγγελία γίνεται πληρωμένη, ποτέ δεύτερη φορά.
      await countRedemptions(items.map(i => i.campaign_id))

      sendOrderConfirmedEmail(order.user_email, {
        orderId: order.id,
        customerName: order.user_name,
        items: items.map(i => ({ name: i.name, price: i.price, quantity: i.quantity })),
        total: order.total_amount,
      }).catch(() => {})

      // Group payout by provider
      const byProvider = new Map<string, { payout: number; itemNames: string[] }>()
      for (const i of items) {
        if (!i.provider_email) continue
        const entry = byProvider.get(i.provider_email) || { payout: 0, itemNames: [] }
        entry.payout += i.provider_payout || 0
        entry.itemNames.push(`${i.name} ×${i.quantity}`)
        byProvider.set(i.provider_email, entry)
      }

      for (const [providerEmail, info] of byProvider.entries()) {
        const provider = await prisma.user.findUnique({ where: { email: providerEmail } })
        sendProviderNewOrderEmail(providerEmail, {
          providerName: provider?.full_name || providerEmail.split('@')[0],
          orderId: order.id,
          productName: info.itemNames.join(', '),
          quantity: 1,
          payoutAmount: Math.round(info.payout * 100) / 100,
        }).catch(() => {})

        const nLang = await langOfUser(providerEmail)
        const notification = await prisma.notification.create({
          data: {
            user_email: providerEmail,
            title: notifyTitle('new_order', nLang),
            message: notifyMsg.orderLine(nLang, info.itemNames.join(', '), (Math.round(info.payout * 100) / 100).toFixed(2)),
            type: 'new_order',
            link: '/provider',
          },
        })
        broadcastToUser(providerEmail, { type: 'notification', notification })
        void sendPushToUser(providerEmail, {
          title: notification.title, body: notification.message, url: notification.link ?? '/',
        })
      }
    } catch (err: any) {
      console.error('firePaidSideEffects error:', err)
    }
  }


/**
 * Confirm with Viva that a transaction really paid a given order.
 *
 * WHY THIS EXISTS
 *   Two paths marked orders as paid and neither proved anything.
 *
 *   The webhook read the JSON body and trusted it. There is no signature
 *   check — unlike the Stripe webhook next door, which calls
 *   constructEvent. So a POST of
 *     { EventTypeId: 1796, EventData: { MerchantTrns: <order id>,
 *       StatusId: 'F', TransactionId: 'anything' } }
 *   marked that order paid. And the order id is not a secret: the customer
 *   gets it in the response when they create the order. Place an order,
 *   post the webhook to yourself, receive the goods.
 *
 *   The manual verify path called Viva, but only asked "is this transaction
 *   finished?" — never "is it for this order, and for the right amount?".
 *   Any successful transaction id, including a €1 telehealth session, could
 *   confirm a €500 basket.
 *
 * Everything is checked against Viva's own record: the transaction exists,
 * it succeeded, it points back at this order, and it covers the amount.
 *
 *   'ok'        — επαληθεύτηκε
 *   'not_found' — δεν υπάρχει παραγγελία με αυτό το id (επόμενος κλάδος)
 *   'invalid'   — η Viva απάντησε: η συναλλαγή δεν πληρώνει αυτή την παραγγελία
 *   'error'     — η βάση δεν απάντησε, ή η παραγγελία υπάρχει αλλά η επαλήθευση δεν ολοκληρώθηκε
 *                 (Viva 5xx/429, timeout, δίκτυο, διαπιστευτήρια): πρέπει να
 *                 ξαναγίνει. Πριν αντιμετωπιζόταν ως άκυρη, το webhook απαντούσε
 *                 200 και η Viva δεν το ξανάστελνε — η πληρωμή χανόταν.
 *                 Επίσης: Viva 404 για ΠΡΟΣΦΑΤΟ webhook (`retryNotFound`, lib/viva
 *                 isVivaNotFoundYet) — η συναλλαγή δεν φαίνεται ακόμη στη Viva.
 *                 Το verify του πελάτη δεν το δίνει: εκεί το 404 μένει 'invalid'.
 */
async function verifyOrderPayment(orderId: string, transactionId: string, retryNotFound = false): Promise<'ok' | 'not_found' | 'invalid' | 'error'> {
  // Σφάλμα βάσης ≠ «δεν υπάρχει»: 'error' → το webhook απαντά 503 και η
  // Viva ξαναστέλνει (πριν γινόταν 'not_found' και η πληρωμή αγνοούνταν).
  let order
  try {
    order = await prisma.order.findUnique({ where: { id: orderId } })
  } catch (err: any) {
    console.error('[viva] order lookup error (will retry):', err?.message)
    return 'error'
  }
  if (!order) return 'not_found'
  try {
    const tx = await getVivaTransaction(transactionId)
    if (!tx || tx.statusId !== 'F') return 'invalid'
    // Κοινός λογαριασμός Viva: άλλη πηγή (source code) ή νόμισμα ≠ EUR, όταν
    // η Viva δίνει το πεδίο → όχι πληρωμή αυτής της εφαρμογής.
    const foreign = vivaForeignTransaction(tx)
    if (foreign) {
      console.error(`[viva] transaction ${transactionId} is not ours (${foreign}) — order ${orderId} not confirmed`)
      return 'invalid'
    }

    // The transaction must name this order. Viva echoes back the
    // merchantTrns we sent when the payment order was created.
    const trns = String(tx.merchantTrns ?? tx.MerchantTrns ?? '')
    if (trns !== orderId) {
      console.error(`[viva] transaction ${transactionId} belongs to ${trns}, not ${orderId}`)
      return 'invalid'
    }

    // And it must cover the total. Viva reports amounts in euros here; allow
    // a cent of rounding either way.
    // Μη αριθμητικό ποσό (NaN) = άκυρη, όχι «περνά» (πριν ο έλεγχος ήταν fail-open).
    const paid = Number(tx.amount ?? tx.Amount ?? 0)
    if (!Number.isFinite(paid) || paid + 0.01 < order.total_amount) {
      console.error(`[viva] transaction ${transactionId} paid ${paid}, order needs ${order.total_amount}`)
      return 'invalid'
    }
    return 'ok'
  } catch (err: any) {
    if (isVivaNotFoundYet(err, retryNotFound)) {
      console.error(`[viva] order transaction ${transactionId} not found at Viva yet (recent webhook) — will retry`)
      return 'error'
    }
    if (isVivaDefinitiveRejection(err)) {
      console.error('[viva] order transaction rejected by Viva:', err?.message)
      return 'invalid'
    }
    console.error('[viva] order verification error (will retry):', err?.message)
    return 'error'
  }
}

/**
 * Καταχώριση μιας ΕΠΑΛΗΘΕΥΜΕΝΗΣ (verifyOrderPayment === 'ok') πληρωμής
 * παραγγελίας — κοινό για webhook και verify, ιδεμποτικό.
 *
 *   'paid'          — αυτή η συναλλαγή πλήρωσε την παραγγελία, τώρα
 *   'already'       — η ίδια συναλλαγή είχε ήδη καταχωρηθεί (επανάληψη)
 *   'refunded'      — ΑΛΛΗ συναλλαγή για ήδη πληρωμένη/επιστραμμένη/ακυρωμένη
 *                     παραγγελία: επιστράφηκε αυτόματα ολόκληρη, μία φορά
 *   'refund_failed' — όπως πάνω, αλλά η Viva αρνήθηκε (audit για τον admin)
 *   'refund_pending'— όπως πάνω, αλλά η ίδια επιστροφή τρέχει αυτή τη στιγμή
 *                     αλλού ('busy'): ΔΕΝ ξέρουμε ακόμη ότι επιστράφηκε
 *   'manual'        — πληρωμένη χωρίς payment_ref: δεν ξέρουμε ποια είναι η
 *                     «πρώτη», καμία αυτόματη επιστροφή
 *
 * Όσο η παραγγελία είναι απλήρωτη, το payment_ref κρατά τον orderCode της
 * Viva (αριθμός)· από τη στιγμή της πληρωμής κρατά το transaction id (UUID).
 * Άρα «ίδια συναλλαγή» = payment_ref === txn. Πριν, η διεκδίκηση έπιανε κάθε
 * payment_status ≠ 'paid' (και ξανάκανε 'paid' επιστραμμένη παραγγελία),
 * ενώ δεύτερη πληρωμή ήδη πληρωμένης έβρισκε count 0 και χανόταν σιωπηλά.
 * Σφάλμα βάσης/κλειδώματος πετιέται: το webhook απαντά 503.
 */
async function claimOrderPayment(orderId: string, txn: string): Promise<'paid' | 'already' | 'refunded' | 'refund_failed' | 'refund_pending' | 'manual'> {
  // Διεκδίκηση unpaid → paid ΚΑΙ δέσμευση αποθέματος σε ΜΙΑ συναλλαγή βάσης:
  // κάθε προϊόν μειώνεται ατομικά μόνο αν φτάνει (stock >= ποσότητα). Αν
  // κάποιο δεν φτάνει, τίποτα δεν γράφεται (rollback) και η παραγγελία
  // ακυρώνεται με αυτόματη επιστροφή των χρημάτων (παρακάτω).
  let claimedNow = false
  try {
    claimedNow = await prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id: orderId, payment_status: 'unpaid', status: { not: 'cancelled' } },
        data: { status: 'confirmed', payment_status: 'paid', payment_ref: txn },
      })
      if (claimed.count === 0) return false
      const o = await tx.order.findUnique({ where: { id: orderId }, select: { items: true } })
      const reserved: Record<string, number> = {}
      for (const [pid, qty] of qtyByProduct((o?.items ?? []) as any[])) {
        const r = await tx.product.updateMany({
          where: { id: pid, stock: { gte: qty } },
          data: { stock: { decrement: qty } },
        })
        if (r.count === 0) throw new OutOfStockError(pid)
        reserved[pid] = qty
      }
      // Τι ακριβώς δεσμεύτηκε, στην ΙΔΙΑ συναλλαγή βάσης: η πλήρης επιστροφή
      // από τη διαχείριση (admin /refund) επαναφέρει ΜΟΝΟ αυτό — όχι για
      // παραγγελίες που πληρώθηκαν πριν υπάρξει δέσμευση αποθέματος.
      await tx.auditLog.create({
        data: {
          action: ORDER_STOCK_RESERVED_ACTION, resource: 'order', resource_id: orderId,
          actor_id: null, actor_email: 'system@globipet', actor_role: 'system',
          metadata: { transaction_id: txn, items: reserved } as any, outcome: 'success',
        },
      })
      return true
    })
  } catch (err: any) {
    if (!(err instanceof OutOfStockError)) throw err
    // Πληρώθηκε αλλά το απόθεμα εξαντλήθηκε στο μεταξύ: ακύρωση (ατομικά,
    // μόνο από unpaid) και πλήρης επιστροφή ΜΙΑ φορά (lib/extraPaymentRefund,
    // audit ανά συναλλαγή + κλείδωμα). Επανάληψη του webhook → η ακυρωμένη
    // παραγγελία πηγαίνει στον κλάδο «επιστροφή» πιο κάτω → 'already'.
    const cancelled = await prisma.order.updateMany({
      where: { id: orderId, payment_status: 'unpaid', status: { not: 'cancelled' } },
      data: { status: 'cancelled' },
    })
    if (cancelled.count > 0) {
      await auditSystem({
        action: 'order_out_of_stock_cancel', resource: 'order', resource_id: orderId, outcome: 'failure',
        error_message: 'Paid order cancelled: not enough stock at payment time — automatic refund',
        metadata: { transaction_id: txn, product_id: err.productId },
      })
      const r = await refundExtraVivaPayment('order', orderId, txn, 'out of stock at payment time')
      // «Επιστράφηκε» γράφεται ΜΟΝΟ με καταγραφή επιτυχίας ('refunded' τώρα ή
      // 'already' = υπάρχει επιτυχία). 'busy': η ίδια επιστροφή τρέχει αλλού —
      // όποιος την ολοκληρώσει γράφει την κατάσταση (markOutOfStockRefunded).
      // 'unknown' (ίσως επιστράφηκε) / 'failed': μένει για τον διαχειριστή.
      if (r === 'refunded' || r === 'already') {
        await markOutOfStockRefunded(orderId)
        return 'refunded'
      }
      return r === 'busy' ? 'refund_pending' : 'refund_failed'
    }
    // Άλλαξε στο μεταξύ (π.χ. πληρώθηκε με άλλη συναλλαγή): κανονική ροή.
  }
  if (claimedNow) {
    // Τα είδη της παραγγελίας φεύγουν από το καλάθι ΜΟΝΟ τώρα (πληρώθηκε).
    await clearOrderedCartItems(orderId)
    await firePaidSideEffects(orderId)
    await awardForRecord('order', orderId, txn) // πόντοι επιβράβευσης (lib/loyalty — ιδεμποτικό, δεν πετάει)
    return 'paid'
  }
  const fresh = await prisma.order.findUnique({
    where: { id: orderId }, select: { status: true, payment_status: true, payment_ref: true },
  })
  // Η παραγγελία επαληθεύτηκε πριν λίγο· αν χάθηκε στο μεταξύ, το βλέπει άνθρωπος.
  if (!fresh) {
    console.error(`[viva] order ${orderId} vanished; transaction ${txn} left for manual review`)
    return 'manual'
  }
  if (fresh.payment_ref === txn) return 'already'
  if (fresh.payment_status === 'paid' && !fresh.payment_ref) {
    console.error(`[viva] order ${orderId} is paid without payment_ref; transaction ${txn} left for manual review`)
    return 'manual'
  }
  const why = fresh.payment_status === 'paid'
    ? 'duplicate payment of an already paid order'
    : `order is ${fresh.status}/${fresh.payment_status}`
  const r = await refundExtraVivaPayment('order', orderId, txn, why)
  // Ακυρωμένη λόγω έλλειψης αποθέματος (απλήρωτη) παραγγελία της ΙΔΙΑΣ
  // συναλλαγής: αν η επιστροφή ολοκληρώθηκε εδώ (ο κλάδος έλλειψης πήρε
  // 'busy'), γράφεται τώρα «επιστράφηκε» — μόνο με καταγραφή επιτυχίας.
  if ((r === 'refunded' || r === 'already') && fresh.status === 'cancelled' && fresh.payment_status === 'unpaid') {
    const oos = await prisma.auditLog.findFirst({
      where: {
        action: 'order_out_of_stock_cancel', resource: 'order', resource_id: orderId,
        metadata: { path: ['transaction_id'], equals: txn },
      },
      select: { id: true },
    })
    if (oos && await extraPaymentRefunded('order', orderId, txn)) await markOutOfStockRefunded(orderId)
  }
  if (r === 'busy') return 'refund_pending'
  return r === 'failed' || r === 'unknown' ? 'refund_failed' : 'refunded'
}

/** Ακυρωμένη (έλλειψη αποθέματος), απλήρωτη παραγγελία → payment_status refunded· υπό συνθήκη, ιδεμποτικό. */
async function markOutOfStockRefunded(orderId: string) {
  await prisma.order.updateMany({
    where: { id: orderId, status: 'cancelled', payment_status: 'unpaid' },
    data: { payment_status: 'refunded' },
  })
}

/** Μορφή του transaction id της Viva (UUID) — όπως στο verify των κρατήσεων. */
const VIVA_TXN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  // Viva webhook - payment confirmation (PUBLIC - no auth)
  //
  // ΑΠΑΝΤΗΣΗ: 200 ΜΟΝΟ όταν η ειδοποίηση επεξεργάστηκε επαληθευμένα ή δεν
  // είναι δική μας. Σε κάθε αποτυχία βάσης/handler (εγγραφή που δεν έγινε,
  // σφάλμα επαλήθευσης, απρόσμενο σφάλμα) → 503, ώστε η Viva να το
  // ξαναστείλει. Πριν, οι αποτυχίες «καταπίνονταν» (.catch → 200) και μια
  // πληρωμή που δεν γράφτηκε χανόταν οριστικά. Όλοι οι κλάδοι είναι
  // ιδεμποτικοί στην επανάληψη: ατομική διεκδίκηση unpaid → paid (updateMany
  // υπό συνθήκη), η ίδια συναλλαγή ξανά → καμία αλλαγή, και οι επιστροφές
  // ελέγχουν το audit υπό κλείδωμα βάσης (lib/refundLock) πριν καλέσουν τη Viva.
  app.post('/viva/webhook', async (req: any, reply) => {
    const retry = () => reply.code(503).send({ received: false, retry: true })
    try {
      const event = (req.body ?? {}) as any
      const eventType = event.EventTypeId
      const eventData = event.EventData

      // 1796 = Transaction Payment Created (success)
      if (eventType === 1796 && eventData) {
        const merchantTrns = eventData.MerchantTrns  // our order id
        const transactionId = eventData.TransactionId
        const statusId = eventData.StatusId          // 'F' = Finished

        // The webhook is an unauthenticated, unsigned notification. It is
        // treated as a hint that something happened, never as proof — every
        // path below re-checks with Viva before touching payment state.
        //
        // One URL serves orders and telehealth, so the id is looked up as
        // each in turn. Verifying it as an order first and giving up on
        // failure would have silently stopped confirming consultations.
        if (merchantTrns && statusId === 'F' && transactionId) {
          const ref = String(merchantTrns)
          const txn = String(transactionId)
          // Πρόσφατο webhook (< 1 ώρα, όπως στην επιστροφή 1797): αν η Viva
          // απαντήσει 404 για συναλλαγή ΔΙΚΗΣ ΜΑΣ εγγραφής, η συναλλαγή δεν
          // φαίνεται ακόμη στο API της — 503 ώστε να ξανασταλεί, αντί για
          // «άκυρη» με 200 (η πληρωμή έμενε χωρίς καταχώριση).
          const recent = isRecentWebhook(eventData, event.Created)
          let bookingOutcome: Awaited<ReturnType<typeof handleBookingPaymentWebhook>> | 'failed' = 'not_mine'
          let legacyEventOutcome: Awaited<ReturnType<typeof confirmEventRegistrationPayment>> | 'failed' = null
          let orderOutcome: Awaited<ReturnType<typeof verifyOrderPayment>> = 'not_found'
          let consultationOutcome: Awaited<ReturnType<typeof verifyConsultationPayment>> = 'not_found'

          if (ref.startsWith('ev:')) {
            // Εκδηλώσεις (merchantTrns `ev:<εγγραφή>:<nonce>`): εξετάζονται
            // ΜΟΝΟ εδώ, και κανένας άλλος κλάδος δεν πιάνει `ev:`. Αν η
            // εγγραφή δεν υπάρχει πια, η πληρωμή επιστρέφεται αυτόματα.
            const ev = await handleEventPaymentWebhook(ref, txn, recent).catch((err) => {
              console.error('handleEventPaymentWebhook error (will retry):', err)
              return 'retry' as const
            })
            // Η επαλήθευση/καταχώριση δεν ολοκληρώθηκε: μη-2xx ώστε η Viva να
            // ξαναστείλει το webhook.
            if (ev === 'retry') return retry()
          } else if ((orderOutcome = await verifyOrderPayment(ref, txn, recent)) === 'error') {
            // Παραγγελία της οποίας η επαλήθευση δεν ολοκληρώθηκε (Viva 5xx,
            // δίκτυο, βάση): μη-2xx ώστε η Viva να ξαναστείλει το webhook.
            return retry()
          } else if (orderOutcome === 'ok') {
            // Ατομική καταχώριση· ΑΛΛΗ συναλλαγή για ήδη πληρωμένη παραγγελία
            // → αυτόματη επιστροφή μία φορά (claimOrderPayment).
            const claimed = await claimOrderPayment(ref, txn).catch((err: any) => {
              console.error('[viva] order paid write/refund failed (will retry):', err?.message)
              return null
            })
            // Η εγγραφή/διεκδίκηση δεν έγινε: 503. Στην επανάληψη, αν στο μεταξύ
            // γράφτηκε (π.χ. από το verify), 'already' → καμία δεύτερη παρενέργεια.
            if (!claimed) return retry()
          } else if ((consultationOutcome = await verifyConsultationPayment(ref, txn, recent)) === 'error') {
            // Τηλεϊατρική (η συνεδρία υπάρχει), η επαλήθευση δεν ολοκληρώθηκε: 503.
            return retry()
          } else if (consultationOutcome === 'ok') {
            const ok = await markTelehealthPaid(ref, txn).then(() => true, (err) => {
              console.error('markTelehealthPaid error (will retry):', err)
              return false
            })
            // Ιδεμποτικό στην επανάληψη: updateMany μόνο αν δεν είναι ήδη paid.
            if (!ok) return retry()
          } else if ((bookingOutcome = await handleBookingPaymentWebhook(ref, txn, recent).catch((err) => {
            console.error('handleBookingPaymentWebhook error (will retry):', err)
            return 'failed' as const
          })) !== 'not_mine') {
            // Τρίτος τύπος στο ίδιο URL: κρατήσεις υπηρεσιών (lib/bookingPayment).
            // Επαλήθευση στη Viva και ατομική καταχώριση· δεύτερη πληρωμή της
            // ίδιας κράτησης (ή πληρωμή ακυρωμένης) επιστρέφεται αυτόματα.
            // Κράτηση της οποίας η επαλήθευση/καταχώριση δεν ολοκληρώθηκε
            // (Viva 5xx, δίκτυο, βάση): μη-2xx ώστε η Viva να ξαναστείλει.
            if (bookingOutcome === 'retry' || bookingOutcome === 'failed') return retry()
          } else if ((legacyEventOutcome = await confirmEventRegistrationPayment(ref, txn, recent).catch((err) => {
            console.error('confirmEventRegistrationPayment error (will retry):', err)
            return 'failed' as const
          }))) {
            // Εγγραφές εκδηλώσεων με την παλιά μορφή merchantTrns (σκέτο id
            // εγγραφής, πληρωμές που ξεκίνησαν πριν το `ev:`). Επαλήθευση στη
            // Viva (ίδια παραγγελία, ποσό) και καταχώριση σε ένα βήμα.
            if (legacyEventOutcome === 'error' || legacyEventOutcome === 'failed') return retry()
          } else {
            // Παλιά μορφή εκδήλωσης για εγγραφή που ΔΕΝ υπάρχει πια: επιστροφή
            // μόνο αν η Viva επιβεβαιώσει ότι είναι πληρωμή εκδήλωσης με αυτό
            // ακριβώς το ref και το ref δεν είναι παραγγελία/κράτηση/τηλεϊατρική
            // (events.ts → refundLegacyOrphanEventPayment).
            const orphan = await refundLegacyOrphanEventPayment(ref, txn).catch((err) => {
              console.error('refundLegacyOrphanEventPayment error (will retry):', err)
              return 'retry' as const
            })
            if (orphan === 'retry') return retry()
            if (orphan === 'skip') console.error(`[viva] webhook for ${ref} could not be verified — ignored`)
          }
        }
      }
      // 1797 = Transaction Reversal Created (επιστροφή). Επαλήθευση στη Viva·
      // δική μας επιστροφή → τίποτα· εξωτερική (πίνακας Viva) → μόνο κατάσταση
      // πληρωμής + καταγραφή για τον διαχειριστή (lib/externalRefund). Ποτέ
      // κίνηση χρημάτων. Δική μας επιστροφή σε εξέλιξη → 503 (ξαναστέλνεται).
      if (eventType === 1797 && eventData) {
        const r = await handleVivaTransactionReversal(eventData, (event as any)?.Created)
        if (r === 'retry') return retry()
      }
      return reply.code(200).send({ received: true })
    } catch (err: any) {
      // Απρόσμενο σφάλμα: δεν ξέρουμε αν καταχωρήθηκε — 503, η Viva ξαναστέλνει
      // (όλοι οι κλάδοι είναι ιδεμποτικοί).
      console.error('Viva webhook error (will retry):', err)
      return retry()
    }
  })

  // Viva webhook verification key (Viva sends GET to verify endpoint)
  app.get('/viva/webhook', async (req: any, reply) => {
    const merchantId = process.env.VIVA_MERCHANT_ID
    const apiKey = process.env.VIVA_API_KEY
    const isDemo = (process.env.VIVA_ENV || 'demo') === 'demo'
    const baseUrl = isDemo
      ? 'https://demo.vivapayments.com'
      : 'https://www.vivapayments.com'
    const credentials = Buffer.from(`${merchantId}:${apiKey}`).toString('base64')
    const res = await fetch(`${baseUrl}/api/messages/config/token`, {
      headers: { 'Authorization': `Basic ${credentials}` }
    })
    const data = await res.json() as any
    return { Key: data.Key }
  })

  // Manual verify (called from success page)
  app.post('/viva/verify', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { order_id, transaction_id } = (req.body ?? {}) as any
    try {
      // Μόνο ο πελάτης της παραγγελίας (ή admin) μαθαίνει την κατάσταση πληρωμής.
      const { email, role } = req.user as any
      const owner = await prisma.order.findUnique({ where: { id: String(order_id ?? '') }, select: { user_email: true } })
      if (!owner) return reply.code(404).send({ message: 'Η παραγγελία δεν βρέθηκε' })
      if (owner.user_email !== email && role !== 'admin') return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
      // Το transaction id της Viva είναι UUID· οτιδήποτε άλλο δεν φτάνει στη Viva.
      if (transaction_id != null && transaction_id !== ''
        && (typeof transaction_id !== 'string' || !VIVA_TXN_RE.test(transaction_id))) {
        return reply.code(400).send({ message: 'Μη έγκυρο αναγνωριστικό συναλλαγής' })
      }
      if (transaction_id) {
        // Η ίδια συναλλαγή έχει ήδη καταχωρηθεί (webhook ή προηγούμενο verify):
        // χωρίς νέα ερώτηση στη Viva — ώστε ένα σφάλμα της να μη δώσει 503
        // για παραγγελία που είναι ήδη πληρωμένη.
        const existing = await prisma.order.findUnique({
          where: { id: String(order_id) }, select: { payment_status: true, payment_ref: true },
        })
        if (existing?.payment_status === 'paid' && existing.payment_ref === transaction_id) {
          return { paid: true, order_id }
        }
        // Same check as the webhook: succeeded, for this order, for the
        // full amount.
        const verdict = await verifyOrderPayment(String(order_id), String(transaction_id))
        // Η Viva δεν απάντησε (5xx/δίκτυο): 503, ο πελάτης ξαναδοκιμάζει.
        if (verdict === 'error') {
          return reply.code(503).send({ message: 'Η επαλήθευση της πληρωμής δεν ολοκληρώθηκε. Δοκίμασε ξανά σε λίγο.', retry: true })
        }
        if (verdict === 'ok') {
          // Ίδια καταχώριση με το webhook (ατομική, ιδεμποτική)· ΑΛΛΗ
          // συναλλαγή για ήδη πληρωμένη παραγγελία επιστρέφεται αυτόματα.
          const result = await claimOrderPayment(String(order_id), String(transaction_id))
          const fresh = await prisma.order.findUnique({ where: { id: String(order_id) }, select: { payment_status: true } })
          // `result` προσθετικό: 'paid' | 'already' | 'refunded' | 'refund_failed' | 'manual'
          // `reason` προσθετικό: 'out_of_stock' = η παραγγελία ακυρώθηκε γιατί
          // το απόθεμα εξαντλήθηκε τη στιγμή της πληρωμής (claimOrderPayment)
          // — από την καταγραφή, ώστε να ισχύει και όταν το webhook πρόλαβε.
          let reason: 'out_of_stock' | undefined
          if (result === 'refunded' || result === 'refund_failed' || result === 'refund_pending') {
            const oos = await prisma.auditLog.findFirst({
              where: {
                action: 'order_out_of_stock_cancel', resource: 'order', resource_id: String(order_id),
                metadata: { path: ['transaction_id'], equals: String(transaction_id) },
              },
              select: { id: true },
            })
            if (oos) reason = 'out_of_stock'
          }
          // 'refund_pending' (η επιστροφή τρέχει αλλού): ΟΧΙ «επιστράφηκε». Στον
          // πελάτη ως 'refund_failed', που web και κινητό (και οι ήδη
          // εγκατεστημένες εκδόσεις) δείχνουν ως «η επιστροφή καθυστερεί — θα
          // ολοκληρωθεί από εμάς»· `refund_pending` προσθετικό.
          const pending = result === 'refund_pending'
          return {
            paid: fresh?.payment_status === 'paid', order_id, result: pending ? 'refund_failed' : result,
            ...(pending ? { refund_pending: true } : {}), ...(reason ? { reason } : {}),
          }
        }
      }
      return { paid: false, order_id }
    } catch (err: any) {
      console.error('Viva verify error:', err)
      return serverError(reply, err, 'order')
    }
  })

  // Admin: get all orders
  app.get('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const user = req.user as any
    if (user.role !== 'admin') return { data: [] }
    const orders = await prisma.order.findMany({
      orderBy: { created_at: 'desc' },
      take: 50,
    })
    return { data: withAddress(orders) }
  })
}

export default ordersRoutes