import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const routes: FastifyPluginAsync = async (app) => {

  // GET my pets
  app.get('/my', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const data = await prisma.pet.findMany({
      where: { owner_email: email },
      orderBy: { created_at: 'desc' },
    })
    return { data }
  })

  // GET single pet
  app.get('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const pet = await prisma.pet.findUnique({ where: { id: req.params.id } })
    if (!pet) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    if (pet.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    return pet
  })

  // POST create pet
  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const { name, species, breed, age, weight, gender, color, microchip_number } = req.body as any

    if (!name || !species) {
      return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία (name, species)' })
    }

    const pet = await prisma.pet.create({
      data: {
        owner_email: email,
        name,
        species,
        breed: breed || null,
        age: age ? parseFloat(age) : null,
        weight: weight ? parseFloat(weight) : null,
        gender: gender || null,
        color: color || null,
        microchip_number: microchip_number || null,
      }
    })
    return reply.code(201).send({ data: pet })
  })

  // PATCH update pet
  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const existing = await prisma.pet.findUnique({ where: { id: req.params.id } })
    if (!existing) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    if (existing.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })

    const { name, species, breed, age, weight, gender, color, microchip_number, is_lost, last_seen_location } = req.body as any
    const data: any = {}
    if (name !== undefined) data.name = name
    if (species !== undefined) data.species = species
    if (breed !== undefined) data.breed = breed
    if (age !== undefined) data.age = age ? parseFloat(age) : null
    if (weight !== undefined) data.weight = weight ? parseFloat(weight) : null
    if (gender !== undefined) data.gender = gender
    if (color !== undefined) data.color = color
    if (microchip_number !== undefined) data.microchip_number = microchip_number
    if (is_lost !== undefined) data.is_lost = !!is_lost
    if (last_seen_location !== undefined) data.last_seen_location = last_seen_location

    const pet = await prisma.pet.update({ where: { id: req.params.id }, data })
    return { data: pet }
  })

  // DELETE pet
  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const existing = await prisma.pet.findUnique({ where: { id: req.params.id } })
    if (!existing) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    if (existing.owner_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.pet.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })
}

export default routes
