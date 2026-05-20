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
    const translated = translateRecords(data, lang, ['name', 'description'])
    return { data: translated, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) }
  })

  app.get('/:id', async (req: any) => {
    const lang = getRequestLang(req)
    const breed = await prisma.breed.findUniqueOrThrow({ where: { id: req.params.id } })
    return translateRecord(breed, lang, ['name', 'description'])
  })

  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    return prisma.breed.create({ data: req.body })
  })

  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    return prisma.breed.update({ where: { id: req.params.id }, data: req.body })
  })

  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    await prisma.breed.delete({ where: { id: req.params.id } }); return { success: true }
  })
}
export default breedsRoutes
