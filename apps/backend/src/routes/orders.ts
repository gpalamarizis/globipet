import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const ordersRoutes: FastifyPluginAsync = async (app) => {

  // Get my orders
  app.get('/my', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const orders = await prisma.order.findMany({
      where: { user_id: (req.user as any).id },
      orderBy: { created_at: 'desc' },
      include: { order_items: { include: { product: true } } },
    })
    return { data: orders }
  })

  // Get order by ID
  app.get('/:id', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { order_items: { include: { product: true } } },
    })
    return order
  })

  // Create order
  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { items, shipping_address, payment_method, total_amount } = req.body as any
    const order = await prisma.order.create({
      data: {
        user_id: (req.user as any).id,
        status: 'pending',
        total_amount: parseFloat(total_amount),
        shipping_address: JSON.stringify(shipping_address),
        payment_method,
        order_items: {
          create: items.map((item: any) => ({
            product_id: item.product_id || item.id,
            quantity: item.quantity,
            unit_price: parseFloat(item.price),
          }))
        }
      }
    })
    // Clear cart
    await prisma.cartItem.deleteMany({ where: { user_id: (req.user as any).id } })
    return order
  })

  // Stripe checkout session
  app.post('/checkout-session', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY
    if (!STRIPE_SECRET) return reply.code(500).send({ message: 'Stripe not configured' })

    const { order_id, items, success_url, cancel_url } = req.body as any

    try {
      const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'payment_method_types[]': 'card',
          'mode': 'payment',
          'success_url': success_url,
          'cancel_url': cancel_url,
          'metadata[order_id]': order_id,
          ...items.reduce((acc: any, item: any, i: number) => {
            acc[`line_items[${i}][price_data][currency]`] = 'eur'
            acc[`line_items[${i}][price_data][product_data][name]`] = item.name
            acc[`line_items[${i}][price_data][unit_amount]`] = Math.round(item.price * 100)
            acc[`line_items[${i}][quantity]`] = item.quantity
            return acc
          }, {})
        }).toString(),
      })
      const session = await response.json() as any
      return { url: session.url, session_id: session.id }
    } catch (err: any) {
      return reply.code(500).send({ message: err.message })
    }
  })

  // Stripe webhook
  app.post('/webhook', async (req: any, reply) => {
    const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
    const sig = req.headers['stripe-signature']

    try {
      const event = req.body as any
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object
        const orderId = session.metadata?.order_id
        if (orderId) {
          await prisma.order.update({
            where: { id: orderId },
            data: { status: 'confirmed', payment_status: 'paid' }
          })
        }
      }
      return { received: true }
    } catch (err: any) {
      return reply.code(400).send({ message: err.message })
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
