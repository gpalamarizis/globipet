import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

const routes: FastifyPluginAsync = async (app) => {

  // Community = Posts με filter
  // Δημόσιο: χωρίς author_email (κατάλογος διευθύνσεων για όποιον έκανε GET)·
  // το «δικό μου;» ως is_mine από το JWT, αν υπάρχει. Ανώτατο όριο σελίδας.
  app.get('/', async (req: any) => {
    const { limit = 20, page = 1 } = req.query
    const take = Math.min(Math.max(1, Number(limit) || 20), 100)
    const skip = (Math.max(1, Number(page) || 1) - 1) * take
    const data = await prisma.post.findMany({
      orderBy: { likes_count: 'desc' },
      take,
      skip,
    })
    let viewer: string | null = null
    if (req.headers?.authorization) {
      try { await req.jwtVerify(); viewer = (req.user as any)?.email ?? null } catch { viewer = null }
    }
    const out = data.map(({ author_email, ...p }) => ({ ...p, is_mine: !!viewer && author_email === viewer }))
    return { data: out, total: out.length }
  })
}

export default routes
