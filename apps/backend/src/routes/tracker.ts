import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const routes: FastifyPluginAsync = async (app) => {

  app.get('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const { pet_id } = req.query
    const data = await prisma.petLocation.findMany({
      where: { owner_email: email, ...(pet_id && { pet_id }) },
      orderBy: { created_at: 'desc' },
      take: 50,
    })
    return { data }
  })

  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const { pet_id, latitude, longitude, status } = req.body as any
    if (!pet_id || !latitude || !longitude) return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })
    const location = await prisma.petLocation.create({
      data: { pet_id, owner_email: email, latitude: parseFloat(latitude), longitude: parseFloat(longitude), status: status || 'safe' }
    })
    return reply.code(201).send({ data: location })
  })

  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const existing = await prisma.petLocation.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    return prisma.petLocation.update({ where: { id: req.params.id }, data: req.body })
  })

  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const existing = await prisma.petLocation.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.petLocation.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })
}

export default routes
