import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const routes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({ data: [], total: 0 }))
  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any) => ({ success: true }))
  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any) => ({ success: true }))
  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any) => ({ success: true }))
}
export default routes
