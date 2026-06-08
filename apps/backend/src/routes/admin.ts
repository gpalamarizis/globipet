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
        is_verified: true,
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
      select: { id: true, full_name: true, email: true, role: true, created_at: true }
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
      select: { id: true, full_name: true, email: true, role: true, is_verified: true, created_at: true }
    })
    return user
  })

  app.delete('/users/:id', async (req: any, reply) => {
    await prisma.user.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })

  // Verify provider — updates User.is_verified AND all their Services
  app.post('/providers/:id/verify', async (req: any, reply) => {
    const { verified } = req.body as any
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, email: true, role: true }
    })
    if (!user) return reply.code(404).send({ message: 'Ο πάροχος δεν βρέθηκε' })

    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: { is_verified: !!verified },
      select: { id: true, full_name: true, email: true, is_verified: true }
    })

    const servicesUpdate = await prisma.service.updateMany({
      where: { provider_email: user.email },
      data: { is_verified: !!verified }
    })

    return {
      user: updatedUser,
      services_updated: servicesUpdate.count
    }
  })

  // Bulk import providers from parsed Excel rows
  app.post('/providers/bulk-import', async (req: any, reply) => {
    const { rows } = req.body as any
    if (!Array.isArray(rows) || rows.length === 0) {
      return reply.code(400).send({ message: 'Δεν δόθηκαν εγγραφές' })
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as any[]
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        const email = String(row.email || '').trim().toLowerCase()
        if (!email || !row.full_name || !row.password) {
          results.errors.push({ row: i + 2, message: 'Λείπουν υποχρεωτικά πεδία (full_name, email, password)' })
          continue
        }

        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) {
          results.skipped++
          results.errors.push({ row: i + 2, message: `Το email ${email} υπάρχει ήδη` })
          continue
        }

        const password_hash = await bcrypt.hash(String(row.password), 12)
        const toBool = (v: any) => v === true || String(v).toUpperCase() === 'TRUE'
        const toList = (v: any) => v ? String(v).split(',').map((x: string) => x.trim()).filter(Boolean) : []

        const user = await prisma.user.create({
          data: {
            full_name: row.full_name,
            email,
            password_hash,
            phone: row.phone || null,
            role: 'service_provider',
            is_verified: toBool(row.is_verified),
          }
        })

        if (row.service_type && row.service_title) {
          await prisma.service.create({
            data: {
              provider_email: email,
              title: row.service_title,
              service_type: row.service_type,
              description: row.description || '',
              price: parseFloat(String(row.price || 0)) || 0,
              duration_minutes: parseInt(String(row.duration_minutes || 60)) || 60,
              location: row.location || row.city || '',
              city: row.city || '',
              country: row.country || 'GR',
              home_visits: toBool(row.home_visits),
              emergency_available: toBool(row.emergency_available),
              years_experience: parseInt(String(row.years_experience || 0)) || 0,
              specializations: toList(row.specializations),
              pet_types: toList(row.pet_types),
              languages: toList(row.languages),
              is_verified: toBool(row.is_verified),
            }
          })
        }

        results.created++
      } catch (err: any) {
        results.errors.push({ row: i + 2, message: err.message })
      }
    }

    return results
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
}

export default adminRoutes
