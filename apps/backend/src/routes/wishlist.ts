import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { effectivePrice } from '../lib/price.js'

const routes: FastifyPluginAsync = async (app) => {

  app.get('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const rows = await prisma.wishlist.findMany({ where: { user_email: email }, orderBy: { created_at: 'desc' } })
    // Η product_price της γραμμής είναι στιγμιότυπο της αποθήκευσης· εδώ
    // επιστρέφεται η τρέχουσα τιμή που χρεώνεται (effectivePrice), ώστε η
    // λίστα να δείχνει μειώσεις τιμής και εκπτώσεις όπως το καλάθι.
    const products = rows.length
      ? await prisma.product.findMany({
          where: { id: { in: rows.map(r => r.product_id) } },
          select: { id: true, price: true, sale_price: true },
        })
      : []
    const byId = new Map(products.map(p => [p.id, p]))
    const data = rows.map(r => {
      const p = byId.get(r.product_id)
      return p ? { ...r, product_price: effectivePrice(p) } : r
    })
    return { data }
  })

  /**
   * Toggle a product in the wishlist.
   *
   * Name, price and image come from the products table. They were previously
   * taken from the request body, so the saved row could show any price the
   * client chose — and the wishlist is where people watch for price drops.
   *
   * Optional `action: 'add' | 'remove'` makes the call idempotent: a double
   * click or a retried request sends the same intent twice and the second
   * one changes nothing. Without it the old toggle behaviour is kept, so
   * clients already installed keep working.
   */
  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const { product_id, action } = req.body as any
    if (!product_id) return reply.code(400).send({ message: 'Λείπει product_id' })

    const existing = await prisma.wishlist.findUnique({
      where: { user_email_product_id: { user_email: email, product_id } },
    })
    if (existing) {
      if (action === 'add') return { data: existing, added: true }
      await prisma.wishlist.deleteMany({ where: { user_email: email, product_id } })
      return { removed: true }
    }
    if (action === 'remove') return { removed: true }

    const product = await prisma.product.findUnique({ where: { id: product_id } })
    if (!product) return reply.code(404).send({ message: 'Το προϊόν δεν βρέθηκε' })

    try {
      const item = await prisma.wishlist.create({
        data: {
          user_email: email,
          product_id,
          product_name: product.name,
          product_price: effectivePrice(product),
          product_image: product.image_url ?? null,
        },
      })
      return reply.code(201).send({ data: item, added: true })
    } catch (e: any) {
      // Two requests raced past the lookup above; the unique key kept one row.
      if (e?.code !== 'P2002') throw e
      const row = await prisma.wishlist.findUnique({
        where: { user_email_product_id: { user_email: email, product_id } },
      })
      return { data: row, added: true }
    }
  })

  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    await prisma.wishlist.deleteMany({ where: { id: req.params.id, user_email: email } })
    return reply.code(204).send()
  })
}

export default routes
