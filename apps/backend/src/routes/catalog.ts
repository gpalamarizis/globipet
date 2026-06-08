import type { FastifyPluginAsync } from 'fastify'
import { CATALOG_PRESETS, type CategoryKey } from '../lib/catalog-presets.js'

/**
 * Public catalog endpoints. Mounted at /api/catalog
 */
const catalogRoutes: FastifyPluginAsync = async (app) => {

  // Get preset packages for a category
  app.get('/preset/:category', async (req: any, reply) => {
    const cat = req.params.category as CategoryKey
    const preset = CATALOG_PRESETS[cat]
    if (!preset) {
      return reply.code(404).send({ message: 'Άγνωστη κατηγορία' })
    }
    return { data: preset }
  })

  // List all categories
  app.get('/categories', async () => {
    return {
      data: Object.keys(CATALOG_PRESETS).map(key => ({
        key,
        count: CATALOG_PRESETS[key as CategoryKey].length
      }))
    }
  })
}

export default catalogRoutes
