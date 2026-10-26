import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { decryptUserFields, encryptField, decryptField } from '../lib/crypto.js'
import { audit } from '../lib/audit.js'
import { parseBody } from '../lib/validate.js'
import { profileSchema } from './users.js'

/**
 * Διεύθυνση αποστολής παραγγελίας: τα πεδία του ανθρώπου αποθηκεύονται
 * κρυπτογραφημένα (orders.ts encryptAddress). Ίδια λίστα και ίδια λογική με
 * το decryptAddress του orders.ts — εκεί δεν εξάγεται, γι' αυτό αντίγραφο.
 */
const ADDRESS_PII = ['full_name', 'phone', 'street', 'address', 'city', 'postal_code', 'notes'] as const
function decryptAddress(addr: any): any {
  if (!addr || typeof addr !== 'object') return addr
  const out: any = { ...addr }
  for (const k of ADDRESS_PII) {
    if (out[k]) out[k] = decryptField(String(out[k]))
  }
  return out
}

/**
 * User Rights router — GDPR Articles 15-22
 *
 * Endpoints:
 *   GET  /user-rights/export         — Article 15/20: full data export as JSON
 *   POST /user-rights/delete-request — Article 17: request account deletion (30-day grace period)
 *   POST /user-rights/cancel-delete  — cancel pending deletion during grace period
 *   PATCH /user-rights/rectify       — Article 16: user can correct their own profile fields
 *   GET  /user-rights/delete-status  — check whether user has a pending deletion request
 *
 * OWNERSHIP COLUMNS
 *   This codebase keys most user-owned rows by email, not by user id:
 *     Pet.owner_email, Booking.customer_email, Order.user_email,
 *     Post.author_email, Review.customer_email, HealthRecord.owner_email,
 *     Vaccination.owner_email, TelehealthConsultation.client_email.
 *   Only UserConsent and AccountDeletionRequest use user_id.
 *
 *   An earlier version of this file queried owner_id / user_id everywhere and
 *   wrapped each call in `.catch(() => [])`, so the export silently returned
 *   empty arrays — and the User select referenced a non-existent `avatar_url`
 *   column, which made the endpoint fail outright. Both are fixed here, and
 *   the catches are gone so a future schema change fails loudly instead of
 *   quietly handing the user an empty file.
 */
/** Ε16: ανώτατο πλήθος γραμμών audit στην εξαγωγή (οι πιο πρόσφατες). */
const AUDIT_EXPORT_MAX = 20_000

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
/** Κάθε email ΤΡΙΤΟΥ μέσα σε κείμενο/αντικείμενο → '[redacted]'· το δικό του μένει. */
function redactForeignEmails(v: any, own: string, depth = 0): any {
  if (depth > 8) return null
  if (typeof v === 'string') return v.replace(EMAIL_RE, m => (m.toLowerCase() === own ? m : '[redacted]'))
  if (Array.isArray(v)) return v.map(x => redactForeignEmails(x, own, depth + 1))
  if (v && typeof v === 'object') {
    const out: any = {}
    for (const [k, x] of Object.entries(v)) out[k] = redactForeignEmails(x, own, depth + 1)
    return out
  }
  return v
}

/**
 * Ε16: γραμμή audit για την εξαγωγή. Τα στοιχεία ΑΛΛΩΝ προσώπων δεν φεύγουν:
 *   · actor άλλος (π.χ. διαχειριστής που ενήργησε στον λογαριασμό) → χωρίς
 *     id/email/IP/user agent του — μένει μόνο ο ρόλος του.
 *   · subject άλλος (ο χρήστης ενήργησε σε τρίτον) → χωρίς το email του τρίτου.
 *   · κάθε άλλο email μέσα σε metadata / error_message / path → '[redacted]'.
 */
function redactAuditRow(r: any, userId: string, email: string) {
  const own = email.toLowerCase()
  const actorIsMe = r.actor_id === userId || (typeof r.actor_email === 'string' && r.actor_email.toLowerCase() === own)
  const subjectIsMe = typeof r.subject_email === 'string' && r.subject_email.toLowerCase() === own
  return {
    id: r.id,
    created_at: r.created_at,
    action: r.action,
    resource: r.resource,
    resource_id: r.resource_id,
    outcome: r.outcome,
    status_code: r.status_code,
    method: r.method,
    path: typeof r.path === 'string' ? redactForeignEmails(r.path, own) : r.path,
    actor_role: r.actor_role,
    actor_is_me: actorIsMe,
    actor_email: actorIsMe ? r.actor_email : null,
    ip: actorIsMe ? r.ip : null,
    user_agent: actorIsMe ? r.user_agent : null,
    subject_email: subjectIsMe ? r.subject_email : (r.subject_email ? '[redacted]' : null),
    error_message: typeof r.error_message === 'string' ? redactForeignEmails(r.error_message, own) : r.error_message,
    metadata: r.metadata == null ? null : redactForeignEmails(r.metadata, own),
  }
}

const userRightsRoutes: FastifyPluginAsync = async (app) => {

  // All endpoints require auth
  app.addHook('preHandler', async (req: any, reply: any) => {
    try {
      await (app as any).authenticate(req, reply)
    } catch {
      return reply.code(401).send({ message: 'Μη εξουσιοδοτημένος' })
    }
  })

  // ─── GET /user-rights/export ────────────────────────
  // Returns everything we have on the user in machine-readable JSON.
  // Serves Article 15 (right of access) and Article 20 (right to data portability).
  app.get('/export', async (req: any, reply) => {
    const userId = (req.user as any).id
    const email = (req.user as any).email

    // ΠΛΗΡΗΣ εξαγωγή (άρθρο 15/20). Πριν έλειπαν τα περισσότερα ιατρικά, η
    // κοινότητα, το καλάθι, οι συνδρομές κ.ά. Κάθε ερώτημα φιλτράρει ΜΟΝΟ με
    // το email/id του ίδιου χρήστη, και ποτέ δεν επιστρέφει hashes/tokens:
    // ρητό select όπου ο πίνακας έχει τέτοια πεδία (tracker, ημερολόγιο, push).
    const byOwner = { where: { owner_email: email } }
    const [
      user, pets, bookings, orders, posts, reviews, notifications,
      healthRecords, vaccinations, telehealth, consents, deletionRequests,
      medications, allergies, labResults, imaging, surgeries, chronicConditions,
      dentalRecords, weightRecords, geneticTests, vitalSigns, travelDocuments, pedigrees,
      passportAccessGranted, passportAccessReceived, petLocations, petTrackers,
      forumTopics, forumReplies, postComments, postLikes,
      communityMemberships, communityMessages, communitiesCreated,
      playdatesCreated, playdateInvitations, eventRegistrations, eventsOrganized,
      cartItems, wishlist, loyalty, productSubscriptions, insuranceSubscriptions,
      calendarConnections, contactMessages, providerMessages, verificationRequests,
      pushSubscriptions, staffProfiles, services, products,
      customerNotes, campaignAudience, auditLogs, providerBookings, providerTelehealth,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, email: true, full_name: true, phone: true, address: true,
          role: true, preferred_language: true, profile_photo: true,
          city: true, country: true, bio: true, website: true,
          birth_date: true, latitude: true, longitude: true,
          loyalty_tier: true, total_points: true, is_verified: true,
          ai_subscription_status: true, ai_trial_started_at: true, ai_subscription_plan_id: true,
          created_at: true, updated_at: true,
        },
      }),
      prisma.pet.findMany({ where: { owner_email: email } }),
      prisma.booking.findMany({ where: { customer_email: email } }),
      prisma.order.findMany({ where: { user_email: email } }),
      prisma.post.findMany({ where: { author_email: email } }),
      prisma.review.findMany({ where: { customer_email: email } }),
      prisma.notification.findMany({ where: { user_email: email } }),
      prisma.healthRecord.findMany({ where: { owner_email: email } }),
      prisma.vaccination.findMany({ where: { owner_email: email } }),
      prisma.telehealthConsultation.findMany({ where: { client_email: email } }),
      prisma.userConsent.findMany({ where: { user_id: userId } }),
      prisma.accountDeletionRequest.findMany({ where: { user_id: userId } }),
      // Ιατρικός φάκελος
      prisma.petMedication.findMany(byOwner),
      prisma.petAllergy.findMany(byOwner),
      prisma.petLabResult.findMany(byOwner),
      prisma.petImaging.findMany(byOwner),
      prisma.petSurgery.findMany(byOwner),
      prisma.petChronicCondition.findMany(byOwner),
      prisma.petDentalRecord.findMany(byOwner),
      prisma.petWeightRecord.findMany(byOwner),
      prisma.petGeneticTest.findMany(byOwner),
      prisma.petVitalSigns.findMany(byOwner),
      prisma.petTravelDocument.findMany(byOwner),
      prisma.petPedigree.findMany(byOwner),
      // Πρόσβαση στο διαβατήριο: όσες έδωσα (ιδιοκτήτης) και όσες έλαβα (κτηνίατρος).
      prisma.petPassportAccess.findMany(byOwner),
      // Ε16: χωρίς διάκριση πεζών/κεφαλαίων — το email το πληκτρολόγησε ο ιδιοκτήτης.
      prisma.petPassportAccess.findMany({ where: { provider_email: { equals: email, mode: 'insensitive' } } }),
      prisma.petLocation.findMany(byOwner),
      prisma.petTracker.findMany({
        where: { owner_email: email },
        // Χωρίς device_token: είναι το μυστικό της συσκευής, όχι δεδομένο του χρήστη.
        select: {
          id: true, pet_id: true, device_id: true, name: true, brand: true, model: true,
          battery_percent: true, signal_strength: true, last_seen_at: true,
          is_active: true, created_at: true, updated_at: true,
        },
      }),
      // Κοινότητα
      prisma.forumTopic.findMany({ where: { author_email: email } }),
      prisma.forumReply.findMany({ where: { author_email: email } }),
      prisma.postComment.findMany({ where: { author_email: email } }),
      prisma.postLike.findMany({ where: { user_email: email } }),
      prisma.communityMember.findMany({ where: { user_email: email } }),
      prisma.communityMessage.findMany({ where: { author_email: email } }),
      prisma.community.findMany({ where: { creator_email: email } }),
      // Βόλτες: όσες οργάνωσα (χωρίς τα στοιχεία των συμμετεχόντων — είναι
      // δεδομένα τρίτων) και οι δικές μου προσκλήσεις/συμμετοχές.
      prisma.playdateEvent.findMany({ where: { creator_email: email } }),
      prisma.playdateInvitation.findMany({ where: { invitee_email: email } }),
      prisma.eventRegistration.findMany({ where: { user_email: email } }),
      prisma.event.findMany({ where: { organizer_email: email } }),
      // Αγορές
      prisma.cartItem.findMany({ where: { user_email: email } }),
      prisma.wishlist.findMany({ where: { user_email: email } }),
      prisma.loyaltyPoints.findMany({ where: { user_email: email } }),
      prisma.productSubscription.findMany({ where: { user_id: userId } }),
      prisma.userInsuranceSubscription.findMany({ where: { user_id: userId } }),
      // Συνδέσεις ημερολογίου — ΧΩΡΙΣ access/refresh token.
      prisma.calendarConnection.findMany({
        where: { user_email: email },
        select: {
          id: true, provider: true, calendar_id: true, account_email: true, is_active: true,
          expires_at: true, last_synced_at: true, created_at: true, updated_at: true,
        },
      }),
      // Μηνύματα: φόρμα επικοινωνίας και μηνύματα παρόχου↔πελάτη όπου συμμετέχω.
      // Ε16: ΜΟΝΟ user_email (ο αποστολέας ήταν συνδεδεμένος). Το `email` της
      // φόρμας είναι ελεύθερο κείμενο: οποιοσδήποτε μπορούσε να γράψει εκεί το
      // email ενός άλλου και τα μηνύματά του θα κατέληγαν στην εξαγωγή εκείνου.
      prisma.contactMessage.findMany({ where: { user_email: email } }),
      prisma.provider_messages.findMany({ where: { OR: [{ customer_email: email }, { provider_email: email }] } }),
      prisma.providerVerificationRequest.findMany({ where: { user_email: email } }),
      // Συσκευές ειδοποιήσεων — ΧΩΡΙΣ token/endpoint/κλειδιά.
      prisma.pushSubscription.findMany({
        where: { user_id: userId },
        select: { id: true, platform: true, device_name: true, last_seen_at: true, created_at: true },
      }),
      (prisma as any).providerStaff.findMany({ where: { user_id: userId } }),
      prisma.service.findMany({ where: { provider_email: email } }),
      prisma.product.findMany({ where: { provider_email: email } }),
      // Ε16 — ό,τι έλειπε από την εξαγωγή:
      // Σημειώσεις παρόχων ΓΙΑ τον χρήστη (customer_notes.customer_email).
      prisma.customer_notes.findMany({ where: { customer_email: email } }),
      // Σε ποιο κοινό καμπάνιας ανήκει (campaign_audience.customer_email).
      prisma.campaign_audience.findMany({
        where: { customer_email: email },
        select: { id: true, campaign_id: true, customer_email: true, created_at: true },
      }),
      // Ημερολόγιο ελέγχου: ως actor ή ως subject (καθάρισμα τρίτων πιο κάτω).
      prisma.auditLog.findMany({
        where: { OR: [{ actor_id: userId }, { actor_email: email }, { subject_email: email }, { resource: 'user', resource_id: userId }] },
        orderBy: { created_at: 'desc' },
        take: AUDIT_EXPORT_MAX,
      }),
      // Ως πάροχος: κρατήσεις και τηλεσυμβουλευτικές όπου είμαι ο πάροχος.
      prisma.booking.findMany({ where: { provider_email: email } }),
      prisma.telehealthConsultation.findMany({ where: { provider_email: email } }),
    ])

    const payload = {
      export_generated_at: new Date().toISOString(),
      export_version: '1.3',
      gdpr_article: 'Article 15 / 20',
      user,
      pets,
      bookings,
      // Διεύθυνση αποστολής αποκρυπτογραφημένη (στη βάση είναι κρυπτογραφημένη).
      orders: orders.map(o => ({ ...o, shipping_address: decryptAddress(o.shipping_address) })),
      posts,
      reviews,
      notifications,
      health_records: healthRecords,
      vaccinations,
      telehealth_consultations: telehealth,
      consent_history: consents,
      deletion_requests: deletionRequests,
      medications,
      allergies,
      lab_results: labResults,
      imaging,
      surgeries,
      chronic_conditions: chronicConditions,
      dental_records: dentalRecords,
      weight_records: weightRecords,
      genetic_tests: geneticTests,
      vital_signs: vitalSigns,
      travel_documents: travelDocuments,
      pedigrees,
      passport_access_granted: passportAccessGranted,
      passport_access_received: passportAccessReceived,
      pet_locations: petLocations,
      pet_trackers: petTrackers,
      forum_topics: forumTopics,
      forum_replies: forumReplies,
      post_comments: postComments,
      post_likes: postLikes,
      community_memberships: communityMemberships,
      community_messages: communityMessages,
      communities_created: communitiesCreated,
      playdates_created: playdatesCreated,
      playdate_invitations: playdateInvitations,
      event_registrations: eventRegistrations,
      events_organized: eventsOrganized,
      cart: cartItems,
      wishlist,
      loyalty,
      product_subscriptions: productSubscriptions,
      insurance_subscriptions: insuranceSubscriptions,
      calendar_connections: calendarConnections,
      contact_messages: contactMessages,
      provider_messages: providerMessages,
      // ΑΦΜ αποκρυπτογραφημένο: είναι δικό του στοιχείο.
      provider_verification_requests: verificationRequests.map(v => ({
        ...v, tax_number: v.tax_number ? decryptField(v.tax_number) : null,
      })),
      push_devices: pushSubscriptions,
      staff_profiles: staffProfiles,
      services,
      products,
      customer_notes_about_me: customerNotes,
      campaign_audiences: campaignAudience,
      audit_logs: auditLogs.map(r => redactAuditRow(r, userId, email)),
      bookings_as_provider: providerBookings,
      telehealth_as_provider: providerTelehealth,
    }

    // Force download as JSON attachment
    reply.header('Content-Type', 'application/json; charset=utf-8')
    reply.header('Content-Disposition', `attachment; filename="globipet-data-export-${userId}-${Date.now()}.json"`)
    // Decrypt sensitive fields so the export is human-readable
    if (payload.user) decryptUserFields(payload.user as any)
    await audit(req, { action: 'data_export', resource: 'user', resource_id: userId })
    return payload
  })

  // ─── POST /user-rights/delete-request ────────────────
  // Soft-deletion with 30-day grace period. User can cancel until then.
  // After grace, cron job (see cron.ts) performs hard delete.
  app.post('/delete-request', async (req: any, reply) => {
    const userId = (req.user as any).id
    const { reason } = (req.body || {}) as any

    // Check whether user already has a pending request
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
        // Ε15: η τιμή 'under_age' είναι εσωτερική (auth.ts — κλείνει τον
        // λογαριασμό)· ελεύθερο κείμενο του χρήστη δεν την παίρνει ποτέ.
        reason: typeof reason === 'string' && reason.trim() !== '' && reason.trim() !== 'under_age' ? reason.slice(0, 500) : null,
        status: 'pending',
        scheduled_for: scheduledFor,
      },
    })

    await audit(req, { action: 'delete_request', resource: 'user', resource_id: userId, metadata: { scheduled_for: scheduledFor.toISOString(), request_id: request.id } })

    return {
      data: {
        request_id: request.id,
        scheduled_for: scheduledFor,
        grace_period_days: 30,
        message: 'Το αίτημα καταχωρήθηκε. Ο λογαριασμός σου θα διαγραφεί οριστικά σε 30 μέρες. Μπορείς να ακυρώσεις το αίτημα οποιαδήποτε στιγμή.',
      },
    }
  })

  // ─── POST /user-rights/cancel-delete ─────────────────
  app.post('/cancel-delete', async (req: any, reply) => {
    const userId = (req.user as any).id
    const pending = await prisma.accountDeletionRequest.findFirst({
      where: { user_id: userId, status: 'pending' },
    })
    if (!pending) {
      return reply.code(404).send({ message: 'Δεν βρέθηκε ενεργό αίτημα διαγραφής' })
    }
    // Ε16: αίτημα λόγω ηλικίας κάτω των 15 (auth.ts PATCH /me/birth-date) ΔΕΝ
    // ακυρώνεται από τον ίδιο — μόνο διαχειριστής (admin.ts, λάθος δήλωση).
    if (pending.reason === 'under_age') {
      await audit(req, { action: 'cancel_delete_request', resource: 'user', resource_id: userId, outcome: 'denied', metadata: { reason: 'under_age' } })
      return reply.code(403).send({ message: 'Το αίτημα διαγραφής λόγω ηλικίας ακυρώνεται μόνο από την υποστήριξη.' })
    }
    // Ατομικά, υπό συνθήκη: ένα αίτημα που μόλις έγινε under_age (ή εκτελείται) δεν ακυρώνεται.
    const done = await prisma.accountDeletionRequest.updateMany({
      where: { id: pending.id, status: 'pending', OR: [{ reason: null }, { reason: { not: 'under_age' } }] },
      data: { status: 'cancelled', cancelled_at: new Date() },
    })
    if (done.count === 0) {
      return reply.code(409).send({ message: 'Το αίτημα δεν είναι πλέον ενεργό' })
    }
    await audit(req, { action: 'cancel_delete_request', resource: 'user', resource_id: userId })
    return { message: 'Το αίτημα διαγραφής ακυρώθηκε' }
  })

  // ─── GET /user-rights/delete-status ──────────────────
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

  // ─── PATCH /user-rights/rectify ──────────────────────
  // Article 16 — user can update their own profile fields.
  // Whitelist prevents privilege escalation (no role/email/password changes here).
  app.patch('/rectify', async (req: any, reply) => {
    const userId = (req.user as any).id
    // Ε12: ίδιοι έλεγχοι τιμών με το PATCH /users/me (profileSchema): μήκη,
    // website μόνο http(s), profile_photo μόνο από το R2. Strip: άγνωστα
    // πεδία αγνοούνται, όπως με την παλιά λίστα.
    const body = parseBody(profileSchema.strip(), req.body, reply)
    if (!body) return
    // profile_photo is the real column; the old whitelist said avatar_url,
    // which does not exist and made the write fail.
    const allowed = ['full_name', 'phone', 'address', 'preferred_language', 'profile_photo', 'bio', 'city', 'country', 'website'] as const
    const data: any = {}
    for (const f of allowed) if ((body as any)[f] !== undefined) data[f] = (body as any)[f]
    if (Object.keys(data).length === 0) {
      return reply.code(400).send({ message: 'Κανένα επιτρεπόμενο πεδίο για ενημέρωση' })
    }
    // Encrypt sensitive fields before write
    if ('phone'   in data) data.phone   = encryptField(data.phone)
    if ('address' in data) data.address = encryptField(data.address)
    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true, full_name: true, phone: true, address: true,
        preferred_language: true, profile_photo: true,
        bio: true, city: true, country: true, website: true,
      },
    })
    decryptUserFields(updated as any)
    await audit(req, { action: 'rectify', resource: 'user', resource_id: userId, metadata: { fields: Object.keys(data) } })
    return { data: updated }
  })
}

export default userRightsRoutes
