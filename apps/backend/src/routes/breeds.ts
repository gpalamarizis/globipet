import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { getRequestLang, translateRecord, translateRecords } from '../lib/i18n.js'

const breedsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (req: any) => {
    const lang = getRequestLang(req)
    const { q, species, size, page = 1, limit = 20 } = req.query
    const where: any = {}
    if (q) where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { name_el: { contains: q, mode: 'insensitive' } }]
    if (species) where.species = species
    if (size) where.size = size
    const skip = (Number(page) - 1) * Number(limit)
    const [data, total] = await Promise.all([
      prisma.breed.findMany({ where, skip, take: Number(limit), orderBy: { popularity: 'desc' } }),
      prisma.breed.count({ where })
    ])
    const translated = await translateRecords('breed', data, lang)
    return { data: translated, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) }
  })

  app.get('/:id', async (req: any) => {
    const lang = getRequestLang(req)
    const breed = await prisma.breed.findUniqueOrThrow({ where: { id: req.params.id } })
    return translateRecord('breed', breed, lang)
  })

  /**
   * Breeds are platform reference content, like the service catalog — not
   * something a customer owns.
   *
   * These three routes only checked for a valid token, so any registered user
   * could rewrite the description of a breed or delete it outright, and the
   * unfiltered req.body let them set popularity or any other column.
   */
  const isAdmin = async (req: any, reply: any) => {
    if ((req.user as any)?.role !== 'admin') {
      return reply.code(403).send({ message: 'Απαιτούνται δικαιώματα διαχειριστή' })
    }
  }

  /** Only columns that exist on Breed, coerced to the right shape. */
  function pickBreedFields(body: any) {
    const data: any = {}
    const text = ['name', 'name_el', 'species', 'fci_number', 'description', 'origin', 'size', 'image_url']
    for (const f of text) if (body[f] !== undefined) data[f] = body[f]

    const numbers = ['weight_min', 'weight_max']
    for (const f of numbers) {
      if (body[f] === undefined) continue
      const v = parseFloat(body[f])
      data[f] = Number.isFinite(v) && v >= 0 ? v : null
    }

    const ints = ['lifespan_min', 'lifespan_max', 'popularity']
    for (const f of ints) {
      if (body[f] === undefined) continue
      const v = parseInt(body[f])
      data[f] = Number.isFinite(v) ? v : null
    }

    // Ratings are shown as bars out of five; anything else would render off
    // the end of the scale.
    const ratings = ['grooming_needs', 'exercise_needs', 'trainability']
    for (const f of ratings) {
      if (body[f] === undefined) continue
      const v = parseInt(body[f])
      data[f] = Number.isFinite(v) ? Math.min(Math.max(v, 1), 5) : 3
    }

    const lists = ['temperament', 'health_issues', 'pros', 'cons']
    for (const f of lists) {
      if (body[f] === undefined) continue
      data[f] = Array.isArray(body[f])
        ? body[f]
        : String(body[f]).split(',').map((x: string) => x.trim()).filter(Boolean)
    }

    const flags = ['good_with_children', 'good_with_pets', 'apartment_friendly']
    for (const f of flags) if (body[f] !== undefined) data[f] = !!body[f]

    return data
  }

  app.post('/', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    const data = pickBreedFields(req.body ?? {})
    if (!data.name || !data.species || !data.size) {
      return reply.code(400).send({ message: 'Απαιτούνται name, species και size' })
    }
    if (data.description === undefined) data.description = ''
    return prisma.breed.create({ data })
  })

  app.patch('/:id', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    const data = pickBreedFields(req.body ?? {})
    if (Object.keys(data).length === 0) {
      return reply.code(400).send({ message: 'Καμία έγκυρη αλλαγή' })
    }
    return prisma.breed.update({ where: { id: req.params.id }, data })
  })

  app.delete('/:id', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any) => {
    await prisma.breed.delete({ where: { id: req.params.id } }); return { success: true }
  })
}
export default breedsRoutes
