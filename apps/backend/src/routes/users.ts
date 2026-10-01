import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { encryptField, decryptUserFields } from '../lib/crypto.js'
import { audit } from '../lib/audit.js'
import { z } from 'zod'
import { parseBody, text, httpUrl, phone, language } from '../lib/validate.js'

/**
 * Ενημέρωση προφίλ.
 *
 * Η λίστα επιτρεπόμενων πεδίων υπήρχε ήδη και είναι σωστή — κρατάει έξω
 * τον ρόλο και το email. Αυτό που έλειπε ήταν έλεγχος ΤΙΜΩΝ: τίποτα δεν
 * εμπόδιζε ένα ονοματεπώνυμο δέκα μεγαβάιτ ή μια «ιστοσελίδα» που ξεκινά
 * με javascript: και γίνεται εκτελέσιμος σύνδεσμος στο δημόσιο προφίλ
 * ενός παρόχου.
 *
 * Όλα προαιρετικά: είναι μερική ενημέρωση, ο χρήστης στέλνει μόνο όσα
 * αλλάζει.
 */
const profileSchema = z.object({
  full_name: text(2, 120, 'ονοματεπώνυμο').optional(),
  bio: z.string().trim().max(2000, 'Το βιογραφικό ξεπερνά τους 2000 χαρακτήρες').optional(),
  phone: phone.optional(),
  city: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  website: httpUrl.optional(),
  profile_photo: z.string().trim().max(1000).optional(),
  preferred_language: language.optional(),
  address: z.string().trim().max(500).optional(),
}).strict()

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
    const parsed = parseBody(profileSchema, req.body, reply)
    if (!parsed) return

    // Μόνο τα πεδία που στάλθηκαν πραγματικά — το zod αφήνει τα υπόλοιπα
    // undefined και το Prisma θα τα έγραφε ως null.
    const updateData: any = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== undefined) updateData[key] = value
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
