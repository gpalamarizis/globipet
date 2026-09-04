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

  /**
   * Edit a topic.
   *
   * The previous version passed `req.body` straight into the update, so an
   * author could set `is_pinned: true` to park their thread at the top of the
   * category permanently, inflate `views_count`, or rewrite `author_email` to
   * put the post in someone else's name.
   */
  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const user = req.user as any
    const topic = await prisma.forumTopic.findUnique({ where: { id: req.params.id } })
    if (!topic) return reply.code(404).send({ message: 'Δεν βρέθηκε' })

    const isAuthor = topic.author_email === user.email
    const isAdmin = user.role === 'admin'
    if (!isAuthor && !isAdmin) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })

    const body = (req.body ?? {}) as any
    const data: any = {}
    if (body.title !== undefined) data.title = String(body.title).slice(0, 300)
    if (body.content !== undefined) data.content = String(body.content)
    if (body.category !== undefined) data.category = body.category
    if (body.tags !== undefined) data.tags = Array.isArray(body.tags) ? body.tags : []
    // The author marks their own question answered.
    if (body.is_solved !== undefined) data.is_solved = !!body.is_solved
    // Pinning is a moderation action.
    if (body.is_pinned !== undefined && isAdmin) data.is_pinned = !!body.is_pinned

    if (Object.keys(data).length === 0) {
      return reply.code(400).send({ message: 'Καμία έγκυρη αλλαγή' })
    }
    return prisma.forumTopic.update({ where: { id: topic.id }, data })
  })

  // Delete — author or admin, so moderation is possible from the admin panel.
  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const user = req.user as any
    const topic = await prisma.forumTopic.findUnique({ where: { id: req.params.id } })
    if (!topic) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    if (topic.author_email !== user.email && user.role !== 'admin') {
      return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    }
    await prisma.forumTopic.delete({ where: { id: topic.id } })
    return reply.code(204).send()
  })
}

export default routes
