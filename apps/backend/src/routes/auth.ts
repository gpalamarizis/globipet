import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'

const authRoutes: FastifyPluginAsync = async (app) => {
  // Register
  app.post('/register', async (req, reply) => {
    const { full_name, email, password, role } = req.body as any
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return reply.code(409).send({ message: 'Email ήδη χρησιμοποιείται' })
    const password_hash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({ data: { full_name, email, password_hash, role: role || 'user' } })
    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role }, { expiresIn: '7d' })
    const { password_hash: _, ...userSafe } = user as any
    return { user: userSafe, token }
  })

  // Login
  app.post('/login', async (req, reply) => {
    const { email, password } = req.body as any
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.password_hash) return reply.code(401).send({ message: 'Λανθασμένα στοιχεία' })
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return reply.code(401).send({ message: 'Λανθασμένα στοιχεία' })
    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role }, { expiresIn: '7d' })
    const { password_hash: _, ...userSafe } = user as any
    return { user: userSafe, token }
  })

  // Me
  app.get('/me', { preHandler: [(app as any).authenticate] }, async (req) => {
    const { email } = (req.user as any)
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return null
    const { password_hash: _, ...userSafe } = user as any
    return userSafe
  })

  // Refresh token
  app.post('/refresh', { preHandler: [(app as any).authenticate] }, async (req) => {
    const { id, email, role } = req.user as any
    const token = app.jwt.sign({ id, email, role }, { expiresIn: '7d' })
    return { token }
  })

  // Google OAuth callback (simplified)
  app.get('/google/callback', async (req, reply) => {
    reply.redirect(process.env.APP_URL || 'http://localhost:3000')
  })
}

export default authRoutes
