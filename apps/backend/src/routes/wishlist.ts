import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const routes: FastifyPluginAsync = async (app) => {

  app.get('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const data = await prisma.wishlist.findMany({ where: { user_email: email }, orderBy: { created_at: 'desc' } })
    return { data }
  })

  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const { product_id, product_name, product_price, product_image } = req.body as any
    if (!product_id) return reply.code(400).send({ message: 'Λείπει product_id' })
    const existing = await prisma.wishlist.findUnique({ where: { user_email_product_id: { user_email: email, product_id } } })
    if (existing) {
      await prisma.wishlist.delete({ where: { user_email_product_id: { user_email: email, product_id } } })
      return { removed: true }
    }
    const item = await prisma.wishlist.create({ data: { user_email: email, product_id, product_name, product_price: parseFloat(product_price), product_image: product_image || null } })
    return reply.code(201).send({ data: item, added: true })
  })

  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    await prisma.wishlist.deleteMany({ where: { id: req.params.id, user_email: email } })
    return reply.code(204).send()
  })
}

export default routes
