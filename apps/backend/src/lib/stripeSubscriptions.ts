import Stripe from 'stripe'
import prisma from './prisma.js'
import { auditSystem } from './audit.js'
import { revokeStripeInvoice, aiDiscountForEmail } from './loyalty.js'

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
      // Σύντομο όριο, καμία επανάληψη (όπως stripePeriodEnd / routes/payments):
      // καλείται και από αιτήματα χρήστη (ακύρωση συνδρομής).
      const found = await stripe.subscriptions.search(
        { query: `metadata['user_id']:'${userId}'`, limit: 100 },
        { timeout: 5000, maxNetworkRetries: 0 },
      )
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
 * Σφάλμα που αξίζει επανάληψη (το webhook απαντά 500, το Stripe ξαναστέλνει):
 * δίκτυο / σφάλμα του Stripe / όριο αιτημάτων, ή σφάλμα εκτός Stripe (π.χ.
 * βάση). Μόνιμα σφάλματα του Stripe (invalid_request, card, permission κ.λπ.)
 * δεν διορθώνονται με επανάληψη. Όπου έχει συμπληρωθεί `out`, εκεί γράφεται.
 */
export type StripeErrorOut = { transient?: boolean; message?: string }
const TRANSIENT_STRIPE_TYPES = ['StripeConnectionError', 'StripeAPIError', 'StripeRateLimitError']
export function isTransientStripeError(err: any): boolean {
  if (err?.permanent === true) return false
  const type = typeof err?.type === 'string' ? err.type : ''
  if (TRANSIENT_STRIPE_TYPES.includes(type)) return true
  if (type.startsWith('Stripe')) return false
  return true
}
const noteError = (out: StripeErrorOut | undefined, err: any) => {
  if (!out) return
  out.transient = isTransientStripeError(err)
  out.message = String(err?.message ?? err).slice(0, 500)
}

/**
 * ΑΜΕΣΗ ακύρωση στο Stripe, χωρίς επιστροφή (ίδιο με την ακύρωση από τον
 * πελάτη). `true` αν ακυρώθηκε ή το Stripe την έχει ήδη τερματίσει
 * (resource_missing / ήδη canceled)· `false` αν η ακύρωση απέτυχε (τότε το
 * `out`, αν δοθεί, λέει αν το σφάλμα είναι προσωρινό).
 */
export async function cancelStripeSubscription(id: string, out?: StripeErrorOut): Promise<boolean> {
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
    if (!gone) {
      console.error('Stripe subscription cancel error:', id, err?.message)
      noteError(out, err)
    }
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
 *
 * ΑΝΕΞΑΡΤΗΤΑ ΑΠΟ ΠΛΑΝΟ/ΧΡΕΩΣΗ: πριν ταίριαζε μόνο ίδιο πλάνο και ίδια
 * χρέωση, οπότε ένα ανοιχτό checkout «Basic μηνιαίο» και ένα δεύτερο «Pro
 * ετήσιο» ολοκληρώνονταν και τα δύο (δύο συνδρομές, διπλή χρέωση). Τώρα:
 *   · ίδιο πλάνο και χρέωση → επιστρέφεται το ίδιο URL (όπως πριν)·
 *   · ΑΛΛΟ πλάνο/χρέωση → το παλιό session λήγει (checkout.sessions.expire —
 *     ένα ληγμένο session δεν ολοκληρώνεται πια) και δημιουργείται νέο για
 *     ό,τι διάλεξε τώρα ο χρήστης·
 *   · αν η λήξη ΑΠΟΤΥΧΕΙ (π.χ. ο χρήστης πληρώνει εκείνη τη στιγμή) →
 *     AI_CHECKOUT_BUSY (το route απαντά 409)· ΔΕΝ επιστρέφεται το URL του
 *     άλλου πλάνου, γιατί ο χρήστης θα πλήρωνε πλάνο/χρέωση που δεν διάλεξε.
 *   · ίδιο πλάνο/χρέωση αλλά ΑΛΛΟ ποσό (ο admin άλλαξε την τιμή στο μεταξύ)
 *     → όπως «άλλο πλάνο»: λήξη και νέο session με την τρέχουσα τιμή — ποτέ
 *     το παλιό URL με την παλιά τιμή. Ποσό του session: metadata.unit_amount
 *     (σε λεπτά — το γράφουν τα sessions από το Ε18 και μετά)· παλαιότερα
 *     χωρίς αυτό → amount_subtotal (ποσό πριν από εκπτώσεις, ποσότητα 1).
 *     Χωρίς `unitAmount` (καλών που δεν το δίνει) → δεν ελέγχεται ποσό.
 * Ό,τι ξεφύγει (π.χ. session παλαιότερο του παραθύρου) το πιάνει το webhook:
 * η διπλή συνδρομή ακυρώνεται και το τιμολόγιό της επιστρέφεται
 * (refundLatestPaidInvoice).
 */
export const AI_CHECKOUT_BUSY = 'busy' as const
export async function openAiCheckoutSessionUrl(
  userId: string, planId: string, billing: string, minutes = 30, unitAmount?: number,
): Promise<string | typeof AI_CHECKOUT_BUSY | null> {
  let open: Stripe.Checkout.Session[]
  try {
    const since = Math.floor(Date.now() / 1000) - minutes * 60
    const list = await stripe.checkout.sessions.list({ status: 'open', created: { gte: since }, limit: 100 })
    // Μόνο sessions AI (με ai_plan_id) — όχι της συνδρομής τροφής του ίδιου χρήστη.
    open = list.data.filter(s => s.mode === 'subscription' && !!s.url &&
      s.metadata?.user_id === userId && !!s.metadata?.ai_plan_id)
  } catch (err: any) {
    console.error('Stripe checkout session list error:', err?.message)
    return null
  }
  const samePrice = (s: Stripe.Checkout.Session): boolean => {
    if (unitAmount === undefined) return true
    const md = s.metadata?.unit_amount
    if (md !== undefined && md !== null && md !== '') return Number(md) === unitAmount
    return s.amount_subtotal === unitAmount
  }
  const same = open.find(s => s.metadata?.ai_plan_id === planId && s.metadata?.billing === billing && samePrice(s))
  if (same) return same.url ?? null
  // Ό,τι έμεινε (άλλο πλάνο/χρέωση ή ίδιο με παλιά τιμή) λήγει.
  for (const other of open) {
    try {
      await stripe.checkout.sessions.expire(other.id)
    } catch (err: any) {
      console.error('Stripe checkout session expire error (other plan still open):', other.id, err?.message)
      return AI_CHECKOUT_BUSY
    }
  }
  return null
}

/**
 * Ε18 — Checkout Session συνδρομής AI στο Stripe: ΚΟΙΝΟ για το
 * POST /ai-subscriptions/create-checkout και το POST /membership/checkout
 * (GlobiPet Plus = πλάνο AI με tier 'membership'). Ό,τι έκανε μέχρι τώρα το
 * create-checkout, αυτούσιο:
 *   · ανοιχτό checkout ίδιου πλάνου/χρέωσης → ίδιο URL· άλλου πλάνου που δεν
 *     λήγει → `{ busy: true }` (το route απαντά 409) — openAiCheckoutSessionUrl·
 *   · έκπτωση επιπέδου επιβράβευσης (aiTierCheckoutDiscount — δεν πετάει)·
 *   · ανοιχτό checkout ίδιου πλάνου/χρέωσης με ΑΛΛΗ τιμή → λήγει, νέο session·
 *   · metadata { user_id, ai_plan_id, billing } στο session ΚΑΙ στη συνδρομή —
 *     από αυτά ενεργοποιεί το webhook (routes/webhooks activateAiSubscription).
 * Οι έλεγχοι κατάστασης του χρήστη (ενεργή/εκκρεμής συνδρομή) μένουν στο
 * route, με τα δικά του μηνύματα. Σφάλμα του Stripe στη δημιουργία → throw
 * (το route απαντά serverError, όπως πριν).
 */
export async function createAiCheckoutSession(p: {
  userId: string
  userEmail: string
  plan: { id: string; price_monthly: number; price_annual: number | null }
  /** 'annual' → ετήσια· οτιδήποτε άλλο → μηνιαία (όπως το create-checkout). */
  billing: any
  productName: string
  successUrl: string
  cancelUrl: string
}): Promise<{ busy: true } | { busy: false; checkout_url: string | null }> {
  const { userId, userEmail, plan, billing } = p
  const isAnnual = billing === 'annual'
  const unitAmount = isAnnual
    ? Math.round((plan.price_annual ?? plan.price_monthly * 12) * 100)
    : Math.round(plan.price_monthly * 100)
  const interval: 'month' | 'year' = isAnnual ? 'year' : 'month'

  // Ανοιχτό checkout του ίδιου χρήστη για το ίδιο πλάνο τα τελευταία 30'
  // (διπλό πάτημα, δεύτερη συσκευή): επιστρέφεται το ίδιο URL αντί για
  // δεύτερο session — δύο ολοκληρωμένα sessions θα έφτιαχναν δύο συνδρομές.
  // Με το τρέχον ποσό: ανοιχτό session με άλλη τιμή (αλλαγή από τον admin) λήγει.
  const reuse = await openAiCheckoutSessionUrl(String(userId), plan.id, String(billing), 30, unitAmount)
  // Ανοιχτό checkout ΑΛΛΟΥ πλάνου που δεν έληξε (π.χ. πληρώνεται τώρα): όχι
  // δεύτερο session και όχι το URL του άλλου πλάνου.
  if (reuse === AI_CHECKOUT_BUSY) return { busy: true }
  if (reuse) return { busy: false, checkout_url: reuse }

  // Έκπτωση επιπέδου επιβράβευσης (σε αποτυχία καμία έκπτωση).
  // Κουπόνι μίας περιόδου χρέωσης: 12 μήνες για ετήσια, 1 για μηνιαία.
  const tierDiscount = await aiTierCheckoutDiscount(String(userEmail), interval)
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: userEmail,
    // Στο ίδιο το session (όχι μόνο στη συνδρομή), για τον έλεγχο ανοιχτού checkout.
    // unit_amount (λεπτά): για τον έλεγχο «ίδια τιμή» του openAiCheckoutSessionUrl.
    metadata: { user_id: String(userId), ai_plan_id: plan.id, billing: String(billing), unit_amount: String(unitAmount) },
    line_items: [{
      price_data: {
        currency: 'eur',
        unit_amount: unitAmount,
        recurring: { interval },
        product_data: { name: p.productName },
      },
      quantity: 1,
    }],
    subscription_data: {
      metadata: {
        user_id: userId,
        ai_plan_id: plan.id,
        billing,
      },
    },
    ...(tierDiscount.discounts ? { discounts: tierDiscount.discounts } : {}),
    success_url: p.successUrl,
    cancel_url: p.cancelUrl,
  })
  return { busy: false, checkout_url: session.url }
}

/**
 * Ε17 — Ημερομηνία ανανέωσης (τέλος τρέχουσας περιόδου) της ενεργής συνδρομής AI.
 * (Ε18: μεταφέρθηκε εδώ από το routes/ai-subscriptions — κοινή με το
 * GET /membership.) Πρώτα η καταγραφή ενεργοποίησης (routes/webhooks —
 * metadata.current_period_end): αν είναι ακόμη στο μέλλον, είναι η τρέχουσα
 * περίοδος. Αλλιώς (έχει γίνει ανανέωση) μία ανάγνωση της συνδρομής από το
 * Stripe, με όριο χρόνου και cache στη μνήμη της διεργασίας (stripePeriodEnd).
 * Το webhook invoice.payment_succeeded ανανεώνει το current_period_end της
 * καταγραφής, οπότε η ανάγνωση από το Stripe είναι σπάνια. Ποτέ δεν πετάει:
 * σε σφάλμα/έλλειψη επιστρέφει null. Συνδρομή που έχει οριστεί να λήξει στο
 * τέλος της περιόδου δεν «ανανεώνεται» → null.
 */
const PERIOD_HIT_MAX_MS = 6 * 60 * 60 * 1000
const PERIOD_MISS_TTL_MS = 10 * 60 * 1000
const PERIOD_CACHE_MAX = 1000
const periodEndCache = new Map<string, { until: number; value: string | null }>()

/**
 * current_period_end μιας συνδρομής από το Stripe, με cache ανά id συνδρομής:
 * τιμή → έως το τέλος της περιόδου (το πολύ 6 ώρες, ώστε ακύρωση/αλλαγή να
 * φαίνεται)· null/σφάλμα → 10 λεπτά (όχι κλήση στο Stripe σε κάθε άνοιγμα).
 */
async function stripePeriodEnd(subId: string): Promise<string | null> {
  const hit = periodEndCache.get(subId)
  if (hit && hit.until > Date.now()) return hit.value
  let value: string | null = null
  try {
    const sub = await stripe.subscriptions.retrieve(subId, {}, { timeout: 4000, maxNetworkRetries: 0 })
    if (!sub.cancel_at_period_end && sub.status !== 'canceled' && sub.current_period_end) {
      value = new Date(sub.current_period_end * 1000).toISOString()
    }
  } catch (err: any) {
    console.error('[ai-subscriptions] renewal date (Stripe) error:', err?.message ?? err)
    value = null
  }
  const ttl = value
    ? Math.max(0, Math.min(new Date(value).getTime() - Date.now(), PERIOD_HIT_MAX_MS))
    : PERIOD_MISS_TTL_MS
  if (periodEndCache.size >= PERIOD_CACHE_MAX) periodEndCache.delete(periodEndCache.keys().next().value as string)
  periodEndCache.set(subId, { until: Date.now() + ttl, value })
  return value
}

export async function aiRenewalDate(userId: string): Promise<string | null> {
  try {
    const row = await prisma.auditLog.findFirst({
      where: { action: AI_SUB_ACTIVATED_ACTION, resource: 'user', resource_id: userId },
      orderBy: { created_at: 'desc' },
      select: { metadata: true },
    })
    const meta = (row?.metadata ?? {}) as any
    const stored = typeof meta.current_period_end === 'string' ? new Date(meta.current_period_end) : null
    if (stored && !isNaN(stored.getTime()) && stored.getTime() > Date.now()) return stored.toISOString()
    const subId = typeof meta.stripe_subscription_id === 'string' ? meta.stripe_subscription_id : null
    if (!subId || !process.env.STRIPE_SECRET_KEY) return null
    return await stripePeriodEnd(subId)
  } catch (err: any) {
    console.error('[ai-subscriptions] renewal date error:', err?.message ?? err)
    return null
  }
}

/**
 * Έκπτωση επιπέδου επιβράβευσης στη συνδρομή AI (Ε17) — η ΜΟΝΗ έκπτωση της
 * πλατφόρμας από το πρόγραμμα (ποτέ σε προϊόντα/υπηρεσίες παρόχων).
 *
 * Κουπόνι του Stripe ανά (ποσοστό, μήνες), κοινό για όλους:
 * `globipet-tier-<%>-<μήνες>m`, percent_off, duration 'repeating' με
 * duration_in_months = 12 για ετήσια χρέωση, 1 για μηνιαία — δηλαδή η
 * έκπτωση καλύπτει ΜΙΑ περίοδο χρέωσης (δημιουργείται την πρώτη φορά, μετά
 * ξαναχρησιμοποιείται· ταυτόχρονη δημιουργία → resource_already_exists →
 * ανάγνωση). Μπαίνει στο Checkout Session (`discounts`).
 *
 * ΓΙΑΤΙ 'repeating' (απόφαση ιδιοκτήτη: η έκπτωση ακολουθεί το ΤΡΕΧΟΝ
 * επίπεδο): με 'forever' η έκπτωση «κλείδωνε» στο επίπεδο της αγοράς — πτώση
 * επιπέδου (π.χ. μετά από επιστροφές) δεν την αφαιρούσε ποτέ. Τώρα λήγει
 * μετά την πρώτη περίοδο. ΑΝΤΙΤΙΜΟ: οι ανανεώσεις χρεώνονται σε πλήρη τιμή·
 * η επανεφαρμογή της έκπτωσης του τρέχοντος επιπέδου σε κάθε ανανέωση
 * (π.χ. στο webhook invoice.upcoming / customer.subscription.updated) ΔΕΝ
 * υλοποιείται εδώ — εκτός εμβέλειας, χρειάζεται ξεχωριστή απόφαση.
 *
 * Αποτυχία (Stripe/βάση, κουπόνι με άλλους όρους) → καμία έκπτωση, καταγραφή
 * στο log, το checkout συνεχίζει κανονικά. Ποτέ δεν πετάει.
 */
export async function aiTierCheckoutDiscount(email: string, interval: 'month' | 'year' = 'month'): Promise<{ discounts?: { coupon: string }[]; percent: number; tier: string }> {
  let tier = 'bronze'
  try {
    const d = await aiDiscountForEmail(email)
    tier = d.tier
    const percent = d.percent
    if (!(percent > 0)) return { percent: 0, tier }
    const months = interval === 'year' ? 12 : 1
    const id = `globipet-tier-${percent}-${months}m`
    let coupon: Stripe.Coupon | null = null
    try {
      coupon = await stripe.coupons.retrieve(id)
    } catch (err: any) {
      if (err?.code !== 'resource_missing') throw err
    }
    if (!coupon) {
      try {
        coupon = await stripe.coupons.create({
          id, percent_off: percent, duration: 'repeating', duration_in_months: months,
          name: `GlobiPet -${percent}% (${months}m)`,
        })
      } catch (err: any) {
        if (err?.code !== 'resource_already_exists') throw err
        coupon = await stripe.coupons.retrieve(id)
      }
    }
    if (!coupon.valid || coupon.percent_off !== percent || coupon.duration !== 'repeating' || coupon.duration_in_months !== months) {
      console.error(`[stripe] coupon ${id} is not a valid repeating ${percent}%/${months}m coupon — AI checkout without tier discount`)
      return { percent: 0, tier }
    }
    return { discounts: [{ coupon: id }], percent, tier }
  } catch (err: any) {
    console.error('[stripe] tier discount for AI checkout failed — no discount applied:', err?.message ?? err)
    return { percent: 0, tier }
  }
}

/**
 * Ανοιχτή Checkout Session συνδρομής ΤΡΟΦΗΣ του ίδιου χρήστη για το ίδιο
 * προϊόν, τα τελευταία `minutes` λεπτά — όπως το openAiCheckoutSessionUrl:
 * διπλό πάτημα / δεύτερη συσκευή / δεύτερη καρτέλα έφτιαχναν δεύτερο
 * session, και αν ολοκληρώνονταν και τα δύο ο πελάτης χρεωνόταν σε δύο
 * παράλληλες συνδρομές. Ταιριάζει με το metadata του session (user_id +
 * product_id, βλ. POST /subscriptions/food/:productId/checkout). Σφάλμα του
 * Stripe → null (νέο session — το webhook πιάνει τη διπλή συνδρομή).
 */
export async function openFoodCheckoutSessionUrl(userId: string, productId: string, minutes = 30): Promise<string | null> {
  try {
    const since = Math.floor(Date.now() / 1000) - minutes * 60
    const list = await stripe.checkout.sessions.list({ status: 'open', created: { gte: since }, limit: 100 })
    const hit = list.data.find(s =>
      s.mode === 'subscription' && s.url && !s.metadata?.ai_plan_id &&
      s.metadata?.user_id === userId && s.metadata?.product_id === productId)
    return hit?.url ?? null
  } catch (err: any) {
    console.error('Stripe checkout session list error:', err?.message)
    return null
  }
}

/**
 * Επιστροφή ΟΛΟΚΛΗΡΟΥ ενός πληρωμένου τιμολογίου συνδρομής (διπλή συνδρομή
 * που ακυρώθηκε). Ιδεμποτική, σε τρία επίπεδα:
 *   1. καταγραφή επιτυχίας στο audit (`action`, metadata.transaction_id =
 *      invoice id) → 'already', καμία κλήση·
 *   2. η χρέωση του Stripe είναι ήδη (ολόκληρη) επιστραμμένη → 'already'·
 *   3. idempotency key ανά τιμολόγιο: επανάληψη του ίδιου αιτήματος (π.χ.
 *      μετά από timeout) δεν κάνει δεύτερη επιστροφή στο Stripe.
 *   'unpaid'   — το τιμολόγιο δεν πληρώθηκε (τίποτα να επιστραφεί)
 *   'refunded' — έγινε τώρα (audit success)
 *   'failed'   — σφάλμα (audit failure → «Αποτυχημένες επιστροφές»)· ασφαλής
 *                επανάληψη χάρη στο 2 και 3.
 * Ποτέ δεν πετάει.
 */
export async function refundStripeInvoice(
  invoiceId: string, ctx: { action: string; resource: string; resourceId: string; email?: string | null; reason: string; subscriptionId: string },
  out?: StripeErrorOut,
): Promise<'refunded' | 'already' | 'unpaid' | 'failed'> {
  const meta = { transaction_id: invoiceId, invoice_id: invoiceId, stripe_subscription_id: ctx.subscriptionId, reason: ctx.reason }
  try {
    const done = await prisma.auditLog.findFirst({
      where: {
        action: ctx.action, resource: ctx.resource, resource_id: ctx.resourceId, outcome: 'success',
        metadata: { path: ['transaction_id'], equals: invoiceId },
      },
      select: { id: true },
    })
    if (done) {
      await revokeStripeInvoice(invoiceId) // πόντοι επιβράβευσης (lib/loyalty — ιδεμποτικό, δεν πετάει)
      return 'already'
    }
    const inv = await stripe.invoices.retrieve(invoiceId)
    if (inv.status !== 'paid' || !(inv.amount_paid > 0)) return 'unpaid'
    const chargeId = typeof inv.charge === 'string' ? inv.charge : inv.charge?.id ?? null
    if (!chargeId) throw Object.assign(new Error(`invoice ${invoiceId} has no charge`), { permanent: true })
    const charge = await stripe.charges.retrieve(chargeId)
    if (charge.refunded || charge.amount_refunded >= charge.amount) {
      await auditSystem({
        action: ctx.action, resource: ctx.resource, resource_id: ctx.resourceId, subject_email: ctx.email ?? null,
        metadata: { ...meta, amount: inv.amount_paid / 100, refund_id: null, source: 'already_refunded_in_stripe' },
      })
      await revokeStripeInvoice(invoiceId) // πόντοι επιβράβευσης (lib/loyalty — ιδεμποτικό, δεν πετάει)
      return 'already'
    }
    const refund = await stripe.refunds.create(
      { charge: chargeId, metadata: { reason: ctx.reason, invoice_id: invoiceId, subscription_id: ctx.subscriptionId } },
      { idempotencyKey: `globipet-sub-dup-refund-${invoiceId}` },
    )
    await auditSystem({
      action: ctx.action, resource: ctx.resource, resource_id: ctx.resourceId, subject_email: ctx.email ?? null,
      metadata: { ...meta, amount: (refund.amount ?? 0) / 100, refund_id: refund.id },
    })
    await revokeStripeInvoice(invoiceId) // πόντοι επιβράβευσης (lib/loyalty — ιδεμποτικό, δεν πετάει)
    return 'refunded'
  } catch (err: any) {
    console.error(`[stripe] refund of invoice ${invoiceId} (${ctx.reason}) failed:`, err?.message)
    noteError(out, err)
    await auditSystem({
      action: ctx.action, resource: ctx.resource, resource_id: ctx.resourceId, subject_email: ctx.email ?? null,
      outcome: 'failure', error_message: String(err?.message ?? err).slice(0, 500), metadata: meta,
    })
    return 'failed'
  }
}

/**
 * Το τελευταίο ΠΛΗΡΩΜΕΝΟ τιμολόγιο μιας συνδρομής επιστρέφεται ολόκληρο
 * (refundStripeInvoice — ιδεμποτικό). Καλείται ΜΕΤΑ την ακύρωση μιας διπλής
 * συνδρομής. Κανένα πληρωμένο τιμολόγιο → 'unpaid'. Ποτέ δεν πετάει.
 *
 * `notBefore` (unix δευτερόλεπτα): επιστρέφεται μόνο τιμολόγιο που εκδόθηκε
 * από τότε και μετά. Παλαιότερο (π.χ. μήνες πληρωμένης χρήσης μιας παλιάς
 * συνδρομής πριν αγοραστεί η νέα) → 'skipped', καμία επιστροφή, καταγραφή
 * `<action>_skipped` με τον λόγο.
 */
export async function refundLatestPaidInvoice(
  subscriptionId: string, ctx: { action: string; resource: string; resourceId: string; email?: string | null; reason: string },
  notBefore?: number,
  out?: StripeErrorOut,
): Promise<'refunded' | 'already' | 'unpaid' | 'failed' | 'skipped'> {
  let invoiceId: string | null = null
  let invoiceCreated: number | null = null
  try {
    const list = await stripe.invoices.list({ subscription: subscriptionId, status: 'paid', limit: 1 })
    invoiceId = list.data[0]?.id ?? null
    invoiceCreated = list.data[0]?.created ?? null
  } catch (err: any) {
    console.error(`[stripe] invoices of ${subscriptionId} could not be listed:`, err?.message)
    noteError(out, err)
    await auditSystem({
      action: ctx.action, resource: ctx.resource, resource_id: ctx.resourceId, subject_email: ctx.email ?? null,
      outcome: 'failure', error_message: String(err?.message ?? err).slice(0, 500),
      metadata: { transaction_id: null, stripe_subscription_id: subscriptionId, reason: ctx.reason },
    })
    return 'failed'
  }
  if (!invoiceId) return 'unpaid'
  if (notBefore !== undefined && invoiceCreated !== null && invoiceCreated < notBefore) {
    await auditSystem({
      action: `${ctx.action}_skipped`, resource: ctx.resource, resource_id: ctx.resourceId, subject_email: ctx.email ?? null,
      metadata: {
        transaction_id: invoiceId, invoice_id: invoiceId, stripe_subscription_id: subscriptionId, reason: ctx.reason,
        skipped: 'invoice_older_than_kept_subscription',
        invoice_created: new Date(invoiceCreated * 1000).toISOString(), not_before: new Date(notBefore * 1000).toISOString(),
      },
    })
    return 'skipped'
  }
  return refundStripeInvoice(invoiceId, { ...ctx, subscriptionId }, out)
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
