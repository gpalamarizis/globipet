import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
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

  // PATCH /users/me - update profile fields including preferred_language
  app.patch('/me', { preHandler: [(app as any).authenticate] }, async (req, reply) => {
    const { email } = req.user as any
    const allowedFields = ['full_name', 'bio', 'phone', 'city', 'country', 'website', 'profile_photo', 'preferred_language']
    const updateData: any = {}
    for (const key of allowedFields) {
      if ((req.body as any)[key] !== undefined) updateData[key] = (req.body as any)[key]
    }
    if (Object.keys(updateData).length === 0) {
      return reply.code(400).send({ message: 'Δεν υπάρχουν πεδία για ενημέρωση' })
    }
    const user = await prisma.user.update({ where: { email }, data: updateData })
    const { password_hash: _, ...safe } = user as any
    return safe
  })

  // POST /users/me/password - user changes their own password
  app.post('/me/password', { preHandler: [(app as any).authenticate] }, async (req, reply) => {
    const { email } = req.user as any
    const { current_password, new_password } = req.body as any

    if (!current_password || !new_password) {
      return reply.code(400).send({ message: 'Τρέχων και νέος κωδικός είναι υποχρεωτικοί' })
    }
    if (new_password.length < 6) {
      return reply.code(400).send({ message: 'Ο νέος κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.password_hash) {
      return reply.code(400).send({ message: 'Δεν είναι δυνατή η αλλαγή κωδικού για αυτόν τον χρήστη (πιθανώς συνδέθηκε με Google/Facebook)' })
    }

    // Verify current password
    const valid = await bcrypt.compare(current_password, user.password_hash)
    if (!valid) {
      return reply.code(401).send({ message: 'Λανθασμένος τρέχων κωδικός' })
    }

    // Check that new password is different
    const same = await bcrypt.compare(new_password, user.password_hash)
    if (same) {
      return reply.code(400).send({ message: 'Ο νέος κωδικός είναι ίδιος με τον τρέχοντα' })
    }

    // Hash and update
    const password_hash = await bcrypt.hash(new_password, 12)
    await prisma.user.update({ where: { email }, data: { password_hash } })

    return { message: 'Ο κωδικός άλλαξε επιτυχώς' }
  })
}

export default usersRoutes
