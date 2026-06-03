import type { FastifyPluginAsync } from 'fastify'
import prisma from './prisma.js'

export function createCrudRoutes(modelName: string, publicList = false): FastifyPluginAsync {
  return async (app) => {
    const model = (prisma as any)[modelName]

    // List
    app.get('/', { preHandler: publicList ? [] : [(app as any).authenticate] }, async (req: any) => {
      const { page = 1, limit = 20, ...filters } = req.query
      const skip = (Number(page) - 1) * Number(limit)
      const [data, total] = await Promise.all([
        model.findMany({ skip, take: Number(limit), orderBy: { created_at: 'desc' } }),
        model.count()
      ])
      return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) }
    })

    // Get by ID
    app.get('/:id', async (req: any) => {
      return model.findUniqueOrThrow({ where: { id: req.params.id } })
    })

    // Create
    app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
      return model.create({ data: req.body })
    })

    // Update
    app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any) => {
      return model.update({ where: { id: req.params.id }, data: req.body })
    })

    // Delete
    app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any) => {
      await model.delete({ where: { id: req.params.id } })
      return { success: true }
    })
  }
}
