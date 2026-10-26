import type { FastifyPluginAsync } from 'fastify'
import Stripe from 'stripe'
import { langOfUser, notifyTitle, notifyMsg } from '../lib/notifyText.js'
import prisma from '../lib/prisma.js'
import { broadcastToUser } from './notifications.js'
import { calculateCommission } from '../lib/commission.js'
import { sendSubscriptionStartedEmail, sendSubscriptionRenewedEmail, sendSubscriptionFailedEmail } from '../lib/email.js'
import { sendPushToUser } from '../lib/push.js'
import { serverError } from '../lib/errors.js'
import { auditSystem } from '../lib/audit.js'
import { awardForStripeInvoice, revokeStripeInvoice } from '../lib/loyalty.js'
import {
  AI_SUB_ACTIVATED_ACTION, currentAiStripeSubscriptionId, otherLiveAiSubscriptions, cancelStripeSubscription,
  refundLatestPaidInvoice, refundStripeInvoice, type StripeErrorOut,
} from '../lib/stripeSubscriptions.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' })

/**
 * ΔΙΠΛΗ ΣΥΝΔΡΟΜΗ ΤΡΟΦΗΣ (ίδιος χρήστης, ίδιο προϊόν)
 *
 * Το checkout ελέγχει μόνο συνδρομές που ήδη ολοκληρώθηκαν· δύο ανοιχτά
 * checkout (διπλό πάτημα, δύο συσκευές) ολοκληρώνονταν και τα δύο → δύο
 * συνδρομές στο Stripe, διπλή μηνιαία χρέωση και δύο παραδόσεις. Εδώ, υπό
 * κλείδωμα βάσης ανά χρήστη+προϊόν: αν υπάρχει ήδη ζωντανή γραμμή (όχι
 * cancelled/completed) για άλλη συνδρομή του Stripe, η ΝΕΑ γράφεται
 * `cancelled` μαζί με σημάδι (audit FOOD_DUP_ACTION) στην ΙΔΙΑ συναλλαγή,
 * ακυρώνεται αμέσως στο Stripe και το τελευταίο πληρωμένο τιμολόγιό της
 * επιστρέφεται ολόκληρο (lib/stripeSubscriptions — ιδεμποτικό: audit,
 * έλεγχος της χρέωσης στο Stripe, idempotency key). Η επανάληψη οποιουδήποτε
 * γεγονότος της βρίσκει το σημάδι και ξανατρέχει μόνο ό,τι δεν ολοκληρώθηκε.
 * Αν η ακύρωση/επιστροφή αποτύχει → σφάλμα → 500, το Stripe ξαναστέλνει.
 */
const FOOD_DUP_ACTION = 'food_subscription_duplicate_cancelled'
const FOOD_DUP_REFUND_ACTION = 'food_subscription_duplicate_refund'
const FOOD_SUB_LOCK_SPACE = 'globipet:food-subscription'

/** Σημάδι «διπλή συνδρομή τροφής» για αυτή τη συνδρομή του Stripe (ή null). */
async function foodDuplicateMarker(subscriptionId: string): Promise<{ email: string | null } | null> {
  const row = await prisma.auditLog.findFirst({
    where: { action: FOOD_DUP_ACTION, resource: 'product_subscription', metadata: { path: ['stripe_subscription_id'], equals: subscriptionId } },
    select: { subject_email: true },
  })
  return row ? { email: row.subject_email } : null
}

/**
 * Ακύρωση στο Stripe + επιστροφή (του τιμολογίου `invoiceId`, αλλιώς του
 * τελευταίου πληρωμένου). Πετά (→ 500, το Stripe ξαναστέλνει) ΜΟΝΟ σε
 * προσωρινό σφάλμα (δίκτυο / Stripe / όριο αιτημάτων / βάση). Μόνιμο σφάλμα
 * του Stripe (invalid_request, card, permission…) δεν διορθώνεται με
 * επανάληψη: καταγραφή αποτυχίας για τον διαχειριστή («Αποτυχημένες
 * επιστροφές») και συνέχεια (200) — αλλιώς το Stripe ξανάστελνε για μέρες.
 */
const FOOD_DUP_CANCEL_FAILED_ACTION = 'food_subscription_duplicate_cancel_failed'
async function settleDuplicateFoodSubscription(subscriptionId: string, rowId: string, email: string | null, invoiceId?: string) {
  const cancelErr: StripeErrorOut = {}
  if (!(await cancelStripeSubscription(subscriptionId, cancelErr))) {
    if (cancelErr.transient !== false) {
      throw new Error(`duplicate food subscription ${subscriptionId} could not be cancelled in Stripe`)
    }
    await auditSystem({
      action: FOOD_DUP_CANCEL_FAILED_ACTION, resource: 'product_subscription', resource_id: rowId, subject_email: email,
      outcome: 'failure', error_message: cancelErr.message ?? 'Stripe cancel failed',
      metadata: { transaction_id: invoiceId ?? null, invoice_id: invoiceId ?? null, stripe_subscription_id: subscriptionId, reason: 'duplicate food subscription' },
    })
    console.error(`[stripe] duplicate food subscription ${subscriptionId}: permanent cancel error — left for the admin`)
    return
  }
  const ctx = { action: FOOD_DUP_REFUND_ACTION, resource: 'product_subscription', resourceId: rowId, email, reason: 'duplicate food subscription' }
  const refundErr: StripeErrorOut = {}
  const r = invoiceId
    ? await refundStripeInvoice(invoiceId, { ...ctx, subscriptionId }, refundErr)
    : await refundLatestPaidInvoice(subscriptionId, ctx, undefined, refundErr)
  // Η αποτυχία έχει ήδη καταγραφεί (audit failure) από το refundStripeInvoice.
  if (r === 'failed' && refundErr.transient !== false) {
    throw new Error(`duplicate food subscription ${subscriptionId}: refund failed (will retry)`)
  }
  if (r === 'failed') console.error(`[stripe] duplicate food subscription ${subscriptionId}: permanent refund error — left for the admin`)
}

/**
 * Γραμμή product_subscriptions για μια συνδρομή του Stripe, από τα metadata
 * που βάζει το POST /subscriptions/checkout (product_id, user_id, τιμή).
 * Ιδεμποτική: αν υπάρχει ήδη (ή τη δημιουργεί ταυτόχρονα άλλο γεγονός —
 * unique stripe_subscription_id, P2002), δεν δημιουργείται δεύτερη.
 *
 *   null              — δεν είναι συνδρομή τροφής (π.χ. χωρίς metadata)
 *   { created: true } — δημιουργήθηκε τώρα (και στάλθηκε το email έναρξης)
 *   { created: false} — υπήρχε ήδη
 *
 * Το Stripe ΔΕΝ εγγυάται σειρά γεγονότων: το invoice.payment_succeeded της
 * 1ης πληρωμής μπορεί να φτάσει πριν το checkout.session.completed. Γι' αυτό
 * το καλούν και τα δύο. Διπλή συνδρομή: βλ. FOOD_DUP_ACTION.
 */
async function ensureProductSubscription(
  subscription: Stripe.Subscription, customerId: string | null,
): Promise<{ created: boolean } | null> {
  const meta = subscription.metadata
  if (!meta?.product_id || !meta?.user_id) return null
  const existing = await prisma.productSubscription.findUnique({
    where: { stripe_subscription_id: subscription.id },
    select: { id: true },
  })
  if (existing) {
    // Διπλή που ήδη καταγράφηκε: ολοκλήρωση ακύρωσης/επιστροφής (ιδεμποτικά).
    const dup = await foodDuplicateMarker(subscription.id)
    if (dup) await settleDuplicateFoodSubscription(subscription.id, existing.id, dup.email)
    return { created: false }
  }
  const product = await prisma.product.findUnique({ where: { id: meta.product_id } })
  const { rate } = await calculateCommission(parseFloat(meta.monthly_price || '0'), product?.category || 'food')
  let created
  let duplicateOf: string | null = null
  try {
    const res = await prisma.$transaction(async (tx) => {
      // Ένας έλεγχος «ήδη ζωντανή;» + δημιουργία τη φορά ανά χρήστη+προϊόν.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${FOOD_SUB_LOCK_SPACE}), hashtext(${`${meta.user_id}|${meta.product_id}`}))::text AS ok`
      const live = subscription.status === 'canceled' ? null : await tx.productSubscription.findFirst({
        where: {
          user_id: meta.user_id, product_id: meta.product_id,
          status: { notIn: ['cancelled', 'completed'] },
          OR: [{ stripe_subscription_id: null }, { stripe_subscription_id: { not: subscription.id } }],
        },
        select: { id: true, stripe_subscription_id: true },
      })
      // Το Stripe δεν εγγυάται σειρά: αν η συνδρομή έχει ήδη ακυρωθεί εκεί
      // (customer.subscription.deleted ήρθε πρώτο και δεν βρήκε γραμμή),
      // δεν γράφεται «active» — αλλιώς θα έβγαζε παραδόσεις. Ούτε η διπλή.
      const inactive = subscription.status === 'canceled' || !!live
      const row = await tx.productSubscription.create({
        data: {
          user_id: meta.user_id,
          product_id: meta.product_id,
          discount_percent: parseFloat(meta.discount_percent || '0'),
          monthly_price: parseFloat(meta.monthly_price || '0'),
          commission_rate: rate,
          status: inactive ? 'cancelled' : 'active',
          ...(inactive ? { end_date: new Date() } : {}),
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          next_delivery_date: new Date(),
          deliveries_completed: 0,
        },
        include: { user: true, product: true },
      })
      if (live) {
        await tx.auditLog.create({
          data: {
            action: FOOD_DUP_ACTION, resource: 'product_subscription', resource_id: row.id,
            actor_id: null, actor_email: 'system@globipet', actor_role: 'system',
            subject_email: row.user.email, outcome: 'success',
            metadata: {
              stripe_subscription_id: subscription.id, kept_subscription_row: live.id,
              kept_stripe_subscription_id: live.stripe_subscription_id, product_id: meta.product_id,
            } as any,
          },
        })
      }
      return { row, duplicateOf: live?.id ?? null }
    })
    created = res.row
    duplicateOf = res.duplicateOf
  } catch (err: any) {
    if (err?.code === 'P2002') return { created: false }
    // Ο χρήστης ή το προϊόν δεν υπάρχει πια: μόνιμο σφάλμα — καταγραφή και
    // 200, αλλιώς το Stripe θα ξανάστελνε για μέρες.
    if (err?.code === 'P2003') {
      console.error(`[stripe] subscription ${subscription.id}: user/product missing — not created`)
      return null
    }
    throw err
  }
  if (duplicateOf) {
    console.error(`[stripe] food subscription ${subscription.id} duplicates live row ${duplicateOf} — cancelling and refunding`)
    await settleDuplicateFoodSubscription(subscription.id, created.id, created.user.email)
    return { created: true }
  }
  if (created.status === 'active') {
    sendSubscriptionStartedEmail(created.user.email, {
      customerName: created.user.full_name,
      productName: created.product.name,
      monthlyPrice: created.monthly_price,
    }).catch(() => {})
  }
  return { created: true }
}

const idOf = (v: string | { id: string } | null | undefined): string | null =>
  typeof v === 'string' ? v : v?.id ?? null

/**
 * ΣΥΝΔΡΟΜΗ AI (Stripe)
 *
 * Το POST /ai-subscriptions/create-checkout βάζει στη συνδρομή του Stripe
 * metadata { user_id, ai_plan_id, billing }. Εδώ χειριζόταν μόνο το
 * `product_id` (τροφή): ο χρήστης χρεωνόταν κάθε μήνα και η συνδρομή AI δεν
 * ενεργοποιούνταν ποτέ.
 *
 * Ο χρήστης δεν έχει στήλη για το id της συνδρομής του Stripe (το σχήμα δεν
 * αλλάζει). Η ενεργή συνδρομή κάθε χρήστη είναι η τελευταία καταγραφή audit
 * `ai_subscription_activated` (metadata.stripe_subscription_id). Έτσι ένα
 * καθυστερημένο γεγονός μιας ΠΑΛΙΑΣ συνδρομής (π.χ. deleted της
 * προηγούμενης) δεν αγγίζει τη νέα.
 */
// Κοινά με το /ai-subscriptions/cancel και τη διαγραφή λογαριασμού.
export { AI_SUB_ACTIVATED_ACTION, currentAiStripeSubscriptionId }

const isAiSubscription = (s: Stripe.Subscription | null | undefined) =>
  !!s?.metadata?.ai_plan_id && !!s?.metadata?.user_id

/**
 * Ενεργοποίηση/ανανέωση: μόνο αν η συνδρομή είναι ζωντανή ΣΤΟ STRIPE (η
 * κατάσταση διαβάζεται από το Stripe, όχι από το γεγονός — το Stripe δεν
 * εγγυάται σειρά, και μια ήδη ακυρωμένη δεν ξαναγίνεται «ενεργή»).
 * Ιδεμποτική: ίδια συνδρομή, ήδη ενεργή, ίδιο πλάνο → τίποτα.
 */
async function activateAiSubscription(subscription: Stripe.Subscription): Promise<void> {
  const userId = String(subscription.metadata.user_id)
  const planId = String(subscription.metadata.ai_plan_id)
  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    console.warn(`[stripe] AI subscription ${subscription.id} is ${subscription.status} — not activated`)
    return
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, ai_subscription_status: true, ai_subscription_plan_id: true },
  })
  if (!user) {
    console.error(`[stripe] AI subscription ${subscription.id}: user ${userId} missing — not activated`)
    return
  }
  const current = await currentAiStripeSubscriptionId(userId)
  if (current === subscription.id && user.ai_subscription_status === 'active' && user.ai_subscription_plan_id === planId) return

  // Διπλή συνδρομή (δύο checkout που ολοκληρώθηκαν, ή νέα ενώ ζούσε η
  // παλιά): μία συνδρομή AI ανά χρήστη, κρατιέται η ΝΕΟΤΕΡΗ (created στο
  // Stripe). Οι άλλες ακυρώνονται αμέσως, χωρίς επιστροφή — όπως η ακύρωση
  // από τον πελάτη. Αν ΑΥΤΗ είναι η παλιότερη (π.χ. ανανέωση της παλιάς
  // μετά την αγορά νέας), ακυρώνεται αυτή και δεν ενεργοποιείται.
  // Σφάλμα του Stripe εδώ δεν μπλοκάρει την ενεργοποίηση (η πληρωμή έγινε).
  let older: string[] = []
  try {
    const others = await otherLiveAiSubscriptions(userId, subscription.id)
    // «Νεότερη» μετρά μόνο αν πληρώνεται (active/trialing/past_due) — μια
    // ημιτελής (incomplete) δεν εκτοπίζει πληρωμένη.
    const newer = others.filter(o => o.created > subscription.created && ['active', 'trialing', 'past_due'].includes(o.status))
    if (newer.length) {
      const ok = await cancelStripeSubscription(subscription.id)
      const kept = newer.sort((x, y) => y.created - x.created)[0]
      await auditSystem({
        action: AI_DUP_CANCELLED_ACTION, resource: 'user', resource_id: userId, subject_email: user.email,
        outcome: ok ? 'success' : 'error',
        metadata: { kept: kept.id, cancelled: ok ? [subscription.id] : [], failed: ok ? [] : [subscription.id] },
      })
      // Η διπλή που ακυρώθηκε είχε ήδη χρεωθεί: επιστροφή του τελευταίου
      // πληρωμένου τιμολογίου της (ιδεμποτικά· αποτυχία → «Αποτυχημένες επιστροφές»)
      // — μόνο αν εκδόθηκε γύρω/μετά τη δημιουργία της συνδρομής που κρατήθηκε.
      if (ok) await refundAiDuplicate(subscription.id, userId, user.email, { keptCreated: kept.created })
      return
    }
    older = others.map(o => o.id)
  } catch (err: any) {
    console.error(`[stripe] AI duplicate check for ${userId} failed:`, err?.message)
  }

  await prisma.user.update({
    where: { id: userId },
    data: { ai_subscription_status: 'active', ai_subscription_plan_id: planId },
  })
  if (current !== subscription.id) {
    await auditSystem({
      action: AI_SUB_ACTIVATED_ACTION, resource: 'user', resource_id: userId, subject_email: user.email,
      metadata: {
        stripe_subscription_id: subscription.id,
        stripe_customer_id: idOf(subscription.customer as any),
        plan_id: planId,
        billing: subscription.metadata.billing ?? null,
        current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
        current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
      },
    })
  }
  // Οι παλιότερες ακυρώνονται ΜΕΤΑ την καταγραφή ενεργοποίησης της νέας, ώστε
  // το customer.subscription.deleted τους να μη βρει «τρέχουσα» τη δική τους
  // και να μη σημειώσει τον χρήστη ακυρωμένο.
  if (older.length) {
    const cancelled: string[] = [], failed: string[] = []
    for (const id of older) ((await cancelStripeSubscription(id)) ? cancelled : failed).push(id)
    await auditSystem({
      action: AI_DUP_CANCELLED_ACTION, resource: 'user', resource_id: userId, subject_email: user.email,
      outcome: failed.length ? 'error' : 'success',
      metadata: { kept: subscription.id, cancelled, failed },
    })
    // Κάθε διπλή που ακυρώθηκε: επιστροφή του τελευταίου πληρωμένου τιμολογίου της.
    for (const id of cancelled) await refundAiDuplicate(id, userId, user.email, { keptCreated: subscription.created })
  }
}

/**
 * Διπλή συνδρομή AI που ακυρώθηκε (μία συνδρομή AI ανά χρήστη· το checkout
 * δεν επιτρέπει νέα όταν υπάρχει ενεργή, άρα κάθε άλλη ζωντανή είναι
 * διπλή χρέωση από παράλληλα checkout). Πριν ακυρωνόταν ΧΩΡΙΣ επιστροφή και
 * ο πελάτης έχανε την πρώτη χρέωσή της. Ιδεμποτικό (lib/stripeSubscriptions
 * refundStripeInvoice)· ποτέ δεν πετάει.
 */
const AI_DUP_CANCELLED_ACTION = 'ai_subscription_duplicate_cancelled'
const AI_DUP_REFUND_ACTION = 'ai_subscription_duplicate_refund'
/**
 * `keptCreated`: created (unix) της συνδρομής που ΚΡΑΤΗΘΗΚΕ. Επιστρέφεται
 * μόνο τιμολόγιο της διπλής που εκδόθηκε από (keptCreated − 1 ώρα) και μετά:
 * μια παλιά συνδρομή που πληρωνόταν και χρησιμοποιούνταν μήνες πριν από τη
 * νέα ακυρώνεται χωρίς επιστροφή (καταγραφή «_skipped» με τον λόγο).
 */
async function refundAiDuplicate(
  subscriptionId: string, userId: string, email: string | null,
  /** keptCreated: όριο για το τελευταίο πληρωμένο· invoiceId: τιμολόγιο πληρωμένο ΜΕΤΑ την ακύρωση ως διπλής (επιστρέφεται πάντα). */
  by: { keptCreated: number } | { invoiceId: string },
) {
  const ctx = { action: AI_DUP_REFUND_ACTION, resource: 'user', resourceId: userId, email, reason: 'duplicate AI subscription' }
  const r = 'invoiceId' in by
    ? await refundStripeInvoice(by.invoiceId, { ...ctx, subscriptionId })
    : await refundLatestPaidInvoice(subscriptionId, ctx, by.keptCreated - 3600)
  if (r === 'refunded') console.warn(`[stripe] duplicate AI subscription ${subscriptionId} of ${userId}: invoice refunded`)
  if (r === 'skipped') console.warn(`[stripe] duplicate AI subscription ${subscriptionId} of ${userId}: cancelled without refund (invoice older than the kept subscription)`)
}

/** Η συνδρομή AI ακυρώθηκε από εμάς ως διπλή (audit AI_DUP_CANCELLED_ACTION); */
async function aiDuplicateCancelled(subscriptionId: string, userId: string): Promise<boolean> {
  const row = await prisma.auditLog.findFirst({
    where: { action: AI_DUP_CANCELLED_ACTION, resource: 'user', resource_id: userId, metadata: { path: ['cancelled'], array_contains: [subscriptionId] } },
    select: { id: true },
  })
  return !!row
}

/**
 * Αλλαγή κατάστασης (payment_failed / cancelled) ΜΟΝΟ για την τρέχουσα
 * συνδρομή του χρήστη και μόνο από τις καταστάσεις `from` (ατομικά).
 */
async function setAiSubscriptionStatus(
  subscriptionId: string, userId: string, to: 'payment_failed' | 'cancelled', from: string[],
  /** Πλάνο από τα metadata του Stripe: fallback όταν δεν υπάρχει καμία καταγραφή ενεργοποίησης. */
  fallbackPlanId?: string,
): Promise<void> {
  const current = await currentAiStripeSubscriptionId(userId)
  if (current === null && fallbackPlanId) {
    // Καμία καταγραφή ενεργοποίησης (π.χ. συνδρομή πριν διορθωθεί το
    // webhook): δεκτό μόνο αν ο χρήστης έχει ΑΚΟΜΑ αυτό το πλάνο — αλλιώς
    // μια παλιά συνδρομή θα ακύρωνε άλλη. Η ατομική συνθήκη το επιβάλλει.
    const r = await prisma.user.updateMany({
      where: { id: userId, ai_subscription_status: { in: from }, ai_subscription_plan_id: fallbackPlanId },
      data: { ai_subscription_status: to },
    })
    if (r.count > 0) {
      await auditSystem({
        action: `ai_subscription_${to}`, resource: 'user', resource_id: userId,
        metadata: { stripe_subscription_id: subscriptionId, matched_by: 'metadata' },
      })
    }
    return
  }
  if (current !== subscriptionId) {
    console.warn(`[stripe] AI subscription ${subscriptionId} is not the current one of user ${userId} — ${to} ignored`)
    return
  }
  const r = await prisma.user.updateMany({
    where: { id: userId, ai_subscription_status: { in: from } },
    data: { ai_subscription_status: to },
  })
  if (r.count > 0) {
    await auditSystem({
      action: `ai_subscription_${to}`, resource: 'user', resource_id: userId,
      metadata: { stripe_subscription_id: subscriptionId },
    })
  }
}

/** Κλείδωμα βάσης ανά συνδρομή Stripe (σειριακή επεξεργασία πληρωμών της). */
const SUB_LOCK_SPACE = 'globipet:stripe-subscription'

/**
 * Ε17 — Μετά από πληρωμένο τιμολόγιο συνδρομής AI: ενημέρωση του
 * current_period_end στην ΤΕΛΕΥΤΑΙΑ καταγραφή ενεργοποίησης του χρήστη (αν
 * είναι αυτής της συνδρομής), ώστε το GET /ai-subscriptions/my-status να μη
 * ρωτά το Stripe μετά από κάθε ανανέωση. Μόνο αν η νέα ημερομηνία είναι
 * μεταγενέστερη. Ποτέ δεν πετάει (σφάλμα → μόνο log· η πληρωμή έχει ήδη
 * καταχωριστεί).
 */
async function refreshAiPeriodEnd(subscription: Stripe.Subscription): Promise<void> {
  try {
    if (subscription.status === 'canceled' || !subscription.current_period_end) return
    const userId = String(subscription.metadata?.user_id ?? '')
    if (!userId) return
    const row = await prisma.auditLog.findFirst({
      where: { action: AI_SUB_ACTIVATED_ACTION, resource: 'user', resource_id: userId },
      orderBy: { created_at: 'desc' },
      select: { id: true, metadata: true },
    })
    const meta = (row?.metadata ?? null) as Record<string, any> | null
    if (!row || !meta || meta.stripe_subscription_id !== subscription.id) return
    const next = new Date(subscription.current_period_end * 1000)
    const prev = typeof meta.current_period_end === 'string' ? new Date(meta.current_period_end) : null
    if (prev && !isNaN(prev.getTime()) && prev.getTime() >= next.getTime()) return
    await prisma.auditLog.update({
      where: { id: row.id },
      data: {
        metadata: {
          ...meta,
          current_period_end: next.toISOString(),
          ...(subscription.current_period_start ? { current_period_start: new Date(subscription.current_period_start * 1000).toISOString() } : {}),
        } as any,
      },
    })
  } catch (err: any) {
    console.error(`[stripe] AI period end refresh for ${subscription.id} failed:`, err?.message ?? err)
  }
}

/**
 * Ε17 — charge.refunded (επιστροφή από το Dashboard του Stripe ή από εμάς):
 * αφαίρεση των πόντων του ΤΙΜΟΛΟΓΙΟΥ της χρέωσης, αναλογικά, μία φορά ανά
 * επιστροφή (refundRef = id της επιστροφής). Το charge.amount_refunded είναι
 * σωρευτικό, γι' αυτό διαβάζονται οι επιστροφές της χρέωσης ξεχωριστά
 * (ποσό καθεμιάς / πληρωμένο). Πλήρης επιστροφή (charge.refunded) →
 * επιπλέον αφαίρεση ό,τι έμεινε από στρογγυλέματα (ιδεμποτική ανά χρέωση).
 * Χρέωση χωρίς τιμολόγιο ή τιμολόγιο χωρίς απόδοση πόντων → τίποτα (το
 * lib/loyalty βρίσκει τους πόντους από το σημάδι απόδοσης· η πλήρης
 * επιστροφή αφήνει μόνο το σημάδι που εμποδίζει μεταγενέστερη απόδοση).
 * Μαζί με το refundStripeInvoice (refundRef ανά τιμολόγιο) δεν αφαιρείται
 * διπλά: η αφαίρεση περιορίζεται σε ό,τι έμεινε από ΑΥΤΗ την πληρωμή.
 * Ποτέ δεν πετάει.
 */
async function revokeChargeRefund(charge: Stripe.Charge): Promise<void> {
  try {
    const invoiceId = idOf(charge.invoice as any)
    if (!invoiceId || !(charge.amount > 0)) return
    try {
      const refunds = await stripe.refunds.list({ charge: charge.id, limit: 100 })
      for (const r of [...refunds.data].sort((a, b) => a.created - b.created)) {
        if (r.status === 'failed' || r.status === 'canceled' || !(r.amount > 0)) continue
        await revokeStripeInvoice(invoiceId, { amount: r.amount / 100, full: false, refundRef: `stripe_refund:${r.id}` })
      }
    } catch (err: any) {
      // Η λίστα δεν διαβάστηκε: μόνο η πλήρης επιστροφή (από το ίδιο το γεγονός).
      console.error(`[stripe] refunds list for charge ${charge.id} failed:`, err?.message ?? err)
    }
    if (charge.refunded || charge.amount_refunded >= charge.amount) {
      await revokeStripeInvoice(invoiceId, { amount: charge.amount_refunded / 100, full: true, refundRef: `stripe_charge_refunded:${charge.id}` })
    }
  } catch (err: any) {
    console.error(`[stripe] charge.refunded loyalty revoke for ${charge.id} failed:`, err?.message ?? err)
  }
}

const webhooksRoutes: FastifyPluginAsync = async (app) => {

  // Capture raw body ONLY within this plugin's scope (encapsulated — doesn't affect other routes)
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    done(null, body)
  })

  app.post('/stripe', async (req: any, reply) => {
    const sig = req.headers['stripe-signature']
    let event: Stripe.Event

    // Χωρίς μυστικό δεν επαληθεύεται τίποτα: 503 (το Stripe ξαναστέλνει
    // όταν ρυθμιστεί), ποτέ επεξεργασία ανυπόγραφου γεγονότος.
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('Stripe webhook rejected: STRIPE_WEBHOOK_SECRET is not set')
      return reply.code(503).send({ received: false })
    }

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
    } catch (err: any) {
      console.error('Stripe webhook signature error:', err.message)
      return reply.code(400).send(`Webhook Error: ${err.message}`)
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session
          if (session.mode === 'subscription' && session.subscription) {
            const subscription = await stripe.subscriptions.retrieve(idOf(session.subscription as any) as string)
            if (isAiSubscription(subscription)) await activateAiSubscription(subscription)
            else await ensureProductSubscription(subscription, idOf(session.customer as any))
          }
          break
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice
          const subId = idOf(invoice.subscription as any)
          if (subId) {
            let exists = await prisma.productSubscription.findUnique({
              where: { stripe_subscription_id: subId }, select: { id: true },
            })
            if (!exists) {
              // Η 1η πληρωμή έφτασε πριν το checkout.session.completed: η
              // γραμμή δημιουργείται εδώ από τα metadata του Stripe (όπως
              // εκεί). Πριν, η παράδοση #1 χανόταν σιωπηλά. Σε σφάλμα του
              // Stripe/βάσης → 500 και το Stripe ξαναστέλνει.
              const subscription = await stripe.subscriptions.retrieve(subId)
              // Συνδρομή AI: ενεργοποίηση/ανανέωση (και επαναφορά μετά από
              // αποτυχημένη πληρωμή) — καμία παραγγελία παράδοσης.
              if (isAiSubscription(subscription)) {
                // Τιμολόγιο που πληρώθηκε ΜΕΤΑ την ακύρωση της συνδρομής ως
                // διπλής: επιστρέφεται (καμία ενεργοποίηση — είναι canceled).
                if (subscription.status === 'canceled'
                  && await aiDuplicateCancelled(subscription.id, String(subscription.metadata.user_id))) {
                  const u = await prisma.user.findUnique({ where: { id: String(subscription.metadata.user_id) }, select: { email: true } })
                  await refundAiDuplicate(subscription.id, String(subscription.metadata.user_id), u?.email ?? null, { invoiceId: invoice.id })
                }
                await activateAiSubscription(subscription)
                await refreshAiPeriodEnd(subscription) // Ε17: ημερομηνία ανανέωσης για το my-status (δεν πετάει)
                if (subscription.status !== 'canceled') await awardForStripeInvoice(invoice.id, invoice.amount_paid, { userId: subscription.metadata?.user_id }) // πόντοι επιβράβευσης (lib/loyalty — ιδεμποτικό ανά τιμολόγιο, δεν πετάει)
                break
              }
              await ensureProductSubscription(subscription, idOf(subscription.customer as any) ?? idOf(invoice.customer as any))
              exists = await prisma.productSubscription.findUnique({
                where: { stripe_subscription_id: subId }, select: { id: true },
              })
            }
            // Όχι συνδρομή τροφής (π.χ. άλλο προϊόν του ίδιου λογαριασμού): τίποτα.
            if (!exists) break

            // ΜΙΑ παραγγελία παράδοσης ανά τιμολόγιο (invoice.id στο
            // payment_intent της παραγγελίας — πεδίο που δεν χρησιμοποιείται
            // αλλού· το payment_ref μένει για τη Viva). Έλεγχος + καταχώριση σε
            // μία συναλλαγή υπό κλείδωμα ανά συνδρομή: επανάληψη του ίδιου
            // γεγονότος (το Stripe ξαναστέλνει σε 5xx/timeout) ή δύο
            // ταυτόχρονες παραδόσεις του δεν φτιάχνουν δεύτερη παραγγελία ούτε
            // μετρούν δεύτερη παράδοση.
            const result = await prisma.$transaction(async (tx) => {
              await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${SUB_LOCK_SPACE}), hashtext(${subId}))::text AS ok`
              const already = await tx.order.findFirst({
                where: { payment_method: 'stripe_subscription', payment_intent: invoice.id },
                select: { id: true },
              })
              if (already) return { kind: 'duplicate' as const }

              const productSub = await tx.productSubscription.findUnique({
                where: { stripe_subscription_id: subId },
                include: { product: true, user: true },
              })
              if (!productSub) return { kind: 'skip' as const }
              if (productSub.status === 'cancelled' || productSub.status === 'completed' || productSub.status === 'paused') {
                return { kind: 'inactive' as const, productSub }
              }

              const nextDelivery = new Date()
              nextDelivery.setMonth(nextDelivery.getMonth() + 1)

              const deliveryNumber = productSub.deliveries_completed + 1
              // The plan is sold as twelve monthly deliveries. Without this
              // check Stripe kept charging past the twelfth month, because
              // nothing ever cancelled the subscription.
              const isFinalDelivery = deliveryNumber >= 12

              await tx.productSubscription.update({
                where: { id: productSub.id },
                data: {
                  deliveries_completed: { increment: 1 },
                  next_delivery_date: isFinalDelivery ? null : nextDelivery,
                  status: isFinalDelivery ? 'completed' : 'active',
                  ...(isFinalDelivery ? { end_date: new Date() } : {}),
                },
              })

              const rate = productSub.commission_rate ?? 10
              const platformFee = Math.round(productSub.monthly_price * (rate / 100) * 100) / 100
              const providerPayout = Math.round((productSub.monthly_price - platformFee) * 100) / 100
              const providerEmail = (productSub.product as any).provider_email || null

              // Απόθεμα: μία μονάδα ανά παράδοση, ατομικά και υπό συνθήκη στην
              // ΙΔΙΑ συναλλαγή (όπως η πληρωμή παραγγελίας, orders.ts). Πριν
              // καμία παράδοση συνδρομής δεν μείωνε το απόθεμα, οπότε το
              // κατάστημα πουλούσε τις ίδιες μονάδες δεύτερη φορά. Χωρίς
              // απόθεμα η παραγγελία ΓΡΑΦΕΤΑΙ κανονικά (ο πελάτης πλήρωσε — δεν
              // χάνεται η παράδοση ούτε γίνεται αυτόματη επιστροφή), με
              // καταγραφή για τον διαχειριστή (αναπλήρωση ή επιστροφή).
              const stocked = await tx.product.updateMany({
                where: { id: productSub.product_id, stock: { gte: 1 } },
                data: { stock: { decrement: 1 } },
              })
              // Ποσό που πλήρωσε το Stripe ≠ τιμή της συνδρομής (ποσό κλειδωμένο
              // στο checkout): καταγραφή για έλεγχο· η παράδοση γράφεται κανονικά.
              const paidNow = Math.round(Number(invoice.amount_paid ?? 0)) / 100
              const amountMismatch = Math.abs(paidNow - productSub.monthly_price) > 0.005

              // Create the monthly delivery order
              const deliveryOrder = await tx.order.create({
                data: {
                  user_email: productSub.user.email,
                  user_name: productSub.user.full_name,
                  items: [{
                    product_id: productSub.product_id, name: productSub.product.name, price: productSub.monthly_price, quantity: 1,
                    category: productSub.product.category, provider_email: providerEmail,
                    commission_rate: providerEmail ? rate : null,
                    platform_fee: providerEmail ? platformFee : null,
                    provider_payout: providerEmail ? providerPayout : null,
                  }],
                  total_amount: productSub.monthly_price,
                  status: 'processing',
                  payment_status: 'paid',
                  shipping_address: {},
                  payment_method: 'stripe_subscription',
                  payment_intent: invoice.id,
                  platform_fee_amount: providerEmail ? platformFee : null,
                  provider_payout_amount: providerEmail ? providerPayout : null,
                  notes: `Αυτόματη μηνιαία παράδοση συνδρομής (παράδοση #${deliveryNumber}/12)`,
                },
              })
              const sysAudit = (action: string, error_message: string, metadata: Record<string, unknown>) => tx.auditLog.create({
                data: {
                  action, resource: 'order', resource_id: deliveryOrder.id,
                  actor_id: null, actor_email: 'system@globipet', actor_role: 'system',
                  subject_email: productSub.user.email, outcome: 'failure', error_message,
                  metadata: { stripe_subscription_id: subId, invoice_id: invoice.id, product_subscription_id: productSub.id, delivery: deliveryNumber, ...metadata } as any,
                },
              })
              if (stocked.count === 1) {
                // Τι δεσμεύτηκε, στην ΙΔΙΑ συναλλαγή — ίδια μορφή με το
                // claimOrderPayment (orders.ts), ώστε μια πλήρης επιστροφή που
                // ακυρώνει την παραγγελία (lib/refundSettlement, paymentRef =
                // id τιμολογίου) να επαναφέρει τη μονάδα.
                await tx.auditLog.create({
                  data: {
                    action: 'order_stock_reserved', resource: 'order', resource_id: deliveryOrder.id,
                    actor_id: null, actor_email: 'system@globipet', actor_role: 'system',
                    metadata: { transaction_id: invoice.id, items: { [productSub.product_id]: 1 } } as any, outcome: 'success',
                  },
                })
              }
              if (stocked.count === 0) {
                await sysAudit('subscription_delivery_out_of_stock',
                  'Subscription delivery order created without stock — restock or refund in Stripe',
                  { product_id: productSub.product_id })
              }
              if (amountMismatch) {
                await sysAudit('subscription_invoice_amount_mismatch',
                  `Invoice paid ${paidNow.toFixed(2)} but the subscription price is ${productSub.monthly_price.toFixed(2)} — check`,
                  { amount_paid: paidNow, expected: productSub.monthly_price })
              }
              return { kind: 'delivered' as const, productSub, deliveryNumber, isFinalDelivery, providerEmail, providerPayout }
            })

            if (result.kind === 'duplicate') {
              console.warn(`[stripe] invoice ${invoice.id} already delivered — duplicate event ignored`)
              break
            }
            if (result.kind === 'skip') break
            if (result.kind === 'inactive') {
              const productSub = result.productSub
              // Τελειωμένη ή σε παύση (από τον διαχειριστή) συνδρομή: δεν
              // ξαναγίνεται active ούτε βγάζει παραγγελία παράδοσης, ό,τι κι αν
              // στείλει το Stripe. Πληρωμή σε παύση (τιμολόγιο που είχε ήδη
              // εκδοθεί πριν την παύση) καταγράφεται για τον διαχειριστή.
              console.warn(`[stripe] invoice.payment_succeeded for ${productSub.status} product subscription ${productSub.id} (${subId}) — skipped`)
              // Διπλή συνδρομή τροφής (FOOD_DUP_ACTION): το τιμολόγιο αυτό
              // επιστρέφεται (ιδεμποτικά· αποτυχία → 500, το Stripe ξαναστέλνει).
              if (productSub.status === 'cancelled' && await foodDuplicateMarker(subId)) {
                await settleDuplicateFoodSubscription(subId, productSub.id, productSub.user.email, invoice.id)
              }
              if (productSub.status === 'paused') {
                await auditSystem({
                  action: 'subscription_paid_while_paused', resource: 'product_subscription', resource_id: productSub.id,
                  subject_email: productSub.user.email, outcome: 'failure',
                  error_message: 'Invoice paid while the subscription is paused — no delivery created; review/refund in Stripe',
                  metadata: { stripe_subscription_id: subId, invoice_id: invoice.id, amount_paid: (invoice.amount_paid ?? 0) / 100 },
                })
              }
              break
            }

            const { productSub, deliveryNumber, isFinalDelivery, providerEmail, providerPayout } = result
            await awardForStripeInvoice(invoice.id, invoice.amount_paid, { email: productSub.user.email }) // πόντοι επιβράβευσης (lib/loyalty — ιδεμποτικό ανά τιμολόγιο, δεν πετάει)

            if (isFinalDelivery && productSub.stripe_subscription_id) {
              // Stop future charges. The delivery just paid for still ships.
              stripe.subscriptions.cancel(productSub.stripe_subscription_id)
                .catch((e: any) => console.error('Stripe cancel at term end failed:', e?.message))
            }

            // Ειδοποιήσεις ΜΕΤΑ την καταχώριση — ποτέ δεν κάνουν το γεγονός
            // να αποτύχει (η παράδοση έχει ήδη γραφτεί, μια επανάληψη θα
            // ήταν πλέον «διπλή» και θα αγνοούνταν).
            try {
              const nLang = await langOfUser(productSub.user.email)
              const notification = await prisma.notification.create({
                data: {
                  user_email: productSub.user.email,
                  title: notifyTitle('subscription_delivery', nLang),
                  message: notifyMsg.subscriptionDelivery(nLang, productSub.product.name),
                  type: 'subscription_delivery',
                  link: '/orders',
                },
              })
              // Live push is keyed by email, like every other broadcast call.
              // This previously passed user_id, so subscription notifications
              // were written to the database but never reached the browser.
              broadcastToUser(productSub.user.email, { type: 'notification', notification })
              void sendPushToUser(productSub.user.email, {
                title: notification.title, body: notification.message, url: notification.link ?? '/',
              })
            } catch (e: any) {
              console.error('[stripe] delivery notification failed:', e?.message)
            }

            sendSubscriptionRenewedEmail(productSub.user.email, {
              customerName: productSub.user.full_name,
              productName: productSub.product.name,
              deliveryNumber,
            }).catch(() => {})

            if (providerEmail) {
              const nLang = await langOfUser(providerEmail).catch(() => 'el' as const)
              prisma.notification.create({
                data: {
                  user_email: providerEmail,
                  title: notifyTitle('subscription_new_order', nLang),
                  message: notifyMsg.subscriptionOrderLine(nLang, productSub.product.name, providerPayout.toFixed(2)),
                  type: 'new_order',
                  link: '/provider',
                },
              }).then(n => {
                broadcastToUser(providerEmail, { type: 'notification', notification: n })
                void sendPushToUser(providerEmail, {
                  title: n.title, body: n.message, url: n.link ?? '/',
                })
              }).catch(() => {})
            }
          }
          break
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice
          const subId = idOf(invoice.subscription as any)
          // Συνδρομή AI: ο χρήστης βρίσκεται από την καταγραφή ενεργοποίησης
          // (πρώτη πληρωμή που αποτυγχάνει δεν ενεργοποίησε ποτέ τίποτα).
          if (subId) {
            const act = await prisma.auditLog.findFirst({
              where: { action: AI_SUB_ACTIVATED_ACTION, resource: 'user', metadata: { path: ['stripe_subscription_id'], equals: subId } },
              orderBy: { created_at: 'desc' },
              select: { resource_id: true },
            })
            if (act?.resource_id) {
              await setAiSubscriptionStatus(subId, act.resource_id, 'payment_failed', ['active'])
              break
            }
          }
          if (subId) {
            const productSub = await prisma.productSubscription.findUnique({
              where: { stripe_subscription_id: subId },
              include: { user: true, product: true },
            })
            // Ατομικά και υπό συνθήκη: συνδρομή σε παύση (από τον διαχειριστή),
            // ακυρωμένη ή ολοκληρωμένη δεν ξαναγίνεται 'payment_failed' — αλλιώς
            // η παύση χανόταν και ο έλεγχος «ήδη συνδρομή» άλλαζε νόημα. Χωρίς
            // αλλαγή, ούτε ειδοποίηση (τίποτα δεν περιμένει πληρωμή).
            const marked = productSub
              ? await prisma.productSubscription.updateMany({
                  where: { id: productSub.id, status: { notIn: ['paused', 'cancelled', 'completed'] } },
                  data: { status: 'payment_failed' },
                })
              : { count: 0 }
            if (productSub && marked.count === 0) {
              console.warn(`[stripe] invoice.payment_failed for ${productSub.status} product subscription ${productSub.id} (${subId}) — status kept`)
            }
            if (productSub && marked.count > 0) {
              const nLang = await langOfUser(productSub.user.email)
              const notification = await prisma.notification.create({
                data: {
                  user_email: productSub.user.email,
                  title: notifyTitle('subscription_payment_failed', nLang),
                  message: notifyMsg.subscriptionFailed(nLang, productSub.product.name),
                  type: 'subscription_payment_failed',
                  link: '/profile',
                },
              })
              // Live push is keyed by email, like every other broadcast call.
              // This previously passed user_id, so subscription notifications
              // were written to the database but never reached the browser.
              broadcastToUser(productSub.user.email, { type: 'notification', notification })
              void sendPushToUser(productSub.user.email, {
                title: notification.title, body: notification.message, url: notification.link ?? '/',
              })

              sendSubscriptionFailedEmail(productSub.user.email, {
                customerName: productSub.user.full_name,
                productName: productSub.product.name,
              }).catch(() => {})
            }
          }
          break
        }

        case 'charge.refunded': {
          // Πόντοι επιβράβευσης του τιμολογίου (αν δόθηκαν) — δεν πετάει.
          await revokeChargeRefund(event.data.object as Stripe.Charge)
          break
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription
          if (isAiSubscription(subscription)) {
            await setAiSubscriptionStatus(subscription.id, String(subscription.metadata.user_id), 'cancelled', ['active', 'payment_failed'],
              String(subscription.metadata.ai_plan_id))
            break
          }
          // Όχι πάνω σε 'completed': μετά τη 12η παράδοση ακυρώνουμε εμείς τη
          // συνδρομή στο Stripe, και το γεγονός αυτό την έγραφε «ακυρωμένη».
          await prisma.productSubscription.updateMany({
            where: { stripe_subscription_id: subscription.id, status: { notIn: ['completed', 'cancelled'] } },
            data: { status: 'cancelled', end_date: new Date() },
          })
          break
        }
      }

      return reply.send({ received: true })
    } catch (err: any) {
      console.error('Stripe webhook handler error:', err)
      return serverError(reply, err, 'webhook')
    }
  })
}

export default webhooksRoutes