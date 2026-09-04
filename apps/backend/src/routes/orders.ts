import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { createVivaPaymentOrder, getVivaTransaction } from '../lib/viva.js'
import { calculateCommission } from '../lib/commission.js'
import { sendOrderConfirmedEmail, sendProviderNewOrderEmail } from '../lib/email.js'
import { broadcastToUser } from './notifications.js'
import { markTelehealthPaid } from './telehealth.js'

const ordersRoutes: FastifyPluginAsync = async (app) => {

  // Get my orders
  app.get('/my', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const orders = await prisma.order.findMany({
      where: { user_email: email },
      orderBy: { created_at: 'desc' },
    })
    return { data: orders }
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
    return order
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

    const enrichedItems = await Promise.all(items.map(async (item: any) => {
      const productId = item.product_id || item.id
      const product = productMap.get(productId)!
      // Authoritative price from the database — the client value is ignored.
      const price = product.price
      const quantity = Math.min(Math.max(parseInt(item.quantity) || 1, 1), 99)
      const lineTotal = price * quantity
      computedTotal += lineTotal
      const category = product.category || null
      const providerEmail = product.provider_email || null

      let commission_rate: number | null = null
      let platform_fee: number | null = null
      let provider_payout: number | null = null

      if (providerEmail) {
        const c = await calculateCommission(lineTotal, category)
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
        image: product.image_url ?? null,
        category,
        provider_email: providerEmail,
        commission_rate,
        platform_fee,
        provider_payout,
      }
    }))

    const order = await prisma.order.create({
      data: {
        user_email: email,
        user_name: full_name || email.split('@')[0],
        items: enrichedItems,
        // Computed from database prices, not from the request body.
        total_amount: Math.round(computedTotal * 100) / 100,
        status: 'pending',
        shipping_address: shipping_address,
        payment_method,
        platform_fee_amount: totalPlatformFee > 0 ? Math.round(totalPlatformFee * 100) / 100 : null,
        provider_payout_amount: totalProviderPayout > 0 ? Math.round(totalProviderPayout * 100) / 100 : null,
      }
    })
    // Clear cart
    await prisma.cartItem.deleteMany({ where: { user_email: email } })
    return order
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

      const { orderCode, checkoutUrl } = await createVivaPaymentOrder({
        // Charge the stored order total — never an amount supplied by the client.
        amount: order.total_amount,
        customerEmail: user.email,
        customerName: user.full_name,
        orderId: order_id,
        description: `GlobiPet παραγγελία #${order_id.slice(0, 8)}`,
      })

      await prisma.order.update({
        where: { id: order_id },
        data: { payment_ref: String(orderCode), payment_method: 'viva' },
      })

      return { checkoutUrl, orderCode }
    } catch (err: any) {
      console.error('Viva checkout error:', err)
      return reply.code(500).send({ message: err.message || 'Σφάλμα πληρωμής' })
    }
  })

  // Fires once when an order transitions to paid: buyer confirmation email +
  // provider new-order email/in-app notification (per distinct provider in items).
  async function firePaidSideEffects(orderId: string) {
    try {
      const order = await prisma.order.findUnique({ where: { id: orderId } })
      if (!order) return

      const items = order.items as any[]

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

        const notification = await prisma.notification.create({
          data: {
            user_email: providerEmail,
            title: 'Νέα παραγγελία προϊόντος',
            message: `${info.itemNames.join(', ')} — αμοιβή ${(Math.round(info.payout * 100) / 100).toFixed(2)}€`,
            type: 'new_order',
            link: '/provider',
          },
        })
        broadcastToUser(providerEmail, { type: 'notification', notification })
      }
    } catch (err: any) {
      console.error('firePaidSideEffects error:', err)
    }
  }

  // Viva webhook - payment confirmation (PUBLIC - no auth)
  app.post('/viva/webhook', async (req: any, reply) => {
    try {
      const event = req.body as any
      const eventType = event.EventTypeId
      const eventData = event.EventData

      // 1796 = Transaction Payment Created (success)
      if (eventType === 1796 && eventData) {
        const merchantTrns = eventData.MerchantTrns  // our order id
        const transactionId = eventData.TransactionId
        const statusId = eventData.StatusId          // 'F' = Finished

        if (merchantTrns && statusId === 'F') {
          const updated = await prisma.order.updateMany({
            where: { id: merchantTrns, payment_status: { not: 'paid' } },
            data: {
              status: 'confirmed',
              payment_status: 'paid',
              payment_ref: String(transactionId),
            },
          }).catch(() => null)
          if (updated && updated.count > 0) {
            await firePaidSideEffects(merchantTrns)
          } else {
            // Not an order — try telehealth (same shared webhook URL handles both)
            await markTelehealthPaid(merchantTrns, String(transactionId)).catch((err) => {
              console.error('markTelehealthPaid fallback error:', err)
            })
          }
        }
      }
      return reply.code(200).send({ received: true })
    } catch (err: any) {
      console.error('Viva webhook error:', err)
      return reply.code(200).send({ received: true })
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
    const { order_id, transaction_id } = req.body as any
    try {
      if (transaction_id) {
        const transaction = await getVivaTransaction(transaction_id)
        if (transaction.statusId === 'F') {
          const updated = await prisma.order.updateMany({
            where: { id: order_id, payment_status: { not: 'paid' } },
            data: { status: 'confirmed', payment_status: 'paid', payment_ref: String(transaction_id) },
          })
          if (updated.count > 0) {
            await firePaidSideEffects(order_id)
          }
          return { paid: true, order_id }
        }
      }
      return { paid: false, order_id }
    } catch (err: any) {
      console.error('Viva verify error:', err)
      return reply.code(500).send({ message: err.message })
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
    return { data: orders }
  })
}

export default ordersRoutes