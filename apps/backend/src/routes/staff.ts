import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

/**
 * Γιατροί / επαγγελματικό προσωπικό παρόχων
 *
 *  ΔΙΟΙΚΗΣΗ ΚΛΙΝΙΚΗΣ (ο κάτοχος της υπηρεσίας)
 *    GET    /staff/mine                    οι γιατροί μου
 *    POST   /staff                         προσθήκη γιατρού
 *    PATCH  /staff/:id                     επεξεργασία
 *    DELETE /staff/:id                     διαγραφή
 *    GET    /staff/:id/prices              τιμοκατάλογος γιατρού
 *    PUT    /staff/:id/prices              ορισμός τιμών (μαζικά)
 *    POST   /staff/:id/link                σύνδεση με λογαριασμό χρήστη
 *    DELETE /staff/:id/link                αποσύνδεση λογαριασμού
 *
 *  ΓΙΑΤΡΟΣ (συνδεδεμένος με δικό του λογαριασμό)
 *    GET    /staff/me                      το προφίλ μου
 *    GET    /staff/me/bookings             ΜΟΝΟ τα δικά μου ραντεβού
 *    PATCH  /staff/me                      bio, φωτογραφία, διαθεσιμότητα
 *
 *  ΔΗΜΟΣΙΑ
 *    GET    /staff/by-service/:serviceId   οι γιατροί μιας κλινικής με τιμές
 *
 * ΚΑΝΟΝΑΣ ΤΙΜΩΝ
 *   Τις τιμές ορίζει ΜΟΝΟ η διοίκηση. Ο γιατρός δεν τις αγγίζει.
 *   Όπου δεν έχει οριστεί τιμή, ισχύει η βασική του πακέτου.
 */

const STAFF_EDITABLE = [
  'full_name', 'title', 'specialties', 'license_number', 'bio', 'photo_url',
  'years_experience', 'languages', 'pet_types', 'email', 'phone',
  'accepts_telehealth', 'is_available_now', 'is_active', 'display_order',
] as const

// Ο γιατρός αλλάζει μόνο αυτά για τον εαυτό του — ποτέ τιμές.
const SELF_EDITABLE = ['bio', 'photo_url', 'phone', 'languages', 'is_available_now'] as const

const staffRoutes: FastifyPluginAsync = async (app) => {

  // ── Βοηθητικά ────────────────────────────────────────────────────────

  /** Επιβεβαιώνει ότι η υπηρεσία ανήκει στον συνδεδεμένο πάροχο. */
  async function assertOwnsService(req: any, reply: any, serviceId: string) {
    const user = req.user as any
    const svc = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true, provider_email: true },
    })
    if (!svc) { reply.code(404).send({ message: 'Η υπηρεσία δεν βρέθηκε' }); return null }
    if (svc.provider_email !== user.email && user.role !== 'admin') {
      reply.code(403).send({ message: 'Η υπηρεσία δεν σου ανήκει' }); return null
    }
    return svc
  }

  /** Επιβεβαιώνει ότι ο γιατρός ανήκει στον συνδεδεμένο πάροχο. */
  async function assertOwnsStaff(req: any, reply: any, staffId: string) {
    const user = req.user as any
    const staff = await (prisma as any).providerStaff.findUnique({ where: { id: staffId } })
    if (!staff) { reply.code(404).send({ message: 'Ο γιατρός δεν βρέθηκε' }); return null }
    if (staff.provider_email !== user.email && user.role !== 'admin') {
      reply.code(403).send({ message: 'Δεν έχεις δικαίωμα σε αυτόν τον γιατρό' }); return null
    }
    return staff
  }

  function pick(body: any, allowed: readonly string[]) {
    const out: any = {}
    for (const k of allowed) if (k in (body || {})) out[k] = body[k]
    return out
  }

  // ══ ΔΗΜΟΣΙΑ ═════════════════════════════════════════════════════════
  // Οι γιατροί μιας κλινικής με τον τιμοκατάλογό τους.
  app.get('/by-service/:serviceId', async (req: any) => {
    const { serviceId } = req.params

    const staff = await (prisma as any).providerStaff.findMany({
      where: { service_id: serviceId, is_active: true },
      orderBy: [{ display_order: 'asc' }, { full_name: 'asc' }],
    })
    if (staff.length === 0) return { data: [] }

    const packages = await prisma.servicePackage.findMany({
      where: { service_id: serviceId, is_active: true },
      orderBy: { display_order: 'asc' },
    })
    const overrides = await (prisma as any).staffServicePrice.findMany({
      where: { staff_id: { in: staff.map((s: any) => s.id) }, is_active: true },
    })

    const byStaff = new Map<string, Map<string, any>>()
    for (const o of overrides) {
      if (!byStaff.has(o.staff_id)) byStaff.set(o.staff_id, new Map())
      byStaff.get(o.staff_id)!.set(o.package_id, o)
    }

    const data = staff.map((s: any) => ({
      ...s,
      has_account: !!s.user_id,
      user_id: undefined,               // δεν εκτίθεται δημόσια
      services: packages.map(p => {
        const ov = byStaff.get(s.id)?.get(p.id)
        return {
          package_id: p.id,
          name: p.name,
          price: ov ? ov.price : p.price,
          duration_minutes: ov ? ov.duration_minutes : p.duration_minutes,
          custom_price: !!ov,
        }
      }),
    }))
    return { data }
  })

  // ══ ΑΠΟ ΕΔΩ ΚΑΙ ΚΑΤΩ ΑΠΑΙΤΕΙΤΑΙ ΣΥΝΔΕΣΗ ════════════════════════════
  app.register(async (secured) => {
    secured.addHook('preHandler', async (req: any, reply: any) => {
      try { await (app as any).authenticate(req, reply) }
      catch { return reply.code(401).send({ message: 'Μη εξουσιοδοτημένος' }) }
    })

    // ── Ο ΓΙΑΤΡΟΣ ──────────────────────────────────────────────────────
    secured.get('/me', async (req: any, reply) => {
      const rec = await (prisma as any).providerStaff.findFirst({
        where: { user_id: (req.user as any).id },
      })
      if (!rec) return reply.code(404).send({ message: 'Δεν είσαι καταχωρημένος ως γιατρός' })
      const service = await prisma.service.findUnique({
        where: { id: rec.service_id },
        select: { id: true, provider_name: true, city: true, service_type: true },
      })
      return { data: { ...rec, clinic: service } }
    })

    secured.patch('/me', async (req: any, reply) => {
      const rec = await (prisma as any).providerStaff.findFirst({
        where: { user_id: (req.user as any).id },
      })
      if (!rec) return reply.code(404).send({ message: 'Δεν είσαι καταχωρημένος ως γιατρός' })
      const data = pick(req.body, SELF_EDITABLE)
      if (Object.keys(data).length === 0) {
        return reply.code(400).send({ message: 'Κανένα επιτρεπόμενο πεδίο', allowed: SELF_EDITABLE })
      }
      data.updated_at = new Date()
      return { data: await (prisma as any).providerStaff.update({ where: { id: rec.id }, data }) }
    })

    // Μόνο τα ραντεβού που ανατέθηκαν σε ΑΥΤΟΝ τον γιατρό.
    secured.get('/me/bookings', async (req: any, reply) => {
      const rec = await (prisma as any).providerStaff.findFirst({
        where: { user_id: (req.user as any).id },
        select: { id: true },
      })
      if (!rec) return reply.code(404).send({ message: 'Δεν είσαι καταχωρημένος ως γιατρός' })
      const { status, from, to } = req.query || {}
      const where: any = { staff_id: rec.id }
      if (status) where.status = status
      if (from || to) {
        where.booking_date = {}
        if (from) where.booking_date.gte = from
        if (to)   where.booking_date.lte = to
      }
      const data = await prisma.booking.findMany({
        where, orderBy: [{ booking_date: 'asc' }, { booking_time: 'asc' }],
      })
      return { data, total: data.length }
    })

    // ── Η ΔΙΟΙΚΗΣΗ ────────────────────────────────────────────────────
    secured.get('/mine', async (req: any) => {
      const email = (req.user as any).email
      const staff = await (prisma as any).providerStaff.findMany({
        where: { provider_email: email },
        orderBy: [{ service_id: 'asc' }, { display_order: 'asc' }],
      })
      // Raw query: δεν εξαρτάται από τα generated types του Prisma client,
      // ώστε να χτίζει ακόμα κι αν δεν έχει τρέξει prisma generate.
      const counts = await prisma.$queryRaw<Array<{ staff_id: string; n: bigint }>>`
        SELECT staff_id, count(*)::bigint AS n
          FROM bookings
         WHERE provider_email = ${email} AND staff_id IS NOT NULL
         GROUP BY staff_id`
      const cmap = new Map(counts.map(c => [c.staff_id, Number(c.n)]))
      return {
        data: staff.map((s: any) => ({
          ...s,
          has_account: !!s.user_id,
          bookings_count: cmap.get(s.id) ?? 0,
        })),
      }
    })

    secured.post('/', async (req: any, reply) => {
      const body = req.body || {}
      if (!body.service_id) return reply.code(400).send({ message: 'Λείπει το service_id' })
      if (!body.full_name || !String(body.full_name).trim()) {
        return reply.code(400).send({ message: 'Το ονοματεπώνυμο είναι υποχρεωτικό' })
      }
      const svc = await assertOwnsService(req, reply, body.service_id)
      if (!svc) return

      const data: any = pick(body, STAFF_EDITABLE)
      data.service_id = body.service_id
      data.provider_email = (req.user as any).email
      for (const arr of ['specialties', 'languages', 'pet_types']) {
        if (data[arr] && !Array.isArray(data[arr])) data[arr] = [data[arr]]
      }
      return { data: await (prisma as any).providerStaff.create({ data }) }
    })

    secured.patch('/:id', async (req: any, reply) => {
      const staff = await assertOwnsStaff(req, reply, req.params.id)
      if (!staff) return
      const data = pick(req.body, STAFF_EDITABLE)
      if (Object.keys(data).length === 0) {
        return reply.code(400).send({ message: 'Κανένα επιτρεπόμενο πεδίο', allowed: STAFF_EDITABLE })
      }
      for (const arr of ['specialties', 'languages', 'pet_types']) {
        if (data[arr] && !Array.isArray(data[arr])) data[arr] = [data[arr]]
      }
      data.updated_at = new Date()
      return { data: await (prisma as any).providerStaff.update({ where: { id: staff.id }, data }) }
    })

    secured.delete('/:id', async (req: any, reply) => {
      const staff = await assertOwnsStaff(req, reply, req.params.id)
      if (!staff) return
      // Τα ραντεβού ΔΕΝ διαγράφονται — χάνουν μόνο τη σύνδεση με τον γιατρό.
      await (prisma as any).providerStaff.delete({ where: { id: staff.id } })
      return { success: true }
    })

    // ── Τιμές ─────────────────────────────────────────────────────────
    secured.get('/:id/prices', async (req: any, reply) => {
      const staff = await assertOwnsStaff(req, reply, req.params.id)
      if (!staff) return
      const packages = await prisma.servicePackage.findMany({
        where: { service_id: staff.service_id },
        orderBy: { display_order: 'asc' },
      })
      const overrides = await (prisma as any).staffServicePrice.findMany({
        where: { staff_id: staff.id },
      })
      const omap = new Map(overrides.map((o: any) => [o.package_id, o]))
      return {
        data: packages.map(p => {
          const ov: any = omap.get(p.id)
          return {
            package_id: p.id,
            name: p.name,
            base_price: p.price,
            base_duration: p.duration_minutes,
            price: ov ? ov.price : p.price,
            duration_minutes: ov ? ov.duration_minutes : p.duration_minutes,
            custom_price: !!ov,
          }
        }),
      }
    })

    // Μαζικός ορισμός. Στέλνεις όλη τη λίστα· ό,τι λείπει επανέρχεται στη βασική.
    secured.put('/:id/prices', async (req: any, reply) => {
      const staff = await assertOwnsStaff(req, reply, req.params.id)
      if (!staff) return
      const items = Array.isArray(req.body?.prices) ? req.body.prices : null
      if (!items) return reply.code(400).send({ message: 'Αναμένεται πίνακας prices' })

      const valid = await prisma.servicePackage.findMany({
        where: { service_id: staff.service_id },
        select: { id: true },
      })
      const validIds = new Set(valid.map(v => v.id))

      const clean = []
      for (const it of items) {
        if (!validIds.has(it.package_id)) {
          return reply.code(400).send({
            message: 'Το πακέτο δεν ανήκει στην υπηρεσία αυτού του γιατρού',
            package_id: it.package_id,
          })
        }
        if (it.price === null || it.price === undefined || it.price === '') continue  // επιστροφή στη βασική
        const price = Number(it.price)
        if (!isFinite(price) || price < 0) {
          return reply.code(400).send({ message: 'Μη έγκυρη τιμή', package_id: it.package_id })
        }
        clean.push({
          staff_id: staff.id,
          package_id: it.package_id,
          price,
          duration_minutes: Number(it.duration_minutes) > 0 ? Number(it.duration_minutes) : 30,
        })
      }

      await prisma.$transaction([
        (prisma as any).staffServicePrice.deleteMany({ where: { staff_id: staff.id } }),
        ...(clean.length ? [(prisma as any).staffServicePrice.createMany({ data: clean })] : []),
      ])
      return { success: true, saved: clean.length }
    })

    // ── Σύνδεση λογαριασμού γιατρού ───────────────────────────────────
    secured.post('/:id/link', async (req: any, reply) => {
      const staff = await assertOwnsStaff(req, reply, req.params.id)
      if (!staff) return
      const email = String(req.body?.email || '').trim().toLowerCase()
      if (!email) return reply.code(400).send({ message: 'Λείπει το email' })

      const user = await prisma.user.findUnique({ where: { email }, select: { id: true, full_name: true } })
      if (!user) {
        return reply.code(404).send({
          message: 'Δεν υπάρχει λογαριασμός με αυτό το email. Ο γιατρός πρέπει να εγγραφεί πρώτα.',
        })
      }
      const taken = await (prisma as any).providerStaff.findFirst({
        where: { user_id: user.id, NOT: { id: staff.id } },
        select: { id: true, full_name: true },
      })
      if (taken) {
        return reply.code(409).send({ message: 'Ο λογαριασμός είναι ήδη συνδεδεμένος με άλλον γιατρό' })
      }
      const updated = await (prisma as any).providerStaff.update({
        where: { id: staff.id },
        data: { user_id: user.id, email, updated_at: new Date() },
      })
      return { data: { ...updated, has_account: true } }
    })

    secured.delete('/:id/link', async (req: any, reply) => {
      const staff = await assertOwnsStaff(req, reply, req.params.id)
      if (!staff) return
      const updated = await (prisma as any).providerStaff.update({
        where: { id: staff.id },
        data: { user_id: null, updated_at: new Date() },
      })
      return { data: { ...updated, has_account: false } }
    })
  })
}

export default staffRoutes
