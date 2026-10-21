import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { audit, auditSystem } from '../lib/audit.js'
import { langOfUser, notifyTitle, notifyMsg } from '../lib/notifyText.js'
import { sendPushToUser } from '../lib/push.js'
import { broadcastToUser } from './notifications.js'

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
 *    POST   /staff/:id/link                πρόσκληση λογαριασμού (email) — όχι σύνδεση
 *    DELETE /staff/:id/link                αποσύνδεση λογαριασμού
 *
 *  ΠΡΟΣΚΛΗΣΕΙΣ (ο χρήστης που προσκλήθηκε — επιβεβαιωμένο email)
 *    GET    /staff/invitations             εκκρεμείς προσκλήσεις μου
 *    POST   /staff/:id/accept              αποδοχή → σύνδεση του λογαριασμού μου
 *    POST   /staff/:id/decline             απόρριψη → το email αφαιρείται από το μέλος
 *
 *  ΓΙΑΤΡΟΣ (συνδεδεμένος με δικό του λογαριασμό)
 *    GET    /staff/me                      το προφίλ μου
 *    GET    /staff/me/bookings             ΜΟΝΟ τα δικά μου ραντεβού
 *    PATCH  /staff/me                      bio, φωτογραφία, διαθεσιμότητα
 *
 *  ΔΗΜΟΣΙΑ
 *    GET    /staff/by-service/:serviceId   οι γιατροί μιας κλινικής με τιμές
 *
 * ΠΡΟΣΚΛΗΣΗ ΑΝΤΙ ΓΙΑ ΑΥΤΟΜΑΤΗ ΣΥΝΔΕΣΗ (Ε13)
 *   Πριν, κάθε μέλος με το email ενός λογαριασμού συνδεόταν μόνο του (στην
 *   είσοδο / επιβεβαίωση email — autoLinkProviderStaff του auth.ts — και στο
 *   /:id/link): ο πάροχος μπορούσε να «βάλει» στο προσωπικό του οποιονδήποτε
 *   χωρίς να ερωτηθεί. Τώρα «εκκρεμής πρόσκληση» = μέλος με `email` = email
 *   του χρήστη και `user_id` null (καμία αλλαγή σχήματος). Ο χρήστης τη βλέπει
 *   στο προφίλ του και την αποδέχεται ή την απορρίπτει. Όσοι είναι ήδη
 *   συνδεδεμένοι μένουν συνδεδεμένοι.
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

  /** Ειδοποίηση (εφαρμογή + push), στη γλώσσα του παραλήπτη. Ποτέ δεν πετά. */
  async function notify(email: string, titleKey: string, message: (lang: any) => string, type: string, link: string) {
    try {
      const lang = await langOfUser(email)
      const notification = await prisma.notification.create({
        data: { user_email: email, title: notifyTitle(titleKey, lang), message: message(lang), type, link },
      })
      broadcastToUser(email, { type: 'notification', notification })
      void sendPushToUser(email, { title: notification.title, body: notification.message, url: link })
    } catch (err: any) {
      console.error('[staff] notification failed:', err?.message)
    }
  }

  /**
   * Νέα/αλλαγμένη πρόσκληση: ειδοποίηση ΜΟΝΟ σε λογαριασμό με αυτό το email
   * ΕΠΙΒΕΒΑΙΩΜΕΝΟ (όποιος δεν έχει το γραμματοκιβώτιο δεν μαθαίνει τίποτα).
   * Ο πάροχος δεν μαθαίνει αν υπάρχει λογαριασμός (καμία διαφορά στην απάντηση).
   *
   * Όριο: το πολύ ΜΙΑ ειδοποίηση ανά (μέλος προσωπικού, email) ανά 24 ώρες —
   * αλλιώς ο πάροχος, ξαναστέλνοντας την πρόσκληση, θα «βομβάρδιζε» τον
   * χρήστη με ειδοποιήσεις/push. Η καταμέτρηση γίνεται στο audit_logs (υπάρχει
   * ήδη, έχει resource_id + subject_email): εγγραφή 'staff_invite_notified'
   * ΠΡΙΝ την αποστολή. Η απάντηση προς τον πάροχο δεν αλλάζει (σιωπηλή
   * παράλειψη). Δύο ταυτόχρονα αιτήματα μπορεί σπάνια να περάσουν και τα δύο.
   */
  const INVITE_NOTIFY_WINDOW_MS = 24 * 3600_000
  async function notifyInvitee(staff: { id: string; email: string | null; user_id: string | null; full_name: string; service_id: string }) {
    if (!staff.email || staff.user_id) return
    try {
      const u: any = await prisma.user.findFirst({
        where: { email: { equals: staff.email.trim(), mode: 'insensitive' } },
        select: { email: true, email_verified_at: true } as any,
      })
      if (!u?.email_verified_at) return
      const subject = String(u.email).trim().toLowerCase()
      const recent = await prisma.auditLog.count({
        where: {
          action: 'staff_invite_notified',
          resource: 'provider_staff',
          resource_id: staff.id,
          subject_email: subject,
          created_at: { gte: new Date(Date.now() - INVITE_NOTIFY_WINDOW_MS) },
        },
      })
      if (recent > 0) return
      await auditSystem({ action: 'staff_invite_notified', resource: 'provider_staff', resource_id: staff.id, subject_email: subject })
      const svc = await prisma.service.findUnique({ where: { id: staff.service_id }, select: { provider_name: true } as any }) as any
      const business = String(svc?.provider_name ?? '')
      await notify(u.email, 'staff_invitation', (l) => notifyMsg.staffInvitation(l, business, staff.full_name), 'staff_invitation', '/profile')
    } catch (err: any) {
      console.error('[staff] invitation notification failed:', err?.message)
    }
  }

  const sameEmail = (a: string | null | undefined, b: string | null | undefined) =>
    !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase()

  /** Ο συνδεδεμένος χρήστης με το email του — μόνο αν είναι επιβεβαιωμένο. */
  async function verifiedSelf(req: any): Promise<{ id: string; email: string } | null> {
    const u: any = await prisma.user.findUnique({
      where: { id: (req.user as any).id },
      select: { id: true, email: true, email_verified_at: true } as any,
    })
    return u?.email_verified_at ? { id: u.id, email: u.email } : null
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

    // Δημόσιο endpoint: κανένα στοιχείο επικοινωνίας ή μητρώου του γιατρού
    // (email, τηλέφωνο, αριθμός άδειας, email κλινικής). Η επικοινωνία
    // γίνεται με την κλινική (contact_* της υπηρεσίας) ή με κράτηση.
    const data = staff.map(({ email: _e, phone: _p, license_number: _l, provider_email: _pe, ...s }: any) => ({
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

    // ── ΠΡΟΣΚΛΗΣΕΙΣ (ο χρήστης που προσκλήθηκε) ──────────────────────
    // Ανεπιβεβαίωτο email: καμία πρόσκληση (κενή λίστα, όχι σφάλμα — η κάρτα
    // απλώς δεν εμφανίζεται). Αποδοχή/απόρριψη: 403.
    secured.get('/invitations', async (req: any) => {
      const me = await verifiedSelf(req)
      if (!me) return { data: [], email_unverified: true }
      const rows = await (prisma as any).providerStaff.findMany({
        where: { user_id: null, email: { equals: me.email.trim(), mode: 'insensitive' } },
        select: { id: true, full_name: true, title: true, specialties: true, service_id: true, created_at: true },
        orderBy: { created_at: 'desc' },
        take: 50,
      })
      if (!rows.length) return { data: [] }
      const services = await prisma.service.findMany({
        where: { id: { in: [...new Set(rows.map((r: any) => r.service_id))] as string[] } },
        select: { id: true, provider_name: true, service_type: true, city: true } as any,
      }) as any[]
      const smap = new Map(services.map(s => [s.id, s]))
      return {
        data: rows.map((r: any) => {
          const s: any = smap.get(r.service_id)
          return {
            id: r.id, full_name: r.full_name, title: r.title ?? null, specialties: r.specialties ?? [],
            created_at: r.created_at,
            business_name: s?.provider_name ?? null, service_type: s?.service_type ?? null, city: s?.city ?? null,
          }
        }),
      }
    })

    secured.post('/:id/accept', async (req: any, reply) => {
      const me = await verifiedSelf(req)
      if (!me) return reply.code(403).send({ message: 'Επιβεβαίωσε πρώτα το email σου', email_unverified: true })
      const staff = await (prisma as any).providerStaff.findUnique({ where: { id: String(req.params.id) } })
      if (!staff || staff.user_id || !sameEmail(staff.email, me.email)) {
        return reply.code(404).send({ message: 'Η πρόσκληση δεν βρέθηκε ή δεν ισχύει πλέον' })
      }
      // Ένας λογαριασμός = ένα μέλος προσωπικού (το /staff/me βρίσκει ένα).
      const taken = await (prisma as any).providerStaff.findFirst({ where: { user_id: me.id }, select: { id: true } })
      if (taken) return reply.code(409).send({ message: 'Ο λογαριασμός σου είναι ήδη συνδεδεμένος με άλλο μέλος προσωπικού' })
      // Ατομικά: μόνο αν είναι ακόμα εκκρεμής με το ίδιο email.
      const r = await (prisma as any).providerStaff.updateMany({
        where: { id: staff.id, user_id: null, email: { equals: me.email.trim(), mode: 'insensitive' } },
        data: { user_id: me.id, updated_at: new Date() },
      })
      if (r.count === 0) return reply.code(404).send({ message: 'Η πρόσκληση δεν βρέθηκε ή δεν ισχύει πλέον' })
      await audit(req, {
        action: 'staff_invite_accepted', resource: 'provider_staff', resource_id: staff.id,
        metadata: { service_id: staff.service_id, provider_email: staff.provider_email, staff_name: staff.full_name },
      })
      await notify(staff.provider_email, 'staff_invitation_accepted',
        (l) => notifyMsg.staffInvitationAnswered(l, staff.full_name, true), 'staff_invitation_accepted', '/provider/staff')
      return { success: true, status: 'linked' }
    })

    // Απόρριψη: το email αφαιρείται από το μέλος (ατομικά, μόνο αν είναι ακόμα
    // εκκρεμής πρόσκληση προς ΑΥΤΟΝ). Έτσι η πρόσκληση δεν ξαναεμφανίζεται, ο
    // πάροχος βλέπει ότι δεν ισχύει πια, και μπορεί να ξαναστείλει ρητά.
    // Ασφαλέστερο από σημάδι στο audit: η κατάσταση είναι στην ίδια την εγγραφή.
    secured.post('/:id/decline', async (req: any, reply) => {
      const me = await verifiedSelf(req)
      if (!me) return reply.code(403).send({ message: 'Επιβεβαίωσε πρώτα το email σου', email_unverified: true })
      const staff = await (prisma as any).providerStaff.findUnique({ where: { id: String(req.params.id) } })
      if (!staff || staff.user_id || !sameEmail(staff.email, me.email)) {
        return reply.code(404).send({ message: 'Η πρόσκληση δεν βρέθηκε ή δεν ισχύει πλέον' })
      }
      const r = await (prisma as any).providerStaff.updateMany({
        where: { id: staff.id, user_id: null, email: { equals: me.email.trim(), mode: 'insensitive' } },
        data: { email: null, updated_at: new Date() },
      })
      if (r.count === 0) return reply.code(404).send({ message: 'Η πρόσκληση δεν βρέθηκε ή δεν ισχύει πλέον' })
      await audit(req, {
        action: 'staff_invite_declined', resource: 'provider_staff', resource_id: staff.id,
        metadata: { service_id: staff.service_id, provider_email: staff.provider_email, staff_name: staff.full_name },
      })
      await notify(staff.provider_email, 'staff_invitation_declined',
        (l) => notifyMsg.staffInvitationAnswered(l, staff.full_name, false), 'staff_invitation_declined', '/provider/staff')
      return { success: true }
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
          // Προσθετικό: 'linked' = συνδεδεμένος · 'pending' = αναμένει αποδοχή · null = χωρίς email
          invitation_status: s.user_id ? 'linked' : s.email ? 'pending' : null,
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
      const created = await (prisma as any).providerStaff.create({ data })
      await notifyInvitee(created)
      return { data: created }
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
      const updated = await (prisma as any).providerStaff.update({ where: { id: staff.id }, data })
      // Νέο email σε μέλος χωρίς λογαριασμό = νέα πρόσκληση.
      if ('email' in data && !sameEmail(staff.email, updated.email)) await notifyInvitee(updated)
      return { data: updated }
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

    // ── Πρόσκληση λογαριασμού γιατρού ─────────────────────────────────
    //
    // Πριν (Ε12): σύνδεση αμέσως αν ο λογαριασμός είχε επαληθευμένο email.
    // Τώρα: ΠΟΤΕ σύνδεση από εδώ — το email καταχωρείται ως πρόσκληση και ο
    // χρήστης την αποδέχεται (POST /:id/accept). Η απάντηση είναι η ίδια σε
    // κάθε περίπτωση (καμία ένδειξη αν υπάρχει λογαριασμός — enumeration).
    // Ίδιο email με τον ήδη συνδεδεμένο λογαριασμό → καμία αλλαγή.
    secured.post('/:id/link', async (req: any, reply) => {
      const staff = await assertOwnsStaff(req, reply, req.params.id)
      if (!staff) return
      const email = String(req.body?.email || '').trim().toLowerCase()
      if (!email) return reply.code(400).send({ message: 'Λείπει το email' })

      let keepLinked = false
      if (staff.user_id) {
        const linked = await prisma.user.findUnique({ where: { id: staff.user_id }, select: { email: true } })
        keepLinked = sameEmail(linked?.email, email)
      }
      const updated = await (prisma as any).providerStaff.update({
        where: { id: staff.id },
        data: { email, ...(keepLinked ? {} : { user_id: null }), updated_at: new Date() },
      })
      // Και επανάληψη με το ίδιο email (εκκρεμής) = υπενθύμιση στον χρήστη.
      if (!keepLinked) await notifyInvitee(updated)
      return {
        success: true,
        message: 'Η πρόσκληση καταχωρήθηκε. Αν υπάρχει λογαριασμός με αυτό το email, ο χρήστης θα τη δει στο προφίλ του και θα πρέπει να την αποδεχθεί.',
      }
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
