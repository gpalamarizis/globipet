import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const routes: FastifyPluginAsync = async (app) => {

  app.get('/', async (req: any) => {
    const { service_id, provider_email } = req.query
    const data = await prisma.review.findMany({
      where: { ...(service_id && { service_id }), ...(provider_email && { provider_email }) },
      orderBy: { created_at: 'desc' },
    })
    return { data }
  })

  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email, full_name } = req.user as any
    const { service_id, provider_email, rating, comment, booking_id } = req.body as any
    if (!service_id || !provider_email || !rating) return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })
    const review = await prisma.review.create({
      data: { service_id, provider_email, customer_email: email, customer_name: full_name || email.split('@')[0], rating: parseInt(rating), comment: comment || null, booking_id: booking_id || null }
    })
    // Update service rating
    const reviews = await prisma.review.findMany({ where: { service_id }, select: { rating: true } })
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    await prisma.service.update({ where: { id: service_id }, data: { rating: avg, reviews_count: reviews.length } })
    return reply.code(201).send({ data: review })
  })

  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const existing = await prisma.review.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.customer_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.review.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })
}

export default routes
