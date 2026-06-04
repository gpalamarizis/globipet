import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const bookingsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const { tab = 'upcoming' } = req.query
    const now = new Date().toISOString().split('T')[0]
    const where: any = { customer_email: email }
    if (tab === 'upcoming') where.booking_date = { gte: now }
    else if (tab === 'past') where.booking_date = { lt: now }
    const data = await prisma.booking.findMany({ where, orderBy: { booking_date: 'asc' } })
    return { data, total: data.length }
  })

  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email, full_name } = req.user as any
    return prisma.booking.create({ data: { ...req.body, customer_email: email, customer_name: full_name } })
  })

  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    return prisma.booking.update({ where: { id: req.params.id }, data: req.body })
  })
}
export default bookingsRoutes
