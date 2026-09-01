import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { encryptField, decryptUserFields } from '../lib/crypto.js'
import { audit } from '../lib/audit.js'

const usersRoutes: FastifyPluginAsync = async (app) => {

  // GET /users/me — returns the current user with sensitive fields decrypted
  app.get('/me', { preHandler: [(app as any).authenticate] }, async (req) => {
    const { email } = req.user as any
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return null
    const { password_hash: _, ...safe } = user as any
    return decryptUserFields(safe)
  })

  // PUT /users/me — legacy full-update endpoint
  // Kept for backward compatibility with older clients.
  app.put('/me', { preHandler: [(app as any).authenticate] }, async (req) => {
    const { email, id } = req.user as any
    const { full_name, bio, phone, city, country, website } = req.body as any
    const user = await prisma.user.update({
      where: { email },
      data: {
        full_name, bio, city, country, website,
        // Encrypt sensitive fields before write
        phone: encryptField(phone) as any,
      },
    })
    const { password_hash: _, ...safe } = user as any
    decryptUserFields(safe)
    await audit(req, {
      action: 'profile_update',
      resource: 'user',
      resource_id: id,
      subject_email: email,
      metadata: { via: 'PUT /users/me', fields: ['full_name','bio','phone','city','country','website'] },
    })
    return safe
  })

  // PATCH /users/me — recommended partial-update endpoint used by the web/mobile client
  app.patch('/me', { preHandler: [(app as any).authenticate] }, async (req, reply) => {
    const { email, id } = req.user as any
    const allowedFields = ['full_name', 'bio', 'phone', 'city', 'country', 'website', 'profile_photo', 'preferred_language', 'address']
    const updateData: any = {}
    for (const key of allowedFields) {
      if ((req.body as any)[key] !== undefined) updateData[key] = (req.body as any)[key]
    }
    if (Object.keys(updateData).length === 0) {
      return reply.code(400).send({ message: 'Δεν υπάρχουν πεδία για ενημέρωση' })
    }
    // Encrypt sensitive fields before write
    if ('phone'   in updateData) updateData.phone   = encryptField(updateData.phone)
    if ('address' in updateData) updateData.address = encryptField(updateData.address)

    const user = await prisma.user.update({ where: { email }, data: updateData })
    const { password_hash: _, ...safe } = user as any
    decryptUserFields(safe)
    await audit(req, {
      action: 'profile_update',
      resource: 'user',
      resource_id: id,
      subject_email: email,
      metadata: { via: 'PATCH /users/me', fields: Object.keys(updateData) },
    })
    return safe
  })

  // POST /users/me/password — user changes their own password
  app.post('/me/password', { preHandler: [(app as any).authenticate] }, async (req, reply) => {
    const { email, id } = req.user as any
    const { current_password, new_password } = req.body as any

    if (!current_password || !new_password) {
      return reply.code(400).send({ message: 'Τρέχων και νέος κωδικός είναι υποχρεωτικοί' })
    }
    if (new_password.length < 8) {
      return reply.code(400).send({ message: 'Ο νέος κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.password_hash) {
      await audit(req, { action: 'password_change', resource: 'user', resource_id: id, subject_email: email, outcome: 'failure', metadata: { reason: 'oauth_only_account' } })
      return reply.code(400).send({ message: 'Δεν είναι δυνατή η αλλαγή κωδικού για αυτόν τον χρήστη (πιθανώς συνδέθηκε με Google/Facebook)' })
    }

    const valid = await bcrypt.compare(current_password, user.password_hash)
    if (!valid) {
      await audit(req, { action: 'password_change', resource: 'user', resource_id: id, subject_email: email, outcome: 'failure', metadata: { reason: 'wrong_current_password' } })
      return reply.code(401).send({ message: 'Λανθασμένος τρέχων κωδικός' })
    }

    const same = await bcrypt.compare(new_password, user.password_hash)
    if (same) {
      return reply.code(400).send({ message: 'Ο νέος κωδικός είναι ίδιος με τον τρέχοντα' })
    }

    const password_hash = await bcrypt.hash(new_password, 12)
    await prisma.user.update({ where: { email }, data: { password_hash } })

    await audit(req, {
      action: 'password_change',
      resource: 'user',
      resource_id: id,
      subject_email: email,
    })
    return { message: 'Ο κωδικός άλλαξε επιτυχώς' }
  })
}

export default usersRoutes
