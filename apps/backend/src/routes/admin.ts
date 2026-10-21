import type { FastifyPluginAsync } from 'fastify'
import { PrismaClient } from '@prisma/client'
import prisma from '../lib/prisma.js'
import { langOfUser, notifyTitle, notifyMsg } from '../lib/notifyText.js'
import bcrypt from 'bcryptjs'
import { audit } from '../lib/audit.js'
import { refundVivaTransaction, isRefundOutcomeUnknown } from '../lib/viva.js'
import { withRefundLock } from '../lib/refundLock.js'
import { REFUND_IN_PROGRESS_MESSAGE, TELEHEALTH_REFUND_CLAIM_ACTION } from '../lib/cancellation.js'
import { ADMIN_REFUND_CLAIM_ACTION, adminRefundLockKey, adminRefundDone } from './admin-refunds.js'
import { ORDER_STOCK_RESERVED_ACTION } from './orders.js'
import { encryptField, decryptField } from '../lib/crypto.js'
import { sendPushToUser } from '../lib/push.js'
import { eraseUserAccount, emailHash } from '../lib/cron.js'
import { StripeCancelError } from '../lib/stripeSubscriptions.js'

/** Οι ρόλοι που ορίζει η διαχείριση (ίδιοι με το PATCH /users/:id). */
const ADMIN_ASSIGNABLE_ROLES = ['user', 'service_provider', 'admin']
const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Σύνδεση ΜΟΝΟ ΑΝΑΓΝΩΣΗΣ για το εργαλείο SQL (POST /admin/query).
 *
 *   Με DATABASE_URL_READONLY (ρόλος globipet_readonly —
 *   backend/scripts/sql/readonly-role.sql: SELECT μόνο, χωρίς τις ευαίσθητες
 *   στήλες) τα ερωτήματα τρέχουν με αυτόν τον ρόλο: η ίδια η Postgres
 *   αρνείται κάθε εγγραφή και κάθε προστατευμένη στήλη, όποιο κόλπο κι αν
 *   περάσει τους ελέγχους κειμένου. Χωρίς τη μεταβλητή → η κύρια σύνδεση,
 *   όπως πριν (οι έλεγχοι κειμένου + READ ONLY συναλλαγή).
 *   Ένα instance, δημιουργείται στην πρώτη χρήση (lazy).
 */
let readonlyClient: PrismaClient | null = null
function queryClient(): PrismaClient {
  const url = process.env.DATABASE_URL_READONLY
  if (!url) return prisma
  if (!readonlyClient) {
    readonlyClient = new PrismaClient({ datasources: { db: { url } }, log: ['error'] })
  }
  return readonlyClient
}

/** Διαφυγή HTML για κείμενο του διαχειριστή μέσα σε email. */
const escHtml = (v: string) => String(v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/** Κείμενο απεγγραφής στη γλώσσα του παραλήπτη (εμπορικά μηνύματα). */
const UNSUB = {
  el: { text: 'Λαμβάνεις αυτό το μήνυμα επειδή συναίνεσες σε ενημερώσεις από το GlobiPet. Για να μη λαμβάνεις άλλα, άλλαξε τις προτιμήσεις σου:', link: 'Διαχείριση προτιμήσεων' },
  en: { text: 'You are receiving this because you agreed to receive updates from GlobiPet. To stop receiving them, change your preferences:', link: 'Manage preferences' },
  es: { text: 'Recibes este mensaje porque aceptaste recibir novedades de GlobiPet. Para dejar de recibirlas, cambia tus preferencias:', link: 'Gestionar preferencias' },
  fr: { text: 'Vous recevez ce message car vous avez accepté de recevoir des actualités de GlobiPet. Pour ne plus les recevoir, modifiez vos préférences :', link: 'Gérer mes préférences' },
  zh: { text: '您收到此邮件是因为您同意接收 GlobiPet 的最新动态。如不想再收到，请更改您的偏好设置：', link: '管理偏好设置' },
} as const

/**
 * Έσοδα παραγγελιών: ΜΟΝΟ πληρωμένες (payment_status), όχι «delivered» —
 * παραγγελία παραδοτέα αλλά απλήρωτη ή επιστραμμένη δεν είναι έσοδο, ενώ
 * πληρωμένη που δεν παραδόθηκε ακόμα είναι. Στις μερικώς επιστραμμένες
 * αφαιρείται ό,τι επιστράφηκε (καταγραφή 'refund' του /admin/refund, και
 * εξωτερική επιστροφή από τον πίνακα της Viva που εφαρμόστηκε — 'external_refund'
 * με applied, lib/externalRefund).
 * ΠΕΡΙΟΡΙΣΜΟΣ: το audit κρατά 180 μέρες· για παλαιότερη μερική επιστροφή
 * μετρά ολόκληρο το ποσό (δεν υπάρχει στήλη «επιστραμμένο ποσό» στο Order).
 */
async function orderRevenue(): Promise<{ count: number; revenue: number }> {
  const [r] = await prisma.$queryRaw<any[]>`
    SELECT count(*)::int AS n,
           coalesce(sum(GREATEST(o.total_amount - coalesce(rf.refunded, 0), 0)), 0)::float8 AS revenue
      FROM orders o
      LEFT JOIN LATERAL (
        SELECT sum(CASE WHEN a.metadata->>'amount' ~ '^[0-9]+([.][0-9]+)?$'
                        THEN (a.metadata->>'amount')::float8 ELSE 0 END) AS refunded
          FROM audit_logs a
         WHERE o.payment_status = 'partially_refunded'
           AND a.resource = 'order' AND a.resource_id = o.id
           AND ((a.action = 'refund' AND a.outcome = 'success')
                OR (a.action = 'external_refund' AND a.metadata->>'applied' = 'true'))
      ) rf ON true
     WHERE o.payment_status IN ('paid', 'partially_refunded')`
  return { count: Number(r?.n ?? 0), revenue: round2(Number(r?.revenue ?? 0)) }
}

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

   * Μετρώνται ΜΟΝΟ οι πληρωμένες (και ό,τι κρατήθηκε από τις μερικώς
   * επιστραμμένες) — μια απλήρωτη κράτηση ή παραγγελία δεν είναι έσοδο.

   */

  app.get('/revenue', async (req: any) => {
    const { from, to } = req.query || {}
    const f = from ? String(from) : null
    const t = to ? String(to) : null

    // Μετρώνται οι πληρωμένες ΚΑΙ οι μερικώς επιστραμμένες κρατήσεις/συνεδρίες.
    // Στις μερικώς επιστραμμένες μετρά μόνο ό,τι κρατήθηκε: platform_fee +
    // provider_payout, που η ακύρωση (lib/cancellation) και η επιστροφή του
    // διαχειριστή (/refund) μειώνουν αναλογικά. Πριν, μια μερική επιστροφή
    // εξαφάνιζε ολόκληρο το έσοδο από τις αναφορές.
    const [totals] = await prisma.$queryRaw<any[]>`
      SELECT count(*)::int AS n,
             coalesce(sum(CASE WHEN payment_status = 'paid' THEN total_price
                               ELSE coalesce(platform_fee_amount, 0) + coalesce(provider_payout_amount, 0) END), 0)::float8 AS revenue,
             coalesce(sum(platform_fee_amount), 0)::float8 AS commission,
             coalesce(sum(provider_payout_amount), 0)::float8 AS payout
        FROM bookings
       WHERE payment_status IN ('paid', 'partially_refunded')
         AND (${f}::text IS NULL OR booking_date >= ${f})
         AND (${t}::text IS NULL OR booking_date <= ${t})`

    // Ανά πάροχο
    const byProvider = await prisma.$queryRaw<any[]>`
      SELECT provider_email, provider_name, count(*)::int AS bookings,
             coalesce(sum(CASE WHEN payment_status = 'paid' THEN total_price
                               ELSE coalesce(platform_fee_amount, 0) + coalesce(provider_payout_amount, 0) END), 0)::float8 AS revenue,
             coalesce(sum(platform_fee_amount), 0)::float8 AS commission
        FROM bookings
       WHERE payment_status IN ('paid', 'partially_refunded')
         AND (${f}::text IS NULL OR booking_date >= ${f})
         AND (${t}::text IS NULL OR booking_date <= ${t})
       GROUP BY provider_email, provider_name
       ORDER BY revenue DESC
       LIMIT 20`

    // Ανά μήνα — το booking_date είναι κείμενο YYYY-MM-DD
    const monthly = await prisma.$queryRaw<any[]>`
      SELECT substring(booking_date, 1, 7) AS month,
             count(*)::int AS bookings,
             coalesce(sum(CASE WHEN payment_status = 'paid' THEN total_price
                               ELSE coalesce(platform_fee_amount, 0) + coalesce(provider_payout_amount, 0) END), 0)::float8 AS revenue,
             coalesce(sum(platform_fee_amount), 0)::float8 AS commission
        FROM bookings
       WHERE payment_status IN ('paid', 'partially_refunded')
         AND (${f}::text IS NULL OR booking_date >= ${f})
         AND (${t}::text IS NULL OR booking_date <= ${t})
       GROUP BY 1 ORDER BY 1 DESC LIMIT 24`

    let orders: any = { count: 0, revenue: 0 }
    try { orders = await orderRevenue() } catch (err: any) { console.error('[admin] order revenue:', err?.message) }

    return {
      data: {
        bookings: {
          count: Number(totals?.n ?? 0),
          revenue: Number(totals?.revenue ?? 0),
          commission: Number(totals?.commission ?? 0),
          payout: Number(totals?.payout ?? 0),
        },
        orders,
        byProvider: byProvider.map((p: any) => ({
          email: p.provider_email,
          name: p.provider_name,
          bookings: Number(p.bookings),
          revenue: Number(p.revenue),
          commission: Number(p.commission),
        })),
        monthly: monthly.map(m => ({
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
    const revenueData = await orderRevenue()
    return {
      users, pets, orders, providers, products, bookings,
      revenue: revenueData.revenue.toFixed(2),
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

  /**
   * Ε15 — Αιτήματα διαγραφής λογαριασμού (εκκρεμή + αποτυχημένα).
   *
   * Λογαριασμός που δήλωσε ηλικία κάτω των 15 κλείνει και σβήνεται σε 14
   * ημέρες (auth.ts PATCH /me/birth-date, reason 'under_age'). Αν η δήλωση
   * ήταν λάθος (π.χ. 2015 αντί 1985), ο διαχειριστής ακυρώνει το αίτημα εδώ —
   * πριν, μόνο από τη βάση. Ο χρήστης ξανασυνδέεται και ξαναδηλώνει ημερομηνία
   * (η λάθος ημερομηνία δεν αποθηκεύτηκε ποτέ).
   *
   * Αίτημα που έκανε ο ΙΔΙΟΣ ο χρήστης (Άρθρο 17) εμφανίζεται για ενημέρωση
   * αλλά δεν ακυρώνεται από τον διαχειριστή — μόνο από τον χρήστη. 'failed'
   * (το cron απέτυχε στη μέση — ίσως σβήστηκαν ήδη δεδομένα) ούτε αυτό.
   */
  // Το auth.ts (PATCH /me/birth-date) μετατρέπει σε under_age και ένα ΗΔΗ
  // εκκρεμές αίτημα του ίδιου του χρήστη (ίδια γραμμή, ίδιο created_at). Αυτό
  // ΔΕΝ ακυρώνεται από τον διαχειριστή — ο χρήστης ζήτησε διαγραφή. Αναγνώριση:
  // καταγραφή 'delete_request' (user-rights.ts) με metadata.request_id = η
  // γραμμή (η μετατροπή κρατά το id). Παλαιότερες καταγραφές χωρίς request_id:
  // ίδια στιγμή με τη δημιουργία της γραμμής (±5′).
  const DELETE_REQUEST_MATCH_MS = 5 * 60_000
  const ownRequestKeys = async (rows: { id: string; user_id: string; created_at: Date }[]): Promise<Set<string>> => {
    const out = new Set<string>()
    if (rows.length === 0) return out
    const audits = await prisma.auditLog.findMany({
      where: { action: 'delete_request', resource: 'user', resource_id: { in: [...new Set(rows.map(r => r.user_id))] } },
      select: { resource_id: true, created_at: true, metadata: true },
      take: 5000,
    })
    for (const r of rows) {
      const t = r.created_at.getTime()
      if (audits.some(a => {
        if (a.resource_id !== r.user_id) return false
        const rid = (a.metadata as any)?.request_id
        if (rid !== undefined && rid !== null) return String(rid) === r.id
        return Math.abs(a.created_at.getTime() - t) <= DELETE_REQUEST_MATCH_MS
      })) {
        out.add(`${r.user_id}|${t}`)
      }
    }
    return out
  }

  app.get('/deletion-requests', async () => {
    const rows = await prisma.accountDeletionRequest.findMany({
      where: { status: { in: ['pending', 'failed', 'executing'] } },
      orderBy: { scheduled_for: 'asc' },
      take: 500,
      select: {
        id: true, user_id: true, reason: true, status: true, scheduled_for: true, created_at: true,
        user: { select: { id: true, email: true, full_name: true, role: true } },
      },
    })
    const own = await ownRequestKeys(rows.filter(r => r.reason === 'under_age'))
    return {
      data: rows.map(r => ({
        id: r.id,
        kind: r.reason === 'under_age' ? 'under_age' : 'user_request',
        also_user_request: r.reason === 'under_age' && own.has(`${r.user_id}|${r.created_at.getTime()}`),
        status: r.status,
        scheduled_for: r.scheduled_for,
        created_at: r.created_at,
        user_id: r.user?.id ?? null,
        email: r.user?.email ?? null,
        full_name: r.user?.full_name ?? null,
        role: r.user?.role ?? null,
        can_cancel: r.reason === 'under_age' && r.status === 'pending' && !own.has(`${r.user_id}|${r.created_at.getTime()}`),
      })),
    }
  })

  app.post('/deletion-requests/:id/cancel', async (req: any, reply) => {
    const id = String(req.params?.id ?? '')
    const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 500) : ''
    if (!id || id.length > 64) return reply.code(400).send({ message: 'Λείπει το αναγνωριστικό' })
    if (note.length < 3) return reply.code(400).send({ message: 'Γράψε μια σύντομη σημείωση (τουλάχιστον 3 χαρακτήρες).' })

    const reqRow = await prisma.accountDeletionRequest.findUnique({ where: { id }, select: { id: true, user_id: true, reason: true, status: true, created_at: true } })
    if (!reqRow) return reply.code(404).send({ message: 'Το αίτημα δεν βρέθηκε' })
    if (reqRow.reason !== 'under_age' || (await ownRequestKeys([reqRow])).size > 0) {
      return reply.code(409).send({ message: 'Το αίτημα το έκανε ο ίδιος ο χρήστης — μόνο εκείνος μπορεί να το ακυρώσει.' })
    }
    // Ατομικά, μόνο από 'pending': αν το cron το εκτέλεσε (ή απέτυχε) στο
    // μεταξύ, τίποτα δεν αλλάζει.
    const done = await prisma.accountDeletionRequest.updateMany({
      where: { id, reason: 'under_age', status: 'pending' },
      data: { status: 'cancelled', cancelled_at: new Date() },
    })
    if (done.count === 0) return reply.code(409).send({ message: 'Το αίτημα δεν είναι πλέον ενεργό' })
    await audit(req, {
      action: 'admin_cancel_delete_request', resource: 'user', resource_id: reqRow.user_id,
      metadata: { request_id: id, reason: 'under_age', note },
    })
    return { success: true }
  })

  app.post('/users', async (req: any, reply) => {
    const { full_name, email, password, role, phone } = req.body as any
    if (!email || !password) {
      return reply.code(400).send({ message: 'Email και κωδικός είναι υποχρεωτικά' })
    }
    // Ίδιο ελάχιστο μήκος με την εγγραφή/αλλαγή κωδικού (auth.ts).
    if (typeof password !== 'string' || password.length < 8) {
      return reply.code(400).send({ message: 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες' })
    }
    // Ρόλος μόνο από τη λίστα — πριν περνούσε ό,τι έστελνε το σώμα
    // (π.χ. 'superadmin' ή κείμενο που κανένα άλλο σημείο δεν αναγνωρίζει).
    if (role !== undefined && role !== null && role !== '' && !ADMIN_ASSIGNABLE_ROLES.includes(role)) {
      return reply.code(400).send({ message: 'Μη έγκυρη τιμή' })
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

  app.patch('/users/:id', async (req: any, reply) => {
    // Μόνο τα πεδία που αλλάζει η διαχείριση (web AdminDashboard: role,
    // is_verified· ChangePasswordModal: password) και όσα δεχόταν ήδη ρητά.
    // Πριν περνούσε όλο το σώμα στη βάση (email, password_hash, reset_token…).
    const { password, phone, address, full_name, role, is_verified } = (req.body ?? {}) as any
    const data: any = {}
    if (full_name !== undefined) data.full_name = full_name
    if (role !== undefined) {
      if (!ADMIN_ASSIGNABLE_ROLES.includes(role)) return reply.code(400).send({ message: 'Μη έγκυρη τιμή' })
      data.role = role
    }
    if (is_verified !== undefined) {
      if (typeof is_verified !== "boolean") return reply.code(400).send({ message: 'Μη έγκυρη τιμή' })
      data.is_verified = is_verified
    }
    if (password) {
      // Κενός κωδικός = καμία αλλαγή (όπως πριν)· νέος κωδικός: τουλάχιστον 8.
      if (typeof password !== 'string' || password.length < 8) {
        return reply.code(400).send({ message: 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες' })
      }
      data.password_hash = await bcrypt.hash(password, 12)
    }
    if (phone   !== undefined) data.phone   = encryptField(phone)
    if (address !== undefined) data.address = encryptField(address)
    if (Object.keys(data).length === 0) {
      return reply.code(400).send({ message: 'Κανένα επιτρεπόμενο πεδίο' })
    }
    // Νέος ρόλος ή νέος κωδικός: τα ήδη εκδοθέντα JWT (που κουβαλούν τον
    // παλιό ρόλο) παύουν να ισχύουν. token_version: πεδίο της s1 (schema).
    if (data.role !== undefined || data.password_hash !== undefined) {
      data.token_version = { increment: 1 }
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: {
        id: true, full_name: true, email: true, role: true, created_at: true
      }
    })
    // Νέος ρόλος/κωδικός: το cache ελέγχου τοκεν (index.ts) καθαρίζει αμέσως.
    if (data.token_version !== undefined) (app as any).invalidateAuthCache?.(user.id)
    await audit(req, { action: 'admin_user_update', resource: 'user', resource_id: user.id, metadata: { fields: Object.keys(data), password_changed: !!password } })
    return user
  })

  /**
   * Διαγραφή χρήστη από τη διαχείριση.
   *
   * Πριν έσβηνε μόνο τη γραμμή users: ζώα, ιατρικά, μηνύματα, παραγγελίες
   * με διεύθυνση και email σε δεκάδες πίνακες έμεναν. Τώρα ακολουθεί την ΙΔΙΑ
   * διαγραφή/ανωνυμοποίηση με το αίτημα άρθρου 17 (lib/cron eraseUserAccount),
   * χωρίς την περίοδο χάριτος, και ακυρώνει κάθε ενεργή συνεδρία.
   */
  app.delete('/users/:id', async (req: any, reply) => {
    const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, email: true } })
    if (!target) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    if (target.id === (req.user as any)?.id) {
      return reply.code(400).send({ message: 'Δεν μπορείς να διαγράψεις τον δικό σου λογαριασμό' })
    }
    let counts: Record<string, number>
    try {
      counts = await eraseUserAccount(target.id, target.email)
    } catch (err: any) {
      ;(app as any).invalidateAuthCache?.(target.id)
      // Ιδεμποτική: μια νέα προσπάθεια συνεχίζει από όπου σταμάτησε.
      await audit(req, {
        action: 'admin_user_delete', resource: 'user', resource_id: target.id,
        subject_email: emailHash(target.email), outcome: 'error',
        error_message: String(err?.message ?? err).slice(0, 500),
      })
      // Συνδρομή του Stripe που δεν ακυρώθηκε: τίποτα δεν διαγράφηκε (αλλιώς
      // η κάρτα θα χρεωνόταν για λογαριασμό που δεν υπάρχει).
      if (err instanceof StripeCancelError) {
        return reply.code(502).send({ message: 'Δεν ακυρώθηκαν όλες οι συνδρομές του χρήστη στο Stripe. Ο λογαριασμός δεν διαγράφηκε — δοκίμασε ξανά σε λίγο.' })
      }
      return reply.code(500).send({ message: 'Η διαγραφή δεν ολοκληρώθηκε — δοκίμασε ξανά' })
    }
    ;(app as any).invalidateAuthCache?.(target.id)
    await audit(req, {
      action: 'admin_user_delete', resource: 'user', resource_id: target.id,
      subject_email: emailHash(target.email), metadata: counts,
    })
    return reply.code(204).send()
  })

  /**
   * Εργαλείο ανάγνωσης της βάσης για διαχειριστές.
   *
   * ΤΙ ΗΤΑΝ ΠΡΙΝ
   *   Εκτελούσε ΟΠΟΙΟΔΗΠΟΤΕ SQL. Το φίλτρο απέκλειε μόνο DROP, TRUNCATE,
   *   ALTER, CREATE, GRANT και REVOKE — άρα επέτρεπε DELETE, UPDATE και
   *   INSERT. Ένα `DELETE FROM bookings` περνούσε. Ένα `SELECT * FROM users`
   *   επέστρεφε password hashes, τοκεν επαναφοράς και κρυπτογραφημένα πεδία.
   *   Ένας λογαριασμός διαχειριστή που θα διέρρεε έδινε ολόκληρη τη βάση,
   *   χωρίς κανένα ίχνος για το τι διαβάστηκε.
   *
   * ΤΙ ΕΙΝΑΙ ΤΩΡΑ
   *   Λίστα επιτρεπόμενων αντί για λίστα απαγορευμένων — η μόνη προσέγγιση
   *   που αντέχει, γιατί η δεύτερη ξεχνάει πάντα κάτι:
   *     · μόνο ένα SELECT, χωρίς δεύτερη εντολή μετά από ερωτηματικό
   *     · καμία στήλη που περιέχει διαπιστευτήρια ή προσωπικά δεδομένα
   *     · υποχρεωτικό όριο γραμμών
   *     · κάθε ερώτημα καταγράφεται στο ημερολόγιο ελέγχου
   */
  const FORBIDDEN_COLUMNS = /\b(password_hash|reset_token|reset_token_expires|expo_token|endpoint|p256dh|auth|two_factor|api_key|secret)\b/i
  const MAX_ROWS = 500
  // Συναρτήσεις με παρενέργειες ή πρόσβαση εκτός βάσης, που ένα READ ONLY
  // transaction ΔΕΝ μπλοκάρει (τερματισμός συνδέσεων, αρχεία, ρυθμίσεις).
  const FORBIDDEN_FUNCTIONS = /\b(pg_terminate_backend|pg_cancel_backend|pg_reload_conf|pg_rotate_logfile|pg_read_file|pg_read_binary_file|pg_ls_dir|pg_stat_file|lo_import|lo_export|dblink\w*|set_config|pg_advisory\w*|pg_sleep\w*|pg_notify)\s*\(/i
  // Συναρτήσεις που «συσκευάζουν» μια γραμμή ή κωδικοποιούν κείμενο, ώστε το
  // αποτέλεσμα να μη μοιάζει με τη στήλη (π.χ. encode(password_hash::bytea,
  // 'base64'), row_to_json(u)) και να περνά το scrub. Απαγορεύονται μόνο όταν
  // το ερώτημα αγγίζει τον πίνακα users (απλός κανόνας: η λέξη `users`).
  const USERS_TABLE = /\busers\b/
  const FORBIDDEN_WITH_USERS = /\b(encode|decode|convert_to|row_to_json|to_jsonb?|jsonb?_agg|array_to_string|string_agg)\s*\(/
  /**
   * Κανονικοποίηση ΜΟΝΟ για τους ελέγχους (εκτελείται το αρχικό κείμενο):
   * σχόλια → κενό, `"ident"` → ident, πεζά. Χωρίς αυτό `"pg_sleep"(5)` ή
   * `pg_sleep` με σχόλιο πριν την παρένθεση περνούσαν το regex. Τα U&"…" (unicode escapes σε
   * αναγνωριστικό) απορρίπτονται ολόκληρα στο route.
   *
   * ΟΡΙΣΤΙΚΗ ΛΥΣΗ: ξεχωριστός ρόλος βάσης μόνο για αυτό το εργαλείο, με
   * SELECT μόνο σε επιτρεπόμενους πίνακες/στήλες (GRANT SELECT (cols) …) και
   * χωρίς EXECUTE σε pg_* συναρτήσεις. Οι έλεγχοι κειμένου εδώ είναι δεύτερη
   * γραμμή άμυνας και πάντα θα έχουν παράκαμψη.
   */
  const normalizeSql = (q: string) => q
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .replace(/"((?:[^"]|"")*)"/g, (_m, id: string) => id.replace(/""/g, '"'))
    .toLowerCase()

  /**
   * Αφαίρεση ευαίσθητων ΚΛΕΙΔΙΩΝ από το αποτέλεσμα, αναδρομικά. Το φίλτρο στο
   * κείμενο του SQL δεν αρκεί: `SELECT u.*`, `to_jsonb(u)` ή ένα alias φέρνουν
   * τις στήλες χωρίς να γράφεται το όνομά τους. Επίσης: κείμενο που μοιάζει
   * με bcrypt hash ή με JSON που περιέχει τέτοιο κλειδί κρύβεται, και τα
   * BigInt (count(*)) γίνονται αριθμοί — αλλιώς η σειριοποίηση JSON σκάει.
   */
  const SENSITIVE_KEY = /^(password_hash|password|google_id|facebook_id|apple_id|p256dh|auth|endpoint|tax_number)$|^two_factor|_secret$|_token$|_token_expires$/i
  const SENSITIVE_IN_TEXT = /"(password_hash|google_id|facebook_id|p256dh|auth|endpoint|two_factor\w*|\w*_secret|\w*_token)"\s*:/i
  const BCRYPT = /\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{20,}/
  const REDACTED = '[redacted]'
  function scrub(v: any, depth = 0): any {
    if (depth > 20) return REDACTED
    if (typeof v === 'bigint') return Number.isSafeInteger(Number(v)) ? Number(v) : v.toString()
    if (typeof v === 'string') return (BCRYPT.test(v) || SENSITIVE_IN_TEXT.test(v)) ? REDACTED : v
    if (Array.isArray(v)) return v.map(x => scrub(x, depth + 1))
    if (v && typeof v === 'object' && !(v instanceof Date) && !Buffer.isBuffer(v)) {
      const out: any = {}
      for (const [k, x] of Object.entries(v)) out[k] = SENSITIVE_KEY.test(k) ? REDACTED : scrub(x, depth + 1)
      return out
    }
    return v
  }


  /**
   * Επιστροφή χρημάτων — μόνο διαχειριστής.
   *
   * ΓΙΑΤΙ ΜΟΝΟ ΕΔΩ
   *   Η επιστροφή είναι μη αναστρέψιμη κίνηση χρήματος. Δεν την ξεκινά ο
   *   πελάτης ούτε ο πάροχος: ο πελάτης θα επέστρεφε τα πάντα, ο πάροχος
   *   θα μπορούσε να επιστρέψει χρήματα τρίτου. Το αίτημα υποβάλλεται από
   *   τη σελίδα υποστήριξης και εκτελείται εδώ.
   *
   * ΤΙ ΠΡΟΣΤΑΤΕΥΕΙ
   *   · Η εγγραφή πρέπει να υπάρχει και να είναι ΠΛΗΡΩΜΕΝΗ. Επιστροφή σε
   *     απλήρωτη κράτηση θα έστελνε χρήματα που δεν εισπράχθηκαν ποτέ.
   *   · Το ποσό δεν μπορεί να ξεπερνά το πληρωμένο. Χωρίς αυτόν τον έλεγχο
   *     ένα τυπογραφικό λάθος στέλνει δεκαπλάσιο ποσό.
   *   · Η κατάσταση γράφεται ΜΕΤΑ την επιβεβαίωση του Viva, ποτέ πριν.
   *     Αντίστροφα, μια αποτυχία θα άφηνε εγγραφή που λέει «επιστράφηκε»
   *     ενώ τα χρήματα δεν κουνήθηκαν.
   *   · ΜΙΑ επιστροφή (διπλό κλικ, δύο admins, ακύρωση πελάτη μαζί):
   *     ατομική διεκδίκηση paid → refunding ΠΡΙΝ τη Viva, withRefundLock με
   *     το ΙΔΙΟ κλειδί με τις άλλες ροές του ίδιου πόρου (adminRefundLockKey),
   *     μέσα στο κλείδωμα έλεγχος audit «ήδη επιστράφηκε» για τη συναλλαγή,
   *     τελική εγγραφή υπό συνθήκη (μόνο από refunding).
   *   · Οριστική άρνηση της Viva → πίσω σε paid, 502. ΑΓΝΩΣΤΗ έκβαση
   *     (timeout/δίκτυο/5xx) → μένει refunding (η επιστροφή ίσως έγινε),
   *     εμφανίζεται στις «Αποτυχημένες επιστροφές» για έλεγχο στη Viva.
   */
  app.post('/refund', async (req: any, reply) => {
    const { type, id, amount, reason } = (req.body ?? {}) as any

    if (!['order', 'booking', 'telehealth'].includes(type)) {
      return reply.code(400).send({ message: 'Άγνωστος τύπος συναλλαγής' })
    }
    if (!id || typeof id !== 'string') {
      return reply.code(400).send({ message: 'Λείπει το αναγνωριστικό' })
    }

    // Κάθε τύπος κρατά το ποσό σε διαφορετικό πεδίο.
    const loaders: Record<string, () => Promise<any>> = {
      order: () => prisma.order.findUnique({ where: { id } }),
      booking: () => prisma.booking.findUnique({ where: { id } }),
      telehealth: () => prisma.telehealthConsultation.findUnique({ where: { id } }),
    }
    const record = await loaders[type]()
    if (!record) return reply.code(404).send({ message: 'Η συναλλαγή δεν βρέθηκε' })

    if (record.payment_status === 'refunding') {
      return reply.code(409).send({ message: 'Η επιστροφή είναι ήδη σε εξέλιξη' })
    }
    if (record.payment_status !== 'paid') {
      return reply.code(400).send({ message: 'Η συναλλαγή δεν είναι πληρωμένη' })
    }
    if (!record.payment_ref) {
      return reply.code(400).send({ message: 'Δεν υπάρχει αναφορά πληρωμής — η επιστροφή γίνεται χειροκίνητα από το Viva' })
    }

    const paid = Number(
      type === 'order' ? record.total_amount
      : type === 'booking' ? record.total_price
      : record.price,
    )
    if (!Number.isFinite(paid) || paid <= 0) {
      return reply.code(400).send({ message: 'Το ποσό της συναλλαγής δεν είναι έγκυρο' })
    }

    let refundAmount: number | undefined
    if (amount !== undefined && amount !== null && amount !== '') {
      refundAmount = Number(amount)
      if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
        return reply.code(400).send({ message: 'Μη έγκυρο ποσό επιστροφής' })
      }
      // Μισό λεπτό ανοχής για στρογγυλοποιήσεις, τίποτα παραπάνω.
      if (refundAmount > paid + 0.005) {
        return reply.code(400).send({ message: `Το ποσό υπερβαίνει το πληρωμένο (${paid.toFixed(2)} €)` })
      }
    }

    // Μερική επιστροφή δεν κάνει τη συναλλαγή επιστραμμένη: ο πελάτης έχει
    // ακόμα πληρώσει κάτι, και το λογιστικό αποτύπωμα πρέπει να το δείχνει.
    const full = refundAmount === undefined || refundAmount >= paid - 0.005
    const newStatus = full ? 'refunded' : 'partially_refunded'
    const txn = String(record.payment_ref)
    const admin = String(req.user?.email ?? '')
    const amountOut = refundAmount ?? paid

    const models: Record<string, any> = {
      order: prisma.order, booking: prisma.booking, telehealth: prisma.telehealthConsultation,
    }
    const model = models[type]

    // Ατομική διεκδίκηση: μόνο ένα αίτημα περνά paid → refunding.
    const claimed = await model.updateMany({
      where: { id, payment_status: 'paid', payment_ref: record.payment_ref },
      data: { payment_status: 'refunding' },
    })
    if (claimed.count === 0) return reply.code(409).send({ message: 'Η επιστροφή είναι ήδη σε εξέλιξη' })
    await audit(req, {
      action: ADMIN_REFUND_CLAIM_ACTION, resource: type, resource_id: id,
      metadata: { transaction_id: txn, amount: amountOut, full, new_status: newStatus, admin },
    })
    if (type === 'telehealth') {
      // Η συνεδρία δεν έχει updated_at: η ώρα της διεκδίκησης για την
      // εργασία των κολλημένων (lib/cancellation.ts), όπως η cancelTelehealth.
      await audit(req, {
        action: TELEHEALTH_REFUND_CLAIM_ACTION, resource: 'telehealth', resource_id: id,
        metadata: { transaction_id: txn, by: 'admin', admin_refund: true },
      })
    }
    const backToPaid = () => model.updateMany({
      where: { id, payment_status: 'refunding', payment_ref: record.payment_ref },
      data: { payment_status: 'paid' },
    })

    type Out = { out: 'refunded' | 'already' | 'failed' | 'unknown'; refundTx?: string | null; error?: string; done?: any }
    let lock: { locked: true; value: Out } | { locked: false }
    try {
      lock = await withRefundLock(adminRefundLockKey(type, id, txn), async (): Promise<Out> => {
        const done = await adminRefundDone(type, id, txn)
        if (done) return { out: 'already', refundTx: done.viva_refund_transaction ?? null, done }
        try {
          const r = await refundVivaTransaction(txn, refundAmount)
          await audit(req, {
            action: 'refund', resource: type, resource_id: id,
            metadata: {
              amount: amountOut, full, reason: reason ? String(reason).slice(0, 500) : null,
              viva_refund_transaction: r.transactionId, transaction_id: txn, admin,
            },
          })
          return { out: 'refunded', refundTx: r.transactionId }
        } catch (err: any) {
          const error = String(err?.message ?? err).slice(0, 500)
          if (!isRefundOutcomeUnknown(err)) return { out: 'failed', error }
          // Άγνωστη έκβαση: καταγραφή ΠΡΙΝ λυθεί το κλείδωμα (για τη σελίδα
          // «Αποτυχημένες επιστροφές» και τη «Σήμανση ως λυμένο»).
          await audit(req, {
            action: 'refund', resource: type, resource_id: id, outcome: 'failure', status_code: 502,
            error_message: error,
            metadata: { amount: amountOut, full, new_status: newStatus, error, transaction_id: txn, admin, unknown_outcome: true },
          })
          return { out: 'unknown', error }
        }
      })
    } catch (err: any) {
      // Η διεκδίκηση στη βάση δεν έγινε: καμία κλήση στη Viva.
      console.error('[admin] refund lock error', type, id, err?.message)
      await backToPaid().catch(() => {})
      return reply.code(503).send({ message: 'Προσωρινό σφάλμα — δοκίμασε ξανά σε λίγο' })
    }
    if (!lock.locked) {
      await backToPaid()
      return reply.code(409).send({ message: 'Η επιστροφή είναι ήδη σε εξέλιξη' })
    }
    const { out, refundTx, error, done } = lock.value

    if (out === 'unknown') {
      // Η επιστροφή ίσως έγινε: ΜΕΝΕΙ refunding — ποτέ πίσω σε paid (θα
      // επέτρεπε δεύτερη επιστροφή), ποτέ νέα κλήση στα τυφλά.
      return reply.code(502).send({ message: REFUND_IN_PROGRESS_MESSAGE, detail: error, in_progress: true })
    }
    if (out === 'failed') {
      await backToPaid()
      await audit(req, {
        action: 'refund', resource: type, resource_id: id, outcome: 'failure',
        metadata: { amount: amountOut, error, transaction_id: txn, admin },
      })
      return reply.code(502).send({ message: 'Η επιστροφή απορρίφθηκε από το Viva', detail: error })
    }

    // Ήδη επιστραμμένη (audit): ισχύει ό,τι καταγράφηκε τότε, όχι το νέο αίτημα.
    const doneAmount = done && done.amount != null && Number.isFinite(Number(done.amount)) ? Number(done.amount) : null
    const finalAmount = doneAmount ?? amountOut
    const finalFull = done ? (typeof done.full === 'boolean' ? done.full : finalAmount >= paid - 0.005) : full
    // Υπό συνθήκη: μόνο από refunding και για την ίδια συναλλαγή.
    // Αμοιβή παρόχου και προμήθεια μειώνονται αναλογικά με ό,τι κρατήθηκε —
    // ίδιος κανόνας με την ακύρωση (lib/cancellation cancelBooking). Πριν, μετά
    // από μερική επιστροφή ο πάροχος έμενε να εισπράξει ολόκληρη την αμοιβή.
    // Μία φορά: η εγγραφή περνά από refunding μόνο εδώ, οπότε δεν μειώνεται διπλά.
    const keep = finalFull ? 0 : Math.min(1, Math.max(0, (paid - finalAmount) / paid))
    const finalData: any = { payment_status: finalFull ? 'refunded' : 'partially_refunded' }
    if (record.provider_payout_amount != null) finalData.provider_payout_amount = round2(Number(record.provider_payout_amount) * keep)
    if (record.platform_fee_amount != null) finalData.platform_fee_amount = round2(Number(record.platform_fee_amount) * keep)
    // Παραγγελία, ΠΛΗΡΗΣ επιστροφή: επαναφορά του αποθέματος που δεσμεύτηκε
    // στην πληρωμή (orders.ts claimOrderPayment → καταγραφή
    // ORDER_STOCK_RESERVED_ACTION για ΑΥΤΗ τη συναλλαγή). Μία φορά: στην ίδια
    // συναλλαγή βάσης με τη μετάβαση refunding → refunded, που περνά μόνο μία
    // φορά (count 1). Μερική επιστροφή: τίποτα (δεν ξέρουμε ποια είδη
    // επιστράφηκαν). Παραγγελία ακυρωμένη λόγω έλλειψης αποθέματος δεν φτάνει
    // ποτέ εδώ (δεν έγινε paid, ούτε δεσμεύτηκε απόθεμα)· παραγγελία που
    // πληρώθηκε πριν τη δέσμευση αποθέματος δεν έχει καταγραφή → τίποτα.
    let stockRestored = false
    await prisma.$transaction(async (tx) => {
      const fin = await (tx as any)[type === 'telehealth' ? 'telehealthConsultation' : type].updateMany({
        where: { id, payment_status: 'refunding', payment_ref: record.payment_ref },
        data: finalData,
      })
      if (fin.count !== 1 || type !== 'order' || !finalFull) return
      const reservedRow = await tx.auditLog.findFirst({
        where: {
          action: ORDER_STOCK_RESERVED_ACTION, resource: 'order', resource_id: id,
          metadata: { path: ['transaction_id'], equals: txn },
        },
        select: { metadata: true },
      })
      const items = ((reservedRow?.metadata ?? {}) as any).items ?? {}
      for (const [pid, q] of Object.entries(items)) {
        const qty = Math.floor(Number(q))
        if (!pid || !Number.isFinite(qty) || qty <= 0) continue
        await tx.product.updateMany({ where: { id: pid }, data: { stock: { increment: qty } } })
        stockRestored = true
      }
    })
    if (stockRestored) {
      await audit(req, { action: 'order_stock_restored', resource: 'order', resource_id: id, metadata: { transaction_id: txn, admin } })
    }

    return { success: true, amount: finalAmount, full: finalFull, refund_transaction: refundTx ?? null }
  })

  app.post('/query', async (req: any, reply) => {
    const { sql } = req.body as any
    if (!sql || typeof sql !== 'string') {
      return reply.code(400).send({ message: 'Δεν δόθηκε SQL query' })
    }

    const trimmed = sql.trim().replace(/;\s*$/, '')

    // Μία και μόνο εντολή. Το ερωτηματικό στη μέση σημαίνει δεύτερη εντολή.
    if (trimmed.includes(';')) {
      return reply.code(400).send({ message: 'Επιτρέπεται μία μόνο εντολή' })
    }
    // Μόνο ανάγνωση. Κάθε άλλη λέξη-κλειδί απορρίπτεται εξ ορισμού.
    if (!/^(SELECT|WITH)\s/i.test(trimmed)) {
      return reply.code(400).send({ message: 'Επιτρέπονται μόνο ερωτήματα SELECT' })
    }
    // Ελέγχοι πάνω στο κανονικοποιημένο κείμενο (χωρίς σχόλια/εισαγωγικά, πεζά).
    if (/\bu&\s*["']/i.test(trimmed)) {
      return reply.code(400).send({ message: 'Το ερώτημα χρησιμοποιεί μη επιτρεπτή συνάρτηση' })
    }
    const norm = normalizeSql(trimmed)
    if (FORBIDDEN_COLUMNS.test(trimmed) || FORBIDDEN_COLUMNS.test(norm)) {
      return reply.code(400).send({ message: 'Το ερώτημα αναφέρεται σε προστατευμένες στήλες' })
    }
    // Το `*` θα έφερνε και τις προστατευμένες στήλες παρακάμπτοντας τον
    // παραπάνω έλεγχο, οπότε οι στήλες δηλώνονται ρητά.
    if (/\bselect\s+\*/i.test(trimmed) || /\bselect\s+\*/.test(norm)) {
      return reply.code(400).send({ message: 'Δήλωσε ρητά τις στήλες αντί για *' })
    }
    if (FORBIDDEN_FUNCTIONS.test(trimmed) || FORBIDDEN_FUNCTIONS.test(norm)
        || (USERS_TABLE.test(norm) && FORBIDDEN_WITH_USERS.test(norm))) {
      return reply.code(400).send({ message: 'Το ερώτημα χρησιμοποιεί μη επιτρεπτή συνάρτηση' })
    }

    // Το όριο γραμμών ισχύει πάντα: ένα `LIMIT 1000000` (ή ένα LIMIT μέσα σε
    // υποερώτημα) παρέκαμπτε τον έλεγχο «υπάρχει ήδη LIMIT».
    // Αλλαγές γραμμής γύρω από το ερώτημα: ένα τελικό σχόλιο `-- …` δεν
    // «τρώει» την παρένθεση και το LIMIT.
    const limited = `SELECT * FROM (\n${trimmed}\n) AS admin_q LIMIT ${MAX_ROWS}`

    const start = Date.now()
    try {
      // Μόνο ανάγνωση ΣΤΗ ΒΑΣΗ, όχι μόνο στον έλεγχο του κειμένου: ένα
      // `WITH x AS (DELETE … RETURNING …) SELECT …` ή μια συνάρτηση που γράφει
      // απορρίπτονται από την ίδια την Postgres. Και όριο χρόνου, ώστε ένα
      // βαρύ ερώτημα να μην κρατά τη βάση.
      const rows = await queryClient().$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
        await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '10s'")
        return tx.$queryRawUnsafe(limited)
      }, { timeout: 15000, maxWait: 5000 })
      const duration = Date.now() - start
      const list = Array.isArray(rows) ? rows : [rows]
      await audit(req, {
        action: 'admin_query', resource: 'database',
        metadata: { sql: trimmed.slice(0, 500), rows: list.length, duration },
      })
      return {
        rows: scrub(list),
        rowCount: list.length,
        duration,
      }
    } catch (err: any) {
      // Το μήνυμα της Postgres μπορεί να περιέχει τιμές από τη βάση (π.χ.
      // «invalid input syntax … "<τιμή>"» με ένα CAST). Προς τον client: γενικό
      // μήνυμα + ο κωδικός SQLSTATE. Το πλήρες μένει στο audit.
      const sqlstate = String(err?.meta?.code ?? err?.code ?? '').slice(0, 10) || null
      await audit(req, {
        action: 'admin_query', resource: 'database', outcome: 'failure',
        metadata: { sql: trimmed.slice(0, 500), error: String(err?.message ?? err).slice(0, 500), sqlstate },
      })
      return reply.code(400).send({ message: 'Το ερώτημα απέτυχε', code: sqlstate })
    }
  })
  // POST /admin/email — send custom email to one user or broadcast to a role group
  //
  // ΣΥΓΚΑΤΑΘΕΣΗ (GDPR άρθρο 6/7, ν. 3471/2006 άρθρο 11)
  //   Η μαζική αποστολή πήγαινε σε ΚΑΘΕ λογαριασμό του ρόλου, χωρίς να κοιτάζει
  //   τη συγκατάθεση «marketing» και χωρίς σύνδεσμο απεγγραφής. Τώρα:
  //     · default = εμπορική επικοινωνία: μόνο όσοι έχουν τελευταία
  //       συγκατάθεση marketing = true, με κείμενο/σύνδεσμο απεγγραφής και
  //       κεφαλίδα List-Unsubscribe.
  //     · `transactional: true` = υπηρεσιακό μήνυμα (όροι, ασφάλεια, διακοπή
  //       λειτουργίας): σε όλους, χωρίς απεγγραφή. Ο διαχειριστής το επιλέγει ρητά.
  //     · ποτέ σε λογαριασμό με εκκρεμές αίτημα διαγραφής.
  //     · αποστολή σε παρτίδες (Resend /emails/batch) με μικρή παύση, ώστε να
  //       μη χτυπά το όριο ρυθμού και να μη χάνονται παραλήπτες.
  // Συγκατάθεση «Ενημερωτικά email»: μετρά ΜΟΝΟ εγγραφή marketing = true που
  // δημιουργήθηκε από αυτή τη στιγμή και μετά. ΠΡΙΝ, το πεδίο `marketing` του
  // user_consents σήμαινε «cookies διαφήμισης» (banner cookies), όχι
  // συγκατάθεση για email — δεν αποτελεί έγκυρη συγκατάθεση για newsletter.
  const NEWSLETTER_CONSENT_SINCE = new Date('2026-10-21T00:00:00Z')
  app.post('/email', async (req: any, reply) => {
    const { to_email, to_role, subject, body } = req.body as any
    const transactional = (req.body as any)?.transactional === true
    if (!subject || !body || typeof subject !== 'string' || typeof body !== 'string') {
      return reply.code(400).send({ message: 'Λείπουν θέμα ή περιεχόμενο' })
    }
    if (!to_email && !to_role) return reply.code(400).send({ message: 'Δώσε email παραλήπτη ή ρόλο ομάδας' })
    if (to_role && !['all', 'user', 'service_provider', 'both', 'admin'].includes(to_role)) {
      return reply.code(400).send({ message: 'Μη έγκυρη τιμή' })
    }

    const apiKey = process.env.RESEND_API_KEY
    const from = process.env.RESEND_FROM_EMAIL || 'GlobiPet <onboarding@resend.dev>'
    if (!apiKey) return reply.code(500).send({ message: 'RESEND_API_KEY δεν έχει οριστεί στο Railway' })

    // Θέμα: απλό κείμενο σε μία γραμμή (χωρίς CR/LF). Σώμα: διαφυγή HTML,
    // οι αλλαγές γραμμής γίνονται <br/>.
    const cleanSubject = subject.replace(/[\r\n]+/g, ' ').trim().slice(0, 300)
    const safeBody = escHtml(body).replace(/\r?\n/g, '<br/>')
    const prefsUrl = `${process.env.FRONTEND_URL || 'https://globipet.com'}/cookies`

    type Rcpt = { email: string; lang: string }
    let recipients: Rcpt[] = []

    if (to_email) {
      const email = String(to_email).trim().toLowerCase()
      const u = await prisma.user.findUnique({ where: { email }, select: { id: true, preferred_language: true } })
      const pendingDeletion = u
        ? await prisma.accountDeletionRequest.count({ where: { user_id: u.id, status: { in: ['pending', 'executing'] } } })
        : 0
      if (!pendingDeletion) recipients = [{ email, lang: u?.preferred_language || 'el' }]
    } else if (to_role) {
      const role = to_role === 'all' ? null : String(to_role)
      // Τελευταία εγγραφή συγκατάθεσης ανά χρήστη (κάθε αλλαγή είναι νέα γραμμή).
      const rows = await prisma.$queryRaw<{ email: string; preferred_language: string | null }[]>`
        SELECT u.email, u.preferred_language
          FROM users u
          LEFT JOIN LATERAL (
            SELECT c.marketing, c.created_at FROM user_consents c
             WHERE c.user_id = u.id
             ORDER BY c.created_at DESC
             LIMIT 1
          ) lc ON true
         WHERE (${role}::text IS NULL OR u.role = ${role})
           AND (${transactional}::boolean
                OR (lc.marketing IS TRUE AND lc.created_at >= ${NEWSLETTER_CONSENT_SINCE}))
           AND NOT EXISTS (
             SELECT 1 FROM account_deletion_requests d
              WHERE d.user_id = u.id AND d.status IN ('pending', 'executing'))`
      recipients = rows.map(r => ({ email: r.email, lang: r.preferred_language || 'el' }))
    }

    if (recipients.length === 0) {
      return reply.code(404).send({ message: 'Δεν βρέθηκαν παραλήπτες' })
    }

    const htmlFor = (lang: string) => {
      const l = (['el', 'en', 'es', 'fr', 'zh'].includes(lang.slice(0, 2)) ? lang.slice(0, 2) : 'el') as keyof typeof UNSUB
      const footer = transactional ? '' : `
      <p style="color:#999;font-size:11px;text-align:center;margin-top:8px;">${UNSUB[l].text}
        <a href="${escHtml(prefsUrl)}" style="color:#999;">${UNSUB[l].link}</a></p>`
      return `<!DOCTYPE html><html lang="${l}"><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;">
      <div style="background:#E65100;padding:20px 24px;border-radius:12px 12px 0 0;">
        <span style="color:#fff;font-size:18px;font-weight:800;">🐾 globipet</span>
      </div>
      <div style="background:#fff;padding:28px 24px;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px;">
        ${safeBody}
      </div>
      <p style="color:#999;font-size:11px;text-align:center;margin-top:16px;">GlobiPet · globipet.com</p>${footer}
    </body></html>`
    }
    const headers = transactional ? undefined : { 'List-Unsubscribe': `<${prefsUrl}>` }

    // Resend batch: έως 100 μηνύματα ανά κλήση. Παύση ανάμεσα στις κλήσεις
    // για το όριο ρυθμού (2 αιτήματα/δευτ. στο βασικό πακέτο).
    const BATCH = 100
    let sent = 0
    let failed = 0
    for (let i = 0; i < recipients.length; i += BATCH) {
      const batch = recipients.slice(i, i + BATCH)
      try {
        const res = await fetch('https://api.resend.com/emails/batch', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(batch.map(r => ({
            from, to: r.email, subject: cleanSubject, html: htmlFor(r.lang), ...(headers ? { headers } : {}),
          }))),
        })
        if (res.ok) sent += batch.length
        else { failed += batch.length; console.error('[admin/email] Resend', res.status, (await res.text()).slice(0, 300)) }
      } catch (err: any) {
        failed += batch.length
        console.error('[admin/email] send failed:', err?.message)
      }
      if (i + BATCH < recipients.length) await new Promise(r => setTimeout(r, 600))
    }

    await audit(req, {
      action: 'admin_email', resource: 'email',
      metadata: { to_role: to_role ?? null, single: !!to_email, transactional, recipients: recipients.length, sent, failed },
    })

    return reply.send({
      ok: true,
      recipients_count: recipients.length,
      sent,
      failed,
      transactional,
      message: `Εστάλη σε ${sent} από ${recipients.length} παραλήπτες${failed > 0 ? ` (${failed} απέτυχαν)` : ''}`,
    })
  })

  // GET /admin/users/search — search users for the email composer autocomplete

  // ─── Αιτήσεις επαλήθευσης παρόχων ──────────────────────────────────

  app.get('/verifications', async (req: any) => {
    const { status } = req.query ?? {}
    const rows = await prisma.providerVerificationRequest.findMany({
      where: status ? { status } : {},
      orderBy: [{ status: 'asc' }, { created_at: 'desc' }],
      take: 200,
    })
    const pending = await prisma.providerVerificationRequest.count({ where: { status: 'pending' } })
    // Το ΑΦΜ αποθηκεύεται κρυπτογραφημένο· ο διαχειριστής πρέπει να το δει.
    const data = rows.map(r => ({ ...r, tax_number: r.tax_number ? decryptField(r.tax_number) : null }))
    return { data, pending }
  })

  /**
   * Έγκριση ή απόρριψη.
   *
   * Η έγκριση σημαδεύει και τις υπηρεσίες του παρόχου ως επαληθευμένες —
   * αυτό είναι το σήμα που βλέπει ο πελάτης, όχι η ίδια η αίτηση.
   */
  app.patch('/verifications/:id', async (req: any, reply) => {
    const { status, review_notes } = (req.body ?? {}) as any
    if (!['approved', 'rejected'].includes(status)) {
      return reply.code(400).send({ message: 'Η κατάσταση πρέπει να είναι approved ή rejected' })
    }
    const existing = await prisma.providerVerificationRequest.findUnique({ where: { id: req.params.id } })
    if (!existing) return reply.code(404).send({ message: 'Η αίτηση δεν βρέθηκε' })

    const updated = await prisma.providerVerificationRequest.update({
      where: { id: existing.id },
      data: {
        status,
        review_notes: review_notes ? String(review_notes).slice(0, 2000) : null,
        reviewed_by: (req.user as any).email,
        reviewed_at: new Date(),
      },
    })

    if (status === 'approved') {
      await prisma.service.updateMany({
        where: { provider_email: existing.user_email },
        data: { is_verified: true },
      })
      const nLang = await langOfUser(existing.user_email)
      await prisma.notification.create({
        data: {
          user_email: existing.user_email,
          title: notifyTitle('verification_approved', nLang),
          message: notifyMsg.verificationApproved(nLang),
          type: 'verification',
          link: '/provider',
        },
      }).catch(() => {})
      void sendPushToUser(existing.user_email, {
        title: 'Ο λογαριασμός σου επαληθεύτηκε',
        body: 'Οι υπηρεσίες σου εμφανίζονται πλέον με σήμα επαλήθευσης.',
        url: '/provider',
      })
    } else {
      const nLang = await langOfUser(existing.user_email)
      await prisma.notification.create({
        data: {
          user_email: existing.user_email,
          title: notifyTitle('verification_rejected', nLang),
          // Ο λόγος φτάνει στον πάροχο, ώστε να ξέρει τι να διορθώσει.
          message: review_notes || notifyMsg.verificationRejected(nLang),
          type: 'verification',
          link: '/provider',
        },
      }).catch(() => {})
    }

    return { data: updated }
  })

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