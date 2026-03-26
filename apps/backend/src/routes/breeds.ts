import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const routes: FastifyPluginAsync = async (app) => {
  app.get('/', async (req: any) => {
    const { page = 1, limit = 20 } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    return { data: [], total: 0, page: Number(page), totalPages: 0 }
  })
  app.get('/:id', async (req: any) => ({ id: req.params.id }))
  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any) => ({ success: true }))
  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any) => ({ success: true }))
  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any) => ({ success: true }))
}
export default routes
