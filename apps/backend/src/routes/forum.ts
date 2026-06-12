import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const routes: FastifyPluginAsync = async (app) => {

  app.get('/', async (req: any) => {
    const { page = 1, limit = 20, category, q } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    const where: any = {}
    if (category) where.category = category
    if (q) where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { content: { contains: q, mode: 'insensitive' } }]
    const [data, total] = await Promise.all([
      prisma.forumTopic.findMany({ where, skip, take: Number(limit), orderBy: [{ is_pinned: 'desc' }, { created_at: 'desc' }] }),
      prisma.forumTopic.count({ where })
    ])
    return { data, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) }
  })

  app.get('/:id', async (req: any, reply) => {
    const topic = await prisma.forumTopic.findUnique({ where: { id: req.params.id } })
    if (!topic) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    await prisma.forumTopic.update({ where: { id: req.params.id }, data: { views_count: { increment: 1 } } })
    return topic
  })

  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email, full_name } = req.user as any
    const { title, content, category, tags } = req.body as any
    if (!title || !content || !category) return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })
    const topic = await prisma.forumTopic.create({
      data: { author_email: email, author_name: full_name || email.split('@')[0], title, content, category, tags: tags || [] }
    })
    return reply.code(201).send(topic)
  })

  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const topic = await prisma.forumTopic.findUnique({ where: { id: req.params.id } })
    if (!topic || topic.author_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    return prisma.forumTopic.update({ where: { id: req.params.id }, data: req.body })
  })

  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const topic = await prisma.forumTopic.findUnique({ where: { id: req.params.id } })
    if (!topic || topic.author_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.forumTopic.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })
}

export default routes
