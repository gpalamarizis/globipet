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
    const total = items.reduce((sum: number, item: any) => sum + (item.product_price * item.quantity), 0)
    return { data: items, total }
  })

  // POST add item to cart
  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const { product_id, product_name, product_price, product_image, quantity = 1 } = req.body as any

    const existing = await prisma.cartItem.findUnique({
      where: { user_email_product_id: { user_email: email, product_id } },
    })

    if (existing) {
      const updated = await prisma.cartItem.update({
        where: { user_email_product_id: { user_email: email, product_id } },
        data: { quantity: existing.quantity + quantity },
      })
      return { data: updated, success: true }
    }

    const item = await prisma.cartItem.create({
      data: {
        user_email: email,
        product_id,
        product_name,
        product_price: parseFloat(product_price),
        product_image: product_image || null,
        quantity,
      },
    })
    return { data: item, success: true }
  })

  // PATCH update quantity
  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const { quantity } = req.body as any

    if (quantity <= 0) {
      await prisma.cartItem.deleteMany({ where: { id: req.params.id, user_email: email } })
      return { success: true, deleted: true }
    }

    const updated = await prisma.cartItem.updateMany({
      where: { id: req.params.id, user_email: email },
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
}

export default routes
