import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { effectivePrice } from '../lib/price.js'

const routes: FastifyPluginAsync = async (app) => {

  // GET cart items
  app.get('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const rows = await prisma.cartItem.findMany({
      where: { user_email: email },
      orderBy: { created_at: 'desc' },
    })
    // Η τιμή της γραμμής είναι στιγμιότυπο της στιγμής που μπήκε στο καλάθι.
    // Η παραγγελία όμως χρεώνει την τρέχουσα τιμή (effectivePrice, από τη
    // βάση)· γι' αυτό εδώ επιστρέφεται η τρέχουσα, ώστε καλάθι και ταμείο να
    // δείχνουν αυτό που θα χρεωθεί (π.χ. καλάθια από πριν μπει η έκπτωση).
    const products = rows.length
      ? await prisma.product.findMany({
          where: { id: { in: rows.map(r => r.product_id) } },
          select: { id: true, price: true, sale_price: true },
        })
      : []
    const byId = new Map(products.map(p => [p.id, p]))
    const items = rows.map(r => {
      const p = byId.get(r.product_id)
      return p ? { ...r, product_price: effectivePrice(p) } : r
    })
    const total = Math.round(items.reduce((sum: number, item: any) => sum + (item.product_price * item.quantity), 0) * 100) / 100
    return { data: items, total }
  })

  // POST add item to cart
  //
  // SECURITY: the price, name and image are read from the products table on
  // the server, never from the request body. A client that posts
  // { product_id: <expensive item>, product_price: 0.01 } previously had that
  // price stored verbatim and carried through to checkout.
  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const { product_id, quantity: rawQty = 1 } = req.body as any

    if (!product_id) {
      return reply.code(400).send({ message: 'Λείπει το product_id' })
    }

    // Clamp quantity to a sane range so a negative or absurd value cannot
    // be used to zero out or explode the cart total.
    const quantity = Math.min(Math.max(parseInt(rawQty) || 1, 1), 99)

    const product = await prisma.product.findUnique({ where: { id: product_id } })
    if (!product) {
      return reply.code(404).send({ message: 'Το προϊόν δεν βρέθηκε' })
    }

    const existing = await prisma.cartItem.findUnique({
      where: { user_email_product_id: { user_email: email, product_id } },
    })

    if (existing) {
      const updated = await prisma.cartItem.update({
        where: { user_email_product_id: { user_email: email, product_id } },
        data: {
          quantity: Math.min(existing.quantity + quantity, 99),
          // Refresh the snapshot in case the provider changed the price
          product_price: effectivePrice(product),
          product_name: product.name,
          product_image: product.image_url ?? null,
        },
      })
      return { data: updated, success: true }
    }

    const item = await prisma.cartItem.create({
      data: {
        user_email: email,
        product_id,
        product_name: product.name,
        product_price: effectivePrice(product),
        product_image: product.image_url ?? null,
        quantity,
      },
    })
    return { data: item, success: true }
  })

  // PATCH update quantity
  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const raw = (req.body as any)?.quantity
    const quantity = parseInt(raw)

    if (!Number.isFinite(quantity) || quantity <= 0) {
      await prisma.cartItem.deleteMany({ where: { id: req.params.id, user_email: email } })
      return { success: true, deleted: true }
    }

    const updated = await prisma.cartItem.updateMany({
      where: { id: req.params.id, user_email: email },
      data: { quantity: Math.min(quantity, 99) },
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
