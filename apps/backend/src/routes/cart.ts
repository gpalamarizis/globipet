import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const routes: FastifyPluginAsync = async (app) => {

  // GET cart items
  app.get('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const items = await prisma.cartItem.findMany({
      where: { user_email: email },
      orderBy: { created_at: 'desc' },
    })
    const total = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)
    return { data: items, total }
  })

  // POST add item to cart
  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const { product_id, product_name, product_price, product_image, quantity = 1 } = req.body as any

    // Check if item already in cart
    const existing = await prisma.cartItem.findFirst({
      where: { user_email: email, product_id },
    })

    if (existing) {
      const updated = await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
      })
      return { data: updated, success: true }
    }

    const item = await prisma.cartItem.create({
      data: {
        user_email: email,
        product_id,
        name: product_name,
        price: parseFloat(product_price),
        image: product_image || null,
        quantity,
      },
    })
    return { data: item, success: true }
  })

  // PATCH update quantity
  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const { quantity } = req.body as any

    const item = await prisma.cartItem.findFirst({
      where: { id: req.params.id, user_email: email },
    })
    if (!item) return { success: false }

    if (quantity <= 0) {
      await prisma.cartItem.delete({ where: { id: req.params.id } })
      return { success: true, deleted: true }
    }

    const updated = await prisma.cartItem.update({
      where: { id: req.params.id },
      data: { quantity },
    })
    return { data: updated, success: true }
  })

  // DELETE remove item
  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    await prisma.cartItem.deleteMany({
      where: { id: req.params.id, user_email: email },
    })
    return { success: true }
  })

  // DELETE clear entire cart
  app.delete('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    await prisma.cartItem.deleteMany({ where: { user_email: email } })
    return { success: true }
  })
}

export default routes
