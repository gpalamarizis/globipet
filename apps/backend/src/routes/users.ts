import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const usersRoutes: FastifyPluginAsync = async (app) => {
  app.get('/me', { preHandler: [(app as any).authenticate] }, async (req) => {
    const { email } = req.user as any
    const user = await prisma.user.findUnique({ where: { email } })
    const { password_hash: _, ...safe } = user as any
    return safe
  })

  app.put('/me', { preHandler: [(app as any).authenticate] }, async (req) => {
    const { email } = req.user as any
    const { full_name, bio, phone, city, country, website } = req.body as any
    const user = await prisma.user.update({ where: { email }, data: { full_name, bio, phone, city, country, website } })
    const { password_hash: _, ...safe } = user as any
    return safe
  })
}
export default usersRoutes
