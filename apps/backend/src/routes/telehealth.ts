import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const routes: FastifyPluginAsync = async (app) => {

  app.get('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const data = await prisma.telehealthConsultation.findMany({
      where: { OR: [{ client_email: email }, { provider_email: email }] },
      orderBy: { scheduled_date: 'desc' },
    })
    return { data }
  })

  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email, full_name } = req.user as any
    const { provider_email, provider_name, pet_id, pet_name, scheduled_date, scheduled_time, duration, notes, price } = req.body as any
    if (!provider_email || !scheduled_date || !scheduled_time) return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })
    const consultation = await prisma.telehealthConsultation.create({
      data: {
        provider_email, provider_name: provider_name || provider_email,
        client_email: email, client_name: full_name || email.split('@')[0],
        pet_id: pet_id || null, pet_name: pet_name || null,
        scheduled_date, scheduled_time,
        duration: parseInt(duration) || 30,
        notes: notes || null,
        price: parseFloat(price) || 0,
        status: 'scheduled',
      }
    })
    return reply.code(201).send({ data: consultation })
  })

  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const existing = await prisma.telehealthConsultation.findUnique({ where: { id: req.params.id } })
    if (!existing) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    if (existing.client_email !== email && existing.provider_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    return prisma.telehealthConsultation.update({ where: { id: req.params.id }, data: req.body })
  })

  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const existing = await prisma.telehealthConsultation.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.client_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.telehealthConsultation.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })
}

export default routes
