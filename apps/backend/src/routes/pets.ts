import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const routes: FastifyPluginAsync = async (app) => {

  /**
   * Load a pet and verify the caller may see or change it.
   * Owners get their own pets; admins get everything, so support and
   * moderation are possible from the admin panel without impersonation.
   */
  async function assertCanAccess(req: any, reply: any, id: string) {
    const pet = await prisma.pet.findUnique({ where: { id } })
    if (!pet) {
      reply.code(404).send({ message: 'Δεν βρέθηκε' })
      return null
    }
    const user = req.user as any
    if (pet.owner_email !== user.email && user.role !== 'admin') {
      reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
      return null
    }
    return pet
  }

  // Τα κατοικίδια του συνδεδεμένου χρήστη.
  //
  // Ταυτόσημο με το /my. Υπάρχει επειδή το frontend καλεί /pets σε τέσσερα
  // σημεία — αρχική, προφίλ, widget. Χωρίς αυτό επέστρεφαν 404 και οι
  // λίστες έμεναν μονίμως κενές.
  app.get('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const data = await prisma.pet.findMany({
      where: { owner_email: email },
      orderBy: { created_at: 'desc' },
    })
    return { data }
  })

  app.get('/my', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const data = await prisma.pet.findMany({
      where: { owner_email: email },
      orderBy: { created_at: 'desc' },
    })
    return { data }
  })

  app.get('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const pet = await assertCanAccess(req, reply, req.params.id)
    if (!pet) return
    return pet
  })

  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const { name, species, breed, age, weight, gender, color, microchip_number, image_url, is_sterilized, sterilized_date } = req.body as any
    if (!name || !species) return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })
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
        image_url: image_url || null,
        // Three states: true, false, and null for "nobody has said". Coercing
        // an absent value to false would print a false claim on the passport.
        is_sterilized: typeof is_sterilized === 'boolean' ? is_sterilized : null,
        sterilized_date: sterilized_date || null,
      }
    })
    return reply.code(201).send({ data: pet })
  })

  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const existing = await assertCanAccess(req, reply, req.params.id)
    if (!existing) return
    const { name, species, breed, age, weight, gender, color, microchip_number, image_url, is_lost, last_seen_location, is_sterilized, sterilized_date } = req.body as any
    const data: any = {}
    if (name !== undefined) data.name = name
    if (species !== undefined) data.species = species
    if (breed !== undefined) data.breed = breed
    if (age !== undefined) data.age = age ? parseFloat(age) : null
    if (weight !== undefined) data.weight = weight ? parseFloat(weight) : null
    if (gender !== undefined) data.gender = gender
    if (color !== undefined) data.color = color
    if (microchip_number !== undefined) data.microchip_number = microchip_number
    if (image_url !== undefined) data.image_url = image_url
    if (is_lost !== undefined) data.is_lost = !!is_lost
    if (last_seen_location !== undefined) data.last_seen_location = last_seen_location
    if (is_sterilized !== undefined) {
      data.is_sterilized = typeof is_sterilized === 'boolean' ? is_sterilized : null
    }
    if (sterilized_date !== undefined) data.sterilized_date = sterilized_date || null
    const pet = await prisma.pet.update({ where: { id: existing.id }, data })
    return { data: pet }
  })

  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const existing = await assertCanAccess(req, reply, req.params.id)
    if (!existing) return
    await prisma.pet.delete({ where: { id: existing.id } })
    return reply.code(204).send()
  })
}

export default routes
