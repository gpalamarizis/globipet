import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { blockedEmailsFor, withoutBlocked } from '../lib/blocks.js'
import { identityOf } from '../lib/userName.js'

/**
 * Δημόσια προβολή. Οι λίστες και τα νήματα είναι ανοιχτά σε όλους, και
 * επέστρεφαν το author_email κάθε συντάκτη — κατάλογος διευθύνσεων για
 * όποιον έκανε ένα GET. Το email φεύγει· το «είναι δικό μου;» (κουμπιά
 * επεξεργασίας/διαγραφής) υπολογίζεται εδώ από το JWT, αν υπάρχει, ως is_mine.
 */
async function viewerEmail(req: any): Promise<string | null> {
  if (!req.headers?.authorization) return null
  try { await req.jwtVerify(); return (req.user as any)?.email ?? null } catch { return null }
}
function publicRow<T extends { author_email?: string | null }>(row: T, viewer: string | null) {
  const { author_email, ...rest } = row
  return { ...rest, is_mine: !!viewer && author_email === viewer }
}

const routes: FastifyPluginAsync = async (app) => {

  app.get('/', async (req: any) => {
    const { page = 1, limit = 20, category, q } = req.query
    // Ανώτατο όριο: ?limit=1000000 φόρτωνε ολόκληρο τον πίνακα σε μία κλήση.
    const take = Math.min(Math.max(1, Number(limit) || 20), 100)
    const pageNo = Math.max(1, Number(page) || 1)
    const skip = (pageNo - 1) * take
    const where: any = {}
    // Ε16: παλιά θέματα από το κινητό αποθηκεύτηκαν ως «behaviour» — ίδια κατηγορία με «behavior».
    if (category) where.category = category === 'behavior' ? { in: ['behavior', 'behaviour'] } : category
    if (q) where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { content: { contains: q, mode: 'insensitive' } }]
    // App Store 1.2: χωρίς θέματα αποκλεισμένων χρηστών.
    const blockedAuthors = await blockedEmailsFor(await viewerEmail(req))
    if (blockedAuthors.length) where.author_email = { notIn: blockedAuthors }
    const [data, total] = await Promise.all([
      prisma.forumTopic.findMany({ where, skip, take, orderBy: [{ is_pinned: 'desc' }, { created_at: 'desc' }, { id: 'asc' }] }),
      prisma.forumTopic.count({ where })
    ])
    const viewer = await viewerEmail(req)
    return { data: data.map(t => publicRow(t, viewer)), total, page: pageNo, totalPages: Math.ceil(total / take) }
  })

  app.get('/:id', async (req: any, reply) => {
    const topic = await prisma.forumTopic.findUnique({
      where: { id: req.params.id },
      include: {
        // The answer floats to the top; the rest read in order.
        replies: { orderBy: [{ is_answer: 'desc' }, { created_at: 'asc' }] },
      },
    })
    if (!topic) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    await prisma.forumTopic.update({ where: { id: req.params.id }, data: { views_count: { increment: 1 } } })
    const viewer = await viewerEmail(req)
    const { replies, ...rest } = topic
    const blockedAuthors = await blockedEmailsFor(viewer)
    return { ...publicRow(rest, viewer), replies: withoutBlocked(replies, blockedAuthors).map(r => publicRow(r, viewer)) }
  })

  // ─── Replies ───────────────────────────────────────────────────────
  //
  // forum_topics.replies_count existed from the start, but there was no table
  // holding replies and nothing wrote to the counter — so every thread showed
  // zero and the forum was an announcement board rather than a discussion.

  app.get('/:id/replies', async (req: any) => {
    const data = await prisma.forumReply.findMany({
      where: { topic_id: req.params.id },
      orderBy: [{ is_answer: 'desc' }, { created_at: 'asc' }],
      take: 200,
    })
    const viewer = await viewerEmail(req)
    const blockedAuthors = await blockedEmailsFor(viewer)
    return { data: withoutBlocked(data, blockedAuthors).map(r => publicRow(r, viewer)) }
  })

  app.post('/:id/replies', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const { content } = req.body as any
    if (!content?.trim()) return reply.code(400).send({ message: 'Το περιεχόμενο είναι υποχρεωτικό' })

    const topic = await prisma.forumTopic.findUnique({ where: { id: req.params.id }, select: { id: true } })
    if (!topic) return reply.code(404).send({ message: 'Το θέμα δεν βρέθηκε' })
    // Το JWT δεν έχει όνομα/φωτογραφία: από τη βάση (lib/userName).
    const author = await identityOf(email)

    // Create the reply and bump the counter together, so the two cannot drift
    // apart if one write fails.
    const [created] = await prisma.$transaction([
      prisma.forumReply.create({
        data: {
          topic_id: topic.id,
          author_email: email,
          author_name: author.name,
          author_photo: author.photo,
          content: String(content).trim().slice(0, 10000),
        },
      }),
      prisma.forumTopic.update({
        where: { id: topic.id },
        data: { replies_count: { increment: 1 } },
      }),
    ])
    // Η απάντηση πάει μόνο στον συντάκτη της: το email του είναι δικό του.
    return reply.code(201).send({ data: { ...created, is_mine: true } })
  })

  app.patch('/replies/:replyId', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const user = req.user as any
    const existing = await prisma.forumReply.findUnique({ where: { id: req.params.replyId } })
    if (!existing) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    if (existing.author_email !== user.email && user.role !== 'admin') {
      return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    }
    const { content } = req.body as any
    if (!String(content ?? '').trim()) return reply.code(400).send({ message: 'Κενό περιεχόμενο' })
    const updated = await prisma.forumReply.update({
      where: { id: existing.id },
      data: { content: String(content).trim().slice(0, 10000) },
    })
    return { data: { ...updated, is_mine: existing.author_email === user.email } }
  })

  /**
   * Mark a reply as the accepted answer. Only the person who asked decides
   * this — an admin can too, for tidying up abandoned threads.
   */
  app.post('/replies/:replyId/answer', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const user = req.user as any
    const existing = await prisma.forumReply.findUnique({
      where: { id: req.params.replyId },
      include: { topic: { select: { id: true, author_email: true } } },
    })
    if (!existing) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    if (existing.topic.author_email !== user.email && user.role !== 'admin') {
      return reply.code(403).send({ message: 'Μόνο ο δημιουργός του θέματος μπορεί να το κάνει' })
    }

    // A unique partial index allows one accepted answer per topic, so clear
    // any previous one first.
    await prisma.$transaction([
      prisma.forumReply.updateMany({
        where: { topic_id: existing.topic.id, is_answer: true },
        data: { is_answer: false },
      }),
      prisma.forumReply.update({ where: { id: existing.id }, data: { is_answer: true } }),
      prisma.forumTopic.update({ where: { id: existing.topic.id }, data: { is_solved: true } }),
    ])
    return { success: true }
  })

  app.delete('/replies/:replyId', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const user = req.user as any
    const existing = await prisma.forumReply.findUnique({ where: { id: req.params.replyId } })
    if (!existing) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    if (existing.author_email !== user.email && user.role !== 'admin') {
      return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    }
    await prisma.$transaction([
      prisma.forumReply.delete({ where: { id: existing.id } }),
      prisma.forumTopic.update({
        where: { id: existing.topic_id },
        data: { replies_count: { decrement: 1 } },
      }),
    ])
    // Guard against a counter that was already out of step.
    await prisma.forumTopic.updateMany({
      where: { id: existing.topic_id, replies_count: { lt: 0 } },
      data: { replies_count: 0 },
    })
    return reply.code(204).send()
  })

  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const { title, content, category, tags } = req.body as any
    if (!String(title ?? '').trim() || !String(content ?? '').trim() || !category) return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })
    // Το JWT δεν έχει όνομα: από τη βάση (lib/userName).
    const author = await identityOf(email)
    const topic = await prisma.forumTopic.create({
      data: { author_email: email, author_name: author.name, title, content, category, tags: tags || [] }
    })
    return reply.code(201).send({ ...topic, is_mine: true })
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
    // Κενός τίτλος/περιεχόμενο θα άφηνε θέμα χωρίς τίτλο ή σώμα (το POST τα απαιτεί).
    if (body.title !== undefined && !String(body.title ?? '').trim()) {
      return reply.code(400).send({ message: 'Ο τίτλος είναι υποχρεωτικός' })
    }
    if (body.content !== undefined && !String(body.content ?? '').trim()) {
      return reply.code(400).send({ message: 'Το περιεχόμενο είναι υποχρεωτικό' })
    }
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
    const updated = await prisma.forumTopic.update({ where: { id: topic.id }, data })
    return { ...updated, is_mine: isAuthor }
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
