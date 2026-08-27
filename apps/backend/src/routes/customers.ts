import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { audit } from '../lib/audit.js'

/**
 * Πελάτες παρόχου — διαχείριση, φίλτρα, επικοινωνία.
 *
 *   ΠΑΡΟΧΟΣ
 *     GET  /customers                 λίστα με φίλτρα και στατιστικά
 *     GET  /customers/:email          καρτέλα πελάτη
 *     PUT  /customers/:email/note     σημείωση και ετικέτες
 *     POST /customers/message         μήνυμα σε έναν ή πολλούς
 *
 *   ΠΕΛΑΤΗΣ
 *     GET   /customers/inbox          τα μηνύματα που έλαβα
 *     PATCH /customers/inbox/:id/read σήμανση ως αναγνωσμένο
 *
 * ΑΠΟ ΠΟΥ ΠΡΟΚΥΠΤΟΥΝ ΟΙ ΠΕΛΑΤΕΣ
 *   Δεν υπάρχει πίνακας «πελάτες». Προκύπτουν από τις κρατήσεις: όποιος
 *   έκλεισε τον πάροχο έστω μία φορά. Έτσι η λίστα είναι πάντα ακριβής
 *   χωρίς συγχρονισμό.
 *
 * ΕΠΙΚΟΙΝΩΝΙΑ
 *   Αποκλειστικά εντός πλατφόρμας. Καμία αποστολή email.
 */

function uid() {
  return (globalThis as any).crypto?.randomUUID?.() ??
         Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

const customersRoutes: FastifyPluginAsync = async (app) => {

  app.addHook('preHandler', async (req: any, reply: any) => {
    try { await (app as any).authenticate(req, reply) }
    catch { return reply.code(401).send({ message: 'Μη εξουσιοδοτημένος' }) }
  })

  // ══ ΠΕΛΑΤΗΣ: τα μηνύματά μου ═══════════════════════════════════════
  // Δηλώνεται ΠΡΙΝ από το /:email, αλλιώς το parametric route το πιάνει.
  app.get('/inbox', async (req: any) => {
    const email = (req.user as any).email
    const rows = await prisma.$queryRaw<any[]>`
      SELECT m.id, m.provider_email, m.provider_name, m.subject, m.body,
             m.campaign_id, m.read_at, m.created_at,
             c.title AS campaign_title, c.discount_type, c.discount_value, c.ends_at
        FROM provider_messages m
        LEFT JOIN campaigns c ON c.id = m.campaign_id
       WHERE m.customer_email = ${email}
       ORDER BY m.created_at DESC
       LIMIT 100`
    const [{ n }] = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT count(*)::bigint AS n FROM provider_messages
       WHERE customer_email = ${email} AND read_at IS NULL`
    return { data: rows, unread: Number(n) }
  })

  app.patch('/inbox/:id/read', async (req: any) => {
    const email = (req.user as any).email
    const n: number = await prisma.$executeRaw`
      UPDATE provider_messages SET read_at = now()
       WHERE id = ${req.params.id} AND customer_email = ${email} AND read_at IS NULL`
    return { success: true, updated: n }
  })

  // ══ ΠΑΡΟΧΟΣ ═══════════════════════════════════════════════════════

  /**
   * Λίστα πελατών με φίλτρα.
   *
   * Φίλτρα: q (όνομα/email), min_bookings, min_spent, since, status
   * Ταξινόμηση: last (πρόσφατοι), spent, bookings, name
   */
  app.get('/', async (req: any) => {
    const provider = (req.user as any).email
    const q = req.query?.q ? `%${String(req.query.q).toLowerCase()}%` : null
    const minBookings = Number(req.query?.min_bookings) || 0
    const minSpent = Number(req.query?.min_spent) || 0
    const since = req.query?.since || null
    const sort = ['last', 'spent', 'bookings', 'name'].includes(req.query?.sort)
      ? req.query.sort : 'last'
    const limit = Math.min(500, Math.max(1, parseInt(req.query?.limit) || 100))

    // Ένα ερώτημα: συγκεντρώνει κρατήσεις ανά πελάτη και κολλάει τη σημείωση.
    const rows = await prisma.$queryRaw<any[]>`
      WITH stats AS (
        SELECT b.customer_email AS email,
               max(b.customer_name)                                   AS name,
               count(*)::int                                          AS bookings,
               count(*) FILTER (WHERE b.status = 'completed')::int     AS completed,
               count(*) FILTER (WHERE b.status = 'cancelled')::int     AS cancelled,
               coalesce(sum(b.total_price) FILTER (WHERE b.payment_status = 'paid'), 0) AS spent,
               min(b.booking_date)                                    AS first_booking,
               max(b.booking_date)                                    AS last_booking,
               coalesce(avg(b.rating) FILTER (WHERE b.rating IS NOT NULL), 0) AS avg_rating
          FROM bookings b
         WHERE b.provider_email = ${provider}
           AND b.customer_email NOT LIKE 'deleted-%@anonymized.invalid'
         GROUP BY b.customer_email
      )
      SELECT s.*, n.note, n.tags,
             (SELECT count(*)::int FROM pets p WHERE p.owner_email = s.email) AS pets
        FROM stats s
        LEFT JOIN customer_notes n
               ON n.provider_email = ${provider} AND n.customer_email = s.email
       -- unaccent: χωρίς αυτό, η αναζήτηση «νικ» δεν βρίσκει τον «Νίκο»,
       -- γιατί το lower() διατηρεί τον τόνο.
       WHERE (${q}::text IS NULL
              OR unaccent(lower(s.email)) LIKE unaccent(${q})
              OR unaccent(lower(coalesce(s.name,''))) LIKE unaccent(${q}))
         AND s.bookings >= ${minBookings}
         AND s.spent    >= ${minSpent}
         AND (${since}::text IS NULL OR s.last_booking >= ${since})
       ORDER BY
         CASE WHEN ${sort} = 'last'     THEN s.last_booking END DESC,
         CASE WHEN ${sort} = 'spent'    THEN s.spent        END DESC,
         CASE WHEN ${sort} = 'bookings' THEN s.bookings     END DESC,
         CASE WHEN ${sort} = 'name'     THEN s.name         END ASC
       LIMIT ${limit}`

    return { data: rows, total: rows.length }
  })

  /** Ιστορικό αποστολών του παρόχου, ομαδοποιημένο ανά παρτίδα. */
  app.get('/messages/sent', async (req: any) => {
    const provider = (req.user as any).email
    const rows = await prisma.$queryRaw<any[]>`
      SELECT batch_id, min(subject) AS subject, min(body) AS body,
             min(campaign_id) AS campaign_id,
             count(*)::int AS recipients,
             count(*) FILTER (WHERE read_at IS NOT NULL)::int AS read_count,
             min(created_at) AS sent_at
        FROM provider_messages
       WHERE provider_email = ${provider}
       GROUP BY batch_id
       ORDER BY min(created_at) DESC
       LIMIT 100`
    return { data: rows }
  })

  /**
   * Μήνυμα σε έναν ή πολλούς πελάτες.
   *
   * Σώμα: { emails: [...], subject, body, campaign_id? }
   * Όλα τα μηνύματα μιας παρτίδας μοιράζονται batch_id, ώστε να φαίνεται
   * στον πάροχο ως μία ενέργεια και όχι ως 50 ξεχωριστά.
   */
  app.post('/message', async (req: any, reply) => {
    const user = req.user as any
    const b = req.body || {}
    const emails = Array.isArray(b.emails) ? b.emails : null

    if (!emails?.length) return reply.code(400).send({ message: 'Επίλεξε τουλάχιστον έναν παραλήπτη' })
    if (emails.length > 500) return reply.code(400).send({ message: 'Μέχρι 500 παραλήπτες ανά αποστολή' })
    if (!b.body?.trim()) return reply.code(400).send({ message: 'Το μήνυμα δεν μπορεί να είναι κενό' })

    // Μόνο σε δικούς του πελάτες — όχι σε οποιονδήποτε χρήστη.
    const mine = await prisma.$queryRaw<Array<{ customer_email: string }>>`
      SELECT DISTINCT customer_email FROM bookings
       WHERE provider_email = ${user.email}
         AND customer_email = ANY(${emails.map((e: any) => String(e).toLowerCase())}::text[])`
    const allowed = new Set(mine.map(m => m.customer_email))

    const rejected = emails.filter((e: any) => !allowed.has(String(e).toLowerCase()))
    if (allowed.size === 0) {
      return reply.code(403).send({ message: 'Κανένας από τους παραλήπτες δεν είναι πελάτης σου' })
    }

    // Αν συνοδεύει καμπάνια, πρέπει να είναι δική του.
    let campaignId: string | null = null
    if (b.campaign_id) {
      const [c] = await prisma.$queryRaw<any[]>`
        SELECT id FROM campaigns WHERE id = ${b.campaign_id} AND owner_email = ${user.email}`
      if (!c) return reply.code(403).send({ message: 'Η καμπάνια δεν σου ανήκει' })
      campaignId = b.campaign_id
    }

    const batch = uid()
    let sent = 0
    for (const email of allowed) {
      await prisma.$executeRaw`
        INSERT INTO provider_messages
          (id, provider_email, provider_name, customer_email, subject, body,
           campaign_id, batch_id, created_at)
        VALUES
          (${uid()}, ${user.email}, ${user.full_name ?? null}, ${email},
           ${b.subject ?? null}, ${String(b.body).trim()}, ${campaignId}, ${batch}, now())`
      sent++
    }

    audit(req, { action: 'create', resource: 'provider_message',
                 resourceId: batch,
                 metadata: { sent, rejected: rejected.length, campaign: !!campaignId } })

    return {
      success: true, sent, batch_id: batch,
      rejected: rejected.length ? rejected : undefined,
    }
  })

  app.get('/:email', async (req: any, reply) => {
    const provider = (req.user as any).email
    const customer = String(req.params.email).toLowerCase()

    const bookings = await prisma.$queryRaw<any[]>`
      SELECT id, booking_date, booking_time, total_price, status, payment_status,
             staff_name, rating, review
        FROM bookings
       WHERE provider_email = ${provider} AND customer_email = ${customer}
       ORDER BY booking_date DESC LIMIT 100`

    if (!bookings.length) {
      return reply.code(404).send({ message: 'Δεν υπάρχει πελάτης με αυτό το email' })
    }

    const [note] = await prisma.$queryRaw<any[]>`
      SELECT note, tags, updated_at FROM customer_notes
       WHERE provider_email = ${provider} AND customer_email = ${customer}`

    const messages = await prisma.$queryRaw<any[]>`
      SELECT id, subject, body, campaign_id, read_at, created_at
        FROM provider_messages
       WHERE provider_email = ${provider} AND customer_email = ${customer}
       ORDER BY created_at DESC LIMIT 50`

    // Δεν εκθέτουμε ιατρικά δεδομένα των ζώων — μόνο ονόματα και είδος.
    const pets = await prisma.$queryRaw<any[]>`
      SELECT name, species, breed FROM pets WHERE owner_email = ${customer} LIMIT 20`

    audit(req, { action: 'read', resource: 'customer', resourceId: customer,
                 subjectEmail: customer, metadata: { bookings: bookings.length } })

    return { data: { email: customer, bookings, note: note ?? null, messages, pets } }
  })

  app.put('/:email/note', async (req: any, reply) => {
    const provider = (req.user as any).email
    const customer = String(req.params.email).toLowerCase()
    const b = req.body || {}

    const [exists] = await prisma.$queryRaw<any[]>`
      SELECT 1 AS ok FROM bookings
       WHERE provider_email = ${provider} AND customer_email = ${customer} LIMIT 1`
    if (!exists) {
      return reply.code(403).send({ message: 'Ο πελάτης δεν έχει κάνει κράτηση σε εσένα' })
    }

    const tags = Array.isArray(b.tags) ? b.tags.map((t: any) => String(t).slice(0, 40)).slice(0, 20) : []
    await prisma.$executeRaw`
      INSERT INTO customer_notes (id, provider_email, customer_email, note, tags, created_at, updated_at)
      VALUES (${uid()}, ${provider}, ${customer}, ${b.note ?? null}, ${tags}::text[], now(), now())
      ON CONFLICT (provider_email, customer_email)
      DO UPDATE SET note = EXCLUDED.note, tags = EXCLUDED.tags, updated_at = now()`

    return { success: true }
  })


}

export default customersRoutes
