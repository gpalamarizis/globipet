import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'

/**
 * User Rights router — GDPR Άρθρα 15-22
 *
 *   GET   /user-rights/export          Άρθρο 15/20 — πλήρες export σε JSON
 *   POST  /user-rights/delete-request  Άρθρο 17 — αίτημα διαγραφής (30 μέρες περίοδος χάριτος)
 *   POST  /user-rights/cancel-delete   ακύρωση εντός της περιόδου χάριτος
 *   GET   /user-rights/delete-status   κατάσταση αιτήματος
 *   PATCH /user-rights/rectify         Άρθρο 16 — διόρθωση στοιχείων
 *
 * ΣΗΜΑΝΤΙΚΟ ΓΙΑ ΤΗ ΣΥΝΤΗΡΗΣΗ
 * Στο σχήμα, τα δεδομένα του χρήστη ΔΕΝ συνδέονται με user_id αλλά με το
 * email του, σε 34 διαφορετικά μοντέλα. Ο πίνακας EXPORT_MAP παρακάτω είναι
 * η μοναδική πηγή αλήθειας: κάθε νέο μοντέλο που κρατά email χρήστη ΠΡΕΠΕΙ
 * να προστεθεί εκεί, αλλιώς το export θα είναι ελλιπές (παράβαση άρθρου 15).
 */

type ExportEntry = { key: string; accessor: string; field: string }

/** Ομάδα → μοντέλα. Τα accessor/field έχουν επαληθευτεί έναντι του schema.prisma. */
const EXPORT_MAP: Record<string, ExportEntry[]> = {
  pets_and_health: [
    { key: 'pets',                  accessor: 'pet',                  field: 'owner_email' },
    { key: 'health_records',        accessor: 'healthRecord',         field: 'owner_email' },
    { key: 'vaccinations',          accessor: 'vaccination',          field: 'owner_email' },
    { key: 'pet_locations',         accessor: 'petLocation',          field: 'owner_email' },
    { key: 'pedigrees',             accessor: 'petPedigree',          field: 'owner_email' },
    { key: 'travel_documents',      accessor: 'petTravelDocument',    field: 'owner_email' },
    { key: 'medications',           accessor: 'petMedication',        field: 'owner_email' },
    { key: 'lab_results',           accessor: 'petLabResult',         field: 'owner_email' },
    { key: 'imaging',               accessor: 'petImaging',           field: 'owner_email' },
    { key: 'surgeries',             accessor: 'petSurgery',           field: 'owner_email' },
    { key: 'allergies',             accessor: 'petAllergy',           field: 'owner_email' },
    { key: 'chronic_conditions',    accessor: 'petChronicCondition',  field: 'owner_email' },
    { key: 'dental_records',        accessor: 'petDentalRecord',      field: 'owner_email' },
    { key: 'weight_records',        accessor: 'petWeightRecord',      field: 'owner_email' },
    { key: 'genetic_tests',         accessor: 'petGeneticTest',       field: 'owner_email' },
    { key: 'vital_signs',           accessor: 'petVitalSigns',        field: 'owner_email' },
    { key: 'passport_access',       accessor: 'petPassportAccess',    field: 'owner_email' },
  ],
  transactions: [
    { key: 'bookings',              accessor: 'booking',              field: 'customer_email' },
    { key: 'orders',                accessor: 'order',                field: 'user_email' },
    { key: 'cart_items',            accessor: 'cartItem',             field: 'user_email' },
    { key: 'wishlist',              accessor: 'wishlist',             field: 'user_email' },
    { key: 'loyalty_points',        accessor: 'loyaltyPoints',        field: 'user_email' },
    { key: 'telehealth',            accessor: 'telehealthConsultation', field: 'client_email' },
  ],
  community: [
    { key: 'posts',                 accessor: 'post',                 field: 'author_email' },
    { key: 'reviews',               accessor: 'review',               field: 'customer_email' },
    { key: 'forum_topics',          accessor: 'forumTopic',           field: 'author_email' },
    { key: 'communities_created',   accessor: 'community',            field: 'creator_email' },
    { key: 'community_memberships', accessor: 'communityMember',      field: 'user_email' },
    { key: 'community_messages',    accessor: 'communityMessage',     field: 'author_email' },
    { key: 'playdates_created',     accessor: 'playdateEvent',        field: 'creator_email' },
    { key: 'playdate_invitations',  accessor: 'playdateInvitation',   field: 'invitee_email' },
    { key: 'events_organized',      accessor: 'event',                field: 'organizer_email' },
  ],
  provider_data: [
    { key: 'services_offered',      accessor: 'service',              field: 'provider_email' },
    { key: 'products_offered',      accessor: 'product',              field: 'provider_email' },
  ],
  system: [
    { key: 'notifications',         accessor: 'notification',         field: 'user_email' },
  ],
}

/** Πεδία του User που επιστρέφονται στο export (επαληθευμένα έναντι schema). */
const USER_SELECT = {
  id: true, email: true, full_name: true, phone: true, address: true,
  city: true, country: true, bio: true, website: true,
  profile_photo: true, role: true, preferred_language: true,
  is_verified: true, latitude: true, longitude: true,
  loyalty_tier: true, total_points: true,
  ai_subscription_status: true, ai_trial_started_at: true, ai_subscription_plan_id: true,
  created_at: true, updated_at: true,
} as const

/** Πεδία που ο χρήστης μπορεί να διορθώσει μόνος του (Άρθρο 16). */
const RECTIFIABLE = [
  'full_name', 'phone', 'address', 'city', 'country',
  'bio', 'website', 'profile_photo', 'preferred_language',
] as const

const userRightsRoutes: FastifyPluginAsync = async (app) => {

  app.addHook('preHandler', async (req: any, reply: any) => {
    try {
      await (app as any).authenticate(req, reply)
    } catch {
      return reply.code(401).send({ message: 'Μη εξουσιοδοτημένος' })
    }
  })

  // ─── GET /user-rights/export ─────────────────────────────────────────
  app.get('/export', async (req: any, reply) => {
    const userId = (req.user as any).id
    const email  = (req.user as any).email

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    })
    if (!user) return reply.code(404).send({ message: 'Ο χρήστης δεν βρέθηκε' })

    // Χρησιμοποιούμε το email ΤΗΣ ΒΑΣΗΣ, όχι του token — αν άλλαξε, το token
    // μπορεί να κρατά παλιό email και το export θα έβγαινε ελλιπές.
    const key = user.email || email

    const data: Record<string, any> = {}
    const problems: string[] = []

    for (const [group, entries] of Object.entries(EXPORT_MAP)) {
      data[group] = {}
      for (const e of entries) {
        const model = (prisma as any)[e.accessor]
        if (!model || typeof model.findMany !== 'function') {
          // Δεν σιωπούμε: αν λείπει μοντέλο, καταγράφεται στην απάντηση.
          problems.push(`${e.accessor}: άγνωστο μοντέλο`)
          data[group][e.key] = []
          continue
        }
        try {
          data[group][e.key] = await model.findMany({ where: { [e.field]: key } })
        } catch (err: any) {
          problems.push(`${e.accessor}.${e.field}: ${err?.message?.slice(0, 120)}`)
          data[group][e.key] = []
        }
      }
    }

    // Συναινέσεις και αιτήματα διαγραφής (συνδέονται με user_id)
    try {
      data.consent_history = await prisma.userConsent.findMany({
        where: { user_id: userId }, orderBy: { created_at: 'desc' },
      })
    } catch (err: any) { problems.push('userConsent: ' + err?.message?.slice(0, 120)) }

    try {
      data.deletion_requests = await prisma.accountDeletionRequest.findMany({
        where: { user_id: userId }, orderBy: { created_at: 'desc' },
      })
    } catch (err: any) { problems.push('accountDeletionRequest: ' + err?.message?.slice(0, 120)) }

    // Αν κάτι απέτυχε, το γράφουμε ΚΑΙ στα logs — ώστε να μη μείνει κρυφό.
    if (problems.length) {
      req.log?.error({ problems }, 'GDPR export: ελλιπή δεδομένα')
      console.error('[gdpr-export] ΠΡΟΒΛΗΜΑΤΑ:', problems)
    }

    const payload = {
      export_generated_at: new Date().toISOString(),
      export_version: '2.0',
      gdpr_articles: ['Άρθρο 15 (πρόσβαση)', 'Άρθρο 20 (φορητότητα)'],
      controller: 'OB.AN ΜΟΝΟΠΡΟΣΩΠΗ Ι.Κ.Ε. (GlobiPet)',
      account: user,
      ...data,
      _completeness: problems.length
        ? { complete: false, issues: problems }
        : { complete: true },
    }

    reply.header('Content-Type', 'application/json; charset=utf-8')
    reply.header('Content-Disposition',
      `attachment; filename="globipet-data-export-${userId}-${Date.now()}.json"`)
    return payload
  })

  // ─── POST /user-rights/delete-request ────────────────────────────────
  app.post('/delete-request', async (req: any, reply) => {
    const userId = (req.user as any).id
    const { reason } = (req.body || {}) as any

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

    return {
      data: {
        request_id: request.id,
        scheduled_for: scheduledFor,
        grace_period_days: 30,
        message: 'Το αίτημα καταχωρήθηκε. Ο λογαριασμός σου θα διαγραφεί οριστικά σε 30 μέρες. Μπορείς να ακυρώσεις οποτεδήποτε.',
      },
    }
  })

  // ─── POST /user-rights/cancel-delete ─────────────────────────────────
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
    return { message: 'Το αίτημα διαγραφής ακυρώθηκε' }
  })

  // ─── GET /user-rights/delete-status ──────────────────────────────────
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

  // ─── PATCH /user-rights/rectify ──────────────────────────────────────
  app.patch('/rectify', async (req: any, reply) => {
    const userId = (req.user as any).id
    const body = req.body ?? {}
    const data: any = {}
    for (const f of RECTIFIABLE) if (f in body) data[f] = body[f]

    if (Object.keys(data).length === 0) {
      return reply.code(400).send({
        message: 'Κανένα επιτρεπόμενο πεδίο για ενημέρωση',
        allowed: RECTIFIABLE,
      })
    }
    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: USER_SELECT,
    })
    return { data: updated }
  })
}

export default userRightsRoutes
