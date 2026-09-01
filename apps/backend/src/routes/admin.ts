import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import bcrypt from 'bcryptjs'
import { audit } from '../lib/audit.js'
import { encryptField, decryptField } from '../lib/crypto.js'

const adminRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', async (req, reply) => {
    try {
      await (app as any).authenticate(req, reply)
      if ((req.user as any)?.role !== 'admin') {
        return reply.code(403).send({ message: 'Απαγορευμένη πρόσβαση' })
      }
    } catch {
      return reply.code(401).send({ message: 'Μη εξουσιοδοτημένος' })
    }
  })

  /**

   * Όλα τα κατοικίδια της πλατφόρμας.

   *

   * ΧΩΡΙΣ ΙΑΤΡΙΚΑ ΔΕΔΟΜΕΝΑ. Εμβόλια, φάρμακα, αλλεργίες και εξετάσεις

   * είναι προσωπικά δεδομένα του ιδιοκτήτη· η πολιτική απορρήτου δηλώνει

   * ότι μοιράζονται μόνο με τον πάροχο που επιλέγει ο ίδιος.

   */

  app.get('/pets', async (req: any) => {

    const { q, species } = req.query || {}

    const limit = Math.min(200, Math.max(1, parseInt(req.query?.limit) || 50))

    const offset = Math.max(0, parseInt(req.query?.offset) || 0)

  

    const where: any = {}

    if (species) where.species = species

    if (q) {

      where.OR = [

        { name:        { contains: q, mode: 'insensitive' } },

        { breed:       { contains: q, mode: 'insensitive' } },

        { owner_email: { contains: q, mode: 'insensitive' } },

      ]

    }

  

    const [data, total, bySpecies] = await Promise.all([

      prisma.pet.findMany({

        where,

        // Ρητό select: ΑΠΟΚΛΕΙΕΙ τα vaccination_status και medical_conditions,

        // που είναι ιατρικά δεδομένα και δεν αφορούν τη διαχείριση.

        select: {

          id: true, name: true, species: true, breed: true, gender: true,

          age: true, weight: true, color: true, microchip_number: true,

          image_url: true, is_lost: true, owner_email: true, created_at: true,

        },

        orderBy: { created_at: 'desc' },

        take: limit, skip: offset,

      }),

      prisma.pet.count({ where }),

      prisma.pet.groupBy({ by: ['species'], _count: { _all: true } }),

    ])

  

    return {

      data, total, limit, offset,

      summary: bySpecies.map((s: any) => ({ species: s.species, count: s._count._all })),

    }

  })

  

  /**

   * Ανάλυση εσόδων από κρατήσεις και παραγγελίες.

   *

   * Μετρώνται ΜΟΝΟ οι πληρωμένες — μια απλήρωτη κράτηση δεν είναι έσοδο.

   */

  app.get('/revenue', async (req: any) => {

    const { from, to } = req.query || {}

  

    const bWhere: any = { payment_status: 'paid' }

    if (from || to) {

      bWhere.booking_date = {}

      if (from) bWhere.booking_date.gte = from

      if (to) bWhere.booking_date.lte = to

    }

  

    // Σύνολα

    const bookingAgg = await prisma.booking.aggregate({

      _sum: { total_price: true, platform_fee_amount: true, provider_payout_amount: true },

      _count: { _all: true },

      where: bWhere,

    })

  

    // Ανά πάροχο

    const byProvider = await prisma.booking.groupBy({

      by: ['provider_email', 'provider_name'],

      _sum: { total_price: true, platform_fee_amount: true },

      _count: { _all: true },

      where: bWhere,

      orderBy: { _sum: { total_price: 'desc' } },

      take: 20,

    })

  

    // Ανά μήνα — το booking_date είναι κείμενο YYYY-MM-DD

    const monthly = await prisma.$queryRaw`

      SELECT substring(booking_date, 1, 7) AS month,

             count(*)::int AS bookings,

             coalesce(sum(total_price), 0) AS revenue,

             coalesce(sum(platform_fee_amount), 0) AS commission

        FROM bookings

       WHERE payment_status = 'paid'

         AND (${from ?? null}::text IS NULL OR booking_date >= ${from ?? null})

         AND (${to ?? null}::text IS NULL OR booking_date <= ${to ?? null})

       GROUP BY 1 ORDER BY 1 DESC LIMIT 24`

  

    // Παραγγελίες, αν υπάρχει ο πίνακας

    let orders: any = { count: 0, revenue: 0 }

    try {

      // Το Order έχει total_amount και χρησιμοποιεί status='delivered',

      // όπως ήδη κάνει το /stats παραπάνω.

      const oAgg = await prisma.order.aggregate({

        _sum: { total_amount: true }, _count: { _all: true },

        where: { status: 'delivered' },

      })

      orders = { count: oAgg._count._all, revenue: oAgg._sum.total_amount ?? 0 }

    } catch { /* ο πίνακας μπορεί να έχει άλλο όνομα πεδίου */ }

  

    return {

      data: {

        bookings: {

          count: bookingAgg._count._all,

          revenue: bookingAgg._sum.total_price ?? 0,

          commission: bookingAgg._sum.platform_fee_amount ?? 0,

          payout: bookingAgg._sum.provider_payout_amount ?? 0,

        },

        orders,

        byProvider: byProvider.map((p: any) => ({

          email: p.provider_email,

          name: p.provider_name,

          bookings: p._count._all,

          revenue: p._sum.total_price ?? 0,

          commission: p._sum.platform_fee_amount ?? 0,

        })),

        monthly: (monthly as any[]).map(m => ({

          month: m.month,

          bookings: Number(m.bookings),

          revenue: Number(m.revenue),

          commission: Number(m.commission),

        })),

      },

    }

  })

  

  app.get('/stats', async () => {
    const [users, pets, orders, providers, products, bookings] = await Promise.all([
      prisma.user.count(),
      prisma.pet.count(),
      prisma.order.count(),
      prisma.user.count({ where: { role: 'service_provider' } }),
      prisma.product.count(),
      prisma.booking.count(),
    ])
    const revenueData = await prisma.order.aggregate({
      _sum: { total_amount: true },
      where: { status: 'delivered' }
    })
    return {
      users, pets, orders, providers, products, bookings,
      revenue: revenueData._sum.total_amount?.toFixed(2) ?? '0',
      total_records: users + pets + orders + products + bookings,
    }
  })

  app.get('/users', async (req: any) => {
    const role = req.query.role
    const users = await prisma.user.findMany({
      where: role ? { role } : undefined,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        profile_photo: true,
        created_at: true,
      },
    })
    return { data: users }
  })

  app.post('/users', async (req: any, reply) => {
    const { full_name, email, password, role, phone } = req.body as any
    if (!email || !password) {
      return reply.code(400).send({ message: 'Email και κωδικός είναι υποχρεωτικά' })
    }
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return reply.code(409).send({ message: 'Το email χρησιμοποιείται ήδη' })
    }
    const password_hash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        full_name: full_name || email.split('@')[0],
        email,
        password_hash,
        role: role || 'user',
        phone: encryptField(phone) as any,
      },
      select: {
        id: true, full_name: true, email: true, role: true, created_at: true
      }
    })
    await audit(req, { action: 'admin_user_create', resource: 'user', resource_id: user.id, metadata: { email, role: user.role } })
    return user
  })

  app.patch('/users/:id', async (req: any) => {
    const { password, phone, address, ...rest } = req.body as any
    const data: any = { ...rest }
    if (password) {
      data.password_hash = await bcrypt.hash(password, 12)
    }
    if (phone   !== undefined) data.phone   = encryptField(phone)
    if (address !== undefined) data.address = encryptField(address)
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: {
        id: true, full_name: true, email: true, role: true, created_at: true
      }
    })
    await audit(req, { action: 'admin_user_update', resource: 'user', resource_id: user.id, metadata: { fields: Object.keys(data), password_changed: !!password } })
    return user
  })

  app.delete('/users/:id', async (req: any, reply) => {
    await prisma.user.delete({ where: { id: req.params.id } })
    await audit(req, { action: 'admin_user_delete', resource: 'user', resource_id: req.params.id })
    return reply.code(204).send()
  })

  app.post('/query', async (req: any, reply) => {
    const { sql } = req.body as any
    if (!sql) return reply.code(400).send({ message: 'Δεν δόθηκε SQL query' })
    const dangerous = /\b(DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE)\b/i.test(sql)
    if (dangerous) return reply.code(400).send({ message: 'Επικίνδυνη εντολή SQL δεν επιτρέπεται' })
    const start = Date.now()
    try {
      const rows = await prisma.$queryRawUnsafe(sql)
      const duration = Date.now() - start
      return {
        rows: Array.isArray(rows) ? rows : [rows],
        rowCount: Array.isArray(rows) ? rows.length : 1,
        duration
      }
    } catch (err: any) {
      return reply.code(400).send({ message: err.message })
    }
  })
  // POST /admin/email — send custom email to one user or broadcast to a role group
  app.post('/email', async (req: any, reply) => {
    const { to_email, to_role, subject, body } = req.body as any
    if (!subject || !body) return reply.code(400).send({ message: 'Λείπουν θέμα ή περιεχόμενο' })
    if (!to_email && !to_role) return reply.code(400).send({ message: 'Δώσε email παραλήπτη ή ρόλο ομάδας' })

    const apiKey = process.env.RESEND_API_KEY
    const from = process.env.RESEND_FROM_EMAIL || 'GlobiPet <onboarding@resend.dev>'
    if (!apiKey) return reply.code(500).send({ message: 'RESEND_API_KEY δεν έχει οριστεί στο Railway' })

    const htmlBody = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;">
      <div style="background:#E65100;padding:20px 24px;border-radius:12px 12px 0 0;">
        <span style="color:#fff;font-size:18px;font-weight:800;">🐾 globipet</span>
      </div>
      <div style="background:#fff;padding:28px 24px;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px;">
        ${body.replace(/\n/g, '<br/>')}
      </div>
      <p style="color:#999;font-size:11px;text-align:center;margin-top:16px;">GlobiPet · globipet.com</p>
    </body></html>`

    let recipients: string[] = []

    if (to_email) {
      recipients = [to_email]
    } else if (to_role) {
      const whereClause = to_role === 'all'
        ? {}
        : { role: to_role }
      const users = await prisma.user.findMany({ where: whereClause, select: { email: true } })
      recipients = users.map(u => u.email)
    }

    if (recipients.length === 0) {
      return reply.code(404).send({ message: 'Δεν βρέθηκαν παραλήπτες' })
    }

    // Send in batches of 50 to avoid rate limits
    const BATCH = 50
    let sent = 0
    let failed = 0
    for (let i = 0; i < recipients.length; i += BATCH) {
      const batch = recipients.slice(i, i + BATCH)
      await Promise.allSettled(batch.map(async (email) => {
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from, to: email, subject, html: htmlBody }),
          })
          if (res.ok) sent++
          else failed++
        } catch { failed++ }
      }))
    }

    return reply.send({
      ok: true,
      recipients_count: recipients.length,
      sent,
      failed,
      message: `Εστάλη σε ${sent} από ${recipients.length} παραλήπτες${failed > 0 ? ` (${failed} απέτυχαν)` : ''}`,
    })
  })

  // GET /admin/users/search — search users for the email composer autocomplete
  app.get('/users/search', async (req: any, reply) => {
    const { q, role } = req.query as any
    const where: any = {}
    if (role) where.role = role
    if (q) where.OR = [
      { email: { contains: q, mode: 'insensitive' } },
      { full_name: { contains: q, mode: 'insensitive' } },
    ]
    const users = await prisma.user.findMany({
      where,
      select: { id: true, email: true, full_name: true, role: true },
      take: 20,
      orderBy: { full_name: 'asc' },
    })
    return reply.send({ data: users })
  })
}

export default adminRoutes