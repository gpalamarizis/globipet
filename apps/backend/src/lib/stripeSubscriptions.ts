import Stripe from 'stripe'
import prisma from './prisma.js'

/**
 * Κοινή λογική για συνδρομές του Stripe (AI και τροφής) — χρησιμοποιείται από
 * το webhook, την ακύρωση συνδρομής AI από τον πελάτη και τη διαγραφή
 * λογαριασμού (lib/cron eraseUserAccount). Πριν η αναζήτηση/ακύρωση ζούσε
 * μόνο μέσα στο POST /ai-subscriptions/cancel.
 */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' })

/**
 * Ο χρήστης δεν έχει στήλη για το id της συνδρομής AI του Stripe (το σχήμα
 * δεν αλλάζει). Η τρέχουσα συνδρομή είναι η τελευταία καταγραφή audit με αυτό
 * το action (metadata.stripe_subscription_id) — γι' αυτό η εκκαθάριση των
 * αρχείων καταγραφής (lib/cron RETENTION) ΔΕΝ το σβήνει.
 */
export const AI_SUB_ACTIVATED_ACTION = 'ai_subscription_activated'

/** Το id της τρέχουσας συνδρομής AI του Stripe του χρήστη (τελευταία ενεργοποίηση). */
export async function currentAiStripeSubscriptionId(userId: string): Promise<string | null> {
  const row = await prisma.auditLog.findFirst({
    where: { action: AI_SUB_ACTIVATED_ACTION, resource: 'user', resource_id: userId },
    orderBy: { created_at: 'desc' },
    select: { metadata: true },
  })
  const id = (row?.metadata as any)?.stripe_subscription_id
  return typeof id === 'string' && id ? id : null
}

/**
 * Οι συνδρομές AI του χρήστη που μπορεί να χρεώνουν ακόμα: η τρέχουσα
 * (καταγραφή ενεργοποίησης) ΚΑΙ όσες βρει η αναζήτηση του Stripe με
 * metadata user_id + ai_plan_id (ώστε να πιάνονται και όσες πληρώθηκαν πριν
 * διορθωθεί το webhook). `searched: false` → η αναζήτηση δεν έγινε/απέτυχε,
 * οπότε η λίστα μπορεί να είναι ελλιπής. Πετά σφάλμα αν αποτύχει η βάση.
 */
export async function liveAiStripeSubscriptionIds(userId: string): Promise<{ ids: Set<string>; searched: boolean }> {
  const ids = new Set<string>()
  const current = await currentAiStripeSubscriptionId(userId)
  if (current) ids.add(current)
  let searched = false
  if (/^[A-Za-z0-9_-]+$/.test(userId)) {
    try {
      const found = await stripe.subscriptions.search({ query: `metadata['user_id']:'${userId}'`, limit: 100 })
      for (const s of found.data) {
        if (!s.metadata?.ai_plan_id) continue
        if (s.status === 'canceled' || s.status === 'incomplete_expired') continue
        ids.add(s.id)
      }
      searched = true
    } catch (err: any) {
      console.error('Stripe AI subscription search error:', err?.message)
    }
  }
  return { ids, searched }
}

/**
 * ΑΜΕΣΗ ακύρωση στο Stripe, χωρίς επιστροφή (ίδιο με την ακύρωση από τον
 * πελάτη). `true` αν ακυρώθηκε ή το Stripe την έχει ήδη τερματίσει
 * (resource_missing / ήδη canceled)· `false` αν η ακύρωση απέτυχε.
 */
export async function cancelStripeSubscription(id: string): Promise<boolean> {
  try {
    await stripe.subscriptions.cancel(id)
    return true
  } catch (err: any) {
    let gone = err?.code === 'resource_missing'
    if (!gone) {
      try {
        const live = await stripe.subscriptions.retrieve(id)
        gone = live.status === 'canceled'
      } catch (e2: any) {
        gone = e2?.code === 'resource_missing'
      }
    }
    if (!gone) console.error('Stripe subscription cancel error:', id, err?.message)
    return gone
  }
}

/** Αποτυχία ακύρωσης συνδρομής στο Stripe πριν από τη διαγραφή λογαριασμού. */
export class StripeCancelError extends Error {
  constructor(public readonly subscriptionIds: string[]) {
    super(`Stripe subscriptions not cancelled: ${subscriptionIds.join(', ') || '(search unavailable)'}`)
    this.name = 'StripeCancelError'
  }
}

/**
 * Ακύρωση ΟΛΩΝ των ζωντανών συνδρομών του χρήστη στο Stripe (τροφής + AI)
 * πριν από τη διαγραφή του λογαριασμού. Αλλιώς ο λογαριασμός σβηνόταν και η
 * κάρτα συνέχιζε να χρεώνεται κάθε μήνα χωρίς κανέναν να το βλέπει.
 *
 * Πετά StripeCancelError αν έστω μία ακύρωση αποτύχει, ή αν ο χρήστης έχει
 * πληρωμένη συνδρομή AI και η αναζήτηση του Stripe δεν έγινε (δεν ξέρουμε τι
 * χρεώνεται). Ιδεμποτική: μια επανάληψη ξαναπερνά από ήδη ακυρωμένες.
 */
export async function cancelAllStripeSubscriptionsOfUser(userId: string): Promise<{ food: number; ai: number }> {
  const failed: string[] = []

  const food = await prisma.productSubscription.findMany({
    where: { user_id: userId, status: { notIn: ['cancelled', 'completed'] }, stripe_subscription_id: { not: null } },
    select: { id: true, stripe_subscription_id: true },
  })
  let foodDone = 0
  for (const s of food) {
    if (await cancelStripeSubscription(s.stripe_subscription_id!)) {
      foodDone++
      await prisma.productSubscription.updateMany({
        where: { id: s.id, status: { notIn: ['cancelled', 'completed'] } },
        data: { status: 'cancelled', end_date: new Date() },
      })
    } else failed.push(s.stripe_subscription_id!)
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { ai_subscription_status: true } })
  const paid = user?.ai_subscription_status === 'active' || user?.ai_subscription_status === 'payment_failed'
  const { ids, searched } = await liveAiStripeSubscriptionIds(userId)
  let aiDone = 0
  for (const id of ids) {
    if (await cancelStripeSubscription(id)) aiDone++
    else failed.push(id)
  }
  if (failed.length || (paid && !searched)) throw new StripeCancelError(failed)
  return { food: foodDone, ai: aiDone }
}

/**
 * Ανοιχτή (μη ολοκληρωμένη, μη ληγμένη) Checkout Session συνδρομής AI του
 * χρήστη, δημιουργημένη τα τελευταία `minutes` λεπτά — για να μη φτιάχνεται
 * δεύτερη (διπλό πάτημα / δεύτερη συσκευή → δύο συνδρομές). Τα sessions
 * δημιουργούνται με customer_email (όχι customer), οπότε το φίλτρο
 * `customer` του Stripe δεν τα βρίσκει· ελέγχεται το `metadata` του ίδιου
 * του session (user_id + ai_plan_id + billing, βλ. create-checkout). Sessions
 * χωρίς αυτό (παλαιότερα) απλώς δεν ταιριάζουν. Σφάλμα του Stripe → null
 * (δημιουργείται νέα, όπως πριν).
 */
export async function openAiCheckoutSessionUrl(
  userId: string, planId: string, billing: string, minutes = 30,
): Promise<string | null> {
  try {
    const since = Math.floor(Date.now() / 1000) - minutes * 60
    const list = await stripe.checkout.sessions.list({ status: 'open', created: { gte: since }, limit: 100 })
    const hit = list.data.find(s =>
      s.mode === 'subscription' && s.url &&
      s.metadata?.user_id === userId && s.metadata?.ai_plan_id === planId && s.metadata?.billing === billing)
    return hit?.url ?? null
  } catch (err: any) {
    console.error('Stripe checkout session list error:', err?.message)
    return null
  }
}

/**
 * Οι ΑΛΛΕΣ ζωντανές συνδρομές AI του χρήστη στο Stripe (εκτός από `exceptId`),
 * με την ημερομηνία δημιουργίας τους — για τον κανόνα «μία συνδρομή AI ανά
 * χρήστη, κρατιέται η νεότερη» στην ενεργοποίηση (webhook). Πηγές: η τρέχουσα
 * καταγραφή ενεργοποίησης και η αναζήτηση με metadata user_id. Πετά σφάλμα αν
 * αποτύχει το Stripe ή η βάση.
 */
export async function otherLiveAiSubscriptions(userId: string, exceptId: string): Promise<{ id: string; created: number; status: string }[]> {
  const out = new Map<string, { created: number; status: string }>()
  const live = (s: Stripe.Subscription) => s.status !== 'canceled' && s.status !== 'incomplete_expired'
  if (/^[A-Za-z0-9_-]+$/.test(userId)) {
    const found = await stripe.subscriptions.search({ query: `metadata['user_id']:'${userId}'`, limit: 100 })
    for (const s of found.data) {
      if (s.id === exceptId || !s.metadata?.ai_plan_id || !live(s)) continue
      out.set(s.id, { created: s.created, status: s.status })
    }
  }
  // Η αναζήτηση του Stripe ενημερώνεται με καθυστέρηση· η τρέχουσα από την
  // καταγραφή διαβάζεται απευθείας.
  const current = await currentAiStripeSubscriptionId(userId)
  if (current && current !== exceptId && !out.has(current)) {
    try {
      const s = await stripe.subscriptions.retrieve(current)
      if (live(s)) out.set(s.id, { created: s.created, status: s.status })
    } catch (err: any) {
      if (err?.code !== 'resource_missing') throw err
    }
  }
  return [...out].map(([id, v]) => ({ id, ...v }))
}
