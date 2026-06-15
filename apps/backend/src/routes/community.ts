import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const routes: FastifyPluginAsync = async (app) => {

  // Community = Posts με filter
  app.get('/', async (req: any) => {
    const { limit = 20, page = 1 } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    const data = await prisma.post.findMany({
      orderBy: { likes_count: 'desc' },
      take: Number(limit),
      skip,
    })
    return { data, total: data.length }
  })
}

export default routes
