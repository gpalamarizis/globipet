import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { audit } from '../lib/audit.js'

/**
 * Ανάγνωση καταγραφών.
 *
 *   GET /audit/me        Τι έγινε με ΤΑ ΔΙΚΑ ΜΟΥ δεδομένα — κάθε χρήστης
 *   GET /audit/activity  Τι έκανα εγώ — κάθε χρήστης
 *   GET /audit           Πλήρης αναζήτηση — μόνο admin
 *   GET /audit/stats     Συγκεντρωτικά — μόνο admin
 *
 * ΓΙΑΤΙ ΤΟ /me
 *   Το άρθρο 15 δίνει δικαίωμα πρόσβασης στα δεδομένα ΚΑΙ στους αποδέκτες
 *   τους. Το «ποιος πάροχος άνοιξε τον φάκελο του ζώου μου και πότε» είναι
 *   ακριβώς αυτή η πληροφορία.
 *
 * Raw SQL ώστε να μην εξαρτάται από το prisma generate.
 */

type Row = {
  id: string
  actor_email: string | null
  actor_role: string | null
  action: string
  resource: string
  resource_id: string | null
  subject_email: string | null
  metadata: any
  ip: string | null
  outcome: string
  created_at: Date
}

const MAX_LIMIT = 200

function paging(q: any) {
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(q?.limit) || 50))
  const offset = Math.max(0, parseInt(q?.offset) || 0)
  return { limit, offset }
}

const auditRoutes: FastifyPluginAsync = async (app) => {

  app.addHook('preHandler', async (req: any, reply: any) => {
    try { await (app as any).authenticate(req, reply) }
    catch { return reply.code(401).send({ message: 'Μη εξουσιοδοτημένος' }) }
  })

  // ── Τι έγινε με τα δεδομένα ΜΟΥ ─────────────────────────────────────
  app.get('/me', async (req: any) => {
    const email = (req.user as any).email
    const { limit, offset } = paging(req.query)

    const rows = await prisma.$queryRaw<Row[]>`
      SELECT id, actor_email, actor_role, action, resource, resource_id,
             subject_email, metadata, outcome, created_at
        FROM audit_logs
       WHERE subject_email = ${email}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`

    const [{ n }] = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT count(*)::bigint AS n FROM audit_logs WHERE subject_email = ${email}`

    // Η ίδια η ανάγνωση καταγράφεται — αλλιώς υπάρχει τυφλό σημείο.
    audit(req, { action: 'read', resource: 'audit_log', metadata: { scope: 'self', returned: rows.length } })

    return {
      data: rows.map(r => ({
        ...r,
        // Δεν εκθέτουμε IP τρίτων στον χρήστη — μόνο ποιος και πότε.
        actor: r.actor_email === email ? 'εσύ' : (r.actor_email || 'σύστημα'),
      })),
      total: Number(n), limit, offset,
    }
  })

  // ── Τι έκανα ΕΓΩ ────────────────────────────────────────────────────
  app.get('/activity', async (req: any) => {
    const email = (req.user as any).email
    const { limit, offset } = paging(req.query)

    const rows = await prisma.$queryRaw<Row[]>`
      SELECT id, action, resource, resource_id, subject_email, metadata,
             outcome, created_at
        FROM audit_logs
       WHERE actor_email = ${email}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`

    return { data: rows, limit, offset }
  })

  // ── Πλήρης αναζήτηση — admin ────────────────────────────────────────
  app.get('/', async (req: any, reply) => {
    if ((req.user as any).role !== 'admin') {
      audit(req, { action: 'permission_denied', resource: 'audit_log', outcome: 'denied' })
      return reply.code(403).send({ message: 'Απαιτούνται δικαιώματα διαχειριστή' })
    }

    const { limit, offset } = paging(req.query)
    const { actor, subject, action, resource, outcome, from, to } = req.query || {}

    // Δυναμικά φίλτρα με παραμετροποίηση — καμία συνένωση συμβολοσειρών.
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT id, actor_email, actor_role, action, resource, resource_id,
             subject_email, metadata, ip, outcome, created_at
        FROM audit_logs
       WHERE (${actor    ?? null}::text IS NULL OR actor_email   = ${actor    ?? null})
         AND (${subject  ?? null}::text IS NULL OR subject_email = ${subject  ?? null})
         AND (${action   ?? null}::text IS NULL OR action        = ${action   ?? null})
         AND (${resource ?? null}::text IS NULL OR resource      = ${resource ?? null})
         AND (${outcome  ?? null}::text IS NULL OR outcome       = ${outcome  ?? null})
         AND (${from     ?? null}::text IS NULL OR created_at >= ${from ?? null}::timestamptz)
         AND (${to       ?? null}::text IS NULL OR created_at <= ${to   ?? null}::timestamptz)
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`

    audit(req, { action: 'read', resource: 'audit_log',
                 metadata: { scope: 'all', filters: Object.keys(req.query || {}), returned: rows.length } })

    return { data: rows, limit, offset }
  })

  // ── Συγκεντρωτικά — admin ───────────────────────────────────────────
  app.get('/stats', async (req: any, reply) => {
    if ((req.user as any).role !== 'admin') {
      return reply.code(403).send({ message: 'Απαιτούνται δικαιώματα διαχειριστή' })
    }

    const byAction = await prisma.$queryRaw<Array<{ action: string; n: bigint }>>`
      SELECT action, count(*)::bigint AS n FROM audit_logs
       WHERE created_at > now() - interval '30 days'
       GROUP BY action ORDER BY n DESC`

    const failures = await prisma.$queryRaw<Array<{ outcome: string; n: bigint }>>`
      SELECT outcome, count(*)::bigint AS n FROM audit_logs
       WHERE outcome <> 'success' AND created_at > now() - interval '30 days'
       GROUP BY outcome`

    const [{ n: total }] = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT count(*)::bigint AS n FROM audit_logs`

    const [{ oldest }] = await prisma.$queryRaw<Array<{ oldest: Date | null }>>`
      SELECT min(created_at) AS oldest FROM audit_logs`

    return {
      data: {
        total: Number(total),
        oldest,
        last30days: {
          byAction: byAction.map(r => ({ action: r.action, count: Number(r.n) })),
          failures: failures.map(r => ({ outcome: r.outcome, count: Number(r.n) })),
        },
      },
    }
  })
}

export default auditRoutes
