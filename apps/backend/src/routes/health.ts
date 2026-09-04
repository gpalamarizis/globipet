import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const routes: FastifyPluginAsync = async (app) => {

  /**
   * Verify the caller owns the pet a record is being attached to.
   *
   * Without this, `owner_email` was set from the token but `pet_id` was taken
   * from the body unchecked — so anyone could write vaccination and medical
   * history onto a stranger's pet. Those records then show up in the owner's
   * medical file, which is both a data-integrity and a safety problem.
   *
   * Admins are allowed through so support can correct records on request.
   */
  async function assertOwnsPet(req: any, reply: any, petId: string) {
    const user = req.user as any
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      select: { id: true, owner_email: true },
    })
    if (!pet) {
      reply.code(404).send({ message: 'Το κατοικίδιο δεν βρέθηκε' })
      return false
    }
    if (pet.owner_email !== user.email && user.role !== 'admin') {
      reply.code(403).send({ message: 'Το κατοικίδιο δεν σου ανήκει' })
      return false
    }
    return true
  }

  /** Owner-or-admin check for an existing record row. */
  function canTouch(req: any, ownerEmail: string) {
    const user = req.user as any
    return ownerEmail === user.email || user.role === 'admin'
  }

  // ─── Health Records ────────────────────────────────────────────────

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
    if (!(await assertOwnsPet(req, reply, pet_id))) return

    const record = await prisma.healthRecord.create({
      data: {
        pet_id,
        owner_email: email,
        record_type,
        title,
        description: description || '',
        date,
        vet_name: vet_name || null,
        clinic_name: clinic_name || null,
        cost: cost ? parseFloat(cost) : null,
        next_appointment: next_appointment || null,
        attachments: [],
      }
    })
    return reply.code(201).send({ data: record })
  })

  app.patch('/records/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const existing = await prisma.healthRecord.findUnique({ where: { id: req.params.id } })
    if (!existing) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    if (!canTouch(req, existing.owner_email)) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })

    // Ownership fields are never editable through this endpoint, and moving a
    // record to another pet requires owning that pet too.
    const { owner_email: _o, id: _i, pet_id, ...body } = (req.body ?? {}) as any
    if (pet_id && pet_id !== existing.pet_id) {
      if (!(await assertOwnsPet(req, reply, pet_id))) return
      body.pet_id = pet_id
    }

    const record = await prisma.healthRecord.update({ where: { id: existing.id }, data: body })
    return { data: record }
  })

  app.delete('/records/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const existing = await prisma.healthRecord.findUnique({ where: { id: req.params.id } })
    if (!existing) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    if (!canTouch(req, existing.owner_email)) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.healthRecord.delete({ where: { id: existing.id } })
    return reply.code(204).send()
  })

  // ─── Vaccinations ──────────────────────────────────────────────────

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
    if (!(await assertOwnsPet(req, reply, pet_id))) return

    const vaccination = await prisma.vaccination.create({
      data: {
        pet_id,
        owner_email: email,
        vaccine_name,
        vaccine_type: vaccine_type || 'other',
        date_administered,
        next_due_date: next_due_date || null,
        vet_name: vet_name || null,
      }
    })
    return reply.code(201).send({ data: vaccination })
  })

  app.delete('/vaccinations/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const existing = await prisma.vaccination.findUnique({ where: { id: req.params.id } })
    if (!existing) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    if (!canTouch(req, existing.owner_email)) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.vaccination.delete({ where: { id: existing.id } })
    return reply.code(204).send()
  })
}

export default routes
