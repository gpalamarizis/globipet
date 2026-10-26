import prisma from './prisma.js'

/**
 * Ε18 — GlobiPet Plus (συνδρομή μέλους με το AI μέσα).
 *
 * ΣΧΗΜΑ — καμία αλλαγή (απόφαση ιδιοκτήτη):
 *   · Το Plus είναι γραμμή του `ai_subscription_plans` με tier = 'membership'
 *     (όλα τα includes_* του AI = true). Αν υπάρχουν πολλές, ισχύει η πιο
 *     πρόσφατη ενεργή (findMembershipPlan).
 *   · Μέλος = users.ai_subscription_status 'active' ΚΑΙ ai_subscription_plan_id
 *     σε πλάνο με tier 'membership' (η ενεργοποίηση γίνεται από το ΥΠΑΡΧΟΝ
 *     webhook της συνδρομής AI — routes/webhooks activateAiSubscription).
 *   · Ρυθμίσεις: app_settings `membership_config` (JSON
 *     { points_multiplier, ai_daily_limit }).
 *
 * Οφέλη που εφαρμόζονται στον κώδικα:
 *   · ημερήσιο όριο AI = ai_daily_limit (routes/ai.ts enforceAiDailyLimit)·
 *   · πολλαπλασιαστής πόντων σε κάθε πληρωμή (lib/loyalty awardForPayment)·
 *   · προτεραιότητα υποστήριξης (routes/contact.ts GET /messages).
 */

export const MEMBERSHIP_TIER = 'membership'
export const MEMBERSHIP_CONFIG_KEY = 'membership_config'
export const MEMBERSHIP_CONFIG_ACTION = 'membership_config_update'

export interface MembershipConfig {
  points_multiplier: number
  ai_daily_limit: number
}

export const DEFAULT_MEMBERSHIP_CONFIG: MembershipConfig = { points_multiplier: 2, ai_daily_limit: 120 }

/** Ημερήσιο όριο AI της απλής ενεργής συνδρομής — ίδιο με routes/ai.ts AI_DAILY_LIMIT.active. */
export const STANDARD_AI_DAILY_LIMIT = 60

/** Μόνο αριθμός ή αριθμητικό κείμενο «12» / «12.5». '', null, boolean, πίνακες → NaN. */
export function strictNumber(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && /^\d+(\.\d+)?$/.test(v.trim())) return Number(v.trim())
  return NaN
}

/**
 * Έλεγχος ρυθμίσεων: points_multiplier 1–10 με βήμα 0.5· ai_daily_limit
 * ακέραιος 1–1000. Επιστρέφει το ελληνικό μήνυμα σφάλματος ή τις καθαρές τιμές.
 */
export function validateMembershipConfig(input: any): { ok: true; config: MembershipConfig } | { ok: false; message: string } {
  const pm = strictNumber(input?.points_multiplier)
  if (!Number.isFinite(pm) || pm < 1 || pm > 10 || !Number.isInteger(pm * 2)) {
    return { ok: false, message: 'Μη έγκυρος πολλαπλασιαστής πόντων (1 έως 10, ανά 0,5)' }
  }
  const lim = strictNumber(input?.ai_daily_limit)
  if (!Number.isInteger(lim) || lim < 1 || lim > 1000) {
    return { ok: false, message: 'Μη έγκυρο ημερήσιο όριο AI (ακέραιος 1 έως 1000)' }
  }
  return { ok: true, config: { points_multiplier: pm, ai_daily_limit: lim } }
}

let cache: { config: MembershipConfig; expires: number } | null = null

/** Ρυθμίσεις από app_settings, 60″ στη μνήμη. Άκυρη/λείπει → προεπιλογές. Ποτέ δεν πετάει. */
export async function getMembershipConfig(): Promise<MembershipConfig> {
  if (cache && cache.expires > Date.now()) return cache.config
  let config = DEFAULT_MEMBERSHIP_CONFIG
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: MEMBERSHIP_CONFIG_KEY } })
    if (row) {
      let parsed: any = null
      try { parsed = JSON.parse(row.value) } catch { parsed = null }
      const v = validateMembershipConfig({ ...DEFAULT_MEMBERSHIP_CONFIG, ...(parsed && typeof parsed === 'object' ? parsed : {}) })
      if (v.ok) config = v.config
      else console.error(`[membership] invalid ${MEMBERSHIP_CONFIG_KEY} in app_settings (${v.message}) — using defaults`)
    }
  } catch (err: any) {
    console.error('[membership] config read failed — using defaults:', err?.message ?? err)
    return config // χωρίς cache: ξαναδοκιμάζεται στην επόμενη κλήση
  }
  cache = { config, expires: Date.now() + 60_000 }
  return config
}

/** Αποθήκευση (ήδη ελεγμένων) ρυθμίσεων· ακυρώνει την cache αυτής της διεργασίας. */
export async function setMembershipConfig(config: MembershipConfig): Promise<MembershipConfig> {
  const value = JSON.stringify(config)
  await prisma.appSetting.upsert({
    where: { key: MEMBERSHIP_CONFIG_KEY },
    update: { value },
    create: { key: MEMBERSHIP_CONFIG_KEY, value },
  })
  cache = { config, expires: Date.now() + 60_000 }
  return config
}

/**
 * Το πλάνο του Plus: η πιο πρόσφατη ΕΝΕΡΓΗ γραμμή με tier 'membership'·
 * αν καμία δεν είναι ενεργή, η πιο πρόσφατη (για τη σελίδα του διαχειριστή).
 * null αν δεν υπάρχει καμία.
 */
export async function findMembershipPlan() {
  return prisma.aiSubscriptionPlan.findFirst({
    where: { tier: MEMBERSHIP_TIER },
    orderBy: [{ is_active: 'desc' }, { created_at: 'desc' }],
  })
}

/** Τα id ΟΛΩΝ των πλάνων tier 'membership' (μέλος παλαιότερου πλάνου Plus παραμένει μέλος). */
export async function membershipPlanIds(): Promise<string[]> {
  const rows = await prisma.aiSubscriptionPlan.findMany({ where: { tier: MEMBERSHIP_TIER }, select: { id: true } })
  return rows.map(r => r.id)
}

/** Είναι το πλάνο (id) πλάνο του Plus; Ποτέ δεν πετάει (σφάλμα → false). */
export async function isMembershipPlanId(planId: string | null | undefined): Promise<boolean> {
  if (!planId) return false
  try {
    const p = await prisma.aiSubscriptionPlan.findUnique({ where: { id: planId }, select: { tier: true } })
    return p?.tier === MEMBERSHIP_TIER
  } catch (err: any) {
    console.error('[membership] plan lookup failed:', err?.message ?? err)
    return false
  }
}

/**
 * Ενεργό μέλος: ai_subscription_status 'active' ΚΑΙ πλάνο με tier
 * 'membership'. Με id ή email. Ποτέ δεν πετάει (σφάλμα → false).
 */
export async function isActiveMember(who: { userId?: string | null; email?: string | null }): Promise<boolean> {
  try {
    const where = who.userId ? { id: String(who.userId) } : who.email ? { email: String(who.email) } : null
    if (!where) return false
    const u = await prisma.user.findUnique({ where, select: { ai_subscription_status: true, ai_subscription_plan_id: true } })
    if (!u || u.ai_subscription_status !== 'active') return false
    return await isMembershipPlanId(u.ai_subscription_plan_id)
  } catch (err: any) {
    console.error('[membership] member check failed:', err?.message ?? err)
    return false
  }
}

/**
 * Από μια λίστα email, όσα ανήκουν σε ενεργά μέλη (lowercase). Για την
 * προτεραιότητα στην υποστήριξη. Ποτέ δεν πετάει (σφάλμα → κενό σύνολο).
 */
export async function activeMemberEmails(emails: (string | null | undefined)[]): Promise<Set<string>> {
  const list = [...new Set(emails.filter((e): e is string => !!e).map(e => e.trim()).filter(Boolean))]
  if (!list.length) return new Set()
  try {
    const ids = await membershipPlanIds()
    if (!ids.length) return new Set()
    const rows = await prisma.user.findMany({
      where: {
        email: { in: list, mode: 'insensitive' },
        ai_subscription_status: 'active',
        ai_subscription_plan_id: { in: ids },
      },
      select: { email: true },
    })
    return new Set(rows.map(r => r.email.toLowerCase()))
  } catch (err: any) {
    console.error('[membership] member emails lookup failed:', err?.message ?? err)
    return new Set()
  }
}

/**
 * Πολλαπλασιαστής πόντων για την απόδοση μιας πληρωμής: ρύθμιση για ενεργό
 * μέλος, αλλιώς 1. Ποτέ δεν πετάει (σφάλμα → 1).
 */
export async function pointsMultiplierFor(email: string): Promise<number> {
  try {
    if (!(await isActiveMember({ email }))) return 1
    return (await getMembershipConfig()).points_multiplier
  } catch {
    return 1
  }
}

/**
 * Ημερήσιο όριο AI της απλής ενεργής συνδρομής (για σύγκριση στη σελίδα του
 * Plus): app_settings `ai_daily_limit_active` (ίδιος κανόνας με routes/ai.ts),
 * αλλιώς 60. Ποτέ δεν πετάει.
 */
export async function standardAiDailyLimit(): Promise<number> {
  try {
    const setting = await prisma.appSetting.findUnique({ where: { key: 'ai_daily_limit_active' } })
    const override = setting ? Number(setting.value) : NaN
    if (Number.isInteger(override) && override >= 0) return override
  } catch { /* προεπιλογή */ }
  return STANDARD_AI_DAILY_LIMIT
}
