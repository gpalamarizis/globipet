import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { decryptUserFields, encryptField } from '../lib/crypto.js'
import { audit } from '../lib/audit.js'

/**
 * User Rights router — GDPR Articles 15-22
 *
 * Endpoints:
 *   GET  /user-rights/export         — Article 15/20: full data export as JSON
 *   POST /user-rights/delete-request — Article 17: request account deletion (30-day grace period)
 *   POST /user-rights/cancel-delete  — cancel pending deletion during grace period
 *   PATCH /user-rights/rectify       — Article 16: user can correct their own profile fields
 *   GET  /user-rights/delete-status  — check whether user has a pending deletion request
 */
const userRightsRoutes: FastifyPluginAsync = async (app) => {

  // All endpoints require auth
  app.addHook('preHandler', async (req: any, reply: any) => {
    try {
      await (app as any).authenticate(req, reply)
    } catch {
      return reply.code(401).send({ message: 'Μη εξουσιοδοτημένος' })
    }
  })

  // ─── GET /user-rights/export ────────────────────────
  // Returns everything we have on the user in machine-readable JSON.
  // Serves Article 15 (right of access) and Article 20 (right to data portability).
  app.get('/export', async (req: any, reply) => {
    const userId = (req.user as any).id

    // Fetch everything related to the user in parallel
    const [user, pets, bookings, orders, posts, reviews, notifications, healthRecords, medicalRecords, consents] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, email: true, full_name: true, phone: true, address: true,
          role: true, preferred_language: true, avatar_url: true,
          ai_subscription_status: true, ai_trial_started_at: true, ai_subscription_plan_id: true,
          created_at: true, updated_at: true,
        },
      }),
      prisma.pet.findMany({ where: { owner_id: userId } }).catch(() => []),
      prisma.booking.findMany({ where: { user_id: userId } }).catch(() => []),
      prisma.order.findMany({ where: { user_id: userId } }).catch(() => []),
      prisma.post.findMany({ where: { user_id: userId } }).catch(() => []),
      prisma.review.findMany({ where: { user_id: userId } }).catch(() => []),
      prisma.notification.findMany({ where: { user_email: (req.user as any).email } }).catch(() => []),
      prisma.healthRecord.findMany({ where: { pet: { owner_id: userId } } }).catch(() => []),
      prisma.medicalRecord.findMany({ where: { pet: { owner_id: userId } } }).catch(() => []),
      prisma.userConsent.findMany({ where: { user_id: userId } }).catch(() => []),
    ])

    const payload = {
      export_generated_at: new Date().toISOString(),
      export_version: '1.0',
      gdpr_article: 'Article 15 / 20',
      user,
      pets,
      bookings,
      orders,
      posts,
      reviews,
      notifications,
      health_records: healthRecords,
      medical_records: medicalRecords,
      consent_history: consents,
    }

    // Force download as JSON attachment
    reply.header('Content-Type', 'application/json; charset=utf-8')
    reply.header('Content-Disposition', `attachment; filename="globipet-data-export-${userId}-${Date.now()}.json"`)
    // Decrypt sensitive fields so the export is human-readable
    if (payload.user) decryptUserFields(payload.user as any)
    await audit(req, { action: 'data_export', resource: 'user', resource_id: userId })
    return payload
  })

  // ─── POST /user-rights/delete-request ────────────────
  // Soft-deletion with 30-day grace period. User can cancel until then.
  // After grace, cron job (see cron.ts) performs hard delete.
  app.post('/delete-request', async (req: any, reply) => {
    const userId = (req.user as any).id
    const { reason } = (req.body || {}) as any

    // Check whether user already has a pending request
    const existing = await prisma.accountDeletionRequest.findFirst({
      where: { user_id: userId, status: 'pending' },
    })
    if (existing) {
      return reply.code(400).send({ message: 'Έχεις ήδη ενεργό αίτημα διαγραφής' })
    }

    const scheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const request = await prisma.accountDeletionRequest.create({
      data: {
        user_id: userId,
        reason: reason?.slice(0, 500) || null,
        status: 'pending',
        scheduled_for: scheduledFor,
      },
    })

    await audit(req, { action: 'delete_request', resource: 'user', resource_id: userId, metadata: { scheduled_for: scheduledFor.toISOString() } })

    return {
      data: {
        request_id: request.id,
        scheduled_for: scheduledFor,
        grace_period_days: 30,
        message: 'Το αίτημα καταχωρήθηκε. Ο λογαριασμός σου θα διαγραφεί οριστικά σε 30 μέρες. Μπορείς να ακυρώσεις το αίτημα οποιαδήποτε στιγμή.',
      },
    }
  })

  // ─── POST /user-rights/cancel-delete ─────────────────
  app.post('/cancel-delete', async (req: any, reply) => {
    const userId = (req.user as any).id
    const pending = await prisma.accountDeletionRequest.findFirst({
      where: { user_id: userId, status: 'pending' },
    })
    if (!pending) {
      return reply.code(404).send({ message: 'Δεν βρέθηκε ενεργό αίτημα διαγραφής' })
    }
    await prisma.accountDeletionRequest.update({
      where: { id: pending.id },
      data: { status: 'cancelled', cancelled_at: new Date() },
    })
    await audit(req, { action: 'cancel_delete_request', resource: 'user', resource_id: userId })
    return { message: 'Το αίτημα διαγραφής ακυρώθηκε' }
  })

  // ─── GET /user-rights/delete-status ──────────────────
  app.get('/delete-status', async (req: any) => {
    const userId = (req.user as any).id
    const pending = await prisma.accountDeletionRequest.findFirst({
      where: { user_id: userId, status: 'pending' },
    })
    if (!pending) return { data: { pending: false } }
    const daysLeft = Math.max(0, Math.ceil(
      (new Date(pending.scheduled_for).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    ))
    return {
      data: {
        pending: true,
        scheduled_for: pending.scheduled_for,
        days_left: daysLeft,
        requested_at: pending.created_at,
      },
    }
  })

  // ─── PATCH /user-rights/rectify ──────────────────────
  // Article 16 — user can update their own profile fields.
  // Whitelist prevents privilege escalation (no role/email/password changes here).
  app.patch('/rectify', async (req: any, reply) => {
    const userId = (req.user as any).id
    const body = req.body ?? {}
    const allowed = ['full_name', 'phone', 'address', 'preferred_language', 'avatar_url']
    const data: any = {}
    for (const f of allowed) if (f in body) data[f] = body[f]
    if (Object.keys(data).length === 0) {
      return reply.code(400).send({ message: 'Κανένα επιτρεπόμενο πεδίο για ενημέρωση' })
    }
    // Encrypt sensitive fields before write
    if ('phone'   in data) data.phone   = encryptField(data.phone)
    if ('address' in data) data.address = encryptField(data.address)
    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, full_name: true, phone: true, address: true, preferred_language: true, avatar_url: true },
    })
    decryptUserFields(updated as any)
    await audit(req, { action: 'rectify', resource: 'user', resource_id: userId, metadata: { fields: Object.keys(data) } })
    return { data: updated }
  })
}

export default userRightsRoutes
