import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

/**
 * Public catalog endpoints — reads from DB now.
 * Mounted at /api/catalog
 */
const catalogRoutes: FastifyPluginAsync = async (app) => {

  // Public: get templates for a category
  app.get('/preset/:category', async (req: any, reply) => {
    const cat = req.params.category
    const templates = await prisma.catalogTemplate.findMany({
      where: { category: cat, is_active: true },
      orderBy: [{ display_order: 'asc' }, { group: 'asc' }]
    })
    // Return shape compatible with existing frontend: include price=0
    const data = templates.map(t => ({
      id: t.id,
      group: t.group,
      name: t.name,
      description: t.description,
      size: t.size,
      pet_type: t.pet_type,
      breed_group: t.breed_group,
      modality: t.modality,
      price: 0,
      duration_minutes: t.suggested_duration_minutes,
      is_addon: t.is_addon,
    }))
    return { data }
  })

  // Public: list distinct categories that have templates
  app.get('/categories', async () => {
    const rows = await prisma.catalogTemplate.groupBy({
      by: ['category'],
      _count: { _all: true },
      where: { is_active: true }
    })
    return {
      data: rows.map(r => ({ key: r.category, count: r._count._all }))
    }
  })
}

export default catalogRoutes
