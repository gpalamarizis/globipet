import cron from 'node-cron'
import { createHash } from 'crypto'
import { langOfUser, notifyTitle, notifyMsg } from './notifyText.js'
import prisma from './prisma.js'
import { auditSystem } from './audit.js'
import { broadcastToUser } from '../routes/notifications.js'
import { sendPushToUser } from './push.js'
import { resolveStuckBookingRefunds, resolveStuckTelehealthRefunds } from './cancellation.js'
import { resolveStuckEventRefunds } from '../routes/events.js'
import { deleteUserUploads } from './storage.js'
import { cancelAllStripeSubscriptionsOfUser, StripeCancelError, AI_SUB_ACTIVATED_ACTION } from './stripeSubscriptions.js'

export function startAiTrialExpiryCron() {
  // Runs once a day at 09:00 server time
  cron.schedule('0 9 * * *', async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

      const expiredTrialUsers = await prisma.user.findMany({
        where: {
          ai_subscription_status: 'trial',
          ai_trial_started_at: { lte: thirtyDaysAgo },
        },
        select: { id: true, email: true, full_name: true },
      })

      for (const user of expiredTrialUsers) {
        await prisma.user.update({
          where: { id: user.id },
          data: { ai_subscription_status: 'expired' },
        })

        const nLang = await langOfUser(user.email)
        const notification = await prisma.notification.create({
          data: {
            user_email: user.email,
            title: notifyTitle('ai_trial_expired', nLang),
            message: notifyMsg.aiTrialExpired(nLang),
            type: 'ai_trial_expired',
            link: '/pricing',
          },
        })

        // Live push is keyed by email, like every other broadcast call.
        // This passed user.id, so the trial-expiry notification was written
        // to the database but never reached an open browser.
        broadcastToUser(user.email, { type: 'notification', notification })
        void sendPushToUser(user.email, {
          title: notification.title, body: notification.message, url: notification.link ?? '/',
        })
      }

      if (expiredTrialUsers.length > 0) {
        console.log(`🐾 AI trial expiry check: ${expiredTrialUsers.length} χρήστες έληξε το trial τους`)
      }
    } catch (err) {
      console.error('AI trial expiry cron error:', err)
    }
  })
}

/* ═══════════════════════════════════════════════════════════════════════
   ΔΙΑΓΡΑΦΗ ΛΟΓΑΡΙΑΣΜΩΝ — GDPR Άρθρο 17
   ═══════════════════════════════════════════════════════════════════════
   Το /user-rights/delete-request δημιουργεί αίτημα με 30 μέρες περίοδο
   χάριτος. ΧΩΡΙΣ αυτό το cron τα αιτήματα δεν εκτελούνταν ποτέ.

   Επειδή τα δεδομένα συνδέονται με το email και όχι με user_id, η διαγραφή
   γίνεται ανά μοντέλο. Ο πίνακας DELETE_MAP πρέπει να μένει συγχρονισμένος
   με τον EXPORT_MAP στο user-rights.ts.
   ═══════════════════════════════════════════════════════════════════════ */

type DeleteEntry = { accessor: string; field: string }

/** Μοντέλα που διαγράφονται. Επαληθευμένα έναντι schema.prisma. */
const DELETE_MAP: DeleteEntry[] = [
  // Ζώα και ιατρικά — τα πιο ευαίσθητα, φεύγουν πρώτα
  { accessor: 'petVitalSigns',        field: 'owner_email' },
  { accessor: 'petGeneticTest',       field: 'owner_email' },
  { accessor: 'petWeightRecord',      field: 'owner_email' },
  { accessor: 'petDentalRecord',      field: 'owner_email' },
  { accessor: 'petChronicCondition',  field: 'owner_email' },
  { accessor: 'petAllergy',           field: 'owner_email' },
  { accessor: 'petSurgery',           field: 'owner_email' },
  { accessor: 'petImaging',           field: 'owner_email' },
  { accessor: 'petLabResult',         field: 'owner_email' },
  { accessor: 'petMedication',        field: 'owner_email' },
  { accessor: 'petTravelDocument',    field: 'owner_email' },
  { accessor: 'petPedigree',          field: 'owner_email' },
  { accessor: 'petPassportAccess',    field: 'owner_email' },
  { accessor: 'petLocation',          field: 'owner_email' },
  { accessor: 'vaccination',          field: 'owner_email' },
  { accessor: 'healthRecord',         field: 'owner_email' },
  // Κοινότητα
  { accessor: 'communityMessage',     field: 'author_email' },
  { accessor: 'communityMember',      field: 'user_email' },
  { accessor: 'playdateInvitation',   field: 'invitee_email' },
  { accessor: 'forumTopic',           field: 'author_email' },
  { accessor: 'post',                 field: 'author_email' },
  // Καλάθι και επιθυμίες — καθαρά προσωπικά, χωρίς λογιστική αξία
  { accessor: 'cartItem',             field: 'user_email' },
  { accessor: 'wishlist',             field: 'user_email' },
  { accessor: 'loyaltyPoints',        field: 'user_email' },
  { accessor: 'notification',         field: 'user_email' },
  // Τα ζώα τελευταία, γιατί τα ιατρικά δείχνουν σε αυτά
  { accessor: 'pet',                  field: 'owner_email' },

  // ── Προστέθηκαν μετά τον αρχικό χάρτη ──────────────────────────────
  // Κάθε νέος πίνακας με προσωπικά δεδομένα πρέπει να μπει εδώ ή στον
  // ANONYMIZE_MAP. Ένα άρθρο 17 που ξεχνά πίνακες δεν είναι διαγραφή.
  { accessor: 'postLike',             field: 'user_email' },
  { accessor: 'postComment',          field: 'author_email' },
  // Απαντήσεις σε νήματα άλλων — δεν πέφτουν με το forumTopic cascade.
  { accessor: 'forumReply',           field: 'author_email' },
  { accessor: 'petTracker',           field: 'owner_email' },
  // Tokens ημερολογίου: δίνουν πρόσβαση στο ημερολόγιο του ανθρώπου.
  { accessor: 'calendarConnection',   field: 'user_email' },
  { accessor: 'oAuthState',           field: 'user_email' },
  { accessor: 'contactMessage',       field: 'user_email' },
  // Μηνύματα φόρμας επικοινωνίας χωρίς σύνδεση: το email είναι στη στήλη `email`.
  { accessor: 'contactMessage',       field: 'email' },
  // Αίτηση επαλήθευσης παρόχου: ΑΦΜ, τηλέφωνο, βιογραφικό — καμία λογιστική αξία.
  { accessor: 'providerVerificationRequest', field: 'user_email' },
  // Ο κατάλογος στόχευσης μιας καμπάνιας είναι λίστα μάρκετινγκ με το
  // πρόσωπο μέσα — φεύγει ολόκληρη η εγγραφή.
  { accessor: 'campaign_audience',    field: 'customer_email' },
  // Σημειώσεις που κράτησε ο πάροχος για αυτόν τον πελάτη.
  { accessor: 'customer_notes',       field: 'customer_email' },
  // Ο χρήστης ως ΠΑΡΟΧΟΣ: οι σημειώσεις του για πελάτες είναι προσωπικά
  // δεδομένα τρίτων χωρίς πλέον κάτοχο — διαγράφονται, δεν ανωνυμοποιούνται.
  { accessor: 'customer_notes',       field: 'provider_email' },
]

/**
 * Μοντέλα με user_id (όχι email). Οι γραμμές έχουν ξένο κλειδί προς users με
 * onDelete: Cascade, άρα δεν μπορούν να επιζήσουν του χρήστη με ψεύτικο id —
 * διαγράφονται ρητά. (Πριν ήταν στον ANONYMIZE_MAP με σύγκριση user_id = email,
 * που δεν ταίριαζε ποτέ, και το cascade τις έσβηνε σιωπηλά.)
 */
const DELETE_BY_ID: string[] = ['productSubscription', 'userInsuranceSubscription', 'pushSubscription']

/**
 * ΔΕΝ διαγράφονται — ανωνυμοποιούνται.
 * Παραγγελίες, κρατήσεις και κριτικές έχουν λογιστική ή συμβατική αξία και
 * υπόκεινται σε φορολογική υποχρέωση διατήρησης. Το άρθρο 17 παρ. 3 στοιχ. β΄
 * επιτρέπει τη διατήρηση όταν υπάρχει νομική υποχρέωση.
 */
const ANONYMIZE_MAP: { accessor: string; field: string; nameField?: string; set?: Record<string, any> }[] = [
  // Λογιστική / συμβατική αξία — διατηρούνται ανωνυμοποιημένα (τα ποσά μένουν).
  // Η διεύθυνση αποστολής της παραγγελίας καθαρίζεται πριν (eraseUserAccount).
  { accessor: 'order',                  field: 'user_email', nameField: 'user_name' },
  { accessor: 'booking',                field: 'customer_email', nameField: 'customer_name' },
  { accessor: 'review',                 field: 'customer_email', nameField: 'customer_name' },
  // Οι σημειώσεις της συνεδρίας είναι ελεύθερο κείμενο για το ζώο/τον άνθρωπο.
  { accessor: 'telehealthConsultation', field: 'client_email', nameField: 'client_name', set: { notes: null } },

  // Ο χρήστης ως ΠΑΡΟΧΟΣ: οι κρατήσεις/συνεδρίες/κριτικές μένουν για τους
  // πελάτες και τα φορολογικά, χωρίς το όνομα και το email του παρόχου.
  { accessor: 'booking',                field: 'provider_email', nameField: 'provider_name' },
  { accessor: 'telehealthConsultation', field: 'provider_email', nameField: 'provider_name' },
  { accessor: 'review',                 field: 'provider_email' },
  // Πρόσβαση στο διαβατήριο ζώων τρίτων: ανακαλείται.
  { accessor: 'petPassportAccess',      field: 'provider_email', nameField: 'provider_name', set: { status: 'revoked' } },
  // Περιεχόμενο που ΑΝΗΚΕΙ σε άλλους χρήστες — δεν διαγράφεται.
  // Μια κοινότητα με μέλη, μια εκδήλωση με συμμετέχοντες, ή προϊόν που
  // κάποιος αγόρασε δεν μπορούν να εξαφανιστούν επειδή έφυγε ο δημιουργός.
  { accessor: 'community',              field: 'creator_email' },
  { accessor: 'event',                  field: 'organizer_email' },
  { accessor: 'playdateEvent',          field: 'creator_email' },
  { accessor: 'product',                field: 'provider_email' },
  // Η υπηρεσία μένει για το ιστορικό κρατήσεων, αλλά χωρίς στοιχεία
  // επικοινωνίας και εκτός καταλόγου (κανείς δεν θα την εξυπηρετήσει).
  { accessor: 'service',                field: 'provider_email', set: { contact_email: null, contact_phone: null, is_active: false } },

  // ── Προστέθηκαν μετά τον αρχικό χάρτη ──────────────────────────────
  // Συμμετοχή σε εκδήλωση: ο διοργανωτής πρέπει να κρατά τον αριθμό
  // συμμετεχόντων και το ιστορικό, όχι το όνομα.
  { accessor: 'eventRegistration',      field: 'user_email', nameField: 'user_name' },
  // Καμπάνιες παρόχου: ανήκουν στη δραστηριότητά του, όπως οι υπηρεσίες.
  { accessor: 'campaigns',              field: 'owner_email' },
  // Μηνύματα παρόχου↔πελάτη: το νήμα ανήκει και στους δύο, οπότε
  // ανωνυμοποιείται αντί να σβήνεται μονομερώς.
  { accessor: 'provider_messages',      field: 'customer_email' },
  { accessor: 'provider_messages',      field: 'provider_email', nameField: 'provider_name' },
]

const ANON_EMAIL = (id: string) => `deleted-${id}@anonymized.invalid`

/** Τα πεδία της διεύθυνσης αποστολής που ταυτοποιούν (ίδια με orders.ts ADDRESS_PII). */
const ADDRESS_PII = ['full_name', 'phone', 'street', 'address', 'city', 'postal_code', 'notes']

/**
 * Ψευδώνυμο email για αρχεία ελέγχου που επιζούν της διαγραφής: ο έλεγχος
 * «διαγράφηκε ο Χ;» γίνεται με το ίδιο hash, χωρίς να μένει το email.
 */
export function emailHash(email: string): string {
  return 'sha256:' + createHash('sha256').update(String(email).trim().toLowerCase()).digest('hex')
}

/**
 * Οριστική διαγραφή λογαριασμού (άρθρο 17) — ΚΟΙΝΗ για το cron και για τη
 * διαγραφή από τη διαχείριση (admin.ts). Πριν, η διαχείριση έσβηνε μόνο τη
 * γραμμή users και άφηνε ζώα, ιατρικά, μηνύματα, παραγγελίες με διεύθυνση.
 *
 * Ιδεμποτική: κάθε βήμα είναι updateMany/deleteMany, οπότε μια επανάληψη μετά
 * από αποτυχία στη μέση συνεχίζει από εκεί. Πετά σφάλμα αν αποτύχει.
 *
 * ΣΕΙΡΑ
 *   0) Ακύρωση ΚΑΘΕ ζωντανής συνδρομής στο Stripe (τροφής + AI). Αν έστω μία
 *      αποτύχει → StripeCancelError ΠΡΙΝ από οποιαδήποτε διαγραφή (το cron
 *      ξαναδοκιμάζει την επόμενη μέρα, η διαχείριση απαντά 502). Αλλιώς ο
 *      λογαριασμός σβηνόταν και η κάρτα χρεωνόταν κάθε μήνα.
 *   1–6) Βάση.
 *   7) Αρχεία R2 — ΜΕΤΑ τη διαγραφή του χρήστη (αν σβήνονταν πριν και η βάση
 *      αποτύγχανε, ο χρήστης θα έμενε χωρίς φωτογραφίες/ιατρικά). Αποτυχία
 *      εδώ δεν ακυρώνει τη διαγραφή: log + audit για τον διαχειριστή.
 */
export async function eraseUserAccount(userId: string, email: string): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}

  // 0) Συνδρομές Stripe. Πετά StripeCancelError — τίποτα δεν έχει διαγραφεί ακόμα
  //    (μόνο όσες συνδρομές τροφής ακυρώθηκαν σημειώνονται 'cancelled').
  const subs = await cancelAllStripeSubscriptionsOfUser(userId)
  if (subs.food) counts['stripe_food_cancelled'] = subs.food
  if (subs.ai) counts['stripe_ai_cancelled'] = subs.ai

  // 0α) Ακύρωση κάθε ενεργής συνεδρίας (token_version: πεδίο της s1). Αν το
  //    πεδίο δεν υπάρχει ακόμα, απλώς παραλείπεται.
  await prisma.user.update({ where: { id: userId }, data: { token_version: { increment: 1 } } as any })
    .catch(() => {})

  // 1α) Διεύθυνση αποστολής: φεύγουν τα στοιχεία του ανθρώπου, μένουν
  //     μέθοδος/κόστος αποστολής (λογιστικά). Ανά γραμμή, γιατί είναι Json.
  const orders = await prisma.order.findMany({ where: { user_email: email }, select: { id: true, shipping_address: true } })
  for (const o of orders) {
    const addr: any = o.shipping_address && typeof o.shipping_address === 'object' && !Array.isArray(o.shipping_address)
      ? { ...(o.shipping_address as any) } : {}
    for (const k of ADDRESS_PII) delete addr[k]
    addr.anonymized = true
    await prisma.order.update({ where: { id: o.id }, data: { shipping_address: addr } })
  }
  if (orders.length) counts['anon:order_address'] = orders.length

  // 1) Ανωνυμοποίηση όσων πρέπει να διατηρηθούν
  for (const a of ANONYMIZE_MAP) {
    const model = (prisma as any)[a.accessor]
    if (!model?.updateMany) { console.error(`[deletion] άγνωστο μοντέλο ${a.accessor}`); continue }
    const data: any = { ...(a.set ?? {}), [a.field]: ANON_EMAIL(userId) }
    if (a.nameField) data[a.nameField] = 'Διαγραμμένος χρήστης'
    const r = await model.updateMany({ where: { [a.field]: email }, data })
    if (r.count) counts['anon:' + a.accessor + '.' + a.field] = r.count
  }

  // 2) Διαγραφή προσωπικών δεδομένων
  for (const d of DELETE_MAP) {
    const model = (prisma as any)[d.accessor]
    if (!model?.deleteMany) { console.error(`[deletion] άγνωστο μοντέλο ${d.accessor}`); continue }
    const r = await model.deleteMany({ where: { [d.field]: email } })
    if (r.count) counts[d.accessor + '.' + d.field] = r.count
  }
  for (const accessor of DELETE_BY_ID) {
    const model = (prisma as any)[accessor]
    if (!model?.deleteMany) { console.error(`[deletion] άγνωστο μοντέλο ${accessor}`); continue }
    const r = await model.deleteMany({ where: { user_id: userId } })
    if (r.count) counts[accessor] = r.count
  }

  // 3) Προσωπικό παρόχου.
  //    Η γραμμή ανήκει στον εργοδότη — το μητρώο του δεν πρέπει να
  //    χάσει τη θέση. Φεύγει ο άνθρωπος από μέσα: αποσυνδέεται ο
  //    λογαριασμός και σβήνονται όνομα, email και τηλέφωνο.
  const staff = await (prisma as any).providerStaff.updateMany({
    where: { OR: [{ user_id: userId }, { email }] },
    data: { user_id: null, email: null, phone: null, full_name: 'Διαγραμμένος χρήστης' },
  }).catch(() => ({ count: 0 }))
  if (staff.count) counts['anon:providerStaff'] = staff.count

  // 4) Επαναϋπολογισμός μετρητών.
  //    Τα σχόλια και οι απαντήσεις του διαγράφηκαν παραπάνω, αλλά τα
  //    posts και τα νήματα κρατούν denormalised μετρητές. Χωρίς αυτό
  //    μια δημοσίευση θα έλεγε «3 σχόλια» και θα εμφάνιζε ένα.
  await prisma.$executeRaw`
    UPDATE posts p SET
      comments_count = (SELECT count(*) FROM post_comments c WHERE c.post_id = p.id),
      likes_count    = (SELECT count(*) FROM post_likes    l WHERE l.post_id = p.id)`
    .catch((e: any) => console.error('[deletion] post counters:', e?.message))
  await prisma.$executeRaw`
    UPDATE forum_topics t SET
      replies_count = (SELECT count(*) FROM forum_replies r WHERE r.topic_id = t.id)`
    .catch((e: any) => console.error('[deletion] forum counters:', e?.message))
  await prisma.$executeRaw`
    UPDATE communities c SET
      member_count = (SELECT count(*) FROM community_members m WHERE m.community_id = c.id)`
    .catch((e: any) => console.error('[deletion] community counters:', e?.message))

  // 5) Συναινέσεις
  await prisma.userConsent.deleteMany({ where: { user_id: userId } })

  // 6) Ο ίδιος ο χρήστης — τελευταίος στη βάση. Το αίτημα διαγραφής φεύγει
  //    μαζί του (onDelete: Cascade).
  await prisma.user.delete({ where: { id: userId } })

  // 7) Αρχεία στο R2 (φωτογραφίες, ιατρικά) — lib/storage. Ο χρήστης έχει ήδη
  //    διαγραφεί, οπότε αποτυχία εδώ ΔΕΝ αποτυγχάνει το αίτημα: καταγράφεται
  //    (μετρητές + audit) για να τα σβήσει ο διαχειριστής χειροκίνητα.
  let r2Problem: string | null = null
  try {
    const { deleted, failed } = await deleteUserUploads(email)
    if (deleted) counts['r2_deleted'] = deleted
    if (failed) { counts['r2_failed'] = failed; r2Problem = `${failed} objects not deleted` }
  } catch (err: any) {
    counts['r2_error'] = 1
    r2Problem = String(err?.message ?? err).slice(0, 500)
  }
  if (r2Problem) {
    console.error(`[deletion] uploads of ${userId}: ${r2Problem}`)
    await auditSystem({ action: 'deletion_uploads_failed', resource: 'user', resource_id: userId,
                        subject_email: emailHash(email), outcome: 'error', error_message: r2Problem })
      .catch(() => {})
  }
  return counts
}

export function startAccountDeletionCron() {
  // Κάθε μέρα στις 03:00 — ώρα χαμηλού φόρτου
  cron.schedule('0 3 * * *', async () => {
    const started = Date.now()
    try {
      const due = await prisma.accountDeletionRequest.findMany({
        where: { status: 'pending', scheduled_for: { lte: new Date() } },
        include: { user: { select: { id: true, email: true } } },
      })

      if (due.length === 0) return
      console.log(`🗑  Διαγραφή λογαριασμών: ${due.length} αιτήματα προς εκτέλεση`)

      for (const req of due) {
        const userId = req.user_id
        const email  = req.user?.email
        if (!email) {
          // Ο χρήστης δεν υπάρχει πια — σημειώνουμε το αίτημα ως εκτελεσμένο.
          await prisma.accountDeletionRequest.update({
            where: { id: req.id },
            data: { status: 'executed', executed_at: new Date() },
          })
          continue
        }

        try {
          const counts = await eraseUserAccount(userId, email)
          // Η οριστική διαγραφή είναι η πιο μη αναστρέψιμη ενέργεια της
          // πλατφόρμας. Η καταγραφή επιβιώνει του χρήστη — με hash του
          // email, όχι το ίδιο το email (αλλιώς το «διαγραμμένο» email θα
          // έμενε στη βάση για 180 μέρες ακόμα).
          auditSystem({ action: 'deletion_executed', resource: 'user',
                        resource_id: userId, subject_email: emailHash(email),
                        metadata: counts })
          console.log(`   ✓ ${userId} διαγράφηκε — ${JSON.stringify(counts)}`)

        } catch (err: any) {
          auditSystem({ action: 'deletion_executed', resource: 'user',
                        resource_id: userId, subject_email: emailHash(email),
                        outcome: 'error', error_message: String(err?.message ?? err).slice(0, 500) })
          console.error(`   ✗ ${userId} απέτυχε: ${err?.message}`)
          // Συνδρομή του Stripe που δεν ακυρώθηκε: τίποτα δεν άλλαξε στη βάση·
          // το αίτημα μένει 'pending' και ξαναδοκιμάζεται στην επόμενη
          // εκτέλεση (το cron διαλέγει μόνο pending). Τα 'failed' δεν
          // ξαναπιάνονται ποτέ — εκεί πήγαινε πριν και αυτή η περίπτωση.
          if (err instanceof StripeCancelError) continue
          await prisma.accountDeletionRequest.update({
            where: { id: req.id },
            data: { status: 'failed' },
          }).catch(() => {})
        }
      }

      console.log(`🗑  Ολοκληρώθηκε σε ${Math.round((Date.now() - started) / 1000)}s`)
    } catch (err) {
      console.error('Account deletion cron error:', err)
    }
  })
}

/* ═══════════════════════════════════════════════════════════════════════
   ΕΠΙΒΟΛΗ ΧΡΟΝΩΝ ΔΙΑΤΗΡΗΣΗΣ — Άρθρο 5 παρ. 1 στοιχ. ε΄
   ═══════════════════════════════════════════════════════════════════════
   Η πολιτική απορρήτου δηλώνει συγκεκριμένους χρόνους. Χωρίς αυτό το cron
   η δήλωση δεν ισχύει στην πράξη — και μια πολιτική που λέει κάτι που δεν
   συμβαίνει είναι χειρότερη από την απουσία πολιτικής.

   ΑΡΧΕΣ
     · Διαγραφή σε παρτίδες, ώστε να μη κλειδώνει ο πίνακας.
     · Κάθε κανόνας τρέχει ανεξάρτητα — αν αποτύχει ένας, οι άλλοι συνεχίζουν.
     · Η ίδια η εκκαθάριση καταγράφεται, αλλιώς δεν αποδεικνύεται ότι έγινε.
   ═══════════════════════════════════════════════════════════════════════ */

type RetentionRule = {
  label: string
  table: string
  column: string
  days: number
  /** Πρόσθετη συνθήκη — π.χ. μόνο ανακληθείσες συναινέσεις */
  extra?: string
}

/**
 * Καταγραφές audit που ο κώδικας διαβάζει ως ΚΑΤΑΣΤΑΣΗ (όχι απλό ιστορικό) —
 * ΔΕΝ σβήνονται στις 180 ημέρες. Αν σβήνονταν:
 *  · ai_subscription_activated — η «τρέχουσα συνδρομή AI» του χρήστη
 *    (lib/stripeSubscriptions): μετά από 6 μήνες τα webhooks ανανέωσης/
 *    ακύρωσης/αποτυχίας δεν θα έβρισκαν τον χρήστη.
 *  · order_stock_reserved — ότι το απόθεμα δεσμεύτηκε (admin.ts): χωρίς αυτό
 *    η ακύρωση θα επέστρεφε απόθεμα δεύτερη φορά ή καθόλου.
 *  · *_refund / *_claim / *_resolved / *_unresolved / *_cancel — «ήδη
 *    επιστράφηκε», «αξίωση επιστροφής σε εξέλιξη» (lib/cancellation,
 *    lib/bookingPayment, lib/extraPaymentRefund, routes/events,
 *    routes/admin-refunds): χωρίς αυτά μια επανάληψη θα έκανε ΔΕΥΤΕΡΗ
 *    επιστροφή χρημάτων.
 *  · event_cancel — ακύρωση εκδήλωσης πριν υπάρξει η στήλη cancelled_at.
 * Είναι οικονομικά/συμβατικά στοιχεία (άρθρο 17 παρ. 3 στοιχ. β΄). Κάθε νέα
 * `auditLog.findFirst/findMany` με action ως κατάσταση ΠΡΕΠΕΙ να μπαίνει εδώ.
 */
export const AUDIT_STATE_ACTIONS: readonly string[] = [
  AI_SUB_ACTIVATED_ACTION,                    // routes/webhooks.ts, lib/stripeSubscriptions.ts
  'order_stock_reserved',                     // routes/orders.ts ORDER_STOCK_RESERVED_ACTION, admin.ts
  'order_out_of_stock_cancel',                // routes/orders.ts (αιτία επιστροφής)
  'refund', 'refund_failure_resolved', 'admin_refund_claim',      // routes/admin-refunds.ts, lib/cancellation.ts
  'booking_duplicate_refund', 'order_duplicate_refund', 'telehealth_duplicate_refund', // lib/bookingPayment, lib/extraPaymentRefund
  'booking_cancel', 'booking_cancel_refund', 'booking_refund_unresolved',              // lib/cancellation.ts
  'telehealth_cancel', 'telehealth_cancel_refund', 'telehealth_refund_claim', 'telehealth_refund_unresolved',
  'event_registration_refund', 'event_registration_auto_refund', 'event_registration_refund_claim',
  'event_registration_refunding_seen', 'event_registration_refunding_resolved',        // routes/events.ts
  'event_cancel',                             // routes/events.ts legacyCancelledAt
  'subscription_paid_while_paused',           // routes/admin-refunds.ts FAILURE_ACTIONS
]

const sqlList = (xs: readonly string[]) => xs.map(x => `'${x.replace(/'/g, "''")}'`).join(',')

/** Οι κανόνες ΠΡΕΠΕΙ να ταυτίζονται με την πολιτική απορρήτου. */
const RETENTION: RetentionRule[] = [
  { label: 'Ιστορικό τοποθεσίας',   table: 'pet_locations', column: 'created_at', days: 90 },
  { label: 'Ειδοποιήσεις',          table: 'notifications', column: 'created_at', days: 365 },
  { label: 'Αρχεία καταγραφής',     table: 'audit_logs',    column: 'created_at', days: 180,
    extra: `action NOT IN (${sqlList(AUDIT_STATE_ACTIONS)})` },
  { label: 'Αιτήματα διαγραφής',    table: 'account_deletion_requests', column: 'created_at',
    days: 1095, extra: "status IN ('cancelled','executed','failed')" },

  // Τα αποτυπώματα κρατούν hash IP+user agent, όχι email — δεν μπορούν να
  // στοχευθούν από τη διαγραφή λογαριασμού, γιατί δεν συνδέονται με κανέναν.
  // Είναι όμως ψευδωνυμοποιημένα προσωπικά δεδομένα και χρειάζονται όριο.
  // Οι μετρητές στα campaigns/products είναι αθροιστικοί και δεν χάνονται.
  { label: 'Αποτυπώματα καμπανιών', table: 'campaign_impressions', column: 'created_at', days: 90 },
  { label: 'Αποτυπώματα προϊόντων', table: 'product_impressions',  column: 'created_at', days: 90 },
  // States OAuth: ισχύουν δέκα λεπτά. Ό,τι μένει είναι σκουπίδι.
  { label: 'OAuth states',          table: 'oauth_states',         column: 'created_at', days: 1 },
  // Μηνύματα επικοινωνίας: κρατούν IP. Δύο χρόνια αρκούν για follow-up.
  { label: 'Μηνύματα επικοινωνίας', table: 'contact_messages',     column: 'created_at',
    days: 730, extra: "status IN ('replied','archived')" },
  // Πολιτική (web/src/lib/legal.ts §8): «Συγκαταθέσεις: πέντε έτη μετά την
  // ανάκληση». Κάθε αλλαγή προτιμήσεων είναι νέα γραμμή, οπότε μια γραμμή
  // «ανακλήθηκε/αντικαταστάθηκε» όταν υπάρχει νεότερη για τον ίδιο χρήστη
  // (ή το ίδιο cookie, για ανώνυμους). Σβήνεται όταν η νεότερη είναι άνω των
  // 5 ετών. Η ΤΡΕΧΟΥΣΑ (τελευταία) γραμμή δεν σβήνεται ποτέ από εδώ.
  { label: 'Ιστορικό συγκαταθέσεων', table: 'user_consents', column: 'created_at',
    days: 1825, extra: `EXISTS (SELECT 1 FROM user_consents n
                                 WHERE n.created_at > user_consents.created_at
                                   AND n.created_at < now() - interval '1825 days'
                                   AND ((user_consents.user_id IS NOT NULL AND n.user_id = user_consents.user_id)
                                     OR (user_consents.user_id IS NULL AND user_consents.cookie_id IS NOT NULL
                                         AND n.cookie_id = user_consents.cookie_id)))` },
]

const BATCH = 5000

export function startRetentionCron() {
  // Κάθε μέρα στις 04:00, μετά το cron διαγραφής λογαριασμών.
  cron.schedule('0 4 * * *', async () => {
    console.log('🧹 Εκκαθάριση κατά τους χρόνους διατήρησης')

    for (const r of RETENTION) {
      try {
        let removed = 0
        // Παρτίδες: το DELETE ... WHERE ctid IN (SELECT ... LIMIT n) κρατά
        // το κλείδωμα σύντομο ακόμα και σε πίνακα με εκατομμύρια γραμμές.
        for (;;) {
          const n: number = await prisma.$executeRawUnsafe(
            `DELETE FROM ${r.table}
              WHERE ctid IN (
                SELECT ctid FROM ${r.table}
                 WHERE ${r.column} < now() - interval '${r.days} days'
                   ${r.extra ? 'AND ' + r.extra : ''}
                 LIMIT ${BATCH})`)
          removed += n
          if (n < BATCH) break
        }
        if (removed > 0) {
          console.log(`   ${r.label}: ${removed} εγγραφές (άνω των ${r.days} ημερών)`)
          auditSystem({ action: 'delete', resource: r.table,
                        metadata: { reason: 'retention', days: r.days, removed } })
        }
      } catch (err: any) {
        // Πίνακας που δεν υπάρχει δεν σταματά τους υπόλοιπους κανόνες.
        console.error(`   ✗ ${r.label}: ${err?.message?.slice(0, 160)}`)
      }
    }

    // Ληγμένα tokens επαναφοράς — δεν διαγράφεται εγγραφή, μόνο καθαρίζεται
    // το πεδίο. Η πολιτική λέει μία ώρα ισχύ.
    try {
      const n: number = await prisma.$executeRaw`
        UPDATE users SET reset_token = NULL, reset_token_expires = NULL
         WHERE reset_token IS NOT NULL AND reset_token_expires < now()`
      if (n > 0) console.log(`   Ληγμένα tokens επαναφοράς: ${n}`)
    } catch (err: any) {
      console.error('   ✗ tokens:', err?.message?.slice(0, 160))
    }

    console.log('🧹 Ολοκληρώθηκε')
  })
}

/* ═══════════════════════════════════════════════════════════════════════
   ΚΟΛΛΗΜΕΝΕΣ ΕΠΙΣΤΡΟΦΕΣ (`refunding`) — κρατήσεις, τηλεϊατρική, εκδηλώσεις
   ═══════════════════════════════════════════════════════════════════════
   Κάθε 15 λεπτά. Βρίσκει ό,τι έμεινε `refunding` πάνω από 15 λεπτά (η
   διεργασία που ξεκίνησε την επιστροφή έπεσε στη μέση) και το τακτοποιεί
   ΧΩΡΙΣ ποτέ νέα επιστροφή στα τυφλά: μόνο με απόδειξη (audit ή Viva) γίνεται
   «επιστράφηκε»· αλλιώς σημειώνεται για τον διαχειριστή. Λεπτομέρειες:
   lib/cancellation.ts (resolveStuckBookingRefunds, resolveStuckTelehealthRefunds) και routes/events.ts
   (resolveStuckEventRefunds). Ασφαλές με πολλά instances: κάθε τακτοποίηση
   γίνεται υπό κλείδωμα βάσης (lib/refundLock).
   ═══════════════════════════════════════════════════════════════════════ */

export function startStuckRefundsCron() {
  let running = false
  cron.schedule('*/15 * * * *', async () => {
    if (running) return
    running = true
    try {
      const b = await resolveStuckBookingRefunds()
      const th = await resolveStuckTelehealthRefunds()
      const e = await resolveStuckEventRefunds()
      if (b.completed || b.flagged || th.completed || th.flagged || e.refunded || e.failed) {
        console.log(`💶 Κολλημένες επιστροφές: κρατήσεις ${b.completed} ολοκληρώθηκαν / ${b.flagged} για έλεγχο · τηλεϊατρική ${th.completed} ολοκληρώθηκαν / ${th.flagged} για έλεγχο · εκδηλώσεις ${e.refunded} επιστράφηκαν / ${e.failed} για έλεγχο`)
      }
    } catch (err: any) {
      console.error('Stuck refunds cron error:', err?.message ?? err)
    } finally {
      running = false
    }
  })
}
