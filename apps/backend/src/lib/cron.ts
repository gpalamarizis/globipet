import cron from 'node-cron'
import prisma from './prisma.js'
import { auditSystem } from './audit.js'
import { broadcastToUser } from '../routes/notifications.js'

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

        const notification = await prisma.notification.create({
          data: {
            user_email: user.email,
            title: 'Η δωρεάν δοκιμή AI έληξε',
            message: 'Οι 30 δωρεάν ημέρες σου στο GlobiPet AI ολοκληρώθηκαν. Επίλεξε ένα πλάνο για να συνεχίσεις να έχεις πρόσβαση στις υπηρεσίες AI.',
            type: 'ai_trial_expired',
            link: '/pricing',
          },
        })

        // Live push is keyed by email, like every other broadcast call.
        // This passed user.id, so the trial-expiry notification was written
        // to the database but never reached an open browser.
        broadcastToUser(user.email, { type: 'notification', notification })
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
  // Ο κατάλογος στόχευσης μιας καμπάνιας είναι λίστα μάρκετινγκ με το
  // πρόσωπο μέσα — φεύγει ολόκληρη η εγγραφή.
  { accessor: 'campaign_audience',    field: 'customer_email' },
  // Σημειώσεις που κράτησε ο πάροχος για αυτόν τον πελάτη.
  { accessor: 'customer_notes',       field: 'customer_email' },
]

/**
 * ΔΕΝ διαγράφονται — ανωνυμοποιούνται.
 * Παραγγελίες, κρατήσεις και κριτικές έχουν λογιστική ή συμβατική αξία και
 * υπόκεινται σε φορολογική υποχρέωση διατήρησης. Το άρθρο 17 παρ. 3 στοιχ. β΄
 * επιτρέπει τη διατήρηση όταν υπάρχει νομική υποχρέωση.
 */
const ANONYMIZE_MAP: { accessor: string; field: string; nameField?: string }[] = [
  // Λογιστική / συμβατική αξία — διατηρούνται ανωνυμοποιημένα
  { accessor: 'order',                  field: 'user_email' },
  { accessor: 'booking',                field: 'customer_email', nameField: 'customer_name' },
  { accessor: 'review',                 field: 'customer_email', nameField: 'customer_name' },
  { accessor: 'telehealthConsultation', field: 'client_email' },
  // Περιεχόμενο που ΑΝΗΚΕΙ σε άλλους χρήστες — δεν διαγράφεται.
  // Μια κοινότητα με μέλη, μια εκδήλωση με συμμετέχοντες, ή προϊόν που
  // κάποιος αγόρασε δεν μπορούν να εξαφανιστούν επειδή έφυγε ο δημιουργός.
  { accessor: 'community',              field: 'creator_email' },
  { accessor: 'event',                  field: 'organizer_email' },
  { accessor: 'playdateEvent',          field: 'creator_email' },
  { accessor: 'product',                field: 'provider_email' },
  { accessor: 'service',                field: 'provider_email' },

  // ── Προστέθηκαν μετά τον αρχικό χάρτη ──────────────────────────────
  // Συμμετοχή σε εκδήλωση: ο διοργανωτής πρέπει να κρατά τον αριθμό
  // συμμετεχόντων και το ιστορικό, όχι το όνομα.
  { accessor: 'eventRegistration',      field: 'user_email', nameField: 'user_name' },
  // Οικονομικές συνδρομές — φορολογική υποχρέωση διατήρησης.
  { accessor: 'productSubscription',    field: 'user_id' },
  { accessor: 'userInsuranceSubscription', field: 'user_id' },
  // Καμπάνιες παρόχου: ανήκουν στη δραστηριότητά του, όπως οι υπηρεσίες.
  { accessor: 'campaigns',              field: 'owner_email' },
  // Μηνύματα παρόχου↔πελάτη: το νήμα ανήκει και στους δύο, οπότε
  // ανωνυμοποιείται αντί να σβήνεται μονομερώς.
  { accessor: 'provider_messages',      field: 'customer_email' },
  { accessor: 'provider_messages',      field: 'provider_email', nameField: 'provider_name' },
]

const ANON_EMAIL = (id: string) => `deleted-${id}@anonymized.invalid`

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

        const counts: Record<string, number> = {}
        try {
          // 1) Ανωνυμοποίηση όσων πρέπει να διατηρηθούν
          for (const a of ANONYMIZE_MAP) {
            const model = (prisma as any)[a.accessor]
            if (!model?.updateMany) { console.error(`[deletion] άγνωστο μοντέλο ${a.accessor}`); continue }
            const data: any = { [a.field]: ANON_EMAIL(userId) }
            if (a.nameField) data[a.nameField] = 'Διαγραμμένος χρήστης'
            const r = await model.updateMany({ where: { [a.field]: email }, data })
            if (r.count) counts['anon:' + a.accessor] = r.count
          }

          // 2) Διαγραφή προσωπικών δεδομένων
          for (const d of DELETE_MAP) {
            const model = (prisma as any)[d.accessor]
            if (!model?.deleteMany) { console.error(`[deletion] άγνωστο μοντέλο ${d.accessor}`); continue }
            const r = await model.deleteMany({ where: { [d.field]: email } })
            if (r.count) counts[d.accessor] = r.count
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

          // 6) Ο ίδιος ο χρήστης — τελευταίος
          await prisma.user.delete({ where: { id: userId } })

          // 7) Το αίτημα διαγράφεται μαζί με τον χρήστη (onDelete: Cascade),
          //    οπότε δεν χρειάζεται update εδώ.
          // Η οριστική διαγραφή είναι η πιο μη αναστρέψιμη ενέργεια της
          // πλατφόρμας. Η καταγραφή επιβιώνει του χρήστη — γι' αυτό
          // κρατάμε το email ως κείμενο, όχι ως ξένο κλειδί.
          auditSystem({ action: 'deletion_executed', resource: 'user',
                        resourceId: userId, subjectEmail: email,
                        metadata: counts })
          console.log(`   ✓ ${userId} διαγράφηκε — ${JSON.stringify(counts)}`)

        } catch (err: any) {
          auditSystem({ action: 'deletion_executed', resource: 'user',
                        resourceId: userId, subjectEmail: email,
                        outcome: 'error', errorMessage: err?.message })
          console.error(`   ✗ ${userId} απέτυχε: ${err?.message}`)
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

/** Οι κανόνες ΠΡΕΠΕΙ να ταυτίζονται με την πολιτική απορρήτου. */
const RETENTION: RetentionRule[] = [
  { label: 'Ιστορικό τοποθεσίας',   table: 'pet_locations', column: 'created_at', days: 90 },
  { label: 'Ειδοποιήσεις',          table: 'notifications', column: 'created_at', days: 365 },
  { label: 'Αρχεία καταγραφής',     table: 'audit_logs',    column: 'created_at', days: 180 },
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
