import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { createVivaPaymentOrder, getVivaTransaction } from '../lib/viva.js'

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

  // Get order by ID
  app.get('/:id', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } })
    return order
  })

  // Create order
  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email, full_name } = req.user as any
    const { items, shipping_address, payment_method, total_amount } = req.body as any

    const order = await prisma.order.create({
      data: {
        user_email: email,
        user_name: full_name || email.split('@')[0],
        items: items.map((item: any) => ({
          product_id: item.product_id || item.id,
          name: item.product_name || item.name,
          price: parseFloat(item.price || item.product_price),
          quantity: item.quantity,
          image: item.product_image || item.image || null,
        })),
        total_amount: parseFloat(total_amount),
        status: 'pending',
        
        shipping_address: shipping_address,
        payment_method,
      }
    })
    // Clear cart
    await prisma.cartItem.deleteMany({ where: { user_email: email } })
    return order
  })

  // ─── VIVA.COM SMART CHECKOUT ────────────────────────────────────────────────
  app.post('/viva/checkout', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { order_id, total_amount } = req.body as any
    const user = req.user as any

    try {
      const order = await prisma.order.findUnique({ where: { id: order_id } })
      if (!order || order.user_email !== user.email) {
        return reply.code(404).send({ message: 'Η παραγγελία δεν βρέθηκε' })
      }

      const { orderCode, checkoutUrl } = await createVivaPaymentOrder({
        amount: parseFloat(total_amount || order.total_amount),
        customerEmail: user.email,
        customerName: user.full_name,
        orderId: order_id,
        description: `GlobiPet παραγγελία #${order_id.slice(0, 8)}`,
      })

      await prisma.order.update({
        where: { id: order_id },
        data: { payment_intent: String(orderCode), payment_method: 'viva' },
      })

      return { checkoutUrl, orderCode }
    } catch (err: any) {
      console.error('Viva checkout error:', err)
      return reply.code(500).send({ message: err.message || 'Σφάλμα πληρωμής' })
    }
  })

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
          await prisma.order.update({
            where: { id: merchantTrns },
            data: {
              status: 'confirmed',
              
              payment_intent: String(transactionId),
            },
          }).catch(() => {})
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

    try {
      const credentials = Buffer.from(`${merchantId}:${apiKey}`).toString('base64')
      const res = await fetch(`${baseUrl}/api/messages/config/token`, {
        headers: { 'Authorization': `Basic ${credentials}` }
      })
      const data = await res.json() as any
      return { Key: data.Key }
    } catch (err: any) {
      console.error('Viva webhook key error:', err)
      return reply.code(500).send({ Key: '' })
    }
  })

  // Manual verify (called from success page)
  app.post('/viva/verify', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { order_id, transaction_id } = req.body as any
    try {
      if (transaction_id) {
        const transaction = await getVivaTransaction(transaction_id)
        if (transaction.statusId === 'F') {
          await prisma.order.update({
            where: { id: order_id },
            data: { status: 'confirmed',  payment_intent: String(transaction_id) },
          })
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