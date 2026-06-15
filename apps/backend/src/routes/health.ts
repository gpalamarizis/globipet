import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const routes: FastifyPluginAsync = async (app) => {

  // Health Records
  app.get('/records', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const { pet_id } = req.query
    const data = await prisma.healthRecord.findMany({
      where: { owner_email: email, ...(pet_id && { pet_id }) },
      orderBy: { date: 'desc' },
    })
    return { data }
  })

  app.post('/records', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const { pet_id, record_type, title, description, date, vet_name, clinic_name, cost, next_appointment } = req.body as any
    if (!pet_id || !record_type || !title || !date) return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })
    const record = await prisma.healthRecord.create({
      data: { pet_id, owner_email: email, record_type, title, description: description || '', date, vet_name: vet_name || null, clinic_name: clinic_name || null, cost: cost ? parseFloat(cost) : null, next_appointment: next_appointment || null, attachments: [] }
    })
    return reply.code(201).send({ data: record })
  })

  app.patch('/records/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const existing = await prisma.healthRecord.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    const record = await prisma.healthRecord.update({ where: { id: req.params.id }, data: req.body })
    return { data: record }
  })

  app.delete('/records/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const existing = await prisma.healthRecord.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.healthRecord.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })

  // Vaccinations
  app.get('/vaccinations', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const { pet_id } = req.query
    const data = await prisma.vaccination.findMany({
      where: { owner_email: email, ...(pet_id && { pet_id }) },
      orderBy: { date_administered: 'desc' },
    })
    return { data }
  })

  app.post('/vaccinations', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const { pet_id, vaccine_name, vaccine_type, date_administered, next_due_date, vet_name } = req.body as any
    if (!pet_id || !vaccine_name || !date_administered) return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })
    const vaccination = await prisma.vaccination.create({
      data: { pet_id, owner_email: email, vaccine_name, vaccine_type: vaccine_type || 'other', date_administered, next_due_date: next_due_date || null, vet_name: vet_name || null }
    })
    return reply.code(201).send({ data: vaccination })
  })

  app.delete('/vaccinations/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const existing = await prisma.vaccination.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.vaccination.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })
}

export default routes
