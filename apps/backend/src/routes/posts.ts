import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const postsRoutes: FastifyPluginAsync = async (app) => {

  /**
   * Load a post and verify the caller may modify it.
   * The author can edit and delete their own posts; an admin can do both on
   * any post, which is what makes moderation possible from the admin panel.
   */
  async function assertCanModify(req: any, reply: any, id: string) {
    const post = await prisma.post.findUnique({ where: { id } })
    if (!post) {
      reply.code(404).send({ message: 'Δεν βρέθηκε' })
      return null
    }
    const user = req.user as any
    if (post.author_email !== user.email && user.role !== 'admin') {
      reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
      return null
    }
    return post
  }

  // GET posts
  //
  // `?filter=` selects the ordering. The feed has been sending this parameter
  // since it was written, but nothing read it — so the "trending" tab
  // returned the same newest-first list as "all", and switching tabs changed
  // nothing on screen.
  //
  // When the caller is authenticated we also return `liked_by_me` per post so
  // the feed can render the heart in the right state without a second request.
  app.get('/', async (req: any) => {
    const { limit = 20, page = 1, filter = 'all' } = req.query
    const take = Math.min(Math.max(parseInt(limit) || 20, 1), 100)
    const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take

    // Trending looks at engagement over the past week, so a post from last
    // year with a thousand likes does not sit at the top forever.
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const where = filter === 'trending' ? { created_at: { gte: weekAgo } } : {}
    const orderBy: any = filter === 'trending'
      ? [{ likes_count: 'desc' }, { comments_count: 'desc' }, { created_at: 'desc' }]
      : { created_at: 'desc' }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({ where, orderBy, take, skip }),
      prisma.post.count({ where }),
    ])

    // Try to identify the caller. This route is public, so a missing or
    // invalid token simply means we skip the liked_by_me enrichment.
    let email: string | null = null
    try {
      await req.jwtVerify()
      email = (req.user as any)?.email ?? null
    } catch {
      /* anonymous visitor */
    }

    if (!email || posts.length === 0) {
      return { data: posts.map(p => ({ ...p, liked_by_me: false })), total }
    }

    const likes = await prisma.postLike.findMany({
      where: { user_email: email, post_id: { in: posts.map(p => p.id) } },
      select: { post_id: true },
    })
    const likedIds = new Set(likes.map(l => l.post_id))
    return {
      data: posts.map(p => ({ ...p, liked_by_me: likedIds.has(p.id) })),
      total,
    }
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

    // A post may reference a pet, but only one the author actually owns —
    // otherwise anyone could attach their post to someone else's pet profile.
    if (pet_id) {
      const pet = await prisma.pet.findUnique({ where: { id: pet_id }, select: { owner_email: true } })
      if (!pet || pet.owner_email !== email) {
        return reply.code(403).send({ message: 'Το κατοικίδιο δεν σου ανήκει' })
      }
    }

    const post = await prisma.post.create({
      data: {
        author_email: email,
        author_name: full_name || email.split('@')[0],
        author_photo: profile_photo || null,
        content: content.trim(),
        image_url: image_url || null,
        tags: Array.isArray(tags) ? tags : [],
        pet_name: pet_name || null,
        pet_id: pet_id || null,
      }
    })
    return reply.code(201).send(post)
  })

  // POST like — idempotent
  //
  // Previously this incremented likes_count on every call, so holding the
  // button inflated the number without limit. Now a like is a row keyed by
  // (post_id, user_email); a repeat call is a no-op and returns the current state.
  app.post('/:id/like', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const postId = req.params.id

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } })
    if (!post) return reply.code(404).send({ message: 'Δεν βρέθηκε' })

    const existing = await prisma.postLike.findUnique({
      where: { post_id_user_email: { post_id: postId, user_email: email } },
    })
    if (existing) {
      const fresh = await prisma.post.findUnique({ where: { id: postId }, select: { likes_count: true } })
      return { liked: true, likes_count: fresh?.likes_count ?? 0 }
    }

    // Create the like and bump the denormalised counter together, so the two
    // can never drift apart if one of the writes fails.
    const [, updated] = await prisma.$transaction([
      prisma.postLike.create({ data: { post_id: postId, user_email: email } }),
      prisma.post.update({
        where: { id: postId },
        data: { likes_count: { increment: 1 } },
        select: { likes_count: true },
      }),
    ])
    return { liked: true, likes_count: updated.likes_count }
  })

  // DELETE like — un-like
  app.delete('/:id/like', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const postId = req.params.id

    const existing = await prisma.postLike.findUnique({
      where: { post_id_user_email: { post_id: postId, user_email: email } },
    })
    if (!existing) {
      const fresh = await prisma.post.findUnique({ where: { id: postId }, select: { likes_count: true } })
      return { liked: false, likes_count: fresh?.likes_count ?? 0 }
    }

    const [, updated] = await prisma.$transaction([
      prisma.postLike.delete({ where: { id: existing.id } }),
      prisma.post.update({
        where: { id: postId },
        // Guard against the counter going negative if it was ever out of sync.
        data: { likes_count: { decrement: 1 } },
        select: { likes_count: true },
      }),
    ])
    const likes_count = Math.max(0, updated.likes_count)
    if (updated.likes_count < 0) {
      await prisma.post.update({ where: { id: postId }, data: { likes_count: 0 } })
    }
    return { liked: false, likes_count }
  })

  // PATCH update post — author or admin
  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const post = await assertCanModify(req, reply, req.params.id)
    if (!post) return
    const { content, image_url, tags } = req.body as any
    const data: any = {}
    if (content !== undefined) data.content = String(content).trim()
    if (image_url !== undefined) data.image_url = image_url || null
    if (tags !== undefined) data.tags = Array.isArray(tags) ? tags : []
    return prisma.post.update({ where: { id: post.id }, data })
  })

  // DELETE post — author or admin (moderation)
  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const post = await assertCanModify(req, reply, req.params.id)
    if (!post) return
    // post_likes rows cascade via the foreign key.
    await prisma.post.delete({ where: { id: post.id } })
    return reply.code(204).send()
  })
}

export default postsRoutes
