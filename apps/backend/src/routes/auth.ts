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

  // Google OAuth - redirect to Google
  app.get('/google', async (req, reply) => {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      redirect_uri: process.env.GOOGLE_CALLBACK_URL || '',
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
    })
    reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
  })

  // Google OAuth callback
  app.get('/google/callback', async (req: any, reply) => {
    try {
      const { code } = req.query
      if (!code) return reply.redirect(`${process.env.APP_URL}/login?error=no_code`)

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code, client_id: process.env.GOOGLE_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          redirect_uri: process.env.GOOGLE_CALLBACK_URL || '',
          grant_type: 'authorization_code',
        }),
      })
      const tokens = await tokenRes.json() as any
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      const googleUser = await userRes.json() as any

      let user = await prisma.user.findUnique({ where: { email: googleUser.email } })
      if (!user) {
        user = await prisma.user.create({
          data: { email: googleUser.email, full_name: googleUser.name, profile_photo: googleUser.picture, role: 'user' }
        })
      }

      const { password_hash: _, ...userSafe } = user as any
      const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role }, { expiresIn: '7d' })
      reply.redirect(`${process.env.APP_URL}?token=${token}&user=${encodeURIComponent(JSON.stringify(userSafe))}`)
    } catch (err) {
      reply.redirect(`${process.env.APP_URL}/login?error=google_failed`)
    }
  })
}

export default authRoutes
