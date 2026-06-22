import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import bcrypt from 'bcryptjs'

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
    const { full_name, email, password, role } = req.body as any
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
      },
      select: {
        id: true, full_name: true, email: true, role: true, created_at: true
      }
    })
    return user
  })

  app.patch('/users/:id', async (req: any) => {
    const { password, ...rest } = req.body as any
    const data: any = { ...rest }
    if (password) {
      data.password_hash = await bcrypt.hash(password, 12)
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: {
        id: true, full_name: true, email: true, role: true, created_at: true
      }
    })
    return user
  })

  app.delete('/users/:id', async (req: any, reply) => {
    await prisma.user.delete({ where: { id: req.params.id } })
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