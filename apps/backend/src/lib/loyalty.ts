import type { Prisma } from '@prisma/client'
import prisma from './prisma.js'
import { pointsMultiplierFor } from './membership.js'

/**
 * Πρόγραμμα επιβράβευσης (Ε17) — πόντοι ανάλογα με τα ευρώ που ΠΛΗΡΩΘΗΚΑΝ.
 *
 * ΚΑΝΟΝΕΣ (απόφαση ιδιοκτήτη)
 *   · πόντοι = floor(ποσό € × points_per_euro), για πληρωμένες παραγγελίες,
 *     κρατήσεις, τηλεϊατρική, εκδηλώσεις και τιμολόγια συνδρομών Stripe
 *     (AI και τροφής).
 *   · Επιστροφή χρημάτων αφαιρεί τους πόντους ΑΥΤΗΣ της πληρωμής αναλογικά
 *     (πλήρης → όλους)· ποτέ κάτω από 0.
 *   · Επίπεδα από τους πόντους όλων των εποχών (lifetime_points), με όρια
 *     ρυθμίσιμα από τον διαχειριστή· όφελος = έκπτωση % ΜΟΝΟ στις συνδρομές AI.
 *
 * ΣΧΗΜΑ — καμία αλλαγή. Χρησιμοποιούνται:
 *   · loyalty_points (LoyaltyPoints): total_points / lifetime_points / tier —
 *     αυτά διαβάζουν web και κινητό (GET /loyalty).
 *   · users.total_points / users.loyalty_tier: καθρέφτης, στην ΙΔΙΑ συναλλαγή.
 *   · audit_logs ως σημάδια ιδεμποτικότητας (το LoyaltyPoints δεν έχει πεδίο
 *     αναφοράς): `loyalty_award` (resource_id = <πηγή>:<αναφορά>, metadata
 *     ποσό/πόντοι) και `loyalty_revoke` (resource_id = αναφορά επιστροφής).
 *   · app_settings `loyalty_config` (JSON) για τις ρυθμίσεις.
 *
 * ΑΤΟΜΙΚΟΤΗΤΑ: κάθε απόδοση/αφαίρεση τρέχει σε συναλλαγή βάσης υπό
 * pg_advisory_xact_lock ανά χρήστη: έλεγχος σημαδιού → σημάδι → μεταβολή,
 * όλα μαζί ή τίποτα. Δύο ταυτόχρονα webhooks της ίδιας πληρωμής → μία απόδοση.
 *
 * ΠΟΤΕ ΔΕΝ ΠΕΤΑΕΙ: σφάλμα εδώ δεν σπάει επιβεβαίωση πληρωμής ή επιστροφή
 * (console.error και 0).
 */

export const TIERS = ['bronze', 'silver', 'gold', 'platinum'] as const
export type Tier = typeof TIERS[number]

export interface LoyaltyConfig {
  points_per_euro: number
  thresholds: Record<Tier, number>
  ai_discount_percent: Record<Tier, number>
}

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  points_per_euro: 1,
  thresholds: { bronze: 0, silver: 1000, gold: 5000, platinum: 10000 },
  ai_discount_percent: { bronze: 0, silver: 5, gold: 10, platinum: 15 },
}

const SETTING_KEY = 'loyalty_config'
export const LOYALTY_AWARD_ACTION = 'loyalty_award'
export const LOYALTY_REVOKE_ACTION = 'loyalty_revoke'
export const LOYALTY_CONFIG_ACTION = 'loyalty_config_update'
const RESOURCE = 'loyalty'
const LOCK_SPACE = 'globipet:loyalty'
const PAYMENT_LOCK_SPACE = 'globipet:loyalty-payment'

export const MAX_POINTS_PER_EURO = 1000
export const MAX_THRESHOLD = 100_000_000
export const MAX_AI_DISCOUNT = 50

/**
 * Έλεγχος ρυθμίσεων (PUT του διαχειριστή και ανάγνωση της βάσης).
 *   · points_per_euro: 0…1000, έως 2 δεκαδικά (0 = καμία απόδοση)
 *   · όρια: ακέραιοι, bronze = 0, silver < gold < platinum
 *   · έκπτωση AI: ακέραιος 0…50 ανά επίπεδο
 * Επιστρέφει το ελληνικό μήνυμα σφάλματος ή τις καθαρές ρυθμίσεις.
 */
/** Μόνο αριθμός ή αριθμητικό κείμενο «12» / «12.5» (το κόμμα το μετατρέπει ήδη το UI). '', null, boolean, πίνακες → NaN. */
function strictNumber(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && /^\d+(\.\d+)?$/.test(v.trim())) return Number(v.trim())
  return NaN
}

export function validateLoyaltyConfig(input: any): { ok: true; config: LoyaltyConfig } | { ok: false; message: string } {
  const ppe = strictNumber(input?.points_per_euro)
  if (!Number.isFinite(ppe) || ppe < 0 || ppe > MAX_POINTS_PER_EURO || Math.abs(Math.round(ppe * 100) - ppe * 100) > 1e-6) {
    return { ok: false, message: 'Μη έγκυροι πόντοι ανά ευρώ (0 έως 1000, έως 2 δεκαδικά)' }
  }
  const thresholds = {} as Record<Tier, number>
  for (const t of TIERS) {
    const v = t === 'bronze' && (input?.thresholds?.bronze === undefined || input?.thresholds?.bronze === null)
      ? 0 : strictNumber(input?.thresholds?.[t])
    if (!Number.isInteger(v) || v < 0 || v > MAX_THRESHOLD) {
      return { ok: false, message: 'Μη έγκυρα όρια επιπέδων (ακέραιοι πόντοι)' }
    }
    thresholds[t] = v
  }
  if (thresholds.bronze !== 0) return { ok: false, message: 'Το όριο του πρώτου επιπέδου πρέπει να είναι 0' }
  if (!(thresholds.silver > thresholds.bronze && thresholds.gold > thresholds.silver && thresholds.platinum > thresholds.gold)) {
    return { ok: false, message: 'Τα όρια των επιπέδων πρέπει να αυξάνονται' }
  }
  const ai = {} as Record<Tier, number>
  for (const t of TIERS) {
    const v = strictNumber(input?.ai_discount_percent?.[t] ?? (t === 'bronze' ? 0 : NaN))
    if (!Number.isInteger(v) || v < 0 || v > MAX_AI_DISCOUNT) {
      return { ok: false, message: 'Μη έγκυρο ποσοστό έκπτωσης (ακέραιος 0 έως 50)' }
    }
    ai[t] = v
  }
  return { ok: true, config: { points_per_euro: ppe, thresholds, ai_discount_percent: ai } }
}

let cache: { config: LoyaltyConfig; expires: number } | null = null

/** Ρυθμίσεις από app_settings, 60″ στη μνήμη. Άκυρη/λείπει → προεπιλογές. Δεν πετάει. */
export async function getLoyaltyConfig(client: Pick<Tx, 'appSetting'> = prisma): Promise<LoyaltyConfig> {
  if (cache && cache.expires > Date.now()) return cache.config
  let config = DEFAULT_LOYALTY_CONFIG
  try {
    const row = await client.appSetting.findUnique({ where: { key: SETTING_KEY } })
    if (row) {
      let parsed: any = null
      try { parsed = JSON.parse(row.value) } catch { parsed = null }
      // Συμπλήρωση από τις προεπιλογές ό,τι λείπει, έλεγχος του συνόλου.
      const merged = {
        points_per_euro: parsed?.points_per_euro ?? DEFAULT_LOYALTY_CONFIG.points_per_euro,
        thresholds: { ...DEFAULT_LOYALTY_CONFIG.thresholds, ...(parsed?.thresholds ?? {}) },
        ai_discount_percent: { ...DEFAULT_LOYALTY_CONFIG.ai_discount_percent, ...(parsed?.ai_discount_percent ?? {}) },
      }
      const v = validateLoyaltyConfig(merged)
      if (v.ok) config = v.config
      else console.error(`[loyalty] invalid ${SETTING_KEY} in app_settings (${v.message}) — using defaults`)
    }
  } catch (err: any) {
    console.error('[loyalty] config read failed — using defaults:', err?.message)
    // Χωρίς cache: ξαναδοκιμάζεται στην επόμενη κλήση.
    return config
  }
  cache = { config, expires: Date.now() + 60_000 }
  return config
}

/** Αποθήκευση (ήδη ελεγμένων) ρυθμίσεων· ακυρώνει την cache αυτής της διεργασίας. */
export async function setLoyaltyConfig(config: LoyaltyConfig): Promise<LoyaltyConfig> {
  const value = JSON.stringify(config)
  await prisma.appSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value },
    create: { key: SETTING_KEY, value },
  })
  cache = { config, expires: Date.now() + 60_000 }
  return config
}

export function tierFor(lifetimePoints: number, cfg: LoyaltyConfig = DEFAULT_LOYALTY_CONFIG): Tier {
  const p = Number(lifetimePoints) || 0
  if (p >= cfg.thresholds.platinum) return 'platinum'
  if (p >= cfg.thresholds.gold) return 'gold'
  if (p >= cfg.thresholds.silver) return 'silver'
  return 'bronze'
}

/** Επίπεδο, επόμενο επίπεδο και πόσοι πόντοι λείπουν. */
export function tierProgress(lifetimePoints: number, cfg: LoyaltyConfig) {
  const tier = tierFor(lifetimePoints, cfg)
  const idx = TIERS.indexOf(tier)
  const next: Tier | null = idx < TIERS.length - 1 ? TIERS[idx + 1] : null
  const nextThreshold = next ? cfg.thresholds[next] : null
  return {
    tier,
    current_threshold: cfg.thresholds[tier],
    next_tier: next,
    next_threshold: nextThreshold,
    points_to_next: nextThreshold !== null ? Math.max(0, nextThreshold - Math.max(0, lifetimePoints)) : 0,
  }
}

/** floor(ποσό × πόντοι/€) — η στρογγύλευση στα χιλιοστά αποφεύγει το 19.99×100 = 1998.9999. */
export function pointsForAmount(amountEur: number, cfg: LoyaltyConfig): number {
  const a = Number(amountEur)
  if (!Number.isFinite(a) || a <= 0) return 0
  return Math.max(0, Math.floor(Math.round(a * cfg.points_per_euro * 1000) / 1000))
}

type Tx = Prisma.TransactionClient

async function lockUser(tx: Tx, email: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${LOCK_SPACE}), hashtext(${email}))::text AS ok`
}

/**
 * Κλείδωμα ανά πληρωμή — ΠΑΝΤΑ πριν από το κλείδωμα του χρήστη (ίδια σειρά
 * σε απόδοση και αφαίρεση: κανένα αδιέξοδο). Χρειάζεται επειδή μια πλήρης
 * επιστροφή μπορεί να φτάσει ΠΡΙΝ από την απόδοση (π.χ. διπλή συνδρομή που
 * επιστρέφεται μέσα στο ίδιο γεγονός): τότε γράφεται σημάδι αφαίρεσης χωρίς
 * πόντους και η απόδοση που ακολουθεί δεν γίνεται.
 */
async function lockPayment(tx: Tx, key: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${PAYMENT_LOCK_SPACE}), hashtext(${key}))::text AS ok`
}

async function fullyRefundedBeforeAward(tx: Tx, key: string): Promise<boolean> {
  const row = await tx.auditLog.findFirst({
    where: {
      action: LOYALTY_REVOKE_ACTION, resource: RESOURCE,
      AND: [{ metadata: { path: ['payment_key'], equals: key } }, { metadata: { path: ['full'], equals: true } }],
    },
    select: { id: true },
  })
  return !!row
}

/**
 * Μεταβολή πόντων (θετική ή αρνητική) στο loyalty_points ΚΑΙ στο users, με
 * επίπεδο από τα όρια των ρυθμίσεων. Ποτέ κάτω από 0. Μέσα σε συναλλαγή υπό
 * κλείδωμα του χρήστη. `lifetime`: αν η μεταβολή αγγίζει και τους πόντους
 * όλων των εποχών (απόδοση/επιστροφή — ναι· εξαργύρωση — όχι).
 */
async function applyDeltaTx(tx: Tx, email: string, delta: number, lifetime: boolean, cfg: LoyaltyConfig) {
  const existing = await tx.loyaltyPoints.findUnique({ where: { user_email: email } })
  // Αφαίρεση χωρίς γραμμή πόντων: τίποτα να μειωθεί — ΚΑΜΙΑ νέα γραμμή
  // (π.χ. διαγραμμένος χρήστης ή χειροκίνητη αφαίρεση σε μηδενικό λογαριασμό).
  if (!existing && delta <= 0) return null
  const curTotal = existing?.total_points ?? 0
  const curLifetime = existing?.lifetime_points ?? 0
  const newTotal = Math.max(0, curTotal + delta)
  const newLifetime = lifetime ? Math.max(0, curLifetime + delta) : curLifetime
  const tier = tierFor(newLifetime, cfg)
  // upsert (INSERT … ON CONFLICT στο μοναδικό user_email): το GET /loyalty
  // μπορεί να δημιουργεί τη μηδενική γραμμή ταυτόχρονα, χωρίς το κλείδωμα —
  // όχι P2002. Οι τιμές είναι σωστές και τότε: η γραμμή του GET είναι μηδενική.
  const row = await tx.loyaltyPoints.upsert({
    where: { user_email: email },
    update: { total_points: newTotal, lifetime_points: newLifetime, tier },
    create: { user_email: email, total_points: newTotal, lifetime_points: newLifetime, tier },
  })
  // Καθρέφτης: το ΝΕΟ σύνολο της γραμμής πόντων (όχι παλιό users + delta,
  // που αποκλίνει αν ο καθρέφτης ήταν ήδη διαφορετικός).
  await tx.user.updateMany({
    where: { email },
    data: { total_points: row.total_points, loyalty_tier: tier },
  })
  return row
}

/** Χειροκίνητη μεταβολή (admin /loyalty/add). Ίδιο κλείδωμα και καθρέφτης στο users. */
export async function adjustPoints(email: string, delta: number) {
  const d = Math.trunc(delta)
  if (!Number.isFinite(d) || d === 0) return null
  const cfg = await getLoyaltyConfig()
  return prisma.$transaction(async (tx) => {
    await lockUser(tx, email)
    // Θετική χειροκίνητη προσθήκη μετρά και στους πόντους όλων των εποχών·
    // αφαίρεση μειώνει μόνο το υπόλοιπο (όπως πριν).
    return applyDeltaTx(tx, email, d, d > 0, cfg)
  })
}

const awardKey = (source: string, ref: string) => `${source}:${ref}`.slice(0, 255)

export interface AwardInput {
  email: string | null | undefined
  /** Ευρώ που πληρώθηκαν πραγματικά. */
  amount: number | null | undefined
  /** order | booking | telehealth | event | stripe_invoice */
  source: string
  /** Μοναδική αναφορά της πληρωμής (π.χ. <id>:<συναλλαγή>, id τιμολογίου). */
  ref: string
}

/**
 * Απόδοση πόντων για μια πληρωμή — ΜΙΑ φορά ανά (source, ref). Επιστρέφει
 * τους πόντους που δόθηκαν τώρα (0 αν ήδη δόθηκαν / μηδενικό ποσό / σφάλμα).
 * Ποτέ δεν πετάει.
 *
 * Ε18 — GlobiPet Plus: ενεργό μέλος ΤΗ ΣΤΙΓΜΗ ΤΗΣ ΑΠΟΔΟΣΗΣ → πόντοι ×
 * points_multiplier (lib/membership). Ο πολλαπλασιαστής και οι βασικοί πόντοι
 * γράφονται στο metadata του σημαδιού απόδοσης· το `points` είναι οι πόντοι
 * που ΔΟΘΗΚΑΝ (με τον πολλαπλασιαστή). Η αφαίρεση σε επιστροφή
 * (revokeCoreTx) διαβάζει ΑΥΤΟ το `points` — αφαιρεί αναλογικά ό,τι δόθηκε,
 * ποτέ περισσότερο, και οι παλιές εγγραφές (χωρίς πολλαπλασιαστή) μένουν ως έχουν.
 */
export async function awardForPayment(input: AwardInput): Promise<number> {
  try {
    const email = String(input.email ?? '').trim()
    if (!email || !input.ref) return 0
    const cfg = await getLoyaltyConfig()
    const basePoints = pointsForAmount(Number(input.amount), cfg)
    if (basePoints <= 0) return 0
    const multiplier = await pointsMultiplierFor(email) // 1 αν δεν είναι μέλος / σε σφάλμα
    const points = Math.max(0, Math.floor(basePoints * multiplier))
    if (points <= 0) return 0
    const key = awardKey(input.source, input.ref)
    return await prisma.$transaction(async (tx) => {
      await lockPayment(tx, key)
      await lockUser(tx, email)
      const done = await tx.auditLog.findFirst({
        where: { action: LOYALTY_AWARD_ACTION, resource: RESOURCE, resource_id: key },
        select: { id: true },
      })
      if (done) return 0
      // Η πληρωμή επιστράφηκε ολόκληρη πριν δοθούν οι πόντοι: τίποτα.
      if (await fullyRefundedBeforeAward(tx, key)) return 0
      // Χρήστης που δεν υπάρχει πια (διαγραμμένος λογαριασμός): τίποτα.
      const user = await tx.user.findUnique({ where: { email }, select: { id: true } })
      if (!user) return 0
      await tx.auditLog.create({
        data: {
          action: LOYALTY_AWARD_ACTION, resource: RESOURCE, resource_id: key,
          actor_id: null, actor_email: 'system@globipet', actor_role: 'system',
          subject_email: email, outcome: 'success',
          metadata: {
            source: input.source, ref: input.ref, amount: Math.round(Number(input.amount) * 100) / 100,
            points, points_per_euro: cfg.points_per_euro,
            base_points: basePoints, points_multiplier: multiplier,
          } as any,
        },
      })
      await applyDeltaTx(tx, email, points, true, cfg)
      return points
    })
  } catch (err: any) {
    console.error(`[loyalty] award ${input.source}:${input.ref} failed:`, err?.message ?? err)
    return 0
  }
}

/**
 * Απόδοση για πληρωμένη παραγγελία / κράτηση / συνεδρία, από τη βάση (email
 * και ποσό της εγγραφής — ό,τι επαληθεύτηκε στη Viva). Μόνο αν η εγγραφή
 * είναι ακόμη πληρωμένη με ΑΥΤΗ τη συναλλαγή. Ποτέ δεν πετάει.
 */
export async function awardForRecord(type: 'order' | 'booking' | 'telehealth', id: string, paymentRef: string): Promise<number> {
  try {
    let email: string | null = null
    let amount = 0
    if (type === 'order') {
      const o = await prisma.order.findUnique({ where: { id }, select: { user_email: true, total_amount: true, payment_status: true, payment_ref: true } })
      if (!o || o.payment_status !== 'paid' || o.payment_ref !== paymentRef) return 0
      email = o.user_email; amount = Number(o.total_amount)
    } else if (type === 'booking') {
      const b = await prisma.booking.findUnique({ where: { id }, select: { customer_email: true, total_price: true, payment_status: true, payment_ref: true } })
      if (!b || b.payment_status !== 'paid' || b.payment_ref !== paymentRef) return 0
      email = b.customer_email; amount = Number(b.total_price)
    } else {
      const c = await prisma.telehealthConsultation.findUnique({ where: { id }, select: { client_email: true, price: true, payment_status: true, payment_ref: true } })
      if (!c || c.payment_status !== 'paid' || c.payment_ref !== paymentRef) return 0
      email = c.client_email; amount = Number(c.price)
    }
    return await awardForPayment({ email, amount, source: type, ref: `${id}:${paymentRef}` })
  } catch (err: any) {
    console.error(`[loyalty] award for ${type} ${id} failed:`, err?.message ?? err)
    return 0
  }
}

/** Πληρωμένη εγγραφή εκδήλωσης (μόνο όταν επιβεβαιώθηκε η θέση). Ποτέ δεν πετάει. */
export function awardForEventRegistration(email: string, registrationId: string, txn: string, amount: number | null | undefined) {
  return awardForPayment({ email, amount: amount ?? 0, source: 'event', ref: `${registrationId}:${txn}` })
}

/** Πληρωμένο τιμολόγιο συνδρομής Stripe (AI / τροφής). `amountCents` = invoice.amount_paid. Ποτέ δεν πετάει. */
export async function awardForStripeInvoice(invoiceId: string, amountCents: number | null | undefined, who: { email?: string | null; userId?: string | null }): Promise<number> {
  try {
    let email = who.email ?? null
    if (!email && who.userId) {
      const u = await prisma.user.findUnique({ where: { id: String(who.userId) }, select: { email: true } })
      email = u?.email ?? null
    }
    return await awardForPayment({ email, amount: Number(amountCents ?? 0) / 100, source: 'stripe_invoice', ref: invoiceId })
  } catch (err: any) {
    console.error(`[loyalty] award for invoice ${invoiceId} failed:`, err?.message ?? err)
    return 0
  }
}

export interface RevokeInput {
  source: string
  ref: string
  /** Ποσό αυτής της επιστροφής (€). */
  amount: number
  /** Πλήρης επιστροφή → αφαιρούνται ΟΛΟΙ οι πόντοι που έμειναν από την πληρωμή. */
  full: boolean
  /** Μοναδική αναφορά της επιστροφής — μία αφαίρεση ανά αναφορά. */
  refundRef: string
}

/**
 * Αφαίρεση μέσα σε συναλλαγή: πόντοι = απονεμημένοι × ποσό / πληρωμένο
 * (πλήρης → ό,τι έμεινε), ποτέ πάνω από ό,τι έμεινε από ΑΥΤΗ την πληρωμή,
 * ποτέ κάτω από 0 στο σύνολο. Πληρωμή χωρίς σημάδι απόδοσης (π.χ. πριν το
 * πρόγραμμα) → τίποτα. «Απονεμημένοι» = metadata.points του σημαδιού, δηλαδή
 * οι πόντοι που ΔΟΘΗΚΑΝ, ήδη με τον πολλαπλασιαστή του GlobiPet Plus (Ε18)·
 * η ιδιότητα μέλους τη στιγμή της επιστροφής δεν παίζει ρόλο.
 */
async function revokeCoreTx(tx: Tx, input: RevokeInput): Promise<number> {
  const key = awardKey(input.source, input.ref)
  const refundRef = String(input.refundRef).slice(0, 255)
  await lockPayment(tx, key)
  const done = await tx.auditLog.findFirst({
    where: { action: LOYALTY_REVOKE_ACTION, resource: RESOURCE, resource_id: refundRef },
    select: { id: true },
  })
  if (done) return 0
  const award = await tx.auditLog.findFirst({
    where: { action: LOYALTY_AWARD_ACTION, resource: RESOURCE, resource_id: key },
    select: { subject_email: true, metadata: true },
  })
  const email = award?.subject_email
  if (!award || !email) {
    // Καμία απόδοση ακόμη (ή πληρωμή πριν το πρόγραμμα). Πλήρης επιστροφή:
    // σημάδι χωρίς πόντους, ώστε μια απόδοση που ακολουθεί να μη γίνει.
    if (input.full) {
      await tx.auditLog.create({
        data: {
          action: LOYALTY_REVOKE_ACTION, resource: RESOURCE, resource_id: refundRef,
          actor_id: null, actor_email: 'system@globipet', actor_role: 'system', outcome: 'success',
          metadata: { payment_key: key, points: 0, amount: Math.round(Math.max(0, Number(input.amount) || 0) * 100) / 100, full: true, before_award: true } as any,
        },
      })
    }
    return 0
  }
  await lockUser(tx, email)
  // Ο χρήστης δεν υπάρχει πια (διαγραφή λογαριασμού): ΜΟΝΟ το σημάδι της
  // αφαίρεσης (ιδεμποτικότητα) — καμία (επανα)δημιουργία γραμμής πόντων.
  const stillThere = await tx.user.findUnique({ where: { email }, select: { id: true } })
  if (!stillThere) {
    await tx.auditLog.create({
      data: {
        action: LOYALTY_REVOKE_ACTION, resource: RESOURCE, resource_id: refundRef,
        actor_id: null, actor_email: 'system@globipet', actor_role: 'system', outcome: 'success',
        metadata: { payment_key: key, points: 0, amount: Math.round(Math.max(0, Number(input.amount) || 0) * 100) / 100, full: input.full, user_missing: true } as any,
      },
    })
    return 0
  }
  const m = (award.metadata ?? {}) as any
  const awarded = Math.max(0, Math.floor(Number(m.points) || 0))
  const paid = Number(m.amount) || 0
  const prior = await tx.auditLog.findMany({
    where: { action: LOYALTY_REVOKE_ACTION, resource: RESOURCE, metadata: { path: ['payment_key'], equals: key } },
    select: { metadata: true },
  })
  const already = prior.reduce((s, r) => s + Math.max(0, Number((r.metadata as any)?.points) || 0), 0)
  const remaining = Math.max(0, awarded - already)
  if (remaining <= 0) return 0
  const amount = Math.max(0, Number(input.amount) || 0)
  const proportional = paid > 0 ? Math.round(awarded * Math.min(1, amount / paid)) : 0
  const points = input.full ? remaining : Math.min(remaining, proportional)
  if (points <= 0) return 0
  await tx.auditLog.create({
    data: {
      action: LOYALTY_REVOKE_ACTION, resource: RESOURCE, resource_id: refundRef,
      actor_id: null, actor_email: 'system@globipet', actor_role: 'system',
      subject_email: email, outcome: 'success',
      metadata: { payment_key: key, points, amount: Math.round(amount * 100) / 100, full: input.full } as any,
    },
  })
  // Ρυθμίσεις μέσω της ίδιας συναλλαγής: καμία δεύτερη σύνδεση του pool.
  await applyDeltaTx(tx, email, -points, true, await getLoyaltyConfig(tx))
  return points
}

/** Αφαίρεση πόντων για επιστροφή, σε δική της συναλλαγή. Ιδεμποτική ανά refundRef. Ποτέ δεν πετάει. */
export async function revokeForRefund(input: RevokeInput): Promise<number> {
  try {
    return await prisma.$transaction((tx) => revokeCoreTx(tx, input))
  } catch (err: any) {
    console.error(`[loyalty] revoke ${input.source}:${input.ref} (${input.refundRef}) failed:`, err?.message ?? err)
    return 0
  }
}

/**
 * Αφαίρεση μέσα στη συναλλαγή του καλούντος (lib/refundSettlement): ατομικά
 * με τη μετάβαση της επιστροφής. Σε SAVEPOINT, ώστε ένα σφάλμα εδώ να ΜΗΝ
 * ακυρώνει την καταχώριση της επιστροφής (η συναλλαγή συνεχίζει κανονικά).
 */
export async function revokeForRefundTx(tx: Tx, input: RevokeInput): Promise<number> {
  try {
    await tx.$executeRawUnsafe('SAVEPOINT globipet_loyalty')
  } catch (err: any) {
    console.error('[loyalty] savepoint failed — points not revoked:', err?.message ?? err)
    return 0
  }
  try {
    const n = await revokeCoreTx(tx, input)
    await tx.$executeRawUnsafe('RELEASE SAVEPOINT globipet_loyalty')
    return n
  } catch (err: any) {
    console.error(`[loyalty] revoke ${input.source}:${input.ref} (${input.refundRef}) failed:`, err?.message ?? err)
    try { await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT globipet_loyalty') } catch { /* η συναλλαγή του καλούντος αποφασίζει */ }
    return 0
  }
}

/** Πλήρης επιστροφή εγγραφής εκδήλωσης (κάθε ροή που τη σημειώνει `refunded`). Ποτέ δεν πετάει. */
export function revokeEventRefund(registrationId: string, txn: string | null | undefined) {
  if (!txn) return Promise.resolve(0)
  return revokeForRefund({
    source: 'event', ref: `${registrationId}:${txn}`, amount: 0, full: true,
    refundRef: `event_refund:${registrationId}:${txn}`,
  })
}

/** Επιστροφή ακύρωσης κράτησης/συνεδρίας (lib/cancellation): αναλογικά με refund/total. Ποτέ δεν πετάει. */
export function revokeCancelRefund(type: 'booking' | 'telehealth', id: string, txn: string | null | undefined, refund: number, total: number) {
  if (!txn || !(refund > 0)) return Promise.resolve(0)
  return revokeForRefund({
    source: type, ref: `${id}:${txn}`, amount: refund, full: total > 0 && refund >= total - 0.005,
    refundRef: `cancel:${type}:${id}:${txn}`,
  })
}

/**
 * Επιστροφή τιμολογίου Stripe. Χωρίς `opts`: ολόκληρου (lib/stripeSubscriptions
 * refundStripeInvoice). Με `opts` (webhook charge.refunded): αναλογικά με το
 * ποσό της επιστροφής (€), ιδεμποτικά ανά `refundRef` (π.χ. id της επιστροφής).
 * Τιμολόγιο χωρίς απόδοση πόντων → καμία αφαίρεση (μόνο, σε πλήρη, το σημάδι
 * που εμποδίζει μεταγενέστερη απόδοση). Ποτέ δεν πετάει.
 */
export function revokeStripeInvoice(invoiceId: string, opts?: { amount: number; full: boolean; refundRef: string }) {
  return revokeForRefund({
    source: 'stripe_invoice', ref: invoiceId,
    amount: opts ? opts.amount : 0, full: opts ? opts.full : true,
    refundRef: opts ? opts.refundRef : `stripe_invoice_refund:${invoiceId}`,
  })
}

/** Επίπεδο και ποσοστό έκπτωσης AI του χρήστη (από τους πόντους όλων των εποχών). */
export async function aiDiscountForEmail(email: string): Promise<{ tier: Tier; percent: number }> {
  const cfg = await getLoyaltyConfig()
  const row = await prisma.loyaltyPoints.findUnique({ where: { user_email: email }, select: { lifetime_points: true } })
  const tier = tierFor(row?.lifetime_points ?? 0, cfg)
  return { tier, percent: cfg.ai_discount_percent[tier] ?? 0 }
}
