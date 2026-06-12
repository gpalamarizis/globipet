import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const postsRoutes: FastifyPluginAsync = async (app) => {

  // GET posts
  app.get('/', async (req: any) => {
    const { limit = 20, page = 1 } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    const posts = await prisma.post.findMany({
      orderBy: { created_at: 'desc' },
      take: Number(limit),
      skip,
    })
    return { data: posts, total: posts.length }
  })

  // GET single post
  app.get('/:id', async (req: any, reply) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } })
    if (!post) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    return post
  })

  // POST create post
  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email, full_name, profile_photo } = req.user as any
    const { content, image_url, tags, pet_name, pet_id } = req.body as any
    if (!content?.trim()) return reply.code(400).send({ message: 'Το περιεχόμενο είναι υποχρεωτικό' })

    const post = await prisma.post.create({
      data: {
        author_email: email,
        author_name: full_name || email.split('@')[0],
        author_photo: profile_photo || null,
        content: content.trim(),
        image_url: image_url || null,
        tags: tags || [],
        pet_name: pet_name || null,
        pet_id: pet_id || null,
      }
    })
    return reply.code(201).send(post)
  })

  // POST like
  app.post('/:id/like', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } })
    if (!post) return { liked: false }
    await prisma.post.update({
      where: { id: req.params.id },
      data: { likes_count: { increment: 1 } }
    })
    return { liked: true }
  })

  // PATCH update post
  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const post = await prisma.post.findUnique({ where: { id: req.params.id } })
    if (!post) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    if (post.author_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    const { content, image_url, tags } = req.body as any
    return prisma.post.update({
      where: { id: req.params.id },
      data: { content, image_url, tags }
    })
  })

  // DELETE post
  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const post = await prisma.post.findUnique({ where: { id: req.params.id } })
    if (!post) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    if (post.author_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.post.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })
}

export default postsRoutes
