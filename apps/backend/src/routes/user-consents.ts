import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

/**
 * User Consents router — GDPR consent tracking.
 *
 * Every consent event (accept/reject) is stored as a new row for full audit
 * history. We never mutate existing records — this is important because under
 * GDPR a user has the right to withdraw consent, and we need to prove when
 * each category was accepted/rejected.
 *
 * Consent categories:
 *   - necessary   → always true, cannot be rejected (session/security cookies)
 *   - analytics   → traffic analytics, aggregate usage stats
 *   - marketing   → advertising, remarketing, personalized content
 *   - functional  → non-essential UX enhancements (chat widget, language preference caching)
 *
 * Endpoints:
 *   GET  /user-consents/current    — latest consent state for the caller (or anonymous by cookie id)
 *   POST /user-consents           — record a new consent event
 *   GET  /user-consents/history    — full history for authenticated caller
 */
const userConsentsRoutes: FastifyPluginAsync = async (app) => {

  // Optional auth: consents can be recorded before login (anonymous cookie id)
  app.decorateRequest('userId', null)
  app.addHook('preHandler', async (req: any) => {
    try {
      await req.jwtVerify()
      req.userId = (req.user as any).id
    } catch {
      req.userId = null
    }
  })

  // ─── GET /user-consents/current ──────────────────────
  // Returns the latest consent state. Query params: cookie_id (for anonymous users).
  app.get('/current', async (req: any) => {
    const { cookie_id } = req.query as any
    const where: any = req.userId ? { user_id: req.userId } : (cookie_id ? { cookie_id } : null)
    if (!where) return { data: null }

    const latest = await prisma.userConsent.findFirst({
      where,
      orderBy: { created_at: 'desc' },
    })
    return { data: latest }
  })

  // ─── POST /user-consents ─────────────────────────────
  app.post('/', async (req: any, reply) => {
    const { cookie_id, analytics, marketing, functional, terms_accepted, privacy_accepted, source } = req.body as any

    if (!req.userId && !cookie_id) {
      return reply.code(400).send({ message: 'user_id ή cookie_id απαιτείται' })
    }

    const record = await prisma.userConsent.create({
      data: {
        user_id: req.userId,
        cookie_id: cookie_id || null,
        necessary: true, // always true
        analytics: !!analytics,
        marketing: !!marketing,
        functional: !!functional,
        terms_accepted: !!terms_accepted,
        privacy_accepted: !!privacy_accepted,
        source: source || 'cookie_banner',
        ip_address: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
        user_agent: (req.headers['user-agent'] as string) || null,
      },
    })
    return reply.code(201).send({ data: record })
  })

  // ─── GET /user-consents/history ──────────────────────
  app.get('/history', async (req: any, reply) => {
    if (!req.userId) return reply.code(401).send({ message: 'Απαιτείται σύνδεση' })
    const records = await prisma.userConsent.findMany({
      where: { user_id: req.userId },
      orderBy: { created_at: 'desc' },
      take: 50,
    })
    return { data: records }
  })
}

export default userConsentsRoutes
