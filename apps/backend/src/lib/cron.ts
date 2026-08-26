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

        broadcastToUser(user.id, { type: 'notification', notification })
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

          // 3) Συναινέσεις
          await prisma.userConsent.deleteMany({ where: { user_id: userId } })

          // 4) Ο ίδιος ο χρήστης — τελευταίος
          await prisma.user.delete({ where: { id: userId } })

          // 5) Το αίτημα διαγράφεται μαζί με τον χρήστη (onDelete: Cascade),
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
