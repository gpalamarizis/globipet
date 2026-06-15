import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const routes: FastifyPluginAsync = async (app) => {

  // GET full passport for a pet
  app.get('/:petId', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const { petId } = req.params as any

    const pet = await prisma.pet.findUnique({ where: { id: petId } })
    if (!pet) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    if (pet.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })

    const [vaccinations, healthRecords, pedigree, travelDocs] = await Promise.all([
      prisma.vaccination.findMany({ where: { pet_id: petId }, orderBy: { date_administered: 'desc' } }),
      prisma.healthRecord.findMany({ where: { pet_id: petId }, orderBy: { date: 'desc' } }),
      prisma.petPedigree.findUnique({ where: { pet_id: petId } }),
      prisma.petTravelDocument.findMany({ where: { pet_id: petId }, orderBy: { departure_date: 'desc' } }),
    ])

    return { pet, vaccinations, healthRecords, pedigree, travelDocs }
  })

  // PATCH pedigree (upsert)
  app.put('/pedigree/:petId', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const { petId } = req.params as any
    const pet = await prisma.pet.findUnique({ where: { id: petId } })
    if (!pet || pet.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })

    const { registration_number, kennel_club, father_name, mother_name, breeder_name, breeder_contact, birth_certificate, pedigree_document, certifications, notes } = req.body as any

    const pedigree = await prisma.petPedigree.upsert({
      where: { pet_id: petId },
      create: { pet_id: petId, owner_email: email, registration_number, kennel_club, father_name, mother_name, breeder_name, breeder_contact, birth_certificate, pedigree_document, certifications: certifications || [], notes },
      update: { registration_number, kennel_club, father_name, mother_name, breeder_name, breeder_contact, birth_certificate, pedigree_document, certifications: certifications || [], notes },
    })
    return pedigree
  })

  // POST travel document
  app.post('/travel/:petId', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const { petId } = req.params as any
    const pet = await prisma.pet.findUnique({ where: { id: petId } })
    if (!pet || pet.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })

    const { travel_type, origin_city, destination_city, destination_country, departure_date, return_date, carrier, booking_ref, document_url, notes } = req.body as any
    if (!travel_type || !destination_city || !departure_date) return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })

    const doc = await prisma.petTravelDocument.create({
      data: { pet_id: petId, owner_email: email, travel_type, origin_city, destination_city, destination_country, departure_date, return_date, carrier, booking_ref, document_url, notes }
    })
    return reply.code(201).send(doc)
  })

  // DELETE travel document
  app.delete('/travel/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const doc = await prisma.petTravelDocument.findUnique({ where: { id: req.params.id } })
    if (!doc) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    if (doc.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.petTravelDocument.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })

  // POST vaccination
  app.post('/vaccination/:petId', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const { petId } = req.params as any
    const pet = await prisma.pet.findUnique({ where: { id: petId } })
    if (!pet || pet.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })

    const { vaccine_name, vaccine_type, date_administered, next_due_date, vet_name } = req.body as any
    if (!vaccine_name || !date_administered) return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })

    const vac = await prisma.vaccination.create({
      data: { pet_id: petId, owner_email: email, vaccine_name, vaccine_type: vaccine_type || 'other', date_administered, next_due_date, vet_name }
    })
    return reply.code(201).send(vac)
  })

  // POST health record
  app.post('/health/:petId', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const { petId } = req.params as any
    const pet = await prisma.pet.findUnique({ where: { id: petId } })
    if (!pet || pet.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })

    const { record_type, title, description, date, vet_name, clinic_name, cost, next_appointment } = req.body as any
    if (!title || !date) return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })

    const record = await prisma.healthRecord.create({
      data: { pet_id: petId, owner_email: email, record_type: record_type || 'examination', title, description: description || '', date, vet_name, clinic_name, cost, next_appointment, attachments: [] }
    })
    return reply.code(201).send(record)
  })
}

export default routes
